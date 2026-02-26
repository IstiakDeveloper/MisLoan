<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MemberAdmissionApproval extends Model
{
    use HasFactory;

    protected $fillable = [
        'member_admission_id',
        'user_id',
        'level',
        'sequence',
        'status',
        'comments',
        'approved_at',
        'approver_signature',
        'approver_pin',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
    ];

    public function memberAdmission(): BelongsTo
    {
        return $this->belongsTo(MemberAdmission::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if this approval is the current pending one in sequence
     */
    public function isCurrentPending(): bool
    {
        // Get all previous approvals in sequence
        $previousApprovals = self::where('member_admission_id', $this->member_admission_id)
            ->where('sequence', '<', $this->sequence)
            ->get();

        // All previous must be approved
        if ($previousApprovals->count() > 0 && $previousApprovals->where('status', 'approved')->count() !== $previousApprovals->count()) {
            return false;
        }

        // This must be pending
        return $this->status === 'pending';
    }
}
