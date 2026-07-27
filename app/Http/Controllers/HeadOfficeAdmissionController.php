<?php

namespace App\Http\Controllers;

use App\Models\MemberAdmission;
use App\Models\MemberAdmissionIssue;
use App\Models\Zone;
use App\Models\Area;
use App\Models\Branch;
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
    use Concerns\ScopesToAccessibleBranches;

    /**
     * Display admissions (all branches for HO; assigned zone/area for approvers/managers)
     */
    public function index(Request $request)
    {
        $query = MemberAdmission::with([
            'branch' => fn ($q) => $q->withTrashed()->with(['area.zone']),
            'samity',
            'memberCategory',
            'submittedBy',
            'createdBy',
            'approvals.user',
        ])->withCount('loanApplications');

        $this->applyAccessibleBranchScope($query);

        // Default date filter - current month (1st of month .. today)
        $dateFrom = $request->date_from ?? now()->startOfMonth()->toDateString();
        $dateTo = $request->date_to ?? now()->toDateString();

        // Date range filter
        if ($dateFrom && $dateTo) {
            $query->whereBetween('created_at', [
                Carbon::parse($dateFrom)->startOfDay(),
                Carbon::parse($dateTo)->endOfDay()
            ]);
        } elseif ($dateFrom) {
            $query->whereDate('created_at', '>=', $dateFrom);
        } elseif ($dateTo) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

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
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        } else {
            $query->where('status', '!=', 'draft');
        }

        // Search filter
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('application_no', 'like', "%{$search}%")
                  ->orWhere('applicant_name_en', 'like', "%{$search}%")
                  ->orWhere('applicant_name_bn', 'like', "%{$search}%")
                  ->orWhere('mobile_number', 'like', "%{$search}%")
                  ->orWhere('nid_number', 'like', "%{$search}%");
            });
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

        // Printed filter (প্রিন্ট সম্পন্ন / অপ্রিন্টেড)
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

        // Apply same date filter to stats
        if ($dateFrom && $dateTo) {
            $statsQuery->whereBetween('created_at', [
                Carbon::parse($dateFrom)->startOfDay(),
                Carbon::parse($dateTo)->endOfDay()
            ]);
        }

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
        ];

        $admissions = $query->orderBy('created_at', 'desc')->paginate(20);

        $admissions = $admissions->through(function (MemberAdmission $admission) {
            $arr = $admission->toArray();
            $arr['tracking_state'] = $admission->getTrackingState();
            return $arr;
        });

        $orgFilters = $this->organizationFilterOptions();

        return Inertia::render('HeadOffice/AdmissionMembers', [
            'admissions' => $admissions,
            'filters' => array_merge(
                $request->only(['status', 'search', 'zone_id', 'area_id', 'branch_id', 'date_from', 'date_to', 'had_issues', 'printed']),
                [
                    'date_from' => $dateFrom,
                    'date_to' => $dateTo,
                ]
            ),
            'stats' => $stats,
            'zones' => $orgFilters['zones'],
            'areas' => $orgFilters['areas'],
            'branches' => $orgFilters['branches'],
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
        ]);

        $this->applyAccessibleBranchScope($query);

        // Apply same filters as index
        $dateFrom = $request->date_from ?? now()->startOfMonth()->toDateString();
        $dateTo = $request->date_to ?? now()->toDateString();

        if ($dateFrom && $dateTo) {
            $query->whereBetween('created_at', [
                Carbon::parse($dateFrom)->startOfDay(),
                Carbon::parse($dateTo)->endOfDay()
            ]);
        }

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

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        } else {
            $query->where('status', '!=', 'draft');
        }

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

        // Get all matching records (no pagination for print)
        $admissions = $query->orderBy('created_at', 'desc')->get();

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

        $dateFrom = $request->date_from ?? now()->startOfMonth()->toDateString();
        $dateTo = $request->date_to ?? now()->toDateString();

        if ($dateFrom && $dateTo) {
            $query->whereBetween('created_at', [
                Carbon::parse($dateFrom)->startOfDay(),
                Carbon::parse($dateTo)->endOfDay(),
            ]);
        }

        if ($request->zone_id) {
            $query->whereHas('branch.area', fn ($q) => $q->where('zone_id', $request->zone_id));
        }
        if ($request->area_id) {
            $query->whereHas('branch', fn ($q) => $q->where('area_id', $request->area_id));
        }
        if ($request->branch_id) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        } else {
            $query->where('status', '!=', 'draft');
        }

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

        $admissions = $query->orderBy('created_at', 'desc')->get();

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
                $admission->printed_at ? 'প্রিন্ট সম্পন্ন' : 'অপ্রিন্টেড',
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

        $dateFrom = $request->date_from ?? now()->startOfMonth()->toDateString();
        $dateTo = $request->date_to ?? now()->toDateString();
        if ($dateFrom && $dateTo) {
            $query->whereBetween('created_at', [
                Carbon::parse($dateFrom)->startOfDay(),
                Carbon::parse($dateTo)->endOfDay(),
            ]);
        }
        if ($request->zone_id) {
            $query->whereHas('branch.area', fn ($q) => $q->where('zone_id', $request->zone_id));
        }
        if ($request->area_id) {
            $query->whereHas('branch', fn ($q) => $q->where('area_id', $request->area_id));
        }
        if ($request->branch_id) {
            $query->where('branch_id', $request->branch_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        } else {
            $query->where('status', '!=', 'draft');
        }
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

        // Date filter (default: today)
        $date = $request->input('date', now()->toDateString());
        if ($date) {
            $query->whereDate('submitted_at', $date);
        }

        // Search filter
        $search = $request->input('search');
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('applicant_name_en', 'like', "%{$search}%")
                  ->orWhere('applicant_name_bn', 'like', "%{$search}%")
                  ->orWhere('nid_number', 'like', "%{$search}%")
                  ->orWhere('mobile_number', 'like', "%{$search}%")
                  ->orWhere('application_no', 'like', "%{$search}%");
            });
        }

        $admissions = $query->orderBy('submitted_at', 'desc')->paginate(20);

        return Inertia::render('HeadOffice/ProcessAdmissions', [
            'admissions' => $admissions,
            'filters' => [
                'date' => $date,
                'search' => $search,
            ],
        ]);
    }

    /**
     * Show single admission for Head Office
     */
    public function show(MemberAdmission $admission)
    {
        $this->ensureCanAccessBranch($admission->branch_id);

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
     * Approve single admission
     */
    public function approveSingle(MemberAdmission $admission)
    {
        // Check if has pending issues
        if ($admission->issues()->where('status', 'pending')->exists()) {
            return back()->with('error', 'Cannot approve admission with pending issues!');
        }

        $admission->update([
            'status' => 'approved',
            'reviewed_at' => now(),
            'reviewed_by' => auth()->id(),
        ]);

        return back()->with('success', 'Admission approved successfully!');
    }

    /**
     * Reject single admission
     */
    public function rejectSingle(Request $request, MemberAdmission $admission)
    {
        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:2000',
        ]);

        $admission->update([
            'status' => 'rejected',
            'rejection_reason' => $validated['rejection_reason'],
            'reviewed_at' => now(),
            'reviewed_by' => auth()->id(),
        ]);

        return back()->with('success', 'Admission rejected successfully!');
    }

    /**
     * Approve all admissions without issues
     */
    public function approveAll(Request $request)
    {
        $date = $request->input('date', now()->toDateString());

        DB::beginTransaction();
        try {
            // Get all pending_head_office admissions for the date
            $admissions = MemberAdmission::where('status', 'pending_head_office')
                ->whereDate('submitted_at', $date)
                ->get();

            $approvedCount = 0;
            $returnedCount = 0;

            foreach ($admissions as $admission) {
                $pendingIssues = $admission->issues()->where('status', 'pending')->get();

                if ($pendingIssues->count() > 0) {
                    // Has issues - return to branch
                    $admission->update([
                        'status' => 'needs_revision',
                        'revision_count' => ($admission->revision_count ?? 0) + 1,
                        'revision_comments' => $pendingIssues->pluck('issue_description')->implode("\n\n"),
                        'returned_at' => now(),
                        'returned_by' => auth()->id(),
                    ]);
                    $returnedCount++;
                } else {
                    // No issues - approve
                    $admission->update([
                        'status' => 'approved',
                        'reviewed_at' => now(),
                        'reviewed_by' => auth()->id(),
                    ]);
                    $approvedCount++;
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
     * Delete admission. A member with any loan application cannot be deleted.
     */
    public function destroy(MemberAdmission $admission)
    {
        $this->ensureCanAccessBranch($admission->branch_id);

        // A member linked to any loan application cannot be deleted.
        if ($admission->loanApplications()->exists()) {
            return back()->with('error', 'এই সদস্যের ঋণ আবেদন থাকায় মুছে ফেলা যাবে না।');
        }

        $admission->delete();

        return back()->with('success', 'Member admission deleted successfully!');
    }
}
