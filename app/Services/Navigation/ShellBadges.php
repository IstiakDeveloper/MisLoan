<?php

namespace App\Services\Navigation;

use App\Models\LoanApplication;
use App\Models\LoanApplicationApproval;
use App\Models\MemberAdmission;
use App\Models\MemberAdmissionApproval;
use App\Models\Notification;
use App\Models\Role;
use App\Models\User;
use App\Services\ClusterHandoverService;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/** Navigation badges and the bell. Cached so every page does not recount the portfolio. */
final class ShellBadges
{
    public const TTL_SECONDS = 30;

    /** @return array{pendingLoanApplications: int, pendingAdmissions: int, pendingApprovals: int, pendingClusterHandovers: int, pendingVerifications?: int} */
    public function forUser(User $user): array
    {
        return Cache::remember($this->badgeKey($user), self::TTL_SECONDS, fn (): array => $this->badges($user));
    }

    /** @return array{unread: int, items: Collection<int, Notification>} */
    public function notifications(User $user): array
    {
        return Cache::remember($this->notificationKey($user), self::TTL_SECONDS, function () use ($user): array {
            return [
                'unread' => Notification::query()->where('user_id', $user->id)->unread()->count(),
                'items' => Notification::query()->where('user_id', $user->id)->orderByDesc('created_at')->limit(8)->get(),
            ];
        });
    }

    public function forget(User $user): void
    {
        Cache::forget($this->badgeKey($user));
        Cache::forget($this->notificationKey($user));
    }

    /** @return array{pendingLoanApplications: int, pendingAdmissions: int, pendingApprovals: int, pendingClusterHandovers: int, pendingVerifications?: int} */
    private function badges(User $user): array
    {
        $role = $user->role?->name;
        $counts = [
            'pendingLoanApplications' => 0,
            'pendingAdmissions' => 0,
            'pendingApprovals' => 0,
            'pendingClusterHandovers' => 0,
        ];
        $headOffice = (bool) $user->has_all_access || in_array($role, [
            'super_admin', 'head_office', 'cso', 'ed', 'admf', 'dmf', 'area_manager', 'zone_manager',
        ], true);

        if ($headOffice) {
            $restrict = ! $user->has_all_access && ! $user->isSuperAdmin() && ! $user->isHeadOffice();
            $branches = $restrict ? $this->branchIds($user) : null;
            $counts['pendingLoanApplications'] = $this->submittedToday(LoanApplication::class, $branches);
            $counts['pendingAdmissions'] = $this->submittedToday(MemberAdmission::class, $branches);
            $counts['pendingApprovals'] = LoanApplicationApproval::query()
                ->where('status', 'pending')
                ->whereHas('loanApplication', fn ($query) => $query->whereIn('status', ['submitted', 'under_review', 'pending_cancellation', 'pending_amount_approval']))
                ->count()
                + MemberAdmissionApproval::query()
                    ->where('status', 'pending')
                    ->whereHas('memberAdmission', fn ($query) => $query->whereIn('status', ['submitted', 'under_review']))
                    ->count();
        }

        $isHeadOfficeApprover = (bool) $user->has_all_access || in_array($role, ['super_admin', 'head_office', 'ed'], true);
        if ($isHeadOfficeApprover) {
            $counts['pendingVerifications'] = MemberAdmission::query()
                ->whereNotIn('status', ['approved', 'rejected', 'cancelled'])
                ->where(function ($query) {
                    $query->whereHas('issues', fn ($issues) => $issues->whereNotNull('zm_approved_at'))
                        ->orWhere(fn ($revision) => $revision->whereNotNull('revision_comments')->where('revision_comments', '!=', '')->where('status', 'pending_head_office'));
                })
                ->count()
                + LoanApplication::query()
                    ->whereNotIn('status', ['approved', 'rejected', 'cancelled', 'pending_disbursement', 'disbursed'])
                    ->whereHas('issues', fn ($issues) => $issues->whereNotNull('zm_approved_at'))
                    ->count();
        } elseif ($role === 'zone_manager') {
            $branches = $this->branchIds($user) ?: [0];
            $counts['pendingVerifications'] = MemberAdmission::query()
                ->whereNotIn('status', ['approved', 'rejected', 'cancelled'])
                ->whereIn('branch_id', $branches)
                ->where(function ($query) {
                    $query->whereHas('issues', fn ($issues) => $issues->where('status', 'pending')->whereNull('zm_approved_at'))
                        ->orWhere('status', 'needs_revision');
                })
                ->count()
                + LoanApplication::query()
                    ->whereNotIn('status', ['approved', 'rejected', 'cancelled', 'pending_disbursement', 'disbursed'])
                    ->whereIn('branch_id', $branches)
                    ->where(function ($query) {
                        $query->whereHas('issues', fn ($issues) => $issues->where('status', 'pending')->whereNull('zm_approved_at'))
                            ->orWhere('status', 'needs_revision');
                    })
                    ->count();
        } else {
            $branches = $this->branchIds($user) ?: [0];
            $admissions = MemberAdmission::query()
                ->whereNotIn('status', ['approved', 'rejected', 'cancelled'])
                ->whereIn('branch_id', $branches)
                ->where(function ($query) {
                    $query->whereHas('issues', fn ($issues) => $issues->where('status', 'pending')->where(function ($note) {
                        $note->whereNull('resolution_note')->orWhere('resolution_note', '');
                    }))->orWhere('status', 'needs_revision');
                });
            $loans = LoanApplication::query()
                ->whereNotIn('status', ['approved', 'rejected', 'cancelled', 'pending_disbursement', 'disbursed'])
                ->whereIn('branch_id', $branches)
                ->where(function ($query) {
                    $query->whereHas('issues', fn ($issues) => $issues->where('status', 'pending')->where(function ($note) {
                        $note->whereNull('response_message')->orWhere('response_message', '');
                    }))->orWhere('status', 'needs_revision');
                });
            if ($role === 'field_officer') {
                $admissions->assignedToOfficer((int) $user->id);
                $loans->where('submitted_by', $user->id);
            }
            $counts['pendingVerifications'] = $admissions->count() + $loans->count();
        }

        if (! $user->has_all_access || in_array($role, ['ed', 'admf', 'dmf', 'area_manager', 'zone_manager'], true)) {
            $counts['pendingApprovals'] = $this->personalMemberApprovals($user)
                + LoanApplicationApproval::query()
                    ->where('user_id', $user->id)
                    ->where('status', 'pending')
                    ->whereHas('loanApplication', fn ($query) => $query->whereIn('status', ['submitted', 'under_review', 'pending_cancellation', 'pending_amount_approval']))
                    ->count();
        }

        if (in_array($role, [Role::BRANCH_USER, Role::BRANCH_MANAGER], true)) {
            $counts['pendingClusterHandovers'] = app(ClusterHandoverService::class)->pendingMemberCount($user);
        }

        return $counts;
    }

