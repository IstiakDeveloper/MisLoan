<?php

use App\Http\Middleware\CheckMaintenanceMode;
use App\Http\Middleware\EnsurePortfolioHandoverComplete;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\PreserveCycleLoanContext;
use App\Models\Area;
use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\LoanApplicationApproval;
use App\Models\LoanCategory;
use App\Models\LoanProduct;
use App\Models\MemberAdmission;
use App\Models\MemberAdmissionApproval;
use App\Models\MemberCategory;
use App\Models\MemberFamilyMember;
use App\Models\MemberLoanCycle;
use App\Models\MemberOtherAsset;
use App\Models\Role;
use App\Models\Samity;
use App\Models\SavingsProduct;
use App\Models\Setting;
use App\Models\User;
use App\Models\Zone;
use App\Services\CycleRenewalService;
use App\Services\LoanApplicationCloneService;
use App\Services\NotificationService;
use App\Support\LoanFormVisibility;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

// An isolated schema with the complete model payloads used by this integration.
function createRenewalModelTable(Model $model): void
{
    Schema::create($model->getTable(), function (Blueprint $table) use ($model) {
        $table->id();
        foreach ($model->getFillable() as $field) {
            if (in_array($field, ['id', 'created_at', 'updated_at', 'deleted_at'])) {
                continue;
            }
            $cast = $model->getCasts()[$field] ?? '';
            if ($cast === 'integer' || str_ends_with($field, '_id') || in_array($field, ['created_by', 'submitted_by', 'reviewed_by'])) {
                $table->integer($field)->nullable();
            } elseif (str_starts_with($cast, 'decimal')) {
                $table->decimal($field, 18, 8)->nullable();
            } elseif ($cast === 'boolean') {
                $table->boolean($field)->nullable();
            } else {
                $table->text($field)->nullable();
            }
        }
        if ($model instanceof User && ! in_array('phone', $model->getFillable())) {
            $table->string('phone')->nullable();
        }
        $table->timestamps();
        $table->softDeletes();
    });
}

function renewalContext(): array
{
    $branch = Branch::create(['name' => 'Cycle Test Branch', 'code' => '0001', 'is_active' => true]);
    $samity = Samity::create(['branch_id' => $branch->id, 'samity_name' => 'Cycle Samity', 'samity_code' => '00010001', 'is_active' => true]);
    $role = Role::create(['name' => Role::BRANCH_USER, 'display_name' => 'Branch User']);
    $user = User::create(['name' => 'Cycle Officer', 'email' => 'cycle@example.test', 'password' => 'password', 'role_id' => $role->id, 'branch_id' => $branch->id, 'is_active' => true, 'email_verified_at' => now(), 'pin' => '1234', 'signature' => 'officer-signature']);
    $user->forceFill(['phone' => '01700000000'])->save();
    $category = LoanCategory::create(['category_name' => 'Regular', 'category_code' => 'REG', 'is_active' => true]);
    $product = LoanProduct::create(['loan_category_id' => $category->id, 'product_name' => 'Weekly Regular', 'product_code' => '01', 'main_product_code' => '01', 'installment_type' => 'weekly', 'duration_months' => 12, 'number_of_installments' => 46, 'min_amount' => 1000, 'max_amount' => 500000, 'interest_rate' => 10, 'is_active' => true]);
    Storage::disk('public')->put('admissions/source-photo.jpg', 'original-photo-bytes');
    $member = MemberAdmission::create([
        'application_no' => '0001000001', 'branch_id' => $branch->id, 'samity_id' => $samity->id,
        'applicant_name_en' => 'Cycle Member', 'nid_number' => '1234567890', 'mobile_number' => '01711111111',
        'status' => 'approved', 'loan_dofa' => 7, 'is_legacy' => true, 'admission_date' => '2020-01-01',
        'monthly_income' => 10000, 'monthly_expense' => 5000, 'guarantor_name' => 'Old Guarantor',
        'present_village_road' => 'Village', 'present_union' => 'Union', 'present_upazila' => 'Upazila', 'present_district' => 'District',
        'customer_photo_path' => 'admissions/source-photo.jpg',
    ]);
    $member->familyMembers()->create(['sl_no' => 1, 'member_name' => 'Family Member']);
    $member->otherAssets()->create(['sl_no' => 1, 'asset_description' => 'Livestock', 'estimated_value' => 2000]);
    $source = LoanApplication::create([
        'application_no' => 'LN-SOURCE', 'member_admission_id' => $member->id,
        'branch_id' => $branch->id, 'samity_id' => $samity->id,
        'loan_product_id' => $product->id, 'loan_category_id' => $category->id,
        'status' => 'repaid', 'requested_amount' => 10000,
        'loan_agreement_data' => ['loan_purpose' => 'Reusable purpose', 'village' => 'Old Village', 'applicant_signature_image' => 'data:image/png;base64,OLD', '_user_saved' => true, 'disbursement_date' => '2020-02-01'],
        'guarantor_info' => ['guarantor_name' => 'Old Guarantor', 'guarantor_mobile' => '01722222222'],
        'asset_info' => ['monthly_income' => 10000, 'loan_round' => 7, 'recommended_loan_amount' => 10000],
        'business_plan' => ['loan_round' => 7, 'zonal_manager_comments' => 'Old approval', 'officer_post_inspection_comments' => 'Old investigation'],
    ]);

    return compact('member', 'source', 'user', 'branch', 'category', 'product');
}

