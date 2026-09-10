<?php

namespace Tests\Unit;

use App\Models\LoanApplication;
use App\Models\MemberAdmission;
use App\Models\Role;
use Tests\TestCase;

class MemberCycleHubUnitTest extends TestCase
{
    public function test_repaid_loan_status_constant_exists(): void
    {
        $this->assertEquals('repaid', LoanApplication::STATUS_REPAID);
    }

    public function test_loan_application_fillable_and_casts(): void
    {
        $loan = new LoanApplication([
            'status' => LoanApplication::STATUS_REPAID,
            'repaid_at' => '2026-09-09 12:00:00',
            'repaid_by' => 1,
            'repayment_notes' => 'Settled voucher #123',
        ]);

        $this->assertEquals(LoanApplication::STATUS_REPAID, $loan->status);
        $this->assertEquals('Settled voucher #123', $loan->repayment_notes);
        $this->assertEquals(1, $loan->repaid_by);
    }

    public function test_member_admission_previous_admission_field(): void
    {
        $admission = new MemberAdmission([
            'application_no' => '0001000055',
            'loan_dofa' => 2,
            'previous_admission_id' => 10,
        ]);

        $this->assertEquals('0001000055', $admission->application_no);
        $this->assertEquals(2, $admission->loan_dofa);
        $this->assertEquals(10, $admission->previous_admission_id);
    }
}
