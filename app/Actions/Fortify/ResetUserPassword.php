<?php

namespace App\Actions\Fortify;

use App\Models\User;
use App\Services\BranchAccountService;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\ResetsUserPasswords;

class ResetUserPassword implements ResetsUserPasswords
{
    use PasswordValidationRules;

    /**
     * Validate and reset the user's forgotten password.
     *
     * @param  array<string, string>  $input
     */
    public function reset(User $user, array $input): void
    {
        $isBranchAccount = $user->isBranchAccount();

        Validator::make(
            $input,
            [
                'password' => $isBranchAccount
                    ? BranchAccountService::loginPinRules()
                    : $this->passwordRules(),
            ],
            $isBranchAccount ? BranchAccountService::loginPinMessages() : [],
        )->validate();

        app(BranchAccountService::class)->updatePasswordOrPin($user, $input['password']);
    }
}
