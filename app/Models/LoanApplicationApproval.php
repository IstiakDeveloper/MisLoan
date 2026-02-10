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

        if ($previousApprovals->count() > 0 && $previousApprovals->where('status', 'approved')->count() !== $previousApprovals->count()) {
            return false;
        }

        return $this->status === 'pending';
    }
}
