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
        ]);

        $approverUser = $teamBasedApproval->areaManager
            ?? $teamBasedApproval->zoneManager
            ?? $teamBasedApproval->admf
            ?? $teamBasedApproval->dmf
            ?? $teamBasedApproval->ed;

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
            'items' => $teamBasedApproval->items->map(function ($item) {
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
                    'loan_term_years' => $item->loan_term_years,
                    'loan_type' => $item->loan_type,
                    'project_name' => $item->project_name,
                ];
            })->values(),
        ]);
    }
}

