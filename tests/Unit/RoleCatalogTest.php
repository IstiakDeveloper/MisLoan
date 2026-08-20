<?php

namespace Tests\Unit;

use App\Support\RoleCatalog;
use Tests\TestCase;

class RoleCatalogTest extends TestCase
{
    public function test_sync_plan_adds_missing_permissions_without_removing_existing_ones(): void
    {
        $definition = collect(RoleCatalog::definitions())->firstWhere('name', 'branch_user');

        $plan = RoleCatalog::planExistingRoleUpdate(
            $definition,
            [
                'submit_loan_applications',
                'custom_branch_permission',
            ],
            'Custom Branch User Label',
            'Custom description kept as-is'
        );

        $this->assertContains('custom_branch_permission', $plan['updates']['permissions']);
        $this->assertContains('edit_loan_forms', $plan['updates']['permissions']);
        $this->assertContains('edit_admission_forms', $plan['updates']['permissions']);
        $this->assertContains('edit_loan_forms', $plan['missing_permissions']);
        $this->assertContains('edit_admission_forms', $plan['missing_permissions']);
        $this->assertArrayNotHasKey('display_name', $plan['updates']);
        $this->assertArrayNotHasKey('description', $plan['updates']);
    }

    public function test_sync_plan_is_empty_when_role_already_has_catalog_permissions(): void
    {
        $definition = collect(RoleCatalog::definitions())->firstWhere('name', 'branch_user');

        $plan = RoleCatalog::planExistingRoleUpdate(
            $definition,
            $definition['permissions'],
            'Branch User',
            'Branch user'
        );

        $this->assertSame([], $plan['updates']);
        $this->assertSame([], $plan['missing_permissions']);
    }

    public function test_summary_says_up_to_date_when_nothing_changed(): void
    {
        $message = RoleCatalog::summaryMessage([
            'created' => [],
            'permissions_added' => [],
            'unchanged' => ['branch_user'],
        ]);

        $this->assertSame('সব রোল ইতিমধ্যে আপ টু ডেট। কোনো পরিবর্তন হয়নি।', $message);
    }
}
