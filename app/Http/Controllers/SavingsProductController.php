<?php

namespace App\Http\Controllers;

use App\Models\SavingsProduct;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SavingsProductController extends Controller
{
    /**
     * List savings products (Head Office).
     */
    public function index(Request $request)
    {
        $products = SavingsProduct::query()
            ->when($request->search, function ($query, $search) {
                $query->where('product_name', 'like', "%{$search}%")
                    ->orWhere('product_name_bn', 'like', "%{$search}%")
                    ->orWhere('product_code', 'like', "%{$search}%");
            })
            ->when($request->deposit_type, function ($query, $type) {
                $query->where('deposit_type', $type);
            })
            ->withCount('savingsApplications')
            ->orderBy('display_order')
            ->orderBy('product_code')
            ->get();

        return Inertia::render('SavingsProducts/Index', [
            'products' => $products,
            'filters' => $request->only(['search', 'deposit_type']),
        ]);
    }

    /**
     * Store new savings product.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_name' => 'required|string|max:255',
            'product_name_bn' => 'nullable|string|max:255',
            'product_code' => 'required|string|max:50|unique:savings_products,product_code',
            'description' => 'nullable|string|max:1000',
            'description_bn' => 'nullable|string|max:1000',
            'deposit_type' => 'required|in:monthly,lump_sum,recurring',
            'duration_months' => 'required|integer|min:1|max:600',
            'min_amount' => 'required|numeric|min:0',
            'max_amount' => 'nullable|numeric|min:0',
            'monthly_installment' => 'nullable|numeric|min:0',
            'interest_rate' => 'required|numeric|min:0|max:100',
            'profit_distribution_type' => 'nullable|in:maturity,monthly,quarterly,yearly',
            'premature_withdrawal_allowed' => 'boolean',
            'premature_withdrawal_penalty' => 'nullable|numeric|min:0|max:100',
            'min_age' => 'nullable|integer|min:0|max:120',
            'max_age' => 'nullable|integer|min:0|max:120',
            'requires_nominee' => 'boolean',
            'is_active' => 'boolean',
            'display_order' => 'nullable|integer|min:0',
        ]);

        $validated['is_active'] = $validated['is_active'] ?? true;
        $validated['requires_nominee'] = $validated['requires_nominee'] ?? true;
        $validated['premature_withdrawal_allowed'] = $validated['premature_withdrawal_allowed'] ?? false;
        $validated['display_order'] = $validated['display_order'] ?? 0;
        $validated['premature_withdrawal_penalty'] = $validated['premature_withdrawal_penalty'] ?? 0;
        $validated['profit_distribution_type'] = $validated['profit_distribution_type'] ?? 'maturity';
        $validated['min_age'] = $validated['min_age'] ?? 18;
        $validated['max_age'] = $validated['max_age'] ?? 70;

        SavingsProduct::create($validated);

        return redirect()->route('savings-products.index')
            ->with('success', 'সঞ্চয় পণ্য সফলভাবে তৈরি হয়েছে।');
    }

    /**
     * Update savings product.
     */
    public function update(Request $request, SavingsProduct $savingsProduct)
    {
        $validated = $request->validate([
            'product_name' => 'required|string|max:255',
            'product_name_bn' => 'nullable|string|max:255',
            'product_code' => 'required|string|max:50|unique:savings_products,product_code,' . $savingsProduct->id,
            'description' => 'nullable|string|max:1000',
            'description_bn' => 'nullable|string|max:1000',
            'deposit_type' => 'required|in:monthly,lump_sum,recurring',
            'duration_months' => 'required|integer|min:1|max:600',
            'min_amount' => 'required|numeric|min:0',
            'max_amount' => 'nullable|numeric|min:0',
            'monthly_installment' => 'nullable|numeric|min:0',
            'interest_rate' => 'required|numeric|min:0|max:100',
            'profit_distribution_type' => 'nullable|in:maturity,monthly,quarterly,yearly',
            'premature_withdrawal_allowed' => 'boolean',
            'premature_withdrawal_penalty' => 'nullable|numeric|min:0|max:100',
            'min_age' => 'nullable|integer|min:0|max:120',
            'max_age' => 'nullable|integer|min:0|max:120',
            'requires_nominee' => 'boolean',
            'is_active' => 'boolean',
            'display_order' => 'nullable|integer|min:0',
        ]);

        $savingsProduct->update($validated);

        return redirect()->route('savings-products.index')
            ->with('success', 'সঞ্চয় পণ্য সফলভাবে আপডেট হয়েছে।');
    }

    /**
     * Delete savings product (only if no applications).
     */
    public function destroy(SavingsProduct $savingsProduct)
    {
        if ($savingsProduct->savingsApplications()->count() > 0) {
            return back()->with('error', 'এই পণ্যে সঞ্চয় আবেদন রয়েছে, মুছে ফেলা যাবে না।');
        }

        $savingsProduct->delete();

        return redirect()->route('savings-products.index')
            ->with('success', 'সঞ্চয় পণ্য সফলভাবে মুছে ফেলা হয়েছে।');
    }

    /**
     * Toggle active status.
     */
    public function toggleStatus(SavingsProduct $savingsProduct)
    {
        $savingsProduct->update([
            'is_active' => !$savingsProduct->is_active,
        ]);

        $status = $savingsProduct->is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়';
        return redirect()->route('savings-products.index')
            ->with('success', "সঞ্চয় পণ্য {$status} করা হয়েছে।");
    }
}
