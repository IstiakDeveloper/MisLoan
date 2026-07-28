<?php

namespace App\Services;

use App\Models\MemberAdmission;
use App\Models\MemberAdmissionApproval;
use App\Models\LoanApplication;
use App\Models\LoanApplicationApproval;
use App\Models\Role;
use App\Models\TeamBasedApproval;
use App\Models\TeamBasedApprovalItem;
use App\Models\TeamBasedApprovalReview;
use App\Models\User;
use App\Support\LoanFormVisibility;
use App\Support\NumberToWordsBangla;
use Illuminate\Support\Facades\DB;

class ApprovalService
{
    /**
     * Create approval workflow when member admission is submitted.
     * Branch user submit goes to branch manager only. Branch manager can then approve or forward to Area/Zone/ADMF/DMF/ED.
     */
    public function createApprovalWorkflow(MemberAdmission $admission): void
    {
        DB::transaction(function () use ($admission) {
            $admission->approvals()->delete();

            $branch = $admission->branch;
            if (!$branch) {
                throw new \Exception('Admission must have a branch.');
            }

            // First step: সব Branch Manager দের কাছে পেন্ডিং — যেকোনো একজন approve বা forward করতে পারবে
            $branchManagers = User::where('branch_id', $branch->id)
                ->where('is_active', 1)
                ->whereHas('role', function ($query) {
                    $query->where('name', 'branch_manager');
                })
                ->get();

            if ($branchManagers->isEmpty()) {
                throw new \Exception('No Branch Manager found for this branch. Please assign a Branch Manager.');
            }

            foreach ($branchManagers as $bm) {
                MemberAdmissionApproval::create([
                    'member_admission_id' => $admission->id,
                    'user_id' => $bm->id,
                    'level' => 'branch',
                    'sequence' => 1,
                    'status' => 'pending',
                ]);
            }
        });
    }

    /**
     * Get list of approvers based on organizational hierarchy
     */
    private function getApproversForAdmission(MemberAdmission $admission): array
    {
        $approvers = [];
        $sequence = 1;

        $branch = $admission->branch;
        if (!$branch) {
            return $approvers;
        }

        // 1. Branch Level Approvers (Branch Managers)
        $branchUsers = User::where('branch_id', $branch->id)
            ->where('is_active', 1)
            ->whereHas('role', function ($query) {
                $query->whereIn('name', ['Branch Manager', 'Branch User']);
            })
            ->get();

        foreach ($branchUsers as $user) {
            $approvers[] = [
                'user_id' => $user->id,
                'level' => 'branch',
                'sequence' => $sequence,
            ];
        }
        $sequence++;

        // 2. Area Level Approvers
        if ($branch->area_id) {
            $areaUsers = User::where('area_id', $branch->area_id)
                ->where('is_active', 1)
                ->whereHas('role', function ($query) {
                    $query->whereIn('name', ['Area Manager', 'Area Supervisor']);
                })
                ->get();

            foreach ($areaUsers as $user) {
                $approvers[] = [
                    'user_id' => $user->id,
                    'level' => 'area',
                    'sequence' => $sequence,
                ];
            }
            $sequence++;
        }

        // 3. Zone Level Approvers
        if ($branch->area && $branch->area->zone_id) {
            $zoneUsers = User::where('zone_id', $branch->area->zone_id)
                ->where('is_active', 1)
                ->whereHas('role', function ($query) {
                    $query->whereIn('name', ['Zone Manager', 'Zone Coordinator']);
                })
                ->get();

            foreach ($zoneUsers as $user) {
                $approvers[] = [
                    'user_id' => $user->id,
                    'level' => 'zone',
                    'sequence' => $sequence,
                ];
            }
            $sequence++;
        }

        // 4. Head Office Approvers
        $headOfficeUsers = User::where('has_all_access', 1)
            ->where('is_active', 1)
            ->whereHas('role', function ($query) {
                $query->whereIn('name', ['Super Admin', 'Admin', 'Head Office']);
            })
            ->get();

        foreach ($headOfficeUsers as $user) {
            $approvers[] = [
                'user_id' => $user->id,
                'level' => 'head_office',
                'sequence' => $sequence,
            ];
        }

        return $approvers;
    }

