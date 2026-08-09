<?php

namespace App\Http\Controllers;

use App\Models\SavingsProduct;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\IOFactory;

class SavingsProductController extends Controller
{
    /**
     * List savings products (Head Office).
     */
    public function index(Request $request)
    {
        $products = SavingsProduct::query()
            ->when($request->search, function ($query, $search) {
                $query->where('product_name', 'like', "%{$search}%")
                    ->orWhere('product_name_bn', 'like', "%{$search}%")
                    ->orWhere('product_code', 'like', "%{$search}%");
            })
            ->when($request->deposit_type, function ($query, $type) {
                $query->where('deposit_type', $type);
            })
            ->withCount('savingsApplications')
            ->orderBy('display_order')
            ->orderBy('product_code')
            ->get();

        return Inertia::render('SavingsProducts/Index', [
            'products' => $products,
            'filters' => $request->only(['search', 'deposit_type']),
        ]);
    }

    /**
     * Store new savings product.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_name' => 'required|string|max:255',
            'product_name_bn' => 'nullable|string|max:255',
            'product_code' => 'required|string|max:50|unique:savings_products,product_code',
            'description' => 'nullable|string|max:1000',
            'description_bn' => 'nullable|string|max:1000',
            'deposit_type' => 'required|in:monthly,lump_sum,recurring',
            'duration_months' => 'required|integer|min:1|max:600',
            'min_amount' => 'required|numeric|min:0',
            'max_amount' => 'nullable|numeric|min:0',
            'monthly_installment' => 'nullable|numeric|min:0',
            'interest_rate' => 'required|numeric|min:0|max:100',
            'profit_distribution_type' => 'nullable|in:maturity,monthly,quarterly,yearly',
            'premature_withdrawal_allowed' => 'boolean',
            'premature_withdrawal_penalty' => 'nullable|numeric|min:0|max:100',
            'min_age' => 'nullable|integer|min:0|max:120',
            'max_age' => 'nullable|integer|min:0|max:120',
            'requires_nominee' => 'boolean',
            'is_active' => 'boolean',
            'display_order' => 'nullable|integer|min:0',
        ]);

        $validated['is_active'] = $validated['is_active'] ?? true;
        $validated['requires_nominee'] = $validated['requires_nominee'] ?? true;
        $validated['premature_withdrawal_allowed'] = $validated['premature_withdrawal_allowed'] ?? false;
        $validated['display_order'] = $validated['display_order'] ?? 0;
        $validated['premature_withdrawal_penalty'] = $validated['premature_withdrawal_penalty'] ?? 0;
        $validated['profit_distribution_type'] = $validated['profit_distribution_type'] ?? 'maturity';
        $validated['min_age'] = $validated['min_age'] ?? 18;
        $validated['max_age'] = $validated['max_age'] ?? 70;

        SavingsProduct::create($validated);

        return redirect()->route('savings-products.index')
            ->with('success', 'সঞ্চয় পণ্য সফলভাবে তৈরি হয়েছে।');
    }

    /**
     * Update savings product.
     */
    public function update(Request $request, SavingsProduct $savingsProduct)
    {
        $validated = $request->validate([
            'product_name' => 'required|string|max:255',
            'product_name_bn' => 'nullable|string|max:255',
            'product_code' => 'required|string|max:50|unique:savings_products,product_code,' . $savingsProduct->id,
            'description' => 'nullable|string|max:1000',
            'description_bn' => 'nullable|string|max:1000',
            'deposit_type' => 'required|in:monthly,lump_sum,recurring',
            'duration_months' => 'required|integer|min:1|max:600',
            'min_amount' => 'required|numeric|min:0',
            'max_amount' => 'nullable|numeric|min:0',
            'monthly_installment' => 'nullable|numeric|min:0',
            'interest_rate' => 'required|numeric|min:0|max:100',
            'profit_distribution_type' => 'nullable|in:maturity,monthly,quarterly,yearly',
            'premature_withdrawal_allowed' => 'boolean',
            'premature_withdrawal_penalty' => 'nullable|numeric|min:0|max:100',
            'min_age' => 'nullable|integer|min:0|max:120',
            'max_age' => 'nullable|integer|min:0|max:120',
            'requires_nominee' => 'boolean',
            'is_active' => 'boolean',
            'display_order' => 'nullable|integer|min:0',
        ]);

        $savingsProduct->update($validated);

        return redirect()->route('savings-products.index')
            ->with('success', 'সঞ্চয় পণ্য সফলভাবে আপডেট হয়েছে।');
    }

    /**
     * Delete savings product (only if no applications).
     */
    public function destroy(SavingsProduct $savingsProduct)
    {
        if ($savingsProduct->savingsApplications()->count() > 0) {
            return back()->with('error', 'এই পণ্যে সঞ্চয় আবেদন রয়েছে, মুছে ফেলা যাবে না।');
        }

        $savingsProduct->delete();

        return redirect()->route('savings-products.index')
            ->with('success', 'সঞ্চয় পণ্য সফলভাবে মুছে ফেলা হয়েছে।');
    }

