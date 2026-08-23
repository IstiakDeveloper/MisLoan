<?php

namespace Tests\Unit;

use App\Models\LoanApplication;
use App\Models\MemberAdmission;
use App\Models\Samity;
use App\Services\MemberAdmissionLoanSyncService;
use Illuminate\Support\Collection;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class MemberAdmissionLoanSyncTest extends TestCase
{
    #[Test]
    public function it_overlays_admission_identity_onto_saved_loan_form_snapshots(): void
    {
        $samity = new Samity([
            'samity_code' => 'S-09',
            'samity_name_bn' => 'নতুন সমিতি',
            'samity_name' => 'New Samity',
        ]);
        $samity->id = 9;

        $member = new MemberAdmission([
            'application_no' => '0001000099',
            'applicant_name_bn' => 'মৌসুমি বেগম',
            'applicant_name_en' => 'Mousumi',
            'father_name_bn' => 'আব্দুল করিম',
            'mother_name_bn' => 'রাবেয়া',
            'nid_number' => '1990123456789',
            'mobile_number' => '01711111111',
            'present_village_road' => 'বাগানপাড়া',
            'present_union' => 'নতুন ইউনিয়ন',
            'present_upazila' => 'নওগাঁ সদর',
            'present_district' => 'নওগাঁ',
            'present_post_code' => '6500',
            'project_name' => 'গরু পালন',
            'guarantor_name' => 'করিম উদ্দিন',
            'guarantor_mobile' => '01822222222',
            'guardian_name' => 'আব্দুল করিম',
        ]);
        $member->setRelation('samity', $samity);
        $member->setRelation('familyMembers', new Collection);
        $member->setRelation('otherAssets', new Collection);

        $loan = new LoanApplication([
            'loan_agreement_data' => [
                'member_name_bn' => 'পুরাতন নাম',
                'member_code' => '0001000001',
                'nid_number' => '111',
                'loan_amount' => 50000,
            ],
            'guarantor_info' => [
                'member_name' => 'পুরাতন',
                'member_code' => '0001000001',
                'guarantor_name' => 'পুরাতন জামিনদার',
            ],
            'business_plan' => [
                'member_code' => '0001000001',
                'member_name_detail' => 'পুরাতন',
                'project_name' => 'পুরাতন প্রকল্প',
                'officer_post_inspection_comments' => 'মাঠ মন্তব্য রাখুন',
            ],
            'asset_info' => [
                'member_name' => 'পুরাতন',
                'member_no' => '0001000001',
                'comments' => 'তদন্ত নোট',
            ],
            'nominee_info' => [
                'loan_recipient_name' => 'পুরাতন',
                'loan_recipient_code1' => '0001000001',
            ],
        ]);

        $changed = (new MemberAdmissionLoanSyncService)->overlayOnLoan($loan, $member);

        $this->assertTrue($changed);
        $this->assertSame('মৌসুমি বেগম', $loan->loan_agreement_data['member_name_bn']);
        $this->assertSame('0001000099', $loan->loan_agreement_data['member_code']);
        $this->assertSame('1990123456789', $loan->loan_agreement_data['nid_number']);
        $this->assertSame(50000, $loan->loan_agreement_data['loan_amount']);
        $this->assertSame('নতুন সমিতি', $loan->loan_agreement_data['samity_name']);
        $this->assertSame('বাগানপাড়া', $loan->loan_agreement_data['village']);
        $this->assertSame('গরু পালন', $loan->loan_agreement_data['loan_purpose']);

        $this->assertSame('মৌসুমি বেগম', $loan->guarantor_info['member_name']);
        $this->assertSame('করিম উদ্দিন', $loan->guarantor_info['guarantor_name']);
        $this->assertSame('0001000099', $loan->guarantor_info['member_code']);

        $this->assertSame('মৌসুমি বেগম', $loan->business_plan['member_name_detail']);
        $this->assertSame('গরু পালন', $loan->business_plan['project_name']);
        $this->assertSame('মাঠ মন্তব্য রাখুন', $loan->business_plan['officer_post_inspection_comments']);

        $this->assertSame('0001000099', $loan->asset_info['member_no']);
        $this->assertSame('তদন্ত নোট', $loan->asset_info['comments']);

        $this->assertSame('মৌসুমি বেগম', $loan->nominee_info['loan_recipient_name']);
        $this->assertSame('0001000099', $loan->nominee_info['loan_recipient_code1']);
    }

    #[Test]
    public function it_does_not_mark_empty_forms_dirty(): void
    {
        $member = new MemberAdmission([
            'application_no' => '0001000099',
            'applicant_name_bn' => 'মৌসুমি',
        ]);
        $member->setRelation('familyMembers', new Collection);
        $member->setRelation('otherAssets', new Collection);

        $loan = new LoanApplication([
            'loan_agreement_data' => null,
            'guarantor_info' => [],
        ]);

        $changed = (new MemberAdmissionLoanSyncService)->overlayOnLoan($loan, $member);

        $this->assertFalse($changed);
    }
}