    /**
     * Approve a member admission
     */
    public function approve(MemberAdmissionApproval $approval, ?string $comments = null): bool
    {
        if ($approval->status !== 'pending') {
            return false;
        }

        // Check if it's the current pending approval in sequence
        if (!$approval->isCurrentPending()) {
            return false;
        }

        // If requested loan amount > 70,000 TK, branch level cannot directly approve without higher approver selection
        if ($approval->level === 'branch' && (float) ($approval->memberAdmission->requested_loan_amount ?? 0) > 70000) {
            throw new \Exception('ঋণ চাহিদা ৭০,০০০ টাকার বেশি হওয়ায় সরাসরি অনুমোদন করা সম্ভব নয়। উচ্চতর অনুমোদনকারী নির্বাচন করে Forward করুন।');
        }

        DB::transaction(function () use ($approval, $comments) {
            $admission = $approval->memberAdmission;
            $approverSignature = $approval->user->signature;
            $approverPin = $approval->user->pin ?? null;

            $approval->update([
                'status' => 'approved',
                'comments' => $comments,
                'approved_at' => now(),
                'approver_signature' => $approverSignature,
                'approver_pin' => $approverPin,
            ]);

            // একই শাখার অন্য Branch Manager দের pending row গুলোও approved করে দিন (যেকোনো একজন approve করলেই ধরা হবে)
            if ($approval->level === 'branch') {
                $admission->approvals()
                    ->where('level', 'branch')
                    ->where('id', '!=', $approval->id)
                    ->where('status', 'pending')
                    ->update([
                        'status' => 'approved',
                        'comments' => 'Approved by another branch manager',
                        'approved_at' => now(),
                    ]);
            }

            $pendingCount = $admission->approvals()->where('status', 'pending')->count();

            if ($pendingCount === 0) {
                // সব লেভেলের অনুমোদন শেষ হলে এখন সরাসরি Head Office এ না গিয়ে
                // শাখা অনুমোদিত অবস্থা থাকবে; ব্রাঞ্চ ইউজার আলাদা করে Head Office এ পাঠাবে
                $admission->update(['status' => 'ready_for_head_office']);
            } else {
                if ($admission->status === 'submitted') {
                    $admission->update(['status' => 'under_review']);
                }
            }
        });

        return true;
    }

    /**
     * Reject a member admission
     */
    public function reject(MemberAdmissionApproval $approval, string $comments): bool
    {
        if ($approval->status !== 'pending') {
            return false;
        }

        if (!$approval->isCurrentPending()) {
            return false;
        }

        DB::transaction(function () use ($approval, $comments) {
            $approval->update([
                'status' => 'rejected',
                'comments' => $comments,
                'approved_at' => now(),
                'approver_signature' => $approval->user->signature ?? null,
                'approver_pin' => $approval->user->pin ?? null,
            ]);

            $approval->memberAdmission->update(['status' => 'rejected']);
        });

        return true;
    }

    /**
     * Get pending approvals for a user (only rows that are "current" in sequence).
     * Includes: (1) current pending in sequence, or (2) under_review admission assigned to this approver (non-branch level).
     */
    public function getPendingApprovalsForUser(User $user)
    {
        $approvals = MemberAdmissionApproval::where('user_id', $user->id)
            ->where('status', 'pending')
            ->whereHas('memberAdmission', function ($query) {
                $query->whereIn('status', ['submitted', 'under_review']);
            })
            ->with(['memberAdmission.branch', 'memberAdmission.samity'])
            ->get();

        return $approvals->filter(function ($approval) {
            // Normal case: this is the current step in sequence
            if ($approval->isCurrentPending()) {
                return true;
            }
            // Under review: admission was forwarded to an approver; show if this row is for this user and not branch level
            $admission = $approval->memberAdmission;
            if ($admission && $admission->status === 'under_review' && $approval->level !== 'branch') {
                return true;
            }
            return false;
        })->values();
    }

    /**
     * Return admission to branch for revision (Head Office only)
     */
    public function returnToBranch(MemberAdmissionApproval $approval, string $comments): bool
    {
        if ($approval->status !== 'pending') {
            return false;
        }

        if ($approval->level !== 'head_office') {
            return false;
        }

        if (!$approval->isCurrentPending()) {
            return false;
        }

        DB::transaction(function () use ($approval, $comments) {
            $admission = $approval->memberAdmission;

            // Mark current approval as returned
            $approval->update([
                'status' => 'returned',
                'comments' => $comments,
                'approved_at' => now(),
            ]);

            // Update admission status and revision info
            $admission->update([
                'status' => 'needs_revision',
                'revision_count' => $admission->revision_count + 1,
                'revision_comments' => $comments,
                'returned_at' => now(),
                'returned_by' => auth()->id(),
            ]);
        });

        return true;
    }

