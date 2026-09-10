<?php

namespace Tests\Unit;

use App\Models\LoanApplication;
use App\Models\Role;
use App\Support\LoanFormVisibility;
use Tests\TestCase;

class LoanFormVisibilityTest extends TestCase
{
    private function weeklyProduct(): object
    {
        return (object) [
            'installment_type' => 'weekly',
            'product_code' => 'JAG',
            'product_name' => 'Jagoron',
            'product_name_bn' => '',
        ];
    }

    public function test_branch_user_can_edit_all_visible_forms_before_disbursement(): void
    {
        $product = $this->weeklyProduct();
        $amount = 50000.0;

        $editable = LoanFormVisibility::editableFormIdsForUser(
            Role::BRANCH_USER,
            LoanApplication::STATUS_PENDING_HEAD_OFFICE,
            $product,
            $amount
        );

        $visible = LoanFormVisibility::visibleFormIdsForShow(
            Role::BRANCH_USER,
            LoanApplication::STATUS_PENDING_HEAD_OFFICE,
            $product,
            $amount
        );

        $this->assertNotEmpty($visible);
        $this->assertEqualsCanonicalizing($visible, $editable);
        $this->assertContains(1, $editable);
        $this->assertContains(2, $editable);
        $this->assertContains(3, $editable);
        $this->assertContains(4, $editable);
    }

    public function test_branch_user_can_edit_forms_while_pending_disbursement(): void
    {
        $product = $this->weeklyProduct();
        $amount = 50000.0;

        $editable = LoanFormVisibility::editableFormIdsForUser(
            Role::BRANCH_USER,
            LoanApplication::STATUS_PENDING_DISBURSEMENT,
            $product,
            $amount
        );

        $this->assertContains(1, $editable);
        $this->assertContains(2, $editable);
        $this->assertContains(3, $editable);
        $this->assertContains(4, $editable);
    }

    public function test_branch_user_cannot_edit_forms_after_disbursement(): void
    {
        $editable = LoanFormVisibility::editableFormIdsForUser(
            Role::BRANCH_USER,
            LoanApplication::STATUS_DISBURSED,
            $this->weeklyProduct(),
            50000.0
        );

        $this->assertSame([], $editable);
    }

    public function test_branch_manager_can_edit_all_forms_before_approve_including_guarantor_and_death_risk(): void
    {
        $product = $this->weeklyProduct();
        $amount = 50000.0;

        foreach ([LoanApplication::STATUS_DRAFT, LoanApplication::STATUS_SUBMITTED, LoanApplication::STATUS_UNDER_REVIEW] as $status) {
            $editable = LoanFormVisibility::editableFormIdsForUser(
                Role::BRANCH_MANAGER,
                $status,
                $product,
                $amount
            );
            $visible = LoanFormVisibility::visibleFormIdsForShow(
                Role::BRANCH_MANAGER,
                $status,
                $product,
                $amount
            );

            $this->assertEqualsCanonicalizing($visible, $editable, "BM should edit all visible forms at {$status}");
            $this->assertContains(1, $editable);
            $this->assertContains(2, $editable);
            $this->assertContains(3, $editable);
            $this->assertContains(4, $editable);
        }
    }

    public function test_branch_manager_cannot_edit_all_forms_after_forwarding_to_head_office(): void
    {
        $editable = LoanFormVisibility::editableFormIdsForUser(
            Role::BRANCH_MANAGER,
            LoanApplication::STATUS_READY_FOR_HEAD_OFFICE,
            $this->weeklyProduct(),
            50000.0
        );

        $this->assertSame([], $editable);
    }

    public function test_next_disburse_form_id_returns_first_unsaved_form(): void
    {
        $amount = 50000.0;

        $this->assertSame(2, LoanFormVisibility::nextDisburseFormId([
            2 => false,
            3 => false,
        ], $amount));
        $this->assertSame(3, LoanFormVisibility::nextDisburseFormId([
            2 => true,
            3 => false,
        ], $amount));
        $this->assertNull(LoanFormVisibility::nextDisburseFormId([
            2 => true,
            3 => true,
        ], $amount));
        $this->assertSame(2, LoanFormVisibility::nextDisburseFormId([], $amount));
    }

    public function test_loans_below_twenty_thousand_hide_guarantor_form(): void
    {
        $product = $this->weeklyProduct();
        $amount = 19999.0;

        $visible = LoanFormVisibility::visibleFormIdsForShow(
            Role::BRANCH_USER,
            LoanApplication::STATUS_PENDING_DISBURSEMENT,
            $product,
            $amount
        );

        $this->assertFalse(LoanFormVisibility::requiresGuarantorForm($amount));
        $this->assertSame([3], LoanFormVisibility::disburseFormIds($amount));
        $this->assertNotContains(2, $visible);
        $this->assertContains(1, $visible);
        $this->assertContains(3, $visible);
        $this->assertContains(4, $visible);
        $this->assertSame(3, LoanFormVisibility::nextDisburseFormId([], $amount));
        $this->assertNull(LoanFormVisibility::nextDisburseFormId([3 => true], $amount));
        $this->assertSame(
            'বিতরণের আগে মৃত্যুঝুঁকি তহবিল (ফর্ম ৩) পূরণ করতে হবে।',
            LoanFormVisibility::disburseIncompleteMessage($amount)
        );
    }

