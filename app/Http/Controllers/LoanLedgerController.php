<?php

namespace App\Http\Controllers;

use App\Models\LoanApplication;
use App\Services\Loans\FinalLoanTerms;
use App\Services\Loans\LoanContract;
use App\Services\Loans\LoanCorrections;
use App\Services\Loans\LoanLedger;
use App\Services\Loans\LoanWorkspace;
use App\Support\LoanFormVisibility;
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

    public function index(Request $request, LoanLedger $ledger, LoanWorkspace $workspace)
    {
        $this->authorizeLedger($request);
        $filters = $request->validate([
            'account_id' => ['nullable', 'integer', 'exists:loan_accounts,id'], 'as_of' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'],
            'q' => ['nullable', 'string', 'max:100'], 'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
            'product_id' => ['nullable', 'integer', 'exists:loan_products,id'], 'account_status' => ['nullable', Rule::in(['active', 'closed'])],
            'view' => ['nullable', Rule::in(['accounts', 'unposted', 'ready'])],
        ]);
        if (! empty($filters['branch_id'])) {
            abort_unless($request->user()->canAccessBranch((int) $filters['branch_id']), 403);
        }
        $account = isset($filters['account_id']) ? $workspace->accounts([])->where('account.id', $filters['account_id'])->first() : null;
        if ($account) {
            abort_unless($request->user()->canAccessBranch((int) $account->branch_id), 403);
        }
        $asOf = $filters['as_of'] ?? today()->toDateString();
        $schedule = $account ? $ledger->schedule($account->id, $asOf) : [];

        return Inertia::render('LoanLedger/Index', [
            'accounts' => $workspace->accounts($filters)->orderByDesc('account.id')->paginate(25)->withQueryString(),
            'unpostedApplications' => $workspace->sources($filters, LoanApplication::STATUS_DISBURSED)->orderByDesc('application.id')->paginate(15, ['*'], 'unposted_page')->withQueryString(),
            'readyApplications' => $workspace->sources($filters, LoanApplication::STATUS_PENDING_DISBURSEMENT)->orderByDesc('application.id')->paginate(15, ['*'], 'ready_page')->withQueryString(),
            'workspaceCounts' => [
                'active' => $workspace->accounts(array_diff_key($filters, ['account_status' => true]))->where('account.status', 'active')->count(),
                'closed' => $workspace->accounts(array_diff_key($filters, ['account_status' => true]))->where('account.status', 'closed')->count(),
                'unposted' => $workspace->sources($filters, LoanApplication::STATUS_DISBURSED)->count(),
                'ready' => $workspace->sources($filters, LoanApplication::STATUS_PENDING_DISBURSEMENT)->count(),
            ],
            'filters' => $filters,
            'branchesList' => DB::table('branches')->orderBy('code')->get(['id', 'code', 'name']),
            'productsList' => DB::table('loan_products')->orderBy('product_code')->get(['id', 'product_code', 'product_name']),
            'contractSnapshot' => $account ? json_decode($account->terms_snapshot, true, 512, JSON_THROW_ON_ERROR) : null,
            'account' => $account, 'asOf' => $asOf,
            'balances' => $account ? $ledger->balances($account->id, $asOf) : null,
            'schedule' => $schedule,
            'overduePaisa' => array_sum(array_column($schedule, 'overdue_paisa')),
            'reconciliation' => $account ? $ledger->reconciliation($request->user(), $account->id) : null,
            'transactions' => $account ? DB::table('loan_transactions')->where('loan_account_id', $account->id)->where('business_date', '<=', $asOf)->orderByDesc('business_date')->orderByDesc('id')->paginate(50, ['*'], 'transactions_page')->withQueryString() : null,
            'corrections' => $account ? DB::table('loan_correction_requests as c')->join('users as maker', 'maker.id', '=', 'c.requested_by')->leftJoin('users as reviewer', 'reviewer.id', '=', 'c.reviewed_by')->where('c.loan_account_id', $account->id)->select('c.*', 'maker.name as requested_by_name', 'reviewer.name as reviewed_by_name')->orderByDesc('c.id')->paginate(25, ['*'], 'corrections_page')->withQueryString() : null,
            'ledgerAccounts' => DB::table('ledger_accounts')->where('is_active', true)->orderBy('code')->get(['id', 'code', 'name', 'type']),
        ]);
    }

    public function contract(Request $request, LoanApplication $loan, LoanContract $contract)
    {
        $this->authorizeLedger($request);
        abort_unless($request->user()->canAccessBranch((int) $loan->branch_id), 403);

        if ($loan->status === LoanApplication::STATUS_PENDING_DISBURSEMENT) {
            $quote = app(FinalLoanTerms::class)->quote($loan);
            $saved = LoanFormVisibility::buildFormSavedMap($loan);
            $required = LoanFormVisibility::disburseFormIds((float) $loan->requested_amount);

            return response()->json([
                'principal_paisa' => $quote['principal_paisa'], 'charge_paisa' => $quote['service_charge_paisa'],
                'regular_paisa' => $quote['installment_paisa'], 'last_paisa' => $quote['last_installment_paisa'],
                'count' => $quote['number_of_installments'], 'frequency' => $quote['repayment_frequency'], 'disbursed_on' => null,
                'pricing' => $quote, 'missing_forms' => array_values(array_filter($required, fn ($id) => empty($saved[$id]))),
                'amount_change_pending' => $loan->hasPendingAmountChange(),
            ])->header('Cache-Control', 'private, no-store');
        }

        return response()->json($contract->read($loan))->header('Cache-Control', 'private, no-store');
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

    public function reverse(Request $request, int $transaction, LoanCorrections $corrections)
    {
        $this->authorizeLedger($request);
        $data = $request->validate(['business_date' => ['required', 'date_format:Y-m-d'], 'idempotency_key' => ['required', 'string', 'max:100'], 'reason' => ['required', 'string', 'max:1000']]);
        $corrections->request($request->user(), $transaction, $data['business_date'], $data['idempotency_key'], $data['reason']);

        return back()->with('success', 'Correction requested. A different administrator must approve before money changes.');
    }

    public function review(Request $request, int $correction, LoanCorrections $corrections)
    {
        $this->authorizeLedger($request);
        $data = $request->validate(['decision' => ['required', Rule::in(['approved', 'rejected'])], 'note' => ['required', 'string', 'max:1000']]);
        $corrections->decide($request->user(), $correction, $data['decision'], $data['note']);

        return back()->with('success', 'Correction decision recorded. Approved receipts and GL are reversed together.');
    }
}
