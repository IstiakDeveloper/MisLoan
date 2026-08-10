<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class HrmUserSyncService
{
    /**
     * @return array{created: int, updated: int, deactivated: int, skipped: int}
     */
    public function sync(): array
    {
        $pinStats = app(HrmOrganizationSyncService::class)->syncBranchLoginPinsFromHrm();

        $officers = $this->fetchFieldOfficers();

        $stats = [
            'created' => 0,
            'updated' => 0,
            'deactivated' => 0,
            'skipped' => 0,
            'branch_pins_updated' => $pinStats['branches_updated'],
        ];

        DB::transaction(function () use ($officers, &$stats) {
            foreach ($officers as $officer) {
                $result = $this->upsertOfficer($officer);
                $stats[$result]++;
            }
        });

        return $stats;
    }

    /**
     * Upsert a single officer payload (bulk sync or HRM webhook).
     *
     * @param  array<string, mixed>  $officer
     * @return 'created'|'updated'|'deactivated'|'skipped'
     */
    public function upsertOfficer(array $officer): string
    {
        $pin = trim((string) ($officer['pin'] ?? ''));
        if ($pin === '') {
            return 'skipped';
        }

        $fieldOfficerRole = Role::query()->where('name', 'field_officer')->first();
        if (! $fieldOfficerRole) {
            throw new RuntimeException('field_officer role is missing in MisLoan.');
        }

        $username = trim((string) ($officer['username'] ?? $pin));
        if ($username === '') {
            $username = $pin;
        }

        $isActive = (bool) ($officer['is_active'] ?? true);
        $branch = $this->resolveBranch($officer['branch_code'] ?? null);

        $user = $this->findMatchingUser($pin, $username);

        if (! $user) {
            if (! $isActive) {
                return 'skipped';
            }

            $email = $this->resolveEmailForCreate($officer, $pin);
            $password = $this->resolvePasswordValue($officer, $pin);

            if (User::withTrashed()->where('username', $username)->exists()) {
                // Username taken by unrelated account — use PIN-based unique username
                $username = $this->allocateUniqueUsername($pin);
            }

            $user = new User;
            $user->name = (string) ($officer['name'] ?? $pin);
            $user->username = $username;
            $user->email = $email;
            $user->pin = $pin;
            $user->role_id = $fieldOfficerRole->id;
            $user->account_type = 'staff';
            $user->branch_id = $branch?->id;
            $user->area_id = $branch?->area_id;
            $user->zone_id = $branch?->area?->zone_id;
            $user->is_active = true;
            $user->has_all_access = false;
            $user->password = $password;
            $user->save();

            if ($branch) {
                $user->branches()->sync([$branch->id]);
            }

            return 'created';
        }

        // Existing user: update pin/username to HRM format, password, active, branch, FO role.
        // Keep phone, signature, and existing email untouched.
        $wasActive = (bool) $user->is_active;

        $usernameTaken = User::withTrashed()
            ->where('username', $username)
            ->where('id', '!=', $user->id)
            ->exists();

        if (! $usernameTaken) {
            $user->username = $username;
        }

        $user->pin = $pin;
        $user->role_id = $fieldOfficerRole->id;
        $user->account_type = 'staff';
        $user->is_active = $isActive;

        if ($branch) {
            $user->branch_id = $branch->id;
            $user->area_id = $branch->area_id;
            $user->zone_id = $branch->area?->zone_id;
            $user->branches()->sync([$branch->id]);
        }

        $password = $this->resolvePasswordValue($officer, $pin);
        if ($password !== null && $password !== '') {
            $user->password = $password;
        }

        // Name sync only when empty
        if (! filled($user->name) && filled($officer['name'] ?? null)) {
            $user->name = (string) $officer['name'];
        }

        $user->save();

        if (! $isActive && $wasActive) {
            return 'deactivated';
        }

        return 'updated';
    }

    /**
     * Update branch assignment for an existing MisLoan user (transfer webhook).
     * Does not create users — only updates when PIN/username matches.
     *
     * Member portfolio is NOT moved here. After transfer, if the FO still has
     * members assigned at the previous branch, login is locked until they
     * complete portfolio handover in MisLoan.
     *
     * @param  array<string, mixed>  $payload
     * @return 'updated'|'not_found'|'skipped'
     */
    public function transferBranch(array $payload): string
    {
        $pin = trim((string) ($payload['pin'] ?? ''));
        if ($pin === '') {
            return 'skipped';
        }

        $username = trim((string) ($payload['username'] ?? $pin));
        if ($username === '') {
            $username = $pin;
        }

        $user = $this->findMatchingUser($pin, $username);
        if (! $user) {
            return 'not_found';
        }

        $branch = $this->resolveBranch($payload['branch_code'] ?? null);
        if (! $branch) {
            return 'skipped';
        }

        // Branch change only — assigned members stay on old branch until FO handover.
        $user->branch_id = $branch->id;
        $user->area_id = $branch->area_id;
        $user->zone_id = $branch->area?->zone_id;
        $user->branches()->sync([$branch->id]);

        if (array_key_exists('is_active', $payload)) {
            $user->is_active = (bool) $payload['is_active'];
        }

        $user->save();

        return 'updated';
    }

    public function isConfigured(): bool
    {
        $url = rtrim((string) config('services.hrm.url'), '/');
        $token = (string) config('services.hrm.token');

        return $url !== '' && $token !== '';
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function fetchFieldOfficers(): array
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('HRM sync is not configured. Set HRM_API_URL and HRM_API_TOKEN in .env.');
        }

        $baseUrl = rtrim((string) config('services.hrm.url'), '/');
        $token = (string) config('services.hrm.token');

        try {
            $response = Http::timeout(60)
                ->acceptJson()
                ->withToken($token)
                ->get("{$baseUrl}/sync/field-officers");
        } catch (RequestException $e) {
            throw new RuntimeException('HRM field officer sync request failed: '.$e->getMessage(), previous: $e);
        }

        if (! $response->successful()) {
            $message = $response->json('message') ?? $response->body();

            throw new RuntimeException('HRM field officer sync failed: '.$message);
        }

        $officers = $response->json('officers');
        if (! is_array($officers)) {
            throw new RuntimeException('HRM field officer sync returned an invalid response.');
        }

        return array_values(array_filter($officers, 'is_array'));
    }

    /**
     * Find MisLoan user for HRM officer PIN/username (excludes branch accounts).
     */
    public function findMatchingUser(string $pin, string $username): ?User
    {
        $fieldOfficerRoleId = Role::query()->where('name', 'field_officer')->value('id');

        // Prefer exact pin/username, then zero-padded variants (27 ↔ 0027)
        $lookups = [
            ['pin', $pin],
            ['username', $pin],
            ['username', $username],
            ['pin', $username],
        ];

        foreach ($this->pinVariants($pin) as $variant) {
            if ($variant === $pin) {
                continue;
            }
            $lookups[] = ['pin', $variant];
            $lookups[] = ['username', $variant];
        }
        foreach ($this->pinVariants($username) as $variant) {
            if ($variant === $username || $variant === $pin) {
                continue;
            }
            $lookups[] = ['pin', $variant];
            $lookups[] = ['username', $variant];
        }

        foreach ($lookups as [$column, $value]) {
            if ($value === '') {
                continue;
            }

            if ($fieldOfficerRoleId) {
                $fo = User::withTrashed()
                    ->where('role_id', $fieldOfficerRoleId)
                    ->where(function ($q) {
                        $q->where('account_type', 'staff')->orWhereNull('account_type');
                    })
                    ->where($column, $value)
                    ->first();
                if ($fo) {
                    return $this->restoreIfTrashed($fo);
                }
            }
        }

        foreach ($lookups as [$column, $value]) {
            if ($value === '') {
                continue;
            }

            $any = User::withTrashed()
                ->where($column, $value)
                ->where(function ($q) {
                    $q->where('account_type', 'staff')
                        ->orWhereNull('account_type');
                })
                ->whereDoesntHave('role', fn ($q) => $q->whereIn('name', ['branch_user', 'branch_manager']))
                ->first();
            if ($any) {
                return $this->restoreIfTrashed($any);
            }
        }

        return null;
    }

    /**
     * @return list<string>
     */
    private function pinVariants(string $value): array
    {
        $value = trim($value);
        if ($value === '') {
            return [];
        }

        if (! preg_match('/^\d+$/', $value)) {
            return [strtolower($value)];
        }

        $normalized = ltrim($value, '0');
        if ($normalized === '') {
            $normalized = '0';
        }

        $variants = [$value, $normalized];
        foreach ([3, 4, 5, 6] as $length) {
            $variants[] = str_pad($normalized, $length, '0', STR_PAD_LEFT);
        }

        return array_values(array_unique($variants));
    }

    private function restoreIfTrashed(?User $user): ?User
    {
        if (! $user) {
            return null;
        }

        if ($user->trashed()) {
            $user->restore();
        }

        return $user;
    }

    private function resolveBranch(mixed $branchCode): ?Branch
    {
        $code = trim((string) $branchCode);
        if ($code === '') {
            return null;
        }

        return Branch::query()->with('area')->where('code', $code)->first();
    }

    /**
     * @param  array<string, mixed>  $officer
     */
    private function resolveEmailForCreate(array $officer, string $pin): string
    {
        $email = trim((string) ($officer['email'] ?? ''));
        if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
            if (! User::withTrashed()->where('email', $email)->exists()) {
                return $email;
            }
        }

        $candidate = strtolower($pin).'@misloan.local';
        $n = 0;
        while (User::withTrashed()->where('email', $candidate)->exists()) {
            $n++;
            $candidate = strtolower($pin).'+'.$n.'@misloan.local';
        }

        return $candidate;
    }

    private function allocateUniqueUsername(string $base): string
    {
        $username = $base;
        $n = 0;
        while (User::withTrashed()->where('username', $username)->exists()) {
            $n++;
            $username = $base.'_'.$n;
        }

        return $username;
    }

    /**
     * Prefer HRM password hash; fall back to plain PIN for brand-new HRM accounts.
     *
     * @param  array<string, mixed>  $officer
     */
    private function resolvePasswordValue(array $officer, string $pin): ?string
    {
        $hash = $officer['password_hash'] ?? null;
        if (is_string($hash) && $hash !== '') {
            return $hash;
        }

        $plain = $officer['plain_password'] ?? null;
        if (is_string($plain) && $plain !== '') {
            return $plain;
        }

        return $pin;
    }
}
