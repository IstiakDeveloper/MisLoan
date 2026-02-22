<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoanApplicationIssue extends Model
{
    protected $fillable = [
        'loan_application_id',
        'reported_by',
        'issue_description',
        'status',
        'response_message',
        'responded_by',
        'responded_at',
    ];

    protected $casts = [
        'responded_at' => 'datetime',
    ];

    public function loanApplication(): BelongsTo
    {
        return $this->belongsTo(LoanApplication::class);
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function responder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responded_by');
    }

    /**
     * Mark issue as resolved
     */
    public function markResolved($userId, $responseMessage)
    {
        $this->update([
            'status' => 'resolved',
            'response_message' => $responseMessage,
            'responded_by' => $userId,
            'responded_at' => now(),
        ]);
    }

    /**
     * Mark issue as rejected (disputed)
     */
    public function markRejected($userId, $responseMessage)
    {
        $this->update([
            'status' => 'rejected',
            'response_message' => $responseMessage,
            'responded_by' => $userId,
            'responded_at' => now(),
        ]);
    }
}
