<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
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
        'branch_id',
        'area_id',
        'zone_id',
        'has_all_access',
        'profile_photo',
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
     * Get submitted member admissions
     */
    public function memberAdmissions(): HasMany
    {
        return $this->hasMany(MemberAdmission::class, 'submitted_by');
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
        return $this->role?->name === Role::SUPER_ADMIN;
    }

    /**
     * Check if user is head office
     */
    public function isHeadOffice(): bool
    {
        return $this->role?->name === Role::HEAD_OFFICE;
    }

    /**
     * Scope for active users
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
