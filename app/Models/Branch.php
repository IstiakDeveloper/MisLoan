<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class Branch extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'area_id',
        'name',
        'code',
        'pin',
        'email',
        'phone',
        'address',
        'is_active',
        'accounting_enabled',
        'login_pin',
        'branch_user_id',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'accounting_enabled' => 'boolean',
    ];

    protected $hidden = [
        'pin',
        'login_pin',
    ];

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    public function zone()
    {
        return $this->area->zone();
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function branchUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'branch_user_id');
    }

    public function hasLoginPin(): bool
    {
        return filled($this->login_pin);
    }

    public function verifyLoginPin(string $pin): bool
    {
        if (! $this->login_pin) {
            return false;
        }

        return Hash::check($pin, $this->login_pin);
    }

    public function loanApplications(): HasMany
    {
        return $this->hasMany(LoanApplication::class);
    }

    public function samities(): HasMany
    {
        return $this->hasMany(Samity::class);
    }

    public function memberAdmissions(): HasMany
    {
        return $this->hasMany(MemberAdmission::class);
    }

    public function teamBasedApprovals(): HasMany
    {
        return $this->hasMany(TeamBasedApproval::class);
    }

    public function bankAccounts(): HasMany
    {
        return $this->hasMany(BranchBankAccount::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Operational field branches only (excludes Head Office & Unknown pseudo-branches).
     */
    public function scopeOperational($query)
    {
        return $query
            ->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('code')
                    ->orWhereNotIn('code', ['0000', '1000']);
            })
            ->whereRaw('LOWER(name) NOT IN (?, ?)', ['head office', 'unknown']);
    }

    public function scopeOrderedByCode($query)
    {
        return $query->orderBy('code')->orderBy('name');
    }

    public static function resolveOperationalDefaultId(?int $preferredBranchId = null): ?int
    {
        if ($preferredBranchId && static::operational()->whereKey($preferredBranchId)->exists()) {
            return $preferredBranchId;
        }

        if (app()->bound('session') && session()->has('active_branch_id')) {
            $sessionBranchId = (int) session('active_branch_id');
            if ($sessionBranchId > 0 && static::operational()->whereKey($sessionBranchId)->exists()) {
                return $sessionBranchId;
            }
        }

        if (Schema::hasColumn('branches', 'accounting_enabled')) {
            $pilotId = static::operational()
                ->where('accounting_enabled', true)
                ->orderedByCode()
                ->value('id');
            if ($pilotId) {
                return (int) $pilotId;
            }
        }

        $id = static::operational()->orderedByCode()->value('id');

        return $id ? (int) $id : null;
    }

    public function getFullNameAttribute(): string
    {
        return "{$this->name} ({$this->area->name}, {$this->area->zone->name})";
    }
}
