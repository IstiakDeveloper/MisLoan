<?php

namespace App\Http\Controllers;

use App\Models\LoanApplicationApproval;
use App\Models\MemberAdmissionApproval;
use App\Services\ApprovalService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ApprovalController extends Controller
{
    protected $approvalService;

    public function __construct(ApprovalService $approvalService)
    {
        $this->approvalService = $approvalService;
    }

    /**
     * Display pending approvals for current user
     */
    public function index()
    {
        $user = auth()->user();
        $pendingApprovals = $this->approvalService->getPendingApprovalsForUser($user);
        $pendingLoanApprovals = $this->approvalService->getPendingLoanApprovalsForUser($user);

        $loanApprovalsData = $pendingLoanApprovals->map(function ($approval) {
            $loan = $approval->loanApplication;
            $member = $loan->memberAdmission;
            $data = [
                'id' => $approval->id,
                'loan_application_id' => $loan->id,
                'application_no' => $loan->application_no,
                'applicant_name' => $member ? ($member->applicant_name_en ?? $member->applicant_name_bn ?? '') : '',
                'applicant_name_bn' => $member ? ($member->applicant_name_bn ?? '') : '',
                'branch_name' => $loan->branch ? $loan->branch->name : '',
                'branch_id' => $loan->branch_id,
                'requested_amount' => $loan->requested_amount,
                'submitted_at' => $loan->submitted_at,
                'level' => $approval->level,
                'sequence' => $approval->sequence,
            ];
            if ($approval->level === 'branch') {
                $data['escalation_approvers'] = $this->approvalService->getEscalationApprovers($loan->branch_id)
                    ->map(fn ($u) => ['id' => $u->id, 'name' => $u->name, 'email' => $u->email ?? '', 'level' => $u->level ?? '', 'role_name' => $u->role->name ?? '']);
            } else {
                $data['escalation_approvers'] = [];
            }

            return $data;
        });

        $approvalsData = $pendingApprovals->map(function ($approval) {
            $data = [
                'id' => $approval->id,
                'member_admission_id' => $approval->member_admission_id,
                'application_no' => $approval->memberAdmission->application_no,
                'applicant_name' => $approval->memberAdmission->full_name,
                'applicant_name_bn' => $approval->memberAdmission->full_name_bn,
                'branch_name' => $approval->memberAdmission->branch->name,
                'branch_id' => $approval->memberAdmission->branch_id,
                'samity_name' => $approval->memberAdmission->samity->samity_name,
                'submitted_at' => $approval->memberAdmission->submitted_at,
                'level' => $approval->level,
                'sequence' => $approval->sequence,
                'revision_count' => $approval->memberAdmission->revision_count,
                'revision_comments' => $approval->memberAdmission->revision_comments,
                'status' => $approval->memberAdmission->status,
                'requested_loan_amount' => $approval->memberAdmission->requested_loan_amount ? (float) $approval->memberAdmission->requested_loan_amount : 0,
            ];
            if ($approval->level === 'branch') {
                $data['escalation_approvers'] = $this->approvalService->getEscalationApprovers($approval->memberAdmission->branch_id)
                    ->map(fn ($u) => ['id' => $u->id, 'name' => $u->name, 'email' => $u->email ?? '', 'level' => $u->level ?? '', 'role_name' => $u->role->name ?? '']);
            } else {
                $data['escalation_approvers'] = [];
            }
            return $data;
        });

        return Inertia::render('Approvals/Index', [
            'approvals' => $approvalsData,
            'loanApprovals' => $loanApprovalsData,
        ]);
    }

    /**
     * Approve an admission
     */
    public function approve(Request $request, MemberAdmissionApproval $approval)
    {
        $request->validate([
            'comments' => 'nullable|string|max:1000',
        ]);

        $success = $this->approvalService->approve($approval, $request->comments);

        if ($success) {
            return redirect()->route('approvals.index')
                ->with('success', 'Application approved successfully!');
        }

        return back()->with('error', 'Unable to approve this application.');
    }

    /**
     * Reject an admission
     */
    public function reject(Request $request, MemberAdmissionApproval $approval)
    {
        $request->validate([
            'comments' => 'required|string|max:1000',
        ]);

        $success = $this->approvalService->reject($approval, $request->comments);

        if ($success) {
            return redirect()->route('approvals.index')
                ->with('success', 'Application rejected successfully!');
        }

        return back()->with('error', 'Unable to reject this application.');
    }

    /**
     * Branch manager forwards admission to selected approver (Area/Zone/ADMF/DMF/ED)
     */
    public function forward(Request $request, MemberAdmissionApproval $approval)
    {
        $request->validate([
            'forward_to_user_id' => 'required|exists:users,id',
            'comments' => 'nullable|string|max:1000',
        ]);

        $success = $this->approvalService->forwardToApprover($approval, (int) $request->forward_to_user_id, $request->comments);

        if ($success) {
            return redirect()->route('approvals.index')
                ->with('success', 'Application forwarded to selected approver.');
        }

        return back()->with('error', 'Unable to forward this application.');
    }

    /**
     * Return admission to branch for revision (Head Office only)
     */
    public function returnToBranch(Request $request, MemberAdmissionApproval $approval)
    {
        $request->validate([
            'comments' => 'required|string|max:1000',
        ]);

        $success = $this->approvalService->returnToBranch($approval, $request->comments);

        if ($success) {
            return redirect()->route('approvals.index')
                ->with('success', 'Application returned to branch for revision!');
        }

        return back()->with('error', 'Unable to return this application.');
    }

    /**
     * Approve a loan application (area/zone approver)
     */
    public function approveLoan(Request $request, LoanApplicationApproval $loanApproval)
    {
        abort_unless((int) $loanApproval->user_id === (int) $request->user()->id, 403);
        $request->validate(['comments' => 'nullable|string|max:1000']);

        try {
            $success = $this->approvalService->approveLoan($loanApproval, $request->comments);
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }

        if ($success) {
            return redirect()->route('approvals.index')->with('success', 'ঋণ আবেদন অনুমোদিত হয়েছে।');
        }
        return back()->with('error', 'অনুমোদন করা যাচ্ছে না।');
    }

    /**
     * Reject a loan application (area/zone approver)
     */
    public function rejectLoan(Request $request, LoanApplicationApproval $loanApproval)
    {
        abort_unless((int) $loanApproval->user_id === (int) $request->user()->id, 403);
        $request->validate(['comments' => 'required|string|max:1000']);
        $success = $this->approvalService->rejectLoan($loanApproval, $request->comments);
        if ($success) {
            return redirect()->route('approvals.index')->with('success', 'ঋণ আবেদন প্রত্যাখ্যান হয়েছে।');
        }
        return back()->with('error', 'প্রত্যাখ্যান করা যাচ্ছে না।');
    }

    /**
     * Branch manager forwards loan application to selected approver (Area/Zone/ADMF/DMF/ED)
     */
    public function forwardLoan(Request $request, LoanApplicationApproval $loanApproval)
    {
        abort_unless((int) $loanApproval->user_id === (int) $request->user()->id, 403);
        $request->validate([
            'forward_to_user_id' => 'required|exists:users,id',
            'comments' => 'nullable|string|max:1000',
        ]);

        $success = $this->approvalService->forwardLoanToApprover(
            $loanApproval,
            (int) $request->forward_to_user_id,
            $request->comments
        );

        if ($success) {
            return redirect()->route('approvals.index')
                ->with('success', 'ঋণ আবেদন নির্বাচিত অনুমোদনকারীর কাছে ফরওয়ার্ড হয়েছে।');
        }

        return back()->with('error', 'ফরওয়ার্ড করা যাচ্ছে না।');
    }
}
