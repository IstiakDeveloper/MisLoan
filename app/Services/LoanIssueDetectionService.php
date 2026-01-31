<?php

namespace App\Services;

use App\Models\ApplicationIssue;
use App\Models\LoanMember;

class LoanIssueDetectionService
{
    /**
     * Detect issues in a loan member
     */
    public function detectIssues(LoanMember $member)
    {
        $issues = [];

        // Check 1: Missing Member Name
        if (!$member->member_name || trim($member->member_name) === '') {
            $issues[] = [
                'type' => 'missing_member_name',
                'description' => 'Member name is required',
                'severity' => 'critical',
            ];
        }

        // Check 2: Missing Mobile Number
        if (!$member->mobile || trim($member->mobile) === '') {
            $issues[] = [
                'type' => 'missing_mobile',
                'description' => 'Mobile number is required',
                'severity' => 'critical',
            ];
        }

        // Check 3: Invalid Approved Loan Amount
        if (!$member->approved_loan_amount || !is_numeric($member->approved_loan_amount) || $member->approved_loan_amount <= 0) {
            $issues[] = [
                'type' => 'invalid_loan_amount',
                'description' => 'Approved loan amount must be a valid positive number',
                'severity' => 'critical',
            ];
        }

        // Check 4: Invalid Duration
        if (!$member->loan_duration || !is_numeric($member->loan_duration) || $member->loan_duration <= 0) {
            $issues[] = [
                'type' => 'invalid_duration',
                'description' => 'Loan duration must be a valid positive number',
                'severity' => 'critical',
            ];
        }

        // Check 5: Missing Approval Date
        if (!$member->loan_release_or_approval_date) {
            $issues[] = [
                'type' => 'missing_approval_date',
                'description' => 'Loan approval date is required',
                'severity' => 'warning',
            ];
        }

        // Check 6: Installment mismatch (if installment_increment_rate exists)
        if ($member->approved_loan_amount && $member->loan_duration && $member->installment_increment_rate) {
            // Basic validation - can be enhanced based on business logic
            if ($member->installment_increment_rate < 0 || $member->installment_increment_rate > 100) {
                $issues[] = [
                    'type' => 'invalid_installment_rate',
                    'description' => 'Installment increment rate must be between 0 and 100',
                    'severity' => 'warning',
                ];
            }
        }

        // Check 7: Missing NID
        if (!$member->nid_number || trim($member->nid_number) === '') {
            $issues[] = [
                'type' => 'missing_nid',
                'description' => 'NID number is required',
                'severity' => 'warning',
            ];
        }

        // Check 8: Missing Loan Purpose
        if (!$member->loan_purpose || trim($member->loan_purpose) === '') {
            $issues[] = [
                'type' => 'missing_loan_purpose',
                'description' => 'Loan purpose is required',
                'severity' => 'info',
            ];
        }

        return $issues;
    }

    /**
     * Create issues for a member
     */
    public function createIssuesForMember(LoanMember $member, $created_by_user_id)
    {
        $detectedIssues = $this->detectIssues($member);

        foreach ($detectedIssues as $issue) {
            // Check if this issue already exists
            $existingIssue = ApplicationIssue::where('application_type', 'loan')
                ->where('member_id', $member->id)
                ->where('issue_type', $issue['type'])
                ->where('status', '!=', 'resolved')
                ->first();

            if (!$existingIssue) {
                ApplicationIssue::create([
                    'application_type' => 'loan',
                    'application_id' => $member->loan_application_id,
                    'member_id' => $member->id,
                    'issue_type' => $issue['type'],
                    'issue_description' => $issue['description'],
                    'severity' => $issue['severity'],
                    'status' => 'open',
                    'created_by' => $created_by_user_id,
                    'messages' => [
                        [
                            'user_id' => $created_by_user_id,
                            'user_name' => auth()->user()?->name ?? 'System',
                            'message' => 'Issue detected: ' . $issue['description'],
                            'type' => 'system',
                            'created_at' => now()->toIso8601String(),
                        ],
                    ],
                ]);
            }
        }

        return $detectedIssues;
    }

    /**
     * Get all issues for a loan member
     */
    public function getIssuesForMember($member_id)
    {
        return ApplicationIssue::where('application_type', 'loan')
            ->where('member_id', $member_id)
            ->orderBy('severity', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Get open issues for a loan application
     */
    public function getOpenIssuesForApplication($application_id)
    {
        return ApplicationIssue::where('application_type', 'loan')
            ->where('application_id', $application_id)
            ->where('status', 'open')
            ->get();
    }
}
