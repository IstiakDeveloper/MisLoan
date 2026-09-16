<?php

namespace App\Http\Controllers;

use App\Models\SavingsCategory;
use App\Models\SavingsProduct;
use App\Support\SavingsProductHierarchy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class SavingsProductController extends Controller
{
    /**
     * List savings products (Head Office).
     */
    public function index(Request $request)
    {
        $products = SavingsProduct::query()
            ->with('savingsCategory')
            ->when($request->search, function ($query, $search) {
                $query->where('product_name', 'like', "%{$search}%")
                    ->orWhere('product_name_bn', 'like', "%{$search}%")
                    ->orWhere('product_code', 'like', "%{$search}%");
            })
            ->when($request->category_id, function ($query, $categoryId) {
                $query->where('savings_category_id', $categoryId);
            })
            ->when($request->deposit_type, function ($query, $type) {
                $query->where('deposit_type', $type);
            })
            ->withCount('savingsApplications')
            ->orderBy('savings_category_id')
            ->orderBy('display_order')
            ->orderBy('product_code')
            ->get();

        $categories = SavingsCategory::query()->orderBy('display_order')->orderBy('category_code')->get();

        return Inertia::render('SavingsProducts/Index', [
            'products' => $products,
            'categories' => $categories,
            'filters' => $request->only(['search', 'category_id', 'deposit_type']),
        ]);
    }

    /**
     * Store new savings product.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'savings_category_id' => 'required|exists:savings_categories,id',
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
            'savings_category_id' => 'required|exists:savings_categories,id',
            'product_name' => 'required|string|max:255',
            'product_name_bn' => 'nullable|string|max:255',
            'product_code' => 'required|string|max:50|unique:savings_products,product_code,'.$savingsProduct->id,
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
            'is_active' => ! $savingsProduct->is_active,
        ]);

        $status = $savingsProduct->is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়';

        return redirect()->route('savings-products.index')
            ->with('success', "সঞ্চয় পণ্য {$status} করা হয়েছে।");
    }

    public function exportExcel(Request $request)
    {
        $query = SavingsProduct::query()->with('savingsCategory');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('product_name', 'like', "%{$search}%")
                    ->orWhere('product_name_bn', 'like', "%{$search}%")
                    ->orWhere('product_code', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category_id')) {
            $query->where('savings_category_id', $request->category_id);
        }

        if ($request->filled('deposit_type')) {
            $query->where('deposit_type', $request->deposit_type);
        }

        $products = $query->orderBy('product_code')->get();

        $rows = [];
        foreach ($products as $p) {
            $rows[] = [
                $p->savingsCategory?->category_code ?? '',
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
        $fileName = 'savings_products_export_'.date('Y_m_d_His').'.xlsx';

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
                '21',
                '21.01',
                'G.Savings',
                'জি. সঞ্চয়',
                'monthly',
                12,
                100,
                1000000,
                500,
                6,
                'maturity',
                'Yes',
                0,
                'Yes',
                18,
                70,
                'Active',
                'General savings product under category 21',
            ],
            [
                '22',
                '22.01',
                'SP.Savings',
                'এস.পি. সঞ্চয়',
                'monthly',
                12,
                100,
                1000000,
                500,
                6,
                'maturity',
                'Yes',
                0,
                'Yes',
                18,
                70,
                'Active',
                'Special savings product under category 22',
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
            return back()->with('error', 'Failed to read Excel file: '.$e->getMessage());
        }

        $headerA = strtolower(trim((string) $sheet->getCell('A1')->getValue()));
        $hasCategoryColumn = str_contains($headerA, 'category');
        $offset = $hasCategoryColumn ? 1 : 0;

        $createdCount = 0;
        $updatedCount = 0;
        $skippedCount = 0;
        $errors = [];

        DB::beginTransaction();
        try {
            for ($row = 2; $row <= $highestRow; $row++) {
                $categoryCode = $hasCategoryColumn ? trim((string) $sheet->getCell("A{$row}")->getValue()) : '';
                $productCode = trim((string) $sheet->getCell($this->excelColumn(1 + $offset)."{$row}")->getValue());
                $productName = trim((string) $sheet->getCell($this->excelColumn(2 + $offset)."{$row}")->getValue());
                $productNameBn = trim((string) $sheet->getCell($this->excelColumn(3 + $offset)."{$row}")->getValue());
                $depositTypeVal = strtolower(trim((string) $sheet->getCell($this->excelColumn(4 + $offset)."{$row}")->getValue()));
                $durationMonthsVal = (int) trim((string) $sheet->getCell($this->excelColumn(5 + $offset)."{$row}")->getValue());
                $minAmountVal = (float) trim((string) $sheet->getCell($this->excelColumn(6 + $offset)."{$row}")->getValue());
                $maxAmountRaw = trim((string) $sheet->getCell($this->excelColumn(7 + $offset)."{$row}")->getValue());
                $monthlyInstRaw = trim((string) $sheet->getCell($this->excelColumn(8 + $offset)."{$row}")->getValue());
                $interestRateVal = (float) trim((string) $sheet->getCell($this->excelColumn(9 + $offset)."{$row}")->getValue());
                $profitDistributionVal = strtolower(trim((string) $sheet->getCell($this->excelColumn(10 + $offset)."{$row}")->getValue()));
                $prematureAllowedVal = strtolower(trim((string) $sheet->getCell($this->excelColumn(11 + $offset)."{$row}")->getValue()));
                $prematurePenaltyVal = (float) trim((string) $sheet->getCell($this->excelColumn(12 + $offset)."{$row}")->getValue());
                $requiresNomineeVal = strtolower(trim((string) $sheet->getCell($this->excelColumn(13 + $offset)."{$row}")->getValue()));
                $minAgeVal = (int) trim((string) $sheet->getCell($this->excelColumn(14 + $offset)."{$row}")->getValue());
                $maxAgeVal = (int) trim((string) $sheet->getCell($this->excelColumn(15 + $offset)."{$row}")->getValue());
                $statusVal = strtolower(trim((string) $sheet->getCell($this->excelColumn(16 + $offset)."{$row}")->getValue()));
                $description = trim((string) $sheet->getCell($this->excelColumn(17 + $offset)."{$row}")->getValue());

                if ($productCode === '' && $productName === '' && $categoryCode === '') {
                    continue;
                }

                if (SavingsProductHierarchy::isCategoryCode($productCode) || ($productCode === '' && SavingsProductHierarchy::isCategoryCode($categoryCode))) {
                    $this->upsertCategoryFromImport(
                        $categoryCode !== '' ? $categoryCode : $productCode,
                        $productName,
                        $productNameBn,
                        $description
                    );
                    $updatedCount++;

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
                $maxAmount = $maxAmountRaw !== '' ? (float) $maxAmountRaw : null;
                $monthlyInstallment = $monthlyInstRaw !== '' ? (float) $monthlyInstRaw : null;
                $interestRate = $interestRateVal >= 0 ? $interestRateVal : 0;

                $profitDistributionType = in_array($profitDistributionVal, ['maturity', 'monthly', 'quarterly', 'yearly'], true)
                    ? $profitDistributionVal : 'maturity';

                $prematureWithdrawalAllowed = in_array($prematureAllowedVal, ['yes', '1', 'true', 'হ্যাঁ'], true);
                $prematureWithdrawalPenalty = $prematurePenaltyVal >= 0 ? $prematurePenaltyVal : 0;
                $requiresNominee = ! in_array($requiresNomineeVal, ['no', '0', 'false', 'না'], true);

                $minAge = $minAgeVal >= 0 ? $minAgeVal : 18;
                $maxAge = $maxAgeVal >= $minAge ? $maxAgeVal : 70;
                $isActive = ! in_array($statusVal, ['inactive', '0', 'false', 'no', 'অনিষ্ক্রিয়'], true);

                $category = $this->resolveCategoryForImport($categoryCode, $productCode, $productName, $productNameBn);

                $productData = [
                    'savings_category_id' => $category->id,
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

            return back()->with('error', 'Error during Excel import: '.$e->getMessage());
        }

        $totalProcessed = $createdCount + $updatedCount;
        $msg = "Import completed successfully! Created: {$createdCount}, Updated: {$updatedCount}.";
        if ($skippedCount > 0) {
            $msg .= " Skipped {$skippedCount} row(s).";
        }

        if (! empty($errors) && $totalProcessed === 0) {
            return back()->with('error', 'Import failed. '.implode(' | ', array_slice($errors, 0, 3)));
        }

        return redirect()->route('savings-products.index')->with('success', $msg);
    }

    private function buildSavingsProductSpreadsheet(array $rows): Spreadsheet
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Savings Products');

        $headers = [
            'Category Code',
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
        $sheet->getStyle('A1:R1')->applyFromArray($headerStyle);
        $sheet->getRowDimension(1)->setRowHeight(30);

        $widths = [
            'A' => 16,
            'B' => 16,
            'C' => 26,
            'D' => 26,
            'E' => 16,
            'F' => 18,
            'G' => 16,
            'H' => 16,
            'I' => 20,
            'J' => 16,
            'K' => 18,
            'L' => 26,
            'M' => 14,
            'N' => 18,
            'O' => 12,
            'P' => 12,
            'Q' => 14,
            'R' => 30,
        ];
        foreach ($widths as $col => $w) {
            $sheet->getColumnDimension($col)->setWidth($w);
        }

        if (! empty($rows)) {
            $sheet->fromArray($rows, null, 'A2');
            $rowCount = count($rows);
            $lastRow = $rowCount + 1;

            for ($r = 2; $r <= $lastRow; $r++) {
                $sheet->getRowDimension($r)->setRowHeight(22);
                $bg = ($r % 2 === 0) ? 'F8FAFC' : 'FFFFFF';

                $sheet->getStyle("A{$r}:R{$r}")->applyFromArray([
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
                $sheet->getStyle("B{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("E{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("F{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("G{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $sheet->getStyle("H{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $sheet->getStyle("I{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $sheet->getStyle("J{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $sheet->getStyle("K{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("L{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("M{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $sheet->getStyle("N{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("O{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("P{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("Q{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            }
        }

        return $spreadsheet;
    }

    private function excelColumn(int $index): string
    {
        $letter = '';
        $index--;

        while ($index >= 0) {
            $letter = chr(($index % 26) + 65).$letter;
            $index = intdiv($index, 26) - 1;
        }

        return $letter;
    }

    private function upsertCategoryFromImport(string $code, string $name, string $nameBn, string $description): SavingsCategory
    {
        [$defaultName, $defaultNameBn] = SavingsProductHierarchy::defaultCategoryNames($code);

        return SavingsCategory::query()->updateOrCreate(
            ['category_code' => $code],
            [
                'category_name' => $name !== '' ? $name : $defaultName,
                'category_name_bn' => $nameBn !== '' ? $nameBn : $defaultNameBn,
                'description' => $description !== '' ? $description : null,
                'is_active' => true,
                'display_order' => is_numeric($code) ? (int) $code : 99,
            ]
        );
    }

    private function resolveCategoryForImport(string $explicitCode, string $productCode, string $productName, string $productNameBn): SavingsCategory
    {
        $code = trim($explicitCode);
        if ($code === '') {
            $code = SavingsProductHierarchy::parentCategoryCode($productCode) ?? SavingsProductHierarchy::OTHER_CATEGORY_CODE;
        }

        [$name, $nameBn] = SavingsProductHierarchy::defaultCategoryNames($code);

        return SavingsCategory::query()->firstOrCreate(
            ['category_code' => $code],
            [
                'category_name' => $name,
                'category_name_bn' => $nameBn !== '' ? $nameBn : ($productNameBn !== '' ? $productNameBn : $productName),
                'is_active' => true,
                'display_order' => is_numeric($code) ? (int) $code : 99,
            ]
        );
    }
}
