<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MemberAdmission extends Model
{
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
    ];

    protected $casts = [
        'survey_date' => 'date',
        'admission_date' => 'date',
        'date_of_birth' => 'date',
        'permanent_address_same' => 'boolean',
        'want_sms_service' => 'boolean',
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

    public function assignedOfficer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_officer_id');
    }

    /**
     * Current responsible officer (assigned), falling back to creator for legacy rows.
     */
    public function effectiveOfficerId(): ?int
    {
        $id = $this->assigned_officer_id ?? $this->created_by;

        return $id !== null ? (int) $id : null;
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

    public function canBeEdited(): bool
    {
        return in_array($this->status, ['draft', 'submitted', 'under_review', 'needs_revision', 'rejected']);
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
        if (!$current) {
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
            $label .= ' (' . $name . ')';
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

    // Boot method to generate application number
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($admission) {
            if (empty($admission->application_no)) {
                $admission->application_no = self::generateApplicationNumber();
            }
        });
    }

    /**
     * Generate a simple 5-digit serial application number: 00001, 00002, ...
     * Grows beyond 5 digits when needed (100000, 100001, ...).
     */
    public static function generateApplicationNumber(): string
    {
        $lastAdmission = self::whereRaw("application_no REGEXP '^[0-9]+$'")
            ->orderByRaw('CAST(application_no AS UNSIGNED) DESC')
            ->first();

        $next = $lastAdmission ? (int) $lastAdmission->application_no + 1 : 1;

        return str_pad((string) $next, 5, '0', STR_PAD_LEFT);
    }
}
