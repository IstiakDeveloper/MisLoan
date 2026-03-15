<?php

namespace App\Http\Controllers;

use App\Models\TeamBasedApproval;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TeamBasedApprovalPrintController extends Controller
{
    /**
     * Show printable view of a Team Based approval sheet.
     */
    public function show(TeamBasedApproval $teamBasedApproval)
    {
        $teamBasedApproval->load([
            'branch.area.zone',
            'areaManager',
            'zoneManager',
            'admf',
            'dmf',
            'ed',
            'items',
            'reviews.user.role',
        ]);

        $approverUser = $teamBasedApproval->areaManager
            ?? $teamBasedApproval->zoneManager
            ?? $teamBasedApproval->admf
            ?? $teamBasedApproval->dmf
            ?? $teamBasedApproval->ed;

        $reviewsByItem = $teamBasedApproval->reviews
            ->whereNotNull('team_based_approval_item_id')
            ->groupBy('team_based_approval_item_id');

        return Inertia::render('TeamBased/ApprovalPrint', [
            'sheet' => [
                'id' => $teamBasedApproval->id,
                'sheet_date' => optional($teamBasedApproval->sheet_date)->toDateString(),
                'status' => $teamBasedApproval->status,
                'branch' => [
                    'name' => $teamBasedApproval->branch->name,
                    'code' => $teamBasedApproval->branch->code,
                    'area_name' => $teamBasedApproval->branch->area?->name,
                    'zone_name' => $teamBasedApproval->branch->area?->zone?->name,
                ],
                'approver_name' => $approverUser?->name,
            ],
            'items' => $teamBasedApproval->items->map(function ($item) use ($reviewsByItem) {
                $reviewsForItem = $reviewsByItem->get($item->id, collect())->sortBy('id')->values();

                return [
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
                    'approvers' => $reviewsForItem->map(function ($r) {
                        return [
                            'approver_name' => $r->user?->name,
                            'approver_role' => $r->user?->role?->display_name ?? $r->user?->role?->name,
                            'status' => $r->status,
                            'approved_amount' => $r->approved_amount !== null ? (int) round((float) $r->approved_amount) : null,
                            'comments' => $r->comments,
                            'approver_signature' => in_array($r->status, ['approved', 'rejected', 'forwarded'], true) ? ($r->approver_signature ?? $r->user?->signature) : null,
                            'decided_at' => $r->decided_at?->toDateString(),
                        ];
                    })->values()->all(),
                ];
            })->values(),
        ]);
    }
}