beforeEach(function () {
    foreach ([new Zone, new Area, new Branch, new Samity, new Role, new User, new MemberCategory, new LoanCategory, new LoanProduct, new MemberAdmission, new MemberFamilyMember, new MemberOtherAsset, new LoanApplication, new LoanApplicationApproval, new MemberAdmissionApproval, new SavingsProduct, new Setting] as $model) {
        createRenewalModelTable($model);
    }
    foreach (['user_branches' => 'branch_id', 'user_areas' => 'area_id', 'user_zones' => 'zone_id'] as $name => $key) {
        Schema::create($name, function (Blueprint $table) use ($key) {
            $table->integer('user_id');
            $table->integer($key);
        });
    }
    (require database_path('migrations/2026_11_18_120000_create_member_loan_cycles_table.php'))->up();
    Storage::fake('public');
    $this->withoutMiddleware([HandleInertiaRequests::class, EnsurePortfolioHandoverComplete::class, CheckMaintenanceMode::class]);
});

it('copies the entire source file into a stable independent cycle and resumes it', function () {
    extract(renewalContext());
    $originalMember = $member->fresh()->getRawOriginal();
    $originalLoan = $source->fresh()->getRawOriginal();
    [$cycle, $reused] = app(CycleRenewalService::class)->start($member, $user);
    [$same, $resumed] = app(CycleRenewalService::class)->start($member, $user);
    expect($reused)->toBeFalse()->and($resumed)->toBeTrue()->and($same->id)->toBe($cycle->id)
        ->and($cycle->number)->toBe(8)->and($cycle->admission->application_no)->toBe($member->application_no)
        ->and($cycle->admission->familyMembers)->toHaveCount(1)->and($cycle->admission->otherAssets)->toHaveCount(1)
        ->and($cycle->source_snapshot['loan']['business_plan']['zonal_manager_comments'])->toBe('Old approval')
        ->and($cycle->admission->customer_photo_path)->not->toBe($member->customer_photo_path)
        ->and(Storage::disk('public')->get($cycle->admission->customer_photo_path))->toBe('original-photo-bytes')
        ->and($member->fresh()->getRawOriginal())->toBe($originalMember)
        ->and($source->fresh()->getRawOriginal())->toBe($originalLoan);
});

