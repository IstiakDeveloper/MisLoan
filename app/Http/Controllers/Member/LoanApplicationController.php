<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Controller;
use App\Models\LoanApplication;
use App\Models\LoanCategory;
use App\Models\LoanProduct;
use App\Models\MemberAdmission;
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
        $applications = LoanApplication::with(['loanProduct', 'loanCategory', 'memberAdmission', 'branch'])
            ->when($user->branch_id, function ($query) use ($user) {
                $query->where('branch_id', $user->branch_id);
            })
            ->whereDate('created_at', $selectedDate)
            ->orderBy('created_at', 'desc')
            ->get();

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
            'disbursedBy'
        ])->findOrFail($id);

        return Inertia::render('Member/LoanApplications/Show', [
            'application' => $application,
        ]);
    }

    /**
     * Submit loan application for review
     */
    public function submit($id)
    {
        $application = LoanApplication::findOrFail($id);

        if (!$application->canBeEdited()) {
            return back()->withErrors(['error' => 'This application cannot be submitted']);
        }

        $application->update([
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        return redirect()->route('member.loan-applications.show', $application->id)
            ->with('success', 'Loan application submitted for review');
    }

    /**
     * Show edit form for loan application
     */
    public function edit($id)
    {
        $application = LoanApplication::with([
            'loanProduct',
            'loanCategory',
            'memberAdmission',
            'branch',
            'samity'
        ])->findOrFail($id);

        if (!$application->canBeEdited()) {
            return redirect()->route('member.loan-applications.show', $application->id)
                ->withErrors(['error' => 'This application cannot be edited']);
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

        return Inertia::render('Member/LoanApplications/FormSelection', [
            'member' => $member,
            'loanProduct' => $loanProduct,
            'loanCategory' => $loanCategory,
            'requestedAmount' => (float) $requestedAmount,
        ]);
    }

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

        return Inertia::render('Member/LoanApplications/Forms/LoanAgreement', [
            'member' => $member,
            'loanProduct' => $loanProduct,
            'loanCategory' => $loanCategory,
            'requestedAmount' => (float) $requestedAmount,
            'branch' => $branch,
        ]);
    }

}
