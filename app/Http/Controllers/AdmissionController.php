<?php

namespace App\Http\Controllers;

use App\Models\MemberAdmission;
use App\Models\AdmissionMember;
use App\Models\Branch;
use App\Models\Area;
use App\Models\Zone;
use App\Models\ApplicationIssue;
use App\Services\AdmissionIssueDetectionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;

class AdmissionController extends Controller
{
    protected $issueDetectionService;

    public function __construct(AdmissionIssueDetectionService $issueDetectionService)
    {
        $this->issueDetectionService = $issueDetectionService;
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $selectedDate = $request->input('date', now()->toDateString());
        $statusFilter = $request->input('status', '');
        $searchQuery = $request->input('search', '');

        // Clean up status filter - remove null or "null" string
        if ($statusFilter === 'null' || $statusFilter === null) {
            $statusFilter = '';
        }
        if ($searchQuery === 'null' || $searchQuery === null) {
            $searchQuery = '';
        }

        // Trim whitespace
        $statusFilter = trim($statusFilter ?? '');
        $searchQuery = trim($searchQuery ?? '');

        // Get branch_id from user
        $userBranchId = $user->branch_id;

        // Get members for this branch submitted on selected date
        // Include all fields needed for view modal
        $query = AdmissionMember::with([
                'memberAdmission.branch.area.zone',
                'issues'
            ])
            ->whereHas('memberAdmission', function ($q) use ($userBranchId, $selectedDate) {
                // If user has branch_id, filter by it. Otherwise show all (Head Office)
                if ($userBranchId) {
                    $q->where('branch_id', $userBranchId);
                }
                $q->whereDate('submitted_at', $selectedDate)
                  ->whereNotNull('submitted_at');
            });

        Log::info('Query Debug Initial', [
            'statusFilter' => $statusFilter,
            'statusFilter_empty' => empty($statusFilter),
            'statusFilter_type' => gettype($statusFilter),
        ]);

        // Filter by status - ONLY if statusFilter is not empty
        if (!empty($statusFilter)) {
            Log::info('Applying status filter', ['status' => $statusFilter]);
            $query->where('status', $statusFilter);
        } else {
            Log::info('No status filter - showing all statuses');
        }

        // Search by name/mobile
        if (!empty($searchQuery)) {
            Log::info('Applying search filter', ['search' => $searchQuery]);
            $query->where(function ($q) use ($searchQuery) {
                $q->where('member_name', 'like', "%{$searchQuery}%")
                  ->orWhere('mobile', 'like', "%{$searchQuery}%");
            });
        }

        // Log final query before execution
        Log::info('Final Query Debug', [
            'sql' => $query->toSql(),
            'bindings' => $query->getBindings(),
            'statusFilter' => $statusFilter,
            'searchQuery' => $searchQuery,
        ]);

        // Get members - issues first, then by name
        $members = $query->orderByRaw("FIELD(status, 'issue', 'pending', 'approved', 'rejected')")
            ->orderBy('member_name')
            ->get();

        Log::info('AdmissionController index', [
            'user_id' => $user->id,
            'user_branch_id' => $user->branch_id,
            'selectedDate' => $selectedDate,
            'members_count' => $members->count(),
            'members' => $members->pluck('member_name', 'id')->toArray(),
            'raw_members' => $members->map(fn($m) => [
                'id' => $m->id,
                'name' => $m->member_name,
                'status' => $m->status,
                'admission_id' => $m->member_admission_id
            ])->toArray(),
        ]);

        // Get issues for members - get all issues to show complete picture
        // This includes rejection issues from Head Office (status='rejected')
        // as well as open issues that need attention (status='open')
        $memberIds = $members->pluck('id')->toArray();
        $issues = ApplicationIssue::whereIn('member_id', $memberIds)
            ->where('application_type', 'admission')
            ->whereIn('status', ['open', 'rejected'])
            ->get()
            ->groupBy('member_id');

        // Format members data with all fields for view modal
        $membersData = $members->map(function ($member) use ($issues) {
            $memberIssues = $issues->get($member->id, collect());
            $admission = $member->memberAdmission;
            return [
                'id' => $member->id,
                'excel_row_number' => $member->excel_row_number,
                'branch_name' => $member->branch_name,
                'officer_name' => $member->officer_name,
                'component_name' => $member->component_name,
                'society_name' => $member->society_name,
                'member_name' => $member->member_name,
                'mobile' => $member->mobile,
                'nid_front_image' => $member->nid_front_image,
                'nid_back_image' => $member->nid_back_image,
                'residential_property' => $member->residential_property,
                'cultivable_land' => $member->cultivable_land,
                'total_land' => $member->total_land,
                'cattle_count' => $member->cattle_count,
                'goat_count' => $member->goat_count,
                'poultry_count' => $member->poultry_count,
                'fixed_movable_assets_value' => $member->fixed_movable_assets_value,
                'earning_person_occupation' => $member->earning_person_occupation,
                'family_monthly_income' => $member->family_monthly_income,
                'guarantor_name' => $member->guarantor_name,
                'guarantor_relation' => $member->guarantor_relation,
                'remarks' => $member->remarks,
                'status' => $member->status,
                'application_no' => $admission->application_no,
                'zone_name' => $admission->branch?->area?->zone?->name,
                'area_name' => $admission->branch?->area?->name,
                'issues' => $memberIssues->map(function ($issue) {
                    return [
                        'id' => $issue->id,
                        'issue_type' => $issue->issue_type,
                        'issue_description' => $issue->issue_description,
                        'severity' => $issue->severity,
                        'status' => $issue->status,
                        'created_at' => $issue->created_at->format('Y-m-d H:i'),
                        'resolution_notes' => $issue->resolution_notes,
                    ];
                })->values()->toArray(),
            ];
        });

        // Get statistics for this date
        $baseQuery = AdmissionMember::whereHas('memberAdmission', function ($q) use ($user, $selectedDate) {
            if ($user->branch_id) {
                $q->where('branch_id', $user->branch_id);
            }
            $q->whereDate('submitted_at', $selectedDate)
              ->whereNotNull('submitted_at');
        });

        $stats = [
            'total' => (clone $baseQuery)->count(),
            'pending' => (clone $baseQuery)->where('status', 'pending')->count(),
            'issue' => (clone $baseQuery)->where('status', 'issue')->count(),
            'approved' => (clone $baseQuery)->where('status', 'approved')->count(),
            'rejected' => (clone $baseQuery)->where('status', 'rejected')->count(),
        ];

        return Inertia::render('Branch/Admissions/Index', [
            'members' => $membersData->values()->toArray(),
            'selectedDate' => $selectedDate,
            'statusFilter' => $statusFilter,
            'searchQuery' => $searchQuery,
            'stats' => $stats,
        ]);
    }

