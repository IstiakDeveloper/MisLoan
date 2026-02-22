<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SavingsApplication extends Model
{
    protected $fillable = [
        'application_no',
        'member_admission_id',
        'savings_product_id',
        'branch_id',
        'samity_id',
        'deposit_amount',
        'monthly_installment',
        'duration_months',
        'maturity_amount',
        'maturity_date',
        'purpose_of_savings',
        'nominee_info',
        'status',
        'submitted_by',
        'submitted_at',
        'reviewed_by',
        'reviewed_at',
        'rejection_reason',
        'remarks',
        'activated_by',
        'activated_at',
        // Form fields
        'account_opening_date',
        'monthly_savings_amount',
        'term_years',
        'account_no',
        'member_no',
        'applicant_photo',
        'current_address',
        'permanent_address',
        'profession',
        'source_of_income',
        'monthly_deposit_submission_date',
        'applicant_signature',
        'officer_signature',
        'officer_pin',
        'accountant_signature',
        'accountant_pin',
        'branch_manager_signature',
        'branch_manager_pin',
        'form_data',
    ];

    protected $casts = [
        'deposit_amount' => 'decimal:2',
        'monthly_installment' => 'decimal:2',
        'monthly_savings_amount' => 'decimal:2',
        'maturity_amount' => 'decimal:2',
        'maturity_date' => 'date',
        'account_opening_date' => 'date',
        'monthly_deposit_submission_date' => 'date',
        'nominee_info' => 'array',
        'form_data' => 'array',
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'activated_at' => 'datetime',
    ];

    // Status constants
    const STATUS_DRAFT = 'draft';
    const STATUS_SUBMITTED = 'submitted';
    const STATUS_UNDER_REVIEW = 'under_review';
    const STATUS_APPROVED = 'approved';
    const STATUS_REJECTED = 'rejected';
    const STATUS_ACTIVE = 'active';
    const STATUS_MATURED = 'matured';
    const STATUS_CLOSED = 'closed';
    const STATUS_CANCELLED = 'cancelled';

    // Relationships
    public function memberAdmission(): BelongsTo
    {
        return $this->belongsTo(MemberAdmission::class);
    }

    public function savingsProduct(): BelongsTo
    {
        return $this->belongsTo(SavingsProduct::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function samity(): BelongsTo
    {
        return $this->belongsTo(Samity::class);
    }

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function activatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'activated_by');
    }

    // Helper methods
    public static function generateApplicationNo(): string
    {
        $prefix = 'SV';
        $year = date('Y');
        $month = date('m');
        $lastApplication = self::whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->orderBy('id', 'desc')
            ->first();

        $sequence = $lastApplication ? (int)substr($lastApplication->application_no, -5) + 1 : 1;

        return sprintf('%s%s%s%05d', $prefix, $year, $month, $sequence);
    }

    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    public function canBeEdited(): bool
    {
        return in_array($this->status, [self::STATUS_DRAFT, self::STATUS_REJECTED]);
    }

    public function canBeApproved(): bool
    {
        return $this->status === self::STATUS_UNDER_REVIEW;
    }

    public function canBeActivated(): bool
    {
        return $this->status === self::STATUS_APPROVED;
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function hasMatured(): bool
    {
        return $this->maturity_date && now()->gte($this->maturity_date);
    }

    // Scopes
    public function scopeForBranch($query, int $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    public function scopePending($query)
    {
        return $query->whereIn('status', [self::STATUS_SUBMITTED, self::STATUS_UNDER_REVIEW]);
    }

    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    public function scopeMatured($query)
    {
        return $query->where('status', self::STATUS_MATURED);
    }
}
