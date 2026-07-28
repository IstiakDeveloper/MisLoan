<?php

namespace Tests\Unit;

use App\Models\LoanApplication;
use App\Models\LoanProduct;
use App\Models\MemberAdmission;
use App\Models\Samity;
use App\Services\ApprovalService;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class TeamBasedDraftFromLoanTest extends TestCase
{
    #[Test]
    public function it_maps_loan_term_years_from_months(): void
    {
        $service = new ApprovalService;

        $this->assertSame(0.5, $service->mapLoanTermYears(6));
        $this->assertSame(1.0, $service->mapLoanTermYears(12));
        $this->assertSame(1.5, $service->mapLoanTermYears(18));
        $this->assertSame(2.0, $service->mapLoanTermYears(24));
        $this->assertSame(3.0, $service->mapLoanTermYears(36));
        $this->assertNull($service->mapLoanTermYears(null));
        $this->assertSame(1.0, $service->mapLoanTermYears(10)); // closest
    }

    #[Test]
    public function it_builds_team_based_item_from_loan_and_admission(): void
    {
        $samity = new Samity([
            'samity_code' => 'S-101',
            'samity_name_bn' => 'টেস্ট সমিতি',
        ]);
        $samity->id = 11;

        $member = new MemberAdmission([
            'application_no' => 'ADM-001',
            'applicant_name_bn' => 'মৌসুমি',
            'applicant_name_en' => 'Mousumi',
            'father_name_bn' => 'আব্দুল',
            'mother_name_bn' => 'রাবেয়া',
            'mobile_number' => '01700000000',
            'nid_number' => '1234567890',
            'present_village_road' => 'গ্রাম ১',
            'present_upazila' => 'উপজেলা',
            'present_district' => 'জেলা',
            'project_name' => 'গরু পালন',
            'other_loan_info' => 'অন্য প্রতিষ্ঠান ৫০০০',
        ]);
        $member->setRelation('samity', $samity);

        $product = new LoanProduct([
            'product_name_bn' => 'মাসিক ঋণ',
            'duration_months' => 12,
        ]);

        $loan = new LoanApplication([
            'requested_amount' => 150000,
            'savings_amount' => 2000,
            'business_plan' => [
                'general_savings_amount' => 3500,
                'is_against_savings' => true,
                'against_savings_amount' => 500,
                'last_repaid_loan_amount' => '10000.00',
                'project_name' => 'গরু পালন আপডেট',
            ],
        ]);
        $loan->setRelation('memberAdmission', $member);
        $loan->setRelation('loanProduct', $product);
        $loan->setRelation('samity', $samity);

        $item = (new ApprovalService)->buildTeamBasedItemFromLoan($loan);

        $this->assertSame('মৌসুমি', $item['member_name']);
        $this->assertSame('ADM-001', $item['member_code']);
        $this->assertSame('01700000000', $item['member_phone']);
        $this->assertSame('S-101', $item['samity_number']);
        $this->assertSame(3500, $item['savings_general']);
        $this->assertSame(500, $item['savings_other']);
        $this->assertSame(4000, $item['savings_total']);
        $this->assertSame('150000', $item['proposed_loan_amount']);
        $this->assertSame('10000', $item['repaid_loan_amount']);
        $this->assertSame(1.0, $item['loan_term_years']);
        $this->assertSame('মাসিক ঋণ', $item['loan_type']);
        $this->assertSame('গরু পালন আপডেট', $item['project_name']);
        $this->assertSame('অন্য প্রতিষ্ঠান ৫০০০', $item['other_institution_loan_amount']);
        $this->assertStringContainsString('গ্রাম ১', $item['address']);
    }
}