    /**
     * Toggle active status.
     */
    public function toggleStatus(SavingsProduct $savingsProduct)
    {
        $savingsProduct->update([
            'is_active' => !$savingsProduct->is_active,
        ]);

        $status = $savingsProduct->is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়';
        return redirect()->route('savings-products.index')
            ->with('success', "সঞ্চয় পণ্য {$status} করা হয়েছে।");
    }

    public function exportExcel(Request $request)
    {
        $query = SavingsProduct::query();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('product_name', 'like', "%{$search}%")
                  ->orWhere('product_name_bn', 'like', "%{$search}%")
                  ->orWhere('product_code', 'like', "%{$search}%");
            });
        }

        if ($request->filled('deposit_type')) {
            $query->where('deposit_type', $request->deposit_type);
        }

        $products = $query->orderBy('product_code')->get();

        $rows = [];
        foreach ($products as $p) {
            $rows[] = [
                $p->product_code ?? '',
                $p->product_name ?? '',
                $p->product_name_bn ?? '',
                $p->deposit_type ?? 'monthly',
                $p->duration_months ?? 0,
                $p->min_amount ?? 0,
                $p->max_amount ?? '',
                $p->monthly_installment ?? '',
                $p->interest_rate ?? 0,
                $p->profit_distribution_type ?? 'maturity',
                $p->premature_withdrawal_allowed ? 'Yes' : 'No',
                $p->premature_withdrawal_penalty ?? 0,
                $p->requires_nominee ? 'Yes' : 'No',
                $p->min_age ?? 18,
                $p->max_age ?? 70,
                $p->is_active ? 'Active' : 'Inactive',
                $p->description ?? '',
            ];
        }

        $spreadsheet = $this->buildSavingsProductSpreadsheet($rows);
        $writer = new Xlsx($spreadsheet);
        $fileName = 'savings_products_export_' . date('Y_m_d_His') . '.xlsx';

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $fileName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'max-age=0',
        ]);
    }

    public function downloadTemplate()
    {
        $sampleRows = [
            [
                'SP-101',
                'Monthly Savings Scheme (DPS)',
                'মাসিক সঞ্চয় স্কিম (ডিপিএস)',
                'monthly',
                60,
                500,
                10000,
                1000,
                8.5,
                'maturity',
                'Yes',
                2.0,
                'Yes',
                18,
                70,
                'Active',
                'Monthly recurring deposit scheme',
            ],
            [
                'SP-102',
                'Fixed Term Deposit (FDR)',
                'স্থায়ী আমানত স্কিম (এফডিআর)',
                'lump_sum',
                12,
                10000,
                1000000,
                '',
                9.5,
                'maturity',
                'Yes',
                3.0,
                'Yes',
                18,
                75,
                'Active',
                'One-time lump sum term deposit scheme',
            ],
        ];

        $spreadsheet = $this->buildSavingsProductSpreadsheet($sampleRows);
        $writer = new Xlsx($spreadsheet);
        $fileName = 'savings_product_import_template.xlsx';

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

        $createdCount = 0;
        $updatedCount = 0;
        $skippedCount = 0;
        $errors = [];

        DB::beginTransaction();
        try {
            for ($row = 2; $row <= $highestRow; $row++) {
                $productCode = trim((string)$sheet->getCell("A{$row}")->getValue());
                $productName = trim((string)$sheet->getCell("B{$row}")->getValue());
                $productNameBn = trim((string)$sheet->getCell("C{$row}")->getValue());
                $depositTypeVal = strtolower(trim((string)$sheet->getCell("D{$row}")->getValue()));
                $durationMonthsVal = (int)trim((string)$sheet->getCell("E{$row}")->getValue());
                $minAmountVal = (float)trim((string)$sheet->getCell("F{$row}")->getValue());
                $maxAmountRaw = trim((string)$sheet->getCell("G{$row}")->getValue());
                $monthlyInstRaw = trim((string)$sheet->getCell("H{$row}")->getValue());
                $interestRateVal = (float)trim((string)$sheet->getCell("I{$row}")->getValue());
                $profitDistributionVal = strtolower(trim((string)$sheet->getCell("J{$row}")->getValue()));
                $prematureAllowedVal = strtolower(trim((string)$sheet->getCell("K{$row}")->getValue()));
                $prematurePenaltyVal = (float)trim((string)$sheet->getCell("L{$row}")->getValue());
                $requiresNomineeVal = strtolower(trim((string)$sheet->getCell("M{$row}")->getValue()));
                $minAgeVal = (int)trim((string)$sheet->getCell("N{$row}")->getValue());
                $maxAgeVal = (int)trim((string)$sheet->getCell("O{$row}")->getValue());
                $statusVal = strtolower(trim((string)$sheet->getCell("P{$row}")->getValue()));
                $description = trim((string)$sheet->getCell("Q{$row}")->getValue());

                // Skip blank row
                if ($productCode === '' && $productName === '') {
                    continue;
                }

                if ($productCode === '' || $productName === '') {
                    $skippedCount++;
                    $errors[] = "Row {$row}: Product Code and Product Name are required.";
                    continue;
                }

                $depositType = in_array($depositTypeVal, ['monthly', 'lump_sum', 'recurring', 'মাসিক', 'এককালীন', 'পুনরাবৃত্ত'], true)
                    ? ($depositTypeVal === 'lump_sum' || $depositTypeVal === 'এককালীন' ? 'lump_sum' : ($depositTypeVal === 'recurring' || $depositTypeVal === 'পুনরাবৃত্ত' ? 'recurring' : 'monthly'))
                    : 'monthly';

                $durationMonths = $durationMonthsVal > 0 ? $durationMonthsVal : 12;
                $minAmount = $minAmountVal >= 0 ? $minAmountVal : 0;
                $maxAmount = $maxAmountRaw !== '' ? (float)$maxAmountRaw : null;
                $monthlyInstallment = $monthlyInstRaw !== '' ? (float)$monthlyInstRaw : null;
                $interestRate = $interestRateVal >= 0 ? $interestRateVal : 0;

                $profitDistributionType = in_array($profitDistributionVal, ['maturity', 'monthly', 'quarterly', 'yearly'], true) 
                    ? $profitDistributionVal : 'maturity';

                $prematureWithdrawalAllowed = in_array($prematureAllowedVal, ['yes', '1', 'true', 'হ্যাঁ'], true);
                $prematureWithdrawalPenalty = $prematurePenaltyVal >= 0 ? $prematurePenaltyVal : 0;
                $requiresNominee = !in_array($requiresNomineeVal, ['no', '0', 'false', 'না'], true);

                $minAge = $minAgeVal >= 0 ? $minAgeVal : 18;
                $maxAge = $maxAgeVal >= $minAge ? $maxAgeVal : 70;
                $isActive = !in_array($statusVal, ['inactive', '0', 'false', 'no', 'অনিষ্ক্রিয়'], true);

                $productData = [
                    'product_name' => $productName,
                    'product_name_bn' => $productNameBn ?: $productName,
                    'product_code' => $productCode,
                    'description' => $description ?: null,
                    'deposit_type' => $depositType,
                    'duration_months' => $durationMonths,
                    'min_amount' => $minAmount,
                    'max_amount' => $maxAmount,
                    'monthly_installment' => $monthlyInstallment,
                    'interest_rate' => $interestRate,
                    'profit_distribution_type' => $profitDistributionType,
                    'premature_withdrawal_allowed' => $prematureWithdrawalAllowed,
                    'premature_withdrawal_penalty' => $prematureWithdrawalPenalty,
                    'min_age' => $minAge,
                    'max_age' => $maxAge,
                    'requires_nominee' => $requiresNominee,
                    'is_active' => $isActive,
                ];

                $existing = SavingsProduct::where('product_code', $productCode)->first();
                if ($existing) {
                    $existing->update($productData);
                    $updatedCount++;
                } else {
                    SavingsProduct::create($productData);
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

        return redirect()->route('savings-products.index')->with('success', $msg);
    }

    private function buildSavingsProductSpreadsheet(array $rows): Spreadsheet
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Savings Products');

        $headers = [
            'Product Code',
            'Product Name (EN)',
            'Product Name (BN)',
            'Deposit Type',
            'Duration (Months)',
            'Min Amount',
            'Max Amount',
            'Monthly Installment',
            'Interest Rate (%)',
            'Profit Distribution',
            'Premature Withdrawal Allowed',
            'Penalty (%)',
            'Requires Nominee',
            'Min Age',
            'Max Age',
            'Status',
            'Description',
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
        $sheet->getStyle('A1:Q1')->applyFromArray($headerStyle);
        $sheet->getRowDimension(1)->setRowHeight(30);

        $widths = [
            'A' => 16,
            'B' => 26,
            'C' => 26,
            'D' => 16,
            'E' => 18,
            'F' => 16,
            'G' => 16,
            'H' => 20,
            'I' => 16,
            'J' => 18,
            'K' => 26,
            'L' => 14,
            'M' => 18,
            'N' => 12,
            'O' => 12,
            'P' => 14,
            'Q' => 30,
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

                $sheet->getStyle("A{$r}:Q{$r}")->applyFromArray([
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

                // Alignment
                $sheet->getStyle("A{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("D{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("E{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("F{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $sheet->getStyle("G{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $sheet->getStyle("H{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $sheet->getStyle("I{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $sheet->getStyle("J{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("K{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("L{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $sheet->getStyle("M{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("N{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("O{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("P{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            }
        }

        return $spreadsheet;
    }
}
