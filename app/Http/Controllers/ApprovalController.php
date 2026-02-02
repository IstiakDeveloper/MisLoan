<?php

namespace App\Http\Controllers;

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
        $pendingApprovals = $this->approvalService->getPendingApprovalsForUser(auth()->user());

        return Inertia::render('Approvals/Index', [
            'approvals' => $pendingApprovals->map(function ($approval) {
                return [
                    'id' => $approval->id,
                    'member_admission_id' => $approval->member_admission_id,
                    'application_no' => $approval->memberAdmission->application_no,
                    'applicant_name' => $approval->memberAdmission->full_name,
                    'applicant_name_bn' => $approval->memberAdmission->full_name_bn,
                    'branch_name' => $approval->memberAdmission->branch->name,
                    'samity_name' => $approval->memberAdmission->samity->samity_name,
                    'submitted_at' => $approval->memberAdmission->submitted_at,
                    'level' => $approval->level,
                    'sequence' => $approval->sequence,
                    'revision_count' => $approval->memberAdmission->revision_count,
                    'revision_comments' => $approval->memberAdmission->revision_comments,
                    'status' => $approval->memberAdmission->status,
                ];
            }),
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
}