    /**
     * Get available approvers for a branch (for selection during create/edit)
     * Includes: Branch users, Area users, Zone users
     */
    public function getAvailableApprovers(int $branchId)
    {
        $approvers = collect();

        // Get the branch with area and zone relationships
        $branch = \App\Models\Branch::with('area.zone')->find($branchId);

        if (!$branch) {
            return $approvers;
        }

        // 1. Branch Level Users
        $branchUsers = User::where('branch_id', $branchId)
            ->where('is_active', 1)
            ->whereHas('role', function ($query) {
                $query->whereNotIn('name', ['Super Admin', 'Admin', 'Head Office']);
            })
            ->select('id', 'name', 'email', 'role_id', 'branch_id', 'area_id', 'zone_id')
            ->with('role:id,name')
            ->get()
            ->map(function ($user) {
                $user->level = 'Branch';
                return $user;
            });

        $approvers = $approvers->merge($branchUsers);

        // 2. Area Level Users (if branch has area)
        if ($branch->area_id) {
            $areaUsers = User::where('area_id', $branch->area_id)
                ->where('is_active', 1)
                ->whereHas('role', function ($query) {
                    $query->whereNotIn('name', ['Super Admin', 'Admin', 'Head Office']);
                })
                ->select('id', 'name', 'email', 'role_id', 'branch_id', 'area_id', 'zone_id')
                ->with('role:id,name')
                ->get()
                ->map(function ($user) {
                    $user->level = 'Area';
                    return $user;
                });

            $approvers = $approvers->merge($areaUsers);
        }

        // 3. Zone Level Users (if branch's area has zone)
        if ($branch->area && $branch->area->zone_id) {
            $zoneUsers = User::where('zone_id', $branch->area->zone_id)
                ->where('is_active', 1)
                ->whereHas('role', function ($query) {
                    $query->whereNotIn('name', ['Super Admin', 'Admin', 'Head Office']);
                })
                ->select('id', 'name', 'email', 'role_id', 'branch_id', 'area_id', 'zone_id')
                ->with('role:id,name')
                ->get()
                ->map(function ($user) {
                    $user->level = 'Zone';
                    return $user;
                });

            $approvers = $approvers->merge($zoneUsers);
        }

        // Remove duplicates and return
        return $approvers->unique('id')->values();
    }

    /**
     * Get escalation approvers for member admission (Area Manager, Zone Manager, ADMF, DMF, ED).
     * Used when branch manager forwards an admission to a higher-level approver.
     */
    public function getEscalationApprovers(int $branchId)
    {
        $branch = \App\Models\Branch::with('area.zone')->find($branchId);
        if (!$branch) {
            return collect();
        }

        $approvers = collect();

        // Area-level users (Area Manager)
        if ($branch->area_id) {
            $areaUsers = User::where('area_id', $branch->area_id)
                ->where('is_active', 1)
                ->whereHas('role', function ($q) {
                    $q->where('name', 'area_manager');
                })
                ->select('id', 'name', 'email', 'role_id', 'branch_id', 'area_id', 'zone_id')
                ->with('role:id,name')
                ->get()
                ->map(function ($user) {
                    $user->level = 'area';
                    return $user;
                });
            $approvers = $approvers->merge($areaUsers);
        }

        // Zone-level users (Zone Manager)
        if ($branch->area && $branch->area->zone_id) {
            $zoneUsers = User::where('zone_id', $branch->area->zone_id)
                ->where('is_active', 1)
                ->whereHas('role', function ($q) {
                    $q->where('name', 'zone_manager');
                })
                ->select('id', 'name', 'email', 'role_id', 'branch_id', 'area_id', 'zone_id')
                ->with('role:id,name')
                ->get()
                ->map(function ($user) {
                    $user->level = 'zone';
                    return $user;
                });
            $approvers = $approvers->merge($zoneUsers);
        }

        // ADMF, DMF, ED (escalation level) - users who can access this branch
        $escalationUsers = User::getApproversSelectableByBranch($branchId)
            ->map(function ($user) {
                $user->level = 'escalation';
                return $user;
            });
        $approvers = $approvers->merge($escalationUsers);

        return $approvers->unique('id')->values();
    }

