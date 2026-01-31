<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use App\Models\LoanApplication;
use App\Models\MemberAdmission;

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
        // Set JSON encoding options to handle UTF-8 properly
        // JSON_PARTIAL_OUTPUT_ON_ERROR allows partial JSON output on encoding errors
        // JSON_INVALID_UTF8_SUBSTITUTE replaces invalid UTF-8 with substitution character
        if (method_exists(JsonResource::class, 'withoutWrapping')) {
            JsonResource::withoutWrapping();
        }

        // Set default JSON options for responses
        config([
            'app.json_encode_options' => JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE
        ]);

        // Share unread submissions count with all Inertia views
        Inertia::share([
            'unreadSubmissionsCount' => function () {
                if (auth()->check() && auth()->user()->has_all_access) {
                    return LoanApplication::whereNull('reviewed_at')->count();
                }
                return 0;
            },
            'unreadAdmissionsCount' => function () {
                if (auth()->check() && auth()->user()->has_all_access) {
                    return MemberAdmission::whereNotNull('submitted_at')
                        ->whereNull('reviewed_at')
                        ->count();
                }
                return 0;
            },
        ]);
    }
}
