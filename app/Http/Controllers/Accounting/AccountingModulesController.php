<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\AccountBudget;
use App\Models\AccountNote;
use App\Models\Branch;
use App\Models\BranchTarget;
use App\Models\FinancialYear;
use App\Models\JournalLine;
use App\Models\LedgerAccount;
use App\Models\LoanTransaction;
use App\Models\MemberAdmission;
use App\Models\Role;
use App\Models\SavingsTransaction;
use App\Services\Accounting\Money;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AccountingModulesController extends Controller
{
    public function budgets(Request $request): Response
    {
        $user = $request->user();
        $canSelectBranch = $this->isHeadOfficeOrAdmin($user);
        $branchId = $this->resolveBranchId($request);
        $periodMonth = (string) $request->query('period_month', now()->format('Y-m'));

        $budgets = $branchId
            ? AccountBudget::query()
                ->with(['ledgerAccount:id,code,name,type', 'financialYear:id,name'])
                ->where('branch_id', $branchId)
                ->where('period_month', $periodMonth)
                ->orderBy('id', 'desc')
                ->get()
            : collect();

        $actuals = [];
        if ($branchId && preg_match('/^\d{4}-\d{2}$/', $periodMonth)) {
            $start = Carbon::createFromFormat('Y-m', $periodMonth)->startOfMonth()->toDateString();
            $end = Carbon::createFromFormat('Y-m', $periodMonth)->endOfMonth()->toDateString();

            $rows = JournalLine::query()
                ->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
                ->where('journal_entries.branch_id', $branchId)
                ->whereBetween('journal_entries.business_date', [$start, $end])
                ->selectRaw('journal_lines.ledger_account_id, SUM(journal_lines.debit_paisa) as total_debit, SUM(journal_lines.credit_paisa) as total_credit')
                ->groupBy('journal_lines.ledger_account_id')
                ->get();

            foreach ($rows as $row) {
                $actuals[(int) $row->ledger_account_id] = [
                    'debit_paisa' => (int) $row->total_debit,
                    'credit_paisa' => (int) $row->total_credit,
                ];
            }
        }

        return Inertia::render('Accounting/Budgets', [
            'branch' => $branchId ? Branch::query()->find($branchId, ['id', 'name', 'code']) : null,
            'periodMonth' => $periodMonth,
            'budgets' => $budgets,
            'actuals' => $actuals,
            'accounts' => LedgerAccount::query()->where('is_active', true)->orderBy('code')->get(['id', 'code', 'name', 'type']),
            'financialYears' => FinancialYear::query()->orderByDesc('id')->get(['id', 'name', 'status']),
            'canManage' => $this->canOperate($user),
            'canSelectBranch' => $canSelectBranch,
        ]);
    }

    public function storeBudget(Request $request): RedirectResponse
    {
        abort_unless($this->canOperate($request->user()), 403);

        $data = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'financial_year_id' => 'nullable|exists:financial_years,id',
            'ledger_account_id' => 'required|exists:ledger_accounts,id',
            'period_month' => 'required|string|max:16',
            'budget_amount' => 'required|string',
            'note' => 'nullable|string|max:500',
        ]);

        $branchId = $this->resolveBranchId($request, $data['branch_id'] ?? null);
        abort_unless($branchId, 422, 'শাখা নির্ধারিত নেই।');

        AccountBudget::query()->updateOrCreate(
            [
                'branch_id' => $branchId,
                'ledger_account_id' => (int) $data['ledger_account_id'],
                'period_month' => trim($data['period_month']),
            ],
            [
                'financial_year_id' => $data['financial_year_id'] ?? null,
                'budget_paisa' => Money::toPaisa($data['budget_amount']),
                'note' => $data['note'] ?? null,
                'created_by' => (int) $request->user()->id,
            ]
        );

        return back()->with('success', 'বাজেট সফলভাবে সংরক্ষণ করা হয়েছে।');
    }

    public function destroyBudget(Request $request, AccountBudget $budget): RedirectResponse
    {
        abort_unless($this->canOperate($request->user()), 403);
        $this->assertBranchAccess($request->user(), (int) $budget->branch_id);

        $budget->delete();

        return back()->with('success', 'বাজেট মুছে ফেলা হয়েছে।');
    }

    public function notes(Request $request): Response
    {
        $user = $request->user();
        $branchId = $this->resolveBranchId($request);

        $notes = $branchId
            ? AccountNote::query()
                ->with(['ledgerAccount:id,code,name', 'creator:id,name'])
                ->where('branch_id', $branchId)
                ->orderByDesc('note_date')
                ->orderByDesc('id')
                ->limit(100)
                ->get()
            : collect();

        return Inertia::render('Accounting/Notes', [
            'branch' => $branchId ? Branch::query()->find($branchId, ['id', 'name', 'code']) : null,
            'notes' => $notes,
            'accounts' => LedgerAccount::query()->where('is_active', true)->orderBy('code')->get(['id', 'code', 'name', 'type']),
            'canManage' => $this->canOperate($user),
        ]);
    }

    public function storeNote(Request $request): RedirectResponse
    {
        abort_unless($this->canOperate($request->user()), 403);

        $data = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'ledger_account_id' => 'nullable|exists:ledger_accounts,id',
            'note_no' => 'nullable|string|max:32',
            'title' => 'required|string|max:200',
            'note_date' => 'required|date',
            'content' => 'required|string|max:5000',
        ]);

        $branchId = $this->resolveBranchId($request, $data['branch_id'] ?? null);
        abort_unless($branchId, 422, 'শাখা নির্ধারিত নেই।');

        AccountNote::query()->create([
            'branch_id' => $branchId,
            'ledger_account_id' => $data['ledger_account_id'] ?? null,
            'note_no' => $data['note_no'] ?? null,
            'title' => trim($data['title']),
            'note_date' => $data['note_date'],
            'content' => trim($data['content']),
            'created_by' => (int) $request->user()->id,
        ]);

        return back()->with('success', 'নোট এন্ট্রি সফলভাবে সংরক্ষণ করা হয়েছে।');
    }

    public function destroyNote(Request $request, AccountNote $note): RedirectResponse
    {
        abort_unless($this->canOperate($request->user()), 403);
        $this->assertBranchAccess($request->user(), (int) $note->branch_id);

        $note->delete();

        return back()->with('success', 'নোট এন্ট্রি মুছে ফেলা হয়েছে।');
    }

    public function targets(Request $request): Response
    {
        $user = $request->user();
        $branchId = $this->resolveBranchId($request);
        $periodMonth = (string) $request->query('period_month', now()->format('Y-m'));

        if (! preg_match('/^\d{4}-\d{2}$/', $periodMonth)) {
            $periodMonth = now()->format('Y-m');
        }

        $targets = $branchId
            ? BranchTarget::query()
                ->where('branch_id', $branchId)
                ->where('period_month', $periodMonth)
                ->get()
                ->keyBy('target_key')
            : collect();

        $achieved = [
            'loan_disbursement' => 0,
            'loan_collection' => 0,
            'savings_collection' => 0,
            'member_admission' => 0,
        ];

        if ($branchId) {
            $start = Carbon::createFromFormat('Y-m', $periodMonth)->startOfMonth()->toDateString();
            $end = Carbon::createFromFormat('Y-m', $periodMonth)->endOfMonth()->toDateString();

            $achieved['loan_disbursement'] = (int) LoanTransaction::query()
                ->where('branch_id', $branchId)
                ->where('kind', LoanTransaction::KIND_DISBURSEMENT)
                ->whereBetween('business_date', [$start, $end])
                ->sum('total_paisa');

            $achieved['loan_collection'] = (int) LoanTransaction::query()
                ->where('branch_id', $branchId)
                ->where('kind', LoanTransaction::KIND_COLLECTION)
                ->whereBetween('business_date', [$start, $end])
                ->sum('total_paisa');

            $achieved['savings_collection'] = (int) SavingsTransaction::query()
                ->where('branch_id', $branchId)
                ->where('kind', SavingsTransaction::KIND_DEPOSIT)
                ->whereBetween('business_date', [$start, $end])
                ->sum('amount_paisa');

            $achieved['member_admission'] = (int) MemberAdmission::query()
                ->where('branch_id', $branchId)
                ->where('status', 'approved')
                ->whereBetween('created_at', ["{$start} 00:00:00", "{$end} 23:59:59"])
                ->count();
        }

        return Inertia::render('Accounting/Targets', [
            'branch' => $branchId ? Branch::query()->find($branchId, ['id', 'name', 'code']) : null,
            'periodMonth' => $periodMonth,
            'targetKeys' => BranchTarget::KEYS,
            'targets' => $targets,
            'achieved' => $achieved,
            'canManage' => $this->canOperate($user),
        ]);
    }

    public function storeTarget(Request $request): RedirectResponse
    {
        abort_unless($this->canOperate($request->user()), 403);

        $data = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'period_month' => ['required', 'regex:/^\d{4}-\d{2}$/'],
            'target_key' => 'required|in:'.implode(',', array_keys(BranchTarget::KEYS)),
            'target_amount' => 'required|string',
            'note' => 'nullable|string|max:500',
        ]);

        $branchId = $this->resolveBranchId($request, $data['branch_id'] ?? null);
        abort_unless($branchId, 422, 'শাখা নির্ধারিত নেই।');

        $unit = BranchTarget::KEYS[$data['target_key']]['unit'];
        $value = $unit === 'paisa'
            ? Money::toPaisa($data['target_amount'])
            : max(0, (int) $data['target_amount']);

        BranchTarget::query()->updateOrCreate(
            [
                'branch_id' => $branchId,
                'period_month' => $data['period_month'],
                'target_key' => $data['target_key'],
            ],
            [
                'target_value' => $value,
                'note' => $data['note'] ?? null,
                'created_by' => (int) $request->user()->id,
            ]
        );

        return back()->with('success', 'টার্গেট সফলভাবে সংরক্ষণ করা হয়েছে।');
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

        abort_unless((int) $user->branch_id === $branchId, 403);
    }

    private function isHeadOfficeOrAdmin($user): bool
    {
        $role = $user?->role?->name;

        return (bool) ($user?->has_all_access || in_array($role, [Role::SUPER_ADMIN, Role::HEAD_OFFICE, Role::ED], true));
    }

    private function canOperate($user): bool
    {
        if ($this->isHeadOfficeOrAdmin($user)) {
            return true;
        }

        $role = $user?->role?->name;

        return in_array($role, [Role::BRANCH_MANAGER, Role::BRANCH_USER], true);
    }
}
