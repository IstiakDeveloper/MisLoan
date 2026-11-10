<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Services\Accounting\AccountingWorkspace;
use App\Services\Accounting\JournalService;
use App\Services\Accounting\VoucherService;
use Brick\Math\BigInteger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class AccountingController extends Controller
{
    private function authorizeAccounting(Request $request): void
    {
        abort_unless($request->user()?->is_active && $request->user()->isSuperAdmin()
            && ! $request->user()->isBranchAccount(), 403);
    }

    public function index(Request $request, AccountingWorkspace $workspace)
    {
        $this->authorizeAccounting($request);
        $section = $request->route('section') ?? 'overview';
        $filters = $request->validate([
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'], 'q' => ['nullable', 'string', 'max:100'],
            'from' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'], 'to' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'],
            'voucher_status' => ['nullable', Rule::in(['all', 'pending', 'approved', 'rejected'])],
            'source' => ['nullable', Rule::in(['all', 'manual', 'loan', 'savings'])],
            'account_type' => ['nullable', Rule::in(['all', 'asset', 'liability', 'equity', 'income', 'expense'])],
            'voucher_id' => ['nullable', 'integer', 'exists:accounting_vouchers,id'],
            'mode' => ['nullable', Rule::in(['receipt', 'payment', 'transfer', 'journal'])],
        ]);
        if (isset($filters['from'], $filters['to']) && $filters['from'] > $filters['to']) {
            throw ValidationException::withMessages(['to' => 'The end date cannot precede the start date.']);
        }
        $filters['voucher_status'] ??= $section === 'vouchers' ? 'pending' : 'all';
        $branches = Branch::query()->orderBy('code')->get(['id', 'name', 'code']);
        $branchId = (int) ($filters['branch_id'] ?? $branches->first()?->id ?? 0);
        if ($branchId) {
            abort_unless($request->user()->canAccessBranch($branchId), 403);
        }
        $balance = DB::table('journal_lines as l')->join('journal_entries as j', 'j.id', '=', 'l.journal_entry_id')
            ->where('j.branch_id', $branchId)->selectRaw('l.ledger_account_id, SUM(l.debit_paisa) as debit_paisa, SUM(l.credit_paisa) as credit_paisa')
            ->groupBy('l.ledger_account_id')->get()->map(fn ($row) => [
                'ledger_account_id' => (int) $row->ledger_account_id,
                'debit_paisa' => (string) $row->debit_paisa,
                'credit_paisa' => (string) $row->credit_paisa,
            ]);

        $debit = $balance->reduce(fn ($sum, $row) => $sum->plus($row['debit_paisa']), BigInteger::zero());
        $credit = $balance->reduce(fn ($sum, $row) => $sum->plus($row['credit_paisa']), BigInteger::zero());
        $periods = DB::table('accounting_periods')->where('branch_id', $branchId)->orderByDesc('starts_on')->get();
        $currentPeriod = $periods->first(fn ($period) => $period->starts_on <= today()->toDateString() && $period->ends_on >= today()->toDateString());
        $chart = DB::table('ledger_accounts')->orderBy('code')
            ->when(! empty($filters['q']) && $section === 'accounts', fn ($q) => $q->where(fn ($w) => $w->where('code', 'like', '%'.$filters['q'].'%')->orWhere('name', 'like', '%'.$filters['q'].'%')))
            ->when(! empty($filters['account_type']) && $filters['account_type'] !== 'all', fn ($q) => $q->where('type', $filters['account_type']));
        $initialDetail = isset($filters['voucher_id']) ? $workspace->voucher($request->user(), (int) $filters['voucher_id']) : null;
        if ($initialDetail) {
            abort_unless((int) $initialDetail['record']->branch_id === $branchId, 404);
        }

        return Inertia::render('Accounting/Index', [
            'section' => $section, 'filters' => $filters, 'today' => today()->toDateString(), 'initialDetail' => $initialDetail,
            'branches' => $branches, 'branchId' => $branchId,
            'accounts' => DB::table('ledger_accounts')->orderBy('code')->get(),
            'chartAccounts' => $chart->paginate(50, ['*'], 'accounts_page')->withQueryString(),
            'periods' => $periods,
            'entries' => $workspace->entries($branchId, $section === 'journals' ? $filters : [])->orderByDesc('j.business_date')->orderByDesc('j.id')->paginate(25)->withQueryString()->through(function ($entry) {
                unset($entry->payload_hash, $entry->idempotency_key);

                return $entry;
            }),
            'trialBalance' => $balance,
            'vouchers' => $workspace->voucherRows($workspace->vouchers($branchId, $section === 'vouchers' ? $filters : [])->orderByDesc('v.id')->paginate(25, ['*'], 'vouchers_page')->withQueryString()),
            'summary' => [
                'pending' => DB::table('accounting_vouchers')->where('branch_id', $branchId)->where('status', 'pending')->count(),
                'reviewable' => DB::table('accounting_vouchers')->where('branch_id', $branchId)->where('status', 'pending')->where('requested_by', '!=', $request->user()->id)->count(),
                'posted_today' => DB::table('journal_entries')->where('branch_id', $branchId)->where('business_date', today()->toDateString())->count(),
                'posted_total' => DB::table('journal_entries')->where('branch_id', $branchId)->count(),
                'active_accounts' => DB::table('ledger_accounts')->where('is_active', true)->count(),
                'debit_paisa' => (string) $debit, 'credit_paisa' => (string) $credit, 'difference_paisa' => (string) $debit->minus($credit),
                'current_period' => $currentPeriod,
            ],
        ]);
    }

    public function voucherDetail(Request $request, int $voucher, AccountingWorkspace $workspace)
    {
        $this->authorizeAccounting($request);

        return response()->json($workspace->voucher($request->user(), $voucher))->header('Cache-Control', 'private, no-store');
    }

    public function journalDetail(Request $request, int $entry, AccountingWorkspace $workspace)
    {
        $this->authorizeAccounting($request);

        return response()->json($workspace->journal($request->user(), $entry))->header('Cache-Control', 'private, no-store');
    }

    public function account(Request $request)
    {
        $this->authorizeAccounting($request);
        $data = $request->validate([
            'code' => ['required', 'string', 'max:32', 'regex:/^[A-Za-z0-9._-]+$/', 'unique:ledger_accounts,code'],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(['asset', 'liability', 'equity', 'income', 'expense'])],
        ]);
        DB::table('ledger_accounts')->insert([...$data, 'created_at' => now(), 'updated_at' => now()]);

        return back()->with('success', 'Ledger account created.');
    }

    public function period(Request $request)
    {
        $this->authorizeAccounting($request);
        $data = $request->validate([
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'starts_on' => ['required', 'date_format:Y-m-d'],
            'ends_on' => ['required', 'date_format:Y-m-d', 'after_or_equal:starts_on'],
        ]);
        DB::transaction(function () use ($data) {
            DB::table('branches')->where('id', $data['branch_id'])->lockForUpdate()->first();
            if (DB::table('accounting_periods')->where('branch_id', $data['branch_id'])
                ->where('starts_on', '<=', $data['ends_on'])->where('ends_on', '>=', $data['starts_on'])->exists()) {
                throw ValidationException::withMessages(['starts_on' => 'Accounting periods cannot overlap.']);
            }
            DB::table('accounting_periods')->insert([...$data, 'created_at' => now(), 'updated_at' => now()]);
        }, 3);

        return back()->with('success', 'Accounting period created.');
    }

    public function post(Request $request, VoucherService $vouchers)
    {
        $this->authorizeAccounting($request);
        $data = $request->validate([
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'business_date' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'idempotency_key' => ['required', 'string', 'max:100'],
            'description' => ['required', 'string', 'max:1000'],
            'lines' => ['required', 'array', 'min:2', 'max:100'],
            'lines.*.account_id' => ['required', 'integer', 'exists:ledger_accounts,id'],
            'lines.*.debit_paisa' => ['required', 'integer', 'min:0'],
            'lines.*.credit_paisa' => ['required', 'integer', 'min:0'],
        ]);
        $lines = array_map(fn ($line) => array_map('intval', $line), $data['lines']);
        $entry = $vouchers->propose($request->user(), (int) $data['branch_id'], $data['business_date'],
            $data['idempotency_key'], $data['description'], $lines);

        return redirect()->route('accounting.vouchers.index', ['branch_id' => $data['branch_id'], 'voucher_id' => $entry->id])->with('success', 'Voucher submitted for independent review: '.$entry->reference);
    }

    public function reverse(Request $request, int $entry, VoucherService $vouchers)
    {
        $this->authorizeAccounting($request);
        $data = $request->validate([
            'business_date' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'idempotency_key' => ['required', 'string', 'max:100'],
            'reason' => ['required', 'string', 'max:1000'],
        ]);
        $vouchers->proposeReversal($request->user(), $entry, $data['business_date'], $data['idempotency_key'], $data['reason']);

        return back()->with('success', 'Reversal proposed. A different administrator must approve before GL changes.');
    }

    public function close(Request $request, int $period, JournalService $journals)
    {
        $this->authorizeAccounting($request);
        $journals->closePeriod($request->user(), $period);

        return back()->with('success', 'Accounting period closed.');
    }

    public function review(Request $request, int $voucher, VoucherService $vouchers)
    {
        $this->authorizeAccounting($request);
        $data = $request->validate(['decision' => ['required', Rule::in(['approved', 'rejected'])], 'note' => ['required', 'string', 'max:1000']]);
        $vouchers->decide($request->user(), $voucher, $data['decision'], $data['note']);

        return back()->with('success', 'Voucher decision recorded. Only approved vouchers affect the GL.');
    }
}