it('uses corrected admission values and new loan terms instead of old authorization', function () {
    extract(renewalContext());
    [$cycle] = app(CycleRenewalService::class)->start($member, $user);
    $cycle->admission->update(['monthly_income' => 30000, 'guarantor_name' => 'New Guarantor', 'guarantor_mobile' => '01833333333']);
    $cycle->update(['admission_snapshot' => $cycle->admission->load(CycleRenewalService::ADMISSION_RELATIONS)->toArray()]);
    $cycle = app(CycleRenewalService::class)->selectLoan($cycle, $product->id, $category->id, 50000, $cycle->revision);
    $loan = $cycle->loan;
    expect($loan->id)->not->toBe($source->id)->and($loan->member_admission_id)->toBe($cycle->admission_id)
        ->and($loan->guarantor_info['guarantor_name'])->toBe('New Guarantor')
        ->and((float) $loan->asset_info['monthly_income'])->toBe(30000.0)
        ->and($loan->asset_info['loan_round'])->toBe(8)
        ->and((float) $loan->loan_agreement_data['loan_amount'])->toBe(50000.0)
        ->and($loan->loan_agreement_data['disbursement_date'])->toBe('')
        ->and($loan->loan_agreement_data)->not->toHaveKey('applicant_signature_image')
        ->and(LoanFormVisibility::buildFormSavedMap($loan)[1])->toBeFalse()
        ->and((float) $member->fresh()->monthly_income)->toBe(10000.0)
        ->and((int) $member->fresh()->loan_dofa)->toBe(7);
});

it('changes terms on the same loan and removes only inapplicable working forms', function () {
    extract(renewalContext());
    [$cycle] = app(CycleRenewalService::class)->start($member, $user);
    $service = app(CycleRenewalService::class);
    $cycle = $service->selectLoan($cycle, $product->id, $category->id, 50000, $cycle->revision);
    $id = $cycle->loan_id;
    $product->update(['installment_type' => 'monthly']);
    $cycle = $service->selectLoan($cycle, $product->id, $category->id, 200000, $cycle->revision);
    expect($cycle->loan_id)->toBe($id)->and(LoanApplication::count())->toBe(2)
        ->and($cycle->loan->loan_agreement_data)->toBeNull()->and($cycle->loan->asset_info)->toBeNull()
        ->and($cycle->loan->business_plan['applied_loan_amount'])->toBe('200000')
        ->and($cycle->loan->business_plan['loan_round'])->toBe(8)
        ->and($cycle->loan->business_plan)->not->toHaveKey('zonal_manager_comments')
        ->and($cycle->source_snapshot['loan']['loan_agreement_data']['loan_purpose'])->toBe('Reusable purpose')
        ->and($source->fresh()->loan_agreement_data['disbursement_date'])->toBe('2020-02-01');
});

it('rejects stale revisions and product category mismatches without inserting a loan', function () {
    extract(renewalContext());
    [$cycle] = app(CycleRenewalService::class)->start($member, $user);
    $other = LoanCategory::create(['category_name' => 'Other', 'is_active' => true]);
    expect(fn () => app(CycleRenewalService::class)->selectLoan($cycle, $product->id, $other->id, 10000, $cycle->revision))->toThrow(ValidationException::class);
    expect(fn () => app(CycleRenewalService::class)->selectLoan($cycle, $product->id, $category->id, 10000, 999))->toThrow(ValidationException::class);
    expect(LoanApplication::count())->toBe(1)->and($member->fresh()->loan_dofa)->toBe(7);
});

it('does not copy a newer rejected loan as the source', function () {
    extract(renewalContext());
    LoanApplication::create(['application_no' => 'LN-REJECTED', 'member_admission_id' => $member->id, 'status' => 'rejected', 'loan_agreement_data' => ['loan_purpose' => 'Wrong source']]);
    [$cycle] = app(CycleRenewalService::class)->start($member, $user);
    expect((int) $cycle->source_loan_id)->toBe($source->id)
        ->and($cycle->source_snapshot['loan']['loan_agreement_data']['loan_purpose'])->toBe('Reusable purpose');
});

it('saves a cycle admission independently including cleared family and zero amounts', function () {
    extract(renewalContext());
    [$cycle] = app(CycleRenewalService::class)->start($member, $user);
    $diskBefore = Storage::disk('public');
    expect($diskBefore->get('admissions/source-photo.jpg'))->toBe('original-photo-bytes');
    $this->actingAs($user)->post('/member/cycle-hub/renewals/'.$cycle->id.'/admission', [
        'revision' => $cycle->revision, 'monthly_income' => 0, 'guarantor_name' => 'Corrected Guarantor',
        'family_members' => '[]', 'other_assets' => '[]', 'clear_customer_photo' => true,
        'application_no' => '0001009999', 'branch_id' => 999, 'is_legacy' => false,
    ])->assertSessionHasNoErrors()->assertRedirect();
    $cycle->refresh();
    expect(Storage::disk('public')->path('admissions/source-photo.jpg'))->toBe($diskBefore->path('admissions/source-photo.jpg'));
    expect((float) $cycle->admission->monthly_income)->toBe(0.0)->and($cycle->admission->familyMembers)->toHaveCount(0)
        ->and($cycle->admission->otherAssets)->toHaveCount(0)->and($cycle->admission->application_no)->toBe('0001000001')
        ->and($cycle->admission->customer_photo_path)->toBeNull()
        ->and($member->fresh()->customer_photo_path)->toBe('admissions/source-photo.jpg')
        ->and(Storage::disk('public')->get('admissions/source-photo.jpg'))->toBe('original-photo-bytes');
});

