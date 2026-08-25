<?php

namespace App\Http\Requests\HeadOffice;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateHoSendCutoffRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null
            && ($user->has_all_access || $user->isSuperAdmin() || $user->isHeadOffice());
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'cutoff_time' => ['required', 'date_format:H:i'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'cutoff_time.required' => 'প্রেরণ সময়সীমা দিতে হবে।',
            'cutoff_time.date_format' => 'সময় ঘণ্টা:মিনিট আকারে দিন (যেমন ১৭:০০)।',
        ];
    }

    protected function prepareForValidation(): void
    {
        $time = $this->input('cutoff_time');

        if (is_string($time) && preg_match('/^\d{2}:\d{2}:\d{2}$/', $time) === 1) {
            $this->merge([
                'cutoff_time' => substr($time, 0, 5),
            ]);
        }
    }
}
