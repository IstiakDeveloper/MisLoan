<?php

namespace App\Http\Controllers;

use App\Models\Samity;
use App\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\IOFactory;

class SamityController extends Controller
{
    public function index(Request $request)
    {
        $query = Samity::with(['branch.area.zone']);

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('samity_name', 'like', "%{$search}%")
                  ->orWhere('samity_code', 'like', "%{$search}%")
                  ->orWhere('samity_name_bn', 'like', "%{$search}%");
            });
        }

        $samities = $query->orderBy('created_at', 'desc')->paginate($request->integer('per_page', 50))->withQueryString();

        $branches = Branch::active()
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        return Inertia::render('Organization/Samity/Index', [
            'samities' => $samities,
            'branches' => $branches,
            'filters' => $request->only(['search', 'branch_id']),
        ]);
    }

    public function create()
    {
        $branches = Branch::with(['area.zone'])
            ->active()
            ->orderBy('name')
            ->get();

        return Inertia::render('Organization/Samity/Create', [
            'branches' => $branches,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'samity_code' => 'required|string|unique:samities,samity_code',
            'samity_name' => 'required|string|max:255',
            'samity_name_bn' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        Samity::create($validated);

        return redirect()->route('samities.index')
            ->with('success', 'Samity created successfully!');
    }

    public function edit(Samity $samity)
    {
        $samity->load(['branch.area.zone']);

        $branches = Branch::with(['area.zone'])
            ->active()
            ->orderBy('name')
            ->get();

        return Inertia::render('Organization/Samity/Edit', [
            'samity' => $samity,
            'branches' => $branches,
        ]);
    }

    public function update(Request $request, Samity $samity)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'samity_code' => 'required|string|unique:samities,samity_code,' . $samity->id,
            'samity_name' => 'required|string|max:255',
            'samity_name_bn' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $samity->update($validated);

        return redirect()->route('samities.index')
            ->with('success', 'Samity updated successfully!');
    }

    public function destroy(Samity $samity)
    {
        if ($samity->memberAdmissions()->count() > 0) {
            return back()->with('error', 'Cannot delete samity with existing member admissions!');
        }

        $samity->delete();

        return redirect()->route('samities.index')
            ->with('success', 'Samity deleted successfully!');
    }

    public function getByBranch(Request $request, $branchId)
    {
        $query = Samity::where('branch_id', $branchId)
            ->active();

        if ($request->filled('search')) {
            $search = $request->get('search');

            $query->where(function ($q) use ($search) {
                $q->where('samity_name', 'like', "%{$search}%")
                    ->orWhere('samity_code', 'like', "%{$search}%")
                    ->orWhere('samity_name_bn', 'like', "%{$search}%");
            });
        }

        if ($request->filled('limit')) {
            $query->limit((int) $request->get('limit', 50));
        }

        $samities = $query
            ->orderBy('samity_name')
            ->get(['id', 'samity_code', 'samity_name', 'samity_name_bn']);

        return response()->json($samities);
    }

    public function exportExcel(Request $request)
    {
        $query = Samity::with(['branch']);

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('samity_name', 'like', "%{$search}%")
                  ->orWhere('samity_code', 'like', "%{$search}%")
                  ->orWhere('samity_name_bn', 'like', "%{$search}%");
            });
        }

        $samities = $query->orderBy('samity_code')->get();

        $rows = [];
        foreach ($samities as $s) {
            $rows[] = [
                $s->branch?->code ?? '',
                $s->branch?->name ?? '',
                $s->samity_code ?? '',
                $s->samity_name ?? '',
                $s->samity_name_bn ?? '',
                $s->description ?? '',
                $s->is_active ? 'Active' : 'Inactive',
            ];
        }

        $spreadsheet = $this->buildSamitySpreadsheet($rows);
        $writer = new Xlsx($spreadsheet);
        $fileName = 'samities_export_' . date('Y_m_d_His') . '.xlsx';

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $fileName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'max-age=0',
        ]);
    }

    public function downloadTemplate()
    {
        $firstBranches = Branch::active()->orderBy('name')->limit(2)->get();
        $branch1 = $firstBranches->first();
        $branch2 = $firstBranches->skip(1)->first();

        $sampleRows = [
            [
                $branch1?->code ?? '101',
                $branch1?->name ?? 'Dhaka Main Branch',
                'SAM-101',
                'Bismillah Samity',
                'বিসমিল্লাহ সমিতি',
                'Weekly meeting on Sunday',
                'Active',
            ],
            [
                $branch2?->code ?? '102',
                $branch2?->name ?? 'Chittagong Branch',
                'SAM-102',
                'Al-Madina Samity',
                'আল-মদিনা সমিতি',
                'Weekly meeting on Monday',
                'Active',
            ],
        ];

        $spreadsheet = $this->buildSamitySpreadsheet($sampleRows);
        $writer = new Xlsx($spreadsheet);
        $fileName = 'samity_import_template.xlsx';

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $fileName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'max-age=0',
        ]);
    }

    public function importExcel(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls|max:10240',
        ]);

        $file = $request->file('file');

        try {
            $spreadsheet = IOFactory::load($file->getRealPath());
            $sheet = $spreadsheet->getActiveSheet();
            $highestRow = $sheet->getHighestRow();
        } catch (\Exception $e) {
            return back()->with('error', 'Failed to read Excel file: ' . $e->getMessage());
        }

        // Fast branch lookup maps
        $branches = Branch::all();
        $branchByCodeMap = [];
        $branchByNameMap = [];
        $branchByIdMap = [];

        foreach ($branches as $branch) {
            if ($branch->code) {
                $branchByCodeMap[strtolower(trim((string)$branch->code))] = $branch->id;
            }
            if ($branch->name) {
                $branchByNameMap[strtolower(trim((string)$branch->name))] = $branch->id;
            }
            $branchByIdMap[$branch->id] = $branch->id;
        }

        $createdCount = 0;
        $updatedCount = 0;
        $skippedCount = 0;
        $errors = [];

        DB::beginTransaction();
        try {
            for ($row = 2; $row <= $highestRow; $row++) {
                $branchCode = trim((string)$sheet->getCell("A{$row}")->getValue());
                $branchName = trim((string)$sheet->getCell("B{$row}")->getValue());
                $samityCode = trim((string)$sheet->getCell("C{$row}")->getValue());
                $samityName = trim((string)$sheet->getCell("D{$row}")->getValue());
                $samityNameBn = trim((string)$sheet->getCell("E{$row}")->getValue());
                $description = trim((string)$sheet->getCell("F{$row}")->getValue());
                $statusVal = strtolower(trim((string)$sheet->getCell("G{$row}")->getValue()));

                // Skip blank row
                if ($branchCode === '' && $branchName === '' && $samityCode === '' && $samityName === '') {
                    continue;
                }

                if ($samityCode === '' || $samityName === '') {
                    $skippedCount++;
                    $errors[] = "Row {$row}: Samity Code and Samity Name are required.";
                    continue;
                }

                // Match Branch
                $branchId = null;
                if ($branchCode !== '' && isset($branchByCodeMap[strtolower($branchCode)])) {
                    $branchId = $branchByCodeMap[strtolower($branchCode)];
                } elseif ($branchName !== '' && isset($branchByNameMap[strtolower($branchName)])) {
                    $branchId = $branchByNameMap[strtolower($branchName)];
                } elseif ($branchCode !== '' && isset($branchByIdMap[(int)$branchCode])) {
                    $branchId = $branchByIdMap[(int)$branchCode];
                }

                if (!$branchId) {
                    $skippedCount++;
                    $errors[] = "Row {$row} (Code: {$samityCode}): Branch '{$branchCode}' / '{$branchName}' not found.";
                    continue;
                }

                $isActive = !in_array($statusVal, ['inactive', '0', 'false', 'no', 'অনিষ্ক্রিয়'], true);

                $existing = Samity::where('samity_code', $samityCode)->first();
                if ($existing) {
                    $existing->update([
                        'branch_id' => $branchId,
                        'samity_name' => $samityName,
                        'samity_name_bn' => $samityNameBn ?: null,
                        'description' => $description ?: null,
                        'is_active' => $isActive,
                    ]);
                    $updatedCount++;
                } else {
                    Samity::create([
                        'branch_id' => $branchId,
                        'samity_code' => $samityCode,
                        'samity_name' => $samityName,
                        'samity_name_bn' => $samityNameBn ?: null,
                        'description' => $description ?: null,
                        'is_active' => $isActive,
                    ]);
                    $createdCount++;
                }
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Error during Excel import: ' . $e->getMessage());
        }

        $totalProcessed = $createdCount + $updatedCount;
        $msg = "Import completed successfully! Created: {$createdCount}, Updated: {$updatedCount}.";
        if ($skippedCount > 0) {
            $msg .= " Skipped {$skippedCount} row(s).";
        }

        if (!empty($errors) && $totalProcessed === 0) {
            return back()->with('error', 'Import failed. ' . implode(' | ', array_slice($errors, 0, 3)));
        }

        return redirect()->route('samities.index')->with('success', $msg);
    }

    private function buildSamitySpreadsheet(array $rows): Spreadsheet
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Samities');

        $headers = [
            'Branch Code',
            'Branch Name',
            'Samity Code',
            'Samity Name',
            'Samity Name (Bangla)',
            'Description',
            'Status'
        ];

        $sheet->fromArray([$headers], null, 'A1');

        $headerStyle = [
            'font' => ['bold' => true, 'size' => 11, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1E40AF'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
                'wrapText' => true,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => '1E3A8A'],
                ],
            ],
        ];
        $sheet->getStyle('A1:G1')->applyFromArray($headerStyle);
        $sheet->getRowDimension(1)->setRowHeight(30);

        $widths = [
            'A' => 16,
            'B' => 25,
            'C' => 18,
            'D' => 28,
            'E' => 28,
            'F' => 30,
            'G' => 14,
        ];
        foreach ($widths as $col => $w) {
            $sheet->getColumnDimension($col)->setWidth($w);
        }

        if (!empty($rows)) {
            $sheet->fromArray($rows, null, 'A2');
            $rowCount = count($rows);
            $lastRow = $rowCount + 1;

            for ($r = 2; $r <= $lastRow; $r++) {
                $sheet->getRowDimension($r)->setRowHeight(22);
                $bg = ($r % 2 === 0) ? 'F8FAFC' : 'FFFFFF';

                $sheet->getStyle("A{$r}:G{$r}")->applyFromArray([
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => ['rgb' => $bg],
                    ],
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => Border::BORDER_THIN,
                            'color' => ['rgb' => 'E2E8F0'],
                        ],
                    ],
                ]);

                $sheet->getStyle("A{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("C{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("G{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

                $sheet->getStyle("B{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
                $sheet->getStyle("D{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
                $sheet->getStyle("E{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
                $sheet->getStyle("F{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
            }
        }

        return $spreadsheet;
    }
}
