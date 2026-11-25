<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoanTransaction extends Model
{
    public $timestamps = false;

    public const KIND_DISBURSEMENT = 'disbursement';

    public const KIND_COLLECTION = 'collection';

    public const KIND_REBATE = 'rebate';

    public const KIND_REVERSAL = 'reversal';

    protected $fillable = [
        'reference',
        'loan_account_id',
        'branch_id',
        'kind',
        'business_date',
        'principal_paisa',
        'service_charge_paisa',
        'total_paisa',
        'payment_mode',
        'idempotency_key',
        'journal_entry_id',
        'reversal_of_id',
        'created_by',
        'note',
        'created_at',
    ];

    protected $casts = [
        'business_date' => 'date:Y-m-d',
        'created_at' => 'datetime',
        'principal_paisa' => 'integer',
        'service_charge_paisa' => 'integer',
        'total_paisa' => 'integer',
    ];

    public function loanAccount(): BelongsTo
    {
        return $this->belongsTo(LoanAccount::class);
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
