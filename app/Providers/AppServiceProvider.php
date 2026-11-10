<?php

namespace App\Providers;

use App\Models\LoanApplication;
use App\Services\Accounting\FinancialMfa;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Queue\Events\JobFailed;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Laravel\Fortify\Events\TwoFactorAuthenticationConfirmed;
use Laravel\Fortify\Events\TwoFactorAuthenticationDisabled;
use Laravel\Fortify\Events\ValidTwoFactorAuthenticationCodeProvided;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Password::defaults(fn () => Password::min(8));

        Event::listen(ValidTwoFactorAuthenticationCodeProvided::class, function ($event) {
            FinancialMfa::mark(request(), $event->user);
        });
        Event::listen(TwoFactorAuthenticationConfirmed::class, function ($event) {
            if ((int) Auth::id() === (int) $event->user->id) {
                FinancialMfa::mark(request(), $event->user);
            }
        });
        Event::listen(TwoFactorAuthenticationDisabled::class, function ($event) {
            if (request()->hasSession() && (int) Auth::id() === (int) $event->user->id) {
                request()->session()->forget('financial_mfa');
            }
        });

        // Set JSON encoding options to handle UTF-8 properly
        // JSON_PARTIAL_OUTPUT_ON_ERROR allows partial JSON output on encoding errors
        // JSON_INVALID_UTF8_SUBSTITUTE replaces invalid UTF-8 with substitution character
        if (method_exists(JsonResource::class, 'withoutWrapping')) {
            JsonResource::withoutWrapping();
        }

        // Set default JSON options for responses
        config([
            'app.json_encode_options' => JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE,
        ]);

        Queue::failing(function (JobFailed $event): void {
            $name = $event->job->resolveName();
            if (! str_contains($name, 'App\\Mail\\')) {
                return;
            }

            $uuid = $event->job->uuid();
            if ($uuid && Schema::hasTable('failed_jobs')) {
                DB::table('failed_jobs')->where('uuid', $uuid)->delete();
            }
        });

        // Share unread submissions count with all Inertia views
        Inertia::share([
            'unreadSubmissionsCount' => function () {
                if (auth()->check() && auth()->user()->has_all_access) {
                    return LoanApplication::whereNull('reviewed_at')->count();
                }

                return 0;
            },
        ]);
    }
}
