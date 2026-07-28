<?php

namespace App\Http\Requests;

use Laravel\Fortify\Http\Requests\LoginRequest as FortifyLoginRequest;

class LoginRequest extends FortifyLoginRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        if ($this->input('mode') === 'branch') {
            return [
                'mode' => 'required|in:branch',
                'branch_id' => 'required|integer|exists:branches,id',
                'pin' => 'required|string|min:4|max:12',
            ];
        }

        return [
            'login' => 'required|string',
            'password' => 'required|string',
        ];
    }
}
