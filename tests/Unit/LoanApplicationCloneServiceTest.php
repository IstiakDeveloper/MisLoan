<?php

use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\LoanCategory;
use App\Models\LoanProduct;
use App\Models\MemberAdmission;
use App\Models\Samity;
use App\Services\LoanApplicationCloneService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

beforeEach(function () {
    createLoanCloneServiceTables();
});

it('does not clone the previous sufolon agreement onto a new agrosor loan', function () {
    [$member, $sufolonProduct, $sufolonCategory, $agrosorProduct, $agrosorCategory] = makeCloneServiceContext();

    $previous = LoanApplication::create([
        'status' => LoanApplication::STATUS_REPAID,
        'requested_amount' => 50000,
        'form_type' => 'loan_agreement',
        'loan_agreement_data' => [
            'loan_purpose' => 'সূফলন ব্যবসা',
            'loan_amount' => 50000,
        ],
        'guarantor_info' => [
            'guarantor_name' => 'জাহিদ',
            'loan_amount' => 50000,
        ],
        'nominee_info' => [
            'loan_recipient_name' => 'মৌসুমি',
            'loan_amount_received' => 50000,
        ],
        'asset_info' => [
            'monthly_income' => 15000,
        ],
        'business_plan' => null,
    ]);
    attachCloneServiceRelations($previous, $member, $sufolonProduct, $sufolonCategory);

    $draft = LoanApplication::create([
        'status' => LoanApplication::STATUS_DRAFT,
        'requested_amount' => 200000,
        'form_type' => 'loan_agreement',
        'loan_term_months' => 12,
        'number_of_installments' => 12,
        'purpose_of_loan' => 'আগ্রসর ঋণ',
        'loan_agreement_data' => [
            'loan_purpose' => 'পুরনো চুক্তিপত্র',
            'loan_amount' => 50000,
        ],
    ]);
    attachCloneServiceRelations($draft, $member, $agrosorProduct, $agrosorCategory);

    (new LoanApplicationCloneService)->cloneAndMerge($draft, $previous);
    $draft->refresh();

    expect($draft->form_type)->toBe('loan_application_approval')
        ->and($draft->loan_agreement_data)->toBeNull()
        ->and($draft->asset_info)->toBeNull()
        ->and($draft->business_plan)->not->toBeEmpty()
        ->and((string) ($draft->business_plan['applied_loan_amount'] ?? ''))->toBe('200000')
        ->and($draft->guarantor_info['guarantor_name'] ?? null)->toBe('জাহিদ')
        ->and($draft->nominee_info['loan_recipient_name'] ?? null)->toBe('মৌসুমি');
});

it('reuses the saved agreement when the next loan is the same sufolon product', function () {
    [$member, $sufolonProduct, $sufolonCategory] = makeCloneServiceContext();

    $previous = LoanApplication::create([
        'status' => LoanApplication::STATUS_REPAID,
        'requested_amount' => 50000,
        'form_type' => 'loan_agreement',
        'loan_agreement_data' => [
            'loan_purpose' => 'গরু পালন',
            'house_value' => '80000',
            'loan_amount' => 50000,
        ],
        'business_plan' => [
            'business_type' => 'should-not-copy',
        ],
    ]);
    attachCloneServiceRelations($previous, $member, $sufolonProduct, $sufolonCategory);

    $draft = LoanApplication::create([
        'status' => LoanApplication::STATUS_DRAFT,
        'requested_amount' => 50000,
        'form_type' => 'loan_agreement',
        'loan_term_months' => 6,
        'number_of_installments' => 6,
    ]);
    attachCloneServiceRelations($draft, $member, $sufolonProduct, $sufolonCategory);

    (new LoanApplicationCloneService)->cloneAndMerge($draft, $previous);
    $draft->refresh();

    expect($draft->form_type)->toBe('loan_agreement')
        ->and($draft->loan_agreement_data['loan_purpose'] ?? null)->toBe('গরু পালন')
        ->and($draft->loan_agreement_data['house_value'] ?? null)->toBe('80000')
        ->and((float) ($draft->loan_agreement_data['loan_amount'] ?? 0))->toBe(50000.0)
        ->and($draft->business_plan)->toBeNull();
});

it('reuses the saved application form when the next loan is the same agrosor product', function () {
    [$member, , , $agrosorProduct, $agrosorCategory] = makeCloneServiceContext();

    $previous = LoanApplication::create([
        'status' => LoanApplication::STATUS_REPAID,
        'requested_amount' => 150000,
        'form_type' => 'loan_application_approval',
        'business_plan' => [
            'business_type' => 'সবজি চাষ',
            'business_description' => 'আগের প্রকল্প',
            'applied_loan_amount' => '150000',
        ],
        'loan_agreement_data' => [
            'loan_purpose' => 'should-not-copy',
        ],
    ]);
    attachCloneServiceRelations($previous, $member, $agrosorProduct, $agrosorCategory);

    $draft = LoanApplication::create([
        'status' => LoanApplication::STATUS_DRAFT,
        'requested_amount' => 200000,
        'form_type' => 'loan_application_approval',
        'loan_term_months' => 12,
        'number_of_installments' => 12,
        'purpose_of_loan' => 'আগ্রসর ঋণ',
    ]);
    attachCloneServiceRelations($draft, $member, $agrosorProduct, $agrosorCategory);

    (new LoanApplicationCloneService)->cloneAndMerge($draft, $previous);
    $draft->refresh();

    expect($draft->form_type)->toBe('loan_application_approval')
        ->and($draft->loan_agreement_data)->toBeNull()
        ->and($draft->business_plan['business_type'] ?? null)->toBe('সবজি চাষ')
        ->and($draft->business_plan['business_description'] ?? null)->toBe('আগের প্রকল্প')
        ->and((string) ($draft->business_plan['applied_loan_amount'] ?? ''))->toBe('200000');
});

