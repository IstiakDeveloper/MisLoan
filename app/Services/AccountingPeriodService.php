<?php

namespace App\Services;

use App\Models\AccountingVoucher;
use App\Models\Branch;
use App\Models\CashierSession;
use App\Models\BranchAccountingPeriod;
use App\Models\BranchFinancialYear;
use App\Models\BranchMonthProcess;
use App\Models\FinancialYear;
use App\Models\Holiday;
use App\Models\LoanAccount;
use App\Models\LoanApplication;
use App\Models\MemberAdmission;
use App\Models\PeriodReopenLog;
use App\Models\SavingsAccount;
use App\Models\SavingsApplication;
use App\Services\Accounting\PostingDefaults;
use App\Services\Accounting\VoucherService;
use App\Services\Savings\SavingsLedgerService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class AccountingPeriodService
{
    private const TZ = 'Asia/Dhaka';

    /** @return array{start_year: int, name: string, starts_on: string, ends_on: string} */
    public function currentFinancialYear(): array
    {
        $today = CarbonImmutable::now(self::TZ);
        $year = $today->month >= 7 ? $today->year : $today->year - 1;

        return [
            'start_year' => $year,
            'name' => $year.'-'.($year + 1),
            'starts_on' => "{$year}-07-01",
            'ends_on' => ($year + 1).'-06-30',
        ];
    }

    public function openFinancialYear(int $startYear, int $actorId): FinancialYear
    {
        $startsOn = "{$startYear}-07-01";
        $endsOn = ($startYear + 1).'-06-30';
        $name = $startYear.'-'.($startYear + 1);

        return DB::transaction(function () use ($name, $startsOn, $endsOn, $actorId) {
            $overlaps = FinancialYear::query()
                ->where('starts_on', '<=', $endsOn)
                ->where('ends_on', '>=', $startsOn)
                ->exists();

            if ($overlaps) {
                $this->reject('এই অর্থবছরটি বিদ্যমান অর্থবছরের সাথে ওভারল্যাপ করছে।');
            }

            return FinancialYear::create([
                'name' => $name,
                'starts_on' => $startsOn,
                'ends_on' => $endsOn,
                'opened_by' => $actorId,
                'opened_at' => now(),
            ]);
        });
    }

    public function closeFinancialYear(int $financialYearId, ?string $reference, int $actorId): FinancialYear
    {
        return DB::transaction(function () use ($financialYearId, $reference, $actorId) {
            $fy = FinancialYear::query()->lockForUpdate()->findOrFail($financialYearId);

            if ($fy->isClosed()) {
                $this->reject('এই অর্থবছর ইতিমধ্যে বন্ধ করা হয়েছে।');
            }

            $openExists = BranchAccountingPeriod::query()
                ->whereHas('branchFinancialYear', fn ($q) => $q->where('financial_year_id', $fy->id))
                ->where('status', BranchAccountingPeriod::STATUS_OPEN)
                ->exists();

            if ($openExists) {
                $this->reject('অর্থবছর বন্ধ করার আগে সব শাখার খোলা দিন ও মাস বন্ধ করতে হবে।');
            }

            $fy->update([
                'closed_by' => $actorId,
                'closed_at' => now(),
                'close_reference' => $reference,
            ]);

            return $fy->fresh();
        });
    }

    public function reopenFinancialYear(int $financialYearId, string $reason, int $actorId): FinancialYear
    {
        return DB::transaction(function () use ($financialYearId, $reason, $actorId) {
            $fy = FinancialYear::query()->lockForUpdate()->findOrFail($financialYearId);

            if (! $fy->isClosed()) {
                $this->reject('এই অর্থবছরটি ইতিমধ্যে খোলা (Open) অবস্থায় আছে।');
            }

            $fy->update([
                'closed_by' => null,
                'closed_at' => null,
                'close_reference' => null,
            ]);

            PeriodReopenLog::create([
                'branch_id' => null,
                'kind' => 'year',
                'period_date' => $fy->starts_on->toDateString(),
                'reason' => $reason,
                'reopened_by' => $actorId,
                'reopened_at' => now(),
            ]);

            return $fy->fresh();
        });
    }

    public function addHoliday(string $date, string $title, string $kind, ?int $branchId, int $actorId): Holiday
    {
        $exists = Holiday::query()
            ->where('holiday_date', $date)
            ->when($branchId === null, fn ($q) => $q->whereNull('branch_id'), fn ($q) => $q->where('branch_id', $branchId))
            ->exists();

        if ($exists) {
            $this->reject('এই তারিখে ইতিমধ্যে ছুটি নির্ধারিত আছে।');
        }

        return Holiday::create([
            'holiday_date' => $date,
            'title' => $title,
            'kind' => $kind,
            'branch_id' => $branchId,
            'created_by' => $actorId,
        ]);
    }

    public function findHoliday(string $date, int $branchId): ?Holiday
    {
        return Holiday::query()
            ->where('holiday_date', $date)
            ->where(fn ($q) => $q->whereNull('branch_id')->orWhere('branch_id', $branchId))
            ->orderByRaw('branch_id IS NULL ASC')
            ->first();
    }

    public function setBranchDayInitial(int $financialYearId, int $branchId, string $initialDate, int $actorId): BranchFinancialYear
    {
        return DB::transaction(function () use ($financialYearId, $branchId, $initialDate, $actorId) {
            $fy = FinancialYear::query()->lockForUpdate()->findOrFail($financialYearId);
            if ($fy->isClosed()) {
                $this->reject('বন্ধ অর্থবছরে শাখার শুরুর তারিখ সেট করা যাবে না।');
            }

            $branch = Branch::query()->findOrFail($branchId);
            if (! $branch->is_active) {
                $this->reject('নিষ্ক্রিয় শাখায় শুরুর তারিখ সেট করা যাবে না।');
            }

            $start = $fy->starts_on->toDateString();
            $end = $fy->ends_on->toDateString();
            if ($initialDate < $start || $initialDate > $end) {
                $this->reject("শুরুর তারিখ অবশ্যই অর্থবছরের ({$start} থেকে {$end}) মধ্যে হতে হবে।");
            }

            $existing = BranchFinancialYear::query()
                ->where('financial_year_id', $fy->id)
                ->where('branch_id', $branchId)
                ->first();

            if ($existing) {
                $hasPeriods = BranchAccountingPeriod::query()
                    ->where('branch_financial_year_id', $existing->id)
                    ->exists();
                if ($hasPeriods) {
                    $this->reject('এই শাখায় ইতিমধ্যে কর্মদিবস শুরু হয়ে যাওয়ায় Initial Date পরিবর্তন করা যাবে না।');
                }
                $existing->update([
                    'initial_date' => $initialDate,
                    'enrolled_by' => $actorId,
                    'enrolled_at' => now(),
                ]);

                return $existing->fresh();
            }

            return BranchFinancialYear::create([
                'financial_year_id' => $fy->id,
                'branch_id' => $branchId,
                'initial_date' => $initialDate,
                'enrolled_by' => $actorId,
                'enrolled_at' => now(),
            ]);
        });
    }

    /**
     * Get the current open business day (or latest state) for a branch.
     *
     * @return array<string, mixed>|null
     */
    public function getBranchDayState(int $branchId): ?array
    {
        $openDay = BranchAccountingPeriod::query()
            ->with('branchFinancialYear.financialYear')
            ->where('branch_id', $branchId)
            ->where('kind', BranchAccountingPeriod::KIND_DAY)
            ->where('status', BranchAccountingPeriod::STATUS_OPEN)
            ->orderByDesc('period_date')
            ->first();

        if ($openDay) {
            return [
                'has_open_day' => true,
                'business_date' => $openDay->period_date->toDateString(),
                'status' => $openDay->status,
                'opened_at' => $openDay->opened_at?->toIso8601String(),
                'financial_year' => $openDay->branchFinancialYear?->financialYear?->name,
                'initial_date' => $openDay->branchFinancialYear?->initial_date?->toDateString(),
            ];
        }

        $enrollment = BranchFinancialYear::query()
            ->with('financialYear')
            ->where('branch_id', $branchId)
            ->whereHas('financialYear', fn ($q) => $q->whereNull('closed_at'))
            ->orderByDesc('id')
            ->first();

        if (! $enrollment) {
            return null;
        }

        $lastClosed = BranchAccountingPeriod::query()
            ->where('branch_id', $branchId)
            ->where('kind', BranchAccountingPeriod::KIND_DAY)
            ->where('status', BranchAccountingPeriod::STATUS_CLOSED)
            ->orderByDesc('period_date')
            ->first();

        return [
            'has_open_day' => false,
            'business_date' => $lastClosed?->period_date?->toDateString(),
            'status' => 'closed',
            'opened_at' => null,
            'financial_year' => $enrollment->financialYear?->name,
            'initial_date' => $enrollment->initial_date->toDateString(),
            'suggested_next_date' => $this->suggestNextDate($branchId, $enrollment, $lastClosed),
        ];
    }

    public function startWorkProcess(int $branchId, string $date, int $actorId, bool $allowHoliday = false): BranchAccountingPeriod
    {
        return DB::transaction(function () use ($branchId, $date, $actorId, $allowHoliday) {
            $branch = Branch::query()->lockForUpdate()->findOrFail($branchId);
            if (! $branch->is_active) {
                $this->reject('নিষ্ক্রিয় শাখায় কর্মদিবস খোলা যাবে না।');
            }

            $enrollment = BranchFinancialYear::query()
                ->with('financialYear')
                ->where('branch_id', $branchId)
                ->whereHas('financialYear', fn ($q) => $q->whereNull('closed_at'))
                ->orderByDesc('id')
                ->first();

            if (! $enrollment) {
                $this->reject('Head Office থেকে এখনো এই শাখার Initial Date সেট করা হয়নি (Manage Day Initial)।');
            }

            $fy = $enrollment->financialYear;
            if ($date < $enrollment->initial_date->toDateString() || $date > $fy->ends_on->toDateString()) {
                $this->reject('নির্বাচিত তারিখ শাখার অনুমোদিত অর্থবছর ও Initial Date-এর সীমার বাইরে।');
            }

            $alreadyOpen = BranchAccountingPeriod::query()
                ->where('branch_id', $branchId)
                ->where('kind', BranchAccountingPeriod::KIND_DAY)
                ->where('status', BranchAccountingPeriod::STATUS_OPEN)
                ->first();

            if ($alreadyOpen) {
                $d = $alreadyOpen->period_date->toDateString();
                $this->reject("আগের কর্মদিবস ({$d}) এখনো খোলা আছে। আগে Complete Work Process (Day Close) করুন।");
            }

            $monthEnd = CarbonImmutable::parse($date)->endOfMonth()->toDateString();
            $monthClosed = BranchAccountingPeriod::query()
                ->where('branch_id', $branchId)
                ->where('kind', BranchAccountingPeriod::KIND_MONTH)
                ->where('period_date', $monthEnd)
                ->where('status', BranchAccountingPeriod::STATUS_CLOSED)
                ->exists();

            if ($monthClosed) {
                $this->reject('এই মাসের Monthly Process ইতিমধ্যে সম্পন্ন ও বন্ধ হয়ে গেছে।');
            }

            $lastClosed = BranchAccountingPeriod::query()
                ->where('branch_id', $branchId)
                ->where('kind', BranchAccountingPeriod::KIND_DAY)
                ->where('status', BranchAccountingPeriod::STATUS_CLOSED)
                ->orderByDesc('period_date')
                ->first();

            if ($lastClosed && $date <= $lastClosed->period_date->toDateString()) {
                $this->reject('পূর্ববর্তী বন্ধ হওয়া তারিখের আগে বা সমান তারিখে নতুন কর্মদিবস খোলা যাবে না।');
            }

            if (! $allowHoliday) {
                $holiday = $this->findHoliday($date, $branchId);
                if ($holiday) {
                    $this->reject("নির্বাচিত তারিখটি সরকারি/নির্ধারিত ছুটি ({$holiday->title})।");
                }
            }

            BranchAccountingPeriod::query()->firstOrCreate(
                [
                    'branch_id' => $branchId,
                    'kind' => BranchAccountingPeriod::KIND_MONTH,
                    'period_date' => $monthEnd,
                ],
                [
                    'branch_financial_year_id' => $enrollment->id,
                    'status' => BranchAccountingPeriod::STATUS_OPEN,
                    'opened_by' => $actorId,
                    'opened_at' => now(),
                ]
            );

            $existingDay = BranchAccountingPeriod::query()
                ->where('branch_id', $branchId)
                ->where('kind', BranchAccountingPeriod::KIND_DAY)
                ->where('period_date', $date)
                ->first();

            if ($existingDay) {
                $existingDay->update([
                    'status' => BranchAccountingPeriod::STATUS_OPEN,
                    'opened_by' => $actorId,
                    'opened_at' => now(),
                    'closed_by' => null,
                    'closed_at' => null,
                ]);

                return $existingDay->fresh();
            }

            return BranchAccountingPeriod::create([
                'branch_financial_year_id' => $enrollment->id,
                'branch_id' => $branchId,
                'kind' => BranchAccountingPeriod::KIND_DAY,
                'period_date' => $date,
                'status' => BranchAccountingPeriod::STATUS_OPEN,
                'opened_by' => $actorId,
                'opened_at' => now(),
            ]);
        });
    }

    /** @return array<string, int|float> */
    public function computeDaySummary(int $branchId, string $date): array
    {
        $admissionsCount = MemberAdmission::query()
            ->where('branch_id', $branchId)
            ->whereDate('created_at', $date)
            ->count();

        $loansSubmitted = LoanApplication::query()
            ->where('branch_id', $branchId)
            ->whereDate('created_at', $date)
            ->count();

        $loansDisbursed = LoanApplication::query()
            ->where('branch_id', $branchId)
            ->whereDate('disbursed_at', $date)
            ->count();

        $disbursedAmount = (float) LoanApplication::query()
            ->where('branch_id', $branchId)
            ->whereDate('disbursed_at', $date)
            ->sum('disbursed_amount');

        $savingsOpened = SavingsApplication::query()
            ->where('branch_id', $branchId)
            ->whereDate('created_at', $date)
            ->count();

        return [
            'admissions_count' => $admissionsCount,
            'loans_submitted' => $loansSubmitted,
            'loans_disbursed' => $loansDisbursed,
            'disbursed_amount' => round($disbursedAmount, 2),
            'savings_opened' => $savingsOpened,
        ];
    }

    public function completeWorkProcess(int $branchId, string $date, ?string $reference, int $actorId): BranchAccountingPeriod
    {
        return DB::transaction(function () use ($branchId, $date, $reference, $actorId) {
            $day = BranchAccountingPeriod::query()
                ->where('branch_id', $branchId)
                ->where('kind', BranchAccountingPeriod::KIND_DAY)
                ->where('period_date', $date)
                ->lockForUpdate()
                ->first();

            if (! $day || $day->status !== BranchAccountingPeriod::STATUS_OPEN) {
                $this->reject('এই তারিখের কর্মদিবস বর্তমানে খোলা (Open) অবস্থায় নেই।');
            }

            if (Schema::hasTable('accounting_vouchers')) {
                $hasPendingVouchers = AccountingVoucher::query()
                    ->where('branch_id', $branchId)
                    ->where('business_date', $date)
                    ->where('status', AccountingVoucher::STATUS_PENDING)
                    ->exists();

                if ($hasPendingVouchers) {
                    $this->reject('এই তারিখে এখনো অনুমোদনের অপেক্ষায় থাকা ভাউচার (Pending Voucher) রয়েছে। আগে সেগুলো অনুমোদন বা বাতিল করুন।');
                }
            }

            if (Schema::hasTable('cashier_sessions')) {
                $unapprovedSession = CashierSession::query()
                    ->where('branch_id', $branchId)
                    ->where('business_date', $date)
                    ->where('status', '!=', CashierSession::STATUS_APPROVED)
                    ->exists();

                if ($unapprovedSession) {
                    $this->reject('এই তারিখের ক্যাশ সেশন (Cash Desk) এখনো অনুমোদিত (Approved) হয়নি। আগে ক্যাশ মিলিয়ে অনুমোদন করুন।');
                }
            }

            $summary = $this->computeDaySummary($branchId, $date);

            $day->update([
                'status' => BranchAccountingPeriod::STATUS_CLOSED,
                'closed_by' => $actorId,
                'closed_at' => now(),
                'close_reference' => $reference,
                'summary' => $summary,
            ]);

            return $day->fresh();
        });
    }

    public function runLlpVoucherProcess(int $branchId, string $monthDate, int $actorId): BranchMonthProcess
    {
        return DB::transaction(function () use ($branchId, $monthDate, $actorId) {
            $monthEnd = CarbonImmutable::parse($monthDate)->endOfMonth()->toDateString();
            $enrollment = $this->resolveBranchEnrollmentForMonth($branchId, $monthEnd);

            $activeAccounts = Schema::hasTable('loan_accounts')
                ? LoanAccount::query()
                    ->with(['installments' => fn ($q) => $q->whereIn('status', ['pending', 'partial'])->orderBy('due_date')])
                    ->where('branch_id', $branchId)
                    ->where('status', LoanAccount::STATUS_ACTIVE)
                    ->get()
                : collect();

            if ($activeAccounts->isNotEmpty()) {
                $activeLoansCount = $activeAccounts->count();
                $activePortfolio = 0.0;
                $llpPaisa = 0;

                foreach ($activeAccounts as $acc) {
                    $outstanding = $acc->remainingPrincipalPaisa();
                    $activePortfolio += $outstanding / 100;

                    $oldestOverdue = $acc->installments->first(fn ($i) => $i->due_date->toDateString() < $monthEnd);
                    $daysOverdue = $oldestOverdue
                        ? CarbonImmutable::parse($oldestOverdue->due_date)->diffInDays(CarbonImmutable::parse($monthEnd))
                        : 0;

                    $rate = match (true) {
                        $daysOverdue >= 365 => 1.00,
                        $daysOverdue >= 181 => 0.75,
                        $daysOverdue >= 31 => 0.25,
                        $daysOverdue >= 1 => 0.05,
                        default => 0.01,
                    };
                    $llpPaisa += (int) round($outstanding * $rate);
                }

                $llpAmount = round($llpPaisa / 100, 2);
            } else {
                $activeLoansCount = LoanApplication::query()
                    ->where('branch_id', $branchId)
                    ->where('status', LoanApplication::STATUS_DISBURSED)
                    ->count();

                $activePortfolio = (float) LoanApplication::query()
                    ->where('branch_id', $branchId)
                    ->where('status', LoanApplication::STATUS_DISBURSED)
                    ->sum('disbursed_amount');

                $llpPaisa = (int) round($activePortfolio * 100 * 0.01);
                $llpAmount = round($llpPaisa / 100, 2);
            }

            $llpVoucherSubmitted = false;
            if ($llpPaisa > 0 && Schema::hasTable('accounting_vouchers') && Schema::hasTable('gl_posting_defaults')) {
                $openDay = BranchAccountingPeriod::query()
                    ->where('branch_id', $branchId)
                    ->where('kind', BranchAccountingPeriod::KIND_DAY)
                    ->where('status', BranchAccountingPeriod::STATUS_OPEN)
                    ->orderByDesc('period_date')
                    ->first();

                $defaults = app(PostingDefaults::class);
                $llpExpId = $defaults->resolveAccountId('llp_expense');
                $llpResId = $defaults->resolveAccountId('llp_reserve');

                if ($openDay && $llpExpId && $llpResId) {
                    app(VoucherService::class)->submitVoucher(
                        $branchId,
                        AccountingVoucher::KIND_JOURNAL,
                        $openDay->period_date->toDateString(),
                        "Monthly LLP Provision for {$monthEnd}",
                        [
                            ['ledger_account_id' => $llpExpId, 'debit_paisa' => $llpPaisa, 'credit_paisa' => 0],
                            ['ledger_account_id' => $llpResId, 'debit_paisa' => 0, 'credit_paisa' => $llpPaisa],
                        ],
                        "llp-voucher:{$branchId}:{$monthEnd}",
                        $actorId
                    );
                    $llpVoucherSubmitted = true;
                }
            }

            $llpSummary = [
                'active_loans' => $activeLoansCount,
                'active_portfolio' => round($activePortfolio, 2),
                'estimated_llp_amount' => $llpAmount,
                'llp_paisa' => $llpPaisa,
                'voucher_submitted' => $llpVoucherSubmitted,
            ];

            $existing = BranchMonthProcess::query()
                ->where('branch_id', $branchId)
                ->where('month_date', $monthEnd)
                ->lockForUpdate()
                ->first();

            if ($existing) {
                if ($existing->status === BranchMonthProcess::STATUS_CLOSED) {
                    $this->reject('বন্ধ হওয়া মাসে LLP Voucher Process চালানো যাবে না।');
                }
                $existing->update([
                    'llp_processed_at' => now(),
                    'llp_processed_by' => $actorId,
                    'llp_summary' => $llpSummary,
                ]);

                return $existing->fresh();
            }

            return BranchMonthProcess::create([
                'branch_id' => $branchId,
                'branch_financial_year_id' => $enrollment->id,
                'month_date' => $monthEnd,
                'status' => BranchMonthProcess::STATUS_PROCESSED,
                'llp_processed_at' => now(),
                'llp_processed_by' => $actorId,
                'llp_summary' => $llpSummary,
                'processed_by' => $actorId,
                'processed_at' => now(),
                'summary' => [],
            ]);
        });
    }

    /**
     * Run Month-End Auto Batch on the branch's active open business day:
     * 1. Post monthly profit for all active savings accounts.
     * 2. Run LLP calculation and submit LLP Journal Voucher.
     *
     * @return array{savings_accounts_posted: int, llp_amount: float, llp_voucher_submitted: bool}
     */
    public function runMonthEndAutoBatch(int $branchId, string $businessDate, int $actorId): array
    {
        return DB::transaction(function () use ($branchId, $businessDate, $actorId) {
            $openDay = BranchAccountingPeriod::query()
                ->where('branch_id', $branchId)
                ->where('kind', BranchAccountingPeriod::KIND_DAY)
                ->where('period_date', $businessDate)
                ->where('status', BranchAccountingPeriod::STATUS_OPEN)
                ->first();

            if (! $openDay) {
                $this->reject('Month-End Auto Batch চালাতে বর্তমান কর্মদিবস খোলা (Day Open) থাকতে হবে।');
            }

            $profitCount = 0;
            if (Schema::hasTable('savings_accounts')) {
                $savingsService = app(SavingsLedgerService::class);
                $accounts = SavingsAccount::query()
                    ->where('branch_id', $branchId)
                    ->where('status', SavingsAccount::STATUS_ACTIVE)
                    ->where('balance_paisa', '>', 0)
                    ->where('profit_rate', '>', 0)
                    ->get();

                foreach ($accounts as $acc) {
                    if ($savingsService->postMonthlyProfit($acc->id, $businessDate, $actorId)) {
                        $profitCount++;
                    }
                }
            }

            $llpProcess = $this->runLlpVoucherProcess($branchId, $businessDate, $actorId);
            $llpSummary = $llpProcess->llp_summary ?? [];

            return [
                'savings_accounts_posted' => $profitCount,
                'llp_amount' => (float) ($llpSummary['estimated_llp_amount'] ?? 0),
                'llp_voucher_submitted' => (bool) ($llpSummary['voucher_submitted'] ?? false),
            ];
        });
    }

    public function runMonthlyProcess(int $branchId, string $monthDate, bool $closeMonth, int $actorId): BranchMonthProcess
    {
        return DB::transaction(function () use ($branchId, $monthDate, $closeMonth, $actorId) {
            $monthStart = CarbonImmutable::parse($monthDate)->startOfMonth()->toDateString();
            $monthEnd = CarbonImmutable::parse($monthDate)->endOfMonth()->toDateString();
            $enrollment = $this->resolveBranchEnrollmentForMonth($branchId, $monthEnd);

            $openDaysInMonth = BranchAccountingPeriod::query()
                ->where('branch_id', $branchId)
                ->where('kind', BranchAccountingPeriod::KIND_DAY)
                ->where('status', BranchAccountingPeriod::STATUS_OPEN)
                ->whereBetween('period_date', [$monthStart, $monthEnd])
                ->exists();

            if ($openDaysInMonth) {
                $this->reject('এই মাসে এখনো খোলা (Open) কর্মদিবস রয়েছে। আগে সব দিন Complete Work Process (Day Close) করুন।');
            }

            $closedDaysCount = BranchAccountingPeriod::query()
                ->where('branch_id', $branchId)
                ->where('kind', BranchAccountingPeriod::KIND_DAY)
                ->where('status', BranchAccountingPeriod::STATUS_CLOSED)
                ->whereBetween('period_date', [$monthStart, $monthEnd])
                ->count();

            $summary = [
                'closed_days_count' => $closedDaysCount,
                'admissions_count' => MemberAdmission::query()->where('branch_id', $branchId)->whereBetween('created_at', [$monthStart.' 00:00:00', $monthEnd.' 23:59:59'])->count(),
                'loans_disbursed' => LoanApplication::query()->where('branch_id', $branchId)->whereBetween('disbursed_at', [$monthStart.' 00:00:00', $monthEnd.' 23:59:59'])->count(),
                'disbursed_amount' => round((float) LoanApplication::query()->where('branch_id', $branchId)->whereBetween('disbursed_at', [$monthStart.' 00:00:00', $monthEnd.' 23:59:59'])->sum('disbursed_amount'), 2),
                'savings_opened' => SavingsApplication::query()->where('branch_id', $branchId)->whereBetween('created_at', [$monthStart.' 00:00:00', $monthEnd.' 23:59:59'])->count(),
            ];

            $process = BranchMonthProcess::query()->updateOrCreate(
                ['branch_id' => $branchId, 'month_date' => $monthEnd],
                [
                    'branch_financial_year_id' => $enrollment->id,
                    'status' => $closeMonth ? BranchMonthProcess::STATUS_CLOSED : BranchMonthProcess::STATUS_PROCESSED,
                    'processed_by' => $actorId,
                    'processed_at' => now(),
                    'closed_by' => $closeMonth ? $actorId : null,
                    'closed_at' => $closeMonth ? now() : null,
                    'summary' => $summary,
                ]
            );

            if ($closeMonth) {
                BranchAccountingPeriod::query()->updateOrCreate(
                    [
                        'branch_id' => $branchId,
                        'kind' => BranchAccountingPeriod::KIND_MONTH,
                        'period_date' => $monthEnd,
                    ],
                    [
                        'branch_financial_year_id' => $enrollment->id,
                        'status' => BranchAccountingPeriod::STATUS_CLOSED,
                        'closed_by' => $actorId,
                        'closed_at' => now(),
                    ]
                );
            }

            return $process->fresh();
        });
    }

    public function reopenPeriod(int $branchId, string $kind, string $periodDate, string $reason, int $actorId): void
    {
        DB::transaction(function () use ($branchId, $kind, $periodDate, $reason, $actorId) {
            $period = BranchAccountingPeriod::query()
                ->with('branchFinancialYear.financialYear')
                ->where('branch_id', $branchId)
                ->where('kind', $kind)
                ->where('period_date', $periodDate)
                ->lockForUpdate()
                ->first();

            if (! $period || $period->status !== BranchAccountingPeriod::STATUS_CLOSED) {
                $this->reject('এই পিরিয়ডটি বন্ধ অবস্থায় নেই।');
            }

            if ($period->branchFinancialYear?->financialYear?->isClosed()) {
                $this->reject('অর্থবছর বন্ধ থাকায় পিরিয়ড পুনরায় খোলা যাবে না।');
            }

            if ($kind === BranchAccountingPeriod::KIND_DAY) {
                $monthEnd = CarbonImmutable::parse($periodDate)->endOfMonth()->toDateString();
                $monthClosed = BranchAccountingPeriod::query()
                    ->where('branch_id', $branchId)
                    ->where('kind', BranchAccountingPeriod::KIND_MONTH)
                    ->where('period_date', $monthEnd)
                    ->where('status', BranchAccountingPeriod::STATUS_CLOSED)
                    ->exists();

                if ($monthClosed) {
                    $this->reject('দিনটি পুনরায় খোলার আগে সংশ্লিষ্ট মাসটি Reopen করতে হবে।');
                }

                $otherOpenDay = BranchAccountingPeriod::query()
                    ->where('branch_id', $branchId)
                    ->where('kind', BranchAccountingPeriod::KIND_DAY)
                    ->where('status', BranchAccountingPeriod::STATUS_OPEN)
                    ->exists();

                if ($otherOpenDay) {
                    $this->reject('এই শাখায় ইতিমধ্যে অন্য একটি দিন খোলা আছে। আগে সেটি Close করুন।');
                }
            }

            $period->update([
                'status' => BranchAccountingPeriod::STATUS_OPEN,
                'closed_by' => null,
                'closed_at' => null,
            ]);

            if ($kind === BranchAccountingPeriod::KIND_MONTH) {
                BranchMonthProcess::query()
                    ->where('branch_id', $branchId)
                    ->where('month_date', $periodDate)
                    ->update([
                        'status' => BranchMonthProcess::STATUS_PROCESSED,
                        'closed_by' => null,
                        'closed_at' => null,
                    ]);
            }

            PeriodReopenLog::create([
                'branch_id' => $branchId,
                'kind' => $kind,
                'period_date' => $periodDate,
                'reason' => $reason,
                'reopened_by' => $actorId,
                'reopened_at' => now(),
            ]);
        });
    }

    /** @return array<int, array<string, mixed>> */
    public function getBranchMonitorList(?int $zoneId = null, ?int $areaId = null): array
    {
        $branches = Branch::operational()
            ->with('area.zone')
            ->when($areaId, fn ($q) => $q->where('area_id', $areaId))
            ->when($zoneId, fn ($q) => $q->whereHas('area', fn ($aq) => $aq->where('zone_id', $zoneId)))
            ->orderedByCode()
            ->get();

        $enrollments = BranchFinancialYear::query()
            ->with('financialYear')
            ->whereHas('financialYear', fn ($q) => $q->whereNull('closed_at'))
            ->get()
            ->keyBy('branch_id');

        $openDays = BranchAccountingPeriod::query()
            ->where('kind', BranchAccountingPeriod::KIND_DAY)
            ->where('status', BranchAccountingPeriod::STATUS_OPEN)
            ->get()
            ->keyBy('branch_id');

        $lastClosedDays = BranchAccountingPeriod::query()
            ->where('kind', BranchAccountingPeriod::KIND_DAY)
            ->where('status', BranchAccountingPeriod::STATUS_CLOSED)
            ->orderByDesc('period_date')
            ->get()
            ->unique('branch_id')
            ->keyBy('branch_id');

        $lastMonths = BranchMonthProcess::query()
            ->orderByDesc('month_date')
            ->get()
            ->unique('branch_id')
            ->keyBy('branch_id');

        return $branches->map(function (Branch $branch) use ($enrollments, $openDays, $lastClosedDays, $lastMonths) {
            $enrollment = $enrollments->get($branch->id);
            $openDay = $openDays->get($branch->id);
            $lastClosed = $lastClosedDays->get($branch->id);
            $lastMonth = $lastMonths->get($branch->id);

            return [
                'branch_id' => $branch->id,
                'branch_name' => $branch->name,
                'branch_code' => $branch->code,
                'accounting_enabled' => (bool) ($branch->accounting_enabled ?? false),
                'area_name' => $branch->area?->name,
                'zone_name' => $branch->area?->zone?->name,
                'initial_date' => $enrollment?->initial_date?->toDateString(),
                'financial_year' => $enrollment?->financialYear?->name,
                'open_day' => $openDay?->period_date?->toDateString(),
                'last_closed_day' => $lastClosed?->period_date?->toDateString(),
                'last_month_date' => $lastMonth?->month_date?->toDateString(),
                'last_month_status' => $lastMonth?->status,
            ];
        })->values()->all();
    }

    private function suggestNextDate(int $branchId, BranchFinancialYear $enrollment, ?BranchAccountingPeriod $lastClosed): string
    {
        $candidate = $lastClosed
            ? CarbonImmutable::parse($lastClosed->period_date)->addDay()
            : CarbonImmutable::parse($enrollment->initial_date);

        for ($i = 0; $i < 15; $i++) {
            $dateStr = $candidate->toDateString();
            if (! $this->findHoliday($dateStr, $branchId)) {
                return $dateStr;
            }
            $candidate = $candidate->addDay();
        }

        return $candidate->toDateString();
    }

    private function resolveBranchEnrollmentForMonth(int $branchId, string $monthEnd): BranchFinancialYear
    {
        $enrollment = BranchFinancialYear::query()
            ->with('financialYear')
            ->where('branch_id', $branchId)
            ->whereHas('financialYear', fn ($q) => $q->whereNull('closed_at')
                ->where('starts_on', '<=', $monthEnd)
                ->where('ends_on', '>=', $monthEnd))
            ->first();

        if (! $enrollment) {
            $this->reject('এই শাখার জন্য সংশ্লিষ্ট অর্থবছরে Initial Date সেট করা নেই।');
        }

        return $enrollment;
    }

    private function reject(string $message): never
    {
        throw ValidationException::withMessages(['period' => [$message]]);
    }
}
