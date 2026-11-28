<?php

namespace App\Services\Accounting;

use App\Models\GlPostingDefault;
use App\Models\LedgerAccount;
use Illuminate\Support\Facades\DB;

class PostingDefaults
{
    /** @var array<string, string> */
    public const EVENT_KEYS = [
        'cash_in_hand' => 'Cash in Hand (হাতে নগদ)',
        'bank_account' => 'Cash at Bank (ব্যাংক হিসাব)',
        'loan_principal_portfolio' => 'Loan Portfolio / Principal (ঋণ আসল)',
        'loan_service_charge_income' => 'Loan Service Charge Income (সার্ভিস চার্জ আয়)',
        'loan_rebate_expense' => 'Loan Rebate Expense (রিবেট ব্যয়)',
        'llp_expense' => 'Loan Loss Provision Expense (LLP ব্যয়)',
        'llp_reserve' => 'Loan Loss Reserve (LLP সঞ্চিতি)',
        'savings_liability' => 'Member Savings Liability (সদস্য সঞ্চয়)',
        'savings_profit_expense' => 'Savings Profit Expense (সঞ্চয় মুনাফা ব্যয়)',
        'admission_fee_income' => 'Admission & Form Fee Income (ভর্তি ফি আয়)',
    ];

    /** @var array<int, array{code: string, name: string, type: string, event_key?: string}> */
    public const STANDARD_MFI_ACCOUNTS = [
        ['code' => '1010', 'name' => 'Cash in Hand', 'type' => LedgerAccount::TYPE_ASSET, 'event_key' => 'cash_in_hand'],
        ['code' => '1020', 'name' => 'Cash at Bank', 'type' => LedgerAccount::TYPE_ASSET, 'event_key' => 'bank_account'],
        ['code' => '1110', 'name' => 'Loan Portfolio (Principal)', 'type' => LedgerAccount::TYPE_ASSET, 'event_key' => 'loan_principal_portfolio'],
        ['code' => '2010', 'name' => 'Member Savings Deposit', 'type' => LedgerAccount::TYPE_LIABILITY, 'event_key' => 'savings_liability'],
        ['code' => '2020', 'name' => 'Loan Loss Reserve (LLP)', 'type' => LedgerAccount::TYPE_LIABILITY, 'event_key' => 'llp_reserve'],
        ['code' => '3010', 'name' => 'Retained Surplus / Capital Fund', 'type' => LedgerAccount::TYPE_EQUITY],
        ['code' => '4010', 'name' => 'Service Charge Income', 'type' => LedgerAccount::TYPE_INCOME, 'event_key' => 'loan_service_charge_income'],
        ['code' => '4020', 'name' => 'Admission & Passbook Fee', 'type' => LedgerAccount::TYPE_INCOME, 'event_key' => 'admission_fee_income'],
        ['code' => '5010', 'name' => 'Savings Profit / Interest Expense', 'type' => LedgerAccount::TYPE_EXPENSE, 'event_key' => 'savings_profit_expense'],
        ['code' => '5020', 'name' => 'Loan Rebate Expense', 'type' => LedgerAccount::TYPE_EXPENSE, 'event_key' => 'loan_rebate_expense'],
        ['code' => '5030', 'name' => 'Loan Loss Provision (LLP) Expense', 'type' => LedgerAccount::TYPE_EXPENSE, 'event_key' => 'llp_expense'],
        ['code' => '5040', 'name' => 'Branch Office & Operating Expense', 'type' => LedgerAccount::TYPE_EXPENSE],
    ];

    public function seedStandardChartOfAccounts(int $actorId): int
    {
        return DB::transaction(function () use ($actorId) {
            $created = 0;

            foreach (self::STANDARD_MFI_ACCOUNTS as $row) {
                $account = LedgerAccount::query()->firstOrCreate(
                    ['code' => $row['code']],
                    [
                        'name' => $row['name'],
                        'type' => $row['type'],
                        'is_active' => true,
                    ]
                );

                if ($account->wasRecentlyCreated) {
                    $created++;
                }

                if (isset($row['event_key'])) {
                    GlPostingDefault::query()->firstOrCreate(
                        [
                            'scope' => GlPostingDefault::SCOPE_GLOBAL,
                            'product_id' => null,
                            'event_key' => $row['event_key'],
                        ],
                        [
                            'ledger_account_id' => $account->id,
                            'updated_by' => $actorId,
                        ]
                    );
                }
            }

            return $created;
        });
    }

    public function setDefault(
        string $scope,
        ?int $productId,
        string $eventKey,
        int $ledgerAccountId,
        int $actorId
    ): GlPostingDefault {
        return GlPostingDefault::query()->updateOrCreate(
            [
                'scope' => $scope,
                'product_id' => $scope === GlPostingDefault::SCOPE_GLOBAL ? null : $productId,
                'event_key' => $eventKey,
            ],
            [
                'ledger_account_id' => $ledgerAccountId,
                'updated_by' => $actorId,
            ]
        );
    }

    public function resolveAccountId(
        string $eventKey,
        ?string $productScope = null,
        ?int $productId = null,
        ?int $branchId = null
    ): ?int {
        if ($productScope && $productId) {
            $productMapping = GlPostingDefault::query()
                ->where('scope', $productScope)
                ->where('product_id', $productId)
                ->where('event_key', $eventKey)
                ->value('ledger_account_id');

            if ($productMapping) {
                return (int) $productMapping;
            }
        }

        if ($branchId) {
            $branchMapping = GlPostingDefault::query()
                ->where('scope', GlPostingDefault::SCOPE_BRANCH)
                ->where('product_id', $branchId)
                ->where('event_key', $eventKey)
                ->value('ledger_account_id');

            if ($branchMapping) {
                return (int) $branchMapping;
            }
        }

        $global = GlPostingDefault::query()
            ->where('scope', GlPostingDefault::SCOPE_GLOBAL)
            ->whereNull('product_id')
            ->where('event_key', $eventKey)
            ->value('ledger_account_id');

        return $global ? (int) $global : null;
    }
}
