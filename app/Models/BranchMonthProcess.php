<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BranchMonthProcess extends Model
{
    public const STATUS_PROCESSED = 'processed';

    public const STATUS_CLOSED = 'closed';

    protected $fillable = [
        'branch_id',
        'branch_financial_year_id',
        'month_date',
        'status',
        'llp_processed_at',
        'llp_processed_by',
        'llp_summary',
        'processed_by',
        'processed_at',
        'closed_by',
        'closed_at',
        'summary',
    ];

    protected $casts = [
        'month_date' => 'date:Y-m-d',
        'llp_processed_at' => 'datetime',
        'llp_summary' => 'array',
        'processed_at' => 'datetime',
        'closed_at' => 'datetime',
        'summary' => 'array',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function branchFinancialYear(): BelongsTo
    {
        return $this->belongsTo(BranchFinancialYear::class);
    }

    public function processedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    public function closedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function llpProcessedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'llp_processed_by');
    }
}
