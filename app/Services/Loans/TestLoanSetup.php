<?php

namespace App\Services\Loans;

use App\Models\LoanApplication;
use App\Models\User;
use App\Services\Accounting\JournalService;
use App\Services\Accounting\Money;
use App\Support\NumberToWordsBangla;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/** Explicitly synthetic financial setup. Never use this to migrate production contracts. */
final class TestLoanSetup
{
    public function __construct(private readonly ProductLoanPricing $pricing, private readonly LoanLedger $ledger, private readonly JournalService $journals) {}

    public function plan(string $month): array
    {
        $this->guard();
        if (! preg_match('/^\d{4}-\d{2}$/D', $month)) {
            throw new RuntimeException('Use a month in YYYY-MM format.');
        }
        try {
            $start = CarbonImmutable::createFromFormat('!Y-m', $month);
        } catch (\Throwable) {
            $start = null;
        }
        if (! $start || $start->format('Y-m') !== $month || $start->isFuture()) {
            throw new RuntimeException('Choose a valid current or past month.');
        }
        $plan = ['month' => $month, 'loans' => [], 'errors' => [], 'already_posted' => 0, 'principal_paisa' => 0];
        LoanApplication::with('loanProduct')->where('status', LoanApplication::STATUS_DISBURSED)
            ->whereBetween('disbursed_at', [$start->startOfMonth(), $start->endOfMonth()->endOfDay()])->orderBy('id')
            ->chunkById(100, function ($loans) use (&$plan) {
                $posted = DB::table('loan_accounts')->whereIn('loan_application_id', $loans->modelKeys())->pluck('loan_application_id')->all();
                foreach ($loans as $loan) {
                    if (in_array($loan->id, $posted)) {
                        $plan['already_posted']++;

                        continue;
                    }
                    try {
                        if (! $loan->loanProduct || $loan->hasPendingAmountChange()) {
                            throw new RuntimeException('Product is missing or an amount change is still pending.');
                        }
                        $quote = $this->pricing->quote($loan->loanProduct, (string) $loan->disbursed_amount);
                        $frequency = $quote['number_of_installments'] === 1 ? 'lump_sum' : (string) $loan->loanProduct->installment_type;
                        if (! in_array($frequency, ['weekly', 'monthly', 'lump_sum'], true)) {
                            throw new RuntimeException('Unsupported product repayment frequency.');
                        }
                        $quote = ['version' => 1, 'repayment_frequency' => $frequency, ...$quote];
                        $date = CarbonImmutable::parse($loan->disbursed_at);
                        $first = match ($frequency) {
                            'weekly' => $date->addWeek(), 'monthly' => $date->addMonthNoOverflow(),
                            default => $date->addMonthsNoOverflow($quote['duration_months']),
                        };
                        $plan['loans'][] = ['id' => $loan->id, 'branch_id' => (int) $loan->branch_id, 'date' => $date->toDateString(), 'first_due_date' => $first->toDateString(), 'quote' => $quote, 'source_hash' => hash('sha256', json_encode($loan->getRawOriginal(), JSON_THROW_ON_ERROR))];
                        $plan['principal_paisa'] += $quote['principal_paisa'];
                    } catch (\Throwable $e) {
                        $plan['errors'][] = ['id' => $loan->id, 'application_no' => $loan->application_no, 'error' => $e->getMessage()];
                    }
                }
            });

        return $plan;
    }

