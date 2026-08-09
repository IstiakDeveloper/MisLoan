<?php

namespace App\Http\Controllers;

use App\Models\LoanCategory;
use App\Models\LoanProduct;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\IOFactory;

class LoanProductController extends Controller
{
    public function index(Request $request)
    {
        $products = LoanProduct::query()
            ->with('loanCategory')
            ->when($request->search, function ($query, $search) {
                $query->where('product_name', 'like', "%{$search}%")
                      ->orWhere('product_name_bn', 'like', "%{$search}%")
                      ->orWhere('product_code', 'like', "%{$search}%");
            })
            ->when($request->category_id, function ($query, $categoryId) {
                $query->where('loan_category_id', $categoryId);
            })
            ->when($request->installment_type, function ($query, $type) {
                $query->where('installment_type', $type);
            })
            ->withCount('loanApplications')
            ->orderBy('loan_category_id')
            ->orderBy('display_order')
            ->get();

        $categories = LoanCategory::orderBy('display_order')->get();

        return Inertia::render('LoanProducts/Index', [
            'products' => $products,
            'categories' => $categories,
            'filters' => $request->only(['search', 'category_id', 'installment_type']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'loan_category_id' => 'required|exists:loan_categories,id',
            'product_name' => 'required|string|max:255',
            'product_name_bn' => 'required|string|max:255',
            'product_code' => 'required|string|max:20|unique:loan_products,product_code',
            'description' => 'nullable|string|max:1000',
            'description_bn' => 'nullable|string|max:1000',
            'installment_type' => 'required|in:weekly,monthly',
            'duration_months' => 'required|integer|min:1|max:120',
            'number_of_installments' => 'required|integer|min:1|max:520',
            'min_amount' => 'required|numeric|min:0',
            'max_amount' => 'required|numeric|min:0|gte:min_amount',
            'interest_rate' => 'required|numeric|min:0|max:100',
            'service_charge' => 'nullable|numeric|min:0|max:100',
            'interest_calculation_type' => 'required|in:flat,reducing,compound',
            'gender_restriction' => 'required|in:male,female,both',
            'min_age' => 'required|integer|min:18|max:100',
            'max_age' => 'required|integer|min:18|max:100|gte:min_age',
            'requires_guarantor' => 'boolean',
            'number_of_guarantors' => 'nullable|integer|min:0|max:5',
            'eligibility_conditions' => 'nullable|array',
            'required_documents' => 'nullable|array',
            'is_active' => 'boolean',
            'display_order' => 'nullable|integer|min:0',
        ]);

        $validated['is_active'] = $validated['is_active'] ?? true;
        $validated['service_charge'] = $validated['service_charge'] ?? 0;
        $validated['display_order'] = $validated['display_order'] ?? 0;
        $validated['requires_guarantor'] = $validated['requires_guarantor'] ?? false;
        $validated['number_of_guarantors'] = $validated['number_of_guarantors'] ?? 0;

        LoanProduct::create($validated);

        return redirect()->route('loan-products.index')
            ->with('success', 'ঋণ পণ্য সফলভাবে তৈরি হয়েছে।');
    }

    public function update(Request $request, LoanProduct $loanProduct)
    {
        $validated = $request->validate([
            'loan_category_id' => 'required|exists:loan_categories,id',
            'product_name' => 'required|string|max:255',
            'product_name_bn' => 'required|string|max:255',
            'product_code' => 'required|string|max:20|unique:loan_products,product_code,' . $loanProduct->id,
            'description' => 'nullable|string|max:1000',
            'description_bn' => 'nullable|string|max:1000',
            'installment_type' => 'required|in:weekly,monthly',
            'duration_months' => 'required|integer|min:1|max:120',
            'number_of_installments' => 'required|integer|min:1|max:520',
            'min_amount' => 'required|numeric|min:0',
            'max_amount' => 'required|numeric|min:0|gte:min_amount',
            'interest_rate' => 'required|numeric|min:0|max:100',
            'service_charge' => 'nullable|numeric|min:0|max:100',
            'interest_calculation_type' => 'required|in:flat,reducing,compound',
            'gender_restriction' => 'required|in:male,female,both',
            'min_age' => 'required|integer|min:18|max:100',
            'max_age' => 'required|integer|min:18|max:100|gte:min_age',
            'requires_guarantor' => 'boolean',
            'number_of_guarantors' => 'nullable|integer|min:0|max:5',
            'eligibility_conditions' => 'nullable|array',
            'required_documents' => 'nullable|array',
            'is_active' => 'boolean',
            'display_order' => 'nullable|integer|min:0',
        ]);

        $loanProduct->update($validated);

        return redirect()->route('loan-products.index')
            ->with('success', 'ঋণ পণ্য সফলভাবে আপডেট হয়েছে।');
    }

    public function destroy(LoanProduct $loanProduct)
    {
        if ($loanProduct->loanApplications()->count() > 0) {
            return back()->with('error', 'এই পণ্যে ঋণ আবেদন রয়েছে, মুছে ফেলা যাবে না।');
        }

        $loanProduct->delete();

        return redirect()->route('loan-products.index')
            ->with('success', 'ঋণ পণ্য সফলভাবে মুছে ফেলা হয়েছে।');
    }

    public function toggleStatus(LoanProduct $loanProduct)
    {
        $loanProduct->update([
            'is_active' => !$loanProduct->is_active,
        ]);

        $status = $loanProduct->is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়';
        return redirect()->route('loan-products.index')
            ->with('success', "ঋণ পণ্য {$status} করা হয়েছে।");
    }

    public function exportExcel(Request $request)
    {
        $query = LoanProduct::with('loanCategory');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('product_name', 'like', "%{$search}%")
                  ->orWhere('product_name_bn', 'like', "%{$search}%")
                  ->orWhere('product_code', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category_id')) {
            $query->where('loan_category_id', $request->category_id);
        }

        if ($request->filled('installment_type')) {
            $query->where('installment_type', $request->installment_type);
        }

        $products = $query->orderBy('product_code')->get();

        $rows = [];
        foreach ($products as $p) {
            $rows[] = [
                $p->loanCategory?->category_code ?? '',
                $p->loanCategory?->category_name ?? '',
                $p->product_code ?? '',
                $p->product_name ?? '',
                $p->product_name_bn ?? '',
                $p->installment_type ?? 'weekly',
                $p->duration_months ?? 0,
                $p->number_of_installments ?? 0,
                $p->min_amount ?? 0,
                $p->max_amount ?? 0,
                $p->interest_rate ?? 0,
                $p->service_charge ?? 0,
                $p->interest_calculation_type ?? 'flat',
                $p->gender_restriction ?? 'both',
                $p->min_age ?? 18,
                $p->max_age ?? 65,
                $p->requires_guarantor ? 'Yes' : 'No',
                $p->number_of_guarantors ?? 0,
                $p->is_active ? 'Active' : 'Inactive',
                $p->description ?? '',
            ];
        }

        $spreadsheet = $this->buildLoanProductSpreadsheet($rows);
        $writer = new Xlsx($spreadsheet);
        $fileName = 'loan_products_export_' . date('Y_m_d_His') . '.xlsx';

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $fileName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'max-age=0',
        ]);
    }

    public function downloadTemplate()
    {
        $firstCategories = LoanCategory::orderBy('display_order')->limit(2)->get();
        $cat1 = $firstCategories->first();
        $cat2 = $firstCategories->skip(1)->first();

        $sampleRows = [
            [
                $cat1?->category_code ?? 'GEN',
                $cat1?->category_name ?? 'General Loan Category',
                'LP-101',
                'General Loan Product',
                'সাধারণ ঋণ পণ্য',
                'weekly',
                12,
                46,
                10000,
                100000,
                12.5,
                1.0,
                'flat',
                'both',
                18,
                65,
                'Yes',
                1,
                'Active',
                'Standard weekly general loan product',
            ],
            [
                $cat2?->category_code ?? 'ENT',
                $cat2?->category_name ?? 'Enterprise Loan Category',
                'LP-102',
                'Small Enterprise Loan',
                'ক্ষুদ্র উদ্যোক্তা ঋণ',
                'monthly',
                24,
                24,
                50000,
                500000,
                14.0,
                1.5,
                'reducing',
                'both',
                20,
                60,
                'Yes',
                2,
                'Active',
                'Monthly business development loan product',
            ],
        ];

        $spreadsheet = $this->buildLoanProductSpreadsheet($sampleRows);
        $writer = new Xlsx($spreadsheet);
        $fileName = 'loan_product_import_template.xlsx';

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

        // Fast category lookup maps
        $categories = LoanCategory::all();
        $categoryByCodeMap = [];
        $categoryByNameMap = [];
        $categoryByIdMap = [];

        foreach ($categories as $cat) {
            if ($cat->category_code) {
                $categoryByCodeMap[strtolower(trim((string)$cat->category_code))] = $cat->id;
            }
            if ($cat->category_name) {
                $categoryByNameMap[strtolower(trim((string)$cat->category_name))] = $cat->id;
            }
            $categoryByIdMap[$cat->id] = $cat->id;
        }

        $createdCount = 0;
        $updatedCount = 0;
        $skippedCount = 0;
        $errors = [];

        DB::beginTransaction();
        try {
            for ($row = 2; $row <= $highestRow; $row++) {
                $catCode = trim((string)$sheet->getCell("A{$row}")->getValue());
                $catName = trim((string)$sheet->getCell("B{$row}")->getValue());
                $productCode = trim((string)$sheet->getCell("C{$row}")->getValue());
                $productName = trim((string)$sheet->getCell("D{$row}")->getValue());
                $productNameBn = trim((string)$sheet->getCell("E{$row}")->getValue());
                $installmentTypeVal = strtolower(trim((string)$sheet->getCell("F{$row}")->getValue()));
                $durationMonthsVal = (int)trim((string)$sheet->getCell("G{$row}")->getValue());
                $numberOfInstallmentsVal = (int)trim((string)$sheet->getCell("H{$row}")->getValue());
                $minAmountVal = (float)trim((string)$sheet->getCell("I{$row}")->getValue());
                $maxAmountVal = (float)trim((string)$sheet->getCell("J{$row}")->getValue());
                $interestRateVal = (float)trim((string)$sheet->getCell("K{$row}")->getValue());
                $serviceChargeVal = (float)trim((string)$sheet->getCell("L{$row}")->getValue());
                $interestCalcTypeVal = strtolower(trim((string)$sheet->getCell("M{$row}")->getValue()));
                $genderVal = strtolower(trim((string)$sheet->getCell("N{$row}")->getValue()));
                $minAgeVal = (int)trim((string)$sheet->getCell("O{$row}")->getValue());
                $maxAgeVal = (int)trim((string)$sheet->getCell("P{$row}")->getValue());
                $requiresGuarantorVal = strtolower(trim((string)$sheet->getCell("Q{$row}")->getValue()));
                $numberOfGuarantorsVal = (int)trim((string)$sheet->getCell("R{$row}")->getValue());
                $statusVal = strtolower(trim((string)$sheet->getCell("S{$row}")->getValue()));
                $description = trim((string)$sheet->getCell("T{$row}")->getValue());

                // Skip blank row
                if ($catCode === '' && $productCode === '' && $productName === '') {
                    continue;
                }

                if ($productCode === '' || $productName === '') {
                    $skippedCount++;
                    $errors[] = "Row {$row}: Product Code and Product Name are required.";
                    continue;
                }

                // Match Category
                $categoryId = null;
                if ($catCode !== '' && isset($categoryByCodeMap[strtolower($catCode)])) {
                    $categoryId = $categoryByCodeMap[strtolower($catCode)];
                } elseif ($catName !== '' && isset($categoryByNameMap[strtolower($catName)])) {
                    $categoryId = $categoryByNameMap[strtolower($catName)];
                } elseif ($catCode !== '' && isset($categoryByIdMap[(int)$catCode])) {
                    $categoryId = $categoryByIdMap[(int)$catCode];
                }

                if (!$categoryId) {
                    // Fallback to first available category if any
                    $categoryId = $categories->first()?->id;
                }

                if (!$categoryId) {
                    $skippedCount++;
                    $errors[] = "Row {$row} (Code: {$productCode}): Loan Category not found.";
                    continue;
                }

                $installmentType = in_array($installmentTypeVal, ['monthly', 'মাসিক'], true) ? 'monthly' : 'weekly';
                $durationMonths = $durationMonthsVal > 0 ? $durationMonthsVal : 12;
                $numberOfInstallments = $numberOfInstallmentsVal > 0 ? $numberOfInstallmentsVal : ($installmentType === 'monthly' ? $durationMonths : 46);
                $minAmount = $minAmountVal >= 0 ? $minAmountVal : 0;
                $maxAmount = $maxAmountVal >= $minAmount ? $maxAmountVal : $minAmount;
                $interestRate = $interestRateVal >= 0 ? $interestRateVal : 0;
                $serviceCharge = $serviceChargeVal >= 0 ? $serviceChargeVal : 0;
                
                $interestCalculationType = in_array($interestCalcTypeVal, ['flat', 'reducing', 'compound'], true) ? $interestCalcTypeVal : 'flat';
                $genderRestriction = in_array($genderVal, ['male', 'female', 'both', 'পুরুষ', 'মহিলা', 'সকল'], true) 
                    ? ($genderVal === 'male' || $genderVal === 'পুরুষ' ? 'male' : ($genderVal === 'female' || $genderVal === 'মহিলা' ? 'female' : 'both'))
                    : 'both';
                
                $minAge = $minAgeVal >= 18 ? $minAgeVal : 18;
                $maxAge = $maxAgeVal >= $minAge ? $maxAgeVal : 65;
                $requiresGuarantor = in_array($requiresGuarantorVal, ['yes', '1', 'true', 'হ্যাঁ'], true);
                $numberOfGuarantors = $numberOfGuarantorsVal >= 0 ? $numberOfGuarantorsVal : ($requiresGuarantor ? 1 : 0);
                $isActive = !in_array($statusVal, ['inactive', '0', 'false', 'no', 'অনিষ্ক্রিয়'], true);

                $productData = [
                    'loan_category_id' => $categoryId,
                    'product_name' => $productName,
                    'product_name_bn' => $productNameBn ?: $productName,
                    'product_code' => $productCode,
                    'description' => $description ?: null,
                    'installment_type' => $installmentType,
                    'duration_months' => $durationMonths,
                    'number_of_installments' => $numberOfInstallments,
                    'min_amount' => $minAmount,
                    'max_amount' => $maxAmount,
                    'interest_rate' => $interestRate,
                    'service_charge' => $serviceCharge,
                    'interest_calculation_type' => $interestCalculationType,
                    'gender_restriction' => $genderRestriction,
                    'min_age' => $minAge,
                    'max_age' => $maxAge,
                    'requires_guarantor' => $requiresGuarantor,
                    'number_of_guarantors' => $numberOfGuarantors,
                    'is_active' => $isActive,
                ];

                $existing = LoanProduct::where('product_code', $productCode)->first();
                if ($existing) {
                    $existing->update($productData);
                    $updatedCount++;
                } else {
                    LoanProduct::create($productData);
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

        return redirect()->route('loan-products.index')->with('success', $msg);
    }

    private function buildLoanProductSpreadsheet(array $rows): Spreadsheet
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Loan Products');

        $headers = [
            'Category Code',
            'Category Name',
            'Product Code',
            'Product Name (EN)',
            'Product Name (BN)',
            'Installment Type',
            'Duration (Months)',
            'No. of Installments',
            'Min Amount',
            'Max Amount',
            'Interest Rate (%)',
            'Service Charge (%)',
            'Interest Calc Type',
            'Gender Restriction',
            'Min Age',
            'Max Age',
            'Requires Guarantor',
            'No. of Guarantors',
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
        $sheet->getStyle('A1:T1')->applyFromArray($headerStyle);
        $sheet->getRowDimension(1)->setRowHeight(30);

        $widths = [
            'A' => 16,
            'B' => 24,
            'C' => 16,
            'D' => 26,
            'E' => 26,
            'F' => 16,
            'G' => 18,
            'H' => 18,
            'I' => 16,
            'J' => 16,
            'K' => 16,
            'L' => 18,
            'M' => 18,
            'N' => 18,
            'O' => 12,
            'P' => 12,
            'Q' => 18,
            'R' => 18,
            'S' => 14,
            'T' => 30,
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

                $sheet->getStyle("A{$r}:T{$r}")->applyFromArray([
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
                $sheet->getStyle("C{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("F{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("G{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("H{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("I{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $sheet->getStyle("J{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $sheet->getStyle("K{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $sheet->getStyle("L{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $sheet->getStyle("M{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("N{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("O{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("P{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("Q{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("R{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("S{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            }
        }

        return $spreadsheet;
    }
}
