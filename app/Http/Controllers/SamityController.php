<?php

namespace App\Http\Controllers;

use App\Models\Samity;
use App\Models\Branch;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SamityController extends Controller
{
    public function index(Request $request)
    {
        $query = Samity::with(['branch.area.zone']);

        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('samity_name', 'like', "%{$search}%")
                  ->orWhere('samity_code', 'like', "%{$search}%")
                  ->orWhere('samity_name_bn', 'like', "%{$search}%");
            });
        }

        $samities = $query->orderBy('created_at', 'desc')->paginate(15);

        return Inertia::render('Organization/Samity/Index', [
            'samities' => $samities,
            'filters' => $request->only(['search', 'branch_id']),
        ]);
    }

    public function create()
    {
        $branches = Branch::with(['area.zone'])
            ->active()
            ->orderBy('name')
            ->get();

        return Inertia::render('Organization/Samity/Create', [
            'branches' => $branches,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'samity_code' => 'required|string|unique:samities,samity_code',
            'samity_name' => 'required|string|max:255',
            'samity_name_bn' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $samity = Samity::create($validated);

        return redirect()->route('samities.index')
            ->with('success', 'Samity created successfully!');
    }

    public function edit(Samity $samity)
    {
        $samity->load(['branch.area.zone']);

        $branches = Branch::with(['area.zone'])
            ->active()
            ->orderBy('name')
            ->get();

        return Inertia::render('Organization/Samity/Edit', [
            'samity' => $samity,
            'branches' => $branches,
        ]);
    }

    public function update(Request $request, Samity $samity)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'samity_code' => 'required|string|unique:samities,samity_code,' . $samity->id,
            'samity_name' => 'required|string|max:255',
            'samity_name_bn' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $samity->update($validated);

        return redirect()->route('samities.index')
            ->with('success', 'Samity updated successfully!');
    }

    public function destroy(Samity $samity)
    {
        // Check if samity has any member admissions
        if ($samity->memberAdmissions()->count() > 0) {
            return back()->with('error', 'Cannot delete samity with existing member admissions!');
        }

        $samity->delete();

        return redirect()->route('samities.index')
            ->with('success', 'Samity deleted successfully!');
    }

    // API endpoint to get samities by branch (and optional filters)
    public function getByBranch(Request $request, $branchId)
    {
        $query = Samity::where('branch_id', $branchId)
            ->active();

        if ($request->filled('search')) {
            $search = $request->get('search');

            $query->where(function ($q) use ($search) {
                $q->where('samity_name', 'like', "%{$search}%")
                    ->orWhere('samity_code', 'like', "%{$search}%")
                    ->orWhere('samity_name_bn', 'like', "%{$search}%");
            });
        }

        if ($request->filled('limit')) {
            $query->limit((int) $request->get('limit', 50));
        }

        $samities = $query
            ->orderBy('samity_name')
            ->get(['id', 'samity_code', 'samity_name', 'samity_name_bn']);

        return response()->json($samities);
    }
}
