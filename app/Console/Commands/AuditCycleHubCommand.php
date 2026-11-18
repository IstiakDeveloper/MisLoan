<?php

namespace App\Console\Commands;

use App\Models\LoanApplication;
use App\Models\MemberAdmission;
use App\Models\MemberLoanCycle;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;

class AuditCycleHubCommand extends Command
{
    protected $signature = 'cycle-hub:audit';

    protected $description = 'Read-only inventory of Cycle Hub renewal and legacy records; never changes member data';

    public function handle(): int
    {
        if (! Schema::hasTable('member_loan_cycles')) {
            $this->error('Run the member_loan_cycles migration first.');

            return self::FAILURE;
        }
        $managed = MemberLoanCycle::pluck('admission_id');
        $legacy = MemberAdmission::whereNotNull('previous_admission_id')->whereNotIn('id', $managed);
        $ambiguousMasters = MemberAdmission::whereNull('previous_admission_id')->whereNotNull('application_no')
            ->selectRaw('branch_id, application_no, COUNT(*) as total')->groupBy('branch_id', 'application_no')->havingRaw('COUNT(*) > 1')->get()->count();
        $this->table(['Inventory', 'Count'], [
            ['Managed cycle files', MemberLoanCycle::count()],
            ['Open cycle drafts', MemberLoanCycle::whereNotNull('open_member_id')->count()],
            ['Unmanaged legacy admission copies (review before backfill)', (clone $legacy)->count()],
            ['Legacy admission copies without loans', (clone $legacy)->whereDoesntHave('loanApplications')->count()],
            ['Ambiguous master member groups', $ambiguousMasters],
            ['Loans without a linked admission (snapshot/legacy cases)', LoanApplication::whereNull('member_admission_id')->count()],
        ]);
        $this->info('Read-only audit complete. No records, cycle numbers, or files were changed.');

        return self::SUCCESS;
    }
}
