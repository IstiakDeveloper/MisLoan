<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;

class User extends Authenticatable
{
    use HasFactory, Notifiable, SoftDeletes, TwoFactorAuthenticatable;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'username',
        'password',
        'role_id',
        'account_type',
        'branch_id',
        'area_id',
        'zone_id',
        'has_all_access',
        'profile_photo',
        'signature',
        'pin',
        'is_active',
        'email_verified_at',
    ];

    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'has_all_access' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Check if user has completed profile: phone, pin and digital signature are set.
     * Until complete, user is redirected to profile/complete after login.
     */
    public function hasCompleteProfile(): bool
    {
        return filled($this->phone) && filled($this->pin) && filled($this->signature);
    }

    /**
     * Members still assigned to this FO whose branch differs from the FO's current branch
     * (typical after HRM transfer). Kept for the optional handover screen; login is not locked.
     */
    public function pendingPortfolioHandoverMembers()
    {
        return MemberAdmission::query()
            ->assignedToOfficer((int) $this->id)
            ->whereNotNull('branch_id')
            ->where('branch_id', '!=', (int) $this->branch_id);
    }

    /**
     * Members belong to the branch, not the officer, so transfer no longer blocks the app.
     */
    public function needsPortfolioHandover(): bool
    {
        return false;
    }

    /**
     * Get the role
     */
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    /**
     * Get the branch
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Get the area
     */
    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    /**
     * Get the zone
     */
    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }

    /**
     * Get all assigned zones (many-to-many)
     */
    public function zones(): BelongsToMany
    {
        return $this->belongsToMany(Zone::class, 'user_zones')
            ->withTimestamps();
    }

    /**
     * Get all assigned areas (many-to-many)
     */
    public function areas(): BelongsToMany
    {
        return $this->belongsToMany(Area::class, 'user_areas')
            ->withTimestamps();
    }

    /**
     * Get all assigned branches (many-to-many)
     */
    public function branches(): BelongsToMany
    {
        return $this->belongsToMany(Branch::class, 'user_branches')
            ->withTimestamps();
    }

    /**
     * Get accessible branches based on user's access level
     */
    public function getAccessibleBranches()
    {
        if ($this->has_all_access) {
            return Branch::all();
        }

        // Check multi-assignment first
        if ($this->branches()->exists()) {
            return $this->branches;
        }

        if ($this->areas()->exists()) {
            return Branch::whereIn('area_id', $this->areas()->pluck('area_id'))->get();
        }

        if ($this->zones()->exists()) {
            return Branch::whereHas('area', function ($query) {
                $query->whereIn('zone_id', $this->zones()->pluck('zone_id'));
            })->get();
        }

        // Fallback to single assignment
        if ($this->zone_id) {
            return Branch::whereHas('area', function ($query) {
                $query->where('zone_id', $this->zone_id);
            })->get();
        }

        if ($this->area_id) {
            return Branch::where('area_id', $this->area_id)->get();
        }

        if ($this->branch_id) {
            return Branch::where('id', $this->branch_id)->get();
        }

        return collect();
    }

    /**
     * Check if user can access a specific branch
     */
    public function canAccessBranch(int $branchId): bool
    {
        if ($this->has_all_access) {
            return true;
        }

        return $this->getAccessibleBranches()->contains('id', $branchId);
    }

    /**
     * Get submitted loan applications
     */
    public function loanApplications(): HasMany
    {
        return $this->hasMany(LoanApplication::class, 'submitted_by');
    }

    /**
     * Get notifications
     */
    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    /**
     * Get unread notifications
     */
    public function unreadNotifications()
    {
        return $this->notifications()->where('is_read', false);
    }

    /**
     * Get activity logs
     */
    public function activityLogs(): HasMany
    {
        return $this->hasMany(ActivityLog::class);
    }

    /**
     * Check if user has permission
     */
    public function hasPermission(string $permission): bool
    {
        return $this->role?->hasPermission($permission) ?? false;
    }

    /**
     * Check if user is super admin
     */
    public function isSuperAdmin(): bool
    {
        return in_array($this->role?->name, [Role::SUPER_ADMIN, 'superadmin', 'Super Admin'], true);
    }

    /**
     * Check if user is head office
     */
    public function isHeadOffice(): bool
    {
        return $this->role?->name === Role::HEAD_OFFICE;
    }

    public function isBranchAccount(): bool
    {
        return $this->account_type === 'branch';
    }

    public function isStaffAccount(): bool
    {
        return $this->account_type === 'staff' || $this->account_type === null;
    }

    /**
     * Check if user is Executive Director (ED)
     */
    public function isEd(): bool
    {
        return $this->role?->name === Role::ED;
    }

    /**
     * Approver / manager roles that may view HO lists (scoped to assignment).
     */
    public function isOrganizationalViewer(): bool
    {
        return in_array($this->role?->name, [
            Role::ED,
            Role::ADMF,
            Role::DMF,
            Role::AREA_MANAGER,
            Role::ZONE_MANAGER,
        ], true);
    }

    /**
     * These roles can view Head Office modules but cannot mutate them.
     * Approver writes (team-based) use separate routes.
     */
    public function isReadOnlyAdmin(): bool
    {
        return $this->isOrganizationalViewer();
    }

    /**
     * Scope for active users
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: users with Team Vittik approver roles (ADMF, DMF, ED)
     */
    public function scopeApproverRole($query)
    {
        return $query->whereHas('role', function ($q) {
            $q->whereIn('name', Role::approverRoleNames());
        });
    }

    /**
     * Scope: users who can access the given branch (by zone/area/branch assignment)
     */
    public function scopeCanAccessBranch($query, int $branchId)
    {
        $branch = Branch::with('area')->find($branchId);
        if (! $branch) {
            return $query->whereRaw('0 = 1');
        }

        $zoneId = $branch->area?->zone_id ?? 0;

        return $query->where(function ($q) use ($branch, $zoneId) {
            $q->where('has_all_access', true)
                ->orWhere('branch_id', $branch->id)
                ->orWhere('area_id', $branch->area_id)
                ->orWhere('zone_id', $zoneId)
                ->orWhereHas('branches', fn ($sq) => $sq->where('branches.id', $branch->id))
                ->orWhereHas('areas', fn ($sq) => $sq->where('areas.id', $branch->area_id))
                ->orWhereHas('zones', fn ($sq) => $sq->where('zones.id', $zoneId));
        });
    }

    /**
     * Get approver users (ADMF, DMF, ED) that a branch can select for Team Vittik Onumodon.
     * Assign zone/area/branch when creating these users so they appear here.
     */
    public static function getApproversSelectableByBranch(int $branchId)
    {
        return self::query()
            ->with('role')
            ->active()
            ->approverRole()
            ->canAccessBranch($branchId)
            ->orderBy('name')
            ->get();
    }
}
