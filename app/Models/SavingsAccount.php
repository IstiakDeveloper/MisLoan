<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SavingsAccount extends Model
{
    public const STATUS_ACTIVE = 'active';

    public const STATUS_CLOSED = 'closed';

    protected $fillable = [
        'account_no',
        'savings_application_id',
        'member_admission_id',
        'branch_id',
        'samity_id',
        'savings_product_id',
        'profit_rate',
        'balance_paisa',
        'held_paisa',
        'opened_date',
        'status',
        'created_by',
    ];

    protected $casts = [
        'opened_date' => 'date:Y-m-d',
        'balance_paisa' => 'integer',
        'held_paisa' => 'integer',
    ];

    public function memberAdmission(): BelongsTo
    {
        return $this->belongsTo(MemberAdmission::class);
    }

    public function savingsProduct(): BelongsTo
    {
        return $this->belongsTo(SavingsProduct::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(SavingsTransaction::class)->orderByDesc('id');
    }

    public function holds(): HasMany
    {
        return $this->hasMany(SavingsHold::class);
    }

    public function availableBalancePaisa(): int
    {
        return max(0, $this->balance_paisa - $this->held_paisa);
    }
}
