<?php

namespace App\Services;

use App\Models\LoanApplication;
use App\Models\MemberAdmission;
use App\Models\Role;
use App\Models\Samity;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

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
     * Existing branch members a branch user can move to another officer.
     *
     * @return list<array{
     *     id: int,
     *     application_no: string|null,
     *     name: string,
     *     mobile: string|null,
     *     samity_id: int|null,
     *     samity_name: string,
     *     samity_member_count: int,
     *     branch_name: string|null,
     *     officer: array{id: int|null, name: string, pin: string|null}
     * }>
     */
    public function searchExisting(User $user, string $search): array
    {
        $term = mb_substr(trim($search), 0, 100);
        $branchIds = $this->accessibleBranchIds($user);
        if ($term === '' || $branchIds === []) {
            return [];
        }

        $admissions = MemberAdmission::query()
            ->masterMembers()
            ->whereIn('branch_id', $branchIds)
            ->where(function (Builder $outer) use ($term) {
                $outer->where(function (Builder $inner) use ($term) {
                    MemberCodeService::applyAdmissionSearch($inner, $term);
                })->orWhereHas('samity', function (Builder $samity) use ($term) {
                    $samity->where('samity_name', 'like', '%'.$term.'%')
                        ->orWhere('samity_name_bn', 'like', '%'.$term.'%')
                        ->orWhere('samity_code', 'like', '%'.$term.'%');
                });
            })
            ->with($this->memberListRelations())
            ->orderBy('application_no')
            ->limit(20)
            ->get();

        return $this->presentMembers($admissions, $branchIds);
    }

    /**
     * Samities the branch user can hand over, limited to their branches.
     *
     * @param  list<int>  $branchIds
     * @return list<array{id: int, branch_id: int, name: string, code: string|null, branch_name: string|null, member_count: int}>
     */
    public function samitiesForBranches(array $branchIds): array
    {
        if ($branchIds === []) {
            return [];
        }

        return Samity::query()
            ->whereIn('branch_id', $branchIds)
            ->with('branch:id,name,code')
            ->withCount(['memberAdmissions as member_count' => function ($query) {
                $query->masterMembers();
            }])
            ->orderBy('samity_name')
            ->get()
            ->map(fn (Samity $samity) => [
                'id' => (int) $samity->id,
                'branch_id' => (int) $samity->branch_id,
                'name' => ($samity->samity_name_bn ?: $samity->samity_name) ?: 'সমিতি',
                'code' => $samity->samity_code,
                'branch_name' => $samity->branch?->name,
                'member_count' => (int) $samity->member_count,
            ])
            ->values()
            ->all();
    }

    /**
     * Master members of one samity in the user's branches.
     *
     * @return list<array{
     *     id: int,
     *     application_no: string|null,
     *     name: string,
     *     mobile: string|null,
     *     samity_id: int|null,
     *     samity_name: string,
     *     samity_member_count: int,
     *     branch_name: string|null,
     *     officer: array{id: int|null, name: string, pin: string|null}
     * }>
     */
    public function membersOfSamity(User $user, int $samityId, string $search = ''): array
    {
        $branchIds = $this->accessibleBranchIds($user);
        if ($branchIds === [] || $samityId < 1) {
            return [];
        }

        $belongs = Samity::query()->whereKey($samityId)->whereIn('branch_id', $branchIds)->exists();
        if (! $belongs) {
            return [];
        }

        $query = MemberAdmission::query()
            ->masterMembers()
            ->whereIn('branch_id', $branchIds)
            ->where('samity_id', $samityId);

        $term = mb_substr(trim($search), 0, 100);
        if ($term !== '') {
            $query->where(function (Builder $inner) use ($term) {
                MemberCodeService::applyAdmissionSearch($inner, $term);
            });
        }

        $admissions = $query
            ->with($this->memberListRelations())
            ->orderBy('application_no')
            ->limit(300)
            ->get();

        return $this->presentMembers($admissions, $branchIds);
    }

    /**
     * Move every master member of a branch samity to an officer who works there.
     */
    public function reassignSamity(User $user, int $samityId, int $officerId): int
    {
        $branchIds = $this->accessibleBranchIds($user);
        $samity = $branchIds === []
            ? null
            : Samity::query()->whereIn('branch_id', $branchIds)->whereKey($samityId)->first();

        if ($samity === null) {
            throw ValidationException::withMessages([
                'samity_id' => 'এই শাখায় সমিতি খুঁজে পাওয়া যায়নি।',
            ]);
        }

        $this->assertOfficerAtBranches($branchIds, $officerId);

        $targets = MemberAdmission::query()
            ->masterMembers()
            ->whereIn('branch_id', $branchIds)
            ->where('samity_id', $samity->id)
            ->get()
            ->filter(fn (MemberAdmission $row) => $row->effectiveOfficerId() !== $officerId);

        if ($targets->isEmpty()) {
            return 0;
        }

        return $this->assignMembers(
            $targets->pluck('id')->map(fn ($id) => (int) $id)->all(),
            $officerId,
        );
    }

    /**
     * @param  Collection<int, MemberAdmission>  $admissions
     * @param  list<int>  $branchIds
     * @return list<array{
     *     id: int,
     *     application_no: string|null,
     *     name: string,
     *     mobile: string|null,
     *     samity_id: int|null,
     *     samity_name: string,
     *     samity_member_count: int,
     *     branch_name: string|null,
     *     officer: array{id: int|null, name: string, pin: string|null}
     * }>
     */
    private function presentMembers(Collection $admissions, array $branchIds): array
    {
        $samityIds = $admissions->pluck('samity_id')->filter()->unique()->values()->all();
        $samityCounts = $samityIds === []
            ? collect()
            : MemberAdmission::query()
                ->masterMembers()
                ->whereIn('branch_id', $branchIds)
                ->whereIn('samity_id', $samityIds)
                ->selectRaw('samity_id, COUNT(*) as aggregate')
                ->groupBy('samity_id')
                ->pluck('aggregate', 'samity_id');

        return $admissions->map(function (MemberAdmission $admission) use ($samityCounts) {
            $officer = $admission->assignedOfficer ?? $admission->createdBy;
            $samity = $admission->samity;

            return [
                'id' => (int) $admission->id,
                'application_no' => $admission->application_no,
                'name' => $admission->applicant_name_bn ?: ($admission->applicant_name_en ?: 'সদস্য'),
                'mobile' => $admission->mobile_number,
                'samity_id' => $admission->samity_id ? (int) $admission->samity_id : null,
                'samity_name' => $samity
                    ? (($samity->samity_name_bn ?: $samity->samity_name) ?: 'সমিতি')
                    : 'সমিতি নেই',
                'samity_member_count' => $admission->samity_id
                    ? (int) ($samityCounts[$admission->samity_id] ?? 1)
                    : 1,
                'branch_name' => $admission->branch?->name,
                'officer' => [
                    'id' => $officer?->id ? (int) $officer->id : null,
                    'name' => $officer?->name ?: 'অজানা অফিসার',
                    'pin' => $officer?->pin ?: $officer?->username,
                ],
            ];
        })->values()->all();
    }

    /**
     * Move one member, or every master member of that member's samity, to an officer at the branch.
     */
    public function reassign(User $user, string $mode, int $memberId, int $officerId): int
    {
        if (! in_array($mode, ['single', 'samity'], true)) {
            throw ValidationException::withMessages([
                'mode' => 'একক সদস্য অথবা পুরো সমিতি বেছে নিন।',
            ]);
        }

        $branchIds = $this->accessibleBranchIds($user);
        $member = $branchIds === []
            ? null
            : MemberAdmission::query()
                ->masterMembers()
                ->whereIn('branch_id', $branchIds)
                ->whereKey($memberId)
                ->first();

        if ($member === null) {
            throw ValidationException::withMessages([
                'member_id' => 'এই শাখায় সদস্য খুঁজে পাওয়া যায়নি।',
            ]);
        }

        $this->assertOfficerAtBranches($branchIds, $officerId);

        $targets = $this->reassignTargets($member, $mode, $branchIds)
            ->filter(fn (MemberAdmission $row) => $row->effectiveOfficerId() !== $officerId);

        if ($targets->isEmpty()) {
            return 0;
        }

        return $this->assignMembers(
            $targets->pluck('id')->map(fn ($id) => (int) $id)->all(),
            $officerId,
        );
    }

    /**
     * @param  list<int>  $branchIds
     * @return Collection<int, MemberAdmission>
     */
    private function reassignTargets(MemberAdmission $member, string $mode, array $branchIds): Collection
    {
        if ($mode === 'single' || $member->samity_id === null) {
            return collect([$member]);
        }

        return MemberAdmission::query()
            ->masterMembers()
            ->whereIn('branch_id', $branchIds)
            ->where('samity_id', $member->samity_id)
            ->get();
    }

    /**
     * @return list<string>
     */
    private function memberListRelations(): array
    {
        return [
            'samity:id,samity_name,samity_name_bn,samity_code',
            'assignedOfficer:id,name,pin,username',
            'createdBy:id,name,pin,username',
            'branch:id,name,code',
        ];
    }

    /**
     * @param  list<int>  $branchIds
     */
    private function assertOfficerAtBranches(array $branchIds, int $officerId): void
    {
        $allowedOfficerIds = collect($this->officersAtBranches($branchIds))
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if (! in_array($officerId, $allowedOfficerIds, true)) {
            $officer = User::query()->find($officerId);
            throw ValidationException::withMessages([
                'officer_id' => ($officer?->name ?? 'অফিসার').' এই শাখায় কাজ করেন না।',
            ]);
        }
    }

    /**
     * @return list<int>
     */
    private function accessibleBranchIds(User $user): array
    {
        return $user->getAccessibleBranches()->pluck('id')->map(fn ($id) => (int) $id)->all();
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