function createLoanCloneServiceTables(): void
{
    if (DB::connection()->getDriverName() === 'sqlite') {
        DB::connection()->getPdo()->sqliteCreateFunction('REGEXP', function ($pattern, $value) {
            return (int) (preg_match('/'.$pattern.'/', (string) $value) === 1);
        });
    }

    Schema::dropIfExists('loan_applications');

    Schema::create('loan_applications', function (Blueprint $table) {
        $table->id();
        $table->string('application_no')->nullable();
        $table->unsignedBigInteger('member_admission_id')->nullable();
        $table->unsignedBigInteger('loan_product_id')->nullable();
        $table->unsignedBigInteger('loan_category_id')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->string('status')->default('draft');
        $table->string('form_type')->nullable();
        $table->decimal('requested_amount', 15, 2)->nullable();
        $table->integer('loan_term_months')->nullable();
        $table->integer('number_of_installments')->nullable();
        $table->decimal('installment_amount', 15, 2)->nullable();
        $table->string('purpose_of_loan')->nullable();
        $table->json('loan_agreement_data')->nullable();
        $table->json('guarantor_info')->nullable();
        $table->json('guarantors_list')->nullable();
        $table->json('nominee_info')->nullable();
        $table->json('asset_info')->nullable();
        $table->json('asset_details')->nullable();
        $table->json('liability_details')->nullable();
        $table->json('business_plan')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });
}

/**
 * @return array{0: MemberAdmission, 1: LoanProduct, 2: LoanCategory, 3: LoanProduct, 4: LoanCategory}
 */
function makeCloneServiceContext(): array
{
    $branch = new Branch([
        'name' => 'Test Branch',
        'address' => 'Dhaka',
    ]);
    $branch->id = 1;

    $samity = new Samity([
        'samity_name' => 'Test Samity',
        'samity_name_bn' => 'টেস্ট সমিতি',
        'samity_code' => 'S-1',
    ]);
    $samity->id = 1;

    $member = new MemberAdmission([
        'application_no' => '0001000055',
        'applicant_name_bn' => 'মৌসুমি',
        'applicant_name_en' => 'Mousumi',
        'nid_number' => '1234567890',
        'mobile_number' => '01700000000',
        'present_village_road' => 'গ্রাম',
        'present_upazila' => 'উপজেলা',
        'present_district' => 'জেলা',
        'project_name' => 'গরু পালন',
        'business_details' => 'পশুপালন',
        'guarantor_name' => 'জাহিদ',
    ]);
    $member->id = 1;
    $member->setRelation('branch', $branch);
    $member->setRelation('samity', $samity);
    $member->setRelation('familyMembers', collect());
    $member->setRelation('otherAssets', collect());

    $sufolonCategory = new LoanCategory([
        'category_code' => 'SFL',
        'category_name' => 'Sufolon',
        'category_name_bn' => 'সুফলন',
    ]);
    $sufolonCategory->id = 1;

    $sufolonProduct = new LoanProduct([
        'installment_type' => 'monthly',
        'product_code' => 'SFL',
        'product_name' => 'Sufolon',
        'product_name_bn' => 'সুফলন',
        'duration_months' => 6,
        'number_of_installments' => 6,
        'interest_rate' => 12,
        'min_amount' => 10000,
    ]);
    $sufolonProduct->id = 1;
    $sufolonProduct->setRelation('loanCategory', $sufolonCategory);

    $agrosorCategory = new LoanCategory([
        'category_code' => 'AGR',
        'category_name' => 'Agrosor',
        'category_name_bn' => 'আগ্রসর',
    ]);
    $agrosorCategory->id = 2;

    $agrosorProduct = new LoanProduct([
        'installment_type' => 'monthly',
        'product_code' => 'AGR',
        'product_name' => 'Agrosor',
        'product_name_bn' => 'আগ্রসর',
        'duration_months' => 12,
        'number_of_installments' => 12,
        'interest_rate' => 12,
        'min_amount' => 50000,
    ]);
    $agrosorProduct->id = 2;
    $agrosorProduct->setRelation('loanCategory', $agrosorCategory);

    return [$member, $sufolonProduct, $sufolonCategory, $agrosorProduct, $agrosorCategory];
}

function attachCloneServiceRelations(
    LoanApplication $loan,
    MemberAdmission $member,
    LoanProduct $product,
    LoanCategory $category
): void {
    $loan->setRelation('memberAdmission', $member);
    $loan->setRelation('loanProduct', $product);
    $loan->setRelation('loanCategory', $category);
    $loan->setRelation('branch', $member->branch);
    $loan->setRelation('samity', $member->samity);
}
