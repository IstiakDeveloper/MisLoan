<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Hash;

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
        'login_pin',
        'branch_user_id',
    ];

    protected $casts = [
        'is_active' => 'boolean',
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

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function getFullNameAttribute(): string
    {
        return "{$this->name} ({$this->area->name}, {$this->area->zone->name})";
    }
}
