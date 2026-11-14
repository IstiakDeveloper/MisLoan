<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreInstitutionPolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isFinancialAdministrator();
    }

    protected function prepareForValidation(): void
    {
        $this->merge(collect($this->all())->map(fn (mixed $value): mixed => $value === '' ? null : $value)->all());
        $this->merge(['reschedule_enabled' => $this->boolean('reschedule_enabled')]);
    }

    public function rules(): array
    {
        return [
            'partial_priority' => ['nullable', 'in:principal_first,charge_first'],
            'write_off_expense_account_id' => ['nullable', 'integer', 'exists:ledger_accounts,id'],
            'reschedule_enabled' => ['required', 'boolean'],
        ];
    }
}
