<?php

namespace App\Services;

use App\Models\Area;
use App\Models\CsoDailyAllocation;
use App\Models\Role;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class CsoAllocationService
{
    /**
     * Get all active CSO users.
     *
     * @return Collection<int, User>
     */
    public function getActiveCsoUsers(): Collection
    {
        return User::query()
            ->whereHas('role', fn ($q) => $q->where('name', Role::CSO))
            ->where('is_active', true)
            ->orderBy('name')
            ->get();
    }

    /**
     * Get all active areas with zone relationship.
     *
     * @return Collection<int, Area>
     */
    public function getActiveAreas(): Collection
    {
        return Area::active()
            ->with('zone:id,name')
            ->orderBy('name')
            ->get();
    }

    /**
     * Normalize date string to Y-m-d.
     */
    protected function normalizeDate(Carbon|string|null $date): string
    {
        if ($date instanceof Carbon) {
            return $date->toDateString();
        }

        if (is_string($date) && ! empty($date)) {
            return Carbon::parse($date)->toDateString();
        }

        return Carbon::today()->toDateString();
    }

    /**
     * Check if a specific date has manual override allocations.
     */
    public function hasManualAllocation(Carbon|string|null $date): bool
    {
        $dateStr = $this->normalizeDate($date);

        return CsoDailyAllocation::query()
            ->where('duty_date', $dateStr)
            ->exists();
    }

    /**
     * Get assigned area IDs for a specific user and date.
     *
     * @return list<int>
     */
    public function getAssignedAreaIdsForUser(User|int $user, Carbon|string|null $date = null): array
    {
        $userId = $user instanceof User ? $user->id : (int) $user;
        $dateStr = $this->normalizeDate($date);

        $dutyBoard = $this->getAllocationsForDate($dateStr);
        $userDuty = collect($dutyBoard['roster'])->firstWhere('user.id', $userId);

        if (! $userDuty) {
            return [];
        }

        return collect($userDuty['areas'])
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    /**
     * Get full duty board / allocation list for a specific date.
     *
     * @return array{
     *     date: string,
     *     is_manual: bool,
     *     roster: list<array{
     *         user: array{id: int, name: string, email: string, username: ?string, phone: ?string},
     *         areas: list<array{id: int, name: string, code: ?string, zone: ?array{id: int, name: string}}>,
     *         total_branches: int,
     *         notes: ?string
     *     }>,
     *     unassigned_areas: list<array{id: int, name: string, zone: ?array{id: int, name: string}}>
     * }
     */
    public function getAllocationsForDate(Carbon|string|null $date = null): array
    {
        $dateStr = $this->normalizeDate($date);
        $csoUsers = $this->getActiveCsoUsers();
        $allAreas = $this->getActiveAreas();
        $isManual = $this->hasManualAllocation($dateStr);

        if ($isManual) {
            return $this->resolveManualAllocations($dateStr, $csoUsers, $allAreas);
        }

        return $this->generateAutoAllocations($dateStr, $csoUsers, $allAreas);
    }

    /**
     * Resolve saved manual allocations.
     */
    protected function resolveManualAllocations(string $dateStr, Collection $csoUsers, Collection $allAreas): array
    {
        $records = CsoDailyAllocation::with(['area.zone', 'user'])
            ->where('duty_date', $dateStr)
            ->get();

        $roster = [];
        $assignedAreaIds = [];

        foreach ($csoUsers as $user) {
            $userAllocations = $records->where('user_id', $user->id);
            $userAreas = [];
            $notes = null;

            foreach ($userAllocations as $alloc) {
                if ($alloc->area) {
                    $userAreas[] = [
                        'id' => $alloc->area->id,
                        'name' => $alloc->area->name,
                        'code' => $alloc->area->code,
                        'zone' => $alloc->area->zone ? [
                            'id' => $alloc->area->zone->id,
                            'name' => $alloc->area->zone->name,
                        ] : null,
                    ];
                    $assignedAreaIds[] = $alloc->area->id;
                    if ($alloc->notes) {
                        $notes = $alloc->notes;
                    }
                }
            }

            $roster[] = [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'username' => $user->username,
                    'phone' => $user->phone,
                ],
                'areas' => $userAreas,
                'total_branches' => 0,
                'notes' => $notes,
            ];
        }

        $unassignedAreas = $allAreas->whereNotIn('id', $assignedAreaIds)->map(function ($area) {
            return [
                'id' => $area->id,
                'name' => $area->name,
                'zone' => $area->zone ? [
                    'id' => $area->zone->id,
                    'name' => $area->zone->name,
                ] : null,
            ];
        })->values()->all();

        return [
            'date' => $dateStr,
            'is_manual' => true,
            'roster' => $roster,
            'unassigned_areas' => $unassignedAreas,
        ];
    }

    /**
     * Compute cyclic rotation allocation for date.
     */
    protected function generateAutoAllocations(string $dateStr, Collection $csoUsers, Collection $allAreas): array
    {
        $csoCount = $csoUsers->count();
        $areaCount = $allAreas->count();

        if ($csoCount === 0 || $areaCount === 0) {
            return [
                'date' => $dateStr,
                'is_manual' => false,
                'roster' => $csoUsers->map(fn ($u) => [
                    'user' => [
                        'id' => $u->id,
                        'name' => $u->name,
                        'email' => $u->email,
                        'username' => $u->username,
                        'phone' => $u->phone,
                    ],
                    'areas' => [],
                    'total_branches' => 0,
                    'notes' => null,
                ])->values()->all(),
                'unassigned_areas' => $allAreas->map(fn ($a) => [
                    'id' => $a->id,
                    'name' => $a->name,
                    'zone' => $a->zone ? ['id' => $a->zone->id, 'name' => $a->zone->name] : null,
                ])->values()->all(),
            ];
        }

        $parsedDate = Carbon::parse($dateStr);
        // Epoch day number ensures stable continuous rotation day-over-day
        $dayNumber = (int) floor($parsedDate->getTimestamp() / 86400);
        $offset = (int) ($dayNumber % $csoCount);
        if ($offset < 0) {
            $offset += $csoCount;
        }

        // Initialize empty area lists for each CSO
        $csoBuckets = [];
        foreach ($csoUsers as $index => $user) {
            $csoBuckets[$index] = [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'username' => $user->username,
                    'phone' => $user->phone,
                ],
                'areas' => [],
                'total_branches' => 0,
                'notes' => null,
            ];
        }

        // Distribute areas cyclically
        $sortedAreas = $allAreas->sortBy('id')->values();
        foreach ($sortedAreas as $areaIndex => $area) {
            $csoIndex = ($areaIndex + $offset) % $csoCount;
            $csoBuckets[$csoIndex]['areas'][] = [
                'id' => $area->id,
                'name' => $area->name,
                'code' => $area->code,
                'zone' => $area->zone ? [
                    'id' => $area->zone->id,
                    'name' => $area->zone->name,
                ] : null,
            ];
        }

        return [
            'date' => $dateStr,
            'is_manual' => false,
            'roster' => array_values($csoBuckets),
            'unassigned_areas' => [],
        ];
    }

    /**
     * Save manual override allocations for a given date.
     *
     * @param array<int, list<int>> $userAreaMap Key: user_id, Value: list of area_ids
     */
    public function saveManualAllocations(string $dateStr, array $userAreaMap, ?int $assignedById = null, ?string $notes = null): void
    {
        $date = $this->normalizeDate($dateStr);

        DB::transaction(function () use ($date, $userAreaMap, $assignedById, $notes) {
            CsoDailyAllocation::where('duty_date', $date)->delete();

            $insertData = [];
            $now = Carbon::now();

            foreach ($userAreaMap as $userId => $areaIds) {
                if (! is_array($areaIds)) {
                    continue;
                }

                foreach ($areaIds as $areaId) {
                    $insertData[] = [
                        'user_id' => (int) $userId,
                        'area_id' => (int) $areaId,
                        'duty_date' => $date,
                        'assigned_by' => $assignedById,
                        'notes' => $notes,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
            }

            if (! empty($insertData)) {
                CsoDailyAllocation::insert($insertData);
            }
        });
    }

    /**
     * Reset allocations to automatic cyclic rotation.
     */
    public function resetToAuto(string $dateStr): void
    {
        $date = $this->normalizeDate($dateStr);
        CsoDailyAllocation::where('duty_date', $date)->delete();
    }
}
