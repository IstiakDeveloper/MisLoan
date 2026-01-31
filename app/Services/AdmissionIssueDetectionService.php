<?php

namespace App\Services;

use App\Models\ApplicationIssue;
use App\Models\AdmissionMember;
use Illuminate\Support\Facades\Log;

class AdmissionIssueDetectionService
{
    /**
     * Detect issues in an admission member
     */
    public function detectIssues(AdmissionMember $member)
    {
        $issues = [];

        // Check 1: Missing NID Images
        if (!$member->nid_front_image || !$member->nid_back_image) {
            $issues[] = [
                'type' => 'missing_nid',
                'description' => 'NID card images not uploaded',
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

        // Check 3: Missing Member Name
        if (!$member->member_name || trim($member->member_name) === '') {
            $issues[] = [
                'type' => 'missing_member_name',
                'description' => 'Member name is required',
                'severity' => 'critical',
            ];
        }

        // Check 4: Invalid Income (should be numeric)
        if ($member->family_monthly_income && !is_numeric($member->family_monthly_income)) {
            $issues[] = [
                'type' => 'invalid_income',
                'description' => 'Monthly income must be a valid number',
                'severity' => 'warning',
            ];
        }

        // Check 5: Income too low (less than 2000)
        if ($member->family_monthly_income && $member->family_monthly_income < 2000) {
            $issues[] = [
                'type' => 'income_mismatch',
                'description' => 'Monthly income seems too low (< 2000)',
                'severity' => 'warning',
            ];
        }

        // Check 6: Missing Guarantor
        if (!$member->guarantor_name || trim($member->guarantor_name) === '') {
            $issues[] = [
                'type' => 'missing_guarantor',
                'description' => 'Guarantor name is required',
                'severity' => 'warning',
            ];
        }

        // Check 7: Total land vs cultivable land
        if ($member->total_land && $member->cultivable_land && $member->cultivable_land > $member->total_land) {
            $issues[] = [
                'type' => 'land_mismatch',
                'description' => 'Cultivable land cannot be greater than total land',
                'severity' => 'critical',
            ];
        }

        // Check 8: Missing Society Name
        if (!$member->society_name || trim($member->society_name) === '') {
            $issues[] = [
                'type' => 'missing_society',
                'description' => 'Society name is required',
                'severity' => 'info',
            ];
        }

        return $issues;
    }

    /**
     * Create issues for a member
     */
    public function createIssuesForMember(AdmissionMember $member, $created_by_user_id)
    {
        $detectedIssues = $this->detectIssues($member);

        foreach ($detectedIssues as $issue) {
            // Check if this issue already exists
            $existingIssue = ApplicationIssue::where('application_type', 'admission')
                ->where('member_id', $member->id)
                ->where('issue_type', $issue['type'])
                ->where('status', '!=', 'resolved')
                ->first();

            if (!$existingIssue) {
                ApplicationIssue::create([
                    'application_type' => 'admission',
                    'application_id' => $member->member_admission_id,
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
     * Get all issues for an admission member
     */
    public function getIssuesForMember($member_id)
    {
        return ApplicationIssue::where('application_type', 'admission')
            ->where('member_id', $member_id)
            ->orderBy('severity', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Get open issues for an admission
     */
    public function getOpenIssuesForAdmission($admission_id)
    {
        return ApplicationIssue::where('application_type', 'admission')
            ->where('application_id', $admission_id)
            ->where('status', 'open')
            ->get();
    }
}
