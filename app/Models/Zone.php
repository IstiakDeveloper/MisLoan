<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Zone extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function areas(): HasMany
    {
        return $this->hasMany(Area::class);
    }

    public function branches()
    {
        return $this->hasManyThrough(Branch::class, Area::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function activeAreas(): HasMany
    {
        return $this->areas()->where('is_active', true);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
