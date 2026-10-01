<?php

namespace App\Http\Controllers\HeadOffice;

use App\Http\Controllers\Concerns\ScopesToAccessibleBranches;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\LoanApplicationApproval;
use App\Models\Role;
use App\Models\User;
use App\Services\ApprovalService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ApproverLoanApprovalReportController extends Controller
{
    use ScopesToAccessibleBranches;

    /**
     * Authorize user access to this report
     */
    protected function ensureCanViewReport(Request $request): User
    {
        $user = $request->user();
        if (! $user) {
            abort(401);
        }

        $allowedRoles = [
            Role::SUPER_ADMIN,
            Role::HEAD_OFFICE,
            Role::CSO,
            Role::ED,
            Role::ADMF,
            Role::DMF,
            Role::AREA_MANAGER,
            Role::ZONE_MANAGER,
            Role::BRANCH_MANAGER,
        ];

        $roleName = $user->role?->name;

        if (! $user->has_all_access && ! in_array($roleName, $allowedRoles, true)) {
            abort(403, 'এই রিপোর্ট দেখার আপনার অনুমতি নেই।');
        }

        return $user;
    }

    /**
     * Display the Approver Wise Loan Approval Report
     */
    /**
     * Display the Approver Wise Loan Approval Report
     */
    public function index(Request $request): Response
    {
        $viewer = $this->ensureCanViewReport($request);

        $dateFrom = $request->input('date_from', Carbon::today()->startOfMonth()->toDateString());
        $dateTo = $request->input('date_to', Carbon::today()->toDateString());
        $userId = $request->filled('user_id') ? (int) $request->input('user_id') : null;
        $decisionStatus = $request->input('decision_status', 'all');
        if (! in_array($decisionStatus, ['all', 'approved', 'rejected'], true)) {
            $decisionStatus = 'all';
        }
        $search = $request->input('search', '');
        $perPage = (int) $request->input('per_page', 25);
        if (! in_array($perPage, [15, 25, 50, 100, 200], true)) {
            $perPage = 25;
        }

        // Base query with existing valid loanApplication & decision status filter
        $query = $this->buildReportQuery($request, $dateFrom, $dateTo, $userId, $viewer, $decisionStatus);

        // Accurate summary statistics via SQL (never truncated)
        $totalDecisionsCount = (clone $query)->count();
        $uniqueLoansCount = (clone $query)->distinct('loan_application_approvals.loan_application_id')->count('loan_application_approvals.loan_application_id');
        $uniqueApproversCount = (clone $query)->distinct('loan_application_approvals.user_id')->count('loan_application_approvals.user_id');

        // Approved breakdown
        $approvedActionsCount = (clone $query)->where('loan_application_approvals.status', 'approved')->count();
        $approvedLoansCount = (clone $query)->where('loan_application_approvals.status', 'approved')->distinct('loan_application_approvals.loan_application_id')->count('loan_application_approvals.loan_application_id');
        $approvedLoanIds = (clone $query)->where('loan_application_approvals.status', 'approved')->select('loan_application_approvals.loan_application_id')->distinct();
        $approvedAmountSum = (float) LoanApplication::whereIn('id', $approvedLoanIds)
            ->sum(DB::raw('COALESCE(approved_amount, requested_amount, 0)'));

        // Rejected breakdown
        $rejectedActionsCount = (clone $query)->where('loan_application_approvals.status', 'rejected')->count();
        $rejectedLoansCount = (clone $query)->where('loan_application_approvals.status', 'rejected')->distinct('loan_application_approvals.loan_application_id')->count('loan_application_approvals.loan_application_id');
        $rejectedLoanIds = (clone $query)->where('loan_application_approvals.status', 'rejected')->select('loan_application_approvals.loan_application_id')->distinct();
        $rejectedAmountSum = (float) LoanApplication::whereIn('id', $rejectedLoanIds)
            ->sum(DB::raw('COALESCE(approved_amount, requested_amount, 0)'));

        $totalAmountSum = $approvedAmountSum + $rejectedAmountSum;
        $averageAmount = $approvedLoansCount > 0 ? (float) ($approvedAmountSum / $approvedLoansCount) : 0;

        // Paginate for the detailed list
        $paginated = (clone $query)
            ->orderBy('loan_application_approvals.approved_at', 'desc')
            ->paginate($perPage)
            ->withQueryString();

        $items = collect($paginated->items())->map(function ($approval) {
            return $this->formatApprovalRow($approval);
        })->all();

        // 2. Date-wise Summary Breakdown (accurate via SQL)
        $dateSummary = $this->buildDateSummaryFromQuery($query);

        // 3. Approver-wise Summary Breakdown (accurate via SQL for all approvers)
        $approverSummary = $this->buildApproverSummaryFromQuery($query);

        // Filter dropdown options
        $approversList = $this->getApproversDropdownList($viewer);
        $orgOptions = $this->organizationFilterOptions();

        $selectedApprover = $userId ? User::with('role', 'branch')->find($userId) : null;

        return Inertia::render('HeadOffice/Reports/ApproverLoanApprovalReport', $this->cleanUtf8([
            'approvals' => [
                'data' => $items,
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
                'links' => $paginated->linkCollection()->toArray(),
            ],
            'filters' => [
                'date_from' => (string) $dateFrom,
                'date_to' => (string) $dateTo,
                'user_id' => $userId ? (string) $userId : '',
                'decision_status' => (string) $decisionStatus,
                'zone_id' => (string) $request->input('zone_id', ''),
                'area_id' => (string) $request->input('area_id', ''),
                'branch_id' => (string) $request->input('branch_id', ''),
                'search' => (string) $search,
                'per_page' => $perPage,
            ],
            'summary' => [
                'total_decisions' => $totalDecisionsCount,
                'total_loans' => $uniqueLoansCount,
                'total_approvals' => $approvedActionsCount,
                'approved_loans' => $approvedLoansCount,
                'approved_actions' => $approvedActionsCount,
                'approved_amount' => (float) $approvedAmountSum,
                'rejected_loans' => $rejectedLoansCount,
                'rejected_actions' => $rejectedActionsCount,
                'rejected_amount' => (float) $rejectedAmountSum,
                'total_amount' => (float) $totalAmountSum,
                'unique_approvers' => $uniqueApproversCount,
                'average_amount' => (float) $averageAmount,
            ],
            'selected_approver' => $selectedApprover ? [
                'id' => $selectedApprover->id,
                'name' => $selectedApprover->name,
                'email' => $selectedApprover->email,
                'role_name' => $selectedApprover->role?->display_name ?: ($selectedApprover->role?->name ?? 'N/A'),
                'branch_name' => $selectedApprover->branch?->name ?? 'N/A',
            ] : null,
            'date_summary' => $dateSummary,
            'approver_summary' => $approverSummary,
            'approvers_list' => $approversList,
            'zones' => $orgOptions['zones']->toArray(),
            'areas' => $orgOptions['areas']->toArray(),
            'branches' => $orgOptions['branches']->toArray(),
        ]));
    }

    /**
     * Print View optimized for A4 paper
     */
    public function print(Request $request): Response
    {
        $viewer = $this->ensureCanViewReport($request);

        $dateFrom = $request->input('date_from', Carbon::today()->startOfMonth()->toDateString());
        $dateTo = $request->input('date_to', Carbon::today()->toDateString());
        $userId = $request->filled('user_id') ? (int) $request->input('user_id') : null;
        $decisionStatus = $request->input('decision_status', 'all');
        if (! in_array($decisionStatus, ['all', 'approved', 'rejected'], true)) {
            $decisionStatus = 'all';
        }

        $query = $this->buildReportQuery($request, $dateFrom, $dateTo, $userId, $viewer, $decisionStatus);

        $totalDecisionsCount = (clone $query)->count();
        $uniqueLoansCount = (clone $query)->distinct('loan_application_approvals.loan_application_id')->count('loan_application_approvals.loan_application_id');
        $uniqueApproversCount = (clone $query)->distinct('loan_application_approvals.user_id')->count('loan_application_approvals.user_id');

        $approvedActionsCount = (clone $query)->where('loan_application_approvals.status', 'approved')->count();
        $approvedLoansCount = (clone $query)->where('loan_application_approvals.status', 'approved')->distinct('loan_application_approvals.loan_application_id')->count('loan_application_approvals.loan_application_id');
        $approvedLoanIds = (clone $query)->where('loan_application_approvals.status', 'approved')->select('loan_application_approvals.loan_application_id')->distinct();
        $approvedAmountSum = (float) LoanApplication::whereIn('id', $approvedLoanIds)
            ->sum(DB::raw('COALESCE(approved_amount, requested_amount, 0)'));

        $rejectedActionsCount = (clone $query)->where('loan_application_approvals.status', 'rejected')->count();
        $rejectedLoansCount = (clone $query)->where('loan_application_approvals.status', 'rejected')->distinct('loan_application_approvals.loan_application_id')->count('loan_application_approvals.loan_application_id');
        $rejectedLoanIds = (clone $query)->where('loan_application_approvals.status', 'rejected')->select('loan_application_approvals.loan_application_id')->distinct();
        $rejectedAmountSum = (float) LoanApplication::whereIn('id', $rejectedLoanIds)
            ->sum(DB::raw('COALESCE(approved_amount, requested_amount, 0)'));

        $totalAmountSum = $approvedAmountSum + $rejectedAmountSum;
        $averageAmount = $approvedLoansCount > 0 ? (float) ($approvedAmountSum / $approvedLoansCount) : 0;

        $allMatching = (clone $query)->orderBy('loan_application_approvals.approved_at', 'desc')->limit(3000)->get();
        $items = $allMatching->map(fn ($approval) => $this->formatApprovalRow($approval))->all();

        $dateSummary = $this->buildDateSummaryFromQuery($query);
        $approverSummary = $this->buildApproverSummaryFromQuery($query);
        $orgOptions = $this->organizationFilterOptions();
        $selectedApprover = $userId ? User::with('role', 'branch')->find($userId) : null;
        $reportType = $request->input('report_type', 'approver_wise');
        if (! in_array($reportType, ['approver_wise', 'detailed', 'date_wise', 'all'], true)) {
            $reportType = 'approver_wise';
        }

        return Inertia::render('HeadOffice/Reports/ApproverLoanApprovalPrint', $this->cleanUtf8([
            'approvals' => $items,
            'filters' => [
                'date_from' => (string) $dateFrom,
                'date_to' => (string) $dateTo,
                'user_id' => $userId ? (string) $userId : '',
                'decision_status' => (string) $decisionStatus,
                'report_type' => (string) $reportType,
                'zone_id' => (string) $request->input('zone_id', ''),
                'area_id' => (string) $request->input('area_id', ''),
                'branch_id' => (string) $request->input('branch_id', ''),
                'search' => (string) $request->input('search', ''),
            ],
            'summary' => [
                'total_decisions' => $totalDecisionsCount,
                'total_loans' => $uniqueLoansCount,
                'total_approvals' => $approvedActionsCount,
                'approved_loans' => $approvedLoansCount,
                'approved_actions' => $approvedActionsCount,
                'approved_amount' => (float) $approvedAmountSum,
                'rejected_loans' => $rejectedLoansCount,
                'rejected_actions' => $rejectedActionsCount,
                'rejected_amount' => (float) $rejectedAmountSum,
                'total_amount' => (float) $totalAmountSum,
                'unique_approvers' => $uniqueApproversCount,
                'average_amount' => (float) $averageAmount,
            ],
            'selected_approver' => $selectedApprover ? [
                'id' => $selectedApprover->id,
                'name' => $selectedApprover->name,
                'email' => $selectedApprover->email,
                'role_name' => $selectedApprover->role?->display_name ?: ($selectedApprover->role?->name ?? 'N/A'),
                'branch_name' => $selectedApprover->branch?->name ?? 'N/A',
            ] : null,
            'date_summary' => $dateSummary,
            'approver_summary' => $approverSummary,
            'zones' => $orgOptions['zones']->toArray(),
            'areas' => $orgOptions['areas']->toArray(),
            'branches' => $orgOptions['branches']->toArray(),
            'printed_at' => Carbon::now()->format('d/m/Y h:i A'),
        ]));
    }

    /**
     * Export report to Excel (.xlsx) with dedicated Approver-wise Summary sheet, Detailed List, and Date-wise Summary
     */
    public function exportExcel(Request $request): StreamedResponse
    {
        $viewer = $this->ensureCanViewReport($request);

        $dateFrom = $request->input('date_from', Carbon::today()->startOfMonth()->toDateString());
        $dateTo = $request->input('date_to', Carbon::today()->toDateString());
        $userId = $request->filled('user_id') ? (int) $request->input('user_id') : null;
        $decisionStatus = $request->input('decision_status', 'all');
        if (! in_array($decisionStatus, ['all', 'approved', 'rejected'], true)) {
            $decisionStatus = 'all';
        }

        $reportType = $request->input('report_type', 'approver_wise');
        if (! in_array($reportType, ['approver_wise', 'detailed', 'date_wise', 'all'], true)) {
            $reportType = 'approver_wise';
        }

        $query = $this->buildReportQuery($request, $dateFrom, $dateTo, $userId, $viewer, $decisionStatus);
        $approvals = (clone $query)->orderBy('loan_application_approvals.approved_at', 'desc')->limit(5000)->get();

        $rows = $approvals->map(fn ($a) => $this->formatApprovalRow($a))->all();
        $dateSummary = $this->buildDateSummaryFromQuery($query);
        $approverSummary = $this->buildApproverSummaryFromQuery($query);
        $selectedApprover = $userId ? User::with('role')->find($userId) : null;

        $spreadsheet = new Spreadsheet();

        $approverNameText = $selectedApprover
            ? "{$selectedApprover->name} (" . ($selectedApprover->role?->display_name ?: $selectedApprover->role?->name) . ")"
            : 'সকল কর্মকর্তা (All Approvers)';

        $decisionFilterLabel = match ($decisionStatus) {
            'approved' => 'শুধুমাত্র অনুমোদিত (Approved Only)',
            'rejected' => 'শুধুমাত্র বাতিল / প্রত্যাখ্যাত (Rejected Only)',
            default => 'সকল সিদ্ধান্ত (অনুমোদিত ও বাতিল)',
        };

        // ----------------- SHEET 1: কর্মকর্তাভিত্তিক ঋণ মঞ্জুরী সারসংক্ষেপ (Approver-wise Summary) -----------------
        $sheet1 = $spreadsheet->getActiveSheet();
        $sheet1->setTitle('কর্মকর্তাভিত্তিক সারসংক্ষেপ');

        $sheet1->setCellValue('A1', 'মৌসুমী');
        $sheet1->setCellValue('A2', 'উকিলপাড়া, নওগাঁ।');
        $sheet1->setCellValue('A3', 'কর্মকর্তাভিত্তিক ঋণ সিদ্ধান্ত ও অনুমোদন সারসংক্ষেপ (Approver-wise Loan Decision Summary)');
        $sheet1->mergeCells('A1:K1');
        $sheet1->mergeCells('A2:K2');
        $sheet1->mergeCells('A3:K3');

        $sheet1->getStyle('A1:A3')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet1->getStyle('A1')->getFont()->setBold(true)->setSize(16)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FF1E3A8A'));
        $sheet1->getStyle('A2')->getFont()->setSize(10)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FF64748B'));
        $sheet1->getStyle('A3')->getFont()->setBold(true)->setSize(12)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FF0F172A'));

        $sheet1->setCellValue('A5', 'তারিখ পরিসীমা:');
        $sheet1->setCellValue('B5', Carbon::parse($dateFrom)->format('d/m/Y') . ' হতে ' . Carbon::parse($dateTo)->format('d/m/Y'));
        $sheet1->setCellValue('D5', 'অনুমোদক / কর্মকর্তা:');
        $sheet1->setCellValue('E5', $approverNameText);
        $sheet1->setCellValue('G5', 'সিদ্ধান্ত ফিল্টার:');
        $sheet1->setCellValue('H5', $decisionFilterLabel);
        $sheet1->setCellValue('J5', 'রিপোর্ট জেনারেট:');
        $sheet1->setCellValue('K5', Carbon::now()->format('d/m/Y h:i A'));

        $sheet1->getStyle('A5')->getFont()->setBold(true);
        $sheet1->getStyle('D5')->getFont()->setBold(true);
        $sheet1->getStyle('G5')->getFont()->setBold(true);
        $sheet1->getStyle('J5')->getFont()->setBold(true);

        $totAppLoans = collect($approverSummary)->sum('approved_loans');
        $totRejLoans = collect($approverSummary)->sum('rejected_loans');
        $totAppAmount = collect($approverSummary)->sum('approved_amount');

        $sheet1->setCellValue('A6', 'মোট অনুমোদিত ঋণ:');
        $sheet1->setCellValue('B6', $totAppLoans . ' টি (' . number_format($totAppAmount, 2) . ' ৳)');
        $sheet1->setCellValue('D6', 'মোট বাতিলকৃত:');
        $sheet1->setCellValue('E6', $totRejLoans . ' টি');
        $sheet1->setCellValue('G6', 'মোট কর্মকর্তা:');
        $sheet1->setCellValue('H6', count($approverSummary) . ' জন');

        $sheet1->getStyle('A6')->getFont()->setBold(true);
        $sheet1->getStyle('B6')->getFont()->setBold(true)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FF059669'));
        $sheet1->getStyle('D6')->getFont()->setBold(true);
        $sheet1->getStyle('E6')->getFont()->setBold(true)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FFE11D48'));
        $sheet1->getStyle('G6')->getFont()->setBold(true);

        $approverHeaders = [
            'ক্রমিক',
            'কর্মকর্তার নাম',
            'আইডি',
            'পদবী ও স্তর',
            'কর্মস্থল / শাখা',
            'অনুমোদিত ঋণ (টি)',
            'পুনঃঅনুমোদন (টি)',
            'বাতিলকৃত ঋণ (টি)',
            'মোট সিদ্ধান্ত (টি)',
            'অনুমোদিত টাকা (৳)',
            'গড় ঋণ (৳)',
        ];

        $apRow = 8;
        $apCol = 'A';
        foreach ($approverHeaders as $hText) {
            $sheet1->setCellValue($apCol . $apRow, $hText);
            $apCol++;
        }
        $lastApCol = chr(ord('A') + count($approverHeaders) - 1);

        $sheet1->getStyle("A{$apRow}:{$lastApCol}{$apRow}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 10],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1E293B']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $sheet1->getRowDimension($apRow)->setRowHeight(26);

        $curApRow = $apRow + 1;
        foreach ($approverSummary as $index => $ap) {
            $approvedL = $ap['approved_loans'] ?? $ap['total_loans'];
            $reapp = $ap['reapprovals_count'] ?? 0;
            $rejL = $ap['rejected_loans'] ?? 0;
            $totAct = $ap['total_actions'] ?? ($approvedL + $rejL);
            $appAmt = $ap['approved_amount'] ?? $ap['total_amount'];
            $avgAmt = $approvedL > 0 ? $appAmt / $approvedL : 0;

            $sheet1->setCellValue('A' . $curApRow, $index + 1);
            $sheet1->setCellValue('B' . $curApRow, $ap['user_name']);
            $sheet1->setCellValue('C' . $curApRow, '#' . $ap['user_id']);
            $sheet1->setCellValue('D' . $curApRow, $ap['role_name']);
            $sheet1->setCellValue('E' . $curApRow, $ap['branch_name']);
            $sheet1->setCellValue('F' . $curApRow, $approvedL);
            $sheet1->setCellValue('G' . $curApRow, $reapp);
            $sheet1->setCellValue('H' . $curApRow, $rejL);
            $sheet1->setCellValue('I' . $curApRow, $totAct);
            $sheet1->setCellValue('J' . $curApRow, $appAmt);
            $sheet1->setCellValue('K' . $curApRow, $avgAmt);

            $sheet1->getStyle('A' . $curApRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet1->getStyle('C' . $curApRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet1->getStyle('F' . $curApRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet1->getStyle('G' . $curApRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet1->getStyle('H' . $curApRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet1->getStyle('I' . $curApRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet1->getStyle('J' . $curApRow)->getNumberFormat()->setFormatCode('#,##0.00');
            $sheet1->getStyle('K' . $curApRow)->getNumberFormat()->setFormatCode('#,##0.00');
            $sheet1->getStyle('J' . $curApRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
            $sheet1->getStyle('K' . $curApRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

            if ($rejL > 0) {
                $sheet1->getStyle('H' . $curApRow)->getFont()->setBold(true)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FFE11D48'));
            }

            if ($index % 2 === 1) {
                $sheet1->getStyle("A{$curApRow}:{$lastApCol}{$curApRow}")->getFill()->applyFromArray([
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'F8FAFC'],
                ]);
            }

            $curApRow++;
        }

        // Totals Row for Sheet 1
        $sheet1->setCellValue('A' . $curApRow, 'সর্বমোট:');
        $sheet1->mergeCells("A{$curApRow}:E{$curApRow}");
        $sheet1->setCellValue('F' . $curApRow, "=SUM(F" . ($apRow + 1) . ":F" . ($curApRow - 1) . ")");
        $sheet1->setCellValue('G' . $curApRow, "=SUM(G" . ($apRow + 1) . ":G" . ($curApRow - 1) . ")");
        $sheet1->setCellValue('H' . $curApRow, "=SUM(H" . ($apRow + 1) . ":H" . ($curApRow - 1) . ")");
        $sheet1->setCellValue('I' . $curApRow, "=SUM(I" . ($apRow + 1) . ":I" . ($curApRow - 1) . ")");
        $sheet1->setCellValue('J' . $curApRow, "=SUM(J" . ($apRow + 1) . ":J" . ($curApRow - 1) . ")");
        $sheet1->setCellValue('K' . $curApRow, "=AVERAGE(K" . ($apRow + 1) . ":K" . ($curApRow - 1) . ")");

        $sheet1->getStyle("A{$curApRow}:{$lastApCol}{$curApRow}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => '0F172A'], 'size' => 10],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E2E8F0']],
        ]);
        $sheet1->getStyle('A' . $curApRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
        $sheet1->getStyle('F' . $curApRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet1->getStyle('G' . $curApRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet1->getStyle('H' . $curApRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet1->getStyle('I' . $curApRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet1->getStyle('J' . $curApRow)->getNumberFormat()->setFormatCode('#,##0.00');
        $sheet1->getStyle('K' . $curApRow)->getNumberFormat()->setFormatCode('#,##0.00');
        $sheet1->getStyle('J' . $curApRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
        $sheet1->getStyle('K' . $curApRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

        $sheet1->getStyle("A{$apRow}:{$lastApCol}{$curApRow}")->applyFromArray([
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => 'CBD5E1'],
                ],
            ],
        ]);

        foreach (range('A', $lastApCol) as $colID) {
            $sheet1->getColumnDimension($colID)->setAutoSize(true);
        }

        // ----------------- SHEET 2: বিস্তারিত ঋণ সিদ্ধান্তের তালিকা (Detailed Loans) -----------------
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('বিস্তারিত ঋণ তালিকা');

        // Title Block
        $sheet->setCellValue('A1', 'মৌসুমী');
        $sheet->setCellValue('A2', 'উকিলপাড়া, নওগাঁ।');
        $sheet->setCellValue('A3', 'অনুমোদকভিত্তিক ঋণ সিদ্ধান্ত রিপোর্ট (Approver Loan Approval & Rejection Report)');
        $sheet->mergeCells('A1:O1');
        $sheet->mergeCells('A2:O2');
        $sheet->mergeCells('A3:O3');

        $sheet->getStyle('A1:A3')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(16)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FF1E3A8A'));
        $sheet->getStyle('A2')->getFont()->setSize(10)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FF64748B'));
        $sheet->getStyle('A3')->getFont()->setBold(true)->setSize(12)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FF0F172A'));

        $sheet->setCellValue('A5', 'তারিখ পরিসীমা:');
        $sheet->setCellValue('B5', Carbon::parse($dateFrom)->format('d/m/Y') . ' হতে ' . Carbon::parse($dateTo)->format('d/m/Y'));
        $sheet->setCellValue('D5', 'অনুমোদক / কর্মকর্তা:');
        $sheet->setCellValue('E5', $approverNameText);
        $sheet->setCellValue('H5', 'সিদ্ধান্ত ফিল্টার:');
        $sheet->setCellValue('I5', $decisionFilterLabel);
        $sheet->setCellValue('L5', 'রিপোর্ট জেনারেট:');
        $sheet->setCellValue('M5', Carbon::now()->format('d/m/Y h:i A'));

        $sheet->getStyle('A5')->getFont()->setBold(true);
        $sheet->getStyle('D5')->getFont()->setBold(true);
        $sheet->getStyle('H5')->getFont()->setBold(true);
        $sheet->getStyle('L5')->getFont()->setBold(true);

        // Summary Counts
        $approvedRows = collect($rows)->filter(fn ($r) => $r['action_status'] === 'approved');
        $rejectedRows = collect($rows)->filter(fn ($r) => $r['action_status'] === 'rejected');

        $approvedAmountSum = $approvedRows->sum('approved_amount');
        $rejectedAmountSum = $rejectedRows->sum('requested_amount');

        $sheet->setCellValue('A6', 'অনুমোদিত ঋণ:');
        $sheet->setCellValue('B6', $approvedRows->count() . ' টি (' . number_format($approvedAmountSum, 2) . ' ৳)');
        $sheet->setCellValue('D6', 'বাতিল / প্রত্যাখ্যাত:');
        $sheet->setCellValue('E6', $rejectedRows->count() . ' টি (' . number_format($rejectedAmountSum, 2) . ' ৳)');
        $sheet->setCellValue('H6', 'মোট সিদ্ধান্ত কার্যক্রম:');
        $sheet->setCellValue('I6', count($rows) . ' টি');

        $sheet->getStyle('A6')->getFont()->setBold(true);
        $sheet->getStyle('B6')->getFont()->setBold(true)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FF059669'));
        $sheet->getStyle('D6')->getFont()->setBold(true);
        $sheet->getStyle('E6')->getFont()->setBold(true)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FFE11D48'));
        $sheet->getStyle('H6')->getFont()->setBold(true);

        // Headers
        $headers = [
            'ক্রমিক',
            'তারিখ ও সময়',
            'আবেদন নং',
            'সদস্যের নাম',
            'সদস্য কোড',
            'মোবাইল নং',
            'শাখা',
            'সমিতি',
            'ঋণ প্রোডাক্ট',
            'চাহিদাকৃত টাকা (৳)',
            'অনুমোদিত টাকা (৳)',
            'সিদ্ধান্তের ধরন',
            'কর্মকর্তার নাম ও পদবী',
            'অনুমোদনের স্তর',
            'মন্তব্য / বাতিলের কারণ',
        ];

        $headerRow = 8;
        $col = 'A';
        foreach ($headers as $headerText) {
            $sheet->setCellValue($col . $headerRow, $headerText);
            $col++;
        }

        $lastCol = chr(ord('A') + count($headers) - 1);

        $sheet->getStyle("A{$headerRow}:{$lastCol}{$headerRow}")->applyFromArray([
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
                'size' => 10,
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1E293B'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
                'wrapText' => true,
            ],
        ]);
        $sheet->getRowDimension($headerRow)->setRowHeight(28);

        // Data Rows
        $currentRow = $headerRow + 1;
        foreach ($rows as $index => $row) {
            $isRej = $row['action_status'] === 'rejected';

            $sheet->setCellValue('A' . $currentRow, $index + 1);
            $sheet->setCellValue('B' . $currentRow, $row['approval_date'] . ' ' . $row['approval_time']);
            $sheet->setCellValue('C' . $currentRow, $row['application_no']);
            $sheet->setCellValue('D' . $currentRow, $row['member_name']);
            $sheet->setCellValue('E' . $currentRow, $row['member_code']);
            $sheet->setCellValue('F' . $currentRow, $row['member_mobile']);
            $sheet->setCellValue('G' . $currentRow, $row['branch_name']);
            $sheet->setCellValue('H' . $currentRow, $row['samity_name']);
            $sheet->setCellValue('I' . $currentRow, $row['product_name']);
            $sheet->setCellValue('J' . $currentRow, $row['requested_amount']);
            $sheet->setCellValue('K' . $currentRow, $isRej ? 0 : $row['approved_amount']);
            $sheet->setCellValue('L' . $currentRow, $isRej ? 'প্রত্যাখ্যাত / বাতিল' : 'অনুমোদিত');
            $sheet->setCellValue('M' . $currentRow, $row['approver_name'] . ' (' . $row['approver_role'] . ')');
            $sheet->setCellValue('N' . $currentRow, $row['level_label']);
            $sheet->setCellValue('O' . $currentRow, $row['comments'] ?: '—');

            // Format numbers
            $sheet->getStyle('J' . $currentRow)->getNumberFormat()->setFormatCode('#,##0.00');
            $sheet->getStyle('K' . $currentRow)->getNumberFormat()->setFormatCode('#,##0.00');

            // Alignments
            $sheet->getStyle('A' . $currentRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('B' . $currentRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('C' . $currentRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('E' . $currentRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('F' . $currentRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('J' . $currentRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
            $sheet->getStyle('K' . $currentRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
            $sheet->getStyle('L' . $currentRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('N' . $currentRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // Styling for status
            if ($isRej) {
                $sheet->getStyle('L' . $currentRow)->getFont()->setBold(true)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FFE11D48'));
                $sheet->getStyle('O' . $currentRow)->getFont()->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FFBE123C'));
            } else {
                $sheet->getStyle('L' . $currentRow)->getFont()->setBold(true)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FF059669'));
            }

            // Row zebra striping
            if ($index % 2 === 1) {
                $sheet->getStyle("A{$currentRow}:{$lastCol}{$currentRow}")->getFill()->applyFromArray([
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => $isRej ? 'FFF1F2' : 'F8FAFC'],
                ]);
            }

            $currentRow++;
        }

        // Totals Row
        $sheet->setCellValue('A' . $currentRow, 'সর্বমোট:');
        $sheet->mergeCells("A{$currentRow}:I{$currentRow}");
        $sheet->setCellValue('J' . $currentRow, "=SUM(J" . ($headerRow + 1) . ":J" . ($currentRow - 1) . ")");
        $sheet->setCellValue('K' . $currentRow, "=SUM(K" . ($headerRow + 1) . ":K" . ($currentRow - 1) . ")");
        $sheet->setCellValue('L' . $currentRow, count($rows) . ' টি সিদ্ধান্ত');
        $sheet->mergeCells("L{$currentRow}:O{$currentRow}");

        $sheet->getStyle("A{$currentRow}:{$lastCol}{$currentRow}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => '0F172A'], 'size' => 10],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E2E8F0']],
        ]);
        $sheet->getStyle('A' . $currentRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
        $sheet->getStyle('J' . $currentRow)->getNumberFormat()->setFormatCode('#,##0.00');
        $sheet->getStyle('K' . $currentRow)->getNumberFormat()->setFormatCode('#,##0.00');
        $sheet->getStyle('J' . $currentRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
        $sheet->getStyle('K' . $currentRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

        // Borders
        $sheet->getStyle("A{$headerRow}:{$lastCol}{$currentRow}")->applyFromArray([
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => 'CBD5E1'],
                ],
            ],
        ]);

        foreach (range('A', $lastCol) as $colID) {
            $sheet->getColumnDimension($colID)->setAutoSize(true);
        }

        // ----------------- SHEET 3: তারিখভিত্তিক সারসংক্ষেপ (Date-wise Summary) -----------------
        $sheet2 = $spreadsheet->createSheet();
        $sheet2->setTitle('তারিখভিত্তিক সারসংক্ষেপ');

        $sheet2->setCellValue('A1', 'মৌসুমী - তারিখভিত্তিক ঋণ অনুমোদন ও বাতিল বিবরণী');
        $sheet2->setCellValue('A2', 'তারিখ পরিসীমা: ' . Carbon::parse($dateFrom)->format('d/m/Y') . ' হতে ' . Carbon::parse($dateTo)->format('d/m/Y'));
        $sheet2->mergeCells('A1:G1');
        $sheet2->mergeCells('A2:G2');
        $sheet2->getStyle('A1')->getFont()->setBold(true)->setSize(14)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FF1E3A8A'));
        $sheet2->getStyle('A2')->getFont()->setSize(10)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FF64748B'));

        $dateHeaders = [
            'ক্রমিক',
            'তারিখ',
            'অনুমোদিত ঋণ (টি)',
            'অনুমোদিত টাকা (৳)',
            'বাতিলকৃত ঋণ (টি)',
            'মোট সিদ্ধান্ত (টি)',
            'কর্মকর্তাভিত্তিক বিস্তারিত ব্রেকডাউন',
        ];
        $dRow = 4;
        $dCol = 'A';
        foreach ($dateHeaders as $dText) {
            $sheet2->setCellValue($dCol . $dRow, $dText);
            $dCol++;
        }
        $sheet2->getStyle("A{$dRow}:G{$dRow}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 10],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '0284C7']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $sheet2->getRowDimension($dRow)->setRowHeight(24);

        $curDRow = $dRow + 1;
        foreach ($dateSummary as $idx => $dItem) {
            $approversTxt = collect($dItem['approvers'])->map(function ($ap) {
                $rejTxt = ! empty($ap['rejected_count']) ? ', বাতিল: ' . $ap['rejected_count'] . 'টি' : '';
                return $ap['user_name'] . ' (' . $ap['role_name'] . '): অনুমোদন ' . ($ap['approved_count'] ?? $ap['loans_count']) . ' টি (' . number_format($ap['approved_amount'] ?? $ap['total_amount'], 2) . ' ৳)' . $rejTxt;
            })->implode("\n");

            $sheet2->setCellValue('A' . $curDRow, $idx + 1);
            $sheet2->setCellValue('B' . $curDRow, $dItem['formatted_date']);
            $sheet2->setCellValue('C' . $curDRow, $dItem['approved_count'] ?? $dItem['total_loans']);
            $sheet2->setCellValue('D' . $curDRow, $dItem['approved_amount'] ?? $dItem['total_amount']);
            $sheet2->setCellValue('E' . $curDRow, $dItem['rejected_count'] ?? 0);
            $sheet2->setCellValue('F' . $curDRow, $dItem['total_loans']);
            $sheet2->setCellValue('G' . $curDRow, $approversTxt ?: '—');

            $sheet2->getStyle('A' . $curDRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet2->getStyle('B' . $curDRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet2->getStyle('C' . $curDRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet2->getStyle('D' . $curDRow)->getNumberFormat()->setFormatCode('#,##0.00');
            $sheet2->getStyle('D' . $curDRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
            $sheet2->getStyle('E' . $curDRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet2->getStyle('F' . $curDRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet2->getStyle('G' . $curDRow)->getAlignment()->setWrapText(true);

            if ($idx % 2 === 1) {
                $sheet2->getStyle("A{$curDRow}:G{$curDRow}")->getFill()->applyFromArray([
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'F8FAFC'],
                ]);
            }

            $curDRow++;
        }

        // Totals Row for Sheet 2
        $sheet2->setCellValue('A' . $curDRow, 'সর্বমোট:');
        $sheet2->mergeCells("A{$curDRow}:B{$curDRow}");
        $sheet2->setCellValue('C' . $curDRow, "=SUM(C" . ($dRow + 1) . ":C" . ($curDRow - 1) . ")");
        $sheet2->setCellValue('D' . $curDRow, "=SUM(D" . ($dRow + 1) . ":D" . ($curDRow - 1) . ")");
        $sheet2->setCellValue('E' . $curDRow, "=SUM(E" . ($dRow + 1) . ":E" . ($curDRow - 1) . ")");
        $sheet2->setCellValue('F' . $curDRow, "=SUM(F" . ($dRow + 1) . ":F" . ($curDRow - 1) . ")");
        $sheet2->setCellValue('G' . $curDRow, '—');

        $sheet2->getStyle("A{$curDRow}:G{$curDRow}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => '0F172A'], 'size' => 10],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E0F2FE']],
        ]);
        $sheet2->getStyle('A' . $curDRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
        $sheet2->getStyle('C' . $curDRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet2->getStyle('D' . $curDRow)->getNumberFormat()->setFormatCode('#,##0.00');
        $sheet2->getStyle('D' . $curDRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
        $sheet2->getStyle('E' . $curDRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet2->getStyle('F' . $curDRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $sheet2->getStyle("A{$dRow}:G{$curDRow}")->applyFromArray([
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => 'CBD5E1'],
                ],
            ],
        ]);

        foreach (['A', 'B', 'C', 'D', 'E', 'F', 'G'] as $colID) {
            $sheet2->getColumnDimension($colID)->setAutoSize(true);
        }

        // Set active sheet and filename based on report_type
        if ($reportType === 'detailed') {
            $spreadsheet->setActiveSheetIndex(1);
            $filename = 'detailed_loan_decisions_report_' . Carbon::now()->format('Y_m_d_His') . '.xlsx';
        } elseif ($reportType === 'date_wise') {
            $spreadsheet->setActiveSheetIndex(2);
            $filename = 'date_wise_loan_report_' . Carbon::now()->format('Y_m_d_His') . '.xlsx';
        } else {
            $spreadsheet->setActiveSheetIndex(0);
            $filename = 'approver_wise_loan_summary_' . Carbon::now()->format('Y_m_d_His') . '.xlsx';
        }
        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'max-age=0',
        ]);
    }

    /**
     * Build report Eloquent query with filters
     */
    protected function buildReportQuery(
        Request $request,
        string $dateFrom,
        string $dateTo,
        ?int $userId,
        User $viewer,
        string $decisionStatus = 'all'
    ) {
        $query = LoanApplicationApproval::query()
            ->whereNotNull('loan_application_approvals.approved_at')
            ->whereBetween('loan_application_approvals.approved_at', [
                Carbon::parse($dateFrom)->startOfDay(),
                Carbon::parse($dateTo)->endOfDay(),
            ])
            ->whereHas('loanApplication') // Strictly exclude orphan approvals of deleted loans
            ->with([
                'user:id,name,email,role_id,branch_id',
                'user.role:id,name,display_name',
                'user.branch:id,name,code',
                'loanApplication' => function ($q) {
                    $q->select([
                        'id', 'application_no', 'member_admission_id', 'loan_product_id',
                        'loan_category_id', 'branch_id', 'samity_id', 'status',
                        'requested_amount', 'approved_amount', 'submitted_at', 'created_at',
                    ])->with([
                        'memberAdmission:id,applicant_name_en,applicant_name_bn,mobile_number,application_no',
                        'loanProduct:id,product_name,product_name_bn,product_code',
                        'loanCategory:id,category_name,category_name_bn',
                        'branch:id,name,code,area_id',
                        'branch.area:id,name,zone_id',
                        'branch.area.zone:id,name',
                        'samity:id,samity_name,samity_name_bn,samity_code',
                    ]);
                },
            ]);

        // Filter by Decision Status (All, Approved, Rejected)
        if ($decisionStatus === 'approved') {
            $query->where('loan_application_approvals.status', 'approved');
        } elseif ($decisionStatus === 'rejected') {
            $query->where('loan_application_approvals.status', 'rejected');
        } else {
            $query->whereIn('loan_application_approvals.status', ['approved', 'rejected']);
        }

        // Filter by Approver (User)
        if ($userId) {
            $query->where('loan_application_approvals.user_id', $userId);
        }

        // Branch / Area / Zone filters on the loan application
        $branchId = $request->input('branch_id');
        $areaId = $request->input('area_id');
        $zoneId = $request->input('zone_id');

        if ($branchId) {
            $query->whereHas('loanApplication', fn ($q) => $q->where('branch_id', $branchId));
        } elseif ($areaId) {
            $query->whereHas('loanApplication.branch', fn ($q) => $q->where('area_id', $areaId));
        } elseif ($zoneId) {
            $query->whereHas('loanApplication.branch.area', fn ($q) => $q->where('zone_id', $zoneId));
        }

        // Scoping for non-head-office users
        if ($this->shouldRestrictToAccessibleBranches($viewer)) {
            $accessibleIds = $this->accessibleBranchIds($viewer);
            $query->whereHas('loanApplication', fn ($q) => $q->whereIn('branch_id', $accessibleIds ?: [0]));
        }

        // Search filter
        $search = $request->input('search');
        if (! empty($search)) {
            $query->where(function ($sub) use ($search) {
                $sub->whereHas('loanApplication', function ($lq) use ($search) {
                    $lq->where('application_no', 'like', "%{$search}%")
                        ->orWhereHas('memberAdmission', function ($mq) use ($search) {
                            $mq->where('applicant_name_bn', 'like', "%{$search}%")
                                ->orWhere('applicant_name_en', 'like', "%{$search}%")
                                ->orWhere('application_no', 'like', "%{$search}%")
                                ->orWhere('mobile_number', 'like', "%{$search}%");
                        });
                })->orWhereHas('user', function ($uq) use ($search) {
                    $uq->where('name', 'like', "%{$search}%");
                });
            });
        }

        return $query;
    }

    /**
     * Format a single approval record for frontend / export
     */
    protected function formatApprovalRow(LoanApplicationApproval $approval): array
    {
        $loan = $approval->loanApplication;
        $member = $loan?->memberAdmission;
        $product = $loan?->loanProduct;
        $category = $loan?->loanCategory;
        $branch = $loan?->branch;
        $user = $approval->user;

        $approvedAmount = (float) ($loan?->approved_amount ?: ($loan?->requested_amount ?? 0));
        $requestedAmount = (float) ($loan?->requested_amount ?? 0);
        $isRejected = $approval->status === 'rejected';

        return [
            'id' => $approval->id,
            'loan_id' => $loan?->id,
            'approval_date' => $approval->approved_at ? Carbon::parse($approval->approved_at)->format('d/m/Y') : '—',
            'approval_time' => $approval->approved_at ? Carbon::parse($approval->approved_at)->format('h:i A') : '—',
            'approved_at_raw' => (string) $approval->approved_at,
            'level' => $approval->level,
            'level_label' => ApprovalService::approvalLevelLabel($approval->level),
            'action_status' => $approval->status, // 'approved' | 'rejected'
            'action_status_label' => $isRejected ? 'বাতিলকৃত / প্রত্যাখ্যাত' : 'অনুমোদিত',
            'comments' => $approval->comments,
            'approver_id' => $user?->id,
            'approver_name' => $user?->name ?? 'N/A',
            'approver_role' => $user?->role?->display_name ?: ($user?->role?->name ?? 'N/A'),
            'application_no' => $loan?->application_no ?? 'N/A',
            'member_name' => $member?->applicant_name_bn ?: ($member?->applicant_name_en ?? 'N/A'),
            'member_code' => $member?->application_no ?? 'N/A',
            'member_mobile' => $member?->mobile_number ?? '—',
            'product_name' => $product?->product_name_bn ?: ($product?->product_name ?? 'N/A'),
            'product_code' => $product?->product_code ?? '',
            'category_name' => $category?->category_name_bn ?: ($category?->category_name ?? 'N/A'),
            'branch_name' => $branch?->name ?? 'N/A',
            'branch_code' => $branch?->code ?? '',
            'area_name' => $branch?->area?->name ?? 'N/A',
            'zone_name' => $branch?->area?->zone?->name ?? 'N/A',
            'samity_name' => $loan?->samity?->samity_name_bn ?: ($loan?->samity?->samity_name ?? '—'),
            'requested_amount' => $requestedAmount,
            'approved_amount' => $isRejected ? 0 : $approvedAmount,
            'display_amount' => $isRejected ? $requestedAmount : $approvedAmount,
            'loan_status' => $loan?->status ?? '',
            'loan_status_label' => $this->getStatusLabel($loan?->status ?? ''),
        ];
    }

    /**
     * Build date-wise breakdown summary using accurate SQL aggregation
     */
    protected function buildDateSummaryFromQuery($baseQuery): array
    {
        $sub = (clone $baseQuery)
            ->join('loan_applications as la', 'la.id', '=', 'loan_application_approvals.loan_application_id')
            ->select(
                DB::raw('DATE(loan_application_approvals.approved_at) as approval_date'),
                'loan_application_approvals.user_id',
                'loan_application_approvals.loan_application_id',
                'loan_application_approvals.status as approval_status',
                DB::raw('COALESCE(la.approved_amount, la.requested_amount, 0) as loan_amount')
            )
            ->distinct();

        $approverPerDate = DB::query()->fromSub($sub, 's')
            ->join('users as u', 'u.id', '=', 's.user_id')
            ->leftJoin('roles as r', 'r.id', '=', 'u.role_id')
            ->select(
                's.approval_date',
                's.user_id',
                'u.name as user_name',
                'r.name as role_slug',
                'r.display_name as role_display_name',
                DB::raw("COUNT(CASE WHEN s.approval_status = 'approved' THEN s.loan_application_id END) as approved_count"),
                DB::raw("SUM(CASE WHEN s.approval_status = 'approved' THEN s.loan_amount ELSE 0 END) as approved_amount"),
                DB::raw("COUNT(CASE WHEN s.approval_status = 'rejected' THEN s.loan_application_id END) as rejected_count"),
                DB::raw("SUM(CASE WHEN s.approval_status = 'rejected' THEN s.loan_amount ELSE 0 END) as rejected_amount"),
                DB::raw('COUNT(s.loan_application_id) as total_loans'),
                DB::raw('SUM(s.loan_amount) as total_amount')
            )
            ->groupBy('s.approval_date', 's.user_id', 'u.name', 'r.name', 'r.display_name')
            ->get();

        $grouped = $approverPerDate->groupBy('approval_date');
        $dateSummary = [];

        foreach ($grouped as $dateStr => $rows) {
            $totalLoans = $rows->sum('total_loans');
            $totalAmount = $rows->sum('total_amount');
            $approvedCount = $rows->sum('approved_count');
            $approvedAmount = $rows->sum('approved_amount');
            $rejectedCount = $rows->sum('rejected_count');
            $rejectedAmount = $rows->sum('rejected_amount');

            $approvers = $rows->map(function ($row) {
                return [
                    'user_id' => (int) $row->user_id,
                    'user_name' => $row->user_name,
                    'role_name' => $row->role_display_name ?: ($row->role_slug ?? 'N/A'),
                    'role_rank' => $this->getRoleHierarchyRank($row->role_slug),
                    'loans_count' => (int) $row->total_loans,
                    'approved_count' => (int) $row->approved_count,
                    'approved_amount' => (float) $row->approved_amount,
                    'rejected_count' => (int) $row->rejected_count,
                    'rejected_amount' => (float) $row->rejected_amount,
                    'total_amount' => (float) $row->total_amount,
                ];
            })->sortBy('role_rank')->values()->all();

            $dateSummary[] = [
                'date' => $dateStr,
                'formatted_date' => Carbon::parse($dateStr)->format('d/m/Y'),
                'total_loans' => (int) $totalLoans,
                'total_amount' => (float) $totalAmount,
                'approved_count' => (int) $approvedCount,
                'approved_amount' => (float) $approvedAmount,
                'rejected_count' => (int) $rejectedCount,
                'rejected_amount' => (float) $rejectedAmount,
                'approvers' => $approvers,
            ];
        }

        usort($dateSummary, fn ($a, $b) => strcmp($b['date'], $a['date']));
        return $dateSummary;
    }

    /**
     * Backward compatible wrapper for buildDateSummary
     */
    protected function buildDateSummary($approvalsCollection): array
    {
        return [];
    }

    /**
     * Role hierarchy rank for sorting approvers:
     * 1. Executive Director (ED)
     * 2. DMF (Director Microfinance)
     * 3. ADMF (Assistant Director Microfinance)
     * 4. Zone Manager (ZONE)
     * 5. Area Manager (REGIONAL)
     * 6. Branch Manager (BRANCH MANAGER)
     */
    protected function getRoleHierarchyRank(?string $roleName): int
    {
        return match ($roleName) {
            Role::ED, 'ed' => 1,
            Role::DMF, 'dmf' => 2,
            Role::ADMF, 'admf' => 3,
            Role::ZONE_MANAGER, 'zone_manager' => 4,
            Role::AREA_MANAGER, 'area_manager' => 5,
            Role::BRANCH_MANAGER, 'branch_manager' => 6,
            Role::HEAD_OFFICE, 'head_office' => 7,
            Role::SUPER_ADMIN, 'super_admin' => 8,
            Role::CSO, 'cso' => 9,
            Role::FIELD_OFFICER, 'field_officer' => 10,
            default => 99,
        };
    }

    /**
     * Build approver-wise breakdown summary across entire range with accurate SQL aggregation
     */
    protected function buildApproverSummaryFromQuery($baseQuery): array
    {
        // Subquery: unique (user_id, loan_application_id) with loan amount and action counts
        $subQuery = (clone $baseQuery)
            ->join('loan_applications as la', 'la.id', '=', 'loan_application_approvals.loan_application_id')
            ->select(
                'loan_application_approvals.user_id',
                'loan_application_approvals.loan_application_id',
                DB::raw('COALESCE(la.approved_amount, la.requested_amount, 0) as loan_amount'),
                DB::raw("SUM(CASE WHEN loan_application_approvals.status = 'approved' THEN 1 ELSE 0 END) as approved_actions"),
                DB::raw("SUM(CASE WHEN loan_application_approvals.status = 'rejected' THEN 1 ELSE 0 END) as rejected_actions"),
                DB::raw('COUNT(loan_application_approvals.id) as actions_count')
            )
            ->groupBy(
                'loan_application_approvals.user_id',
                'loan_application_approvals.loan_application_id',
                'la.approved_amount',
                'la.requested_amount'
            );

        $raw = DB::query()->fromSub($subQuery, 't')
            ->join('users as u', 'u.id', '=', 't.user_id')
            ->leftJoin('roles as r', 'r.id', '=', 'u.role_id')
            ->leftJoin('branches as b', 'b.id', '=', 'u.branch_id')
            ->select(
                't.user_id',
                'u.name as user_name',
                'r.name as role_slug',
                'r.display_name as role_display_name',
                'b.name as branch_name',
                DB::raw('COUNT(t.loan_application_id) as total_loans'),
                DB::raw('SUM(t.actions_count) as total_actions'),
                DB::raw("COUNT(CASE WHEN t.approved_actions > 0 THEN t.loan_application_id END) as approved_loans"),
                DB::raw("SUM(t.approved_actions) as approved_actions_count"),
                DB::raw("COUNT(CASE WHEN t.rejected_actions > 0 THEN t.loan_application_id END) as rejected_loans"),
                DB::raw("SUM(t.rejected_actions) as rejected_actions_count"),
                DB::raw("SUM(CASE WHEN t.approved_actions > 0 THEN t.loan_amount ELSE 0 END) as approved_amount"),
                DB::raw("SUM(CASE WHEN t.rejected_actions > 0 THEN t.loan_amount ELSE 0 END) as rejected_amount"),
                DB::raw('SUM(t.loan_amount) as total_amount')
            )
            ->groupBy('t.user_id', 'u.name', 'r.name', 'r.display_name', 'b.name')
            ->get();

        $approverSummary = $raw->map(function ($row) {
            $roleSlug = $row->role_slug;
            $approvedLoans = (int) $row->approved_loans;
            $approvedActions = (int) $row->approved_actions_count;
            $reapprovalsCount = max(0, $approvedActions - $approvedLoans);

            return [
                'user_id' => (int) $row->user_id,
                'user_name' => $row->user_name ?? 'N/A',
                'role_slug' => $roleSlug,
                'role_rank' => $this->getRoleHierarchyRank($roleSlug),
                'role_name' => $row->role_display_name ?: ($roleSlug ?? 'N/A'),
                'branch_name' => $row->branch_name ?? 'হেড অফিস / সর্বজনীন',
                'total_loans' => (int) $row->total_loans,
                'total_actions' => (int) $row->total_actions,
                'total_approvals' => $approvedActions,
                'approved_loans' => $approvedLoans,
                'approved_amount' => (float) $row->approved_amount,
                'reapprovals_count' => $reapprovalsCount,
                'rejected_loans' => (int) $row->rejected_loans,
                'rejected_actions' => (int) $row->rejected_actions_count,
                'rejected_amount' => (float) $row->rejected_amount,
                'total_amount' => (float) $row->total_amount,
            ];
        })->all();

        // Sort by role hierarchy rank, then total loans descending, then name
        usort($approverSummary, function ($a, $b) {
            if ($a['role_rank'] !== $b['role_rank']) {
                return $a['role_rank'] <=> $b['role_rank'];
            }
            if ($b['total_loans'] !== $a['total_loans']) {
                return $b['total_loans'] <=> $a['total_loans'];
            }
            return strcmp($a['user_name'], $b['user_name']);
        });

        return $approverSummary;
    }

    /**
     * Backward compatible wrapper for buildApproverSummary
     */
    protected function buildApproverSummary($approvalsCollection): array
    {
        return [];
    }

    /**
     * List of approvers for the dropdown filter, ordered by hierarchy
     */
    protected function getApproversDropdownList(User $viewer): array
    {
        $approverRoleNames = [
            Role::BRANCH_MANAGER,
            Role::AREA_MANAGER,
            Role::ZONE_MANAGER,
            Role::HEAD_OFFICE,
            Role::SUPER_ADMIN,
            Role::ED,
            Role::ADMF,
            Role::DMF,
        ];

        $query = User::query()
            ->where(function ($q) use ($approverRoleNames) {
                $q->whereHas('role', fn ($rq) => $rq->whereIn('name', $approverRoleNames))
                    ->orWhereHas('loanApplicationApprovals', fn ($aq) => $aq->whereIn('status', ['approved', 'rejected']));
            })
            ->with(['role:id,name,display_name', 'branch:id,name,code']);

        if ($this->shouldRestrictToAccessibleBranches($viewer)) {
            $accessibleIds = $this->accessibleBranchIds($viewer);
            $query->where(function ($q) use ($accessibleIds, $viewer) {
                $q->whereIn('branch_id', $accessibleIds ?: [0])
                    ->orWhere('id', $viewer->id);
            });
        }

        $list = $query->get(['id', 'name', 'email', 'role_id', 'branch_id'])->map(function ($u) {
            $roleSlug = $u->role?->name;
            return [
                'id' => $u->id,
                'name' => $u->name,
                'role_slug' => $roleSlug,
                'role_rank' => $this->getRoleHierarchyRank($roleSlug),
                'role_name' => $u->role?->display_name ?: ($roleSlug ?? 'N/A'),
                'branch_name' => $u->branch?->name ?? '',
            ];
        })->all();

        // Sort dropdown by hierarchy
        usort($list, function ($a, $b) {
            if ($a['role_rank'] !== $b['role_rank']) {
                return $a['role_rank'] <=> $b['role_rank'];
            }
            return strcmp($a['name'], $b['name']);
        });

        return $list;
    }

    /**
     * Bengali status label
     */
    protected function getStatusLabel(string $status): string
    {
        return match ($status) {
            'draft' => 'খসড়া',
            'submitted' => 'দাখিলকৃত',
            'under_review' => 'পর্যালোচনাধীন',
            'ready_for_head_office', 'pending_head_office' => 'হেড অফিস অপেক্ষমাণ',
            'approved' => 'অনুমোদিত',
            'pending_disbursement' => 'বিতরণ অপেক্ষমাণ',
            'disbursed' => 'বিতরণকৃত',
            'rejected' => 'প্রত্যাখ্যাত',
            'needs_correction' => 'সংশোধন প্রয়োজন',
            default => ucfirst(str_replace('_', ' ', $status)),
        };
    }

    /**
     * Recursively ensure all string contents are valid UTF-8
     */
    protected function cleanUtf8(mixed $data): mixed
    {
        if (is_string($data)) {
            if (! mb_check_encoding($data, 'UTF-8')) {
                $data = mb_convert_encoding($data, 'UTF-8', 'UTF-8, Windows-1252, ISO-8859-1');
            }
            return iconv('UTF-8', 'UTF-8//IGNORE', $data);
        }

        if (is_array($data)) {
            $cleaned = [];
            foreach ($data as $key => $value) {
                $cleanedKey = is_string($key) ? iconv('UTF-8', 'UTF-8//IGNORE', $key) : $key;
                $cleaned[$cleanedKey] = $this->cleanUtf8($value);
            }
            return $cleaned;
        }

        return $data;
    }
}