    /**
     * Branch manager forwards admission to selected approver (Area/Zone/ADMF/DMF/ED).
     * Creates next approval step for that user; they can then approve or reject.
     */
    public function forwardToApprover(MemberAdmissionApproval $approval, int $userId, ?string $comments = null): bool
    {
        if ($approval->status !== 'pending' || !$approval->isCurrentPending()) {
            return false;
        }
        if ($approval->level !== 'branch') {
            return false;
        }

        $targetUser = User::with('role')->find($userId);
        if (!$targetUser || !$targetUser->is_active) {
            return false;
        }
        $roleName = $targetUser->role->name ?? '';
        $level = 'escalation';
        if ($roleName === 'area_manager') {
            $level = 'area';
        } elseif ($roleName === 'zone_manager') {
            $level = 'zone';
        } elseif (in_array($roleName, ['admf', 'dmf', 'ed'], true)) {
            $level = 'escalation';
        }

        DB::transaction(function () use ($approval, $userId, $comments, $level) {
            $admission = $approval->memberAdmission;
            $approval->update([
                'status' => 'approved',
                'comments' => $comments ?? 'Forwarded to higher-level approver',
                'approved_at' => now(),
                'approver_signature' => $approval->user->signature ?? null,
                'approver_pin' => $approval->user->pin ?? null,
            ]);
            // একই শাখার অন্য Branch Manager দের pending row গুলোও approved
            $admission->approvals()
                ->where('level', 'branch')
                ->where('id', '!=', $approval->id)
                ->where('status', 'pending')
                ->update([
                    'status' => 'approved',
                    'comments' => 'Forwarded by another branch manager',
                    'approved_at' => now(),
                ]);
            $nextSequence = $admission->approvals()->max('sequence') + 1;
            MemberAdmissionApproval::create([
                'member_admission_id' => $admission->id,
                'user_id' => $userId,
                'level' => $level,
                'sequence' => $nextSequence,
                'status' => 'pending',
            ]);
            $admission->update(['status' => 'under_review']);
        });

        return true;
    }

    /**
     * Create approval workflow when loan application is submitted
     */
    public function createLoanApprovalWorkflow(LoanApplication $loan): void
    {
        DB::transaction(function () use ($loan) {
            $loan->approvals()->delete();

            if (!$loan->branch_id) {
                throw new \Exception('Loan application must have a branch.');
            }

            $branchManagers = User::where('branch_id', $loan->branch_id)
                ->where('is_active', 1)
                ->whereHas('role', function ($query) {
                    $query->where('name', 'branch_manager');
                })
                ->get();

            if ($branchManagers->isEmpty()) {
                throw new \Exception('No Branch Manager found for this branch. Please assign a Branch Manager.');
            }

            // All branch managers receive the same step; one manager's decision completes it.
            foreach ($branchManagers as $branchManager) {
                LoanApplicationApproval::create([
                    'loan_application_id' => $loan->id,
                    'user_id' => $branchManager->id,
                    'level' => 'branch',
                    'sequence' => 1,
                    'status' => 'pending',
                ]);
            }
        });
    }

    /**
     * Approve a loan application approval step
     */
    public function approveLoan(LoanApplicationApproval $approval, ?string $comments = null, ?float $approvedAmount = null): bool
    {
        if ($approval->status !== 'pending' || !$approval->isCurrentPending()) {
            return false;
        }

        if ($approval->level === 'branch' && (float) ($approval->loanApplication->requested_amount ?? 0) > self::BRANCH_MANAGER_LOAN_CEILING) {
            throw new \Exception('ঋণের পরিমাণ ৭০,০০০ টাকার বেশি হওয়ায় সরাসরি অনুমোদন করা সম্ভব নয়। উচ্চতর অনুমোদনকারী নির্বাচন করে Forward করুন।');
        }

        if ($approvedAmount === null || $approvedAmount < 0) {
            throw new \Exception('চূড়ান্ত অনুমোদিত ঋণের পরিমাণ দিতে হবে।');
        }

        $loan = $approval->loanApplication;
        $loan->loadMissing('loanProduct');
        LoanFormVisibility::assertBmFormsComplete($loan);

        $approvedAmount = (int) round($approvedAmount);

        DB::transaction(function () use ($approval, $comments, $approvedAmount) {
            $approval->update([
                'status' => 'approved',
                'comments' => $comments,
                'approved_at' => now(),
                'approver_signature' => $approval->user->signature ?? null,
            ]);

            $loan = $approval->loanApplication;

            if ($approval->level === 'branch') {
                $loan->approvals()
                    ->where('level', 'branch')
                    ->where('id', '!=', $approval->id)
                    ->where('status', 'pending')
                    ->update([
                        'status' => 'approved',
                        'comments' => 'Approved by another branch manager',
                        'approved_at' => now(),
                    ]);
            } elseif (in_array($approval->level, ['area', 'zone', 'escalation'], true)) {
                $this->syncTeamBasedApprovalOnLoanApprove($loan, $approval->user, $approvedAmount, $comments);
            }

            $pendingCount = $loan->approvals()->where('status', 'pending')->count();

            if ($pendingCount === 0) {
                $words = NumberToWordsBangla::convert($approvedAmount);
                $businessPlan = is_array($loan->business_plan) ? $loan->business_plan : [];
                $businessPlan['final_approved_loan_amount_digits'] = (string) $approvedAmount;
                $businessPlan['final_approved_loan_amount_words'] = $words ? $words.' টাকা' : '';
                if ($comments !== null && trim($comments) !== '') {
                    $businessPlan['final_approver_comments'] = $comments;
                }

                $loan->update([
                    'status' => LoanApplication::STATUS_READY_FOR_HEAD_OFFICE,
                    'approved_amount' => $approvedAmount,
                    'business_plan' => $businessPlan,
                ]);
            } elseif ($loan->status === LoanApplication::STATUS_SUBMITTED) {
                $loan->update(['status' => 'under_review']);
            }
        });

        return true;
    }

