<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FinancialYear extends Model
{
    protected $fillable = [
        'name',
        'starts_on',
        'ends_on',
        'opened_by',
        'opened_at',
        'closed_by',
        'closed_at',
        'close_reference',
    ];

    protected $casts = [
        'starts_on' => 'date:Y-m-d',
        'ends_on' => 'date:Y-m-d',
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    public function openedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'opened_by');
    }

    public function closedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function branchFinancialYears(): HasMany
    {
        return $this->hasMany(BranchFinancialYear::class);
    }

    public function isClosed(): bool
    {
        return $this->closed_at !== null;
    }
}