    public function test_loans_of_twenty_thousand_or_more_still_require_guarantor_form(): void
    {
        $product = $this->weeklyProduct();

        foreach ([20000.0, 25000.0] as $amount) {
            $visible = LoanFormVisibility::visibleFormIdsForShow(
                Role::BRANCH_USER,
                LoanApplication::STATUS_PENDING_DISBURSEMENT,
                $product,
                $amount
            );

            $this->assertTrue(LoanFormVisibility::requiresGuarantorForm($amount));
            $this->assertSame([2, 3], LoanFormVisibility::disburseFormIds($amount));
            $this->assertContains(2, $visible);
            $this->assertContains(3, $visible);
            $this->assertSame(2, LoanFormVisibility::nextDisburseFormId([], $amount));
        }
    }

    public function test_monthly_loan_below_twenty_thousand_hides_guarantor_form(): void
    {
        $product = (object) [
            'installment_type' => 'monthly',
            'product_code' => 'AGR',
            'product_name' => 'Agrosor',
            'product_name_bn' => '',
        ];
        $amount = 15000.0;

        $visible = LoanFormVisibility::visibleFormIdsForShow(
            Role::BRANCH_USER,
            LoanApplication::STATUS_DRAFT,
            $product,
            $amount
        );

        $this->assertEqualsCanonicalizing([5, 3, 4], $visible);
        $this->assertNotContains(2, $visible);
    }

    public function test_branch_manager_at_pending_disbursement_skips_guarantor_below_twenty_thousand(): void
    {
        $editable = LoanFormVisibility::editableFormIdsForUser(
            Role::BRANCH_MANAGER,
            LoanApplication::STATUS_PENDING_DISBURSEMENT,
            $this->weeklyProduct(),
            15000.0
        );

        $this->assertEqualsCanonicalizing([3], $editable);
    }

    public function test_disburse_wizard_sends_form_two_save_to_form_three(): void
    {
        $next = LoanFormVisibility::disburseWizardNextLocation(2, 41, [
            'member_id' => 9,
            'product_id' => 3,
            'category_id' => 2,
            'amount' => 50000,
        ]);

        $this->assertSame('member.loan-applications.forms.death-risk-fund', $next['route']);
        $this->assertSame(41, $next['parameters']['application_id']);
        $this->assertSame('disburse', $next['parameters']['action']);
        $this->assertSame(3, $next['parameters']['step']);
        $this->assertSame(9, $next['parameters']['member_id']);
    }

    public function test_disburse_wizard_sends_form_three_save_to_show_page(): void
    {
        $next = LoanFormVisibility::disburseWizardNextLocation(3, 41);

        $this->assertSame('member.loan-applications.show', $next['route']);
        $this->assertSame(41, $next['parameters']['id']);
        $this->assertSame('disburse', $next['parameters']['action']);
    }

    public function test_branch_manager_at_pending_disbursement_only_gets_disburse_forms(): void
    {
        $editable = LoanFormVisibility::editableFormIdsForUser(
            Role::BRANCH_MANAGER,
            LoanApplication::STATUS_PENDING_DISBURSEMENT,
            $this->weeklyProduct(),
            50000.0
        );

        $this->assertEqualsCanonicalizing([2, 3], $editable);
    }

    public function test_field_officer_at_draft_still_only_gets_submit_forms(): void
    {
        $editable = LoanFormVisibility::editableFormIdsForUser(
            Role::FIELD_OFFICER,
            LoanApplication::STATUS_DRAFT,
            $this->weeklyProduct(),
            50000.0
        );

        $this->assertEqualsCanonicalizing([1], $editable);
    }

    public function test_branch_user_can_edit_loan_details_until_head_office(): void
    {
        foreach ([
            LoanApplication::STATUS_DRAFT,
            LoanApplication::STATUS_SUBMITTED,
            LoanApplication::STATUS_UNDER_REVIEW,
            LoanApplication::STATUS_READY_FOR_HEAD_OFFICE,
            LoanApplication::STATUS_NEEDS_CORRECTION,
        ] as $status) {
            $this->assertTrue(
                LoanFormVisibility::canEditLoanDetails(Role::BRANCH_USER, $status),
                "Branch user should edit loan details at {$status}"
            );
        }
    }

