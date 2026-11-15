<?php

namespace App\Services;

use App\Models\LoanApplication;
use App\Models\LoanApplicationApproval;
use App\Models\MemberAdmission;
use App\Models\MemberAdmissionApproval;
use App\Models\Role;
use App\Models\User;
use App\Support\IndexedDate;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;

class NavBadgeService
{
    /**
     * @return array{
     *     pendingLoanApplications: int,
     *     pendingAdmissions: int,
     *     pendingApprovals: int,
     *     pendingClusterHandovers: int,
     *     pendingVerifications: int
     * }
     */
    public function forUser(User $user): array
    {
        $user->loadMissing('role:id,name');
        $roleName = $user->role?->name;

        $counts = [
            'pendingLoanApplications' => 0,
            'pendingAdmissions' => 0,
            'pendingApprovals' => 0,
            'pendingClusterHandovers' => 0,
            'pendingVerifications' => 0,
        ];

        $canViewHeadOfficeBadges = (bool) $user->has_all_access
            || in_array($roleName, [
                'super_admin',
                'head_office',
                'cso',
                'ed',
                'admf',
                'dmf',
                'area_manager',
                'zone_manager',
            ], true);

        if ($canViewHeadOfficeBadges) {
            $restrictBranches = ! $user->has_all_access
                && ! $user->isSuperAdmin()
                && ! $user->isHeadOffice();
            $branchIds = $restrictBranches
                ? $user->getAccessibleBranches()->pluck('id')->map(fn ($id) => (int) $id)->all()
                : null;

            $counts['pendingLoanApplications'] = $this->todayWithoutPendingIssues(LoanApplication::query(), $branchIds);
            $counts['pendingAdmissions'] = $this->todayWithoutPendingIssues(MemberAdmission::query(), $branchIds);

            $counts['pendingApprovals'] = LoanApplicationApproval::query()
                ->where('status', 'pending')
                ->whereHas('loanApplication', function ($query) {
                    $query->whereIn('status', ['submitted', 'under_review', 'pending_cancellation', 'pending_amount_approval']);
                })
                ->count()
                + MemberAdmissionApproval::query()
                    ->where('status', 'pending')
                    ->whereHas('memberAdmission', function ($query) {
                        $query->whereIn('status', ['submitted', 'under_review']);
                    })
                    ->count();
        }

        $counts['pendingVerifications'] = $this->verificationCount($user, $roleName);

        $personalApprovals = ! $user->has_all_access
            || in_array($roleName, ['ed', 'admf', 'dmf', 'area_manager', 'zone_manager'], true);

        if ($personalApprovals) {
            $counts['pendingApprovals'] = app(ApprovalService::class)->countCurrentPendingAdmissionsForUser($user)
                + $this->personalPendingLoanApprovals($user);
        }

        if (in_array($roleName, [Role::BRANCH_USER, Role::BRANCH_MANAGER], true)) {
            $counts['pendingClusterHandovers'] = app(ClusterHandoverService::class)->pendingMemberCount($user);
        }

        return $counts;
    }

    /**
     * @param  Builder<LoanApplication>|Builder<MemberAdmission>  $query
     * @param  list<int>|null  $branchIds
     */
    private function todayWithoutPendingIssues(Builder $query, ?array $branchIds): int
    {
        $query->where('status', 'pending_head_office');
        IndexedDate::onDay($query, 'submitted_at', Carbon::today());

        if (is_array($branchIds)) {
            $query->whereIn('branch_id', $branchIds === [] ? [0] : $branchIds);
        }

        return $query->whereDoesntHave('issues', fn ($issues) => $issues->where('status', 'pending'))->count();
    }

    private function verificationCount(User $user, ?string $roleName): int
    {
        $isHoApprover = (bool) $user->has_all_access
            || in_array($roleName, ['super_admin', 'head_office', 'ed'], true);

        if ($isHoApprover) {
            $admissions = MemberAdmission::query()
                ->whereNotIn('status', ['approved', 'rejected', 'cancelled'])
                ->where(function ($query) {
                    $query->whereHas('issues', fn ($issues) => $issues->whereNotNull('zm_approved_at'))
                        ->orWhere(fn ($revision) => $revision
                            ->whereNotNull('revision_comments')
                            ->where('revision_comments', '!=', '')
                            ->where('status', 'pending_head_office'));
                })
                ->count();

            $loans = LoanApplication::query()
                ->whereNotIn('status', ['approved', 'rejected', 'cancelled', 'pending_disbursement', 'disbursed'])
                ->whereHas('issues', fn ($issues) => $issues->whereNotNull('zm_approved_at'))
                ->count();

            return $admissions + $loans;
        }

        $branchIds = $user->getAccessibleBranches()->pluck('id')->map(fn ($id) => (int) $id)->all();
        $branchScope = $branchIds === [] ? [0] : $branchIds;

        if ($roleName === 'zone_manager') {
            $admissions = MemberAdmission::query()
                ->whereNotIn('status', ['approved', 'rejected', 'cancelled'])
                ->whereIn('branch_id', $branchScope)
                ->where(function ($query) {
                    $query->whereHas('issues', fn ($issues) => $issues->where('status', 'pending')->whereNull('zm_approved_at'))
                        ->orWhere('status', 'needs_revision');
                })
                ->count();

            $loans = LoanApplication::query()
                ->whereNotIn('status', ['approved', 'rejected', 'cancelled', 'pending_disbursement', 'disbursed'])
                ->whereIn('branch_id', $branchScope)
                ->where(function ($query) {
                    $query->whereHas('issues', fn ($issues) => $issues->where('status', 'pending')->whereNull('zm_approved_at'))
                        ->orWhere('status', 'needs_revision');
                })
                ->count();

            return $admissions + $loans;
        }

        $admissions = MemberAdmission::query()
            ->whereNotIn('status', ['approved', 'rejected', 'cancelled'])
            ->whereIn('branch_id', $branchScope)
            ->where(function ($query) {
                $query->whereHas('issues', function ($issues) {
                    $issues->where('status', 'pending')->where(function ($reply) {
                        $reply->whereNull('resolution_note')->orWhere('resolution_note', '');
                    });
                })->orWhere('status', 'needs_revision');
            });

        $loans = LoanApplication::query()
            ->whereNotIn('status', ['approved', 'rejected', 'cancelled', 'pending_disbursement', 'disbursed'])
            ->whereIn('branch_id', $branchScope)
            ->where(function ($query) {
                $query->whereHas('issues', function ($issues) {
                    $issues->where('status', 'pending')->where(function ($reply) {
                        $reply->whereNull('response_message')->orWhere('response_message', '');
                    });
                })->orWhere('status', 'needs_revision');
            });

        if ($roleName === 'field_officer') {
            $admissions->assignedToOfficer((int) $user->id);
            $loans->where('submitted_by', $user->id);
        }

        return $admissions->count() + $loans->count();
    }

    private function personalPendingLoanApprovals(User $user): int
    {
        return LoanApplicationApproval::query()
            ->where('user_id', $user->id)
            ->where('status', 'pending')
            ->whereHas('loanApplication', function ($query) {
                $query->whereIn('status', ['submitted', 'under_review', 'pending_cancellation', 'pending_amount_approval']);
            })
            ->count();
    }
}
