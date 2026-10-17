<?php

namespace App\Models;

use App\Services\ApprovalService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

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
        'pending_approved_amount',
        'amount_change_requested_by',
        'amount_change_requested_at',
        'cancellation_reason',
        'cancellation_requested_by',
        'cancellation_requested_at',
        'cancellation_from_status',
        'disbursed_amount',
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
        'printed_at',
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
        'repaid_by',
        'repaid_at',
        'repayment_notes',
        'awaiting_takeup_by',
        'awaiting_takeup_at',
        'awaiting_note',
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
        'pending_approved_amount' => 'decimal:2',
        'disbursed_amount' => 'decimal:2',
        'installment_amount' => 'decimal:2',
        'number_of_installments' => 'integer',
        'loan_term_months' => 'integer',
        'proposed_start_date' => 'date:Y-m-d',
        'approved_start_date' => 'date:Y-m-d',
        'expected_end_date' => 'date:Y-m-d',
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
        'amount_change_requested_at' => 'datetime',
        'cancellation_requested_at' => 'datetime',
        'disbursed_at' => 'datetime',
        'repaid_at' => 'datetime',
        'awaiting_takeup_at' => 'datetime',
        'printed_at' => 'datetime',
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
        if (! $snap || ! is_array($snap)) {
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

    const STATUS_READY_FOR_HEAD_OFFICE = 'ready_for_head_office';

    const STATUS_PENDING_HEAD_OFFICE = 'pending_head_office';

    const STATUS_APPROVED = 'approved';

    const STATUS_PENDING_DISBURSEMENT = 'pending_disbursement';

    const STATUS_AWAITING_TAKEUP = 'awaiting_takeup';

    const STATUS_PENDING_CANCELLATION = 'pending_cancellation';

    const FILTER_HO_PENDING_CANCELLATION = 'ho_pending_cancellation';

    const STATUS_PENDING_AMOUNT_APPROVAL = 'pending_amount_approval';

    const STATUS_REJECTED = 'rejected';

    const STATUS_DISBURSED = 'disbursed';

    const STATUS_REPAID = 'repaid';

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

    public function repaidBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'repaid_by');
    }

    public function awaitingTakeupBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'awaiting_takeup_by');
    }

    public function amountChangeRequestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'amount_change_requested_by');
    }

    public function cancellationRequestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancellation_requested_by');
    }

    public function hasPendingAmountChange(): bool
    {
        return $this->status === self::STATUS_PENDING_AMOUNT_APPROVAL
            && $this->pending_approved_amount !== null;
    }

    public function hasPendingCancellation(): bool
    {
        return $this->status === self::STATUS_PENDING_CANCELLATION;
    }

    public function canRequestCancellation(): bool
    {
        return in_array($this->status, [self::STATUS_AWAITING_TAKEUP, self::STATUS_PENDING_HEAD_OFFICE], true)
            && ! $this->hasPendingCancellation();
    }

    public function isHoPendingCancellation(): bool
    {
        return $this->hasPendingCancellation()
            && $this->cancellation_from_status === self::STATUS_PENDING_HEAD_OFFICE;
    }

    public function canRequestApprovedAmountChange(): bool
    {
        return in_array($this->status, [self::STATUS_PENDING_DISBURSEMENT, self::STATUS_APPROVED], true)
            && ! $this->hasPendingAmountChange();
    }

    /**
     * Member code from the linked admission (or legacy snapshot), not the loan application_no.
     */
    public function memberCode(): ?string
    {
        $fromMember = trim((string) ($this->memberAdmission?->application_no ?? ''));
        if ($fromMember !== '') {
            return $fromMember;
        }

        $snapshot = $this->legacy_member_snapshot;
        if (is_array($snapshot)) {
            $fromSnapshot = trim((string) ($snapshot['application_no'] ?? ''));
            if ($fromSnapshot !== '') {
                return $fromSnapshot;
            }
        }

        return null;
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
        $prefix = 'LN'.date('Y').date('m');

        // Soft-deleted rows still occupy unique application_no — include them
        $lastApplication = self::withTrashed()
            ->where('application_no', 'like', $prefix.'%')
            ->orderByDesc('application_no')
            ->first();

        $sequence = 1;
        if ($lastApplication && preg_match('/(\d{5})$/', (string) $lastApplication->application_no, $matches)) {
            $sequence = (int) $matches[1] + 1;
        }

        // Guarantee uniqueness even if gaps/races exist
        for ($i = 0; $i < 10000; $i++) {
            $candidate = sprintf('%s%05d', $prefix, $sequence + $i);
            if (! self::withTrashed()->where('application_no', $candidate)->exists()) {
                return $candidate;
            }
        }

        throw new \RuntimeException('Unable to generate a unique loan application number.');
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
        return ($this->status === self::STATUS_PENDING_DISBURSEMENT
            || $this->status === self::STATUS_APPROVED)
            && ! $this->hasPendingAmountChange();
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

    /**
     * Tracking state for list view: কার কাছে পেন্ডিং / কোন অবস্থায় আছে
     *
     * @return array{label: string, pending_with_name: ?string}
     */
    public function getTrackingState(): array
    {
        $status = $this->status;

        if (in_array($status, [self::STATUS_DRAFT, self::STATUS_REJECTED, self::STATUS_CANCELLED], true)) {
            return ['label' => '—', 'pending_with_name' => null];
        }

        if ($status === self::STATUS_DISBURSED) {
            return ['label' => 'বিতরণকৃত', 'pending_with_name' => null];
        }

        if ($status === self::STATUS_APPROVED) {
            return ['label' => 'অনুমোদিত', 'pending_with_name' => null];
        }

        if ($status === self::STATUS_PENDING_AMOUNT_APPROVAL) {
            $approverName = $this->getCurrentPendingApprovalForTracking()?->user?->name;

            return ['label' => 'পরিমাণ পরিবর্তনের অনুমোদন অপেক্ষা', 'pending_with_name' => $approverName];
        }

        if ($status === self::STATUS_PENDING_DISBURSEMENT) {
            return ['label' => 'বিতরণের জন্য অপেক্ষা (শাখা)', 'pending_with_name' => null];
        }

        if ($status === self::STATUS_AWAITING_TAKEUP) {
            return ['label' => 'পরে নেবে (শাখা কিউ)', 'pending_with_name' => null];
        }

        if ($status === self::STATUS_PENDING_CANCELLATION) {
            $approverName = $this->getCurrentPendingApprovalForTracking()?->user?->name;
            $label = $this->isHoPendingCancellation()
                ? 'হেড অফিস পেন্ডিং — বাতিলের জন্য জমা'
                : 'বাতিল অনুমোদন অপেক্ষা';

            return ['label' => $label, 'pending_with_name' => $approverName];
        }

        if ($status === self::STATUS_NEEDS_CORRECTION) {
            return ['label' => 'সংশোধনের জন্য ফেরত', 'pending_with_name' => null];
        }

        if ($status === self::STATUS_PENDING_HEAD_OFFICE) {
            return ['label' => 'হেড অফিসে', 'pending_with_name' => null];
        }

        if ($status === self::STATUS_READY_FOR_HEAD_OFFICE) {
            return ['label' => 'শাখা অনুমোদিত (হেড অফিসে পাঠানোর অপেক্ষা)', 'pending_with_name' => null];
        }

        $current = $this->getCurrentPendingApprovalForTracking();
        if (! $current) {
            if ($status === self::STATUS_SUBMITTED) {
                return ['label' => 'শাখা ব্যবস্থাপকের কাছে', 'pending_with_name' => null];
            }
            if ($status === self::STATUS_UNDER_REVIEW) {
                return ['label' => 'পর্যালোচনায়', 'pending_with_name' => null];
            }

            return ['label' => '—', 'pending_with_name' => null];
        }

        $level = $current->level;
        $name = $current->relationLoaded('user') ? ($current->user->name ?? null) : null;
        if ($name === null && $current->user_id) {
            $name = $current->user->name ?? null;
        }

        $levelLabels = [
            'branch' => 'শাখা ব্যবস্থাপকের কাছে',
            'area' => 'অঞ্চল ব্যবস্থাপকের কাছে',
            'zone' => 'জোন ব্যবস্থাপকের কাছে',
            'escalation' => 'অনুমোদকের কাছে',
            'head_office' => 'হেড অফিসে',
        ];
        $label = $levelLabels[$level] ?? 'পর্যালোচনায়';
        if ($name && $level !== 'branch') {
            $label .= ' ('.$name.')';
        }

        return ['label' => $label, 'pending_with_name' => $name];
    }

    protected function getCurrentPendingApprovalForTracking(): ?LoanApplicationApproval
    {
        if ($this->relationLoaded('approvals')) {
            $pending = $this->approvals->where('status', 'pending')->sortBy('sequence');
            foreach ($pending as $p) {
                $previous = $this->approvals->where('sequence', '<', $p->sequence);
                if ($previous->every(fn ($a) => in_array($a->status, ['approved', 'rejected'], true))) {
                    return $p;
                }
            }

            return null;
        }

        $pending = $this->approvals()->where('status', 'pending')->orderBy('sequence')->get();
        foreach ($pending as $p) {
            $previous = $this->approvals()->where('sequence', '<', $p->sequence)->get();
            if ($previous->every(fn ($a) => in_array($a->status, ['approved', 'rejected'], true))) {
                return $p;
            }
        }

        return null;
    }

    /**
     * Copy approval / disbursement / repayment dates into the 4-page form JSON
     * (and Agrosor Profile aliases) when that form already has saved data.
     *
     * @param  array<string, mixed>  $businessPlan
     * @return array<string, mixed>
     */
    public function mergeOfficialDatesIntoBusinessPlan(
        array $businessPlan,
        ?string $approvalDate = null,
        ?string $disbursementDate = null,
    ): array {
        if ($businessPlan === []) {
            return $businessPlan;
        }

        if ($approvalDate) {
            $businessPlan['loan_approval_date'] = $approvalDate;
        }

        if ($disbursementDate) {
            $this->loadMissing('loanProduct');
            $businessPlan['loan_disbursement_date'] = $disbursementDate;
            $businessPlan['disbursement_date'] = $disbursementDate;

            $repay = $this->repaymentDateFrom($disbursementDate);
            if ($repay) {
                $businessPlan['loan_repayment_date'] = $repay;
                $businessPlan['repayment_date'] = $repay;
            }
        }

        return $businessPlan;
    }

    /**
     * Write the chosen disbursement date onto every saved form that stores a distribution date.
     *
     * @param  array<string, mixed>  $agreementData
     * @param  array<string, mixed>  $guarantorInfo
     * @param  array<string, mixed>  $nomineeInfo
     * @param  array<string, mixed>  $assetInfo
     * @param  array<string, mixed>  $businessPlan
     * @return array{
     *     loan_agreement_data: array<string, mixed>,
     *     guarantor_info: array<string, mixed>,
     *     nominee_info: array<string, mixed>,
     *     asset_info: array<string, mixed>,
     *     business_plan: array<string, mixed>
     * }
     */
    public function stampDisbursementDateOnForms(
        string $disbursementDate,
        array $agreementData,
        array $guarantorInfo,
        array $nomineeInfo,
        array $assetInfo,
        array $businessPlan,
        ?string $approvalDate = null,
    ): array {
        if ($agreementData !== []) {
            $agreementData['disbursement_date'] = $disbursementDate;
            $agreementData['last_installment_date'] = $this->lastInstallmentDateFrom($disbursementDate);
        }

        if ($guarantorInfo !== []) {
            $guarantorInfo['loan_date'] = $disbursementDate;
        }

        if ($nomineeInfo !== []) {
            $nomineeInfo['loan_sanction_date'] = $disbursementDate;
        }

        if ($assetInfo !== []) {
            $assetInfo['loan_disbursement_date'] = $disbursementDate;
        }

        return [
            'loan_agreement_data' => $agreementData,
            'guarantor_info' => $guarantorInfo,
            'nominee_info' => $nomineeInfo,
            'asset_info' => $assetInfo,
            'business_plan' => $this->mergeOfficialDatesIntoBusinessPlan(
                $businessPlan,
                $approvalDate,
                $disbursementDate,
            ),
        ];
    }

    /**
     * Last installment date printed on the loan agreement.
     * Always one day before the disbursement anniversary.
     */
    public function lastInstallmentDateFrom(string $disbursementDate): string
    {
        return $this->tenureEndDate($disbursementDate);
    }

    /**
     * Repayment date stored on the approval / Agrosor form.
     * Same day as the last installment: tenure anniversary minus one day.
     */
    public function repaymentDateFrom(string $disbursementDate): string
    {
        return $this->tenureEndDate($disbursementDate);
    }

    /**
     * 17/10/2026 disbursed for 12 months ends on 16/10/2027.
     */
    private function tenureEndDate(string $disbursementDate): string
    {
        return Carbon::parse($disbursementDate)
            ->startOfDay()
            ->addMonthsNoOverflow($this->disbursementDurationMonths())
            ->subDay()
            ->toDateString();
    }

    private function disbursementDurationMonths(): int
    {
        $this->loadMissing('loanProduct');
        $duration = (int) ($this->loan_term_months ?: $this->loanProduct?->duration_months ?: 12);

        return $duration > 0 ? $duration : 12;
    }

    protected static function booted(): void
    {
        static::updated(function (LoanApplication $loan) {
            if ($loan->wasChanged(['requested_amount', 'approved_amount', 'loan_product_id', 'loan_term_months'])) {
                try {
                    if (Schema::hasTable('team_based_approvals')) {
                        app(ApprovalService::class)->syncTeamBasedApprovalForLoan($loan);
                    }
                } catch (\Throwable $e) {
                    Log::warning('Failed to sync team-based approval for loan '.$loan->id.': '.$e->getMessage());
                }
            }
        });

        static::deleting(function (LoanApplication $loan) {
            try {
                if (Schema::hasTable('team_based_approvals')) {
                    app(ApprovalService::class)->deleteTeamBasedApprovalForLoan($loan);
                }
            } catch (\Throwable $e) {
                Log::warning('Failed to delete team-based approval for loan '.$loan->id.': '.$e->getMessage());
            }
        });
    }

    public function isAmountApproved(): bool
    {
        return $this->approved_amount !== null && (float) $this->approved_amount > 0;
    }
}
