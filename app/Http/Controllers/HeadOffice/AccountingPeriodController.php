<?php

namespace App\Http\Controllers\HeadOffice;

use App\Http\Controllers\Controller;
use App\Models\Area;
use App\Models\Branch;
use App\Models\BranchMonthProcess;
use App\Models\FinancialYear;
use App\Models\Holiday;
use App\Models\PeriodReopenLog;
use App\Models\Role;
use App\Models\Zone;
use App\Services\AccountingPeriodService;
use App\Services\Loans\LoanScheduleService;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AccountingPeriodController extends Controller
{
    public function __construct(
        private readonly AccountingPeriodService $service,
        private readonly LoanScheduleService $schedules
    ) {}

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
            'branches' => Branch::operational()
                ->orderedByCode()
                ->get(['id', 'name', 'code', 'area_id', 'accounting_enabled']),
            'zones' => Zone::query()->orderBy('name')->get(['id', 'name']),
            'areas' => Area::query()->orderBy('name')->get(['id', 'name', 'zone_id']),
            'branchMonitor' => $this->service->getBranchMonitorList($zoneId, $areaId),
            'monthProcesses' => BranchMonthProcess::query()
                ->with(['branch:id,name,code', 'processedByUser:id,name', 'closedByUser:id,name', 'llpProcessedByUser:id,name'])
                ->orderByDesc('month_date')
                ->orderBy('branch_id')
                ->limit(60)
                ->get(),
            'defaultMonthDate' => CarbonImmutable::now('Asia/Dhaka')->toDateString(),
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

        $shifted = $this->schedules->rescheduleForHoliday(
            $data['holiday_date'],
            isset($data['branch_id']) ? (int) $data['branch_id'] : null
        );

        $msg = $shifted > 0
            ? "ছুটির দিন যোগ করা হয়েছে এবং {$shifted}টি বকেয়া কিস্তি পরবর্তী কর্মদিবসে সমন্বয় করা হয়েছে।"
            : 'ছুটির দিন সফলভাবে যোগ করা হয়েছে।';

        return back()->with('success', $msg);
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

    public function toggleBranchAccounting(Request $request, Branch $branch): RedirectResponse
    {
        abort_unless($this->canManage($request->user()), 403);

        $data = $request->validate([
            'accounting_enabled' => 'nullable|boolean',
        ]);

        $enabled = array_key_exists('accounting_enabled', $data)
            ? (bool) $data['accounting_enabled']
            : ! (bool) $branch->accounting_enabled;

        if ($enabled && ! Branch::operational()->whereKey($branch->id)->exists()) {
            abort(422, 'Head Office বা নিষ্ক্রিয় শাখায় একাউন্টিং চালু করা যাবে না।');
        }

        $branch->update(['accounting_enabled' => $enabled]);

        $stateLabel = $enabled
            ? 'চালু (Accounting Pilot ON)'
            : 'বন্ধ (Legacy MIS Mode)';

        return back()->with('success', "{$branch->name} শাখার হিসাব-নিকাশ মোড {$stateLabel} করা হয়েছে।");
    }

    public function runLlpProcess(Request $request): RedirectResponse
    {
        abort_unless($this->canManage($request->user()), 403);

        $data = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'month_date' => 'required|date',
        ]);

        $branches = $this->resolveTargetAccountingBranches($data['branch_id'] ?? null);
        $actorId = (int) $request->user()->id;

        if ($branches->count() === 1 && ! empty($data['branch_id'])) {
            $branch = $branches->first();
            $this->service->runLlpVoucherProcess($branch->id, $data['month_date'], $actorId);

            return back()->with('success', "{$branch->name} শাখার LLP Voucher Process সম্পন্ন হয়েছে।");
        }

        $done = 0;
        $skipped = [];
        foreach ($branches as $branch) {
            try {
                $this->service->runLlpVoucherProcess($branch->id, $data['month_date'], $actorId);
                $done++;
            } catch (ValidationException $e) {
                $msg = collect($e->errors())->flatten()->first() ?? 'Skipped';
                $skipped[] = "{$branch->name}: {$msg}";
            }
        }

        $summary = "{$done}টি একাউন্টিং-সক্রিয় শাখায় LLP প্রসেস সম্পন্ন হয়েছে।";
        if ($skipped !== []) {
            $summary .= ' (স্কিপ: '.implode('; ', array_slice($skipped, 0, 3)).')';
        }

        return back()->with('success', $summary);
    }

    public function runMonthEndAutoBatch(Request $request): RedirectResponse
    {
        abort_unless($this->canManage($request->user()), 403);

        $data = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'business_date' => 'required|date',
        ]);

        $branches = $this->resolveTargetAccountingBranches($data['branch_id'] ?? null);
        $actorId = (int) $request->user()->id;

        if ($branches->count() === 1 && ! empty($data['branch_id'])) {
            $branch = $branches->first();
            $res = $this->service->runMonthEndAutoBatch($branch->id, $data['business_date'], $actorId);

            return back()->with(
                'success',
                "{$branch->name}: {$res['savings_accounts_posted']}টি সঞ্চয়ে মুনাফা ও LLP (৳{$res['llp_amount']}) প্রসেস হয়েছে।"
            );
        }

        $done = 0;
        $profitPosted = 0;
        $skipped = [];
        foreach ($branches as $branch) {
            try {
                $res = $this->service->runMonthEndAutoBatch($branch->id, $data['business_date'], $actorId);
                $done++;
                $profitPosted += (int) $res['savings_accounts_posted'];
            } catch (ValidationException $e) {
                $msg = collect($e->errors())->flatten()->first() ?? 'Skipped';
                $skipped[] = "{$branch->name}: {$msg}";
            }
        }

        $summary = "{$done}টি শাখায় Month-End Auto Batch সম্পন্ন (মোট {$profitPosted}টি সঞ্চয়ে মুনাফা)।";
        if ($skipped !== []) {
            $summary .= ' (স্কিপ: '.implode('; ', array_slice($skipped, 0, 3)).')';
        }

        return back()->with('success', $summary);
    }

    public function runMonthlyProcess(Request $request): RedirectResponse
    {
        abort_unless($this->canManage($request->user()), 403);

        $data = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'month_date' => 'required|date',
            'close_month' => 'nullable|boolean',
        ]);

        $branches = $this->resolveTargetAccountingBranches($data['branch_id'] ?? null);
        $closeMonth = (bool) ($data['close_month'] ?? false);
        $actorId = (int) $request->user()->id;

        if ($branches->count() === 1 && ! empty($data['branch_id'])) {
            $branch = $branches->first();
            $this->service->runMonthlyProcess($branch->id, $data['month_date'], $closeMonth, $actorId);
            $verb = $closeMonth ? 'সম্পন্ন ও মাস বন্ধ (Month Close)' : 'সামারি আপডেট';

            return back()->with('success', "{$branch->name} শাখার Monthly Process {$verb} হয়েছে।");
        }

        $done = 0;
        $skipped = [];
        foreach ($branches as $branch) {
            try {
                $this->service->runMonthlyProcess($branch->id, $data['month_date'], $closeMonth, $actorId);
                $done++;
            } catch (ValidationException $e) {
                $msg = collect($e->errors())->flatten()->first() ?? 'Skipped';
                $skipped[] = "{$branch->name}: {$msg}";
            }
        }

        $verb = $closeMonth ? 'Monthly Process ও Month Close' : 'Monthly Summary';
        $summary = "{$done}টি শাখায় {$verb} সম্পন্ন হয়েছে।";
        if ($skipped !== []) {
            $summary .= ' (স্কিপ: '.implode('; ', array_slice($skipped, 0, 3)).')';
        }

        return back()->with('success', $summary);
    }

    private function resolveTargetAccountingBranches(?int $branchId)
    {
        if ($branchId) {
            $branch = Branch::query()->whereKey($branchId)->firstOrFail();

            return collect([$branch]);
        }

        $branches = Branch::operational()
            ->where('accounting_enabled', true)
            ->orderedByCode()
            ->get();

        if ($branches->isEmpty()) {
            throw ValidationException::withMessages([
                'branch_id' => ['কোনো শাখায় Accounting (Pilot Mode) চালু নেই। আগে Branch Monitor থেকে শাখা চালু করুন।'],
            ]);
        }

        return $branches;
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
