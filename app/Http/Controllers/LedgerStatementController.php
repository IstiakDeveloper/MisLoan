<?php

namespace App\Http\Controllers;

use App\Services\Accounting\FinancialReports;
use App\Services\Reporting\Csv;
use App\Services\Reporting\LedgerStatements;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class LedgerStatementController extends Controller
{
    public function loan(Request $request, int $account)
    {
        return $this->statement($request, 'loan', $account);
    }

    public function savings(Request $request, int $account)
    {
        return $this->statement($request, 'savings', $account);
    }

    private function statement(Request $request, string $kind, int $account)
    {
        app(FinancialReports::class)->authorize($request->user(), null);
        $data = $request->validate(['from' => ['nullable', 'date_format:Y-m-d'], 'to' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'], 'format' => ['nullable', 'in:print,csv']]);
        $from = $data['from'] ?? null;
        $to = $data['to'] ?? today()->toDateString();
        $service = app(LedgerStatements::class);
        // Authorize and validate before sending any streaming response headers.
        $service->read($request->user(), $kind, $account, $from, $to);
        $headers = ['Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff'];
        if (($data['format'] ?? 'print') === 'csv') {
            return response()->streamDownload(function () use ($service, $request, $kind, $account, $from, $to) {
                DB::transaction(function () use ($service, $request, $kind, $account, $from, $to) {
                    $statement = $service->read($request->user(), $kind, $account, $from, $to);
                    $out = fopen('php://output', 'w');
                    fwrite($out, "\xEF\xBB\xBF");
                    Csv::row($out, [ucfirst($kind).' posted ledger statement', $statement['account']->reference, 'From', $statement['from'], 'To', $to]);
                    Csv::row($out, ['Opening balance', Csv::money($statement['opening_paisa']), 'Closing balance', Csv::money($statement['closing_paisa'])]);
                    Csv::row($out, ['Date', 'Receipt ID', 'Reference', 'Kind', 'Principal / savings movement', 'Charge movement', 'Running principal / savings', 'Running charge', 'Journal', 'Reversal of', 'Actor ID', 'Description']);
                    foreach ($statement['query']->cursor() as $row) {
                        Csv::row($out, [$row->business_date, $row->id, $row->reference, $row->kind, Csv::money($row->principal_paisa), Csv::money($row->charge_paisa), Csv::money($row->running_principal_paisa), Csv::money($row->running_charge_paisa), $row->journal_entry_id, $row->reversal_of, $row->created_by, Csv::text($row->description)]);
                    }
                    fclose($out);
                });
            }, $kind.'-statement-'.$account.'-'.$to.'.csv', [...$headers, 'Content-Type' => 'text/csv; charset=UTF-8']);
        }

        return DB::transaction(function () use ($service, $request, $kind, $account, $from, $to, $headers) {
            $statement = $service->read($request->user(), $kind, $account, $from, $to);
            $rows = $statement['query']->limit(2001)->get();
            $truncated = $rows->count() > 2000;

            return response()->view('reports.ledger-statement', [...$statement, 'rows' => $rows->take(2000), 'truncated' => $truncated, 'generatedAt' => now()->toIso8601String()], 200, $headers);
        });
    }
}
