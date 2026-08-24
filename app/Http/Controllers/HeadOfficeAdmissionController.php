<?php

namespace App\Http\Controllers;

use App\Models\MemberAdmission;
use App\Models\MemberAdmissionIssue;
use App\Models\Zone;
use App\Models\Area;
use App\Models\Branch;
use App\Models\User;
use App\Models\Role;
use App\Services\ApprovalService;
use App\Services\BlockListService;
use App\Services\NotificationService;
use App\Support\RoleListWorkQueue;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;

class HeadOfficeAdmissionController extends Controller
{
    use Concerns\AppliesRoleDefaultListFilter;
    use Concerns\ScopesToAccessibleBranches;
    use Concerns\RequiresSuperAdminDeletePin;
    use Concerns\ResolvesListPerPage;

    /**
     * Display admissions (all branches for HO; assigned zone/area for approvers/managers)
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $workQueue = RoleListWorkQueue::resolveWithDates($request, true, $user);
        $statusFilter = $workQueue['status'];
        $dateFrom = $workQueue['date_from'];
        $dateTo = $workQueue['date_to'];

        $query = MemberAdmission::with([
            'branch' => fn ($q) => $q->withTrashed()->with(['area.zone']),
            'samity',
            'memberCategory',
            'submittedBy',
            'createdBy',
            'approvals.user',
        ])->withCount('loanApplications');

        $this->applyAccessibleBranchScope($query);
        $this->applyHeadOfficeStageVisibility($query);
        $this->applySubmittedAtDateRange($query, $dateFrom, $dateTo);

        // Zone filter
        if ($request->has('zone_id') && $request->zone_id) {
            $query->whereHas('branch.area', function($q) use ($request) {
                $q->where('zone_id', $request->zone_id);
            });
        }

        // Area filter
        if ($request->has('area_id') && $request->area_id) {
            $query->whereHas('branch', function($q) use ($request) {
                $q->where('area_id', $request->area_id);
            });
        }

        // Branch filter
        if ($request->has('branch_id') && $request->branch_id) {
            $query->where('branch_id', $request->branch_id);
        }

        // Status filter. Drafts are hidden from the default "All" list, but a Head
        // Office user can view every draft by explicitly selecting the draft filter.
        $this->applyResolvedStatusFilter($query, $statusFilter, $user, 'admission', true);

        // Search filter
        if ($request->has('search') && $request->search) {
            \App\Services\MemberCodeService::applyAdmissionSearch($query, $request->search);
        }

        // Had issues filter (for admissions that went through revision)
        if ($request->has('had_issues') && $request->had_issues) {
            if ($request->had_issues === 'yes') {
                $query->where('revision_count', '>', 0);
            } elseif ($request->had_issues === 'no') {
                $query->where(function($q) {
                    $q->whereNull('revision_count')->orWhere('revision_count', 0);
                });
            }
        }

        // Printed filter (প্রিন্ট সম্পন্ন / প্রিন্ট হয়নি)
        if ($request->filled('printed')) {
            if ($request->printed === 'yes') {
                $query->whereNotNull('printed_at');
            } elseif ($request->printed === 'no') {
                $query->whereNull('printed_at');
            }
        }

        // Calculate stats based on current filters (excluding status filter for stats)
        $statsQuery = MemberAdmission::query();
        $this->applyAccessibleBranchScope($statsQuery);
        $this->applyHeadOfficeStageVisibility($statsQuery);
        $this->applySubmittedAtDateRange($statsQuery, $dateFrom, $dateTo);

        // Apply zone/area/branch filters to stats
        if ($request->has('zone_id') && $request->zone_id) {
            $statsQuery->whereHas('branch.area', function($q) use ($request) {
                $q->where('zone_id', $request->zone_id);
            });
        }

        if ($request->has('area_id') && $request->area_id) {
            $statsQuery->whereHas('branch', function($q) use ($request) {
                $q->where('area_id', $request->area_id);
            });
        }

        if ($request->has('branch_id') && $request->branch_id) {
            $statsQuery->where('branch_id', $request->branch_id);
        }

        if ($request->has('had_issues') && $request->had_issues) {
            if ($request->had_issues === 'yes') {
                $statsQuery->where('revision_count', '>', 0);
            } elseif ($request->had_issues === 'no') {
                $statsQuery->where(function($q) {
                    $q->whereNull('revision_count')->orWhere('revision_count', 0);
                });
            }
        }

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $statsQuery->where(function($q) use ($search) {
                $q->where('application_no', 'like', "%{$search}%")
                  ->orWhere('applicant_name_en', 'like', "%{$search}%")
                  ->orWhere('applicant_name_bn', 'like', "%{$search}%")
                  ->orWhere('mobile_number', 'like', "%{$search}%")
                  ->orWhere('nid_number', 'like', "%{$search}%");
            });
        }

        if ($request->filled('printed')) {
            if ($request->printed === 'yes') {
                $statsQuery->whereNotNull('printed_at');
            } elseif ($request->printed === 'no') {
                $statsQuery->whereNull('printed_at');
            }
        }

        $stats = [
            // "Total" mirrors the default (All) list, which excludes drafts.
            'total' => (clone $statsQuery)->where('status', '!=', 'draft')->count(),
            'draft' => (clone $statsQuery)->where('status', 'draft')->count(),
            'submitted' => (clone $statsQuery)->where('status', 'submitted')->count(),
            'under_review' => (clone $statsQuery)->where('status', 'under_review')->count(),
            'pending_head_office' => (clone $statsQuery)->where('status', 'pending_head_office')->count(),
            'approved' => (clone $statsQuery)->where('status', 'approved')->count(),
            'rejected' => (clone $statsQuery)->where('status', 'rejected')->count(),
            'needs_revision' => (clone $statsQuery)->where('status', 'needs_revision')->count(),
            'pending_my_approval' => $this->countPendingMyApproval($statsQuery, $user, 'admission'),
        ];

        $perPage = $this->resolvePerPage($request);
        $admissions = $query->orderByRaw('COALESCE(submitted_at, created_at) desc')->paginate($perPage)->withQueryString();

        $admissions = $admissions->through(function (MemberAdmission $admission) {
            $arr = $admission->toArray();
            $arr['tracking_state'] = $admission->getTrackingState();
            return $arr;
        });

        $orgFilters = $this->organizationFilterOptions();

        return Inertia::render('HeadOffice/AdmissionMembers', [
            'admissions' => $admissions,
            'filters' => array_merge(
                $request->only(['search', 'zone_id', 'area_id', 'branch_id', 'had_issues', 'printed']),
                [
                    'status' => $workQueue['status_param'],
                    'date_from' => $dateFrom,
                    'date_to' => $dateTo,
                    'per_page' => $perPage,
                ]
            ),
            'stats' => $stats,
            'zones' => $orgFilters['zones'],
            'areas' => $orgFilters['areas'],
            'branches' => $orgFilters['branches'],
            'viewAllAdmissions' => ! $this->shouldRestrictToHeadOfficeStage(),
            'workQueue' => $this->listWorkQueueProps($workQueue),
        ]);
    }

    /**
     * Print view for admissions (no layout, optimized for printing)
     */
    public function print(Request $request)
    {
        $query = MemberAdmission::with([
            'branch.area.zone',
            'samity',
            'memberCategory',
            'submittedBy',
            'createdBy',
            'familyMembers',
        ]);

        $this->applyAccessibleBranchScope($query);
        $this->applyHeadOfficeStageVisibility($query);

        $workQueue = RoleListWorkQueue::resolveWithDates($request, true);
        $this->applySubmittedAtDateRange($query, $workQueue['date_from'], $workQueue['date_to']);

        if ($request->zone_id) {
            $query->whereHas('branch.area', function($q) use ($request) {
                $q->where('zone_id', $request->zone_id);
            });
        }

        if ($request->area_id) {
            $query->whereHas('branch', function($q) use ($request) {
                $q->where('area_id', $request->area_id);
            });
        }

        if ($request->branch_id) {
            $query->where('branch_id', $request->branch_id);
        }

        $this->applyResolvedStatusFilter($query, $workQueue['status'], $request->user(), 'admission', true);

        if ($request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('application_no', 'like', "%{$search}%")
                  ->orWhere('applicant_name_en', 'like', "%{$search}%")
                  ->orWhere('applicant_name_bn', 'like', "%{$search}%")
                  ->orWhere('mobile_number', 'like', "%{$search}%")
                  ->orWhere('nid_number', 'like', "%{$search}%");
            });
        }

        if ($request->had_issues) {
            if ($request->had_issues === 'yes') {
                $query->where('revision_count', '>', 0);
            } elseif ($request->had_issues === 'no') {
                $query->where(function($q) {
                    $q->whereNull('revision_count')->orWhere('revision_count', 0);
                });
            }
        }

        // Get all matching records sorted by branch code (no pagination for print)
        $admissions = $query->orderBy(
            \App\Models\Branch::select('code')->whereColumn('branches.id', 'member_admissions.branch_id'),
            'asc'
        )->orderByRaw('COALESCE(submitted_at, created_at) desc')->get();

        $orgFilters = $this->organizationFilterOptions();

        return Inertia::render('HeadOffice/AdmissionMembersPrint', [
            'admissions' => $admissions,
            'filters' => $request->only(['status', 'search', 'zone_id', 'area_id', 'branch_id', 'date_from', 'date_to', 'had_issues']),
            'zones' => $orgFilters['zones'],
            'areas' => $orgFilters['areas'],
            'branches' => $orgFilters['branches'],
        ]);
    }

    /**
     * Export admissions to XLSX (same filters as index / print).
     */
    public function exportExcel(Request $request)
    {
        $query = MemberAdmission::with([
            'branch' => fn ($q) => $q->withTrashed()->with(['area.zone']),
            'samity',
            'memberCategory',
            'createdBy',
            'approvals.user',
        ]);

        $this->applyAccessibleBranchScope($query);
        $this->applyHeadOfficeStageVisibility($query);

        $workQueue = RoleListWorkQueue::resolveWithDates($request, true);
        $this->applySubmittedAtDateRange($query, $workQueue['date_from'], $workQueue['date_to']);

        if ($request->zone_id) {
            $query->whereHas('branch.area', fn ($q) => $q->where('zone_id', $request->zone_id));
        }
        if ($request->area_id) {
            $query->whereHas('branch', fn ($q) => $q->where('area_id', $request->area_id));
        }
        if ($request->branch_id) {
            $query->where('branch_id', $request->branch_id);
        }

        $this->applyResolvedStatusFilter($query, $workQueue['status'], $request->user(), 'admission', true);

        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('application_no', 'like', "%{$search}%")
                    ->orWhere('applicant_name_en', 'like', "%{$search}%")
                    ->orWhere('applicant_name_bn', 'like', "%{$search}%")
                    ->orWhere('mobile_number', 'like', "%{$search}%")
                    ->orWhere('nid_number', 'like', "%{$search}%");
            });
        }

        if ($request->had_issues === 'yes') {
            $query->where('revision_count', '>', 0);
        } elseif ($request->had_issues === 'no') {
            $query->where(function ($q) {
                $q->whereNull('revision_count')->orWhere('revision_count', 0);
            });
        }

        if ($request->printed === 'yes') {
            $query->whereNotNull('printed_at');
        } elseif ($request->printed === 'no') {
            $query->whereNull('printed_at');
        }

        $admissions = $query->orderByRaw('COALESCE(submitted_at, created_at) desc')->get();

        $statusLabels = [
            'draft' => 'খসড়া',
            'submitted' => 'জমা',
            'under_review' => 'পর্যালোচনায়',
            'ready_for_head_office' => 'শাখা অনুমোদিত',
            'pending_head_office' => 'হেড অফিসে',
            'approved' => 'অনুমোদিত',
            'rejected' => 'প্রত্যাখ্যাত',
            'needs_revision' => 'সংশোধন',
        ];

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Admission Members');

        $headers = [
            'আবেদন নং',
            'আবেদনকারী (বাংলা)',
            'আবেদনকারী (ইংরেজি)',
            'মোবাইল',
            'জোন',
            'এলাকা',
            'শাখা',
            'সমিতি',
            'ক্যাটাগরি',
            'তৈরি করেছেন',
            'স্ট্যাটাস',
            'পেন্ডিং অবস্থান',
            'প্রিন্ট',
            'জমার তারিখ',
            'তৈরির তারিখ',
        ];
        $sheet->fromArray($headers, null, 'A1');

        $lastColumn = Coordinate::stringFromColumnIndex(count($headers));
        $sheet->getStyle("A1:{$lastColumn}1")->applyFromArray([
            'font' => ['bold' => true, 'size' => 11, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1E293B'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
                'wrapText' => true,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => '334155'],
                ],
            ],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(28);

        $row = 2;
        foreach ($admissions as $admission) {
            $tracking = $admission->getTrackingState();
            $sheet->fromArray([
                $admission->application_no,
                $admission->applicant_name_bn,
                $admission->applicant_name_en,
                $admission->mobile_number,
                $admission->branch?->area?->zone?->name ?? '',
                $admission->branch?->area?->name ?? '',
                $admission->branch?->name ?? '',
                $admission->samity?->samity_name ?? '',
                $admission->memberCategory?->category_name ?? '',
                $admission->createdBy?->name ?? '',
                $statusLabels[$admission->status] ?? $admission->status,
                $tracking['label'] ?? '',
                $admission->printed_at ? 'প্রিন্ট সম্পন্ন' : 'প্রিন্ট হয়নি',
                $admission->submitted_at?->format('Y-m-d') ?? '',
                $admission->created_at?->format('Y-m-d H:i') ?? '',
            ], null, "A{$row}");

            $sheet->getStyle("A{$row}:{$lastColumn}{$row}")->applyFromArray([
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color' => ['rgb' => 'CBD5E1'],
                    ],
                ],
                'alignment' => [
                    'vertical' => Alignment::VERTICAL_CENTER,
                ],
            ]);
            $row++;
        }

        foreach (range(1, count($headers)) as $col) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($col))->setAutoSize(true);
        }

        $filename = 'admission-members-'.$dateFrom.'_to_'.$dateTo.'.xlsx';
        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * Mark admissions as printed (same filter as print) so list can show printed/not printed
     */
    public function markAsPrinted(Request $request)
    {
        $query = MemberAdmission::query();
        $this->applyAccessibleBranchScope($query);
        $this->applyHeadOfficeStageVisibility($query);

        $workQueue = RoleListWorkQueue::resolveWithDates($request, true);
        $this->applySubmittedAtDateRange($query, $workQueue['date_from'], $workQueue['date_to']);

        if ($request->zone_id) {
            $query->whereHas('branch.area', fn ($q) => $q->where('zone_id', $request->zone_id));
        }
        if ($request->area_id) {
            $query->whereHas('branch', fn ($q) => $q->where('area_id', $request->area_id));
        }
        if ($request->branch_id) {
            $query->where('branch_id', $request->branch_id);
        }
        $this->applyResolvedStatusFilter($query, $workQueue['status'], $request->user(), 'admission', true);
        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('application_no', 'like', "%{$search}%")
                    ->orWhere('applicant_name_en', 'like', "%{$search}%")
                    ->orWhere('applicant_name_bn', 'like', "%{$search}%")
                    ->orWhere('mobile_number', 'like', "%{$search}%")
                    ->orWhere('nid_number', 'like', "%{$search}%");
            });
        }
        if ($request->had_issues) {
            if ($request->had_issues === 'yes') {
                $query->where('revision_count', '>', 0);
            } elseif ($request->had_issues === 'no') {
                $query->where(fn ($q) => $q->whereNull('revision_count')->orWhere('revision_count', 0));
            }
        }

        $ids = $query->pluck('id');
        MemberAdmission::whereIn('id', $ids)->update(['printed_at' => now()]);

        return back()->with('success', __('প্রিন্ট সম্পন্ন চিহ্নিত হয়েছে।') ?: 'প্রিন্ট সম্পন্ন চিহ্নিত হয়েছে।');
    }

    /**
     * Display pending Head Office admissions for processing
     */
    public function process(Request $request)
    {
        $query = MemberAdmission::with([
            'branch',
            'samity',
            'memberCategory',
            'submittedBy',
            'issues' => function($q) {
                $q->where('status', 'pending')->with('reporter');
            }
        ])
        ->where('status', 'pending_head_office');

        $this->applyAccessibleBranchScope($query);

        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');
        $date = $request->input('date');
        $month = $request->input('month');

        // Default to current month when no date range / date / month is passed
        if (!$dateFrom && !$dateTo && !$date && !$month) {
            $month = now()->format('Y-m');
        }

        if ($dateFrom || $dateTo) {
            if ($dateFrom) {
                $query->where('submitted_at', '>=', Carbon::parse($dateFrom)->startOfDay());
            }
            if ($dateTo) {
                $query->where('submitted_at', '<=', Carbon::parse($dateTo)->endOfDay());
            }
        } elseif ($date) {
            $query->whereDate('submitted_at', $date);
        } elseif ($month) {
            $parts = explode('-', $month);
            if (count($parts) === 2) {
                $query->whereYear('submitted_at', $parts[0])
                      ->whereMonth('submitted_at', $parts[1]);
            }
        }

        // Zone filter
        if ($request->filled('zone_id')) {
            $query->whereHas('branch.area', function($q) use ($request) {
                $q->where('zone_id', $request->zone_id);
            });
        }

        // Area filter
        if ($request->filled('area_id')) {
            $query->whereHas('branch', function($q) use ($request) {
                $q->where('area_id', $request->area_id);
            });
        }

        // Branch filter
        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        // Search filter
        $search = $request->input('search');
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('applicant_name_en', 'like', "%{$search}%")
                  ->orWhere('applicant_name_bn', 'like', "%{$search}%")
                  ->orWhere('nid_number', 'like', "%{$search}%")
                  ->orWhere('smart_card_number', 'like', "%{$search}%")
                  ->orWhere('mobile_number', 'like', "%{$search}%")
                  ->orWhere('application_no', 'like', "%{$search}%");
            });
        }

        $perPage = $this->resolvePerPage($request);
        $admissions = $query->orderBy('submitted_at', 'desc')->paginate($perPage)->withQueryString();

        $orgFilters = $this->organizationFilterOptions();

        return Inertia::render('HeadOffice/ProcessAdmissions', [
            'admissions' => $admissions,
            'filters' => [
                'month' => $month,
                'date' => $date,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'search' => $search,
                'zone_id' => $request->input('zone_id'),
                'area_id' => $request->input('area_id'),
                'branch_id' => $request->input('branch_id'),
                'per_page' => $perPage,
            ],
            'zones' => $orgFilters['zones'],
            'areas' => $orgFilters['areas'],
            'branches' => $orgFilters['branches'],
        ]);
    }

    /**
     * Show single admission for Head Office
     */
    public function show(MemberAdmission $admission)
    {
        $this->ensureCanAccessBranch($admission->branch_id);
        $this->ensureHeadOfficeCanViewAdmission($admission);

        $admission->load([
            'branch.area.zone',
            'samity',
            'memberCategory',
            'submittedBy',
            'reviewedBy',
            'approvals.user',
            'familyMembers',
            'otherAssets',
            'issues' => function($q) {
                $q->with(['reporter', 'resolver']);
            }
        ]);

        return Inertia::render('MemberAdmission/Show', [
            'admission' => $admission,
            'auth' => [
                'user' => [
                    'has_all_access' => auth()->user()->has_all_access,
                ],
            ],
        ]);
    }

    /**
     * Print single admission profile
     */
    public function printSingle(MemberAdmission $admission)
    {
        $this->ensureCanAccessBranch($admission->branch_id);
        $this->ensureHeadOfficeCanViewAdmission($admission);

        $admission->load([
            'branch.area.zone',
            'samity',
            'memberCategory',
            'submittedBy',
            'reviewedBy',
            'familyMembers',
            'otherAssets',
        ]);

        return Inertia::render('HeadOffice/AdmissionPrintSingle', [
            'admission' => $admission,
        ]);
    }

    /**
     * Store issue/report for an admission
     */
    public function storeIssue(Request $request, MemberAdmission $admission)
    {
        $validated = $request->validate([
            'issue_description' => 'required|string|max:2000',
        ]);

        MemberAdmissionIssue::create([
            'member_admission_id' => $admission->id,
            'reported_by' => auth()->id(),
            'issue_description' => $validated['issue_description'],
            'status' => 'pending',
        ]);

        return back()->with('success', 'Issue reported successfully!');
    }

    /**
     * Convert a "new" admission to legacy/old member, set loan dofa, and auto-approve.
     */
    public function markAsLegacy(Request $request, MemberAdmission $admission)
    {
        $this->ensureCanAccessBranch($admission->branch_id);

        if ($admission->is_legacy) {
            return back()->with('error', 'এই আবেদনটি ইতিমধ্যে পুরাতন সদস্য হিসেবে চিহ্নিত।');
        }

        if ($admission->status === 'rejected') {
            return back()->with('error', 'প্রত্যাখ্যাত আবেদন পুরাতন সদস্য হিসেবে চিহ্নিত করা যাবে না।');
        }

        $validated = $request->validate([
            'loan_dofa' => 'required|integer|min:1|max:999',
        ], [
            'loan_dofa.required' => 'পুরাতন সদস্যের জন্য ঋণের দফা দেওয়া বাধ্যতামূলক।',
            'loan_dofa.integer' => 'ঋণের দফা সংখ্যায় হতে হবে।',
            'loan_dofa.min' => 'ঋণের দফা কমপক্ষে ১ হতে হবে।',
            'loan_dofa.max' => 'ঋণের দফা সর্বোচ্চ ৯৯৯ হতে পারে।',
        ]);

        $authUser = auth()->user();

        DB::transaction(function () use ($admission, $validated, $authUser) {
            // Close out any pending approval chain
            $admission->approvals()
                ->where('status', 'pending')
                ->update([
                    'status' => 'approved',
                    'approved_at' => now(),
                    'comments' => 'পুরাতন সদস্য হিসেবে হেড অফিস কর্তৃক স্বয়ংক্রিয় অনুমোদন',
                ]);

            // Clear pending issues so legacy approval is not blocked later
            $admission->issues()
                ->where('status', 'pending')
                ->update([
                    'status' => 'resolved',
                    'resolved_at' => now(),
                    'resolved_by' => $authUser->id,
                ]);

            $updateData = [
                'is_legacy' => true,
                'loan_dofa' => $validated['loan_dofa'],
                'status' => 'approved',
                'reviewed_by' => $authUser->id,
                'reviewed_at' => now(),
                'rejection_reason' => null,
            ];

            if (!$admission->submitted_at) {
                $updateData['submitted_by'] = $admission->submitted_by ?: $authUser->id;
                $updateData['submitted_at'] = now();
            }

            $admission->update($updateData);
        });

        $admission->refresh()->loadMissing(['createdBy', 'submittedBy', 'branch']);
        $recipients = collect([$admission->createdBy, $admission->submittedBy])->filter();
        $branchManagers = User::where('branch_id', $admission->branch_id)
            ->where('is_active', 1)
            ->whereHas('role', fn ($q) => $q->where('name', Role::BRANCH_MANAGER))
            ->get();
        $recipients = $recipients->concat($branchManagers);

        app(NotificationService::class)->send(
            users: $recipients,
            type: 'member_admission',
            title: 'সদস্য আবেদন পুরাতন সদস্য হিসেবে অনুমোদিত',
            message: "সদস্য আবেদন নং {$admission->application_no} ({$admission->applicant_name_bn}) হেড অফিস থেকে পুরাতন সদস্য (দফা {$validated['loan_dofa']}) হিসেবে চিহ্নিত ও অনুমোদিত হয়েছে।",
            notifiable: $admission,
            actionUrl: "/member-admissions/{$admission->id}",
            details: [
                'আবেদন নং' => $admission->application_no,
                'আবেদনকারীর নাম' => $admission->applicant_name_bn ?: $admission->applicant_name_en,
                'শাখা' => $admission->branch?->name ?? 'N/A',
                'ঋণের দফা' => $validated['loan_dofa'],
                'অনুমোদন তারিখ' => now()->format('Y-m-d H:i'),
            ]
        );

        return back()->with('success', 'আবেদনটি পুরাতন সদস্য হিসেবে চিহ্নিত ও অনুমোদিত হয়েছে।');
    }

    /**
     * Reset all approvals back to Branch Manager.
     */
    public function resetApproval(MemberAdmission $admission)
    {
        $this->ensureCanAccessBranch($admission->branch_id);

        if ($admission->status === 'draft') {
            return back()->with('error', 'খসড়া আবেদনের অনুমোদন রিসেট করা যাবে না।');
        }

        try {
            DB::transaction(function () use ($admission) {
                $updateData = [
                    'status' => 'submitted',
                    'reviewed_by' => null,
                    'reviewed_at' => null,
                    'rejection_reason' => null,
                    'selected_approvers' => null,
                ];

                if (!$admission->submitted_at) {
                    $updateData['submitted_by'] = $admission->submitted_by ?: auth()->id();
                    $updateData['submitted_at'] = now();
                }

                $admission->update($updateData);

                app(ApprovalService::class)->createApprovalWorkflow($admission);
            });
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }

        $admission->refresh()->loadMissing(['createdBy', 'submittedBy', 'branch']);
        $branchManagers = User::where('branch_id', $admission->branch_id)
            ->where('is_active', 1)
            ->whereHas('role', fn ($q) => $q->where('name', Role::BRANCH_MANAGER))
            ->get();
        $recipients = collect([$admission->createdBy, $admission->submittedBy])
            ->concat($branchManagers)
            ->filter()
            ->unique('id');

        if ($recipients->isNotEmpty()) {
            app(NotificationService::class)->send(
                users: $recipients,
                type: 'member_admission',
                title: 'সদস্য আবেদনের অনুমোদন রিসেট করা হয়েছে',
                message: "সদস্য আবেদন নং {$admission->application_no} ({$admission->applicant_name_bn}) হেড অফিস থেকে শাখা ব্যবস্থাপক পর্যায়ে রিসেট করা হয়েছে।",
                notifiable: $admission,
                actionUrl: '/approvals',
                details: [
                    'আবেদন নং' => $admission->application_no,
                    'আবেদনকারীর নাম' => $admission->applicant_name_bn ?: $admission->applicant_name_en,
                    'শাখা' => $admission->branch?->name ?? 'N/A',
                ]
            );
        }

        return back()->with('success', 'অনুমোদন শাখা ব্যবস্থাপক পর্যায়ে রিসেট করা হয়েছে।');
    }

    /**
     * Approve single admission
     */
    public function approveSingle(MemberAdmission $admission)
    {
        // Only block if has unanswered pending issues
        if ($admission->issues()->where('status', 'pending')->where(function ($q) {
            $q->whereNull('resolution_note')->orWhere('resolution_note', '');
        })->exists()) {
            return back()->with('error', 'জোন থেকে ব্যাখ্যা/জবাব না পাওয়া পর্যন্ত অনুমোদন করা যাবে না।');
        }

        // Close/resolve any pending issues now that Head Office is approving
        $admission->issues()->where('status', 'pending')->update([
            'status' => 'resolved',
            'resolved_at' => now(),
            'resolved_by' => auth()->id(),
        ]);

        $admission->update([
            'status' => 'approved',
            'reviewed_at' => now(),
            'reviewed_by' => auth()->id(),
        ]);

        // Send notifications
        $admission->loadMissing(['createdBy', 'submittedBy', 'branch']);
        $recipients = collect([$admission->createdBy, $admission->submittedBy])->filter();
        $branchManagers = User::where('branch_id', $admission->branch_id)
            ->where('is_active', 1)
            ->whereHas('role', fn ($q) => $q->where('name', Role::BRANCH_MANAGER))
            ->get();
        $recipients = $recipients->concat($branchManagers);

        app(NotificationService::class)->send(
            users: $recipients,
            type: 'member_admission',
            title: 'সদস্য আবেদন হেড অফিস কর্তৃক চূড়ান্ত অনুমোদিত',
            message: "সদস্য আবেদন নং {$admission->application_no} ({$admission->applicant_name_bn}) হেড অফিস থেকে চূড়ান্তভাবে অনুমোদিত হয়েছে।",
            notifiable: $admission,
            actionUrl: "/member-admissions/{$admission->id}",
            details: [
                'আবেদন নং' => $admission->application_no,
                'আবেদনকারীর নাম' => $admission->applicant_name_bn ?: $admission->applicant_name_en,
                'শাখা' => $admission->branch?->name ?? 'N/A',
                'অনুমোদন তারিখ' => now()->format('Y-m-d H:i'),
            ]
        );

        return back()->with('success', 'Admission approved successfully!');
    }

    /**
     * Reject single admission and push the applicant to the block list.
     */
    public function rejectSingle(Request $request, MemberAdmission $admission)
    {
        $rules = [
            'rejection_reason' => 'required|string|max:2000',
            'push_to_block_list' => ['sometimes', 'boolean'],
        ];

        $pushToBlockList = $request->boolean('push_to_block_list', true);

        if ($pushToBlockList) {
            $fromAdmission = $this->blockListFromAdmission($admission);
            $incoming = $request->input('block_list', []);
            $incoming = is_array($incoming) ? array_filter($incoming, fn ($value) => $value !== null && $value !== '') : [];
            $merged = array_merge($fromAdmission, $incoming);
            $merged['phone_number'] = preg_replace('/\D+/', '', (string) ($merged['phone_number'] ?? '')) ?: '';
            $request->merge(['block_list' => $merged]);
            $rules = array_merge($rules, [
                'block_list.nid_number' => ['required', 'string', 'max:50'],
                'block_list.phone_number' => ['required', 'string', 'regex:/^[0-9]{10,14}$/'],
                'block_list.name_bn' => ['nullable', 'string', 'max:255'],
                'block_list.father_name' => ['nullable', 'string', 'max:255'],
                'block_list.mother_name' => ['nullable', 'string', 'max:255'],
                'block_list.spouse_name' => ['nullable', 'string', 'max:255'],
                'block_list.dob' => ['nullable', 'date', 'before:today'],
                'block_list.address' => ['nullable', 'string', 'max:500'],
            ]);
        }

        $validated = $request->validate($rules, [
            'block_list.nid_number.required' => 'Block list-এ যোগ করতে NID নম্বর প্রয়োজন।',
            'block_list.phone_number.required' => 'Block list-এ যোগ করতে ফোন নম্বর প্রয়োজন।',
            'block_list.phone_number.regex' => 'ফোন নম্বর ১০–১৪ অঙ্কের হতে হবে।',
            'rejection_reason.required' => 'প্রত্যাখ্যানের কারণ লিখতে হবে।',
        ]);

        $user = $request->user();

        try {
            DB::transaction(function () use ($admission, $validated, $pushToBlockList, $user) {
                $admission->loadMissing('branch');

                $admission->update([
                    'status' => 'rejected',
                    'rejection_reason' => $validated['rejection_reason'],
                    'reviewed_at' => now(),
                    'reviewed_by' => $user->id,
                ]);

                if ($pushToBlockList) {
                    $branch = $admission->branch;
                    if (! $branch) {
                        throw new \RuntimeException('শাখার তথ্য পাওয়া যায়নি। Block list-এ পাঠানো যায়নি।');
                    }

                    $memberName = (string) ($admission->applicant_name_bn ?: $admission->applicant_name_en ?: 'N/A');
                    app(BlockListService::class)->pushRejectedPerson(
                        $user,
                        $memberName,
                        $branch,
                        $validated['block_list'],
                        $validated['rejection_reason'],
                    );
                }
            });
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $admission->loadMissing(['createdBy', 'submittedBy', 'branch']);
        $recipients = collect([$admission->createdBy, $admission->submittedBy])->filter();

        app(NotificationService::class)->send(
            users: $recipients,
            type: 'member_admission',
            title: 'সদস্য আবেদন প্রত্যাখ্যান করা হয়েছে',
            message: "সদস্য আবেদন নং {$admission->application_no} ({$admission->applicant_name_bn}) হেড অফিস কর্তৃক প্রত্যাখ্যান করা হয়েছে। কারণ: {$validated['rejection_reason']}",
            notifiable: $admission,
            actionUrl: "/member-admissions/{$admission->id}",
            details: [
                'আবেদন নং' => $admission->application_no,
                'আবেদনকারীর নাম' => $admission->applicant_name_bn ?: $admission->applicant_name_en,
                'শাখা' => $admission->branch?->name ?? 'N/A',
                'বাতিলের কারণ' => $validated['rejection_reason'],
            ]
        );

        $message = 'Admission rejected successfully!';
        if ($pushToBlockList) {
            $message .= ' Block List-এ যোগ করা হয়েছে।';
        }

        return back()->with('success', $message);
    }

    /**
     * Bulk approve selected admissions
     */
    public function approveBulk(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|exists:member_admissions,id',
        ]);

        $ids = $validated['ids'];
        $admissions = MemberAdmission::whereIn('id', $ids)->get();

        $approvedCount = 0;
        $skippedCount = 0;

        DB::beginTransaction();
        try {
            foreach ($admissions as $admission) {
                // If has unreplied pending issues, skip
                if ($admission->issues()->where('status', 'pending')->whereNull('resolution_note')->exists()) {
                    $skippedCount++;
                    continue;
                }

                $admission->update([
                    'status' => 'approved',
                    'reviewed_at' => now(),
                    'reviewed_by' => auth()->id(),
                ]);
                $approvedCount++;

                // Send notifications
                $admission->loadMissing(['createdBy', 'submittedBy', 'branch']);
                $recipients = collect([$admission->createdBy, $admission->submittedBy])->filter();
                $branchManagers = User::where('branch_id', $admission->branch_id)
                    ->where('is_active', 1)
                    ->whereHas('role', fn ($q) => $q->where('name', Role::BRANCH_MANAGER))
                    ->get();
                $recipients = $recipients->concat($branchManagers);

                if ($recipients->isNotEmpty()) {
                    app(NotificationService::class)->send(
                        users: $recipients,
                        type: 'member_admission',
                        title: 'সদস্য আবেদন হেড অফিস কর্তৃক চূড়ান্ত অনুমোদিত',
                        message: "সদস্য আবেদন নং {$admission->application_no} ({$admission->applicant_name_bn}) হেড অফিস থেকে চূড়ান্তভাবে অনুমোদিত হয়েছে।",
                        notifiable: $admission,
                        actionUrl: "/member-admissions/{$admission->id}",
                        details: [
                            'আবেদন নং' => $admission->application_no,
                            'আবেদনকারীর নাম' => $admission->applicant_name_bn ?: $admission->applicant_name_en,
                            'শাখা' => $admission->branch?->name ?? 'N/A',
                            'অনুমোদন তারিখ' => now()->format('Y-m-d H:i'),
                        ]
                    );
                }
            }
            DB::commit();

            $msg = "{$approvedCount} টি সদস্য ভর্তি আবেদন সফলভাবে অনুমোদিত হয়েছে।";
            if ($skippedCount > 0) {
                $msg .= " ({$skippedCount} টি আবেদনে অমীমাংসিত আপত্তি থাকায় স্কিপ করা হয়েছে)";
            }

            return back()->with('success', $msg);
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'অনুমোদন ব্যর্থ হয়েছে: ' . $e->getMessage());
        }
    }

    /**
     * Approve all admissions without issues
     */
    public function approveAll(Request $request)
    {
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');
        $date = $request->input('date');
        $month = $request->input('month');

        DB::beginTransaction();
        try {
            // Get all pending_head_office admissions for the date range, date, or month
            $query = MemberAdmission::where('status', 'pending_head_office');

            if ($dateFrom || $dateTo) {
                if ($dateFrom) {
                    $query->where('submitted_at', '>=', Carbon::parse($dateFrom)->startOfDay());
                }
                if ($dateTo) {
                    $query->where('submitted_at', '<=', Carbon::parse($dateTo)->endOfDay());
                }
            } elseif ($date) {
                $query->whereDate('submitted_at', $date);
            } elseif ($month) {
                $parts = explode('-', $month);
                if (count($parts) === 2) {
                    $query->whereYear('submitted_at', $parts[0])
                          ->whereMonth('submitted_at', $parts[1]);
                }
            } else {
                $defaultMonth = now()->format('Y-m');
                $parts = explode('-', $defaultMonth);
                $query->whereYear('submitted_at', $parts[0])
                      ->whereMonth('submitted_at', $parts[1]);
            }

            if ($request->filled('zone_id')) {
                $query->whereHas('branch.area', function($q) use ($request) {
                    $q->where('zone_id', $request->zone_id);
                });
            }

            if ($request->filled('area_id')) {
                $query->whereHas('branch', function($q) use ($request) {
                    $q->where('area_id', $request->area_id);
                });
            }

            if ($request->filled('branch_id')) {
                $query->where('branch_id', $request->branch_id);
            }

            $admissions = $query->get();

            $approvedCount = 0;
            $returnedCount = 0;

            foreach ($admissions as $admission) {
                $pendingIssues = $admission->issues()->where('status', 'pending')->get();

                if ($pendingIssues->count() > 0) {
                    // Has issues - return to branch
                    $comments = $pendingIssues->pluck('issue_description')->implode("\n\n");
                    $admission->update([
                        'status' => 'needs_revision',
                        'revision_count' => ($admission->revision_count ?? 0) + 1,
                        'revision_comments' => $comments,
                        'returned_at' => now(),
                        'returned_by' => auth()->id(),
                    ]);
                    $returnedCount++;

                    // Send notification
                    $admission->loadMissing(['createdBy', 'submittedBy', 'branch']);
                    $recipients = collect([$admission->createdBy, $admission->submittedBy])->filter();
                    $branchManagers = User::where('branch_id', $admission->branch_id)
                        ->where('is_active', 1)
                        ->whereHas('role', fn ($q) => $q->where('name', Role::BRANCH_MANAGER))
                        ->get();
                    $recipients = $recipients->concat($branchManagers);

                    app(NotificationService::class)->send(
                        users: $recipients,
                        type: 'member_admission',
                        title: 'সদস্য আবেদন সংশোধনের জন্য ফেরত পাঠানো হয়েছে',
                        message: "সদস্য আবেদন নং {$admission->application_no} ({$admission->applicant_name_bn}) সংশোধনের জন্য ফেরত পাঠানো হয়েছে। মন্তব্য: {$comments}",
                        notifiable: $admission,
                        actionUrl: "/member-admissions/{$admission->id}/edit",
                        details: [
                            'আবেদন নং' => $admission->application_no,
                            'আবেদনকারীর নাম' => $admission->applicant_name_bn ?: $admission->applicant_name_en,
                            'মন্তব্য' => $comments,
                        ]
                    );
                } else {
                    // No issues - approve
                    $admission->update([
                        'status' => 'approved',
                        'reviewed_at' => now(),
                        'reviewed_by' => auth()->id(),
                    ]);
                    $approvedCount++;

                    // Send notification
                    $admission->loadMissing(['createdBy', 'submittedBy', 'branch']);
                    $recipients = collect([$admission->createdBy, $admission->submittedBy])->filter();
                    $branchManagers = User::where('branch_id', $admission->branch_id)
                        ->where('is_active', 1)
                        ->whereHas('role', fn ($q) => $q->where('name', Role::BRANCH_MANAGER))
                        ->get();
                    $recipients = $recipients->concat($branchManagers);

                    app(NotificationService::class)->send(
                        users: $recipients,
                        type: 'member_admission',
                        title: 'সদস্য আবেদন হেড অফিস কর্তৃক চূড়ান্ত অনুমোদিত',
                        message: "সদস্য আবেদন নং {$admission->application_no} ({$admission->applicant_name_bn}) হেড অফিস থেকে চূড়ান্তভাবে অনুমোদিত হয়েছে।",
                        notifiable: $admission,
                        actionUrl: "/member-admissions/{$admission->id}",
                        details: [
                            'আবেদন নং' => $admission->application_no,
                            'আবেদনকারীর নাম' => $admission->applicant_name_bn ?: $admission->applicant_name_en,
                            'শাখা' => $admission->branch?->name ?? 'N/A',
                        ]
                    );
                }
            }

            DB::commit();

            return back()->with('success', "Approved: {$approvedCount}, Returned to Branch: {$returnedCount}");

        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Failed to process admissions: ' . $e->getMessage());
        }
    }

    /**
     * Delete an issue
     */
    public function deleteIssue(MemberAdmissionIssue $issue)
    {
        $issue->delete();
        return back()->with('success', 'Issue deleted successfully!');
    }

    /**
     * Delete admission (SuperAdmin only, PIN required). Related loans are also removed.
     */
    public function destroy(Request $request, MemberAdmission $admission)
    {
        if ($denied = $this->denyUnlessSuperAdminDeletePin($request)) {
            return $denied;
        }

        $this->ensureCanAccessBranch($admission->branch_id);
        $this->deleteAdmissionWithRelations($admission);

        return back()->with('success', 'সদস্য ভর্তি মুছে ফেলা হয়েছে।');
    }

    /**
     * Bulk delete admissions (SuperAdmin only, PIN required).
     */
    public function bulkDestroy(Request $request)
    {
        if ($denied = $this->denyUnlessSuperAdminDeletePin($request)) {
            return $denied;
        }

        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
        ]);

        $query = MemberAdmission::whereIn('id', $validated['ids']);
        $this->applyAccessibleBranchScope($query);
        $admissions = $query->get();

        foreach ($admissions as $admission) {
            $this->deleteAdmissionWithRelations($admission);
        }

        return back()->with('success', $admissions->count() . ' টি সদস্য ভর্তি মুছে ফেলা হয়েছে।');
    }

    private function deleteAdmissionWithRelations(MemberAdmission $admission): void
    {
        DB::transaction(function () use ($admission) {
            $admission->loanApplications()->withTrashed()->each(function ($loan) {
                $loan->forceDelete();
            });
            $admission->approvals()->delete();
            $admission->issues()->delete();
            $admission->familyMembers()->delete();
            $admission->otherAssets()->delete();
            $admission->delete();
        });
    }

    /**
     * Head Office role sees only admissions that have reached Head Office.
     * SuperAdmin continues to see the full list.
     */
    private function shouldRestrictToHeadOfficeStage(): bool
    {
        $user = auth()->user();
        if (! $user) {
            return false;
        }

        $user->loadMissing('role');
        $roleName = strtolower((string) $user->role?->name);

        if ($user->isSuperAdmin() || $user->has_all_access || in_array($roleName, ['super_admin', 'superadmin'], true)) {
            return false;
        }

        return $roleName === Role::HEAD_OFFICE;
    }

    private function applyHeadOfficeStageVisibility($query): void
    {
        if ($this->shouldRestrictToHeadOfficeStage()) {
            $query->whereIn('status', [
                'pending_head_office',
                'approved',
                'rejected',
                'needs_revision',
            ]);
        }
    }

    private function ensureHeadOfficeCanViewAdmission(MemberAdmission $admission): void
    {
        if (
            $this->shouldRestrictToHeadOfficeStage()
            && ! in_array($admission->status, [
                'pending_head_office',
                'approved',
                'rejected',
                'needs_revision',
            ], true)
        ) {
            abort(403, 'এই আবেদনটি এখনও হেড অফিসে আসেনি।');
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function blockListFromAdmission(MemberAdmission $admission): array
    {
        $dob = $admission->date_of_birth;
        if ($dob instanceof \DateTimeInterface) {
            $dob = $dob->format('Y-m-d');
        }

        $addressParts = array_filter([
            $admission->present_village_road,
            $admission->present_union,
            $admission->present_upazila,
            $admission->present_district,
        ]);

        $phone = preg_replace('/\D+/', '', (string) ($admission->mobile_number ?? '')) ?: '';

        return [
            'name_bn' => $admission->applicant_name_bn ?? '',
            'father_name' => $admission->father_name_bn ?: ($admission->father_name_en ?? ''),
            'mother_name' => $admission->mother_name_bn ?: ($admission->mother_name_en ?? ''),
            'spouse_name' => $admission->spouse_name_bn ?: ($admission->spouse_name_en ?? ''),
            'dob' => $dob ?: null,
            'nid_number' => $admission->nid_number ?: ($admission->smart_card_number ?? ''),
            'phone_number' => $phone,
            'address' => $addressParts ? implode(', ', $addressParts) : '',
        ];
    }
}
