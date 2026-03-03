<?php

namespace App\Http\Controllers;

use App\Models\Area;
use App\Models\Branch;
use App\Models\TeamBasedApproval;
use App\Models\Zone;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class HeadOfficeTeamBasedApprovalController extends Controller
{
    /**
     * Head Office overview: all Team Based approvals across organization.
     */
    public function index(Request $request)
    {
        // Default date filter - current date
        $dateFrom = $request->input('date_from', now()->toDateString());
        $dateTo = $request->input('date_to', now()->toDateString());

        $startOfDay = Carbon::parse($dateFrom)->startOfDay();
        $endOfDay = Carbon::parse($dateTo)->endOfDay();

        // Base query with relationships, selecting only required columns
        $query = TeamBasedApproval::with([
            'branch:id,name,code,area_id',
            'branch.area:id,name,zone_id',
            'branch.area.zone:id,name',
            'creator:id,name',
            'areaManager:id,name,role_id',
            'zoneManager:id,name,role_id',
            'admf:id,name,role_id',
            'dmf:id,name,role_id',
            'ed:id,name,role_id',
            'items',
            'reviews',
        ])
            ->withCount('items')
            ->withSum('items as proposed_total', 'proposed_loan_amount')
            ->select([
                'id',
                'branch_id',
                'created_by',
                'sheet_date',
                'area_manager_id',
                'zone_manager_id',
                'admf_id',
                'dmf_id',
                'ed_id',
                'status',
                'approved_total_amount',
                'created_at',
            ]);

        // Date range filter on sheet_date
        if ($dateFrom && $dateTo) {
            $query->whereBetween('sheet_date', [$startOfDay, $endOfDay]);
        } elseif ($dateFrom) {
            $query->where('sheet_date', '>=', $startOfDay);
        } elseif ($dateTo) {
            $query->where('sheet_date', '<=', $endOfDay);
        }

        // Zone filter
        if ($request->filled('zone_id')) {
            $zoneId = (int) $request->input('zone_id');
            $query->whereHas('branch.area', function ($q) use ($zoneId) {
                $q->where('zone_id', $zoneId);
            });
        }

        // Area filter
        if ($request->filled('area_id')) {
            $areaId = (int) $request->input('area_id');
            $query->whereHas('branch', function ($q) use ($areaId) {
                $q->where('area_id', $areaId);
            });
        }

        // Branch filter
        if ($request->filled('branch_id')) {
            $query->where('branch_id', (int) $request->input('branch_id'));
        }

        // Status filter
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        // Simple search on member / sheet information via items (member name / code / project)
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->whereHas('items', function ($q) use ($search) {
                $q->where('member_name', 'like', "%{$search}%")
                    ->orWhere('member_code', 'like', "%{$search}%")
                    ->orWhere('project_name', 'like', "%{$search}%");
            });
        }

        // Stats query (same filters except status) for high-level counts
        $statsQuery = TeamBasedApproval::select([
            'id',
            'branch_id',
            'status',
            'sheet_date',
        ]);

        if ($dateFrom && $dateTo) {
            $statsQuery->whereBetween('sheet_date', [$startOfDay, $endOfDay]);
        } elseif ($dateFrom) {
            $statsQuery->where('sheet_date', '>=', $startOfDay);
        } elseif ($dateTo) {
            $statsQuery->where('sheet_date', '<=', $endOfDay);
        }

        if ($request->filled('zone_id')) {
            $zoneId = (int) $request->input('zone_id');
            $statsQuery->whereHas('branch.area', function ($q) use ($zoneId) {
                $q->where('zone_id', $zoneId);
            });
        }

        if ($request->filled('area_id')) {
            $areaId = (int) $request->input('area_id');
            $statsQuery->whereHas('branch', function ($q) use ($areaId) {
                $q->where('area_id', $areaId);
            });
        }

        if ($request->filled('branch_id')) {
            $statsQuery->where('branch_id', (int) $request->input('branch_id'));
        }

        $stats = [
            'total' => (clone $statsQuery)->count(),
            'draft' => (clone $statsQuery)->where('status', 'draft')->count(),
            'pending' => (clone $statsQuery)->where('status', 'pending')->count(),
            'approved' => (clone $statsQuery)->where('status', 'approved')->count(),
            'rejected' => (clone $statsQuery)->where('status', 'rejected')->count(),
        ];

        $approvals = $query
            ->orderBy('sheet_date', 'desc')
            ->orderBy('id', 'desc')
            ->paginate(20)
            ->through(function (TeamBasedApproval $approval) {
                $approver = $approval->areaManager
                    ?? $approval->zoneManager
                    ?? $approval->admf
                    ?? $approval->dmf
                    ?? $approval->ed;

                // Map reviews by item id (per-loan decisions)
                $reviewsByItem = $approval->reviews
                    ->whereNotNull('team_based_approval_item_id')
                    ->keyBy('team_based_approval_item_id');

                return [
                    'id' => $approval->id,
                    'sheet_date' => optional($approval->sheet_date)->toDateString(),
                    'status' => $approval->status,
                    'branch' => [
                        'name' => $approval->branch?->name,
                        'code' => $approval->branch?->code,
                        'area_name' => $approval->branch?->area?->name,
                        'zone_name' => $approval->branch?->area?->zone?->name,
                    ],
                    'items_count' => $approval->items_count,
                    'proposed_total' => $approval->proposed_total ?? 0,
                    'approved_total_amount' => $approval->approved_total_amount,
                    'creator_name' => $approval->creator?->name,
                    'approver_name' => $approver?->name,
                    'items' => $approval->items->map(function ($item) use ($reviewsByItem, $approval) {
                        $review = $reviewsByItem[$item->id] ?? null;

                        return [
                            'serial_no' => $item->serial_no,
                            'member_name' => $item->member_name,
                            'member_code' => $item->member_code,
                            'samity_number' => $item->samity_number,
                            'savings_general' => $item->savings_general,
                            'savings_other' => $item->savings_other,
                            'savings_total' => $item->savings_total,
                            'repaid_loan_amount' => $item->repaid_loan_amount,
                            'repaid_installment_no' => $item->repaid_installment_no,
                            'other_institution_loan_amount' => $item->other_institution_loan_amount,
                            'proposed_loan_amount' => $item->proposed_loan_amount,
                            'approved_amount' => $item->approved_amount,
                            'loan_term_years' => $item->loan_term_years,
                            'loan_type' => $item->loan_type,
                            'project_name' => $item->project_name,
                            // Per-loan approval info
                            'status' => $review?->status ?? $approval->status,
                            'review_comments' => $review?->comments,
                            'approver_signature' => $review?->approver_signature,
                            'decided_at' => optional($review?->decided_at)->toDateString(),
                        ];
                    })->values(),
                ];
            });

        $zones = Zone::active()->orderBy('name')->get();
        $areas = Area::active()->with('zone')->orderBy('name')->get();
        $branches = Branch::active()->with('area.zone')->orderBy('name')->get();

        return Inertia::render('HeadOffice/TeamBasedApprovals', [
            'approvals' => $approvals,
            'filters' => array_merge(
                $request->only(['status', 'search', 'zone_id', 'area_id', 'branch_id', 'date_from', 'date_to']),
                [
                    'date_from' => $dateFrom,
                    'date_to' => $dateTo,
                ]
            ),
            'stats' => $stats,
            'zones' => $zones,
            'areas' => $areas,
            'branches' => $branches,
        ]);
    }
}

