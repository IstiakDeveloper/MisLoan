<?php

namespace App\Models;

use App\Services\MemberCodeService;
use App\Support\AdmissionFormVisibility;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Schema;

class MemberAdmission extends Model
{
    public const LOAN_HEAD_OFFICE_REQUIRES_APPROVED_ADMISSION = 'সদস্য ভর্তি অনুমোদিত না হওয়া পর্যন্ত এই ঋণ আবেদন Head Office এ পাঠানো যাবে না। আগে ভর্তি অনুমোদন সম্পন্ন করতে হবে।';

    protected $fillable = [
        'application_no',
        'branch_id',
        'samity_id',
        'member_category_id',
        'survey_date',
        'admission_date',

        // Personal Information - English
        'applicant_name_en',
        'father_name_en',
        'mother_name_en',
        'spouse_name_en',

        // Personal Information - Bangla
        'applicant_name_bn',
        'father_name_bn',
        'mother_name_bn',
        'spouse_name_bn',

        // Contact & Status
        'marital_status',
        'mobile_number',
        'alternative_mobile',

        // Present Address
        'present_division',
        'present_district',
        'present_upazila',
        'present_union',
        'present_village_road',
        'present_post_code',

        // Permanent Address
        'permanent_address_same',
        'permanent_division',
        'permanent_district',
        'permanent_upazila',
        'permanent_union',
        'permanent_village_road',
        'permanent_post_code',

        // Identity Information
        'nid_number',
        'smart_card_number',
        'birth_certificate_number',
        'date_of_birth',
        'gender',
        'family_member_mobile',

        // Co-Applicant/Guarantor
        'guarantor_name',
        'guarantor_mobile',
        'tin_number',
        'want_sms_service',

        // Economic Activities
        'business_details',
        'job_details',
        'other_income_details',
        'total_asset_value',
        'house_type',

        // Property Information
        'mud_house_count',
        'tin_house_count',
        'brick_house_count',
        'semi_brick_house_count',

        // Livestock Information
        'cow_buffalo_count',
        'goat_sheep_count',
        'duck_chicken_count',
        'other_livestock',
        'other_livestock_count',

        // Land Information
        'cultivable_land_amount',
        'cultivable_land_value',
        'non_cultivable_land_amount',
        'non_cultivable_land_value',
        'total_land_amount',
        'total_land_value',

        // Financial Information
        'monthly_income',
        'monthly_expense',
        'monthly_savings',

        // Additional Information
        'interviewer_name',
        'employee_name',
        'surveyor_signature_path',
        'surveyor_pin',
        'other_loan_info',
        'requested_loan_amount',
        'project_name',
        'estimated_annual_project_income',
        'collector_comment',
        'applicant_signature',

        // Signatures and Documents
        'applicant_signature_path',
        'customer_photo_path',
        'customer_nid_photo_path',
        'customer_nid_back_photo_path',
        'nid_both_sides',
        'guardian_name',
        'guardian_signature_path',
        'guardian_photo_path',
        'guardian_nid_photo_path',

        // Status & Workflow
        'status',
        'submitted_by',
        'submitted_at',
        'submitted_by_signature_path',
        'submitted_by_pin',
        'reviewed_by',
        'reviewed_at',
        'rejection_reason',
        'selected_approvers',
        'revision_count',
        'revision_comments',
        'returned_at',
        'returned_by',
        'printed_at',
        'created_by',
        'assigned_officer_id',

        // Legacy / old member data entry
        'is_legacy',
        'loan_dofa',
        'previous_admission_id',
    ];

    protected $casts = [
        'previous_admission_id' => 'integer',
        'survey_date' => 'date',
        'admission_date' => 'date',
        'date_of_birth' => 'date',
        'permanent_address_same' => 'boolean',
        'want_sms_service' => 'boolean',
        'nid_both_sides' => 'boolean',
        'is_legacy' => 'boolean',
        'loan_dofa' => 'integer',
        'total_asset_value' => 'decimal:2',
        'mud_house_count' => 'integer',
        'tin_house_count' => 'integer',
        'brick_house_count' => 'integer',
        'semi_brick_house_count' => 'integer',
        'cow_buffalo_count' => 'integer',
        'goat_sheep_count' => 'integer',
        'duck_chicken_count' => 'integer',
        'other_livestock_count' => 'integer',
        'cultivable_land_amount' => 'decimal:2',
        'cultivable_land_value' => 'decimal:2',
        'non_cultivable_land_amount' => 'decimal:2',
        'non_cultivable_land_value' => 'decimal:2',
        'total_land_amount' => 'decimal:2',
        'total_land_value' => 'decimal:2',
        'monthly_income' => 'decimal:2',
        'monthly_expense' => 'decimal:2',
        'monthly_savings' => 'decimal:2',
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'returned_at' => 'datetime',
        'printed_at' => 'datetime',
        'selected_approvers' => 'array',
    ];

