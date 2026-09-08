<?php

use App\Http\Middleware\CheckBranchUser;
use App\Http\Middleware\CheckHeadOffice;
use App\Http\Middleware\CheckMaintenanceMode;
use App\Http\Middleware\CheckPermission;
use App\Http\Middleware\CheckRole;
use App\Http\Middleware\CheckTeamBasedApprovalReportAccess;
use App\Http\Middleware\EnsureCanViewMemberAdmission;
use App\Http\Middleware\EnsurePortfolioHandoverComplete;
use App\Http\Middleware\EnsureProfileComplete;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\NormalizeInertiaAmounts;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

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
            NormalizeInertiaAmounts::class,
            AddLinkHeadersForPreloadedAssets::class,
            CheckMaintenanceMode::class,
            EnsurePortfolioHandoverComplete::class,
        ]);

        $middleware->alias([
            'ensure.profile.complete' => EnsureProfileComplete::class,
            'ensure.portfolio.handover' => EnsurePortfolioHandoverComplete::class,
            'role' => CheckRole::class,
            'permission' => CheckPermission::class,
            'branch.user' => CheckBranchUser::class,
            'head.office' => CheckHeadOffice::class,
            'team-based.report' => CheckTeamBasedApprovalReportAccess::class,
            'member.admission.view' => EnsureCanViewMemberAdmission::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->respond(function (Response $response, Throwable $exception, Request $request) {
            if ($response->getStatusCode() !== 404) {
                return $response;
            }

            if ($request->expectsJson() || $request->is('api/*')) {
                return $response;
            }

            $message = trim($exception->getMessage());
            $isGenericMessage = $message === ''
                || strcasecmp($message, 'Not Found') === 0
                || str_starts_with($message, 'No route found')
                || str_starts_with($message, 'The route ');

            $customMessage = $exception instanceof HttpExceptionInterface && ! $isGenericMessage
                ? $message
                : null;

            return Inertia::render('errors/404', [
                'message' => $customMessage,
            ])
                ->toResponse($request)
                ->setStatusCode(404);
        });
    })->create();
