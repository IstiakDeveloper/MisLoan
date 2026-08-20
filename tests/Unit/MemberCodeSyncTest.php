<?php

namespace Tests\Unit;

use App\Models\LoanApplication;
use App\Services\MemberCodeService;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class MemberCodeSyncTest extends TestCase
{
    #[Test]
    public function it_overlays_live_member_code_on_all_loan_form_snapshots(): void
    {
        $loan = new LoanApplication([
            'loan_agreement_data' => ['member_code' => '0001000001', 'loan_amount' => 50000],
            'guarantor_info' => ['member_code' => '0001000001', 'member_name' => 'Test'],
            'business_plan' => [
                'member_code' => '0001000001',
                'member_name_code' => 'মৌসুমি / 0001000001',
            ],
            'asset_info' => ['member_no' => '0001000001'],
            'nominee_info' => [
                'loan_recipient_code1' => '0001000001',
                'loan_recipient_code2' => '0001000001',
            ],
        ]);

        $changed = MemberCodeService::overlayMemberCodeOnLoanApplication(
            $loan,
            '0001000099',
            'মৌসুমি',
        );

        $this->assertTrue($changed);
        $this->assertSame('0001000099', $loan->loan_agreement_data['member_code']);
        $this->assertSame(50000, $loan->loan_agreement_data['loan_amount']);
        $this->assertSame('0001000099', $loan->guarantor_info['member_code']);
        $this->assertSame('0001000099', $loan->business_plan['member_code']);
        $this->assertSame('মৌসুমি / 0001000099', $loan->business_plan['member_name_code']);
        $this->assertSame('0001000099', $loan->asset_info['member_no']);
        $this->assertSame('0001000099', $loan->nominee_info['loan_recipient_code1']);
        $this->assertSame('0001000099', $loan->nominee_info['loan_recipient_code2']);
    }

    #[Test]
    public function it_does_not_mark_empty_forms_dirty(): void
    {
        $loan = new LoanApplication([
            'loan_agreement_data' => null,
            'guarantor_info' => [],
        ]);

        $changed = MemberCodeService::overlayMemberCodeOnLoanApplication($loan, '0001000099');

        $this->assertFalse($changed);
    }

    #[Test]
    public function it_adds_member_code_when_saved_form_json_is_missing_the_key(): void
    {
        $loan = new LoanApplication([
            'loan_agreement_data' => ['loan_amount' => 10000],
        ]);

        $changed = MemberCodeService::overlayMemberCodeOnLoanApplication($loan, '0001000099');

        $this->assertTrue($changed);
        $this->assertSame('0001000099', $loan->loan_agreement_data['member_code']);
        $this->assertSame(10000, $loan->loan_agreement_data['loan_amount']);
    }
}
