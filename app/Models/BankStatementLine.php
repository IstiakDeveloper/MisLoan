<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BankStatementLine extends Model
{
    protected $fillable = [
        'branch_id',
        'ledger_account_id',
        'statement_date',
        'reference_no',
        'description',
        'debit_paisa',
        'credit_paisa',
        'matched_journal_entry_id',
        'created_by',
    ];

    protected $casts = [
        'statement_date' => 'date:Y-m-d',
        'debit_paisa' => 'integer',
        'credit_paisa' => 'integer',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function ledgerAccount(): BelongsTo
    {
        return $this->belongsTo(LedgerAccount::class);
    }

    public function matchedJournal(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class, 'matched_journal_entry_id');
    }
}
