<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Http\Request;

class RecentDeletion extends Model
{
    use HasFactory;

    protected $fillable = [
        'deletable_type',
        'deletable_id',
        'application_no',
        'applicant_name',
        'applicant_phone',
        'branch_id',
        'branch_name',
        'branch_code',
        'samity_name',
        'amount',
        'status_at_deletion',
        'deleted_by_user_id',
        'deleted_by_name',
        'deleted_by_username',
        'deleted_by_role',
        'ip_address',
        'user_agent',
        'deleted_data',
        'deleted_at',
    ];

    protected $casts = [
        'deleted_data' => 'array',
        'deleted_at' => 'datetime',
        'amount' => 'decimal:2',
    ];

    public function deletedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deleted_by_user_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Record Member Admission deletion
     */
    public static function recordAdmissionDeletion(MemberAdmission $admission, ?User $user, ?Request $request = null): self
    {
        $admission->loadMissing(['branch', 'samity', 'memberCategory', 'loanApplications']);

        $name = $admission->applicant_name_bn ?: $admission->applicant_name_en;

        return self::create([
            'deletable_type' => 'member_admission',
            'deletable_id' => $admission->id,
            'application_no' => (string) ($admission->application_no ?? 'N/A'),
            'applicant_name' => (string) ($name ?: 'Unnamed Member'),
            'applicant_phone' => $admission->mobile_number,
            'branch_id' => $admission->branch_id,
            'branch_name' => $admission->branch?->name,
            'branch_code' => $admission->branch?->branch_code,
            'samity_name' => $admission->samity?->name,
            'amount' => null,
            'status_at_deletion' => $admission->status,
            'deleted_by_user_id' => $user?->id,
            'deleted_by_name' => $user?->name ?? 'System',
            'deleted_by_username' => $user?->username ?: $user?->pin,
            'deleted_by_role' => $user?->role?->name ?? (string) $user?->role,
            'ip_address' => $request?->ip(),
            'user_agent' => $request ? substr((string) $request->userAgent(), 0, 255) : null,
            'deleted_data' => [
                'admission' => $admission->toArray(),
                'loan_applications_count' => $admission->loanApplications->count(),
                'loan_applications' => $admission->loanApplications->map(fn ($l) => [
                    'id' => $l->id,
                    'application_no' => $l->application_no,
                    'amount' => $l->requested_amount ?? $l->approved_amount,
                    'status' => $l->status,
                ])->toArray(),
            ],
            'deleted_at' => now(),
        ]);
    }

    /**
     * Record Loan Application deletion
     */
    public static function recordLoanDeletion(LoanApplication $loan, ?User $user, ?Request $request = null): self
    {
        $loan->loadMissing(['memberAdmission.branch', 'memberAdmission.samity', 'branch', 'samity', 'loanProduct', 'loanCategory']);

        $member = $loan->memberAdmission;
        $appNo = $member?->application_no ?: ($loan->application_no ?: 'N/A');
        $name = $member?->applicant_name_bn ?: ($member?->applicant_name_en ?: ($loan->applicant_name ?: 'Unnamed Applicant'));
        $phone = $member?->mobile_number ?: ($loan->mobile_number ?? null);
        $branch = $loan->branch ?: $member?->branch;
        $samity = $loan->samity ?: $member?->samity;
        $amount = $loan->requested_amount ?: $loan->approved_amount;

        return self::create([
            'deletable_type' => 'loan_application',
            'deletable_id' => $loan->id,
            'application_no' => (string) $appNo,
            'applicant_name' => (string) $name,
            'applicant_phone' => $phone,
            'branch_id' => $loan->branch_id ?: $branch?->id,
            'branch_name' => $branch?->name,
            'branch_code' => $branch?->branch_code,
            'samity_name' => $samity?->name,
            'amount' => $amount,
            'status_at_deletion' => $loan->status,
            'deleted_by_user_id' => $user?->id,
            'deleted_by_name' => $user?->name ?? 'System',
            'deleted_by_username' => $user?->username ?: $user?->pin,
            'deleted_by_role' => $user?->role?->name ?? (string) $user?->role,
            'ip_address' => $request?->ip(),
            'user_agent' => $request ? substr((string) $request->userAgent(), 0, 255) : null,
            'deleted_data' => [
                'loan_application' => $loan->toArray(),
                'product_name' => $loan->loanProduct?->product_name,
                'category_name' => $loan->loanCategory?->category_name,
            ],
            'deleted_at' => now(),
        ]);
    }

    /**
     * Scope to last 7 days by default
     */
    public function scopeLast7Days(Builder $query): Builder
    {
        return $query->where('deleted_at', '>=', Carbon::now()->subDays(7)->startOfDay());
    }

    /**
     * Scope to accessible branches based on user
     */
    public function scopeAccessibleTo(Builder $query, User $user): Builder
    {
        if ($user->has_all_access || $user->isSuperAdmin() || $user->isHeadOffice()) {
            return $query;
        }

        $accessibleBranchIds = $user->getAccessibleBranches()->pluck('id')->toArray();

        return $query->whereIn('branch_id', $accessibleBranchIds);
    }
}
