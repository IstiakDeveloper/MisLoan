<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SavingsHold extends Model
{
    protected $fillable = [
        'savings_account_id',
        'amount_paisa',
        'reason',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'amount_paisa' => 'integer',
        'is_active' => 'boolean',
    ];

    public function savingsAccount(): BelongsTo
    {
        return $this->belongsTo(SavingsAccount::class);
    }
}
