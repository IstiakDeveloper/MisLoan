<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccountingVoucher extends Model
{
    public $timestamps = false;

    public const KIND_PAYMENT = 'payment';

    public const KIND_RECEIPT = 'receipt';

    public const KIND_JOURNAL = 'journal';

    public const KIND_CONTRA = 'contra';

    public const KIND_REVERSAL = 'reversal';

    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'reference',
        'branch_id',
        'kind',
        'reversal_of',
        'business_date',
        'description',
        'lines',
        'idempotency_key',
        'payload_hash',
        'requested_by',
        'status',
        'reviewed_by',
        'reviewed_at',
        'decision_note',
        'journal_entry_id',
        'created_at',
    ];

    protected $casts = [
        'business_date' => 'date:Y-m-d',
        'lines' => 'array',
        'reviewed_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class);
    }
}
