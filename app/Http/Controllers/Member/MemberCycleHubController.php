<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\LoanCategory;
use App\Models\LoanProduct;
use App\Models\MemberAdmission;
use App\Models\MemberCategory;
use App\Models\MemberLoanCycle;
use App\Models\Role;
use App\Models\Samity;
use App\Services\CycleRenewalService;
use App\Services\MemberCodeService;
use App\Support\LoanFormVisibility;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
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
        return ! in_array($loan->status, MemberAdmission::closedLoanFormStatuses(), true);
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
            ->orderedByCode()
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

        $recentLoans = LoanApplication::whereIn('branch_id', $branchIds)
            ->with([
                'memberAdmission:id,application_no,applicant_name_bn,applicant_name_en,mobile_number,loan_dofa,customer_photo_path,samity_id,branch_id',
                'memberAdmission.samity:id,samity_name,samity_name_bn,samity_code',
                'branch:id,name,code',
                'samity:id,samity_name,samity_name_bn,samity_code',
                'loanProduct:id,product_name,product_name_bn,product_code',
                'loanCategory:id,category_name,category_name_bn,category_code',
            ])
            ->orderByDesc('id')
            ->limit(10)
            ->get()
            ->map(function ($loan) {
                $admission = $loan->memberAdmission;
                $snapshot = is_array($loan->legacy_member_snapshot) ? $loan->legacy_member_snapshot : [];

                return [
                    'id' => $loan->id,
                    'loan_application_no' => $loan->application_no,
                    'admission_id' => $admission?->id,
                    'member_code' => $admission?->application_no ?: ($snapshot['application_no'] ?? null),
                    'applicant_name_bn' => $admission?->applicant_name_bn ?: ($snapshot['applicant_name_bn'] ?? ''),
                    'applicant_name_en' => $admission?->applicant_name_en ?: ($snapshot['applicant_name_en'] ?? ''),
                    'customer_photo_path' => $admission?->customer_photo_path,
                    'mobile_number' => $admission?->mobile_number ?: ($snapshot['mobile_number'] ?? ''),
                    'samity_name' => $admission?->samity?->samity_name_bn ?: ($admission?->samity?->samity_name ?: ($loan->samity?->samity_name_bn ?: ($loan->samity?->samity_name ?? ''))),
                    'branch_name' => $loan->branch?->name ?: ($admission?->branch?->name ?? ''),
                    'loan_dofa' => (int) ($admission?->loan_dofa ?: 1),
                    'product_name' => $loan->loanProduct?->product_name_bn ?: ($loan->loanProduct?->product_name ?? ''),
                    'category_name' => $loan->loanCategory?->category_name_bn ?: ($loan->loanCategory?->category_name ?? ''),
                    'requested_amount' => $loan->requested_amount,
                    'approved_amount' => $loan->approved_amount,
                    'disbursed_amount' => $loan->disbursed_amount,
                    'status' => $loan->status,
                    'created_at' => $loan->created_at ? $loan->created_at->format('d M Y, h:i A') : null,
                    'created_at_human' => $loan->created_at ? $loan->created_at->diffForHumans() : null,
                ];
            });

        return Inertia::render('Member/CycleHub/Index', [
            'branches' => $branches,
            'samities' => $samities,
            'loanCategories' => $loanCategories,
            'loanProducts' => $loanProducts,
            'recentLoans' => $recentLoans,
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

        $membersQuery = MemberAdmission::masterMembers()->whereIn('branch_id', $targetBranchIds)
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
        $grouped = $membersQuery->groupBy(fn ($row) => $row->branch_id.'|'.($row->application_no ?: $row->id));
        $results = [];

        foreach ($grouped as $appNo => $admissions) {
            $latest = $admissions->sortByDesc('loan_dofa')->first();
            $sisterIds = $latest->sisterAdmissionIds();
            $cycleRows = Schema::hasTable('member_loan_cycles')
                ? MemberLoanCycle::where('master_admission_id', $latest->id)->where('state', '!=', 'discarded')->get() : collect();
            $discardedIds = Schema::hasTable('member_loan_cycles')
                ? MemberLoanCycle::where('master_admission_id', $latest->id)->where('state', 'discarded')->pluck('admission_id')->all() : [];
            $loanCount = LoanApplication::whereIn('member_admission_id', $sisterIds)->count();
            $emptyCycles = MemberAdmission::whereIn('id', $sisterIds)->whereNotIn('id', $discardedIds)->whereNotNull('previous_admission_id')->whereDoesntHave('loanApplications')->count();
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
                'current_dofa' => max((int) ($latest->loan_dofa ?: 1), (int) ($cycleRows->max('number') ?: 1)),
                'cycles_count' => max(1, $loanCount + $emptyCycles),
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

        $canonicalAdmission = $allAdmissions
            ->sortBy(fn ($admission) => [(int) (bool) $admission->previous_admission_id, $admission->id])
            ->first();
        $latestAdmission = $canonicalAdmission ?? $allAdmissions->sortByDesc('loan_dofa')->first();

        // Calculate overall active loan state
        $allLoans = $allAdmissions->flatMap->loanApplications;
        $activeLoans = $allLoans->filter(fn ($loan) => $this->loanIsStillActive($loan));
        $hasActiveLoan = $activeLoans->isNotEmpty();
        $activeLoan = $activeLoans->first();

        // Find the latest disbursed loan that can be repaid
        $disbursedNonRepaidLoan = $allLoans->firstWhere('status', LoanApplication::STATUS_DISBURSED);

        $cycles = $this->buildLoanCycles($allAdmissions, $canonicalAdmission);
        $maxDofa = max((int) ($cycles->max('dofa') ?: 1), (int) ($allAdmissions->max('loan_dofa') ?: 1));
        $nextDofa = $maxDofa + 1;
        $openCycle = Schema::hasTable('member_loan_cycles') ? MemberLoanCycle::where('open_member_id', $latestAdmission->id)->first() : null;

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
                'existing_loan_form' => $activeLoan ? [
                    'id' => $activeLoan->id,
                    'application_no' => $activeLoan->application_no,
                    'status' => $activeLoan->status,
                ] : null,
                'active_loan' => $activeLoan ? [
                    'id' => $activeLoan->id,
                    'application_no' => $activeLoan->application_no,
                    'status' => $activeLoan->status,
                    'amount' => $activeLoan->disbursed_amount ?? $activeLoan->approved_amount ?? $activeLoan->requested_amount,
                ] : null,
                'can_repay' => (bool) ($disbursedNonRepaidLoan !== null),
                'repayable_loan_id' => $disbursedNonRepaidLoan?->id,
                'can_start_next_cycle' => $openCycle !== null || $latestAdmission->hasRepaidLoanHistory(),
                'has_open_cycle' => $openCycle !== null,
                'current_max_dofa' => $maxDofa,
                'next_dofa' => $openCycle?->number ?? $nextDofa,
                'latest_admission_id' => $latestAdmission->id,
            ],
            'cycles' => $cycles,
        ];
    }

    /**
     * One cycle per loan (same member). Leftover cloned admissions stay visible for cleanup.
     */
    private function buildLoanCycles($allAdmissions, ?MemberAdmission $canonicalAdmission): Collection
    {
        $cycles = collect();
        if (Schema::hasTable('member_loan_cycles')) {
            $discarded = MemberLoanCycle::where('state', 'discarded')->pluck('admission_id')->all();
            $allAdmissions = $allAdmissions->reject(fn ($row) => in_array($row->id, $discarded));
        }
        $dofa = 1;
        $allLoans = $allAdmissions->flatMap->loanApplications->sortBy('id')->values();

        foreach ($allLoans as $loan) {
            $admission = $allAdmissions->firstWhere('id', $loan->member_admission_id) ?? $canonicalAdmission;
            if (! $admission) {
                continue;
            }

            $cycles->push($this->cyclePayload($admission, max($dofa, (int) ($admission->loan_dofa ?: $dofa)), [$this->mapLoanForCycle($loan)]));
            $dofa++;
        }

        foreach ($allAdmissions as $admission) {
            if ($admission->loanApplications->isNotEmpty()) {
                continue;
            }

            if ($cycles->isNotEmpty() && ! $admission->previous_admission_id) {
                continue;
            }

            $cycles->push($this->cyclePayload($admission, (int) ($admission->loan_dofa ?: $dofa), []));
            $dofa++;
        }

        return $cycles->values();
    }

    /**
     * @param  array<int, array<string, mixed>>  $loans
     * @return array<string, mixed>
     */
    private function cyclePayload(MemberAdmission $admission, int $dofa, array $loans): array
    {
        $renewal = Schema::hasTable('member_loan_cycles') ? MemberLoanCycle::where('admission_id', $admission->id)->first() : null;

        return [
            'cycle_id' => $renewal?->id,
            'edit_admission_url' => $renewal ? route('member.cycle-hub.renewals.edit', $renewal->id) : null,
            'loan_edit_url' => $renewal ? route('member.cycle-hub.renewals.loan', $renewal->id) : null,
            'admission_id' => $admission->id,
            'loan_id' => $loans[0]['id'] ?? null,
            'dofa' => $renewal?->number ?? $dofa,
            'admission_status' => $admission->status,
            'admission_date' => $admission->admission_date ? Carbon::parse($admission->admission_date)->format('Y-m-d') : null,
            'survey_date' => $admission->survey_date ? Carbon::parse($admission->survey_date)->format('Y-m-d') : null,
            'created_at' => $admission->created_at ? $admission->created_at->format('Y-m-d') : null,
            'is_legacy' => (bool) $admission->is_legacy,
            'is_cloned_admission' => (bool) $admission->previous_admission_id,
            'can_delete_admission' => (bool) $admission->previous_admission_id,
            'family_count' => $admission->familyMembers->count(),
            'assets_count' => $admission->otherAssets->count(),
            'loans' => $loans,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function mapLoanForCycle(LoanApplication $loan): array
    {
        $product = $loan->loanProduct;
        $category = $loan->loanCategory ?? $product?->loanCategory;
        $amount = (float) ($loan->requested_amount ?? 0);
        $visibleFormIds = LoanFormVisibility::visibleFormIdsForShow(
            null,
            (string) $loan->status,
            $product,
            $amount,
            $category
        );

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
            'has_agreement' => in_array(1, $visibleFormIds, true) && ! empty($loan->loan_agreement_data),
            'has_guarantor' => in_array(2, $visibleFormIds, true) && ! empty($loan->guarantor_info),
            'has_investigation' => in_array(4, $visibleFormIds, true) && ! empty($loan->asset_info),
            'has_approval' => in_array(5, $visibleFormIds, true) && ! empty($loan->business_plan),
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

        DB::transaction(function () use ($loan, $user, $request, $repaidAt) {
            // Use the same lock order as cycle form writes.
            $cycle = Schema::hasTable('member_loan_cycles')
                ? MemberLoanCycle::where('loan_id', $loan->id)->lockForUpdate()->first() : null;
            $locked = LoanApplication::whereKey($loan->id)->lockForUpdate()->firstOrFail();
            abort_unless($locked->status === LoanApplication::STATUS_DISBURSED, 422);
            $locked->update([
                'status' => LoanApplication::STATUS_REPAID,
                'repaid_at' => $repaidAt, 'repaid_by' => $user->id,
                'repayment_notes' => $request->input('repayment_notes'),
            ]);
            if ($cycle) {
                $cycle->setRelation('loan', $locked);
                app(CycleRenewalService::class)->snapshot($cycle);
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'ঋণ সফলভাবে পরিশোধিত (Repaid) হিসেবে সংরক্ষণ করা হয়েছে।',
            'loan_id' => $loan->id,
        ]);
    }

    /**
     * Open or create the next cycle survey on the same member (not a second enrollment).
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

        try {
            [$cycle, $reused] = app(CycleRenewalService::class)->start(
                $memberAdmission, $user, $request->integer('source_loan_id') ?: null,
            );
        } catch (ValidationException $e) {
            return response()->json(['message' => collect($e->errors())->flatten()->first()], 422);
        }

        return response()->json([
            'success' => true, 'cloned' => ! $reused,
            'message' => $reused ? 'এই দফার আগের খসড়া আবার খোলা হয়েছে।' : 'নতুন দফার সদস্য ফাইল ও আগের ফর্মগুলো আলাদা করে কপি হয়েছে।',
            'cycle_id' => $cycle->id, 'new_admission_id' => $cycle->admission_id,
            'new_dofa' => $cycle->number,
            'edit_admission_url' => route('member.cycle-hub.renewals.edit', ['cycle' => $cycle->id, 'cycle_renewal' => 1]),
            'loan_create_url' => route('member.cycle-hub.renewals.loan', $cycle->id),
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

        $portfolio = $this->resolveMemberCycleData($admission->id, $user);
        $otherCycles = collect($portfolio['cycles'] ?? [])->map(function (array $cycle) {
            $loan = $cycle['loans'][0] ?? null;

            return [
                'id' => $cycle['admission_id'],
                'loan_id' => $cycle['loan_id'] ?? null,
                'dofa' => $cycle['dofa'],
                'admission_status' => $cycle['admission_status'],
                'loan_status' => $loan['status'] ?? null,
                'loan_amount' => $loan
                    ? ($loan['disbursed_amount'] ?: $loan['approved_amount'] ?: $loan['requested_amount'])
                    : null,
            ];
        })->values();

        $requestedLoanId = (int) $request->input('loan_id');
        $loanApplication = $requestedLoanId > 0
            ? $admission->loanApplications->firstWhere('id', $requestedLoanId)
            : $admission->loanApplications->first();
        abort_if($requestedLoanId > 0 && ! $loanApplication, 404);
        $renewal = Schema::hasTable('member_loan_cycles')
            ? MemberLoanCycle::where('admission_id', $admission->id)->first() : null;
        if ($renewal) {
            abort_if($renewal->state === 'discarded', 404);
            abort_if($requestedLoanId > 0 && (int) $renewal->loan_id !== $requestedLoanId, 404);
            $display = app(CycleRenewalService::class)->display($renewal);
            $loanApplication = $display['loan'];
        }

        $matchedCycle = collect($portfolio['cycles'] ?? [])->first(
            fn (array $cycle) => ($cycle['loan_id'] ?? null) === $loanApplication?->id
        );

        $formSaved = $loanApplication ? LoanFormVisibility::buildFormSavedMap($loanApplication) : [];
        $visibleFormIds = [];
        if ($loanApplication) {
            $product = $loanApplication->loanProduct;
            $category = $loanApplication->loanCategory ?? $product?->loanCategory;
            $visibleFormIds = LoanFormVisibility::visibleFormIdsForShow(
                $user->role?->name,
                (string) $loanApplication->status,
                $product,
                (float) ($loanApplication->requested_amount ?? 0),
                $category
            );
        }

        $canSuperAdminEdit = (bool) ($user && method_exists($user, 'canHeadOfficeDeleteOrEdit') ? $user->canHeadOfficeDeleteOrEdit() : ($user?->has_all_access || $user?->isSuperAdmin() || $user?->isHeadOffice()));

        $memberCategories = $canSuperAdminEdit
            ? MemberCategory::where('is_active', true)->select('id', 'category_name', 'category_name_bn')->orderBy('id')->get()
            : [];

        $loanCategories = $canSuperAdminEdit
            ? LoanCategory::where('is_active', true)
                ->with(['loanProducts' => function ($q) {
                    $q->where('is_active', true)->select('id', 'loan_category_id', 'product_name', 'product_name_bn', 'product_code', 'duration_months', 'min_amount', 'max_amount', 'installment_type');
                }])
                ->select('id', 'category_name', 'category_name_bn', 'category_code')
                ->orderBy('id')
                ->get()
            : [];

        $samities = $canSuperAdminEdit
            ? Samity::where('branch_id', $admission->branch_id)->select('id', 'samity_name', 'samity_name_bn', 'samity_code', 'branch_id')->orderBy('samity_name')->get()
            : [];

        $isOverrideUnlocked = (bool) $request->session()->get("cycle_override_unlocked_{$admission->id}", false);

        return Inertia::render('Member/CycleHub/CycleView', [
            'admission' => $renewal ? $display['admission'] : $admission,
            'cycle' => $renewal ? $renewal->only(['id', 'number', 'revision', 'state', 'loan_id']) : null,
            'loanApplication' => $loanApplication,
            'formSaved' => $formSaved,
            'visibleFormIds' => $visibleFormIds,
            'editableFormIds' => $loanApplication ? ($canSuperAdminEdit && $renewal?->state !== 'closed' ? $visibleFormIds : LoanFormVisibility::editableFormIdsForUser($user->role?->name, $loanApplication->status, $loanApplication->loanProduct, (float) $loanApplication->requested_amount, $loanApplication->loanCategory)) : [],
            'otherCycles' => $otherCycles,
            'currentDofa' => (int) ($renewal?->number ?? $matchedCycle['dofa'] ?? ($admission->loan_dofa ?: 1)),
            'canDeleteAdmission' => (bool) $admission->previous_admission_id,
            'isOverrideUnlocked' => $isOverrideUnlocked,
            'memberCategories' => $memberCategories,
            'loanCategories' => $loanCategories,
            'samities' => $samities,
            'userPermissions' => [
                'canCreateLoan' => $this->canCreateLoan($user),
                'canRepayLoan' => $this->canRepayLoan($user),
                'isFieldOfficer' => $this->isFieldOfficer($user),
                'isBranchUser' => $this->isBranchUserRole($user),
                'canSuperAdminEdit' => ! $renewal && $canSuperAdminEdit,
                'canManageLoan' => $canSuperAdminEdit,
            ],
        ]);
    }

    /**
     * Delete a draft loan application from Cycle Hub
     */
    public function deleteDraftLoan(Request $request, LoanApplication $loan): JsonResponse
    {
        $user = $request->user();
        if (Schema::hasTable('member_loan_cycles') && MemberLoanCycle::where('loan_id', $loan->id)->exists()) {
            return response()->json(['message' => 'এই দফার ফাইল খুলে খসড়া বাতিল করুন।'], 422);
        }

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
        if (Schema::hasTable('member_loan_cycles') && MemberLoanCycle::where('admission_id', $memberAdmission->id)->exists()) {
            return response()->json(['message' => 'এই দফার ফাইল খুলে খসড়া বাতিল করুন।'], 422);
        }

        $branchIds = $this->getAccessibleBranchIds($user);

        if (! in_array((int) $memberAdmission->branch_id, $branchIds, true)) {
            return response()->json(['message' => 'এই ভর্তি আবেদনটি আপনার শাখার নয়।'], 403);
        }

        if (! $memberAdmission->previous_admission_id) {
            return response()->json(['message' => 'মূল সদস্য ভর্তি মুছে ফেলা যাবে না। শুধু খসড়া ঋণ মুছুন, অথবা ভর্তি তথ্য আপডেট করুন।'], 422);
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