    /**
     * Reject a loan application approval step
     */
    /**
     * Reject a loan application.
     * Always rejects the loan. Higher-level approvers (area/zone/escalation) also
     * sync-reject any linked Team Based sheet. Branch Manager reject skips Team Based.
     * When $pushToBlockList is true, member is pushed to the external block list.
     *
     * @param  array<string, mixed>|null  $blockListData
     */
    public function rejectLoan(
        LoanApplicationApproval $approval,
        string $comments,
        bool $pushToBlockList = true,
        ?array $blockListData = null,
    ): bool {
        if ($approval->status !== 'pending' || ! $approval->isCurrentPending()) {
            return false;
        }

        DB::transaction(function () use ($approval, $comments, $pushToBlockList, $blockListData) {
            $approval->update([
                'status' => 'rejected',
                'comments' => $comments,
                'approved_at' => now(),
            ]);

            $loan = $approval->loanApplication;
            $loan->loadMissing(['memberAdmission', 'branch']);

            // Higher approvers: also reject linked Team Based (BM never has one from this flow).
            if (in_array($approval->level, ['area', 'zone', 'escalation'], true)) {
                $this->syncTeamBasedApprovalOnLoanReject(
                    $loan,
                    $approval->user,
                    $comments,
                    $pushToBlockList ? $blockListData : null,
                );
            }

            $loan->update(['status' => LoanApplication::STATUS_REJECTED]);

            if ($pushToBlockList && is_array($blockListData)) {
                $branch = $loan->branch;
                if (! $branch) {
                    throw new \RuntimeException('শাখার তথ্য পাওয়া যায়নি। Block list-এ পাঠানো যায়নি।');
                }

                $member = $loan->memberAdmission;
                $memberName = $member
                    ? (string) ($member->applicant_name_bn ?: $member->applicant_name_en ?: 'N/A')
                    : (string) ($loan->member_display->applicant_name_bn
                        ?? $loan->member_display->applicant_name_en
                        ?? 'N/A');

                app(BlockListService::class)->pushRejectedPerson(
                    $approval->user,
                    $memberName,
                    $branch,
                    $blockListData,
                    $comments,
                );
            }
        });

        return true;
    }

    /** Branch manager direct-approve ceiling (BDT). Above this, BM must forward. */
    public const BRANCH_MANAGER_LOAN_CEILING = 70000;

