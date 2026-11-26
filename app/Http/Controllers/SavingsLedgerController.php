<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\MemberAdmission;
use App\Models\Role;
use App\Models\SavingsAccount;
use App\Models\SavingsProduct;
use App\Models\SavingsTransaction;
use App\Services\Accounting\Money;
use App\Services\AccountingPeriodService;
use App\Services\Savings\SavingsLedgerService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SavingsLedgerController extends Controller
{
    public function __construct(
        private readonly SavingsLedgerService $ledger,
        private readonly AccountingPeriodService $periods
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $canSelectBranch = $this->isHeadOfficeOrAdmin($user);
        $branchId = $this->resolveBranchId($request);
        $dayState = $branchId ? $this->periods->getBranchDayState($branchId) : null;

        $accounts = $branchId
            ? SavingsAccount::query()
                ->with(['memberAdmission:id,applicant_name_bn,applicant_name_en,application_no as member_code', 'savingsProduct:id,product_name,product_code'])
                ->where('branch_id', $branchId)
                ->orderByDesc('id')
                ->limit(100)
                ->get()
            : collect();

        $transactions = $branchId
            ? SavingsTransaction::query()
                ->with(['savingsAccount:id,account_no', 'creator:id,name'])
                ->where('branch_id', $branchId)
                ->orderByDesc('id')
                ->limit(50)
                ->get()
            : collect();

        $members = $branchId
            ? MemberAdmission::query()
                ->where('branch_id', $branchId)
                ->where('status', 'approved')
                ->orderByDesc('id')
                ->limit(200)
                ->get(['id', 'applicant_name_bn', 'applicant_name_en', 'application_no as member_code'])
            : collect();

        return Inertia::render('SavingsLedger/Index', [
            'branch' => $branchId ? Branch::query()->find($branchId, ['id', 'name', 'code']) : null,
            'branches' => $canSelectBranch
                ? Branch::operational()->orderedByCode()->get(['id', 'name', 'code'])
                : [],
            'canSelectBranch' => $canSelectBranch,
            'dayState' => $dayState,
            'accounts' => $accounts,
            'transactions' => $transactions,
            'members' => $members,
            'savingsProducts' => SavingsProduct::query()->orderBy('product_name')->get(['id', 'product_name as name', 'product_code as code', 'interest_rate']),
            'canOperate' => $this->canOperate($user),
        ]);
    }

    public function openAccount(Request $request): RedirectResponse
    {
        abort_unless($this->canOperate($request->user()), 403);

        $data = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'member_admission_id' => 'required|exists:member_admissions,id',
            'savings_product_id' => 'required|exists:savings_products,id',
            'profit_rate' => 'required|numeric|min:0|max:50',
            'opened_date' => 'required|date',
        ]);

        $branchId = $this->resolveBranchId($request, $data['branch_id'] ?? null);
        abort_unless($branchId, 422);

        $acc = $this->ledger->openAccount(
            $branchId,
            (int) $data['member_admission_id'],
            (int) $data['savings_product_id'],
            (float) $data['profit_rate'],
            $data['opened_date'],
            (int) $request->user()->id
        );

        return back()->with('success', "সঞ্চয় অ্যাকাউন্ট {$acc->account_no} খোলা হয়েছে।");
    }

    public function deposit(Request $request, SavingsAccount $savingsAccount): RedirectResponse
    {
        abort_unless($this->canOperate($request->user()), 403);
        $this->assertBranch($request->user(), (int) $savingsAccount->branch_id);

        $data = $request->validate([
            'business_date' => 'required|date',
            'amount' => 'required|string',
            'payment_mode' => 'required|in:cash,bank',
            'note' => 'nullable|string|max:500',
        ]);

        $this->ledger->deposit(
            $savingsAccount->id,
            $data['business_date'],
            Money::toPaisa($data['amount']),
            $data['payment_mode'],
            (string) Str::uuid(),
            (int) $request->user()->id,
            $data['note'] ?? null
        );

        return back()->with('success', 'সঞ্চয় জমা সফলভাবে পোস্ট হয়েছে।');
    }

    public function withdraw(Request $request, SavingsAccount $savingsAccount): RedirectResponse
    {
        abort_unless($this->canOperate($request->user()), 403);
        $this->assertBranch($request->user(), (int) $savingsAccount->branch_id);

        $data = $request->validate([
            'business_date' => 'required|date',
            'amount' => 'required|string',
            'payment_mode' => 'required|in:cash,bank',
            'note' => 'nullable|string|max:500',
        ]);

        $this->ledger->withdraw(
            $savingsAccount->id,
            $data['business_date'],
            Money::toPaisa($data['amount']),
            $data['payment_mode'],
            (string) Str::uuid(),
            (int) $request->user()->id,
            $data['note'] ?? null
        );

        return back()->with('success', 'সঞ্চয় উত্তোলন সফলভাবে পোস্ট হয়েছে।');
    }

    public function postProfit(Request $request, SavingsAccount $savingsAccount): RedirectResponse
    {
        abort_unless($this->canOperate($request->user()), 403);
        $this->assertBranch($request->user(), (int) $savingsAccount->branch_id);

        $data = $request->validate([
            'business_date' => 'required|date',
        ]);

        $tx = $this->ledger->postMonthlyProfit($savingsAccount->id, $data['business_date'], (int) $request->user()->id);

        return back()->with('success', $tx ? 'মাসিক মুনাফা পোস্ট হয়েছে।' : 'মুনাফা শূন্য হওয়ায় পোস্টিং হয়নি।');
    }

    private function resolveBranchId(Request $request, $requested = null): ?int
    {
        $user = $request->user();
        if ($this->isHeadOfficeOrAdmin($user)) {
            $id = $requested ?: $request->integer('branch_id');
            if ($id) {
                return (int) $id;
            }

            return Branch::resolveOperationalDefaultId($user->branch_id ? (int) $user->branch_id : null);
        }

        return $user->branch_id ? (int) $user->branch_id : null;
    }

    private function assertBranch($user, int $branchId): void
    {
        if ($this->isHeadOfficeOrAdmin($user)) {
            return;
        }
        abort_unless((int) $user->branch_id === $branchId, 403);
    }

    private function isHeadOfficeOrAdmin($user): bool
    {
        $role = $user?->role?->name;

        return (bool) ($user?->has_all_access || in_array($role, [Role::SUPER_ADMIN, Role::HEAD_OFFICE], true));
    }

    private function canOperate($user): bool
    {
        if ($this->isHeadOfficeOrAdmin($user)) {
            return true;
        }

        return in_array($user?->role?->name, [Role::BRANCH_MANAGER, Role::BRANCH_USER, Role::FIELD_OFFICER], true);
    }
}