it('keeps documents and source records when a draft is discarded', function () {
    extract(renewalContext());
    [$cycle] = app(CycleRenewalService::class)->start($member, $user);
    $this->actingAs($user)->delete('/member/cycle-hub/renewals/'.$cycle->id, ['revision' => $cycle->revision])->assertRedirect();
    expect($cycle->fresh()->state)->toBe('discarded')->and($cycle->fresh()->open_member_id)->toBeNull()
        ->and($source->fresh()->status)->toBe('repaid')->and($member->fresh())->not->toBeNull()
        ->and(Storage::disk('public')->get('admissions/source-photo.jpg'))->toBe('original-photo-bytes');
    [$next] = app(CycleRenewalService::class)->start($member, $user);
    expect($next->number)->toBe(9)->and($next->id)->not->toBe($cycle->id);
});

it('rejects cross branch access and mismatched cycle loan ids', function () {
    extract(renewalContext());
    [$cycle] = app(CycleRenewalService::class)->start($member, $user);
    $user->update(['branch_id' => 999]);
    $this->actingAs($user)->get('/member/cycle-hub/renewals/'.$cycle->id.'/admission')->assertForbidden();
    $user->update(['branch_id' => $branch->id]);
    $this->actingAs($user)->getJson('/member/cycle-hub/cycle/'.$cycle->admission_id.'?loan_id='.$source->id)->assertNotFound();
});

it('keeps dossier reads pure and shows all applicable prefilled forms', function () {
    extract(renewalContext());
    [$cycle] = app(CycleRenewalService::class)->start($member, $user);
    $cycle = app(CycleRenewalService::class)->selectLoan($cycle, $product->id, $category->id, 50000, $cycle->revision);
    $before = $cycle->loan->fresh()->getRawOriginal();
    $this->actingAs($user)->get('/member/cycle-hub/cycle/'.$cycle->admission_id.'?loan_id='.$cycle->loan_id, ['X-Inertia' => 'true'])
        ->assertOk()->assertJsonPath('props.currentDofa', 8)->assertJsonPath('props.cycle.id', $cycle->id)
        ->assertJsonPath('props.formSaved.1', false)->assertJsonPath('props.visibleFormIds.0', 1);
    expect($cycle->loan->fresh()->getRawOriginal())->toBe($before);
});

