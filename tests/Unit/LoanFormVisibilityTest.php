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
        $this->assertSame(2, LoanFormVisibility::nextDisburseFormId([
            2 => false,
            3 => false,
        ]));
        $this->assertSame(3, LoanFormVisibility::nextDisburseFormId([
            2 => true,
            3 => false,
        ]));
        $this->assertNull(LoanFormVisibility::nextDisburseFormId([
            2 => true,
            3 => true,
        ]));
        $this->assertSame(2, LoanFormVisibility::nextDisburseFormId([]));
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
}
