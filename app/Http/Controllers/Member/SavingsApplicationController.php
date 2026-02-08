<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Controller;
use App\Models\SavingsApplication;
use App\Models\SavingsProduct;
use App\Models\MemberAdmission;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class SavingsApplicationController extends Controller
{
    /**
     * Display available savings products
     */
    public function index(Request $request)
    {
        $user = $request->user();

        // Get active savings products
        $products = SavingsProduct::where('is_active', true)
            ->orderBy('product_name')
            ->get();

        // Get user's savings applications
        $applications = SavingsApplication::with(['savingsProduct', 'memberAdmission'])
            ->where('submitted_by', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return Inertia::render('Member/SavingsApplications/Index', [
            'products' => $products,
            'applications' => $applications,
        ]);
    }

    /**
     * Show savings application form
     */
    public function create(Request $request, $productId)
    {
        $user = $request->user();

        // Get savings product
        $savingsProduct = SavingsProduct::findOrFail($productId);

        // Get member's admission data if exists
        $memberAdmission = MemberAdmission::where('branch_id', $user->branch_id)
            ->where('status', 'approved')
            ->latest()
            ->first();

        // Get branch and samity info
        $branch = $user->branch;
        $samity = $memberAdmission?->samity;

        return Inertia::render('Member/SavingsApplications/Create', [
            'savingsProduct' => $savingsProduct,
            'memberAdmission' => $memberAdmission,
            'branch' => $branch,
            'samity' => $samity,
        ]);
    }

    /**
     * Store savings application
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'savings_product_id' => 'required|exists:savings_products,id',
            'member_admission_id' => 'nullable|exists:member_admissions,id',
            'samity_id' => 'nullable|exists:samities,id',
            'deposit_amount' => 'required|numeric|min:0',
            'monthly_installment' => 'nullable|numeric|min:0',
            'purpose_of_savings' => 'nullable|string|max:1000',
            'nominee_info' => 'nullable|array',
            'nominee_info.*.name' => 'required|string|max:255',
            'nominee_info.*.relation' => 'required|string|max:100',
            'nominee_info.*.mobile' => 'required|string|max:20',
            'nominee_info.*.nid' => 'required|string|max:50',
            'nominee_info.*.address' => 'required|string|max:500',
            'nominee_info.*.percentage' => 'required|numeric|min:0|max:100',
        ]);

        $user = $request->user();

        // Check savings product constraints
        $savingsProduct = SavingsProduct::findOrFail($validated['savings_product_id']);

        // Validate amount range
        if ($validated['deposit_amount'] < $savingsProduct->min_amount ||
            $validated['deposit_amount'] > $savingsProduct->max_amount) {
            return back()->withErrors([
                'deposit_amount' => "Amount must be between {$savingsProduct->min_amount} and {$savingsProduct->max_amount}"
            ]);
        }

        // Calculate maturity amount and date
        $monthlyInstallment = $validated['monthly_installment'] ?? $validated['deposit_amount'];
        $maturityAmount = $savingsProduct->calculateMaturityAmount(
            $validated['deposit_amount'],
            $monthlyInstallment
        );
        $maturityDate = now()->addMonths($savingsProduct->duration_months);

        DB::beginTransaction();
        try {
            $application = SavingsApplication::create([
                'application_no' => SavingsApplication::generateApplicationNo(),
                'member_admission_id' => $validated['member_admission_id'],
                'savings_product_id' => $validated['savings_product_id'],
                'branch_id' => $user->branch_id,
                'samity_id' => $validated['samity_id'],
                'deposit_amount' => $validated['deposit_amount'],
                'monthly_installment' => $monthlyInstallment,
                'maturity_amount' => $maturityAmount,
                'maturity_date' => $maturityDate,
                'purpose_of_savings' => $validated['purpose_of_savings'],
                'nominee_info' => $validated['nominee_info'],
                'status' => 'draft',
                'submitted_by' => $user->id,
            ]);

            DB::commit();

            return redirect()->route('member.savings-applications.show', $application->id)
                ->with('success', 'Savings application created successfully. Application No: ' . $application->application_no);
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => 'Failed to create savings application: ' . $e->getMessage()]);
        }
    }

    /**
     * Show savings application details
     */
    public function show($id)
    {
        $application = SavingsApplication::with([
            'savingsProduct',
            'memberAdmission',
            'branch',
            'samity',
            'submittedBy',
            'reviewedBy',
            'activatedBy'
        ])->findOrFail($id);

        return Inertia::render('Member/SavingsApplications/Show', [
            'application' => $application,
        ]);
    }

    /**
     * Submit savings application for review
     */
    public function submit($id)
    {
        $application = SavingsApplication::findOrFail($id);

        if (!$application->canBeEdited()) {
            return back()->withErrors(['error' => 'This application cannot be submitted']);
        }

        $application->update([
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        return redirect()->route('member.savings-applications.show', $application->id)
            ->with('success', 'Savings application submitted for review');
    }
}
