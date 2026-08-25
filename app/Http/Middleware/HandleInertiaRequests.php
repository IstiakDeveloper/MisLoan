<?php

namespace App\Http\Middleware;

use App\Models\LoanApplication;
use App\Models\LoanApplicationApproval;
use App\Models\LoanApplicationIssue;
use App\Models\MemberAdmission;
use App\Models\MemberAdmissionApproval;
use App\Models\MemberAdmissionIssue;
use App\Models\Notification;
use App\Models\Role;
use App\Services\ApprovalService;
use App\Services\ClusterHandoverService;
use App\Services\CsoAllocationService;
use App\Services\HoSendCutoffService;
use Carbon\Carbon;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
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
                    $branch = DB::table('branches')
                        ->select('id', 'name')
                        ->where('id', $user->branch_id)
                        ->first();

                    if ($branch) {
                        $userData['branch'] = [
                            'id' => $branch->id,
                            'name' => $this->sanitizeString($branch->name ?? ''),
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

        // Calculate badge counts for Head Office / SuperAdmin / organizational viewers
        $badgeCounts = [
            'pendingLoanApplications' => 0,
            'pendingAdmissions' => 0,
            'pendingApprovals' => 0,
            'pendingClusterHandovers' => 0,
        ];

        $roleNameForBadges = $userData['role']['name'] ?? null;
        $canViewHeadOfficeBadges = $userData && (
            ($userData['has_all_access'] ?? false)
            || in_array($roleNameForBadges, [
                'super_admin',
                'head_office',
                'cso',
                'ed',
                'admf',
                'dmf',
                'area_manager',
                'zone_manager',
            ], true)
        );

        if ($canViewHeadOfficeBadges) {
            $today = Carbon::today();
            $authUser = $request->user();
            $restrictBranches = $authUser
                && ! $authUser->has_all_access
                && ! $authUser->isSuperAdmin()
                && ! $authUser->isHeadOffice();
            $accessibleBranchIds = $restrictBranches
                ? $authUser->getAccessibleBranches()->pluck('id')->all()
                : null;

            // Pending Loan Applications: status = pending_head_office, submitted_at = today, no pending issues
            // Note: Only pending applications are counted, approved applications are excluded
            $pendingLoanQuery = LoanApplication::where('status', 'pending_head_office')
                ->whereDate('submitted_at', $today);
            if (is_array($accessibleBranchIds)) {
                $pendingLoanQuery->whereIn('branch_id', $accessibleBranchIds ?: [0]);
            }
            $pendingLoanIds = $pendingLoanQuery->pluck('id');

            if ($pendingLoanIds->isNotEmpty()) {
                // Get loan IDs that have pending issues
                $loansWithIssues = LoanApplicationIssue::whereIn('loan_application_id', $pendingLoanIds)
                    ->where('status', 'pending')
                    ->pluck('loan_application_id')
                    ->unique();

                // Count loans without pending issues
                $badgeCounts['pendingLoanApplications'] = $pendingLoanIds->diff($loansWithIssues)->count();
            }

            // Pending Member Admissions: status = pending_head_office, submitted_at = today, no pending issues
            // Note: Only pending admissions are counted, approved admissions are excluded
            $pendingAdmissionQuery = MemberAdmission::where('status', 'pending_head_office')
                ->whereDate('submitted_at', $today);
            if (is_array($accessibleBranchIds)) {
                $pendingAdmissionQuery->whereIn('branch_id', $accessibleBranchIds ?: [0]);
            }
            $pendingAdmissionIds = $pendingAdmissionQuery->pluck('id');

            if ($pendingAdmissionIds->isNotEmpty()) {
                // Get admission IDs that have pending issues
                $admissionsWithIssues = MemberAdmissionIssue::whereIn('member_admission_id', $pendingAdmissionIds)
                    ->where('status', 'pending')
                    ->pluck('member_admission_id')
                    ->unique();

                // Count admissions without pending issues
                $badgeCounts['pendingAdmissions'] = $pendingAdmissionIds->diff($admissionsWithIssues)->count();
            }

            // Pending Approvals: LoanApplicationApproval + MemberAdmissionApproval where status = pending
            $pendingLoanApprovals = LoanApplicationApproval::where('status', 'pending')
                ->whereHas('loanApplication', function ($query) {
                    $query->whereIn('status', ['submitted', 'under_review']);
                })
                ->count();

            $pendingMemberApprovals = MemberAdmissionApproval::where('status', 'pending')
                ->whereHas('memberAdmission', function ($query) {
                    $query->whereIn('status', ['submitted', 'under_review']);
                })
                ->count();

            $badgeCounts['pendingApprovals'] = $pendingLoanApprovals + $pendingMemberApprovals;

        }

        // Verification Badge Count:
        // - Head Office/Super Admin/ED: Count items where branch has replied and waiting for HO approval.
        // - Branch users/Approvers: Count items where HO raised issues and branch reply is pending.
        if ($userData && $request->user()) {
            $authUser = $request->user();
            $isHoApprover = ($userData['has_all_access'] ?? false)
                || in_array($roleNameForBadges, ['super_admin', 'head_office', 'ed'], true);

            if ($isHoApprover) {
                $repliedAdmissionCount = MemberAdmission::whereNotIn('status', ['approved', 'rejected', 'cancelled'])
                    ->where(function ($q) {
                        $q->whereHas('issues', fn ($iq) => $iq->whereNotNull('zm_approved_at'))
                            ->orWhere(fn ($sq) => $sq->whereNotNull('revision_comments')->where('revision_comments', '!=', '')->where('status', 'pending_head_office'));
                    })
                    ->count();

                $repliedLoanCount = LoanApplication::whereNotIn('status', ['approved', 'rejected', 'cancelled', 'pending_disbursement', 'disbursed'])
                    ->whereHas('issues', fn ($iq) => $iq->whereNotNull('zm_approved_at'))
                    ->count();

                $badgeCounts['pendingVerifications'] = $repliedAdmissionCount + $repliedLoanCount;
            } elseif ($roleNameForBadges === 'zone_manager') {
                $accessibleBranchIds = $authUser->getAccessibleBranches()->pluck('id')->all();

                $pendingAdmissionQuery = MemberAdmission::whereNotIn('status', ['approved', 'rejected', 'cancelled'])
                    ->whereIn('branch_id', $accessibleBranchIds ?: [0])
                    ->where(function ($q) {
                        $q->whereHas('issues', fn ($iq) => $iq->where('status', 'pending')->whereNull('zm_approved_at'))
                            ->orWhere('status', 'needs_revision');
                    });

                $pendingLoanQuery = LoanApplication::whereNotIn('status', ['approved', 'rejected', 'cancelled', 'pending_disbursement', 'disbursed'])
                    ->whereIn('branch_id', $accessibleBranchIds ?: [0])
                    ->where(function ($q) {
                        $q->whereHas('issues', fn ($iq) => $iq->where('status', 'pending')->whereNull('zm_approved_at'))
                            ->orWhere('status', 'needs_revision');
                    });

                $badgeCounts['pendingVerifications'] = $pendingAdmissionQuery->count() + $pendingLoanQuery->count();
            } else {
                $accessibleBranchIds = $authUser->getAccessibleBranches()->pluck('id')->all();

                $pendingAdmissionQuery = MemberAdmission::whereNotIn('status', ['approved', 'rejected', 'cancelled'])
                    ->whereIn('branch_id', $accessibleBranchIds ?: [0])
                    ->where(function ($q) {
                        $q->whereHas('issues', fn ($iq) => $iq->where('status', 'pending')->where(function ($sq) {
                            $sq->whereNull('resolution_note')->orWhere('resolution_note', '');
                        }))->orWhere('status', 'needs_revision');
                    });

                $pendingLoanQuery = LoanApplication::whereNotIn('status', ['approved', 'rejected', 'cancelled', 'pending_disbursement', 'disbursed'])
                    ->whereIn('branch_id', $accessibleBranchIds ?: [0])
                    ->where(function ($q) {
                        $q->whereHas('issues', fn ($iq) => $iq->where('status', 'pending')->where(function ($sq) {
                            $sq->whereNull('response_message')->orWhere('response_message', '');
                        }))->orWhere('status', 'needs_revision');
                    });

                if ($roleNameForBadges === 'field_officer') {
                    $pendingAdmissionQuery->assignedToOfficer((int) $authUser->id);
                    $pendingLoanQuery->where('submitted_by', $authUser->id);
                }

                $badgeCounts['pendingVerifications'] = $pendingAdmissionQuery->count() + $pendingLoanQuery->count();
            }
        }

        // যার কাছে পেন্ডিং আছে শুধু তারই ব্যাজ: every authenticated user gets their own pending count (branch_manager, area, zone, admf, dmf, ed)
        // Organizational viewers with has_all_access still need personal pending badge on Approvals nav.
        if ($userData && $request->user() && (
            ! ($userData['has_all_access'] ?? false)
            || in_array($roleNameForBadges, ['ed', 'admf', 'dmf', 'area_manager', 'zone_manager'], true)
        )) {
            $approvalService = app(ApprovalService::class);
            $memberCount = $approvalService->getPendingApprovalsForUser($request->user())->count();
            $loanCount = LoanApplicationApproval::where('user_id', $request->user()->id)
                ->where('status', 'pending')
                ->whereHas('loanApplication', fn ($q) => $q->whereIn('status', ['submitted', 'under_review']))
                ->count();
            $badgeCounts['pendingApprovals'] = $memberCount + $loanCount;
        }

        if ($userData && $request->user() && in_array($roleNameForBadges, [Role::BRANCH_USER, Role::BRANCH_MANAGER], true)) {
            $badgeCounts['pendingClusterHandovers'] = app(ClusterHandoverService::class)
                ->pendingMemberCount($request->user());
        }

        $notifications = [];
        $unreadNotificationsCount = 0;
        if ($request->user()) {
            $unreadNotificationsCount = Notification::where('user_id', $request->user()->id)->unread()->count();
            $notifications = Notification::where('user_id', $request->user()->id)
                ->orderBy('created_at', 'desc')
                ->take(8)
                ->get();
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
            'hoSendCutoff' => $request->user()
                ? app(HoSendCutoffService::class)->toSharedArray()
                : null,
        ]);
    }
}
