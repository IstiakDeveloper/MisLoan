<?php

namespace App\Http\Controllers;

use App\Models\Area;
use App\Models\Branch;
use App\Models\LoanApplicationApproval;
use App\Models\MemberAdmission;
use App\Models\MemberAdmissionApproval;
use App\Models\Zone;
use App\Services\ApprovalService;
use App\Support\LoanFormVisibility;
use Illuminate\Http\RedirectResponse;
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
    public function index(Request $request)
    {
        $user = $request->user();
        $zoneId = $request->input('zone_id');
        $areaId = $request->input('area_id');
        $branchId = $request->input('branch_id');

        $rawPendingApprovals = $this->approvalService->getPendingApprovalsForUser($user);
        $rawPendingLoanApprovals = $this->approvalService->getPendingLoanApprovalsForUser($user);

        $pendingApprovals = $rawPendingApprovals;
        $pendingLoanApprovals = $rawPendingLoanApprovals;

        if ($branchId) {
            $pendingApprovals = $pendingApprovals->filter(fn ($a) => (string) ($a->memberAdmission?->branch_id) === (string) $branchId)->values();
            $pendingLoanApprovals = $pendingLoanApprovals->filter(fn ($a) => (string) ($a->loanApplication?->branch_id) === (string) $branchId)->values();
        }
        if ($areaId) {
            $pendingApprovals = $pendingApprovals->filter(fn ($a) => (string) ($a->memberAdmission?->branch?->area_id) === (string) $areaId)->values();
            $pendingLoanApprovals = $pendingLoanApprovals->filter(fn ($a) => (string) ($a->loanApplication?->branch?->area_id) === (string) $areaId)->values();
        }
        if ($zoneId) {
            $pendingApprovals = $pendingApprovals->filter(fn ($a) => (string) ($a->memberAdmission?->branch?->area?->zone_id) === (string) $zoneId)->values();
            $pendingLoanApprovals = $pendingLoanApprovals->filter(fn ($a) => (string) ($a->loanApplication?->branch?->area?->zone_id) === (string) $zoneId)->values();
        }

        $accessibleBranches = $user->getAccessibleBranches()->sortBy('code')->values();

        // Also ensure all branches with pending approvals for this user are available in the filters
        $pendingBranchIds = $rawPendingApprovals->pluck('memberAdmission.branch_id')
            ->merge($rawPendingLoanApprovals->pluck('loanApplication.branch_id'))
            ->filter()
            ->unique();
        if ($pendingBranchIds->isNotEmpty()) {
            $extraBranches = Branch::whereIn('id', $pendingBranchIds)->get();
            $accessibleBranches = $accessibleBranches->merge($extraBranches)->unique('id')->sortBy('code')->values();
        }

        if ($accessibleBranches->isEmpty()) {
            $accessibleBranches = Branch::all()->sortBy('code')->values();
        }

        $branches = $accessibleBranches->map(fn ($b) => [
            'id' => $b->id,
            'name' => $b->name,
            'code' => $b->code,
            'area_id' => $b->area_id,
        ])->values();

        $areaIds = $branches->pluck('area_id')->filter()->unique();
        $areas = Area::query()
            ->whereIn('id', $areaIds)
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'zone_id']);

        $zoneIds = $areas->pluck('zone_id')->filter()->unique();
        $zones = Zone::query()
            ->whereIn('id', $zoneIds)
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        $loanApprovalsData = $pendingLoanApprovals->map(function ($approval) {
            $loan = $approval->loanApplication;
            $member = $loan->memberAdmission;
            $branch = $loan->branch;

            $data = [
                'id' => $approval->id,
                'loan_application_id' => $loan->id,
                'application_no' => $loan->application_no,
                'applicant_name' => $member ? ($member->applicant_name_en ?? $member->applicant_name_bn ?? '') : '',
                'applicant_name_bn' => $member ? ($member->applicant_name_bn ?? '') : '',
                'branch_name' => $branch ? $branch->name : '',
                'branch_id' => $loan->branch_id,
                'branch_code' => $branch->code ?? '',
                'requested_amount' => $loan->requested_amount,
                'submitted_at' => $loan->submitted_at,
                'level' => $approval->level,
                'sequence' => $approval->sequence,
                'block_list' => $member ? $this->blockListFieldsFromMember($member) : null,
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
            $member = $approval->memberAdmission;
            $branch = $member->branch;

            $data = [
                'id' => $approval->id,
                'member_admission_id' => $approval->member_admission_id,
                'application_no' => $member->application_no,
                'applicant_name' => $member->full_name,
                'applicant_name_bn' => $member->full_name_bn,
                'branch_name' => $branch->name,
                'branch_id' => $member->branch_id,
                'branch_code' => $branch->code ?? '',
                'samity_name' => $member->samity->samity_name,
                'submitted_at' => $member->submitted_at,
                'level' => $approval->level,
                'sequence' => $approval->sequence,
                'revision_count' => $member->revision_count,
                'revision_comments' => $member->revision_comments,
                'status' => $member->status,
                'requested_loan_amount' => $member->requested_loan_amount ? (float) $member->requested_loan_amount : 0,
                'block_list' => $this->blockListFieldsFromMember($member),
            ];
            $data['escalation_approvers'] = [];

            return $data;
        });

        return Inertia::render('Approvals/Index', [
            'approvals' => $approvalsData,
            'loanApprovals' => $loanApprovalsData,
            'zones' => $zones,
            'areas' => $areas,
            'branches' => $branches,
            'filters' => [
                'zone_id' => $zoneId,
                'area_id' => $areaId,
                'branch_id' => $branchId,
            ],
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
            return $this->redirectToListPreservingFilters('approvals.index', 'Application approved successfully!');
        }

        return back()->with('error', 'Unable to approve this application.');
    }

    /**
     * Reject an admission and optionally push the applicant to the block list.
     */
    public function reject(Request $request, MemberAdmissionApproval $approval)
    {
        abort_unless((int) $approval->user_id === (int) $request->user()->id, 403);

        $rules = [
            'comments' => 'required|string|max:1000',
            'push_to_block_list' => ['sometimes', 'boolean'],
        ];

        $pushToBlockList = $request->boolean('push_to_block_list', true);

        if ($pushToBlockList) {
            $rules = array_merge($rules, $this->blockListValidationRules());
        }

        $data = $request->validate($rules, $this->blockListValidationMessages());

        try {
            $success = $this->approvalService->reject(
                $approval,
                $data['comments'],
                $pushToBlockList,
                $pushToBlockList ? ($data['block_list'] ?? null) : null,
            );
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        if ($success) {
            $message = 'সদস্য আবেদন প্রত্যাখ্যান হয়েছে।';
            if ($pushToBlockList) {
                $message .= ' Block List-এ যোগ করা হয়েছে।';
            }

            return $this->redirectToListPreservingFilters('approvals.index', $message);
        }

        return back()->with('error', 'Unable to reject this application.');
    }

    /**
     * Admissions do not escalate. Branch Manager is the final branch approver.
     */
    public function forward(Request $request, MemberAdmissionApproval $approval)
    {
        return back()->with('error', 'সদস্য ভর্তিতে শাখা ব্যবস্থাপকই চূড়ান্ত অনুমোদনকারী। উচ্চতর কর্মকর্তার কাছে পাঠানো যায় না।');
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
            return $this->redirectToListPreservingFilters('approvals.index', 'Application returned to branch for revision!');
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
            if (LoanFormVisibility::isBmFormIncompleteMessage($e->getMessage())) {
                return $this->redirectToFieldInvestigationForResume($loanApproval, $request);
            }

            return back()->with('error', $e->getMessage());
        }

        if ($success) {
            return $this->redirectToListPreservingFilters('approvals.index', 'ঋণ আবেদন অনুমোদিত হয়েছে।');
        }

        return back()->with('error', 'অনুমোদন করা যাচ্ছে না।');
    }

    /**
     * Reject a loan application and optionally push the applicant to the block list.
     * Rejects the loan; higher approvers also sync-reject Team Based.
     */
    public function rejectLoan(Request $request, LoanApplicationApproval $loanApproval)
    {
        abort_unless((int) $loanApproval->user_id === (int) $request->user()->id, 403);

        $rules = [
            'comments' => 'required|string|max:1000',
            'push_to_block_list' => ['sometimes', 'boolean'],
        ];

        $pushToBlockList = $request->boolean('push_to_block_list', false);

        if ($pushToBlockList) {
            $rules = array_merge($rules, $this->blockListValidationRules());
        }

        $data = $request->validate($rules, $this->blockListValidationMessages());

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

            return $this->redirectToListPreservingFilters('approvals.index', $message);
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
        $aboveCeiling = (float) ($loan?->requested_amount ?? 0) >= ApprovalService::BRANCH_MANAGER_LOAN_CEILING;

        try {
            $success = $this->approvalService->forwardLoanToApprover(
                $loanApproval,
                (int) $request->forward_to_user_id,
                $request->comments
            );
        } catch (\Exception $e) {
            if (LoanFormVisibility::isBmFormIncompleteMessage($e->getMessage())) {
                return $this->redirectToFieldInvestigationForResume($loanApproval, $request);
            }

            return back()->with('error', $e->getMessage());
        }

        if ($success) {
            $message = 'ঋণ আবেদন নির্বাচিত অনুমোদনকারীর কাছে ফরওয়ার্ড হয়েছে।';
            if ($aboveCeiling) {
                $message .= ' টিম ভিত্তিক অনুমোদন স্বয়ংক্রিয়ভাবে পোস্ট হয়েছে।';
            }

            return $this->redirectToListPreservingFilters('approvals.index', $message);
        }

        return back()->with('error', 'ফরওয়ার্ড করা যাচ্ছে না।');
    }

    private function redirectToFieldInvestigationForResume(LoanApplicationApproval $loanApproval, Request $request): RedirectResponse
    {
        $loan = $loanApproval->loanApplication;
        $params = array_filter([
            'application_id' => $loan?->id,
            'product_id' => $loan?->loan_product_id,
            'category_id' => $loan?->loan_category_id,
            'amount' => $loan?->requested_amount,
            'member_id' => $loan?->member_admission_id,
            'resume_approval_id' => $loanApproval->id,
            'resume_approved_amount' => $request->filled('approved_amount')
                ? (string) round((float) $request->approved_amount)
                : '',
            'resume_comments' => $request->input('comments'),
            'resume_forward_to_user_id' => $request->input('forward_to_user_id'),
        ], fn ($value) => $value !== null && $value !== '');

        return redirect()->to('/member/loan-applications/forms/field-investigation?'.http_build_query($params))
            ->with('success', 'প্রথমে সরেজমিন তদন্ত প্রতিবেদন পূরণ/আপডেট করুন। সংরক্ষণ করলে অনুমোদন স্বয়ংক্রিয়ভাবে সম্পন্ন হবে।');
    }

    /**
     * @return array<string, mixed>
     */
    private function blockListFieldsFromMember(MemberAdmission $member): array
    {
        $dob = $member->date_of_birth;
        if ($dob instanceof \DateTimeInterface) {
            $dob = $dob->format('Y-m-d');
        }

        $addressParts = array_filter([
            $member->present_village_road,
            $member->present_union,
            $member->present_upazila,
            $member->present_district,
        ]);

        return [
            'name_bn' => $member->applicant_name_bn ?? '',
            'father_name' => $member->father_name_bn ?: ($member->father_name_en ?? ''),
            'mother_name' => $member->mother_name_bn ?: ($member->mother_name_en ?? ''),
            'spouse_name' => $member->spouse_name_bn ?: ($member->spouse_name_en ?? ''),
            'dob' => $dob ?? '',
            'nid_number' => $member->nid_number ?: ($member->smart_card_number ?? ''),
            'phone_number' => $member->mobile_number ?? '',
            'address' => $addressParts ? implode(', ', $addressParts) : '',
        ];
    }

    /**
     * @return array<string, list<string>>
     */
    private function blockListValidationRules(): array
    {
        return [
            'block_list.nid_number' => ['required', 'string', 'max:50'],
            'block_list.phone_number' => ['required', 'string', 'regex:/^[0-9]{10,14}$/'],
            'block_list.name_bn' => ['nullable', 'string', 'max:255'],
            'block_list.father_name' => ['nullable', 'string', 'max:255'],
            'block_list.mother_name' => ['nullable', 'string', 'max:255'],
            'block_list.spouse_name' => ['nullable', 'string', 'max:255'],
            'block_list.dob' => ['nullable', 'date', 'before:today'],
            'block_list.address' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    private function blockListValidationMessages(): array
    {
        return [
            'block_list.nid_number.required' => 'Block list-এ যোগ করতে NID নম্বর প্রয়োজন।',
            'block_list.phone_number.required' => 'Block list-এ যোগ করতে ফোন নম্বর প্রয়োজন।',
            'block_list.phone_number.regex' => 'ফোন নম্বর ১০–১৪ অঙ্কের হতে হবে।',
            'comments.required' => 'মন্তব্য লিখতে হবে।',
        ];
    }
}