it('uses existing save and submit validation and creates only a new approval workflow', function () {
    extract(renewalContext());
    $bmRole = Role::create(['name' => Role::BRANCH_MANAGER]);
    User::create(['name' => 'Branch Manager', 'email' => 'bm@example.test', 'password' => 'password', 'role_id' => $bmRole->id, 'branch_id' => $branch->id, 'is_active' => true]);
    $this->mock(NotificationService::class, fn ($mock) => $mock->shouldReceive('send')->andReturnNull());
    [$cycle] = app(CycleRenewalService::class)->start($member, $user);
    $cycle = app(CycleRenewalService::class)->selectLoan($cycle, $product->id, $category->id, 10000, $cycle->revision);
    $this->actingAs($user)->patch('/member/loan-applications/'.$cycle->loan_id.'/submit', ['cycle_revision' => $cycle->revision])->assertSessionHasErrors('error');
    $cycle->refresh();
    expect($cycle->loan->status)->toBe('draft')->and($cycle->submitted_snapshot)->toBeNull();
    $this->actingAs($user)->post('/member/loan-applications/forms/loan-agreement/save-draft', [
        'application_id' => $cycle->loan_id, 'member_id' => $cycle->admission_id,
        'loan_product_id' => $product->id, 'loan_category_id' => $category->id,
        'requested_amount' => 10000, 'cycle_revision' => $cycle->revision,
        'agreement_data' => ['village' => 'New Village', 'union' => 'Union', 'upazila' => 'Upazila', 'district' => 'District'],
    ])->assertSessionHasNoErrors()->assertRedirect();
    $cycle->refresh();
    expect(LoanFormVisibility::buildFormSavedMap($cycle->loan)[1])->toBeTrue();
    $this->actingAs($user)->patch('/member/loan-applications/'.$cycle->loan_id.'/submit', ['cycle_revision' => $cycle->revision])->assertSessionHasNoErrors()->assertRedirect();
    $cycle->refresh();
    expect($cycle->loan->status)->toBe('submitted')->and($cycle->submitted_snapshot)->not->toBeNull()
        ->and($cycle->open_member_id)->toBeNull()->and($cycle->loan->approvals)->toHaveCount(1)
        ->and($source->fresh()->approvals)->toHaveCount(0)->and($source->fresh()->status)->toBe('repaid');
});

it('does not let an old form page overwrite changed terms', function () {
    extract(renewalContext());
    [$cycle] = app(CycleRenewalService::class)->start($member, $user);
    $cycle = app(CycleRenewalService::class)->selectLoan($cycle, $product->id, $category->id, 10000, $cycle->revision);
    $this->actingAs($user)->post('/member/loan-applications/forms/loan-agreement/save-draft', [
        'application_id' => $cycle->loan_id, 'member_id' => $cycle->admission_id,
        'loan_product_id' => $product->id, 'loan_category_id' => $category->id,
        'requested_amount' => 10000, 'cycle_revision' => 999, 'agreement_data' => ['village' => 'Wrong'],
    ])->assertStatus(409);
    expect($cycle->loan->fresh()->loan_agreement_data['village'])->toBe('Village');
});

it('freezes a repaid cycle and uses that stored admission for the following cycle', function () {
    extract(renewalContext());
    [$cycle] = app(CycleRenewalService::class)->start($member, $user);
    $cycle = app(CycleRenewalService::class)->selectLoan($cycle, $product->id, $category->id, 10000, $cycle->revision);
    $cycle->loan->update(['status' => 'disbursed', 'disbursed_at' => now(), 'disbursed_amount' => 10000]);
    $this->actingAs($user)->postJson('/member/cycle-hub/loans/'.$cycle->loan_id.'/repay')->assertOk();
    $cycle->refresh();
    expect($cycle->state)->toBe('closed');
    $cycle->admission->update(['applicant_name_en' => 'Changed outside cycle']);
    $cycle->loan->update(['loan_agreement_data' => ['village' => 'Changed outside cycle']]);
    app(CycleRenewalService::class)->snapshot($cycle->fresh());
    $display = app(CycleRenewalService::class)->display($cycle->fresh());
    expect($display['admission']['applicant_name_en'])->toBe('Cycle Member')
        ->and($display['loan']->loan_agreement_data['village'])->toBe('Village');
    [$next] = app(CycleRenewalService::class)->start($member, $user);
    expect($next->number)->toBe(9)->and($next->admission->applicant_name_en)->toBe('Cycle Member')
        ->and($next->source_snapshot['loan']['loan_agreement_data']['village'])->toBe('Village');
});

it('allows a supplementary product alongside an active regular loan but blocks a second regular loan', function () {
    extract(renewalContext());
    LoanApplication::create(['application_no' => 'LN-ACTIVE', 'member_admission_id' => $member->id, 'branch_id' => $branch->id, 'loan_product_id' => $product->id, 'loan_category_id' => $category->id, 'status' => 'disbursed']);
    [$cycle] = app(CycleRenewalService::class)->start($member, $user);
    expect(fn () => app(CycleRenewalService::class)->selectLoan($cycle, $product->id, $category->id, 10000, $cycle->revision))->toThrow(ValidationException::class);
    $supplementary = $product->replicate();
    $supplementary->product_code = '38.01';
    $supplementary->main_product_code = '38';
    $supplementary->save();
    $cycle = app(CycleRenewalService::class)->selectLoan($cycle, $supplementary->id, $category->id, 10000, $cycle->revision);
    expect((int) $cycle->loan->loan_product_id)->toBe($supplementary->id);
    expect(fn () => app(CycleRenewalService::class)->selectLoan($cycle, $product->id, $category->id, 10000, $cycle->revision))->toThrow(ValidationException::class);
});

