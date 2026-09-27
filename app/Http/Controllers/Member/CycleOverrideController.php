<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\LoanCategory;
use App\Models\LoanMember;
use App\Models\LoanProduct;
use App\Models\MemberAdmission;
use App\Models\MemberCategory;
use App\Models\Samity;
use App\Services\MemberAdmissionLoanSyncService;
use App\Support\LoanFormVisibility;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Dedicated controller for Super Admin & Head Office override of Cycle Hub admissions and loans.
 * Allows editing admission & loan profiles in ANY status with PIN verification, auto-syncing everywhere.
 */
class CycleOverrideController extends Controller
{
    /**
     * Check if user is authorized (Super Admin or Head Office, strictly not CSO).
     */
    protected function isAuthorizedUser(?object $user): bool
    {
        if (! $user) {
            return false;
        }

        if (method_exists($user, 'isCso') && $user->isCso()) {
            return false;
        }

        if (method_exists($user, 'canHeadOfficeDeleteOrEdit')) {
            return $user->canHeadOfficeDeleteOrEdit();
        }

        return (bool) ($user->has_all_access || (method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) || (method_exists($user, 'isHeadOffice') && $user->isHeadOffice()));
    }

    /**
     * Verify provided PIN or password against user account.
     */
    protected function verifyPin(Request $request): bool
    {
        $user = $request->user();
        if (! $this->isAuthorizedUser($user)) {
            return false;
        }

        $credential = (string) ($request->input('pin') ?? $request->input('password') ?? '');
        if ($credential === '') {
            return false;
        }

        // 1. User login password
        if (Hash::check($credential, $user->password)) {
            return true;
        }

        // 2. User personal PIN
        if (filled($user->pin) && hash_equals((string) $user->pin, $credential)) {
            return true;
        }

        // 3. Super Admin delete PIN (config)
        if (method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) {
            $expected = (string) config('app.superadmin_delete_pin', '8934');
            if ($expected !== '' && hash_equals($expected, $credential)) {
                return true;
            }
        }

        return false;
    }

    protected function isSessionUnlocked(Request $request, int $admissionId): bool
    {
        if (! $request->hasSession()) {
            return false;
        }

        return (bool) $request->session()->get("cycle_override_unlocked_{$admissionId}", false);
    }

    protected function markSessionUnlocked(Request $request, int $admissionId): void
    {
        if ($request->hasSession()) {
            $request->session()->put("cycle_override_unlocked_{$admissionId}", true);
        }
    }

    /**
     * Unlock session for cycle override using PIN.
     */
    public function unlock(Request $request, int $admissionId): JsonResponse
    {
        $user = $request->user();
        if (! $this->isAuthorizedUser($user)) {
            return response()->json([
                'success' => false,
                'message' => 'শুধুমাত্র সুপার অ্যাডমিন বা হেড অফিস এই সুবিধা ব্যবহারের অনুমতি রাখেন।',
            ], 403);
        }

        if (! $this->verifyPin($request)) {
            return response()->json([
                'success' => false,
                'message' => 'প্রদত্ত পিন (PIN) বা পাসওয়ার্ড সঠিক নয়।',
            ], 422);
        }

        $this->markSessionUnlocked($request, $admissionId);

        return response()->json([
            'success' => true,
            'message' => 'সফলভাবে এডিট আনলক করা হয়েছে।',
            'is_unlocked' => true,
        ]);
    }

    /**
     * Get lookup metadata for editing (categories, products, samities).
     */
    public function getMetadata(Request $request, int $admissionId): JsonResponse
    {
        $user = $request->user();
        if (! $this->isAuthorizedUser($user)) {
            return response()->json(['message' => 'অনুমতি নেই।'], 403);
        }

        $admission = MemberAdmission::with(['samity', 'memberCategory', 'branch'])->findOrFail($admissionId);

        $memberCategories = MemberCategory::where('is_active', true)
            ->select('id', 'category_name', 'category_name_bn')
            ->orderBy('id')
            ->get();

        $loanCategories = LoanCategory::where('is_active', true)
            ->with(['loanProducts' => function ($q) {
                $q->where('is_active', true)->select('id', 'loan_category_id', 'product_name', 'product_name_bn', 'product_code', 'duration_months', 'min_amount', 'max_amount', 'installment_type');
            }])
            ->select('id', 'category_name', 'category_name_bn', 'category_code')
            ->orderBy('id')
            ->get();

        $samities = Samity::where('branch_id', $admission->branch_id)
            ->select('id', 'samity_name', 'samity_name_bn', 'samity_code', 'branch_id')
            ->orderBy('samity_name')
            ->get();

        return response()->json([
            'success' => true,
            'is_unlocked' => $this->isSessionUnlocked($request, $admissionId),
            'memberCategories' => $memberCategories,
            'loanCategories' => $loanCategories,
            'samities' => $samities,
        ]);
    }

