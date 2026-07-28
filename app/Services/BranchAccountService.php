<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Str;

class BranchAccountService
{
    public function ensureForBranch(Branch $branch): User
    {
        $branchUserRole = Role::query()->where('name', 'branch_user')->firstOrFail();

        $user = $branch->branch_user_id
            ? User::query()->find($branch->branch_user_id)
            : null;

        if (! $user) {
            $user = User::query()
                ->where('account_type', 'branch')
                ->where('branch_id', $branch->id)
                ->first();
        }

        if (! $user) {
            $legacy = User::query()
                ->where('role_id', $branchUserRole->id)
                ->where('branch_id', $branch->id)
                ->where('username', $branch->code)
                ->first();
            if ($legacy) {
                $user = $legacy;
            }
        }

        if (! $user) {
            $user = new User;
        }

        $username = $this->buildUsername($branch, $user->id ?? null);
        $email = $this->buildEmail($branch, $user->id ?? null);

        $user->fill([
            'name' => trim((string) $branch->name).' User',
            'username' => $username,
            'email' => $email,
            'role_id' => $branchUserRole->id,
            'branch_id' => $branch->id,
            'area_id' => $branch->area_id,
            'zone_id' => $branch->area?->zone_id,
            'account_type' => 'branch',
            'is_active' => (bool) $branch->is_active,
            'has_all_access' => false,
        ]);

        if (! $user->exists || ! filled($user->password)) {
            $user->password = '12345678';
        }

        $user->save();
        $user->branches()->sync([$branch->id]);

        if ((int) $branch->branch_user_id !== (int) $user->id) {
            $branch->forceFill(['branch_user_id' => $user->id])->saveQuietly();
        }

        return $user->fresh(['role']);
    }

    public function migrateLegacyBranchUsers(): int
    {
        $branchUserRoleId = Role::query()->where('name', 'branch_user')->value('id');
        if (! $branchUserRoleId) {
            return 0;
        }

        $count = 0;
        Branch::query()->with('area')->orderBy('code')->each(function (Branch $branch) use (&$count) {
            $this->ensureForBranch($branch);
            $count++;
        });

        return $count;
    }

    private function buildUsername(Branch $branch, ?int $exceptUserId = null): string
    {
        $code = Str::lower(preg_replace('/[^a-z0-9]+/i', '', (string) $branch->code) ?: 'branch');
        $base = 'branch_'.$code;
        $username = $base;
        $suffix = 0;

        while (
            User::withTrashed()
                ->where('username', $username)
                ->when($exceptUserId, fn ($q) => $q->where('id', '!=', $exceptUserId))
                ->exists()
        ) {
            $suffix++;
            $username = $base.$suffix;
        }

        return $username;
    }

    private function buildEmail(Branch $branch, ?int $exceptUserId = null): string
    {
        if (filled($branch->email)) {
            $candidate = strtolower(trim((string) $branch->email));
            if (! User::withTrashed()->where('email', $candidate)->when($exceptUserId, fn ($q) => $q->where('id', '!=', $exceptUserId))->exists()) {
                return $candidate;
            }
        }

        $candidate = 'branch.'.$branch->code.'@misloan.local';
        $n = 0;
        while (User::withTrashed()->where('email', $candidate)->when($exceptUserId, fn ($q) => $q->where('id', '!=', $exceptUserId))->exists()) {
            $n++;
            $candidate = 'branch.'.$branch->code.'+'.$n.'@misloan.local';
        }

        return $candidate;
    }
}
