<?php

namespace App\Services\Loans;

use Illuminate\Support\Facades\DB;

/** Unearned service charge from the signed contract. It does not reprice the loan. */
final class ProductServiceCharge
{
    public function unearnedPaisa(object $account, string $date): int
    {
        $terms = json_decode($account->terms_snapshot, true, 512, JSON_THROW_ON_ERROR);
        $count = (int) ($terms['count'] ?? 0);
        $charge = (int) $account->contract_charge_paisa;
        if ($count < 1 || $charge <= 0) {
            return 0;
        }
        $future = DB::table('loan_installments')->where('loan_account_id', $account->id)->where('due_on', '>', $date)->orderBy('sequence')->get();
        if ($future->isEmpty()) {
            return 0;
        }
        $split = $terms['pricing']['installment_split'] ?? null;
        if (! is_array($split)) {
            return intdiv($charge * $future->count(), $count);
        }
        $unearned = 0;
        foreach ($future as $row) {
            $last = (int) $row->sequence === $count;
            $unearned += (int) ($split[$last ? 'last_charge_paisa' : 'regular_charge_paisa'] ?? 0);
        }

        return max(0, $unearned);
    }
}
