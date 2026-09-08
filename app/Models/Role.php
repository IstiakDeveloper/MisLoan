<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Role extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'display_name',
        'description',
        'permissions',
    ];

    protected $casts = [
        'permissions' => 'array',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function hasPermission(string $permission): bool
    {
        return in_array($permission, $this->permissions ?? []);
    }

    const SUPER_ADMIN = 'super_admin';

    const HEAD_OFFICE = 'head_office';

    const ZONE_MANAGER = 'zone_manager';

    const AREA_MANAGER = 'area_manager';

    const BRANCH_MANAGER = 'branch_manager';

    const BRANCH_USER = 'branch_user';

    const FIELD_OFFICER = 'field_officer';

    const CSO = 'cso';

    /** Team Vittik Onumodon (Financial Approval) - branch can select these for approval */
    const ADMF = 'admf';  // Assistant Director Microfinance

    const DMF = 'dmf';    // Director Microfinance

    const ED = 'ed';      // Executive Director

    public static function approverRoleNames(): array
    {
        return [self::ADMF, self::DMF, self::ED];
    }

    /**
     * Loan / team-based approval chain, lowest to highest.
     * Branch Manager (1) → Area Manager → Zone Manager → ADMF → DMF → ED (6).
     */
    public static function approvalHierarchyRank(?string $name): int
    {
        return match ($name) {
            self::BRANCH_MANAGER => 1,
            self::AREA_MANAGER => 2,
            self::ZONE_MANAGER => 3,
            self::ADMF => 4,
            self::DMF => 5,
            self::ED => 6,
            default => 0,
        };
    }

    public function isApproverRole(): bool
    {
        return in_array($this->name, self::approverRoleNames(), true);
    }
}
