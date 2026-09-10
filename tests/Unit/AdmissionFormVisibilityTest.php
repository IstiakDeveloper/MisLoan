<?php

namespace Tests\Unit;

use App\Models\Role;
use App\Support\AdmissionFormVisibility;
use Tests\TestCase;

class AdmissionFormVisibilityTest extends TestCase
{
    public function test_branch_user_can_edit_admission_before_loan_disbursement(): void
    {
        foreach (['draft', 'submitted', 'under_review', 'ready_for_head_office', 'pending_head_office', 'approved', 'needs_revision', 'rejected'] as $status) {
            $this->assertTrue(
                AdmissionFormVisibility::canEditAdmissionForm(Role::BRANCH_USER, $status, false),
                "Branch user should edit admission while status is {$status} and no disbursed loan"
            );
        }
    }

    public function test_branch_user_cannot_edit_admission_after_loan_disbursement(): void
    {
        $this->assertFalse(
            AdmissionFormVisibility::canEditAdmissionForm(Role::BRANCH_USER, 'approved', true)
        );
    }

    public function test_field_officer_cannot_edit_approved_or_pending_head_office_admissions(): void
    {
        $this->assertFalse(
            AdmissionFormVisibility::canEditAdmissionForm(Role::FIELD_OFFICER, 'approved', false)
        );
        $this->assertFalse(
            AdmissionFormVisibility::canEditAdmissionForm(Role::FIELD_OFFICER, 'pending_head_office', false)
        );
        $this->assertTrue(
            AdmissionFormVisibility::canEditAdmissionForm(Role::FIELD_OFFICER, 'draft', false)
        );
    }

    public function test_field_officer_can_edit_cycle_renewal_or_legacy_before_loan_disbursement(): void
    {
        $this->assertTrue(
            AdmissionFormVisibility::canEditAdmissionForm(Role::FIELD_OFFICER, 'approved', false, false, true),
            'Field officer should be able to edit approved cycle renewal before loan is disbursed'
        );
        $this->assertTrue(
            AdmissionFormVisibility::canEditAdmissionForm(Role::FIELD_OFFICER, 'draft', false, false, true),
            'Field officer should be able to edit draft cycle renewal'
        );
        $this->assertFalse(
            AdmissionFormVisibility::canEditAdmissionForm(Role::FIELD_OFFICER, 'approved', true, false, true),
            'Field officer cannot edit after loan is disbursed even on cycle renewal'
        );
    }

    public function test_head_office_can_edit_after_disbursement(): void
    {
        $this->assertTrue(
            AdmissionFormVisibility::canEditAdmissionForm(Role::HEAD_OFFICE, 'approved', true, true)
        );
    }
}
