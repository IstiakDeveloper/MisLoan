<?php

namespace App\Http\Controllers\HeadOffice;

use App\Http\Controllers\Concerns\ScopesToAccessibleBranches;
use App\Http\Controllers\Controller;
use App\Models\LoanApplication;
use App\Services\MemberCodeService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class GuarantorInformantReportController extends Controller
{
    use ScopesToAccessibleBranches;

    /**
     * Threshold amount: 3,00,000 BDT
     */
    const MIN_LOAN_AMOUNT = 300000;

    /**
     * Display the Guarantor & Informant Report
     */
    public function index(Request $request): Response
    {
        $dateFrom = $request->input('date_from', Carbon::today()->startOfMonth()->toDateString());
        $dateTo = $request->input('date_to', Carbon::today()->toDateString());
        $minAmount = (float) $request->input('min_amount', self::MIN_LOAN_AMOUNT);
        $status = $request->input('status', 'default');

        $query = $this->buildReportQuery($request, $dateFrom, $dateTo, $minAmount);

        $perPage = (int) $request->input('per_page', 25);
        if (! in_array($perPage, [15, 25, 50, 100], true)) {
            $perPage = 25;
        }

        $paginated = $query->paginate($perPage)->withQueryString();

        $items = collect($paginated->items())->map(function ($loan) {
            return $this->formatLoanRow($loan);
        })->all();

        // Summary statistics
        $statsQuery = $this->buildReportQuery($request, $dateFrom, $dateTo, $minAmount);
        $totalLoansCount = (clone $statsQuery)->count();
        $totalAmountSum = (clone $statsQuery)->sum(\DB::raw('COALESCE(approved_amount, requested_amount)'));

        $orgOptions = $this->organizationFilterOptions();

        return Inertia::render('HeadOffice/Reports/GuarantorInformantReport', $this->cleanUtf8([
            'loans' => [
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
                'min_amount' => $minAmount,
                'status' => (string) $status,
                'zone_id' => (string) $request->input('zone_id', ''),
                'area_id' => (string) $request->input('area_id', ''),
                'branch_id' => (string) $request->input('branch_id', ''),
                'search' => (string) $request->input('search', ''),
                'per_page' => $perPage,
            ],
            'summary' => [
                'total_loans' => $totalLoansCount,
                'total_amount' => (float) $totalAmountSum,
            ],
            'zones' => $orgOptions['zones']->toArray(),
            'areas' => $orgOptions['areas']->toArray(),
            'branches' => $orgOptions['branches']->toArray(),
        ]));
    }

    /**
     * Print View for the Report (matching Head Office Loan Application print layout)
     */
    public function print(Request $request): Response
    {
        $dateFrom = $request->input('date_from', Carbon::today()->startOfMonth()->toDateString());
        $dateTo = $request->input('date_to', Carbon::today()->toDateString());
        $minAmount = (float) $request->input('min_amount', self::MIN_LOAN_AMOUNT);
        $status = $request->input('status', 'default');

        $query = $this->buildReportQuery($request, $dateFrom, $dateTo, $minAmount);
        $loans = $query->limit(1000)->get()->map(function ($loan) {
            return $this->formatLoanRow($loan);
        })->all();

        $totalAmountSum = collect($loans)->sum('amount');
        $orgOptions = $this->organizationFilterOptions();

        return Inertia::render('HeadOffice/Reports/GuarantorInformantPrint', $this->cleanUtf8([
            'loans' => $loans,
            'filters' => [
                'date_from' => (string) $dateFrom,
                'date_to' => (string) $dateTo,
                'min_amount' => $minAmount,
                'status' => (string) $status,
                'zone_id' => (string) $request->input('zone_id', ''),
                'area_id' => (string) $request->input('area_id', ''),
                'branch_id' => (string) $request->input('branch_id', ''),
            ],
            'summary' => [
                'total_loans' => count($loans),
                'total_amount' => (float) $totalAmountSum,
            ],
            'zones' => $orgOptions['zones']->toArray(),
            'areas' => $orgOptions['areas']->toArray(),
            'branches' => $orgOptions['branches']->toArray(),
            'printed_at' => Carbon::now()->format('d/m/Y h:i A'),
        ]));
    }

    /**
     * Export Report data to CSV/Excel
     */
    public function exportExcel(Request $request): StreamedResponse
    {
        $dateFrom = $request->input('date_from', Carbon::today()->startOfMonth()->toDateString());
        $dateTo = $request->input('date_to', Carbon::today()->toDateString());
        $minAmount = (float) $request->input('min_amount', self::MIN_LOAN_AMOUNT);

        $query = $this->buildReportQuery($request, $dateFrom, $dateTo, $minAmount);
        $loans = $query->get()->map(function ($loan) {
            return $this->formatLoanRow($loan);
        });

        $filename = 'Guarantor_Informant_Report_' . Carbon::now()->format('Ymd_His') . '.csv';

        return response()->streamDownload(function () use ($loans) {
            $handle = fopen('php://output', 'w');
            // BOM for UTF-8 Excel support
            fputs($handle, "\xEF\xBB\xBF");

            // Header row
            fputcsv($handle, [
                'SL',
                'Number',
                'Date',
                'Member Code',
                'Borrower Name',
                'Mobile',
                'Branch',
                'Samity',
                'Amount (BDT)',
                'Status',
                'Guarantors (Name, Mobile & Relation)',
                'Informants (Name, Mobile & Address)',
            ]);

            foreach ($loans as $index => $row) {
                $guarantorsStr = collect($row['guarantors'])->map(function ($g) {
                    $txt = $g['name'];
                    if (! empty($g['mobile'])) {
                        $txt .= ' (' . $g['mobile'] . ')';
                    }
                    if (! empty($g['relation'])) {
                        $txt .= ' - ' . $g['relation'];
                    }
                    return $txt;
                })->implode(";\n");

                $informantsStr = collect($row['informants'])->map(function ($inf) {
                    $txt = $inf['name'];
                    if (! empty($inf['mobile'])) {
                        $txt .= ' (' . $inf['mobile'] . ')';
                    }
                    if (! empty($inf['relation'])) {
                        $txt .= ' - ' . $inf['relation'];
                    }
                    if (! empty($inf['address'])) {
                        $txt .= ' [' . $inf['address'] . ']';
                    }
                    return $txt;
                })->implode(";\n");

                fputcsv($handle, [
                    $index + 1,
                    $row['loan_number'],
                    $row['date'],
                    $row['member_code'],
                    $row['borrower_name'],
                    $row['borrower_mobile'],
                    $row['branch_name'],
                    $row['samity_name'],
                    $row['amount'],
                    $row['status_label'],
                    $guarantorsStr,
                    $informantsStr,
                ]);
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    /**
     * Build the query applying amount condition, status filters, date filters, and branches.
     */
    protected function buildReportQuery(Request $request, string $dateFrom, string $dateTo, float $minAmount)
    {
        $query = LoanApplication::with([
            'branch:id,name,code,area_id',
            'branch.area:id,name,zone_id',
            'branch.area.zone:id,name',
            'loanProduct:id,product_name,product_name_bn,product_code',
            'memberAdmission:id,applicant_name_en,applicant_name_bn,mobile_number,application_no,guarantor_name,guarantor_mobile',
            'samity:id,samity_name,samity_name_bn,samity_code',
        ])
            ->where(function ($q) use ($minAmount) {
                $q->where('approved_amount', '>=', $minAmount)
                  ->orWhere(function ($sub) use ($minAmount) {
                      $sub->whereNull('approved_amount')
                          ->orWhere('approved_amount', 0);
                      $sub->where('requested_amount', '>=', $minAmount);
                  });
            });

        $this->applyAccessibleBranchScope($query);

        // Status filter: default is head_office_stage (sent to HO, approved, disbursed)
        $statusFilter = $request->input('status', 'default');
        if ($statusFilter === 'all') {
            // No status filter -> show all applications
        } elseif ($statusFilter === 'default' || empty($statusFilter) || $statusFilter === 'head_office_stage') {
            $query->whereIn('status', [
                LoanApplication::STATUS_READY_FOR_HEAD_OFFICE,
                LoanApplication::STATUS_PENDING_HEAD_OFFICE,
                LoanApplication::STATUS_APPROVED,
                LoanApplication::STATUS_PENDING_DISBURSEMENT,
                LoanApplication::STATUS_DISBURSED,
                LoanApplication::STATUS_REJECTED,
                LoanApplication::STATUS_NEEDS_CORRECTION,
            ]);
        } else {
            $query->where('status', $statusFilter);
        }

        // Date filter on submitted_at or created_at
        $query->where(function ($q) use ($dateFrom, $dateTo) {
            $from = Carbon::parse($dateFrom)->startOfDay();
            $to = Carbon::parse($dateTo)->endOfDay();
            $q->whereBetween('submitted_at', [$from, $to])
              ->orWhere(function ($sub) use ($from, $to) {
                  $sub->whereNull('submitted_at')
                      ->whereBetween('created_at', [$from, $to]);
              });
        });

        // Zone filter
        if ($request->has('zone_id') && $request->zone_id) {
            $query->whereHas('branch.area', function ($q) use ($request) {
                $q->where('zone_id', $request->zone_id);
            });
        }

        // Area filter
        if ($request->has('area_id') && $request->area_id) {
            $query->whereHas('branch', function ($q) use ($request) {
                $q->where('area_id', $request->area_id);
            });
        }

        // Branch filter
        if ($request->has('branch_id') && $request->branch_id) {
            $query->where('branch_id', $request->branch_id);
        }

        // Search filter
        if ($request->has('search') && $request->search) {
            MemberCodeService::applyLoanSearch($query, $request->search);
        }

        return $query->orderByDesc('submitted_at')->orderByDesc('id');
    }

    /**
     * Format a single loan row extracting all guarantors and informants.
     */
    protected function formatLoanRow(LoanApplication $loan): array
    {
        $member = $loan->memberAdmission;
        $legacy = is_array($loan->legacy_member_snapshot) ? $loan->legacy_member_snapshot : [];

        $borrowerName = $member?->applicant_name_bn 
            ?: $member?->applicant_name_en 
            ?: ($legacy['applicant_name_bn'] ?? ($legacy['applicant_name_en'] ?? 'N/A'));

        // Clean numeric loan number (strip prefix like LN20260800997 -> 00997)
        $appNo = (string) $loan->application_no;
        if (preg_match('/(\d{4,5})$/', $appNo, $matches)) {
            $loanNumber = $matches[1];
        } else {
            $loanNumber = preg_replace('/^[a-zA-Z]+/', '', $appNo);
        }

        // Short member code (5 digits)
        $admissionNo = (string) ($member?->application_no ?? ($legacy['application_no'] ?? ''));
        if (preg_match('/(\d{4,5})$/', $admissionNo, $mMatches)) {
            $memberCode = $mMatches[1];
        } else {
            $memberCode = $admissionNo ? (mb_strlen($admissionNo) > 5 ? mb_substr($admissionNo, -5) : $admissionNo) : $loanNumber;
        }

        $borrowerMobile = $member?->mobile_number 
            ?: ($legacy['mobile_number'] ?? '');

        $amount = (float) ($loan->approved_amount > 0 ? $loan->approved_amount : $loan->requested_amount);
        $date = $loan->submitted_at ? $loan->submitted_at->format('d/m/Y') : ($loan->created_at ? $loan->created_at->format('d/m/Y') : '');

        // Extract Guarantors
        $guarantors = $this->extractGuarantors($loan);

        // Extract Informants
        $informants = $this->extractInformants($loan);

        return $this->cleanUtf8([
            'id' => $loan->id,
            'application_no' => (string) $loan->application_no,
            'loan_number' => (string) $loanNumber,
            'date' => (string) $date,
            'member_code' => (string) $memberCode,
            'borrower_name' => (string) $borrowerName,
            'borrower_mobile' => (string) $borrowerMobile,
            'amount' => $amount,
            'status' => (string) $loan->status,
            'status_label' => $this->getStatusLabel((string) $loan->status),
            'product_name' => (string) ($loan->loanProduct?->product_name_bn ?: ($loan->loanProduct?->product_name ?: '')),
            'branch_name' => (string) ($loan->branch?->name ?: ''),
            'branch_code' => (string) ($loan->branch?->code ?: ''),
            'area_name' => (string) ($loan->branch?->area?->name ?: ''),
            'zone_name' => (string) ($loan->branch?->area?->zone?->name ?: ''),
            'samity_name' => (string) ($loan->samity?->samity_name_bn ?: ($loan->samity?->samity_name ?: '')),
            'samity_code' => (string) ($loan->samity?->samity_code ?: ''),
            'guarantors' => $guarantors,
            'informants' => $informants,
        ]);
    }

    /**
     * Extract all unique guarantors from various JSON fields & relations.
     */
    protected function extractGuarantors(LoanApplication $loan): array
    {
        $list = [];

        // 1. From business_plan (Approval Form - Form 5)
        $bp = is_array($loan->business_plan) ? $loan->business_plan : [];
        if (! empty($bp['guarantor_1_name'])) {
            $list[] = [
                'name' => trim((string) $bp['guarantor_1_name']),
                'mobile' => trim((string) ($bp['guarantor_1_mobile'] ?? '')),
                'relation' => trim((string) ($bp['guarantor_1_relation'] ?? '')),
                'nid' => trim((string) ($bp['guarantor_1_nid'] ?? '')),
                'source' => 'আবেদন ও অনুমোদনপত্র (১ম জামিনদার)',
            ];
        }
        if (! empty($bp['guarantor_2_name'])) {
            $list[] = [
                'name' => trim((string) $bp['guarantor_2_name']),
                'mobile' => trim((string) ($bp['guarantor_2_mobile'] ?? '')),
                'relation' => trim((string) ($bp['guarantor_2_relation'] ?? '')),
                'nid' => trim((string) ($bp['guarantor_2_nid'] ?? '')),
                'source' => 'আবেদন ও অনুমোদনপত্র (২য় জামিনদার)',
            ];
        }

        // 2. From guarantor_info (Guarantor Commitment - Form 2)
        $gi = is_array($loan->guarantor_info) ? $loan->guarantor_info : [];
        if (! empty($gi['guarantor_name'])) {
            $list[] = [
                'name' => trim((string) $gi['guarantor_name']),
                'mobile' => trim((string) ($gi['guarantor_mobile'] ?? ($gi['phone'] ?? ''))),
                'relation' => trim((string) ($gi['guarantor_relation'] ?? ($gi['relation_with_member'] ?? ''))),
                'nid' => trim((string) ($gi['guarantor_nid'] ?? '')),
                'source' => 'জামিনদার অঙ্গীকারনামা',
            ];
        }

        // 3. From loan_agreement_data (Loan Agreement - Form 1)
        $lad = is_array($loan->loan_agreement_data) ? $loan->loan_agreement_data : [];
        if (! empty($lad['guarantor_name'])) {
            $list[] = [
                'name' => trim((string) $lad['guarantor_name']),
                'mobile' => trim((string) ($lad['guarantor_mobile'] ?? ($lad['guarantor_phone'] ?? ''))),
                'relation' => trim((string) ($lad['guarantor_relation'] ?? '')),
                'nid' => trim((string) ($lad['guarantor_nid'] ?? '')),
                'source' => 'ঋণ চুক্তিপত্র',
            ];
        }

        // 4. From Member Admission
        $member = $loan->memberAdmission;
        if ($member && ! empty($member->guarantor_name)) {
            $list[] = [
                'name' => trim((string) $member->guarantor_name),
                'mobile' => trim((string) ($member->guarantor_mobile ?? '')),
                'relation' => '',
                'nid' => '',
                'source' => 'ভর্তি ফরম জামিনদার',
            ];
        }

        // Deduplicate list by normalized name & mobile
        $unique = [];
        $seen = [];
        foreach ($list as $g) {
            if (empty($g['name'])) {
                continue;
            }
            $cleanName = mb_strtolower(trim((string) $g['name']));
            $cleanMobile = preg_replace('/\D/', '', (string) $g['mobile']);
            $key = $cleanName . '_' . $cleanMobile;
            if (! isset($seen[$key])) {
                $seen[$key] = true;
                $unique[] = $g;
            }
        }

        return $unique;
    }

    /**
     * Extract all unique informants (তথ্য প্রদানকারী) from various JSON fields.
     */
    protected function extractInformants(LoanApplication $loan): array
    {
        $list = [];

        // 1. From business_plan (Approval Form - Form 5)
        $bp = is_array($loan->business_plan) ? $loan->business_plan : [];
        if (! empty($bp['informant_1_name'])) {
            $list[] = [
                'name' => trim((string) $bp['informant_1_name']),
                'mobile' => trim((string) ($bp['informant_1_mobile'] ?? '')),
                'relation' => trim((string) ($bp['informant_1_relation'] ?? '')),
                'address' => trim((string) ($bp['informant_1_address'] ?? '')),
                'source' => 'আবেদন ফরম (১ম তথ্য প্রদানকারী)',
            ];
        }
        if (! empty($bp['informant_2_name'])) {
            $list[] = [
                'name' => trim((string) $bp['informant_2_name']),
                'mobile' => trim((string) ($bp['informant_2_mobile'] ?? '')),
                'relation' => trim((string) ($bp['informant_2_relation'] ?? '')),
                'address' => trim((string) ($bp['informant_2_address'] ?? '')),
                'source' => 'আবেদন ফরম (২য় তথ্য প্রদানকারী)',
            ];
        }

        // 2. From asset_info (Field Investigation - Form 4)
        $ai = is_array($loan->asset_info) ? $loan->asset_info : [];
        $invName = $ai['information_provider_name'] ?? ($ai['informant_name'] ?? '');
        if (! empty($invName)) {
            $list[] = [
                'name' => trim((string) $invName),
                'mobile' => trim((string) ($ai['information_provider_mobile'] ?? ($ai['informant_mobile'] ?? ''))),
                'relation' => trim((string) ($ai['relationship_with_member'] ?? '')),
                'address' => '',
                'source' => 'সরেজমিন তদন্ত প্রতিবেদন',
            ];
        }

        // Deduplicate list by normalized name & mobile
        $unique = [];
        $seen = [];
        foreach ($list as $inf) {
            if (empty($inf['name'])) {
                continue;
            }
            $cleanName = mb_strtolower(trim((string) $inf['name']));
            $cleanMobile = preg_replace('/\D/', '', (string) $inf['mobile']);
            $key = $cleanName . '_' . $cleanMobile;
            if (! isset($seen[$key])) {
                $seen[$key] = true;
                $unique[] = $inf;
            }
        }

        return $unique;
    }

    /**
     * Human readable status label in Bengali.
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
     * Recursively ensure all string contents are valid UTF-8.
     */
    protected function cleanUtf8(mixed $data): mixed
    {
        if (is_string($data)) {
            if (! mb_check_encoding($data, 'UTF-8')) {
                $data = mb_convert_encoding($data, 'UTF-8', 'UTF-8, Windows-1252, ISO-8859-1');
            }
            // Strip any broken byte sequence
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
