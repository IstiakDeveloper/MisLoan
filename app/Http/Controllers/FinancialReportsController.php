<?php

namespace App\Http\Controllers;

use App\Services\Accounting\FinancialReports;
use Brick\Math\BigDecimal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

final class FinancialReportsController extends Controller
{
    public function __invoke(Request $request, FinancialReports $reports)
    {
        $reports->authorize($request->user(), null);
        $data = $request->validate(['report' => ['nullable', 'in:trial,income,balance,ledger'], 'from' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'], 'to' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'], 'branch_id' => ['nullable', 'integer', 'exists:branches,id'], 'account_id' => ['nullable', 'integer', 'exists:ledger_accounts,id'], 'download' => ['nullable', 'in:balances,ledger']]);
        $to = $data['to'] ?? today()->toDateString();
        $from = $data['from'] ?? substr($to, 0, 4).'-01-01';
        $reports->dates($from, $to);
        $branch = isset($data['branch_id']) ? (int) $data['branch_id'] : null;
        $account = isset($data['account_id']) ? (int) $data['account_id'] : null;
        $reports->authorize($request->user(), $branch);
        if (isset($data['download'])) {
            abort_if($data['download'] === 'ledger' && $account === null, 422, 'Select an account for ledger export.');

            // The transaction lives inside the streaming callback, covering every exported row.
            return response()->streamDownload(function () use ($request, $reports, $from, $to, $branch, $account, $data) {
                DB::transaction(function () use ($request, $reports, $from, $to, $branch, $account, $data) {
                    $out = fopen('php://output', 'w');
                    fwrite($out, "\xEF\xBB\xBF");
                    $money = fn ($n) => (string) BigDecimal::of((string) $n)->dividedBy(100, 2);
                    $safe = fn ($value) => preg_match('/^[\s\x00-\x1F]*[=+@-]/u', (string) $value) ? "'".$value : $value;
                    $write = fn ($row) => fputcsv($out, $row, ',', '"', '');
                    $write(['Posted GL only', 'From', $from, 'To', $to, 'Branch ID', $branch ?? 'All']);
                    if ($data['download'] === 'balances') {
                        $write(['Code', 'Account', 'Type', 'Opening (Dr positive)', 'Period debit', 'Period credit', 'Closing (Dr positive)']);
                        foreach ($reports->balances($request->user(), $from, $to, $branch)['rows'] as $row) {
                            $write([$safe($row->code), $safe($row->name), $row->type, $money($row->opening_paisa), $money($row->debit_paisa), $money($row->credit_paisa), $money($row->closing_paisa)]);
                        }
                    } else {
                        $ledger = $reports->accountLedger($request->user(), $account, $from, $to, $branch);
                        $write(['Account ID', $account, 'Opening (Dr positive)', $money($ledger['opening_paisa'])]);
                        $write(['Date', 'Branch', 'Journal', 'Description', 'Source', 'Reversal of', 'Debit', 'Credit', 'Running (Dr positive)']);
                        foreach ($ledger['query']->cursor() as $row) {
                            $write([$row->business_date, $safe($row->branch_code), $row->reference, $safe($row->description), $row->source_type, $row->reversal_of, $money($row->debit_paisa), $money($row->credit_paisa), $money($row->running_paisa)]);
                        }
                    }
                    fclose($out);
                });
            }, 'posted-gl-'.$data['download'].'-'.$to.'.csv', ['Content-Type' => 'text/csv; charset=UTF-8', 'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff']);
        }

        return DB::transaction(function () use ($request, $reports, $from, $to, $branch, $account, $data) {
            $ledger = $account !== null ? $reports->accountLedger($request->user(), $account, $from, $to, $branch) : null;

            return Inertia::render('FinancialReports/Index', [...$reports->balances($request->user(), $from, $to, $branch), 'report' => $data['report'] ?? ($account ? 'ledger' : 'trial'), 'from' => $from, 'to' => $to, 'branchId' => $branch, 'accountId' => $account,
                'branches' => DB::table('branches')->orderBy('code')->get(['id', 'code', 'name']), 'accounts' => DB::table('ledger_accounts')->orderBy('code')->get(['id', 'code', 'name']),
                'ledger' => $ledger ? ['opening_paisa' => $ledger['opening_paisa'], 'entries' => $ledger['query']->paginate(50)->withQueryString()] : null]);
        });
    }
}
