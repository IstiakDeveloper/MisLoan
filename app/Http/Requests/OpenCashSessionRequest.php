<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class OpenCashSessionRequest extends FormRequest
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
            'cash_account_id' => ['required', 'integer', 'exists:ledger_accounts,id'],
            'business_date' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'opening_count' => ['required', 'string', 'max:30'],
            'idempotency_key' => ['required', 'string', 'max:100'],
        ];
    }
}
