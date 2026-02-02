<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MemberCategory extends Model
{
    protected $fillable = [
        'category_name',
        'category_name_bn',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function memberAdmissions(): HasMany
    {
        return $this->hasMany(MemberAdmission::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