    /** @param  class-string<LoanApplication|MemberAdmission>  $model
     * @param  list<int>|null  $branchIds
     */
    private function submittedToday(string $model, ?array $branchIds): int
    {
        $start = now()->startOfDay();
        $end = $start->copy()->addDay();
        $query = $model::query()
            ->where('status', 'pending_head_office')
            ->where('submitted_at', '>=', $start)
            ->where('submitted_at', '<', $end)
            ->whereDoesntHave('issues', fn ($issues) => $issues->where('status', 'pending'));
        if (is_array($branchIds)) {
            $query->whereIn('branch_id', $branchIds === [] ? [0] : $branchIds);
        }

        return $query->count();
    }

    private function personalMemberApprovals(User $user): int
    {
        return DB::table('member_admission_approvals as approval')
            ->join('member_admissions as admission', 'admission.id', '=', 'approval.member_admission_id')
            ->where('approval.user_id', $user->id)
            ->where('approval.status', 'pending')
            ->whereIn('admission.status', ['submitted', 'under_review'])
            ->where(function ($query) {
                $query->whereNotExists(function ($previous) {
                    $previous->selectRaw('1')
                        ->from('member_admission_approvals as earlier')
                        ->whereColumn('earlier.member_admission_id', 'approval.member_admission_id')
                        ->whereColumn('earlier.sequence', '<', 'approval.sequence')
                        ->where('earlier.status', '!=', 'approved');
                })->orWhere(function ($review) {
                    $review->where('admission.status', 'under_review')->where('approval.level', '!=', 'branch');
                });
            })
            ->count();
    }

    /** @return list<int> */
    private function branchIds(User $user): array
    {
        $cached = Cache::remember('shell.branches.'.$user->id, 60, fn (): array => $user->getAccessibleBranches()->pluck('id')->map(fn ($id): int => (int) $id)->all());

        return array_map(intval(...), $cached);
    }

    private function badgeKey(User $user): string
    {
        return 'shell.badges.'.$user->id.'.'.now()->toDateString();
    }

    private function notificationKey(User $user): string
    {
        return 'shell.notifications.'.$user->id;
    }
}
