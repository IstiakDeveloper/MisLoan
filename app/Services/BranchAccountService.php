<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

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

    /**
     * Login PIN rules used wherever a branch account "password" is changed.
     *
     * @return list<string>
     */
    public static function loginPinRules(bool $required = true, bool $confirmed = true): array
    {
        $rules = [
            $required ? 'required' : 'nullable',
            'string',
            'min:4',
            'max:12',
            'regex:/^[0-9]+$/',
        ];

        if ($confirmed) {
            $rules[] = 'confirmed';
        }

        return $rules;
    }

    /**
     * @return array<string, string>
     */
    public static function loginPinMessages(): array
    {
        $message = 'The branch login PIN must be 4 to 12 digits.';

        return [
            'password.regex' => $message,
            'password.min' => $message,
            'password.max' => $message,
        ];
    }

    public function resolveBranch(User $user): ?Branch
    {
        if (! $user->isBranchAccount()) {
            return null;
        }

        $linked = Branch::query()->where('branch_user_id', $user->id)->first();
        if ($linked) {
            return $linked;
        }

        $user->loadMissing('branch');

        return $user->branch;
    }

    public function verifyCurrentPin(User $user, string $pin): bool
    {
        $branch = $this->resolveBranch($user);

        if ($branch && $branch->hasLoginPin() && $branch->verifyLoginPin($pin)) {
            return true;
        }

        return Hash::check($pin, (string) $user->password);
    }

    public function updateLoginPin(User $user, string $pin): void
    {
        $branch = $this->resolveBranch($user);
        if (! $branch) {
            throw ValidationException::withMessages([
                'password' => 'This branch account is not linked to a branch, so the login PIN cannot be updated.',
            ]);
        }

        $branch->forceFill([
            'login_pin' => Hash::make($pin),
        ])->saveQuietly();
    }

    public function updatePasswordOrPin(User $user, string $plainPassword): void
    {
        $user->forceFill([
            'password' => $plainPassword,
        ])->save();

        if ($user->isBranchAccount()) {
            $this->updateLoginPin($user, $plainPassword);
        }
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
