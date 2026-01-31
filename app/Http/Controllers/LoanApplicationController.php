<?php

namespace App\Http\Controllers;

use App\Models\LoanApplication;
use App\Models\LoanMember;
use App\Models\Branch;
use App\Models\Zone;
use App\Models\Area;
use App\Models\ApplicationIssue;
use App\Helpers\BanglaDataConverter;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LoanApplicationController extends Controller
{
    /**
     * Sanitize data for JSON encoding
     */
    private function sanitizeForJson($data)
    {
        if (is_array($data)) {
            return array_map([$this, 'sanitizeForJson'], $data);
        }

        if (is_string($data)) {
            // Remove any invalid UTF-8 sequences
            return mb_convert_encoding($data, 'UTF-8', 'UTF-8');
        }

        return $data;
    }

    /**
     * Display a listing of loan applications
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $selectedDate = $request->input('date', now()->toDateString());
        $statusFilter = $request->input('status', '');
        $searchQuery = $request->input('search', '');

        // Clean up filters
        if ($statusFilter === 'null' || $statusFilter === null) {
            $statusFilter = '';
        }
        if ($searchQuery === 'null' || $searchQuery === null) {
            $searchQuery = '';
        }

        // Trim whitespace
        $statusFilter = trim($statusFilter ?? '');
        $searchQuery = trim($searchQuery ?? '');

        // Get branch_id from user
        $userBranchId = $user->branch_id;

        // Get members for this branch submitted on selected date
        // Select all fields needed for view modal
        $query = LoanMember::with([
                'loanApplication:id,application_no,branch_id',
                'loanApplication.branch:id,name,area_id',
                'loanApplication.branch.area:id,name,zone_id',
                'loanApplication.branch.area.zone:id,name',
                'issues'
            ])
            ->whereHas('loanApplication', function ($q) use ($userBranchId, $selectedDate) {
                if ($userBranchId) {
                    $q->where('branch_id', $userBranchId);
                }
                $q->whereDate('submitted_at', $selectedDate)
                  ->whereNotNull('submitted_at');
            });

        // Filter by status - ONLY if statusFilter is not empty
        if (!empty($statusFilter)) {
            $query->where('status', $statusFilter);
        }

        // Search by name/mobile
        if (!empty($searchQuery)) {
            $query->where(function ($q) use ($searchQuery) {
                $q->where('member_name', 'like', "%{$searchQuery}%")
                  ->orWhere('mobile', 'like', "%{$searchQuery}%");
            });
        }

        // Get members - issues first, then by name
        $members = $query->orderByRaw("FIELD(status, 'issue', 'pending', 'approved', 'rejected')")
            ->orderBy('member_name')
            ->get();
// Get issues for members - get all issues to show complete picture
        // This includes rejection issues from Head Office (status='rejected')
        // as well as open issues that need attention (status='open')
        $memberIds = $members->pluck('id')->toArray();
        $issues = ApplicationIssue::whereIn('member_id', $memberIds)
            ->where('application_type', 'loan')
            ->whereIn('status', ['open', 'rejected'])
            ->get()
            ->groupBy('member_id');

        // Format members data with all fields for view modal
        $membersData = $members->map(function ($member) use ($issues) {
            $memberIssues = $issues->get($member->id, collect());
            $app = $member->loanApplication;
            return [
                'id' => $member->id,
                'serial_no' => $member->serial_no,
                'loan_type' => $member->loan_type,
                'somiti_name' => $member->somiti_name,
                'somiti_code' => $member->somiti_code,
                'member_name' => $member->member_name,
                'member_code' => $member->member_code,
                'member_mobile' => $member->member_mobile,
                'mobile' => $member->member_mobile, // alias for compatibility
                'general_savings' => $member->general_savings,
                'total_savings' => $member->total_savings,
                'principal_amount' => $member->principal_amount,
                'paid_installment_count' => $member->paid_installment_count,
                'approved_loan_amount' => $member->approved_loan_amount,
                'installment_increment_rate' => $member->installment_increment_rate,
                'loan_duration' => $member->loan_duration,
                'phase_no' => $member->phase_no,
                'project_name' => $member->project_name,
                'loan_release_or_approval_date' => $member->loan_release_or_approval_date?->format('Y-m-d'),
                'loan_distribution_date' => $member->loan_distribution_date?->format('Y-m-d'),
                'approved_by' => $member->approved_by,
                'remarks' => $member->remarks,
                'status' => $member->status,
                'application_no' => $app->application_no,
                'branch_name' => $app->branch?->name,
                'area_name' => $app->branch?->area?->name,
                'zone_name' => $app->branch?->area?->zone?->name,
                'issues' => $memberIssues->map(function ($issue) {
                    return [
                        'id' => $issue->id,
                        'issue_type' => $issue->issue_type,
                        'issue_description' => $issue->issue_description,
                        'severity' => $issue->severity,
                        'status' => $issue->status,
                        'created_at' => $issue->created_at->format('Y-m-d H:i'),
                        'resolution_notes' => $issue->resolution_notes,
                    ];
                })->values()->toArray(),
            ];
        });

        // Get statistics for this date
        $baseQuery = LoanMember::whereHas('loanApplication', function ($q) use ($user, $selectedDate) {
            if ($user->branch_id) {
                $q->where('branch_id', $user->branch_id);
            }
            $q->whereDate('submitted_at', $selectedDate)
              ->whereNotNull('submitted_at');
        });

        $stats = [
            'total' => (clone $baseQuery)->count(),
            'pending' => (clone $baseQuery)->where('status', 'pending')->count(),
            'issue' => (clone $baseQuery)->where('status', 'issue')->count(),
            'approved' => (clone $baseQuery)->where('status', 'approved')->count(),
            'rejected' => (clone $baseQuery)->where('status', 'rejected')->count(),
        ];

        return Inertia::render('Loan/Index', [
            'members' => $membersData->values()->toArray(),
            'selectedDate' => $selectedDate,
            'statusFilter' => $statusFilter,
            'searchQuery' => $searchQuery,
            'stats' => $stats,
        ]);
    }

    /**
     * Show the form for uploading new loan application
     */
    public function create(Request $request): Response
    {
        $user = $request->user();

        // Get user's accessible branches
        if ($user->branch_id) {
            // Single branch user
            $branches = [[
                'id' => $user->branch_id,
                'name' => DB::table('branches')->where('id', $user->branch_id)->value('name'),
                'code' => DB::table('branches')->where('id', $user->branch_id)->value('code'),
            ]];
            $selectedBranchId = $user->branch_id;
        } elseif (!$user->has_all_access) {
            // Multi-branch user
            $branches = DB::table('user_branches')
                ->join('branches', 'user_branches.branch_id', '=', 'branches.id')
                ->where('user_branches.user_id', $user->id)
                ->select('branches.id', 'branches.name', 'branches.code')
                ->get()
                ->map(function($branch) {
                    return [
                        'id' => $branch->id,
                        'name' => $branch->name,
                        'code' => $branch->code,
                    ];
                })
                ->toArray();
            $selectedBranchId = null;
        } else {
            // SuperAdmin - all branches
            $branches = DB::table('branches')
                ->select('id', 'name', 'code')
                ->orderBy('name')
                ->get()
                ->map(function($branch) {
                    return [
                        'id' => $branch->id,
                        'name' => $branch->name,
                        'code' => $branch->code,
                    ];
                })
                ->toArray();
            $selectedBranchId = null;
        }

        return Inertia::render('Loan/Upload', [
            'branches' => $branches,
            'selectedBranchId' => $selectedBranchId,
        ]);
    }

    /**
     * Download XLSX template with Bangla headers
     * Headers match the exact order from the image specification
     */
    public function downloadTemplate()
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Headers based on image specification (exact order)
        // Note: Zone, Area, Branch info comes from system (user's branch) - not in Excel
        $headers = [
            'ক্রমিক নং',                    // A - serial_no
            'ঋণের ধরন',                     // B - loan_type
            'সমিতির নাম',                   // C - somiti_name
            'সমিতি কোড',                    // D - somiti_code
            'সদস্যের নাম',                  // E - member_name
            'সদস্য কোড',                    // F - member_code
            'সদস্য মোবাইল নম্বর',           // G - member_mobile
            'সাধারণ সঞ্চয়',                 // H - general_savings
            'মোট সঞ্চয়',                    // I - total_savings
            'মূল ঋণ',                       // J - principal_amount (সর্বশেষ পরিশোধিত)
            'কত কিস্তিতে পরিশোধ করা হয়েছে', // K - paid_installment_count
            'অনুমোদিত ঋণের পরিমাণ',         // L - approved_loan_amount (বর্তমান বিতরণ)
            'ঋণের কিস্তির বৃদ্ধির হার',     // M - installment_increment_rate
            'ঋণের মেয়াদ',                   // N - loan_duration
            'দফা নং',                       // O - phase_no
            'প্রকল্পের নাম',                 // P - project_name
            'ঋণ ছাড়ের/অনুমোদনের তারিখ',     // Q - loan_release_or_approval_date (টিম ভিত্তিক)
            'ঋণ বিতরণের নতুন তারিখ',        // R - loan_distribution_date
            'ছাড়কারী/অনুমোদনকারী কর্মকর্তার নাম', // S - approved_by
            'মন্তব্য'                        // T - remarks
        ];

        $sheet->fromArray($headers, null, 'A1');

        // Style header row with yellow background as shown in image
        $headerStyle = [
            'font' => ['bold' => true, 'size' => 11],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'FFFF00'] // Yellow as in image
            ],
            'alignment' => [
                'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
                'vertical' => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER,
                'wrapText' => true,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                    'color' => ['rgb' => '000000'],
                ],
            ],
        ];
        $sheet->getStyle('A1:T1')->applyFromArray($headerStyle);
        $sheet->getRowDimension(1)->setRowHeight(40);

        // Set column widths (20 columns: A-T)
        $columnWidths = [
            'A' => 10,  // ক্রমিক নং
            'B' => 12,  // ঋণের ধরন
            'C' => 18,  // সমিতির নাম
            'D' => 12,  // সমিতি কোড
            'E' => 20,  // সদস্যের নাম
            'F' => 12,  // সদস্য কোড
            'G' => 15,  // সদস্য মোবাইল নম্বর
            'H' => 12,  // সাধারণ সঞ্চয়
            'I' => 12,  // মোট সঞ্চয়
            'J' => 12,  // মূল ঋণ
            'K' => 20,  // কত কিস্তিতে পরিশোধ
            'L' => 18,  // অনুমোদিত ঋণের পরিমাণ
            'M' => 18,  // কিস্তির বৃদ্ধির হার
            'N' => 12,  // ঋণের মেয়াদ
            'O' => 10,  // দফা নং
            'P' => 15,  // প্রকল্পের নাম
            'Q' => 20,  // ঋণ ছাড়ের তারিখ
            'R' => 18,  // বিতরণের নতুন তারিখ
            'S' => 25,  // ছাড়কারী নাম
            'T' => 15,  // মন্তব্য
        ];

        foreach ($columnWidths as $col => $width) {
            $sheet->getColumnDimension($col)->setWidth($width);
        }

        // Add sample data row (Zone/Area/Branch comes from system automatically)
        $sampleData = [
            '১',                      // ক্রমিক নং
            'ক্ষুদ্র ঋণ',              // ঋণের ধরন
            'উন্নয়ন সমিতি',           // সমিতির নাম
            'SM-001',                 // সমিতি কোড
            'মোহাম্মদ আলী',            // সদস্যের নাম
            'M-001',                  // সদস্য কোড
            '০১৭১২৩৪৫৬৭৮',            // সদস্য মোবাইল নম্বর
            '5000',                   // সাধারণ সঞ্চয়
            '8000',                   // মোট সঞ্চয়
            '50000',                  // মূল ঋণ
            '12',                     // কত কিস্তিতে পরিশোধ
            '60000',                  // অনুমোদিত ঋণের পরিমাণ
            '10',                     // কিস্তির বৃদ্ধির হার
            '12',                     // ঋণের মেয়াদ
            '২',                      // দফা নং
            'ক্ষুদ্র ব্যবসা',          // প্রকল্পের নাম
            '২০২৬-০১-১৫',             // ঋণ ছাড়ের তারিখ
            '২০২৬-০১-২০',             // বিতরণের নতুন তারিখ
            'জনাব আহমেদ',              // ছাড়কারী নাম
            'প্রথম দফা'               // মন্তব্য
        ];
        $sheet->fromArray($sampleData, null, 'A2');

        // Style sample data row
        $dataStyle = [
            'borders' => [
                'allBorders' => [
                    'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                    'color' => ['rgb' => '000000'],
                ],
            ],
        ];
        $sheet->getStyle('A2:T2')->applyFromArray($dataStyle);

        // Create writer and save to temp file
        $writer = new Xlsx($spreadsheet);
        $writer->setPreCalculateFormulas(false);

        $fileName = 'loan_application_template_' . date('Y-m-d') . '.xlsx';
        $tempFile = tempnam(sys_get_temp_dir(), 'loan_template');
        $writer->save($tempFile);

        return response()->download($tempFile, $fileName)->deleteFileAfterSend(true);
    }

    /**
     * Store uploaded XLSX and parse data
     */
    public function store(Request $request)
    {
        $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'excel_file' => 'required|file|mimes:xlsx,xls|max:5120',
            'branch_remarks' => 'nullable|string|max:1000',
        ]);

        $user = $request->user();

        // Verify user has access to this branch
        if (!$user->has_all_access) {
            if ($user->branch_id && $user->branch_id != $request->branch_id) {
                return back()->withErrors(['branch_id' => 'You do not have access to this branch.']);
            } elseif (!$user->branch_id) {
                $hasAccess = $user->branches()->where('branches.id', $request->branch_id)->exists();
                if (!$hasAccess) {
                    return back()->withErrors(['branch_id' => 'You do not have access to this branch.']);
                }
            }
        }

        try {
            DB::beginTransaction();

            // Store uploaded file
            $file = $request->file('excel_file');
            $fileName = time() . '_' . $file->getClientOriginalName();
            $filePath = $file->storeAs('loan_applications', $fileName, 'public');

            // Parse Excel file with proper UTF-8 encoding for Bangla text
            $reader = IOFactory::createReaderForFile($file->getRealPath());
            $reader->setReadDataOnly(true);
            $spreadsheet = $reader->load($file->getRealPath());
            $sheet = $spreadsheet->getActiveSheet();

            // Convert to array - PhpSpreadsheet handles encoding automatically
            $rows = $sheet->toArray(null, true, true, false); // false for 0-indexed arrays

            // Remove header row
            array_shift($rows);

            // Filter out empty rows and re-index
            // Column E (index 4) is member_name which is required
            $rows = array_values(array_filter($rows, function($row) {
                return !empty($row[0]) && !empty($row[4]); // Check serial_no and member_name
            }));

            if (empty($rows)) {
                DB::rollBack();
                return back()->withErrors(['excel_file' => 'Excel file contains no valid data rows.']);
            }

            // Create loan application
            $application = LoanApplication::create([
                'application_no' => LoanApplication::generateApplicationNo(),
                'branch_id' => $request->branch_id,
                'submitted_by' => $user->id,
                'excel_file_path' => $filePath,
                'excel_file_name' => $fileName,
                'total_members' => count($rows),
                'status' => LoanApplication::STATUS_PENDING,
                'submitted_at' => now(),
                'branch_remarks' => $request->branch_remarks,
            ]);

            // Parse and store loan members using BanglaDataConverter
            // Handles: Bijoy to Unicode, Bangla digits, various date formats automatically

            foreach ($rows as $index => $row) {
                try {
                    // Use BanglaDataConverter to process the entire row
                    // This handles: Bijoy encoding, Bangla numbers, date formats, mobile numbers
                    $memberData = BanglaDataConverter::processLoanMemberRow($row);

                    // Validate member_name exists
                    if (empty($memberData['member_name'])) {
                        throw new \Exception('Member name is required');
                    }

                    // Auto-generate serial_no if null or invalid
                    $serialNo = $memberData['serial_no'];
                    if (empty($serialNo) || !is_numeric($serialNo)) {
                        $serialNo = $index + 1; // 1-based index
                    }

                    // Create member with processed data
                    LoanMember::create([
                        'loan_application_id' => $application->id,
                        'serial_no' => $serialNo,
                        'loan_type' => $memberData['loan_type'],
                        'somiti_name' => $memberData['somiti_name'],
                        'somiti_code' => $memberData['somiti_code'],
                        'member_name' => $memberData['member_name'],
                        'member_code' => $memberData['member_code'],
                        'member_mobile' => $memberData['member_mobile'],
                        'general_savings' => $memberData['general_savings'],
                        'total_savings' => $memberData['total_savings'],
                        'principal_amount' => $memberData['principal_amount'],
                        'paid_installment_count' => $memberData['paid_installment_count'],
                        'approved_loan_amount' => $memberData['approved_loan_amount'],
                        'installment_increment_rate' => $memberData['installment_increment_rate'],
                        'loan_duration' => $memberData['loan_duration'],
                        'phase_no' => $memberData['phase_no'],
                        'project_name' => $memberData['project_name'],
                        'loan_release_or_approval_date' => $memberData['loan_release_or_approval_date'],
                        'loan_distribution_date' => $memberData['loan_distribution_date'],
                        'approved_by' => $memberData['approved_by'],
                        'remarks' => $memberData['remarks'],
                        'status' => 'pending',
                    ]);

                } catch (\Exception $e) {
                    \Log::error('Error creating loan member', [
                        'index' => $index,
                        'error' => $e->getMessage(),
                        'row_data' => array_map(function($val) {
                            return is_string($val) ? mb_substr($val, 0, 50) : $val;
                        }, $row)
                    ]);
                    throw $e;
                }
            }

            DB::commit();

            return redirect()->route('loan.index')->with('success', 'Loan application submitted successfully!');

        } catch (\Exception $e) {
            \Log::error('Loan upload failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            DB::rollBack();
            return back()->withErrors(['excel_file' => 'Error processing file: ' . $e->getMessage()]);
        }
    }

    /**
     * Display the specified loan application
     */
    public function show(LoanApplication $loanApplication): Response
    {
        $loanApplication->load(['branch', 'submittedBy', 'reviewedBy', 'loanMembers']);

        return Inertia::render('Loan/Show', [
            'application' => $loanApplication,
        ]);
    }

    /**
     * Test analyze uploaded Excel file for Bangla content
     */
    public function testAnalyze(Request $request)
    {
        $request->validate([
            'excel_file' => 'required|file|mimes:xlsx,xls|max:5120',
        ]);

        try {
            $file = $request->file('excel_file');

            // Load Excel file
            $spreadsheet = IOFactory::load($file->getRealPath());
            $sheet = $spreadsheet->getActiveSheet();

            // Get first 10 rows of data
            $sampleData = [];
            $rowCount = 0;
            $banglaCharCount = 0;
            $totalCharCount = 0;

            foreach ($sheet->getRowIterator() as $row) {
                if ($rowCount >= 10) break;

                $cellIterator = $row->getCellIterator();
                $cellIterator->setIterateOnlyExistingCells(false);

                $rowData = [];
                foreach ($cellIterator as $cell) {
                    $value = $cell->getFormattedValue();

                    if (is_string($value) && !empty($value)) {
                        // Count Bangla characters
                        $matches = preg_match_all('/[\x{0980}-\x{09FF}]/u', $value);
                        if ($matches) {
                            $banglaCharCount += $matches;
                        }
                        $totalCharCount += mb_strlen($value);
                    }

                    $rowData[] = $value;
                }

                $sampleData[] = $rowData;
                $rowCount++;
            }

            // Detect encoding of file content
            $xmlContent = file_get_contents('zip://' . $file->getRealPath() . '#xl/sharedStrings.xml');
            $encoding = mb_detect_encoding($xmlContent, ['UTF-8', 'ISO-8859-1', 'Windows-1252'], true);

            // Check if Bangla characters exist
            $hasBangla = $banglaCharCount > 0;
            $banglaPercentage = $totalCharCount > 0 ? round(($banglaCharCount / $totalCharCount) * 100, 2) : 0;

            $analysisResult = [
                'file_name' => $file->getClientOriginalName(),
                'file_size' => $file->getSize(),
                'mime_type' => $file->getMimeType(),
                'has_bangla' => $hasBangla,
                'bangla_char_count' => $banglaCharCount,
                'total_char_count' => $totalCharCount,
                'bangla_percentage' => $banglaPercentage,
                'detected_encoding' => $encoding ?: 'Unknown',
                'sample_data' => $sampleData,
                'row_count' => $sheet->getHighestRow(),
                'column_count' => \PhpOffice\PhpSpreadsheet\Cell\Coordinate::columnIndexFromString($sheet->getHighestColumn()),
            ];

            return back()->with('analysisResult', $analysisResult);

        } catch (\Exception $e) {
            return back()->withErrors(['excel_file' => 'Error analyzing file: ' . $e->getMessage()]);
        }
    }

    /**
     * Head Office - View all loan submissions with filters
     */
    public function submissions(Request $request): Response
    {
        // Zone/Area/Branch comes from loan_application->branch->area->zone relationship
        $query = LoanApplication::with([
            'branch.area.zone',
            'submittedBy',
            'loanMembers' => function ($q) {
                $q->select(
                    'id',
                    'loan_application_id',
                    'serial_no',
                    'loan_type',
                    'somiti_name',
                    'somiti_code',
                    'member_name',
                    'member_code',
                    'member_mobile',
                    'general_savings',
                    'total_savings',
                    'principal_amount',
                    'paid_installment_count',
                    'approved_loan_amount',
                    'installment_increment_rate',
                    'loan_duration',
                    'phase_no',
                    'project_name',
                    'loan_release_or_approval_date',
                    'loan_distribution_date',
                    'approved_by',
                    'remarks',
                    'status'
                );
            }
        ])->orderBy('created_at', 'desc');

        // Apply filters
        if ($request->has('zone_id') && $request->zone_id) {
            $query->whereHas('branch.area', function($q) use ($request) {
                $q->where('zone_id', $request->zone_id);
            });
        }

        if ($request->has('area_id') && $request->area_id) {
            $query->whereHas('branch', function($q) use ($request) {
                $q->where('area_id', $request->area_id);
            });
        }

        if ($request->has('branch_id') && $request->branch_id) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        // Filter by date - default to today if not provided
        $date = $request->date ?: now()->toDateString();
        $query->whereDate('submitted_at', $date);

        // Filter by read/unread
        if ($request->has('read_status')) {
            if ($request->read_status === 'unread') {
                $query->whereNull('reviewed_at');
            } elseif ($request->read_status === 'read') {
                $query->whereNotNull('reviewed_at');
            }
        }

        $applications = $query->paginate(20)->withQueryString();

        // Get filter options
        $zones = Zone::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']);
        $areas = Area::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code', 'zone_id']);
        $branches = Branch::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code', 'area_id']);

        // Get unread count
        $unreadCount = LoanApplication::whereNull('reviewed_at')->count();

        return Inertia::render('HeadOffice/Submissions', [
            'applications' => $applications,
            'zones' => $zones,
            'areas' => $areas,
            'branches' => $branches,
            'unreadCount' => $unreadCount,
            'filters' => array_merge(
                $request->only(['zone_id', 'area_id', 'branch_id', 'status', 'read_status']),
                ['date' => $date]
            ),
        ]);
    }

    /**
     * Mark all applications as read for a specific date
     */
    public function markAllAsRead(Request $request)
    {
        $query = LoanApplication::whereNull('reviewed_at');

        if ($request->has('date') && $request->date) {
            $query->whereDate('submitted_at', $request->date);
        }

        $count = $query->count();
        $query->update(['reviewed_at' => now()]);

        return response()->json([
            'success' => true,
            'count' => $count,
            'message' => "{$count} submissions marked as read"
        ]);
    }

    /**
     * Mark application as read
     */
    public function markAsRead(LoanApplication $loanApplication)
    {
        if (!$loanApplication->reviewed_at) {
            $loanApplication->update([
                'reviewed_at' => now(),
            ]);
        }

        return back()->with('success', 'Application marked as read.');
    }

    /**
     * Export submissions to Excel
     */
    public function exportExcel(Request $request)
    {
        $query = LoanApplication::with(['branch.area.zone', 'submittedBy', 'loanMembers'])
            ->orderBy('created_at', 'desc');

        // Apply same filters as submissions index
        if ($request->has('zone_id') && $request->zone_id) {
            $query->whereHas('branch.area', function($q) use ($request) {
                $q->where('zone_id', $request->zone_id);
            });
        }

        if ($request->has('area_id') && $request->area_id) {
            $query->whereHas('branch', function($q) use ($request) {
                $q->where('area_id', $request->area_id);
            });
        }

        if ($request->has('branch_id') && $request->branch_id) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        if ($request->has('read_status')) {
            if ($request->read_status === 'unread') {
                $query->whereNull('reviewed_at');
            } elseif ($request->read_status === 'read') {
                $query->whereNotNull('reviewed_at');
            }
        }

        $applications = $query->get();

        // Create Excel file
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Set page setup for A4 Landscape
        $sheet->getPageSetup()
            ->setOrientation(\PhpOffice\PhpSpreadsheet\Worksheet\PageSetup::ORIENTATION_LANDSCAPE)
            ->setPaperSize(\PhpOffice\PhpSpreadsheet\Worksheet\PageSetup::PAPERSIZE_A4)
            ->setFitToWidth(1)
            ->setFitToHeight(0);

        // Set margins for better printing
        $sheet->getPageMargins()
            ->setTop(0.5)
            ->setRight(0.5)
            ->setLeft(0.5)
            ->setBottom(0.5);

        // Set headers for loan members details (Bangla) - matches image specification
        // Zone/Area/Branch comes from system (loan_application->branch relationship)
        $headers = [
            'আবেদন নং',
            'জোন',
            'এরিয়া',
            'শাখা',
            'ক্রমিক নং',
            'ঋণের ধরন',
            'সমিতির নাম',
            'সমিতি কোড',
            'সদস্যের নাম',
            'সদস্য কোড',
            'মোবাইল',
            'সাধারণ সঞ্চয়',
            'মোট সঞ্চয়',
            'মূল ঋণ',
            'কিস্তির সংখ্যা',
            'অনুমোদিত ঋণ',
            'কিস্তির হার',
            'মেয়াদ',
            'দফা নং',
            'প্রকল্প',
            'ছাড়ের তারিখ',
            'বিতরণ তারিখ',
            'ছাড়কারী নাম',
            'মন্তব্য',
        ];
        $sheet->fromArray($headers, null, 'A1');

        // Style headers
        $headerStyle = [
            'font' => ['bold' => true, 'size' => 10, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1E40AF']
            ],
            'alignment' => [
                'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
                'vertical' => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER,
                'wrapText' => true,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_MEDIUM,
                    'color' => ['rgb' => '1E293B'],
                ],
            ],
        ];
        $lastColumn = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(count($headers));
        $sheet->getStyle("A1:{$lastColumn}1")->applyFromArray($headerStyle);
        $sheet->getRowDimension(1)->setRowHeight(30);

        // Add data rows - All loan members from all filtered applications
        // Zone/Area/Branch comes from system (loan_application->branch->area->zone)
        $row = 2;
        foreach ($applications as $app) {
            foreach ($app->loanMembers as $member) {
                $sheet->fromArray([
                    $app->application_no,
                    $app->branch->area->zone->name ?? 'N/A',
                    $app->branch->area->name ?? 'N/A',
                    $app->branch->name ?? 'N/A',
                    $member->serial_no,
                    $member->loan_type,
                    $member->somiti_name,
                    $member->somiti_code,
                    $member->member_name,
                    $member->member_code,
                    $member->member_mobile,
                    $member->general_savings,
                    $member->total_savings,
                    $member->principal_amount,
                    $member->paid_installment_count,
                    $member->approved_loan_amount,
                    $member->installment_increment_rate,
                    $member->loan_duration,
                    $member->phase_no,
                    $member->project_name,
                    $member->loan_release_or_approval_date?->format('Y-m-d'),
                    $member->loan_distribution_date?->format('Y-m-d'),
                    $member->approved_by,
                    $member->remarks,
                ], null, "A{$row}");

                // Apply borders and styling to each row
                $rowStyle = [
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                            'color' => ['rgb' => '64748B'],
                        ],
                    ],
                    'alignment' => [
                        'vertical' => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER,
                        'wrapText' => true,
                    ],
                ];

                // Zebra striping - alternate row colors
                if ($row % 2 == 0) {
                    $rowStyle['fill'] = [
                        'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                        'startColor' => ['rgb' => 'F1F5F9']
                    ];
                }

                $sheet->getStyle("A{$row}:{$lastColumn}{$row}")->applyFromArray($rowStyle);
                $sheet->getRowDimension($row)->setRowHeight(20);

                $row++;
            }
        }

        // Set column widths for better printing (24 columns: A-X)
        $sheet->getColumnDimension('A')->setWidth(12); // আবেদন নং
        $sheet->getColumnDimension('B')->setWidth(12); // জোন
        $sheet->getColumnDimension('C')->setWidth(12); // এরিয়া
        $sheet->getColumnDimension('D')->setWidth(15); // শাখা
        $sheet->getColumnDimension('E')->setWidth(8);  // ক্রমিক নং
        $sheet->getColumnDimension('F')->setWidth(12); // ঋণের ধরন
        $sheet->getColumnDimension('G')->setWidth(18); // সমিতির নাম
        $sheet->getColumnDimension('H')->setWidth(12); // সমিতি কোড
        $sheet->getColumnDimension('I')->setWidth(18); // সদস্যের নাম
        $sheet->getColumnDimension('J')->setWidth(12); // সদস্য কোড
        $sheet->getColumnDimension('K')->setWidth(14); // মোবাইল
        $sheet->getColumnDimension('L')->setWidth(12); // সাধারণ সঞ্চয়
        $sheet->getColumnDimension('M')->setWidth(12); // মোট সঞ্চয়
        $sheet->getColumnDimension('N')->setWidth(12); // মূল ঋণ
        $sheet->getColumnDimension('O')->setWidth(12); // কিস্তির সংখ্যা
        $sheet->getColumnDimension('P')->setWidth(12); // অনুমোদিত ঋণ
        $sheet->getColumnDimension('Q')->setWidth(12); // কিস্তির হার
        $sheet->getColumnDimension('R')->setWidth(10); // মেয়াদ
        $sheet->getColumnDimension('S')->setWidth(10); // দফা নং
        $sheet->getColumnDimension('T')->setWidth(15); // প্রকল্প
        $sheet->getColumnDimension('U')->setWidth(14); // ছাড়ের তারিখ
        $sheet->getColumnDimension('V')->setWidth(14); // বিতরণ তারিখ
        $sheet->getColumnDimension('W')->setWidth(20); // ছাড়কারী নাম
        $sheet->getColumnDimension('X')->setWidth(15); // মন্তব্য

        // Set print area and repeat header row on each page
        $sheet->getPageSetup()->setRowsToRepeatAtTopByStartAndEnd(1, 1);

        // Create writer and save to temp file
        $writer = new Xlsx($spreadsheet);
        $fileName = 'ঋণ_সদস্য_তালিকা_' . date('Y-m-d_His') . '.xlsx';
        $tempFile = tempnam(sys_get_temp_dir(), 'submissions');
        $writer->save($tempFile);

        return response()->download($tempFile, $fileName)->deleteFileAfterSend(true);
    }

    /**
     * Export submissions to PDF
     */
    public function exportPdf(Request $request)
    {
        $query = LoanApplication::with(['branch.area.zone', 'submittedBy', 'loanMembers'])
            ->orderBy('created_at', 'desc');

        // Apply same filters
        if ($request->has('zone_id') && $request->zone_id) {
            $query->whereHas('branch.area', function($q) use ($request) {
                $q->where('zone_id', $request->zone_id);
            });
        }

        if ($request->has('area_id') && $request->area_id) {
            $query->whereHas('branch', function($q) use ($request) {
                $q->where('area_id', $request->area_id);
            });
        }

        if ($request->has('branch_id') && $request->branch_id) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        if ($request->has('read_status')) {
            if ($request->read_status === 'unread') {
                $query->whereNull('reviewed_at');
            } elseif ($request->read_status === 'read') {
                $query->whereNotNull('reviewed_at');
            }
        }

        $applications = $query->get();

        // Generate HTML for PDF with proper headers
        $html = view('pdf.loan-submissions', [
            'applications' => $applications,
            'filters' => $request->only(['zone_id', 'area_id', 'branch_id', 'status', 'read_status']),
        ])->render();

        // Return HTML that can be printed as PDF
        return response($html, 200)
            ->header('Content-Type', 'text/html; charset=UTF-8')
            ->header('Content-Disposition', 'inline; filename="ঋণ_সদস্য_তালিকা.pdf"');
    }

    /**
     * Get updated loan members data for auto-refresh (Branch Users)
     */
    public function getUpdatedData(Request $request)
    {
        $user = $request->user();
        $selectedDate = $request->input('date', now()->toDateString());
        $statusFilter = $request->input('status', '');
        $searchQuery = $request->input('search', '');

        // Clean up filters
        $statusFilter = trim($statusFilter ?? '');
        $searchQuery = trim($searchQuery ?? '');

        // Get branch_id from user
        $userBranchId = $user->branch_id;

        // Base query for members
        $baseQuery = function ($q) use ($userBranchId, $selectedDate) {
            if ($userBranchId) {
                $q->where('branch_id', $userBranchId);
            }
            $q->whereDate('submitted_at', $selectedDate)
              ->whereNotNull('submitted_at');
        };

        // Get members for this branch submitted on selected date
        // Include all fields for view modal
        $query = LoanMember::with([
                'loanApplication:id,application_no,branch_id',
                'loanApplication.branch:id,name,area_id',
                'loanApplication.branch.area:id,name,zone_id',
                'loanApplication.branch.area.zone:id,name',
                'issues:id,member_id,issue_type,issue_description,status,created_at,messages,resolution_notes,resolved_at'
            ])
            ->whereHas('loanApplication', $baseQuery);

        // Filter by status - ONLY if statusFilter is not empty
        if (!empty($statusFilter)) {
            $query->where('status', $statusFilter);
        }

        // Search by name/mobile
        if (!empty($searchQuery)) {
            $query->where(function ($q) use ($searchQuery) {
                $q->where('member_name', 'like', "%{$searchQuery}%")
                  ->orWhere('member_mobile', 'like', "%{$searchQuery}%");
            });
        }

        // Get members - issues first, then by name
        $members = $query->orderByRaw("FIELD(status, 'issue', 'pending', 'approved', 'rejected')")
            ->orderBy('member_name')
            ->get();

        // Calculate stats using single query
        $stats = DB::table('loan_members')
            ->whereHas('loanApplication', $baseQuery)
            ->selectRaw('
                COUNT(*) as total,
                SUM(CASE WHEN status = "pending" THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = "issue" THEN 1 ELSE 0 END) as issue,
                SUM(CASE WHEN status = "approved" THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN status = "rejected" THEN 1 ELSE 0 END) as rejected
            ')
            ->first();

        $membersData = $members->map(function ($member) {
            $app = $member->loanApplication;
            return [
                'id' => $member->id,
                'serial_no' => $member->serial_no,
                'loan_type' => $member->loan_type,
                'somiti_name' => $member->somiti_name,
                'somiti_code' => $member->somiti_code,
                'member_name' => $member->member_name,
                'member_code' => $member->member_code,
                'member_mobile' => $member->member_mobile,
                'mobile' => $member->member_mobile, // alias for compatibility
                'general_savings' => $member->general_savings,
                'total_savings' => $member->total_savings,
                'principal_amount' => $member->principal_amount,
                'paid_installment_count' => $member->paid_installment_count,
                'approved_loan_amount' => $member->approved_loan_amount,
                'installment_increment_rate' => $member->installment_increment_rate,
                'loan_duration' => $member->loan_duration,
                'phase_no' => $member->phase_no,
                'project_name' => $member->project_name,
                'loan_release_or_approval_date' => $member->loan_release_or_approval_date?->format('Y-m-d'),
                'loan_distribution_date' => $member->loan_distribution_date?->format('Y-m-d'),
                'approved_by' => $member->approved_by,
                'remarks' => $member->remarks,
                'status' => $member->status,
                'application_no' => $app->application_no,
                'branch_name' => $app->branch?->name,
                'area_name' => $app->branch?->area?->name,
                'zone_name' => $app->branch?->area?->zone?->name,
                'issues' => collect($member->issues ?? [])->map(function ($issue) {
                    return [
                        'id' => $issue->id,
                        'issue_type' => $issue->issue_type,
                        'issue_description' => $issue->issue_description,
                        'severity' => $issue->severity ?? '',
                        'status' => $issue->status,
                        'created_at' => $issue->created_at->format('Y-m-d H:i'),
                        'resolution_notes' => $issue->resolution_notes,
                    ];
                })->toArray(),
            ];
        });

        return response()->json([
            'members' => $membersData,
            'stats' => [
                'total' => (int)($stats->total ?? 0),
                'pending' => (int)($stats->pending ?? 0),
                'issue' => (int)($stats->issue ?? 0),
                'approved' => (int)($stats->approved ?? 0),
                'rejected' => (int)($stats->rejected ?? 0),
            ],
        ]);
    }

    /**
     * Branch resolves issue - member status back to pending
     */
    public function memberResolveIssue(Request $request, $memberId)
    {
        $validated = $request->validate([
            'response' => 'required|string|min:3',
        ]);

        $member = LoanMember::findOrFail($memberId);

        // Get open issues for this member
        $issues = ApplicationIssue::where('application_type', 'loan')
            ->where('member_id', $memberId)
            ->where('status', 'open')
            ->get();

        if ($issues->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'কোনো সমস্যা পাওয়া যায়নি',
            ], 404);
        }

        // Add response message to all issues and mark as resolved
        foreach ($issues as $issue) {
            $issue->addMessage($request->user()->id, "Branch Response: {$validated['response']}", 'branch_response');
            $issue->markResolved($request->user()->id, $validated['response']);
        }

        // Update member status back to pending (waiting for head office review)
        $member->update(['status' => 'pending']);

        return response()->json([
            'success' => true,
            'message' => 'সঠিক কারণ পাঠানো হয়েছে',
        ]);
    }

    /**
     * Branch rejects issue - member will be rejected
     */
    public function memberRejectIssue(Request $request, $memberId)
    {
        $validated = $request->validate([
            'response' => 'required|string|min:3',
        ]);

        $member = LoanMember::findOrFail($memberId);

        // Get open issues for this member
        $issues = ApplicationIssue::where('application_type', 'loan')
            ->where('member_id', $memberId)
            ->where('status', 'open')
            ->get();

        // Add rejection message to all issues
        foreach ($issues as $issue) {
            $issue->addMessage($request->user()->id, "Branch Rejection: {$validated['response']}", 'branch_rejection');
            $issue->markRejected($request->user()->id, $validated['response']);
        }

        // Update member status to rejected
        $member->update([
            'status' => 'rejected',
            'rejection_reason' => $validated['response'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'প্রত্যাখ্যান করা হয়েছে',
        ]);
    }
}
