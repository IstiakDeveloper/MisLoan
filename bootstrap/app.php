<?php

use App\Http\Middleware\EnsureProfileComplete;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\CheckRole;
use App\Http\Middleware\CheckPermission;
use App\Http\Middleware\CheckBranchUser;
use App\Http\Middleware\CheckHeadOffice;
use App\Http\Middleware\CheckTeamBasedApprovalReportAccess;
use App\Http\Middleware\EnsureCanViewMemberAdmission;
use App\Http\Middleware\CheckMaintenanceMode;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            CheckMaintenanceMode::class,
        ]);

        $middleware->alias([
            'ensure.profile.complete' => EnsureProfileComplete::class,
            'role' => CheckRole::class,
            'permission' => CheckPermission::class,
            'branch.user' => CheckBranchUser::class,
            'head.office' => CheckHeadOffice::class,
            'team-based.report' => CheckTeamBasedApprovalReportAccess::class,
            'member.admission.view' => EnsureCanViewMemberAdmission::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
