<?php

namespace App\Http\Controllers;

use App\Models\Area;
use App\Models\Branch;
use App\Models\MemberAdmission;
use App\Models\Samity;
use App\Models\Zone;
use App\Services\AppRegistrationService;
use App\Services\MemberCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AppRegistrationController extends Controller
{
    public function __construct(
        protected AppRegistrationService $registrationService
    ) {}

    /**
     * One-click toggle switch from Member Admissions list
     */
    public function toggle(Request $request, MemberAdmission $memberAdmission): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        $result = $this->registrationService->toggleAdmissionRegistration(
            $memberAdmission,
            $user,
            $request->has('force_state') ? $request->boolean('force_state') : null
        );

        if (! $result['ok']) {
            if ($request->wantsJson()) {
                return response()->json($result, 403);
            }

            return back()->with('error', $result['message']);
        }

        if ($request->wantsJson()) {
            return response()->json($result);
        }

        return back()->with('success', $result['message']);
    }

    /**
     * Single entry store
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'samity_id' => 'nullable|exists:samities,id',
            'member_code' => 'required|string|max:50',
            'member_name' => 'required|string|max:191',
            'phone_number' => 'nullable|string|max:30',
            'remarks' => 'nullable|string|max:255',
        ]);

        $result = $this->registrationService->registerSingle($validated, $user);

        if (! $result['ok']) {
            if ($request->wantsJson()) {
                return response()->json($result, 403);
            }

            return back()->with('error', $result['message']);
        }

        if ($request->wantsJson()) {
            return response()->json($result);
        }

        return back()->with('success', $result['message']);
    }

    /**
     * Get all branches available for selection in modal
     */
    public function getBranches(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->has_all_access || $user->isSuperAdmin() || $user->isHeadOffice()) {
            $branches = Branch::where('is_active', true)->orderBy('code')->get(['id', 'name', 'code', 'area_id']);
        } else {
            $branches = $user->getAccessibleBranches();
            if ($branches->isEmpty()) {
                $branches = Branch::where('is_active', true)->orderBy('code')->get(['id', 'name', 'code', 'area_id']);
            } else {
                $branches = $branches->sortBy('code')->values();
            }
        }

        return response()->json($branches);
    }

    /**
     * Get samities for the selected branch
     */
    public function getSamitiesByBranch(Request $request): JsonResponse
    {
        $branchId = (int) $request->input('branch_id');
        if (! $branchId) {
            return response()->json([]);
        }

        $samities = Samity::where('branch_id', $branchId)
            ->where('is_active', true)
            ->orderBy('samity_name')
            ->get(['id', 'samity_code', 'samity_name', 'samity_name_bn', 'branch_id']);

        return response()->json($samities);
    }

    /**
     * Quick lookup of member admission by code & branch for auto-filling
     */
    public function lookupMember(Request $request): JsonResponse
    {
        $branchId = (int) $request->input('branch_id');
        $code = trim((string) $request->input('member_code'));

        if (! $branchId || $code === '') {
            return response()->json(['found' => false]);
        }

        $branch = Branch::find($branchId);
        $clean = MemberCodeService::toEnglishDigits($code);
        $digitsOnly = preg_replace('/\D/', '', $clean);
        $branchPrefix = MemberCodeService::formatBranchCode($branch?->code ?? $branchId);

        if ($digitsOnly !== '' && strlen($digitsOnly) <= 6) {
            $formattedCode = MemberCodeService::formatFullCode($branchPrefix, $digitsOnly);
        } else {
            $formattedCode = $clean;
        }

        $admission = MemberAdmission::where('branch_id', $branchId)
            ->where(function ($q) use ($formattedCode, $digitsOnly) {
                $q->where('application_no', $formattedCode);
                if ($digitsOnly !== '' && strlen($digitsOnly) <= 6) {
                    $padded = str_pad($digitsOnly, 6, '0', STR_PAD_LEFT);
                    $q->orWhere('application_no', 'like', "%{$padded}");
                }
            })
            ->first();

        if ($admission) {
            return response()->json([
                'found' => true,
                'member_code' => $admission->application_no,
                'member_name' => $admission->applicant_name_bn ?: $admission->applicant_name_en,
                'phone_number' => $admission->mobile_number,
                'samity_id' => $admission->samity_id,
                'is_app_registered' => (bool) $admission->is_app_registered,
            ]);
        }

        return response()->json(['found' => false]);
    }

    /**
     * Bulk Excel Upload
     */
    public function bulkUpload(Request $request): JsonResponse|RedirectResponse
    {
        $user = $request->user();

        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240',
            'branch_id' => 'nullable|exists:branches,id',
        ]);

        $file = $request->file('file');
        $result = $this->registrationService->importExcel(
            $file->getRealPath(),
            $request->filled('branch_id') ? (int) $request->branch_id : null,
            $user
        );

        if (! $result['ok']) {
            if ($request->wantsJson()) {
                return response()->json($result, 403);
            }

            return back()->with('error', $result['message']);
        }

        if ($request->wantsJson()) {
            return response()->json($result);
        }

        if ($result['ok']) {
            return back()->with('success', $result['message']);
        }

        return back()->with('error', $result['message']);
    }

    /**
     * Download sample Excel template
     */
    public function downloadTemplate(): StreamedResponse
    {
        return $this->registrationService->generateSampleExcelTemplate();
    }

    /**
     * App Registration Report (Branch Summary + Ledger)
     */
    public function report(Request $request): Response
    {
        $user = $request->user();
        $filters = $request->only([
            'zone_id',
            'area_id',
            'branch_id',
            'samity_id',
            'source',
            'from_date',
            'to_date',
            'search',
            'tab',
            'per_page',
        ]);

        $activeTab = $request->input('tab', 'summary');
        $perPage = (int) $request->input('per_page', 25);
        if ($perPage < 10 || $perPage > 200) {
            $perPage = 25;
        }

        // Accessible branches
        $accessibleBranches = $user->getAccessibleBranches()->sortBy('code')->values();
        if ($accessibleBranches->isEmpty()) {
            $accessibleBranches = Branch::all()->sortBy('code')->values();
        }

        $branches = $accessibleBranches->map(fn ($b) => [
            'id' => $b->id,
            'name' => $b->name,
            'code' => $b->code,
            'area_id' => $b->area_id,
        ])->values();

        $areaIds = $branches->pluck('area_id')->filter()->unique();
        $areas = Area::whereIn('id', $areaIds)->orderBy('name')->get(['id', 'name', 'code', 'zone_id']);
        $zoneIds = $areas->pluck('zone_id')->filter()->unique();
        $zones = Zone::whereIn('id', $zoneIds)->orderBy('name')->get(['id', 'name', 'code']);

        // Samities for selected branch or user's branch
        $branchIdFilter = ! empty($filters['branch_id']) ? (int) $filters['branch_id'] : ($user->branch_id ?: null);
        $samities = [];
        if ($branchIdFilter) {
            $samities = Samity::where('branch_id', $branchIdFilter)
                ->orderBy('samity_name')
                ->get(['id', 'samity_name', 'samity_code', 'branch_id']);
        }

        $summaryData = $this->registrationService->getBranchSummaryReport($filters, $user);
        $ledgerData = $this->registrationService->getLedgerReport($filters, $user, $perPage);

        return Inertia::render('Reports/AppRegistrationReport', [
            'summary' => $summaryData,
            'ledger' => $ledgerData,
            'zones' => $zones,
            'areas' => $areas,
            'branches' => $branches,
            'samities' => $samities,
            'filters' => array_merge($filters, [
                'tab' => $activeTab,
                'per_page' => $perPage,
            ]),
        ]);
    }

    /**
     * Export Ledger to Excel
     */
    public function exportLedgerExcel(Request $request): StreamedResponse
    {
        $user = $request->user();
        $filters = $request->only([
            'zone_id',
            'area_id',
            'branch_id',
            'samity_id',
            'source',
            'from_date',
            'to_date',
            'search',
        ]);

        // Fetch all matching records without pagination
        $accessibleBranches = $user->getAccessibleBranches();
        if ($accessibleBranches->isEmpty()) {
            $accessibleBranches = Branch::all();
        }
        $accessibleBranchIds = $accessibleBranches->pluck('id')->toArray();

        $query = \App\Models\AppRegistration::query()
            ->with([
                'branch:id,name,code,area_id',
                'branch.area:id,name,zone_id',
                'branch.area.zone:id,name',
                'samity:id,samity_name,samity_code',
                'registeredByUser:id,name,username',
            ])
            ->whereIn('branch_id', $accessibleBranchIds)
            ->where('is_registered', true);

        if (! empty($filters['branch_id'])) {
            $query->where('branch_id', (int) $filters['branch_id']);
        } elseif (! empty($filters['area_id'])) {
            $query->whereHas('branch', fn ($q) => $q->where('area_id', (int) $filters['area_id']));
        } elseif (! empty($filters['zone_id'])) {
            $query->whereHas('branch.area', fn ($q) => $q->where('zone_id', (int) $filters['zone_id']));
        }

        if (! empty($filters['samity_id'])) {
            $query->where('samity_id', (int) $filters['samity_id']);
        }

        if (! empty($filters['source'])) {
            $query->where('registration_source', $filters['source']);
        }

        if (! empty($filters['from_date'])) {
            $query->where('registered_at', '>=', \Illuminate\Support\Carbon::parse($filters['from_date'])->startOfDay());
        }

        if (! empty($filters['to_date'])) {
            $query->where('registered_at', '<=', \Illuminate\Support\Carbon::parse($filters['to_date'])->endOfDay());
        }

        if (! empty($filters['search'])) {
            $clean = MemberCodeService::toEnglishDigits(trim($filters['search']));
            $query->where(function ($q) use ($clean) {
                $q->where('member_code', 'like', "%{$clean}%")
                    ->orWhere('member_name', 'like', "%{$clean}%")
                    ->orWhere('phone_number', 'like', "%{$clean}%");
            });
        }

        $records = $query->orderBy('registered_at', 'desc')->get();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('App_Registration_Ledger');

        // Headers
        $headers = [
            'A1' => 'ক্রমিক নং',
            'B1' => 'তারিখ ও সময়',
            'C1' => 'জোন',
            'D1' => 'এরিয়া',
            'E1' => 'ব্রাঞ্চ নাম ও কোড',
            'F1' => 'সমিতি',
            'G1' => 'সদস্য কোড',
            'H1' => 'সদস্যের নাম',
            'I1' => 'মোবাইল নম্বর',
            'J1' => 'এন্ট্রির উৎস',
            'K1' => 'এন্ট্রি করেছেন',
        ];

        foreach ($headers as $cell => $text) {
            $sheet->setCellValue($cell, $text);
        }

        $headerStyle = [
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 10],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '0F172A'], // Slate-900
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
            'borders' => [
                'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CBD5E1']],
            ],
        ];
        $sheet->getStyle('A1:K1')->applyFromArray($headerStyle);
        $sheet->getRowDimension(1)->setRowHeight(28);

        $sourceLabels = [
            'admission_switch' => 'ভর্তি তালিকা সুইচ',
            'single_entry' => 'একক এন্ট্রি',
            'bulk_excel' => 'বাল্ক এক্সেল',
        ];

        $rowIdx = 2;
        foreach ($records as $index => $item) {
            $sheet->setCellValue("A{$rowIdx}", $index + 1);
            $sheet->setCellValue("B{$rowIdx}", $item->registered_at ? $item->registered_at->format('d/m/Y h:i A') : '-');
            $sheet->setCellValue("C{$rowIdx}", $item->branch?->area?->zone?->name ?? '-');
            $sheet->setCellValue("D{$rowIdx}", $item->branch?->area?->name ?? '-');
            $sheet->setCellValue("E{$rowIdx}", ($item->branch?->name ?? '-').' ('.($item->branch?->code ?? '-').')');
            $sheet->setCellValue("F{$rowIdx}", $item->samity?->samity_name ? ($item->samity->samity_name.' ('.$item->samity->samity_code.')') : '-');
            $sheet->setCellValueExplicit("G{$rowIdx}", (string) $item->member_code, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
            $sheet->setCellValue("H{$rowIdx}", $item->member_name);
            $sheet->setCellValueExplicit("I{$rowIdx}", (string) ($item->phone_number ?? '-'), \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
            $sheet->setCellValue("J{$rowIdx}", $sourceLabels[$item->registration_source] ?? $item->registration_source);
            $sheet->setCellValue("K{$rowIdx}", $item->registeredByUser?->name ?? '-');
            $rowIdx++;
        }

        foreach (range('A', 'K') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        return new StreamedResponse(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="App_Registration_Ledger_'.now()->format('Ymd_His').'.xlsx"',
            'Cache-Control' => 'max-age=0',
        ]);
    }
}

