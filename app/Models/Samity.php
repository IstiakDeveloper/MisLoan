<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Samity extends Model
{
    protected $fillable = [
        'branch_id',
        'samity_code',
        'samity_name',
        'samity_name_bn',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function memberAdmissions(): HasMany
    {
        return $this->hasMany(MemberAdmission::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