    /**
     * Branch manager forwards loan application to selected approver (Area/Zone/ADMF/DMF/ED).
     * When amount is above BM ceiling, also auto-creates a Team Based Approval draft
     * for the selected approver, filled from loan + member admission data.
     */
    public function forwardLoanToApprover(LoanApplicationApproval $approval, int $userId, ?string $comments = null): bool
    {
        if ($approval->status !== 'pending' || !$approval->isCurrentPending()) {
            return false;
        }
        if ($approval->level !== 'branch') {
            return false;
        }

        $targetUser = User::with('role')->find($userId);
        if (!$targetUser || !$targetUser->is_active) {
            return false;
        }
        $roleName = $targetUser->role->name ?? '';
        $level = 'escalation';
        if ($roleName === 'area_manager') {
            $level = 'area';
        } elseif ($roleName === 'zone_manager') {
            $level = 'zone';
        } elseif (in_array($roleName, ['admf', 'dmf', 'ed'], true)) {
            $level = 'escalation';
        }

        $loan = $approval->loanApplication;
        $loan->loadMissing('loanProduct');
        LoanFormVisibility::assertBmFormsComplete($loan);

        DB::transaction(function () use ($approval, $userId, $comments, $level, $targetUser) {
            $loan = $approval->loanApplication;
            $approval->update([
                'status' => 'approved',
                'comments' => $comments ?? 'Forwarded to higher-level approver',
                'approved_at' => now(),
                'approver_signature' => $approval->user->signature ?? null,
            ]);
            $loan->approvals()
                ->where('level', 'branch')
                ->where('id', '!=', $approval->id)
                ->where('status', 'pending')
                ->update([
                    'status' => 'approved',
                    'comments' => 'Forwarded by another branch manager',
                    'approved_at' => now(),
                ]);
            $nextSequence = $loan->approvals()->max('sequence') + 1;
            LoanApplicationApproval::create([
                'loan_application_id' => $loan->id,
                'user_id' => $userId,
                'level' => $level,
                'sequence' => $nextSequence,
                'status' => 'pending',
            ]);
            $loan->update(['status' => LoanApplication::STATUS_UNDER_REVIEW]);

            if ((float) ($loan->requested_amount ?? 0) > self::BRANCH_MANAGER_LOAN_CEILING) {
                $loan->loadMissing([
                    'memberAdmission.samity',
                    'loanProduct',
                    'loanCategory',
                    'samity',
                    'branch',
                ]);
                $this->createTeamBasedApprovalFromLoan($loan, $targetUser, $approval->user);
            }
        });

        return true;
    }

    /**
     * Auto-create and post a Team Based Approval (pending) from a loan when
     * Branch Manager forwards above ceiling. Approver = forward target.
     * Skips draft — creates reviews so it appears in the approver inbox immediately.
     */
    public function createTeamBasedApprovalFromLoan(
        LoanApplication $loan,
        User $approver,
        User $createdBy
    ): TeamBasedApproval {
        $approver->loadMissing('role');

        $areaManagerId = null;
        $zoneManagerId = null;
        $admfId = null;
        $dmfId = null;
        $edId = null;

        switch ($approver->role?->name) {
            case Role::AREA_MANAGER:
                $areaManagerId = $approver->id;
                break;
            case Role::ZONE_MANAGER:
                $zoneManagerId = $approver->id;
                break;
            case Role::ADMF:
                $admfId = $approver->id;
                break;
            case Role::DMF:
                $dmfId = $approver->id;
                break;
            case Role::ED:
                $edId = $approver->id;
                break;
        }

        $itemData = $this->buildTeamBasedItemFromLoan($loan);

        $approval = TeamBasedApproval::create([
            'branch_id' => $loan->branch_id,
            'loan_application_id' => $loan->id,
            'created_by' => $createdBy->id,
            'sheet_date' => now()->toDateString(),
            'area_manager_id' => $areaManagerId,
            'zone_manager_id' => $zoneManagerId,
            'admf_id' => $admfId,
            'dmf_id' => $dmfId,
            'ed_id' => $edId,
            'status' => 'pending',
            'last_items_snapshot' => [$itemData],
        ]);

        $item = new TeamBasedApprovalItem(array_merge($itemData, [
            'serial_no' => 1,
        ]));
        $approval->items()->save($item);

        TeamBasedApprovalReview::create([
            'team_based_approval_id' => $approval->id,
            'team_based_approval_item_id' => $item->id,
            'user_id' => $approver->id,
            'level' => $approver->role?->name,
            'status' => 'pending',
        ]);

        return $approval->fresh(['items', 'reviews']);
    }

