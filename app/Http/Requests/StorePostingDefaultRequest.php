<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePostingDefaultRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isFinancialAdministrator();
    }

    protected function prepareForValidation(): void
    {
        $this->merge(collect($this->all())->map(fn (mixed $value): mixed => $value === '' ? null : $value)->all());
    }

    public function rules(): array
    {
        return [
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
            'loan_product_id' => ['nullable', 'integer', 'exists:loan_products,id', 'prohibits:savings_product_id'],
            'savings_product_id' => ['nullable', 'integer', 'exists:savings_products,id'],
            'loan_principal_account_id' => ['nullable', 'integer', 'exists:ledger_accounts,id', 'required_without_all:loan_charge_income_account_id,loan_cash_account_id,loan_rebate_expense_account_id,savings_liability_account_id,savings_cash_account_id,savings_profit_expense_account_id'],
            'loan_charge_income_account_id' => ['nullable', 'integer', 'exists:ledger_accounts,id'],
            'loan_cash_account_id' => ['nullable', 'integer', 'exists:ledger_accounts,id'],
            'loan_rebate_expense_account_id' => ['nullable', 'integer', 'exists:ledger_accounts,id'],
            'savings_liability_account_id' => ['nullable', 'integer', 'exists:ledger_accounts,id'],
            'savings_cash_account_id' => ['nullable', 'integer', 'exists:ledger_accounts,id'],
            'savings_profit_expense_account_id' => ['nullable', 'integer', 'exists:ledger_accounts,id'],
        ];
    }
}
