<?php

namespace App\Services;

use App\Models\LoanApplication;
use App\Models\MemberAdmission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class ClusterHandoverService
{
    /**
     * Members at the user's branches whose assigned officer no longer works there.
     */
    public function leftoverAdmissionsQuery(User $user): Builder
    {
        $branchIds = $user->getAccessibleBranches()->pluck('id')->map(fn ($id) => (int) $id)->all();
        if ($branchIds === []) {
            return MemberAdmission::query()->whereRaw('0 = 1');
        }

        $staffIds = $this->activeStaffIdsForBranches($branchIds);
        if ($staffIds === []) {
            $staffIds = [0];
        }

        return MemberAdmission::query()
            ->whereIn('branch_id', $branchIds)
            ->where(function ($q) use ($staffIds) {
                $q->where(function ($q2) use ($staffIds) {
                    $q2->whereNotNull('assigned_officer_id')
                        ->whereNotIn('assigned_officer_id', $staffIds);
                })->orWhere(function ($q2) use ($staffIds) {
                    $q2->whereNull('assigned_officer_id')
                        ->whereNotNull('created_by')
                        ->whereNotIn('created_by', $staffIds);
                });
            });
    }

    public function pendingMemberCount(User $user): int
    {
        return $this->leftoverAdmissionsQuery($user)->count();
    }

    /**
     * @return list<array{id: int, name: string, pin: string|null, role: string|null}>
     */
    public function officersAtBranches(array $branchIds, ?int $excludeUserId = null): array
    {
        if ($branchIds === []) {
            return [];
        }

        return User::query()
            ->with('role:id,name,display_name')
            ->where('is_active', true)
            ->when($excludeUserId, fn ($q) => $q->where('id', '!=', $excludeUserId))
            ->where(function ($q) use ($branchIds) {
                $q->whereIn('branch_id', $branchIds)
                    ->orWhereHas('branches', fn ($bq) => $bq->whereIn('branches.id', $branchIds));
            })
            ->whereHas('role', function ($q) {
                $q->whereIn('name', [
                    Role::FIELD_OFFICER,
                    Role::BRANCH_USER,
                    Role::BRANCH_MANAGER,
                ]);
            })
            ->orderBy('name')
            ->get(['id', 'name', 'pin', 'username', 'role_id', 'branch_id'])
            ->map(fn (User $o) => [
                'id' => $o->id,
                'name' => $o->name,
                'pin' => $o->pin ?: $o->username,
                'role' => $o->role?->display_name ?: $o->role?->name,
            ])
            ->values()
            ->all();
    }

    /**
     * @param  Collection<int, MemberAdmission>  $admissions
     * @return list<array{
     *     from_officer: array{id: int, name: string, pin: string|null},
     *     clusters: list<array{key: string, samity_id: int|null, samity_name: string, member_count: int, member_ids: list<int>}>
     * }>
     */
    public function groupIntoClusters(Collection $admissions): array
    {
        $byOfficer = $admissions->groupBy(fn (MemberAdmission $m) => $m->effectiveOfficerId() ?? 0);

        $groups = [];
        foreach ($byOfficer as $officerId => $officerMembers) {
            $officerId = (int) $officerId;
            $sample = $officerMembers->first();
            $officer = $sample?->assignedOfficer ?? $sample?->createdBy;

            $clusters = [];
            foreach ($officerMembers->groupBy(fn (MemberAdmission $m) => $m->samity_id ?? 0) as $samityId => $clusterMembers) {
                $samity = $clusterMembers->first()?->samity;
                $samityId = (int) $samityId;

                $clusters[] = [
                    'key' => $officerId.'-'.$samityId,
                    'samity_id' => $samityId > 0 ? $samityId : null,
                    'samity_name' => $samity
                        ? (($samity->samity_name_bn ?: $samity->samity_name) ?: 'সমিতি')
                        : 'সমিতি নেই',
                    'member_count' => $clusterMembers->count(),
                    'member_ids' => $clusterMembers->pluck('id')->map(fn ($id) => (int) $id)->values()->all(),
                ];
            }

            usort($clusters, fn (array $a, array $b) => strcmp($a['samity_name'], $b['samity_name']));

            $groups[] = [
                'from_officer' => [
                    'id' => $officerId,
                    'name' => $officer?->name ?: 'অজানা অফিসার',
                    'pin' => $officer?->pin ?: $officer?->username,
                ],
                'clusters' => $clusters,
            ];
        }

        usort($groups, fn (array $a, array $b) => strcmp($a['from_officer']['name'], $b['from_officer']['name']));

        return $groups;
    }

    /**
     * @param  list<int>  $memberIds
     */
    public function assignMembers(array $memberIds, int $officerId): int
    {
        $memberIds = array_values(array_unique(array_map('intval', $memberIds)));
        if ($memberIds === []) {
            return 0;
        }

        MemberAdmission::query()
            ->whereIn('id', $memberIds)
            ->update(['assigned_officer_id' => $officerId]);

        LoanApplication::query()
            ->whereIn('member_admission_id', $memberIds)
            ->where('status', LoanApplication::STATUS_DRAFT)
            ->update(['submitted_by' => $officerId]);

        return count($memberIds);
    }

    /**
     * @param  list<int>  $branchIds
     * @return list<int>
     */
    private function activeStaffIdsForBranches(array $branchIds): array
    {
        return User::query()
            ->where('is_active', true)
            ->where(function ($q) use ($branchIds) {
                $q->whereIn('branch_id', $branchIds)
                    ->orWhereHas('branches', fn ($bq) => $bq->whereIn('branches.id', $branchIds));
            })
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }
}