    /**
     * Map loan application + member admission fields into a Team Based item payload.
     *
     * @return array<string, mixed>
     */
    public function buildTeamBasedItemFromLoan(LoanApplication $loan): array
    {
        $member = $loan->memberAdmission;
        $samity = $member?->samity ?? $loan->samity;
        $businessPlan = is_array($loan->business_plan) ? $loan->business_plan : [];

        $display = $loan->member_display;
        $memberName = $member
            ? ($member->applicant_name_bn ?: $member->applicant_name_en)
            : (string) ($display->applicant_name_bn ?? $display->applicant_name_en ?? '');

        $savingsGeneral = $businessPlan['general_savings_amount']
            ?? $loan->savings_amount
            ?? null;
        $savingsOther = ! empty($businessPlan['is_against_savings'])
            ? ($businessPlan['against_savings_amount'] ?? null)
            : null;
        $savingsGeneralNum = $savingsGeneral !== null && $savingsGeneral !== ''
            ? (int) round((float) $savingsGeneral)
            : null;
        $savingsOtherNum = $savingsOther !== null && $savingsOther !== ''
            ? (int) round((float) $savingsOther)
            : null;
        $savingsTotal = null;
        if ($savingsGeneralNum !== null || $savingsOtherNum !== null) {
            $savingsTotal = (int) (($savingsGeneralNum ?? 0) + ($savingsOtherNum ?? 0));
        }

        $otherInstitution = $member?->other_loan_info
            ?? ($loan->other_loan_amount !== null ? (string) $loan->other_loan_amount : null);

        if (is_array($otherInstitution)) {
            $otherInstitution = json_encode($otherInstitution, JSON_UNESCAPED_UNICODE);
        }

        $addressParts = array_filter([
            $member?->present_village_road,
            $member?->present_union,
            $member?->present_upazila,
            $member?->present_district,
        ]);

        $loanType = $loan->loanProduct?->product_name_bn
            ?: $loan->loanProduct?->product_name
            ?: $loan->loanCategory?->category_name_bn
            ?: $loan->loanCategory?->category_name
            ?: null;

        $projectName = $businessPlan['project_name']
            ?? $businessPlan['proposed_project_name']
            ?? $member?->project_name
            ?? null;

        $repaidAmount = $businessPlan['last_repaid_loan_amount'] ?? null;

        return [
            'member_name' => $memberName ?: 'N/A',
            'name_bn' => $member?->applicant_name_bn,
            'father_name' => $member?->father_name_bn ?: $member?->father_name_en,
            'mother_name' => $member?->mother_name_bn ?: $member?->mother_name_en,
            'spouse_name' => $member?->spouse_name_bn ?: $member?->spouse_name_en,
            'dob' => $member?->date_of_birth,
            'nid_number' => $member?->nid_number ?: $member?->smart_card_number,
            'address' => $addressParts ? implode(', ', $addressParts) : null,
            'member_code' => $member?->application_no,
            'member_phone' => $member?->mobile_number,
            'samity_number' => $samity?->samity_code ?: ($samity?->id ? (string) $samity->id : null),
            'savings_general' => $savingsGeneralNum,
            'savings_other' => $savingsOtherNum,
            'savings_total' => $savingsTotal,
            'repaid_loan_amount' => TeamBasedApprovalItem::asWholeNumber($repaidAmount),
            'repaid_installment_no' => null,
            'other_institution_loan_amount' => $otherInstitution !== null
                ? mb_substr((string) $otherInstitution, 0, 500)
                : null,
            'proposed_loan_amount' => TeamBasedApprovalItem::asWholeNumber($loan->requested_amount),
            'loan_term_years' => $this->mapLoanTermYears(
                $loan->loan_term_months ?? $loan->loanProduct?->duration_months
            ),
            'loan_type' => $loanType,
            'project_name' => $projectName,
        ];
    }

    /**
     * Map duration (months) to Team Based allowed loan_term_years values.
     */
    public function mapLoanTermYears(?int $months): ?float
    {
        if ($months === null || $months <= 0) {
            return null;
        }

        $years = $months / 12;
        $allowed = [0.5, 1.0, 1.5, 2.0, 3.0];
        foreach ($allowed as $value) {
            if (abs($years - $value) < 0.01) {
                return $value;
            }
        }

        $closest = null;
        $bestDiff = PHP_FLOAT_MAX;
        foreach ($allowed as $value) {
            $diff = abs($years - $value);
            if ($diff < $bestDiff) {
                $bestDiff = $diff;
                $closest = $value;
            }
        }

        return $closest;
    }

    /**
     * When a higher approver approves a loan (from loan inbox), also approve the
     * linked Team Based sheet that was auto-created on BM forward.
     */
    private function syncTeamBasedApprovalOnLoanApprove(
        LoanApplication $loan,
        User $approver,
        int $approvedAmount,
        ?string $comments
    ): void {
        $teamBased = $this->findTeamBasedApprovalForLoan($loan, $approver);
        if (! $teamBased) {
            return;
        }

        $review = $teamBased->reviews()
            ->where('user_id', $approver->id)
            ->where('status', 'pending')
            ->whereNotNull('team_based_approval_item_id')
            ->first();

        if (! $review) {
            return;
        }

        $now = now();
        $signature = $approver->signature ?? null;

        $review->update([
            'status' => 'approved',
            'comments' => $comments,
            'approved_amount' => $approvedAmount,
            'approver_signature' => $signature,
            'decided_at' => $now,
        ]);

        if ($review->item) {
            TeamBasedApprovalReview::query()
                ->where('team_based_approval_id', $teamBased->id)
                ->where('team_based_approval_item_id', $review->team_based_approval_item_id)
                ->where('status', 'forwarded')
                ->where('id', '!=', $review->id)
                ->update(['status' => 'approved']);

            $review->item->update(['approved_amount' => $approvedAmount]);
        }

        $teamBased->update([
            'status' => 'approved',
            'approved_total_amount' => $approvedAmount,
        ]);
    }

