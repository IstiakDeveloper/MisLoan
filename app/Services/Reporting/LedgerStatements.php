<?php

namespace App\Services\Reporting;

use App\Models\User;
use App\Services\Accounting\FinancialReports;
use Brick\Math\BigInteger;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class LedgerStatements
{
    public function read(User $actor, string $kind, int $id, ?string $from, string $to): array
    {
        abort_unless(in_array($kind, ['loan', 'savings'], true), 404);
        $reports = app(FinancialReports::class);
        $reports->authorize($actor, null);
        $account = DB::table($kind.'_accounts')->find($id);
        abort_unless($account, 404);
        $reports->authorize($actor, (int) $account->branch_id);
        $from ??= $account->opened_on;
        $reports->dates($from, $to);
        if ($from < $account->opened_on) {
            throw ValidationException::withMessages(['from' => 'Statements before the verified ledger opening are unavailable.']);
        }
        $column = $kind === 'loan' ? 'loan_account_id' : 'savings_account_id';
        $principal = $kind === 'loan' ? 'principal_paisa' : 'amount_paisa';
        $charge = $kind === 'loan' ? 'charge_paisa' : '0';
        $query = DB::table($kind.'_transactions')->where($column, $id)->where('business_date', '<=', $to);
        $aggregate = (clone $query)->selectRaw('COALESCE(SUM(CASE WHEN business_date < ? THEN '.$principal.' ELSE 0 END), 0) AS opening_principal, COALESCE(SUM(CASE WHEN business_date < ? THEN '.$charge.' ELSE 0 END), 0) AS opening_charge, COALESCE(SUM('.$principal.'),0) AS closing_principal, COALESCE(SUM('.$charge.'),0) AS closing_charge', [$from, $from])->first();
        $entries = $query->where('business_date', '>=', $from)->select('id', 'reference', 'business_date', 'kind', 'description', 'journal_entry_id', 'reversal_of', 'created_by')
            ->selectRaw('CAST('.$principal.' AS CHAR) AS principal_paisa, CAST('.$charge.' AS CHAR) AS charge_paisa')
            ->selectRaw('CAST(CAST(? AS DECIMAL(65,0)) + SUM('.$principal.') OVER (ORDER BY business_date, id ROWS UNBOUNDED PRECEDING) AS CHAR) AS running_principal_paisa, CAST(CAST(? AS DECIMAL(65,0)) + SUM('.$charge.') OVER (ORDER BY business_date, id ROWS UNBOUNDED PRECEDING) AS CHAR) AS running_charge_paisa', [(string) $aggregate->opening_principal, (string) $aggregate->opening_charge]);

        return ['kind' => $kind, 'account' => $account, 'from' => $from, 'to' => $to,
            'opening_paisa' => (string) BigInteger::of((string) $aggregate->opening_principal)->plus((string) $aggregate->opening_charge),
            'closing_paisa' => (string) BigInteger::of((string) $aggregate->closing_principal)->plus((string) $aggregate->closing_charge),
            'query' => DB::query()->fromSub($entries, 'statement')->orderBy('business_date')->orderBy('id')];
    }
}
