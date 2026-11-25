<?php

namespace App\Http\Controllers;

use App\Models\BankStatementLine;
use App\Models\Branch;
use App\Models\CashierSession;
use App\Models\JournalEntry;
use App\Models\LedgerAccount;
use App\Models\Role;
use App\Services\Accounting\Money;
use App\Services\AccountingPeriodService;
use App\Services\Cash\CashDesk;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CashDeskController extends Controller
{
    public function __construct(
        private readonly CashDesk $cashDesk,
        private readonly AccountingPeriodService $periods
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $canSelectBranch = $this->isHeadOfficeOrAdmin($user);
        $branchId = $this->resolveBranchId($request);

        $sessions = $branchId
            ? CashierSession::query()
                ->with(['opener:id,name', 'reviewer:id,name'])
                ->where('branch_id', $branchId)
                ->orderByDesc('business_date')
                ->limit(30)
                ->get()
            : collect();

        $dayState = $branchId ? $this->periods->getBranchDayState($branchId) : null;
        $todaySession = ($branchId && ($dayState['has_open_day'] ?? false))
            ? CashierSession::query()
                ->where('branch_id', $branchId)
                ->where('business_date', $dayState['business_date'])
                ->first()
            : null;

        $expectedTodayPaisa = $todaySession
            ? $this->cashDesk->computeExpectedClosingPaisa(
                $branchId,
                $dayState['business_date'],
                (int) $todaySession->opening_cash_paisa
            )
            : null;

        $bankAccounts = LedgerAccount::query()
            ->where('type', LedgerAccount::TYPE_ASSET)
            ->where('is_active', true)
            ->orderBy('code')
            ->get(['id', 'code', 'name']);

        $bankLines = $branchId
            ? BankStatementLine::query()
                ->with(['ledgerAccount:id,code,name', 'matchedJournal:id,business_date,description'])
                ->where('branch_id', $branchId)
                ->orderByDesc('statement_date')
                ->limit(50)
                ->get()
            : collect();

        $recentJournals = $branchId
            ? JournalEntry::query()
                ->where('branch_id', $branchId)
                ->orderByDesc('id')
                ->limit(50)
                ->get(['id', 'business_date', 'description'])
            : collect();

        return Inertia::render('CashDesk/Index', [
            'branch' => $branchId ? Branch::query()->find($branchId, ['id', 'name', 'code']) : null,
            'branches' => $canSelectBranch
                ? Branch::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code'])
                : [],
            'canSelectBranch' => $canSelectBranch,
            'dayState' => $dayState,
            'todaySession' => $todaySession,
            'expectedTodayPaisa' => $expectedTodayPaisa,
            'sessions' => $sessions,
            'bankAccounts' => $bankAccounts,
            'bankLines' => $bankLines,
            'recentJournals' => $recentJournals,
            'currentUserId' => (int) $user->id,
            'canOperate' => $this->canOperate($user),
        ]);
    }

    public function openSession(Request $request): RedirectResponse
    {
        abort_unless($this->canOperate($request->user()), 403);

        $data = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'business_date' => 'required|date',
            'opening_cash' => 'required|string',
        ]);

        $branchId = $this->resolveBranchId($request, $data['branch_id'] ?? null);
        abort_unless($branchId, 422);

        $this->cashDesk->openSession(
            $branchId,
            $data['business_date'],
            Money::toPaisa($data['opening_cash']),
            (int) $request->user()->id
        );

        return back()->with('success', 'দৈনিক ক্যাশ সেশন সফলভাবে খোলা হয়েছে।');
    }

    public function submitSession(Request $request, CashierSession $session): RedirectResponse
    {
        abort_unless($this->canOperate($request->user()), 403);
        $this->assertBranch($request->user(), (int) $session->branch_id);

        $data = $request->validate([
            'actual_closing' => 'required|string',
            'note' => 'nullable|string|max:500',
        ]);

        $this->cashDesk->submitSession(
            $session->id,
            Money::toPaisa($data['actual_closing']),
            $data['note'] ?? null,
            (int) $request->user()->id
        );

        return back()->with('success', 'ক্যাশ সেশন অনুমোদনের জন্য সাবমিট করা হয়েছে।');
    }

    public function reviewSession(Request $request, CashierSession $session): RedirectResponse
    {
        abort_unless($this->canOperate($request->user()), 403);
        $this->assertBranch($request->user(), (int) $session->branch_id);

        $data = $request->validate([
            'approve' => 'required|boolean',
            'note' => 'nullable|string|max:500',
        ]);

        $this->cashDesk->reviewSession(
            $session->id,
            (bool) $data['approve'],
            $data['note'] ?? null,
            (int) $request->user()->id
        );

        return back()->with('success', $data['approve'] ? 'ক্যাশ সেশন অনুমোদিত হয়েছে।' : 'ক্যাশ সেশন রিজেক্ট করা হয়েছে।');
    }

    public function storeBankLine(Request $request): RedirectResponse
    {
        abort_unless($this->canOperate($request->user()), 403);

        $data = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'ledger_account_id' => 'required|exists:ledger_accounts,id',
            'statement_date' => 'required|date',
            'reference_no' => 'nullable|string|max:100',
            'description' => 'required|string|max:500',
            'debit_amount' => 'nullable|string',
            'credit_amount' => 'nullable|string',
        ]);

        $branchId = $this->resolveBranchId($request, $data['branch_id'] ?? null);
        abort_unless($branchId, 422);

        $this->cashDesk->addBankStatementLine(
            $branchId,
            (int) $data['ledger_account_id'],
            $data['statement_date'],
            $data['description'],
            filled($data['debit_amount'] ?? null) ? Money::toPaisa($data['debit_amount']) : 0,
            filled($data['credit_amount'] ?? null) ? Money::toPaisa($data['credit_amount']) : 0,
            $data['reference_no'] ?? null,
            (int) $request->user()->id
        );

        return back()->with('success', 'ব্যাংক স্টেটমেন্ট লাইন যোগ করা হয়েছে।');
    }

    public function matchBankLine(Request $request, BankStatementLine $line): RedirectResponse
    {
        abort_unless($this->canOperate($request->user()), 403);
        $this->assertBranch($request->user(), (int) $line->branch_id);

        $data = $request->validate([
            'journal_entry_id' => 'required|exists:journal_entries,id',
        ]);

        $this->cashDesk->matchBankLine($line->id, (int) $data['journal_entry_id']);

        return back()->with('success', 'ব্যাংক লাইন জার্নালে ম্যাচ করা হয়েছে।');
    }

    private function resolveBranchId(Request $request, $requested = null): ?int
    {
        $user = $request->user();
        if ($this->isHeadOfficeOrAdmin($user)) {
            $id = $requested ?: $request->integer('branch_id') ?: $user->branch_id;

            return $id ? (int) $id : Branch::query()->where('is_active', true)->orderBy('name')->value('id');
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

        return in_array($user?->role?->name, [Role::BRANCH_MANAGER, Role::BRANCH_USER], true);
    }
}