    /**
     * Comprehensive Super Admin / Head Office update of Cycle Admission and/or Loan with auto-sync.
     */
    public function update(Request $request, int $admissionId): JsonResponse
    {
        $user = $request->user();
        if (! $this->isAuthorizedUser($user)) {
            return response()->json([
                'success' => false,
                'message' => 'শুধুমাত্র সুপার অ্যাডমিন বা হেড অফিস এই সুবিধা ব্যবহারের অনুমতি রাখেন।',
            ], 403);
        }

        // Verify PIN if session is not already unlocked
        if (! $this->isSessionUnlocked($request, $admissionId) && ! $this->verifyPin($request)) {
            return response()->json([
                'success' => false,
                'message' => 'আপনার পিন (PIN) বা পাসওয়ার্ড সঠিক নয়।',
            ], 422);
        }

        // Keep session unlocked for current session
        $this->markSessionUnlocked($request, $admissionId);

        $admission = MemberAdmission::with(['samity', 'familyMembers', 'otherAssets', 'loanApplications'])->findOrFail($admissionId);
        $syncService = app(MemberAdmissionLoanSyncService::class);

        $admissionData = $request->input('admission');
        $loanData = $request->input('loan');
        $loanId = (int) ($request->input('loan_id') ?: ($loanData['id'] ?? 0));
        $autoSyncCategory = $request->boolean('auto_sync_category', true);

        DB::beginTransaction();
        try {
            $admissionUpdated = false;
            $oldMemberCategoryId = $admission->member_category_id;

            // 1. Update Member Admission if provided
            if (is_array($admissionData) && ! empty($admissionData)) {
                $updatableAdmissionFields = [
                    'member_category_id',
                    'application_no',
                    'applicant_name_bn',
                    'applicant_name_en',
                    'father_name_bn',
                    'father_name_en',
                    'mother_name_bn',
                    'mother_name_en',
                    'spouse_name_bn',
                    'spouse_name_en',
                    'mobile_number',
                    'alternative_mobile',
                    'nid_number',
                    'smart_card_number',
                    'birth_certificate_number',
                    'date_of_birth',
                    'gender',
                    'marital_status',
                    'present_village_road',
                    'present_union',
                    'present_upazila',
                    'present_district',
                    'present_post_code',
                    'permanent_village_road',
                    'permanent_union',
                    'permanent_upazila',
                    'permanent_district',
                    'permanent_post_code',
                    'monthly_income',
                    'monthly_expense',
                    'monthly_savings',
                    'total_land_amount',
                    'total_land_value',
                    'cultivable_land_amount',
                    'cultivable_land_value',
                    'non_cultivable_land_amount',
                    'non_cultivable_land_value',
                    'house_type',
                    'mud_house_count',
                    'tin_house_count',
                    'brick_house_count',
                    'semi_brick_house_count',
                    'cow_buffalo_count',
                    'goat_sheep_count',
                    'duck_chicken_count',
                    'project_name',
                    'estimated_annual_project_income',
                    'business_details',
                    'job_details',
                    'other_income_details',
                    'samity_id',
                    'status',
                    'admission_date',
                    'survey_date',
                    'loan_dofa',
                ];

                $filteredAdmission = [];
                foreach ($updatableAdmissionFields as $field) {
                    if (array_key_exists($field, $admissionData)) {
                        $val = $admissionData[$field];
                        if ($val === '') {
                            $val = null;
                        }
                        $filteredAdmission[$field] = $val;
                    }
                }

                if (! empty($filteredAdmission)) {
                    $admission->update($filteredAdmission);
                    $admission->refresh();
                    $admissionUpdated = true;
                }
            }

            // 2. Find or match the Loan Application for this cycle
            $loan = null;
            if ($loanId > 0) {
                $loan = LoanApplication::find($loanId);
            }
            if (! $loan) {
                $loan = $admission->loanApplications->first();
            }

            // 3. Auto-sync Category if member category changed and requested
            $newMemberCategoryId = $admission->member_category_id;
            if ($loan && $autoSyncCategory && $newMemberCategoryId && $newMemberCategoryId != $oldMemberCategoryId) {
                $newCat = MemberCategory::find($newMemberCategoryId);
                if ($newCat) {
                    // Try to find matching LoanCategory
                    $matchingLoanCat = LoanCategory::where('is_active', true)
                        ->where(function ($q) use ($newCat) {
                            $q->where('category_name', $newCat->category_name)
                                ->orWhere('category_name_bn', $newCat->category_name_bn)
                                ->orWhere('category_name', 'like', "%{$newCat->category_name}%");
                        })
                        ->first();

                    if ($matchingLoanCat) {
                        $loan->loan_category_id = $matchingLoanCat->id;
                        // Select default product of this category if current product belongs to old category
                        $matchingProduct = LoanProduct::where('loan_category_id', $matchingLoanCat->id)
                            ->where('is_active', true)
                            ->first();

                        if ($matchingProduct) {
                            $loan->loan_product_id = $matchingProduct->id;
                            if ($matchingProduct->duration_months) {
                                $loan->loan_term_months = $matchingProduct->duration_months;
                            }
                        }

                        // Update business plan category name
                        $bp = is_array($loan->business_plan) ? $loan->business_plan : [];
                        $bp['category_name'] = $matchingLoanCat->category_name_bn ?: $matchingLoanCat->category_name;
                        $loan->business_plan = $bp;
                        $loan->save();
                    }
                }
            }

            // 4. Update Loan Application if provided (in ANY status)
            if ($loan && is_array($loanData) && ! empty($loanData)) {
                $updatableLoanFields = [
                    'loan_category_id',
                    'loan_product_id',
                    'requested_amount',
                    'approved_amount',
                    'disbursed_amount',
                    'installment_amount',
                    'number_of_installments',
                    'loan_term_months',
                    'status',
                    'purpose_of_loan',
                    'samity_id',
                ];

                $filteredLoan = [];
                foreach ($updatableLoanFields as $field) {
                    if (array_key_exists($field, $loanData)) {
                        $val = $loanData[$field];
                        if ($val === '') {
                            $val = null;
                        }
                        $filteredLoan[$field] = $val;
                    }
                }

                // If category explicitly updated, sync category_name in business_plan
                if (! empty($filteredLoan['loan_category_id'])) {
                    $selectedLoanCategory = LoanCategory::find($filteredLoan['loan_category_id']);
                    if ($selectedLoanCategory) {
                        $bp = is_array($loan->business_plan) ? $loan->business_plan : [];
                        $bp['category_name'] = $selectedLoanCategory->category_name_bn ?: $selectedLoanCategory->category_name;
                        $loan->business_plan = $bp;
                    }
                }

                // Update amounts in business plan if passed
                if (! empty($filteredLoan['approved_amount']) || ! empty($filteredLoan['requested_amount'])) {
                    $amt = $filteredLoan['approved_amount'] ?? $filteredLoan['requested_amount'];
                    $bp = is_array($loan->business_plan) ? $loan->business_plan : [];
                    $bp['approved_amount'] = $amt;
                    $bp['applied_amount'] = $amt;
                    $loan->business_plan = $bp;
                }

                if (! empty($filteredLoan)) {
                    $loan->update($filteredLoan);
                    $loan->refresh();
                }
            }

            // 5. Force sync everywhere
            // Sync identity to sister cycles
            $admission->loadMissing(['samity', 'familyMembers', 'otherAssets', 'memberCategory']);
            if (! $admission->previous_admission_id) {
                $admission->syncIdentityToSisterCycles();
            }

            // Force overlay onto all bound loans (including disbursed & all statuses)
            $syncService->syncBoundLoans($admission, includeDisbursedAndAll: true);

            // Specifically ensure this cycle's loan has all latest snapshots & member info
            if ($loan) {
                $syncService->overlayOnLoan($loan, $admission);
                $loan->save();

                // Sync LoanMember table
                LoanMember::where('loan_application_id', $loan->id)->update(array_filter([
                    'member_code' => $admission->application_no,
                    'member_name' => $admission->applicant_name_bn ?: $admission->applicant_name_en,
                    'member_mobile' => $admission->mobile_number,
                    'somiti_name' => $admission->samity?->samity_name_bn ?: $admission->samity?->samity_name,
                    'somiti_code' => $admission->samity?->samity_code,
                    'project_name' => $admission->project_name,
                ]));
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'সদস্য ভর্তি ও ঋণের তথ্য সফলভাবে আপডেট এবং সকল ফর্মে সিঙ্ক করা হয়েছে।',
                'admission_id' => $admission->id,
                'loan_id' => $loan?->id,
            ]);

        } catch (\Throwable $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'আপডেট করতে ত্রুটি হয়েছে: '.$e->getMessage(),
            ], 500);
        }
    }
}
