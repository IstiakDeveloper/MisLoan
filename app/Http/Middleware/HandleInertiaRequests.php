<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Middleware;
use App\Models\LoanApplication;
use App\Models\LoanApplicationIssue;
use App\Models\MemberAdmission;
use App\Models\MemberAdmissionIssue;
use App\Models\LoanApplicationApproval;
use App\Models\MemberAdmissionApproval;
use Carbon\Carbon;

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

            // Build user data manually without loading relationships
            $userData = [
                'id' => $user->id,
                'name' => $this->sanitizeString($user->name ?? ''),
                'email' => $this->sanitizeString($user->email ?? ''),
                'has_all_access' => (bool)$user->has_all_access,
                'is_active' => (bool)$user->is_active,
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
                    Log::error('Error loading role in HandleInertiaRequests: ' . $e->getMessage());
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
                    Log::error('Error loading zone in HandleInertiaRequests: ' . $e->getMessage());
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
                    Log::error('Error loading area in HandleInertiaRequests: ' . $e->getMessage());
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
                    Log::error('Error loading branch in HandleInertiaRequests: ' . $e->getMessage());
                }
            }
        }

        // Calculate badge counts for Head Office users only
        $badgeCounts = [
            'pendingLoanApplications' => 0,
            'pendingAdmissions' => 0,
            'pendingApprovals' => 0,
        ];

        if ($userData && $userData['has_all_access']) {
            $today = Carbon::today();

            // Pending Loan Applications: status = pending_head_office, submitted_at = today, no pending issues
            // Note: Only pending applications are counted, approved applications are excluded
            $pendingLoanIds = LoanApplication::where('status', 'pending_head_office')
                ->whereDate('submitted_at', $today)
                ->pluck('id');

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
            $pendingAdmissionIds = MemberAdmission::where('status', 'pending_head_office')
                ->whereDate('submitted_at', $today)
                ->pluck('id');

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

        // যার কাছে পেন্ডিং আছে শুধু তারই ব্যাজ: every authenticated user gets their own pending count (branch_manager, area, zone, admf, dmf, ed)
        if ($userData && $request->user() && ! ($userData['has_all_access'] ?? false)) {
            $approvalService = app(\App\Services\ApprovalService::class);
            $memberCount = $approvalService->getPendingApprovalsForUser($request->user())->count();
            $loanCount = \App\Models\LoanApplicationApproval::where('user_id', $request->user()->id)
                ->where('status', 'pending')
                ->whereHas('loanApplication', fn ($q) => $q->whereIn('status', ['submitted', 'under_review']))
                ->count();
            $badgeCounts['pendingApprovals'] = $memberCount + $loanCount;
        }

        return array_merge(parent::share($request), [
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
        ]);
    }
}
