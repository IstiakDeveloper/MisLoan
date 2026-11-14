<?php

namespace App\Services\Accounting;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Product and branch GL defaults. Empty settings never invent an account. */
final class PostingDefaults
{
    /** @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function fillLoan(array $input, int $branchId, ?int $productId): array
    {
        $resolved = $this->resolve($branchId, $productId, null);

        return $this->fill($input, [
            'principal_account_id' => $resolved['loan_principal_account_id'],
            'charge_income_account_id' => $resolved['loan_charge_income_account_id'],
            'counter_account_id' => $resolved['loan_cash_account_id'],
            'cash_account_id' => $resolved['loan_cash_account_id'],
        ]);
    }

    /** @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function fillSavings(array $input, int $branchId, ?int $productId): array
    {
        $resolved = $this->resolve($branchId, null, $productId);

        return $this->fill($input, [
            'liability_account_id' => $resolved['savings_liability_account_id'],
            'counter_account_id' => $resolved['savings_cash_account_id'],
        ]);
    }

    /** @param  array<string, mixed>  $input */
    public function save(User $actor, array $input): object
    {
        abort_unless($actor->isFinancialAdministrator(), 403);
        $branchId = isset($input['branch_id']) ? (int) $input['branch_id'] : null;
        $loanProductId = isset($input['loan_product_id']) ? (int) $input['loan_product_id'] : null;
        $savingsProductId = isset($input['savings_product_id']) ? (int) $input['savings_product_id'] : null;
        if ($loanProductId && $savingsProductId) {
            $this->fail('Choose a loan product or a savings product, not both.');
        }
        if ($branchId) {
            abort_unless($actor->canAccessBranch($branchId), 403);
        }
        $accounts = [
            'loan_principal_account_id' => ['asset', $input['loan_principal_account_id'] ?? null],
            'loan_charge_income_account_id' => ['income', $input['loan_charge_income_account_id'] ?? null],
            'loan_cash_account_id' => ['asset', $input['loan_cash_account_id'] ?? null],
            'loan_rebate_expense_account_id' => ['expense', $input['loan_rebate_expense_account_id'] ?? null],
            'savings_liability_account_id' => ['liability', $input['savings_liability_account_id'] ?? null],
            'savings_cash_account_id' => ['asset', $input['savings_cash_account_id'] ?? null],
            'savings_profit_expense_account_id' => ['expense', $input['savings_profit_expense_account_id'] ?? null],
        ];
        $row = ['branch_id' => $branchId, 'loan_product_id' => $loanProductId, 'savings_product_id' => $savingsProductId];
        $any = false;
        foreach ($accounts as $column => [$type, $id]) {
            $row[$column] = $id ? $this->account((int) $id, $type) : null;
            $any = $any || $row[$column] !== null;
        }
        if (! $any) {
            $this->fail('Select at least one ledger account.');
        }
        $key = $this->scopeKey($branchId, $loanProductId, $savingsProductId);
        $existing = DB::table('gl_posting_defaults')->where('scope_key', $key)->first();
        $payload = [...$row, 'scope_key' => $key, 'updated_at' => now()];
        if ($existing) {
            DB::table('gl_posting_defaults')->where('id', $existing->id)->update($payload);

            return DB::table('gl_posting_defaults')->find($existing->id);
        }
        $id = DB::table('gl_posting_defaults')->insertGetId([...$payload, 'created_by' => $actor->id, 'created_at' => now()]);

        return DB::table('gl_posting_defaults')->find($id);
    }

    /**
     * @return array{loan_principal_account_id: ?int, loan_charge_income_account_id: ?int, loan_cash_account_id: ?int, loan_rebate_expense_account_id: ?int, savings_liability_account_id: ?int, savings_cash_account_id: ?int, savings_profit_expense_account_id: ?int}
     */
    public function resolve(int $branchId, ?int $loanProductId, ?int $savingsProductId): array
    {
        $rows = DB::table('gl_posting_defaults')->where(function ($query) use ($branchId) {
            $query->whereNull('branch_id')->orWhere('branch_id', $branchId);
        })->when($loanProductId, function ($query) use ($loanProductId) {
            $query->where(function ($inner) use ($loanProductId) {
                $inner->whereNull('loan_product_id')->orWhere('loan_product_id', $loanProductId);
            })->whereNull('savings_product_id');
        }, function ($query) use ($savingsProductId) {
            $query->whereNull('loan_product_id')->where(function ($inner) use ($savingsProductId) {
                $inner->whereNull('savings_product_id');
                if ($savingsProductId) {
                    $inner->orWhere('savings_product_id', $savingsProductId);
                }
            });
        })->get()->sortByDesc(fn (object $row): int => ($row->branch_id ? 2 : 0) + ($row->loan_product_id || $row->savings_product_id ? 4 : 0));
        $resolved = [
            'loan_principal_account_id' => null, 'loan_charge_income_account_id' => null, 'loan_cash_account_id' => null, 'loan_rebate_expense_account_id' => null,
            'savings_liability_account_id' => null, 'savings_cash_account_id' => null, 'savings_profit_expense_account_id' => null,
        ];
        foreach ($rows as $row) {
            foreach (array_keys($resolved) as $column) {
                if ($resolved[$column] === null && $row->{$column}) {
                    $resolved[$column] = (int) $row->{$column};
                }
            }
        }

        return $resolved;
    }

    /** @param  array<string, mixed>  $input
     * @param  array<string, ?int>  $defaults
     * @return array<string, mixed>
     */
    private function fill(array $input, array $defaults): array
    {
        foreach ($defaults as $field => $accountId) {
            if (empty($input[$field]) && $accountId) {
                $input[$field] = $accountId;
            }
        }

        return $input;
    }

    private function account(int $id, string $type): int
    {
        $account = DB::table('ledger_accounts')->find($id);
        if (! $account || ! $account->is_active || $account->type !== $type) {
            $this->fail('Select an active '.$type.' account.');
        }

        return $id;
    }

    private function scopeKey(?int $branchId, ?int $loanProductId, ?int $savingsProductId): string
    {
        $parts = ['institution'];
        if ($loanProductId) {
            $parts[] = 'loan:'.$loanProductId;
        }
        if ($savingsProductId) {
            $parts[] = 'savings:'.$savingsProductId;
        }
        if ($branchId) {
            $parts[] = 'branch:'.$branchId;
        }

        return implode('|', $parts);
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['posting_default' => $message]);
    }
}
