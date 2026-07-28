<?php

namespace App\Http\Controllers;

use App\Models\Area;
use App\Models\Branch;
use App\Models\Zone;
use App\Services\HrmOrganizationSyncService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

class OrganizationController extends Controller
{
    public function index()
    {
        $zones = Zone::with(['areas.branches'])->get();
        $areas = Area::with(['zone', 'branches'])->get();
        $branches = Branch::with(['area.zone'])->get();

        return Inertia::render('Organizations/Index', [
            'zones' => $zones,
            'areas' => $areas,
            'branches' => $branches,
            'hrmSyncEnabled' => app(HrmOrganizationSyncService::class)->isConfigured(),
        ]);
    }

    public function syncFromHrm(HrmOrganizationSyncService $hrmOrganizationSyncService)
    {
        if (! $hrmOrganizationSyncService->isConfigured()) {
            return redirect()->route('organizations.index')
                ->with('error', 'HRM sync is not configured. Set HRM_API_URL and HRM_API_TOKEN in .env.');
        }

        try {
            $stats = $hrmOrganizationSyncService->sync();
        } catch (\Throwable $e) {
            return redirect()->route('organizations.index')
                ->with('error', 'HRM sync failed: '.$e->getMessage());
        }

        $message = sprintf(
            'Organization synced from HRM. Zones: %d created, %d updated. Areas: %d created, %d updated. Branches: %d created, %d updated.',
            $stats['zones']['created'],
            $stats['zones']['updated'],
            $stats['areas']['created'],
            $stats['areas']['updated'],
            $stats['branches']['created'],
            $stats['branches']['updated'],
        );

        return redirect()->route('organizations.index')
            ->with('success', $message);
    }

    // Zone Methods
    public function storeZone(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:zones,code',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        Zone::create($validated);

        return redirect()->route('organizations.index')
            ->with('success', 'Zone created successfully.');
    }

    public function updateZone(Request $request, Zone $zone)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:zones,code,'.$zone->id,
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $zone->update($validated);

        return redirect()->route('organizations.index')
            ->with('success', 'Zone updated successfully.');
    }

    public function destroyZone(Zone $zone)
    {
        if ($zone->areas()->count() > 0) {
            return redirect()->route('organizations.index')
                ->with('error', 'Cannot delete zone with existing areas.');
        }

        $zone->delete();

        return redirect()->route('organizations.index')
            ->with('success', 'Zone deleted successfully.');
    }

    public function toggleZoneStatus(Zone $zone)
    {
        $zone->update(['is_active' => ! $zone->is_active]);

        return redirect()->route('organizations.index')
            ->with('success', 'Zone status updated successfully.');
    }

    // Area Methods
    public function storeArea(Request $request)
    {
        $validated = $request->validate([
            'zone_id' => 'required|exists:zones,id',
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:areas,code',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        Area::create($validated);

        return redirect()->route('organizations.index')
            ->with('success', 'Area created successfully.');
    }

    public function updateArea(Request $request, Area $area)
    {
        $validated = $request->validate([
            'zone_id' => 'required|exists:zones,id',
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:areas,code,'.$area->id,
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $area->update($validated);

        return redirect()->route('organizations.index')
            ->with('success', 'Area updated successfully.');
    }

    public function destroyArea(Area $area)
    {
        if ($area->branches()->count() > 0) {
            return redirect()->route('organizations.index')
                ->with('error', 'Cannot delete area with existing branches.');
        }

        $area->delete();

        return redirect()->route('organizations.index')
            ->with('success', 'Area deleted successfully.');
    }

    public function toggleAreaStatus(Area $area)
    {
        $area->update(['is_active' => ! $area->is_active]);

        return redirect()->route('organizations.index')
            ->with('success', 'Area status updated successfully.');
    }

    // Branch Methods
    public function storeBranch(Request $request)
    {
        $validated = $request->validate([
            'area_id' => 'required|exists:areas,id',
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:branches,code',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'manager_name' => 'nullable|string|max:255',
            'login_pin' => 'nullable|string|min:4|max:12|regex:/^[0-9]+$/',
            'is_active' => 'boolean',
        ]);

        if ($request->filled('login_pin')) {
            $validated['login_pin'] = \Illuminate\Support\Facades\Hash::make($request->input('login_pin'));
        } else {
            unset($validated['login_pin']);
        }

        $branch = Branch::create($validated);
        if (! $branch->login_pin) {
            $branch->login_pin = \Illuminate\Support\Facades\Hash::make('12345678');
            $branch->saveQuietly();
        }
        app(\App\Services\BranchAccountService::class)->ensureForBranch($branch->fresh(['area']));

        return redirect()->route('organizations.index')
            ->with('success', 'Branch created successfully.');
    }

    public function updateBranch(Request $request, Branch $branch)
    {
        $validated = $request->validate([
            'area_id' => 'required|exists:areas,id',
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:branches,code,'.$branch->id,
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'manager_name' => 'nullable|string|max:255',
            'login_pin' => 'nullable|string|min:4|max:12|regex:/^[0-9]+$/',
            'is_active' => 'boolean',
        ]);

        if ($request->filled('login_pin')) {
            $validated['login_pin'] = \Illuminate\Support\Facades\Hash::make($request->input('login_pin'));
        } else {
            unset($validated['login_pin']);
        }

        $branch->update($validated);
        app(\App\Services\BranchAccountService::class)->ensureForBranch($branch->fresh(['area']));

        return redirect()->route('organizations.index')
            ->with('success', 'Branch updated successfully.');
    }

    public function destroyBranch(Branch $branch)
    {
        $branch->delete();

        return redirect()->route('organizations.index')
            ->with('success', 'Branch deleted successfully.');
    }

    public function toggleBranchStatus(Branch $branch)
    {
        $branch->update(['is_active' => ! $branch->is_active]);

        return redirect()->route('organizations.index')
            ->with('success', 'Branch status updated successfully.');
    }

    public function branchesPrint(Request $request)
    {
        $branches = Branch::query()
            ->orderBy('code')
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        return Inertia::render('Organizations/BranchPrint', [
            'generatedAt' => Carbon::now()->toDateTimeString(),
            'branches' => $branches->map(function (Branch $b) {
                return [
                    'id' => $b->id,
                    'name' => $b->name,
                    'code' => $b->code,
                ];
            })->values(),
        ]);
    }

    // API Methods for cascading dropdowns
    public function getAreasByZone(Zone $zone)
    {
        return response()->json($zone->areas);
    }

    public function getBranchesByArea(Area $area)
    {
        return response()->json($area->branches);
    }

    public function getBranchesByZone(Zone $zone)
    {
        return response()->json($zone->areas()->with('branches')->get()->pluck('branches')->flatten());
    }

    // Complete organization structure with nested relationships
    public function organizationStructure()
    {
        $zones = Zone::with(['areas.branches'])->get();

        return response()->json($zones);
    }
}
