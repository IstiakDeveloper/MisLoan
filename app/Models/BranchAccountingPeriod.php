<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BranchAccountingPeriod extends Model
{
    public const KIND_DAY = 'day';

    public const KIND_MONTH = 'month';

    public const STATUS_OPEN = 'open';

    public const STATUS_CLOSED = 'closed';

    protected $fillable = [
        'branch_financial_year_id',
        'branch_id',
        'kind',
        'period_date',
        'status',
        'opened_by',
        'opened_at',
        'closed_by',
        'closed_at',
        'close_reference',
        'summary',
    ];

    protected $casts = [
        'period_date' => 'date:Y-m-d',
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
        'summary' => 'array',
    ];

    public function branchFinancialYear(): BelongsTo
    {
        return $this->belongsTo(BranchFinancialYear::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function openedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'opened_by');
    }

    public function closedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function isClosed(): bool
    {
        return $this->status === self::STATUS_CLOSED && $this->closed_at !== null;
    }
}