it('marks missing documents without pointing the new cycle to a missing original', function () {
    extract(renewalContext());
    $member->update(['customer_nid_photo_path' => 'admissions/missing-nid.pdf']);
    [$cycle] = app(CycleRenewalService::class)->start($member, $user);
    expect($cycle->admission->customer_nid_photo_path)->toBeNull()
        ->and(collect($cycle->document_manifest)->where('missing', true))->toHaveCount(1)
        ->and($member->fresh()->customer_nid_photo_path)->toBe('admissions/missing-nid.pdf');
});

it('applies explicit admission clears to nested guarantors and saved working forms', function () {
    extract(renewalContext());
    $source->update(['guarantor_info' => ['guarantor_name' => 'Old Guarantor', 'guarantors' => [['guarantor_name' => 'Old Guarantor', 'guarantor_mobile' => '01722222222']]]]);
    [$cycle] = app(CycleRenewalService::class)->start($member, $user);
    $cycle->admission->update(['mobile_number' => null, 'guarantor_name' => 'New Guarantor', 'guarantor_mobile' => null]);
    $cycle->update(['admission_snapshot' => $cycle->admission->load(CycleRenewalService::ADMISSION_RELATIONS)->toArray()]);
    $cycle = app(CycleRenewalService::class)->selectLoan($cycle, $product->id, $category->id, 50000, $cycle->revision);
    expect($cycle->loan->guarantor_info['guarantors'][0]['guarantor_name'])->toBe('New Guarantor')
        ->and($cycle->loan->guarantor_info['guarantors'][0]['guarantor_mobile'])->toBe('')
        ->and($cycle->loan->loan_agreement_data['mobile_number'])->toBe('');
});

it('shows the original form through a cycle wrapper with the exact application and revision', function () {
    extract(renewalContext());
    [$cycle] = app(CycleRenewalService::class)->start($member, $user);
    $cycle = app(CycleRenewalService::class)->selectLoan($cycle, $product->id, $category->id, 10000, $cycle->revision);
    $this->actingAs($user)->get('/member/cycle-hub/renewals/'.$cycle->id.'/forms/1', ['X-Inertia' => 'true'])
        ->assertOk()->assertJsonPath('component', 'Member/CycleHub/LoanForm')
        ->assertJsonPath('props.existingApplication.id', $cycle->loan_id)
        ->assertJsonPath('props.member.id', $cycle->admission_id)->assertJsonPath('props.revision', $cycle->revision);
    $this->actingAs($user)->get('/member/cycle-hub/renewals/'.$cycle->id.'/print', ['X-Inertia' => 'true'])
        ->assertOk()->assertJsonPath('component', 'Member/CycleHub/CyclePrint')->assertJsonPath('props.number', 8);
});

it('never guesses which master to clone when a legacy member code is ambiguous', function () {
    extract(renewalContext());
    $duplicate = $member->replicate();
    $duplicate->save();
    expect(fn () => app(CycleRenewalService::class)->start($member, $user))->toThrow(ValidationException::class);
    expect(MemberLoanCycle::count())->toBe(0)->and(MemberAdmission::count())->toBe(2);
});

