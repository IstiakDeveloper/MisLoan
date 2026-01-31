<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ApplicationIssue extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'application_type',
        'application_id',
        'member_id',
        'issue_type',
        'issue_description',
        'severity',
        'status',
        'created_by',
        'resolved_by',
        'resolved_at',
        'messages',
        'resolution_notes',
        'email_sent_to_branch',
        'email_sent_at',
        'email_sent_to_headoffice',
        'headoffice_email_sent_at',
    ];

    protected $casts = [
        'messages' => 'json',
        'email_sent_to_branch' => 'boolean',
        'email_sent_to_headoffice' => 'boolean',
        'resolved_at' => 'datetime',
        'email_sent_at' => 'datetime',
        'headoffice_email_sent_at' => 'datetime',
    ];

    /**
     * Get the creator of this issue
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the resolver of this issue
     */
    public function resolver()
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    /**
     * Get related admission member
     */
    public function admissionMember()
    {
        if ($this->application_type === 'admission') {
            return $this->belongsTo(AdmissionMember::class, 'member_id');
        }
        return null;
    }

    /**
     * Get related loan member
     */
    public function loanMember()
    {
        if ($this->application_type === 'loan') {
            return $this->belongsTo(LoanMember::class, 'member_id');
        }
        return null;
    }

    /**
     * Add a message to the issue
     */
    public function addMessage($user_id, $message, $message_type = 'comment')
    {
        $currentMessages = $this->messages ?? [];

        $currentMessages[] = [
            'user_id' => $user_id,
            'user_name' => auth()->user()?->name ?? 'System',
            'message' => $message,
            'type' => $message_type,
            'created_at' => now()->toIso8601String(),
        ];

        $this->update(['messages' => $currentMessages]);
    }

    /**
     * Mark as resolved
     */
    public function markResolved($resolved_by, $notes = null)
    {
        $this->update([
            'status' => 'resolved',
            'resolved_by' => $resolved_by,
            'resolved_at' => now(),
            'resolution_notes' => $notes,
        ]);
    }

    /**
     * Mark as rejected
     */
    public function markRejected($rejected_by, $notes = null)
    {
        $this->update([
            'status' => 'rejected',
            'resolved_by' => $rejected_by,
            'resolved_at' => now(),
            'resolution_notes' => $notes,
        ]);
    }
}
