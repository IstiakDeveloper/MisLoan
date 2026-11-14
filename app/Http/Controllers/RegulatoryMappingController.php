<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

final class RegulatoryMappingController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()?->isFinancialAdministrator(), 403);
        $asOf = $request->validate(['as_of' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today']])['as_of'] ?? today()->toDateString();
        $mappings = DB::table('regulatory_account_mappings as mapping')
            ->leftJoin('ledger_accounts as account', 'account.id', '=', 'mapping.ledger_account_id')
            ->orderBy('mapping.framework')->orderBy('mapping.line_code')
            ->get(['mapping.*', 'account.code as account_code', 'account.name as account_name']);
        $rows = $mappings->map(function (object $mapping) use ($asOf) {
            $balance = 0;
            if ($mapping->ledger_account_id) {
                $sum = DB::table('journal_lines as line')->join('journal_entries as entry', 'entry.id', '=', 'line.journal_entry_id')
                    ->where('line.ledger_account_id', $mapping->ledger_account_id)->where('entry.business_date', '<=', $asOf)
                    ->selectRaw('COALESCE(SUM(line.debit_paisa),0) as debit, COALESCE(SUM(line.credit_paisa),0) as credit')->first();
                $balance = (int) $sum->debit - (int) $sum->credit;
            }
            $mapping->balance_paisa = $balance;

            return $mapping;
        });

        return Inertia::render('Accounting/RegulatoryMappings', [
            'asOf' => $asOf,
            'mappings' => $rows,
            'accounts' => DB::table('ledger_accounts')->where('is_active', true)->orderBy('code')->get(['id', 'code', 'name', 'type']),
        ]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()?->isFinancialAdministrator(), 403);
        $data = $request->validate([
            'framework' => ['required', Rule::in(['mra', 'pksf'])],
            'line_code' => ['required', 'string', 'max:32'],
            'line_name' => ['required', 'string', 'max:255'],
            'ledger_account_id' => ['nullable', 'integer', 'exists:ledger_accounts,id'],
        ]);
        DB::table('regulatory_account_mappings')->updateOrInsert(
            ['framework' => $data['framework'], 'line_code' => $data['line_code']],
            [...$data, 'created_by' => $request->user()->id, 'updated_at' => now(), 'created_at' => now()],
        );

        return back()->with('success', 'Regulatory mapping saved. Unmapped accounts stay off this report.');
    }
}