    /**
     * Show the form for creating a new admission
     */
    public function create()
    {
        return Inertia::render('Branch/Admissions/Create');
    }

    /**
     * Show a specific admission for Head Office with all member details
     */
    public function headOfficeShow(MemberAdmission $admission, Request $request)
    {
        $admission->load(['branch.area.zone', 'admissionMembers', 'submittedBy']);

        // Mark as read if not already
        if (!$admission->reviewed_at) {
            $admission->update([
                'reviewed_at' => now(),
                'reviewed_by' => $request->user()->id,
            ]);
        }

        // Format data properly for frontend
        $data = [
            'id' => $admission->id,
            'application_no' => $admission->application_no,
            'total_members' => $admission->total_members,
            'status' => $admission->status,
            'submitted_at' => $admission->submitted_at,
            'reviewed_at' => $admission->reviewed_at,
            'created_at' => $admission->created_at,
            'excel_file_name' => $admission->excel_file_name,
            'branch' => $admission->branch ? [
                'name' => $admission->branch->name,
                'area' => $admission->branch->area ? [
                    'name' => $admission->branch->area->name,
                    'zone' => $admission->branch->area->zone ? [
                        'name' => $admission->branch->area->zone->name,
                    ] : null,
                ] : null,
            ] : null,
            'submitted_by' => $admission->submittedBy ? [
                'name' => $admission->submittedBy->name,
            ] : null,
            'admission_members' => $admission->admissionMembers->map(function ($member) {
                return [
                    'id' => $member->id,
                    'member_name' => $member->member_name,
                    'mobile' => $member->mobile,
                    'branch_name' => $member->branch_name,
                    'officer_name' => $member->officer_name,
                    'component_name' => $member->component_name,
                    'society_name' => $member->society_name,
                    'residential_property' => $member->residential_property,
                    'cultivable_land' => $member->cultivable_land,
                    'total_land' => $member->total_land,
                    'cattle_count' => $member->cattle_count,
                    'goat_count' => $member->goat_count,
                    'poultry_count' => $member->poultry_count,
                    'fixed_movable_assets_value' => $member->fixed_movable_assets_value,
                    'earning_person_occupation' => $member->earning_person_occupation,
                    'family_monthly_income' => $member->family_monthly_income,
                    'guarantor_name' => $member->guarantor_name,
                    'guarantor_relation' => $member->guarantor_relation,
                    'remarks' => $member->remarks,
                    'nid_front_image' => $member->nid_front_image,
                    'nid_back_image' => $member->nid_back_image,
                    'status' => $member->status,
                    'excel_row_number' => $member->excel_row_number,
                ];
            })->toArray(),
        ];

        return Inertia::render('HeadOffice/AdmissionShow', [
            'admission' => $data,
        ]);
    }

    /**
     * Analyze uploaded Excel file and return member data
     */
    public function analyzeExcel(Request $request)
    {
        // This method is kept for backward compatibility but Excel analysis
        // is now handled in the frontend. This endpoint is no longer actively used.
        return response()->json(['message' => 'Excel analysis is now handled in frontend'], 400);
    }

    /**
     * Download Excel template for member admission
     */
    public function downloadTemplate()
    {
        $spreadsheet = TemplateGenerator::generateAdmissionTemplate();

        $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
        $writer->setPreCalculateFormulas(false);

        $fileName = 'সদস্য_ভর্তি_টেমপ্লেট_' . date('Y-m-d') . '.xlsx';
        $tempFile = tempnam(sys_get_temp_dir(), 'admission_template');
        $writer->save($tempFile);

        return response()->download($tempFile, $fileName)->deleteFileAfterSend(true);
    }

