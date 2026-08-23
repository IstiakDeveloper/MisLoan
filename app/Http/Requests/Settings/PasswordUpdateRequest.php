<?php

namespace App\Http\Requests\Settings;

use App\Services\BranchAccountService;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class PasswordUpdateRequest extends FormRequest
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
        $user = $this->user();
        $isBranchAccount = $user?->isBranchAccount() ?? false;

        return [
            'current_password' => [
                'required',
                'string',
                function (string $attribute, mixed $value, \Closure $fail) use ($user, $isBranchAccount): void {
                    if (! $user) {
                        $fail(__('The provided password does not match your current password.'));

                        return;
                    }

                    if ($isBranchAccount) {
                        if (! app(BranchAccountService::class)->verifyCurrentPin($user, (string) $value)) {
                            $fail('The current PIN is incorrect.');
                        }

                        return;
                    }

                    if (! Hash::check((string) $value, $user->password)) {
                        $fail(__('The provided password does not match your current password.'));
                    }
                },
            ],
            'password' => $isBranchAccount
                ? BranchAccountService::loginPinRules()
                : ['required', 'string', Password::defaults(), 'confirmed'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        if ($this->user()?->isBranchAccount()) {
            return BranchAccountService::loginPinMessages();
        }

        return [];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        if ($this->user()?->isBranchAccount()) {
            return [
                'current_password' => 'current PIN',
                'password' => 'PIN',
            ];
        }

        return [];
    }
}
