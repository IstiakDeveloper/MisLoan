<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class AppRegistration extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'branch_id',
        'samity_id',
        'member_admission_id',
        'member_code',
        'member_name',
        'phone_number',
        'is_registered',
        'registered_at',
        'registered_by',
        'registration_source',
        'remarks',
    ];

    protected $casts = [
        'is_registered' => 'boolean',
        'registered_at' => 'datetime',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function samity(): BelongsTo
    {
        return $this->belongsTo(Samity::class);
    }

    public function memberAdmission(): BelongsTo
    {
        return $this->belongsTo(MemberAdmission::class);
    }

    public function registeredByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registered_by');
    }

    public function scopeRegistered($query)
    {
        return $query->where('is_registered', true);
    }
}

