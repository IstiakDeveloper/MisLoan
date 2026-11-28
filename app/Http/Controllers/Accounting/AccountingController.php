<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\AccountingVoucher;
use App\Models\Branch;
use App\Models\BranchBankAccount;
use App\Models\JournalEntry;
use App\Models\LedgerAccount;
use App\Models\Role;
use App\Services\Accounting\Money;
use App\Services\Accounting\PostingDefaults;
use App\Services\Accounting\VoucherService;
use App\Services\AccountingPeriodService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AccountingController extends Controller
{
    public function __construct(
        private readonly VoucherService $vouchers,
        private readonly PostingDefaults $postingDefaults,
        private readonly AccountingPeriodService $periods
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $canSelectBranch = $this->isHeadOfficeOrAdmin($user);
        $branchId = $this->resolveBranchId($request);

        $accounts = LedgerAccount::query()
            ->orderBy('code')
            ->get(['id', 'code', 'name', 'type', 'is_active']);

        $vouchers = $branchId
            ? AccountingVoucher::query()
                ->with(['requester:id,name', 'reviewer:id,name'])
                ->where('branch_id', $branchId)
                ->orderByDesc('id')
                ->limit(50)
                ->get()
            : collect();

        $journals = $branchId
            ? JournalEntry::query()
                ->with(['lines.ledgerAccount:id,code,name,type', 'creator:id,name'])
                ->where('branch_id', $branchId)
                ->orderByDesc('id')
                ->limit(50)
                ->get()
            : collect();

        $bankAccounts = $branchId
            ? BranchBankAccount::query()
                ->with('ledgerAccount:id,code,name')
                ->where('branch_id', $branchId)
                ->where('is_active', true)
                ->orderByDesc('is_default')
                ->orderBy('bank_name')
                ->get(['id', 'branch_id', 'ledger_account_id', 'bank_name', 'account_number', 'is_default'])
            : collect();

        $cashLedgerAccountId = $this->postingDefaults->resolveAccountId('cash_in_hand', null, null, $branchId);
        $bankLedgerAccountId = $this->postingDefaults->resolveAccountId('bank_account', null, null, $branchId);

        $requestedTab = (string) $request->query('tab', 'vouchers');
        $initialTab = in_array($requestedTab, ['vouchers', 'journals', 'coa'], true) ? $requestedTab : 'vouchers';

        return Inertia::render('Accounting/Index', [
            'accounts' => $accounts,
            'vouchers' => $vouchers,
            'journals' => $journals,
            'bankAccounts' => $bankAccounts,
            'cashLedgerAccountId' => $cashLedgerAccountId,
            'bankLedgerAccountId' => $bankLedgerAccountId,
            'initialTab' => $initialTab,
            'branch' => $branchId ? Branch::query()->find($branchId, ['id', 'name', 'code']) : null,
            'branches' => $canSelectBranch
                ? Branch::operational()->orderedByCode()->get(['id', 'name', 'code'])
                : [],
            'canSelectBranch' => $canSelectBranch,
            'dayState' => $branchId ? $this->periods->getBranchDayState($branchId) : null,
            'canManageCoa' => $canSelectBranch,
            'canOperateVoucher' => $this->canOperateVoucher($user),
            'isSuperAdmin' => $this->isSuperAdmin($user),
            'currentUserId' => (int) $user->id,
        ]);
    }

    public function createVoucher(Request $request): Response
    {
        $user = $request->user();
        abort_unless($this->canOperateVoucher($user), 403);

        $branchId = $this->resolveBranchId($request);

        return Inertia::render('Accounting/VoucherForm', [
            'voucher' => null,
            'accounts' => LedgerAccount::query()->where('is_active', true)->orderBy('code')->get(['id', 'code', 'name', 'type']),
            'bankAccounts' => $branchId
                ? BranchBankAccount::query()
                    ->with('ledgerAccount:id,code,name')
                    ->where('branch_id', $branchId)
                    ->where('is_active', true)
                    ->orderByDesc('is_default')
                    ->orderBy('bank_name')
                    ->get(['id', 'branch_id', 'ledger_account_id', 'bank_name', 'account_number', 'is_default'])
                : collect(),
            'cashLedgerAccountId' => $this->postingDefaults->resolveAccountId('cash_in_hand', null, null, $branchId),
            'bankLedgerAccountId' => $this->postingDefaults->resolveAccountId('bank_account', null, null, $branchId),
            'branch' => $branchId ? Branch::query()->find($branchId, ['id', 'name', 'code']) : null,
            'dayState' => $branchId ? $this->periods->getBranchDayState($branchId) : null,
        ]);
    }

    public function editVoucher(Request $request, AccountingVoucher $voucher): Response
    {
        abort_unless($this->isSuperAdmin($request->user()), 403, 'শুধুমাত্র Super Admin ভাউচার এডিট করতে পারবেন।');

        $branchId = (int) $voucher->branch_id;

        return Inertia::render('Accounting/VoucherForm', [
            'voucher' => $voucher,
            'accounts' => LedgerAccount::query()->where('is_active', true)->orderBy('code')->get(['id', 'code', 'name', 'type']),
            'bankAccounts' => BranchBankAccount::query()
                ->with('ledgerAccount:id,code,name')
                ->where('branch_id', $branchId)
                ->where('is_active', true)
                ->orderByDesc('is_default')
                ->orderBy('bank_name')
                ->get(['id', 'branch_id', 'ledger_account_id', 'bank_name', 'account_number', 'is_default']),
            'cashLedgerAccountId' => $this->postingDefaults->resolveAccountId('cash_in_hand', null, null, $branchId),
            'bankLedgerAccountId' => $this->postingDefaults->resolveAccountId('bank_account', null, null, $branchId),
            'branch' => Branch::query()->find($branchId, ['id', 'name', 'code']),
            'dayState' => $this->periods->getBranchDayState($branchId),
        ]);
    }

    public function seedStandardCoa(Request $request): RedirectResponse
    {
        abort_unless($this->isHeadOfficeOrAdmin($request->user()), 403);

        $count = $this->postingDefaults->seedStandardChartOfAccounts((int) $request->user()->id);

        return back()->with('success', $count > 0
            ? "স্ট্যান্ডার্ড MFI Chart of Accounts ({$count}টি নতুন অ্যাকাউন্ট) যোগ করা হয়েছে।"
            : 'স্ট্যান্ডার্ড Chart of Accounts ইতিমধ্যে সেটআপ করা আছে।');
    }

    public function storeAccount(Request $request): RedirectResponse
    {
        abort_unless($this->isHeadOfficeOrAdmin($request->user()), 403);

        $data = $request->validate([
            'code' => 'required|string|max:32|unique:ledger_accounts,code',
            'name' => 'required|string|max:255',
            'type' => 'required|in:asset,liability,equity,income,expense',
        ]);

        LedgerAccount::create([
            'code' => trim($data['code']),
            'name' => trim($data['name']),
            'type' => $data['type'],
            'is_active' => true,
        ]);

        return back()->with('success', 'নতুন লেজার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে।');
    }

    public function toggleAccount(Request $request, LedgerAccount $ledgerAccount): RedirectResponse
    {
        abort_unless($this->isHeadOfficeOrAdmin($request->user()), 403);

        $ledgerAccount->update(['is_active' => ! $ledgerAccount->is_active]);

        return back()->with('success', 'লেজার অ্যাকাউন্টের স্ট্যাটাস আপডেট হয়েছে।');
    }

    public function submitVoucher(Request $request): RedirectResponse
    {
        abort_unless($this->canOperateVoucher($request->user()), 403);

        $data = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'kind' => 'required|in:payment,receipt,journal,contra',
            'business_date' => 'required|date',
            'description' => 'required|string|min:3|max:1000',
            'lines' => 'required|array|min:2',
            'lines.*.ledger_account_id' => 'required|exists:ledger_accounts,id',
            'lines.*.debit_amount' => 'nullable|string',
            'lines.*.credit_amount' => 'nullable|string',
        ]);

        $branchId = $this->resolveBranchId($request, $data['branch_id'] ?? null);
        abort_unless($branchId, 422, 'শাখা নির্ধারিত নেই।');

        $lines = array_map(fn (array $line) => [
            'ledger_account_id' => (int) $line['ledger_account_id'],
            'debit_paisa' => filled($line['debit_amount'] ?? null) ? Money::toPaisa((string) $line['debit_amount']) : 0,
            'credit_paisa' => filled($line['credit_amount'] ?? null) ? Money::toPaisa((string) $line['credit_amount']) : 0,
        ], $data['lines']);

        $this->vouchers->submitDirectVoucher(
            $branchId,
            $data['kind'],
            $data['business_date'],
            $data['description'],
            $lines,
            (string) Str::uuid(),
            (int) $request->user()->id
        );

        return redirect('/accounting?tab=vouchers')->with('success', 'ভাউচারটি সফলভাবে সেভ ও জার্নাল পোস্ট করা হয়েছে।');
    }

    public function updateVoucher(Request $request, AccountingVoucher $voucher): RedirectResponse
    {
        abort_unless($this->isSuperAdmin($request->user()), 403, 'শুধুমাত্র Super Admin ভাউচার এডিট করতে পারবেন।');

        $data = $request->validate([
            'kind' => 'required|in:payment,receipt,journal,contra',
            'business_date' => 'required|date',
            'description' => 'required|string|min:3|max:1000',
            'lines' => 'required|array|min:2',
            'lines.*.ledger_account_id' => 'required|exists:ledger_accounts,id',
            'lines.*.debit_amount' => 'nullable|string',
            'lines.*.credit_amount' => 'nullable|string',
        ]);

        $lines = array_map(fn (array $line) => [
            'ledger_account_id' => (int) $line['ledger_account_id'],
            'debit_paisa' => filled($line['debit_amount'] ?? null) ? Money::toPaisa((string) $line['debit_amount']) : 0,
            'credit_paisa' => filled($line['credit_amount'] ?? null) ? Money::toPaisa((string) $line['credit_amount']) : 0,
        ], $data['lines']);

        $this->vouchers->updateDirectVoucher(
            $voucher->id,
            $data['kind'],
            $data['business_date'],
            $data['description'],
            $lines,
            (int) $request->user()->id
        );

        return redirect('/accounting?tab=vouchers')->with('success', 'ভাউচারটি সফলভাবে আপডেট করা হয়েছে।');
    }

    public function destroyVoucher(Request $request, AccountingVoucher $voucher): RedirectResponse
    {
        abort_unless($this->isSuperAdmin($request->user()), 403, 'শুধুমাত্র Super Admin ভাউচার ডিলিট করতে পারবেন।');

        $this->vouchers->deleteDirectVoucher($voucher->id);

        return back()->with('success', 'ভাউচার ও সংশ্লিষ্ট জার্নাল এন্ট্রি মুছে ফেলা হয়েছে।');
    }

    public function approveVoucher(Request $request, AccountingVoucher $voucher): RedirectResponse
    {
        abort_unless($this->canOperateVoucher($request->user()), 403);
        $this->assertBranchAccess($request->user(), (int) $voucher->branch_id);

        $data = $request->validate([
            'decision_note' => 'nullable|string|max:1000',
        ]);

        $this->vouchers->approveVoucher($voucher->id, (int) $request->user()->id, $data['decision_note'] ?? null);

        return back()->with('success', 'ভাউচারটি অনুমোদিত হয়ে জার্নালে পোস্ট হয়েছে।');
    }

    public function rejectVoucher(Request $request, AccountingVoucher $voucher): RedirectResponse
    {
        abort_unless($this->canOperateVoucher($request->user()), 403);
        $this->assertBranchAccess($request->user(), (int) $voucher->branch_id);

        $data = $request->validate([
            'decision_note' => 'required|string|min:3|max:1000',
        ]);

        $this->vouchers->rejectVoucher($voucher->id, (int) $request->user()->id, $data['decision_note']);

        return back()->with('success', 'ভাউচারটি বাতিল (Reject) করা হয়েছে।');
    }

    private function resolveBranchId(Request $request, $requestedBranchId = null): ?int
    {
        $user = $request->user();
        if ($this->isHeadOfficeOrAdmin($user)) {
            $candidate = $requestedBranchId ?: $request->integer('branch_id');
            if ($candidate) {
                return (int) $candidate;
            }

            return Branch::resolveOperationalDefaultId($user->branch_id ? (int) $user->branch_id : null);
        }

        return $user->branch_id ? (int) $user->branch_id : null;
    }

    private function assertBranchAccess($user, int $branchId): void
    {
        if ($this->isHeadOfficeOrAdmin($user)) {
            return;
        }

        abort_unless((int) $user->branch_id === $branchId, 403, 'এই শাখার ভাউচার অ্যাক্সেস করার অনুমতি নেই।');
    }

    private function isHeadOfficeOrAdmin($user): bool
    {
        $role = $user?->role?->name;

        return (bool) ($user?->has_all_access || in_array($role, [Role::SUPER_ADMIN, Role::HEAD_OFFICE], true));
    }

    private function isSuperAdmin($user): bool
    {
        return (bool) ($user?->has_all_access || $user?->role?->name === Role::SUPER_ADMIN);
    }

    private function canOperateVoucher($user): bool
    {
        if ($this->isHeadOfficeOrAdmin($user)) {
            return true;
        }

        $role = $user?->role?->name;

        return in_array($role, [Role::BRANCH_MANAGER, Role::BRANCH_USER], true);
    }
}
