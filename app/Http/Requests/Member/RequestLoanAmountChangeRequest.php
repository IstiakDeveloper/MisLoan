<?php

namespace App\Http\Requests\Member;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class RequestLoanAmountChangeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'approved_amount' => ['required', 'numeric', 'min:1'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'approved_amount.required' => 'নতুন অনুমোদিত পরিমাণ দিতে হবে।',
            'approved_amount.numeric' => 'অনুমোদিত পরিমাণ সঠিক সংখ্যা হতে হবে।',
            'approved_amount.min' => 'অনুমোদিত পরিমাণ অন্তত ১ টাকা হতে হবে।',
        ];
    }
}
