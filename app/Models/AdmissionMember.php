<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AdmissionMember extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'member_admission_id',
        'branch_name',
        'officer_name',
        'component_name',
        'society_name',
        'member_name',
        'mobile',
        'nid_front_image',
        'nid_back_image',
        'residential_property',
        'cultivable_land',
        'total_land',
        'cattle_count',
        'goat_count',
        'poultry_count',
        'fixed_movable_assets_value',
        'earning_person_occupation',
        'family_monthly_income',
        'guarantor_name',
        'guarantor_relation',
        'remarks',
        'status',
        'rejection_reason',
        'excel_row_number',
        'head_office_reviewed_at',
        'head_office_reviewed_by',
        'head_office_remarks',
        'head_office_decision',
        'branch_feedback_at',
        'branch_correction_remarks',
    ];

    protected $casts = [
        'residential_property' => 'decimal:2',
        'cultivable_land' => 'decimal:2',
        'total_land' => 'decimal:2',
        'fixed_movable_assets_value' => 'decimal:2',
        'family_monthly_income' => 'decimal:2',
        'head_office_reviewed_at' => 'datetime',
        'branch_feedback_at' => 'datetime',
    ];

    public function memberAdmission(): BelongsTo
    {
        return $this->belongsTo(MemberAdmission::class);
    }

    public function issues(): HasMany
    {
        return $this->hasMany(ApplicationIssue::class, 'member_id', 'id')
            ->where('application_type', 'admission');
    }

    public function hasNidUploaded(): bool
    {
        return !empty($this->nid_front_image) && !empty($this->nid_back_image);
    }

    public function scopeStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function headOfficeReviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'head_office_reviewed_by');
    }

    public function markHeadOfficeReviewed($userId, $decision, $remarks = null)
    {
        $this->update([
            'head_office_reviewed_at' => now(),
            'head_office_reviewed_by' => $userId,
            'head_office_decision' => $decision,
            'head_office_remarks' => $remarks,
        ]);
    }

    public function markBranchFeedback($remarks)
    {
        $this->update([
            'branch_feedback_at' => now(),
            'branch_correction_remarks' => $remarks,
        ]);
    }

    public function getHeadOfficeStatusLabel(): string
    {
        return match($this->head_office_decision) {
            'approved' => 'অনুমোদিত',
            'rejected' => 'প্রত্যাখ্যাত',
            'needs_correction' => 'সংশোধন প্রয়োজন',
            default => 'পেন্ডিং',
        };
    }
}
