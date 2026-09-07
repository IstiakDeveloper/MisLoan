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
        return $this->resolveAllocationsForDate($date, null);
    }

    /**
     * @param  int|null  $avoidDepth  How many previous duty days to keep unique; null = csoCount - 1.
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
    protected function resolveAllocationsForDate(Carbon|string|null $date, ?int $avoidDepth): array
    {
        $dateStr = $this->normalizeDate($date);
        $csoUsers = $this->getActiveCsoUsers();
        $allAreas = $this->getActiveAreas();

        if ($this->hasManualAllocation($dateStr)) {
            return $this->resolveManualAllocations($dateStr, $csoUsers, $allAreas);
        }

        return $this->generateAutoAllocations($dateStr, $csoUsers, $allAreas, $avoidDepth);
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
     *
     * CSO order is by id so adding/renaming an officer does not reshuffle buckets.
     * Duty-day offset skips weekly off days, then the chosen offset is the first
     * that does not reuse a CSO's areas from the previous duty days.
     */
    protected function generateAutoAllocations(string $dateStr, Collection $csoUsers, Collection $allAreas, ?int $avoidDepth = null): array
    {
        $orderedCsos = $csoUsers->sortBy('id')->values();
        $csoCount = $orderedCsos->count();
        $sortedAreas = $allAreas->sortBy('id')->values();

        if ($csoCount === 0 || $sortedAreas->isEmpty()) {
            return $this->emptyAutoRoster($dateStr, $csoUsers, $allAreas);
        }

        $lookback = $avoidDepth ?? max(0, $csoCount - 1);
        $baseOffset = $this->rotationOffset($dateStr, $csoCount);
        $forbidden = [];

        if ($lookback > 0 && $csoCount > 1) {
            $forbidden = $this->recentDutyAreaMap($dateStr, $lookback);
        }

        $chosenOffset = $baseOffset;
        for ($step = 0; $step < $csoCount; $step++) {
            $offset = ($baseOffset + $step) % $csoCount;
            $candidate = $this->bucketsForOffset($orderedCsos, $sortedAreas, $offset);
            if (! $this->rosterOverlapsForbidden($candidate, $forbidden)) {
                $chosenOffset = $offset;
                break;
            }
        }

        $csoBuckets = $this->bucketsForOffset($orderedCsos, $sortedAreas, $chosenOffset);
        usort($csoBuckets, fn (array $a, array $b): int => strcmp($a['user']['name'], $b['user']['name']));

        return [
            'date' => $dateStr,
            'is_manual' => false,
            'roster' => array_values($csoBuckets),
            'unassigned_areas' => [],
        ];
    }

    /**
     * @return array{date: string, is_manual: bool, roster: list<array<string, mixed>>, unassigned_areas: list<array<string, mixed>>}
     */
    protected function emptyAutoRoster(string $dateStr, Collection $csoUsers, Collection $allAreas): array
    {
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

    /**
     * @param  Collection<int, User>  $orderedCsos
     * @param  Collection<int, Area>  $sortedAreas
     * @return list<array<string, mixed>>
     */
    protected function bucketsForOffset(Collection $orderedCsos, Collection $sortedAreas, int $offset): array
    {
        $csoCount = $orderedCsos->count();
        $csoBuckets = [];

        foreach ($orderedCsos as $index => $user) {
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

        return array_values($csoBuckets);
    }

    /**
     * @return array<int, list<int>>
     */
    protected function recentDutyAreaMap(string $dateStr, int $lookback): array
    {
        $map = [];
        $cursor = $dateStr;

        for ($i = 0; $i < $lookback; $i++) {
            $cursor = $this->previousDutyDate($cursor);
            $board = $this->resolveAllocationsForDate($cursor, 0);
            $map = $this->mergeRosterAreaMap($map, $board);
        }

        return $map;
    }

    /**
     * @param  array<int, list<int>>  $map
     * @param  array{roster: list<array<string, mixed>>}  $board
     * @return array<int, list<int>>
     */
    protected function mergeRosterAreaMap(array $map, array $board): array
    {
        foreach ($board['roster'] as $entry) {
            $userId = (int) ($entry['user']['id'] ?? 0);
            if ($userId === 0) {
                continue;
            }

            $areaIds = collect($entry['areas'] ?? [])
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all();

            $map[$userId] = array_values(array_unique(array_merge($map[$userId] ?? [], $areaIds)));
        }

        return $map;
    }

    /**
     * @param  list<array<string, mixed>>  $roster
     * @param  array<int, list<int>>  $forbidden
     */
    protected function rosterOverlapsForbidden(array $roster, array $forbidden): bool
    {
        if ($forbidden === []) {
            return false;
        }

        foreach ($roster as $entry) {
            $userId = (int) ($entry['user']['id'] ?? 0);
            $blocked = $forbidden[$userId] ?? [];
            if ($blocked === []) {
                continue;
            }

            $areaIds = collect($entry['areas'] ?? [])
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all();

            if (array_intersect($areaIds, $blocked) !== []) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return list<int>
     */
    protected function weeklyOffDays(): array
    {
        return array_values(array_map('intval', config('cso.weekly_off_days', [Carbon::FRIDAY])));
    }

    protected function isWeeklyOff(Carbon $date): bool
    {
        return in_array((int) $date->dayOfWeek, $this->weeklyOffDays(), true);
    }

    protected function previousDutyDate(string $dateStr): string
    {
        $cursor = Carbon::parse($dateStr)->startOfDay()->subDay();

        for ($i = 0; $i < 21; $i++) {
            if (! $this->isWeeklyOff($cursor)) {
                return $cursor->toDateString();
            }

            $cursor->subDay();
        }

        return Carbon::parse($dateStr)->startOfDay()->subDay()->toDateString();
    }

    protected function rotationOffset(string $dateStr, int $csoCount): int
    {
        if ($csoCount <= 0) {
            return 0;
        }

        $offset = $this->dutyDayIndex($dateStr) % $csoCount;

        return $offset < 0 ? $offset + $csoCount : $offset;
    }

    /**
     * 0-based count of duty days from a fixed epoch, excluding weekly off days.
     * Friday (off) shares Thursday's index; Saturday continues from Thursday + 1.
     */
    protected function dutyDayIndex(string $dateStr): int
    {
        $date = Carbon::parse($dateStr)->startOfDay();
        $epoch = Carbon::create(2020, 1, 6)->startOfDay();

        if ($date->lt($epoch)) {
            return 0;
        }

        $dutyDaysInclusive = 0;
        $cursor = $epoch->copy();

        while ($cursor->lte($date)) {
            if (! $this->isWeeklyOff($cursor)) {
                $dutyDaysInclusive++;
            }

            $cursor->addDay();
        }

        return max(0, $dutyDaysInclusive - 1);
    }

    /**
     * Save manual override allocations for a given date.
     *
     * @param  array<int, list<int>>  $userAreaMap  Key: user_id, Value: list of area_ids
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
