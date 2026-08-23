<?php

namespace App\Http\Controllers\HeadOffice;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\MemberAdmission;
use App\Services\CsoAllocationService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CsoDutyRosterController extends Controller
{
    public function __construct(
        protected CsoAllocationService $allocationService
    ) {}

    /**
     * Display CSO Daily Duty Roster.
     */
    public function index(Request $request): Response
    {
        $date = $request->input('date', Carbon::today()->toDateString());
        $dutyBoard = $this->allocationService->getAllocationsForDate($date);
        $allAreas = $this->allocationService->getActiveAreas();
        $activeCsos = $this->allocationService->getActiveCsoUsers();

        // Workload statistics by Area
        $branchCounts = Branch::active()
            ->groupBy('area_id')
            ->select('area_id', DB::raw('count(*) as total'))
            ->pluck('total', 'area_id');

        $pendingLoans = LoanApplication::whereIn('status', ['pending_head_office', 'ready_for_head_office'])
            ->join('branches', 'loan_applications.branch_id', '=', 'branches.id')
            ->groupBy('branches.area_id')
            ->select('branches.area_id', DB::raw('count(*) as total'))
            ->pluck('total', 'area_id');

        $pendingAdmissions = MemberAdmission::whereIn('status', ['pending_head_office', 'ready_for_head_office'])
            ->join('branches', 'member_admissions.branch_id', '=', 'branches.id')
            ->groupBy('branches.area_id')
            ->select('branches.area_id', DB::raw('count(*) as total'))
            ->pluck('total', 'area_id');

        // Attach statistics to each roster item
        foreach ($dutyBoard['roster'] as &$entry) {
            $userAreaIds = collect($entry['areas'])->pluck('id')->all();
            $entry['total_branches'] = collect($userAreaIds)->sum(fn ($aId) => $branchCounts[$aId] ?? 0);
            $entry['pending_loans'] = collect($userAreaIds)->sum(fn ($aId) => $pendingLoans[$aId] ?? 0);
            $entry['pending_admissions'] = collect($userAreaIds)->sum(fn ($aId) => $pendingAdmissions[$aId] ?? 0);

            // Add stats per area in the list
            foreach ($entry['areas'] as &$area) {
                $aId = $area['id'];
                $area['branch_count'] = $branchCounts[$aId] ?? 0;
                $area['pending_loans'] = $pendingLoans[$aId] ?? 0;
                $area['pending_admissions'] = $pendingAdmissions[$aId] ?? 0;
            }
        }
        unset($entry);

        return Inertia::render('HeadOffice/CsoDutyRoster', [
            'date' => $date,
            'dutyBoard' => $dutyBoard,
            'allAreas' => $allAreas,
            'activeCsos' => $activeCsos,
            'canManage' => $request->user()?->isSuperAdmin() || $request->user()?->isHeadOffice() || $request->user()?->has_all_access,
        ]);
    }

    /**
     * Save manual override allocations for a specific date.
     */
    public function save(Request $request)
    {
        $user = $request->user();
        if (! $user?->isSuperAdmin() && ! $user?->isHeadOffice() && ! $user?->has_all_access) {
            abort(403, 'Only Head Office or Super Admin can modify duty allocations.');
        }

        $validated = $request->validate([
            'date' => 'required|date_format:Y-m-d',
            'allocations' => 'required|array',
            'allocations.*' => 'array',
            'allocations.*.*' => 'integer|exists:areas,id',
            'notes' => 'nullable|string|max:255',
        ]);

        $this->allocationService->saveManualAllocations(
            $validated['date'],
            $validated['allocations'],
            $user->id,
            $validated['notes'] ?? null
        );

        return back()->with('success', 'CSO Duty Roster updated successfully for '.$validated['date']);
    }

    /**
     * Reset allocations to auto-rotation.
     */
    public function reset(Request $request)
    {
        $user = $request->user();
        if (! $user?->isSuperAdmin() && ! $user?->isHeadOffice() && ! $user?->has_all_access) {
            abort(403, 'Only Head Office or Super Admin can reset duty allocations.');
        }

        $validated = $request->validate([
            'date' => 'required|date_format:Y-m-d',
        ]);

        $this->allocationService->resetToAuto($validated['date']);

        return back()->with('success', 'CSO Duty Roster reset to Automatic Cyclic Rotation for '.$validated['date']);
    }
}