    /**
     * When a higher approver rejects a loan, also reject the linked Team Based review.
     * Branch Manager rejects never call this (no Team Based for BM path).
     *
     * @param  array<string, mixed>|null  $blockListData
     */
    private function syncTeamBasedApprovalOnLoanReject(
        LoanApplication $loan,
        User $approver,
        string $comments,
        ?array $blockListData = null,
    ): void {
        $teamBased = $this->findTeamBasedApprovalForLoan($loan, $approver);
        if (! $teamBased) {
            return;
        }

        $review = $teamBased->reviews()
            ->where('user_id', $approver->id)
            ->whereIn('status', ['pending', 'waiting'])
            ->whereNotNull('team_based_approval_item_id')
            ->first();

        if (! $review) {
            return;
        }

        if (is_array($blockListData) && $review->item) {
            $review->item->update([
                'name_bn' => $blockListData['name_bn'] ?? $review->item->name_bn,
                'father_name' => $blockListData['father_name'] ?? $review->item->father_name,
                'mother_name' => $blockListData['mother_name'] ?? $review->item->mother_name,
                'spouse_name' => $blockListData['spouse_name'] ?? $review->item->spouse_name,
                'dob' => $blockListData['dob'] ?? $review->item->dob,
                'nid_number' => $blockListData['nid_number'] ?? $review->item->nid_number,
                'address' => $blockListData['address'] ?? $review->item->address,
                'member_phone' => $blockListData['phone_number'] ?? $review->item->member_phone,
            ]);
        }

        $review->update([
            'status' => 'rejected',
            'comments' => $comments,
            'approved_amount' => null,
            'approver_signature' => $approver->signature ?? null,
            'decided_at' => now(),
        ]);

        $teamBased->update([
            'status' => 'rejected',
            'approved_total_amount' => null,
        ]);
    }

    /**
     * Find Team Based sheet auto-created from a loan forward (by FK or legacy match).
     */
    private function findTeamBasedApprovalForLoan(LoanApplication $loan, User $approver): ?TeamBasedApproval
    {
        $byLoanId = TeamBasedApproval::where('loan_application_id', $loan->id)->first();
        if ($byLoanId) {
            return $byLoanId;
        }

        $loan->loadMissing('memberAdmission');
        $memberCode = $loan->memberAdmission?->application_no;
        if (! $memberCode) {
            return null;
        }

        $proposedAmount = TeamBasedApprovalItem::asWholeNumber($loan->requested_amount);

        $legacy = TeamBasedApproval::query()
            ->where('branch_id', $loan->branch_id)
            ->whereNull('loan_application_id')
            ->where('status', 'pending')
            ->whereHas('items', function ($q) use ($memberCode, $proposedAmount) {
                $q->where('member_code', $memberCode)
                    ->where('proposed_loan_amount', $proposedAmount);
            })
            ->whereHas('reviews', function ($q) use ($approver) {
                $q->where('user_id', $approver->id)->where('status', 'pending');
            })
            ->latest('id')
            ->first();

        if ($legacy) {
            $legacy->update(['loan_application_id' => $loan->id]);
        }

        return $legacy;
    }

    /**
     * Get pending loan approvals for a user (branch/area/zone/escalation approvers)
     */
    public function getPendingLoanApprovalsForUser(User $user)
    {
        $approvals = LoanApplicationApproval::where('user_id', $user->id)
            ->where('status', 'pending')
            ->whereHas('loanApplication', function ($query) {
                $query->whereIn('status', [LoanApplication::STATUS_SUBMITTED, LoanApplication::STATUS_UNDER_REVIEW]);
            })
            ->with(['loanApplication.memberAdmission', 'loanApplication.branch', 'loanApplication.loanProduct', 'loanApplication.loanCategory'])
            ->get();

        return $approvals->filter(function ($approval) {
            if ($approval->isCurrentPending()) {
                return true;
            }
            $loan = $approval->loanApplication;
            if ($loan && $loan->status === LoanApplication::STATUS_UNDER_REVIEW && $approval->level !== 'branch') {
                return true;
            }

            return false;
        })->values();
    }
}
