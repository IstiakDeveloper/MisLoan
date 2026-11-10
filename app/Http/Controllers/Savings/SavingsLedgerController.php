<?php

namespace App\Http\Controllers\Savings;

use App\Http\Controllers\Controller;
use App\Services\Savings\SavingsCorrections;
use App\Services\Savings\SavingsLedger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

final class SavingsLedgerController extends Controller
{
    private function authorize(Request $request): void
    {
        abort_unless($request->user()?->is_active && $request->user()->isSuperAdmin()
            && ! $request->user()->isBranchAccount(), 403);
    }

    public function index(Request $request, SavingsLedger $ledger)
    {
        $this->authorize($request);
        $filters = $request->validate(['account_id' => ['nullable', 'integer', 'exists:savings_accounts,id']]);
        $account = isset($filters['account_id']) ? DB::table('savings_accounts')->find($filters['account_id']) : null;

        return Inertia::render('SavingsLedger/Index', [
            'accounts' => DB::table('savings_accounts')->orderByDesc('id')->paginate(25)->withQueryString(),
            'account' => $account,
            'balances' => $account ? $ledger->balances($account->id) : null,
            'reconciliation' => $account ? $ledger->reconciliation($request->user(), $account->id) : null,
            'transactions' => $account ? DB::table('savings_transactions')->where('savings_account_id', $account->id)->orderByDesc('id')->paginate(50, ['*'], 'transactions_page')->withQueryString() : null,
            'holds' => $account ? DB::table('savings_holds')->where('savings_account_id', $account->id)->whereNull('released_at')->get() : [],
            'corrections' => $account ? DB::table('savings_correction_requests as c')->join('users as maker', 'maker.id', '=', 'c.requested_by')->leftJoin('users as reviewer', 'reviewer.id', '=', 'c.reviewed_by')->where('c.savings_account_id', $account->id)->select('c.*', 'maker.name as requested_by_name', 'reviewer.name as reviewed_by_name')->orderByDesc('c.id')->paginate(25, ['*'], 'corrections_page')->withQueryString() : null,
            'ledgerAccounts' => DB::table('ledger_accounts')->where('is_active', true)->orderBy('code')->get(['id', 'code', 'name', 'type']),
        ]);
    }

    public function open(Request $request, SavingsLedger $ledger)
    {
        $this->authorize($request);
        $data = $request->validate([
            'application_id' => ['required', 'integer', 'exists:savings_applications,id'],
            'liability_account_id' => ['required', 'integer', 'exists:ledger_accounts,id'],
            'business_date' => ['required', 'date_format:Y-m-d'],
            'opening_balance' => ['required', 'string', 'max:30'],
            'opening_reference' => ['required', 'string', 'max:255'],
            'offset_account_id' => ['nullable', 'integer', 'exists:ledger_accounts,id'],
        ]);
        $account = $ledger->open($request->user(), (int) $data['application_id'], (int) $data['liability_account_id'], $data['business_date'], $data['opening_balance'], $data['opening_reference'], isset($data['offset_account_id']) ? (int) $data['offset_account_id'] : null);

        return redirect()->route('savings-ledger.index', ['account_id' => $account->id])->with('success', 'Savings ledger opened with the declared opening balance.');
    }

    public function transact(Request $request, int $account, SavingsLedger $ledger)
    {
        $this->authorize($request);
        $data = $request->validate([
            'kind' => ['required', Rule::in(['deposit', 'withdrawal', 'profit'])],
            'amount' => ['required', 'string', 'max:30'],
            'counter_account_id' => ['required', 'integer', 'exists:ledger_accounts,id'],
            'business_date' => ['required', 'date_format:Y-m-d'],
            'idempotency_key' => ['required', 'string', 'max:100'],
            'description' => ['required', 'string', 'max:1000'],
        ]);
        $entry = $ledger->transact($request->user(), $account, $data['kind'], $data['amount'], (int) $data['counter_account_id'], $data['business_date'], $data['idempotency_key'], $data['description']);

        return back()->with('success', 'Savings transaction posted: '.$entry->reference);
    }

    public function reverse(Request $request, int $transaction, SavingsCorrections $corrections)
    {
        $this->authorize($request);
        $data = $request->validate(['business_date' => ['required', 'date_format:Y-m-d'], 'idempotency_key' => ['required', 'string', 'max:100'], 'reason' => ['required', 'string', 'max:1000']]);
        $corrections->request($request->user(), $transaction, $data['business_date'], $data['idempotency_key'], $data['reason']);

        return back()->with('success', 'Savings correction requested. Another administrator must approve before balances change.');
    }

    public function hold(Request $request, int $account, SavingsLedger $ledger)
    {
        $this->authorize($request);
        $data = $request->validate(['amount' => ['required', 'string', 'max:30'], 'request_key' => ['required', 'string', 'max:100'], 'reason' => ['required', 'string', 'max:255']]);
        $ledger->hold($request->user(), $account, $data['amount'], $data['request_key'], $data['reason']);

        return back()->with('success', 'Savings hold recorded.');
    }

    public function release(Request $request, int $hold, SavingsLedger $ledger)
    {
        $this->authorize($request);
        $ledger->release($request->user(), $hold);

        return back()->with('success', 'Savings hold released.');
    }

    public function close(Request $request, int $account, SavingsLedger $ledger)
    {
        $this->authorize($request);
        $ledger->close($request->user(), $account);

        return back()->with('success', 'Savings ledger closed.');
    }

    public function review(Request $request, int $correction, SavingsCorrections $corrections)
    {
        $this->authorize($request);
        $data = $request->validate(['decision' => ['required', Rule::in(['approved', 'rejected'])], 'note' => ['required', 'string', 'max:1000']]);
        $corrections->decide($request->user(), $correction, $data['decision'], $data['note']);

        return back()->with('success', 'Savings correction decision recorded.');
    }
}