    // Relationships
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function samity(): BelongsTo
    {
        return $this->belongsTo(Samity::class);
    }

    public function memberCategory(): BelongsTo
    {
        return $this->belongsTo(MemberCategory::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Who originally created / last owned the record (audit). Visibility is by branch, not this field.
     */
    public function assignedOfficer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_officer_id');
    }

    /**
     * Creator or assigned officer id — used for audit and leftover handover tooling.
     */
    public function effectiveOfficerId(): ?int
    {
        $id = $this->assigned_officer_id ?? $this->created_by;

        return $id !== null ? (int) $id : null;
    }

    /**
     * Members belong to the branch. Any staff of that branch (including a transferred
     * field officer) may work with this admission; assigned_officer_id is audit-only.
     */
    public function isOnAccessibleBranchFor(User $user): bool
    {
        if ($user->has_all_access) {
            return true;
        }

        if ($this->branch_id === null) {
            return false;
        }

        return $user->canAccessBranch((int) $this->branch_id);
    }

    public function isAssignedToUser(User $user): bool
    {
        return $this->effectiveOfficerId() === (int) $user->id;
    }

    /**
     * Scope: members currently assigned to this officer (or created by them if unassigned).
     */
    public function scopeAssignedToOfficer($query, int $userId)
    {
        return $query->where(function ($q) use ($userId) {
            $q->where('assigned_officer_id', $userId)
                ->orWhere(function ($q2) use ($userId) {
                    $q2->whereNull('assigned_officer_id')->where('created_by', $userId);
                });
        });
    }

    /**
     * One row per person on member lists.
     * Cycle-survey clones stay hidden; if two master rows share a member code, keep the oldest.
     */
    public function scopeMasterMembers(Builder $query): Builder
    {
        $table = $query->getModel()->getTable();

        return $query
            ->whereNull("{$table}.previous_admission_id")
            ->where(function (Builder $outer) use ($table) {
                $outer->whereNull("{$table}.application_no")
                    ->orWhere("{$table}.application_no", '')
                    ->orWhereNotExists(function ($sub) use ($table) {
                        $sub->from("{$table} as earlier_member")
                            ->whereColumn('earlier_member.branch_id', "{$table}.branch_id")
                            ->whereColumn('earlier_member.application_no', "{$table}.application_no")
                            ->whereNull('earlier_member.previous_admission_id')
                            ->whereNotNull('earlier_member.application_no')
                            ->where('earlier_member.application_no', '!=', '')
                            ->whereColumn('earlier_member.id', '<', "{$table}.id");
                    });
            });
    }

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function familyMembers(): HasMany
    {
        return $this->hasMany(MemberFamilyMember::class)->orderBy('sl_no');
    }

    public function otherAssets(): HasMany
    {
        return $this->hasMany(MemberOtherAsset::class)->orderBy('sl_no');
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(MemberAdmissionApproval::class)->orderBy('sequence');
    }

    public function issues(): HasMany
    {
        return $this->hasMany(MemberAdmissionIssue::class);
    }

    public function loanApplications(): HasMany
    {
        return $this->hasMany(LoanApplication::class);
    }

    public function previousAdmission(): BelongsTo
    {
        return $this->belongsTo(MemberAdmission::class, 'previous_admission_id');
    }

    public function nextAdmissions(): HasMany
    {
        return $this->hasMany(MemberAdmission::class, 'previous_admission_id');
    }

    /**
     * All admission rows that represent the same person (same member code + branch).
     */
    public function sisterAdmissionQuery(): Builder
    {
        if (empty($this->application_no) || empty($this->branch_id)) {
            return static::query()->whereKey($this->id);
        }

        return static::query()
            ->where('branch_id', $this->branch_id)
            ->where('application_no', $this->application_no);
    }

    /**
     * @return list<int>
     */
    public function sisterAdmissionIds(): array
    {
        return $this->sisterAdmissionQuery()
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /**
     * Finished loans — only repaid unlocks the next দফা via Cycle Hub.
     *
     * @return list<string>
     */
    public static function closedLoanFormStatuses(): array
    {
        return [
            LoanApplication::STATUS_REPAID,
            LoanApplication::STATUS_CANCELLED,
            LoanApplication::STATUS_REJECTED,
        ];
    }

    public function sisterLoanQuery(): Builder
    {
        return LoanApplication::query()->whereIn('member_admission_id', $this->sisterAdmissionIds());
    }

    public function existingLoanForm(): ?LoanApplication
    {
        return $this->sisterLoanQuery()
            ->whereNotIn('status', self::closedLoanFormStatuses())
            ->latest('id')
            ->first();
    }

    public function hasExistingLoanForm(): bool
    {
        return $this->existingLoanForm() !== null;
    }

    public function hasRepaidLoanHistory(): bool
    {
        return $this->sisterLoanQuery()->where('status', LoanApplication::STATUS_REPAID)->exists();
    }

    /**
     * After repayment the next loan must start from Cycle Hub, not ঋণ আবেদন create.
     */
    public function mustUseCycleHubForNextLoan(): bool
    {
        return ! $this->hasExistingLoanForm()
            && $this->hasRepaidLoanHistory()
            && ! $this->previous_admission_id;
    }

    public static function alreadyLoanFormMessage(?LoanApplication $loan = null): string
    {
        $no = $loan?->application_no;
        if ($no) {
            return "Already Loan Form আছে (আবেদন নং: {$no})। একই সদস্যের নতুন ঋণ ফর্ম করা যাবে না। পরিশোধের পর সাইকেল হাব থেকে পরবর্তী দফা করা যাবে।";
        }

        return 'Already Loan Form আছে। একই সদস্যের নতুন ঋণ ফর্ম করা যাবে না। পরিশোধের পর সাইকেল হাব থেকে পরবর্তী দফা করা যাবে।';
    }

    public static function nextLoanViaCycleHubMessage(): string
    {
        return 'এই সদস্যের আগের ঋণ পরিশোধিত। পরবর্তী ঋণ সাইকেল হাব থেকে করতে হবে।';
    }

    /**
     * Cycle survey dossiers for this member (master + later দফা), oldest first.
     *
     * @return list<array{id: int, dofa: int, status: string, survey_date: string|null, admission_date: string|null, is_cycle_survey: bool}>
     */
    public function cycleSurveyList(): array
    {
        return $this->sisterAdmissionQuery()
            ->orderBy('loan_dofa')
            ->orderBy('id')
            ->get(['id', 'loan_dofa', 'status', 'survey_date', 'admission_date', 'previous_admission_id'])
            ->map(fn (self $row) => [
                'id' => (int) $row->id,
                'dofa' => (int) ($row->loan_dofa ?: 1),
                'status' => (string) $row->status,
                'survey_date' => $row->survey_date?->format('Y-m-d'),
                'admission_date' => $row->admission_date?->format('Y-m-d'),
                'is_cycle_survey' => (bool) $row->previous_admission_id,
            ])
            ->values()
            ->all();
    }

    /**
     * The original admission for this member (not a cycle-cloned copy).
     */
    public function canonicalAdmission(): self
    {
        $canonical = $this->sisterAdmissionQuery()
            ->orderByRaw('CASE WHEN previous_admission_id IS NULL THEN 0 ELSE 1 END')
            ->orderBy('id')
            ->first();

        return $canonical ?? $this;
    }

    /**
     * Identity and personal fields that stay the same across loan cycles.
     *
     * @return list<string>
     */
    public static function identitySyncFields(): array
    {
        return [
            'application_no',
            'nid_number',
            'smart_card_number',
            'birth_certificate_number',
            'mobile_number',
            'alternative_mobile',
            'family_member_mobile',
            'applicant_name_en',
            'applicant_name_bn',
            'father_name_en',
            'father_name_bn',
            'mother_name_en',
            'mother_name_bn',
            'spouse_name_en',
            'spouse_name_bn',
            'marital_status',
            'date_of_birth',
            'gender',
            'customer_photo_path',
            'customer_nid_photo_path',
            'customer_nid_back_photo_path',
            'nid_both_sides',
        ];
    }

    /**
     * Copy locked identity fields from the member master onto this cycle survey.
     */
    public function applyLockedIdentityFrom(self $source): void
    {
        foreach (self::identitySyncFields() as $field) {
            if (! Schema::hasColumn($this->getTable(), $field)) {
                continue;
            }

            $this->{$field} = $source->{$field};
        }
    }

    /**
     * Keep Member Code, NID, phone and personal info identical on leftover cycle copies.
     */
    public function syncIdentityToSisterCycles(): void
    {
        $sisterIds = array_values(array_filter(
            $this->sisterAdmissionIds(),
            fn (int $id) => $id !== (int) $this->id
        ));

        if ($sisterIds === []) {
            return;
        }

        $payload = [];
        foreach (self::identitySyncFields() as $field) {
            if (! Schema::hasColumn($this->getTable(), $field)) {
                continue;
            }

            $payload[$field] = $this->{$field};
        }

        if ($payload === []) {
            return;
        }

        static::query()->whereIn('id', $sisterIds)->update($payload);
    }

    /**
     * Raise loan_dofa to match how many loans this member has (never decrease).
     */
    public function refreshCycleDofaFromLoans(): void
    {
        $loanCount = LoanApplication::query()
            ->whereIn('member_admission_id', $this->sisterAdmissionIds())
            ->whereNotIn('status', [
                LoanApplication::STATUS_CANCELLED,
                LoanApplication::STATUS_REJECTED,
            ])
            ->count();

        $canonical = $this->canonicalAdmission();
        $newDofa = max((int) ($canonical->loan_dofa ?: 1), $loanCount);
        $updates = [];

        if ((int) $canonical->loan_dofa !== $newDofa) {
            $updates['loan_dofa'] = $newDofa;
        }

        if ($newDofa > 1 && ! $canonical->is_legacy) {
            $updates['is_legacy'] = true;
        }

        if ($updates !== []) {
            $canonical->update($updates);
        }
    }

    public function currentPendingApproval()
    {
        return $this->approvals()
            ->where('status', 'pending')
            ->whereNotExists(function ($query) {
                $query->selectRaw(1)
                    ->from('member_admission_approvals as prev')
                    ->whereColumn('prev.member_admission_id', 'member_admission_approvals.member_admission_id')
                    ->whereColumn('prev.sequence', '<', 'member_admission_approvals.sequence')
                    ->where('prev.status', '!=', 'approved');
            })
            ->with('user')
            ->first();
    }

    // Scopes
    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    public function scopeSubmitted($query)
    {
        return $query->where('status', 'submitted');
    }

    public function scopeUnderReview($query)
    {
        return $query->where('status', 'under_review');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    // Helper Methods
    public function isDraft(): bool
    {
        return $this->status === 'draft';
    }

    public function isSubmitted(): bool
    {
        return $this->status === 'submitted';
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    public function isRejected(): bool
    {
        return $this->status === 'rejected';
    }

    public function isLegacy(): bool
    {
        return (bool) $this->is_legacy;
    }

    public function isRepeatOrLegacyMember(): bool
    {
        return (bool) ($this->previous_admission_id || (int) $this->loan_dofa > 1 || $this->is_legacy);
    }

    /**
     * Branch may prepare/submit a loan before admission approval, but Head Office
     * send still requires an approved (or already-admitted repeat/legacy) member.
     */
    public function allowsLoanHeadOfficeSend(): bool
    {
        return $this->isApproved() || $this->isRepeatOrLegacyMember();
    }

    public function canBeEdited(): bool
    {
        return in_array($this->status, AdmissionFormVisibility::staffEditableStatuses(), true);
    }

    public function hasDisbursedLoan(): bool
    {
        if (array_key_exists('has_disbursed_loan', $this->attributes)) {
            return (bool) $this->getAttribute('has_disbursed_loan');
        }

        return $this->loanApplications()
            ->where('status', LoanApplication::STATUS_DISBURSED)
            ->exists();
    }

    /**
     * Branch User (accountant) may edit until a loan is disbursed.
     * FO / BM keep the existing draft-to-revision window. HO / SuperAdmin: any status.
     */
    public function canBeEditedBy(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        $user->loadMissing('role');

        $isRenewalOrLegacy = (bool) ($this->previous_admission_id || (int) $this->loan_dofa > 1 || $this->is_legacy);

        return AdmissionFormVisibility::canEditAdmissionForm(
            $user->role?->name,
            (string) $this->status,
            $this->hasDisbursedLoan(),
            (bool) ($user->has_all_access || $user->isSuperAdmin() || $user->isHeadOffice()),
            $isRenewalOrLegacy
        );
    }

    public function getFullNameAttribute(): string
    {
        return $this->applicant_name_en;
    }

    public function getFullNameBnAttribute(): string
    {
        return $this->applicant_name_bn;
    }

    /**
     * Tracking state for branch user: কার কাছে পেন্ডিং / কোন অবস্থায় আছে
     * Returns ['label' => '...', 'pending_with_name' => '...'] for display in list.
     * Uses loaded approvals when present to avoid N+1.
     */
    public function getTrackingState(): array
    {
        $status = $this->status;

        if (in_array($status, ['draft', 'rejected'], true)) {
            return ['label' => '—', 'pending_with_name' => null];
        }

        if ($status === 'approved') {
            return ['label' => 'অনুমোদিত', 'pending_with_name' => null];
        }

        if ($status === 'needs_revision') {
            return ['label' => 'সংশোধনের জন্য ফেরত', 'pending_with_name' => null];
        }

        if ($status === 'pending_head_office') {
            return ['label' => 'হেড অফিসে', 'pending_with_name' => null];
        }
        if ($status === 'ready_for_head_office') {
            return ['label' => 'শাখা অনুমোদিত (Head Office অপেক্ষমান)', 'pending_with_name' => null];
        }

        $current = $this->getCurrentPendingApprovalForTracking();
        if (! $current) {
            if ($status === 'submitted') {
                return ['label' => 'শাখা ব্যবস্থাপকের কাছে', 'pending_with_name' => null];
            }
            if ($status === 'under_review') {
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

    /**
     * Get current pending approval (for tracking). Uses loaded approvals when present.
     */
    protected function getCurrentPendingApprovalForTracking(): ?MemberAdmissionApproval
    {
        if ($this->relationLoaded('approvals')) {
            $pending = $this->approvals->where('status', 'pending')->sortBy('sequence');
            foreach ($pending as $p) {
                $previous = $this->approvals->where('sequence', '<', $p->sequence);
                if ($previous->every(fn ($a) => $a->status === 'approved')) {
                    return $p;
                }
            }

            return null;
        }

        return $this->currentPendingApproval();
    }

    // Boot method to generate and normalize 10-digit application/member number
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($admission) {
            if (empty($admission->application_no)) {
                $admission->application_no = MemberCodeService::generateNextMemberCode($admission->branch_id);
            } else {
                $admission->application_no = MemberCodeService::normalizeMemberCode(
                    $admission->application_no,
                    $admission->branch_id
                );
            }
        });

        static::updating(function ($admission) {
            if ($admission->isDirty('application_no') && ! empty($admission->application_no)) {
                $admission->application_no = MemberCodeService::normalizeMemberCode(
                    $admission->application_no,
                    $admission->branch_id
                );
            }
        });

        static::updated(function (MemberAdmission $admission) {
            if (! $admission->wasChanged('application_no')) {
                return;
            }

            $newCode = trim((string) $admission->application_no);
            if ($newCode === '') {
                return;
            }

            if (! Schema::hasTable('loan_applications')) {
                return;
            }

            $oldCode = $admission->getOriginal('application_no');

            MemberCodeService::syncRelatedRecords(
                (int) $admission->id,
                $newCode,
                is_string($oldCode) ? $oldCode : null,
                $admission->applicant_name_bn ?: $admission->applicant_name_en
            );
        });
    }

    /**
     * Generate 10-digit application/member number (e.g. 0001000001).
     */
    public static function generateApplicationNumber(?int $branchId = null): string
    {
        return MemberCodeService::generateNextMemberCode($branchId);
    }

    /**
     * Digits-only identity (NID / Smart Card). Empty if nothing usable.
     */
    public static function normalizeIdentityNumber(?string $value): string
    {
        return preg_replace('/\D+/', '', MemberCodeService::toEnglishDigits($value)) ?? '';
    }

    /**
     * Normalize BD mobile to 01XXXXXXXXX when possible.
     */
    public static function normalizeMobileNumber(?string $value): string
    {
        $digits = preg_replace('/\D+/', '', MemberCodeService::toEnglishDigits($value)) ?? '';
        if ($digits === '') {
            return '';
        }

        if (str_starts_with($digits, '880') && strlen($digits) >= 13) {
            $digits = substr($digits, 3);
        } elseif (str_starts_with($digits, '88') && strlen($digits) >= 13) {
            $digits = substr($digits, 2);
        }

        if (strlen($digits) === 10 && str_starts_with($digits, '1')) {
            $digits = '0'.$digits;
        }

        return $digits;
    }

    /**
     * SQL expression that turns Bengali digits into English and strips separators.
     */
    public static function englishDigitsSql(string $column): string
    {
        $allowed = ['nid_number', 'smart_card_number', 'mobile_number', 'application_no'];
        if (! in_array($column, $allowed, true)) {
            throw new \InvalidArgumentException("Unsupported column [{$column}] for digit normalization.");
        }

        $expr = "IFNULL({$column}, '')";
        foreach (['০' => '0', '১' => '1', '২' => '2', '৩' => '3', '৪' => '4', '৫' => '5', '৬' => '6', '৭' => '7', '৮' => '8', '৯' => '9'] as $bn => $en) {
            $expr = "REPLACE({$expr}, '{$bn}', '{$en}')";
        }

        return "REPLACE(REPLACE(REPLACE(REPLACE({$expr}, ' ', ''), '-', ''), '/', ''), '.', '')";
    }

    /**
     * Another admission already uses this NID or Smart Card (either field).
     */
    public static function findDuplicateByIdentity(?string $value, ?int $ignoreId = null, ?string $ignoreApplicationNo = null): ?self
    {
        $normalized = self::normalizeIdentityNumber($value);
        if ($normalized === '') {
            return null;
        }

        if (! $ignoreApplicationNo && $ignoreId) {
            $ignoreApplicationNo = static::where('id', $ignoreId)->value('application_no');
        }

        $nidSql = self::englishDigitsSql('nid_number');
        $smartSql = self::englishDigitsSql('smart_card_number');

        return static::query()
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->when(! empty($ignoreApplicationNo), fn ($q) => $q->where('application_no', '!=', $ignoreApplicationNo))
            ->where(function ($q) use ($normalized, $nidSql, $smartSql) {
                $q->whereRaw($nidSql.' = ?', [$normalized])
                    ->orWhereRaw($smartSql.' = ?', [$normalized]);
            })
            ->first();
    }

    /**
     * Another admission already uses this mobile number.
     */
    public static function findDuplicateByMobile(?string $value, ?int $ignoreId = null, ?string $ignoreApplicationNo = null): ?self
    {
        $normalized = self::normalizeMobileNumber($value);
        if ($normalized === '' || strlen($normalized) < 10) {
            return null;
        }

        if (! $ignoreApplicationNo && $ignoreId) {
            $ignoreApplicationNo = static::where('id', $ignoreId)->value('application_no');
        }

        $last10 = substr($normalized, -10);
        $mobileSql = self::englishDigitsSql('mobile_number');

        $matches = static::query()
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->when(! empty($ignoreApplicationNo), fn ($q) => $q->where('application_no', '!=', $ignoreApplicationNo))
            ->whereNotNull('mobile_number')
            ->where('mobile_number', '!=', '')
            ->whereRaw($mobileSql.' LIKE ?', ['%'.$last10])
            ->get();

        return $matches->first(
            fn (self $row) => self::normalizeMobileNumber($row->mobile_number) === $normalized
        );
    }

    /**
     * Another person already uses this member code (including serial variants).
     */
    public static function findDuplicateByMemberCode(?string $value, ?int $ignoreId = null, ?string $ignoreApplicationNo = null, mixed $branchId = null): ?self
    {
        $raw = trim(MemberCodeService::toEnglishDigits($value));
        if ($raw === '') {
            return null;
        }

        if (! $ignoreApplicationNo && $ignoreId) {
            $ignoreApplicationNo = static::where('id', $ignoreId)->value('application_no');
        }

        $branchId = is_numeric($branchId) ? (int) $branchId : null;
        $normalized = MemberCodeService::normalizeMemberCode($raw, $branchId);

        $conflict = MemberCodeService::findConflictingAdmission(
            $normalized,
            $ignoreId ?: 0,
            $branchId
        );

        if (! $conflict) {
            return null;
        }

        if ($ignoreApplicationNo && (string) $conflict->application_no === (string) $ignoreApplicationNo) {
            return null;
        }

        return $conflict;
    }
}
