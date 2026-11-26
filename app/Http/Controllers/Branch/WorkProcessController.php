<?php

namespace App\Http\Controllers\Branch;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\BranchAccountingPeriod;
use App\Models\BranchMonthProcess;
use App\Models\Holiday;
use App\Models\Role;
use App\Services\AccountingPeriodService;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class WorkProcessController extends Controller
{
    public function __construct(private readonly AccountingPeriodService $service) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $branchId = $this->resolveBranchId($request);
        if (! $this->isHeadOfficeOrAdmin($user)) {
            abort_unless($this->branchAccountingEnabled($branchId), 403, 'এই শাখায় এখনো একাউন্টিং ও Work Process চালু করা হয়নি।');
        }
        $branch = $branchId ? Branch::query()->find($branchId, ['id', 'name', 'code']) : null;

        $dayState = $branchId ? $this->service->getBranchDayState($branchId) : null;
        $todaySummary = ($branchId && ($dayState['has_open_day'] ?? false))
            ? $this->service->computeDaySummary($branchId, $dayState['business_date'])
            : null;

        $recentDays = $branchId
            ? BranchAccountingPeriod::query()
                ->with(['openedByUser:id,name', 'closedByUser:id,name'])
                ->where('branch_id', $branchId)
                ->where('kind', BranchAccountingPeriod::KIND_DAY)
                ->orderByDesc('period_date')
                ->limit(15)
                ->get()
            : collect();

        $monthProcesses = $branchId
            ? BranchMonthProcess::query()
                ->with(['processedByUser:id,name', 'closedByUser:id,name', 'llpProcessedByUser:id,name'])
                ->where('branch_id', $branchId)
                ->orderByDesc('month_date')
                ->limit(6)
                ->get()
            : collect();

        $upcomingHolidays = $branchId
            ? Holiday::query()
                ->where('holiday_date', '>=', CarbonImmutable::now('Asia/Dhaka')->subDays(7)->toDateString())
                ->where(fn ($q) => $q->whereNull('branch_id')->orWhere('branch_id', $branchId))
                ->orderBy('holiday_date')
                ->limit(10)
                ->get()
            : collect();

        $canSelectBranch = $this->isHeadOfficeOrAdmin($user);

        return Inertia::render('Branch/WorkProcess', [
            'branch' => $branch,
            'branches' => $canSelectBranch
                ? Branch::operational()->orderedByCode()->get(['id', 'name', 'code'])
                : [],
            'canSelectBranch' => $canSelectBranch,
            'dayState' => $dayState,
            'todaySummary' => $todaySummary,
            'recentDays' => $recentDays,
            'monthProcesses' => $monthProcesses,
            'upcomingHolidays' => $upcomingHolidays,
            'defaultMonthDate' => $dayState['business_date']
                ?? $dayState['suggested_next_date']
                ?? CarbonImmutable::now('Asia/Dhaka')->toDateString(),
            'canManage' => $this->canOperateProcess($user),
        ]);
    }

    public function startWork(Request $request): RedirectResponse
    {
        abort_unless($this->canOperateProcess($request->user()), 403);

        $data = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'date' => 'required|date',
            'allow_holiday' => 'nullable|boolean',
        ]);

        $branchId = $this->resolveBranchId($request, $data['branch_id'] ?? null);
        abort_unless($branchId, 422, 'শাখা নির্ধারিত নেই।');
        if (! $this->isHeadOfficeOrAdmin($request->user())) {
            abort_unless($this->branchAccountingEnabled($branchId), 403, 'এই শাখায় এখনো একাউন্টিং ও Work Process চালু করা হয়নি।');
        }

        $period = $this->service->startWorkProcess(
            $branchId,
            $data['date'],
            (int) $request->user()->id,
            (bool) ($data['allow_holiday'] ?? false)
        );

        return back()->with('success', "কর্মদিবস {$period->period_date->toDateString()} সফলভাবে শুরু (Day Open) হয়েছে।");
    }

    public function completeWork(Request $request): RedirectResponse
    {
        abort_unless($this->canOperateProcess($request->user()), 403);

        $data = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'date' => 'required|date',
            'reference' => 'nullable|string|max:120',
        ]);

        $branchId = $this->resolveBranchId($request, $data['branch_id'] ?? null);
        abort_unless($branchId, 422, 'শাখা নির্ধারিত নেই।');
        if (! $this->isHeadOfficeOrAdmin($request->user())) {
            abort_unless($this->branchAccountingEnabled($branchId), 403, 'এই শাখায় এখনো একাউন্টিং ও Work Process চালু করা হয়নি।');
        }

        $period = $this->service->completeWorkProcess(
            $branchId,
            $data['date'],
            $data['reference'] ?? null,
            (int) $request->user()->id
        );

        return back()->with('success', "কর্মদিবস {$period->period_date->toDateString()} সফলভাবে সম্পন্ন (Day Close) হয়েছে।");
    }

    public function runLlpProcess(Request $request): RedirectResponse
    {
        abort_unless($this->isHeadOfficeOrAdmin($request->user()), 403, 'LLP ও Monthly Process শুধুমাত্র Head Office থেকে পরিচালনা করা যায়।');

        $data = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'month_date' => 'required|date',
        ]);

        $branchId = $this->resolveBranchId($request, $data['branch_id'] ?? null);
        abort_unless($branchId, 422, 'শাখা নির্ধারিত নেই।');

        $this->service->runLlpVoucherProcess($branchId, $data['month_date'], (int) $request->user()->id);

        return back()->with('success', 'LLP Voucher Process সফলভাবে সম্পন্ন হয়েছে।');
    }

    public function runMonthlyProcess(Request $request): RedirectResponse
    {
        abort_unless($this->isHeadOfficeOrAdmin($request->user()), 403, 'LLP ও Monthly Process শুধুমাত্র Head Office থেকে পরিচালনা করা যায়।');

        $data = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'month_date' => 'required|date',
            'close_month' => 'nullable|boolean',
        ]);

        $branchId = $this->resolveBranchId($request, $data['branch_id'] ?? null);
        abort_unless($branchId, 422, 'শাখা নির্ধারিত নেই।');

        $closeMonth = (bool) ($data['close_month'] ?? false);
        $this->service->runMonthlyProcess($branchId, $data['month_date'], $closeMonth, (int) $request->user()->id);

        $msg = $closeMonth
            ? 'Monthly Process সম্পন্ন হয়েছে এবং মাসটি বন্ধ (Month Close) করা হয়েছে।'
            : 'Monthly Process সামারি আপডেট করা হয়েছে।';

        return back()->with('success', $msg);
    }

    public function runMonthEndAutoBatch(Request $request): RedirectResponse
    {
        abort_unless($this->isHeadOfficeOrAdmin($request->user()), 403, 'LLP ও Monthly Process শুধুমাত্র Head Office থেকে পরিচালনা করা যায়।');

        $data = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'business_date' => 'required|date',
        ]);

        $branchId = $this->resolveBranchId($request, $data['branch_id'] ?? null);
        abort_unless($branchId, 422, 'শাখা নির্ধারিত নেই।');

        $res = $this->service->runMonthEndAutoBatch($branchId, $data['business_date'], (int) $request->user()->id);

        return back()->with(
            'success',
            "Month-End Auto Batch সম্পন্ন: {$res['savings_accounts_posted']}টি সঞ্চয়ে মুনাফা পোস্ট ও LLP (৳{$res['llp_amount']}) প্রসেস হয়েছে।"
        );
    }

    private function resolveBranchId(Request $request, $requestedBranchId = null): ?int
    {
        $user = $request->user();
        if ($this->isHeadOfficeOrAdmin($user)) {
            $candidate = $requestedBranchId ?: $request->integer('branch_id');
            if ($candidate) {
                return (int) $candidate;
            }

            return Branch::resolveOperationalDefaultId($user->branch_id ? (int) $user->branch_id : null);
        }

        return $user->branch_id ? (int) $user->branch_id : null;
    }

    private function isHeadOfficeOrAdmin($user): bool
    {
        $role = $user?->role?->name;

        return (bool) ($user?->has_all_access || in_array($role, [Role::SUPER_ADMIN, Role::HEAD_OFFICE], true));
    }

    private function branchAccountingEnabled(?int $branchId): bool
    {
        if (! $branchId) {
            return false;
        }

        if (! Schema::hasColumn('branches', 'accounting_enabled')) {
            return true;
        }

        return (bool) Branch::whereKey($branchId)->value('accounting_enabled');
    }

    private function canOperateProcess($user): bool
    {
        if ($this->isHeadOfficeOrAdmin($user)) {
            return true;
        }

        $role = $user?->role?->name;

        return in_array($role, [Role::BRANCH_MANAGER, Role::BRANCH_USER], true);
    }
}
