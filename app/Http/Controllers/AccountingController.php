<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Services\Accounting\JournalService;
use App\Services\Accounting\VoucherService;
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

    public function index(Request $request)
    {
        $this->authorizeAccounting($request);
        $filters = $request->validate(['branch_id' => ['nullable', 'integer', 'exists:branches,id']]);
        $branches = Branch::query()->orderBy('code')->get(['id', 'name', 'code']);
        $branchId = (int) ($filters['branch_id'] ?? $branches->first()?->id ?? 0);
        $balance = DB::table('journal_lines as l')->join('journal_entries as j', 'j.id', '=', 'l.journal_entry_id')
            ->where('j.branch_id', $branchId)->selectRaw('l.ledger_account_id, SUM(l.debit_paisa) as debit_paisa, SUM(l.credit_paisa) as credit_paisa')
            ->groupBy('l.ledger_account_id')->get()->map(fn ($row) => [
                'ledger_account_id' => (int) $row->ledger_account_id,
                'debit_paisa' => (string) $row->debit_paisa,
                'credit_paisa' => (string) $row->credit_paisa,
            ]);

        return Inertia::render('Accounting/Index', [
            'branches' => $branches, 'branchId' => $branchId,
            'accounts' => DB::table('ledger_accounts')->orderBy('code')->get(),
            'periods' => DB::table('accounting_periods')->where('branch_id', $branchId)->orderByDesc('starts_on')->get(),
            'entries' => DB::table('journal_entries')->where('branch_id', $branchId)->orderByDesc('id')->paginate(25)->withQueryString(),
            'trialBalance' => $balance,
            'vouchers' => DB::table('accounting_vouchers as v')->join('users as maker', 'maker.id', '=', 'v.requested_by')->leftJoin('users as checker', 'checker.id', '=', 'v.reviewed_by')->where('v.branch_id', $branchId)->select('v.*', 'maker.name as requested_by_name', 'checker.name as reviewed_by_name')->orderByDesc('v.id')->paginate(25, ['*'], 'vouchers_page')->withQueryString(),
        ]);
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

        return back()->with('success', 'Voucher submitted for independent review: '.$entry->reference);
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
