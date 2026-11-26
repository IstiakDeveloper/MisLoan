<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SavingsTransaction extends Model
{
    public $timestamps = false;

    public const KIND_DEPOSIT = 'deposit';

    public const KIND_WITHDRAWAL = 'withdrawal';

    public const KIND_PROFIT = 'profit';

    public const KIND_REVERSAL = 'reversal';

    protected $fillable = [
        'reference',
        'savings_account_id',
        'branch_id',
        'kind',
        'business_date',
        'amount_paisa',
        'payment_mode',
        'idempotency_key',
        'journal_entry_id',
        'created_by',
        'note',
        'created_at',
    ];

    protected $casts = [
        'business_date' => 'date:Y-m-d',
        'created_at' => 'datetime',
        'amount_paisa' => 'integer',
    ];

    public function savingsAccount(): BelongsTo
    {
        return $this->belongsTo(SavingsAccount::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
