<?php

namespace App\Services;

use App\Models\Area;
use App\Models\Branch;
use App\Models\Role;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class HrmOrganizationSyncService
{
    /**
     * @return array{
     *     zones: array{created: int, updated: int},
     *     areas: array{created: int, updated: int},
     *     branches: array{created: int, updated: int},
     *     users: array{created: int, updated: int}
     * }
     */
    public function sync(): array
    {
        $payload = $this->fetchOrganizationStructure();

        return $this->applyOrganizationPayload($payload);
    }

    /**
     * Sync branch login PINs (and branch accounts) from HRM — called during officer sync too.
     *
     * @return array{branches_updated: int}
     */
    public function syncBranchLoginPinsFromHrm(): array
    {
        $payload = $this->fetchOrganizationStructure();
        $updated = 0;

        DB::transaction(function () use ($payload, &$updated) {
            foreach ($this->collectBranchPayloads($payload) as $branchData) {
                $code = trim((string) ($branchData['code'] ?? ''));
                if ($code === '') {
                    continue;
                }

                $branch = Branch::query()->where('code', $code)->first();
                if (! $branch) {
                    continue;
                }

                if ($this->applyBranchLoginPin($branch, $branchData)) {
                    $updated++;
                    app(BranchAccountService::class)->ensureForBranch($branch->fresh(['area']));
                }
            }
        });

        return ['branches_updated' => $updated];
    }

    /**
     * Apply organization hierarchy payload from HRM and sync seat-based users (ZM, RM, BM, and Branch accounts).
     *
     * @param  array<string, mixed>  $payload
     * @return array{
     *     zones: array{created: int, updated: int},
     *     areas: array{created: int, updated: int},
     *     branches: array{created: int, updated: int},
     *     users: array{created: int, updated: int}
     * }
     */
    public function applyOrganizationPayload(array $payload): array
    {
        $stats = [
            'zones' => ['created' => 0, 'updated' => 0],
            'areas' => ['created' => 0, 'updated' => 0],
            'branches' => ['created' => 0, 'updated' => 0],
            'users' => ['created' => 0, 'updated' => 0],
        ];

        DB::transaction(function () use ($payload, &$stats) {
            foreach ($payload['zones'] as $zoneData) {
                $zone = $this->upsertZone($zoneData, $stats);
                $this->ensureZoneSeatUser($zone, $zoneData, $stats);

                foreach ($zoneData['areas'] ?? [] as $areaData) {
                    $area = $this->upsertArea($zone, $areaData, $stats);
                    $this->ensureAreaSeatUser($area, $zone, $areaData, $stats);

                    foreach ($areaData['branches'] ?? [] as $branchData) {
                        $branch = $this->upsertBranch($area, $branchData, $stats);
                        $this->ensureBranchManagerSeatUser($branch, $area, $branchData, $stats);
                    }
                }
            }

            $orphanAreaMeta = is_array($payload['orphan_area'] ?? null) ? $payload['orphan_area'] : [];
            $orphanBranches = is_array($payload['orphan_branches'] ?? null) ? $payload['orphan_branches'] : [];

            if ($orphanBranches !== []) {
                $zone = $this->upsertZone([
                    'code' => (string) ($orphanAreaMeta['zone_code'] ?? '00'),
                    'name' => (string) ($orphanAreaMeta['zone_name'] ?? 'Head Office'),
                    'is_active' => true,
                ], $stats);

                $area = $this->upsertArea($zone, [
                    'code' => (string) ($orphanAreaMeta['area_code'] ?? '000'),
                    'name' => (string) ($orphanAreaMeta['area_name'] ?? 'Head Office & Unassigned'),
                    'is_active' => true,
                ], $stats);

                foreach ($orphanBranches as $branchData) {
                    $branch = $this->upsertBranch($area, $branchData, $stats);
                    $this->ensureBranchManagerSeatUser($branch, $area, $branchData, $stats);
                }
            }
        });

        return $stats;
    }

    public function isConfigured(): bool
    {
        $url = rtrim((string) config('services.hrm.url'), '/');
        $token = (string) config('services.hrm.token');

        return $url !== '' && $token !== '';
    }

    /**
     * @return array<string, mixed>
     */
    private function fetchOrganizationStructure(): array
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('HRM sync is not configured. Set HRM_API_URL and HRM_API_TOKEN in .env.');
        }

        $baseUrl = rtrim((string) config('services.hrm.url'), '/');
        $token = (string) config('services.hrm.token');

        try {
            $response = Http::timeout(30)
                ->acceptJson()
                ->withToken($token)
                ->get("{$baseUrl}/sync/organization-structure");
        } catch (RequestException $e) {
            throw new RuntimeException('HRM organization sync request failed: '.$e->getMessage(), previous: $e);
        }

        if (! $response->successful()) {
            $message = $response->json('message') ?? $response->body();

            throw new RuntimeException('HRM organization sync failed: '.$message);
        }

        $payload = $response->json();
        if (! is_array($payload) || ! isset($payload['zones']) || ! is_array($payload['zones'])) {
            throw new RuntimeException('HRM organization sync returned an invalid response.');
        }

        return $payload;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return list<array<string, mixed>>
     */
    private function collectBranchPayloads(array $payload): array
    {
        $branches = [];

        foreach ($payload['zones'] as $zoneData) {
            foreach ($zoneData['areas'] ?? [] as $areaData) {
                foreach ($areaData['branches'] ?? [] as $branchData) {
                    if (is_array($branchData)) {
                        $branches[] = $branchData;
                    }
                }
            }
        }

        foreach ($payload['orphan_branches'] ?? [] as $branchData) {
            if (is_array($branchData)) {
                $branches[] = $branchData;
            }
        }

        return $branches;
    }

    /**
     * @param  array<string, mixed>  $zoneData
     * @param  array{zones: array{created: int, updated: int}, areas: array{created: int, updated: int}, branches: array{created: int, updated: int}, users: array{created: int, updated: int}}  $stats
     */
    private function upsertZone(array $zoneData, array &$stats): Zone
    {
        $code = $this->requiredCode($zoneData['code'] ?? null, 'zone');

        $zone = Zone::withTrashed()->where('code', $code)->first();
        $attributes = [
            'name' => (string) ($zoneData['name'] ?? $code),
            'description' => $zoneData['description'] ?? null,
            'is_active' => (bool) ($zoneData['is_active'] ?? true),
        ];

        if ($zone) {
            if ($zone->trashed()) {
                $zone->restore();
            }

            $zone->update($attributes);
            $stats['zones']['updated']++;
        } else {
            $zone = Zone::create([
                'code' => $code,
                ...$attributes,
            ]);
            $stats['zones']['created']++;
        }

        return $zone;
    }

    /**
     * @param  array<string, mixed>  $areaData
     * @param  array{zones: array{created: int, updated: int}, areas: array{created: int, updated: int}, branches: array{created: int, updated: int}, users: array{created: int, updated: int}}  $stats
     */
    private function upsertArea(Zone $zone, array $areaData, array &$stats): Area
    {
        $code = $this->requiredCode($areaData['code'] ?? null, 'area');

        $area = Area::withTrashed()->where('code', $code)->first();
        $attributes = [
            'zone_id' => $zone->id,
            'name' => (string) ($areaData['name'] ?? $code),
            'description' => $areaData['description'] ?? null,
            'is_active' => (bool) ($areaData['is_active'] ?? true),
        ];

        if ($area) {
            if ($area->trashed()) {
                $area->restore();
            }

            $area->update($attributes);
            $stats['areas']['updated']++;
        } else {
            $area = Area::create([
                'code' => $code,
                ...$attributes,
            ]);
            $stats['areas']['created']++;
        }

        return $area;
    }

    /**
     * @param  array<string, mixed>  $branchData
     * @param  array{zones: array{created: int, updated: int}, areas: array{created: int, updated: int}, branches: array{created: int, updated: int}, users: array{created: int, updated: int}}  $stats
     */
    private function upsertBranch(Area $area, array $branchData, array &$stats): Branch
    {
        $code = $this->requiredCode($branchData['code'] ?? null, 'branch');

        $branch = Branch::withTrashed()->where('code', $code)->first();
        $attributes = [
            'area_id' => $area->id,
            'name' => (string) ($branchData['name'] ?? $code),
            'address' => $branchData['address'] ?? null,
            'phone' => $branchData['phone'] ?? null,
            'email' => $branchData['email'] ?? null,
            'is_active' => (bool) ($branchData['is_active'] ?? true),
        ];

        if ($branch) {
            if ($branch->trashed()) {
                $branch->restore();
            }

            $branch->update($attributes);
            $stats['branches']['updated']++;
        } else {
            $branch = Branch::create([
                'code' => $code,
                ...$attributes,
            ]);
            $stats['branches']['created']++;
        }

        $this->applyBranchLoginPin($branch, $branchData);
        app(BranchAccountService::class)->ensureForBranch($branch->fresh(['area']));

        return $branch;
    }

    /**
     * Ensure seat-based Zonal Manager user exists (e.g. zmraninagar, zmbadalgachi, zmshishahat)
     * and is linked to the correct zone_id and holds the current manager PIN/name/signature.
     *
     * @param  array<string, mixed>  $zoneData
     * @param  array{zones: array{created: int, updated: int}, areas: array{created: int, updated: int}, branches: array{created: int, updated: int}, users: array{created: int, updated: int}}  $stats
     */
    private function ensureZoneSeatUser(Zone $zone, array $zoneData, array &$stats): ?User
    {
        if ($zone->code === '00' || strtolower($zone->name) === 'head office') {
            return null;
        }

        $zmRole = Role::query()->where('name', Role::ZONE_MANAGER)->first();
        if (! $zmRole) {
            return null;
        }

        $slug = $zoneData['slug'] ?? $this->makeSlug($zone->name);
        $targetUsername = 'zm'.$slug;

        $user = User::withTrashed()
            ->where('role_id', $zmRole->id)
            ->where('zone_id', $zone->id)
            ->first();

        if (! $user) {
            $user = User::withTrashed()->where('username', $targetUsername)->first();
        }

        $isNew = false;
        if (! $user) {
            $user = new User;
            $user->password = Hash::make('12345678');
            $user->email = "{$targetUsername}@misloan.local";
            $isNew = true;
        } elseif ($user->trashed()) {
            $user->restore();
        }

        $manager = $zoneData['manager'] ?? null;
        $pin = trim((string) ($manager['pin'] ?? ''));
        $name = trim((string) ($manager['name'] ?? ''));
        $signature = $manager['signature'] ?? null;

        $user->username = $targetUsername;
        $user->role_id = $zmRole->id;
        $user->account_type = 'staff';
        $user->zone_id = $zone->id;
        $user->area_id = null;
        $user->branch_id = null;
        $user->is_active = (bool) $zone->is_active;

        if ($pin !== '') {
            $user->pin = $pin;
        }
        if ($name !== '') {
            $user->name = "Zonal Manager {$zone->name} ({$name})";
        } elseif (! filled($user->name)) {
            $user->name = "Zonal Manager {$zone->name}";
        }
        if (filled($signature)) {
            $user->signature = $signature;
        }

        $user->save();

        if ($isNew) {
            $stats['users']['created']++;
        } else {
            $stats['users']['updated']++;
        }

        return $user;
    }

    /**
     * Ensure seat-based Area/Regional Manager user exists (e.g. rmhapania, rmatrai, rmbetgari)
     * and is linked to the correct area_id and zone_id, holding current manager PIN/name/signature.
     *
     * @param  array<string, mixed>  $areaData
     * @param  array{zones: array{created: int, updated: int}, areas: array{created: int, updated: int}, branches: array{created: int, updated: int}, users: array{created: int, updated: int}}  $stats
     */
    private function ensureAreaSeatUser(Area $area, Zone $zone, array $areaData, array &$stats): ?User
    {
        if ($area->code === '000' || str_contains(strtolower($area->name), 'head office')) {
            return null;
        }

        $amRole = Role::query()->where('name', Role::AREA_MANAGER)->first();
        if (! $amRole) {
            return null;
        }

        $slug = $areaData['slug'] ?? $this->makeSlug($area->name);
        $targetUsername = 'rm'.$slug;

        $user = User::withTrashed()
            ->where('role_id', $amRole->id)
            ->where('area_id', $area->id)
            ->first();

        if (! $user) {
            $user = User::withTrashed()->where('username', $targetUsername)->first();
        }

        $isNew = false;
        if (! $user) {
            $user = new User;
            $user->password = Hash::make('12345678');
            $user->email = "{$targetUsername}@misloan.local";
            $isNew = true;
        } elseif ($user->trashed()) {
            $user->restore();
        }

        $manager = $areaData['manager'] ?? null;
        $pin = trim((string) ($manager['pin'] ?? ''));
        $name = trim((string) ($manager['name'] ?? ''));
        $signature = $manager['signature'] ?? null;

        $user->username = $targetUsername;
        $user->role_id = $amRole->id;
        $user->account_type = 'staff';
        $user->area_id = $area->id;
        $user->zone_id = $zone->id; // Enforces correct zone relationship
        $user->branch_id = null;
        $user->is_active = (bool) $area->is_active;

        if ($pin !== '') {
            $user->pin = $pin;
        }
        if ($name !== '') {
            $user->name = "Regional Manager {$area->name} ({$name})";
        } elseif (! filled($user->name)) {
            $user->name = "Regional Manager {$area->name}";
        }
        if (filled($signature)) {
            $user->signature = $signature;
        }

        $user->save();

        if ($isNew) {
            $stats['users']['created']++;
        } else {
            $stats['users']['updated']++;
        }

        return $user;
    }

    /**
     * Ensure seat-based Branch Manager user exists (e.g. bmatrai, bmbhabanipur)
     * and is linked to the correct branch_id, area_id, and zone_id.
     *
     * @param  array<string, mixed>  $branchData
     * @param  array{zones: array{created: int, updated: int}, areas: array{created: int, updated: int}, branches: array{created: int, updated: int}, users: array{created: int, updated: int}}  $stats
     */
    private function ensureBranchManagerSeatUser(Branch $branch, Area $area, array $branchData, array &$stats): ?User
    {
        if ($branch->is_head_office || $branch->code === '1000' || str_contains(strtolower($branch->name), 'head office')) {
            return null;
        }

        $bmRole = Role::query()->where('name', Role::BRANCH_MANAGER)->first();
        if (! $bmRole) {
            return null;
        }

        $slug = $branchData['slug'] ?? $this->makeSlug($branch->name);
        $targetUsername = 'bm'.$slug;

        $user = User::withTrashed()
            ->where('role_id', $bmRole->id)
            ->where('branch_id', $branch->id)
            ->first();

        if (! $user) {
            $user = User::withTrashed()->where('username', $targetUsername)->first();
        }

        $isNew = false;
        if (! $user) {
            $user = new User;
            $user->password = Hash::make('12345678');
            $user->email = "{$targetUsername}@misloan.local";
            $isNew = true;
        } elseif ($user->trashed()) {
            $user->restore();
        }

        $manager = $branchData['manager'] ?? null;
        $pin = trim((string) ($manager['pin'] ?? ''));
        $name = trim((string) ($manager['name'] ?? ''));
        $signature = $manager['signature'] ?? null;

        $user->username = $targetUsername;
        $user->role_id = $bmRole->id;
        $user->account_type = 'staff';
        $user->branch_id = $branch->id;
        $user->area_id = $area->id;
        $user->zone_id = $area->zone_id;
        $user->is_active = (bool) $branch->is_active;

        if ($pin !== '') {
            $user->pin = $pin;
        }
        if ($name !== '') {
            $user->name = "{$branch->name} Branch Manager ({$name})";
        } elseif (! filled($user->name)) {
            $user->name = "{$branch->name} Branch Manager";
        }
        if (filled($signature)) {
            $user->signature = $signature;
        }

        $user->save();
        $user->branches()->sync([$branch->id]);

        if ($isNew) {
            $stats['users']['created']++;
        } else {
            $stats['users']['updated']++;
        }

        return $user;
    }

    private function makeSlug(string $name): string
    {
        $cleaned = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $name));

        return $cleaned !== '' ? $cleaned : 'unknown';
    }

    /**
     * Apply login PIN only for newly created branches that have no PIN set in MisLoan yet.
     * Existing branch PINs set in MisLoan are strictly preserved and never overwritten.
     *
     * @param  array<string, mixed>  $branchData
     */
    private function applyBranchLoginPin(Branch $branch, array $branchData): bool
    {
        // If the branch already has a login PIN configured in MisLoan, preserve it!
        if (filled($branch->getRawOriginal('login_pin'))) {
            return false;
        }

        // For new branches: if HRM provided a pin hash, use it
        $hash = $branchData['login_pin_hash'] ?? null;
        if (is_string($hash) && $hash !== '') {
            $branch->forceFill(['login_pin' => $hash])->saveQuietly();

            return true;
        }

        $code = trim((string) $branch->code);
        if ($code === '') {
            return false;
        }

        // Fall back to branch code as initial PIN only if branch has no PIN at all
        $branch->forceFill(['login_pin' => Hash::make($code)])->saveQuietly();

        return true;
    }

    private function requiredCode(mixed $code, string $entity): string
    {
        $normalized = trim((string) $code);
        if ($normalized === '') {
            throw new RuntimeException("HRM {$entity} is missing a code.");
        }

        return $normalized;
    }
}
