<?php

namespace App\Http\Controllers;

use App\Models\ApplicationIssue;
use App\Models\MemberAdmission;
use App\Models\LoanApplication;
use App\Models\AdmissionMember;
use App\Models\LoanMember;
use App\Models\Zone;
use App\Models\Area;
use App\Models\Branch;
use App\Services\AdmissionIssueDetectionService;
use App\Services\LoanIssueDetectionService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class IssueProcessingController extends Controller
{
    protected $admissionIssueService;
    protected $loanIssueService;

    public function __construct(
        AdmissionIssueDetectionService $admissionIssueService,
        LoanIssueDetectionService $loanIssueService
    ) {
        $this->admissionIssueService = $admissionIssueService;
        $this->loanIssueService = $loanIssueService;
    }

    /**
     * Main Dashboard - Show Admission Members or Loan Members with Status
     */
    public function index(Request $request)
    {
        $selectedDate = $request->input('date', now()->toDateString());
        $searchMember = $request->input('search', null);
        $applicationType = $request->input('type', 'admission');

        // Get members submitted on selected date
        if ($applicationType === 'admission') {
            $query = AdmissionMember::with(['memberAdmission.branch.area.zone'])
                ->whereHas('memberAdmission', function ($q) use ($selectedDate) {
                    $q->whereDate('submitted_at', $selectedDate)
                      ->whereNotNull('submitted_at');
                });

            if ($searchMember) {
                $query->where(function ($q) use ($searchMember) {
                    $q->where('member_name', 'like', "%{$searchMember}%")
                      ->orWhere('nid', 'like', "%{$searchMember}%")
                      ->orWhere('mobile', 'like', "%{$searchMember}%");
                });
            }

            $members = $query->orderBy('created_at', 'desc')->get();
            $type = 'admission';
        } else {
            $query = LoanMember::with(['loanApplication.branch.area.zone'])
                ->whereHas('loanApplication', function ($q) use ($selectedDate) {
                    $q->whereDate('submitted_at', $selectedDate)
                      ->whereNotNull('submitted_at');
                });

            if ($searchMember) {
                $query->where(function ($q) use ($searchMember) {
                    $q->where('member_name', 'like', "%{$searchMember}%")
                      ->orWhere('nid', 'like', "%{$searchMember}%")
                      ->orWhere('mobile', 'like', "%{$searchMember}%");
                });
            }

            $members = $query->orderBy('created_at', 'desc')->get();
            $type = 'loan';
        }

        // Format members data with their info for simple display
        $membersData = $members->map(function ($member) use ($type) {
            $app = $type === 'admission' ? $member->memberAdmission : $member->loanApplication;
            return [
                'id' => $member->id,
                'member_name' => $member->member_name,
                'mobile' => $member->mobile,
                'nid' => $member->nid ?? '',
                'status' => $member->status,
                'application_no' => $app->application_no,
                'branch_name' => $app->branch?->name,
            ];
        });

        // Get statistics - based on member status
        if ($applicationType === 'admission') {
            $stats = [
                'today_admission' => AdmissionMember::whereHas('memberAdmission', function ($q) use ($selectedDate) {
                    $q->whereDate('submitted_at', $selectedDate)->whereNotNull('submitted_at');
                })->count(),
                'today_loan' => 0,
                'pending' => AdmissionMember::whereHas('memberAdmission', function ($q) use ($selectedDate) {
                    $q->whereDate('submitted_at', $selectedDate)->whereNotNull('submitted_at');
                })->where('status', 'pending')->count(),
                'approved' => AdmissionMember::whereHas('memberAdmission', function ($q) use ($selectedDate) {
                    $q->whereDate('submitted_at', $selectedDate)->whereNotNull('submitted_at');
                })->where('status', 'approved')->count(),
            ];
        } else {
            $stats = [
                'today_admission' => 0,
                'today_loan' => LoanMember::whereHas('loanApplication', function ($q) use ($selectedDate) {
                    $q->whereDate('submitted_at', $selectedDate)->whereNotNull('submitted_at');
                })->count(),
                'pending' => LoanMember::whereHas('loanApplication', function ($q) use ($selectedDate) {
                    $q->whereDate('submitted_at', $selectedDate)->whereNotNull('submitted_at');
                })->where('status', 'pending')->count(),
                'approved' => LoanMember::whereHas('loanApplication', function ($q) use ($selectedDate) {
                    $q->whereDate('submitted_at', $selectedDate)->whereNotNull('submitted_at');
                })->where('status', 'approved')->count(),
            ];
        }

        // Get zones, areas, branches for filter modal
        $zones = Zone::all()->toArray();
        $areas = Area::all()->toArray();
        $branches = Branch::all()->toArray();

        return Inertia::render('HeadOffice/IssueProcessing/Dashboard', [
            'members' => $membersData,
            'selectedDate' => $selectedDate,
            'applicationType' => $applicationType,
        ]);
    }

    /**
     * Get issues for a specific member (for modal view)
     */
    public function getMemberIssues(Request $request, $memberId)
    {
        $type = $request->input('type', 'admission');
        $applicationId = $request->input('application_id');

        try {
            // Get issues for this member with their messages
            $issues = ApplicationIssue::where('application_type', $type)
                ->where('member_id', $memberId)
                ->get()
                ->map(function ($issue) {
                    return [
                        'id' => $issue->id,
                        'issue_type' => $issue->issue_type,
                        'issue_description' => $issue->issue_description,
                        'severity' => $issue->severity,
                        'status' => $issue->status,
                        'messages' => $this->formatMessages($issue->messages ?? []),
                    ];
                });

            return response()->json([
                'success' => true,
                'issues' => $issues,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'issues' => [],
            ], 500);
        }
    }

    /**
     * Format messages for display (handles JSON messages)
     */
    private function formatMessages($messages)
    {
        if (empty($messages)) {
            return [];
        }

        if (is_string($messages)) {
            $messages = json_decode($messages, true) ?? [];
        }

        return array_map(function ($msg) {
            return [
                'id' => $msg['id'] ?? rand(),
                'message_type' => $msg['message_type'] ?? 'comment',
                'content' => $msg['message'] ?? $msg['content'] ?? '',
                'created_by_id' => $msg['created_by_id'] ?? null,
                'created_at' => $msg['created_at'] ?? now(),
                'user_name' => $msg['user_name'] ?? 'Unknown User',
            ];
        }, $messages);
    }

    /**
     * Step 1: Check Application Details
     */
    public function checkApplication(Request $request, $type, $id)
    {
        if ($type === 'admission') {
            $application = MemberAdmission::with(['branch.area.zone', 'submittedBy', 'admissionMembers'])->findOrFail($id);
        } else {
            $application = LoanApplication::with(['branch.area.zone', 'submittedBy', 'loanMembers'])->findOrFail($id);
        }

        return Inertia::render('HeadOffice/IssueProcessing/CheckApplication', [
            'application' => $application,
            'applicationType' => $type,
        ]);
    }

    /**
     * Step 2: Report Issues (Show Existing Issues Only - No Auto-Detection)
     */
    public function reportIssues(Request $request, $type, $id)
    {
        if ($type === 'admission') {
            $application = MemberAdmission::with('admissionMembers')->findOrFail($id);
            $members = $application->admissionMembers;
        } else {
            $application = LoanApplication::with('loanMembers')->findOrFail($id);
            $members = $application->loanMembers;
        }

        // Get existing issues (don't auto-detect)
        $existingIssues = ApplicationIssue::where('application_type', $type)
            ->where('application_id', $id)
            ->where('status', 'open')
            ->get();

        $issuesByMember = [];
        foreach ($existingIssues as $issue) {
            if (!isset($issuesByMember[$issue->member_id])) {
                $member = $members->find($issue->member_id);
                $issuesByMember[$issue->member_id] = [
                    'member_name' => $member?->member_name ?? 'Unknown',
                    'issues' => [],
                ];
            }

            $issuesByMember[$issue->member_id]['issues'][] = [
                'id' => $issue->id,
                'type' => $issue->issue_type,
                'description' => $issue->issue_description,
                'severity' => $issue->severity,
                'status' => $issue->status,
            ];
        }

        // Count statistics
        $totalIssues = $existingIssues->count();
        $criticalCount = $existingIssues->where('severity', 'critical')->count();
        $warningCount = $existingIssues->where('severity', 'warning')->count();
        $infoCount = $existingIssues->where('severity', 'info')->count();

        return Inertia::render('HeadOffice/IssueProcessing/ReportIssues', [
            'application' => $application,
            'applicationType' => $type,
            'issuesByMember' => $issuesByMember,
            'totalIssues' => $totalIssues,
            'criticalCount' => $criticalCount,
            'warningCount' => $warningCount,
            'infoCount' => $infoCount,
            'totalMembers' => count($members),
            'membersWithIssues' => count($issuesByMember),
        ]);
    }

    /**
     * Step 3: Process Issues
     */
    public function processIssues(Request $request, $type, $id)
    {
        if ($type === 'admission') {
            $application = MemberAdmission::with('admissionMembers')->findOrFail($id);
        } else {
            $application = LoanApplication::with('loanMembers')->findOrFail($id);
        }

        // Get all open issues for this application
        $issues = ApplicationIssue::where('application_type', $type)
            ->where('application_id', $id)
            ->orderBy('severity', 'desc')
            ->get();

        // Group issues by member
        $issuesByMember = [];
        foreach ($issues as $issue) {
            if ($type === 'admission') {
                $member = AdmissionMember::find($issue->member_id);
            } else {
                $member = LoanMember::find($issue->member_id);
            }

            if ($member) {
                if (!isset($issuesByMember[$member->id])) {
                    $issuesByMember[$member->id] = [
                        'member_name' => $member->member_name,
                        'issues' => [],
                    ];
                }
                $issuesByMember[$member->id]['issues'][] = $issue;
            }
        }

        return Inertia::render('HeadOffice/IssueProcessing/ProcessIssues', [
            'application' => $application,
            'applicationType' => $type,
            'issues' => $issues,
            'issuesByMember' => $issuesByMember,
            'openIssuesCount' => $issues->where('status', 'open')->count(),
            'resolvedIssuesCount' => $issues->where('status', 'resolved')->count(),
            'rejectedIssuesCount' => $issues->where('status', 'rejected')->count(),
        ]);
    }

    /**
     * Step 4: Display Approval Page
     */
    public function approvalPage(Request $request, $type, $id)
    {
        if ($type === 'admission') {
            $application = MemberAdmission::with(['admissionMembers', 'branch.area.zone'])->findOrFail($id);
        } else {
            $application = LoanApplication::with(['loanMembers', 'branch.area.zone'])->findOrFail($id);
        }

        // Get statistics
        $resolvedIssuesCount = ApplicationIssue::where('application_type', $type)
            ->where('application_id', $id)
            ->where('status', 'resolved')
            ->count();

        $rejectedIssuesCount = ApplicationIssue::where('application_type', $type)
            ->where('application_id', $id)
            ->where('status', 'rejected')
            ->count();

        return Inertia::render('HeadOffice/IssueProcessing/Approval', [
            'application' => $application,
            'applicationType' => $type,
            'resolvedIssuesCount' => $resolvedIssuesCount,
            'rejectedIssuesCount' => $rejectedIssuesCount,
        ]);
    }

    /**
     * Step 4: Final Approval
     */
    public function approve(Request $request, $type, $id)
    {
        $user = $request->user();

        if ($type === 'admission') {
            $application = MemberAdmission::with('admissionMembers')->findOrFail($id);
        } else {
            $application = LoanApplication::with('loanMembers')->findOrFail($id);
        }

        // Check if there are any open issues
        $openIssues = ApplicationIssue::where('application_type', $type)
            ->where('application_id', $id)
            ->where('status', 'open')
            ->count();

        if ($openIssues > 0) {
            return response()->json([
                'success' => false,
                'message' => "Cannot approve. There are $openIssues open issues to resolve first.",
                'open_issues' => $openIssues,
            ], 422);
        }

        // Approve all members
        if ($type === 'admission') {
            $application->admissionMembers()->update(['status' => 'approved']);
        } else {
            $application->loanMembers()->update(['status' => 'approved']);
        }

        $application->update([
            'status' => 'approved',
        ]);

        return response()->json([
            'success' => true,
            'message' => ucfirst($type) . ' approved successfully!',
        ]);
    }

    /**
     * Add message/comment to an issue
     */
    public function addComment(Request $request, $issue_id)
    {
        $issue = ApplicationIssue::findOrFail($issue_id);

        $validated = $request->validate([
            'message' => 'required|string|min:3',
        ]);

        $issue->addMessage($request->user()->id, $validated['message'], 'comment');

        return response()->json([
            'success' => true,
            'issue' => $issue,
        ]);
    }

    /**
     * Resolve an issue
     */
    public function resolveIssue(Request $request, $issue_id)
    {
        $issue = ApplicationIssue::findOrFail($issue_id);

        $validated = $request->validate([
            'notes' => 'required|string|min:3',
        ]);

        $issue->markResolved($request->user()->id, $validated['notes']);
        $issue->addMessage($request->user()->id, "Resolved: {$validated['notes']}", 'resolution');

        return response()->json([
            'success' => true,
            'issue' => $issue,
        ]);
    }

    /**
     * Reject an issue (send back to branch)
     */
    public function rejectIssue(Request $request, $issue_id)
    {
        $issue = ApplicationIssue::findOrFail($issue_id);

        $validated = $request->validate([
            'reason' => 'required|string|min:3',
        ]);

        $issue->markRejected($request->user()->id, $validated['reason']);
        $issue->addMessage($request->user()->id, "Rejected - needs correction: {$validated['reason']}", 'rejection');

        return response()->json([
            'success' => true,
            'issue' => $issue,
        ]);
    }

    /**
     * Quick stats for dashboard
     */
    public function getStats(Request $request)
    {
        return response()->json([
            'admissions' => [
                'pending' => MemberAdmission::whereNull('reviewed_at')->count(),
                'under_review' => MemberAdmission::where('status', 'under_review')->count(),
                'approved' => MemberAdmission::where('status', 'approved')->count(),
                'rejected' => MemberAdmission::where('status', 'rejected')->count(),
            ],
            'loans' => [
                'pending' => LoanApplication::whereNull('reviewed_at')->count(),
                'under_review' => LoanApplication::where('status', 'under_review')->count(),
                'approved' => LoanApplication::where('status', 'approved')->count(),
                'rejected' => LoanApplication::where('status', 'rejected')->count(),
            ],
            'issues' => [
                'open' => ApplicationIssue::where('status', 'open')->count(),
                'assigned' => ApplicationIssue::where('status', 'assigned')->count(),
                'resolved' => ApplicationIssue::where('status', 'resolved')->count(),
                'rejected' => ApplicationIssue::where('status', 'rejected')->count(),
            ],
        ]);
    }

    /**
     * Send email notification to branch about detected issues
     */
    private function sendIssueNotificationEmail($type, $id, $issues)
    {
        // Get application and branch info
        if ($type === 'admission') {
            $application = MemberAdmission::with('branch.users')->findOrFail($id);
        } else {
            $application = LoanApplication::with('branch.users')->findOrFail($id);
        }

        // Get branch manager email
        $branchManager = $application->branch->users()->where('role_id', 2)->first(); // Assuming 2 is Branch Manager
        if (!$branchManager) {
            return;
        }

        // Group issues by member
        $issuesByMember = [];
        $totalCritical = 0;
        $totalWarning = 0;
        $totalInfo = 0;

        foreach ($issues as $memberIssues) {
            foreach ($memberIssues as $issue) {
                $memberName = $issue->admissionMember?->member_name ?? $issue->loanMember?->member_name ?? 'Unknown';

                if (!isset($issuesByMember[$memberName])) {
                    $issuesByMember[$memberName] = [];
                }

                $issuesByMember[$memberName][] = [
                    'issue_type' => $issue->issue_type,
                    'issue_description' => $issue->issue_description,
                    'severity' => $issue->severity,
                ];

                match($issue->severity) {
                    'critical' => $totalCritical++,
                    'warning' => $totalWarning++,
                    'info' => $totalInfo++,
                    default => null,
                };
            }
        }

        // Send email
        try {
            \Mail::to($branchManager->email)->send(
                new \App\Mail\IssueReportNotification(
                    applicationType: $type,
                    applicationId: $id,
                    issues: $issuesByMember,
                    branchEmail: $branchManager->email,
                    branchName: $application->branch->name,
                    totalIssues: count(array_merge(...$issues)),
                    criticalCount: $totalCritical,
                    warningCount: $totalWarning,
                    infoCount: $totalInfo,
                )
            );

            // Mark email as sent
            ApplicationIssue::where('application_type', $type)
                ->where('application_id', $id)
                ->update(['email_sent_to_branch' => true, 'email_sent_to_branch_at' => now()]);
        } catch (\Exception $e) {
            \Log::error('Failed to send issue notification email: ' . $e->getMessage());
        }
    }

    /**
     * Submit Batch - Process all issues and auto-approve members without issues
     */
    public function submitBatch(Request $request)
    {
        \Log::info('submitBatch called', [
            'request_data' => $request->all(),
        ]);

        try {
            $request->validate([
                'issues' => 'present|array',
                'issues.*.member_id' => 'required|integer',
                'issues.*.issue_text' => 'required|string',
                'date' => 'required|date',
                'type' => 'required|in:admission,loan',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Validation failed', [
                'errors' => $e->errors(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Validation failed: ' . json_encode($e->errors()),
            ], 422);
        }

        \Log::info('Validation passed');

        $issues = $request->input('issues', []);
        $selectedDate = $request->input('date');
        $applicationType = $request->input('type');

        \Log::info('Processing', [
            'issues_count' => count($issues),
            'date' => $selectedDate,
            'type' => $applicationType,
        ]);

        $processedMembers = [];
        $approvedMembers = [];

        try {
            // Process submitted issues
            foreach ($issues as $issue) {
                $memberId = $issue['member_id'];
                $issueText = $issue['issue_text'];

                if ($applicationType === 'admission') {
                    $member = AdmissionMember::find($memberId);
                    if ($member) {
                        // Check if issue already exists for this member
                        $existingIssue = ApplicationIssue::where([
                            'application_type' => 'admission',
                            'application_id' => $member->member_admission_id,
                            'member_id' => $memberId,
                            'issue_type' => 'manual_report',
                        ])->first();

                        // Only create if it doesn't exist
                        if (!$existingIssue) {
                            ApplicationIssue::create([
                                'application_type' => 'admission',
                                'application_id' => $member->member_admission_id,
                                'member_id' => $memberId,
                                'issue_type' => 'manual_report',
                                'issue_description' => $issueText,
                                'severity' => 'warning',
                                'status' => 'open',
                            ]);
                        }

                        // Mark member as having issues - returned to branch
                        $member->update(['status' => 'issue']);

                        // Mark parent application as reviewed (read)
                        $member->memberAdmission()->update(['reviewed_at' => now()]);

                        $processedMembers[] = [
                            'type' => 'admission',
                            'member_id' => $memberId,
                            'status' => 'issue',
                        ];
                    }
                } elseif ($applicationType === 'loan') {
                    $member = LoanMember::find($memberId);
                    if ($member) {
                        // Check if issue already exists for this member
                        $existingIssue = ApplicationIssue::where([
                            'application_type' => 'loan',
                            'application_id' => $member->loan_application_id,
                            'member_id' => $memberId,
                            'issue_type' => 'manual_report',
                        ])->first();

                        // Only create if it doesn't exist
                        if (!$existingIssue) {
                            ApplicationIssue::create([
                                'application_type' => 'loan',
                                'application_id' => $member->loan_application_id,
                                'member_id' => $memberId,
                                'issue_type' => 'manual_report',
                                'issue_description' => $issueText,
                                'severity' => 'warning',
                                'status' => 'open',
                            ]);
                        }

                        // Mark member as having issues - returned to branch
                        $member->update(['status' => 'issue']);

                        // Mark parent application as reviewed (read)
                        $member->loanApplication()->update(['reviewed_at' => now()]);

                        $processedMembers[] = [
                            'type' => 'loan',
                            'member_id' => $memberId,
                            'status' => 'issue',
                        ];
                    }
                }
            }

            // Auto-approve members without issues on this date
            if ($applicationType === 'admission') {
                $allMembers = AdmissionMember::whereHas('memberAdmission', function ($q) use ($selectedDate) {
                    $q->whereDate('submitted_at', $selectedDate)
                      ->whereNotNull('submitted_at');
                })->get();

                foreach ($allMembers as $member) {
                    // Check if this member has an issue submitted
                    $hasIssue = in_array($member->id, array_column($processedMembers, 'member_id'));

                    if (!$hasIssue && $member->status === 'pending') {
                        // Auto-approve
                        $member->update(['status' => 'approved']);

                        // Mark parent application as reviewed (read)
                        $member->memberAdmission()->update(['reviewed_at' => now()]);

                        $approvedMembers[] = [
                            'type' => 'admission',
                            'member_id' => $member->id,
                            'status' => 'auto_approved',
                        ];
                    }
                }
            } elseif ($applicationType === 'loan') {
                $allMembers = LoanMember::whereHas('loanApplication', function ($q) use ($selectedDate) {
                    $q->whereDate('submitted_at', $selectedDate)
                      ->whereNotNull('submitted_at');
                })->get();

                foreach ($allMembers as $member) {
                    // Check if this member has an issue submitted
                    $hasIssue = in_array($member->id, array_column($processedMembers, 'member_id'));

                    if (!$hasIssue && $member->status === 'pending') {
                        // Auto-approve
                        $member->update(['status' => 'approved']);

                        // Mark parent application as reviewed (read)
                        $member->loanApplication()->update(['reviewed_at' => now()]);

                        $approvedMembers[] = [
                            'type' => 'loan',
                            'member_id' => $member->id,
                            'status' => 'auto_approved',
                        ];
                    }
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Submission successful',
                'processed_issues' => count($processedMembers),
                'auto_approved' => count($approvedMembers),
                'data' => [
                    'issues_processed' => $processedMembers,
                    'members_approved' => $approvedMembers,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Submission failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Reject a single member
     */
    public function rejectMember(Request $request)
    {
        $request->validate([
            'member_id' => 'required|integer',
            'reason' => 'required|string|min:3',
            'type' => 'required|in:admission,loan',
        ]);

        $memberId = $request->input('member_id');
        $reason = $request->input('reason');
        $type = $request->input('type');

        try {
            if ($type === 'admission') {
                $member = AdmissionMember::findOrFail($memberId);

                // Create rejection issue
                ApplicationIssue::create([
                    'application_type' => 'admission',
                    'application_id' => $member->member_admission_id,
                    'member_id' => $memberId,
                    'issue_type' => 'rejection',
                    'issue_description' => $reason,
                    'severity' => 'critical',
                    'status' => 'rejected',
                ]);

                $member->update(['status' => 'rejected']);

                // Mark parent application as reviewed (read)
                $member->memberAdmission()->update(['reviewed_at' => now()]);
            } else {
                $member = LoanMember::findOrFail($memberId);

                ApplicationIssue::create([
                    'application_type' => 'loan',
                    'application_id' => $member->loan_application_id,
                    'member_id' => $memberId,
                    'issue_type' => 'rejection',
                    'issue_description' => $reason,
                    'severity' => 'critical',
                    'status' => 'rejected',
                ]);

                $member->update(['status' => 'rejected']);

                // Mark parent application as reviewed (read)
                $member->loanApplication()->update(['reviewed_at' => now()]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Member rejected successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Rejection failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Approve a single member
     */
    public function approveMember(Request $request)
    {
        $request->validate([
            'member_id' => 'required|integer',
            'type' => 'required|in:admission,loan',
        ]);

        $memberId = $request->input('member_id');
        $type = $request->input('type');

        try {
            if ($type === 'admission') {
                $member = AdmissionMember::findOrFail($memberId);
                $member->update(['status' => 'approved']);

                // Mark parent application as reviewed (read)
                $member->memberAdmission()->update(['reviewed_at' => now()]);
            } else {
                $member = LoanMember::findOrFail($memberId);
                $member->update(['status' => 'approved']);

                // Mark parent application as reviewed (read)
                $member->loanApplication()->update(['reviewed_at' => now()]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Member approved successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Approval failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * API: Get updated members for live refresh
     */
    public function getUpdatedMembers(Request $request)
    {
        $selectedDate = $request->input('date', now()->toDateString());
        $searchMember = $request->input('search', null);
        $applicationType = $request->input('type', 'admission');

        // Get members submitted on selected date
        if ($applicationType === 'admission') {
            $query = AdmissionMember::with(['memberAdmission.branch', 'issues'])
                ->whereHas('memberAdmission', function ($q) use ($selectedDate) {
                    $q->whereDate('submitted_at', $selectedDate)
                      ->whereNotNull('submitted_at');
                });

            if ($searchMember) {
                $query->where(function ($q) use ($searchMember) {
                    $q->where('member_name', 'like', "%{$searchMember}%")
                      ->orWhere('nid', 'like', "%{$searchMember}%")
                      ->orWhere('mobile', 'like', "%{$searchMember}%");
                });
            }

            $members = $query->orderBy('created_at', 'desc')->get();
        } else {
            $query = LoanMember::with(['loanApplication.branch', 'issues'])
                ->whereHas('loanApplication', function ($q) use ($selectedDate) {
                    $q->whereDate('submitted_at', $selectedDate)
                      ->whereNotNull('submitted_at');
                });

            if ($searchMember) {
                $query->where(function ($q) use ($searchMember) {
                    $q->where('member_name', 'like', "%{$searchMember}%")
                      ->orWhere('nid', 'like', "%{$searchMember}%")
                      ->orWhere('mobile', 'like', "%{$searchMember}%");
                });
            }

            $members = $query->orderBy('created_at', 'desc')->get();
        }

        $membersData = $members->map(function ($member) use ($applicationType) {
            $app = $applicationType === 'admission' ? $member->memberAdmission : $member->loanApplication;

            // Format issues with messages
            $formattedIssues = collect($member->issues ?? [])->map(function ($issue) {
                return [
                    'id' => $issue->id,
                    'issue_type' => $issue->issue_type,
                    'issue_description' => $issue->issue_description,
                    'severity' => $issue->severity ?? '',
                    'status' => $issue->status,
                    'messages' => collect($issue->messages ?? [])->map(function ($msg) {
                        // Handle messages that could be array or JSON
                        if (is_array($msg)) {
                            return $msg;
                        }
                        return [
                            'id' => $msg->id ?? null,
                            'user_name' => $msg->user_name ?? 'System',
                            'message_type' => $msg->type ?? 'comment',
                            'content' => $msg->message ?? '',
                            'created_at' => $msg->created_at ?? now()->toIso8601String(),
                        ];
                    })->toArray(),
                ];
            })->toArray();

            return [
                'id' => $member->id,
                'member_name' => $member->member_name,
                'mobile' => $member->mobile,
                'nid' => $member->nid ?? '',
                'status' => $member->status,
                'application_no' => $app->application_no,
                'branch_name' => $app->branch?->name,
                'member_admission_id' => $member->memberAdmission?->id,
                'issues' => $formattedIssues,
            ];
        });

        return response()->json(['members' => $membersData]);
    }

    /**
     * API: Get updated issues for a specific application
     */
    public function getUpdatedIssues(Request $request, $id)
    {
        $applicationType = $request->input('type', 'admission');

        // Get application
        if ($applicationType === 'admission') {
            $application = MemberAdmission::findOrFail($id);
        } else {
            $application = LoanApplication::findOrFail($id);
        }

        // Get all issues with message counts
        $issues = ApplicationIssue::where('application_id', $id)
            ->where('application_type', $applicationType)
            ->with('messages')
            ->get();

        $issuesByMember = [];
        foreach ($issues as $issue) {
            $memberId = $issue->member_id;
            if (!isset($issuesByMember[$memberId])) {
                $memberModel = $applicationType === 'admission'
                    ? AdmissionMember::find($memberId)
                    : LoanMember::find($memberId);

                $issuesByMember[$memberId] = [
                    'member_name' => $memberModel?->member_name ?? 'Unknown',
                    'issues' => [],
                ];
            }

            $issuesByMember[$memberId]['issues'][] = $issue;
        }

        $openIssuesCount = $issues->where('status', 'open')->count();
        $resolvedIssuesCount = $issues->where('status', 'resolved')->count();
        $rejectedIssuesCount = $issues->where('status', 'rejected')->count();

        return response()->json([
            'issues' => $issues,
            'issuesByMember' => $issuesByMember,
            'openIssuesCount' => $openIssuesCount,
            'resolvedIssuesCount' => $resolvedIssuesCount,
            'rejectedIssuesCount' => $rejectedIssuesCount,
        ]);
    }

}


