<?php

namespace App\Http\Requests\Member;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateMemberSamityRequest extends FormRequest
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
            'samity_id' => ['required', 'integer', 'exists:samities,id'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'samity_id.required' => 'সমিতি নির্বাচন করুন।',
            'samity_id.integer' => 'সমিতি নির্বাচন সঠিক নয়।',
            'samity_id.exists' => 'নির্বাচিত সমিতি পাওয়া যায়নি।',
        ];
    }
}
