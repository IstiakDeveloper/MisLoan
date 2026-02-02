<?php

namespace App\Http\Controllers;

use App\Models\MemberCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MemberCategoryController extends Controller
{
    public function index(Request $request)
    {
        $query = MemberCategory::query();

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('category_name', 'like', "%{$search}%")
                  ->orWhere('category_name_bn', 'like', "%{$search}%");
            });
        }

        $categories = $query->orderBy('category_name')->paginate(15);

        return Inertia::render('Organization/MemberCategory/Index', [
            'categories' => $categories,
            'filters' => $request->only(['search']),
        ]);
    }

    public function create()
    {
        return Inertia::render('Organization/MemberCategory/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_name' => 'required|string|max:255',
            'category_name_bn' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $category = MemberCategory::create($validated);

        return redirect()->route('member-categories.index')
            ->with('success', 'Member category created successfully!');
    }

    public function edit(MemberCategory $memberCategory)
    {
        return Inertia::render('Organization/MemberCategory/Edit', [
            'category' => $memberCategory,
        ]);
    }

    public function update(Request $request, MemberCategory $memberCategory)
    {
        $validated = $request->validate([
            'category_name' => 'required|string|max:255',
            'category_name_bn' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $memberCategory->update($validated);

        return redirect()->route('member-categories.index')
            ->with('success', 'Member category updated successfully!');
    }

    public function destroy(MemberCategory $memberCategory)
    {
        // Check if category has any member admissions
        if ($memberCategory->memberAdmissions()->count() > 0) {
            return back()->with('error', 'Cannot delete category with existing member admissions!');
        }

        $memberCategory->delete();

        return redirect()->route('member-categories.index')
            ->with('success', 'Member category deleted successfully!');
    }

    // API endpoint to get all active categories
    public function getActive()
    {
        $categories = MemberCategory::active()
            ->orderBy('category_name')
            ->get(['id', 'category_name', 'category_name_bn']);

        return response()->json($categories);
    }
}
