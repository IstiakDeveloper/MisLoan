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
                      ->orWhere('product_code', 'like', "%{$search}%")
                      ->orWhere('main_product_code', 'like', "%{$search}%");
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
            'product_code' => 'required|string|max:50|unique:loan_products,product_code',
            'main_product_code' => 'nullable|string|max:50',
            'description' => 'nullable|string|max:1000',
            'description_bn' => 'nullable|string|max:1000',
            'installment_type' => 'required|in:weekly,monthly,lump_sum',
            'duration_months' => 'required|integer|min:1|max:120',
            'number_of_installments' => 'required|integer|min:1|max:520',
            'installment_amount_per_thousand' => 'nullable|numeric|min:0',
            'last_installment_per_thousand' => 'nullable|numeric|min:0',
            'loan_installment_factor' => 'nullable|numeric|min:0',
            'interest_installment_factor' => 'nullable|numeric|min:0',
            'savings_installment' => 'nullable|numeric|min:0',
            'min_amount' => 'required|numeric|min:0',
            'max_amount' => 'required|numeric|min:0|gte:min_amount',
            'interest_rate' => 'required|numeric|min:0|max:100',
            'service_charge' => 'nullable|numeric|min:0|max:100',
            'service_charge_per_thousand' => 'nullable|numeric|min:0',
            'interest_calculation_type' => 'required|in:flat,reducing,compound,housing',
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
        $validated['service_charge_per_thousand'] = $validated['service_charge_per_thousand'] ?? 0;
        $validated['installment_amount_per_thousand'] = $validated['installment_amount_per_thousand'] ?? 0;
        $validated['last_installment_per_thousand'] = $validated['last_installment_per_thousand'] ?? 0;
        $validated['loan_installment_factor'] = $validated['loan_installment_factor'] ?? 0;
        $validated['interest_installment_factor'] = $validated['interest_installment_factor'] ?? 0;
        $validated['savings_installment'] = $validated['savings_installment'] ?? 0;
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
            'product_code' => 'required|string|max:50|unique:loan_products,product_code,' . $loanProduct->id,
            'main_product_code' => 'nullable|string|max:50',
            'description' => 'nullable|string|max:1000',
            'description_bn' => 'nullable|string|max:1000',
            'installment_type' => 'required|in:weekly,monthly,lump_sum',
            'duration_months' => 'required|integer|min:1|max:120',
            'number_of_installments' => 'required|integer|min:1|max:520',
            'installment_amount_per_thousand' => 'nullable|numeric|min:0',
            'last_installment_per_thousand' => 'nullable|numeric|min:0',
            'loan_installment_factor' => 'nullable|numeric|min:0',
            'interest_installment_factor' => 'nullable|numeric|min:0',
            'savings_installment' => 'nullable|numeric|min:0',
            'min_amount' => 'required|numeric|min:0',
            'max_amount' => 'required|numeric|min:0|gte:min_amount',
            'interest_rate' => 'required|numeric|min:0|max:100',
            'service_charge' => 'nullable|numeric|min:0|max:100',
            'service_charge_per_thousand' => 'nullable|numeric|min:0',
            'interest_calculation_type' => 'required|in:flat,reducing,compound,housing',
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
                  ->orWhere('product_code', 'like', "%{$search}%")
                  ->orWhere('main_product_code', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category_id')) {
            $query->where('loan_category_id', $request->category_id);
        }

        if ($request->filled('installment_type')) {
            $query->where('installment_type', $request->installment_type);
        }

        $products = $query->orderBy('loan_category_id')->orderBy('product_code')->get();

        $rows = [];
        foreach ($products as $p) {
            $rows[] = [
                $p->loanCategory?->category_code ?? '',
                $p->loanCategory?->category_name ?? '',
                $p->main_product_code ?? '',
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
                $p->service_charge_per_thousand ?? 0,
                $p->installment_amount_per_thousand ?? 0,
                $p->last_installment_per_thousand ?? 0,
                $p->loan_installment_factor ?? 0,
                $p->interest_installment_factor ?? 0,
                $p->savings_installment ?? 0,
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
                $cat1?->category_code ?? '01.00',
                $cat1?->category_name ?? 'Jagoron Loan',
                '1',
                '01.01',
                'Jagoron Weekly (1 Year)',
                'জাগরণ সাপ্তাহিক (১ বছর মেয়াদী)',
                'weekly',
                12,
                46,
                10000,
                69000,
                23.92,
                0.0,
                127.0,
                25.0,
                2.0,
                0.0222,
                0.0028,
                24.0,
                'flat',
                'female',
                18,
                60,
                'Yes',
                1,
                'Active',
                'Standard weekly Jagoron loan product',
            ],
            [
                $cat2?->category_code ?? 'AGR',
                $cat2?->category_name ?? 'Agrosor',
                '2',
                'AGR-08',
                'Agrosor Monthly (1 Year)',
                'আগ্রসর মাসিক (১ বছর মেয়াদী)',
                'monthly',
                12,
                12,
                200000,
                6000000,
                23.83,
                0.0,
                133.0,
                95.0,
                88.0,
                0.0838,
                0.0112,
                24.0,
                'flat',
                'both',
                18,
                65,
                'Yes',
                1,
                'Active',
                'Standard monthly Agrosor loan product',
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
            // Check for 'Loan' sheet first, otherwise get active sheet
            $sheet = $spreadsheet->getSheetByName('Loan') ?? $spreadsheet->getActiveSheet();
            $highestRow = $sheet->getHighestRow();
        } catch (\Exception $e) {
            return back()->with('error', 'Failed to read Excel file: ' . $e->getMessage());
        }

        // Fast category lookup maps from EXISTING categories only (Categories are never modified/created)
        $categories = LoanCategory::all();
        $categoryByCodeMap = [];
        $categoryByNameMap = [];

        foreach ($categories as $cat) {
            if ($cat->category_code) {
                $categoryByCodeMap[strtolower(trim((string)$cat->category_code))] = $cat->id;
            }
            if ($cat->category_name) {
                $categoryByNameMap[strtolower(trim((string)$cat->category_name))] = $cat->id;
            }
        }

        // Standard mapping for Main Product Code to existing category codes
        $mainCodeToCategoryCode = [
            '1' => '01.00',   // Jagoron
            '2' => 'agr',     // Agrosor
            '3' => '03.00',   // Buniad
            '4' => 'sfl',     // Sufolon
            '5' => 'rmtp',    // MFMSF / RMTP
            '6' => 'rmtp',    // SAHOS / RMTP
            '7' => 'enr',     // ENRICH
            '8' => 'enr',     // ENRICH ACL
            '9' => 'enr',     // ENRICH LIL
            '10' => 'ecccp',  // EFRRAP
            '11' => 'agr',    // Lift / Agrosor
            '12' => 'enr',    // IGA Decline / ENRICH
            '13' => 'agr',    // Agrosor MDP
            '14' => 'abs',    // Abason / LRL
            '15' => 'agr',    // Agrosor MDP-AF
            '16' => 'rmtp',   // LRL 2nd Phase
            '17' => 'agr',    // Agrosor RAISE
            '18' => 'agr',    // Agrosor MFCE
            '19' => 'rmtp',   // RMTP Special ME
            '20' => 'rmtp',   // SCL
            '35' => 'rmtp',   // BNF CMSME
            '36' => 'ecccp',  // ECCCP Drought
            '37' => 'agr',    // Agrosor SMART
            '38' => 'agr',    // CSL SMART
            '39' => 'abs',    // Abason
            '40' => 'agr',    // Agrosor CES
        ];

        // Determine format based on Row 1 Header
        $headerA1 = strtolower(trim((string)$sheet->getCell('A1')->getValue()));
        $headerB1 = strtolower(trim((string)$sheet->getCell('B1')->getValue()));
        $headerE1 = strtolower(trim((string)$sheet->getCell('E1')->getValue()));

        $isProductCodeXlsxFormat = ($headerA1 === 'product code' && $headerB1 === 'name' && str_contains($headerE1, 'main product'));

        $createdCount = 0;
        $updatedCount = 0;
        $skippedCount = 0;
        $errors = [];

        DB::beginTransaction();
        try {
            if ($isProductCodeXlsxFormat) {
                // FORMAT: docs/Product code.xlsx (12 columns)
                for ($row = 2; $row <= $highestRow; $row++) {
                    $productCode = trim((string)$sheet->getCell("A{$row}")->getValue());
                    $productName = trim((string)$sheet->getCell("B{$row}")->getValue());
                    $interestRateVal = (float)trim((string)$sheet->getCell("C{$row}")->getValue());
                    $durationVal = (int)trim((string)$sheet->getCell("D{$row}")->getValue());
                    $mainProductCode = trim((string)$sheet->getCell("E{$row}")->getValue());
                    $loanInstVal = (float)trim((string)$sheet->getCell("F{$row}")->getValue());
                    $interestInstVal = (float)trim((string)$sheet->getCell("G{$row}")->getValue());
                    $savingsInstVal = (float)trim((string)$sheet->getCell("H{$row}")->getValue());
                    $minAmountVal = (float)trim((string)$sheet->getCell("I{$row}")->getValue());
                    $maxAmountVal = (float)trim((string)$sheet->getCell("J{$row}")->getValue());
                    $calcMethodVal = strtoupper(trim((string)$sheet->getCell("K{$row}")->getValue()));
                    $freqVal = strtoupper(trim((string)$sheet->getCell("L{$row}")->getValue()));

                    // Skip empty rows
                    if ($productCode === '' && $productName === '') {
                        continue;
                    }

                    // Skip Category Header rows (where Duration == 0 and Rate == 0) - NEVER create category!
                    if (($durationVal === 0 && $interestRateVal === 0.0) || ($productCode === $mainProductCode && $durationVal === 0)) {
                        continue;
                    }

                    if ($productCode === '') {
                        $skippedCount++;
                        $errors[] = "Row {$row}: Product Code is missing.";
                        continue;
                    }

                    // Map to existing category only
                    $categoryId = null;
                    if ($mainProductCode !== '') {
                        $mKey = strtolower($mainProductCode);
                        if (isset($mainCodeToCategoryCode[$mKey]) && isset($categoryByCodeMap[$mainCodeToCategoryCode[$mKey]])) {
                            $categoryId = $categoryByCodeMap[$mainCodeToCategoryCode[$mKey]];
                        } elseif (isset($categoryByCodeMap[$mKey])) {
                            $categoryId = $categoryByCodeMap[$mKey];
                        }
                    }

                    // Fallback to name heuristic matching existing categories
                    if (!$categoryId) {
                        $lowerName = strtolower($productName);
                        if (str_contains($lowerName, 'sufolon') && isset($categoryByCodeMap['sfl'])) {
                            $categoryId = $categoryByCodeMap['sfl'];
                        } elseif (str_contains($lowerName, 'jagoron') && isset($categoryByCodeMap['01.00'])) {
                            $categoryId = $categoryByCodeMap['01.00'];
                        } elseif ((str_contains($lowerName, 'agr') || str_contains($lowerName, 'csl') || str_contains($lowerName, 'lift')) && isset($categoryByCodeMap['agr'])) {
                            $categoryId = $categoryByCodeMap['agr'];
                        } elseif (str_contains($lowerName, 'buniad') && isset($categoryByCodeMap['03.00'])) {
                            $categoryId = $categoryByCodeMap['03.00'];
                        } elseif ((str_contains($lowerName, 'enr') || str_contains($lowerName, 'iga') || str_contains($lowerName, 'lil')) && isset($categoryByCodeMap['enr'])) {
                            $categoryId = $categoryByCodeMap['enr'];
                        } elseif ((str_contains($lowerName, 'rmtp') || str_contains($lowerName, 'bnf') || str_contains($lowerName, 'scl') || str_contains($lowerName, 'cmsme') || str_contains($lowerName, 'mfmsf') || str_contains($lowerName, 'sahos')) && isset($categoryByCodeMap['rmtp'])) {
                            $categoryId = $categoryByCodeMap['rmtp'];
                        } elseif ((str_contains($lowerName, 'ecccp') || str_contains($lowerName, 'drought') || str_contains($lowerName, 'efrrap')) && isset($categoryByCodeMap['ecccp'])) {
                            $categoryId = $categoryByCodeMap['ecccp'];
                        } elseif ((str_contains($lowerName, 'abason') || str_contains($lowerName, 'abs')) && isset($categoryByCodeMap['abs'])) {
                            $categoryId = $categoryByCodeMap['abs'];
                        } else {
                            $categoryId = $categories->first()?->id;
                        }
                    }

                    $installmentType = ($freqVal === 'W') ? 'weekly' : 'monthly';
                    if ($durationVal === 6 && in_array($calcMethodVal, ['D', 'LUMP'], true) && str_contains(strtolower($productName), 'seasonal')) {
                        $installmentType = 'lump_sum';
                    }

                    $durationMonths = ($freqVal === 'W') ? 12 : ($durationVal > 0 ? $durationVal : 12);
                    $numberOfInstallments = ($freqVal === 'W') ? ($durationVal > 0 ? $durationVal : 46) : ($durationVal > 0 ? $durationVal : 12);

                    $minAmount = $minAmountVal >= 0 ? $minAmountVal : 0;
                    $maxAmount = $maxAmountVal >= $minAmount ? $maxAmountVal : $minAmount;
                    $interestRate = $interestRateVal >= 0 ? $interestRateVal : 0;

                    $interestCalcType = 'flat';
                    if ($calcMethodVal === 'D') {
                        $interestCalcType = 'reducing';
                    } elseif ($calcMethodVal === 'H') {
                        $interestCalcType = 'housing';
                    }

                    $genderRestriction = 'both';
                    $lowerName = strtolower($productName);
                    if (str_contains($lowerName, 'f/w') || str_contains($lowerName, 'female')) {
                        $genderRestriction = 'female';
                    }

                    $existing = LoanProduct::where('product_code', $productCode)->first();

                    $productData = [
                        'loan_category_id' => $categoryId,
                        'product_name' => $productName,
                        'product_name_bn' => $existing?->product_name_bn ?: $productName,
                        'product_code' => $productCode,
                        'main_product_code' => $mainProductCode ?: null,
                        'installment_type' => $installmentType,
                        'duration_months' => $durationMonths,
                        'number_of_installments' => $numberOfInstallments,
                        'loan_installment_factor' => $loanInstVal,
                        'interest_installment_factor' => $interestInstVal,
                        'savings_installment' => $savingsInstVal,
                        'min_amount' => $minAmount,
                        'max_amount' => $maxAmount,
                        'interest_rate' => $interestRate,
                        'interest_calculation_type' => $interestCalcType,
                        'gender_restriction' => $genderRestriction,
                        'min_age' => $existing?->min_age ?? 18,
                        'max_age' => $existing?->max_age ?? 65,
                        'requires_guarantor' => $existing?->requires_guarantor ?? true,
                        'number_of_guarantors' => $existing?->number_of_guarantors ?? 1,
                        'is_active' => true,
                    ];

                    if ($existing) {
                        $existing->update($productData);
                        $updatedCount++;
                    } else {
                        LoanProduct::create($productData);
                        $createdCount++;
                    }
                }
            } else {
                // FORMAT: Full Standard Template (27 columns)
                for ($row = 2; $row <= $highestRow; $row++) {
                    $catCode = trim((string)$sheet->getCell("A{$row}")->getValue());
                    $catName = trim((string)$sheet->getCell("B{$row}")->getValue());
                    $mainProductCode = trim((string)$sheet->getCell("C{$row}")->getValue());
                    $productCode = trim((string)$sheet->getCell("D{$row}")->getValue());
                    $productName = trim((string)$sheet->getCell("E{$row}")->getValue());
                    $productNameBn = trim((string)$sheet->getCell("F{$row}")->getValue());
                    $installmentTypeVal = strtolower(trim((string)$sheet->getCell("G{$row}")->getValue()));
                    $durationMonthsVal = (int)trim((string)$sheet->getCell("H{$row}")->getValue());
                    $numberOfInstallmentsVal = (int)trim((string)$sheet->getCell("I{$row}")->getValue());
                    $minAmountVal = (float)trim((string)$sheet->getCell("J{$row}")->getValue());
                    $maxAmountVal = (float)trim((string)$sheet->getCell("K{$row}")->getValue());
                    $interestRateVal = (float)trim((string)$sheet->getCell("L{$row}")->getValue());
                    $serviceChargeVal = (float)trim((string)$sheet->getCell("M{$row}")->getValue());
                    $serviceChargePerThousandVal = (float)trim((string)$sheet->getCell("N{$row}")->getValue());
                    $installmentPerThousandVal = (float)trim((string)$sheet->getCell("O{$row}")->getValue());
                    $lastInstallmentPerThousandVal = (float)trim((string)$sheet->getCell("P{$row}")->getValue());
                    $loanInstFactorVal = (float)trim((string)$sheet->getCell("Q{$row}")->getValue());
                    $intInstFactorVal = (float)trim((string)$sheet->getCell("R{$row}")->getValue());
                    $savingsInstVal = (float)trim((string)$sheet->getCell("S{$row}")->getValue());
                    $interestCalcTypeVal = strtolower(trim((string)$sheet->getCell("T{$row}")->getValue()));
                    $genderVal = strtolower(trim((string)$sheet->getCell("U{$row}")->getValue()));
                    $minAgeVal = (int)trim((string)$sheet->getCell("V{$row}")->getValue());
                    $maxAgeVal = (int)trim((string)$sheet->getCell("W{$row}")->getValue());
                    $requiresGuarantorVal = strtolower(trim((string)$sheet->getCell("X{$row}")->getValue()));
                    $numberOfGuarantorsVal = (int)trim((string)$sheet->getCell("Y{$row}")->getValue());
                    $statusVal = strtolower(trim((string)$sheet->getCell("Z{$row}")->getValue()));
                    $description = trim((string)$sheet->getCell("AA{$row}")->getValue());

                    // Fallback if older 20-col format
                    if ($productCode === '' && $catCode !== '' && $sheet->getCell("C{$row}")->getValue() !== '') {
                        $productCode = trim((string)$sheet->getCell("C{$row}")->getValue());
                        $productName = trim((string)$sheet->getCell("D{$row}")->getValue());
                        $productNameBn = trim((string)$sheet->getCell("E{$row}")->getValue());
                    }

                    if ($catCode === '' && $productCode === '' && $productName === '') {
                        continue;
                    }

                    if ($productCode === '' || $productName === '') {
                        $skippedCount++;
                        $errors[] = "Row {$row}: Product Code and Product Name are required.";
                        continue;
                    }

                    // Match Category from existing categories only
                    $categoryId = null;
                    if ($catCode !== '' && isset($categoryByCodeMap[strtolower($catCode)])) {
                        $categoryId = $categoryByCodeMap[strtolower($catCode)];
                    } elseif ($catName !== '' && isset($categoryByNameMap[strtolower($catName)])) {
                        $categoryId = $categoryByNameMap[strtolower($catName)];
                    } elseif ($mainProductCode !== '' && isset($mainCodeToCategoryCode[strtolower($mainProductCode)]) && isset($categoryByCodeMap[$mainCodeToCategoryCode[strtolower($mainProductCode)]])) {
                        $categoryId = $categoryByCodeMap[$mainCodeToCategoryCode[strtolower($mainProductCode)]];
                    }

                    if (!$categoryId) {
                        $categoryId = $categories->first()?->id;
                    }

                    $installmentType = in_array($installmentTypeVal, ['monthly', 'মাসিক'], true)
                        ? 'monthly'
                        : (in_array($installmentTypeVal, ['lump_sum', 'এককালীন'], true) ? 'lump_sum' : 'weekly');

                    $durationMonths = $durationMonthsVal > 0 ? $durationMonthsVal : 12;
                    $numberOfInstallments = $numberOfInstallmentsVal > 0 ? $numberOfInstallmentsVal : ($installmentType === 'monthly' ? $durationMonths : 46);
                    $minAmount = $minAmountVal >= 0 ? $minAmountVal : 0;
                    $maxAmount = $maxAmountVal >= $minAmount ? $maxAmountVal : $minAmount;
                    $interestRate = $interestRateVal >= 0 ? $interestRateVal : 0;
                    $serviceCharge = $serviceChargeVal >= 0 ? $serviceChargeVal : 0;

                    $interestCalculationType = in_array($interestCalcTypeVal, ['flat', 'reducing', 'compound', 'housing'], true)
                        ? $interestCalcTypeVal
                        : 'flat';

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
                        'main_product_code' => $mainProductCode ?: null,
                        'description' => $description ?: null,
                        'installment_type' => $installmentType,
                        'duration_months' => $durationMonths,
                        'number_of_installments' => $numberOfInstallments,
                        'min_amount' => $minAmount,
                        'max_amount' => $maxAmount,
                        'interest_rate' => $interestRate,
                        'service_charge' => $serviceCharge,
                        'service_charge_per_thousand' => $serviceChargePerThousandVal,
                        'installment_amount_per_thousand' => $installmentPerThousandVal,
                        'last_installment_per_thousand' => $lastInstallmentPerThousandVal,
                        'loan_installment_factor' => $loanInstFactorVal,
                        'interest_installment_factor' => $intInstFactorVal,
                        'savings_installment' => $savingsInstVal,
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
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Error during Excel import: ' . $e->getMessage());
        }

        $totalProcessed = $createdCount + $updatedCount;
        $msg = "Excel import successful! Created: {$createdCount}, Updated: {$updatedCount}.";
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
            'Main Product Code',
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
            'Service Charge / 1000',
            'Inst. Amount / 1000',
            'Last Inst. / 1000',
            'Loan Inst. Factor',
            'Interest Inst. Factor',
            'Savings Inst.',
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
            'font' => ['bold' => true, 'size' => 10, 'color' => ['rgb' => 'FFFFFF']],
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
        $sheet->getStyle('A1:AA1')->applyFromArray($headerStyle);
        $sheet->getRowDimension(1)->setRowHeight(32);

        $widths = [
            'A' => 14,
            'B' => 20,
            'C' => 16,
            'D' => 16,
            'E' => 24,
            'F' => 24,
            'G' => 16,
            'H' => 16,
            'I' => 16,
            'J' => 14,
            'K' => 14,
            'L' => 14,
            'M' => 14,
            'N' => 16,
            'O' => 16,
            'P' => 16,
            'Q' => 16,
            'R' => 16,
            'S' => 14,
            'T' => 16,
            'U' => 16,
            'V' => 12,
            'W' => 12,
            'X' => 16,
            'Y' => 16,
            'Z' => 12,
            'AA' => 28,
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

                $sheet->getStyle("A{$r}:AA{$r}")->applyFromArray([
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
                $sheet->getStyle("D{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("G{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("H{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("I{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("J{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $sheet->getStyle("K{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $sheet->getStyle("L{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $sheet->getStyle("M{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $sheet->getStyle("N{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $sheet->getStyle("O{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $sheet->getStyle("P{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $sheet->getStyle("Q{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $sheet->getStyle("R{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $sheet->getStyle("S{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $sheet->getStyle("T{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("U{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("V{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("W{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("X{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("Y{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("Z{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            }
        }

        return $spreadsheet;
    }
}
