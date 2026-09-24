<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoanApplicationApproval extends Model
{
    protected $fillable = [
        'loan_application_id',
        'user_id',
        'level',
        'sequence',
        'status',
        'comments',
        'approved_at',
        'approver_signature',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
    ];

    public function loanApplication(): BelongsTo
    {
        return $this->belongsTo(LoanApplication::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isCurrentPending(): bool
    {
        $previousApprovals = self::where('loan_application_id', $this->loan_application_id)
            ->where('sequence', '<', $this->sequence)
            ->get();

        // Treat both 'approved' and 'rejected' as a completed (decided) step.
        // This handles the case where an amount-change was rejected and a new one was re-requested —
        // the rejected row sits before the new pending row and must not block it.
        $decidedCount = $previousApprovals->whereIn('status', ['approved', 'rejected'])->count();

        if ($previousApprovals->count() > 0 && $decidedCount !== $previousApprovals->count()) {
            return false;
        }

        return $this->status === 'pending';
    }
}
