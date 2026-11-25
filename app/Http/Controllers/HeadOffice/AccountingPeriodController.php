<?php

namespace App\Http\Controllers\HeadOffice;

use App\Http\Controllers\Controller;
use App\Models\Area;
use App\Models\Branch;
use App\Models\FinancialYear;
use App\Models\Holiday;
use App\Models\PeriodReopenLog;
use App\Models\Role;
use App\Models\Zone;
use App\Services\AccountingPeriodService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AccountingPeriodController extends Controller
{
    public function __construct(private readonly AccountingPeriodService $service) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $zoneId = $request->integer('zone_id') ?: null;
        $areaId = $request->integer('area_id') ?: null;

        return Inertia::render('HeadOffice/AccountingPeriods', [
            'financialYears' => FinancialYear::query()
                ->with(['openedByUser:id,name', 'closedByUser:id,name'])
                ->withCount('branchFinancialYears')
                ->orderByDesc('starts_on')
                ->get(),
            'currentFySuggestion' => $this->service->currentFinancialYear(),
            'holidays' => Holiday::query()
                ->with('branch:id,name,code')
                ->orderByDesc('holiday_date')
                ->limit(100)
                ->get(),
            'branches' => Branch::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'code', 'area_id']),
            'zones' => Zone::query()->orderBy('name')->get(['id', 'name']),
            'areas' => Area::query()->orderBy('name')->get(['id', 'name', 'zone_id']),
            'branchMonitor' => $this->service->getBranchMonitorList($zoneId, $areaId),
            'reopenLogs' => PeriodReopenLog::query()
                ->with(['branch:id,name,code', 'reopenedByUser:id,name'])
                ->orderByDesc('reopened_at')
                ->limit(30)
                ->get(),
            'filters' => [
                'zone_id' => $zoneId,
                'area_id' => $areaId,
            ],
            'canManage' => $this->canManage($user),
            'isSuperAdmin' => $this->isSuperAdmin($user),
        ]);
    }

    public function openFinancialYear(Request $request): RedirectResponse
    {
        abort_unless($this->canManage($request->user()), 403);

        $data = $request->validate([
            'start_year' => 'required|integer|min:2020|max:2099',
        ]);

        $fy = $this->service->openFinancialYear((int) $data['start_year'], (int) $request->user()->id);

        return back()->with('success', "অর্থবছর {$fy->name} সফলভাবে খোলা হয়েছে।");
    }

    public function closeFinancialYear(Request $request, FinancialYear $financialYear): RedirectResponse
    {
        abort_unless($this->canManage($request->user()), 403);

        $data = $request->validate([
            'reference' => 'nullable|string|max:120',
        ]);

        $this->service->closeFinancialYear($financialYear->id, $data['reference'] ?? null, (int) $request->user()->id);

        return back()->with('success', "অর্থবছর {$financialYear->name} বন্ধ করা হয়েছে।");
    }

    public function reopenFinancialYear(Request $request, FinancialYear $financialYear): RedirectResponse
    {
        abort_unless($this->isSuperAdmin($request->user()), 403, 'শুধুমাত্র Super Admin বন্ধ অর্থবছর পুনরায় খুলতে পারবেন।');

        $data = $request->validate([
            'reason' => 'required|string|min:5|max:500',
        ]);

        $this->service->reopenFinancialYear($financialYear->id, $data['reason'], (int) $request->user()->id);

        return back()->with('success', "অর্থবছর {$financialYear->name} সফলভাবে পুনরায় খোলা (Rollback) হয়েছে।");
    }

    public function storeHoliday(Request $request): RedirectResponse
    {
        abort_unless($this->canManage($request->user()), 403);

        $data = $request->validate([
            'holiday_date' => 'required|date',
            'title' => 'required|string|max:160',
            'kind' => 'required|in:govt,weekly,special',
            'branch_id' => 'nullable|exists:branches,id',
        ]);

        $this->service->addHoliday(
            $data['holiday_date'],
            $data['title'],
            $data['kind'],
            isset($data['branch_id']) ? (int) $data['branch_id'] : null,
            (int) $request->user()->id
        );

        return back()->with('success', 'ছুটির দিন সফলভাবে যোগ করা হয়েছে।');
    }

    public function destroyHoliday(Request $request, Holiday $holiday): RedirectResponse
    {
        abort_unless($this->canManage($request->user()), 403);

        $holiday->delete();

        return back()->with('success', 'ছুটির দিন মুছে ফেলা হয়েছে।');
    }

    public function setBranchDayInitial(Request $request): RedirectResponse
    {
        abort_unless($this->canManage($request->user()), 403);

        $data = $request->validate([
            'financial_year_id' => 'required|exists:financial_years,id',
            'branch_id' => 'required|exists:branches,id',
            'initial_date' => 'required|date',
        ]);

        $this->service->setBranchDayInitial(
            (int) $data['financial_year_id'],
            (int) $data['branch_id'],
            $data['initial_date'],
            (int) $request->user()->id
        );

        return back()->with('success', 'শাখার Initial Date (Manage Day Initial) সফলভাবে সেট করা হয়েছে।');
    }

    public function reopenPeriod(Request $request): RedirectResponse
    {
        abort_unless($this->canManage($request->user()), 403);

        $data = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'kind' => 'required|in:day,month',
            'period_date' => 'required|date',
            'reason' => 'required|string|min:5|max:500',
        ]);

        $this->service->reopenPeriod(
            (int) $data['branch_id'],
            $data['kind'],
            $data['period_date'],
            $data['reason'],
            (int) $request->user()->id
        );

        return back()->with('success', 'পিরিয়ডটি সফলভাবে পুনরায় খোলা (Reopen) হয়েছে।');
    }

    private function canManage($user): bool
    {
        $role = $user?->role?->name;

        return (bool) ($user?->has_all_access || in_array($role, [Role::SUPER_ADMIN, Role::HEAD_OFFICE], true));
    }

    private function isSuperAdmin($user): bool
    {
        return (bool) ($user?->has_all_access || $user?->isSuperAdmin());
    }
}
