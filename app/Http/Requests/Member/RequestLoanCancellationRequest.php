<?php

namespace App\Http\Requests\Member;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class RequestLoanCancellationRequest extends FormRequest
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
            'reason' => ['required', 'string', 'min:3', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'reason.required' => 'বাতিলের কারণ লিখুন।',
            'reason.min' => 'বাতিলের কারণ কমপক্ষে ৩ অক্ষরের হতে হবে।',
            'reason.max' => 'বাতিলের কারণ ৫০০ অক্ষরের বেশি হতে পারবে না।',
        ];
    }
}
