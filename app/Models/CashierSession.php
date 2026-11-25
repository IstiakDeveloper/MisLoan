<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashierSession extends Model
{
    public const STATUS_OPEN = 'open';

    public const STATUS_SUBMITTED = 'submitted';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'branch_id',
        'business_date',
        'opened_by',
        'opened_at',
        'opening_cash_paisa',
        'expected_closing_paisa',
        'actual_closing_paisa',
        'variance_paisa',
        'status',
        'submitted_at',
        'reviewed_by',
        'reviewed_at',
        'note',
    ];

    protected $casts = [
        'business_date' => 'date:Y-m-d',
        'opened_at' => 'datetime',
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'opening_cash_paisa' => 'integer',
        'expected_closing_paisa' => 'integer',
        'actual_closing_paisa' => 'integer',
        'variance_paisa' => 'integer',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function opener(): BelongsTo
    {
        return $this->belongsTo(User::class, 'opened_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
