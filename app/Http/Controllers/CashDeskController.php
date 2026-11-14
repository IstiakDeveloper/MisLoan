<?php

namespace App\Http\Controllers;

use App\Http\Requests\MatchBankStatementRequest;
use App\Http\Requests\OpenCashSessionRequest;
use App\Http\Requests\ReviewCashSessionRequest;
use App\Http\Requests\StoreBankStatementLineRequest;
use App\Http\Requests\SubmitCashSessionRequest;
use App\Models\User;
use App\Services\Accounting\Money;
use App\Services\Accounting\PostingDefaults;
use App\Services\Cash\CashDesk;
use App\Services\Loans\LoanLedger;
use App\Services\Policy\InstitutionPolicy;
use App\Services\Savings\SavingsLedger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

final class CashDeskController extends Controller
{
    public function index(Request $request, CashDesk $desk, PostingDefaults $defaults): Response
    {
        $user = $request->user();
        $this->allow($user);
        $branchId = $user->isBranchCashier() && ! $user->isFinancialAdministrator()
            ? (int) $user->branch_id
            : ($request->filled('branch_id') ? $request->integer('branch_id') : null);
        if ($branchId) {
            abort_unless($user->canPostBranchCash($branchId), 403);
        }
        $sessions = $branchId ? DB::table('cashier_sessions')->where('branch_id', $branchId)->orderByDesc('id')->limit(30)->get() : collect();
        $sessions = $sessions->map(function (object $session) use ($desk) {
            $session->live_gl_balance_paisa = $session->status === 'open'
                ? $desk->balance((int) $session->branch_id, (int) $session->cash_account_id, $session->business_date)
                : (int) $session->gl_balance_paisa;

            return $session;
        });

        return Inertia::render('CashDesk/Index', [
            'branchId' => $branchId,
            'branches' => DB::table('branches')->orderBy('code')->get(['id', 'code', 'name']),
            'assets' => DB::table('ledger_accounts')->where('is_active', true)->where('type', 'asset')->orderBy('code')->get(['id', 'code', 'name']),
            'sessions' => $sessions,
            'loans' => $branchId ? DB::table('loan_accounts as account')->join('loan_applications as application', 'application.id', '=', 'account.loan_application_id')->where('account.branch_id', $branchId)->where('account.status', 'active')->orderByDesc('account.id')->limit(50)->get(['account.id', 'account.reference', 'application.application_no']) : [],
            'savings' => $branchId ? DB::table('savings_accounts')->where('branch_id', $branchId)->where('status', 'active')->orderByDesc('id')->limit(50)->get(['id', 'reference']) : [],
            'statements' => $branchId ? DB::table('bank_statement_lines')->where('branch_id', $branchId)->orderByDesc('id')->limit(50)->get() : [],
            'journals' => $branchId ? DB::table('journal_lines as line')->join('journal_entries as entry', 'entry.id', '=', 'line.journal_entry_id')->join('ledger_accounts as account', 'account.id', '=', 'line.ledger_account_id')->where('entry.branch_id', $branchId)->where('account.type', 'asset')->orderByDesc('line.id')->limit(50)->get(['line.id', 'line.ledger_account_id', 'line.debit_paisa', 'line.credit_paisa', 'entry.business_date', 'entry.description', 'account.code']) : [],
            'defaults' => $branchId ? $defaults->resolve($branchId, null, null) : null,
            'handoverUsers' => $branchId ? User::query()->where('is_active', true)->where('branch_id', $branchId)->orderBy('name')->get(['id', 'name']) : [],
            'canReview' => $user->isFinancialAdministrator(),
        ]);
    }

    public function open(OpenCashSessionRequest $request, CashDesk $desk)
    {
        $session = $desk->open($request->user(), (int) $request->integer('branch_id'), (int) $request->integer('cash_account_id'), $request->string('business_date')->toString(), $request->string('opening_count')->toString(), $request->string('idempotency_key')->toString());

        return back()->with('success', 'Cash session opened: '.$session->id);
    }

    public function submit(SubmitCashSessionRequest $request, int $session, CashDesk $desk)
    {
        $desk->submit($request->user(), $session, $request->string('counted_cash')->toString(), $request->input('variance_note'));

        return back()->with('success', 'Day-end submitted for review.');
    }

    public function review(ReviewCashSessionRequest $request, int $session, CashDesk $desk)
    {
        $desk->review($request->user(), $session, $request->string('decision')->toString(), $request->string('note')->toString(), $request->filled('handed_over_to') ? $request->integer('handed_over_to') : null);

        return back()->with('success', 'Day-end decision recorded. Counted cash was not posted as a new journal.');
    }

