<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Area;
use App\Models\Branch;
use App\Models\Zone;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

trait ScopesToAccessibleBranches
{
    /**
     * SuperAdmin / Head Office / has_all_access see everything.
     * Approvers & managers are limited to assigned zone/area/branch.
     */
    protected function shouldRestrictToAccessibleBranches(?User $user = null): bool
    {
        $user = $user ?? request()->user();

        if (! $user) {
            return true;
        }

        if ($user->has_all_access || $user->isSuperAdmin() || $user->isHeadOffice() || $user->isApproverRole() || $user->isEd()) {
            return false;
        }

        return true;
    }

    /**
     * @return list<int>
     */
    protected function accessibleBranchIds(?User $user = null): array
    {
        $user = $user ?? request()->user();

        if (! $user) {
            return [];
        }

        return $user->getAccessibleBranches()
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    protected function applyAccessibleBranchScope(Builder $query, string $column = 'branch_id'): Builder
    {
        if (! $this->shouldRestrictToAccessibleBranches()) {
            return $query;
        }

        $ids = $this->accessibleBranchIds();

        if ($ids === []) {
            return $query->whereRaw('0 = 1');
        }

        return $query->whereIn($column, $ids);
    }

    /**
     * Zone / area / branch dropdown options for the current viewer.
     *
     * @return array{zones: \Illuminate\Support\Collection, areas: \Illuminate\Support\Collection, branches: \Illuminate\Support\Collection}
     */
    protected function organizationFilterOptions(): array
    {
        if (! $this->shouldRestrictToAccessibleBranches()) {
            return [
                'zones' => Zone::active()->orderBy('name')->get(),
                'areas' => Area::active()->with('zone')->orderBy('name')->get(),
                'branches' => Branch::active()->with('area.zone')->orderedByCode()->get(),
            ];
        }

        $ids = $this->accessibleBranchIds();

        $branches = Branch::active()
            ->with('area.zone')
            ->whereIn('id', $ids ?: [0])
            ->orderedByCode()
            ->get();

        $areaIds = $branches->pluck('area_id')->unique()->filter()->values()->all();
        $areas = Area::active()
            ->with('zone')
            ->whereIn('id', $areaIds ?: [0])
            ->orderBy('name')
            ->get();

        $zoneIds = $areas->pluck('zone_id')->unique()->filter()->values()->all();
        $zones = Zone::active()
            ->whereIn('id', $zoneIds ?: [0])
            ->orderBy('name')
            ->get();

        return compact('zones', 'areas', 'branches');
    }

    protected function ensureCanAccessBranch(?int $branchId): void
    {
        if (! $branchId || ! $this->shouldRestrictToAccessibleBranches()) {
            return;
        }

        if (! request()->user()?->canAccessBranch($branchId)) {
            abort(403, 'You do not have access to this branch.');
        }
    }
}
