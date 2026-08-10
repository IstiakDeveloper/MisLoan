<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Controller;
use App\Models\LoanApplication;
use App\Models\LoanApplicationApproval;
use App\Models\LoanApplicationIssue;
use App\Models\LoanCategory;
use App\Models\LoanProduct;
use App\Models\MemberAdmission;
use App\Models\Role;
use App\Models\SavingsProduct;
use App\Models\Samity;
use App\Models\User;
use App\Services\ApprovalService;
use App\Services\NotificationService;
use App\Support\LoanFormVisibility;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class LoanApplicationController extends Controller
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

    private function canCreateLoanApplication($user): bool
    {
        return $this->isFieldOfficer($user) || $this->isBranchUserRole($user);
    }

    private function ensureCanCreateLoanApplication($user): void
    {
        if (!$this->canCreateLoanApplication($user)) {
            abort(403, 'শুধুমাত্র ফিল্ড অফিসার বা শাখা ব্যবহারকারী ঋণ আবেদন করতে পারবেন।');
        }
    }

    /**
     * Draft/fill loan forms: field officers may prepare applications for their own
     * members before admission is approved; branch users need an approved member.
     */
    private function ensureMemberAccessibleForLoanDraft(MemberAdmission $member, $user): void
    {
        $this->ensureCanCreateLoanApplication($user);

        if (!$user->has_all_access && !$user->canAccessBranch((int) $member->branch_id)) {
            abort(403, 'এই সদস্য আপনার এলাকার/শাখার নয়।');
        }

        if ($member->status === 'rejected') {
            abort(403, 'প্রত্যাখ্যাত সদস্যের জন্য ঋণ আবেদন করা যাবে না।');
        }

        if ($this->isFieldOfficer($user)) {
            if (! $member->isAssignedToUser($user)) {
                abort(403, 'ফিল্ড অফিসার শুধু নিজের দায়িত্বে থাকা সদস্যের জন্য ঋণ আবেদন করতে পারবেন।');
            }

            return;
        }

        if ($member->status !== 'approved') {
            abort(403, 'শুধুমাত্র অনুমোদিত সদস্যের জন্য ঋণ আবেদন করা যাবে।');
        }
    }

    private function isBranchManager($user): bool
    {
        $user->loadMissing('role');

        return $user->role?->name === Role::BRANCH_MANAGER;
    }

    private function attachFormMeta(LoanApplication $application, $user, ?array $formSavedOverride = null): void
    {
        $application->loadMissing(['loanProduct', 'memberAdmission']);
        $product = $application->loanProduct;
        $amount = (float) ($application->requested_amount ?? 0);
        $roleName = $user->role?->name ?? '';
        $status = (string) $application->status;

        $formSaved = $formSavedOverride ?? LoanFormVisibility::buildFormSavedMap($application);
        $submitRequired = LoanFormVisibility::requiredFormIdsForAction('submit', $product, $amount);
        $disburseRequired = LoanFormVisibility::disburseFormIds();
        $editableFormIds = LoanFormVisibility::editableFormIdsForUser($roleName, $status, $product, $amount);
        $visibleFormIds = LoanFormVisibility::visibleFormIdsForShow($roleName, $status, $product, $amount);

        $memberAdmission = $application->memberAdmission;
        $application->member_admission_status = $memberAdmission?->status;
        $application->visible_form_ids = $visibleFormIds;
        $application->editable_form_ids = $editableFormIds;
        $application->form_saved = $formSaved;
        $application->all_forms_complete = LoanFormVisibility::allRequiredFormsSaved($submitRequired, $formSaved);
        $application->disburse_forms_complete = LoanFormVisibility::allRequiredFormsSaved($disburseRequired, $formSaved);
        $application->can_submit = $application->all_forms_complete
            && ($memberAdmission === null || $memberAdmission->status === 'approved');
        $application->can_disburse = $status === LoanApplication::STATUS_PENDING_DISBURSEMENT
            && $this->isBranchUserRole($user)
            && $application->disburse_forms_complete;
    }

    private function ensureMemberApprovedForLoanSubmit(MemberAdmission $member): void
    {
        if ($member->status !== 'approved') {
            abort(403, 'সদস্য ভর্তি অনুমোদিত না হওয়া পর্যন্ত ঋণ আবেদন জমা দেওয়া যাবে না।');
        }
    }

    /**
     * Resolve loan application for form save based on form ID and user role.
     */
    private function resolveApplicationForFormSave(
        Request $request,
        int $formId,
        int $loanProductId,
        int $loanCategoryId,
        float $requestedAmount,
        ?int $memberId,
        ?string $legacyKey,
        ?array $legacySnapshot
    ): LoanApplication {
        $user = $request->user();
        $user->loadMissing('role');

        if ($formId === 4) {
            if (! $this->isBranchManager($user)) {
                abort(403, 'সরেজমিন তদন্ত প্রতিবেদন শুধু শাখা ব্যবস্থাপক পূরণ করতে পারবেন।');
            }
            $application = $this->findApplicationForMemberProduct($memberId, $legacyKey, $loanProductId, $loanCategoryId, [
                LoanApplication::STATUS_SUBMITTED,
                LoanApplication::STATUS_UNDER_REVIEW,
            ]);
            if (! $application) {
                abort(404, 'অনুমোদনের জন্য জমা দেওয়া ঋণ আবেদন পাওয়া যায়নি।');
            }
            $this->ensureApplicationAccessibleToUser($application, $user);

            return $application;
        }

        if (in_array($formId, [2, 3], true)) {
            if (! $this->isBranchUserRole($user) && ! $this->isBranchManager($user)) {
                abort(403, 'এই ফর্ম শুধু শাখা ব্যবহারকারী পূরণ করতে পারবেন।');
            }
            $application = $this->findApplicationForMemberProduct($memberId, $legacyKey, $loanProductId, $loanCategoryId, [
                LoanApplication::STATUS_PENDING_DISBURSEMENT,
            ]);
            if (! $application) {
                abort(404, 'বিতরণের অপেক্ষায় ঋণ আবেদন পাওয়া যায়নি।');
            }
            $this->ensureApplicationAccessibleToUser($application, $user);

            return $application;
        }

        if ($this->isBranchManager($user)) {
            $loanProduct = LoanProduct::find($loanProductId);
            $bmEditableFormIds = array_values(array_unique(array_merge(
                LoanFormVisibility::foSubmitFormIds($loanProduct, $requestedAmount),
                LoanFormVisibility::bmRequiredFormIds($loanProduct, $requestedAmount)
            )));

            if (in_array($formId, $bmEditableFormIds, true)) {
                $application = $this->findApplicationForMemberProduct($memberId, $legacyKey, $loanProductId, $loanCategoryId, [
                    LoanApplication::STATUS_SUBMITTED,
                    LoanApplication::STATUS_UNDER_REVIEW,
                ]);

                if ($application) {
                    $this->ensureApplicationAccessibleToUser($application, $user);

                    return $application;
                }
            }
        }

        $draft = $this->getOrCreateDraftForSave(
            $request,
            $loanProductId,
            $loanCategoryId,
            $requestedAmount,
            $memberId,
            $legacyKey,
            $legacySnapshot
        );
        if (! $draft) {
            abort(404, 'সদস্য পাওয়া যাচ্ছে না।');
        }

        return $draft;
    }

    private function findApplicationForMemberProduct(
        ?int $memberId,
        ?string $legacyKey,
        int $loanProductId,
        int $loanCategoryId,
        array $statuses
    ): ?LoanApplication {
        $query = LoanApplication::query()
            ->where('loan_product_id', $loanProductId)
            ->where('loan_category_id', $loanCategoryId)
            ->whereIn('status', $statuses);

        if ($legacyKey) {
            $query->where('legacy_application_key', $legacyKey);
        } else {
            $query->where('member_admission_id', $memberId);
        }

        return $query->latest('id')->first();
    }

    /**
     * Head Office / SuperAdmin / full-access users may edit loans in any status.
     */
    private function canManageAnyStatus(): bool
    {
        $user = auth()->user();

        return $user && ($user->has_all_access || $user->isSuperAdmin() || $user->isHeadOffice());
    }

    private function ensureApplicationAccessibleToUser(LoanApplication $application, $user): void
    {
        if (!$user->has_all_access && !$user->isSuperAdmin() && !$user->isHeadOffice()
            && !$user->canAccessBranch((int) $application->branch_id)) {
            abort(403, 'আপনার এই ঋণ আবেদন দেখার অনুমতি নেই।');
        }

        if ($this->isFieldOfficer($user) && (int) $application->submitted_by !== (int) $user->id) {
            abort(403, 'ফিল্ড অফিসার শুধু নিজের ঋণ আবেদন দেখতে পারবেন।');
        }
    }

    private function memberHasActiveLoan(int $memberId): bool
    {
        return LoanApplication::where('member_admission_id', $memberId)
            ->whereIn('status', [
                LoanApplication::STATUS_SUBMITTED,
                LoanApplication::STATUS_UNDER_REVIEW,
                LoanApplication::STATUS_READY_FOR_HEAD_OFFICE,
                LoanApplication::STATUS_PENDING_HEAD_OFFICE,
                LoanApplication::STATUS_APPROVED,
                LoanApplication::STATUS_PENDING_DISBURSEMENT,
                LoanApplication::STATUS_DISBURSED,
            ])
            ->with('loanProduct:id,duration_months')
            ->get()
            ->contains(function ($loan) {
                $today = now()->toDateString();

                if ($loan->expected_end_date) {
                    return $loan->expected_end_date >= $today;
                }

                if ($loan->loan_term_months) {
                    $endDate = \Carbon\Carbon::parse($loan->created_at)->addMonths($loan->loan_term_months)->toDateString();

                    return $endDate >= $today;
                }

                if ($loan->approved_start_date && $loan->loanProduct && $loan->loanProduct->duration_months) {
                    $endDate = \Carbon\Carbon::parse($loan->approved_start_date)->addMonths($loan->loanProduct->duration_months)->toDateString();

                    return $endDate >= $today;
                }

                return true;
            });
    }

    /**
     * Display available loan products
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $dateFrom = $request->input('date_from', now()->startOfMonth()->toDateString());
        $dateTo = $request->input('date_to', now()->toDateString());
        $statusFilter = $request->input('status', ''); // Empty means all statuses
        $isFieldOfficer = $this->isFieldOfficer($user);

        // Get loan categories with active products using the correct relationship name
        $categories = LoanCategory::with(['loanProducts' => function ($query) {
            $query->where('is_active', true)->orderBy('product_name');
        }])
        ->where('is_active', true)
        ->orderBy('display_order')
        ->get()
        ->map(function ($category) {
            // Rename the relationship in the response to match the frontend
            $category->loan_products = $category->loanProducts;
            unset($category->loanProducts);
            return $category;
        });

        // Get user's loan applications for date range
        // Use date range instead of whereDate() to allow index usage and prevent memory issues
        $startOfDay = \Carbon\Carbon::parse($dateFrom)->startOfDay();
        $endOfDay = \Carbon\Carbon::parse($dateTo)->endOfDay();
        
        // Main query: only small columns (no LOBs) so ORDER BY uses minimal sort buffer.
        $applications = LoanApplication::with([
                'loanProduct:id,product_name,product_name_bn,product_code,installment_type',
                'loanCategory:id,category_name,category_name_bn',
                'memberAdmission:id,applicant_name_en,applicant_name_bn,application_no,nid_number,mobile_number,status',
                'branch:id,name,code',
                'approvals' => function ($query) {
                    $query->select('id', 'loan_application_id', 'user_id', 'level', 'sequence', 'status')
                        ->with('user:id,name');
                },
                'issues' => function ($query) {
                    $query->select('id', 'loan_application_id', 'issue_description', 'status', 'reported_by', 'created_at')
                        ->with('reporter:id,name')
                        ->orderBy('created_at', 'desc');
                }
            ])
            ->when(!$user->has_all_access, function ($query) use ($user) {
                $query->whereIn('branch_id', $user->getAccessibleBranches()->pluck('id'));
            })
            ->where(function ($q) use ($user) {
                $q->where('status', '!=', 'draft')
                  ->orWhere('submitted_by', $user->id);
            })
            ->when($isFieldOfficer, function ($query) use ($user) {
                $query->where('submitted_by', $user->id);
            })
            ->whereBetween('created_at', [$startOfDay, $endOfDay])
            ->when($statusFilter, function ($query) use ($statusFilter) {
                $query->where('status', $statusFilter);
            })
            ->orderBy('created_at', 'desc')
            ->with('samity:id,samity_name,samity_name_bn,samity_code')
            ->select([
                'id', 'application_no', 'member_admission_id', 'loan_product_id',
                'loan_category_id', 'branch_id', 'samity_id', 'form_type', 'status',
                'requested_amount', 'approved_amount', 'created_at', 'updated_at',
                'submitted_at', 'reviewed_at', 'purpose_of_loan', 'legacy_member_snapshot',
            ])
            ->get();

        // Form completion flags in a separate query (no ORDER BY = no sort buffer).
        $formFlags = collect();
        if ($applications->isNotEmpty()) {
            $formFlags = DB::table('loan_applications')
                ->whereIn('id', $applications->pluck('id'))
                ->selectRaw('id, (CASE WHEN loan_agreement_data IS NOT NULL AND LENGTH(TRIM(COALESCE(loan_agreement_data, ""))) > 2 THEN 1 ELSE 0 END) as has_form_1')
                ->selectRaw('(CASE WHEN guarantor_info IS NOT NULL AND LENGTH(TRIM(COALESCE(guarantor_info, ""))) > 2 THEN 1 ELSE 0 END) as has_form_2')
                ->selectRaw('(CASE WHEN nominee_info IS NOT NULL AND LENGTH(TRIM(COALESCE(nominee_info, ""))) > 2 THEN 1 ELSE 0 END) as has_form_3')
                ->selectRaw('(CASE WHEN asset_info IS NOT NULL AND LENGTH(TRIM(COALESCE(asset_info, ""))) > 2 THEN 1 ELSE 0 END) as has_form_4')
                ->selectRaw('(CASE WHEN business_plan IS NOT NULL AND LENGTH(TRIM(COALESCE(business_plan, ""))) > 2 THEN 1 ELSE 0 END) as has_form_5')
                ->get()
                ->keyBy('id');
        }

        // ফর্ম অনুযায়ী কমপ্লিশন: প্রতিটি আবেদনের জন্য stage-aware form meta
        $applications = $applications->map(function ($app) use ($request, $formFlags) {
            $flags = $formFlags->get($app->id);
            $formSavedOverride = $flags ? [
                1 => (bool) $flags->has_form_1,
                2 => (bool) $flags->has_form_2,
                3 => (bool) $flags->has_form_3,
                4 => (bool) $flags->has_form_4,
                5 => (bool) $flags->has_form_5,
            ] : null;
            $this->attachFormMeta($app, $request->user(), $formSavedOverride);
            $app->setAttribute('tracking_state', $app->getTrackingState());

            return $app;
        });

        // Base query for stats (without status filter)
        $statsBaseQuery = LoanApplication::query()
            ->when(!$user->has_all_access, function ($query) use ($user) {
                $query->whereIn('branch_id', $user->getAccessibleBranches()->pluck('id'));
            })
            ->where(function ($q) use ($user) {
                $q->where('status', '!=', 'draft')
                  ->orWhere('submitted_by', $user->id);
            })
            ->when($isFieldOfficer, function ($query) use ($user) {
                $query->where('submitted_by', $user->id);
            })
            ->whereBetween('created_at', [$startOfDay, $endOfDay]);

        $stats = [
            'total' => (clone $statsBaseQuery)->where('status', '!=', 'draft')->count(),
            'draft' => (clone $statsBaseQuery)->where('status', LoanApplication::STATUS_DRAFT)->count(),
            'submitted' => (clone $statsBaseQuery)->where('status', LoanApplication::STATUS_SUBMITTED)->count(),
            'approved' => (clone $statsBaseQuery)->where('status', LoanApplication::STATUS_APPROVED)->count(),
            'pending_disbursement' => (clone $statsBaseQuery)->where('status', LoanApplication::STATUS_PENDING_DISBURSEMENT)->count(),
            'rejected' => (clone $statsBaseQuery)->where('status', LoanApplication::STATUS_REJECTED)->count(),
            'pending_head_office' => (clone $statsBaseQuery)->where('status', 'pending_head_office')->count(),
            'under_review' => (clone $statsBaseQuery)->where('status', 'under_review')->count(),
            'disbursed' => (clone $statsBaseQuery)->where('status', 'disbursed')->count(),
        ];

        return Inertia::render('Member/LoanApplications/Index', [
            'categories' => $categories,
            'applications' => $applications,
            'stats' => $stats,
            'selectedDate' => $dateFrom, // Keep for backward compatibility
            'dateFrom' => $dateFrom,
            'dateTo' => $dateTo,
            'statusFilter' => $statusFilter,
            'preselectedMember' => $this->resolvePreselectedMember($request),
        ]);
    }

    private function resolvePreselectedMember(Request $request): ?array
    {
        if (!$request->filled('member_id')) {
            return null;
        }

        $user = $request->user();
        $member = MemberAdmission::with('samity:id,samity_name,samity_name_bn')
            ->select('id', 'application_no', 'applicant_name_en', 'applicant_name_bn', 'nid_number', 'mobile_number', 'father_name_en', 'mother_name_en', 'samity_id', 'status', 'branch_id', 'created_by', 'requested_loan_amount')
            ->find($request->integer('member_id'));

        if (!$member) {
            return null;
        }

        try {
            $this->ensureMemberAccessibleForLoanDraft($member, $user);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            return null;
        }

        $hasActiveLoan = $this->memberHasActiveLoan((int) $member->id);

        return [
            'id' => $member->id,
            'application_no' => $member->application_no,
            'applicant_name_en' => $member->applicant_name_en,
            'applicant_name_bn' => $member->applicant_name_bn,
            'nid_number' => $member->nid_number,
            'mobile_number' => $member->mobile_number,
            'status' => $member->status,
            'has_active_loan' => $hasActiveLoan,
            'active_loans' => [],
            'samity' => $member->samity,
        ];
    }

    /**
     * Get loan products by category
     */
    public function getProducts(Request $request)
    {
        $categoryId = $request->input('category_id');

        $products = LoanProduct::where('loan_category_id', $categoryId)
            ->where('is_active', true)
            ->orderBy('product_name')
            ->get();

        return response()->json(['products' => $products]);
    }

    /**
     * Show loan application form
     */
    public function create(Request $request, $productId = null)
    {
        $user = $request->user();
        $this->ensureCanCreateLoanApplication($user);

        // Get product ID from route parameter or query string
        $loanProductId = $productId ?? $request->input('loan_product_id');
        $loanCategoryId = $request->input('loan_category_id');
        $requestedAmount = $request->input('requested_amount', 0);
        $memberId = $request->input('member_id');

        $loanProduct = null;
        if ($loanProductId) {
            $loanProduct = LoanProduct::with('loanCategory')->findOrFail($loanProductId);
        }

        // Get branch info
        $branch = $user->branch;

        // Get all active categories for selection
        $categories = LoanCategory::where('is_active', true)
            ->orderBy('display_order')
            ->get();

        // Get loan products for the selected category
        $products = [];
        if ($loanCategoryId) {
            $products = LoanProduct::where('loan_category_id', $loanCategoryId)
                ->where('is_active', true)
                ->orderBy('product_name')
                ->get();
        } else if ($loanProduct) {
            $products = LoanProduct::where('loan_category_id', $loanProduct->loan_category_id)
                ->where('is_active', true)
                ->orderBy('product_name')
                ->get();
        }

        // If member_id, product_id, category_id, and amount are provided, redirect to form selection
        // Otherwise, show the basic create page (for selecting member/product first)
        if ($memberId && $loanProductId && $loanCategoryId && $requestedAmount > 0) {
            return redirect()->route('member.loan-applications.form-selection', [
                'member_id' => $memberId,
                'loan_product_id' => $loanProductId,
                'loan_category_id' => $loanCategoryId,
                'requested_amount' => $requestedAmount,
            ]);
        }

        // If not all required params, show basic create page (placeholder for now)
        // In future, this could be a page to select member/product/category/amount first
        return Inertia::render('Member/LoanApplications/Create', [
            'loanProduct' => $loanProduct,
            'branch' => $branch,
            'categories' => $categories,
            'products' => $products,
            'formType' => $loanProduct ? ($loanProduct->installment_type === 'weekly' ? 1 : 2) : 1,
            'requestedAmount' => $requestedAmount,
            'memberAdmission' => $memberId ? tap(MemberAdmission::findOrFail($memberId), function ($member) use ($user) {
                $this->ensureMemberAccessibleForLoanDraft($member, $user);
            }) : null,
            'samity' => null,
        ]);
    }

    /**
     * Search for approved members by branch
     */
    public function searchMembers(Request $request)
    {
        $user = $request->user();
        $this->ensureCanCreateLoanApplication($user);

        $search = $request->input('query');
        $branchId = $user->branch_id;

        $members = MemberAdmission::where('branch_id', $branchId)
            ->when($this->isFieldOfficer($user), function ($query) use ($user) {
                $query->assignedToOfficer((int) $user->id)
                    ->where('status', '!=', 'rejected');
            }, function ($query) {
                $query->where('status', 'approved');
            })
            ->where(function ($query) use ($search) {
                $query->where('applicant_name_en', 'like', "%{$search}%")
                    ->orWhere('applicant_name_bn', 'like', "%{$search}%")
                    ->orWhere('nid_number', 'like', "%{$search}%")
                    ->orWhere('mobile_number', 'like', "%{$search}%")
                    ->orWhere('application_no', 'like', "%{$search}%");
            })
            ->select('id', 'application_no', 'applicant_name_en', 'applicant_name_bn', 'nid_number', 'mobile_number', 'father_name_en', 'mother_name_en', 'samity_id', 'status', 'requested_loan_amount')
            ->with('samity:id,samity_name,samity_name_bn')
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get();

        // Check for active loans for each member (ANY product)
        $memberIds = $members->pluck('id');
        
        if ($memberIds->isNotEmpty()) {
            // Get all active loans (not expired) for these members
            $activeLoans = LoanApplication::whereIn('member_admission_id', $memberIds)
                ->whereIn('status', [
                    LoanApplication::STATUS_SUBMITTED,
                    LoanApplication::STATUS_UNDER_REVIEW,
                    LoanApplication::STATUS_READY_FOR_HEAD_OFFICE,
                    LoanApplication::STATUS_PENDING_HEAD_OFFICE,
                    LoanApplication::STATUS_APPROVED,
                    LoanApplication::STATUS_DISBURSED
                ])
                ->with(['loanProduct:id,product_name,product_name_bn,duration_months', 'loanCategory:id,category_name,category_name_bn'])
                ->get()
                ->filter(function ($loan) {
                    // Check if loan hasn't expired
                    $today = now()->toDateString();
                    
                    // If expected_end_date exists, use it
                    if ($loan->expected_end_date) {
                        return $loan->expected_end_date >= $today;
                    }
                    
                    // If loan_term_months exists, calculate from created_at
                    if ($loan->loan_term_months) {
                        $endDate = \Carbon\Carbon::parse($loan->created_at)->addMonths($loan->loan_term_months)->toDateString();
                        return $endDate >= $today;
                    }
                    
                    // If approved_start_date and product duration exists, calculate from there
                    if ($loan->approved_start_date && $loan->loanProduct && $loan->loanProduct->duration_months) {
                        $endDate = \Carbon\Carbon::parse($loan->approved_start_date)->addMonths($loan->loanProduct->duration_months)->toDateString();
                        return $endDate >= $today;
                    }
                    
                    // If none of the above, consider it active (conservative approach)
                    return true;
                })
                ->groupBy('member_admission_id');

            // Add active loan info to members
            $members = $members->map(function ($member) use ($activeLoans) {
                $memberLoans = $activeLoans->get($member->id, collect());
                if ($memberLoans->isNotEmpty()) {
                    $member->has_active_loan = true;
                    $member->active_loans = $memberLoans->map(function ($loan) {
                        // Calculate end date if not available
                        $endDate = $loan->expected_end_date;
                        if (!$endDate && $loan->loan_term_months) {
                            $endDate = \Carbon\Carbon::parse($loan->created_at)->addMonths($loan->loan_term_months)->toDateString();
                        } elseif (!$endDate && $loan->approved_start_date && $loan->loanProduct && $loan->loanProduct->duration_months) {
                            $endDate = \Carbon\Carbon::parse($loan->approved_start_date)->addMonths($loan->loanProduct->duration_months)->toDateString();
                        }
                        
                        return [
                            'id' => $loan->id,
                            'application_no' => $loan->application_no,
                            'status' => $loan->status,
                            'product_name' => $loan->loanProduct->product_name ?? '',
                            'product_name_bn' => $loan->loanProduct->product_name_bn ?? '',
                            'category_name' => $loan->loanCategory->category_name ?? '',
                            'requested_amount' => $loan->requested_amount,
                            'expected_end_date' => $endDate,
                            'created_at' => $loan->created_at,
                            'loan_term_months' => $loan->loan_term_months ?? $loan->loanProduct->duration_months ?? null,
                        ];
                    });
                } else {
                    $member->has_active_loan = false;
                    $member->active_loans = [];
                }
                return $member;
            });
        } else {
            // If no members, just mark as no active loan
            $members = $members->map(function ($member) {
                $member->has_active_loan = false;
                $member->active_loans = [];
                return $member;
            });
        }

        return response()->json($members);
    }

    /**
     * Get samities for current user's branch (for legacy member form).
     */
    public function samitiesForBranch(Request $request)
    {
        $user = $request->user();
        $this->ensureCanCreateLoanApplication($user);
        if ($this->isFieldOfficer($user)) {
            abort(403, 'ফিল্ড অফিসার আগের/Legacy সদস্যের জন্য ঋণ আবেদন করতে পারবেন না।');
        }

        $branchId = $user->branch_id;
        if (!$branchId) {
            return response()->json([]);
        }
        $samities = Samity::where('branch_id', $branchId)
            ->where('is_active', true)
            ->orderBy('samity_name')
            ->get(['id', 'samity_code', 'samity_name', 'samity_name_bn']);
        return response()->json($samities);
    }

    /**
     * Legacy member create from loan flow is disabled.
     * Old members must be entered via Member Admission (পুরাতন সদস্য) with auto-approval.
     */
    public function startLegacyApplication(Request $request)
    {
        return redirect()
            ->route('member.loan-applications.index')
            ->with('error', 'ঋণ আবেদন থেকে আগের/Legacy সদস্য তৈরি বন্ধ করা হয়েছে। অনুগ্রহ করে সদস্য ভর্তি থেকে পুরাতন সদস্য হিসেবে ডাটা উঠান।');
    }

    /**
     * Store loan application
     */
    public function store(Request $request)
    {
        $this->ensureCanCreateLoanApplication($request->user());

        // Check if member has active loan
        $memberId = $request->input('member_admission_id');
        if ($memberId && $this->memberHasActiveLoan((int) $memberId)) {
            return back()->withErrors([
                'member_admission_id' => 'এই সদস্যের জন্য সক্রিয় ঋণ আছে। মেয়াদ শেষ হওয়ার আগে নতুন ঋণ আবেদন করা যাবে না।'
            ])->withInput();
        }

        $validated = $request->validate([
            // Basic Info
            'form_type' => 'required|in:1,2',
            'loan_product_id' => 'required|exists:loan_products,id',
            'loan_category_id' => 'required|exists:loan_categories,id',
            'member_admission_id' => 'nullable|exists:member_admissions,id',
            'samity_id' => 'nullable|exists:samities,id',
            'requested_amount' => 'required|numeric|min:0',
            'number_of_installments' => 'required|integer|min:1',
            'proposed_start_date' => 'required|date|after:today',
            'purpose_of_loan' => 'required|string|max:1000',
            'repayment_frequency' => 'required|in:weekly,monthly',
            'loan_term_months' => 'required|integer|min:1',

            // Financial Info
            'monthly_income' => 'nullable|numeric|min:0',
            'monthly_expense' => 'nullable|numeric|min:0',
            'other_loan_amount' => 'nullable|numeric|min:0',

            // Common fields for both types
            'guarantor_info' => 'nullable|array',
            'family_members' => 'nullable|array',
            'nominee_info' => 'nullable|array',
            'income_sources' => 'nullable|array',

            // Type 1 specific (simpler)
            'repayment_source' => 'nullable|string|max:1000',

            // Type 2 specific (detailed)
            'applicant_education' => 'nullable|string|max:100',
            'spouse_education' => 'nullable|string|max:100',
            'employment_details' => 'nullable|array',
            'business_plan' => 'nullable|string|max:2000',
            'business_type' => 'nullable|string|max:100',
            'business_description' => 'nullable|string|max:1000',
            'business_capital' => 'nullable|numeric|min:0',
            'business_income' => 'nullable|numeric|min:0',
            'loan_usage_plan' => 'nullable|string|max:2000',
            'loan_usage_breakdown' => 'nullable|array',
            'monthly_income_breakdown' => 'nullable|array',
            'monthly_expense_breakdown' => 'nullable|array',
            'asset_info' => 'nullable|array',
            'asset_details' => 'nullable|array',
            'liability_details' => 'nullable|array',
            'risk_measures' => 'nullable|array',
            'collateral_info' => 'nullable|string|max:1000',
            'guarantors_list' => 'nullable|array',

            // Photo and documents
            'applicant_photo' => 'nullable|string',
            'guarantor_photo' => 'nullable|string',
            'documents_submitted' => 'nullable|array',

            // Savings info
            'has_savings_account' => 'nullable|boolean',
            'savings_amount' => 'nullable|numeric|min:0',
            'savings_account_type' => 'nullable|string|max:100',
        ]);

        $user = $request->user();

        // Check loan product eligibility
        $loanProduct = LoanProduct::findOrFail($validated['loan_product_id']);

        // Validate amount range
        if ($validated['requested_amount'] < $loanProduct->min_amount ||
            $validated['requested_amount'] > $loanProduct->max_amount) {
            return back()->withErrors([
                'requested_amount' => "Amount must be between {$loanProduct->min_amount} and {$loanProduct->max_amount}"
            ]);
        }

        // Check eligibility if member admission provided
        if ($validated['member_admission_id']) {
            $memberAdmission = MemberAdmission::findOrFail($validated['member_admission_id']);
            $this->ensureMemberAccessibleForLoanDraft($memberAdmission, $user);
            $eligibilityCheck = $loanProduct->checkEligibility($memberAdmission);

            if (!$eligibilityCheck['eligible']) {
                return back()->withErrors([
                    'eligibility' => 'You are not eligible for this loan product: ' . implode(', ', $eligibilityCheck['reasons'])
                ]);
            }
        }

        // Calculate installment amount
        $installmentAmount = $loanProduct->calculateEMI($validated['requested_amount']);

        DB::beginTransaction();
        try {
            $application = LoanApplication::create([
                'application_no' => LoanApplication::generateApplicationNo(),
                'form_type' => $validated['form_type'],
                'member_admission_id' => $validated['member_admission_id'],
                'loan_product_id' => $validated['loan_product_id'],
                'loan_category_id' => $validated['loan_category_id'],
                'branch_id' => $user->branch_id,
                'samity_id' => $validated['samity_id'],
                'requested_amount' => $validated['requested_amount'],
                'installment_amount' => $installmentAmount,
                'number_of_installments' => $validated['number_of_installments'],
                'proposed_start_date' => $validated['proposed_start_date'],
                'repayment_frequency' => $validated['repayment_frequency'],
                'loan_term_months' => $validated['loan_term_months'],
                'purpose_of_loan' => $validated['purpose_of_loan'],
                'repayment_source' => $validated['repayment_source'] ?? null,
                'monthly_income' => $validated['monthly_income'] ?? null,
                'monthly_expense' => $validated['monthly_expense'] ?? null,
                'other_loan_amount' => $validated['other_loan_amount'] ?? 0,
                'guarantor_info' => $validated['guarantor_info'] ?? null,
                'guarantors_list' => $validated['guarantors_list'] ?? null,
                'family_members' => $validated['family_members'] ?? null,
                'nominee_info' => $validated['nominee_info'] ?? null,
                'income_sources' => $validated['income_sources'] ?? null,
                'applicant_education' => $validated['applicant_education'] ?? null,
                'spouse_education' => $validated['spouse_education'] ?? null,
                'employment_details' => $validated['employment_details'] ?? null,
                'business_plan' => $validated['business_plan'] ?? null,
                'business_type' => $validated['business_type'] ?? null,
                'business_description' => $validated['business_description'] ?? null,
                'business_capital' => $validated['business_capital'] ?? null,
                'business_income' => $validated['business_income'] ?? null,
                'loan_usage_plan' => $validated['loan_usage_plan'] ?? null,
                'loan_usage_breakdown' => $validated['loan_usage_breakdown'] ?? null,
                'monthly_income_breakdown' => $validated['monthly_income_breakdown'] ?? null,
                'monthly_expense_breakdown' => $validated['monthly_expense_breakdown'] ?? null,
                'asset_info' => $validated['asset_info'] ?? null,
                'asset_details' => $validated['asset_details'] ?? null,
                'liability_details' => $validated['liability_details'] ?? null,
                'risk_measures' => $validated['risk_measures'] ?? null,
                'collateral_info' => $validated['collateral_info'] ?? null,
                'has_savings_account' => $validated['has_savings_account'] ?? false,
                'savings_amount' => $validated['savings_amount'] ?? null,
                'savings_account_type' => $validated['savings_account_type'] ?? null,
                'applicant_photo' => $validated['applicant_photo'] ?? null,
                'guarantor_photo' => $validated['guarantor_photo'] ?? null,
                'documents_submitted' => $validated['documents_submitted'] ?? null,
                'status' => 'draft',
                'submitted_by' => $user->id,
            ]);

            DB::commit();

            return redirect()->route('member.loan-applications.show', $application->id)
                ->with('success', 'Loan application created successfully. Application No: ' . $application->application_no);
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => 'Failed to create loan application: ' . $e->getMessage()]);
        }
    }

    /**
     * Show loan application details
     */
    public function show($id)
    {
        $application = LoanApplication::with([
            'loanProduct',
            'loanCategory',
            'memberAdmission.samity',
            'branch',
            'samity',
            'submittedBy',
            'reviewedBy',
            'disbursedBy',
            'approvals.user',
            'issues' => function ($query) {
                $query->with(['reporter:id,name', 'responder:id,name'])
                    ->orderByDesc('created_at');
            },
        ])->findOrFail($id);
        $this->ensureApplicationAccessibleToUser($application, request()->user());

        $this->attachFormMeta($application, request()->user());

        return Inertia::render('Member/LoanApplications/Show', [
            'application' => $application,
            'routes' => [
                'index' => route('member.loan-applications.index'),
                'edit' => route('member.loan-applications.edit', $application->id),
                'print' => route('member.loan-applications.print', $application->id),
                'submit' => route('member.loan-applications.submit', $application->id),
                'disburse' => route('member.loan-applications.disburse', $application->id),
            ],
        ]);
    }

    /**
     * Submit loan application to the branch manager for review.
     */
    public function submit(Request $request, $id)
    {
        $user = $request->user();
        $application = LoanApplication::with('loanProduct')->findOrFail($id);
        $this->ensureApplicationAccessibleToUser($application, $user);

        if (!$application->canBeEdited()) {
            return back()->withErrors(['error' => 'This application cannot be submitted']);
        }

        if ($application->member_admission_id) {
            $member = MemberAdmission::find($application->member_admission_id);
            if (!$member) {
                return back()->withErrors(['error' => 'সদস্য ভর্তি তথ্য পাওয়া যায়নি।']);
            }
            try {
                $this->ensureMemberApprovedForLoanSubmit($member);
            } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
                return back()->withErrors(['error' => 'সদস্য ভর্তি অনুমোদিত না হওয়া পর্যন্ত ঋণ আবেদন জমা দেওয়া যাবে না।']);
            }
        }

        $product = $application->loanProduct;
        $amount = (float) $application->requested_amount;
        $submitRequired = LoanFormVisibility::requiredFormIdsForAction('submit', $product, $amount);
        $formSaved = LoanFormVisibility::buildFormSavedMap($application);
        $allRequiredSaved = LoanFormVisibility::allRequiredFormsSaved($submitRequired, $formSaved);

        if (!$allRequiredSaved) {
            return back()->withErrors(['error' => 'অনুমোদনের জন্য প্রয়োজনীয় ফর্ম (ঋণ চুক্তিপত্র বা আবেদন ও অনুমোদনপত্র) পূরণ করে তারপর সাবমিট করুন।']);
        }

        DB::beginTransaction();
        try {
            $application->update([
                'selected_approvers' => null,
                'status' => LoanApplication::STATUS_SUBMITTED,
                'submitted_at' => now(),
                'submitted_by' => $request->user()->id,
            ]);

            app(ApprovalService::class)->createLoanApprovalWorkflow($application);
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => $e->getMessage()]);
        }

        // Notify Branch Manager(s) of the branch
        $application->loadMissing(['memberAdmission', 'branch']);
        $branchManagers = User::where('branch_id', $application->branch_id)
            ->where('is_active', 1)
            ->whereHas('role', fn ($q) => $q->where('name', Role::BRANCH_MANAGER))
            ->get();

        if ($branchManagers->isNotEmpty()) {
            app(NotificationService::class)->send(
                users: $branchManagers,
                type: 'loan_application',
                title: 'নতুন ঋণ আবেদন জমা হয়েছে',
                message: "ঋণ আবেদন নং {$application->application_no} ({$application->memberAdmission?->applicant_name_bn}) ব্রাঞ্চে জমা দেওয়া হয়েছে। চাহিদাকৃত পরিমাণ: " . number_format($application->requested_amount ?? 0) . " টাকা।",
                notifiable: $application,
                actionUrl: '/approvals',
                details: [
                    'আবেদন নং' => $application->application_no,
                    'সদস্যের নাম' => $application->memberAdmission?->applicant_name_bn ?: ($application->memberAdmission?->applicant_name_en ?? 'N/A'),
                    'চাহিদাকৃত ঋণ' => number_format($application->requested_amount ?? 0) . ' টাকা',
                    'শাখা' => $application->branch?->name ?? 'N/A',
                ]
            );
        }

        return redirect()->route('member.loan-applications.show', $application->id)
            ->with('success', 'ঋণ আবেদন শাখা ব্যবস্থাপকের কাছে জমা হয়েছে। অনুমোদনের পর শাখা থেকে Head Office এ পাঠানো যাবে।');
    }

    public function sendToHeadOffice(Request $request, $id)
    {
        $user = $request->user();
        $user->loadMissing('role');
        $roleName = strtolower($user->role->name ?? '');

        if ($roleName !== 'branch_user') {
            abort(403, 'শুধুমাত্র শাখা ব্যবহারকারী (Branch User) ঋণ আবেদন হেড অফিসে পাঠাতে পারবেন।');
        }

        $application = LoanApplication::findOrFail($id);
        $this->ensureApplicationAccessibleToUser($application, $user);

        if ($application->status !== LoanApplication::STATUS_READY_FOR_HEAD_OFFICE) {
            return back()->withErrors(['error' => 'শুধু শাখা অনুমোদিত ঋণ আবেদন Head Office এ পাঠানো যাবে।']);
        }

        $application->update([
            'status' => LoanApplication::STATUS_PENDING_HEAD_OFFICE,
            'submitted_at' => now(),
        ]);

        // Notify Head Office Users
        $application->loadMissing(['memberAdmission', 'branch']);
        $headOfficeUsers = User::where('is_active', 1)
            ->where(function ($q) {
                $q->where('has_all_access', 1)
                  ->orWhereHas('role', fn ($r) => $r->whereIn('name', ['super_admin', 'head_office', 'ed']));
            })->get();

        if ($headOfficeUsers->isNotEmpty()) {
            app(NotificationService::class)->send(
                users: $headOfficeUsers,
                type: 'loan_application',
                title: 'ঋণ আবেদন হেড অফিসে পাঠানো হয়েছে',
                message: "ঋণ আবেদন নং {$application->application_no} ({$application->memberAdmission?->applicant_name_bn}) শাখা কর্তৃক হেড অফিসে অনুমোদনের জন্য পাঠানো হয়েছে।",
                notifiable: $application,
                actionUrl: '/head-office/process-loans',
                details: [
                    'আবেদন নং' => $application->application_no,
                    'সদস্যের নাম' => $application->memberAdmission?->applicant_name_bn ?: ($application->memberAdmission?->applicant_name_en ?? 'N/A'),
                    'ঋণের পরিমাণ' => number_format($application->requested_amount ?? 0) . ' টাকা',
                    'শাখা' => $application->branch?->name ?? 'N/A',
                ]
            );
        }

        return redirect()->route('member.loan-applications.show', $application->id)
            ->with('success', 'ঋণ আবেদনটি Head Office এ পাঠানো হয়েছে।');
    }

    /**
     * Branch user: send multiple ready loan applications to Head Office at once.
     */
    public function sendToHeadOfficeBulk(Request $request)
    {
        $user = $request->user();
        $user->loadMissing('role');
        $roleName = strtolower($user->role->name ?? '');

        if ($roleName !== 'branch_user') {
            abort(403, 'শুধুমাত্র শাখা ব্যবহারকারী (Branch User) ঋণ আবেদন হেড অফিসে পাঠাতে পারবেন।');
        }

        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|distinct',
        ]);

        $ids = array_map('intval', $validated['ids']);
        $applications = LoanApplication::query()
            ->with(['memberAdmission', 'branch'])
            ->whereIn('id', $ids)
            ->where('status', LoanApplication::STATUS_READY_FOR_HEAD_OFFICE)
            ->get();

        $eligible = $applications->filter(function (LoanApplication $application) use ($user) {
            try {
                $this->ensureApplicationAccessibleToUser($application, $user);

                return true;
            } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
                return false;
            }
        })->values();

        if ($eligible->isEmpty()) {
            return back()->withErrors(['error' => 'পাঠানোর মতো শাখা অনুমোদিত ঋণ আবেদন পাওয়া যায়নি।']);
        }

        DB::transaction(function () use ($eligible) {
            foreach ($eligible as $application) {
                $application->update([
                    'status' => LoanApplication::STATUS_PENDING_HEAD_OFFICE,
                    'submitted_at' => now(),
                ]);
            }
        });

        $count = $eligible->count();
        $branchName = $eligible->first()?->branch?->name ?? 'N/A';
        $sampleNos = $eligible->take(5)->pluck('application_no')->filter()->implode(', ');

        $headOfficeUsers = User::where('is_active', 1)
            ->where(function ($q) {
                $q->where('has_all_access', 1)
                    ->orWhereHas('role', fn ($r) => $r->whereIn('name', ['super_admin', 'head_office', 'ed']));
            })->get();

        if ($headOfficeUsers->isNotEmpty()) {
            app(NotificationService::class)->send(
                users: $headOfficeUsers,
                type: 'loan_application',
                title: 'একাধিক ঋণ আবেদন হেড অফিসে পাঠানো হয়েছে',
                message: "{$count}টি ঋণ আবেদন শাখা কর্তৃক হেড অফিসে অনুমোদনের জন্য পাঠানো হয়েছে।",
                notifiable: $eligible->first(),
                actionUrl: '/head-office/process-loans',
                details: [
                    'মোট' => (string) $count,
                    'নমুনা আবেদন নং' => $sampleNos ?: 'N/A',
                    'শাখা' => $branchName,
                    'প্রেরক' => $user->name,
                ]
            );
        }

        return redirect()->route('member.loan-applications.index')
            ->with('success', "{$count}টি ঋণ আবেদন Head Office এ পাঠানো হয়েছে।");
    }

    /**
     * Branch user disburses loan after HO approval and pre-disbursement forms (2 & 3).
     */
    public function disburse(Request $request, $id)
    {
        $user = $request->user();
        if (! $this->isBranchUserRole($user)) {
            abort(403, 'শুধুমাত্র শাখা ব্যবহারকারী ঋণ বিতরণ করতে পারবেন।');
        }

        $application = LoanApplication::with(['loanProduct', 'memberAdmission', 'submittedBy'])->findOrFail($id);
        $this->ensureApplicationAccessibleToUser($application, $user);

        if ($application->status !== LoanApplication::STATUS_PENDING_DISBURSEMENT) {
            return back()->withErrors(['error' => 'শুধু বিতরণের অপেক্ষায় থাকা ঋণ বিতরণ করা যাবে।']);
        }

        $this->attachFormMeta($application, $user);
        if (! $application->can_disburse) {
            return back()->withErrors(['error' => 'বিতরণের আগে জামিনদার অঙ্গীকার (ফর্ম ২) ও মৃত্যুঝুঁকি তহবিল (ফর্ম ৩) পূরণ করতে হবে।']);
        }

        LoanApplication::whereKey($application->id)->update([
            'status' => LoanApplication::STATUS_DISBURSED,
            'disbursed_by' => $user->id,
            'disbursed_at' => now(),
        ]);

        // Notify submitter / member
        if ($application->submittedBy) {
            app(NotificationService::class)->send(
                users: $application->submittedBy,
                type: 'loan_application',
                title: 'ঋণ বিতরণ সফলভাবে সম্পন্ন হয়েছে',
                message: "ঋণ আবেদন নং {$application->application_no} ({$application->memberAdmission?->applicant_name_bn}) এর ঋণ বিতরণ করা হয়েছে। পরিমাণ: " . number_format($application->approved_amount ?? $application->requested_amount ?? 0) . " টাকা।",
                notifiable: $application,
                actionUrl: "/member/loan-applications/{$application->id}",
                details: [
                    'আবেদন নং' => $application->application_no,
                    'সদস্যের নাম' => $application->memberAdmission?->applicant_name_bn ?: ($application->memberAdmission?->applicant_name_en ?? 'N/A'),
                    'বিতরণকৃত ঋণ' => number_format($application->approved_amount ?? $application->requested_amount ?? 0) . ' টাকা',
                    'বিতরণের তারিখ' => now()->format('Y-m-d H:i'),
                ]
            );
        }

        return redirect()->route('member.loan-applications.show', $application->id)
            ->with('success', 'ঋণ সফলভাবে বিতরণ করা হয়েছে।');
    }

    /**
     * Show edit form for loan application
     */
    public function edit($id)
    {
        $application = LoanApplication::with([
            'loanProduct',
            'loanCategory',
            'memberAdmission.samity',
            'branch',
            'samity'
        ])->findOrFail($id);
        $this->ensureApplicationAccessibleToUser($application, request()->user());
        $user = request()->user();
        $branchManagerCanEditSubmitted = $this->isBranchManager($user)
            && in_array($application->status, [LoanApplication::STATUS_SUBMITTED, LoanApplication::STATUS_UNDER_REVIEW], true);

        if (!$this->canManageAnyStatus() && !$application->canBeEdited() && ! $branchManagerCanEditSubmitted) {
            return redirect()->route('member.loan-applications.show', $application->id)
                ->withErrors(['error' => 'This application cannot be edited']);
        }

        if ($branchManagerCanEditSubmitted) {
            $editableFormIds = LoanFormVisibility::editableFormIdsForUser(
                $user->role?->name,
                (string) $application->status,
                $application->loanProduct,
                (float) ($application->requested_amount ?? 0)
            );
            $firstEditableFormId = $editableFormIds[0] ?? null;
            $formRoute = match ($firstEditableFormId) {
                1 => 'loan-agreement',
                4 => 'field-investigation',
                5 => 'loan-application-approval',
                default => null,
            };

            if ($formRoute) {
                $params = [
                    'product_id' => $application->loan_product_id,
                    'category_id' => $application->loan_category_id,
                    'amount' => $application->requested_amount,
                ];

                if ($application->legacy_application_key && $application->legacy_member_snapshot) {
                    request()->session()->put('loan_legacy_member', $application->legacy_member_snapshot);
                    request()->session()->put('loan_legacy_key', $application->legacy_application_key);
                    $params['legacy'] = 1;
                } else {
                    $params['member_id'] = $application->member_admission_id;
                }

                return redirect()->to('/member/loan-applications/forms/'.$formRoute.'?'.http_build_query($params));
            }
        }

        // If this is a member-side form-based application (loan agreement, guarantor commitment, death risk fund, field investigation, or loan application approval),
        // always send user back to the form selection screen instead of a generic edit page.
        if (in_array($application->form_type, ['loan_agreement', 'guarantor_commitment', 'death_risk_fund', 'field_investigation', 'loan_application_approval'], true)) {
            $params = [
                'loan_product_id' => $application->loan_product_id,
                'loan_category_id' => $application->loan_category_id,
                'requested_amount' => $application->requested_amount,
            ];
            // Legacy member: restore session from stored snapshot so form-selection does not ask for member again
            if ($application->legacy_application_key && $application->legacy_member_snapshot) {
                request()->session()->put('loan_legacy_member', $application->legacy_member_snapshot);
                request()->session()->put('loan_legacy_key', $application->legacy_application_key);
                $params['legacy'] = 1;
            } else {
                // Regular member: must have member_admission_id so form-selection can load member
                if (!$application->member_admission_id) {
                    return redirect()->route('member.loan-applications.index')
                        ->with('error', 'এই খসড়া আবেদনে সদস্য তথ্য নেই। নতুন করে আবেদন করুন।');
                }
                $params['member_id'] = $application->member_admission_id;
            }
            return redirect()->route('member.loan-applications.form-selection', $params);
        }

        $categories = LoanCategory::where('is_active', true)
            ->orderBy('display_order')
            ->get();

        return Inertia::render('Member/LoanApplications/Edit', [
            'application' => $application,
            'categories' => $categories,
        ]);
    }

    /**
     * Update loan application
     */
    public function update(Request $request, $id)
    {
        $application = LoanApplication::findOrFail($id);
        $this->ensureApplicationAccessibleToUser($application, $request->user());

        if (!$this->canManageAnyStatus() && !$application->canBeEdited()) {
            return back()->withErrors(['error' => 'This application cannot be edited']);
        }

        $validated = $request->validate([
            // Add validation rules similar to store method
            'requested_amount' => 'required|numeric|min:0',
            'purpose_of_loan' => 'required|string|max:1000',
            // ... other fields
        ]);

        $application->update($validated);

        return redirect()->route('member.loan-applications.show', $application->id)
            ->with('success', 'Loan application updated successfully');
    }

    /**
     * Print loan application
     */
    public function print($id)
    {
        $application = LoanApplication::with([
            'loanProduct',
            'loanCategory',
            'memberAdmission',
            'branch',
            'samity',
            'submittedBy',
            'reviewedBy',
            'disbursedBy'
        ])->findOrFail($id);
        $this->ensureApplicationAccessibleToUser($application, request()->user());

        return Inertia::render('Member/LoanApplications/Print', [
            'application' => $application,
        ]);
    }

    /**
     * Show form selection page (supports legacy/old member via session).
     */
    public function formSelection(Request $request)
    {
        $user = $request->user();
        $this->ensureCanCreateLoanApplication($user);

        $isLegacy = $request->boolean('legacy');
        if ($isLegacy && $this->isFieldOfficer($user)) {
            abort(403, 'ফিল্ড অফিসার আগের/Legacy সদস্যের জন্য ঋণ আবেদন করতে পারবেন না।');
        }
        $loanProductId = $request->input('loan_product_id');
        $loanCategoryId = $request->input('loan_category_id');
        $requestedAmount = $request->input('requested_amount', 0);

        if ($isLegacy) {
            $legacySnapshot = $request->session()->get('loan_legacy_member');
            $legacyKey = $request->session()->get('loan_legacy_key');
            if (!$legacySnapshot || !$legacyKey) {
                return redirect()->route('member.loan-applications.index')
                    ->with('error', 'আগের সদস্যের সেশন শেষ হয়ে গেছে। আবার সদস্য তথ্য দিন।');
            }
            $samity = Samity::find($legacySnapshot['samity_id'] ?? 0);
            $member = (object) array_merge($legacySnapshot, [
                'samity' => $samity ? (object) ['id' => $samity->id, 'samity_name' => $samity->samity_name, 'samity_name_bn' => $samity->samity_name_bn, 'samity_code' => $samity->samity_code] : null,
            ]);
        } else {
            $memberId = $request->input('member_id');
            if (!$memberId) {
                return redirect()->route('member.loan-applications.index')->with('error', 'সদস্য নির্বাচন করুন।');
            }
            $member = MemberAdmission::with('samity')->findOrFail($memberId);
            $this->ensureMemberAccessibleForLoanDraft($member, $request->user());
            if ($this->memberHasActiveLoan((int) $member->id)) {
                return redirect()->route('member.loan-applications.index')
                    ->with('error', 'এই সদস্যের জন্য সক্রিয় ঋণ আছে। মেয়াদ শেষ হওয়ার আগে নতুন ঋণ আবেদন করা যাবে না।');
            }
        }

        $loanProduct = LoanProduct::findOrFail($loanProductId);
        $loanCategory = LoanCategory::findOrFail($loanCategoryId);

        // Get the draft application (if exists)
        if ($isLegacy) {
            $draftApplication = LoanApplication::where('legacy_application_key', $request->session()->get('loan_legacy_key'))
                ->where('loan_product_id', $loanProductId)
                ->where('loan_category_id', $loanCategoryId)
                ->where('status', LoanApplication::STATUS_DRAFT)
                ->first();
        } else {
            $draftApplication = LoanApplication::where('member_admission_id', $member->id)
                ->where('loan_product_id', $loanProductId)
                ->where('loan_category_id', $loanCategoryId)
                ->where('status', LoanApplication::STATUS_DRAFT)
                ->first();
        }
        if ($draftApplication) {
            $this->ensureApplicationAccessibleToUser($draftApplication, $request->user());
        }

        // Check if loan agreement data exists (check loan_agreement_data field)
        $hasLoanAgreementDraft = $draftApplication && !empty($draftApplication->loan_agreement_data);

        // Check if guarantor commitment data exists (check guarantor_info field)
        $hasGuarantorCommitmentDraft = $draftApplication && !empty($draftApplication->guarantor_info);

        // Check if death risk fund data exists (check nominee_info field)
        $hasDeathRiskFundDraft = $draftApplication && !empty($draftApplication->nominee_info);

        // Check if field investigation data exists (check asset_info field)
        $hasFieldInvestigationDraft = $draftApplication && !empty($draftApplication->asset_info);

        // Check if loan application approval data exists (check business_plan field)
        $hasLoanApplicationApprovalDraft = $draftApplication && !empty($draftApplication->business_plan) && $draftApplication->form_type === 'loan_application_approval';

        // Stage-aware: FO draft sees only Form 1 (weekly) or Form 5 (monthly)
        $amount = (float) $requestedAmount;
        $roleName = $request->user()->role?->name ?? '';
        $visibleFormIds = LoanFormVisibility::editableFormIdsForUser(
            $roleName,
            LoanApplication::STATUS_DRAFT,
            $loanProduct,
            $amount
        );

        return Inertia::render('Member/LoanApplications/FormSelection', [
            'member' => $member,
            'loanProduct' => $loanProduct,
            'loanCategory' => $loanCategory,
            'requestedAmount' => $amount,
            'visibleFormIds' => $visibleFormIds,
            'hasLoanAgreementDraft' => $hasLoanAgreementDraft,
            'hasGuarantorCommitmentDraft' => $hasGuarantorCommitmentDraft,
            'hasDeathRiskFundDraft' => $hasDeathRiskFundDraft,
            'hasFieldInvestigationDraft' => $hasFieldInvestigationDraft,
            'hasLoanApplicationApprovalDraft' => $hasLoanApplicationApprovalDraft,
            'isLegacy' => $isLegacy,
        ]);
    }

    /**
     * Resolve member for a form (from member_id or legacy session).
     */
    private function resolveMemberForForm(Request $request, int $loanProductId, int $loanCategoryId, ?int $formId = null): array
    {
        $isLegacy = $request->boolean('legacy');
        $user = $request->user();
        $user->loadMissing('role');

        $applicationStatuses = [LoanApplication::STATUS_DRAFT];
        if ($this->isBranchManager($user) && in_array($formId, [1, 4, 5], true)) {
            $applicationStatuses = [LoanApplication::STATUS_SUBMITTED, LoanApplication::STATUS_UNDER_REVIEW];
        } elseif (in_array($formId, [2, 3], true) && ($this->isBranchUserRole($user) || $this->isBranchManager($user))) {
            $applicationStatuses = [LoanApplication::STATUS_PENDING_DISBURSEMENT];
        }

        if ($isLegacy) {
            if ($this->isFieldOfficer($user)) {
                abort(403, 'ফিল্ড অফিসার আগের/Legacy সদস্যের জন্য ঋণ আবেদন করতে পারবেন না।');
            }
            $legacySnapshot = $request->session()->get('loan_legacy_member');
            $legacyKey = $request->session()->get('loan_legacy_key');
            if (!$legacySnapshot || !$legacyKey) {
                return [null, null, null]; // will redirect
            }
            $samity = Samity::find($legacySnapshot['samity_id'] ?? 0);
            $member = (object) array_merge($legacySnapshot, [
                'samity' => $samity ? (object) ['id' => $samity->id, 'samity_name' => $samity->samity_name, 'samity_name_bn' => $samity->samity_name_bn, 'samity_code' => $samity->samity_code] : null,
            ]);
            $existingApplication = LoanApplication::where('legacy_application_key', $legacyKey)
                ->where('loan_product_id', $loanProductId)
                ->where('loan_category_id', $loanCategoryId)
                ->whereIn('status', $applicationStatuses)
                ->latest('id')
                ->first();
            if ($existingApplication) {
                $this->ensureApplicationAccessibleToUser($existingApplication, $user);
            }

            return [$member, $existingApplication, $legacyKey];
        }
        $memberId = $request->input('member_id');
        $member = MemberAdmission::with(['samity', 'familyMembers', 'otherAssets', 'branch'])->find($memberId);
        if ($member) {
            if (($this->isBranchManager($user) && in_array($formId, [1, 4, 5], true)) || $formId === 4 || in_array($formId, [2, 3], true)) {
                if (!$user->has_all_access && !$user->canAccessBranch((int) $member->branch_id)) {
                    abort(403, 'এই সদস্য আপনার এলাকার/শাখার নয়।');
                }
            } else {
                $this->ensureMemberAccessibleForLoanDraft($member, $user);
            }
        }
        $existingApplication = $memberId ? LoanApplication::where('member_admission_id', $memberId)
            ->where('loan_product_id', $loanProductId)
            ->where('loan_category_id', $loanCategoryId)
            ->whereIn('status', $applicationStatuses)
            ->latest('id')
            ->first() : null;
        if ($existingApplication) {
            $this->ensureApplicationAccessibleToUser($existingApplication, $user);
        }

        return [$member, $existingApplication, null];
    }

    /**
     * Soft-merge draft form JSON.
     * Incoming keys overwrite (including null = clear). Keys only in existing are kept
     * so a partial/failed client payload cannot wipe untouched fields.
     */
    private function mergeSoftDraftFormData(array $existing, array $incoming): array
    {
        return array_merge($existing, $incoming);
    }

    /**
     * Get or create draft for save (supports legacy and normal member).
     * Returns [LoanApplication $draft, int $samityId, ?array $legacySnapshot].
     */
    private function getOrCreateDraftForSave(Request $request, int $loanProductId, int $loanCategoryId, float $requestedAmount, ?int $memberId, ?string $legacyKey, ?array $legacySnapshot): ?LoanApplication
    {
        $user = $request->user();
        $this->ensureCanCreateLoanApplication($user);
        if ($legacyKey && $legacySnapshot !== null) {
            if ($this->isFieldOfficer($user)) {
                abort(403, 'ফিল্ড অফিসার আগের/Legacy সদস্যের জন্য ঋণ আবেদন করতে পারবেন না।');
            }
            $draft = LoanApplication::firstOrNew([
                'legacy_application_key' => $legacyKey,
                'loan_product_id' => $loanProductId,
                'loan_category_id' => $loanCategoryId,
                'status' => LoanApplication::STATUS_DRAFT,
            ]);
            if (!$draft->exists || !$draft->application_no) {
                $draft->application_no = LoanApplication::generateApplicationNo();
            }
            $draft->member_admission_id = null;
            $draft->legacy_application_key = $legacyKey;
            $draft->legacy_member_snapshot = $legacySnapshot;
            $draft->branch_id = $user->branch_id;
            $draft->samity_id = (int) ($legacySnapshot['samity_id'] ?? 0);
            $draft->requested_amount = $requestedAmount;
            $draft->submitted_by = $user->id;
            return $draft;
        }
        $member = MemberAdmission::find($memberId);
        if (!$member) {
            return null;
        }
        $this->ensureMemberAccessibleForLoanDraft($member, $user);
        $draft = LoanApplication::firstOrNew([
            'member_admission_id' => $memberId,
            'loan_product_id' => $loanProductId,
            'loan_category_id' => $loanCategoryId,
            'status' => LoanApplication::STATUS_DRAFT,
        ]);
        if ($draft->exists) {
            $this->ensureApplicationAccessibleToUser($draft, $user);
        } elseif ($this->memberHasActiveLoan((int) $member->id)) {
            abort(403, 'এই সদস্যের জন্য সক্রিয় ঋণ আছে। মেয়াদ শেষ হওয়ার আগে নতুন ঋণ আবেদন করা যাবে না।');
        }
        if (!$draft->exists || !$draft->application_no) {
            $draft->application_no = LoanApplication::generateApplicationNo();
        }
        $draft->branch_id = $user->branch_id;
        $draft->samity_id = $member->samity_id;
        $draft->requested_amount = $requestedAmount;
        $draft->submitted_by = $user->id;
        return $draft;
    }

    /**
     * Show loan agreement form
     */
    public function loanAgreement(Request $request)
    {
        $loanProductId = (int) $request->input('product_id');
        $loanCategoryId = (int) $request->input('category_id');
        $requestedAmount = (float) $request->input('amount', 0);

        [$member, $existingApplication, $legacyKey] = $this->resolveMemberForForm($request, $loanProductId, $loanCategoryId, 1);
        if (!$member) {
            return redirect()->route('member.loan-applications.index')->with('error', 'সদস্য তথ্য পাওয়া যাচ্ছে না।');
        }

        $loanProduct = LoanProduct::findOrFail($loanProductId);
        $loanCategory = LoanCategory::findOrFail($loanCategoryId);
        $user = $request->user();
        $branch = $user->branch;

        return Inertia::render('Member/LoanApplications/Forms/LoanAgreement', [
            'member' => $member,
            'loanProduct' => $loanProduct,
            'loanCategory' => $loanCategory,
            'requestedAmount' => $requestedAmount,
            'branch' => $branch,
            'existingApplication' => $existingApplication,
            'savedData' => $existingApplication?->loan_agreement_data,
            'isLegacy' => $request->boolean('legacy'),
        ]);
    }

    /**
     * Show guarantor commitment form
     */
    public function guarantorCommitment(Request $request)
    {
        $loanProductId = (int) $request->input('product_id');
        $loanCategoryId = (int) $request->input('category_id');
        $requestedAmount = (float) $request->input('amount', 0);

        [$member, $existingApplication, $legacyKey] = $this->resolveMemberForForm($request, $loanProductId, $loanCategoryId, 2);
        if (!$member) {
            return redirect()->route('member.loan-applications.index')->with('error', 'সদস্য তথ্য পাওয়া যাচ্ছে না।');
        }

        $loanProduct = LoanProduct::findOrFail($loanProductId);
        $loanCategory = LoanCategory::findOrFail($loanCategoryId);
        $user = $request->user();
        $branch = $user->branch;
        if ($existingApplication && $existingApplication->status === LoanApplication::STATUS_PENDING_DISBURSEMENT && $existingApplication->approved_amount !== null) {
            $requestedAmount = (float) $existingApplication->approved_amount;
        }

        return Inertia::render('Member/LoanApplications/Forms/GuarantorCommitment', [
            'member' => $member,
            'loanProduct' => $loanProduct,
            'loanCategory' => $loanCategory,
            'requestedAmount' => $requestedAmount,
            'branch' => $branch,
            'existingApplication' => $existingApplication,
            'savedData' => $existingApplication?->guarantor_info,
            'isLegacy' => $request->boolean('legacy'),
        ]);
    }

    public function saveLoanAgreementDraft(Request $request)
    {
        try {
            $isLegacy = $request->boolean('legacy');
            $rules = [
                'loan_product_id' => 'required|exists:loan_products,id',
                'loan_category_id' => 'required|exists:loan_categories,id',
                'requested_amount' => 'required|numeric|min:0',
                'agreement_data' => 'nullable|array',
            ];
            if (!$isLegacy) {
                $rules['member_id'] = 'required|exists:member_admissions,id';
            }
            $validated = $request->validate($rules);

            $memberId = $isLegacy ? null : (int) $validated['member_id'];
            $legacyKey = $isLegacy ? $request->session()->get('loan_legacy_key') : null;
            $legacySnapshot = $isLegacy ? $request->session()->get('loan_legacy_member') : null;
            if ($isLegacy && (!$legacyKey || !$legacySnapshot)) {
                return redirect()->route('member.loan-applications.index')->with('error', 'আগের সদস্যের সেশন শেষ। আবার সদস্য তথ্য দিন।');
            }

            $loanApplication = $this->resolveApplicationForFormSave(
                $request,
                1,
                (int) $validated['loan_product_id'],
                (int) $validated['loan_category_id'],
                (float) $validated['requested_amount'],
                $memberId,
                $legacyKey,
                $legacySnapshot
            );

            $agreementData = $validated['agreement_data'] ?? [];
            if (!is_array($agreementData)) {
                $agreementData = [];
            }
            // Soft merge: keep previously saved signature/image fields if new payload left them empty
            $existing = is_array($loanApplication->loan_agreement_data) ? $loanApplication->loan_agreement_data : [];
            $agreementData = $this->mergeSoftDraftFormData($existing, $agreementData);

            $loanApplication->loan_agreement_data = $agreementData;
            $loanApplication->form_type = 'loan_agreement';
            $loanApplication->purpose_of_loan = $agreementData['loan_purpose'] ?? ($loanApplication->purpose_of_loan ?: 'ঋণ চুক্তিপত্র অনুযায়ী');
            $loanApplication->number_of_installments = (int) ($agreementData['number_of_installments'] ?? $loanApplication->number_of_installments ?? 1);
            $loanApplication->save();

            return redirect()->route('member.loan-applications.index')
                ->with('success', 'ঋণ চুক্তিপত্র খসড়া হিসেবে সংরক্ষিত হয়েছে।');
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            \Log::error('Loan agreement draft save failed: '.$e->getMessage());

            return back()->withInput()->with('error', 'খসড়া সংরক্ষণ ব্যর্থ: '.$e->getMessage().' — আগের সংরক্ষিত ডাটা মুছে যায়নি।');
        }
    }

    /**
     * Save guarantor commitment draft
     */
    public function saveGuarantorCommitmentDraft(Request $request)
    {
        $isLegacy = $request->boolean('legacy');
        $rules = [
            'loan_product_id' => 'required|exists:loan_products,id',
            'loan_category_id' => 'required|exists:loan_categories,id',
            'requested_amount' => 'required|numeric|min:0',
            'agreement_data' => 'required|array',
        ];
        if (!$isLegacy) {
            $rules['member_id'] = 'required|exists:member_admissions,id';
        }
        $validated = $request->validate($rules);

        $memberId = $isLegacy ? null : (int) $validated['member_id'];
        $legacyKey = $isLegacy ? $request->session()->get('loan_legacy_key') : null;
        $legacySnapshot = $isLegacy ? $request->session()->get('loan_legacy_member') : null;
        if ($isLegacy && (!$legacyKey || !$legacySnapshot)) {
            return redirect()->route('member.loan-applications.index')->with('error', 'আগের সদস্যের সেশন শেষ। আবার সদস্য তথ্য দিন।');
        }

        $loanApplication = $this->resolveApplicationForFormSave(
            $request,
            2,
            (int) $validated['loan_product_id'],
            (int) $validated['loan_category_id'],
            (float) $validated['requested_amount'],
            $memberId,
            $legacyKey,
            $legacySnapshot
        );

        $loanProduct = LoanProduct::find($validated['loan_product_id']);
        $agreementData = $validated['agreement_data'];
        $purposeOfLoan = $agreementData['loan_purpose'] ?? $agreementData['purpose_of_loan'] ?? 'জামিনদার/দায়িত্ব গ্রহণকারীর অঙ্গীকার নামা অনুযায়ী';
        $numberOfInstallments = $loanProduct->number_of_installments ?? 1;
        if ($loanProduct && $loanProduct->installment_type === 'weekly' && $loanProduct->duration_months) {
            $numberOfInstallments = (int) ceil(($loanProduct->duration_months * 30) / 7);
        } elseif ($loanProduct && $loanProduct->duration_months) {
            $numberOfInstallments = (int) $loanProduct->duration_months;
        }

        $loanApplication->guarantor_info = $agreementData;
        $loanApplication->form_type = 'guarantor_commitment';
        $loanApplication->purpose_of_loan = $purposeOfLoan;
        $loanApplication->number_of_installments = $numberOfInstallments;
        $loanApplication->save();

        return redirect()->route('member.loan-applications.show', $loanApplication->id)
            ->with('success', 'জামিনদার/দায়িত্ব গ্রহণকারীর অঙ্গীকার নামা সংরক্ষিত হয়েছে।');
    }

    /**
     * Show death risk fund form
     */
    public function deathRiskFund(Request $request)
    {
        $loanProductId = (int) $request->input('product_id');
        $loanCategoryId = (int) $request->input('category_id');
        $requestedAmount = (float) $request->input('amount', 0);

        [$member, $existingApplication, $legacyKey] = $this->resolveMemberForForm($request, $loanProductId, $loanCategoryId, 3);
        if (!$member) {
            return redirect()->route('member.loan-applications.index')->with('error', 'সদস্য তথ্য পাওয়া যাচ্ছে না।');
        }

        $loanProduct = LoanProduct::findOrFail($loanProductId);
        $loanCategory = LoanCategory::findOrFail($loanCategoryId);
        $user = $request->user();
        $branch = $user->branch;
        if ($existingApplication && $existingApplication->status === LoanApplication::STATUS_PENDING_DISBURSEMENT && $existingApplication->approved_amount !== null) {
            $requestedAmount = (float) $existingApplication->approved_amount;
        }

        return Inertia::render('Member/LoanApplications/Forms/DeathRiskFund', [
            'member' => $member,
            'loanProduct' => $loanProduct,
            'loanCategory' => $loanCategory,
            'requestedAmount' => $requestedAmount,
            'branch' => $branch,
            'existingApplication' => $existingApplication,
            'savedData' => $existingApplication?->nominee_info,
            'isLegacy' => $request->boolean('legacy'),
        ]);
    }

    /**
     * Save death risk fund draft
     */
    public function saveDeathRiskFundDraft(Request $request)
    {
        $isLegacy = $request->boolean('legacy');
        $rules = [
            'loan_product_id' => 'required|exists:loan_products,id',
            'loan_category_id' => 'required|exists:loan_categories,id',
            'requested_amount' => 'required|numeric|min:0',
            'form_data' => 'required|array',
        ];
        if (!$isLegacy) {
            $rules['member_id'] = 'required|exists:member_admissions,id';
        }
        $validated = $request->validate($rules);

        $memberId = $isLegacy ? null : (int) $validated['member_id'];
        $legacyKey = $isLegacy ? $request->session()->get('loan_legacy_key') : null;
        $legacySnapshot = $isLegacy ? $request->session()->get('loan_legacy_member') : null;
        if ($isLegacy && (!$legacyKey || !$legacySnapshot)) {
            return redirect()->route('member.loan-applications.index')->with('error', 'আগের সদস্যের সেশন শেষ। আবার সদস্য তথ্য দিন।');
        }

        $loanApplication = $this->resolveApplicationForFormSave(
            $request,
            3,
            (int) $validated['loan_product_id'],
            (int) $validated['loan_category_id'],
            (float) $validated['requested_amount'],
            $memberId,
            $legacyKey,
            $legacySnapshot
        );

        $formData = $validated['form_data'];
        $loanProduct = LoanProduct::find($validated['loan_product_id']);
        $numberOfInstallments = $loanProduct->number_of_installments ?? 1;
        if ($loanProduct && $loanProduct->installment_type === 'weekly' && $loanProduct->duration_months) {
            $numberOfInstallments = (int) ceil(($loanProduct->duration_months * 30) / 7);
        } elseif ($loanProduct && $loanProduct->duration_months) {
            $numberOfInstallments = (int) $loanProduct->duration_months;
        }

        $loanApplication->nominee_info = $formData;
        $loanApplication->form_type = 'death_risk_fund';
        $loanApplication->purpose_of_loan = $formData['component_name'] ?? 'মৃত্যুজনিত ঋণঝুঁকি তহবিলে অন্তর্ভুক্তি';
        $loanApplication->number_of_installments = $numberOfInstallments;
        $loanApplication->save();

        if ($request->boolean('auto_disburse')) {
            if (! $this->isBranchUserRole($request->user())) {
                abort(403, 'শুধুমাত্র শাখা ব্যবহারকারী ঋণ বিতরণ করতে পারবেন।');
            }

            $formSaved = LoanFormVisibility::buildFormSavedMap($loanApplication->fresh());
            $disburseRequired = LoanFormVisibility::disburseFormIds();
            if (! LoanFormVisibility::allRequiredFormsSaved($disburseRequired, $formSaved)) {
                return redirect()->route('member.loan-applications.show', $loanApplication->id)
                    ->with('error', 'বিতরণের আগে জামিনদার অঙ্গীকার (ফর্ম ২) ও মৃত্যুঝুঁকি তহবিল (ফর্ম ৩) পূরণ করতে হবে।');
            }

            LoanApplication::whereKey($loanApplication->id)->update([
                'status' => LoanApplication::STATUS_DISBURSED,
                'disbursed_by' => $request->user()->id,
                'disbursed_at' => now(),
            ]);

            return redirect()->route('member.loan-applications.index')
                ->with('success', 'ঋণ সফলভাবে বিতরণ করা হয়েছে।');
        }

        return redirect()->route('member.loan-applications.show', $loanApplication->id)
            ->with('success', 'মৃত্যুজনিত ঋণঝুঁকি তহবিল আবেদন সংরক্ষিত হয়েছে।');
    }

    /**
     * Show field investigation form
     */
    public function fieldInvestigation(Request $request)
    {
        $applicationId = (int) $request->input('application_id');
        if ($applicationId > 0) {
            $existingApplication = LoanApplication::with(['memberAdmission.samity', 'loanProduct', 'loanCategory'])
                ->findOrFail($applicationId);
            $this->ensureApplicationAccessibleToUser($existingApplication, $request->user());
            $member = $existingApplication->memberAdmission;
            if (! $member) {
                return redirect()->route('member.loan-applications.index')->with('error', 'সদস্য তথ্য পাওয়া যাচ্ছে না।');
            }
            $loanProduct = $existingApplication->loanProduct;
            $loanCategory = $existingApplication->loanCategory;
            $loanProductId = (int) $loanProduct->id;
            $loanCategoryId = (int) $loanCategory->id;
            $requestedAmount = (float) ($existingApplication->requested_amount ?? 0);
            $legacyKey = null;
        } else {
            $loanProductId = (int) $request->input('product_id');
            $loanCategoryId = (int) $request->input('category_id');
            $requestedAmount = (float) $request->input('amount', 0);

            [$member, $existingApplication, $legacyKey] = $this->resolveMemberForForm($request, $loanProductId, $loanCategoryId, 4);
            if (!$member) {
                return redirect()->route('member.loan-applications.index')->with('error', 'সদস্য তথ্য পাওয়া যাচ্ছে না।');
            }

            $loanProduct = LoanProduct::findOrFail($loanProductId);
            $loanCategory = LoanCategory::findOrFail($loanCategoryId);
        }
        $user = $request->user();
        $branch = $user->branch;

        // Loan round (দফা): for legacy admissions use stored loan_dofa as base; else count+1
        $loanRound = 1;
        if (!$request->boolean('legacy') && isset($member->id)) {
            $existingCount = LoanApplication::where('member_admission_id', $member->id)
                ->whereIn('status', [LoanApplication::STATUS_APPROVED, LoanApplication::STATUS_DISBURSED])
                ->count();
            if (!empty($member->is_legacy) && !empty($member->loan_dofa)) {
                $loanRound = (int) $member->loan_dofa + $existingCount;
            } else {
                $loanRound = $existingCount + 1;
            }
        }
        $savingsProducts = SavingsProduct::where('is_active', true)
            ->orderBy('display_order')
            ->orderBy('product_code')
            ->get(['id', 'product_code', 'product_name', 'product_name_bn']);

        return Inertia::render('Member/LoanApplications/Forms/FieldInvestigation', [
            'member' => $member,
            'loanProduct' => $loanProduct,
            'loanCategory' => $loanCategory,
            'requestedAmount' => $requestedAmount,
            'branch' => $branch,
            'existingApplication' => $existingApplication,
            'savingsProducts' => $savingsProducts,
            'loanRound' => $loanRound,
            'savedData' => $existingApplication?->asset_info,
            'isLegacy' => $request->boolean('legacy'),
        ]);
    }

    /**
     * Save field investigation draft
     */
    public function saveFieldInvestigationDraft(Request $request)
    {
        $isLegacy = $request->boolean('legacy');
        $rules = [
            'loan_product_id' => 'required|exists:loan_products,id',
            'loan_category_id' => 'required|exists:loan_categories,id',
            'requested_amount' => 'required|numeric|min:0',
            'form_data' => 'required|array',
        ];
        if (!$isLegacy) {
            $rules['member_id'] = 'required|exists:member_admissions,id';
        }
        $validated = $request->validate($rules);

        $memberId = $isLegacy ? null : (int) $validated['member_id'];
        $legacyKey = $isLegacy ? $request->session()->get('loan_legacy_key') : null;
        $legacySnapshot = $isLegacy ? $request->session()->get('loan_legacy_member') : null;
        if ($isLegacy && (!$legacyKey || !$legacySnapshot)) {
            return redirect()->route('member.loan-applications.index')->with('error', 'আগের সদস্যের সেশন শেষ। আবার সদস্য তথ্য দিন।');
        }

        $loanApplication = $this->resolveApplicationForFormSave(
            $request,
            4,
            (int) $validated['loan_product_id'],
            (int) $validated['loan_category_id'],
            (float) $validated['requested_amount'],
            $memberId,
            $legacyKey,
            $legacySnapshot
        );

        $formData = $validated['form_data'];
        $loanProduct = LoanProduct::find($validated['loan_product_id']);
        $numberOfInstallments = $loanProduct->number_of_installments ?? 1;
        if ($loanProduct && $loanProduct->installment_type === 'weekly' && $loanProduct->duration_months) {
            $numberOfInstallments = (int) ceil(($loanProduct->duration_months * 30) / 7);
        } elseif ($loanProduct && $loanProduct->duration_months) {
            $numberOfInstallments = (int) $loanProduct->duration_months;
        }

        $loanApplication->asset_info = $formData;
        $loanApplication->form_type = 'field_investigation';
        $loanApplication->purpose_of_loan = 'সরেজমিনে তদন্ত প্রতিবেদন';
        $loanApplication->number_of_installments = $numberOfInstallments;
        $loanApplication->save();

        $resumeApprovalId = (int) $request->input('resume_approval_id', 0);
        if ($resumeApprovalId > 0) {
            $loanApproval = LoanApplicationApproval::with('loanApplication')->findOrFail($resumeApprovalId);
            abort_unless((int) $loanApproval->user_id === (int) $request->user()->id, 403);

            try {
                app(ApprovalService::class)->approveLoan(
                    $loanApproval,
                    $request->input('resume_comments'),
                    (float) $request->input('resume_approved_amount', 0)
                );
            } catch (\Exception $e) {
                return redirect()->route('approvals.index')
                    ->with('error', $e->getMessage());
            }

            return redirect()->route('approvals.index')
                ->with('success', 'সরেজমিনে তদন্ত প্রতিবেদন সংরক্ষণ ও ঋণ অনুমোদন সম্পন্ন হয়েছে।');
        }

        return redirect()->route('approvals.index')
            ->with('success', 'সরেজমিনে তদন্ত প্রতিবেদন সংরক্ষিত হয়েছে। এখন অনুমোদন/ফরওয়ার্ড করতে পারবেন।');
    }

    /**
     * Show loan application approval form (Jagoron/Buniad/Agrosor)
     */
    public function loanApplicationApproval(Request $request)
    {
        $loanProductId = (int) $request->input('product_id');
        $loanCategoryId = (int) $request->input('category_id');
        $requestedAmount = (float) $request->input('amount', 0);

        [$member, $existingApplication, $legacyKey] = $this->resolveMemberForForm($request, $loanProductId, $loanCategoryId, 5);
        if (!$member) {
            return redirect()->route('member.loan-applications.index')->with('error', 'সদস্য তথ্য পাওয়া যাচ্ছে না।');
        }

        if (!$request->boolean('legacy')) {
            $member = MemberAdmission::with(['samity', 'familyMembers', 'otherAssets', 'branch'])->find($member->id);
        }
        $loanProduct = LoanProduct::findOrFail($loanProductId);
        $loanCategory = LoanCategory::findOrFail($loanCategoryId);
        $user = $request->user();
        $branch = $user->branch;

        $loanRound = 1;
        if (!$request->boolean('legacy') && isset($member->id)) {
            $existingCount = LoanApplication::where('member_admission_id', $member->id)
                ->whereIn('status', [LoanApplication::STATUS_APPROVED, LoanApplication::STATUS_DISBURSED])
                ->count();
            if (!empty($member->is_legacy) && !empty($member->loan_dofa)) {
                $loanRound = (int) $member->loan_dofa + $existingCount;
            } else {
                $loanRound = $existingCount + 1;
            }
        }
        $savingsProducts = SavingsProduct::where('is_active', true)
            ->orderBy('display_order')
            ->orderBy('product_code')
            ->get(['id', 'product_code', 'product_name', 'product_name_bn']);

        return Inertia::render('Member/LoanApplications/Forms/LoanApplicationApproval', [
            'member' => $member,
            'loanProduct' => $loanProduct,
            'loanCategory' => $loanCategory,
            'requestedAmount' => $requestedAmount,
            'branch' => $branch,
            'existingApplication' => $existingApplication,
            'savingsProducts' => $savingsProducts,
            'loanRound' => $loanRound,
            'savedData' => $existingApplication?->business_plan,
            'isLegacy' => $request->boolean('legacy'),
        ]);
    }

    /**
     * Save loan application approval draft
     */
    public function saveLoanApplicationApprovalDraft(Request $request)
    {
        try {
            $isLegacy = $request->boolean('legacy') || $request->boolean('is_legacy');
            $rules = [
                'loan_product_id' => 'required|exists:loan_products,id',
                'loan_category_id' => 'required|exists:loan_categories,id',
                'requested_amount' => 'required|numeric|min:0',
                'form_data' => 'nullable|array',
            ];
            if (!$isLegacy) {
                $rules['member_id'] = 'required|exists:member_admissions,id';
            }
            $validated = $request->validate($rules);

            $memberId = $isLegacy ? null : (int) $validated['member_id'];
            $legacyKey = $isLegacy ? $request->session()->get('loan_legacy_key') : null;
            $legacySnapshot = $isLegacy ? $request->session()->get('loan_legacy_member') : null;
            if ($isLegacy && (!$legacyKey || !$legacySnapshot)) {
                return redirect()->route('member.loan-applications.index')->with('error', 'আগের সদস্যের সেশন শেষ। আবার সদস্য তথ্য দিন।');
            }

            $loanApplication = $this->resolveApplicationForFormSave(
                $request,
                5,
                (int) $validated['loan_product_id'],
                (int) $validated['loan_category_id'],
                (float) $validated['requested_amount'],
                $memberId,
                $legacyKey,
                $legacySnapshot
            );

            $formData = $validated['form_data'] ?? [];
            if (!is_array($formData)) {
                $formData = [];
            }
            $existingPlan = is_array($loanApplication->business_plan) ? $loanApplication->business_plan : [];
            $formData = $this->mergeSoftDraftFormData($existingPlan, $formData);

            // চূড়ান্ত অনুমোদিত পরিমাণ শুধু অনুমোদনকারী সেট করেন — ফর্ম সেভ থেকে আসবে না
            foreach (['final_approved_loan_amount_digits', 'final_approved_loan_amount_words', 'final_approver_comments'] as $key) {
                $formData[$key] = $existingPlan[$key] ?? ($formData[$key] ?? '');
            }

            $loanProduct = LoanProduct::find($validated['loan_product_id']);
            $numberOfInstallments = $loanProduct->number_of_installments ?? 1;
            if ($loanProduct && $loanProduct->installment_type === 'weekly' && $loanProduct->duration_months) {
                $numberOfInstallments = (int) ceil(($loanProduct->duration_months * 30) / 7);
            } elseif ($loanProduct && $loanProduct->duration_months) {
                $numberOfInstallments = (int) $loanProduct->duration_months;
            }

            $loanApplication->business_plan = $formData;
            $loanApplication->form_type = 'loan_application_approval';
            $loanApplication->purpose_of_loan = $formData['loan_purpose'] ?? ($loanApplication->purpose_of_loan ?: 'জাগরণ/বুনিয়াদ/আগ্রসর ঋণ আবেদন');
            $loanApplication->number_of_installments = $numberOfInstallments;
            $loanApplication->save();

            return redirect()->route('member.loan-applications.index')
                ->with('success', 'ঋণ আবেদন খসড়া হিসেবে সংরক্ষিত হয়েছে।');
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            \Log::error('Loan approval draft save failed: '.$e->getMessage());

            return back()->withInput()->with('error', 'খসড়া সংরক্ষণ ব্যর্থ: '.$e->getMessage().' — আগের সংরক্ষিত ডাটা মুছে যায়নি।');
        }
    }

    /**
     * Resolve an issue (mark as resolved with response)
     */
    public function resolveIssue(Request $request, $applicationId, $issueId)
    {
        $application = LoanApplication::findOrFail($applicationId);
        $this->ensureApplicationAccessibleToUser($application, $request->user());
        $issue = LoanApplicationIssue::where('loan_application_id', $applicationId)
            ->where('id', $issueId)
            ->firstOrFail();

        $validated = $request->validate([
            'response_message' => 'required|string|min:10|max:2000',
        ]);

        $issue->markResolved(auth()->id(), $validated['response_message']);

        return back()->with('success', 'সমস্যা সমাধান করা হয়েছে।');
    }

    /**
     * Reject an issue (dispute it)
     */
    public function rejectIssue(Request $request, $applicationId, $issueId)
    {
        $application = LoanApplication::findOrFail($applicationId);
        $this->ensureApplicationAccessibleToUser($application, $request->user());
        $issue = LoanApplicationIssue::where('loan_application_id', $applicationId)
            ->where('id', $issueId)
            ->firstOrFail();

        $validated = $request->validate([
            'response_message' => 'required|string|min:10|max:2000',
        ]);

        $issue->markRejected(auth()->id(), $validated['response_message']);

        return back()->with('success', 'সমস্যা প্রত্যাখ্যান করা হয়েছে।');
    }

    /**
     * Delete loan application (only if draft)
     */
    public function destroy($id)
    {
        $application = LoanApplication::findOrFail($id);
        $user = auth()->user();
        $this->ensureApplicationAccessibleToUser($application, $user);
        
        // Only allow deletion if status is draft
        if ($application->status !== LoanApplication::STATUS_DRAFT) {
            return back()->withErrors(['error' => 'শুধুমাত্র খসড়া (Draft) অবস্থার আবেদন মুছে ফেলা যাবে।']);
        }
        
        $application->delete();
        
        return redirect()->route('member.loan-applications.index')
            ->with('success', 'ঋণ আবেদন সফলভাবে মুছে ফেলা হয়েছে।');
    }

}