    public function test_branch_user_cannot_edit_loan_details_after_sent_to_head_office(): void
    {
        foreach ([
            LoanApplication::STATUS_PENDING_HEAD_OFFICE,
            LoanApplication::STATUS_APPROVED,
            LoanApplication::STATUS_PENDING_DISBURSEMENT,
            LoanApplication::STATUS_DISBURSED,
            LoanApplication::STATUS_CANCELLED,
        ] as $status) {
            $this->assertFalse(
                LoanFormVisibility::canEditLoanDetails(Role::BRANCH_USER, $status),
                "Branch user should not edit loan details at {$status}"
            );
        }
    }

    public function test_field_officer_can_edit_loan_details_only_before_submit(): void
    {
        $this->assertTrue(LoanFormVisibility::canEditLoanDetails(Role::FIELD_OFFICER, LoanApplication::STATUS_DRAFT));
        $this->assertTrue(LoanFormVisibility::canEditLoanDetails(Role::FIELD_OFFICER, LoanApplication::STATUS_NEEDS_CORRECTION));
        $this->assertFalse(LoanFormVisibility::canEditLoanDetails(Role::FIELD_OFFICER, LoanApplication::STATUS_SUBMITTED));
        $this->assertFalse(LoanFormVisibility::canEditLoanDetails(Role::FIELD_OFFICER, LoanApplication::STATUS_READY_FOR_HEAD_OFFICE));
    }

    public function test_privileged_user_can_edit_loan_details_at_any_status(): void
    {
        $this->assertTrue(LoanFormVisibility::canEditLoanDetails(Role::BRANCH_USER, LoanApplication::STATUS_PENDING_HEAD_OFFICE, true));
        $this->assertTrue(LoanFormVisibility::canEditLoanDetails(Role::HEAD_OFFICE, LoanApplication::STATUS_DISBURSED, true));
    }

    public function test_loan_details_denied_message_explains_head_office_lock(): void
    {
        $this->assertSame(
            'আবেদনটি হেড অফিসে পাঠানোর পর শাখা থেকে ঋণ বিবরণ পরিবর্তন করা যাবে না।',
            LoanFormVisibility::loanDetailsDeniedMessage(LoanApplication::STATUS_PENDING_HEAD_OFFICE)
        );
    }

    public function test_switching_weekly_to_monthly_product_changes_required_forms(): void
    {
        $weekly = $this->weeklyProduct();
        $monthly = (object) [
            'installment_type' => 'monthly',
            'product_code' => 'AGR',
            'product_name' => 'Agrosor',
            'product_name_bn' => '',
        ];
        $amount = 50000.0;

        $weeklyForms = LoanFormVisibility::visibleFormIdsForShow(
            Role::BRANCH_USER,
            LoanApplication::STATUS_SUBMITTED,
            $weekly,
            $amount
        );
        $monthlyForms = LoanFormVisibility::visibleFormIdsForShow(
            Role::BRANCH_USER,
            LoanApplication::STATUS_SUBMITTED,
            $monthly,
            $amount
        );

        $this->assertContains(1, $weeklyForms);
        $this->assertNotContains(5, $weeklyForms);
        $this->assertContains(5, $monthlyForms);
        $this->assertNotContains(1, $monthlyForms);
    }

    public function test_primary_form_type_matches_create_rules(): void
    {
        $weekly = $this->weeklyProduct();
        $monthly = (object) [
            'installment_type' => 'monthly',
            'product_code' => 'AGR',
            'product_name' => 'Agrosor',
            'product_name_bn' => '',
        ];
        $sufolonCategory = (object) [
            'category_code' => 'SFL',
            'category_name' => 'Sufolon',
            'category_name_bn' => 'সুফলন',
        ];

        $this->assertSame('loan_agreement', LoanFormVisibility::primaryFormType($weekly, 50000.0));
        $this->assertSame('loan_application_approval', LoanFormVisibility::primaryFormType($monthly, 50000.0));
        $this->assertSame('loan_agreement', LoanFormVisibility::primaryFormType($weekly, 50000.0, $sufolonCategory));
        $this->assertSame('loan_application_approval', LoanFormVisibility::primaryFormType($weekly, 100000.0, $sufolonCategory));
    }

    public function test_switching_to_monthly_product_clears_loan_agreement_form_column(): void
    {
        $monthly = (object) [
            'installment_type' => 'monthly',
            'product_code' => 'AGR',
            'product_name' => 'Agrosor',
            'product_name_bn' => '',
        ];
        $visible = LoanFormVisibility::visibleFormIdsForShow(
            Role::BRANCH_USER,
            LoanApplication::STATUS_SUBMITTED,
            $monthly,
            50000.0
        );

        $this->assertContains('loan_agreement_data', LoanFormVisibility::formColumnsToClear($visible));
        $this->assertNotContains('business_plan', LoanFormVisibility::formColumnsToClear($visible));
        $this->assertNotContains(1, $visible);
        $this->assertContains(5, $visible);
    }

