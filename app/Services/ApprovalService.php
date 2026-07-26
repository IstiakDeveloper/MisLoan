<?php

namespace App\Services;

use App\Models\MemberAdmission;
use App\Models\MemberAdmissionApproval;
use App\Models\LoanApplication;
use App\Models\LoanApplicationApproval;
use App\Models\User;
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
    public function approveLoan(LoanApplicationApproval $approval, ?string $comments = null): bool
    {
        if ($approval->status !== 'pending' || !$approval->isCurrentPending()) {
            return false;
        }

        DB::transaction(function () use ($approval, $comments) {
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
            }

            $pendingCount = $loan->approvals()->where('status', 'pending')->count();

            if ($pendingCount === 0) {
                $loan->update(['status' => LoanApplication::STATUS_READY_FOR_HEAD_OFFICE]);
            } elseif ($loan->status === LoanApplication::STATUS_SUBMITTED) {
                $loan->update(['status' => 'under_review']);
            }
        });

        return true;
    }

    /**
     * Reject a loan application approval step
     */
    public function rejectLoan(LoanApplicationApproval $approval, string $comments): bool
    {
        if ($approval->status !== 'pending' || !$approval->isCurrentPending()) {
            return false;
        }

        DB::transaction(function () use ($approval, $comments) {
            $approval->update([
                'status' => 'rejected',
                'comments' => $comments,
                'approved_at' => now(),
            ]);
            $approval->loanApplication->update(['status' => LoanApplication::STATUS_REJECTED]);
        });

        return true;
    }

    /**
     * Get pending loan approvals for a user (area/zone approvers)
     */
    public function getPendingLoanApprovalsForUser(User $user)
    {
        return LoanApplicationApproval::where('user_id', $user->id)
            ->where('status', 'pending')
            ->whereHas('loanApplication', function ($query) {
                $query->whereIn('status', [LoanApplication::STATUS_SUBMITTED, 'under_review']);
            })
            ->with(['loanApplication.memberAdmission', 'loanApplication.branch', 'loanApplication.loanProduct', 'loanApplication.loanCategory'])
            ->get()
            ->filter(function ($approval) {
                return $approval->isCurrentPending();
            });
    }
}
