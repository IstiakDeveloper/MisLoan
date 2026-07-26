<?php

namespace App\Http\Controllers;

use App\Models\LoanApplication;
use App\Models\LoanApplicationIssue;
use App\Models\Zone;
use App\Models\Area;
use App\Models\Branch;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class HeadOfficeLoanController extends Controller
{
    use Concerns\ScopesToAccessibleBranches;

    /**
     * Display loan applications (all for HO; assigned zone/area for approvers/managers)
     */
    public function index(Request $request)
    {
        // Default date filter - current month (1st of month .. today)
        $dateFrom = $request->date_from ?? now()->startOfMonth()->toDateString();
        $dateTo = $request->date_to ?? now()->toDateString();

        // Use date range instead of whereDate() to allow index usage and prevent memory issues
        $startOfDay = Carbon::parse($dateFrom)->startOfDay();
        $endOfDay = Carbon::parse($dateTo)->endOfDay();

        // Main query: only small columns (no LOBs) so ORDER BY uses minimal sort buffer.
        $query = LoanApplication::with([
            'branch:id,name,area_id',
            'branch.area:id,name,zone_id',
            'branch.area.zone:id,name',
            'loanProduct:id,product_name,product_name_bn,product_code',
            'loanCategory:id,category_name,category_name_bn',
            'memberAdmission:id,applicant_name_en,applicant_name_bn,nid_number,mobile_number,application_no',
            'submittedBy:id,name'
        ])
        ->select([
            'id',
            'application_no',
            'member_admission_id',
            'loan_product_id',
            'loan_category_id',
            'branch_id',
            'status',
            'requested_amount',
            'approved_amount',
            'created_at',
            'submitted_at',
        ]);

        $this->applyAccessibleBranchScope($query);

        // Date range filter
        if ($dateFrom && $dateTo) {
            $query->whereBetween('created_at', [$startOfDay, $endOfDay]);
        } elseif ($dateFrom) {
            $query->where('created_at', '>=', $startOfDay);
        } elseif ($dateTo) {
            $query->where('created_at', '<=', $endOfDay);
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
                  ->orWhereHas('memberAdmission', function($mq) use ($search) {
                      $mq->where('applicant_name_en', 'like', "%{$search}%")
                        ->orWhere('applicant_name_bn', 'like', "%{$search}%")
                        ->orWhere('mobile_number', 'like', "%{$search}%")
                        ->orWhere('nid_number', 'like', "%{$search}%")
                        ->orWhere('application_no', 'like', "%{$search}%");
                  });
            });
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

        // Calculate stats based on current filters (excluding status filter for stats)
        // Use select to avoid loading large columns
        $statsQuery = LoanApplication::select('id', 'status', 'created_at', 'branch_id');
        $this->applyAccessibleBranchScope($statsQuery);

        // Apply same date filter to stats
        if ($dateFrom && $dateTo) {
            $statsQuery->whereBetween('created_at', [$startOfDay, $endOfDay]);
        } elseif ($dateFrom) {
            $statsQuery->where('created_at', '>=', $startOfDay);
        } elseif ($dateTo) {
            $statsQuery->where('created_at', '<=', $endOfDay);
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
                $statsQuery->whereHas('issues', function($q) {
                    $q->where('status', '!=', 'pending');
                });
            } elseif ($request->had_issues === 'no') {
                $statsQuery->whereDoesntHave('issues');
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
            'disbursed' => (clone $statsQuery)->where('status', 'disbursed')->count(),
        ];

        $loans = $query->orderBy('created_at', 'desc')->paginate(20);

        $orgFilters = $this->organizationFilterOptions();

        return Inertia::render('HeadOffice/LoanApplications', [
            'loans' => $loans,
            'filters' => array_merge(
                $request->only(['status', 'search', 'zone_id', 'area_id', 'branch_id', 'date_from', 'date_to', 'had_issues']),
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
     * Print view for loan applications (no layout, optimized for printing)
     */
    public function print(Request $request)
    {
        // Apply same filters as index
        $dateFrom = $request->date_from ?? now()->startOfMonth()->toDateString();
        $dateTo = $request->date_to ?? now()->toDateString();

        $startOfDay = Carbon::parse($dateFrom)->startOfDay();
        $endOfDay = Carbon::parse($dateTo)->endOfDay();

        $query = LoanApplication::with([
            'branch:id,name,area_id',
            'branch.area:id,name,zone_id',
            'branch.area.zone:id,name',
            'loanProduct:id,product_name,product_name_bn,product_code',
            'loanCategory:id,category_name,category_name_bn',
            'memberAdmission:id,applicant_name_en,applicant_name_bn,nid_number,mobile_number,application_no',
            'submittedBy:id,name'
        ])
        ->select([
            'id',
            'application_no',
            'member_admission_id',
            'loan_product_id',
            'loan_category_id',
            'branch_id',
            'status',
            'requested_amount',
            'approved_amount',
            'created_at',
            'submitted_at',
        ]);

        $this->applyAccessibleBranchScope($query);

        if ($dateFrom && $dateTo) {
            $query->whereBetween('created_at', [$startOfDay, $endOfDay]);
        } elseif ($dateFrom) {
            $query->where('created_at', '>=', $startOfDay);
        } elseif ($dateTo) {
            $query->where('created_at', '<=', $endOfDay);
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

        // Get all matching records (no pagination for print)
        $loans = $query->orderBy('created_at', 'desc')->get();

        $orgFilters = $this->organizationFilterOptions();

        return Inertia::render('HeadOffice/LoanApplicationsPrint', [
            'loans' => $loans,
            'filters' => $request->only(['status', 'search', 'zone_id', 'area_id', 'branch_id', 'date_from', 'date_to', 'had_issues']),
            'zones' => $orgFilters['zones'],
            'areas' => $orgFilters['areas'],
            'branches' => $orgFilters['branches'],
        ]);
    }
    /**
     * List loan applications pending at head office (for processing)
     */
    public function process(Request $request)
    {
        $date = $request->input('date', now()->toDateString());

        $query = LoanApplication::query()
            ->where('status', LoanApplication::STATUS_PENDING_HEAD_OFFICE);

        $this->applyAccessibleBranchScope($query);

        if ($date) {
            $query->whereDate('submitted_at', $date);
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

        $loans = $query->orderBy('submitted_at', 'desc')
            ->with([
                'branch:id,name,area_id',
                'branch.area:id,name,zone_id',
                'branch.area.zone:id,name',
                'loanProduct:id,product_name,product_name_bn',
                'loanCategory:id,category_name,category_name_bn',
                'memberAdmission:id,applicant_name_bn,applicant_name_en,nid_number,mobile_number',
                'submittedBy:id,name',
                'issues' => function ($q) {
                    $q->where('status', 'pending')
                        ->with('reporter:id,name');
                },
            ])
            ->paginate(20);

        return Inertia::render('HeadOffice/ProcessLoans', [
            'loans' => $loans,
            'filters' => [
                'date' => $date,
                'search' => $search,
            ],
        ]);
    }

    /**
     * Show single loan application for head office
     */
    public function show(LoanApplication $loanApplication)
    {
        $this->ensureCanAccessBranch($loanApplication->branch_id);

        $loanApplication->load([
            'branch.area.zone',
            'loanProduct',
            'loanCategory',
            'memberAdmission',
            'submittedBy',
            'approvals.user',
            'issues.reporter',
            'issues.responder',
        ]);

        // Determine visible form IDs based on loan product and amount
        $oneLakh = 100000.0;
        $product = $loanApplication->loanProduct;
        $installmentType = $product->installment_type ?? 'monthly';
        $amount = (float) $loanApplication->requested_amount;

        if (strtolower((string) $installmentType) === 'weekly') {
            $visibleFormIds = [1, 2, 3, 4];
        } else {
            $visibleFormIds = $amount < $oneLakh ? [5, 2, 3, 4] : [5, 3];
        }

        // Check if form data exists and is not empty/null/empty JSON
        $checkFormData = function($data) {
            if (empty($data)) return false;
            if (is_array($data)) return count($data) > 0;
            if (is_string($data)) {
                $trimmed = trim($data);
                return $trimmed !== '' && $trimmed !== 'null' && $trimmed !== '{}';
            }
            return true;
        };

        $formSaved = [
            1 => $checkFormData($loanApplication->loan_agreement_data),
            2 => $checkFormData($loanApplication->guarantor_info),
            3 => $checkFormData($loanApplication->nominee_info),
            4 => $checkFormData($loanApplication->asset_info),
            5 => $checkFormData($loanApplication->business_plan),
        ];

        $loanApplication->visible_form_ids = $visibleFormIds;
        $loanApplication->form_saved = $formSaved;

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

        $loanApplication->update([
            'status' => LoanApplication::STATUS_APPROVED,
            'reviewed_at' => now(),
            'reviewed_by' => auth()->id(),
        ]);

        return back()->with('success', 'ঋণ আবেদন অনুমোদিত হয়েছে।');
    }

    /**
     * Approve all pending head office loans without issues (for the selected date)
     */
    public function approveAll(Request $request)
    {
        $date = $request->input('date', now()->toDateString());

        DB::beginTransaction();
        try {
            $loans = LoanApplication::where('status', LoanApplication::STATUS_PENDING_HEAD_OFFICE)
                ->whereDate('submitted_at', $date)
                ->get();

            $approvedCount = 0;
            $skippedCount = 0;

            foreach ($loans as $loan) {
                if ($loan->issues()->where('status', 'pending')->exists()) {
                    $skippedCount++;
                    continue;
                }
                $loan->update([
                    'status' => LoanApplication::STATUS_APPROVED,
                    'reviewed_at' => now(),
                    'reviewed_by' => auth()->id(),
                ]);
                $approvedCount++;
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

        return back()->with('success', 'ঋণ আবেদন প্রত্যাখ্যান হয়েছে।');
    }

    /**
     * Delete loan application (only draft and submitted status)
     */
    public function destroy(LoanApplication $loanApplication)
    {
        // Only draft and submitted loans can be deleted
        if (!in_array($loanApplication->status, ['draft', 'submitted'])) {
            return back()->with('error', 'Only draft and submitted loan applications can be deleted!');
        }

        $loanApplication->delete();

        return back()->with('success', 'Loan application deleted successfully!');
    }

}

