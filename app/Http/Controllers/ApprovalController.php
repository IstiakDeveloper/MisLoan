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
            $branch = $loan->branch;

            $addressParts = array_filter([
                $member?->present_village_road,
                $member?->present_union,
                $member?->present_upazila,
                $member?->present_district,
            ]);

            $dob = $member?->date_of_birth;
            if ($dob instanceof \DateTimeInterface) {
                $dob = $dob->format('Y-m-d');
            }

            $data = [
                'id' => $approval->id,
                'loan_application_id' => $loan->id,
                'application_no' => $loan->application_no,
                'applicant_name' => $member ? ($member->applicant_name_en ?? $member->applicant_name_bn ?? '') : '',
                'applicant_name_bn' => $member ? ($member->applicant_name_bn ?? '') : '',
                'branch_name' => $branch ? $branch->name : '',
                'branch_id' => $loan->branch_id,
                'branch_code' => $branch ? ($branch->code ?? '') : '',
                'requested_amount' => $loan->requested_amount,
                'submitted_at' => $loan->submitted_at,
                'level' => $approval->level,
                'sequence' => $approval->sequence,
                'block_list' => [
                    'name_bn' => $member?->applicant_name_bn ?? '',
                    'father_name' => $member?->father_name_bn ?: ($member?->father_name_en ?? ''),
                    'mother_name' => $member?->mother_name_bn ?: ($member?->mother_name_en ?? ''),
                    'spouse_name' => $member?->spouse_name_bn ?: ($member?->spouse_name_en ?? ''),
                    'dob' => $dob ?? '',
                    'nid_number' => $member?->nid_number ?: ($member?->smart_card_number ?? ''),
                    'phone_number' => $member?->mobile_number ?? '',
                    'address' => $addressParts ? implode(', ', $addressParts) : '',
                ],
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
        $request->validate([
            'comments' => 'nullable|string|max:1000',
            'approved_amount' => 'required|numeric|min:0',
        ]);

        try {
            $success = $this->approvalService->approveLoan(
                $loanApproval,
                $request->comments,
                (float) $request->approved_amount
            );
        } catch (\Exception $e) {
            if ($e->getMessage() === 'অনুমোদন/ফরওয়ার্ড করার আগে সরেজমিন তদন্ত প্রতিবেদন (ফর্ম ৪) পূরণ করতে হবে।') {
                $loan = $loanApproval->loanApplication;
                $params = array_filter([
                    'application_id' => $loan?->id,
                    'product_id' => $loan?->loan_product_id,
                    'category_id' => $loan?->loan_category_id,
                    'amount' => $loan?->requested_amount,
                    'member_id' => $loan?->member_admission_id,
                    'resume_approval_id' => $loanApproval->id,
                    'resume_approved_amount' => (string) round((float) $request->approved_amount),
                    'resume_comments' => $request->comments,
                ], fn ($value) => $value !== null && $value !== '');

                return redirect()->to('/member/loan-applications/forms/field-investigation?'.http_build_query($params))
                    ->with('success', 'প্রথমে সরেজমিন তদন্ত প্রতিবেদন পূরণ করুন। সংরক্ষণ করলে অনুমোদন স্বয়ংক্রিয়ভাবে সম্পন্ন হবে।');
            }
            return back()->with('error', $e->getMessage());
        }

        if ($success) {
            return redirect()->route('approvals.index')->with('success', 'ঋণ আবেদন অনুমোদিত হয়েছে।');
        }
        return back()->with('error', 'অনুমোদন করা যাচ্ছে না।');
    }

    /**
     * Reject a loan application.
     * Rejects the loan; higher approvers also sync-reject Team Based.
     * Branch Manager: loan + block list only (no Team Based).
     */
    public function rejectLoan(Request $request, LoanApplicationApproval $loanApproval)
    {
        abort_unless((int) $loanApproval->user_id === (int) $request->user()->id, 403);

        $rules = [
            'comments' => 'required|string|max:1000',
            'push_to_block_list' => ['sometimes', 'boolean'],
        ];

        $pushToBlockList = $request->boolean('push_to_block_list', true);

        if ($pushToBlockList) {
            $rules = array_merge($rules, [
                'block_list.nid_number' => ['required', 'string', 'max:50'],
                'block_list.phone_number' => ['required', 'string', 'regex:/^[0-9]{10,14}$/'],
                'block_list.name_bn' => ['nullable', 'string', 'max:255'],
                'block_list.father_name' => ['nullable', 'string', 'max:255'],
                'block_list.mother_name' => ['nullable', 'string', 'max:255'],
                'block_list.spouse_name' => ['nullable', 'string', 'max:255'],
                'block_list.dob' => ['nullable', 'date', 'before:today'],
                'block_list.address' => ['nullable', 'string', 'max:500'],
            ]);
        }

        $data = $request->validate($rules, [
            'block_list.nid_number.required' => 'Block list-এ যোগ করতে NID নম্বর প্রয়োজন।',
            'block_list.phone_number.required' => 'Block list-এ যোগ করতে ফোন নম্বর প্রয়োজন।',
            'block_list.phone_number.regex' => 'ফোন নম্বর ১০–১৪ অঙ্কের হতে হবে।',
            'comments.required' => 'মন্তব্য লিখতে হবে।',
        ]);

        try {
            $success = $this->approvalService->rejectLoan(
                $loanApproval,
                $data['comments'],
                $pushToBlockList,
                $pushToBlockList ? ($data['block_list'] ?? null) : null,
            );
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        if ($success) {
            $message = 'ঋণ আবেদন প্রত্যাখ্যান হয়েছে।';
            if ($pushToBlockList) {
                $message .= ' Block List-এ যোগ করা হয়েছে।';
            }
            if (in_array($loanApproval->level, ['area', 'zone', 'escalation'], true)) {
                $message .= ' টিম ভিত্তিক অনুমোদনও প্রত্যাখ্যান হয়েছে (থাকলে)।';
            }

            return redirect()->route('approvals.index')->with('success', $message);
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

        $loan = $loanApproval->loanApplication;
        $aboveCeiling = (float) ($loan?->requested_amount ?? 0) > \App\Services\ApprovalService::BRANCH_MANAGER_LOAN_CEILING;

        $success = $this->approvalService->forwardLoanToApprover(
            $loanApproval,
            (int) $request->forward_to_user_id,
            $request->comments
        );

        if ($success) {
            $message = 'ঋণ আবেদন নির্বাচিত অনুমোদনকারীর কাছে ফরওয়ার্ড হয়েছে।';
            if ($aboveCeiling) {
                $message .= ' টিম ভিত্তিক অনুমোদন স্বয়ংক্রিয়ভাবে পোস্ট হয়েছে।';
            }

            return redirect()->route('approvals.index')->with('success', $message);
        }

        return back()->with('error', 'ফরওয়ার্ড করা যাচ্ছে না।');
    }
}
