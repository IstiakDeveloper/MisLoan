<?php

namespace App\Http\Controllers\HeadOffice;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\BranchBankAccount;
use App\Models\BranchFinancialYear;
use App\Models\GlPostingDefault;
use App\Models\LedgerAccount;
use App\Models\LoanTransaction;
use App\Models\Role;
use App\Services\Accounting\PostingDefaults;
use App\Services\AccountingPeriodService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class BranchAccountSetupController extends Controller
{
    public function __construct(
        private readonly PostingDefaults $postingDefaults,
        private readonly AccountingPeriodService $periods
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $branches = Branch::operational()
            ->orderedByCode()
            ->get(['id', 'name', 'code', 'accounting_enabled']);

        $requestedBranchId = $request->integer('branch_id') ?: ((int) $request->session()->get('active_branch_id', 0) ?: null);
        $selectedBranch = $requestedBranchId
            ? $branches->firstWhere('id', $requestedBranchId)
            : $branches->first();

        $branchId = $selectedBranch?->id;

        $dayState = $branchId ? $this->periods->getBranchDayState($branchId) : null;

        $enrollment = $branchId
            ? BranchFinancialYear::query()
                ->with('financialYear:id,name,start_date,end_date,status')
                ->where('branch_id', $branchId)
                ->latest('id')
                ->first()
            : null;

        $bankAccounts = $branchId
            ? BranchBankAccount::query()
                ->with(['ledgerAccount:id,code,name,type'])
                ->where('branch_id', $branchId)
                ->orderByDesc('is_default')
                ->orderBy('bank_name')
                ->get()
            : collect();

        $branchDefaults = $branchId
            ? GlPostingDefault::query()
                ->with(['ledgerAccount:id,code,name,type'])
                ->where('scope', GlPostingDefault::SCOPE_BRANCH)
                ->where('product_id', $branchId)
                ->get()
            : collect();

        $globalDefaults = GlPostingDefault::query()
            ->with(['ledgerAccount:id,code,name,type'])
            ->where('scope', GlPostingDefault::SCOPE_GLOBAL)
            ->whereNull('product_id')
            ->get();

        $disbursementSummary = $branchId
            ? LoanTransaction::query()
                ->where('branch_id', $branchId)
                ->where('kind', LoanTransaction::KIND_DISBURSEMENT)
                ->selectRaw('payment_mode, branch_bank_account_id, COUNT(*) as tx_count, SUM(total_paisa) as total_paisa')
                ->groupBy('payment_mode', 'branch_bank_account_id')
                ->with('branchBankAccount:id,bank_name,account_number')
                ->get()
            : collect();

        $recentDisbursements = $branchId
            ? LoanTransaction::query()
                ->with([
                    'loanAccount:id,account_no',
                    'branchBankAccount:id,bank_name,account_number',
                    'creator:id,name',
                ])
                ->where('branch_id', $branchId)
                ->where('kind', LoanTransaction::KIND_DISBURSEMENT)
                ->orderByDesc('id')
                ->limit(20)
                ->get()
            : collect();

        return Inertia::render('Accounting/BranchAccountSetup', [
            'branches' => $branches,
            'selectedBranch' => $selectedBranch,
            'dayState' => $dayState,
            'enrollment' => $enrollment,
            'bankAccounts' => $bankAccounts,
            'branchDefaults' => $branchDefaults,
            'globalDefaults' => $globalDefaults,
            'ledgerAccounts' => LedgerAccount::query()
                ->where('is_active', true)
                ->orderBy('code')
                ->get(['id', 'code', 'name', 'type']),
            'eventKeys' => PostingDefaults::EVENT_KEYS,
            'disbursementSummary' => $disbursementSummary,
            'recentDisbursements' => $recentDisbursements,
            'canManage' => $this->canManage($user),
        ]);
    }

    public function storeBankAccount(Request $request): RedirectResponse
    {
        abort_unless($this->canManage($request->user()), 403);

        $data = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'bank_name' => 'required|string|max:120',
            'branch_name' => 'nullable|string|max:120',
            'account_number' => 'required|string|max:64',
            'account_title' => 'nullable|string|max:150',
            'ledger_account_id' => 'nullable|exists:ledger_accounts,id',
            'auto_create_ledger' => 'nullable|boolean',
            'ledger_code' => 'nullable|string|max:32',
            'is_default' => 'nullable|boolean',
        ]);

        $branch = Branch::query()->findOrFail((int) $data['branch_id']);
        $actorId = (int) $request->user()->id;

        DB::transaction(function () use ($data, $branch, $actorId) {
            $ledgerAccountId = $data['ledger_account_id'] ?? null;

            if (! $ledgerAccountId) {
                $code = trim((string) ($data['ledger_code'] ?? ''));
                if ($code === '') {
                    $seq = BranchBankAccount::query()->where('branch_id', $branch->id)->count() + 1;
                    $code = "1020-{$branch->code}-{$seq}";
                }

                $ledger = LedgerAccount::query()->firstOrCreate(
                    ['code' => $code],
                    [
                        'name' => "{$data['bank_name']} ({$branch->name})",
                        'type' => LedgerAccount::TYPE_ASSET,
                        'is_active' => true,
                    ]
                );
                $ledgerAccountId = $ledger->id;
            }

            $isDefault = (bool) ($data['is_default'] ?? false)
                || ! BranchBankAccount::query()->where('branch_id', $branch->id)->exists();

            if ($isDefault) {
                BranchBankAccount::query()
                    ->where('branch_id', $branch->id)
                    ->update(['is_default' => false]);
            }

            $bankAccount = BranchBankAccount::query()->create([
                'branch_id' => $branch->id,
                'ledger_account_id' => $ledgerAccountId,
                'bank_name' => trim($data['bank_name']),
                'branch_name' => isset($data['branch_name']) ? trim($data['branch_name']) : null,
                'account_number' => trim($data['account_number']),
                'account_title' => isset($data['account_title']) ? trim($data['account_title']) : null,
                'is_default' => $isDefault,
                'is_active' => true,
                'created_by' => $actorId,
            ]);

            if ($isDefault) {
                $this->postingDefaults->setDefault(
                    GlPostingDefault::SCOPE_BRANCH,
                    $branch->id,
                    'bank_account',
                    $bankAccount->ledger_account_id,
                    $actorId
                );
            }
        });

        return back()->with('success', "{$branch->name} শাখার ব্যাংক অ্যাকাউন্ট সফলভাবে যুক্ত করা হয়েছে।");
    }

    public function setDefaultBankAccount(Request $request, BranchBankAccount $bankAccount): RedirectResponse
    {
        abort_unless($this->canManage($request->user()), 403);

        DB::transaction(function () use ($bankAccount, $request) {
            BranchBankAccount::query()
                ->where('branch_id', $bankAccount->branch_id)
                ->update(['is_default' => false]);

            $bankAccount->update(['is_default' => true, 'is_active' => true]);

            $this->postingDefaults->setDefault(
                GlPostingDefault::SCOPE_BRANCH,
                (int) $bankAccount->branch_id,
                'bank_account',
                (int) $bankAccount->ledger_account_id,
                (int) $request->user()->id
            );
        });

        return back()->with('success', 'ডিফল্ট ব্যাংক অ্যাকাউন্ট আপডেট করা হয়েছে।');
    }

    public function toggleBankAccount(Request $request, BranchBankAccount $bankAccount): RedirectResponse
    {
        abort_unless($this->canManage($request->user()), 403);

        $bankAccount->update(['is_active' => ! $bankAccount->is_active]);

        return back()->with('success', 'ব্যাংক অ্যাকাউন্টের স্ট্যাটাস পরিবর্তন করা হয়েছে।');
    }

    public function saveBranchDefault(Request $request): RedirectResponse
    {
        abort_unless($this->canManage($request->user()), 403);

        $data = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'event_key' => 'required|string|max:64',
            'ledger_account_id' => 'required|exists:ledger_accounts,id',
        ]);

        $this->postingDefaults->setDefault(
            GlPostingDefault::SCOPE_BRANCH,
            (int) $data['branch_id'],
            $data['event_key'],
            (int) $data['ledger_account_id'],
            (int) $request->user()->id
        );

        return back()->with('success', 'শাখাভিত্তিক GL Posting Default সংরক্ষণ করা হয়েছে।');
    }

    private function canManage($user): bool
    {
        $role = $user?->role?->name;

        return (bool) ($user?->has_all_access || in_array($role, [Role::SUPER_ADMIN, Role::HEAD_OFFICE], true));
    }
}
