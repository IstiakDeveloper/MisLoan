<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class LoanApplication extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'application_no',
        'branch_id',
        'submitted_by',
        'excel_file_path',
        'excel_file_name',
        'total_members',
        'status',
        'submitted_at',
        'reviewed_at',
        'reviewed_by',
        'head_office_remarks',
        'branch_remarks',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
    ];

    const STATUS_PENDING = 'pending';
    const STATUS_UNDER_REVIEW = 'under_review';
    const STATUS_APPROVED = 'approved';
    const STATUS_REJECTED = 'rejected';
    const STATUS_NEEDS_CORRECTION = 'needs_correction';

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function loanMembers(): HasMany
    {
        return $this->hasMany(LoanMember::class);
    }

    public function approvedMembers(): HasMany
    {
        return $this->loanMembers()->where('status', 'approved');
    }

    public function rejectedMembers(): HasMany
    {
        return $this->loanMembers()->where('status', 'rejected');
    }

    public function pendingMembers(): HasMany
    {
        return $this->loanMembers()->where('status', 'pending');
    }

    public function history(): MorphMany
    {
        return $this->morphMany(ApplicationHistory::class, 'application');
    }

    public function notifications(): MorphMany
    {
        return $this->morphMany(Notification::class, 'notifiable');
    }

    public function comments(): MorphMany
    {
        return $this->morphMany(Comment::class, 'commentable');
    }

    public static function generateApplicationNo(): string
    {
        $prefix = 'LA';
        $year = date('Y');
        $month = date('m');
        $lastApplication = self::whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->orderBy('id', 'desc')
            ->first();

        $sequence = $lastApplication ? (int)substr($lastApplication->application_no, -5) + 1 : 1;

        return sprintf('%s%s%s%05d', $prefix, $year, $month, $sequence);
    }

    public function scopeStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    public function scopeForBranch($query, int $branchId)
    {
        return $query->where('branch_id', $branchId);
    }
}
