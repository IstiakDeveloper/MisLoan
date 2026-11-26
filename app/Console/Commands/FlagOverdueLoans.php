<?php

namespace App\Console\Commands;

use App\Models\LoanInstallment;
use App\Models\Role;
use App\Models\User;
use App\Services\NotificationService;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;

class FlagOverdueLoans extends Command
{
    protected $signature = 'finance:flag-overdue';

    protected $description = 'Detect overdue loan installments and notify branch managers';

    public function handle(NotificationService $notifications): int
    {
        if (! Schema::hasTable('loan_installments')) {
            return self::SUCCESS;
        }

        $today = CarbonImmutable::now('Asia/Dhaka')->toDateString();

        $overdueByBranch = LoanInstallment::query()
            ->join('loan_accounts', 'loan_accounts.id', '=', 'loan_installments.loan_account_id')
            ->where('loan_accounts.status', 'active')
            ->whereIn('loan_installments.status', [LoanInstallment::STATUS_PENDING, LoanInstallment::STATUS_PARTIAL])
            ->where('loan_installments.due_date', '<', $today)
            ->groupBy('loan_accounts.branch_id')
            ->selectRaw('loan_accounts.branch_id, COUNT(DISTINCT loan_accounts.id) as overdue_loans')
            ->get();

        foreach ($overdueByBranch as $row) {
            $managers = User::query()
                ->where('branch_id', $row->branch_id)
                ->where('is_active', true)
                ->whereHas('role', fn ($q) => $q->whereIn('name', [Role::BRANCH_MANAGER, Role::BRANCH_USER]))
                ->get();

            if ($managers->isNotEmpty()) {
                $notifications->send(
                    users: $managers,
                    type: 'overdue_alert',
                    title: 'মেয়াদোত্তীর্ণ কিস্তির সতর্কবার্তা',
                    message: "শাখায় {$row->overdue_loans}টি ঋণ অ্যাকাউন্টে মেয়াদোত্তীর্ণ (Overdue) কিস্তি রয়েছে।",
                    actionUrl: '/loan-ledger'
                );
            }
        }

        $this->info("Overdue scan complete for {$overdueByBranch->count()} branch(es).");

        return self::SUCCESS;
    }
}
