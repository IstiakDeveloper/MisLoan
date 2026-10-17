<?php

namespace App\Services;

use App\Models\LoanApplication;
use App\Models\MemberAdmission;
use App\Models\Samity;
use App\Models\SavingsApplication;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class MemberSamityService
{
    /**
     * Admission statuses still at the branch, before Head Office send.
     *
     * @var list<string>
     */
    public const ADMISSION_STATUSES = [
        'draft',
        'submitted',
        'under_review',
        'needs_revision',
        'ready_for_head_office',
    ];

    /**
     * Loan statuses still at the branch, before Head Office send.
     *
     * @var list<string>
     */
    public const LOAN_STATUSES = [
        LoanApplication::STATUS_DRAFT,
        LoanApplication::STATUS_PENDING,
        LoanApplication::STATUS_SUBMITTED,
        LoanApplication::STATUS_UNDER_REVIEW,
        LoanApplication::STATUS_NEEDS_CORRECTION,
        LoanApplication::STATUS_READY_FOR_HEAD_OFFICE,
    ];

    public function __construct(private MemberAdmissionLoanSyncService $loanSync) {}

    public function admissionCanBeUpdated(MemberAdmission $member): bool
    {
        return in_array((string) $member->status, self::ADMISSION_STATUSES, true);
    }

    public function loanCanBeUpdated(LoanApplication $loan): bool
    {
        return in_array((string) $loan->status, self::LOAN_STATUSES, true);
    }

    /**
     * Active samities of one branch, for the change modal.
     *
     * @return Collection<int, Samity>
     */
    public function optionsForBranch(int $branchId): Collection
    {
        return Samity::query()
            ->where('branch_id', $branchId)
            ->active()
            ->orderBy('samity_name')
            ->get(['id', 'samity_code', 'samity_name', 'samity_name_bn']);
    }

    /**
     * Move this admission onto a samity in the same branch, then refresh open loans and savings.
     *
     * @return array{ok: true, samity_id: int, samity_name: string}|array{ok: false, field: string, message: string}
     */
    public function assign(MemberAdmission $member, mixed $samityId): array
    {
        $samity = Samity::query()->find($samityId);

        if (! $samity || ! $samity->is_active) {
            return [
                'ok' => false,
                'field' => 'samity_id',
                'message' => 'নির্বাচিত সমিতি সক্রিয় নয়।',
            ];
        }

        if ((int) $samity->branch_id !== (int) $member->branch_id) {
            return [
                'ok' => false,
                'field' => 'samity_id',
                'message' => 'সমিতি এই সদস্যের শাখার হতে হবে।',
            ];
        }

        DB::transaction(function () use ($member, $samity): void {
            if ((int) $member->samity_id !== (int) $samity->id) {
                $member->samity_id = $samity->id;
                $member->save();
            }

            $member->setRelation('samity', $samity);
            $this->loanSync->syncBoundLoans($member);
            $this->syncInProgressSavings($member, $samity);
        });

        return [
            'ok' => true,
            'samity_id' => (int) $samity->id,
            'samity_name' => $samity->samity_name_bn ?: $samity->samity_name,
        ];
    }

    private function syncInProgressSavings(MemberAdmission $member, Samity $samity): void
    {
        if (! Schema::hasTable('savings_applications')) {
            return;
        }

        SavingsApplication::query()
            ->where('member_admission_id', $member->id)
            ->whereIn('status', [
                SavingsApplication::STATUS_DRAFT,
                SavingsApplication::STATUS_SUBMITTED,
                SavingsApplication::STATUS_UNDER_REVIEW,
            ])
            ->update(['samity_id' => $samity->id]);
    }
}