    public function apply(array $plan, ?callable $progress = null): array
    {
        $this->guard();
        if ($plan['errors']) {
            throw new RuntimeException('Preflight contains errors. No financial records have been changed.');
        }
        $actor = User::whereHas('role', fn ($q) => $q->where('name', 'super_admin'))->where('is_active', true)->where(fn ($q) => $q->whereNull('account_type')->orWhere('account_type', '!=', 'branch'))->orderBy('id')->firstOrFail();
        if (! $plan['loans']) {
            return ['posted' => 0, 'already_posted' => $plan['already_posted'], 'backup' => null];
        }
        $backup = $this->backup($plan);

        return DB::transaction(function () use ($plan, $actor, $backup, $progress) {
            $gl = [];
            foreach (['cash' => ['1000', 'Cash in hand', 'asset'], 'principal' => ['1100', 'Loan principal control', 'asset'], 'savings' => ['2100', 'Savings liability', 'liability'], 'capital' => ['3000', 'Synthetic test funding', 'equity'], 'income' => ['4100', 'Collected service charge', 'income'], 'expense' => ['5100', 'Office expenses', 'expense']] as $key => [$code, $name, $type]) {
                $existing = DB::table('ledger_accounts')->where('code', 'TEST-'.$code)->first();
                if ($existing && (! $existing->is_active || $existing->type !== $type || ! str_starts_with($existing->name, '[TEST] '))) {
                    throw new RuntimeException('A test GL code is already used by an incompatible account.');
                }
                $gl[$key] = $existing?->id ?? DB::table('ledger_accounts')->insertGetId(['code' => 'TEST-'.$code, 'name' => '[TEST] '.$name, 'type' => $type, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
            }
            $groups = collect($plan['loans'])->groupBy('branch_id');
            foreach ($groups as $branchId => $rows) {
                DB::table('branches')->where('id', $branchId)->lockForUpdate()->firstOrFail();
                foreach (array_unique([$plan['month'], today()->format('Y-m')]) as $month) {
                    $this->period((int) $branchId, $month);
                }
                $amount = $rows->sum(fn ($row) => $row['quote']['principal_paisa']);
                $this->journals->post($actor, (int) $branchId, $plan['month'].'-01', 'test-funding-'.$plan['month'].'-'.$branchId, '[TEST ONLY] Synthetic capital for '.$plan['month'].' loan payouts; not a real cash receipt.', [
                    ['account_id' => $gl['cash'], 'debit_paisa' => $amount, 'credit_paisa' => 0],
                    ['account_id' => $gl['capital'], 'debit_paisa' => 0, 'credit_paisa' => $amount],
                ]);
            }
            $count = 0;
            foreach ($plan['loans'] as $row) {
                $loan = LoanApplication::lockForUpdate()->findOrFail($row['id']);
                if (DB::table('loan_accounts')->where('loan_application_id', $loan->id)->exists() || hash('sha256', json_encode($loan->getRawOriginal(), JSON_THROW_ON_ERROR)) !== $row['source_hash']) {
                    throw new RuntimeException('A source loan changed after preflight. Entire seed rolled back.');
                }
                $this->rebuild($loan, $row['quote'], $row['date'], $backup);
                $this->ledger->open($actor, $loan->id, $gl['principal'], $gl['income'], $gl['cash'], 'disbursement', $row['date'], $row['first_due_date'], Money::format($row['quote']['principal_paisa']), Money::format($row['quote']['service_charge_paisa']), '[TEST REBUILD '.$plan['month'].'] Current product terms; no repayment history imported.');
                $count++;
                if ($count % 100 === 0 && $progress) {
                    $progress($count, count($plan['loans']));
                }
            }
            foreach ($groups->keys() as $branchId) {
                $first = DB::table('loan_accounts')->where('branch_id', $branchId)->where('principal_account_id', $gl['principal'])->value('id');
                if (! $this->ledger->reconciliation($actor, $first)['matches']) {
                    throw new RuntimeException('Principal reconciliation failed; entire seed rolled back.');
                }
            }

            return ['posted' => $count, 'already_posted' => $plan['already_posted'], 'principal' => Money::format($plan['principal_paisa']), 'branches' => $groups->count(), 'gl' => $gl, 'backup' => $backup];
        }, 1);
    }

    private function guard(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new RuntimeException('Test financial seeding is restricted to local/testing environments.');
        }
    }

    private function period(int $branch, string $month): void
    {
        $start = CarbonImmutable::parse($month.'-01');
        $end = $start->endOfMonth();
        $rows = DB::table('accounting_periods')->where('branch_id', $branch)->where('starts_on', '<=', $end->toDateString())->where('ends_on', '>=', $start->toDateString())->get();
        if ($rows->count() === 1 && ! $rows[0]->closed_at && $rows[0]->starts_on <= $start->toDateString() && $rows[0]->ends_on >= $end->toDateString()) {
            return;
        }
        if ($rows->isNotEmpty()) {
            throw new RuntimeException('An overlapping or closed accounting period prevents test setup.');
        }
        DB::table('accounting_periods')->insert(['branch_id' => $branch, 'starts_on' => $start->toDateString(), 'ends_on' => $end->toDateString(), 'created_at' => now(), 'updated_at' => now()]);
    }

    private function rebuild(LoanApplication $loan, array $q, string $date, string $backup): void
    {
        $principal = Money::format($q['principal_paisa']);
        $regular = Money::format($q['installment_paisa']);
        $last = Money::format($q['last_installment_paisa']);
        $charge = Money::format($q['service_charge_paisa']);
        $total = Money::format($q['total_payable_paisa']);
        $principalWords = NumberToWordsBangla::convert($principal).' টাকা';
        $totalWords = NumberToWordsBangla::convert($total).' টাকা';
        $agreement = [...($loan->loan_agreement_data ?? []), 'loan_amount' => $principal, 'loan_amount_words' => $principalWords, 'service_charge' => $charge, 'total_amount' => $total, 'installment_amount' => $regular, 'last_installment_amount' => $last, 'number_of_installments' => $q['number_of_installments'], 'product_pricing' => $q, 'test_rebuild' => ['notice' => 'TEST ONLY: recalculated from current product; not historical signed terms.', 'backup' => $backup, 'rebuilt_at' => now()->toIso8601String()]];
        $plan = [...($loan->business_plan ?? []), 'total_principal' => $principal, 'total_service_charge' => $charge, 'total_payable' => $total, 'installment_total' => $regular, 'last_installment_amount' => $last, 'number_of_installments' => $q['number_of_installments']];
        $plan = [...$plan, 'applied_loan_amount' => $principal, 'fund_applied_loan' => $principal, 'final_approved_loan_amount_digits' => $principal, 'final_approved_loan_amount_words' => $principalWords];
        if ($split = $q['installment_split']) {
            foreach (['installment_principal' => 'regular_principal_paisa', 'installment_service_charge' => 'regular_charge_paisa', 'last_installment_principal' => 'last_principal_paisa', 'last_installment_service_charge' => 'last_charge_paisa'] as $field => $key) {
                $plan[$field] = Money::format($split[$key]);
            }
        } else {
            unset($plan['installment_principal'], $plan['installment_service_charge'], $plan['last_installment_principal'], $plan['last_installment_service_charge']);
        }
        $loan->loan_term_months = $q['duration_months'];
        $forms = $loan->stampDisbursementDateOnForms($date, $agreement, [...($loan->guarantor_info ?? []), 'loan_amount' => $total, 'loan_amount_words' => $totalWords], [...($loan->nominee_info ?? []), 'loan_amount_received' => $principal, 'loan_amount_words' => $principalWords], $loan->asset_info ?? [], $plan, $loan->reviewed_at?->toDateString() ?? $date);
        // Test fixture only: avoid operational approval-sync notifications. No posted account is ever edited.
        LoanApplication::withoutEvents(fn () => $loan->update([...$forms, 'installment_amount' => $regular, 'number_of_installments' => $q['number_of_installments'], 'repayment_frequency' => $q['repayment_frequency'], 'loan_term_months' => $q['duration_months'], 'remarks' => trim(($loan->remarks ?? '').' [TEST REBUILD: current product terms; original backed up.]')]));
    }

    private function backup(array $plan): string
    {
        $relative = 'test-seeds/'.$plan['month'].'-'.now()->format('Ymd-His').'-'.bin2hex(random_bytes(4)).'.jsonl';
        Storage::disk('local')->makeDirectory('test-seeds');
        $handle = fopen(Storage::disk('local')->path($relative), 'xb');
        if (! $handle) {
            throw new RuntimeException('Could not create original-record backup.');
        }
        try {
            $write = function (array $row) use ($handle) {
                $line = json_encode($row, JSON_THROW_ON_ERROR)."\n";
                if (fwrite($handle, $line) !== strlen($line)) {
                    throw new RuntimeException('Backup could not be written completely.');
                }
            };
            $write(['type' => 'metadata', 'purpose' => 'Authorized local test-only current-product rebuild', 'month' => $plan['month'], 'created_at' => now()->toIso8601String()]);
            foreach (array_chunk(array_column($plan['loans'], 'id'), 100) as $ids) {
                foreach (DB::table('loan_applications')->whereIn('id', $ids)->orderBy('id')->get() as $row) {
                    $write(['type' => 'loan_application', 'record' => (array) $row]);
                }
            }
        } finally {
            fclose($handle);
        }

        return $relative;
    }
}
