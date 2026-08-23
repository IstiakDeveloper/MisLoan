<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CsoDailyAllocation extends Model
{
    use HasFactory;

    protected $table = 'cso_daily_allocations';

    protected $fillable = [
        'user_id',
        'area_id',
        'duty_date',
        'assigned_by',
        'notes',
    ];

    protected $casts = [
        'duty_date' => 'date:Y-m-d',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }
}
