<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BranchFinancialYear extends Model
{
    protected $fillable = [
        'financial_year_id',
        'branch_id',
        'initial_date',
        'enrolled_by',
        'enrolled_at',
    ];

    protected $casts = [
        'initial_date' => 'date:Y-m-d',
        'enrolled_at' => 'datetime',
    ];

    public function financialYear(): BelongsTo
    {
        return $this->belongsTo(FinancialYear::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function enrolledByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'enrolled_by');
    }

    public function periods(): HasMany
    {
        return $this->hasMany(BranchAccountingPeriod::class);
    }
}
