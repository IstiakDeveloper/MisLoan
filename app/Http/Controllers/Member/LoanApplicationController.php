<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Controller;
use App\Models\LoanApplication;
use App\Models\LoanCategory;
use App\Models\LoanProduct;
use App\Models\MemberAdmission;
use App\Services\ApprovalService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class LoanApplicationController extends Controller
{
    /**
     * Display available loan products
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $selectedDate = $request->input('date', now()->toDateString());

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

        // Get user's loan applications for selected date
        // Use date range instead of whereDate() to allow index usage and prevent memory issues
        $startOfDay = \Carbon\Carbon::parse($selectedDate)->startOfDay();
        $endOfDay = \Carbon\Carbon::parse($selectedDate)->endOfDay();
        
        // Main query: only small columns (no LOBs) so ORDER BY uses minimal sort buffer.
        $applications = LoanApplication::with([
                'loanProduct:id,product_name,product_name_bn,product_code,installment_type',
                'loanCategory:id,category_name,category_name_bn',
                'memberAdmission:id,applicant_name_bn,application_no',
                'branch:id,name,code'
            ])
            ->when($user->branch_id, function ($query) use ($user) {
                $query->where('branch_id', $user->branch_id);
            })
            ->whereBetween('created_at', [$startOfDay, $endOfDay])
            ->orderBy('created_at', 'desc')
            ->select([
                'id', 'application_no', 'member_admission_id', 'loan_product_id',
                'loan_category_id', 'branch_id', 'form_type', 'status',
                'requested_amount', 'approved_amount', 'created_at', 'updated_at',
                'submitted_at', 'reviewed_at', 'purpose_of_loan',
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

        // ফর্ম অনুযায়ী কমপ্লিশন: প্রতিটি আবেদনের জন্য visibleFormIds + কোন ফর্ম সেভ আছে
        $oneLakh = 100000.0;
        $applications = $applications->map(function ($app) use ($oneLakh, $formFlags) {
            $product = $app->loanProduct;
            $installmentType = $product->installment_type ?? 'monthly';
            $amount = (float) $app->requested_amount;

            if (strtolower((string) $installmentType) === 'weekly') {
                $visibleFormIds = [1, 2, 3, 4];
            } else {
                $visibleFormIds = $amount < $oneLakh ? [5, 2, 3, 4] : [5, 3];
            }

            $flags = $formFlags->get($app->id);
            $hasForm1 = $flags ? (bool) $flags->has_form_1 : false;
            $hasForm2 = $flags ? (bool) $flags->has_form_2 : false;
            $hasForm3 = $flags ? (bool) $flags->has_form_3 : false;
            $hasForm4 = $flags ? (bool) $flags->has_form_4 : false;
            $hasForm5 = $flags ? (bool) $flags->has_form_5 : false;

            $formSaved = [
                1 => $hasForm1,
                2 => $hasForm2,
                3 => $hasForm3,
                4 => $hasForm4,
                5 => $hasForm5,
            ];

            $allRequiredSaved = collect($visibleFormIds)->every(fn ($id) => $formSaved[$id] ?? false);

            $app->visible_form_ids = $visibleFormIds;
            $app->form_saved = $formSaved;
            $app->all_forms_complete = $allRequiredSaved;
            return $app;
        });

        // Calculate stats for the selected date
        $stats = [
            'total' => $applications->count(),
            'draft' => $applications->where('status', LoanApplication::STATUS_DRAFT)->count(),
            'submitted' => $applications->where('status', LoanApplication::STATUS_SUBMITTED)->count(),
            'approved' => $applications->where('status', LoanApplication::STATUS_APPROVED)->count(),
            'rejected' => $applications->where('status', LoanApplication::STATUS_REJECTED)->count(),
        ];

        return Inertia::render('Member/LoanApplications/Index', [
            'categories' => $categories,
            'applications' => $applications,
            'stats' => $stats,
            'selectedDate' => $selectedDate,
        ]);
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

        // Determine form type based on:
        // Form 1: weekly product AND requested amount < 100,000
        // Form 2: monthly product OR requested amount >= 100,000
        $formType = 1; // Default to Form 1

        if ($loanProduct) {
            $isWeekly = $loanProduct->installment_type === 'weekly';
            $isSmallLoan = $requestedAmount < 100000;

            // Form 1 only if weekly AND small loan
            // Otherwise Form 2
            $formType = ($isWeekly && $isSmallLoan) ? 1 : 2;
        }

        $props = [
            'loanProduct' => $loanProduct,
            'branch' => $branch,
            'categories' => $categories,
            'products' => $products,
            'formType' => $formType,
            'requestedAmount' => $requestedAmount,
            'memberId' => $memberId,
        ];

        // Route to the correct form component based on form type
        $component = $formType === 2
            ? 'Member/LoanApplications/CreateType2'
            : 'Member/LoanApplications/CreateType1';

        return Inertia::render($component, $props);
    }

    /**
     * Search for approved members by branch
     */
    public function searchMembers(Request $request)
    {
        $search = $request->input('query');
        $branchId = $request->user()->branch_id;

        $members = MemberAdmission::where('branch_id', $branchId)
            ->where(function ($query) use ($search) {
                $query->where('applicant_name_en', 'like', "%{$search}%")
                    ->orWhere('applicant_name_bn', 'like', "%{$search}%")
                    ->orWhere('nid_number', 'like', "%{$search}%")
                    ->orWhere('mobile_number', 'like', "%{$search}%")
                    ->orWhere('application_no', 'like', "%{$search}%");
            })
            ->select('id', 'application_no', 'applicant_name_en', 'applicant_name_bn', 'nid_number', 'mobile_number', 'father_name_en', 'mother_name_en', 'samity_id', 'status')
            ->with('samity:id,samity_name,samity_name_bn')
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get();

        return response()->json($members);
    }

    /**
     * Store loan application
     */
    public function store(Request $request)
    {
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
            'memberAdmission',
            'branch',
            'samity',
            'submittedBy',
            'reviewedBy',
            'disbursedBy',
            'approvals.user',
        ])->findOrFail($id);

        $oneLakh = 100000.0;
        $product = $application->loanProduct;
        $installmentType = $product->installment_type ?? 'monthly';
        $amount = (float) $application->requested_amount;

        if (strtolower((string) $installmentType) === 'weekly') {
            $visibleFormIds = [1, 2, 3, 4];
        } else {
            $visibleFormIds = $amount < $oneLakh ? [5, 2, 3, 4] : [5, 3];
        }

        $formSaved = [
            1 => !empty($application->loan_agreement_data),
            2 => !empty($application->guarantor_info),
            3 => !empty($application->nominee_info),
            4 => !empty($application->asset_info),
            5 => !empty($application->business_plan),
        ];
        $allFormsComplete = collect($visibleFormIds)->every(fn ($id) => $formSaved[$id] ?? false);

        $application->visible_form_ids = $visibleFormIds;
        $application->form_saved = $formSaved;
        $application->all_forms_complete = $allFormsComplete;

        $availableApprovers = [];
        if ($application->branch_id) {
            $availableApprovers = app(ApprovalService::class)->getAvailableApprovers($application->branch_id);
        }

        return Inertia::render('Member/LoanApplications/Show', [
            'application' => $application,
            'availableApprovers' => $availableApprovers,
            'routes' => [
                'index' => route('member.loan-applications.index'),
                'edit' => route('member.loan-applications.edit', $application->id),
                'print' => route('member.loan-applications.print', $application->id),
                'submit' => route('member.loan-applications.submit', $application->id),
            ],
        ]);
    }

    /**
     * Submit loan application for review (with approver selection)
     */
    public function submit(Request $request, $id)
    {
        $application = LoanApplication::with('loanProduct')->findOrFail($id);

        if (!$application->canBeEdited()) {
            return back()->withErrors(['error' => 'This application cannot be submitted']);
        }

        $request->validate([
            'selected_approvers' => 'required|array|min:1',
            'selected_approvers.*' => 'exists:users,id',
        ], [
            'selected_approvers.required' => 'কমপক্ষে একজন অ্যাপ্রুভার সিলেক্ট করুন।',
        ]);

        $oneLakh = 100000.0;
        $product = $application->loanProduct;
        $installmentType = $product->installment_type ?? 'monthly';
        $amount = (float) $application->requested_amount;
        if (strtolower((string) $installmentType) === 'weekly') {
            $visibleFormIds = [1, 2, 3, 4];
        } else {
            $visibleFormIds = $amount < $oneLakh ? [5, 2, 3, 4] : [5, 3];
        }

        $formSaved = [
            1 => !empty($application->loan_agreement_data),
            2 => !empty($application->guarantor_info),
            3 => !empty($application->nominee_info),
            4 => !empty($application->asset_info),
            5 => !empty($application->business_plan),
        ];
        $allRequiredSaved = collect($visibleFormIds)->every(fn ($id) => $formSaved[$id] ?? false);

        if (!$allRequiredSaved) {
            return back()->withErrors(['error' => 'সব প্রয়োজনীয় ফর্ম পূরণ করে তারপর সাবমিট করুন।']);
        }

        DB::beginTransaction();
        try {
            $application->update([
                'selected_approvers' => $request->selected_approvers,
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

        return redirect()->route('member.loan-applications.show', $application->id)
            ->with('success', 'ঋণ আবেদন সাবমিট হয়েছে। এরিয়া/জোন অ্যাপ্রুভার অনুমোদন করলে হেড অফিসে যাবে।');
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

        if (!$application->canBeEdited()) {
            return redirect()->route('member.loan-applications.show', $application->id)
                ->withErrors(['error' => 'This application cannot be edited']);
        }

        // If this is a member-side form-based application (loan agreement, guarantor commitment, death risk fund, field investigation, or loan application approval),
        // always send user back to the form selection screen instead of a generic edit page.
        if (in_array($application->form_type, ['loan_agreement', 'guarantor_commitment', 'death_risk_fund', 'field_investigation', 'loan_application_approval'], true)) {
            return redirect()->route('member.loan-applications.form-selection', [
                'member_id' => $application->member_admission_id,
                'loan_product_id' => $application->loan_product_id,
                'loan_category_id' => $application->loan_category_id,
                'requested_amount' => $application->requested_amount,
            ]);
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

        if (!$application->canBeEdited()) {
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

        return Inertia::render('Member/LoanApplications/Print', [
            'application' => $application,
        ]);
    }

    /**
     * Show form selection page
     */
    public function formSelection(Request $request)
    {
        $memberId = $request->input('member_id');
        $loanProductId = $request->input('loan_product_id');
        $loanCategoryId = $request->input('loan_category_id');
        $requestedAmount = $request->input('requested_amount', 0);

        $member = MemberAdmission::with('samity')->findOrFail($memberId);
        $loanProduct = LoanProduct::findOrFail($loanProductId);
        $loanCategory = LoanCategory::findOrFail($loanCategoryId);

        // Get the draft application (if exists) - same draft for all forms
        $draftApplication = LoanApplication::where('member_admission_id', $memberId)
            ->where('loan_product_id', $loanProductId)
            ->where('loan_category_id', $loanCategoryId)
            ->where('status', LoanApplication::STATUS_DRAFT)
            ->first();

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

        // Loan product অনুযায়ী শুধু প্রয়োজনীয় ফর্ম দেখানো হবে:
        // ঋণ চুক্তিপত্র (১ নং) শুধু সাপ্তাহিকের ক্ষেত্রে; মাসিকের ক্ষেত্রে থাকবে না।
        // সাপ্তাহিক (weekly): ১, ২, ৩, ৪ নং ফর্ম
        // মাসিক (monthly) ১ লাখের নিচে: ৫ নং ১ নাম্বারে (ঋণ চুক্তির বদলে), তারপর ২, ৩, ৪
        // মাসিক ১ লাখ বা তার উপরে: শুধু ৫ নং ও ৩ নং ফর্ম
        $installmentType = $loanProduct->installment_type ?? 'monthly';
        $amount = (float) $requestedAmount;
        $oneLakh = 100000.0;

        if (strtolower((string) $installmentType) === 'weekly') {
            $visibleFormIds = [1, 2, 3, 4];
        } else {
            // monthly (অথবা lump_sum / অন্য যেকোনো) — ঋণ চুক্তিপত্র (১ নং) নাই
            if ($amount < $oneLakh) {
                $visibleFormIds = [5, 2, 3, 4]; // ৫ নং প্রথমে, তারপর ২, ৩, ৪
            } else {
                $visibleFormIds = [5, 3]; // শুধু ৫ ও ৩ নং
            }
        }

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
        ]);
    }

    /**
     * Show loan agreement form
     */

    /**
     * Show loan agreement form
     */
    public function loanAgreement(Request $request)
    {
        $memberId = $request->input('member_id');
        $loanProductId = $request->input('product_id');
        $loanCategoryId = $request->input('category_id');
        $requestedAmount = $request->input('amount', 0);

        $member = MemberAdmission::with('samity')->findOrFail($memberId);
        $loanProduct = LoanProduct::findOrFail($loanProductId);
        $loanCategory = LoanCategory::findOrFail($loanCategoryId);

        $user = $request->user();
        $branch = $user->branch;

        // Check if there's existing draft
        $existingApplication = LoanApplication::where('member_admission_id', $memberId)
            ->where('loan_product_id', $loanProductId)
            ->where('loan_category_id', $loanCategoryId)
            ->where('status', LoanApplication::STATUS_DRAFT)
            ->first();

        return Inertia::render('Member/LoanApplications/Forms/LoanAgreement', [
            'member' => $member,
            'loanProduct' => $loanProduct,
            'loanCategory' => $loanCategory,
            'requestedAmount' => (float) $requestedAmount,
            'branch' => $branch,
            'existingApplication' => $existingApplication,
            'savedData' => $existingApplication?->loan_agreement_data,
        ]);
    }

    /**
     * Show guarantor commitment form
     */
    public function guarantorCommitment(Request $request)
    {
        $memberId = $request->input('member_id');
        $loanProductId = $request->input('product_id');
        $loanCategoryId = $request->input('category_id');
        $requestedAmount = $request->input('amount', 0);

        $member = MemberAdmission::with('samity')->findOrFail($memberId);
        $loanProduct = LoanProduct::findOrFail($loanProductId);
        $loanCategory = LoanCategory::findOrFail($loanCategoryId);

        $user = $request->user();
        $branch = $user->branch;

        // Existing draft application for this member/product/category (any form)
        $existingApplication = LoanApplication::where('member_admission_id', $memberId)
            ->where('loan_product_id', $loanProductId)
            ->where('loan_category_id', $loanCategoryId)
            ->where('status', LoanApplication::STATUS_DRAFT)
            ->first();

        return Inertia::render('Member/LoanApplications/Forms/GuarantorCommitment', [
            'member' => $member,
            'loanProduct' => $loanProduct,
            'loanCategory' => $loanCategory,
            'requestedAmount' => (float) $requestedAmount,
            'branch' => $branch,
            'existingApplication' => $existingApplication,
            // reuse guarantor_info array field to store this form's data
            'savedData' => $existingApplication?->guarantor_info,
        ]);
    }

    public function saveLoanAgreementDraft(Request $request)
    {
        $validated = $request->validate([
            'member_id' => 'required|exists:member_admissions,id',
            'loan_product_id' => 'required|exists:loan_products,id',
            'loan_category_id' => 'required|exists:loan_categories,id',
            'requested_amount' => 'required|numeric|min:0',
            'agreement_data' => 'required|array',
        ]);

        $user = $request->user();
        $member = MemberAdmission::find($validated['member_id']);
        $agreementData = $validated['agreement_data'];

        // Ensure required fields have values
        $purposeOfLoan = $agreementData['loan_purpose'] ?? 'খান চুক্তিপত্র অনুযায়ী';
        $numberOfInstallments = $agreementData['number_of_installments'] ?? 1;

        // Find existing draft or create new without violating NOT NULL constraints
        $loanApplication = LoanApplication::firstOrNew([
            'member_admission_id' => $validated['member_id'],
            'loan_product_id' => $validated['loan_product_id'],
            'loan_category_id' => $validated['loan_category_id'],
            'status' => LoanApplication::STATUS_DRAFT,
        ]);

        // Only generate application_no when creating first time
        if (!$loanApplication->exists || !$loanApplication->application_no) {
            $loanApplication->application_no = LoanApplication::generateApplicationNo();
        }

        // Always update the rest of the fields for this draft
        $loanApplication->branch_id = $user->branch_id;
        $loanApplication->samity_id = $member->samity_id;
        $loanApplication->requested_amount = $validated['requested_amount'];
        $loanApplication->loan_agreement_data = $agreementData;
        $loanApplication->form_type = 'loan_agreement';
        $loanApplication->purpose_of_loan = $purposeOfLoan;
        $loanApplication->number_of_installments = $numberOfInstallments;
        $loanApplication->submitted_by = $user->id;

        $loanApplication->save();

        return redirect()->route('member.loan-applications.index')
            ->with('success', 'খান চুক্তিপত্র সংরক্ষিত হয়েছে। Loan Application ড্রাফট হিসেবে সংরক্ষিত আছে।');
    }

    /**
     * Save guarantor commitment draft
     */
    public function saveGuarantorCommitmentDraft(Request $request)
    {
        $validated = $request->validate([
            'member_id' => 'required|exists:member_admissions,id',
            'loan_product_id' => 'required|exists:loan_products,id',
            'loan_category_id' => 'required|exists:loan_categories,id',
            'requested_amount' => 'required|numeric|min:0',
            'agreement_data' => 'required|array',
        ]);

        $user = $request->user();
        $member = MemberAdmission::find($validated['member_id']);
        $agreementData = $validated['agreement_data'];
        $loanProduct = LoanProduct::find($validated['loan_product_id']);

        // Ensure required fields have values
        $purposeOfLoan = $agreementData['loan_purpose'] ?? $agreementData['purpose_of_loan'] ?? 'জামিনদার/দায়িত্ব গ্রহণকারীর অঙ্গীকার নামা অনুযায়ী';

        // Calculate number_of_installments from loan product
        $numberOfInstallments = $loanProduct->number_of_installments ?? 1;
        if ($loanProduct->installment_type === 'weekly' && $loanProduct->duration_months) {
            $numberOfInstallments = ceil(($loanProduct->duration_months * 30) / 7);
        } elseif ($loanProduct->duration_months) {
            $numberOfInstallments = $loanProduct->duration_months;
        }

        // Find existing draft or create new (shared draft for all member forms)
        $loanApplication = LoanApplication::firstOrNew([
            'member_admission_id' => $validated['member_id'],
            'loan_product_id' => $validated['loan_product_id'],
            'loan_category_id' => $validated['loan_category_id'],
            'status' => LoanApplication::STATUS_DRAFT,
        ]);

        // Only generate application_no when creating first time
        if (!$loanApplication->exists || !$loanApplication->application_no) {
            $loanApplication->application_no = LoanApplication::generateApplicationNo();
        }

        $loanApplication->branch_id = $user->branch_id;
        $loanApplication->samity_id = $member->samity_id;
        $loanApplication->requested_amount = $validated['requested_amount'];
        // store full form data in guarantor_info array field
        $loanApplication->guarantor_info = $agreementData;
        $loanApplication->form_type = 'guarantor_commitment'; // Set form_type for tracking
        $loanApplication->purpose_of_loan = $purposeOfLoan;
        $loanApplication->number_of_installments = $numberOfInstallments;
        $loanApplication->submitted_by = $user->id;

        $loanApplication->save();

        return redirect()->route('member.loan-applications.index')
            ->with('success', 'জামিনদার/দায়িত্ব গ্রহণকারীর অঙ্গীকার নামা ড্রাফট হিসেবে সংরক্ষিত হয়েছে।');
    }

    /**
     * Show death risk fund form
     */
    public function deathRiskFund(Request $request)
    {
        $memberId = $request->input('member_id');
        $loanProductId = $request->input('product_id');
        $loanCategoryId = $request->input('category_id');
        $requestedAmount = $request->input('amount', 0);

        $member = MemberAdmission::with('samity')->findOrFail($memberId);
        $loanProduct = LoanProduct::findOrFail($loanProductId);
        $loanCategory = LoanCategory::findOrFail($loanCategoryId);

        $user = $request->user();
        $branch = $user->branch;

        // Existing draft application for this member/product/category (any form)
        $existingApplication = LoanApplication::where('member_admission_id', $memberId)
            ->where('loan_product_id', $loanProductId)
            ->where('loan_category_id', $loanCategoryId)
            ->where('status', LoanApplication::STATUS_DRAFT)
            ->first();

        return Inertia::render('Member/LoanApplications/Forms/DeathRiskFund', [
            'member' => $member,
            'loanProduct' => $loanProduct,
            'loanCategory' => $loanCategory,
            'requestedAmount' => (float) $requestedAmount,
            'branch' => $branch,
            'existingApplication' => $existingApplication,
            // Store form data in nominee_info field (reusing existing JSON field)
            'savedData' => $existingApplication?->nominee_info,
        ]);
    }

    /**
     * Save death risk fund draft
     */
    public function saveDeathRiskFundDraft(Request $request)
    {
        $validated = $request->validate([
            'member_id' => 'required|exists:member_admissions,id',
            'loan_product_id' => 'required|exists:loan_products,id',
            'loan_category_id' => 'required|exists:loan_categories,id',
            'requested_amount' => 'required|numeric|min:0',
            'form_data' => 'required|array',
        ]);

        $user = $request->user();
        $member = MemberAdmission::find($validated['member_id']);
        $formData = $validated['form_data'];
        $loanProduct = LoanProduct::find($validated['loan_product_id']);

        // Ensure required fields have values
        $purposeOfLoan = $formData['component_name'] ?? 'মৃত্যুজনিত ঋণঝুঁকি তহবিলে অন্তর্ভুক্তি';

        // Calculate number_of_installments from loan product
        $numberOfInstallments = $loanProduct->number_of_installments ?? 1;
        if ($loanProduct->installment_type === 'weekly' && $loanProduct->duration_months) {
            $numberOfInstallments = ceil(($loanProduct->duration_months * 30) / 7);
        } elseif ($loanProduct->duration_months) {
            $numberOfInstallments = $loanProduct->duration_months;
        }

        // Find existing draft or create new (shared draft for all member forms)
        $loanApplication = LoanApplication::firstOrNew([
            'member_admission_id' => $validated['member_id'],
            'loan_product_id' => $validated['loan_product_id'],
            'loan_category_id' => $validated['loan_category_id'],
            'status' => LoanApplication::STATUS_DRAFT,
        ]);

        // Only generate application_no when creating first time
        if (!$loanApplication->exists || !$loanApplication->application_no) {
            $loanApplication->application_no = LoanApplication::generateApplicationNo();
        }

        $loanApplication->branch_id = $user->branch_id;
        $loanApplication->samity_id = $member->samity_id;
        $loanApplication->requested_amount = $validated['requested_amount'];
        // Store form data in nominee_info field (reusing existing JSON field)
        $loanApplication->nominee_info = $formData;
        $loanApplication->form_type = 'death_risk_fund'; // Set form_type for tracking
        $loanApplication->purpose_of_loan = $purposeOfLoan;
        $loanApplication->number_of_installments = $numberOfInstallments;
        $loanApplication->submitted_by = $user->id;

        $loanApplication->save();

        return redirect()->route('member.loan-applications.index')
            ->with('success', 'মৃত্যুজনিত ঋণঝুঁকি তহবিলে অন্তর্ভুক্তির আবেদন পত্র ড্রাফট হিসেবে সংরক্ষিত হয়েছে।');
    }

    /**
     * Show field investigation form
     */
    public function fieldInvestigation(Request $request)
    {
        $memberId = $request->input('member_id');
        $loanProductId = $request->input('product_id');
        $loanCategoryId = $request->input('category_id');
        $requestedAmount = $request->input('amount', 0);

        $member = MemberAdmission::with('samity')->findOrFail($memberId);
        $loanProduct = LoanProduct::findOrFail($loanProductId);
        $loanCategory = LoanCategory::findOrFail($loanCategoryId);

        $user = $request->user();
        $branch = $user->branch;

        // Existing draft application for this member/product/category (any form)
        $existingApplication = LoanApplication::where('member_admission_id', $memberId)
            ->where('loan_product_id', $loanProductId)
            ->where('loan_category_id', $loanCategoryId)
            ->where('status', LoanApplication::STATUS_DRAFT)
            ->first();

        return Inertia::render('Member/LoanApplications/Forms/FieldInvestigation', [
            'member' => $member,
            'loanProduct' => $loanProduct,
            'loanCategory' => $loanCategory,
            'requestedAmount' => (float) $requestedAmount,
            'branch' => $branch,
            'existingApplication' => $existingApplication,
            // Store form data in asset_info field (reusing existing JSON field)
            'savedData' => $existingApplication?->asset_info,
        ]);
    }

    /**
     * Save field investigation draft
     */
    public function saveFieldInvestigationDraft(Request $request)
    {
        $validated = $request->validate([
            'member_id' => 'required|exists:member_admissions,id',
            'loan_product_id' => 'required|exists:loan_products,id',
            'loan_category_id' => 'required|exists:loan_categories,id',
            'requested_amount' => 'required|numeric|min:0',
            'form_data' => 'required|array',
        ]);

        $user = $request->user();
        $member = MemberAdmission::find($validated['member_id']);
        $formData = $validated['form_data'];
        $loanProduct = LoanProduct::find($validated['loan_product_id']);

        // Ensure required fields have values
        $purposeOfLoan = 'সরেজমিনে তদন্ত প্রতিবেদন';

        // Calculate number_of_installments from loan product
        $numberOfInstallments = $loanProduct->number_of_installments ?? 1;
        if ($loanProduct->installment_type === 'weekly' && $loanProduct->duration_months) {
            $numberOfInstallments = ceil(($loanProduct->duration_months * 30) / 7);
        } elseif ($loanProduct->duration_months) {
            $numberOfInstallments = $loanProduct->duration_months;
        }

        // Find existing draft or create new (shared draft for all member forms)
        $loanApplication = LoanApplication::firstOrNew([
            'member_admission_id' => $validated['member_id'],
            'loan_product_id' => $validated['loan_product_id'],
            'loan_category_id' => $validated['loan_category_id'],
            'status' => LoanApplication::STATUS_DRAFT,
        ]);

        // Only generate application_no when creating first time
        if (!$loanApplication->exists || !$loanApplication->application_no) {
            $loanApplication->application_no = LoanApplication::generateApplicationNo();
        }

        $loanApplication->branch_id = $user->branch_id;
        $loanApplication->samity_id = $member->samity_id;
        $loanApplication->requested_amount = $validated['requested_amount'];
        // Store form data in asset_info field (reusing existing JSON field)
        $loanApplication->asset_info = $formData;
        $loanApplication->form_type = 'field_investigation'; // Set form_type for tracking
        $loanApplication->purpose_of_loan = $purposeOfLoan;
        $loanApplication->number_of_installments = $numberOfInstallments;
        $loanApplication->submitted_by = $user->id;

        $loanApplication->save();

        return redirect()->route('member.loan-applications.index')
            ->with('success', 'সরেজমিনে তদন্ত প্রতিবেদন ড্রাফট হিসেবে সংরক্ষিত হয়েছে।');
    }

    /**
     * Show loan application approval form (Jagoron/Buniad/Agrosor)
     */
    public function loanApplicationApproval(Request $request)
    {
        $memberId = $request->input('member_id');
        $loanProductId = $request->input('product_id');
        $loanCategoryId = $request->input('category_id');
        $requestedAmount = $request->input('amount', 0);

        // Load member with all relationships
        $member = MemberAdmission::with([
            'samity',
            'familyMembers',
            'otherAssets',
            'branch'
        ])->findOrFail($memberId);
        
        $loanProduct = LoanProduct::findOrFail($loanProductId);
        $loanCategory = LoanCategory::findOrFail($loanCategoryId);

        $user = $request->user();
        $branch = $user->branch;

        // Existing draft application for this member/product/category (any form)
        $existingApplication = LoanApplication::where('member_admission_id', $memberId)
            ->where('loan_product_id', $loanProductId)
            ->where('loan_category_id', $loanCategoryId)
            ->where('status', LoanApplication::STATUS_DRAFT)
            ->first();

        return Inertia::render('Member/LoanApplications/Forms/LoanApplicationApproval', [
            'member' => $member,
            'loanProduct' => $loanProduct,
            'loanCategory' => $loanCategory,
            'requestedAmount' => (float) $requestedAmount,
            'branch' => $branch,
            'existingApplication' => $existingApplication,
            // Store form data in business_plan JSON field (reusing existing JSON field)
            'savedData' => $existingApplication?->business_plan,
        ]);
    }

    /**
     * Save loan application approval draft
     */
    public function saveLoanApplicationApprovalDraft(Request $request)
    {
        $validated = $request->validate([
            'member_id' => 'required|exists:member_admissions,id',
            'loan_product_id' => 'required|exists:loan_products,id',
            'loan_category_id' => 'required|exists:loan_categories,id',
            'requested_amount' => 'required|numeric|min:0',
            'form_data' => 'required|array',
        ]);

        $user = $request->user();
        $member = MemberAdmission::find($validated['member_id']);
        $formData = $validated['form_data'];
        $loanProduct = LoanProduct::find($validated['loan_product_id']);

        $purposeOfLoan = $formData['loan_purpose'] ?? 'জাগরণ/বুনিয়াদ/আগ্রসর ঋণ আবেদন';

        $numberOfInstallments = $loanProduct->number_of_installments ?? 1;
        if ($loanProduct->installment_type === 'weekly' && $loanProduct->duration_months) {
            $numberOfInstallments = ceil(($loanProduct->duration_months * 30) / 7);
        } elseif ($loanProduct->duration_months) {
            $numberOfInstallments = $loanProduct->duration_months;
        }

        $loanApplication = LoanApplication::firstOrNew([
            'member_admission_id' => $validated['member_id'],
            'loan_product_id' => $validated['loan_product_id'],
            'loan_category_id' => $validated['loan_category_id'],
            'status' => LoanApplication::STATUS_DRAFT,
        ]);

        if (!$loanApplication->exists || !$loanApplication->application_no) {
            $loanApplication->application_no = LoanApplication::generateApplicationNo();
        }

        $loanApplication->branch_id = $user->branch_id;
        $loanApplication->samity_id = $member->samity_id;
        $loanApplication->requested_amount = $validated['requested_amount'];
        $loanApplication->business_plan = $formData; // Storing in business_plan JSON field
        $loanApplication->form_type = 'loan_application_approval';
        $loanApplication->purpose_of_loan = $purposeOfLoan;
        $loanApplication->number_of_installments = $numberOfInstallments;
        $loanApplication->submitted_by = $user->id;

        $loanApplication->save();

        return redirect()->route('member.loan-applications.index')
            ->with('success', 'জাগরণ/বুনিয়াদ/আগ্রসর ঋণ আবেদন ও অনুমোদনপত্র ড্রাফট হিসেবে সংরক্ষিত হয়েছে।');
    }

}
