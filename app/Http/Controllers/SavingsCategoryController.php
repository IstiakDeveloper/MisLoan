<?php

namespace App\Http\Controllers;

use App\Models\SavingsCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SavingsCategoryController extends Controller
{
    public function index(Request $request): Response
    {
        $categories = SavingsCategory::query()
            ->when($request->search, function ($query, $search) {
                $query->where('category_name', 'like', "%{$search}%")
                    ->orWhere('category_name_bn', 'like', "%{$search}%")
                    ->orWhere('category_code', 'like', "%{$search}%");
            })
            ->withCount('savingsProducts')
            ->orderBy('display_order')
            ->orderBy('category_code')
            ->get();

        return Inertia::render('SavingsCategories/Index', [
            'categories' => $categories,
            'filters' => $request->only(['search']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_name' => 'required|string|max:255',
            'category_name_bn' => 'required|string|max:255',
            'category_code' => 'required|string|max:20|unique:savings_categories,category_code',
            'description' => 'nullable|string|max:1000',
            'description_bn' => 'nullable|string|max:1000',
            'is_active' => 'boolean',
            'display_order' => 'nullable|integer|min:0',
        ]);

        $validated['is_active'] = $validated['is_active'] ?? true;
        $validated['display_order'] = $validated['display_order'] ?? 0;

        SavingsCategory::query()->create($validated);

        return redirect()->route('savings-categories.index')
            ->with('success', 'সঞ্চয় ক্যাটাগরি সফলভাবে তৈরি হয়েছে।');
    }

    public function update(Request $request, SavingsCategory $savingsCategory)
    {
        $validated = $request->validate([
            'category_name' => 'required|string|max:255',
            'category_name_bn' => 'required|string|max:255',
            'category_code' => 'required|string|max:20|unique:savings_categories,category_code,'.$savingsCategory->id,
            'description' => 'nullable|string|max:1000',
            'description_bn' => 'nullable|string|max:1000',
            'is_active' => 'boolean',
            'display_order' => 'nullable|integer|min:0',
        ]);

        $savingsCategory->update($validated);

        return redirect()->route('savings-categories.index')
            ->with('success', 'সঞ্চয় ক্যাটাগরি সফলভাবে আপডেট হয়েছে।');
    }

    public function destroy(SavingsCategory $savingsCategory)
    {
        if ($savingsCategory->savingsProducts()->count() > 0) {
            return back()->with('error', 'এই ক্যাটাগরিতে সঞ্চয় পণ্য রয়েছে, মুছে ফেলা যাবে না।');
        }

        $savingsCategory->delete();

        return redirect()->route('savings-categories.index')
            ->with('success', 'সঞ্চয় ক্যাটাগরি সফলভাবে মুছে ফেলা হয়েছে।');
    }

    public function toggleStatus(SavingsCategory $savingsCategory)
    {
        $savingsCategory->update([
            'is_active' => ! $savingsCategory->is_active,
        ]);

        $status = $savingsCategory->is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়';

        return redirect()->route('savings-categories.index')
            ->with('success', "সঞ্চয় ক্যাটাগরি {$status} করা হয়েছে।");
    }
}
