<?php

namespace App\Services;

use App\Models\MemberAdmission;
use App\Models\MemberAdmissionApproval;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ApprovalService
{
    /**
     * Create approval workflow when member admission is submitted
     * Uses manually selected approvers from admission->selected_approvers
     */
    public function createApprovalWorkflow(MemberAdmission $admission): void
    {
        DB::transaction(function () use ($admission) {
            // Clear any existing approvals (in case of resubmission)
            $admission->approvals()->delete();

            // Get selected approvers (already cast as array in model)
            $selectedApproverIds = $admission->selected_approvers ?? [];

            if (empty($selectedApproverIds)) {
                throw new \Exception('No approvers selected. Please select at least one approver.');
            }

            // Create approvals for selected users with sequential order
            $sequence = 1;
            foreach ($selectedApproverIds as $userId) {
                MemberAdmissionApproval::create([
                    'member_admission_id' => $admission->id,
                    'user_id' => $userId,
                    'level' => 'branch', // All selected are branch level
                    'sequence' => $sequence,
                    'status' => 'pending',
                ]);
                $sequence++;
            }

            // Add head office approval as final step
            $headOfficeUsers = User::where('has_all_access', 1)
                ->where('is_active', 1)
                ->whereHas('role', function ($query) {
                    $query->whereIn('name', ['Super Admin', 'Admin', 'Head Office']);
                })
                ->get();

            foreach ($headOfficeUsers as $user) {
                MemberAdmissionApproval::create([
                    'member_admission_id' => $admission->id,
                    'user_id' => $user->id,
                    'level' => 'head_office',
                    'sequence' => $sequence,
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

        DB::transaction(function () use ($approval, $comments) {
            // Get the approver's signature from their user profile
            $approverSignature = $approval->user->signature;

            $approval->update([
                'status' => 'approved',
                'comments' => $comments,
                'approved_at' => now(),
                'approver_signature' => $approverSignature,
            ]);

            // Check if all approvals are done
            $admission = $approval->memberAdmission;
            $pendingCount = $admission->approvals()->where('status', 'pending')->count();

            if ($pendingCount === 0) {
                // All branch approvals done, send to Head Office
                $admission->update(['status' => 'pending_head_office']);
            } else {
                // Move to under_review
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
            ]);

            // Mark admission as rejected
            $approval->memberAdmission->update(['status' => 'rejected']);
        });

        return true;
    }

    /**
     * Get pending approvals for a user
     */
    public function getPendingApprovalsForUser(User $user)
    {
        return MemberAdmissionApproval::where('user_id', $user->id)
            ->where('status', 'pending')
            ->whereHas('memberAdmission', function ($query) {
                $query->whereIn('status', ['submitted', 'under_review']);
            })
            ->with(['memberAdmission.branch', 'memberAdmission.samity'])
            ->get()
            ->filter(function ($approval) {
                return $approval->isCurrentPending();
            });
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
}
