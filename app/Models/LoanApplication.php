<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LoanApplication extends Model
{
    use SoftDeletes;
    protected $fillable = [
        'application_no',
        'member_admission_id',
        'loan_product_id',
        'loan_category_id',
        'branch_id',
        'samity_id',
        'form_type',
        'requested_amount',
        'approved_amount',
        'installment_amount',
        'number_of_installments',
        'proposed_start_date',
        'approved_start_date',
        'expected_end_date',
        'purpose_of_loan',
        'loan_usage_plan',
        'loan_usage_breakdown',
        'business_plan',
        'business_type',
        'business_description',
        'business_capital',
        'business_income',
        'repayment_source',
        'repayment_frequency',
        'loan_term_months',
        'guarantor_info',
        'guarantors_list',
        'family_members',
        'nominee_info',
        'monthly_income',
        'monthly_income_breakdown',
        'monthly_expense',
        'monthly_expense_breakdown',
        'income_sources',
        'other_loan_amount',
        'collateral_info',
        'asset_info',
        'asset_details',
        'liability_details',
        'applicant_education',
        'spouse_education',
        'employment_details',
        'risk_measures',
        'has_savings_account',
        'savings_amount',
        'savings_account_type',
        'signatures',
        'conditions_met',
        'documents_submitted',
        'officer_recommendation',
        'manager_recommendation',
        'committee_recommendation',
        'applicant_photo',
        'guarantor_photo',
        'excel_file_path',
        'excel_file_name',
        'total_members',
        'status',
        'submitted_by',
        'submitted_at',
        'reviewed_by',
        'reviewed_at',
        'rejection_reason',
        'remarks',
        'head_office_remarks',
        'branch_remarks',
        'disbursed_by',
        'disbursed_at',
        'disbursement_method',
        'disbursement_reference',
        'officer_reviewed_at',
        'manager_reviewed_at',
        'committee_reviewed_at',
        'loan_agreement_data',
        'selected_approvers',
        'legacy_application_key',
        'legacy_member_snapshot',
    ];

    protected $casts = [
        'requested_amount' => 'decimal:2',
        'approved_amount' => 'decimal:2',
        'installment_amount' => 'decimal:2',
        'number_of_installments' => 'integer',
        'loan_term_months' => 'integer',
        'proposed_start_date' => 'date',
        'approved_start_date' => 'date',
        'expected_end_date' => 'date',
        'guarantor_info' => 'array',
        'guarantors_list' => 'array',
        'family_members' => 'array',
        'nominee_info' => 'array',
        'income_sources' => 'array',
        'asset_info' => 'array',
        'employment_details' => 'array',
        'loan_usage_breakdown' => 'array',
        'monthly_income' => 'decimal:2',
        'monthly_expense' => 'decimal:2',
        'business_capital' => 'decimal:2',
        'business_income' => 'decimal:2',
        'savings_amount' => 'decimal:2',
        'monthly_income_breakdown' => 'array',
        'monthly_expense_breakdown' => 'array',
        'asset_details' => 'array',
        'liability_details' => 'array',
        'risk_measures' => 'array',
        'signatures' => 'array',
        'conditions_met' => 'array',
        'documents_submitted' => 'array',
        'has_savings_account' => 'boolean',
        'other_loan_amount' => 'decimal:2',
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'disbursed_at' => 'datetime',
        'officer_reviewed_at' => 'datetime',
        'manager_reviewed_at' => 'datetime',
        'committee_reviewed_at' => 'datetime',
        'loan_agreement_data' => 'array',
        'selected_approvers' => 'array',
        'business_plan' => 'array', // JSON column - cast to array for Laravel
        'legacy_member_snapshot' => 'array',
    ];

    protected $appends = ['member_display'];

    /**
     * For show/print: member from memberAdmission or built from legacy_member_snapshot.
     */
    public function getMemberDisplayAttribute(): ?object
    {
        if ($this->member_admission_id) {
            $m = $this->memberAdmission ?? MemberAdmission::with('samity')->find($this->member_admission_id);
            return $m ? (object) $m->toArray() : null;
        }
        $snap = $this->legacy_member_snapshot;
        if (!$snap || !is_array($snap)) {
            return null;
        }
        $samity = $this->samity;
        return (object) array_merge($snap, [
            'id' => null,
            'samity' => $samity ? (object) ['id' => $samity->id, 'samity_name' => $samity->samity_name, 'samity_name_bn' => $samity->samity_name_bn, 'samity_code' => $samity->samity_code] : null,
        ]);
    }

    // Status constants
    const STATUS_DRAFT = 'draft';
    const STATUS_PENDING = 'pending';
    const STATUS_SUBMITTED = 'submitted';
    const STATUS_UNDER_REVIEW = 'under_review';
    const STATUS_PENDING_HEAD_OFFICE = 'pending_head_office';
    const STATUS_APPROVED = 'approved';
    const STATUS_REJECTED = 'rejected';
    const STATUS_DISBURSED = 'disbursed';
    const STATUS_CANCELLED = 'cancelled';
    const STATUS_NEEDS_CORRECTION = 'needs_correction';

    // Relationships
    public function memberAdmission(): BelongsTo
    {
        return $this->belongsTo(MemberAdmission::class);
    }

    public function loanProduct(): BelongsTo
    {
        return $this->belongsTo(LoanProduct::class);
    }

    public function loanCategory(): BelongsTo
    {
        return $this->belongsTo(LoanCategory::class);
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

    public function disbursedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'disbursed_by');
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(LoanApplicationApproval::class)->orderBy('sequence');
    }

    public function issues(): HasMany
    {
        return $this->hasMany(LoanApplicationIssue::class);
    }

    // Helper methods
    public static function generateApplicationNo(): string
    {
        $prefix = 'LN';
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

    public function canBeDisbursed(): bool
    {
        return $this->status === self::STATUS_APPROVED;
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

}
