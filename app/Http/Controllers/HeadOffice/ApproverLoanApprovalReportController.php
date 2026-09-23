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
    public function index(Request $request): Response
    {
        $viewer = $this->ensureCanViewReport($request);

        $dateFrom = $request->input('date_from', Carbon::today()->startOfMonth()->toDateString());
        $dateTo = $request->input('date_to', Carbon::today()->toDateString());
        $userId = $request->filled('user_id') ? (int) $request->input('user_id') : null;
        $search = $request->input('search', '');
        $perPage = (int) $request->input('per_page', 25);
        if (! in_array($perPage, [15, 25, 50, 100, 200], true)) {
            $perPage = 25;
        }

        // Base query
        $query = $this->buildReportQuery($request, $dateFrom, $dateTo, $userId, $viewer);

        // Paginate for the detailed list
        $paginated = (clone $query)
            ->orderBy('approved_at', 'desc')
            ->paginate($perPage)
            ->withQueryString();

        $items = collect($paginated->items())->map(function ($approval) {
            return $this->formatApprovalRow($approval);
        })->all();

        // All matching records for summary and date-wise breakdown (up to 3000 to prevent OOM)
        $allMatching = (clone $query)->orderBy('approved_at', 'desc')->limit(3000)->get();

        // 1. Overall Summary Statistics
        $totalLoansCount = $allMatching->count();
        $totalAmountSum = $allMatching->sum(function ($approval) {
            $loan = $approval->loanApplication;
            return (float) ($loan?->approved_amount ?: ($loan?->requested_amount ?? 0));
        });
        $uniqueApproversCount = $allMatching->pluck('user_id')->unique()->count();

        // 2. Date-wise Summary Breakdown
        $dateSummary = $this->buildDateSummary($allMatching);

        // 3. Approver-wise Summary Breakdown
        $approverSummary = $this->buildApproverSummary($allMatching);

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
                'zone_id' => (string) $request->input('zone_id', ''),
                'area_id' => (string) $request->input('area_id', ''),
                'branch_id' => (string) $request->input('branch_id', ''),
                'search' => (string) $search,
                'per_page' => $perPage,
            ],
            'summary' => [
                'total_loans' => $totalLoansCount,
                'total_amount' => (float) $totalAmountSum,
                'unique_approvers' => $uniqueApproversCount,
                'average_amount' => $totalLoansCount > 0 ? (float) ($totalAmountSum / $totalLoansCount) : 0,
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

        $query = $this->buildReportQuery($request, $dateFrom, $dateTo, $userId, $viewer);
        $allMatching = $query->orderBy('approved_at', 'desc')->limit(1500)->get();

        $items = $allMatching->map(fn ($approval) => $this->formatApprovalRow($approval))->all();

        $totalLoansCount = count($items);
        $totalAmountSum = collect($items)->sum('approved_amount');

        $dateSummary = $this->buildDateSummary($allMatching);
        $approverSummary = $this->buildApproverSummary($allMatching);
        $orgOptions = $this->organizationFilterOptions();
        $selectedApprover = $userId ? User::with('role', 'branch')->find($userId) : null;

        return Inertia::render('HeadOffice/Reports/ApproverLoanApprovalPrint', $this->cleanUtf8([
            'approvals' => $items,
            'filters' => [
                'date_from' => (string) $dateFrom,
                'date_to' => (string) $dateTo,
                'user_id' => $userId ? (string) $userId : '',
                'zone_id' => (string) $request->input('zone_id', ''),
                'area_id' => (string) $request->input('area_id', ''),
                'branch_id' => (string) $request->input('branch_id', ''),
                'search' => (string) $request->input('search', ''),
            ],
            'summary' => [
                'total_loans' => $totalLoansCount,
                'total_amount' => (float) $totalAmountSum,
                'unique_approvers' => $allMatching->pluck('user_id')->unique()->count(),
                'average_amount' => $totalLoansCount > 0 ? (float) ($totalAmountSum / $totalLoansCount) : 0,
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
     * Export report to Excel (.xlsx)
     */
    public function exportExcel(Request $request): StreamedResponse
    {
        $viewer = $this->ensureCanViewReport($request);

        $dateFrom = $request->input('date_from', Carbon::today()->startOfMonth()->toDateString());
        $dateTo = $request->input('date_to', Carbon::today()->toDateString());
        $userId = $request->filled('user_id') ? (int) $request->input('user_id') : null;

        $query = $this->buildReportQuery($request, $dateFrom, $dateTo, $userId, $viewer);
        $approvals = $query->orderBy('approved_at', 'desc')->limit(3000)->get();

        $rows = $approvals->map(fn ($a) => $this->formatApprovalRow($a))->all();
        $dateSummary = $this->buildDateSummary($approvals);
        $selectedApprover = $userId ? User::with('role')->find($userId) : null;

        $spreadsheet = new Spreadsheet();

        // ----------------- SHEET 1: বিস্তারিত ঋণের তালিকা (Detailed Loans) -----------------
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('অনুমোদিত ঋণ তালিকা');

        // Title Block
        $sheet->setCellValue('A1', 'মৌসুমী');
        $sheet->setCellValue('A2', 'উকিলপাড়া, নওগাঁ।');
        $sheet->setCellValue('A3', 'অনুমোদকভিত্তিক ঋণ অনুমোদন রিপোর্ট (Approver Wise Loan Approval Report)');
        $sheet->mergeCells('A1:L1');
        $sheet->mergeCells('A2:L2');
        $sheet->mergeCells('A3:L3');

        $sheet->getStyle('A1:A3')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(16)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FF1E3A8A'));
        $sheet->getStyle('A2')->getFont()->setSize(10)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FF64748B'));
        $sheet->getStyle('A3')->getFont()->setBold(true)->setSize(12)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FF0F172A'));

        // Meta Info Block
        $approverNameText = $selectedApprover
            ? "{$selectedApprover->name} (" . ($selectedApprover->role?->display_name ?: $selectedApprover->role?->name) . ")"
            : 'সকল অনুমোদক (All Approvers)';

        $sheet->setCellValue('A5', 'তারিখ পরিসীমা:');
        $sheet->setCellValue('B5', Carbon::parse($dateFrom)->format('d/m/Y') . ' হতে ' . Carbon::parse($dateTo)->format('d/m/Y'));
        $sheet->setCellValue('D5', 'অনুমোদক / কর্মকর্তা:');
        $sheet->setCellValue('E5', $approverNameText);
        $sheet->setCellValue('H5', 'রিপোর্ট জেনারেট:');
        $sheet->setCellValue('I5', Carbon::now()->format('d/m/Y h:i A'));

        $sheet->getStyle('A5')->getFont()->setBold(true);
        $sheet->getStyle('D5')->getFont()->setBold(true);
        $sheet->getStyle('H5')->getFont()->setBold(true);

        // Summary Counts
        $totalAmountSum = collect($rows)->sum('approved_amount');
        $sheet->setCellValue('A6', 'মোট অনুমোদিত ঋণ:');
        $sheet->setCellValue('B6', count($rows) . ' টি');
        $sheet->setCellValue('D6', 'মোট অনুমোদিত টাকা:');
        $sheet->setCellValue('E6', number_format($totalAmountSum, 2) . ' ৳');
        $sheet->getStyle('A6')->getFont()->setBold(true);
        $sheet->getStyle('D6')->getFont()->setBold(true);
        $sheet->getStyle('E6')->getFont()->setBold(true)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FF059669'));

        // Headers
        $headers = [
            'ক্রমিক',
            'অনুমোদনের তারিখ ও সময়',
            'আবেদন নং',
            'সদস্যের নাম',
            'সদস্য কোড',
            'মোবাইল নং',
            'শাখা',
            'সমিতি',
            'ঋণ প্রোডাক্ট',
            'চাহিদাকৃত টাকা (৳)',
            'অনুমোদিত টাকা (৳)',
            'অনুমোদকের নাম ও পদবী',
            'অনুমোদনের স্তর',
            'মন্তব্য',
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
            $sheet->setCellValue('K' . $currentRow, $row['approved_amount']);
            $sheet->setCellValue('L' . $currentRow, $row['approver_name'] . ' (' . $row['approver_role'] . ')');
            $sheet->setCellValue('M' . $currentRow, $row['level_label']);
            $sheet->setCellValue('N' . $currentRow, $row['comments'] ?: '—');

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
            $sheet->getStyle('M' . $currentRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // Row zebra striping
            if ($index % 2 === 1) {
                $sheet->getStyle("A{$currentRow}:{$lastCol}{$currentRow}")->getFill()->applyFromArray([
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'F8FAFC'],
                ]);
            }

            $currentRow++;
        }

        // Totals Row
        $sheet->setCellValue('A' . $currentRow, 'সর্বমোট (Total):');
        $sheet->mergeCells("A{$currentRow}:I{$currentRow}");
        $sheet->setCellValue('J' . $currentRow, "=SUM(J" . ($headerRow + 1) . ":J" . ($currentRow - 1) . ")");
        $sheet->setCellValue('K' . $currentRow, "=SUM(K" . ($headerRow + 1) . ":K" . ($currentRow - 1) . ")");
        $sheet->setCellValue('L' . $currentRow, count($rows) . ' টি ঋণ অনুমোদন');
        $sheet->mergeCells("L{$currentRow}:N{$currentRow}");

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

        // Auto-fit column widths
        foreach (range('A', $lastCol) as $colID) {
            $sheet->getColumnDimension($colID)->setAutoSize(true);
        }

        // ----------------- SHEET 2: তারিখভিত্তিক সারসংক্ষেপ (Date-wise Summary) -----------------
        $sheet2 = $spreadsheet->createSheet();
        $sheet2->setTitle('তারিখভিত্তিক সারসংক্ষেপ');

        $sheet2->setCellValue('A1', 'মৌসুমী - তারিখভিত্তিক ঋণ অনুমোদন বিবরণী');
        $sheet2->setCellValue('A2', 'তারিখ পরিসীমা: ' . Carbon::parse($dateFrom)->format('d/m/Y') . ' হতে ' . Carbon::parse($dateTo)->format('d/m/Y'));
        $sheet2->mergeCells('A1:E1');
        $sheet2->mergeCells('A2:E2');
        $sheet2->getStyle('A1')->getFont()->setBold(true)->setSize(14)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FF1E3A8A'));
        $sheet2->getStyle('A2')->getFont()->setSize(10)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FF64748B'));

        $dateHeaders = ['ক্রমিক', 'তারিখ', 'অনুমোদিত ঋণের সংখ্যা (টি)', 'অনুমোদিত টাকার পরিমাণ (৳)', 'অনুমোদনকারী কর্মকর্তা ও ব্রেকডাউন'];
        $dRow = 4;
        $dCol = 'A';
        foreach ($dateHeaders as $dText) {
            $sheet2->setCellValue($dCol . $dRow, $dText);
            $dCol++;
        }
        $sheet2->getStyle("A{$dRow}:E{$dRow}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 10],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '0284C7']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $sheet2->getRowDimension($dRow)->setRowHeight(24);

        $curDRow = $dRow + 1;
        foreach ($dateSummary as $idx => $dItem) {
            $approversTxt = collect($dItem['approvers'])->map(function ($ap) {
                return $ap['user_name'] . ' (' . $ap['role_name'] . '): ' . $ap['loans_count'] . ' টি - ' . number_format($ap['total_amount'], 2) . ' ৳';
            })->implode("\n");

            $sheet2->setCellValue('A' . $curDRow, $idx + 1);
            $sheet2->setCellValue('B' . $curDRow, $dItem['formatted_date']);
            $sheet2->setCellValue('C' . $curDRow, $dItem['total_loans']);
            $sheet2->setCellValue('D' . $curDRow, $dItem['total_amount']);
            $sheet2->setCellValue('E' . $curDRow, $approversTxt ?: '—');

            $sheet2->getStyle('A' . $curDRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet2->getStyle('B' . $curDRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet2->getStyle('C' . $curDRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet2->getStyle('D' . $curDRow)->getNumberFormat()->setFormatCode('#,##0.00');
            $sheet2->getStyle('D' . $curDRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
            $sheet2->getStyle('E' . $curDRow)->getAlignment()->setWrapText(true);

            if ($idx % 2 === 1) {
                $sheet2->getStyle("A{$curDRow}:E{$curDRow}")->getFill()->applyFromArray([
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
        $sheet2->setCellValue('E' . $curDRow, '—');

        $sheet2->getStyle("A{$curDRow}:E{$curDRow}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => '0F172A'], 'size' => 10],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E0F2FE']],
        ]);
        $sheet2->getStyle('A' . $curDRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
        $sheet2->getStyle('C' . $curDRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet2->getStyle('D' . $curDRow)->getNumberFormat()->setFormatCode('#,##0.00');
        $sheet2->getStyle('D' . $curDRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

        $sheet2->getStyle("A{$dRow}:E{$curDRow}")->applyFromArray([
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => 'CBD5E1'],
                ],
            ],
        ]);

        foreach (['A', 'B', 'C', 'D', 'E'] as $colID) {
            $sheet2->getColumnDimension($colID)->setAutoSize(true);
        }

        // Set active sheet back to 0
        $spreadsheet->setActiveSheetIndex(0);

        $filename = 'approver_loan_approval_report_' . Carbon::now()->format('Y_m_d_His') . '.xlsx';
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
        User $viewer
    ) {
        $query = LoanApplicationApproval::query()
            ->where('status', 'approved')
            ->whereNotNull('approved_at')
            ->whereBetween('approved_at', [
                Carbon::parse($dateFrom)->startOfDay(),
                Carbon::parse($dateTo)->endOfDay(),
            ])
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

        // Filter by Approver (User)
        if ($userId) {
            $query->where('user_id', $userId);
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

        return [
            'id' => $approval->id,
            'loan_id' => $loan?->id,
            'approval_date' => $approval->approved_at ? Carbon::parse($approval->approved_at)->format('d/m/Y') : '—',
            'approval_time' => $approval->approved_at ? Carbon::parse($approval->approved_at)->format('h:i A') : '—',
            'approved_at_raw' => (string) $approval->approved_at,
            'level' => $approval->level,
            'level_label' => ApprovalService::approvalLevelLabel($approval->level),
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
            'approved_amount' => $approvedAmount,
            'loan_status' => $loan?->status ?? '',
            'loan_status_label' => $this->getStatusLabel($loan?->status ?? ''),
        ];
    }

    /**
     * Build date-wise breakdown summary
     */
    protected function buildDateSummary($approvalsCollection): array
    {
        $grouped = $approvalsCollection->groupBy(function ($item) {
            return Carbon::parse($item->approved_at)->format('Y-m-d');
        });

        $dateSummary = [];
        foreach ($grouped as $dateKey => $itemsOnDate) {
            $dateTotalLoans = $itemsOnDate->count();
            $dateTotalAmount = $itemsOnDate->sum(function ($item) {
                $loan = $item->loanApplication;
                return (float) ($loan?->approved_amount ?: ($loan?->requested_amount ?? 0));
            });

            // Breakdown by approvers on this specific date
            $approversOnDate = $itemsOnDate->groupBy('user_id')->map(function ($userApprovals) {
                $first = $userApprovals->first();
                $u = $first->user;
                $count = $userApprovals->count();
                $sum = $userApprovals->sum(function ($a) {
                    $l = $a->loanApplication;
                    return (float) ($l?->approved_amount ?: ($l?->requested_amount ?? 0));
                });

                return [
                    'user_id' => $u?->id,
                    'user_name' => $u?->name ?? 'N/A',
                    'role_name' => $u?->role?->display_name ?: ($u?->role?->name ?? 'N/A'),
                    'role_rank' => $this->getRoleHierarchyRank($u?->role?->name),
                    'loans_count' => $count,
                    'total_amount' => (float) $sum,
                ];
            })->values()->sortBy('role_rank')->values()->all();

            $dateSummary[] = [
                'date' => $dateKey,
                'formatted_date' => Carbon::parse($dateKey)->format('d/m/Y'),
                'total_loans' => $dateTotalLoans,
                'total_amount' => (float) $dateTotalAmount,
                'approvers' => $approversOnDate,
            ];
        }

        // Sort dates descending
        usort($dateSummary, fn ($a, $b) => strcmp($b['date'], $a['date']));

        return $dateSummary;
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
     * Build approver-wise breakdown summary across entire range
     */
    protected function buildApproverSummary($approvalsCollection): array
    {
        $grouped = $approvalsCollection->groupBy('user_id');

        $approverSummary = [];
        foreach ($grouped as $userId => $itemsForUser) {
            $first = $itemsForUser->first();
            $user = $first->user;
            $count = $itemsForUser->count();
            $sum = $itemsForUser->sum(function ($item) {
                $loan = $item->loanApplication;
                return (float) ($loan?->approved_amount ?: ($loan?->requested_amount ?? 0));
            });

            $roleSlug = $user?->role?->name;
            $approverSummary[] = [
                'user_id' => $user?->id,
                'user_name' => $user?->name ?? 'N/A',
                'role_slug' => $roleSlug,
                'role_rank' => $this->getRoleHierarchyRank($roleSlug),
                'role_name' => $user?->role?->display_name ?: ($roleSlug ?? 'N/A'),
                'branch_name' => $user?->branch?->name ?? 'N/A',
                'total_loans' => $count,
                'total_amount' => (float) $sum,
            ];
        }

        // Sort by role hierarchy rank (ED, DMF, ADMF, Zone, Regional, BM), then loans count descending, then name
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
                    ->orWhereHas('loanApplicationApprovals', fn ($aq) => $aq->where('status', 'approved'));
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
