<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RejectionReason extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'reason',
        'description',
        'is_common',
        'usage_count',
        'category',
        'is_active',
    ];

    protected $casts = [
        'is_common' => 'boolean',
        'is_active' => 'boolean',
        'usage_count' => 'integer',
    ];

    public function incrementUsage(): void
    {
        $this->increment('usage_count');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeCommon($query)
    {
        return $query->where('is_common', true);
    }

    public function scopeByCategory($query, string $category)
    {
        return $query->where('category', $category);
    }

    public function scopeMostUsed($query, int $limit = 10)
    {
        return $query->orderBy('usage_count', 'desc')->limit($limit);
    }
}
