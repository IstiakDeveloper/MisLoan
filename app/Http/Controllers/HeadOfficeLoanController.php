<?php

namespace App\Http\Controllers;

use App\Models\LoanApplication;
use App\Support\LoanFormVisibility;
use App\Models\LoanApplicationIssue;
use App\Models\Zone;
use App\Models\Area;
use App\Models\Branch;
use App\Models\Role;
use App\Models\User;
use App\Services\ApprovalService;
use App\Services\NotificationService;
use App\Support\RoleListWorkQueue;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class HeadOfficeLoanController extends Controller
{
    use Concerns\AppliesRoleDefaultListFilter;
    use Concerns\ScopesToAccessibleBranches;
    use Concerns\RequiresSuperAdminDeletePin;
    use Concerns\ResolvesListPerPage;

    /**
     * Display loan applications (all for HO; assigned zone/area for approvers/managers)
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $workQueue = RoleListWorkQueue::resolveWithDates($request, true, $user);
        $dateFrom = $workQueue['date_from'];
        $dateTo = $workQueue['date_to'];
        $statusFilter = $workQueue['status'];

        // Main query: only small columns (no LOBs) so ORDER BY uses minimal sort buffer.
        $query = LoanApplication::with([
            'branch:id,name,area_id',
            'branch.area:id,name,zone_id',
            'branch.area.zone:id,name',
            'loanProduct:id,product_name,product_name_bn,product_code',
            'loanCategory:id,category_name,category_name_bn',
            'memberAdmission:id,applicant_name_en,applicant_name_bn,nid_number,mobile_number,application_no,is_legacy,loan_dofa',
            'samity:id,samity_name,samity_name_bn',
            'submittedBy:id,name'
        ])
        ->select([
            'id',
            'application_no',
            'member_admission_id',
            'loan_product_id',
            'loan_category_id',
            'branch_id',
            'samity_id',
            'status',
            'requested_amount',
            'approved_amount',
            'created_at',
            'submitted_at',
            'printed_at',
        ]);

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

        $this->applyResolvedStatusFilter($query, $statusFilter, $user, 'loan', true);

        // Search filter
        if ($request->has('search') && $request->search) {
            \App\Services\MemberCodeService::applyLoanSearch($query, $request->search);
        }

        // Had issues filter (for loans that went through revision)
        if ($request->has('had_issues') && $request->had_issues) {
            if ($request->had_issues === 'yes') {
                $query->whereHas('issues', function($q) {
                    $q->where('status', '!=', 'pending');
                });
            } elseif ($request->had_issues === 'no') {
                $query->whereDoesntHave('issues');
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
        // Use select to avoid loading large columns
        $statsQuery = LoanApplication::select('id', 'status', 'created_at', 'submitted_at', 'branch_id');
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
                $statsQuery->whereHas('issues', function($q) {
                    $q->where('status', '!=', 'pending');
                });
            } elseif ($request->had_issues === 'no') {
                $statsQuery->whereDoesntHave('issues');
            }
        }

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $statsQuery->where(function($q) use ($search) {
                $q->where('application_no', 'like', "%{$search}%")
                  ->orWhereHas('memberAdmission', function($mq) use ($search) {
                      $mq->where('applicant_name_en', 'like', "%{$search}%")
                        ->orWhere('applicant_name_bn', 'like', "%{$search}%")
                        ->orWhere('mobile_number', 'like', "%{$search}%")
                        ->orWhere('nid_number', 'like', "%{$search}%")
                        ->orWhere('application_no', 'like', "%{$search}%");
                  });
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
            'ready_for_head_office' => (clone $statsQuery)->where('status', 'ready_for_head_office')->count(),
            'pending_head_office' => (clone $statsQuery)->where('status', 'pending_head_office')->count(),
            'approved' => (clone $statsQuery)->where('status', 'approved')->count(),
            'rejected' => (clone $statsQuery)->where('status', 'rejected')->count(),
            'pending_disbursement' => (clone $statsQuery)->where('status', 'pending_disbursement')->count(),
            'disbursed' => (clone $statsQuery)->where('status', 'disbursed')->count(),
            'pending_my_approval' => $this->countPendingMyApproval($statsQuery, $user, 'loan'),
        ];

        $perPage = $this->resolvePerPage($request);
        $loans = $query->orderByRaw('COALESCE(submitted_at, created_at) desc')->paginate($perPage)->withQueryString();

        $orgFilters = $this->organizationFilterOptions();

        return Inertia::render('HeadOffice/LoanApplications', [
            'loans' => $loans,
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
            'viewAllLoans' => ! $this->shouldRestrictToHeadOfficeStage(),
            'workQueue' => $this->listWorkQueueProps($workQueue),
        ]);
    }

    /**
     * Print view for loan applications (no layout, optimized for printing)
     */
    public function print(Request $request)
    {
        $workQueue = RoleListWorkQueue::resolveWithDates($request, true);
        $dateFrom = $workQueue['date_from'];
        $dateTo = $workQueue['date_to'];

        $query = LoanApplication::with([
            'branch:id,name,area_id',
            'branch.area:id,name,zone_id',
            'branch.area.zone:id,name',
            'loanProduct:id,product_name,product_name_bn,product_code,duration_months',
            'loanCategory:id,category_name,category_name_bn',
            'memberAdmission:id,applicant_name_en,applicant_name_bn,nid_number,mobile_number,application_no,is_legacy,loan_dofa,project_name',
            'samity:id,samity_name,samity_name_bn,samity_code',
            'submittedBy:id,name',
            'reviewedBy:id,name',
            'approvals.user:id,name',
        ])
        ->select([
            'id',
            'application_no',
            'member_admission_id',
            'loan_product_id',
            'loan_category_id',
            'branch_id',
            'samity_id',
            'status',
            'requested_amount',
            'approved_amount',
            'savings_amount',
            'business_plan',
            'asset_info',
            'created_at',
            'submitted_at',
            'reviewed_at',
            'disbursed_at',
            'reviewed_by',
            'disbursed_by',
            'loan_term_months',
            'repayment_frequency',
            'number_of_installments',
            'purpose_of_loan',
            'printed_at',
            'legacy_member_snapshot',
        ]);

        $this->applyAccessibleBranchScope($query);
        $this->applyHeadOfficeStageVisibility($query);
        $this->applySubmittedAtDateRange($query, $dateFrom, $dateTo);

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

        $this->applyResolvedStatusFilter($query, $workQueue['status'], $request->user(), 'loan', true);

        if ($request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('application_no', 'like', "%{$search}%")
                  ->orWhereHas('memberAdmission', function($mq) use ($search) {
                      $mq->where('applicant_name_en', 'like', "%{$search}%")
                        ->orWhere('applicant_name_bn', 'like', "%{$search}%")
                        ->orWhere('mobile_number', 'like', "%{$search}%")
                        ->orWhere('nid_number', 'like', "%{$search}%")
                        ->orWhere('application_no', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->had_issues) {
            if ($request->had_issues === 'yes') {
                $query->whereHas('issues', function($q) {
                    $q->where('status', '!=', 'pending');
                });
            } elseif ($request->had_issues === 'no') {
                $query->whereDoesntHave('issues');
            }
        }

        if ($request->filled('printed')) {
            if ($request->printed === 'yes') {
                $query->whereNotNull('printed_at');
            } elseif ($request->printed === 'no') {
                $query->whereNull('printed_at');
            }
        }

        // Get all matching records sorted by branch code (no pagination for print)
        $loans = $query->orderBy(
            \App\Models\Branch::select('code')->whereColumn('branches.id', 'loan_applications.branch_id'),
            'asc'
        )->orderByRaw('COALESCE(submitted_at, created_at) desc')->get();

        // Calculate and attach accurate savings details from business_plan, asset_info, and loan attributes
        $loans->transform(function ($loan) {
            $businessPlan = is_array($loan->business_plan) ? $loan->business_plan : (json_decode($loan->business_plan ?? '', true) ?: []);
            $assetInfo = is_array($loan->asset_info) ? $loan->asset_info : (json_decode($loan->asset_info ?? '', true) ?: []);

            $savingsGeneral = $businessPlan['general_savings_amount']
                ?? $assetInfo['general_savings_amount']
                ?? $assetInfo['savings_amount']
                ?? $loan->savings_amount
                ?? null;

            $savingsOther = (!empty($businessPlan['is_against_savings']) ? ($businessPlan['against_savings_amount'] ?? 0) : 0)
                + (!empty($assetInfo['is_against_savings']) ? ($assetInfo['against_savings_amount'] ?? 0) : 0);

            $savingsGeneralNum = $savingsGeneral !== null && $savingsGeneral !== '' ? (float) $savingsGeneral : 0;
            $savingsOtherNum = (float) $savingsOther;
            $savingsTotal = $savingsGeneralNum + $savingsOtherNum;

            $requested = (float) ($loan->requested_amount ?? 0);
            $generalPercent = $requested > 0 ? round(($savingsGeneralNum / $requested) * 100, 1) : 0;

            $loan->savings_general = $savingsGeneralNum;
            $loan->savings_other = $savingsOtherNum;
            $loan->savings_total = $savingsTotal;
            $loan->general_savings_percent = $generalPercent;

            return $loan;
        });

        $orgFilters = $this->organizationFilterOptions();

        return Inertia::render('HeadOffice/LoanApplicationsPrint', [
            'loans' => $loans,
            'filters' => $request->only(['status', 'search', 'zone_id', 'area_id', 'branch_id', 'date_from', 'date_to', 'had_issues', 'printed']),
            'zones' => $orgFilters['zones'],
            'areas' => $orgFilters['areas'],
            'branches' => $orgFilters['branches'],
        ]);
    }

    /**
     * Mark loan applications as printed (same filter as print) so list can show printed/not printed
     */
    public function markAsPrinted(Request $request)
    {
        $query = LoanApplication::query();
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
        $this->applyResolvedStatusFilter($query, $workQueue['status'], $request->user(), 'loan', true);
        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('application_no', 'like', "%{$search}%")
                    ->orWhereHas('memberAdmission', function($mq) use ($search) {
                        $mq->where('applicant_name_en', 'like', "%{$search}%")
                            ->orWhere('applicant_name_bn', 'like', "%{$search}%")
                            ->orWhere('mobile_number', 'like', "%{$search}%")
                            ->orWhere('nid_number', 'like', "%{$search}%")
                            ->orWhere('application_no', 'like', "%{$search}%");
                    });
            });
        }
        if ($request->had_issues) {
            if ($request->had_issues === 'yes') {
                $query->whereHas('issues', function($q) {
                    $q->where('status', '!=', 'pending');
                });
            } elseif ($request->had_issues === 'no') {
                $query->whereDoesntHave('issues');
            }
        }

        $ids = $query->pluck('id');
        LoanApplication::whereIn('id', $ids)->update(['printed_at' => now()]);

        return back()->with('success', 'প্রিন্ট সম্পন্ন চিহ্নিত হয়েছে।');
    }

    /**
     * Export loan applications to XLSX (same filters as index / print).
     */
    public function exportExcel(Request $request)
    {
        $query = LoanApplication::with([
            'branch' => fn ($q) => $q->withTrashed()->with(['area.zone']),
            'samity',
            'loanProduct',
            'loanCategory',
            'memberAdmission',
            'submittedBy',
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

        $this->applyResolvedStatusFilter($query, $workQueue['status'], $request->user(), 'loan', true);

        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('application_no', 'like', "%{$search}%")
                    ->orWhereHas('memberAdmission', function($mq) use ($search) {
                        $mq->where('applicant_name_en', 'like', "%{$search}%")
                            ->orWhere('applicant_name_bn', 'like', "%{$search}%")
                            ->orWhere('mobile_number', 'like', "%{$search}%")
                            ->orWhere('nid_number', 'like', "%{$search}%")
                            ->orWhere('application_no', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->had_issues === 'yes') {
            $query->whereHas('issues', function($q) {
                $q->where('status', '!=', 'pending');
            });
        } elseif ($request->had_issues === 'no') {
            $query->whereDoesntHave('issues');
        }

        if ($request->filled('printed')) {
            if ($request->printed === 'yes') {
                $query->whereNotNull('printed_at');
            } elseif ($request->printed === 'no') {
                $query->whereNull('printed_at');
            }
        }

        $loans = $query->orderByRaw('COALESCE(submitted_at, created_at) desc')->get();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Loan Applications');

        $headers = [
            'ক্রমিক',
            'সদস্য নং',
            'আবেদনকারীর নাম (EN)',
            'আবেদনকারীর নাম (BN)',
            'NID নম্বর',
            'মোবাইল নম্বর',
            'প্রোডাক্ট / ক্যাটাগরি',
            'চাহিদাকৃত পরিমাণ',
            'অনুমোদিত পরিমাণ',
            'জোন',
            'আঞ্চলিক অফিস',
            'শাখা',
            'সমিতি',
            'জমাদানের তারিখ',
            'স্ট্যাটাস',
            'প্রিন্ট স্থিতি',
        ];

        $sheet->fromArray([$headers], null, 'A1');

        $rowIdx = 2;
        foreach ($loans as $index => $loan) {
            $sheet->setCellValue("A{$rowIdx}", $index + 1);
            $sheet->setCellValue("B{$rowIdx}", $loan->memberAdmission?->application_no ?? $loan->application_no);
            $sheet->setCellValue("C{$rowIdx}", $loan->memberAdmission?->applicant_name_en ?? '');
            $sheet->setCellValue("D{$rowIdx}", $loan->memberAdmission?->applicant_name_bn ?? '');
            $sheet->setCellValue("E{$rowIdx}", $loan->memberAdmission?->nid_number ?? '');
            $sheet->setCellValue("F{$rowIdx}", $loan->memberAdmission?->mobile_number ?? '');
            $sheet->setCellValue("G{$rowIdx}", ($loan->loanProduct?->product_name_bn ?? '') . ' / ' . ($loan->loanCategory?->category_name_bn ?? ''));
            $sheet->setCellValue("H{$rowIdx}", $loan->requested_amount ?? 0);
            $sheet->setCellValue("I{$rowIdx}", $loan->approved_amount ?? 0);
            $sheet->setCellValue("J{$rowIdx}", $loan->branch?->area?->zone?->name ?? '');
            $sheet->setCellValue("K{$rowIdx}", $loan->branch?->area?->name ?? '');
            $sheet->setCellValue("L{$rowIdx}", $loan->branch?->name ?? '');
            $sheet->setCellValue("M{$rowIdx}", $loan->samity?->samity_name ?? '');
            $sheet->setCellValue("N{$rowIdx}", $loan->submitted_at ? formatDate($loan.submitted_at) : '');
            $sheet->setCellValue("O{$rowIdx}", $loan->status);
            $sheet->setCellValue("P{$rowIdx}", $loan->printed_at ? 'প্রিন্ট সম্পন্ন' : 'প্রিন্ট হয়নি');
            $rowIdx++;
        }

        $fileName = 'Loan_Applications_' . date('Y_m_d_His') . '.xlsx';
        $writer = new Xlsx($spreadsheet);

        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="' . $fileName . '"');
        header('Cache-Control: max-age=0');

        $writer->save('php://output');
        exit;
    }

    /**
     * List loan applications pending at head office (for processing)
     */
    public function process(Request $request)
    {
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');
        $date = $request->input('date');
        $month = $request->input('month');

        if (!$dateFrom && !$dateTo && !$date && !$month) {
            $month = now()->format('Y-m');
        }

        $query = LoanApplication::query()
            ->where('status', LoanApplication::STATUS_PENDING_HEAD_OFFICE);

        $this->applyAccessibleBranchScope($query);

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

        $search = $request->input('search');
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('application_no', 'like', "%{$search}%")
                    ->orWhereHas('memberAdmission', function ($mq) use ($search) {
                        $mq->where('applicant_name_bn', 'like', "%{$search}%")
                            ->orWhere('applicant_name_en', 'like', "%{$search}%")
                            ->orWhere('nid_number', 'like', "%{$search}%")
                            ->orWhere('mobile_number', 'like', "%{$search}%");
                    });
            });
        }

        $perPage = $this->resolvePerPage($request);
        $loans = $query->orderBy('submitted_at', 'desc')
            ->with([
                'branch:id,name,area_id',
                'branch.area:id,name,zone_id',
                'branch.area.zone:id,name',
                'samity:id,samity_name',
                'loanProduct:id,product_name,product_name_bn',
                'loanCategory:id,category_name,category_name_bn',
                'memberAdmission:id,applicant_name_bn,applicant_name_en,nid_number,mobile_number,is_legacy,loan_dofa,application_no',
                'submittedBy:id,name',
                'issues' => function ($q) {
                    $q->where('status', 'pending')
                        ->with('reporter:id,name');
                },
            ])
            ->paginate($perPage)
            ->withQueryString();

        $orgFilters = $this->organizationFilterOptions();

        return Inertia::render('HeadOffice/ProcessLoans', [
            'loans' => $loans,
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
    public function show(LoanApplication $loanApplication)
    {
        $this->ensureCanAccessBranch($loanApplication->branch_id);
        $this->ensureHeadOfficeCanViewLoan($loanApplication);

        $loanApplication->load([
            'branch.area.zone',
            'loanProduct',
            'loanCategory',
            'memberAdmission.samity',
            'memberAdmission.familyMembers',
            'memberAdmission.otherAssets',
            'submittedBy',
            'approvals.user',
            'issues.reporter',
            'issues.responder',
        ]);

        // Determine visible form IDs based on loan product and amount
        $product = $loanApplication->loanProduct;
        $category = $loanApplication->loanCategory ?? $product?->loanCategory;
        $amount = (float) $loanApplication->requested_amount;
        $formSaved = LoanFormVisibility::buildFormSavedMap($loanApplication);
        $visibleFormIds = LoanFormVisibility::visibleFormIdsForShow(
            auth()->user()?->role?->name ?? '',
            (string) $loanApplication->status,
            $product,
            $amount,
            $category
        );

        $loanApplication->visible_form_ids = $visibleFormIds;
        $loanApplication->form_saved = $formSaved;

        $isSuperAdmin = auth()->user()?->isSuperAdmin() ?? false;
        $loanApplication->superadmin_can_pin_edit = $isSuperAdmin;
        $loanApplication->superadmin_edit_unlocked = $isSuperAdmin && $this->isLoanEditUnlocked((int) $loanApplication->id);

        return Inertia::render('HeadOffice/LoanApplicationShow', [
            'loan' => $loanApplication,
        ]);
    }

    /**
     * Store issue for a loan application
     */
    public function storeIssue(Request $request, LoanApplication $loanApplication)
    {
        $validated = $request->validate([
            'issue_description' => 'required|string|max:2000',
        ]);

        LoanApplicationIssue::create([
            'loan_application_id' => $loanApplication->id,
            'reported_by' => auth()->id(),
            'issue_description' => $validated['issue_description'],
            'status' => 'pending',
        ]);

        return back()->with('success', 'সমস্যা লিপিবদ্ধ হয়েছে।');
    }

    /**
     * Approve loan application (head office)
     */
    public function approveSingle(LoanApplication $loanApplication)
    {
        if ($loanApplication->status !== LoanApplication::STATUS_PENDING_HEAD_OFFICE) {
            return back()->with('error', 'শুধুমাত্র হেড অফিসে প্রেরিত আবেদন অনুমোদন করা যাবে।');
        }

        if ($loanApplication->issues()->where('status', 'pending')->exists()) {
            return back()->with('error', 'পেন্ডিং সমস্যা থাকলে অনুমোদন করা যাবে না।');
        }

        $loanApplication->loadMissing('loanProduct');
        $businessPlan = $loanApplication->mergeOfficialDatesIntoBusinessPlan(
            is_array($loanApplication->business_plan) ? $loanApplication->business_plan : [],
            now()->toDateString(),
        );

        $update = [
            'status' => LoanApplication::STATUS_PENDING_DISBURSEMENT,
            'reviewed_at' => now(),
            'reviewed_by' => auth()->id(),
        ];
        if ($businessPlan !== []) {
            $update['business_plan'] = $businessPlan;
        }
        $loanApplication->update($update);

        // Notify submitter and Branch Managers
        $loanApplication->loadMissing(['submittedBy', 'memberAdmission', 'branch']);
        $branchManagers = User::where('branch_id', $loanApplication->branch_id)
            ->where('is_active', 1)
            ->whereHas('role', fn ($q) => $q->where('name', Role::BRANCH_MANAGER))
            ->get();

        $recipients = collect([$loanApplication->submittedBy])->concat($branchManagers)->filter()->unique('id');

        if ($recipients->isNotEmpty()) {
            app(NotificationService::class)->send(
                users: $recipients,
                type: 'loan_application',
                title: 'ঋণ আবেদন হেড অফিস কর্তৃক অনুমোদিত',
                message: "ঋণ আবেদন নং {$loanApplication->application_no} ({$loanApplication->memberAdmission?->applicant_name_bn}) হেড অফিস থেকে অনুমোদিত হয়েছে। বিতরণের জন্য শাখায় পাঠানো হয়েছে।",
                notifiable: $loanApplication,
                actionUrl: "/member/loan-applications/{$loanApplication->id}",
                details: [
                    'আবেদন নং' => $loanApplication->application_no,
                    'সদস্যের নাম' => $loanApplication->memberAdmission?->applicant_name_bn ?: ($loanApplication->memberAdmission?->applicant_name_en ?? 'N/A'),
                    'অনুমোদিত পরিমাণ' => number_format($loanApplication->approved_amount ?? $loanApplication->requested_amount ?? 0) . ' টাকা',
                    'অনুমোদনকারী' => auth()->user()?->name ?? 'Head Office',
                ]
            );
        }

        return back()->with('success', 'ঋণ আবেদন অনুমোদিত হয়েছে। বিতরণের জন্য শাখায় ফেরত পাঠানো হয়েছে।');
    }

    /**
     * Bulk approve selected loan applications
     */
    public function approveBulk(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|exists:loan_applications,id',
        ]);

        $ids = $validated['ids'];
        $loans = LoanApplication::whereIn('id', $ids)->get();

        $approvedCount = 0;
        $skippedCount = 0;

        DB::beginTransaction();
        try {
            foreach ($loans as $loan) {
                if ($loan->issues()->where('status', 'pending')->whereNull('response_message')->exists()) {
                    $skippedCount++;
                    continue;
                }

                $loan->loadMissing('loanProduct');
                $businessPlan = $loan->mergeOfficialDatesIntoBusinessPlan(
                    is_array($loan->business_plan) ? $loan->business_plan : [],
                    now()->toDateString(),
                );
                $update = [
                    'status' => LoanApplication::STATUS_PENDING_DISBURSEMENT,
                    'reviewed_at' => now(),
                    'reviewed_by' => auth()->id(),
                ];
                if ($businessPlan !== []) {
                    $update['business_plan'] = $businessPlan;
                }
                $loan->update($update);
                $approvedCount++;

                // Notify submitter and Branch Managers
                $loan->loadMissing(['submittedBy', 'memberAdmission', 'branch']);
                $branchManagers = User::where('branch_id', $loan->branch_id)
                    ->where('is_active', 1)
                    ->whereHas('role', fn ($q) => $q->where('name', Role::BRANCH_MANAGER))
                    ->get();
                $recipients = collect([$loan->submittedBy])->concat($branchManagers)->filter()->unique('id');

                if ($recipients->isNotEmpty()) {
                    app(NotificationService::class)->send(
                        users: $recipients,
                        type: 'loan_application',
                        title: 'ঋণ আবেদন অনুমোদিত (হেড অফিস)',
                        message: "ঋণ আবেদন নং {$loan->application_no} ({$loan->memberAdmission?->applicant_name_bn}) হেড অফিস কর্তৃক অনুমোদিত হয়েছে। বিতরণের জন্য শাখায় পাঠানো হয়েছে।",
                        notifiable: $loan,
                        actionUrl: "/member/loan-applications/{$loan->id}",
                        details: [
                            'আবেদন নং' => $loan->application_no,
                            'সদস্যের নাম' => $loan->memberAdmission?->applicant_name_bn ?: ($loan->memberAdmission?->applicant_name_en ?? 'N/A'),
                            'শাখা' => $loan->branch?->name ?? 'N/A',
                            'অনুমোদিত পরিমাণ' => '৳ ' . number_format($loan->approved_amount ?: $loan->requested_amount, 2),
                        ]
                    );
                }
            }
            DB::commit();

            $msg = "{$approvedCount} টি ঋণ আবেদন সফলভাবে অনুমোদিত হয়েছে।";
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
     * Approve all pending head office loans without issues (for the selected date)
     */
    public function approveAll(Request $request)
    {
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');
        $date = $request->input('date');
        $month = $request->input('month');

        DB::beginTransaction();
        try {
            $query = LoanApplication::where('status', LoanApplication::STATUS_PENDING_HEAD_OFFICE);

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

            $loans = $query->get();

            $approvedCount = 0;
            $skippedCount = 0;

            foreach ($loans as $loan) {
                if ($loan->issues()->where('status', 'pending')->exists()) {
                    $skippedCount++;
                    continue;
                }
                $loan->loadMissing('loanProduct');
                $businessPlan = $loan->mergeOfficialDatesIntoBusinessPlan(
                    is_array($loan->business_plan) ? $loan->business_plan : [],
                    now()->toDateString(),
                );
                $update = [
                    'status' => LoanApplication::STATUS_PENDING_DISBURSEMENT,
                    'reviewed_at' => now(),
                    'reviewed_by' => auth()->id(),
                ];
                if ($businessPlan !== []) {
                    $update['business_plan'] = $businessPlan;
                }
                $loan->update($update);
                $approvedCount++;

                // Notify submitter and Branch Managers
                $loan->loadMissing(['submittedBy', 'memberAdmission', 'branch']);
                $branchManagers = User::where('branch_id', $loan->branch_id)
                    ->where('is_active', 1)
                    ->whereHas('role', fn ($q) => $q->where('name', Role::BRANCH_MANAGER))
                    ->get();

                $recipients = collect([$loan->submittedBy])->concat($branchManagers)->filter()->unique('id');

                if ($recipients->isNotEmpty()) {
                    app(NotificationService::class)->send(
                        users: $recipients,
                        type: 'loan_application',
                        title: 'ঋণ আবেদন হেড অফিস কর্তৃক অনুমোদিত',
                        message: "ঋণ আবেদন নং {$loan->application_no} ({$loan->memberAdmission?->applicant_name_bn}) হেড অফিস থেকে অনুমোদিত হয়েছে। বিতরণের জন্য শাখায় পাঠানো হয়েছে।",
                        notifiable: $loan,
                        actionUrl: "/member/loan-applications/{$loan->id}",
                        details: [
                            'আবেদন নং' => $loan->application_no,
                            'সদস্যের নাম' => $loan->memberAdmission?->applicant_name_bn ?: ($loan->memberAdmission?->applicant_name_en ?? 'N/A'),
                            'অনুমোদিত পরিমাণ' => number_format($loan->approved_amount ?? $loan->requested_amount ?? 0) . ' টাকা',
                            'অনুমোদনকারী' => auth()->user()?->name ?? 'Head Office',
                        ]
                    );
                }
            }

            DB::commit();

            $message = $approvedCount > 0
                ? "অনুমোদিত: {$approvedCount}" . ($skippedCount > 0 ? ", সমস্যা থাকায় বাদ: {$skippedCount}" : '')
                : ($skippedCount > 0 ? "সব আবেদনে সমস্যা আছে, কোনোটিই অনুমোদন হয়নি। বাদ: {$skippedCount}" : 'এই তারিখে কোন পেন্ডিং আবেদন নেই।');
            return back()->with('success', $message);

        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'প্রসেস ব্যর্থ: ' . $e->getMessage());
        }
    }

    /**
     * Reject loan application (head office)
     */
    public function rejectSingle(Request $request, LoanApplication $loanApplication)
    {
        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:2000',
        ]);

        $loanApplication->update([
            'status' => LoanApplication::STATUS_REJECTED,
            'rejection_reason' => $validated['rejection_reason'],
            'reviewed_at' => now(),
            'reviewed_by' => auth()->id(),
        ]);

        // Notify submitter and Branch Managers
        $loanApplication->loadMissing(['submittedBy', 'memberAdmission', 'branch']);
        $branchManagers = User::where('branch_id', $loanApplication->branch_id)
            ->where('is_active', 1)
            ->whereHas('role', fn ($q) => $q->where('name', Role::BRANCH_MANAGER))
            ->get();

        $recipients = collect([$loanApplication->submittedBy])->concat($branchManagers)->filter()->unique('id');

        if ($recipients->isNotEmpty()) {
            app(NotificationService::class)->send(
                users: $recipients,
                type: 'loan_application',
                title: 'ঋণ আবেদন হেড অফিস কর্তৃক বাতিল করা হয়েছে',
                message: "ঋণ আবেদন নং {$loanApplication->application_no} ({$loanApplication->memberAdmission?->applicant_name_bn}) হেড অফিস কর্তৃক প্রত্যাখ্যান করা হয়েছে। কারণ: {$validated['rejection_reason']}",
                notifiable: $loanApplication,
                actionUrl: "/member/loan-applications/{$loanApplication->id}",
                details: [
                    'আবেদন নং' => $loanApplication->application_no,
                    'সদস্যের নাম' => $loanApplication->memberAdmission?->applicant_name_bn ?: ($loanApplication->memberAdmission?->applicant_name_en ?? 'N/A'),
                    'বাতিলের কারণ' => $validated['rejection_reason'],
                ]
            );
        }

        return back()->with('success', 'ঋণ আবেদন প্রত্যাখ্যান হয়েছে।');
    }

    /**
     * Reset all loan approvals back to Branch Manager.
     */
    public function resetApproval(LoanApplication $loanApplication)
    {
        $this->ensureCanAccessBranch($loanApplication->branch_id);

        if (in_array($loanApplication->status, [
            LoanApplication::STATUS_DRAFT,
            LoanApplication::STATUS_DISBURSED,
            LoanApplication::STATUS_CANCELLED,
        ], true)) {
            return back()->with('error', 'এই অবস্থার ঋণ আবেদনের অনুমোদন রিসেট করা যাবে না।');
        }

        try {
            DB::transaction(function () use ($loanApplication) {
                $updateData = [
                    'status' => LoanApplication::STATUS_SUBMITTED,
                    'reviewed_by' => null,
                    'reviewed_at' => null,
                    'rejection_reason' => null,
                    'selected_approvers' => null,
                ];

                if (!$loanApplication->submitted_at) {
                    $updateData['submitted_by'] = $loanApplication->submitted_by ?: auth()->id();
                    $updateData['submitted_at'] = now();
                }

                $loanApplication->update($updateData);

                app(ApprovalService::class)->createLoanApprovalWorkflow($loanApplication);
            });
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }

        $loanApplication->refresh()->loadMissing(['submittedBy', 'memberAdmission', 'branch']);
        $branchManagers = User::where('branch_id', $loanApplication->branch_id)
            ->where('is_active', 1)
            ->whereHas('role', fn ($q) => $q->where('name', Role::BRANCH_MANAGER))
            ->get();
        $recipients = collect([$loanApplication->submittedBy])
            ->concat($branchManagers)
            ->filter()
            ->unique('id');

        if ($recipients->isNotEmpty()) {
            app(NotificationService::class)->send(
                users: $recipients,
                type: 'loan_application',
                title: 'ঋণ আবেদনের অনুমোদন রিসেট করা হয়েছে',
                message: "ঋণ আবেদন নং {$loanApplication->application_no} ({$loanApplication->memberAdmission?->applicant_name_bn}) হেড অফিস থেকে শাখা ব্যবস্থাপক পর্যায়ে রিসেট করা হয়েছে।",
                notifiable: $loanApplication,
                actionUrl: '/approvals',
                details: [
                    'আবেদন নং' => $loanApplication->application_no,
                    'সদস্যের নাম' => $loanApplication->memberAdmission?->applicant_name_bn
                        ?: ($loanApplication->memberAdmission?->applicant_name_en ?? 'N/A'),
                    'শাখা' => $loanApplication->branch?->name ?? 'N/A',
                ]
            );
        }

        return back()->with('success', 'অনুমোদন শাখা ব্যবস্থাপক পর্যায়ে রিসেট করা হয়েছে।');
    }

    /**
     * Delete loan application (SuperAdmin only, PIN required; any status).
     */
    public function destroy(Request $request, LoanApplication $loanApplication)
    {
        if ($denied = $this->denyUnlessSuperAdminDeletePin($request)) {
            return $denied;
        }

        $this->ensureCanAccessBranch($loanApplication->branch_id);
        $loanApplication->forceDelete();

        return back()->with('success', 'ঋণ আবেদন মুছে ফেলা হয়েছে।');
    }

    /**
     * Bulk delete loan applications (SuperAdmin only, PIN required).
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

        $query = LoanApplication::whereIn('id', $validated['ids']);
        $this->applyAccessibleBranchScope($query);
        $count = $query->count();
        $query->each(function (LoanApplication $loan) {
            $loan->forceDelete();
        });

        return back()->with('success', $count . ' টি ঋণ আবেদন মুছে ফেলা হয়েছে।');
    }

    /**
     * Head Office role sees only loans that have reached Head Office.
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

    private function headOfficeVisibleLoanStatuses(): array
    {
        return [
            LoanApplication::STATUS_PENDING_HEAD_OFFICE,
            LoanApplication::STATUS_APPROVED,
            LoanApplication::STATUS_PENDING_DISBURSEMENT,
            LoanApplication::STATUS_DISBURSED,
            LoanApplication::STATUS_REJECTED,
            LoanApplication::STATUS_NEEDS_CORRECTION,
        ];
    }

    private function applyHeadOfficeStageVisibility($query): void
    {
        if ($this->shouldRestrictToHeadOfficeStage()) {
            $query->whereIn('status', $this->headOfficeVisibleLoanStatuses());
        }
    }

    private function ensureHeadOfficeCanViewLoan(LoanApplication $loanApplication): void
    {
        if (
            $this->shouldRestrictToHeadOfficeStage()
            && ! in_array($loanApplication->status, $this->headOfficeVisibleLoanStatuses(), true)
        ) {
            abort(403, 'এই ঋণ আবেদনটি এখনও হেড অফিসে আসেনি।');
        }
    }
}

