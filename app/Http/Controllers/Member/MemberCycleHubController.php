<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\LoanCategory;
use App\Models\LoanProduct;
use App\Models\MemberAdmission;
use App\Models\MemberFamilyMember;
use App\Models\MemberOtherAsset;
use App\Models\Role;
use App\Models\Samity;
use App\Services\MemberCodeService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class MemberCycleHubController extends Controller
{
    private function isFieldOfficer($user): bool
    {
        $user->loadMissing('role');

        return $user->role?->name === Role::FIELD_OFFICER;
    }

    private function isBranchUserRole($user): bool
    {
        $user->loadMissing('role');

        return $user->role?->name === Role::BRANCH_USER;
    }

    private function canCreateLoan($user): bool
    {
        return $this->isFieldOfficer($user)
            || $this->isBranchUserRole($user)
            || ($user->role?->name === Role::BRANCH_MANAGER)
            || (bool) ($user->has_all_access || $user->isSuperAdmin() || $user->isHeadOffice());
    }

    private function canRepayLoan($user): bool
    {
        return $this->isBranchUserRole($user)
            || ($user->role?->name === Role::BRANCH_MANAGER)
            || (bool) ($user->has_all_access || $user->isSuperAdmin() || $user->isHeadOffice());
    }

    private function getAccessibleBranchIds($user): array
    {
        if ($user->has_all_access || $user->isSuperAdmin() || $user->isHeadOffice()) {
            return Branch::pluck('id')->all();
        }

        if ($user->branch_id) {
            return [(int) $user->branch_id];
        }

        return [];
    }

    /**
     * Check if a specific loan application is currently active/blocking
     */
    private function loanIsStillActive(LoanApplication $loan): bool
    {
        if (in_array($loan->status, [
            LoanApplication::STATUS_REPAID,
            LoanApplication::STATUS_CANCELLED,
            LoanApplication::STATUS_REJECTED,
            LoanApplication::STATUS_DRAFT,
        ], true)) {
            return false;
        }

        if ($loan->status !== LoanApplication::STATUS_DISBURSED) {
            return true;
        }

        // Disbursed loans without explicit repayment are considered active
        return true;
    }

    /**
     * Display the Cycle Hub page
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $branchIds = $this->getAccessibleBranchIds($user);

        $branches = Branch::whereIn('id', $branchIds)
            ->select('id', 'name', 'code')
            ->orderBy('name')
            ->get();

        $samities = Samity::whereIn('branch_id', $branchIds)
            ->select('id', 'samity_name', 'samity_name_bn', 'samity_code', 'branch_id')
            ->orderBy('samity_name')
            ->get();

        $loanCategories = LoanCategory::where('is_active', true)
            ->select('id', 'category_name', 'category_name_bn', 'category_code')
            ->get();

        $loanProducts = LoanProduct::where('is_active', true)
            ->select('id', 'product_name', 'product_name_bn', 'product_code', 'loan_category_id', 'min_amount', 'max_amount', 'duration_months')
            ->get();

        $initialMemberId = $request->input('member_id');
        $initialMemberData = null;

        if ($initialMemberId) {
            $initialMemberData = $this->resolveMemberCycleData((int) $initialMemberId, $user);
        }

        return Inertia::render('Member/CycleHub/Index', [
            'branches' => $branches,
            'samities' => $samities,
            'loanCategories' => $loanCategories,
            'loanProducts' => $loanProducts,
            'initialMemberData' => $initialMemberData,
            'userPermissions' => [
                'canCreateLoan' => $this->canCreateLoan($user),
                'canRepayLoan' => $this->canRepayLoan($user),
                'isFieldOfficer' => $this->isFieldOfficer($user),
                'isBranchUser' => $this->isBranchUserRole($user),
            ],
        ]);
    }

    /**
     * Search members for auto-complete
     */
    public function search(Request $request): JsonResponse
    {
        $user = $request->user();
        $search = $request->input('query', '');
        $branchId = $request->input('branch_id', $user->branch_id);

        if (empty(trim($search))) {
            return response()->json([]);
        }

        $branchIds = $this->getAccessibleBranchIds($user);
        if ($branchId && in_array((int) $branchId, $branchIds, true)) {
            $targetBranchIds = [(int) $branchId];
        } else {
            $targetBranchIds = $branchIds;
        }

        $membersQuery = MemberAdmission::whereIn('branch_id', $targetBranchIds)
            ->where(function ($query) use ($search) {
                MemberCodeService::applyAdmissionSearch($query, $search);
            })
            ->with(['branch:id,name,code', 'samity:id,samity_name,samity_name_bn,samity_code'])
            ->select([
                'id',
                'application_no',
                'applicant_name_bn',
                'applicant_name_en',
                'father_name_bn',
                'father_name_en',
                'spouse_name_bn',
                'spouse_name_en',
                'mobile_number',
                'nid_number',
                'branch_id',
                'samity_id',
                'status',
                'loan_dofa',
                'created_at',
            ])
            ->orderBy('created_at', 'desc')
            ->limit(25)
            ->get();

        // Group by application_no to get distinct members
        $grouped = $membersQuery->groupBy('application_no');
        $results = [];

        foreach ($grouped as $appNo => $admissions) {
            $latest = $admissions->sortByDesc('loan_dofa')->first();
            $results[] = [
                'id' => $latest->id,
                'application_no' => $latest->application_no,
                'applicant_name_bn' => $latest->applicant_name_bn,
                'applicant_name_en' => $latest->applicant_name_en,
                'guardian_name' => $latest->spouse_name_bn ?: $latest->father_name_bn ?: $latest->spouse_name_en ?: $latest->father_name_en,
                'mobile_number' => $latest->mobile_number,
                'nid_number' => $latest->nid_number,
                'samity_name' => $latest->samity?->samity_name_bn ?: $latest->samity?->samity_name,
                'branch_name' => $latest->branch?->name,
                'current_dofa' => $latest->loan_dofa ?? 1,
                'cycles_count' => $admissions->count(),
            ];
        }

        return response()->json($results);
    }

    /**
     * Get complete cycle history and portfolio for a member
     */
    public function getMemberDetails(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $data = $this->resolveMemberCycleData($id, $user);

        if (! $data) {
            return response()->json(['message' => 'সদস্য পাওয়া যায়নি।'], 404);
        }

        return response()->json($data);
    }

    /**
     * Build the structured cycle data for a member
     */
    private function resolveMemberCycleData(int $memberAdmissionId, $user): ?array
    {
        $targetAdmission = MemberAdmission::find($memberAdmissionId);
        if (! $targetAdmission) {
            return null;
        }

        $branchIds = $this->getAccessibleBranchIds($user);
        if (! in_array((int) $targetAdmission->branch_id, $branchIds, true)) {
            return null;
        }

        // Find all admissions sharing the same application_no and branch
        $memberCode = $targetAdmission->application_no;
        $branchId = $targetAdmission->branch_id;

        $allAdmissions = MemberAdmission::where('branch_id', $branchId)
            ->where('application_no', $memberCode)
            ->with([
                'branch:id,name,code',
                'samity:id,samity_name,samity_name_bn,samity_code',
                'memberCategory:id,category_name,category_name_bn',
                'familyMembers',
                'otherAssets',
                'loanApplications' => function ($q) {
                    $q->with([
                        'loanProduct:id,product_name,product_name_bn,product_code,duration_months',
                        'loanCategory:id,category_name,category_name_bn,category_code',
                        'disbursedBy:id,name',
                        'repaidBy:id,name',
                    ])->orderBy('created_at', 'desc');
                },
            ])
            ->orderBy('loan_dofa', 'asc')
            ->orderBy('created_at', 'asc')
            ->get();

        if ($allAdmissions->isEmpty()) {
            $allAdmissions = collect([$targetAdmission]);
        }

        $latestAdmission = $allAdmissions->sortByDesc('loan_dofa')->first();

        // Calculate overall active loan state
        $allLoans = $allAdmissions->flatMap->loanApplications;
        $activeLoans = $allLoans->filter(fn ($loan) => $this->loanIsStillActive($loan));
        $hasActiveLoan = $activeLoans->isNotEmpty();
        $activeLoan = $activeLoans->first();

        // Find the latest disbursed loan that can be repaid
        $disbursedNonRepaidLoan = $allLoans->firstWhere('status', LoanApplication::STATUS_DISBURSED);

        // Highest dofa
        $maxDofa = (int) ($allAdmissions->max('loan_dofa') ?: 1);
        $nextDofa = $maxDofa + 1;

        // Construct structured cycle list
        $cycles = $allAdmissions->map(function ($admission) {
            $dofa = (int) ($admission->loan_dofa ?: 1);
            $loans = $admission->loanApplications->map(function ($loan) {
                return [
                    'id' => $loan->id,
                    'application_no' => $loan->application_no,
                    'status' => $loan->status,
                    'requested_amount' => $loan->requested_amount,
                    'approved_amount' => $loan->approved_amount,
                    'disbursed_amount' => $loan->disbursed_amount,
                    'product_name' => $loan->loanProduct?->product_name_bn ?: $loan->loanProduct?->product_name,
                    'product_code' => $loan->loanProduct?->product_code,
                    'category_name' => $loan->loanCategory?->category_name_bn ?: $loan->loanCategory?->category_name,
                    'duration_months' => $loan->loan_term_months ?? $loan->loanProduct?->duration_months,
                    'disbursed_at' => $loan->disbursed_at ? Carbon::parse($loan->disbursed_at)->format('Y-m-d') : null,
                    'disbursed_by_name' => $loan->disbursedBy?->name,
                    'repaid_at' => $loan->repaid_at ? Carbon::parse($loan->repaid_at)->format('Y-m-d') : null,
                    'repaid_by_name' => $loan->repaidBy?->name,
                    'repayment_notes' => $loan->repayment_notes,
                    'created_at' => $loan->created_at ? $loan->created_at->format('Y-m-d') : null,
                    'has_agreement' => ! empty($loan->loan_agreement_data),
                    'has_guarantor' => ! empty($loan->guarantor_info),
                    'has_investigation' => ! empty($loan->asset_info),
                    'has_approval' => ! empty($loan->business_plan),
                ];
            });

            return [
                'admission_id' => $admission->id,
                'dofa' => $dofa,
                'admission_status' => $admission->status,
                'admission_date' => $admission->admission_date ? Carbon::parse($admission->admission_date)->format('Y-m-d') : null,
                'survey_date' => $admission->survey_date ? Carbon::parse($admission->survey_date)->format('Y-m-d') : null,
                'created_at' => $admission->created_at ? $admission->created_at->format('Y-m-d') : null,
                'is_legacy' => (bool) $admission->is_legacy,
                'family_count' => $admission->familyMembers->count(),
                'assets_count' => $admission->otherAssets->count(),
                'loans' => $loans,
            ];
        })->values();

        return [
            'member' => [
                'id' => $latestAdmission->id,
                'application_no' => $latestAdmission->application_no,
                'applicant_name_bn' => $latestAdmission->applicant_name_bn,
                'applicant_name_en' => $latestAdmission->applicant_name_en,
                'father_name_bn' => $latestAdmission->father_name_bn,
                'father_name_en' => $latestAdmission->father_name_en,
                'mother_name_bn' => $latestAdmission->mother_name_bn,
                'spouse_name_bn' => $latestAdmission->spouse_name_bn,
                'mobile_number' => $latestAdmission->mobile_number,
                'nid_number' => $latestAdmission->nid_number,
                'gender' => $latestAdmission->gender,
                'marital_status' => $latestAdmission->marital_status,
                'present_address' => trim("{$latestAdmission->present_village_road}, {$latestAdmission->present_union}, {$latestAdmission->present_upazila}, {$latestAdmission->present_district}"),
                'branch_id' => $latestAdmission->branch_id,
                'branch_name' => $latestAdmission->branch?->name,
                'branch_code' => $latestAdmission->branch?->code,
                'samity_id' => $latestAdmission->samity_id,
                'samity_name' => $latestAdmission->samity?->samity_name_bn ?: $latestAdmission->samity?->samity_name,
                'samity_code' => $latestAdmission->samity?->samity_code,
                'category_name' => $latestAdmission->memberCategory?->category_name_bn ?: $latestAdmission->memberCategory?->category_name,
                'customer_photo_path' => $latestAdmission->customer_photo_path,
                'has_active_loan' => $hasActiveLoan,
                'active_loan' => $activeLoan ? [
                    'id' => $activeLoan->id,
                    'application_no' => $activeLoan->application_no,
                    'status' => $activeLoan->status,
                    'amount' => $activeLoan->disbursed_amount ?? $activeLoan->approved_amount ?? $activeLoan->requested_amount,
                ] : null,
                'can_repay' => (bool) ($disbursedNonRepaidLoan !== null),
                'repayable_loan_id' => $disbursedNonRepaidLoan?->id,
                'can_start_next_cycle' => ! $hasActiveLoan,
                'current_max_dofa' => $maxDofa,
                'next_dofa' => $nextDofa,
                'latest_admission_id' => $latestAdmission->id,
            ],
            'cycles' => $cycles,
        ];
    }

    /**
     * Mark a disbursed loan as repaid (settled)
     */
    public function repayLoan(Request $request, LoanApplication $loan): JsonResponse
    {
        $user = $request->user();

        if (! $this->canRepayLoan($user)) {
            return response()->json(['message' => 'আপনার ঋণ পরিশোধ সম্পন্ন করার অনুমতি নেই।'], 403);
        }

        $branchIds = $this->getAccessibleBranchIds($user);
        if (! in_array((int) $loan->branch_id, $branchIds, true)) {
            return response()->json(['message' => 'এই ঋণটি আপনার শাখার নয়।'], 403);
        }

        if ($loan->status !== LoanApplication::STATUS_DISBURSED) {
            return response()->json(['message' => 'শুধুমাত্র বিতরণকৃত (Disbursed) ঋণ পরিশোধ করা যাবে।'], 422);
        }

        $request->validate([
            'repaid_at' => 'nullable|date',
            'repayment_notes' => 'nullable|string|max:500',
        ]);

        $repaidAt = $request->input('repaid_at') ? Carbon::parse($request->input('repaid_at')) : now();

        $loan->update([
            'status' => LoanApplication::STATUS_REPAID,
            'repaid_at' => $repaidAt,
            'repaid_by' => $user->id,
            'repayment_notes' => $request->input('repayment_notes'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'ঋণ সফলভাবে পরিশোধিত (Repaid) হিসেবে সংরক্ষণ করা হয়েছে।',
            'loan_id' => $loan->id,
        ]);
    }

    /**
     * Auto-clone admission form for the next cycle and prepare for new loan application
     */
    public function startNextCycle(Request $request, MemberAdmission $memberAdmission): JsonResponse
    {
        $user = $request->user();

        if (! $this->canCreateLoan($user)) {
            return response()->json(['message' => 'আপনার পরবর্তী সাইকেল ঋণ আবেদন শুরু করার অনুমতি নেই।'], 403);
        }

        $branchIds = $this->getAccessibleBranchIds($user);
        if (! in_array((int) $memberAdmission->branch_id, $branchIds, true)) {
            return response()->json(['message' => 'এই সদস্য আপনার শাখার নয়।'], 403);
        }

        // Check if member already has an active loan
        $hasActive = LoanApplication::where('member_admission_id', $memberAdmission->id)
            ->whereNotIn('status', [
                LoanApplication::STATUS_REPAID,
                LoanApplication::STATUS_CANCELLED,
                LoanApplication::STATUS_REJECTED,
                LoanApplication::STATUS_DRAFT,
            ])
            ->exists();

        if ($hasActive) {
            return response()->json([
                'message' => 'সদস্যের সক্রিয় ঋণ চলমান রয়েছে। ঋণ পরিশোধের পর পরবর্তী সাইকেল আবেদন করা যাবে।',
            ], 422);
        }

        // Calculate next dofa
        $maxDofa = (int) (MemberAdmission::where('branch_id', $memberAdmission->branch_id)
            ->where('application_no', $memberAdmission->application_no)
            ->max('loan_dofa') ?: ($memberAdmission->loan_dofa ?: 1));

        $newDofa = $maxDofa + 1;

        // Perform cloning inside a transaction
        $newAdmission = DB::transaction(function () use ($memberAdmission, $newDofa, $user) {
            $data = $memberAdmission->replicate([
                'id',
                'created_at',
                'updated_at',
                'status',
                'submitted_at',
                'submitted_by',
                'reviewed_at',
                'reviewed_by',
                'returned_at',
                'returned_by',
                'rejection_reason',
                'revision_comments',
                'revision_count',
                'printed_at',
            ])->toArray();

            $data['application_no'] = $memberAdmission->application_no;
            $data['previous_admission_id'] = $memberAdmission->id;
            $data['loan_dofa'] = $newDofa;
            $data['is_legacy'] = true;
            $data['status'] = 'draft'; // Renewal admissions start as draft until finalized with loan
            $data['survey_date'] = now()->toDateString();
            $data['admission_date'] = $memberAdmission->admission_date ?: now()->toDateString();
            $data['created_by'] = $user->id;
            $data['assigned_officer_id'] = $user->id;

            $createdAdmission = MemberAdmission::create($data);

            // Clone family members
            foreach ($memberAdmission->familyMembers as $family) {
                $familyData = $family->replicate(['id', 'created_at', 'updated_at', 'member_admission_id'])->toArray();
                $familyData['member_admission_id'] = $createdAdmission->id;
                MemberFamilyMember::create($familyData);
            }

            // Clone other assets
            foreach ($memberAdmission->otherAssets as $asset) {
                $assetData = $asset->replicate(['id', 'created_at', 'updated_at', 'member_admission_id'])->toArray();
                $assetData['member_admission_id'] = $createdAdmission->id;
                MemberOtherAsset::create($assetData);
            }

            return $createdAdmission;
        });

        return response()->json([
            'success' => true,
            'message' => "দফা {$newDofa} এর জন্য সদস্যের ভর্তি ফর্ম সফলভাবে ক্লোন করা হয়েছে।",
            'new_admission_id' => $newAdmission->id,
            'new_dofa' => $newDofa,
            'edit_admission_url' => route('member-admissions.edit', ['memberAdmission' => $newAdmission->id, 'cycle_renewal' => 1]),
            'loan_create_url' => route('member.loan-applications.form-selection', ['member_id' => $newAdmission->id]),
        ]);
    }

    /**
     * Display unified single-page dossier for a specific cycle (all admission & loan forms together)
     */
    public function showCycle(Request $request, int $admissionId): Response
    {
        $user = $request->user();
        $admission = MemberAdmission::with([
            'branch:id,name,code',
            'samity:id,samity_name,samity_name_bn,samity_code',
            'memberCategory:id,category_name,category_name_bn',
            'familyMembers',
            'otherAssets',
            'approvals.user:id,name',
            'createdBy:id,name',
            'submittedBy:id,name',
            'assignedOfficer:id,name',
            'loanApplications' => function ($q) {
                $q->with([
                    'loanProduct',
                    'loanCategory',
                    'branch',
                    'samity',
                    'disbursedBy:id,name',
                    'repaidBy:id,name',
                    'submittedBy:id,name',
                ])->orderBy('created_at', 'desc');
            },
        ])->findOrFail($admissionId);

        $branchIds = $this->getAccessibleBranchIds($user);
        if (! in_array((int) $admission->branch_id, $branchIds, true)) {
            abort(403, 'এই সদস্য আপনার শাখার নয়।');
        }

        // Get all sister cycles for quick switching
        $otherCycles = MemberAdmission::where('branch_id', $admission->branch_id)
            ->where('application_no', $admission->application_no)
            ->with(['loanApplications:id,member_admission_id,status,requested_amount,disbursed_amount'])
            ->orderBy('loan_dofa', 'asc')
            ->select('id', 'application_no', 'loan_dofa', 'status', 'admission_date', 'created_at')
            ->get()
            ->map(function ($c) {
                $loan = $c->loanApplications->first();

                return [
                    'id' => $c->id,
                    'dofa' => (int) ($c->loan_dofa ?: 1),
                    'admission_status' => $c->status,
                    'loan_status' => $loan?->status,
                    'loan_amount' => $loan ? ($loan->disbursed_amount ?: $loan->requested_amount) : null,
                ];
            });

        $loanApplication = $admission->loanApplications->first();
        $formSaved = $loanApplication ? \App\Support\LoanFormVisibility::buildFormSavedMap($loanApplication) : [];

        return Inertia::render('Member/CycleHub/CycleView', [
            'admission' => $admission,
            'loanApplication' => $loanApplication,
            'formSaved' => $formSaved,
            'otherCycles' => $otherCycles,
            'currentDofa' => (int) ($admission->loan_dofa ?: 1),
            'userPermissions' => [
                'canCreateLoan' => $this->canCreateLoan($user),
                'canRepayLoan' => $this->canRepayLoan($user),
                'isFieldOfficer' => $this->isFieldOfficer($user),
                'isBranchUser' => $this->isBranchUserRole($user),
            ],
        ]);
    }

    /**
     * Delete a draft loan application from Cycle Hub
     */
    public function deleteDraftLoan(Request $request, LoanApplication $loan): JsonResponse
    {
        $user = $request->user();
        $branchIds = $this->getAccessibleBranchIds($user);

        if (! in_array((int) $loan->branch_id, $branchIds, true)) {
            return response()->json(['message' => 'এই ঋণ আবেদনটি আপনার শাখার নয়।'], 403);
        }

        if ($loan->status !== LoanApplication::STATUS_DRAFT) {
            return response()->json(['message' => 'শুধুমাত্র খসড়া (Draft) ঋণ আবেদন মুছে ফেলা যাবে।'], 422);
        }

        $admissionId = $loan->member_admission_id;
        $admission = MemberAdmission::find($admissionId);

        DB::transaction(function () use ($loan) {
            $loan->approvals()->delete();
            $loan->delete();
        });

        $updatedData = $admission ? $this->resolveMemberCycleData($admission->id, $user) : null;

        return response()->json([
            'success' => true,
            'message' => 'খসড়া ঋণ আবেদনটি সফলভাবে মুছে ফেলা হয়েছে।',
            'memberData' => $updatedData,
            'redirect_url' => $admission ? route('member.cycle-hub.index', ['member_id' => $admission->id]) : route('member.cycle-hub.index'),
        ]);
    }

    /**
     * Delete a draft cycle admission from Cycle Hub
     */
    public function deleteDraftAdmission(Request $request, MemberAdmission $memberAdmission): JsonResponse
    {
        $user = $request->user();
        $branchIds = $this->getAccessibleBranchIds($user);

        if (! in_array((int) $memberAdmission->branch_id, $branchIds, true)) {
            return response()->json(['message' => 'এই ভর্তি আবেদনটি আপনার শাখার নয়।'], 403);
        }

        if ($memberAdmission->hasDisbursedLoan()) {
            return response()->json(['message' => 'বিতরণকৃত ঋণ সম্বলিত ভর্তি রেকর্ড মুছে ফেলা যাবে না।'], 422);
        }

        // Allow deleting any cycle admission without active or disbursed loans (e.g. empty cycle without loans or draft)
        $hasActiveOrDisbursedLoan = $memberAdmission->loanApplications()
            ->whereNotIn('status', [LoanApplication::STATUS_DRAFT, LoanApplication::STATUS_REJECTED, LoanApplication::STATUS_CANCELLED])
            ->exists();

        if ($hasActiveOrDisbursedLoan) {
            return response()->json(['message' => 'এই সাইকেলে সক্রিয় বা বিতরণকৃত ঋণ চলমান রয়েছে, মুছে ফেলা যাবে না।'], 422);
        }

        $prevAdmissionId = $memberAdmission->previous_admission_id;
        $applicationNo = $memberAdmission->application_no;
        $branchId = $memberAdmission->branch_id;

        DB::transaction(function () use ($memberAdmission) {
            // Delete any draft loans attached to this admission
            foreach ($memberAdmission->loanApplications as $loan) {
                if ($loan->status === LoanApplication::STATUS_DRAFT) {
                    $loan->approvals()->delete();
                    $loan->delete();
                }
            }

            $memberAdmission->familyMembers()->delete();
            $memberAdmission->otherAssets()->delete();
            $memberAdmission->approvals()->delete();
            $memberAdmission->delete();
        });

        // Find fallback target admission for this member to reload details
        $fallbackAdmission = null;
        if ($prevAdmissionId) {
            $fallbackAdmission = MemberAdmission::find($prevAdmissionId);
        }
        if (! $fallbackAdmission) {
            $fallbackAdmission = MemberAdmission::where('branch_id', $branchId)
                ->where('application_no', $applicationNo)
                ->orderBy('loan_dofa', 'desc')
                ->first();
        }

        $updatedData = $fallbackAdmission ? $this->resolveMemberCycleData($fallbackAdmission->id, $user) : null;

        return response()->json([
            'success' => true,
            'message' => 'খসড়া ভর্তি আবেদনটি সফলভাবে মুছে ফেলা হয়েছে।',
            'memberData' => $updatedData,
            'redirect_url' => $fallbackAdmission ? route('member.cycle-hub.index', ['member_id' => $fallbackAdmission->id]) : route('member.cycle-hub.index'),
        ]);
    }
}