    /**
     * Store a newly created admission in storage
     */
    public function store(Request $request)
    {
        try {
            // Validate incoming request
            $validated = $request->validate([
                'excel_file' => 'required|file|mimes:xlsx,xls|max:10240',
                'members' => 'required|array|min:1',
                'members.*.excel_row_number' => 'required|integer',
                'members.*.branch_name' => 'nullable|string|max:255',
                'members.*.officer_name' => 'nullable|string|max:255',
                'members.*.component_name' => 'nullable|string|max:255',
                'members.*.society_name' => 'nullable|string|max:255',
                'members.*.member_name' => 'required|string|max:255',
                'members.*.mobile' => 'required|string|max:20',
                'members.*.nid_front_image' => 'required|file|image|mimes:jpeg,png,jpg,gif|max:2048',
                'members.*.nid_back_image' => 'required|file|image|mimes:jpeg,png,jpg,gif|max:2048',
                'members.*.residential_property' => 'nullable|numeric|min:0',
                'members.*.cultivable_land' => 'nullable|numeric|min:0',
                'members.*.total_land' => 'nullable|numeric|min:0',
                'members.*.cattle_count' => 'nullable|integer|min:0',
                'members.*.goat_count' => 'nullable|integer|min:0',
                'members.*.poultry_count' => 'nullable|integer|min:0',
                'members.*.fixed_movable_assets_value' => 'nullable|numeric|min:0',
                'members.*.earning_person_occupation' => 'nullable|string|max:255',
                'members.*.family_monthly_income' => 'nullable|numeric|min:0',
                'members.*.guarantor_name' => 'nullable|string|max:255',
                'members.*.guarantor_relation' => 'nullable|string|max:255',
                'members.*.remarks' => 'nullable|string|max:1000',
            ]);

            $user = $request->user();

            // Store Excel file
            $excelPath = $request->file('excel_file')->store('admission_excel', 'public');
            $excelFileName = $request->file('excel_file')->getClientOriginalName();

            Log::info('Excel file stored', [
                'path' => $excelPath,
                'name' => $excelFileName,
                'size' => $request->file('excel_file')->getSize()
            ]);

            // Generate application number
            $lastAdmission = MemberAdmission::whereYear('created_at', date('Y'))
                ->orderBy('id', 'desc')
                ->first();

            $sequence = $lastAdmission ? (int) substr($lastAdmission->application_no, -6) + 1 : 1;
            $applicationNo = 'ADM-' . date('Y') . '-' . str_pad($sequence, 6, '0', STR_PAD_LEFT);

            // Create MemberAdmission record
            $admission = MemberAdmission::create([
                'application_no' => $applicationNo,
                'branch_id' => $user->branch_id,
                'submitted_by' => $user->id,
                'excel_file_path' => $excelPath,
                'excel_file_name' => $excelFileName,
                'total_members' => count($validated['members']),
                'status' => 'pending',
                'submitted_at' => now(),
            ]);

            Log::info('MemberAdmission created', [
                'id' => $admission->id,
                'application_no' => $applicationNo,
                'total_members' => count($validated['members'])
            ]);

            // Create admission members
            foreach ($validated['members'] as $index => $memberData) {
                try {
                    // Store NID images
                    $nidFrontPath = $memberData['nid_front_image']->store('nid_cards/front', 'public');
                    $nidBackPath = $memberData['nid_back_image']->store('nid_cards/back', 'public');

                    Log::info('NID images stored', [
                        'member_name' => $memberData['member_name'],
                        'nid_front' => $nidFrontPath,
                        'nid_back' => $nidBackPath
                    ]);

                    // Create AdmissionMember record
                    $admissionMember = AdmissionMember::create([
                        'member_admission_id' => $admission->id,
                        'branch_name' => $memberData['branch_name'] ?? null,
                        'officer_name' => $memberData['officer_name'] ?? null,
                        'component_name' => $memberData['component_name'] ?? null,
                        'society_name' => $memberData['society_name'] ?? null,
                        'member_name' => $memberData['member_name'],
                        'mobile' => $memberData['mobile'],
                        'nid_front_image' => $nidFrontPath,
                        'nid_back_image' => $nidBackPath,
                        'residential_property' => $memberData['residential_property'] ?? null,
                        'cultivable_land' => $memberData['cultivable_land'] ?? null,
                        'total_land' => $memberData['total_land'] ?? null,
                        'cattle_count' => $memberData['cattle_count'] ?? null,
                        'goat_count' => $memberData['goat_count'] ?? null,
                        'poultry_count' => $memberData['poultry_count'] ?? null,
                        'fixed_movable_assets_value' => $memberData['fixed_movable_assets_value'] ?? null,
                        'earning_person_occupation' => $memberData['earning_person_occupation'] ?? null,
                        'family_monthly_income' => $memberData['family_monthly_income'] ?? null,
                        'guarantor_name' => $memberData['guarantor_name'] ?? null,
                        'guarantor_relation' => $memberData['guarantor_relation'] ?? null,
                        'remarks' => $memberData['remarks'] ?? null,
                        'status' => 'pending',
                        'excel_row_number' => $memberData['excel_row_number'],
                    ]);

                    Log::info('AdmissionMember created', [
                        'id' => $admissionMember->id,
                        'member_name' => $memberData['member_name'],
                        'mobile' => $memberData['mobile']
                    ]);

                } catch (\Exception $e) {
                    Log::error('Error creating AdmissionMember', [
                        'member_name' => $memberData['member_name'] ?? 'UNKNOWN',
                        'error' => $e->getMessage(),
                        'file' => $e->getFile(),
                        'line' => $e->getLine()
                    ]);

                    // Delete the admission if member creation fails
                    $admission->delete();
                    throw $e;
                }
            }

            Log::info('Admission store completed successfully', [
                'admission_id' => $admission->id,
                'application_no' => $applicationNo,
                'total_members' => count($validated['members'])
            ]);

            return redirect()->route('admissions.index')
                ->with('success', "Member admission '{$applicationNo}' created successfully with " . count($validated['members']) . " members.");

        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation error in store', [
                'errors' => $e->errors()
            ]);
            throw $e;

        } catch (\Exception $e) {
            Log::error('Error in admission store', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);
            return back()->withErrors(['error' => 'Error creating admission: ' . $e->getMessage()]);
        }
    }

    /**
     * Submit admission for Head Office review
     */
    public function submit(Request $request, $id)
    {
        $admission = MemberAdmission::with('admissionMembers')->findOrFail($id);

        // Check if all members have NID uploaded
        $missingNid = $admission->admissionMembers->filter(function ($member) {
            return !$member->hasNidUploaded();
        });

        if ($missingNid->count() > 0) {
            return back()->with('error', 'All members must have NID cards uploaded before submission.');
        }

        $admission->update([
            'status' => 'under_review',
            'submitted_at' => now(),
        ]);

        return back()->with('success', 'Admission submitted for Head Office review.');
    }

    /**
     * Display admission submissions for Head Office
     */
    public function headOfficeSubmissions(Request $request)
    {
        // Get members for head office view (all branches, by date)
        $selectedDate = $request->input('date', now()->toDateString());
        $statusFilter = $request->input('status', '');
        $searchQuery = $request->input('search', '');
        $zoneId = $request->input('zone_id', '');
        $areaId = $request->input('area_id', '');
        $branchId = $request->input('branch_id', '');

        // Clean up filters
        $statusFilter = trim($statusFilter ?? '');
        $searchQuery = trim($searchQuery ?? '');

        // Build query for members
        $query = AdmissionMember::with(['memberAdmission.branch.area.zone', 'issues'])
            ->whereHas('memberAdmission', function ($q) use ($selectedDate) {
                $q->whereDate('submitted_at', $selectedDate)
                  ->whereNotNull('submitted_at');
            });

        // Filter by status
        if (!empty($statusFilter)) {
            $query->where('status', $statusFilter);
        }

        // Search by name/mobile
        if (!empty($searchQuery)) {
            $query->where(function ($q) use ($searchQuery) {
                $q->where('member_name', 'like', "%{$searchQuery}%")
                  ->orWhere('mobile', 'like', "%{$searchQuery}%");
            });
        }

        // Filter by zone
        if (!empty($zoneId)) {
            $query->whereHas('memberAdmission.branch.area.zone', function ($q) use ($zoneId) {
                $q->where('zones.id', $zoneId);
            });
        }

        // Filter by area
        if (!empty($areaId)) {
            $query->whereHas('memberAdmission.branch.area', function ($q) use ($areaId) {
                $q->where('areas.id', $areaId);
            });
        }

        // Filter by branch
        if (!empty($branchId)) {
            $query->whereHas('memberAdmission', function ($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            });
        }

        // Order by status priority, then by name
        $members = $query->orderByRaw("FIELD(status, 'issue', 'pending', 'approved', 'rejected')")
            ->orderBy('member_name')
            ->paginate(50);

        // Get filter data
        $zones = Zone::with('areas.branches')->get();
        $areas = [];
        $branches = [];

        if (!empty($zoneId)) {
            $areas = Area::where('zone_id', $zoneId)->get();
        }

        if (!empty($areaId)) {
            $branches = Branch::where('area_id', $areaId)->get();
        }

        return Inertia::render('HeadOffice/AdmissionSubmissions', [
            'members' => $members,
            'zones' => $zones,
            'areas' => $areas,
            'branches' => $branches,
            'filters' => [
                'zone_id' => $zoneId,
                'area_id' => $areaId,
                'branch_id' => $branchId,
                'status' => $statusFilter,
                'date' => $selectedDate
            ],
        ]);
    }

    /**
     * Mark all admission submissions as read for a specific date
     */
    public function markAllAsRead(Request $request)
    {
        $query = MemberAdmission::whereNotNull('submitted_at')
            ->whereNull('reviewed_at');

        if ($request->has('date') && $request->date) {
            $query->whereDate('submitted_at', $request->date);
        }

        $count = $query->count();
        $query->update(['reviewed_at' => now()]);

        return response()->json([
            'success' => true,
            'count' => $count,
            'message' => "{$count} submissions marked as read"
        ]);
    }

    /**
     * Detect and create issues for admission members
     */
    public function detectIssues(Request $request, $admission_id)
    {
        $admission = MemberAdmission::with('admissionMembers')->findOrFail($admission_id);
        $user = $request->user();

        $issuesCreated = [];

        foreach ($admission->admissionMembers as $member) {
            $issues = $this->issueDetectionService->createIssuesForMember($member, $user->id);
            if (!empty($issues)) {
                $issuesCreated[$member->id] = $issues;
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Issues detected and recorded',
            'issues_count' => count($issuesCreated),
            'issues' => $issuesCreated,
        ]);
    }

    /**
     * Get issues for an admission with members
     */
    public function getAdmissionIssues(Request $request, $admission_id)
    {
        $admission = MemberAdmission::with('admissionMembers')->findOrFail($admission_id);

        $issuesByMember = [];
        foreach ($admission->admissionMembers as $member) {
            $issues = ApplicationIssue::where('application_type', 'admission')
                ->where('member_id', $member->id)
                ->orderBy('severity', 'desc')
                ->get();

            if ($issues->count() > 0) {
                $issuesByMember[$member->id] = [
                    'member_name' => $member->member_name,
                    'issues' => $issues,
                ];
            }
        }

        return response()->json([
            'admission_id' => $admission->id,
            'application_no' => $admission->application_no,
            'issues_by_member' => $issuesByMember,
        ]);
    }

    /**
     * Add message to an issue
     */
    public function addIssueMessage(Request $request, $issue_id)
    {
        $issue = ApplicationIssue::findOrFail($issue_id);

        $validated = $request->validate([
            'message' => 'required|string|min:3',
        ]);

        $issue->addMessage($request->user()->id, $validated['message'], 'comment');

        return response()->json([
            'success' => true,
            'message' => 'Message added',
        ]);
    }

    /**
     * Resolve an issue
     */
    public function resolveIssue(Request $request, $issue_id)
    {
        $issue = ApplicationIssue::findOrFail($issue_id);

        $validated = $request->validate([
            'resolution_notes' => 'required|string|min:3',
        ]);

        $issue->markResolved($request->user()->id, $validated['resolution_notes']);
        $issue->addMessage($request->user()->id, 'Issue resolved: ' . $validated['resolution_notes'], 'resolution');

        return response()->json([
            'success' => true,
            'message' => 'Issue resolved',
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
        $issue->addMessage($request->user()->id, 'Issue rejected - please correct: ' . $validated['reason'], 'rejection');

        return response()->json([
            'success' => true,
            'message' => 'Issue sent back to branch',
        ]);
    }

    /**
     * Approve all members for an admission
     */
    public function approveAllMembers(Request $request, $admission_id)
    {
        $admission = MemberAdmission::with('admissionMembers')->findOrFail($admission_id);
        $user = $request->user();

        // Check if there are any open issues
        $openIssues = ApplicationIssue::where('application_type', 'admission')
            ->where('application_id', $admission_id)
            ->where('status', 'open')
            ->get();

        if ($openIssues->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot approve. There are ' . $openIssues->count() . ' open issues that need to be resolved first.',
                'open_issues_count' => $openIssues->count(),
            ], 422);
        }

        // Update all members to approved
        $admission->admissionMembers()->update(['status' => 'approved']);
        $admission->update(['status' => 'approved']);

        return response()->json([
            'success' => true,
            'message' => 'All members approved successfully',
        ]);
    }


    /**
     * Mark admission as read
     */
    public function markAsRead(Request $request, $id)
    {
        $admission = MemberAdmission::findOrFail($id);

        if (!$admission->reviewed_at) {
            $admission->update([
                'reviewed_at' => now(),
                'reviewed_by' => $request->user()->id,
            ]);
        }

        return back();
    }

    /**
     * Export admissions to Excel
     */
    public function exportExcel(Request $request)
    {
        $query = MemberAdmission::with([
            'branch.area.zone',
            'submittedBy',
            'admissionMembers'
        ])->whereNotNull('submitted_at');

        // Apply filters
        if ($request->has('zone_id') && $request->zone_id !== '') {
            $query->whereHas('branch.area.zone', function ($q) use ($request) {
                $q->where('zones.id', $request->zone_id);
            });
        }

        if ($request->has('area_id') && $request->area_id !== '') {
            $query->whereHas('branch.area', function ($q) use ($request) {
                $q->where('areas.id', $request->area_id);
            });
        }

        if ($request->has('branch_id') && $request->branch_id !== '') {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->has('status') && $request->status !== '') {
            $query->where('status', $request->status);
        }

        if ($request->has('read_status')) {
            if ($request->read_status === 'unread') {
                $query->whereNull('reviewed_at');
            } elseif ($request->read_status === 'read') {
                $query->whereNotNull('reviewed_at');
            }
        }

        $admissions = $query->latest('submitted_at')->get();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Set page setup for printing
        $sheet->getPageSetup()
            ->setOrientation(PageSetup::ORIENTATION_LANDSCAPE)
            ->setPaperSize(PageSetup::PAPERSIZE_A4)
            ->setFitToWidth(1)
            ->setFitToHeight(0);

        // Bangla headers matching actual member fields
        $headers = [
            'আবেদন নং',
            'জোন',
            'এরিয়া',
            'শাখা',
            'ক্রমিক',
            'সদস্যের নাম',
            'মোবাইল',
            'শাখা নাম (এক্সেল)',
            'কর্মকর্তা',
            'কম্পোনেন্ট',
            'সমিতি',
            'বসতবাড়ী',
            'আবাদী জমি',
            'মোট জমি',
            'গরু',
            'ছাগল',
            'হাঁস-মুরগি',
            'সম্পদ মূল্য',
            'পেশা',
            'মাসিক আয়',
            'জামিনদারের নাম',
            'জামিনদারের সম্পর্ক',
            'মন্তব্য',
            'স্ট্যাটাস',
            'জমা দেওয়ার তারিখ',
        ];

        // Set headers
        $column = 'A';
        foreach ($headers as $header) {
            $sheet->setCellValue($column . '1', $header);
            $column++;
        }

        // Style header row
        $headerStyle = [
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
                'size' => 11,
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1e40af'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => '000000'],
                ],
            ],
        ];
        $sheet->getStyle('A1:Y1')->applyFromArray($headerStyle);

        // Set row height for header
        $sheet->getRowDimension(1)->setRowHeight(25);

        // Add data
        $row = 2;
        foreach ($admissions as $admission) {
            foreach ($admission->admissionMembers as $member) {
                $sheet->setCellValue('A' . $row, $admission->application_no);
                $sheet->setCellValue('B' . $row, $admission->branch?->area?->zone?->name ?? '-');
                $sheet->setCellValue('C' . $row, $admission->branch?->area?->name ?? '-');
                $sheet->setCellValue('D' . $row, $admission->branch?->name ?? '-');
                $sheet->setCellValue('E' . $row, $member->excel_row_number ?? '');
                $sheet->setCellValue('F' . $row, $member->member_name);
                $sheet->setCellValue('G' . $row, $member->mobile ?? '-');
                $sheet->setCellValue('H' . $row, $member->branch_name ?? '-');
                $sheet->setCellValue('I' . $row, $member->officer_name ?? '-');
                $sheet->setCellValue('J' . $row, $member->component_name ?? '-');
                $sheet->setCellValue('K' . $row, $member->society_name ?? '-');
                $sheet->setCellValue('L' . $row, $member->residential_property ?? '-');
                $sheet->setCellValue('M' . $row, $member->cultivable_land ?? '-');
                $sheet->setCellValue('N' . $row, $member->total_land ?? '-');
                $sheet->setCellValue('O' . $row, $member->cattle_count ?? '-');
                $sheet->setCellValue('P' . $row, $member->goat_count ?? '-');
                $sheet->setCellValue('Q' . $row, $member->poultry_count ?? '-');
                $sheet->setCellValue('R' . $row, $member->fixed_movable_assets_value ?? '-');
                $sheet->setCellValue('S' . $row, $member->earning_person_occupation ?? '-');
                $sheet->setCellValue('T' . $row, $member->family_monthly_income ?? '-');
                $sheet->setCellValue('U' . $row, $member->guarantor_name ?? '-');
                $sheet->setCellValue('V' . $row, $member->guarantor_relation ?? '-');
                $sheet->setCellValue('W' . $row, $member->remarks ?? '-');
                $sheet->setCellValue('X' . $row, $member->status);
                $sheet->setCellValue('Y' . $row, $admission->submitted_at ? $admission->submitted_at->format('d/m/Y') : '');

                // Apply borders to all cells in this row
                $sheet->getStyle('A' . $row . ':Y' . $row)->applyFromArray([
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => Border::BORDER_THIN,
                            'color' => ['rgb' => '000000'],
                        ],
                    ],
                ]);

                // Apply zebra striping
                if ($row % 2 == 0) {
                    $sheet->getStyle('A' . $row . ':Y' . $row)->applyFromArray([
                        'fill' => [
                            'fillType' => Fill::FILL_SOLID,
                            'startColor' => ['rgb' => 'f3f4f6'],
                        ],
                    ]);
                }

                $row++;
            }
        }

        // Set column widths
        $sheet->getColumnDimension('A')->setWidth(15); // Application No
        $sheet->getColumnDimension('B')->setWidth(15); // Zone
        $sheet->getColumnDimension('C')->setWidth(15); // Area
        $sheet->getColumnDimension('D')->setWidth(18); // Branch
        $sheet->getColumnDimension('E')->setWidth(8);  // Serial
        $sheet->getColumnDimension('F')->setWidth(20); // Member Name
        $sheet->getColumnDimension('G')->setWidth(14); // Mobile
        $sheet->getColumnDimension('H')->setWidth(15); // Branch Name (Excel)
        $sheet->getColumnDimension('I')->setWidth(15); // Officer
        $sheet->getColumnDimension('J')->setWidth(15); // Component
        $sheet->getColumnDimension('K')->setWidth(15); // Society
        $sheet->getColumnDimension('L')->setWidth(12); // Residential Property
        $sheet->getColumnDimension('M')->setWidth(12); // Cultivable Land
        $sheet->getColumnDimension('N')->setWidth(12); // Total Land
        $sheet->getColumnDimension('O')->setWidth(8);  // Cattle
        $sheet->getColumnDimension('P')->setWidth(8);  // Goat
        $sheet->getColumnDimension('Q')->setWidth(10); // Poultry
        $sheet->getColumnDimension('R')->setWidth(12); // Asset Value
        $sheet->getColumnDimension('S')->setWidth(15); // Occupation
        $sheet->getColumnDimension('T')->setWidth(12); // Monthly Income
        $sheet->getColumnDimension('U')->setWidth(18); // Guarantor Name
        $sheet->getColumnDimension('V')->setWidth(15); // Guarantor Relation
        $sheet->getColumnDimension('W')->setWidth(20); // Remarks
        $sheet->getColumnDimension('X')->setWidth(12); // Status
        $sheet->getColumnDimension('Y')->setWidth(15); // Date

        // Set auto filter
        $sheet->setAutoFilter('A1:Y1');

        // Create filename
        $filename = 'সদস্য_ভর্তি_তালিকা_' . date('Y-m-d_His') . '.xlsx';

        // Save to temporary file
        $writer = new Xlsx($spreadsheet);
        $temp_file = tempnam(sys_get_temp_dir(), 'admission_export_');
        $writer->save($temp_file);

        return response()->download($temp_file, $filename)->deleteFileAfterSend(true);
    }

    /**
     * Export admissions to PDF
     */
    public function exportPdf(Request $request)
    {
        $query = MemberAdmission::with([
            'branch.area.zone',
            'submittedBy',
            'admissionMembers'
        ])->whereNotNull('submitted_at');

        // Apply filters
        if ($request->has('zone_id') && $request->zone_id !== '') {
            $query->whereHas('branch.area.zone', function ($q) use ($request) {
                $q->where('zones.id', $request->zone_id);
            });
        }

        if ($request->has('area_id') && $request->area_id !== '') {
            $query->whereHas('branch.area', function ($q) use ($request) {
                $q->where('areas.id', $request->area_id);
            });
        }

        if ($request->has('branch_id') && $request->branch_id !== '') {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->has('status') && $request->status !== '') {
            $query->where('status', $request->status);
        }

        if ($request->has('read_status')) {
            if ($request->read_status === 'unread') {
                $query->whereNull('reviewed_at');
            } elseif ($request->read_status === 'read') {
                $query->whereNotNull('reviewed_at');
            }
        }

        $admissions = $query->latest('submitted_at')->get();

        $filters = [
            'zone' => $request->zone_id ? Zone::find($request->zone_id)?->name : null,
            'area' => $request->area_id ? Area::find($request->area_id)?->name : null,
            'branch' => $request->branch_id ? Branch::find($request->branch_id)?->name : null,
            'status' => $request->status,
        ];

        return view('pdf.admission-submissions', compact('admissions', 'filters'));
    }

    /**
     * Branch responds to issue - resolve with explanation
     */
    public function memberResolveIssue(Request $request, $memberId)
    {
        $validated = $request->validate([
            'response' => 'required|string|min:3',
        ]);

        $member = AdmissionMember::findOrFail($memberId);

        // Get open issues for this member
        $issues = ApplicationIssue::where('application_type', 'admission')
            ->where('member_id', $memberId)
            ->where('status', 'open')
            ->get();

        if ($issues->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'কোনো সমস্যা পাওয়া যায়নি',
            ], 404);
        }

        // Add response message to all issues and mark as resolved
        foreach ($issues as $issue) {
            $issue->addMessage($request->user()->id, "Branch Response: {$validated['response']}", 'branch_response');
            $issue->markResolved($request->user()->id, $validated['response']);
        }

        // Update member status back to pending (waiting for head office review)
        $member->update(['status' => 'pending']);

        return response()->json([
            'success' => true,
            'message' => 'সঠিক কারণ পাঠানো হয়েছে',
        ]);
    }

    /**
     * Branch rejects issue - member will be rejected
     */
    public function memberRejectIssue(Request $request, $memberId)
    {
        $validated = $request->validate([
            'response' => 'required|string|min:3',
        ]);

        $member = AdmissionMember::findOrFail($memberId);

        // Get open issues for this member
        $issues = ApplicationIssue::where('application_type', 'admission')
            ->where('member_id', $memberId)
            ->where('status', 'open')
            ->get();

        // Add rejection message to all issues
        foreach ($issues as $issue) {
            $issue->addMessage($request->user()->id, "Branch Rejection: {$validated['response']}", 'branch_rejection');
            $issue->markRejected($request->user()->id, $validated['response']);
        }

        // Update member status to rejected
        $member->update([
            'status' => 'rejected',
            'rejection_reason' => $validated['response'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'প্রত্যাখ্যান করা হয়েছে',
        ]);
    }

    /**
     * Head Office approves a member
     */
    public function headOfficeApproveMember(Request $request, $memberId)
    {
        $member = AdmissionMember::findOrFail($memberId);
        $user = $request->user();

        $validated = $request->validate([
            'remarks' => 'nullable|string|max:500',
        ]);

        $member->markHeadOfficeReviewed($user->id, 'approved', $validated['remarks'] ?? null);
        $member->update(['status' => 'approved']);

        Log::info('Head Office approved member', [
            'member_id' => $memberId,
            'member_name' => $member->member_name,
            'reviewed_by' => $user->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'সদস্য অনুমোদিত হয়েছে',
        ]);
    }

    /**
     * Head Office requests correction for a member
     */
    public function headOfficeRequestCorrection(Request $request, $memberId)
    {
        $member = AdmissionMember::findOrFail($memberId);
        $user = $request->user();

        $validated = $request->validate([
            'remarks' => 'required|string|min:3|max:500',
        ]);

        $member->markHeadOfficeReviewed($user->id, 'needs_correction', $validated['remarks']);
        $member->update(['status' => 'issue']);

        Log::info('Head Office requested correction', [
            'member_id' => $memberId,
            'member_name' => $member->member_name,
            'reviewed_by' => $user->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'সংশোধনের জন্য অনুরোধ পাঠানো হয়েছে',
        ]);
    }

    /**
     * Head Office rejects a member
     */
    public function headOfficeRejectMember(Request $request, $memberId)
    {
        $member = AdmissionMember::findOrFail($memberId);
        $user = $request->user();

        $validated = $request->validate([
            'remarks' => 'required|string|min:3|max:500',
        ]);

        $member->markHeadOfficeReviewed($user->id, 'rejected', $validated['remarks']);
        $member->update([
            'status' => 'rejected',
            'rejection_reason' => $validated['remarks'],
        ]);

        Log::info('Head Office rejected member', [
            'member_id' => $memberId,
            'member_name' => $member->member_name,
            'reviewed_by' => $user->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'সদস্য প্রত্যাখ্যান করা হয়েছে',
        ]);
    }

    /**
     * Get admission members grouped by date with status tracking
     */
    public function getAdmissionsByDate(Request $request)
    {
        $user = $request->user();
        $userBranchId = $user->branch_id;

        // Get all admissions for this branch with members
        $admissions = MemberAdmission::with(['admissionMembers', 'branch'])
            ->whereHas('memberAdmission', function ($q) use ($userBranchId) {
                if ($userBranchId) {
                    $q->where('branch_id', $userBranchId);
                }
                $q->whereNotNull('submitted_at');
            })
            ->latest('submitted_at')
            ->get();

        // Group by date
        $groupedByDate = [];
        foreach ($admissions as $admission) {
            $dateKey = $admission->submitted_at->format('Y-m-d');
            if (!isset($groupedByDate[$dateKey])) {
                $groupedByDate[$dateKey] = [
                    'date' => $admission->submitted_at->format('d-m-Y'),
                    'total_members' => 0,
                    'admissions' => [],
                ];
            }

            $memberStats = [
                'total' => $admission->admissionMembers->count(),
                'pending' => $admission->admissionMembers->where('status', 'pending')->count(),
                'issue' => $admission->admissionMembers->where('status', 'issue')->count(),
                'approved' => $admission->admissionMembers->where('status', 'approved')->count(),
                'rejected' => $admission->admissionMembers->where('status', 'rejected')->count(),
                'head_office_reviewed' => $admission->admissionMembers->whereNotNull('head_office_reviewed_at')->count(),
            ];

            $groupedByDate[$dateKey]['admissions'][] = [
                'id' => $admission->id,
                'application_no' => $admission->application_no,
                'total_members' => $admission->total_members,
                'status' => $admission->status,
                'submitted_at' => $admission->submitted_at->format('H:i'),
                'member_stats' => $memberStats,
            ];

            $groupedByDate[$dateKey]['total_members'] += $admission->total_members;
        }

        // Sort dates in descending order
        krsort($groupedByDate);

        return response()->json([
            'success' => true,
            'data' => array_values($groupedByDate),
        ]);
    }

    /**
     * Get member details with head office review status
     */
    public function getMemberWithReviewStatus(Request $request, $memberId)
    {
        $member = AdmissionMember::with(['memberAdmission.branch', 'headOfficeReviewedBy'])
            ->findOrFail($memberId);

        return response()->json([
            'success' => true,
            'member' => [
                'id' => $member->id,
                'member_name' => $member->member_name,
                'mobile' => $member->mobile,
                'status' => $member->status,
                'head_office_decision' => $member->head_office_decision,
                'head_office_status_label' => $member->getHeadOfficeStatusLabel(),
                'head_office_reviewed_at' => $member->head_office_reviewed_at?->format('Y-m-d H:i'),
                'head_office_remarks' => $member->head_office_remarks,
                'branch_correction_remarks' => $member->branch_correction_remarks,
                'branch_feedback_at' => $member->branch_feedback_at?->format('Y-m-d H:i'),
                'head_office_reviewed_by' => $member->headOfficeReviewedBy?->name,
            ],
        ]);
    }

    /**
     * Show page for Head Office to review a member (Inertia)
     */
    public function headOfficeMemberReviewPage(Request $request, $memberId)
    {
        $member = AdmissionMember::with(['memberAdmission.branch', 'headOfficeReviewedBy'])
            ->findOrFail($memberId);

        $memberData = [
            'id' => $member->id,
            'member_name' => $member->member_name,
            'mobile' => $member->mobile,
            'status' => $member->status,
            'head_office_decision' => $member->head_office_decision,
            'head_office_status_label' => $member->getHeadOfficeStatusLabel(),
            'head_office_reviewed_at' => $member->head_office_reviewed_at?->format('Y-m-d H:i'),
            'head_office_remarks' => $member->head_office_remarks,
            'branch_correction_remarks' => $member->branch_correction_remarks,
            'branch_feedback_at' => $member->branch_feedback_at?->format('Y-m-d H:i'),
            'head_office_reviewed_by' => $member->headOfficeReviewedBy?->name,
        ];

        return Inertia::render('HeadOffice/AdmissionMemberReview', [
            'member' => $memberData,
            'admission_id' => $member->member_admission_id,
        ]);
    }

    /**
     * Show detailed view for Head Office admission (Inertia)
     */
    public function headOfficeAdmissionDetail(Request $request, $admissionId)
    {
        $admission = MemberAdmission::with(['branch', 'admissionMembers.headOfficeReviewedBy'])
            ->findOrFail($admissionId);

        $admissionData = [
            'id' => $admission->id,
            'application_no' => $admission->application_no,
            'total_members' => $admission->total_members,
            'branch_name' => $admission->branch?->name,
            'submitted_at' => $admission->submitted_at,
            'reviewed_at' => $admission->reviewed_at,
            'members' => $admission->admissionMembers->map(function ($member) {
                return [
                    'id' => $member->id,
                    'member_name' => $member->member_name,
                    'mobile' => $member->mobile,
                    'status' => $member->status,
                    'head_office_decision' => $member->head_office_decision,
                    'head_office_status_label' => $member->getHeadOfficeStatusLabel(),
                    'head_office_reviewed_at' => $member->head_office_reviewed_at?->format('Y-m-d H:i'),
                    'head_office_reviewed_by' => $member->headOfficeReviewedBy?->name,
                ];
            })->toArray(),
        ];

        return Inertia::render('HeadOffice/AdmissionDetailView', [
            'admission' => $admissionData,
        ]);
    }

    /**
     * API: Get updated members data for live refresh
     */
    public function getUpdatedData(Request $request)
    {
        $user = $request->user();
        $selectedDate = $request->input('date', now()->toDateString());
        $statusFilter = $request->input('status', '');
        $searchQuery = $request->input('search', '');

        // Clean up filters
        $statusFilter = trim($statusFilter ?? '');
        $searchQuery = trim($searchQuery ?? '');

        // Get branch_id from user
        $userBranchId = $user->branch_id;

        // Base query for members
        $baseQuery = function ($q) use ($userBranchId, $selectedDate) {
            if ($userBranchId) {
                $q->where('branch_id', $userBranchId);
            }
            $q->whereDate('submitted_at', $selectedDate)
              ->whereNotNull('submitted_at');
        };

        // Get members for this branch submitted on selected date - all fields for view modal
        $query = AdmissionMember::with([
                'memberAdmission:id,application_no,branch_id',
                'memberAdmission.branch:id,name,area_id',
                'memberAdmission.branch.area:id,name,zone_id',
                'memberAdmission.branch.area.zone:id,name',
                'issues:id,member_id,issue_type,issue_description,status,created_at,messages,resolution_notes,resolved_at'
            ])
            ->whereHas('memberAdmission', $baseQuery);

        // Filter by status - ONLY if statusFilter is not empty
        if (!empty($statusFilter)) {
            $query->where('status', $statusFilter);
        }

        // Search by name/mobile
        if (!empty($searchQuery)) {
            $query->where(function ($q) use ($searchQuery) {
                $q->where('member_name', 'like', "%{$searchQuery}%")
                  ->orWhere('mobile', 'like', "%{$searchQuery}%");
            });
        }

        // Get members - issues first, then by name
        $members = $query->orderByRaw("FIELD(status, 'issue', 'pending', 'approved', 'rejected')")
            ->orderBy('member_name')
            ->get();

        // Calculate stats using single query
        $stats = DB::table('admission_members')
            ->whereHas('memberAdmission', $baseQuery)
            ->selectRaw('
                COUNT(*) as total,
                SUM(CASE WHEN status = "pending" THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = "issue" THEN 1 ELSE 0 END) as issue,
                SUM(CASE WHEN status = "approved" THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN status = "rejected" THEN 1 ELSE 0 END) as rejected
            ')
            ->first();

        $membersData = $members->map(function ($member) {
            $admission = $member->memberAdmission;
            return [
                'id' => $member->id,
                'excel_row_number' => $member->excel_row_number,
                'branch_name' => $member->branch_name,
                'officer_name' => $member->officer_name,
                'component_name' => $member->component_name,
                'society_name' => $member->society_name,
                'member_name' => $member->member_name,
                'mobile' => $member->mobile,
                'nid_front_image' => $member->nid_front_image,
                'nid_back_image' => $member->nid_back_image,
                'residential_property' => $member->residential_property,
                'cultivable_land' => $member->cultivable_land,
                'total_land' => $member->total_land,
                'cattle_count' => $member->cattle_count,
                'goat_count' => $member->goat_count,
                'poultry_count' => $member->poultry_count,
                'fixed_movable_assets_value' => $member->fixed_movable_assets_value,
                'earning_person_occupation' => $member->earning_person_occupation,
                'family_monthly_income' => $member->family_monthly_income,
                'guarantor_name' => $member->guarantor_name,
                'guarantor_relation' => $member->guarantor_relation,
                'remarks' => $member->remarks,
                'status' => $member->status,
                'application_no' => $admission->application_no,
                'zone_name' => $admission->branch?->area?->zone?->name,
                'area_name' => $admission->branch?->area?->name,
                'issues' => collect($member->issues ?? [])->map(function ($issue) {
                    return [
                        'id' => $issue->id,
                        'issue_type' => $issue->issue_type,
                        'issue_description' => $issue->issue_description,
                        'severity' => $issue->severity ?? '',
                        'status' => $issue->status,
                        'created_at' => $issue->created_at->format('Y-m-d H:i'),
                        'resolution_notes' => $issue->resolution_notes,
                    ];
                })->toArray(),
            ];
        });

        return response()->json([
            'members' => $membersData,
            'stats' => [
                'total' => (int)($stats->total ?? 0),
                'pending' => (int)($stats->pending ?? 0),
                'issue' => (int)($stats->issue ?? 0),
                'approved' => (int)($stats->approved ?? 0),
                'rejected' => (int)($stats->rejected ?? 0),
            ],
        ]);
    }
}

