<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\LoanAccount;
use App\Models\LoanCorrectionRequest;
use App\Models\LoanProduct;
use App\Models\LoanTransaction;
use App\Models\MemberAdmission;
use App\Models\Role;
use App\Models\Samity;
use App\Services\Accounting\Money;
use App\Services\AccountingPeriodService;
use App\Services\Loans\LoanLedgerService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class LoanLedgerController extends Controller
{
    public function __construct(
        private readonly LoanLedgerService $ledger,
        private readonly AccountingPeriodService $periods
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $canSelectBranch = $this->isHeadOfficeOrAdmin($user);
        $branchId = $this->resolveBranchId($request);
        $dayState = $branchId ? $this->periods->getBranchDayState($branchId) : null;

        $accounts = $branchId
            ? LoanAccount::query()
                ->with(['memberAdmission:id,applicant_name_bn,applicant_name_en,application_no as member_code', 'loanProduct:id,product_name,product_code', 'installments'])
                ->where('branch_id', $branchId)
                ->orderByDesc('id')
                ->limit(100)
                ->get()
            : collect();

        $transactions = $branchId
            ? LoanTransaction::query()
                ->with(['loanAccount:id,account_no', 'creator:id,name'])
                ->where('branch_id', $branchId)
                ->orderByDesc('id')
                ->limit(50)
                ->get()
            : collect();

        $corrections = $branchId
            ? LoanCorrectionRequest::query()
                ->with(['transaction.loanAccount:id,account_no', 'requester:id,name', 'reviewer:id,name'])
                ->where('branch_id', $branchId)
                ->orderByDesc('id')
                ->limit(30)
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

        $samities = $branchId
            ? Samity::query()->where('branch_id', $branchId)->orderBy('samity_name')->get(['id', 'samity_name as name', 'samity_code as code'])
            : collect();

        $dcsSamityId = $request->integer('samity_id') ?: null;
        $dcsRows = ($branchId && ($dayState['has_open_day'] ?? false))
            ? $this->ledger->getDailyCollectionSheet($branchId, $dayState['business_date'], $dcsSamityId)
            : [];

        return Inertia::render('LoanLedger/Index', [
            'branch' => $branchId ? Branch::query()->find($branchId, ['id', 'name', 'code']) : null,
            'branches' => $canSelectBranch
                ? Branch::operational()->orderedByCode()->get(['id', 'name', 'code'])
                : [],
            'canSelectBranch' => $canSelectBranch,
            'dayState' => $dayState,
            'accounts' => $accounts,
            'transactions' => $transactions,
            'corrections' => $corrections,
            'members' => $members,
            'samities' => $samities,
            'dcsSamityId' => $dcsSamityId,
            'dcsRows' => $dcsRows,
            'loanProducts' => LoanProduct::query()->orderBy('product_name')->get(['id', 'product_name as name', 'product_code as code', 'interest_rate', 'installment_type', 'number_of_installments']),
            'currentUserId' => (int) $user->id,
            'canOperate' => $this->canOperate($user),
        ]);
    }

    public function disburse(Request $request): RedirectResponse
    {
        abort_unless($this->canOperate($request->user()), 403);

        $data = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'member_admission_id' => 'required|exists:member_admissions,id',
            'loan_product_id' => 'required|exists:loan_products,id',
            'principal_amount' => 'required|string',
            'annual_rate' => 'required|numeric|min:0|max:100',
            'installment_count' => 'required|integer|min:1|max:360',
            'pricing_method' => 'required|in:flat,declining',
            'installment_frequency' => 'required|in:weekly,monthly',
            'disbursed_date' => 'required|date',
            'first_due_date' => 'required|date',
            'payment_mode' => 'required|in:cash,bank',
        ]);

        $branchId = $this->resolveBranchId($request, $data['branch_id'] ?? null);
        abort_unless($branchId, 422);

        $account = $this->ledger->createAndDisburse(
            $branchId,
            (int) $data['member_admission_id'],
            (int) $data['loan_product_id'],
            Money::toPaisa($data['principal_amount']),
            (float) $data['annual_rate'],
            (int) $data['installment_count'],
            $data['pricing_method'],
            $data['installment_frequency'],
            $data['disbursed_date'],
            $data['first_due_date'],
            $data['payment_mode'],
            (int) $request->user()->id
        );

        return back()->with('success', "লোন অ্যাকাউন্ট {$account->account_no} ডিসবার্স ও শিডিউল তৈরি হয়েছে।");
    }

    public function collect(Request $request, LoanAccount $loanAccount): RedirectResponse
    {
        abort_unless($this->canOperate($request->user()), 403);
        $this->assertBranch($request->user(), (int) $loanAccount->branch_id);

        $data = $request->validate([
            'business_date' => 'required|date',
            'amount' => 'required|string',
            'payment_mode' => 'required|in:cash,bank',
            'note' => 'nullable|string|max:500',
        ]);

        $this->ledger->collect(
            $loanAccount->id,
            $data['business_date'],
            Money::toPaisa($data['amount']),
            $data['payment_mode'],
            (string) Str::uuid(),
            (int) $request->user()->id,
            $data['note'] ?? null
        );

        return back()->with('success', 'কিস্তি সফলভাবে আদায় ও জার্নালে পোস্ট হয়েছে।');
    }

    public function requestCorrection(Request $request, LoanTransaction $transaction): RedirectResponse
    {
        abort_unless($this->canOperate($request->user()), 403);
        $this->assertBranch($request->user(), (int) $transaction->branch_id);

        $data = $request->validate([
            'reason' => 'required|string|min:5|max:500',
        ]);

        $this->ledger->requestCorrection($transaction->id, $data['reason'], (int) $request->user()->id);

        return back()->with('success', 'রিসিট সংশোধনের আবেদন (Maker-Checker) সাবমিট হয়েছে।');
    }

    public function reviewCorrection(Request $request, LoanCorrectionRequest $correction): RedirectResponse
    {
        abort_unless($this->canOperate($request->user()), 403);
        $this->assertBranch($request->user(), (int) $correction->branch_id);

        $data = $request->validate([
            'approve' => 'required|boolean',
            'business_date' => 'required|date',
            'decision_note' => 'nullable|string|max:500',
        ]);

        $this->ledger->reviewCorrection(
            $correction->id,
            (bool) $data['approve'],
            $data['business_date'],
            $data['decision_note'] ?? null,
            (int) $request->user()->id
        );

        return back()->with('success', $data['approve'] ? 'সংশোধন অনুমোদিত ও রিভার্সাল সম্পন্ন হয়েছে।' : 'আবেদন বাতিল করা হয়েছে।');
    }

    public function bulkDcs(Request $request): RedirectResponse
    {
        abort_unless($this->canOperate($request->user()), 403);

        $data = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'business_date' => 'required|date',
            'payment_mode' => 'required|in:cash,bank',
            'rows' => 'required|array|min:1',
            'rows.*.loan_account_id' => 'nullable|integer',
            'rows.*.loan_amount' => 'nullable|string',
            'rows.*.savings_account_id' => 'nullable|integer',
            'rows.*.savings_amount' => 'nullable|string',
        ]);

        $branchId = $this->resolveBranchId($request, $data['branch_id'] ?? null);
        abort_unless($branchId, 422);

        $rows = array_map(fn (array $row) => [
            'loan_account_id' => $row['loan_account_id'] ?? null,
            'loan_amount_paisa' => filled($row['loan_amount'] ?? null) ? Money::toPaisa((string) $row['loan_amount']) : 0,
            'savings_account_id' => $row['savings_account_id'] ?? null,
            'savings_amount_paisa' => filled($row['savings_amount'] ?? null) ? Money::toPaisa((string) $row['savings_amount']) : 0,
        ], $data['rows']);

        $res = $this->ledger->postBulkDcs(
            $branchId,
            $data['business_date'],
            $data['payment_mode'],
            $rows,
            (string) Str::uuid(),
            (int) $request->user()->id
        );

        return back()->with(
            'success',
            "DCS বাল্ক কালেকশন সম্পন্ন: {$res['loan_count']}টি লোন (৳".Money::format($res['loan_total_paisa']).") ও {$res['savings_count']}টি সঞ্চয় (৳".Money::format($res['savings_total_paisa']).') পোস্ট হয়েছে।'
        );
    }

    public function settleEarly(Request $request, LoanAccount $loanAccount): RedirectResponse
    {
        abort_unless($this->canOperate($request->user()), 403);
        $this->assertBranch($request->user(), (int) $loanAccount->branch_id);

        $data = $request->validate([
            'business_date' => 'required|date',
            'rebate_amount' => 'nullable|string',
            'payment_mode' => 'required|in:cash,bank',
            'note' => 'nullable|string|max:500',
        ]);

        $rebatePaisa = filled($data['rebate_amount'] ?? null) ? Money::toPaisa((string) $data['rebate_amount']) : 0;

        $this->ledger->settleEarlyWithRebate(
            $loanAccount->id,
            $data['business_date'],
            $rebatePaisa,
            $data['payment_mode'],
            (string) Str::uuid(),
            (int) $request->user()->id,
            $data['note'] ?? null
        );

        return back()->with('success', 'অগ্রিম নিষ্পত্তি (Early Settlement & Rebate) সফলভাবে সম্পন্ন হয়েছে।');
    }

    public function passbook(Request $request, LoanAccount $loanAccount): Response
    {
        $this->assertBranch($request->user(), (int) $loanAccount->branch_id);

        return Inertia::render('LoanLedger/Passbook', [
            'account' => $loanAccount->load([
                'branch:id,name,code',
                'samity:id,samity_name,samity_code',
                'memberAdmission:id,applicant_name_bn,applicant_name_en,application_no as member_code,mobile_number',
                'loanProduct:id,product_name,product_code',
                'installments',
                'transactions.creator:id,name',
            ]),
        ]);
    }

    public function receipt(Request $request, LoanTransaction $transaction): Response
    {
        $this->assertBranch($request->user(), (int) $transaction->branch_id);

        return Inertia::render('LoanLedger/Receipt', [
            'transaction' => $transaction->load([
                'loanAccount.branch:id,name,code',
                'loanAccount.memberAdmission:id,applicant_name_bn,applicant_name_en,application_no as member_code',
                'creator:id,name',
            ]),
        ]);
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
