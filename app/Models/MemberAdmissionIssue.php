<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MemberAdmissionIssue extends Model
{
    protected $fillable = [
        'member_admission_id',
        'reported_by',
        'issue_description',
        'status',
        'resolution_note',
        'resolved_at',
        'resolved_by',
        'zm_approved_at',
        'zm_approved_by',
        'zm_approval_note',
    ];

    protected $casts = [
        'resolved_at' => 'datetime',
        'zm_approved_at' => 'datetime',
    ];

    public function memberAdmission(): BelongsTo
    {
        return $this->belongsTo(MemberAdmission::class);
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    public function zmApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'zm_approved_by');
    }
}
