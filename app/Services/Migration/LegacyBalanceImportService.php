<?php

namespace App\Services\Migration;

use App\Models\LoanAccount;
use App\Models\LoanInstallment;
use App\Models\LoanProduct;
use App\Models\MemberAdmission;
use App\Models\SavingsAccount;
use App\Models\SavingsProduct;
use App\Services\Accounting\Money;
use App\Services\Loans\LoanScheduleService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;

class LegacyBalanceImportService
{
    public function __construct(private readonly LoanScheduleService $schedules) {}

    /**
     * Import active opening loan and savings balances for a branch from Excel/CSV.
     *
     * @return array{loans_imported: int, savings_imported: int, skipped: array<int, string>}
     */
    public function importFile(int $branchId, string $filePath, string $initialDate, int $actorId): array
    {
        $spreadsheet = IOFactory::load($filePath);
        $rows = $spreadsheet->getActiveSheet()->toArray(null, true, true, false);
        if (count($rows) <= 1) {
            return ['loans_imported' => 0, 'savings_imported' => 0, 'skipped' => ['ফাইলে কোনো ডাটা সারি পাওয়া যায়নি।']];
        }

        $membersByCode = MemberAdmission::query()
            ->where('branch_id', $branchId)
            ->whereNotNull('application_no')
            ->get(['id', 'application_no', 'samity_id'])
            ->keyBy('application_no');

        $loanProducts = LoanProduct::query()->get(['id', 'product_code', 'interest_rate', 'installment_type', 'interest_calculation_type'])->keyBy('product_code');
        $savingsProducts = SavingsProduct::query()->get(['id', 'product_code', 'interest_rate'])->keyBy('product_code');

        $loansImported = 0;
        $savingsImported = 0;
        $skipped = [];

        DB::transaction(function () use ($rows, $branchId, $initialDate, $actorId, $membersByCode, $loanProducts, $savingsProducts, &$loansImported, &$savingsImported, &$skipped) {
            foreach (array_slice($rows, 1) as $index => $row) {
                $rowNo = $index + 2;
                $kind = strtolower(trim((string) ($row[0] ?? '')));
                $memberCode = trim((string) ($row[1] ?? ''));
                $productCode = trim((string) ($row[2] ?? ''));
                $amountStr = trim((string) ($row[3] ?? '0'));
                $installments = max(1, (int) ($row[4] ?? 1));
                $nextDueDate = trim((string) ($row[5] ?? $initialDate)) ?: $initialDate;

                if ($kind === '' || $memberCode === '') {
                    continue;
                }

                $member = $membersByCode->get($memberCode);
                if (! $member) {
                    $skipped[] = "Row {$rowNo}: Member code '{$memberCode}' পাওয়া যায়নি।";

                    continue;
                }

                if ($kind === 'loan') {
                    $product = $loanProducts->get($productCode) ?? $loanProducts->first();
                    if (! $product) {
                        $skipped[] = "Row {$rowNo}: Loan product '{$productCode}' পাওয়া যায়নি।";

                        continue;
                    }

                    $principalPaisa = Money::toPaisa($amountStr);
                    $frequency = strtolower((string) ($product->installment_type ?? 'weekly')) === 'monthly' ? 'monthly' : 'weekly';
                    $pricing = strtolower((string) ($product->interest_calculation_type ?? 'flat')) === 'declining' ? 'declining' : 'flat';
                    $plan = $this->schedules->generate($branchId, $principalPaisa, (float) ($product->interest_rate ?? 0), $installments, $pricing, $frequency, $nextDueDate);

                    $acc = LoanAccount::create([
                        'account_no' => sprintf('LEG-LN-%d-%s', $branchId, strtoupper(Str::random(5))),
                        'member_admission_id' => $member->id,
                        'branch_id' => $branchId,
                        'samity_id' => $member->samity_id,
                        'loan_product_id' => $product->id,
                        'pricing_method' => $pricing,
                        'installment_frequency' => $frequency,
                        'annual_rate' => (float) ($product->interest_rate ?? 0),
                        'installment_count' => $installments,
                        'principal_paisa' => $principalPaisa,
                        'service_charge_paisa' => $plan['total_service_charge_paisa'],
                        'disbursed_date' => $initialDate,
                        'first_due_date' => $nextDueDate,
                        'status' => LoanAccount::STATUS_ACTIVE,
                        'created_by' => $actorId,
                    ]);

                    foreach ($plan['installments'] as $instRow) {
                        LoanInstallment::create(['loan_account_id' => $acc->id, ...$instRow]);
                    }
                    $loansImported++;
                } elseif ($kind === 'savings') {
                    $product = $savingsProducts->get($productCode) ?? $savingsProducts->first();
                    if (! $product) {
                        $skipped[] = "Row {$rowNo}: Savings product '{$productCode}' পাওয়া যায়নি।";

                        continue;
                    }

                    SavingsAccount::create([
                        'account_no' => sprintf('LEG-SV-%d-%s', $branchId, strtoupper(Str::random(5))),
                        'member_admission_id' => $member->id,
                        'branch_id' => $branchId,
                        'samity_id' => $member->samity_id,
                        'savings_product_id' => $product->id,
                        'profit_rate' => (float) ($product->interest_rate ?? 0),
                        'balance_paisa' => Money::toPaisa($amountStr),
                        'held_paisa' => 0,
                        'opened_date' => $initialDate,
                        'status' => SavingsAccount::STATUS_ACTIVE,
                        'created_by' => $actorId,
                    ]);
                    $savingsImported++;
                }
            }
        });

        return [
            'loans_imported' => $loansImported,
            'savings_imported' => $savingsImported,
            'skipped' => $skipped,
        ];
    }
}
