<?php

namespace App\Services;

use App\Models\Area;
use App\Models\Branch;
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
     *     branches: array{created: int, updated: int}
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
     * @param  array<string, mixed>  $payload
     * @return array{
     *     zones: array{created: int, updated: int},
     *     areas: array{created: int, updated: int},
     *     branches: array{created: int, updated: int}
     * }
     */
    private function applyOrganizationPayload(array $payload): array
    {
        $stats = [
            'zones' => ['created' => 0, 'updated' => 0],
            'areas' => ['created' => 0, 'updated' => 0],
            'branches' => ['created' => 0, 'updated' => 0],
        ];

        DB::transaction(function () use ($payload, &$stats) {
            foreach ($payload['zones'] as $zoneData) {
                $zone = $this->upsertZone($zoneData, $stats);

                foreach ($zoneData['areas'] ?? [] as $areaData) {
                    $area = $this->upsertArea($zone, $areaData, $stats);

                    foreach ($areaData['branches'] ?? [] as $branchData) {
                        $this->upsertBranch($area, $branchData, $stats);
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
                    $this->upsertBranch($area, $branchData, $stats);
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
     * @param  array{zones: array{created: int, updated: int}, areas: array{created: int, updated: int}, branches: array{created: int, updated: int}}  $stats
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
     * @param  array{zones: array{created: int, updated: int}, areas: array{created: int, updated: int}, branches: array{created: int, updated: int}}  $stats
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
     * @param  array{zones: array{created: int, updated: int}, areas: array{created: int, updated: int}, branches: array{created: int, updated: int}}  $stats
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
     * Apply HRM branch login PIN hash, or fall back to branch code as PIN.
     *
     * @param  array<string, mixed>  $branchData
     */
    private function applyBranchLoginPin(Branch $branch, array $branchData): bool
    {
        $hash = $branchData['login_pin_hash'] ?? null;
        if (is_string($hash) && $hash !== '') {
            if ($branch->getRawOriginal('login_pin') === $hash) {
                return false;
            }

            $branch->forceFill(['login_pin' => $hash])->saveQuietly();

            return true;
        }

        $code = trim((string) $branch->code);
        if ($code === '') {
            return false;
        }

        // No HRM PIN yet — default to branch code as login PIN
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
