<?php

namespace Tests\Unit;

use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\LoanMember;
use App\Models\MemberAdmission;
use App\Models\SavingsApplication;
use App\Models\TeamBasedApprovalItem;
use App\Services\MemberCodeService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class MemberCodeCascadeTest extends TestCase
{
    private function createDummyTables(): void
    {
        if (DB::connection()->getDriverName() === 'sqlite') {
            DB::connection()->getPdo()->sqliteCreateFunction('REGEXP', function ($pattern, $value) {
                return (int) (preg_match('/'.$pattern.'/', (string) $value) === 1);
            });
        }

        Schema::dropIfExists('loan_members');
        Schema::dropIfExists('savings_applications');
        Schema::dropIfExists('team_based_approval_items');
        Schema::dropIfExists('loan_applications');
        Schema::dropIfExists('member_admissions');
        Schema::dropIfExists('branches');

        Schema::create('branches', function (Blueprint $table) {
            $table->id();
            $table->string('name')->default('Test Branch');
            $table->string('code')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        DB::table('branches')->insert([
            'id' => 1,
            'name' => 'Test Branch',
            'code' => '0001',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Schema::create('member_admissions', function (Blueprint $table) {
            $table->id();
            $table->string('application_no')->nullable();
            $table->string('applicant_name_en')->nullable();
            $table->string('applicant_name_bn')->nullable();
            $table->string('nid_number')->nullable();
            $table->string('smart_card_number')->nullable();
            $table->string('mobile_number')->nullable();
            $table->string('alternative_mobile')->nullable();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->string('status')->default('approved');
            $table->timestamps();
        });

        Schema::create('loan_applications', function (Blueprint $table) {
            $table->id();
            $table->string('application_no')->nullable();
            $table->unsignedBigInteger('member_admission_id')->nullable();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->string('status')->default('draft');
            $table->json('loan_agreement_data')->nullable();
            $table->json('guarantor_info')->nullable();
            $table->json('business_plan')->nullable();
            $table->json('asset_info')->nullable();
            $table->json('nominee_info')->nullable();
            $table->json('legacy_member_snapshot')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('loan_members', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('loan_application_id');
            $table->integer('serial_no')->default(1);
            $table->string('member_name')->default('Member');
            $table->string('member_code')->nullable();
            $table->string('member_mobile')->nullable();
            $table->string('status')->default('pending');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('savings_applications', function (Blueprint $table) {
            $table->id();
            $table->string('application_no')->nullable();
            $table->unsignedBigInteger('member_admission_id')->nullable();
            $table->unsignedBigInteger('savings_product_id')->nullable();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('samity_id')->nullable();
            $table->decimal('deposit_amount', 15, 2)->default(0);
            $table->integer('duration_months')->default(12);
            $table->string('member_no')->nullable();
            $table->json('form_data')->nullable();
            $table->string('status')->default('draft');
            $table->timestamps();
        });

        Schema::create('team_based_approval_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('team_based_approval_id')->default(1);
            $table->unsignedInteger('serial_no')->default(1);
            $table->string('member_name');
            $table->string('name_bn')->nullable();
            $table->string('nid_number')->nullable();
            $table->string('member_code')->nullable();
            $table->string('member_phone')->nullable();
            $table->timestamps();
        });
    }

    #[Test]
    public function updating_member_code_cascades_to_loans_savings_and_team_based_rows(): void
    {
        $this->createDummyTables();

        $member = MemberAdmission::create([
            'application_no' => '0001000001',
            'applicant_name_bn' => 'মৌসুমি বেগম',
            'nid_number' => '1990123456789',
            'mobile_number' => '01711111111',
            'status' => 'approved',
        ]);

        $loan = LoanApplication::create([
            'application_no' => 'LN2026080001',
            'member_admission_id' => $member->id,
            'status' => LoanApplication::STATUS_SUBMITTED,
            'loan_agreement_data' => [
                'member_code' => '0001000001',
                'loan_amount' => 50000,
                'nested' => ['member_code' => '0001000001'],
            ],
            'guarantor_info' => ['member_code' => '0001000001'],
            'business_plan' => [
                'member_code' => '0001000001',
                'member_name_code' => 'মৌসুমি বেগম / 0001000001',
            ],
            'asset_info' => ['member_no' => '0001000001'],
            'nominee_info' => [
                'loan_recipient_code1' => '0001000001',
                'loan_recipient_code2' => '0001000001',
            ],
        ]);

        $loanMember = LoanMember::create([
            'loan_application_id' => $loan->id,
            'serial_no' => 1,
            'member_name' => 'মৌসুমি বেগম',
            'member_code' => '0001000001',
        ]);

        $savings = SavingsApplication::create([
            'application_no' => 'SV20260800001',
            'member_admission_id' => $member->id,
            'deposit_amount' => 500,
            'duration_months' => 12,
            'member_no' => '0001000001',
            'form_data' => [
                'member_no' => '0001000001',
                'applicant_name_bn' => 'মৌসুমি বেগম',
            ],
        ]);

        $teamItem = TeamBasedApprovalItem::create([
            'team_based_approval_id' => 1,
            'member_name' => 'মৌসুমি বেগম',
            'nid_number' => '1990123456789',
            'member_code' => '0001000001',
            'member_phone' => '01711111111',
        ]);

        $otherTeamItem = TeamBasedApprovalItem::create([
            'team_based_approval_id' => 1,
            'member_name' => 'অন্য সদস্য',
            'member_code' => '0002000001',
        ]);

        $member->update(['application_no' => '0001000099']);

        $loan->refresh();
        $loanMember->refresh();
        $savings->refresh();
        $teamItem->refresh();
        $otherTeamItem->refresh();
        $member->refresh();

        $this->assertSame('0001000099', $member->application_no);
        $this->assertSame('0001000099', $loan->loan_agreement_data['member_code']);
        $this->assertSame(50000, $loan->loan_agreement_data['loan_amount']);
        $this->assertSame('0001000099', $loan->loan_agreement_data['nested']['member_code']);
        $this->assertSame('0001000099', $loan->guarantor_info['member_code']);
        $this->assertSame('0001000099', $loan->business_plan['member_code']);
        $this->assertSame('মৌসুমি বেগম / 0001000099', $loan->business_plan['member_name_code']);
        $this->assertSame('0001000099', $loan->asset_info['member_no']);
        $this->assertSame('0001000099', $loan->nominee_info['loan_recipient_code1']);
        $this->assertSame('0001000099', $loan->nominee_info['loan_recipient_code2']);
        $this->assertSame('0001000099', $loanMember->member_code);
        $this->assertSame('0001000099', $savings->member_no);
        $this->assertSame('0001000099', $savings->form_data['member_no']);
        $this->assertSame('0001000099', $teamItem->member_code);
        $this->assertSame('0002000001', $otherTeamItem->member_code);
    }

    #[Test]
    public function team_based_serial_only_code_updates_when_the_member_name_matches(): void
    {
        $this->createDummyTables();

        $member = MemberAdmission::create([
            'application_no' => '0001000065',
            'applicant_name_bn' => 'মৌসুমি বেগম',
            'status' => 'approved',
        ]);

        $matching = TeamBasedApprovalItem::create([
            'team_based_approval_id' => 1,
            'member_name' => 'মৌসুমি বেগম',
            'member_code' => '65',
        ]);

        $other = TeamBasedApprovalItem::create([
            'team_based_approval_id' => 1,
            'member_name' => 'রহিমা',
            'member_code' => '65',
        ]);

        $member->update(['application_no' => '0001000099']);

        $this->assertSame('0001000099', $matching->fresh()->member_code);
        $this->assertSame('65', $other->fresh()->member_code);
    }

    #[Test]
    public function assigning_a_member_code_updates_the_member_and_all_related_records(): void
    {
        $this->createDummyTables();

        $member = MemberAdmission::create([
            'application_no' => '0001000001',
            'applicant_name_bn' => 'মৌসুমি বেগম',
            'branch_id' => 1,
            'nid_number' => '1990123456789',
            'mobile_number' => '01711111111',
            'status' => 'approved',
        ]);
        $member->setRelation('branch', new Branch(['code' => '0001']));

        $loan = LoanApplication::create([
            'application_no' => 'LN2026080002',
            'member_admission_id' => $member->id,
            'status' => LoanApplication::STATUS_SUBMITTED,
            'loan_agreement_data' => ['member_code' => '0001000001'],
            'guarantor_info' => ['member_code' => '0001000001'],
            'business_plan' => [
                'member_code' => '0001000001',
                'member_name_code' => 'মৌসুমি বেগম / 0001000001',
            ],
        ]);

        $result = MemberCodeService::assignMemberCode($member, '0001000099');

        $this->assertTrue($result['ok']);
        $this->assertSame('0001000099', $result['code']);
        $this->assertSame('0001000099', $member->fresh()->application_no);
        $this->assertSame('0001000099', $loan->fresh()->loan_agreement_data['member_code']);
        $this->assertSame('0001000099', $loan->fresh()->guarantor_info['member_code']);
        $this->assertSame('মৌসুমি বেগম / 0001000099', $loan->fresh()->business_plan['member_name_code']);
    }

    #[Test]
    public function assigning_a_code_already_used_by_another_member_swaps_and_cascades_both(): void
    {
        $this->createDummyTables();

        $member = MemberAdmission::create([
            'application_no' => '0001000001',
            'applicant_name_bn' => 'মৌসুমি বেগম',
            'branch_id' => 1,
            'status' => 'approved',
        ]);
        $member->setRelation('branch', new Branch(['code' => '0001']));

        $previous = MemberAdmission::create([
            'application_no' => '0001000099',
            'applicant_name_bn' => 'অন্য সদস্য',
            'branch_id' => 1,
            'status' => 'approved',
        ]);
        $previous->setRelation('branch', new Branch(['code' => '0001']));

        $loan = LoanApplication::create([
            'application_no' => 'LN2026080003',
            'member_admission_id' => $member->id,
            'status' => LoanApplication::STATUS_SUBMITTED,
            'loan_agreement_data' => ['member_code' => '0001000001'],
        ]);

        $previousLoan = LoanApplication::create([
            'application_no' => 'LN2026080004',
            'member_admission_id' => $previous->id,
            'status' => LoanApplication::STATUS_SUBMITTED,
            'loan_agreement_data' => ['member_code' => '0001000099'],
        ]);

        $result = MemberCodeService::assignMemberCode($member, '0001000099');

        $this->assertTrue($result['ok']);
        $this->assertSame('0001000099', $result['code']);
        $this->assertSame('0001000001', $result['swapped_code']);
        $this->assertSame('0001000099', $member->fresh()->application_no);
        $this->assertSame('0001000001', $previous->fresh()->application_no);
        $this->assertSame('0001000099', $loan->fresh()->loan_agreement_data['member_code']);
        $this->assertSame('0001000001', $previousLoan->fresh()->loan_agreement_data['member_code']);
        $this->assertSame(
            'মেম্বার কোড সফলভাবে আপডেট করা হয়েছে: 0001000099 আগের সদস্যের কোড পরিবর্তন করে 0001000001 করা হয়েছে।',
            MemberCodeService::updatedFlashMessage($result)
        );
    }

    #[Test]
    public function same_branch_serial_variant_is_treated_as_a_duplicate_code(): void
    {
        $this->createDummyTables();

        $member = MemberAdmission::create([
            'application_no' => '0001000001',
            'applicant_name_bn' => 'মৌসুমি বেগম',
            'branch_id' => 1,
            'status' => 'approved',
        ]);

        DB::table('member_admissions')->insert([
            'application_no' => '99',
            'applicant_name_bn' => 'পুরনো সিরিয়াল',
            'branch_id' => 1,
            'status' => 'approved',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $conflict = MemberCodeService::findConflictingAdmission('0001000099', (int) $member->id, 1);

        $this->assertNotNull($conflict);
        $this->assertSame('99', $conflict->application_no);

        $member->setRelation('branch', new Branch(['code' => '0001']));
        $result = MemberCodeService::assignMemberCode($member, '0001000099');

        $this->assertTrue($result['ok']);
        $this->assertSame('0001000099', $member->fresh()->application_no);
        $this->assertSame('0001000001', $conflict->fresh()->application_no);
    }
}
