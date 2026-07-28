<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Http\Controllers\Auth\AuthController;
use App\Models\Branch;
use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Laravel\Fortify\Actions\AttemptToAuthenticate;
use Laravel\Fortify\Actions\CanonicalizeUsername;
use Laravel\Fortify\Actions\EnsureLoginIsNotThrottled;
use Laravel\Fortify\Actions\PrepareAuthenticatedSession;
use Laravel\Fortify\Contracts\RedirectsIfTwoFactorAuthenticatable;
use Laravel\Fortify\Features;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(
            \Laravel\Fortify\Http\Requests\LoginRequest::class,
            \App\Http\Requests\LoginRequest::class,
        );
    }

    public function boot(): void
    {
        $this->configureAuthentication();
        $this->configureLoginPipeline();
        $this->configureActions();
        $this->configureViews();
        $this->configureRateLimiting();
    }

    private function configureAuthentication(): void
    {
        Fortify::authenticateUsing(function (Request $request) {
            if ($request->input('mode') === 'branch') {
                return app(AuthController::class)->authenticateBranch($request, app(\App\Services\BranchAccountService::class));
            }

            $login = trim((string) $request->input('login'));
            $password = $request->input('password');

            $user = User::query()
                ->where(function ($query) use ($login) {
                    $query->where('email', $login)
                        ->orWhere('username', $login);
                })
                ->where(function ($q) {
                    $q->where('account_type', 'staff')->orWhereNull('account_type');
                })
                ->first();

            if (! $user) {
                throw ValidationException::withMessages([
                    'login' => ['These credentials do not match our records.'],
                ]);
            }

            if ($user->isBranchAccount()) {
                throw ValidationException::withMessages([
                    'login' => ['Please use Branch Login for this account.'],
                ]);
            }

            if (! $user->is_active) {
                throw ValidationException::withMessages([
                    'login' => ['Your account has been deactivated. Please contact your administrator.'],
                ]);
            }

            if (! Hash::check($password, $user->password)) {
                throw ValidationException::withMessages([
                    'login' => ['These credentials do not match our records.'],
                ]);
            }

            $request->session()->forget(['branch_login', 'branch_context_id']);

            return $user;
        });
    }

    private function configureLoginPipeline(): void
    {
        Fortify::authenticateThrough(function (Request $request) {
            return array_filter([
                config('fortify.limiters.login') ? null : EnsureLoginIsNotThrottled::class,
                config('fortify.lowercase_usernames') && $request->input('mode') !== 'branch'
                    ? CanonicalizeUsername::class
                    : null,
                Features::enabled(Features::twoFactorAuthentication())
                    ? RedirectsIfTwoFactorAuthenticatable::class
                    : null,
                AttemptToAuthenticate::class,
                PrepareAuthenticatedSession::class,
            ]);
        });
    }

    private function configureActions(): void
    {
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
        Fortify::createUsersUsing(CreateNewUser::class);
    }

    private function configureViews(): void
    {
        Fortify::loginView(fn (Request $request) => Inertia::render('auth/login', [
            'canResetPassword' => Features::enabled(Features::resetPasswords()),
            'status' => $request->session()->get('status'),
            'error' => $request->session()->get('error'),
            'branches' => Branch::query()
                ->where('is_active', true)
                ->whereNotNull('login_pin')
                ->orderBy('code')
                ->get(['id', 'name', 'code']),
        ]));

        Fortify::resetPasswordView(fn (Request $request) => Inertia::render('auth/reset-password', [
            'email' => $request->email,
            'token' => $request->route('token'),
        ]));

        Fortify::requestPasswordResetLinkView(fn (Request $request) => Inertia::render('auth/forgot-password', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::twoFactorChallengeView(fn () => Inertia::render('auth/two-factor-challenge'));

        Fortify::confirmPasswordView(fn () => Inertia::render('auth/confirm-password'));
    }

    private function configureRateLimiting(): void
    {
        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by($request->session()->get('login.id'));
        });

        RateLimiter::for('login', function (Request $request) {
            if ($request->input('mode') === 'branch') {
                $throttleKey = 'branch|'.$request->input('branch_id').'|'.$request->ip();
            } else {
                $throttleKey = Str::transliterate(Str::lower((string) $request->input('login')).'|'.$request->ip());
            }

            return Limit::perMinute(5)->by($throttleKey);
        });
    }
}
