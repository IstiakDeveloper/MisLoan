<?php

namespace App\Http\Requests\Member;

use App\Models\LoanApplication;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class DisburseLoanRequest extends FormRequest
{
    private ?float $productMax = null;

    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $productMax = $this->productMaxAmount();
        $maxLimit = $productMax > 0 ? $productMax : 99999999;

        return [
            'disbursement_date' => ['required', 'date', 'before_or_equal:today'],
            'disbursed_amount' => ['nullable', 'numeric', 'min:1', 'max:'.$maxLimit],
            'disbursement_method' => ['nullable', 'string', 'max:50'],
            'disbursement_reference' => ['nullable', 'string', 'max:100'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        $productMax = $this->productMaxAmount();

        return [
            'disbursement_date.required' => 'বিতরণের তারিখ নির্বাচন করুন।',
            'disbursement_date.date' => 'বিতরণের তারিখ সঠিক নয়।',
            'disbursement_date.before_or_equal' => 'বিতরণের তারিখ আজকের তারিখের পরে হতে পারবে না।',
            'disbursed_amount.max' => $productMax > 0
                ? 'বিতরণকৃত ঋণের পরিমাণ প্রডাক্টের সর্বোচ্চ সীমার (৳'.number_format($productMax).') চেয়ে বেশি হতে পারবে না।'
                : 'বিতরণকৃত ঋণের পরিমাণ অতিরিক্ত বেশি হতে পারবে না।',
            'disbursed_amount.min' => 'বিতরণকৃত ঋণের পরিমাণ অন্তত ১ টাকা হতে হবে।',
        ];
    }

    private function productMaxAmount(): float
    {
        if ($this->productMax !== null) {
            return $this->productMax;
        }

        $id = $this->route('id');
        if (! $id) {
            return $this->productMax = 0.0;
        }

        $application = LoanApplication::query()->with('loanProduct')->find($id);

        return $this->productMax = (float) ($application?->loanProduct?->max_amount ?? 0);
    }
}
