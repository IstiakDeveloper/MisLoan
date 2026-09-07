<?php

namespace App\Http\Requests\HeadOffice;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateLoanApplicationIssueRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        if ($user === null) {
            return false;
        }

        $user->loadMissing('role');

        return $user->has_all_access
            || $user->isSuperAdmin()
            || $user->isHeadOffice()
            || $user->isCso();
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'issue_description' => ['required', 'string', 'max:2000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'issue_description.required' => 'সমস্যার বিবরণ লিখতে হবে।',
            'issue_description.max' => 'সমস্যার বিবরণ সর্বোচ্চ ২০০০ অক্ষর হতে পারবে।',
        ];
    }
}
