<?php

namespace App\Http\Controllers;

use App\Models\LoanCategory;
use App\Models\LoanProduct;
use Illuminate\Http\Request;
use Inertia\Inertia;

class LoanProductController extends Controller
{
    public function index(Request $request)
    {
        $products = LoanProduct::query()
            ->with('loanCategory')
            ->when($request->search, function ($query, $search) {
                $query->where('product_name', 'like', "%{$search}%")
                      ->orWhere('product_name_bn', 'like', "%{$search}%")
                      ->orWhere('product_code', 'like', "%{$search}%");
            })
            ->when($request->category_id, function ($query, $categoryId) {
                $query->where('loan_category_id', $categoryId);
            })
            ->when($request->installment_type, function ($query, $type) {
                $query->where('installment_type', $type);
            })
            ->withCount('loanApplications')
            ->orderBy('loan_category_id')
            ->orderBy('display_order')
            ->get();

        $categories = LoanCategory::orderBy('display_order')->get();

        return Inertia::render('LoanProducts/Index', [
            'products' => $products,
            'categories' => $categories,
            'filters' => $request->only(['search', 'category_id', 'installment_type']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'loan_category_id' => 'required|exists:loan_categories,id',
            'product_name' => 'required|string|max:255',
            'product_name_bn' => 'required|string|max:255',
            'product_code' => 'required|string|max:20|unique:loan_products,product_code',
            'description' => 'nullable|string|max:1000',
            'description_bn' => 'nullable|string|max:1000',
            'installment_type' => 'required|in:weekly,monthly',
            'duration_months' => 'required|integer|min:1|max:120',
            'number_of_installments' => 'required|integer|min:1|max:520',
            'min_amount' => 'required|numeric|min:0',
            'max_amount' => 'required|numeric|min:0|gte:min_amount',
            'interest_rate' => 'required|numeric|min:0|max:100',
            'service_charge' => 'nullable|numeric|min:0|max:100',
            'interest_calculation_type' => 'required|in:flat,reducing,compound',
            'gender_restriction' => 'required|in:male,female,both',
            'min_age' => 'required|integer|min:18|max:100',
            'max_age' => 'required|integer|min:18|max:100|gte:min_age',
            'requires_guarantor' => 'boolean',
            'number_of_guarantors' => 'nullable|integer|min:0|max:5',
            'eligibility_conditions' => 'nullable|array',
            'required_documents' => 'nullable|array',
            'is_active' => 'boolean',
            'display_order' => 'nullable|integer|min:0',
        ]);

        $validated['is_active'] = $validated['is_active'] ?? true;
        $validated['service_charge'] = $validated['service_charge'] ?? 0;
        $validated['display_order'] = $validated['display_order'] ?? 0;
        $validated['requires_guarantor'] = $validated['requires_guarantor'] ?? false;
        $validated['number_of_guarantors'] = $validated['number_of_guarantors'] ?? 0;

        LoanProduct::create($validated);

        return redirect()->route('loan-products.index')
            ->with('success', 'ঋণ পণ্য সফলভাবে তৈরি হয়েছে।');
    }

    public function update(Request $request, LoanProduct $loanProduct)
    {
        $validated = $request->validate([
            'loan_category_id' => 'required|exists:loan_categories,id',
            'product_name' => 'required|string|max:255',
            'product_name_bn' => 'required|string|max:255',
            'product_code' => 'required|string|max:20|unique:loan_products,product_code,' . $loanProduct->id,
            'description' => 'nullable|string|max:1000',
            'description_bn' => 'nullable|string|max:1000',
            'installment_type' => 'required|in:weekly,monthly',
            'duration_months' => 'required|integer|min:1|max:120',
            'number_of_installments' => 'required|integer|min:1|max:520',
            'min_amount' => 'required|numeric|min:0',
            'max_amount' => 'required|numeric|min:0|gte:min_amount',
            'interest_rate' => 'required|numeric|min:0|max:100',
            'service_charge' => 'nullable|numeric|min:0|max:100',
            'interest_calculation_type' => 'required|in:flat,reducing,compound',
            'gender_restriction' => 'required|in:male,female,both',
            'min_age' => 'required|integer|min:18|max:100',
            'max_age' => 'required|integer|min:18|max:100|gte:min_age',
            'requires_guarantor' => 'boolean',
            'number_of_guarantors' => 'nullable|integer|min:0|max:5',
            'eligibility_conditions' => 'nullable|array',
            'required_documents' => 'nullable|array',
            'is_active' => 'boolean',
            'display_order' => 'nullable|integer|min:0',
        ]);

        $loanProduct->update($validated);

        return redirect()->route('loan-products.index')
            ->with('success', 'ঋণ পণ্য সফলভাবে আপডেট হয়েছে।');
    }

    public function destroy(LoanProduct $loanProduct)
    {
        if ($loanProduct->loanApplications()->count() > 0) {
            return back()->with('error', 'এই পণ্যে ঋণ আবেদন রয়েছে, মুছে ফেলা যাবে না।');
        }

        $loanProduct->delete();

        return redirect()->route('loan-products.index')
            ->with('success', 'ঋণ পণ্য সফলভাবে মুছে ফেলা হয়েছে।');
    }

    public function toggleStatus(LoanProduct $loanProduct)
    {
        $loanProduct->update([
            'is_active' => !$loanProduct->is_active,
        ]);

        $status = $loanProduct->is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়';
        return redirect()->route('loan-products.index')
            ->with('success', "ঋণ পণ্য {$status} করা হয়েছে।");
    }
}
