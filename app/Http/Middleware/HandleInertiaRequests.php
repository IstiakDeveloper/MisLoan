<?php

namespace App\Http\Middleware;

use App\Models\Area;
use App\Models\Branch;
use App\Models\Notification;
use App\Models\Role;
use App\Models\Zone;
use App\Services\AccountingPeriodService;
use App\Services\CsoAllocationService;
use App\Services\HoSendCutoffService;
use App\Services\LoanWorkflowConfigService;
use App\Services\NavBadgeService;
use App\Support\NavBadgeCache;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Sanitize string for JSON encoding
     */
    private function sanitizeString($value)
    {
        if (is_string($value)) {
            return mb_convert_encoding($value, 'UTF-8', 'UTF-8');
        }

        return $value;
    }

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        // Disable Inspiring quotes to avoid UTF-8 issues
        $message = 'Welcome';
        $author = 'MIS Loan System';

        $userData = null;
        if ($request->user()) {
            $user = $request->user();

            $avatarUrl = $user->profile_photo ? '/storage/'.ltrim($user->profile_photo, '/') : null;

            // Build user data manually without loading relationships
            $userData = [
                'id' => $user->id,
                'name' => $this->sanitizeString($user->name ?? ''),
                'email' => $this->sanitizeString($user->email ?? ''),
                'username' => $this->sanitizeString($user->username ?? ''),
                'pin' => $this->sanitizeString($user->pin ?? ''),
                'profile_photo' => $user->profile_photo,
                'avatar' => $avatarUrl,
                'signature' => $user->signature,
                'has_all_access' => (bool) $user->has_all_access,
                'is_read_only' => $user->isReadOnlyAdmin(),
                'is_active' => (bool) $user->is_active,
                'is_blocked' => (bool) $user->is_blocked,
                'account_type' => $user->account_type ?? 'staff',
                'needs_portfolio_handover' => $user->needsPortfolioHandover(),
                'role' => null,
                'zone' => null,
                'area' => null,
                'branch' => null,
            ];

            // Manually query role if role_id exists
            if ($user->role_id) {
                try {
                    $role = DB::table('roles')
                        ->select('id', 'name')
                        ->where('id', $user->role_id)
                        ->first();

                    if ($role) {
                        $userData['role'] = [
                            'id' => $role->id,
                            'name' => $this->sanitizeString($role->name ?? ''),
                        ];
                    }
                } catch (\Exception $e) {
                    Log::error('Error loading role in HandleInertiaRequests: '.$e->getMessage());
                }
            }

            // Manually query zone if zone_id exists
            if ($user->zone_id) {
                try {
                    $zone = DB::table('zones')
                        ->select('id', 'name')
                        ->where('id', $user->zone_id)
                        ->first();

                    if ($zone) {
                        $userData['zone'] = [
                            'id' => $zone->id,
                            'name' => $this->sanitizeString($zone->name ?? ''),
                        ];
                    }
                } catch (\Exception $e) {
                    Log::error('Error loading zone in HandleInertiaRequests: '.$e->getMessage());
                }
            }

            // Manually query area if area_id exists
            if ($user->area_id) {
                try {
                    $area = DB::table('areas')
                        ->select('id', 'name')
                        ->where('id', $user->area_id)
                        ->first();

                    if ($area) {
                        $userData['area'] = [
                            'id' => $area->id,
                            'name' => $this->sanitizeString($area->name ?? ''),
                        ];
                    }
                } catch (\Exception $e) {
                    Log::error('Error loading area in HandleInertiaRequests: '.$e->getMessage());
                }
            }

            // Manually query branch if branch_id exists
            if ($user->branch_id) {
                try {
                    $selectColumns = Schema::hasColumn('branches', 'accounting_enabled')
                        ? ['id', 'name', 'accounting_enabled']
                        : ['id', 'name'];
                    $branch = DB::table('branches')
                        ->select($selectColumns)
                        ->where('id', $user->branch_id)
                        ->first();

                    if ($branch) {
                        $userData['branch'] = [
                            'id' => $branch->id,
                            'name' => $this->sanitizeString($branch->name ?? ''),
                            'accounting_enabled' => (bool) ($branch->accounting_enabled ?? false),
                        ];
                    }
                } catch (\Exception $e) {
                    Log::error('Error loading branch in HandleInertiaRequests: '.$e->getMessage());
                }
            }

            if (($userData['role']['name'] ?? '') === Role::CSO) {
                try {
                    $areaIds = app(CsoAllocationService::class)->getAssignedAreaIdsForUser($user);
                    $userData['cso_areas'] = DB::table('areas')
                        ->whereIn('id', $areaIds)
                        ->select('id', 'name', 'code')
                        ->get()
                        ->map(fn ($a) => [
                            'id' => $a->id,
                            'name' => $this->sanitizeString($a->name ?? ''),
                            'code' => $this->sanitizeString($a->code ?? ''),
                        ])
                        ->toArray();
                } catch (\Exception $e) {
                    $userData['cso_areas'] = [];
                }
            }
        }

        $emptyBadges = [
            'pendingLoanApplications' => 0,
            'pendingAdmissions' => 0,
            'pendingApprovals' => 0,
            'pendingClusterHandovers' => 0,
            'pendingVerifications' => 0,
        ];

        $badgeCounts = $emptyBadges;
        $notifications = [];
        $unreadNotificationsCount = 0;

        if ($user = $request->user()) {
            $badgeCounts = Cache::remember(
                NavBadgeCache::key((int) $user->id),
                30,
                fn () => app(NavBadgeService::class)->forUser($user)
            );

            try {
                $notifications = Notification::query()
                    ->where('user_id', $user->id)
                    ->orderByDesc('created_at')
                    ->limit(8)
                    ->get(['id', 'user_id', 'type', 'title', 'message', 'action_url', 'is_read', 'created_at']);

                $unreadNotificationsCount = Notification::query()
                    ->where('user_id', $user->id)
                    ->unread()
                    ->count();
            } catch (\Exception $e) {
                Log::error('Error loading notifications in HandleInertiaRequests: '.$e->getMessage());
            }
        }

        $canSwitchOffice = false;
        $activeOffice = null;
        $officeTree = [];

        if ($user) {
            $roleName = $userData['role']['name'] ?? null;
            $canSwitchOffice = (bool) ($user->has_all_access || in_array($roleName, [Role::SUPER_ADMIN, Role::HEAD_OFFICE, Role::ED], true));

            if ($canSwitchOffice) {
                $sessionBranchId = (int) $request->session()->get('active_branch_id', 0);
                if ($sessionBranchId > 0) {
                    $b = Branch::operational()->find($sessionBranchId, ['id', 'code', 'name']);
                    if ($b) {
                        $activeOffice = ['id' => $b->id, 'code' => $b->code, 'name' => $b->name];
                    } else {
                        $request->session()->forget('active_branch_id');
                    }
                }

                $officeTree = Cache::remember('ho_office_tree_v1', 300, function () {
                    $branchesByArea = Branch::operational()
                        ->orderedByCode()
                        ->get(['id', 'area_id', 'code', 'name'])
                        ->groupBy('area_id');

                    $areasByZone = Area::query()
                        ->where('is_active', true)
                        ->orderBy('code')
                        ->orderBy('name')
                        ->get(['id', 'zone_id', 'code', 'name'])
                        ->map(fn ($a) => [
                            'id' => $a->id,
                            'zone_id' => $a->zone_id,
                            'code' => $a->code,
                            'name' => $a->name,
                            'branches' => ($branchesByArea->get($a->id) ?? collect())->values()->all(),
                        ])
                        ->filter(fn ($a) => count($a['branches']) > 0)
                        ->groupBy('zone_id');

                    return Zone::query()
                        ->where('is_active', true)
                        ->orderBy('code')
                        ->orderBy('name')
                        ->get(['id', 'code', 'name'])
                        ->map(fn ($z) => [
                            'id' => $z->id,
                            'code' => $z->code,
                            'name' => $z->name,
                            'areas' => ($areasByZone->get($z->id) ?? collect())->values()->all(),
                        ])
                        ->filter(fn ($z) => count($z['areas']) > 0)
                        ->values()
                        ->all();
                });
            }
        }

        return array_merge(parent::share($request), [
            'csrf_token' => csrf_token(),
            'name' => 'MIS Loan',
            'quote' => ['message' => $message, 'author' => $author],
            'auth' => [
                'user' => $userData,
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
                'warning' => $request->session()->get('warning'),
                'info' => $request->session()->get('info'),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'badgeCounts' => $badgeCounts,
            'unreadNotificationsCount' => $unreadNotificationsCount,
            'notifications' => $notifications,
            'siteMaintenance' => Cache::get('site_maintenance', false),
            'canSwitchOffice' => $canSwitchOffice,
            'activeOffice' => $activeOffice,
            'officeTree' => $officeTree,
            'hoSendCutoff' => $request->user()
                ? app(HoSendCutoffService::class)->toSharedArray()
                : null,
            'loanWorkflowConfig' => $request->user()
                ? app(LoanWorkflowConfigService::class)->toSharedArray()
                : null,
            'activeBusinessDay' => ($request->user()
                && $request->user()->branch_id
                && Schema::hasTable('branch_accounting_periods')
                && Schema::hasColumn('branches', 'accounting_enabled')
                && (bool) DB::table('branches')->where('id', $request->user()->branch_id)->value('accounting_enabled'))
                ? app(AccountingPeriodService::class)->getBranchDayState((int) $request->user()->branch_id)
                : null,
        ]);
    }
}