it('suppresses read hydration only for managed cycles and restores the normal service', function () {
    extract(renewalContext());
    [$cycle] = app(CycleRenewalService::class)->start($member, $user);
    $cycle = app(CycleRenewalService::class)->selectLoan($cycle, $product->id, $category->id, 10000, $cycle->revision);
    $original = Mockery::mock(LoanApplicationCloneService::class);
    $original->shouldReceive('cloneAndMerge')->once()->with($source)->andReturn(true);
    app()->instance(LoanApplicationCloneService::class, $original);
    $middleware = app(PreserveCycleLoanContext::class);
    $request = Request::create('/', 'GET', ['application_id' => $cycle->loan_id]);
    $request->setUserResolver(fn () => $user);
    $response = $middleware->handle($request, fn () => response()->json(['hydrated' => app(LoanApplicationCloneService::class)->cloneAndMerge($source)]));
    expect($response->getData(true)['hydrated'])->toBeFalse()
        ->and(app(LoanApplicationCloneService::class))->toBe($original);
    $normal = Request::create('/', 'GET', ['application_id' => $source->id]);
    $normal->setUserResolver(fn () => $user);
    $response = $middleware->handle($normal, fn () => response()->json(['hydrated' => app(LoanApplicationCloneService::class)->cloneAndMerge($source)]));
    expect($response->getData(true)['hydrated'])->toBeTrue();
});

it('preserves approval and disbursement navigation when opening an existing cycle form', function () {
    extract(renewalContext());
    [$cycle] = app(CycleRenewalService::class)->start($member, $user);
    $cycle = app(CycleRenewalService::class)->selectLoan($cycle, $product->id, $category->id, 50000, $cycle->revision);
    $url = '/member/loan-applications/forms/guarantor-commitment?application_id='.$cycle->loan_id.'&action=disburse&return=disburse&resume_approval_id=9';
    $response = $this->actingAs($user)->get($url);
    $response->assertRedirect();
    expect($response->headers->get('Location'))->toContain('/renewals/'.$cycle->id.'/forms/2')
        ->toContain('action=disburse')->toContain('return=disburse')->toContain('resume_approval_id=9');
});

it('keeps cycle installment amounts consistent with the existing per-thousand schedule', function () {
    extract(renewalContext());
    $product->update(['number_of_installments' => 10, 'installment_amount_per_thousand' => 110, 'last_installment_per_thousand' => 110]);
    [$cycle] = app(CycleRenewalService::class)->start($member, $user);
    $cycle = app(CycleRenewalService::class)->selectLoan($cycle, $product->id, $category->id, 10000, $cycle->revision);
    expect((float) $cycle->loan->installment_amount)->toBe(1100.0)
        ->and((float) $cycle->loan->loan_agreement_data['last_installment_amount'])->toBe(1100.0)
        ->and((float) $cycle->loan->loan_agreement_data['total_amount'])->toBe(11000.0);
});

it('rejects resubmitting an old rejected cycle when another regular draft exists', function () {
    extract(renewalContext());
    [$cycle] = app(CycleRenewalService::class)->start($member, $user);
    $cycle = app(CycleRenewalService::class)->selectLoan($cycle, $product->id, $category->id, 10000, $cycle->revision);
    $cycle->loan->update(['status' => 'rejected']);
    LoanApplication::create(['application_no' => 'LN-OTHER-DRAFT', 'member_admission_id' => $member->id, 'branch_id' => $branch->id, 'loan_product_id' => $product->id, 'loan_category_id' => $category->id, 'status' => 'draft']);
    $this->actingAs($user)->patch('/member/loan-applications/'.$cycle->loan_id.'/submit', ['cycle_revision' => $cycle->revision])->assertStatus(422);
    expect($cycle->loan->fresh()->status)->toBe('rejected');
});

it('preserves saved current-cycle signatures when admission is continued without changes', function () {
    extract(renewalContext());
    [$cycle] = app(CycleRenewalService::class)->start($member, $user);
    $cycle = app(CycleRenewalService::class)->selectLoan($cycle, $product->id, $category->id, 10000, $cycle->revision);
    $agreement = LoanFormVisibility::markUserSaved([...$cycle->loan->loan_agreement_data, 'applicant_signature_image' => 'data:image/png;base64,CURRENT']);
    $cycle->loan->update(['loan_agreement_data' => $agreement]);
    $this->actingAs($user)->post('/member/cycle-hub/renewals/'.$cycle->id.'/admission', ['revision' => $cycle->revision, 'continue' => true])->assertSessionHasNoErrors()->assertRedirect();
    expect($cycle->loan->fresh()->loan_agreement_data['applicant_signature_image'])->toBe('data:image/png;base64,CURRENT')
        ->and(LoanFormVisibility::buildFormSavedMap($cycle->loan->fresh())[1])->toBeTrue();
});
