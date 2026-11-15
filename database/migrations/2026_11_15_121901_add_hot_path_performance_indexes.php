<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->addIndex('member_admissions', ['branch_id', 'status'], 'member_admissions_branch_status_idx');
        $this->addIndex('member_admissions', ['status', 'submitted_at'], 'member_admissions_status_submitted_idx');
        $this->addIndex('member_admissions', ['branch_id', 'created_at'], 'member_admissions_branch_created_idx');

        $this->addIndex('loan_applications', ['branch_id', 'status'], 'loan_applications_branch_status_idx');
        $this->addIndex('loan_applications', ['reviewed_at'], 'loan_applications_reviewed_at_idx');

        $this->addIndex('loan_application_approvals', ['user_id', 'status'], 'loan_approvals_user_status_idx');
        $this->addIndex('loan_application_approvals', ['loan_application_id', 'sequence', 'status'], 'loan_approvals_sequence_status_idx');

        $this->addIndex('member_admission_issues', ['member_admission_id', 'status'], 'admission_issues_parent_status_idx');
        $this->addIndex('member_admission_issues', ['zm_approved_at'], 'admission_issues_zm_approved_idx');

        $this->addIndex('loan_application_issues', ['loan_application_id', 'status'], 'loan_issues_parent_status_idx');
        $this->addIndex('loan_application_issues', ['zm_approved_at'], 'loan_issues_zm_approved_idx');

        $this->addIndex('notifications', ['user_id', 'is_read'], 'notifications_user_read_idx');
        $this->addIndex('notifications', ['user_id', 'created_at'], 'notifications_user_created_idx');
    }

    public function down(): void
    {
        $this->dropIndex('member_admissions', 'member_admissions_branch_status_idx');
        $this->dropIndex('member_admissions', 'member_admissions_status_submitted_idx');
        $this->dropIndex('member_admissions', 'member_admissions_branch_created_idx');
        $this->dropIndex('loan_applications', 'loan_applications_branch_status_idx');
        $this->dropIndex('loan_applications', 'loan_applications_reviewed_at_idx');
        $this->dropIndex('loan_application_approvals', 'loan_approvals_user_status_idx');
        $this->dropIndex('loan_application_approvals', 'loan_approvals_sequence_status_idx');
        $this->dropIndex('member_admission_issues', 'admission_issues_parent_status_idx');
        $this->dropIndex('member_admission_issues', 'admission_issues_zm_approved_idx');
        $this->dropIndex('loan_application_issues', 'loan_issues_parent_status_idx');
        $this->dropIndex('loan_application_issues', 'loan_issues_zm_approved_idx');
        $this->dropIndex('notifications', 'notifications_user_read_idx');
        $this->dropIndex('notifications', 'notifications_user_created_idx');
    }

    /**
     * @param  list<string>  $columns
     */
    private function addIndex(string $table, array $columns, string $name): void
    {
        if (! Schema::hasTable($table) || $this->hasIndex($table, $name)) {
            return;
        }

        foreach ($columns as $column) {
            if (! Schema::hasColumn($table, $column)) {
                return;
            }
        }

        Schema::table($table, function (Blueprint $blueprint) use ($columns, $name) {
            $blueprint->index($columns, $name);
        });
    }

    private function dropIndex(string $table, string $name): void
    {
        if (! Schema::hasTable($table) || ! $this->hasIndex($table, $name)) {
            return;
        }

        Schema::table($table, function (Blueprint $blueprint) use ($name) {
            $blueprint->dropIndex($name);
        });
    }

    private function hasIndex(string $table, string $name): bool
    {
        foreach (Schema::getIndexes($table) as $index) {
            if (($index['name'] ?? '') === $name) {
                return true;
            }
        }

        return false;
    }
};
