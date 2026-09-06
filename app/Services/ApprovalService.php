<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\LoanApplicationApproval;
use App\Models\MemberAdmission;
use App\Models\MemberAdmissionApproval;
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
     * Branch user submit goes to branch manager only. Branch manager is the final
     * branch approver regardless of requested loan amount; Branch User then sends to Head Office.
     */
    public function createApprovalWorkflow(MemberAdmission $admission): void
    {
        DB::transaction(function () use ($admission) {
            $admission->approvals()->delete();

            $branch = $admission->branch;
            if (! $branch) {
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
        if (! $branch) {
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
        if (! $approval->isCurrentPending()) {
            return false;
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

        // Send notifications
        $admission = $approval->memberAdmission->fresh(['createdBy', 'submittedBy', 'branch']);
        $recipients = collect([$admission->createdBy, $admission->submittedBy])->filter();

        if ($approval->level === 'branch') {
            app(NotificationService::class)->send(
                users: $recipients,
                type: 'member_admission',
                title: 'সদস্য আবেদন শাখা কর্তৃক অনুমোদিত',
                message: "সদস্য আবেদন নং {$admission->application_no} ({$admission->applicant_name_bn}) শাখা পর্যায় থেকে অনুমোদিত হয়েছে।",
                notifiable: $admission,
                actionUrl: "/member-admissions/{$admission->id}",
                details: [
                    'আবেদন নং' => $admission->application_no,
                    'আবেদনকারীর নাম' => $admission->applicant_name_bn ?: $admission->applicant_name_en,
                    'অনুমোদনকারী' => auth()->user()?->name ?? 'Branch Manager',
                    'শাখা' => $admission->branch?->name ?? 'N/A',
                ]
            );
        } else {
            app(NotificationService::class)->send(
                users: $recipients,
                type: 'member_admission',
                title: 'উচ্চতর পর্যায় থেকে সদস্য আবেদন অনুমোদিত',
                message: "সদস্য আবেদন নং {$admission->application_no} ({$admission->applicant_name_bn}) উচ্চতর অনুমোদনকারী কর্তৃক অনুমোদিত হয়েছে।",
                notifiable: $admission,
                actionUrl: "/member-admissions/{$admission->id}",
                details: [
                    'আবেদন নং' => $admission->application_no,
                    'আবেদনকারীর নাম' => $admission->applicant_name_bn ?: $admission->applicant_name_en,
                    'অনুমোদনকারী' => auth()->user()?->name ?? 'Approver',
                    'শাখা' => $admission->branch?->name ?? 'N/A',
                ]
            );
        }

        return true;
    }

    /**
     * Reject a member admission.
     * When $pushToBlockList is true, the applicant is pushed to the external block list.
     *
     * @param  array<string, mixed>|null  $blockListData
     */
    public function reject(
        MemberAdmissionApproval $approval,
        string $comments,
        bool $pushToBlockList = true,
        ?array $blockListData = null,
    ): bool {
        if ($approval->status !== 'pending') {
            return false;
        }

        if (! $approval->isCurrentPending()) {
            return false;
        }

        DB::transaction(function () use ($approval, $comments, $pushToBlockList, $blockListData) {
            $approval->update([
                'status' => 'rejected',
                'comments' => $comments,
                'approved_at' => now(),
                'approver_signature' => $approval->user->signature ?? null,
                'approver_pin' => $approval->user->pin ?? null,
            ]);

            $admission = $approval->memberAdmission;
            $admission->loadMissing('branch');
            $admission->update(['status' => 'rejected']);

            if ($pushToBlockList && is_array($blockListData)) {
                $branch = $admission->branch;
                if (! $branch) {
                    throw new \RuntimeException('শাখার তথ্য পাওয়া যায়নি। Block list-এ পাঠানো যায়নি।');
                }

                $memberName = (string) ($admission->applicant_name_bn ?: $admission->applicant_name_en ?: 'N/A');

                app(BlockListService::class)->pushRejectedPerson(
                    $approval->user,
                    $memberName,
                    $branch,
                    $blockListData,
                    $comments,
                );
            }
        });

        // Send notifications
        $admission = $approval->memberAdmission->fresh(['createdBy', 'submittedBy', 'branch']);
        $recipients = collect([$admission->createdBy, $admission->submittedBy])->filter();

        app(NotificationService::class)->send(
            users: $recipients,
            type: 'member_admission',
            title: 'সদস্য আবেদন বাতিল করা হয়েছে',
            message: "সদস্য আবেদন নং {$admission->application_no} ({$admission->applicant_name_bn}) বাতিল করা হয়েছে। কারণ: {$comments}",
            notifiable: $admission,
            actionUrl: "/member-admissions/{$admission->id}",
            details: [
                'আবেদন নং' => $admission->application_no,
                'আবেদনকারীর নাম' => $admission->applicant_name_bn ?: $admission->applicant_name_en,
                'বাতিলের কারণ' => $comments,
            ]
        );

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
            ->with(['memberAdmission.branch.area.zone', 'memberAdmission.samity'])
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
     * @return list<int>
     */
    public function pendingAdmissionIdsForUser(User $user): array
    {
        return $this->getPendingApprovalsForUser($user)
            ->pluck('member_admission_id')
            ->filter()
            ->unique()
            ->values()
            ->all();
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

        if (! $approval->isCurrentPending()) {
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

        // Send notifications
        $admission = $approval->memberAdmission->fresh(['createdBy', 'submittedBy', 'branch']);
        $recipients = collect([$admission->createdBy, $admission->submittedBy])->filter();

        // Also notify branch managers of the branch
        $branchManagers = User::where('branch_id', $admission->branch_id)
            ->where('is_active', 1)
            ->whereHas('role', fn ($q) => $q->where('name', Role::BRANCH_MANAGER))
            ->get();
        $recipients = $recipients->concat($branchManagers);

        app(NotificationService::class)->send(
            users: $recipients,
            type: 'member_admission',
            title: 'সদস্য আবেদন সংশোধনের জন্য ফেরত পাঠানো হয়েছে',
            message: "সদস্য আবেদন নং {$admission->application_no} ({$admission->applicant_name_bn}) সংশোধনের জন্য ফেরত পাঠানো হয়েছে। মন্তব্য: {$comments}",
            notifiable: $admission,
            actionUrl: "/member-admissions/{$admission->id}/edit",
            details: [
                'আবেদন নং' => $admission->application_no,
                'আবেদনকারীর নাম' => $admission->applicant_name_bn ?: $admission->applicant_name_en,
                'মন্তব্য' => $comments,
            ]
        );

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
        $branch = Branch::with('area.zone')->find($branchId);

        if (! $branch) {
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
        $branch = Branch::with('area.zone')->find($branchId);
        if (! $branch) {
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
     * Admissions no longer escalate to Area/Zone/ADMF/DMF/ED.
     * Branch Manager is the final branch approver; Branch User sends to Head Office.
     */
    public function forwardToApprover(MemberAdmissionApproval $approval, int $userId, ?string $comments = null): bool
    {
        return false;
    }

    /**
     * Create approval workflow when loan application is submitted
     */
    public function createLoanApprovalWorkflow(LoanApplication $loan): void
    {
        DB::transaction(function () use ($loan) {
            $loan->approvals()->delete();

            if (! $loan->branch_id) {
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
        if ($approval->status !== 'pending' || ! $approval->isCurrentPending()) {
            return false;
        }

        if ($this->isLoanAmountChangeApproval($approval->loanApplication)) {
            return $this->approveLoanAmountChange($approval, $comments, $approvedAmount);
        }

        if ($approval->level === 'branch' && (float) ($approval->loanApplication->requested_amount ?? 0) >= self::BRANCH_MANAGER_LOAN_CEILING) {
            throw new \Exception('ঋণের পরিমাণ ৭০,০০০ টাকা বা তার বেশি হওয়ায় সরাসরি অনুমোদন করা সম্ভব নয়। উচ্চতর অনুমোদনকারী নির্বাচন করে Forward করুন।');
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

            // Write this approver's comments into form business_plan (office section)
            $this->syncLoanApproverCommentsToBusinessPlan(
                $loan->fresh(),
                $approval->level,
                $comments,
                $pendingCount === 0,
                $pendingCount === 0 ? $approvedAmount : null,
            );

            $loan = $loan->fresh();

            if ($pendingCount === 0) {
                $words = NumberToWordsBangla::convert($approvedAmount);
                $businessPlan = is_array($loan->business_plan) ? $loan->business_plan : [];
                $businessPlan['final_approved_loan_amount_digits'] = (string) $approvedAmount;
                $businessPlan['final_approved_loan_amount_words'] = $words ? $words.' টাকা' : '';
                if ($comments !== null && trim($comments) !== '') {
                    $businessPlan['final_approver_comments'] = $comments;
                }
                $businessPlan = $loan->mergeOfficialDatesIntoBusinessPlan(
                    $businessPlan,
                    now()->toDateString(),
                );

                $loan->update([
                    'status' => LoanApplication::STATUS_READY_FOR_HEAD_OFFICE,
                    'approved_amount' => $approvedAmount,
                    'business_plan' => $businessPlan,
                ]);
            } elseif ($loan->status === LoanApplication::STATUS_SUBMITTED) {
                $loan->update(['status' => 'under_review']);
            }
        });

        // Send notifications
        $loan = $approval->loanApplication->fresh(['submittedBy', 'memberAdmission', 'branch']);
        if ($loan->submittedBy) {
            if ($approval->level === 'branch') {
                app(NotificationService::class)->send(
                    users: $loan->submittedBy,
                    type: 'loan_application',
                    title: 'ঋণ আবেদন শাখা কর্তৃক অনুমোদিত',
                    message: "ঋণ আবেদন নং {$loan->application_no} ({$loan->memberAdmission?->applicant_name_bn}) শাখা থেকে অনুমোদিত হয়েছে। অনুমোদিত পরিমাণ: ".number_format($approvedAmount).' টাকা।',
                    notifiable: $loan,
                    actionUrl: "/member/loan-applications/{$loan->id}",
                    details: [
                        'আবেদন নং' => $loan->application_no,
                        'সদস্যের নাম' => $loan->memberAdmission?->applicant_name_bn ?: ($loan->memberAdmission?->applicant_name_en ?? 'N/A'),
                        'অনুমোদিত পরিমাণ' => number_format($approvedAmount).' টাকা',
                        'অনুমোদনকারী' => auth()->user()?->name ?? 'Branch Manager',
                    ]
                );
            } else {
                app(NotificationService::class)->send(
                    users: $loan->submittedBy,
                    type: 'loan_application',
                    title: 'উচ্চতর পর্যায় থেকে ঋণ আবেদন অনুমোদিত',
                    message: "ঋণ আবেদন নং {$loan->application_no} ({$loan->memberAdmission?->applicant_name_bn}) উচ্চতর অনুমোদনকারী কর্তৃক অনুমোদিত হয়েছে। অনুমোদিত পরিমাণ: ".number_format($approvedAmount).' টাকা।',
                    notifiable: $loan,
                    actionUrl: "/member/loan-applications/{$loan->id}",
                    details: [
                        'আবেদন নং' => $loan->application_no,
                        'সদস্যের নাম' => $loan->memberAdmission?->applicant_name_bn ?: ($loan->memberAdmission?->applicant_name_en ?? 'N/A'),
                        'অনুমোদিত পরিমাণ' => number_format($approvedAmount).' টাকা',
                        'অনুমোদনকারী' => auth()->user()?->name ?? 'Approver',
                    ]
                );
            }
        }

        return true;
    }

    /**
     * Reject a loan application.
     * Always rejects the loan. Higher-level approvers (area/zone/escalation) also
     * sync-reject any linked Team Based sheet. Branch Manager reject skips Team Based.
     * When $pushToBlockList is true, the applicant is pushed to the external block list.
     *
     * @param  array<string, mixed>|null  $blockListData
     */
    public function rejectLoan(
        LoanApplicationApproval $approval,
        string $comments,
        bool $pushToBlockList = false,
        ?array $blockListData = null,
    ): bool {
        if ($approval->status !== 'pending' || ! $approval->isCurrentPending()) {
            return false;
        }

        if ($this->isLoanAmountChangeApproval($approval->loanApplication)) {
            return $this->rejectLoanAmountChange($approval, $comments);
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
                );
            }

            $loan->update(['status' => LoanApplication::STATUS_REJECTED]);

            if ($pushToBlockList && is_array($blockListData)) {
                $branch = $loan->branch;
                if (! $branch) {
                    throw new \RuntimeException('শাখার তথ্য পাওয়া যায়নি। Block list-এ পাঠানো যায়নি।');
                }

                $member = $loan->memberAdmission;
                $memberName = (string) ($member?->applicant_name_bn ?: ($member?->applicant_name_en ?: 'N/A'));

                app(BlockListService::class)->pushRejectedPerson(
                    $approval->user,
                    $memberName,
                    $branch,
                    $blockListData,
                    $comments,
                );
            }
        });

        // Send notifications
        $loan = $approval->loanApplication->fresh(['submittedBy', 'memberAdmission', 'branch']);
        if ($loan->submittedBy) {
            app(NotificationService::class)->send(
                users: $loan->submittedBy,
                type: 'loan_application',
                title: 'ঋণ আবেদন বাতিল করা হয়েছে',
                message: "ঋণ আবেদন নং {$loan->application_no} ({$loan->memberAdmission?->applicant_name_bn}) বাতিল করা হয়েছে। কারণ: {$comments}",
                notifiable: $loan,
                actionUrl: "/member/loan-applications/{$loan->id}",
                details: [
                    'আবেদন নং' => $loan->application_no,
                    'সদস্যের নাম' => $loan->memberAdmission?->applicant_name_bn ?: ($loan->memberAdmission?->applicant_name_en ?? 'N/A'),
                    'বাতিলের কারণ' => $comments,
                ]
            );
        }

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
        if ($approval->status !== 'pending' || ! $approval->isCurrentPending()) {
            return false;
        }
        if ($approval->level !== 'branch') {
            return false;
        }

        $targetUser = User::with('role')->find($userId);
        if (! $targetUser || ! $targetUser->is_active) {
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

            // BM forward comments → office section (খ)
            $this->syncLoanApproverCommentsToBusinessPlan(
                $loan->fresh(),
                'branch',
                $comments,
                false,
                null,
            );

            if ((float) ($loan->requested_amount ?? 0) >= self::BRANCH_MANAGER_LOAN_CEILING) {
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

        // Send notifications
        $loan = $approval->loanApplication->fresh(['submittedBy', 'memberAdmission', 'branch']);

        // 1. Notify target approver
        app(NotificationService::class)->send(
            users: $targetUser,
            type: 'loan_application',
            title: 'ঋণ আবেদন আপনার পর্যালোচনার জন্য ফরোয়ার্ড করা হয়েছে',
            message: "ঋণ আবেদন নং {$loan->application_no} ({$loan->memberAdmission?->applicant_name_bn}) আপনার অনুমোদনের জন্য ফরোয়ার্ড করা হয়েছে। চাহিদাকৃত পরিমাণ: ".number_format($loan->requested_amount ?? 0).' টাকা।',
            notifiable: $loan,
            actionUrl: '/approvals',
            details: [
                'আবেদন নং' => $loan->application_no,
                'সদস্যের নাম' => $loan->memberAdmission?->applicant_name_bn ?: ($loan->memberAdmission?->applicant_name_en ?? 'N/A'),
                'চাহিদাকৃত ঋণ' => number_format($loan->requested_amount ?? 0).' টাকা',
                'শাখা' => $loan->branch?->name ?? 'N/A',
                'ফরোয়ার্ড করেছেন' => auth()->user()?->name ?? 'Branch Manager',
            ]
        );

        // 2. Notify submitter
        if ($loan->submittedBy) {
            app(NotificationService::class)->send(
                users: $loan->submittedBy,
                type: 'loan_application',
                title: 'ঋণ আবেদন উচ্চতর অনুমোদনকারীর কাছে প্রেরিত',
                message: "আপনার ঋণ আবেদন নং {$loan->application_no} ({$loan->memberAdmission?->applicant_name_bn}) উচ্চতর অনুমোদনকারীর কাছে পাঠানো হয়েছে।",
                notifiable: $loan,
                actionUrl: "/member/loan-applications/{$loan->id}",
                details: [
                    'আবেদন নং' => $loan->application_no,
                    'সদস্যের নাম' => $loan->memberAdmission?->applicant_name_bn ?: ($loan->memberAdmission?->applicant_name_en ?? 'N/A'),
                    'অনুমোদনকারী' => $targetUser->name.' ('.($targetUser->role?->name ?? '').')',
                ]
            );
        }

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
     */
    private function syncTeamBasedApprovalOnLoanReject(
        LoanApplication $loan,
        User $approver,
        string $comments,
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

    public function isLoanAmountChangeApproval(?LoanApplication $loan): bool
    {
        return $loan !== null && $loan->hasPendingAmountChange();
    }

    public static function approvalLevelLabel(?string $level): string
    {
        return match ($level) {
            'branch' => 'শাখা ব্যবস্থাপক',
            'area' => 'এরিয়া ব্যবস্থাপক',
            'zone' => 'জোন ব্যবস্থাপক',
            'escalation' => 'উচ্চতর অনুমোদনকারী',
            'head_office' => 'হেড অফিস',
            default => 'অনুমোদনকারী',
        };
    }

    /**
     * The person who gave the final branch-chain approval.
     * If BM forwarded, this is the Area/Zone/ADMF/DMF/ED who approved — not the BM.
     */
    public function lastLoanAmountApproval(LoanApplication $loan): ?LoanApplicationApproval
    {
        $approved = LoanApplicationApproval::query()
            ->where('loan_application_id', $loan->id)
            ->where('status', 'approved')
            ->with('user.role')
            ->orderByDesc('sequence')
            ->orderByDesc('id')
            ->get()
            ->filter(fn (LoanApplicationApproval $approval) => ! $this->isNonFinalApprovalComment($approval->comments))
            ->values();

        $higherLevel = $approved->first(
            fn (LoanApplicationApproval $approval) => in_array($approval->level, ['escalation', 'zone', 'area'], true)
        );

        return $higherLevel ?? $approved->first();
    }

    private function isNonFinalApprovalComment(?string $comments): bool
    {
        $text = trim((string) $comments);
        if ($text === '') {
            return false;
        }

        if (in_array($text, [
            'Approved by another branch manager',
            'Forwarded by another branch manager',
            'Forwarded to higher-level approver',
        ], true)) {
            return true;
        }

        return str_contains($text, 'Forwarded by another')
            || str_contains($text, 'অন্য শাখা ব্যবস্থাপক');
    }

    /**
     * Accountant requests a new approved amount after HO approval.
     * The original amount-approver must approve again before disbursement.
     */
    public function requestLoanAmountChange(LoanApplication $loan, User $accountant, float $newAmount): void
    {
        if (! in_array($loan->status, [LoanApplication::STATUS_PENDING_DISBURSEMENT, LoanApplication::STATUS_APPROVED], true)) {
            throw new \Exception('শুধু অনুমোদিত ও বিতরণের অপেক্ষায় থাকা ঋণের পরিমাণ পরিবর্তন করা যাবে।');
        }

        if ($loan->hasPendingAmountChange()) {
            throw new \Exception('ইতিমধ্যে পরিমাণ পরিবর্তনের অনুমোদন অপেক্ষমাণ।');
        }

        $loan->loadMissing(['loanProduct', 'memberAdmission', 'submittedBy']);
        $newAmount = (int) round($newAmount);
        $currentApproved = (int) round((float) ($loan->approved_amount ?? $loan->requested_amount ?? 0));

        if ($newAmount < 1) {
            throw new \Exception('নতুন অনুমোদিত পরিমাণ অন্তত ১ টাকা হতে হবে।');
        }

        if ($newAmount === $currentApproved) {
            throw new \Exception('নতুন পরিমাণ বর্তমান অনুমোদিত পরিমাণের সমান। পরিবর্তন করার কিছু নেই।');
        }

        $productMax = (float) ($loan->loanProduct?->max_amount ?? 0);
        if ($productMax > 0 && $newAmount > $productMax) {
            throw new \Exception('নতুন পরিমাণ প্রডাক্টের সর্বোচ্চ সীমার (৳'.number_format($productMax).') চেয়ে বেশি হতে পারবে না।');
        }

        $lastApproval = $this->lastLoanAmountApproval($loan);
        if (! $lastApproval || ! $lastApproval->user_id) {
            throw new \Exception('এই ঋণের পূর্বের অনুমোদনকারী পাওয়া যায়নি।');
        }

        $targetUser = User::query()->find($lastApproval->user_id);
        if (! $targetUser || ! $targetUser->is_active) {
            throw new \Exception('পূর্বের অনুমোদনকারী এখন সক্রিয় নন।');
        }

        $nextSequence = ((int) $loan->approvals()->max('sequence')) + 1;

        DB::transaction(function () use ($loan, $accountant, $newAmount, $lastApproval, $nextSequence) {
            $loan->update([
                'status' => LoanApplication::STATUS_PENDING_AMOUNT_APPROVAL,
                'pending_approved_amount' => $newAmount,
                'amount_change_requested_by' => $accountant->id,
                'amount_change_requested_at' => now(),
            ]);

            LoanApplicationApproval::create([
                'loan_application_id' => $loan->id,
                'user_id' => $lastApproval->user_id,
                'level' => $lastApproval->level ?: 'branch',
                'sequence' => $nextSequence,
                'status' => 'pending',
            ]);
        });

        $loan = $loan->fresh(['memberAdmission', 'submittedBy']);
        app(NotificationService::class)->send(
            users: $targetUser,
            type: 'loan_application',
            title: 'ঋণের অনুমোদিত পরিমাণ পরিবর্তনের অনুমোদন প্রয়োজন',
            message: "ঋণ আবেদন নং {$loan->application_no} এর অনুমোদিত পরিমাণ ৳".number_format($currentApproved).' থেকে ৳'.number_format($newAmount).' করা হয়েছে। অনুমোদন দিলে বিতরণ করা যাবে।',
            notifiable: $loan,
            actionUrl: '/approvals',
            details: [
                'আবেদন নং' => $loan->application_no,
                'আগের অনুমোদিত পরিমাণ' => number_format($currentApproved).' টাকা',
                'প্রস্তাবিত পরিমাণ' => number_format($newAmount).' টাকা',
                'পরিবর্তন করেছেন' => $accountant->name,
            ]
        );
    }

    private function approveLoanAmountChange(LoanApplicationApproval $approval, ?string $comments, ?float $approvedAmount): bool
    {
        $loan = $approval->loanApplication;
        $finalAmount = $approvedAmount !== null && $approvedAmount > 0
            ? (int) round($approvedAmount)
            : (int) round((float) $loan->pending_approved_amount);

        if ($finalAmount < 1) {
            throw new \Exception('চূড়ান্ত অনুমোদিত ঋণের পরিমাণ দিতে হবে।');
        }

        DB::transaction(function () use ($approval, $comments, $loan, $finalAmount) {
            $approval->update([
                'status' => 'approved',
                'comments' => $comments ?: 'পরিমাণ পরিবর্তন অনুমোদিত',
                'approved_at' => now(),
                'approver_signature' => $approval->user->signature ?? null,
            ]);

            $words = NumberToWordsBangla::convert($finalAmount);
            $businessPlan = is_array($loan->business_plan) ? $loan->business_plan : [];
            $businessPlan['final_approved_loan_amount_digits'] = (string) $finalAmount;
            $businessPlan['final_approved_loan_amount_words'] = $words ? $words.' টাকা' : '';

            $loan->update([
                'status' => LoanApplication::STATUS_PENDING_DISBURSEMENT,
                'approved_amount' => $finalAmount,
                'pending_approved_amount' => null,
                'amount_change_requested_by' => null,
                'amount_change_requested_at' => null,
                'business_plan' => $businessPlan,
            ]);
        });

        $loan = $loan->fresh(['submittedBy', 'memberAdmission']);
        $recipients = collect([$loan->submittedBy])->filter();
        if ($recipients->isNotEmpty()) {
            app(NotificationService::class)->send(
                users: $recipients,
                type: 'loan_application',
                title: 'পরিবর্তিত ঋণ পরিমাণ অনুমোদিত',
                message: "ঋণ আবেদন নং {$loan->application_no} এর নতুন অনুমোদিত পরিমাণ ৳".number_format($finalAmount).'। এখন বিতরণ করা যাবে।',
                notifiable: $loan,
                actionUrl: "/member/loan-applications/{$loan->id}",
                details: [
                    'আবেদন নং' => $loan->application_no,
                    'নতুন অনুমোদিত পরিমাণ' => number_format($finalAmount).' টাকা',
                    'অনুমোদনকারী' => auth()->user()?->name ?? 'Approver',
                ]
            );
        }

        return true;
    }

    private function rejectLoanAmountChange(LoanApplicationApproval $approval, string $comments): bool
    {
        $loan = $approval->loanApplication;
        $previousAmount = (float) ($loan->approved_amount ?? $loan->requested_amount ?? 0);

        DB::transaction(function () use ($approval, $comments, $loan) {
            $approval->update([
                'status' => 'rejected',
                'comments' => $comments,
                'approved_at' => now(),
            ]);

            $loan->update([
                'status' => LoanApplication::STATUS_PENDING_DISBURSEMENT,
                'pending_approved_amount' => null,
                'amount_change_requested_by' => null,
                'amount_change_requested_at' => null,
            ]);
        });

        $loan = $loan->fresh(['submittedBy', 'memberAdmission']);
        if ($loan->submittedBy) {
            app(NotificationService::class)->send(
                users: $loan->submittedBy,
                type: 'loan_application',
                title: 'পরিমাণ পরিবর্তন প্রত্যাখ্যাত',
                message: "ঋণ আবেদন নং {$loan->application_no} এর পরিমাণ পরিবর্তন প্রত্যাখ্যান হয়েছে। আগের অনুমোদিত পরিমাণ ৳".number_format($previousAmount).' বহাল থাকবে।',
                notifiable: $loan,
                actionUrl: "/member/loan-applications/{$loan->id}",
                details: [
                    'আবেদন নং' => $loan->application_no,
                    'অনুমোদিত পরিমাণ' => number_format($previousAmount).' টাকা',
                    'কারণ' => $comments,
                ]
            );
        }

        return true;
    }

    /**
     * Get pending loan approvals for a user (branch/area/zone/escalation approvers)
     */
    public function getPendingLoanApprovalsForUser(User $user)
    {
        $approvals = LoanApplicationApproval::where('user_id', $user->id)
            ->where('status', 'pending')
            ->whereHas('loanApplication', function ($query) {
                $query->whereIn('status', [
                    LoanApplication::STATUS_SUBMITTED,
                    LoanApplication::STATUS_UNDER_REVIEW,
                    LoanApplication::STATUS_PENDING_AMOUNT_APPROVAL,
                ]);
            })
            ->with(['loanApplication.memberAdmission', 'loanApplication.branch.area.zone', 'loanApplication.loanProduct', 'loanApplication.loanCategory'])
            ->get();

        return $approvals->filter(function ($approval) {
            if ($approval->isCurrentPending()) {
                return true;
            }
            $loan = $approval->loanApplication;
            if ($loan && $loan->status === LoanApplication::STATUS_UNDER_REVIEW && $approval->level !== 'branch') {
                return true;
            }
            if ($loan && $loan->status === LoanApplication::STATUS_PENDING_AMOUNT_APPROVAL) {
                return true;
            }

            return false;
        })->values();
    }

    /**
     * @return list<int>
     */
    public function pendingLoanApplicationIdsForUser(User $user): array
    {
        return $this->getPendingLoanApprovalsForUser($user)
            ->pluck('loan_application_id')
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    /**
     * Map approver-level comments into loan business_plan office section fields
     * (4-page + Agrosor Profile print/form).
     */
    private function syncLoanApproverCommentsToBusinessPlan(
        LoanApplication $loan,
        string $level,
        ?string $comments,
        bool $isFinal = false,
        ?int $approvedAmount = null,
    ): void {
        $text = is_string($comments) ? trim($comments) : '';
        $businessPlan = is_array($loan->business_plan) ? $loan->business_plan : [];

        if ($text !== '') {
            if ($level === 'branch') {
                $businessPlan['branch_manager_post_inspection_comments'] = $text;
                $businessPlan['bm_comments'] = $text;
            } elseif ($level === 'area') {
                $businessPlan['regional_manager_comments'] = $text;
                $businessPlan['rm_comments'] = $text;
            } elseif ($level === 'zone') {
                $businessPlan['zonal_manager_comments'] = $text;
                // Agrosor PDF has no separate ZM slot — keep on zonal; if final, also final below
            }

            if ($isFinal || $level === 'escalation') {
                $businessPlan['final_approver_comments'] = $text;
            }
        }

        if ($isFinal && $approvedAmount !== null) {
            $words = NumberToWordsBangla::convert($approvedAmount);
            $businessPlan['final_approved_loan_amount_digits'] = (string) $approvedAmount;
            $businessPlan['final_approved_loan_amount_words'] = $words ? $words.' টাকা' : '';
        }

        $loan->update(['business_plan' => $businessPlan]);
    }
}
