<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PeriodReopenLog extends Model
{
    protected $fillable = [
        'branch_id',
        'kind',
        'period_date',
        'reason',
        'reopened_by',
        'reopened_at',
    ];

    protected $casts = [
        'period_date' => 'date:Y-m-d',
        'reopened_at' => 'datetime',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function reopenedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reopened_by');
    }
}
