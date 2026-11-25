<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JournalEntry extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'reference',
        'branch_id',
        'branch_accounting_period_id',
        'idempotency_key',
        'payload_hash',
        'business_date',
        'description',
        'created_by',
        'reversal_of',
        'created_at',
    ];

    protected $casts = [
        'business_date' => 'date:Y-m-d',
        'created_at' => 'datetime',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(BranchAccountingPeriod::class, 'branch_accounting_period_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(JournalLine::class);
    }

    public function reversalOf(): BelongsTo
    {
        return $this->belongsTo(self::class, 'reversal_of');
    }
}
