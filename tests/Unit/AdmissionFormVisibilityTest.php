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

    public function test_head_office_can_edit_after_disbursement(): void
    {
        $this->assertTrue(
            AdmissionFormVisibility::canEditAdmissionForm(Role::HEAD_OFFICE, 'approved', true, true)
        );
    }
}
