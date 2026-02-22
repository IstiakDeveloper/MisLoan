<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Controller;
use App\Models\LoanApplication;
use App\Models\LoanApplicationIssue;
use App\Models\LoanCategory;
use App\Models\LoanProduct;
use App\Models\MemberAdmission;
use App\Models\SavingsProduct;
use App\Models\Samity;
use App\Services\ApprovalService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class LoanApplicationController extends Controller
{
    /**
     * Display available loan products
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $dateFrom = $request->input('date_from', now()->toDateString());
        $dateTo = $request->input('date_to', now()->toDateString());
        $statusFilter = $request->input('status', ''); // Empty means all statuses

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
                'memberAdmission:id,applicant_name_en,applicant_name_bn,application_no,nid_number,mobile_number',
                'branch:id,name,code',
                'issues' => function ($query) {
                    $query->select('id', 'loan_application_id', 'issue_description', 'status', 'reported_by', 'created_at')
                        ->with('reporter:id,name')
                        ->orderBy('created_at', 'desc');
                }
            ])
            ->when($user->branch_id, function ($query) use ($user) {
                $query->where('branch_id', $user->branch_id);
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
            'selectedDate' => $dateFrom, // Keep for backward compatibility
            'dateFrom' => $dateFrom,
            'dateTo' => $dateTo,
            'statusFilter' => $statusFilter,
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
            'memberAdmission' => $memberId ? MemberAdmission::find($memberId) : null,
            'samity' => null,
        ]);
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

        // Check for active loans for each member (ANY product)
        $memberIds = $members->pluck('id');
        
        if ($memberIds->isNotEmpty()) {
            // Get all active loans (not expired) for these members
            $activeLoans = LoanApplication::whereIn('member_admission_id', $memberIds)
                ->whereIn('status', [
                    LoanApplication::STATUS_SUBMITTED,
                    LoanApplication::STATUS_UNDER_REVIEW,
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
        $branchId = $request->user()->branch_id;
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
     * Start loan application for legacy/old member (no member admission).
     * Stores legacy member data in session and redirects to form-selection.
     */
    public function startLegacyApplication(Request $request)
    {
        $validated = $request->validate([
            'applicant_name_bn' => 'required|string|max:255',
            'applicant_name_en' => 'nullable|string|max:255',
            'nid_number' => 'required|string|max:100',
            'mobile_number' => 'required|string|max:20',
            'present_village_road' => 'nullable|string|max:500',
            'present_upazila' => 'nullable|string|max:100',
            'present_district' => 'nullable|string|max:100',
            'samity_id' => 'required|exists:samities,id',
            'loan_category_id' => 'required|exists:loan_categories,id',
            'loan_product_id' => 'required|exists:loan_products,id',
            'requested_amount' => 'required|numeric|min:1',
        ]);

        $user = $request->user();
        $samity = Samity::find($validated['samity_id']);
        if (!$samity || $samity->branch_id != $user->branch_id) {
            return back()->withErrors(['samity_id' => 'সমিতি এই শাখার নয়।']);
        }

        $legacyMember = [
            'id' => null,
            'applicant_name_bn' => $validated['applicant_name_bn'],
            'applicant_name_en' => $validated['applicant_name_en'] ?: $validated['applicant_name_bn'],
            'nid_number' => $validated['nid_number'],
            'mobile_number' => $validated['mobile_number'],
            'present_village_road' => $validated['present_village_road'] ?? '',
            'present_upazila' => $validated['present_upazila'] ?? '',
            'present_district' => $validated['present_district'] ?? '',
            'samity_id' => (int) $validated['samity_id'],
            'application_no' => 'আগের সদস্য',
        ];

        $request->session()->put('loan_legacy_member', $legacyMember);
        $request->session()->put('loan_legacy_key', Str::uuid()->toString());

        return redirect()->route('member.loan-applications.form-selection', [
            'legacy' => 1,
            'loan_category_id' => $validated['loan_category_id'],
            'loan_product_id' => $validated['loan_product_id'],
            'requested_amount' => $validated['requested_amount'],
        ]);
    }

    /**
     * Store loan application
     */
    public function store(Request $request)
    {
        // Check if member has active loan
        $memberId = $request->input('member_admission_id');
        if ($memberId) {
            $activeLoans = LoanApplication::where('member_admission_id', $memberId)
                ->whereIn('status', [
                    LoanApplication::STATUS_SUBMITTED,
                    LoanApplication::STATUS_UNDER_REVIEW,
                    LoanApplication::STATUS_PENDING_HEAD_OFFICE,
                    LoanApplication::STATUS_APPROVED,
                    LoanApplication::STATUS_DISBURSED
                ])
                ->with('loanProduct:id,duration_months')
                ->get()
                ->filter(function ($loan) {
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
                    
                    return true; // Conservative: consider active if no expiry info
                });

            if ($activeLoans->isNotEmpty()) {
                return back()->withErrors([
                    'member_admission_id' => 'এই সদস্যের জন্য সক্রিয় ঋণ আছে। মেয়াদ শেষ হওয়ার আগে নতুন ঋণ আবেদন করা যাবে না।'
                ])->withInput();
            }
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

        // Check if form data exists and is not empty/null/empty JSON - only show forms that were actually saved
        // Recursive function to check if data has meaningful content
        $checkFormData = function($data) use (&$checkFormData) {
            // If null or empty, definitely not saved
            if ($data === null || $data === '') return false;
            
            // If array, check if it has meaningful content recursively
            if (is_array($data)) {
                if (count($data) === 0) return false;
                // Check if array has at least one non-empty, meaningful value
                $hasMeaningfulData = false;
                foreach ($data as $key => $value) {
                    // Skip null values, empty strings, and empty arrays/objects
                    if ($value === null || $value === '') continue;
                    if (is_array($value) && count($value) === 0) continue;
                    if (is_string($value) && trim($value) === '') continue;
                    // Recursively check nested structures
                    if (is_array($value) || is_object($value)) {
                        if ($checkFormData($value)) {
                            $hasMeaningfulData = true;
                            break;
                        }
                    } else {
                        // For primitive values, check if they're meaningful
                        $trimmed = is_string($value) ? trim($value) : $value;
                        if ($trimmed !== null && $trimmed !== '' && $trimmed !== 'null') {
                            $hasMeaningfulData = true;
                            break;
                        }
                    }
                }
                return $hasMeaningfulData;
            }
            
            // If string, check if it's meaningful
            if (is_string($data)) {
                $trimmed = trim($data);
                // Check for empty, null string, empty JSON objects/arrays
                if ($trimmed === '' || 
                    $trimmed === 'null' || 
                    $trimmed === '{}' || 
                    $trimmed === '[]' ||
                    strlen($trimmed) < 3) {
                    return false;
                }
                // Try to decode JSON and check if it's meaningful
                $decoded = json_decode($trimmed, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    // Recursively check decoded structure
                    return $checkFormData($decoded);
                }
                // If not JSON, check if it's a meaningful string
                return strlen($trimmed) >= 3;
            }
            
            // For objects, check if they have properties
            if (is_object($data)) {
                $array = (array) $data;
                if (count($array) === 0) return false;
                // Recursively check object properties
                return $checkFormData($array);
            }
            
            // For other types (numbers, booleans), consider them meaningful if not null
            return $data !== null;
        };
        
        $formSaved = [
            1 => $checkFormData($application->loan_agreement_data),
            2 => $checkFormData($application->guarantor_info),
            3 => $checkFormData($application->nominee_info),
            4 => $checkFormData($application->asset_info),
            5 => $checkFormData($application->business_plan),
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

        // Check if form data exists and is not empty/null/empty JSON - only check forms that were actually saved
        $checkFormData = function($data) {
            if (empty($data)) return false;
            if (is_array($data)) return count($data) > 0;
            if (is_string($data)) {
                $trimmed = trim($data);
                return $trimmed !== '' && $trimmed !== 'null' && $trimmed !== '{}';
            }
            return true; // object or other non-empty value
        };
        
        $formSaved = [
            1 => $checkFormData($application->loan_agreement_data),
            2 => $checkFormData($application->guarantor_info),
            3 => $checkFormData($application->nominee_info),
            4 => $checkFormData($application->asset_info),
            5 => $checkFormData($application->business_plan),
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
     * Show form selection page (supports legacy/old member via session).
     */
    public function formSelection(Request $request)
    {
        $isLegacy = $request->boolean('legacy');
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
            'isLegacy' => $isLegacy,
        ]);
    }

    /**
     * Resolve member for a form (from member_id or legacy session).
     */
    private function resolveMemberForForm(Request $request, int $loanProductId, int $loanCategoryId): array
    {
        $isLegacy = $request->boolean('legacy');
        if ($isLegacy) {
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
                ->where('status', LoanApplication::STATUS_DRAFT)
                ->first();
            return [$member, $existingApplication, $legacyKey];
        }
        $memberId = $request->input('member_id');
        $member = MemberAdmission::with('samity')->find($memberId);
        $existingApplication = $memberId ? LoanApplication::where('member_admission_id', $memberId)
            ->where('loan_product_id', $loanProductId)
            ->where('loan_category_id', $loanCategoryId)
            ->where('status', LoanApplication::STATUS_DRAFT)
            ->first() : null;
        return [$member, $existingApplication, null];
    }

    /**
     * Get or create draft for save (supports legacy and normal member).
     * Returns [LoanApplication $draft, int $samityId, ?array $legacySnapshot].
     */
    private function getOrCreateDraftForSave(Request $request, int $loanProductId, int $loanCategoryId, float $requestedAmount, ?int $memberId, ?string $legacyKey, ?array $legacySnapshot): ?LoanApplication
    {
        $user = $request->user();
        if ($legacyKey && $legacySnapshot !== null) {
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
        $draft = LoanApplication::firstOrNew([
            'member_admission_id' => $memberId,
            'loan_product_id' => $loanProductId,
            'loan_category_id' => $loanCategoryId,
            'status' => LoanApplication::STATUS_DRAFT,
        ]);
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

        [$member, $existingApplication, $legacyKey] = $this->resolveMemberForForm($request, $loanProductId, $loanCategoryId);
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

        [$member, $existingApplication, $legacyKey] = $this->resolveMemberForForm($request, $loanProductId, $loanCategoryId);
        if (!$member) {
            return redirect()->route('member.loan-applications.index')->with('error', 'সদস্য তথ্য পাওয়া যাচ্ছে না।');
        }

        $loanProduct = LoanProduct::findOrFail($loanProductId);
        $loanCategory = LoanCategory::findOrFail($loanCategoryId);
        $user = $request->user();
        $branch = $user->branch;

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

        $loanApplication = $this->getOrCreateDraftForSave(
            $request,
            (int) $validated['loan_product_id'],
            (int) $validated['loan_category_id'],
            (float) $validated['requested_amount'],
            $memberId,
            $legacyKey,
            $legacySnapshot
        );
        if (!$loanApplication) {
            return redirect()->back()->withErrors(['member_id' => 'সদস্য পাওয়া যাচ্ছে না।']);
        }

        $agreementData = $validated['agreement_data'];
        $loanApplication->loan_agreement_data = $agreementData;
        $loanApplication->form_type = 'loan_agreement';
        $loanApplication->purpose_of_loan = $agreementData['loan_purpose'] ?? 'খান চুক্তিপত্র অনুযায়ী';
        $loanApplication->number_of_installments = (int) ($agreementData['number_of_installments'] ?? 1);
        $loanApplication->save();

        return redirect()->route('member.loan-applications.index')
            ->with('success', 'খান চুক্তিপত্র সংরক্ষিত হয়েছে। Loan Application ড্রাফট হিসেবে সংরক্ষিত আছে।');
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

        $loanApplication = $this->getOrCreateDraftForSave(
            $request,
            (int) $validated['loan_product_id'],
            (int) $validated['loan_category_id'],
            (float) $validated['requested_amount'],
            $memberId,
            $legacyKey,
            $legacySnapshot
        );
        if (!$loanApplication) {
            return redirect()->back()->withErrors(['member_id' => 'সদস্য পাওয়া যাচ্ছে না।']);
        }

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

        return redirect()->route('member.loan-applications.index')
            ->with('success', 'জামিনদার/দায়িত্ব গ্রহণকারীর অঙ্গীকার নামা ড্রাফট হিসেবে সংরক্ষিত হয়েছে।');
    }

    /**
     * Show death risk fund form
     */
    public function deathRiskFund(Request $request)
    {
        $loanProductId = (int) $request->input('product_id');
        $loanCategoryId = (int) $request->input('category_id');
        $requestedAmount = (float) $request->input('amount', 0);

        [$member, $existingApplication, $legacyKey] = $this->resolveMemberForForm($request, $loanProductId, $loanCategoryId);
        if (!$member) {
            return redirect()->route('member.loan-applications.index')->with('error', 'সদস্য তথ্য পাওয়া যাচ্ছে না।');
        }

        $loanProduct = LoanProduct::findOrFail($loanProductId);
        $loanCategory = LoanCategory::findOrFail($loanCategoryId);
        $user = $request->user();
        $branch = $user->branch;

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

        $loanApplication = $this->getOrCreateDraftForSave(
            $request,
            (int) $validated['loan_product_id'],
            (int) $validated['loan_category_id'],
            (float) $validated['requested_amount'],
            $memberId,
            $legacyKey,
            $legacySnapshot
        );
        if (!$loanApplication) {
            return redirect()->back()->withErrors(['member_id' => 'সদস্য পাওয়া যাচ্ছে না।']);
        }

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

        return redirect()->route('member.loan-applications.index')
            ->with('success', 'মৃত্যুজনিত ঋণঝুঁকি তহবিলে অন্তর্ভুক্তির আবেদন পত্র ড্রাফট হিসেবে সংরক্ষিত হয়েছে।');
    }

    /**
     * Show field investigation form
     */
    public function fieldInvestigation(Request $request)
    {
        $loanProductId = (int) $request->input('product_id');
        $loanCategoryId = (int) $request->input('category_id');
        $requestedAmount = (float) $request->input('amount', 0);

        [$member, $existingApplication, $legacyKey] = $this->resolveMemberForForm($request, $loanProductId, $loanCategoryId);
        if (!$member) {
            return redirect()->route('member.loan-applications.index')->with('error', 'সদস্য তথ্য পাওয়া যাচ্ছে না।');
        }

        $loanProduct = LoanProduct::findOrFail($loanProductId);
        $loanCategory = LoanCategory::findOrFail($loanCategoryId);
        $user = $request->user();
        $branch = $user->branch;

        // Loan round (দফা): for legacy treat as 1; for member count approved/disbursed + 1
        $loanRound = 1;
        if (!$request->boolean('legacy') && isset($member->id)) {
            $loanRound = LoanApplication::where('member_admission_id', $member->id)
                ->whereIn('status', [LoanApplication::STATUS_APPROVED, LoanApplication::STATUS_DISBURSED])
                ->count() + 1;
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

        $loanApplication = $this->getOrCreateDraftForSave(
            $request,
            (int) $validated['loan_product_id'],
            (int) $validated['loan_category_id'],
            (float) $validated['requested_amount'],
            $memberId,
            $legacyKey,
            $legacySnapshot
        );
        if (!$loanApplication) {
            return redirect()->back()->withErrors(['member_id' => 'সদস্য পাওয়া যাচ্ছে না।']);
        }

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

        return redirect()->route('member.loan-applications.index')
            ->with('success', 'সরেজমিনে তদন্ত প্রতিবেদন ড্রাফট হিসেবে সংরক্ষিত হয়েছে।');
    }

    /**
     * Show loan application approval form (Jagoron/Buniad/Agrosor)
     */
    public function loanApplicationApproval(Request $request)
    {
        $loanProductId = (int) $request->input('product_id');
        $loanCategoryId = (int) $request->input('category_id');
        $requestedAmount = (float) $request->input('amount', 0);

        [$member, $existingApplication, $legacyKey] = $this->resolveMemberForForm($request, $loanProductId, $loanCategoryId);
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
            $loanRound = LoanApplication::where('member_admission_id', $member->id)
                ->whereIn('status', [LoanApplication::STATUS_APPROVED, LoanApplication::STATUS_DISBURSED])
                ->count() + 1;
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

        $loanApplication = $this->getOrCreateDraftForSave(
            $request,
            (int) $validated['loan_product_id'],
            (int) $validated['loan_category_id'],
            (float) $validated['requested_amount'],
            $memberId,
            $legacyKey,
            $legacySnapshot
        );
        if (!$loanApplication) {
            return redirect()->back()->withErrors(['member_id' => 'সদস্য পাওয়া যাচ্ছে না।']);
        }

        $formData = $validated['form_data'];
        $loanProduct = LoanProduct::find($validated['loan_product_id']);
        $numberOfInstallments = $loanProduct->number_of_installments ?? 1;
        if ($loanProduct && $loanProduct->installment_type === 'weekly' && $loanProduct->duration_months) {
            $numberOfInstallments = (int) ceil(($loanProduct->duration_months * 30) / 7);
        } elseif ($loanProduct && $loanProduct->duration_months) {
            $numberOfInstallments = (int) $loanProduct->duration_months;
        }

        $loanApplication->business_plan = $formData;
        $loanApplication->form_type = 'loan_application_approval';
        $loanApplication->purpose_of_loan = $formData['loan_purpose'] ?? 'জাগরণ/বুনিয়াদ/আগ্রসর ঋণ আবেদন';
        $loanApplication->number_of_installments = $numberOfInstallments;
        $loanApplication->save();

        return redirect()->route('member.loan-applications.index')
            ->with('success', 'জাগরণ/বুনিয়াদ/আগ্রসর ঋণ আবেদন ও অনুমোদনপত্র ড্রাফট হিসেবে সংরক্ষিত হয়েছে।');
    }

    /**
     * Resolve an issue (mark as resolved with response)
     */
    public function resolveIssue(Request $request, $applicationId, $issueId)
    {
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
        
        // Check if user owns this application
        $user = auth()->user();
        if ($user->branch_id && $application->branch_id !== $user->branch_id) {
            return back()->withErrors(['error' => 'আপনার এই আবেদনটি মুছে ফেলার অনুমতি নেই।']);
        }
        
        // Only allow deletion if status is draft
        if ($application->status !== LoanApplication::STATUS_DRAFT) {
            return back()->withErrors(['error' => 'শুধুমাত্র খসড়া (Draft) অবস্থার আবেদন মুছে ফেলা যাবে।']);
        }
        
        $application->delete();
        
        return redirect()->route('member.loan-applications.index')
            ->with('success', 'ঋণ আবেদন সফলভাবে মুছে ফেলা হয়েছে।');
    }

}