    public function statement(StoreBankStatementLineRequest $request, CashDesk $desk)
    {
        $desk->addStatement($request->user(), [
            'branch_id' => $request->integer('branch_id'),
            'bank_account_id' => $request->integer('bank_account_id'),
            'business_date' => $request->string('business_date')->toString(),
            'amount' => $request->string('amount')->toString(),
            'reference' => $request->string('reference')->toString(),
            'description' => $request->string('description')->toString(),
        ]);

        return back()->with('success', 'Bank statement line recorded.');
    }

    public function match(MatchBankStatementRequest $request, int $line, CashDesk $desk)
    {
        $desk->match($request->user(), $line, $request->integer('journal_line_id'));

        return back()->with('success', 'Bank line matched to the journal.');
    }

    public function repay(Request $request, int $account, LoanLedger $ledger, PostingDefaults $defaults)
    {
        $row = DB::table('loan_accounts')->find($account);
        abort_unless($row, 404);
        abort_unless($request->user()->canPostBranchCash((int) $row->branch_id), 403);
        $data = $request->validate([
            'principal_amount' => ['nullable', 'string', 'max:30', 'required_without:amount'],
            'charge_amount' => ['nullable', 'string', 'max:30', 'required_without:amount'],
            'amount' => ['nullable', 'string', 'max:30'],
            'cash_account_id' => ['nullable', 'integer', 'exists:ledger_accounts,id'],
            'business_date' => ['required', 'date_format:Y-m-d'],
            'idempotency_key' => ['required', 'string', 'max:100'],
            'description' => ['required', 'string', 'max:1000'],
        ]);
        if (empty($data['principal_amount']) && empty($data['charge_amount']) && ! empty($data['amount'])) {
            $balances = $ledger->balances($account);
            $split = app(InstitutionPolicy::class)->split(Money::toPaisa($data['amount']), $balances['principal_paisa'], $balances['charge_paisa']);
            if ($split === null) {
                throw ValidationException::withMessages(['amount' => 'Enter principal and charge. No partial-allocation policy is saved.']);
            }
            $data['principal_amount'] = Money::format($split['principal_paisa']);
            $data['charge_amount'] = Money::format($split['charge_paisa']);
        }
        $productId = DB::table('loan_applications')->where('id', $row->loan_application_id)->value('loan_product_id');
        $data = $defaults->fillLoan($data, (int) $row->branch_id, $productId ? (int) $productId : null);
        if (empty($data['cash_account_id'])) {
            throw ValidationException::withMessages(['cash_account_id' => 'Select a cash account or save a posting default.']);
        }
        $transaction = $ledger->repay($request->user(), $account, $data['principal_amount'], $data['charge_amount'], (int) $data['cash_account_id'], $data['business_date'], $data['idempotency_key'], $data['description']);

        return back()->with('success', 'Loan collection posted: '.$transaction->reference);
    }

    public function save(Request $request, int $account, SavingsLedger $ledger, PostingDefaults $defaults)
    {
        $row = DB::table('savings_accounts')->find($account);
        abort_unless($row, 404);
        abort_unless($request->user()->canPostBranchCash((int) $row->branch_id), 403);
        $data = $request->validate([
            'kind' => ['required', 'in:deposit,withdrawal'],
            'amount' => ['required', 'string', 'max:30'],
            'counter_account_id' => ['nullable', 'integer', 'exists:ledger_accounts,id'],
            'business_date' => ['required', 'date_format:Y-m-d'],
            'idempotency_key' => ['required', 'string', 'max:100'],
            'description' => ['required', 'string', 'max:1000'],
        ]);
        $productId = DB::table('savings_applications')->where('id', $row->savings_application_id)->value('savings_product_id');
        $data = $defaults->fillSavings($data, (int) $row->branch_id, $productId ? (int) $productId : null);
        if (empty($data['counter_account_id'])) {
            throw ValidationException::withMessages(['counter_account_id' => 'Select a cash account or save a posting default.']);
        }
        $entry = $ledger->transact($request->user(), $account, $data['kind'], $data['amount'], (int) $data['counter_account_id'], $data['business_date'], $data['idempotency_key'], $data['description']);

        return back()->with('success', 'Savings transaction posted: '.$entry->reference);
    }

    private function allow(?User $user): void
    {
        abort_unless($user && ($user->isFinancialAdministrator() || $user->isBranchCashier()), 403);
    }
}
