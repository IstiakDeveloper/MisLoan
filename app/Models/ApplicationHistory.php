<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ApplicationHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'application_type',
        'application_id',
        'user_id',
        'action',
        'previous_status',
        'new_status',
        'remarks',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function application(): MorphTo
    {
        return $this->morphTo();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeByAction($query, string $action)
    {
        return $query->where('action', $action);
    }

    public function scopeRecent($query, int $limit = 10)
    {
        return $query->orderBy('created_at', 'desc')->limit($limit);
    }
}
