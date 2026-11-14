<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBankStatementLineRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null && $user->canPostBranchCash($this->integer('branch_id'));
    }

    public function rules(): array
    {
        return [
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'bank_account_id' => ['required', 'integer', 'exists:ledger_accounts,id'],
            'business_date' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'amount' => ['required', 'string', 'max:31'],
            'reference' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:1000'],
        ];
    }
}
