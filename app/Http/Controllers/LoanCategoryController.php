<?php

namespace App\Http\Controllers;

use App\Models\LoanCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;

class LoanCategoryController extends Controller
{
    public function index(Request $request)
    {
        $categories = LoanCategory::query()
            ->when($request->search, function ($query, $search) {
                $query->where('category_name', 'like', "%{$search}%")
                      ->orWhere('category_name_bn', 'like', "%{$search}%")
                      ->orWhere('category_code', 'like', "%{$search}%");
            })
            ->withCount('loanProducts')
            ->orderBy('display_order')
            ->get();

        return Inertia::render('LoanCategories/Index', [
            'categories' => $categories,
            'filters' => $request->only(['search']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_name' => 'required|string|max:255',
            'category_name_bn' => 'required|string|max:255',
            'category_code' => 'required|string|max:20|unique:loan_categories,category_code',
            'description' => 'nullable|string|max:1000',
            'description_bn' => 'nullable|string|max:1000',
            'target_group' => 'required|in:male,female,both',
            'is_active' => 'boolean',
            'display_order' => 'nullable|integer|min:0',
        ]);

        $validated['is_active'] = $validated['is_active'] ?? true;
        $validated['display_order'] = $validated['display_order'] ?? 0;

        LoanCategory::create($validated);

        return redirect()->route('loan-categories.index')
            ->with('success', 'ঋণ ক্যাটাগরি সফলভাবে তৈরি হয়েছে।');
    }

    public function update(Request $request, LoanCategory $loanCategory)
    {
        $validated = $request->validate([
            'category_name' => 'required|string|max:255',
            'category_name_bn' => 'required|string|max:255',
            'category_code' => 'required|string|max:20|unique:loan_categories,category_code,' . $loanCategory->id,
            'description' => 'nullable|string|max:1000',
            'description_bn' => 'nullable|string|max:1000',
            'target_group' => 'required|in:male,female,both',
            'is_active' => 'boolean',
            'display_order' => 'nullable|integer|min:0',
        ]);

        $loanCategory->update($validated);

        return redirect()->route('loan-categories.index')
            ->with('success', 'ঋণ ক্যাটাগরি সফলভাবে আপডেট হয়েছে।');
    }

    public function destroy(LoanCategory $loanCategory)
    {
        if ($loanCategory->loanProducts()->count() > 0) {
            return back()->with('error', 'এই ক্যাটাগরিতে ঋণ পণ্য রয়েছে, মুছে ফেলা যাবে না।');
        }

        $loanCategory->delete();

        return redirect()->route('loan-categories.index')
            ->with('success', 'ঋণ ক্যাটাগরি সফলভাবে মুছে ফেলা হয়েছে।');
    }

    public function toggleStatus(LoanCategory $loanCategory)
    {
        $loanCategory->update([
            'is_active' => !$loanCategory->is_active,
        ]);

        $status = $loanCategory->is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়';
        return redirect()->route('loan-categories.index')
            ->with('success', "ঋণ ক্যাটাগরি {$status} করা হয়েছে।");
    }
}
