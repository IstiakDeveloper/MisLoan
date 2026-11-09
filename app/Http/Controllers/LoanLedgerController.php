<?php

namespace App\Http\Controllers;

use App\Models\LoanApplication;
use App\Services\Loans\LoanContract;
use App\Services\Loans\LoanLedger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

final class LoanLedgerController extends Controller
{
    private function authorizeLedger(Request $request): void
    {
        abort_unless($request->user()?->is_active && $request->user()->isSuperAdmin() && ! $request->user()->isBranchAccount(), 403);
    }

    public function index(Request $request, LoanLedger $ledger)
    {
        $this->authorizeLedger($request);
        $filters = $request->validate(['account_id' => ['nullable', 'integer', 'exists:loan_accounts,id'], 'as_of' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today']]);
        $account = isset($filters['account_id']) ? DB::table('loan_accounts')->find($filters['account_id']) : null;
        $asOf = $filters['as_of'] ?? today()->toDateString();
        $schedule = $account ? $ledger->schedule($account->id, $asOf) : [];

        return Inertia::render('LoanLedger/Index', [
            'accounts' => DB::table('loan_accounts')->orderByDesc('id')->paginate(25)->withQueryString(),
            'account' => $account, 'asOf' => $asOf,
            'balances' => $account ? $ledger->balances($account->id, $asOf) : null,
            'schedule' => $schedule,
            'overduePaisa' => array_sum(array_column($schedule, 'overdue_paisa')),
            'reconciliation' => $account ? $ledger->reconciliation($request->user(), $account->id) : null,
            'transactions' => $account ? DB::table('loan_transactions')->where('loan_account_id', $account->id)->where('business_date', '<=', $asOf)->orderByDesc('business_date')->orderByDesc('id')->paginate(50, ['*'], 'transactions_page')->withQueryString() : null,
            'ledgerAccounts' => DB::table('ledger_accounts')->where('is_active', true)->orderBy('code')->get(['id', 'code', 'name', 'type']),
        ]);
    }

    public function contract(Request $request, LoanApplication $loan, LoanContract $contract)
    {
        $this->authorizeLedger($request);
        abort_unless($request->user()->canAccessBranch((int) $loan->branch_id), 403);

        return response()->json($contract->read($loan));
    }

    public function open(Request $request, LoanLedger $ledger)
    {
        $this->authorizeLedger($request);
        $data = $request->validate([
            'application_id' => ['required', 'integer', 'exists:loan_applications,id'],
            'principal_account_id' => ['required', 'integer', 'exists:ledger_accounts,id'],
            'charge_income_account_id' => ['required', 'integer', 'exists:ledger_accounts,id'],
            'counter_account_id' => ['required', 'integer', 'exists:ledger_accounts,id'],
            'mode' => ['required', Rule::in(['disbursement', 'opening_balance'])],
            'business_date' => ['required', 'date_format:Y-m-d'], 'first_due_date' => ['required', 'date_format:Y-m-d'],
            'outstanding_principal' => ['required', 'string', 'max:30'], 'outstanding_charge' => ['required', 'string', 'max:30'],
            'reference' => ['required', 'string', 'max:255'],
        ]);
        $account = $ledger->open($request->user(), (int) $data['application_id'], (int) $data['principal_account_id'], (int) $data['charge_income_account_id'], (int) $data['counter_account_id'], $data['mode'], $data['business_date'], $data['first_due_date'], $data['outstanding_principal'], $data['outstanding_charge'], $data['reference']);

        return redirect()->route('loan-ledger.index', ['account_id' => $account->id])->with('success', 'Loan ledger opened from the saved contract.');
    }

    public function repay(Request $request, int $account, LoanLedger $ledger)
    {
        $this->authorizeLedger($request);
        $data = $request->validate([
            'principal_amount' => ['required', 'string', 'max:30'], 'charge_amount' => ['required', 'string', 'max:30'],
            'cash_account_id' => ['required', 'integer', 'exists:ledger_accounts,id'],
            'business_date' => ['required', 'date_format:Y-m-d'], 'idempotency_key' => ['required', 'string', 'max:100'], 'description' => ['required', 'string', 'max:1000'],
        ]);
        $transaction = $ledger->repay($request->user(), $account, $data['principal_amount'], $data['charge_amount'], (int) $data['cash_account_id'], $data['business_date'], $data['idempotency_key'], $data['description']);

        return back()->with('success', 'Loan collection posted: '.$transaction->reference);
    }

    public function reverse(Request $request, int $transaction, LoanLedger $ledger)
    {
        $this->authorizeLedger($request);
        $data = $request->validate(['business_date' => ['required', 'date_format:Y-m-d'], 'idempotency_key' => ['required', 'string', 'max:100'], 'reason' => ['required', 'string', 'max:1000']]);
        $ledger->reverse($request->user(), $transaction, $data['business_date'], $data['idempotency_key'], $data['reason']);

        return back()->with('success', 'Loan receipt reversed in the loan ledger and GL.');
    }
}
