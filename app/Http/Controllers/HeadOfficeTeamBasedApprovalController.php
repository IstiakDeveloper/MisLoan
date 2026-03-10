<?php

namespace App\Http\Controllers;

use App\Models\Area;
use App\Models\Branch;
use App\Models\Role;
use App\Models\TeamBasedApproval;
use App\Models\TeamBasedApprovalItem;
use App\Models\TeamBasedApprovalReview;
use App\Models\User;
use App\Models\Zone;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
            'reviews.user.role',
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

                // All reviews per item (multi-approver chain)
                $reviewsByItem = $approval->reviews
                    ->whereNotNull('team_based_approval_item_id')
                    ->groupBy('team_based_approval_item_id');

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
                        $reviewsForItem = $reviewsByItem->get($item->id, collect())->sortBy('id')->values();
                        $review = $reviewsForItem->last();

                        return [
                            'id' => $item->id,
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
                            'status' => $review?->status ?? $approval->status,
                            'review_comments' => $review?->comments,
                            'approver_signature' => $review?->approver_signature,
                            'decided_at' => optional($review?->decided_at)->toDateString(),
                            'approvers' => $reviewsForItem->map(function ($r) {
                                return [
                                    'approver_name' => $r->user?->name,
                                    'approver_role' => $r->user?->role?->display_name ?? $r->user?->role?->name,
                                    'status' => $r->status,
                                    'approved_amount' => $r->approved_amount,
                                    'comments' => $r->comments,
                                    'approver_signature' => $r->approver_signature,
                                    'decided_at' => optional($r->decided_at)->toDateString(),
                                ];
                            })->values()->all(),
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

    /**
     * Head Office: edit a draft Team Based sheet (same form as branch, but without branch restriction).
     */
    public function edit(TeamBasedApproval $teamBasedApproval)
    {
        $branch = $teamBasedApproval->branch()->with('area.zone')->firstOrFail();

        // Build approver list for this branch (same as branch edit)
        $areaZoneUsers = User::query()
            ->active()
            ->whereHas('role', function ($q) {
                $q->whereIn('name', [Role::AREA_MANAGER, Role::ZONE_MANAGER]);
            })
            ->canAccessBranch($branch->id)
            ->with('role:id,name,display_name')
            ->orderBy('name')
            ->get();

        $admfDmfEd = User::getApproversSelectableByBranch($branch->id)
            ->loadMissing('role:id,name,display_name');

        $approverOptions = collect();
        $approverOptions = $approverOptions->merge(
            $areaZoneUsers->map(function (User $u) {
                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'role_name' => $u->role->display_name ?? $u->role->name,
                    'level' => $u->role->name,
                ];
            })
        );
        $approverOptions = $approverOptions->merge(
            $admfDmfEd->map(function (User $u) {
                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'role_name' => $u->role->display_name ?? $u->role->name,
                    'level' => $u->role->name,
                ];
            })
        );

        $teamBasedApproval->load('items');

        $approverUserId = $teamBasedApproval->area_manager_id
            ?? $teamBasedApproval->zone_manager_id
            ?? $teamBasedApproval->admf_id
            ?? $teamBasedApproval->dmf_id
            ?? $teamBasedApproval->ed_id;

        $existingApproval = [
            'id' => $teamBasedApproval->id,
            'sheet_date' => optional($teamBasedApproval->sheet_date)->toDateString(),
            'approver_user_id' => $approverUserId,
            'status' => $teamBasedApproval->status,
            'items' => $teamBasedApproval->items->map(function (TeamBasedApprovalItem $item) {
                return [
                    'member_name' => $item->member_name,
                    'member_code' => $item->member_code ?? '',
                    'samity_number' => $item->samity_number ?? '',
                    'savings_general' => $item->savings_general !== null ? (string) $item->savings_general : '',
                    'savings_other' => $item->savings_other !== null ? (string) $item->savings_other : '',
                    'savings_total' => $item->savings_total !== null ? (string) $item->savings_total : '',
                    'repaid_loan_amount' => $item->repaid_loan_amount !== null ? (string) $item->repaid_loan_amount : '',
                    'repaid_installment_no' => $item->repaid_installment_no !== null ? (string) $item->repaid_installment_no : '',
                    'other_institution_loan_amount' => $item->other_institution_loan_amount !== null
                        ? (string) $item->other_institution_loan_amount
                        : '',
                    'proposed_loan_amount' => $item->proposed_loan_amount !== null ? (string) $item->proposed_loan_amount : '',
                    'loan_term_years' => $item->loan_term_years !== null ? (string) $item->loan_term_years : '',
                    'loan_type' => $item->loan_type ?? '',
                    'project_name' => $item->project_name ?? '',
                ];
            })->values(),
        ];

        return Inertia::render('HeadOffice/TeamBasedApprovalEdit', [
            'branch' => [
                'id' => $branch->id,
                'name' => $branch->name,
                'code' => $branch->code,
                'area_name' => $branch->area?->name,
                'zone_name' => $branch->area?->zone?->name,
            ],
            'approverOptions' => $approverOptions->values(),
            'today' => now()->toDateString(),
            'existingApproval' => $existingApproval,
        ]);
    }

    /**
     * Head Office: edit a single loan item (row) from overview table.
     */
    public function editItem(TeamBasedApprovalItem $item)
    {
        $approval = $item->approval()
            ->with(['branch.area.zone', 'reviews' => function ($q) use ($item) {
                $q->where('team_based_approval_item_id', $item->id);
            }])
            ->firstOrFail();

        /** @var \App\Models\TeamBasedApprovalReview|null $review */
        $review = $approval->reviews->first();

        $existingItem = [
            'id' => $item->id,
            'sheet_date' => optional($approval->sheet_date)->toDateString(),
            'status' => $review?->status ?? $approval->status,
            'member_name' => $item->member_name,
            'member_code' => $item->member_code ?? '',
            'samity_number' => $item->samity_number ?? '',
            'savings_general' => $item->savings_general !== null ? (string) $item->savings_general : '',
            'savings_other' => $item->savings_other !== null ? (string) $item->savings_other : '',
            'savings_total' => $item->savings_total !== null ? (string) $item->savings_total : '',
            'repaid_loan_amount' => $item->repaid_loan_amount !== null ? (string) $item->repaid_loan_amount : '',
            'repaid_installment_no' => $item->repaid_installment_no !== null ? (string) $item->repaid_installment_no : '',
            'other_institution_loan_amount' => $item->other_institution_loan_amount !== null
                ? (string) $item->other_institution_loan_amount
                : '',
            'proposed_loan_amount' => $item->proposed_loan_amount !== null ? (string) $item->proposed_loan_amount : '',
            'approved_amount' => $item->approved_amount !== null ? (string) $item->approved_amount : '',
            'loan_term_years' => $item->loan_term_years !== null ? (string) $item->loan_term_years : '',
            'loan_type' => $item->loan_type ?? '',
            'project_name' => $item->project_name ?? '',
            'review_comments' => $review?->comments ?? '',
        ];

        $branch = $approval->branch;

        return Inertia::render('HeadOffice/TeamBasedItemEdit', [
            'branch' => [
                'id' => $branch->id,
                'name' => $branch->name,
                'code' => $branch->code,
                'area_name' => $branch->area?->name,
                'zone_name' => $branch->area?->zone?->name,
            ],
            'item' => $existingItem,
        ]);
    }

    /**
     * Head Office: update a Team Based sheet data (including approved amount & comments) – sheet-level.
     */
    public function update(Request $request, TeamBasedApproval $teamBasedApproval)
    {
        $validated = $request->validate([
            'sheet_date' => ['required', 'date'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.member_name' => ['required', 'string', 'max:255'],
            'items.*.member_code' => ['nullable', 'string', 'max:50'],
            'items.*.samity_number' => ['nullable', 'string', 'max:50'],
            'items.*.savings_general' => ['nullable', 'numeric', 'min:0'],
            'items.*.savings_other' => ['nullable', 'numeric', 'min:0'],
            'items.*.savings_total' => ['nullable', 'numeric', 'min:0'],
            'items.*.repaid_loan_amount' => ['nullable', 'string', 'max:100'],
            'items.*.repaid_installment_no' => ['nullable', 'string', 'max:100'],
            'items.*.other_institution_loan_amount' => ['nullable', 'string', 'max:500'],
            'items.*.proposed_loan_amount' => ['nullable', 'string', 'max:100'],
            'items.*.approved_amount' => ['nullable', 'numeric', 'min:0'],
            'items.*.loan_term_years' => ['nullable', 'numeric', 'in:0.5,1,1.5,2,3'],
            'items.*.loan_type' => ['nullable', 'string', 'max:100'],
            'items.*.project_name' => ['nullable', 'string', 'max:255'],
            'items.*.review_comments' => ['nullable', 'string', 'max:1000'],
        ]);

        DB::transaction(function () use ($validated, $teamBasedApproval) {
            // Update basic sheet info; approver mapping অপরিবর্তিত থাকবে (Head Office কেবল তথ্য ঠিক করবে)
            $teamBasedApproval->update([
                'sheet_date' => $validated['sheet_date'],
            ]);

            $teamBasedApproval->loadMissing(['items', 'reviews']);

            $items = $teamBasedApproval->items()
                ->orderBy('serial_no')
                ->get();

            $reviewsByItem = $teamBasedApproval->reviews
                ->whereNotNull('team_based_approval_item_id')
                ->keyBy('team_based_approval_item_id');

            foreach ($items as $index => $item) {
                if (! isset($validated['items'][$index])) {
                    continue;
                }

                $row = $validated['items'][$index];

                $itemUpdate = [
                    'member_name' => $row['member_name'],
                    'member_code' => $row['member_code'] ?? null,
                    'samity_number' => $row['samity_number'] ?? null,
                    'savings_general' => $row['savings_general'] ?? null,
                    'savings_other' => $row['savings_other'] ?? null,
                    'savings_total' => $row['savings_total'] ?? null,
                    'repaid_loan_amount' => $row['repaid_loan_amount'] ?? null,
                    'repaid_installment_no' => $row['repaid_installment_no'] ?? null,
                    'other_institution_loan_amount' => $row['other_institution_loan_amount'] ?? null,
                    'proposed_loan_amount' => $row['proposed_loan_amount'] ?? null,
                    'approved_amount' => $row['approved_amount'] ?? null,
                    'loan_term_years' => $row['loan_term_years'] ?? null,
                    'loan_type' => $row['loan_type'] ?? null,
                    'project_name' => $row['project_name'] ?? null,
                ];

                $item->update($itemUpdate);

                /** @var \App\Models\TeamBasedApprovalReview|null $review */
                $review = $reviewsByItem[$item->id] ?? null;
                if ($review && array_key_exists('review_comments', $row)) {
                    $review->update([
                        'comments' => $row['review_comments'] ?: null,
                    ]);
                }
            }
        });

        return redirect()
            ->route('head-office.team-based-approvals')
            ->with('success', 'টিম ভিত্তিক শিটের তথ্য সফলভাবে হালনাগাদ হয়েছে।');
    }

    /**
     * Head Office: update a single loan item (row) including approved amount & comments.
     */
    public function updateItem(Request $request, TeamBasedApprovalItem $item)
    {
        $validated = $request->validate([
            'member_name' => ['required', 'string', 'max:255'],
            'member_code' => ['nullable', 'string', 'max:50'],
            'samity_number' => ['nullable', 'string', 'max:50'],
            'savings_general' => ['nullable', 'numeric', 'min:0'],
            'savings_other' => ['nullable', 'numeric', 'min:0'],
            'savings_total' => ['nullable', 'numeric', 'min:0'],
            'repaid_loan_amount' => ['nullable', 'string', 'max:100'],
            'repaid_installment_no' => ['nullable', 'string', 'max:100'],
            'other_institution_loan_amount' => ['nullable', 'string', 'max:500'],
            'proposed_loan_amount' => ['nullable', 'string', 'max:100'],
            'approved_amount' => ['nullable', 'numeric', 'min:0'],
            'loan_term_years' => ['nullable', 'numeric', 'in:0.5,1,1.5,2,3'],
            'loan_type' => ['nullable', 'string', 'max:100'],
            'project_name' => ['nullable', 'string', 'max:255'],
            'review_comments' => ['nullable', 'string', 'max:1000'],
        ]);

        DB::transaction(function () use ($validated, $item) {
            $item->update([
                'member_name' => $validated['member_name'],
                'member_code' => $validated['member_code'] ?? null,
                'samity_number' => $validated['samity_number'] ?? null,
                'savings_general' => $validated['savings_general'] ?? null,
                'savings_other' => $validated['savings_other'] ?? null,
                'savings_total' => $validated['savings_total'] ?? null,
                'repaid_loan_amount' => $validated['repaid_loan_amount'] ?? null,
                'repaid_installment_no' => $validated['repaid_installment_no'] ?? null,
                'other_institution_loan_amount' => $validated['other_institution_loan_amount'] ?? null,
                'proposed_loan_amount' => $validated['proposed_loan_amount'] ?? null,
                'approved_amount' => $validated['approved_amount'] ?? null,
                'loan_term_years' => $validated['loan_term_years'] ?? null,
                'loan_type' => $validated['loan_type'] ?? null,
                'project_name' => $validated['project_name'] ?? null,
            ]);

            /** @var \App\Models\TeamBasedApprovalReview|null $review */
            $review = TeamBasedApprovalReview::where('team_based_approval_item_id', $item->id)->first();
            if ($review && array_key_exists('review_comments', $validated)) {
                $review->update([
                    'comments' => $validated['review_comments'] ?: null,
                ]);
            }
        });

        return redirect()
            ->route('head-office.team-based-approvals')
            ->with('success', 'সিঙ্গেল লোন সারির তথ্য সফলভাবে হালনাগাদ হয়েছে।');
    }

    /**
     * Head Office: delete a single loan item (row) from overview.
     */
    public function destroyItem(TeamBasedApprovalItem $item)
    {
        DB::transaction(function () use ($item) {
            TeamBasedApprovalReview::where('team_based_approval_item_id', $item->id)->delete();
            $item->delete();
        });

        return redirect()
            ->back()
            ->with('success', 'এই লোন সারিটি সফলভাবে মুছে ফেলা হয়েছে।');
    }

    /**
     * Head Office: delete a Team Based sheet (any status; Head Office override).
     */
    public function destroy(TeamBasedApproval $teamBasedApproval)
    {
        $teamBasedApproval->delete();

        return redirect()
            ->back()
            ->with('success', 'Team Based শিট সফলভাবে মুছে ফেলা হয়েছে।');
    }
}

