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

        // Base query on items
        $query = TeamBasedApprovalItem::query()
            ->with([
                'approval.branch',
                'approval.branch.area:id,name,zone_id',
                'approval.branch.area.zone:id,name',
                'approval.creator:id,name',
                'approval.areaManager:id,name,role_id',
                'approval.zoneManager:id,name,role_id',
                'approval.admf:id,name,role_id',
                'approval.dmf:id,name,role_id',
                'approval.ed:id,name,role_id',
                'approval.reviews.user.role',
            ]);

        // Date range filter on sheet_date
        if ($dateFrom && $dateTo) {
            $query->whereHas('approval', function ($q) use ($startOfDay, $endOfDay) {
                $q->whereBetween('sheet_date', [$startOfDay, $endOfDay]);
            });
        } elseif ($dateFrom) {
            $query->whereHas('approval', function ($q) use ($startOfDay) {
                $q->where('sheet_date', '>=', $startOfDay);
            });
        } elseif ($dateTo) {
            $query->whereHas('approval', function ($q) use ($endOfDay) {
                $q->where('sheet_date', '<=', $endOfDay);
            });
        }

        // Zone filter
        if ($request->filled('zone_id')) {
            $zoneId = (int) $request->input('zone_id');
            $query->whereHas('approval.branch.area', function ($q) use ($zoneId) {
                $q->where('zone_id', $zoneId);
            });
        }

        // Area filter
        if ($request->filled('area_id')) {
            $areaId = (int) $request->input('area_id');
            $query->whereHas('approval.branch', function ($q) use ($areaId) {
                $q->where('area_id', $areaId);
            });
        }

        // Branch filter
        if ($request->filled('branch_id')) {
            $query->whereHas('approval', function ($q) use ($request) {
                $q->where('branch_id', (int) $request->input('branch_id'));
            });
        }

        // Search filter
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('member_name', 'like', "%{$search}%")
                    ->orWhere('member_code', 'like', "%{$search}%")
                    ->orWhere('project_name', 'like', "%{$search}%");
            });
        }

        // Status filter
        $statusFilter = '';
        if ($request->filled('status')) {
            $statusFilter = strtolower(trim((string) $request->input('status')));
            $query->where(function ($q) use ($statusFilter) {
                $q->whereHas('approval.reviews', function ($sub) use ($statusFilter) {
                    $sub->whereColumn('team_based_approval_item_id', 'team_based_approval_items.id');
                    if ($statusFilter === 'under_review') {
                        $sub->whereIn('status', ['under_review', 'forwarded']);
                    } else {
                        $sub->where('status', $statusFilter);
                    }
                    $sub->whereRaw('id = (SELECT MAX(id) FROM team_based_approval_reviews WHERE team_based_approval_item_id = team_based_approval_items.id)');
                })
                ->orWhere(function ($sub) use ($statusFilter) {
                    $sub->whereNotExists(function ($sub2) {
                        $sub2->select(DB::raw(1))
                            ->from('team_based_approval_reviews')
                            ->whereColumn('team_based_approval_item_id', 'team_based_approval_items.id');
                    })
                    ->whereHas('approval', function ($sub3) use ($statusFilter) {
                        if ($statusFilter === 'under_review') {
                            $sub3->whereIn('status', ['under_review', 'forwarded']);
                        } else {
                            $sub3->where('status', $statusFilter);
                        }
                    });
                });
            });
        }

        // Stats query (same filters except status) for high-level counts based on items
        $statsItemsQuery = TeamBasedApprovalItem::query()
            ->join('team_based_approvals', 'team_based_approvals.id', '=', 'team_based_approval_items.team_based_approval_id');

        if ($dateFrom && $dateTo) {
            $statsItemsQuery->whereBetween('team_based_approvals.sheet_date', [$startOfDay, $endOfDay]);
        } elseif ($dateFrom) {
            $statsItemsQuery->where('team_based_approvals.sheet_date', '>=', $startOfDay);
        } elseif ($dateTo) {
            $statsItemsQuery->where('team_based_approvals.sheet_date', '<=', $endOfDay);
        }

        if ($request->filled('zone_id')) {
            $zoneId = (int) $request->input('zone_id');
            $statsItemsQuery->whereHas('approval.branch.area', function ($q) use ($zoneId) {
                $q->where('zone_id', $zoneId);
            });
        }

        if ($request->filled('area_id')) {
            $areaId = (int) $request->input('area_id');
            $statsItemsQuery->whereHas('approval.branch', function ($q) use ($areaId) {
                $q->where('area_id', $areaId);
            });
        }

        if ($request->filled('branch_id')) {
            $statsItemsQuery->where('team_based_approvals.branch_id', (int) $request->input('branch_id'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $statsItemsQuery->where(function ($q) use ($search) {
                $q->where('team_based_approval_items.member_name', 'like', "%{$search}%")
                    ->orWhere('team_based_approval_items.member_code', 'like', "%{$search}%")
                    ->orWhere('team_based_approval_items.project_name', 'like', "%{$search}%");
            });
        }

        $rawCounts = (clone $statsItemsQuery)
            ->select([
                DB::raw('LOWER(TRIM(COALESCE(
                    (SELECT status FROM team_based_approval_reviews 
                     WHERE team_based_approval_item_id = team_based_approval_items.id 
                     ORDER BY id DESC LIMIT 1),
                    team_based_approvals.status
                ))) as computed_status'),
                DB::raw('COUNT(*) as count')
            ])
            ->groupBy('computed_status')
            ->pluck('count', 'computed_status')
            ->toArray();

        $stats = [
            'total' => array_sum($rawCounts),
            'draft' => $rawCounts['draft'] ?? 0,
            'pending' => ($rawCounts['pending'] ?? 0) + ($rawCounts['under_review'] ?? 0) + ($rawCounts['forwarded'] ?? 0),
            'approved' => $rawCounts['approved'] ?? 0,
            'rejected' => $rawCounts['rejected'] ?? 0,
        ];

        // Paginated items response
        $approvals = $query
            ->orderBy('id', 'desc')
            ->paginate(100)
            ->through(function (TeamBasedApprovalItem $item) {
                $approval = $item->approval;
                $approver = $approval->areaManager
                    ?? $approval->zoneManager
                    ?? $approval->admf
                    ?? $approval->dmf
                    ?? $approval->ed;

                // All reviews per item
                $reviewsForItem = $approval->reviews
                    ->where('team_based_approval_item_id', $item->id)
                    ->sortBy('id')
                    ->values();

                $review = $reviewsForItem->last();
                $itemStatus = $review?->status ?? $approval->status;

                return [
                    'id' => $item->id,
                    'serial_no' => $item->serial_no,
                    'member_name' => $item->member_name,
                    'member_code' => $item->member_code,
                    'member_phone' => $item->member_phone,
                    'samity_number' => $item->samity_number,
                    'savings_general' => $item->savings_general !== null ? (int) round((float) $item->savings_general) : null,
                    'savings_other' => $item->savings_other !== null ? (int) round((float) $item->savings_other) : null,
                    'savings_total' => $item->savings_total !== null ? (int) round((float) $item->savings_total) : null,
                    'repaid_loan_amount' => $item->repaid_loan_amount,
                    'repaid_installment_no' => $item->repaid_installment_no,
                    'other_institution_loan_amount' => $item->other_institution_loan_amount,
                    'proposed_loan_amount' => $item->proposed_loan_amount,
                    'approved_amount' => $item->approved_amount !== null ? (int) round((float) $item->approved_amount) : null,
                    'loan_term_years' => $item->loan_term_years,
                    'loan_type' => $item->loan_type,
                    'project_name' => $item->project_name,
                    'status' => $itemStatus,
                    'review_comments' => $review?->comments,
                    'approver_signature' => $review && in_array($review->status, ['approved', 'rejected', 'forwarded'], true) ? ($review->approver_signature ?? $review->user?->signature) : null,
                    'decided_at' => optional($review?->decided_at)->toDateString(),
                    'approvers' => $reviewsForItem->map(function ($r) {
                        return [
                            'approver_name' => $r->user?->name,
                            'approver_role' => $r->user?->role?->display_name ?? $r->user?->role?->name,
                            'status' => $r->status,
                            'approved_amount' => $r->approved_amount !== null ? (int) round((float) $r->approved_amount) : null,
                            'comments' => $r->comments,
                            'approver_signature' => in_array($r->status, ['approved', 'rejected', 'forwarded'], true) ? ($r->approver_signature ?? $r->user?->signature) : null,
                            'decided_at' => optional($r->decided_at)->toDateString(),
                        ];
                    })->values()->all(),
                    // Sheet level attributes
                    'sheet_id' => $approval->id,
                    'sheet_date' => optional($approval->sheet_date)->toDateString(),
                    'branch' => [
                        'name' => $approval->branch?->name,
                        'code' => $approval->branch?->code,
                        'area_name' => $approval->branch?->area?->name,
                        'zone_name' => $approval->branch?->area?->zone?->name,
                    ],
                    'proposed_total' => $approval->items->sum('proposed_loan_amount'),
                    'approved_total_amount' => $approval->approved_total_amount !== null ? (int) round((float) $approval->approved_total_amount) : null,
                    'creator_name' => $approval->creator?->name,
                    'approver_name' => $approver?->name,
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
                    'member_phone' => $item->member_phone ?? '',
                    'samity_number' => $item->samity_number ?? '',
                    'savings_general' => $item->savings_general !== null ? (string) (int) round((float) $item->savings_general) : '',
                    'savings_other' => $item->savings_other !== null ? (string) (int) round((float) $item->savings_other) : '',
                    'savings_total' => $item->savings_total !== null ? (string) (int) round((float) $item->savings_total) : '',
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
            'member_phone' => $item->member_phone ?? '',
            'samity_number' => $item->samity_number ?? '',
            'savings_general' => $item->savings_general !== null ? (string) (int) round((float) $item->savings_general) : '',
            'savings_other' => $item->savings_other !== null ? (string) (int) round((float) $item->savings_other) : '',
            'savings_total' => $item->savings_total !== null ? (string) (int) round((float) $item->savings_total) : '',
            'repaid_loan_amount' => $item->repaid_loan_amount !== null ? (string) $item->repaid_loan_amount : '',
            'repaid_installment_no' => $item->repaid_installment_no !== null ? (string) $item->repaid_installment_no : '',
            'other_institution_loan_amount' => $item->other_institution_loan_amount !== null
                ? (string) $item->other_institution_loan_amount
                : '',
            'proposed_loan_amount' => $item->proposed_loan_amount !== null ? (string) $item->proposed_loan_amount : '',
            'approved_amount' => $item->approved_amount !== null ? (string) (int) round((float) $item->approved_amount) : '',
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
            'items.*.member_phone' => ['nullable', 'string', 'max:20'],
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
                    'member_phone' => $row['member_phone'] ?? null,
                    'samity_number' => $row['samity_number'] ?? null,
                    'savings_general' => isset($row['savings_general']) ? (int) round((float) $row['savings_general']) : null,
                    'savings_other' => isset($row['savings_other']) ? (int) round((float) $row['savings_other']) : null,
                    'savings_total' => isset($row['savings_total']) ? (int) round((float) $row['savings_total']) : null,
                    'repaid_loan_amount' => $row['repaid_loan_amount'] ?? null,
                    'repaid_installment_no' => $row['repaid_installment_no'] ?? null,
                    'other_institution_loan_amount' => $row['other_institution_loan_amount'] ?? null,
                    'proposed_loan_amount' => $row['proposed_loan_amount'] ?? null,
                    'approved_amount' => isset($row['approved_amount']) ? (int) round((float) $row['approved_amount']) : null,
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
            'member_phone' => ['nullable', 'string', 'max:20'],
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
                'member_phone' => $validated['member_phone'] ?? null,
                'samity_number' => $validated['samity_number'] ?? null,
                'savings_general' => isset($validated['savings_general']) ? (int) round((float) $validated['savings_general']) : null,
                'savings_other' => isset($validated['savings_other']) ? (int) round((float) $validated['savings_other']) : null,
                'savings_total' => isset($validated['savings_total']) ? (int) round((float) $validated['savings_total']) : null,
                'repaid_loan_amount' => $validated['repaid_loan_amount'] ?? null,
                'repaid_installment_no' => $validated['repaid_installment_no'] ?? null,
                'other_institution_loan_amount' => $validated['other_institution_loan_amount'] ?? null,
                'proposed_loan_amount' => $validated['proposed_loan_amount'] ?? null,
                'approved_amount' => isset($validated['approved_amount']) ? (int) round((float) $validated['approved_amount']) : null,
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

    /**
     * Head Office report: zone-wise and user-wise pending/approved counts.
     */
    public function report(Request $request)
    {
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');
        $zoneFilterId = $request->filled('zone_id') ? (int) $request->input('zone_id') : null;

        $rowsQuery = DB::table('team_based_approval_reviews as r')
            ->join('team_based_approvals as tba', 'r.team_based_approval_id', '=', 'tba.id')
            ->join('branches as b', 'tba.branch_id', '=', 'b.id')
            ->join('areas as a', 'b.area_id', '=', 'a.id')
            ->join('zones as z', 'a.zone_id', '=', 'z.id')
            ->join('users as u', 'r.user_id', '=', 'u.id')
            ->leftJoin('roles as ro', 'u.role_id', '=', 'ro.id')
            ->where('tba.status', '!=', 'draft')
            ->whereNotNull('r.team_based_approval_item_id');

        if ($dateFrom && $dateTo) {
            $rowsQuery->whereBetween('tba.sheet_date', [
                Carbon::parse($dateFrom)->startOfDay(),
                Carbon::parse($dateTo)->endOfDay(),
            ]);
        } elseif ($dateFrom) {
            $rowsQuery->where('tba.sheet_date', '>=', Carbon::parse($dateFrom)->startOfDay());
        } elseif ($dateTo) {
            $rowsQuery->where('tba.sheet_date', '<=', Carbon::parse($dateTo)->endOfDay());
        }

        if ($zoneFilterId) {
            $rowsQuery->where('z.id', $zoneFilterId);
        }

        $rows = $rowsQuery
            ->select([
                'z.id as zone_id',
                'z.name as zone_name',
                'u.id as user_id',
                'u.name as user_name',
                DB::raw('COALESCE(ro.display_name, ro.name) as role_name'),
                DB::raw("SUM(CASE WHEN LOWER(r.status) = 'pending' THEN 1 ELSE 0 END) as pending_count"),
                DB::raw("SUM(CASE WHEN LOWER(r.status) = 'approved' THEN 1 ELSE 0 END) as approved_count"),
                DB::raw("SUM(CASE WHEN LOWER(r.status) IN ('forwarded', 'under_review') THEN 1 ELSE 0 END) as forwarded_count"),
                DB::raw("SUM(CASE WHEN LOWER(r.status) = 'rejected' THEN 1 ELSE 0 END) as rejected_count"),
                DB::raw('COUNT(*) as total_count'),
            ])
            ->groupBy('z.id', 'z.name', 'u.id', 'u.name', 'ro.display_name', 'ro.name')
            ->orderBy('z.name')
            ->orderBy('u.name')
            ->get();

        $zones = Zone::active()
            ->when($zoneFilterId, fn ($q) => $q->where('id', $zoneFilterId))
            ->orderBy('name')
            ->get(['id', 'name']);

        $zoneReports = $zones->map(function (Zone $zone) use ($rows) {
            $zoneRows = $rows->where('zone_id', $zone->id);

            $users = $zoneRows->map(function ($row) {
                return [
                    'user_id' => (int) $row->user_id,
                    'user_name' => $row->user_name,
                    'role_name' => $row->role_name,
                    'pending' => (int) $row->pending_count,
                    'approved' => (int) $row->approved_count,
                    'forwarded' => (int) $row->forwarded_count,
                    'rejected' => (int) $row->rejected_count,
                    'total' => (int) $row->total_count,
                ];
            })->values()->all();

            return [
                'zone_id' => $zone->id,
                'zone_name' => $zone->name,
                'pending' => (int) $zoneRows->sum('pending_count'),
                'approved' => (int) $zoneRows->sum('approved_count'),
                'forwarded' => (int) $zoneRows->sum('forwarded_count'),
                'rejected' => (int) $zoneRows->sum('rejected_count'),
                'total' => (int) $zoneRows->sum('total_count'),
                'users' => $users,
            ];
        })->values()->all();

        $grandTotals = [
            'pending' => (int) collect($zoneReports)->sum('pending'),
            'approved' => (int) collect($zoneReports)->sum('approved'),
            'forwarded' => (int) collect($zoneReports)->sum('forwarded'),
            'rejected' => (int) collect($zoneReports)->sum('rejected'),
            'total' => (int) collect($zoneReports)->sum('total'),
        ];

        return Inertia::render('HeadOffice/TeamBasedApprovalReport', [
            'zoneReports' => $zoneReports,
            'grandTotals' => $grandTotals,
            'filters' => $request->only(['zone_id', 'date_from', 'date_to']),
            'zones' => $zones,
        ]);
    }
}