    public function test_agrosor_two_lakh_uses_application_form_not_agreement(): void
    {
        $monthly = (object) [
            'installment_type' => 'monthly',
            'product_code' => 'AGR',
            'product_name' => 'Agrosor',
            'product_name_bn' => 'আগ্রসর',
        ];
        $visible = LoanFormVisibility::visibleFormIdsForShow(
            Role::FIELD_OFFICER,
            LoanApplication::STATUS_DRAFT,
            $monthly,
            200000.0
        );

        $this->assertSame([5], LoanFormVisibility::foSubmitFormIds($monthly, 200000.0));
        $this->assertSame('loan_application_approval', LoanFormVisibility::primaryFormType($monthly, 200000.0));
        $this->assertContains(5, $visible);
        $this->assertNotContains(1, $visible);
        $this->assertNotContains(4, $visible);
        $this->assertContains('loan_agreement_data', LoanFormVisibility::formColumnsToClear($visible));
        $this->assertContains('asset_info', LoanFormVisibility::formColumnsToClear($visible));
    }

    public function test_switching_below_guarantor_threshold_clears_guarantor_form_column(): void
    {
        $visible = LoanFormVisibility::visibleFormIdsForShow(
            Role::BRANCH_USER,
            LoanApplication::STATUS_DRAFT,
            $this->weeklyProduct(),
            15000.0
        );

        $this->assertContains('guarantor_info', LoanFormVisibility::formColumnsToClear($visible));
        $this->assertNotContains('nominee_info', LoanFormVisibility::formColumnsToClear($visible));
        $this->assertNotContains(2, $visible);
        $this->assertContains(3, $visible);
    }

    public function test_overlay_updates_saved_loan_agreement_even_when_already_filled(): void
    {
        $product = (object) [
            'installment_type' => 'weekly',
            'product_code' => 'JAG',
            'product_name' => 'Jagoron',
            'product_name_bn' => 'জাগরণ',
            'interest_rate' => 12.5,
        ];
        $category = (object) [
            'category_code' => 'JAG',
            'category_name' => 'Jagoron',
            'category_name_bn' => 'জাগরণ',
        ];

        $updated = LoanFormVisibility::overlaySavedFormLoanTerms(
            1,
            [
                'member_name_bn' => 'রহিমা',
                'loan_product_name' => 'পুরনো পণ্য',
                'loan_category_name' => 'পুরনো ক্যাটাগরি',
                'loan_amount' => 10000,
                'field_officer_pin' => '1234',
            ],
            $product,
            $category,
            50000.0,
            46,
            12,
            6250.0,
            56250.0,
            1223.0,
            'পঞ্চাশ হাজার টাকা',
            'ছাপ্পান্ন হাজার দুইশত পঞ্চাশ টাকা',
            'ব্যবসা সম্প্রসারণ'
        );

        $this->assertSame('রহিমা', $updated['member_name_bn']);
        $this->assertSame('1234', $updated['field_officer_pin']);
        $this->assertSame('জাগরণ', $updated['loan_product_name']);
        $this->assertSame('জাগরণ', $updated['loan_category_name']);
        $this->assertSame(50000.0, $updated['loan_amount']);
        $this->assertSame(46, $updated['number_of_installments']);
        $this->assertSame('ব্যবসা সম্প্রসারণ', $updated['loan_purpose']);
    }

    public function test_overlay_updates_saved_approval_form_amount_and_category(): void
    {
        $product = (object) [
            'installment_type' => 'monthly',
            'product_code' => 'AGR',
            'product_name' => 'Agrosor',
            'product_name_bn' => 'আগ্রসর',
            'interest_rate' => 18,
        ];
        $category = (object) [
            'category_code' => 'AGR',
            'category_name' => 'Agrosor',
            'category_name_bn' => 'আগ্রসর',
        ];

        $updated = LoanFormVisibility::overlaySavedFormLoanTerms(
            5,
            [
                'member_name_detail' => 'করিম',
                'applied_loan_amount' => '20000',
                'capital_applied_loan' => '20000',
                'category_name' => 'জাগরণ',
            ],
            $product,
            $category,
            80000.0,
            12,
            12,
            14400.0,
            94400.0,
            7867.0,
            'আশি হাজার টাকা',
            'চুরাশি হাজার চারশত টাকা',
            null
        );

        $this->assertSame('করিম', $updated['member_name_detail']);
        $this->assertSame('80000', $updated['applied_loan_amount']);
        $this->assertSame('80000', $updated['capital_applied_loan']);
        $this->assertSame('আগ্রসর', $updated['category_name']);
    }
}
