<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Role;
use App\Models\TeamBasedApproval;
use App\Models\TeamBasedApprovalItem;
use App\Models\TeamBasedApprovalReview;
use App\Models\User;
use App\Services\BlockListService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class TeamBasedApprovalController extends Controller
{
    /**
     * Show Team Based approval entry form for branch user.
     */
    public function create(Request $request)
    {
        $user = $request->user();
        $branch = $user->branch;

        if (! $branch) {
            abort(403, 'এই ফর্ম শুধু শাখা ব্যবহারকারীদের (branch_manager/branch_user/field_officer) জন্য।');
        }

        $branch->load(['area.zone']);

        // Area & Zone managers who can access this branch
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

        // Single approver list (১ জন নির্বাচন করবে) - area/zone + ADMF/DMF/ED
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

        return Inertia::render('TeamBased/ApprovalForm', [
            'branch' => [
                'id' => $branch->id,
                'name' => $branch->name,
                'code' => $branch->code,
                'area_name' => $branch->area?->name,
                'zone_name' => $branch->area?->zone?->name,
            ],
            'approverOptions' => $approverOptions->values(),
            'today' => now()->toDateString(),
        ]);
    }

    /**
     * Save Team Based sheet as draft (branch can submit later).
     */
    public function saveDraft(Request $request)
    {
        $user = $request->user();
        $branch = $user->branch;

        if (! $branch) {
            abort(403, 'এই ফর্ম শুধু শাখা ব্যবহারকারীদের (branch_manager/branch_user/field_officer) জন্য।');
        }

        $validated = $request->validate([
            'sheet_date' => ['required', 'date'],
            'approver_user_id' => ['required', 'exists:users,id'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.member_name' => ['required', 'string', 'max:255'],
            'items.*.member_code' => ['nullable', 'string', 'max:50'],
            'items.*.member_phone' => ['nullable', 'string', 'max:20'],
            'items.*.samity_number' => ['nullable', 'string', 'max:50'],
            'items.*.savings_general' => ['nullable', 'numeric', 'min:0'],
            'items.*.savings_other' => ['nullable', 'numeric', 'min:0'],
            'items.*.savings_total' => ['nullable', 'numeric', 'min:0'],
            'items.*.repaid_loan_amount' => ['nullable', 'string', 'max:50'],
            'items.*.repaid_installment_no' => ['nullable', 'string', 'max:50'],
            'items.*.other_institution_loan_amount' => ['nullable', 'string', 'max:500'],
            'items.*.proposed_loan_amount' => ['nullable', 'string', 'max:50'],
            'items.*.loan_term_years' => ['nullable', 'numeric', 'in:0.5,1,1.5,2,3'],
            'items.*.loan_type' => ['nullable', 'string', 'max:100'],
            'items.*.project_name' => ['nullable', 'string', 'max:255'],
        ], [
            'items.required' => 'কমপক্ষে ১ জন সদস্যের তথ্য দিতে হবে।',
            'items.*.member_name.required' => 'সদস্যের নাম ফাঁকা রাখা যাবে না।',
        ]);

        DB::transaction(function () use ($validated, $branch, $user) {
            // Determine selected approver role (Area/Zone/ADMF/DMF/ED) - only ONE approver
            $approver = User::with('role')->findOrFail($validated['approver_user_id']);

            $areaManagerId = null;
            $zoneManagerId = null;
            $admfId = null;
            $dmfId = null;
            $edId = null;

            switch ($approver->role?->name) {
                case Role::AREA_MANAGER:
                    $areaManagerId = $approver->id;
                    break;
                case Role::ZONE_MANAGER:
                    $zoneManagerId = $approver->id;
                    break;
                case Role::ADMF:
                    $admfId = $approver->id;
                    break;
                case Role::DMF:
                    $dmfId = $approver->id;
                    break;
                case Role::ED:
                    $edId = $approver->id;
                    break;
            }

            $approval = TeamBasedApproval::create([
                'branch_id' => $branch->id,
                'created_by' => $user->id,
                'sheet_date' => $validated['sheet_date'],
                'area_manager_id' => $areaManagerId,
                'zone_manager_id' => $zoneManagerId,
                'admf_id' => $admfId,
                'dmf_id' => $dmfId,
                'ed_id' => $edId,
                'status' => 'draft',
            ]);

            $items = [];
            foreach ($validated['items'] as $index => $item) {
                $items[] = new TeamBasedApprovalItem(array_merge($item, [
                    'serial_no' => $index + 1,
                ]));
            }

            $approval->items()->saveMany($items);
            // Keep a snapshot for future change-highlighting
            $approval->update([
                'last_items_snapshot' => $validated['items'],
            ]);
        });

        return redirect()
            ->back()
            ->with('success', 'টিম ভিত্তিক ঋণ তালিকা ড্রাফট হিসেবে সংরক্ষিত হয়েছে।');
    }

    /**
     * List ALL non-draft Team Based approvals for current branch (All Applications).
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $branch = $user->branch;
        if (! $branch) {
            abort(403, 'এই তালিকা শুধুমাত্র শাখা ব্যবহারকারীদের জন্য।');
        }

        $dateFrom = $request->input('date_from', now()->toDateString());
        $dateTo = $request->input('date_to', now()->toDateString());
        $approverId = $request->input('approver_id');
        $status = $request->input('status');
        $status = $status ? strtolower(trim((string) $status)) : '';
        $perPage = (int) $request->input('per_page', 100);

        // Base query on items
        $query = TeamBasedApprovalItem::query()
            ->with([
                'approval.branch',
                'approval.creator',
                'approval.areaManager',
                'approval.zoneManager',
                'approval.admf',
                'approval.dmf',
                'approval.ed',
                'approval.reviews.user.role',
            ])
            ->whereHas('approval', function ($q) use ($branch) {
                $q->where('branch_id', $branch->id)
                    ->where('status', '!=', 'draft');
            });

        // Date range filter on sheet_date
        if ($dateFrom && $dateTo) {
            $query->whereHas('approval', function ($q) use ($dateFrom, $dateTo) {
                $q->whereBetween('sheet_date', [$dateFrom, $dateTo]);
            });
        }

        // Approver filter
        if ($approverId) {
            $query->whereHas('approval', function ($q) use ($approverId) {
                $q->where(function ($inner) use ($approverId) {
                    $inner->where('area_manager_id', $approverId)
                        ->orWhere('zone_manager_id', $approverId)
                        ->orWhere('admf_id', $approverId)
                        ->orWhere('dmf_id', $approverId)
                        ->orWhere('ed_id', $approverId);
                });
            });
        }

        // Status filter
        if ($status) {
            $query->where(function ($q) use ($status) {
                $q->whereHas('approval.reviews', function ($sub) use ($status) {
                    $sub->whereColumn('team_based_approval_item_id', 'team_based_approval_items.id');
                    if ($status === 'under_review') {
                        $sub->whereIn('status', ['under_review', 'forwarded']);
                    } else {
                        $sub->where('status', $status);
                    }
                    $sub->whereRaw('id = (SELECT MAX(id) FROM team_based_approval_reviews WHERE team_based_approval_item_id = team_based_approval_items.id)');
                })
                    ->orWhere(function ($sub) use ($status) {
                        $sub->whereNotExists(function ($sub2) {
                            $sub2->select(DB::raw(1))
                                ->from('team_based_approval_reviews')
                                ->whereColumn('team_based_approval_item_id', 'team_based_approval_items.id');
                        })
                            ->whereHas('approval', function ($sub3) use ($status) {
                                if ($status === 'under_review') {
                                    $sub3->whereIn('status', ['under_review', 'forwarded']);
                                } else {
                                    $sub3->where('status', $status);
                                }
                            });
                    });
            });
        }

        $approvals = $query
            ->orderBy('id', 'desc')
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (TeamBasedApprovalItem $item) => $this->formatBranchIndexItem($item));

        // Draft count for badge on All Applications page based on items
        $draftCount = TeamBasedApprovalItem::whereHas('approval', function ($q) use ($branch) {
            $q->where('branch_id', $branch->id)->where('status', 'draft');
        })->count();

        // Build approver filter options (same logic as create)
        $branch->loadMissing(['area.zone']);

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
                ];
            })
        );
        $approverOptions = $approverOptions->merge(
            $admfDmfEd->map(function (User $u) {
                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'role_name' => $u->role->display_name ?? $u->role->name,
                ];
            })
        );

        return Inertia::render('TeamBased/ApprovalIndex', [
            'approvals' => $approvals,
            'filters' => [
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'approver_id' => $approverId,
                'status' => $status,
            ],
            'draftCount' => $draftCount,
            'approverOptions' => $approverOptions->values(),
            'branch' => [
                'name' => $branch->name,
                'code' => $branch->code,
                'area_name' => $branch->area?->name,
                'zone_name' => $branch->area?->zone?->name,
            ],
        ]);
    }

    /**
     * Approver side index: list sheets assigned to logged-in approver.
     */
    public function approverIndex(Request $request)
    {
        $user = $request->user();
        $roleName = $user->role?->name;

        // Only Area/Zone/ADMF/DMF/ED can use this page
        if (! in_array($roleName, [
            Role::AREA_MANAGER,
            Role::ZONE_MANAGER,
            Role::ADMF,
            Role::DMF,
            Role::ED,
        ], true)) {
            abort(403, 'আপনার জন্য এই অনুমোদন তালিকা প্রযোজ্য নয়।');
        }

        $status = $request->input('status');
        $branchId = $request->input('branch_id');
        $areaId = $request->input('area_id');
        $zoneId = $request->input('zone_id');
        $approverId = $request->input('approver_id');
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');
        $approvalFlow = $request->input('approval_flow');
        $approvalFlow = in_array($approvalFlow, ['single', 'multiple'], true) ? $approvalFlow : null;
        $perPage = (int) $request->input('per_page', 20);
        $perPage = in_array($perPage, [10, 20, 50, 100], true) ? $perPage : 20;

        // Reviews may be:
        // - new style: per-loan (team_based_approval_item_id set)
        // - old style: per-sheet (no item id) – still need to show them
        // For RM (area manager): only own reviews.
        // For ZM: own reviews + RM reviews under accessible branches.
        // For ADMF/DMF/ED: own reviews + RM reviews + ZM reviews under accessible branches (so ADMF sees ZM's too).
        // For ZM and up: also ADMF/DMF/ED-assigned reviews on those branches so the Approver filter matches
        // rows for financial approvers (dropdown lists them via getApproversSelectableByBranch).
        $reviewsQuery = TeamBasedApprovalReview::with(['approval.branch', 'approval.items', 'approval.reviews.user.role', 'item', 'user.role']);

        if ($roleName === Role::AREA_MANAGER) {
            $reviewsQuery->where('user_id', $user->id);
        } else {
            $accessibleBranchIds = $user->getAccessibleBranches()->pluck('id');

            $reviewsQuery->where(function ($q) use ($user, $accessibleBranchIds, $roleName) {
                $q->where('user_id', $user->id)
                    ->orWhere(function ($sub) use ($accessibleBranchIds) {
                        $sub->whereHas('user.role', function ($rq) {
                            $rq->where('name', Role::AREA_MANAGER);
                        })->whereHas('approval', function ($aq) use ($accessibleBranchIds) {
                            $aq->whereIn('branch_id', $accessibleBranchIds);
                        });
                    });
                // ADMF, DMF, ED: also show Zone Manager reviews under their accessible branches
                if (in_array($roleName, [Role::ADMF, Role::DMF, Role::ED], true)) {
                    $q->orWhere(function ($sub) use ($accessibleBranchIds) {
                        $sub->whereHas('user.role', function ($rq) {
                            $rq->where('name', Role::ZONE_MANAGER);
                        })->whereHas('approval', function ($aq) use ($accessibleBranchIds) {
                            $aq->whereIn('branch_id', $accessibleBranchIds);
                        });
                    });
                }
                // Financial approver (ADMF/DMF/ED) review rows — same branch scope as RM/ZM filters
                $q->orWhere(function ($sub) use ($accessibleBranchIds) {
                    $sub->whereHas('user.role', function ($rq) {
                        $rq->whereIn('name', Role::approverRoleNames());
                    })->whereHas('approval', function ($aq) use ($accessibleBranchIds) {
                        $aq->whereIn('branch_id', $accessibleBranchIds);
                    });
                });
            });
        }

        // Base query for stats (without status filter and without approver filter, unless requested)
        $statsQuery = (clone $reviewsQuery)
            ->when($branchId, function ($q) use ($branchId) {
                $q->whereHas('approval', function ($qa) use ($branchId) {
                    $qa->where('branch_id', $branchId);
                });
            })
            ->when($areaId, function ($q) use ($areaId) {
                $q->whereHas('approval.branch', function ($qa) use ($areaId) {
                    $qa->where('area_id', $areaId);
                });
            })
            ->when($zoneId, function ($q) use ($zoneId) {
                $q->whereHas('approval.branch.area', function ($qa) use ($zoneId) {
                    $qa->where('zone_id', $zoneId);
                });
            })
            ->when($dateFrom && $dateTo, function ($q) use ($dateFrom, $dateTo) {
                $q->whereHas('approval', function ($qa) use ($dateFrom, $dateTo) {
                    $qa->whereBetween('sheet_date', [$dateFrom, $dateTo]);
                });
            })
            ->when($approvalFlow === 'single', function ($q) {
                $q->whereIn('team_based_approval_id', function ($sub) {
                    $sub->select('team_based_approval_id')
                        ->from('team_based_approval_reviews')
                        ->groupBy('team_based_approval_id')
                        ->havingRaw('COUNT(DISTINCT user_id) = 1');
                });
            })
            ->when($approvalFlow === 'multiple', function ($q) {
                $q->whereIn('team_based_approval_id', function ($sub) {
                    $sub->select('team_based_approval_id')
                        ->from('team_based_approval_reviews')
                        ->groupBy('team_based_approval_id')
                        ->havingRaw('COUNT(DISTINCT user_id) >= 2');
                });
            })
            ->when($approverId, function ($q) use ($approverId) {
                $q->where('user_id', $approverId);
            });

        // Calculate stats
        $rawCounts = (clone $statsQuery)
            ->select('status', \DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $stats = [
            'total' => array_sum($rawCounts),
            'pending' => $rawCounts['pending'] ?? 0,
            'approved' => $rawCounts['approved'] ?? 0,
            'rejected' => $rawCounts['rejected'] ?? 0,
            'forwarded' => $rawCounts['forwarded'] ?? 0,
            'waiting' => $rawCounts['waiting'] ?? 0,
        ];

        // List filters without status
        $queryForListFiltersWithoutStatus = (clone $reviewsQuery)
            ->when($branchId, function ($q) use ($branchId) {
                $q->whereHas('approval', function ($qa) use ($branchId) {
                    $qa->where('branch_id', $branchId);
                });
            })
            ->when($areaId, function ($q) use ($areaId) {
                $q->whereHas('approval.branch', function ($qa) use ($areaId) {
                    $qa->where('area_id', $areaId);
                });
            })
            ->when($zoneId, function ($q) use ($zoneId) {
                $q->whereHas('approval.branch.area', function ($qa) use ($zoneId) {
                    $qa->where('zone_id', $zoneId);
                });
            })
            ->when($dateFrom && $dateTo, function ($q) use ($dateFrom, $dateTo) {
                $q->whereHas('approval', function ($qa) use ($dateFrom, $dateTo) {
                    $qa->whereBetween('sheet_date', [$dateFrom, $dateTo]);
                });
            })
            ->when($approvalFlow === 'single', function ($q) {
                $q->whereIn('team_based_approval_id', function ($sub) {
                    $sub->select('team_based_approval_id')
                        ->from('team_based_approval_reviews')
                        ->groupBy('team_based_approval_id')
                        ->havingRaw('COUNT(DISTINCT user_id) = 1');
                });
            })
            ->when($approvalFlow === 'multiple', function ($q) {
                $q->whereIn('team_based_approval_id', function ($sub) {
                    $sub->select('team_based_approval_id')
                        ->from('team_based_approval_reviews')
                        ->groupBy('team_based_approval_id')
                        ->havingRaw('COUNT(DISTINCT user_id) >= 2');
                });
            });

        $queryForListFilters = (clone $queryForListFiltersWithoutStatus)
            ->when($status, function ($q) use ($status) {
                $q->where('status', $status);
            });

        // Base query with filters incl. approver (no ordering/pagination yet)
        $baseQuery = (clone $queryForListFilters)
            ->when($approverId, function ($q) use ($approverId) {
                $q->where('user_id', $approverId);
            });

        // Paginated reviews list for table
        $reviews = (clone $baseQuery)
            ->latest()
            ->paginate($perPage)
            ->withQueryString()
            ->through(function (TeamBasedApprovalReview $review) use ($user) {
                $approval = $review->approval;

                // New style: one review per loan item
                if ($review->team_based_approval_item_id && $review->item) {
                    $item = $review->item;
                    $reviewsForItem = $approval->reviews
                        ->where('team_based_approval_item_id', $item->id)
                        ->sortBy('id')
                        ->values();

                    $itemsPayload = [[
                        'id' => $item->id,
                        'serial_no' => $item->serial_no,
                        'member_name' => $item->member_name,
                        'name_bn' => $item->name_bn,
                        'father_name' => $item->father_name,
                        'mother_name' => $item->mother_name,
                        'spouse_name' => $item->spouse_name,
                        'dob' => $item->dob?->toDateString(),
                        'nid_number' => $item->nid_number,
                        'address' => $item->address,
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
                        'approvers' => $reviewsForItem->map(function ($r) {
                            return [
                                'approver_name' => $r->user?->name,
                                'approver_role' => $r->user?->role?->display_name ?? $r->user?->role?->name,
                                'status' => $r->status,
                                'approved_amount' => $r->approved_amount !== null ? (int) round((float) $r->approved_amount) : null,
                                'comments' => $r->comments,
                                'approver_signature' => $this->reviewSignatureForDisplay($r),
                                'decided_at' => $r->decided_at?->toDateString(),
                            ];
                        })->values()->all(),
                    ]];

                    $itemsCount = 1;
                    $proposedTotal = $item->proposed_loan_amount ?? 0;
                } else {
                    // Old style: one review per sheet – show all items under this sheet
                    $reviewsByItem = $approval->reviews->whereNotNull('team_based_approval_item_id')->groupBy('team_based_approval_item_id');
                    $itemsPayload = $approval->items->map(function (TeamBasedApprovalItem $item) use ($reviewsByItem) {
                        $reviewsForItem = $reviewsByItem->get($item->id, collect())->sortBy('id')->values();

                        return [
                            'id' => $item->id,
                            'serial_no' => $item->serial_no,
                            'member_name' => $item->member_name,
                            'name_bn' => $item->name_bn,
                            'father_name' => $item->father_name,
                            'mother_name' => $item->mother_name,
                            'spouse_name' => $item->spouse_name,
                            'dob' => $item->dob?->toDateString(),
                            'nid_number' => $item->nid_number,
                            'address' => $item->address,
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
                            'approvers' => $reviewsForItem->map(function ($r) {
                                return [
                                    'approver_name' => $r->user?->name,
                                    'approver_role' => $r->user?->role?->display_name ?? $r->user?->role?->name,
                                    'status' => $r->status,
                                    'approved_amount' => $r->approved_amount !== null ? (int) round((float) $r->approved_amount) : null,
                                    'comments' => $r->comments,
                                    'approver_signature' => $this->reviewSignatureForDisplay($r),
                                    'decided_at' => $r->decided_at?->toDateString(),
                                ];
                            })->values()->all(),
                        ];
                    })->values();

                    $itemsCount = $approval->items->count();
                    $proposedTotal = $approval->items->sum('proposed_loan_amount');
                }

                return [
                    'review_id' => $review->id,
                    'status' => $review->status,
                    'comments' => $review->comments,
                    'approver_signature' => $this->reviewSignatureForDisplay($review),
                    'decided_at' => $review->decided_at?->toDateTimeString(),
                    'can_act' => $review->user_id === $user->id,
                    'approver_name' => $review->user?->name,
                    'approver_role' => $review->user?->role?->display_name ?? $review->user?->role?->name,
                    'sheet' => [
                        'id' => $approval->id,
                        'sheet_date' => optional($approval->sheet_date)->toDateString(),
                        'status' => $approval->status,
                        'branch_name' => $approval->branch?->name,
                        'branch_code' => $approval->branch?->code,
                        'area_name' => $approval->branch?->area?->name,
                        'zone_name' => $approval->branch?->area?->zone?->name,
                        'items_count' => $itemsCount,
                        'proposed_total' => $proposedTotal,
                        'items' => $itemsPayload,
                    ],
                ];
            });

        // Branch list for this approver: all branches this user can access (for filtering)
        $branches = Branch::query()
            ->whereIn('id', $user->getAccessibleBranches()->pluck('id'))
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'code',
            ]);

        // Approver list for filter: (1) all approvers who can access any of current user's branches
        // (2) + everyone who has a review in the visible set (RM, ZM, ADMF etc.) so "who approved" filter is complete
        $accessibleBranches = $user->getAccessibleBranches();
        $approverUserIds = collect();
        foreach ($accessibleBranches as $branch) {
            $approverUserIds = $approverUserIds->merge(
                User::getApproversSelectableByBranch($branch->id)->pluck('id')
            );
        }
        // Add distinct user_ids from visible reviews under current non-approver filters (not $baseQuery,
        // which includes approver_id and would drop RM/ZM from the dropdown when a DMF/ADMF is selected).
        $approverUserIds = $approverUserIds->merge(
            (clone $queryForListFilters)->select('user_id')->distinct()->pluck('user_id')
        );
        $approverUserIds = $approverUserIds->filter()->unique()->values();

        // Hierarchy order: ED (top) → DMF → ADMF → ZM → Area Manager (bottom); same role sorted by name
        $approverRoleOrder = [Role::ED, Role::DMF, Role::ADMF, Role::ZONE_MANAGER, Role::AREA_MANAGER];
        $approverOptions = User::query()
            ->with('role')
            ->whereIn('id', $approverUserIds)
            ->get()
            ->sortBy(function (User $u) use ($approverRoleOrder) {
                $roleName = $u->role?->name ?? '';
                $rank = array_search($roleName, $approverRoleOrder, true);

                return ($rank !== false ? $rank : 99).'_'.$u->name;
            })
            ->values()
            ->map(function (User $u) {
                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'role_name' => $u->role->display_name ?? $u->role->name,
                ];
            })
            ->values();

        // Users who can receive forwards (ZM, ADMF, DMF, ED) and can access current user's branches
        $accessibleBranchIds = $user->getAccessibleBranches()->pluck('id');
        $forwardToOptions = User::query()
            ->with('role')
            ->active()
            ->whereHas('role', function ($q) {
                $q->whereIn('name', [Role::ZONE_MANAGER, Role::ADMF, Role::DMF, Role::ED]);
            })
            ->where('id', '!=', $user->id)
            ->orderBy('name')
            ->get()
            ->filter(function (User $u) use ($accessibleBranchIds) {
                $theirBranchIds = $u->getAccessibleBranches()->pluck('id');

                return $theirBranchIds->intersect($accessibleBranchIds)->isNotEmpty();
            })
            ->map(function (User $u) {
                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'role_name' => $u->role->display_name ?? $u->role->name,
                ];
            })
            ->values();

        return Inertia::render('TeamBased/ApprovalApproverIndex', [
            'reviews' => $reviews,
            'filters' => [
                'status' => $status,
                'branch_id' => $branchId,
                'approver_id' => $approverId,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'approval_flow' => $approvalFlow,
                'per_page' => $perPage,
            ],
            'branches' => $branches,
            'approverOptions' => $approverOptions,
            'forwardToOptions' => $forwardToOptions,
            'stats' => $stats,
        ]);
    }

    /**
     * Export all branch items matching current filters (no pagination).
     */
    public function exportItems(Request $request)
    {
        $user = $request->user();
        $branch = $user->branch;
        if (! $branch) {
            abort(403, 'এই তালিকা শুধুমাত্র শাখা ব্যবহারকারীদের জন্য।');
        }

        $dateFrom = $request->input('date_from', now()->toDateString());
        $dateTo = $request->input('date_to', now()->toDateString());
        $approverId = $request->input('approver_id');
        $status = $request->input('status');
        $status = $status ? strtolower(trim((string) $status)) : '';

        $query = TeamBasedApprovalItem::query()
            ->with([
                'approval.branch',
                'approval.creator',
                'approval.areaManager',
                'approval.zoneManager',
                'approval.admf',
                'approval.dmf',
                'approval.ed',
                'approval.reviews.user.role',
            ])
            ->whereHas('approval', function ($q) use ($branch) {
                $q->where('branch_id', $branch->id)
                    ->where('status', '!=', 'draft');
            });

        if ($dateFrom && $dateTo) {
            $query->whereHas('approval', function ($q) use ($dateFrom, $dateTo) {
                $q->whereBetween('sheet_date', [$dateFrom, $dateTo]);
            });
        }

        if ($approverId) {
            $query->whereHas('approval', function ($q) use ($approverId) {
                $q->where(function ($inner) use ($approverId) {
                    $inner->where('area_manager_id', $approverId)
                        ->orWhere('zone_manager_id', $approverId)
                        ->orWhere('admf_id', $approverId)
                        ->orWhere('dmf_id', $approverId)
                        ->orWhere('ed_id', $approverId);
                });
            });
        }

        if ($status) {
            $query->where(function ($q) use ($status) {
                $q->whereHas('approval.reviews', function ($sub) use ($status) {
                    $sub->whereColumn('team_based_approval_item_id', 'team_based_approval_items.id');
                    if ($status === 'under_review') {
                        $sub->whereIn('status', ['under_review', 'forwarded']);
                    } else {
                        $sub->where('status', $status);
                    }
                    $sub->whereRaw('id = (SELECT MAX(id) FROM team_based_approval_reviews WHERE team_based_approval_item_id = team_based_approval_items.id)');
                })
                    ->orWhere(function ($sub) use ($status) {
                        $sub->whereNotExists(function ($sub2) {
                            $sub2->select(DB::raw(1))
                                ->from('team_based_approval_reviews')
                                ->whereColumn('team_based_approval_item_id', 'team_based_approval_items.id');
                        })
                            ->whereHas('approval', function ($sub3) use ($status) {
                                if ($status === 'under_review') {
                                    $sub3->whereIn('status', ['under_review', 'forwarded']);
                                } else {
                                    $sub3->where('status', $status);
                                }
                            });
                    });
            });
        }

        $rows = $query
            ->orderBy('id', 'desc')
            ->get()
            ->map(fn (TeamBasedApprovalItem $item) => $this->formatBranchIndexItem($item))
            ->values();

        return response()->json([
            'rows' => $rows,
            'total' => $rows->count(),
        ]);
    }

    /**
     * Export all approver-visible item rows matching current filters (no pagination).
     */
    public function exportApproverItems(Request $request)
    {
        $user = $request->user();
        $roleName = $user->role?->name;

        if (! in_array($roleName, [
            Role::AREA_MANAGER,
            Role::ZONE_MANAGER,
            Role::ADMF,
            Role::DMF,
            Role::ED,
        ], true)) {
            abort(403, 'আপনার জন্য এই অনুমোদন তালিকা প্রযোজ্য নয়।');
        }

        $status = $request->input('status');
        $branchId = $request->input('branch_id');
        $areaId = $request->input('area_id');
        $zoneId = $request->input('zone_id');
        $approverId = $request->input('approver_id');
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');
        $approvalFlow = $request->input('approval_flow');
        $approvalFlow = in_array($approvalFlow, ['single', 'multiple'], true) ? $approvalFlow : null;

        $reviewsQuery = TeamBasedApprovalReview::with(['approval.branch.area.zone', 'approval.items', 'approval.reviews.user.role', 'item', 'user.role']);

        if ($roleName === Role::AREA_MANAGER) {
            $reviewsQuery->where('user_id', $user->id);
        } else {
            $accessibleBranchIds = $user->getAccessibleBranches()->pluck('id');

            $reviewsQuery->where(function ($q) use ($user, $accessibleBranchIds, $roleName) {
                $q->where('user_id', $user->id)
                    ->orWhere(function ($sub) use ($accessibleBranchIds) {
                        $sub->whereHas('user.role', function ($rq) {
                            $rq->where('name', Role::AREA_MANAGER);
                        })->whereHas('approval', function ($aq) use ($accessibleBranchIds) {
                            $aq->whereIn('branch_id', $accessibleBranchIds);
                        });
                    });
                if (in_array($roleName, [Role::ADMF, Role::DMF, Role::ED], true)) {
                    $q->orWhere(function ($sub) use ($accessibleBranchIds) {
                        $sub->whereHas('user.role', function ($rq) {
                            $rq->where('name', Role::ZONE_MANAGER);
                        })->whereHas('approval', function ($aq) use ($accessibleBranchIds) {
                            $aq->whereIn('branch_id', $accessibleBranchIds);
                        });
                    });
                }
                $q->orWhere(function ($sub) use ($accessibleBranchIds) {
                    $sub->whereHas('user.role', function ($rq) {
                        $rq->whereIn('name', Role::approverRoleNames());
                    })->whereHas('approval', function ($aq) use ($accessibleBranchIds) {
                        $aq->whereIn('branch_id', $accessibleBranchIds);
                    });
                });
            });
        }

        $baseQuery = (clone $reviewsQuery)
            ->when($branchId, function ($q) use ($branchId) {
                $q->whereHas('approval', function ($qa) use ($branchId) {
                    $qa->where('branch_id', $branchId);
                });
            })
            ->when($areaId, function ($q) use ($areaId) {
                $q->whereHas('approval.branch', function ($qa) use ($areaId) {
                    $qa->where('area_id', $areaId);
                });
            })
            ->when($zoneId, function ($q) use ($zoneId) {
                $q->whereHas('approval.branch.area', function ($qa) use ($zoneId) {
                    $qa->where('zone_id', $zoneId);
                });
            })
            ->when($dateFrom && $dateTo, function ($q) use ($dateFrom, $dateTo) {
                $q->whereHas('approval', function ($qa) use ($dateFrom, $dateTo) {
                    $qa->whereBetween('sheet_date', [$dateFrom, $dateTo]);
                });
            })
            ->when($approvalFlow === 'single', function ($q) {
                $q->whereIn('team_based_approval_id', function ($sub) {
                    $sub->select('team_based_approval_id')
                        ->from('team_based_approval_reviews')
                        ->groupBy('team_based_approval_id')
                        ->havingRaw('COUNT(DISTINCT user_id) = 1');
                });
            })
            ->when($approvalFlow === 'multiple', function ($q) {
                $q->whereIn('team_based_approval_id', function ($sub) {
                    $sub->select('team_based_approval_id')
                        ->from('team_based_approval_reviews')
                        ->groupBy('team_based_approval_id')
                        ->havingRaw('COUNT(DISTINCT user_id) >= 2');
                });
            })
            ->when($status, function ($q) use ($status) {
                $q->where('status', $status);
            })
            ->when($approverId, function ($q) use ($approverId) {
                $q->where('user_id', $approverId);
            });

        $reviews = $baseQuery->latest()->get();
        $rows = collect();

        foreach ($reviews as $review) {
            $rows = $rows->merge($this->flattenApproverReviewToExportRows($review, $user));
        }

        return response()->json([
            'rows' => $rows->values(),
            'total' => $rows->count(),
        ]);
    }

    /**
     * Live-check logged-in approver username against block_list (and optional branch).
     */
    public function verifyBlockList(Request $request, BlockListService $blockListService)
    {
        $branchCode = $request->query('branch_code');

        return response()->json(
            $blockListService->verifyApprover(
                $request->user(),
                is_string($branchCode) ? $branchCode : null,
            )
        );
    }

    /**
     * Approver decision: approve or reject with comments & optional approved amount.
     */
    public function decide(Request $request, TeamBasedApprovalReview $review, BlockListService $blockListService)
    {
        $user = $request->user();

        if ($review->user_id !== $user->id) {
            abort(403, 'আপনি এই আবেদনটির অনুমোদনকারী নন।');
        }

        if ($review->status !== 'pending' && $review->status !== 'waiting') {
            return redirect()
                ->back()
                ->with('error', 'এই আবেদনের সিদ্ধান্ত ইতিমধ্যে নেওয়া হয়েছে।');
        }

        $rules = [
            'decision' => ['required', 'in:approved,rejected,waiting'],
            'comments' => ['required', 'string', 'max:1000'],
            'approved_amount' => ['required_if:decision,approved', 'numeric', 'min:0'],
            'push_to_block_list' => ['sometimes', 'boolean'],
        ];

        $pushToBlockList = $request->boolean('push_to_block_list', true);

        if ($request->input('decision') === 'rejected' && $pushToBlockList) {
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

        $data = $request->validate($rules, [
            'block_list.nid_number.required' => 'Block list-এ যোগ করতে NID নম্বর প্রয়োজন।',
            'block_list.phone_number.required' => 'Block list-এ যোগ করতে ফোন নম্বর প্রয়োজন।',
            'block_list.phone_number.regex' => 'ফোন নম্বর ১০–১৪ অঙ্কের হতে হবে।',
            'comments.required' => 'মন্তব্য লিখতে হবে।',
        ]);
        if (isset($data['approved_amount'])) {
            $data['approved_amount'] = (int) round((float) $data['approved_amount']);
        }

        $approval = $review->approval()->with('branch')->first();
        $item = $review->item;

        if ($data['decision'] === 'rejected' && $pushToBlockList) {
            if (! $item) {
                return redirect()
                    ->back()
                    ->with('error', 'এই রিভিউয়ের সাথে কোনো সদস্যের সারি যুক্ত নেই।');
            }

            if (! $approval?->branch) {
                return redirect()
                    ->back()
                    ->with('error', 'শাখার তথ্য পাওয়া যায়নি।');
            }
        }

        // Both systems must update together, or neither. The block_list push runs
        // inside the DB transaction, so if it fails the local rejection is rolled
        // back (and vice versa). The block_list API is idempotent, so a retry after
        // a partial failure succeeds even if the entry already exists there.
        try {
            DB::transaction(function () use ($data, $review, $approval, $item, $user, $pushToBlockList, $blockListService) {
                $now = now();

                if ($data['decision'] === 'rejected') {
                    if ($pushToBlockList && isset($data['block_list'])) {
                        $blockListData = $data['block_list'];

                        $item?->update([
                            'name_bn' => $blockListData['name_bn'] ?? null,
                            'father_name' => $blockListData['father_name'] ?? null,
                            'mother_name' => $blockListData['mother_name'] ?? null,
                            'spouse_name' => $blockListData['spouse_name'] ?? null,
                            'dob' => $blockListData['dob'] ?? null,
                            'nid_number' => $blockListData['nid_number'],
                            'address' => $blockListData['address'] ?? null,
                            'member_phone' => $blockListData['phone_number'],
                        ]);
                    }

                    $review->update([
                        'status' => 'rejected',
                        'comments' => $data['comments'] ?? null,
                        'approved_amount' => null,
                        'approver_signature' => $user->signature,
                        'decided_at' => $now,
                    ]);

                    if ($pushToBlockList && isset($data['block_list']) && $item && $approval?->branch) {
                        $blockListService->pushRejectedMember(
                            $user,
                            $item,
                            $approval->branch,
                            $data['block_list'],
                            (string) ($data['comments'] ?? ''),
                        );
                    }
                } elseif ($data['decision'] === 'waiting') {
                $review->update([
                    'status' => 'waiting',
                    'comments' => $data['comments'] ?? null,
                    'approved_amount' => null,
                    'approver_signature' => $user->signature,
                    'decided_at' => $now,
                ]);
            } else {
                $approvedAmount = $data['approved_amount'];

                $review->update([
                    'status' => 'approved',
                    'comments' => $data['comments'] ?? null,
                    'approved_amount' => $approvedAmount,
                    'approver_signature' => $user->signature,
                    'decided_at' => $now,
                ]);

                if ($item) {
                    // If this item was previously approved+forwarded, mark earlier forwarded review(s) as approved
                    TeamBasedApprovalReview::query()
                        ->where('team_based_approval_id', $approval->id)
                        ->where('team_based_approval_item_id', $item->id)
                        ->where('status', 'forwarded')
                        ->where('id', '!=', $review->id)
                        ->update([
                            'status' => 'approved',
                        ]);

                    // Store approved amount per loan row
                    $item->update([
                        'approved_amount' => $approvedAmount,
                    ]);
                }
            }
        });
        } catch (\RuntimeException $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }

        return $this->redirectToApproverIndex($request, 'সিদ্ধান্ত সফলভাবে সংরক্ষণ হয়েছে।');
    }

    /**
     * Clear approval/forward history for one or more loan rows and reset to initial pending approver.
     */
    public function clearReviewHistory(Request $request)
    {
        $user = $request->user();
        $isHeadOffice = $user->has_all_access || in_array($user->role?->name, [Role::SUPER_ADMIN, Role::HEAD_OFFICE], true);

        $validated = $request->validate([
            'review_ids' => ['nullable', 'array'],
            'review_ids.*' => ['integer', 'exists:team_based_approval_reviews,id'],
            'item_ids' => ['nullable', 'array'],
            'item_ids.*' => ['integer', 'exists:team_based_approval_items,id'],
        ]);

        $reviewIds = $validated['review_ids'] ?? [];
        $itemIds = collect($validated['item_ids'] ?? []);

        if (! empty($reviewIds)) {
            $itemIds = $itemIds->merge(
                TeamBasedApprovalReview::query()
                    ->whereIn('id', $reviewIds)
                    ->whereNotNull('team_based_approval_item_id')
                    ->pluck('team_based_approval_item_id')
            );
        }

        $itemIds = $itemIds->filter()->unique()->values();

        if ($itemIds->isEmpty()) {
            return redirect()
                ->back()
                ->with('error', 'কোনো সারি নির্বাচন করা হয়নি।');
        }

        $cleared = 0;
        $skipped = 0;

        DB::transaction(function () use ($itemIds, $user, $isHeadOffice, &$cleared, &$skipped) {
            foreach ($itemIds as $itemId) {
                /** @var TeamBasedApprovalItem|null $item */
                $item = TeamBasedApprovalItem::with('approval')->find($itemId);
                if (! $item || ! $this->userCanClearItemReviewHistory($user, $item, $isHeadOffice)) {
                    $skipped++;

                    continue;
                }

                $this->resetItemReviewHistory($item);
                $cleared++;
            }
        });

        if ($cleared === 0) {
            return redirect()
                ->back()
                ->with('error', 'নির্বাচিত সারিগুলোর ইতিহাস মুছতে পারা যায়নি।');
        }

        $message = "{$cleared} টি সারির অনুমোদন/ফরওয়ার্ড ইতিহাস মুছে ফেলা হয়েছে।";
        if ($skipped > 0) {
            $message .= " ({$skipped} টি এড়িয়ে যাওয়া হয়েছে)";
        }

        if ($request->routeIs('head-office.*')) {
            return redirect()->back()->with('success', $message);
        }

        return $this->redirectToApproverIndex($request, $message);
    }

    /**
     * Forward a single loan item to a superior (উর্ধ্বতন). Current user's pending review for that item
     * becomes 'forwarded', and a new pending review is created for the selected user on the same item.
     */
    public function forward(Request $request, TeamBasedApproval $teamBasedApproval)
    {
        $user = $request->user();

        $validated = $request->validate([
            'review_id' => ['required', 'integer'],
            'forward_to_user_id' => ['required', 'integer', 'exists:users,id'],
            'comments' => ['nullable', 'string', 'max:1000'],
            'approved_amount' => ['required', 'numeric', 'min:0'],
        ]);
        $validated['approved_amount'] = (int) round((float) $validated['approved_amount']);

        $forwardTo = User::with('role')->findOrFail($validated['forward_to_user_id']);
        $branchId = $teamBasedApproval->branch_id;

        // Only approvers (RM/ZM/ADMF/DMF/ED) can forward
        if (! in_array($user->role?->name, [Role::AREA_MANAGER, Role::ZONE_MANAGER, Role::ADMF, Role::DMF, Role::ED], true)) {
            abort(403, 'আপনার জন্য এই কার্য প্রযোজ্য নয়।');
        }

        if ($forwardTo->id === $user->id) {
            return redirect()->back()->with('error', 'আপনি নিজের কাছে ফরওয়ার্ড করতে পারবেন না।');
        }

        // Superior must be ZM, ADMF, DMF or ED and must be able to access this branch
        $superiorRoles = [Role::ZONE_MANAGER, Role::ADMF, Role::DMF, Role::ED];
        if (! in_array($forwardTo->role?->name, $superiorRoles, true)) {
            return redirect()->back()->with('error', 'কেবল জোন ম্যানেজার / ADMF / DMF / ED এর কাছে ফরওয়ার্ড করা যাবে।');
        }

        if (! $forwardTo->canAccessBranch($branchId)) {
            return redirect()->back()->with('error', 'নির্বাচিত ব্যবহারকারীর এই শাখায় অ্যাক্সেস নেই।');
        }

        $review = TeamBasedApprovalReview::query()
            ->where('id', $validated['review_id'])
            ->where('team_based_approval_id', $teamBasedApproval->id)
            ->where('user_id', $user->id)
            ->where('status', 'pending')
            ->whereNotNull('team_based_approval_item_id')
            ->first();

        if (! $review) {
            return redirect()->back()->with('error', 'এই লোন সারির জন্য আপনার কোনো পেন্ডিং রিভিউ নেই।');
        }

        DB::transaction(function () use ($teamBasedApproval, $user, $forwardTo, $review, $validated) {
            $now = now();

            $review->update([
                'status' => 'forwarded',
                'comments' => ($review->comments ? $review->comments."\n" : '').'ফরওয়ার্ড: '.($validated['comments'] ?? ''),
                'approved_amount' => $validated['approved_amount'],
                'approver_signature' => $user->signature,
                'decided_at' => $now,
            ]);

            $alreadyPendingForForwardTo = TeamBasedApprovalReview::query()
                ->where('team_based_approval_id', $teamBasedApproval->id)
                ->where('team_based_approval_item_id', $review->team_based_approval_item_id)
                ->where('user_id', $forwardTo->id)
                ->where('status', 'pending')
                ->exists();

            if (! $alreadyPendingForForwardTo) {
                TeamBasedApprovalReview::create([
                    'team_based_approval_id' => $teamBasedApproval->id,
                    'team_based_approval_item_id' => $review->team_based_approval_item_id,
                    'user_id' => $forwardTo->id,
                    'level' => $forwardTo->role?->name,
                    'status' => 'pending',
                ]);
            }
        });

        return $this->redirectToApproverIndex($request, 'লোন সারি সফলভাবে '.$forwardTo->name.' এর কাছে ফরওয়ার্ড হয়েছে।');
    }

    /**
     * Approver side: update a single loan row before/after decision.
     */
    public function updateItem(Request $request, TeamBasedApprovalReview $review)
    {
        $user = $request->user();

        if ($review->user_id !== $user->id) {
            abort(403, 'আপনি এই আবেদনটির অনুমোদনকারী নন।');
        }

        if (! $review->team_based_approval_item_id || ! $review->item) {
            abort(404, 'এই রিভিউটির সাথে কোন লোন সারি যুক্ত নেই।');
        }

        $item = $review->item;

        $data = $request->validate([
            'member_name' => ['required', 'string', 'max:255'],
            'member_code' => ['nullable', 'string', 'max:50'],
            'member_phone' => ['nullable', 'string', 'max:20'],
            'samity_number' => ['nullable', 'string', 'max:50'],
            'savings_general' => ['nullable', 'numeric', 'min:0'],
            'savings_other' => ['nullable', 'numeric', 'min:0'],
            'savings_total' => ['nullable', 'numeric', 'min:0'],
            'repaid_loan_amount' => ['nullable', 'string', 'max:50'],
            'repaid_installment_no' => ['nullable', 'string', 'max:50'],
            'other_institution_loan_amount' => ['nullable', 'string', 'max:500'],
            'proposed_loan_amount' => ['nullable', 'string', 'max:50'],
            'loan_term_years' => ['nullable', 'numeric', 'in:0.5,1,1.5,2,3'],
            'loan_type' => ['nullable', 'string', 'max:100'],
            'project_name' => ['nullable', 'string', 'max:255'],
        ]);

        $item->update($this->roundItemNumbers($data));

        return $this->redirectToApproverIndex($request, 'সারি তথ্য সফলভাবে হালনাগাদ হয়েছে।');
    }

    /**
     * List only drafts for current branch (Draft List page).
     */
    public function drafts(Request $request)
    {
        $user = $request->user();
        $branch = $user->branch;
        if (! $branch) {
            abort(403, 'Draft list শুধুমাত্র শাখা ব্যবহারকারীরা দেখতে পারবেন।');
        }

        // Default: show all drafts. Apply date filter only when user selects dates.
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        $approvals = TeamBasedApproval::with(['branch', 'creator', 'areaManager', 'zoneManager', 'admf', 'dmf', 'ed'])
            ->where('branch_id', $branch->id)
            ->where('status', 'draft')
            ->when($dateFrom || $dateTo, function ($q) use ($dateFrom, $dateTo) {
                $from = $dateFrom ?: $dateTo;
                $to = $dateTo ?: $dateFrom;
                $q->whereBetween('sheet_date', [$from, $to]);
            })
            ->latest()
            ->paginate(20)
            ->through(function (TeamBasedApproval $approval) {
                $approverUser = $approval->areaManager
                    ?? $approval->zoneManager
                    ?? $approval->admf
                    ?? $approval->dmf
                    ?? $approval->ed;

                return [
                    'id' => $approval->id,
                    'sheet_date' => optional($approval->sheet_date)->toDateString(),
                    'status' => $approval->status,
                    'created_at' => $approval->created_at?->toDateTimeString(),
                    'approver_name' => $approverUser?->name,
                ];
            });

        return Inertia::render('TeamBased/ApprovalDraftIndex', [
            'approvals' => $approvals,
            'filters' => [
                'date_from' => $dateFrom ?? '',
                'date_to' => $dateTo ?? '',
            ],
        ]);
    }

    /**
     * Edit a draft sheet.
     */
    public function edit(Request $request, TeamBasedApproval $teamBasedApproval)
    {
        $user = $request->user();
        if ($teamBasedApproval->branch_id !== $user->branch_id || $teamBasedApproval->status !== 'draft') {
            abort(403);
        }

        $branch = $user->branch;
        $branch->load(['area.zone']);

        // Reuse approver list
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

        // Determine selected approver user id
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

        return Inertia::render('TeamBased/ApprovalForm', [
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
     * Update a draft sheet.
     */
    public function updateDraft(Request $request, TeamBasedApproval $teamBasedApproval)
    {
        $user = $request->user();
        if ($teamBasedApproval->branch_id !== $user->branch_id || $teamBasedApproval->status !== 'draft') {
            abort(403);
        }

        $validated = $request->validate([
            'sheet_date' => ['required', 'date'],
            'approver_user_id' => ['required', 'exists:users,id'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.member_name' => ['required', 'string', 'max:255'],
            'items.*.member_code' => ['nullable', 'string', 'max:50'],
            'items.*.member_phone' => ['nullable', 'string', 'max:20'],
            'items.*.samity_number' => ['nullable', 'string', 'max:50'],
            'items.*.savings_general' => ['nullable', 'numeric', 'min:0'],
            'items.*.savings_other' => ['nullable', 'numeric', 'min:0'],
            'items.*.savings_total' => ['nullable', 'numeric', 'min:0'],
            'items.*.repaid_loan_amount' => ['nullable', 'string', 'max:50'],
            'items.*.repaid_installment_no' => ['nullable', 'string', 'max:50'],
            'items.*.other_institution_loan_amount' => ['nullable', 'string', 'max:500'],
            'items.*.proposed_loan_amount' => ['nullable', 'string', 'max:50'],
            'items.*.loan_term_years' => ['nullable', 'numeric', 'in:0.5,1,1.5,2,3'],
            'items.*.loan_type' => ['nullable', 'string', 'max:100'],
            'items.*.project_name' => ['nullable', 'string', 'max:255'],
        ]);

        DB::transaction(function () use ($validated, $teamBasedApproval) {
            $approver = User::with('role')->findOrFail($validated['approver_user_id']);

            $areaManagerId = null;
            $zoneManagerId = null;
            $admfId = null;
            $dmfId = null;
            $edId = null;

            switch ($approver->role?->name) {
                case Role::AREA_MANAGER:
                    $areaManagerId = $approver->id;
                    break;
                case Role::ZONE_MANAGER:
                    $zoneManagerId = $approver->id;
                    break;
                case Role::ADMF:
                    $admfId = $approver->id;
                    break;
                case Role::DMF:
                    $dmfId = $approver->id;
                    break;
                case Role::ED:
                    $edId = $approver->id;
                    break;
            }

            $teamBasedApproval->update([
                'sheet_date' => $validated['sheet_date'],
                'area_manager_id' => $areaManagerId,
                'zone_manager_id' => $zoneManagerId,
                'admf_id' => $admfId,
                'dmf_id' => $dmfId,
                'ed_id' => $edId,
            ]);

            // Replace items
            $teamBasedApproval->items()->delete();

            $items = [];
            foreach ($validated['items'] as $index => $item) {
                $items[] = new TeamBasedApprovalItem(array_merge($this->roundItemNumbers($item), [
                    'serial_no' => $index + 1,
                ]));
            }

            $teamBasedApproval->items()->saveMany($items);

            $teamBasedApproval->update([
                'last_items_snapshot' => $validated['items'],
            ]);
        });

        return redirect()
            ->route('team-based-approvals.index', ['view' => 'drafts'])
            ->with('success', 'Draft updated successfully.');
    }

    /**
     * Delete a draft sheet.
     */
    public function destroy(Request $request, TeamBasedApproval $teamBasedApproval)
    {
        $user = $request->user();
        if ($teamBasedApproval->branch_id !== $user->branch_id || $teamBasedApproval->status !== 'draft') {
            abort(403);
        }

        $teamBasedApproval->delete();

        return redirect()
            ->route('team-based-approvals.index', ['view' => 'drafts'])
            ->with('success', 'Draft deleted successfully.');
    }

    /**
     * Submit a draft for approval (status: pending).
     */
    public function submit(Request $request, TeamBasedApproval $teamBasedApproval)
    {
        $user = $request->user();
        if ($teamBasedApproval->branch_id !== $user->branch_id || $teamBasedApproval->status !== 'draft') {
            abort(403);
        }

        DB::transaction(function () use ($teamBasedApproval) {
            // Determine approver user (same approver for all items on this sheet)
            $approverUser = $teamBasedApproval->areaManager
                ?? $teamBasedApproval->zoneManager
                ?? $teamBasedApproval->admf
                ?? $teamBasedApproval->dmf
                ?? $teamBasedApproval->ed;

            if (! $approverUser) {
                throw new \RuntimeException('No approver selected for this sheet.');
            }

            $level = $approverUser->role->name ?? null;

            // Create a pending review entry per loan row (item)
            $teamBasedApproval->loadMissing('items');
            foreach ($teamBasedApproval->items as $item) {
                TeamBasedApprovalReview::create([
                    'team_based_approval_id' => $teamBasedApproval->id,
                    'team_based_approval_item_id' => $item->id,
                    'user_id' => $approverUser->id,
                    'level' => $level,
                    'status' => 'pending',
                ]);
            }

            // Mark sheet as pending (branch side list)
            $teamBasedApproval->update(['status' => 'pending']);
        });

        return redirect()
            ->route('team-based-approvals.index')
            ->with('success', 'Draft submitted successfully.');
    }

    /**
     * Round numeric item fields to integers (no decimals).
     */
    /**
     * @return \Illuminate\Http\RedirectResponse
     */
    private function redirectToApproverIndex(Request $request, string $message, string $flashKey = 'success')
    {
        $params = array_filter(
            $request->only(['status', 'branch_id', 'approver_id', 'date_from', 'date_to', 'approval_flow', 'per_page', 'page']),
            fn ($v) => $v !== null && $v !== ''
        );

        return redirect()
            ->route('team-based-approvals.approver-index', $params)
            ->with($flashKey, $message);
    }

    private function userCanClearItemReviewHistory(User $user, TeamBasedApprovalItem $item, bool $isHeadOffice): bool
    {
        if ($isHeadOffice) {
            return true;
        }

        return TeamBasedApprovalReview::query()
            ->where('team_based_approval_item_id', $item->id)
            ->where('user_id', $user->id)
            ->where('status', 'pending')
            ->exists();
    }

    private function resetItemReviewHistory(TeamBasedApprovalItem $item): void
    {
        $approval = $item->approval;
        if (! $approval) {
            return;
        }

        TeamBasedApprovalReview::where('team_based_approval_item_id', $item->id)->delete();

        $approverUserId = $approval->area_manager_id
            ?? $approval->zone_manager_id
            ?? $approval->admf_id
            ?? $approval->dmf_id
            ?? $approval->ed_id;

        if ($approverUserId) {
            $approver = User::find($approverUserId);
            TeamBasedApprovalReview::create([
                'team_based_approval_id' => $approval->id,
                'team_based_approval_item_id' => $item->id,
                'user_id' => $approverUserId,
                'level' => $approver?->role?->name,
                'status' => 'pending',
            ]);
        }

        $item->update(['approved_amount' => null]);

        $approvalHasNonPending = TeamBasedApprovalReview::query()
            ->where('team_based_approval_id', $approval->id)
            ->whereIn('status', ['approved', 'rejected', 'forwarded'])
            ->exists();

        if (! $approvalHasNonPending && $approval->status !== 'draft') {
            $approval->update([
                'status' => 'pending',
                'approved_total_amount' => null,
            ]);
        }
    }

    private function roundItemNumbers(array $item): array
    {
        $numericKeys = ['savings_general', 'savings_other', 'savings_total', 'approved_amount'];
        foreach ($numericKeys as $key) {
            if (array_key_exists($key, $item) && $item[$key] !== null && $item[$key] !== '') {
                $item[$key] = (int) round((float) $item[$key]);
            }
        }

        return $item;
    }

    /**
     * শুধু approved/rejected/forwarded রিভিউতে সাইনেচার দাও; pending এ সাইনেচার দেখাবে না।
     */
    private function formatBranchIndexItem(TeamBasedApprovalItem $item): array
    {
        $approval = $item->approval;
        $approverUser = $approval->areaManager
            ?? $approval->zoneManager
            ?? $approval->admf
            ?? $approval->dmf
            ?? $approval->ed;

        $reviewsForItem = $approval->reviews
            ->where('team_based_approval_item_id', $item->id)
            ->sortBy('id')
            ->values();

        $review = $reviewsForItem->last();
        $itemStatus = $review?->status ?? $approval->status;

        $snapshot = $approval->last_items_snapshot ?? [];
        $changedFields = [];
        if (! empty($snapshot) && $item->serial_no !== null) {
            $index = max(0, $item->serial_no - 1);
            $original = $snapshot[$index] ?? null;
            if (is_array($original)) {
                $fieldsToCheck = [
                    'member_name', 'member_code', 'member_phone', 'samity_number',
                    'savings_general', 'savings_other', 'savings_total',
                    'repaid_loan_amount', 'repaid_installment_no',
                    'other_institution_loan_amount', 'proposed_loan_amount',
                    'loan_term_years', 'loan_type', 'project_name',
                ];
                foreach ($fieldsToCheck as $field) {
                    $currentValue = $item->{$field};
                    $originalValue = $original[$field] ?? null;
                    $currentStr = $currentValue === null ? '' : (string) $currentValue;
                    $originalStr = $originalValue === null ? '' : (string) $originalValue;
                    if ($currentStr !== $originalStr) {
                        $changedFields[] = $field;
                    }
                }
            }
        }

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
            'loan_term_years' => $item->loan_term_years,
            'loan_type' => $item->loan_type,
            'project_name' => $item->project_name,
            'status' => $itemStatus,
            'approved_amount' => $item->approved_amount !== null ? (int) round((float) $item->approved_amount) : null,
            'review_comments' => $review?->comments,
            'approver_signature' => $this->reviewSignatureForDisplay($review),
            'decided_at' => optional($review?->decided_at)->toDateString(),
            'approvers' => $reviewsForItem->map(function ($r) {
                return [
                    'approver_name' => $r->user?->name,
                    'approver_role' => $r->user?->role?->display_name ?? $r->user?->role?->name,
                    'status' => $r->status,
                    'approved_amount' => $r->approved_amount !== null ? (int) round((float) $r->approved_amount) : null,
                    'comments' => $r->comments,
                    'approver_signature' => $this->reviewSignatureForDisplay($r),
                    'decided_at' => optional($r->decided_at)->toDateString(),
                ];
            })->values()->all(),
            'changed_fields' => $changedFields,
            'sheet_id' => $approval->id,
            'sheet_date' => optional($approval->sheet_date)->toDateString(),
            'approver_name' => $approverUser?->name,
            'created_at' => $approval->created_at?->toDateTimeString(),
        ];
    }

    /**
     * @return \Illuminate\Support\Collection<int, array<string, mixed>>
     */
    private function flattenApproverReviewToExportRows(TeamBasedApprovalReview $review, User $user)
    {
        $approval = $review->approval;
        $rows = collect();

        if ($review->team_based_approval_item_id && $review->item) {
            $item = $review->item;
            $reviewsForItem = $approval->reviews
                ->where('team_based_approval_item_id', $item->id)
                ->sortBy('id')
                ->values();

            $rows->push($this->formatApproverExportRow($review, $item, $reviewsForItem, $user, $approval));

            return $rows;
        }

        $reviewsByItem = $approval->reviews->whereNotNull('team_based_approval_item_id')->groupBy('team_based_approval_item_id');

        foreach ($approval->items as $index => $item) {
            $reviewsForItem = $reviewsByItem->get($item->id, collect())->sortBy('id')->values();
            $rows->push($this->formatApproverExportRow($review, $item, $reviewsForItem, $user, $approval, $index));
        }

        return $rows;
    }

    /**
     * @param  \Illuminate\Support\Collection<int, TeamBasedApprovalReview>  $reviewsForItem
     * @return array<string, mixed>
     */
    private function formatApproverExportRow(
        TeamBasedApprovalReview $review,
        TeamBasedApprovalItem $item,
        $reviewsForItem,
        User $user,
        TeamBasedApproval $approval,
        int $index = 0,
    ): array {
        return [
            'id' => $item->id,
            'serial_no' => $item->serial_no ?: ($index + 1),
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
            'review_id' => $review->id,
            'sheet_id' => $approval->id,
            'sheet_date' => optional($approval->sheet_date)->toDateString(),
            'branch_name' => $approval->branch?->name,
            'branch_code' => $approval->branch?->code,
            'review_status' => $review->status,
            'review_comments' => $review->comments,
            'approver_signature' => $this->reviewSignatureForDisplay($review),
            'decided_at' => $review->decided_at?->toDateString(),
            'can_act' => $review->user_id === $user->id,
            'approver_name' => $review->user?->name,
            'approver_role' => $review->user?->role?->display_name ?? $review->user?->role?->name,
            'approvers' => $reviewsForItem->map(function ($r) {
                return [
                    'approver_name' => $r->user?->name,
                    'approver_role' => $r->user?->role?->display_name ?? $r->user?->role?->name,
                    'status' => $r->status,
                    'approved_amount' => $r->approved_amount !== null ? (int) round((float) $r->approved_amount) : null,
                    'comments' => $r->comments,
                    'approver_signature' => $this->reviewSignatureForDisplay($r),
                    'decided_at' => $r->decided_at?->toDateString(),
                ];
            })->values()->all(),
        ];
    }

    private function reviewSignatureForDisplay(?TeamBasedApprovalReview $review): ?string
    {
        if (! $review) {
            return null;
        }
        if (! in_array($review->status, ['approved', 'rejected', 'forwarded'], true)) {
            return null;
        }

        return $review->approver_signature ?? $review->user?->signature;
    }
}
