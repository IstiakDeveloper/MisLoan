<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReviewCashSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isFinancialAdministrator();
    }

    public function rules(): array
    {
        return [
            'decision' => ['required', 'in:approved,rejected'],
            'note' => ['required', 'string', 'max:1000'],
            'handed_over_to' => ['required_if:decision,approved', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
