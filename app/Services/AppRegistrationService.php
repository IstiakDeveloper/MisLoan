<?php

namespace App\Services;

use App\Models\AppRegistration;
use App\Models\Branch;
use App\Models\MemberAdmission;
use App\Models\Samity;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AppRegistrationService
{
    /**
     * Toggle app registration status from Member Admission list
     */
    public function toggleAdmissionRegistration(MemberAdmission $admission, User $user, ?bool $forceState = null): array
    {
        $currentState = (bool) $admission->is_app_registered;
        $newState = $forceState !== null ? $forceState : ! $currentState;

        // Restriction: Once turned ON, regular users CANNOT turn it OFF (only Super Admin or Head Office can)
        if ($currentState && ! $newState) {
            $canDeactivate = $user->isSuperAdmin() || $user->isHeadOffice() || (bool) $user->has_all_access;
            if (! $canDeactivate) {
                return [
                    'ok' => false,
                    'is_app_registered' => true,
                    'member_admission_id' => $admission->id,
                    'member_code' => (string) $admission->application_no,
                    'message' => 'একবার অ্যাপ রেজিস্টার সক্রিয় হলে হেড অফিস বা সুপার অ্যাডমিন ছাড়া বন্ধ বা পরিবর্তন করা যাবে না।',
                ];
            }
        }

        return DB::transaction(function () use ($admission, $user, $currentState, $newState) {
            $admission->is_app_registered = $newState;
            if ($newState) {
                $admission->app_registered_at = now();
                $admission->app_registered_by = $user->id;
            }
            $admission->saveQuietly();

            $branchId = (int) $admission->branch_id;
            $memberCode = (string) $admission->application_no;
            $name = trim($admission->applicant_name_bn ?: $admission->applicant_name_en ?: 'Member');
            $mobile = MemberCodeService::toEnglishDigits($admission->mobile_number);

            $registration = AppRegistration::withTrashed()
                ->where('branch_id', $branchId)
                ->where('member_code', $memberCode)
                ->first();

            if ($newState) {
                if ($registration) {
                    $registration->restore();
                    $registration->update([
                        'samity_id' => $admission->samity_id,
                        'member_admission_id' => $admission->id,
                        'member_name' => $name,
                        'phone_number' => $mobile,
                        'is_registered' => true,
                        'registered_at' => now(),
                        'registered_by' => $user->id,
                        'registration_source' => 'admission_switch',
                    ]);
                } else {
                    $registration = AppRegistration::create([
                        'branch_id' => $branchId,
                        'samity_id' => $admission->samity_id,
                        'member_admission_id' => $admission->id,
                        'member_code' => $memberCode,
                        'member_name' => $name,
                        'phone_number' => $mobile,
                        'is_registered' => true,
                        'registered_at' => now(),
                        'registered_by' => $user->id,
                        'registration_source' => 'admission_switch',
                    ]);
                }
            } else {
                if ($registration) {
                    $registration->update([
                        'is_registered' => false,
                    ]);
                }
            }

            return [
                'ok' => true,
                'is_app_registered' => $newState,
                'member_admission_id' => $admission->id,
                'member_code' => $memberCode,
                'message' => $newState ? 'সদস্যের অ্যাপ রেজিস্ট্রেশন সক্রিয় করা হয়েছে।' : 'সদস্যের অ্যাপ রেজিস্ট্রেশন বাতিল করা হয়েছে।',
            ];
        });
    }

    /**
     * Single entry registration
     */
    public function registerSingle(array $data, User $user): array
    {
        return DB::transaction(function () use ($data, $user) {
            $branchId = (int) $data['branch_id'];
            $branch = Branch::findOrFail($branchId);
            $rawCode = trim((string) $data['member_code']);
            $cleanCode = MemberCodeService::toEnglishDigits($rawCode);
            $digitsOnly = preg_replace('/\D/', '', $cleanCode);

            // Auto-format member code to 10-digit standard if 6 digits or less are given
            $branchPrefix = MemberCodeService::formatBranchCode($branch->code ?? $branch->id);
            if ($digitsOnly !== '' && strlen($digitsOnly) <= 6) {
                $formattedCode = MemberCodeService::formatFullCode($branchPrefix, $digitsOnly);
            } else {
                $formattedCode = $cleanCode;
            }

            $name = trim((string) $data['member_name']);
            $phone = MemberCodeService::toEnglishDigits(trim((string) ($data['phone_number'] ?? '')));
            $samityId = ! empty($data['samity_id']) ? (int) $data['samity_id'] : null;
            $remarks = ! empty($data['remarks']) ? trim((string) $data['remarks']) : null;

            // Check if matching MemberAdmission exists in this branch
            $admission = MemberAdmission::where('branch_id', $branchId)
                ->where('application_no', $formattedCode)
                ->first();

            if (! $admission && $digitsOnly !== '' && strlen($digitsOnly) <= 6) {
                $paddedSerial = str_pad($digitsOnly, 6, '0', STR_PAD_LEFT);
                $admission = MemberAdmission::where('branch_id', $branchId)
                    ->where('application_no', 'like', "%{$paddedSerial}")
                    ->first();
            }

            if ($admission) {
                $admission->is_app_registered = true;
                $admission->app_registered_at = now();
                $admission->app_registered_by = $user->id;
                $admission->saveQuietly();
            }

            $registration = AppRegistration::withTrashed()
                ->where('branch_id', $branchId)
                ->where('member_code', $formattedCode)
                ->first();

            $isNew = false;
            if ($registration) {
                $registration->restore();
                $registration->update([
                    'samity_id' => $samityId ?: $admission?->samity_id,
                    'member_admission_id' => $admission?->id,
                    'member_name' => $name,
                    'phone_number' => $phone,
                    'is_registered' => true,
                    'registered_at' => now(),
                    'registered_by' => $user->id,
                    'registration_source' => 'single_entry',
                    'remarks' => $remarks,
                ]);
            } else {
                $registration = AppRegistration::create([
                    'branch_id' => $branchId,
                    'samity_id' => $samityId ?: $admission?->samity_id,
                    'member_admission_id' => $admission?->id,
                    'member_code' => $formattedCode,
                    'member_name' => $name,
                    'phone_number' => $phone,
                    'is_registered' => true,
                    'registered_at' => now(),
                    'registered_by' => $user->id,
                    'registration_source' => 'single_entry',
                    'remarks' => $remarks,
                ]);
                $isNew = true;
            }

            return [
                'ok' => true,
                'is_new' => $isNew,
                'registration' => $registration,
                'message' => 'অ্যাপ রেজিস্ট্রেশন সফলভাবে সংরক্ষণ করা হয়েছে।',
            ];
        });
    }

    /**
     * Bulk Excel Upload
     */
    public function importExcel(string $filePath, ?int $defaultBranchId, User $user): array
    {
        $spreadsheet = IOFactory::load($filePath);
        $sheet = $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray(null, true, true, true);

        if (empty($rows)) {
            return [
                'ok' => false,
                'message' => 'এক্সেল ফাইলে কোনো ডাটা পাওয়া যায়নি।',
                'total' => 0,
                'created' => 0,
                'updated' => 0,
                'failed' => 0,
                'errors' => ['ফাইলটি ফাঁকা।'],
            ];
        }

        // Header mapping
        $headerRowKey = array_key_first($rows);
        $headerRow = $rows[$headerRowKey] ?? [];
        unset($rows[$headerRowKey]);

        $colMap = [];
        foreach ($headerRow as $colLetter => $headerText) {
            $cleanHeader = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', (string) $headerText));
            if (in_array($cleanHeader, ['branchcode', 'branch', 'branchid', 'shakha', 'shakhacode'])) {
                $colMap['branch_code'] = $colLetter;
            } elseif (in_array($cleanHeader, ['samitycode', 'samity', 'samityid', 'somiticode', 'somiti'])) {
                $colMap['samity_code'] = $colLetter;
            } elseif (in_array($cleanHeader, ['samityname', 'somitiname'])) {
                $colMap['samity_name'] = $colLetter;
            } elseif (in_array($cleanHeader, ['membercode', 'memberno', 'customerno', 'accountno', 'code', 'applicationno'])) {
                $colMap['member_code'] = $colLetter;
            } elseif (in_array($cleanHeader, ['name', 'membername', 'applicantname', 'customername'])) {
                $colMap['member_name'] = $colLetter;
            } elseif (in_array($cleanHeader, ['phone', 'mobile', 'phonenumber', 'mobilenumber', 'contact'])) {
                $colMap['phone_number'] = $colLetter;
            } elseif (in_array($cleanHeader, ['remarks', 'note', 'comment'])) {
                $colMap['remarks'] = $colLetter;
            }
        }

        // Fallback column positions if headers don't match exactly
        if (empty($colMap['member_code'])) {
            $colLetters = array_keys($headerRow);
            // Default expected order: A: Branch Code, B: Samity Code, C: Member Code, D: Member Name, E: Phone
            if (count($colLetters) >= 3) {
                $colMap['branch_code'] = $colMap['branch_code'] ?? $colLetters[0];
                $colMap['samity_code'] = $colMap['samity_code'] ?? ($colLetters[1] ?? null);
                $colMap['member_code'] = $colLetters[2] ?? $colLetters[0];
                $colMap['member_name'] = $colLetters[3] ?? null;
                $colMap['phone_number'] = $colLetters[4] ?? null;
            }
        }

        $accessibleBranches = $user->getAccessibleBranches()->keyBy('id');
        $allBranchesByCode = Branch::all()->keyBy(function ($b) {
            return MemberCodeService::formatBranchCode($b->code ?? $b->id);
        });

        $created = 0;
        $updated = 0;
        $failed = 0;
        $errors = [];
        $rowNumber = 1;

        DB::beginTransaction();
        try {
            foreach ($rows as $rKey => $row) {
                $rowNumber++;
                $rawMemberCode = trim((string) ($row[$colMap['member_code'] ?? ''] ?? ''));
                if ($rawMemberCode === '') {
                    continue; // Skip blank row
                }

                $rawBranchCode = trim((string) ($row[$colMap['branch_code'] ?? ''] ?? ''));
                $cleanBranchCode = MemberCodeService::toEnglishDigits($rawBranchCode);
                $branch = null;

                if ($cleanBranchCode !== '') {
                    $paddedBranchCode = MemberCodeService::formatBranchCode($cleanBranchCode);
                    $branch = $allBranchesByCode->get($paddedBranchCode);
                }

                if (! $branch && $defaultBranchId) {
                    $branch = Branch::find($defaultBranchId);
                }

                if (! $branch) {
                    $failed++;
                    $errors[] = "সারি {$rowNumber}: সঠিক ব্রাঞ্চ কোড পাওয়া যায়নি।";
                    continue;
                }

                // Check permission to this branch
                if (! $user->has_all_access && ! $user->isSuperAdmin() && ! $user->isHeadOffice()) {
                    if (! $accessibleBranches->has($branch->id)) {
                        $failed++;
                        $errors[] = "সারি {$rowNumber}: '{$branch->name}' ব্রাঞ্চে ডাটা এন্ট্রি করার অনুমতি নেই।";
                        continue;
                    }
                }

                // Format member code
                $cleanMemberCode = MemberCodeService::toEnglishDigits($rawMemberCode);
                $cleanDigits = preg_replace('/\D/', '', $cleanMemberCode);
                $branchPrefix = MemberCodeService::formatBranchCode($branch->code ?? $branch->id);

                if ($cleanDigits !== '' && strlen($cleanDigits) <= 6) {
                    $formattedMemberCode = MemberCodeService::formatFullCode($branchPrefix, $cleanDigits);
                } else {
                    $formattedMemberCode = $cleanMemberCode;
                }

                $memberName = trim((string) ($row[$colMap['member_name'] ?? ''] ?? ''));
                if ($memberName === '') {
                    $memberName = 'Member '.$formattedMemberCode;
                }

                $rawPhone = trim((string) ($row[$colMap['phone_number'] ?? ''] ?? ''));
                $phone = MemberCodeService::toEnglishDigits($rawPhone);
                $remarks = ! empty($colMap['remarks']) ? trim((string) ($row[$colMap['remarks']] ?? '')) : null;

                // Resolve Samity
                $samity = null;
                $rawSamityCode = trim((string) ($row[$colMap['samity_code'] ?? ''] ?? ''));
                $cleanSamityCode = MemberCodeService::toEnglishDigits($rawSamityCode);
                if ($cleanSamityCode !== '') {
                    $samity = Samity::where('branch_id', $branch->id)
                        ->where(function ($q) use ($cleanSamityCode) {
                            $q->where('samity_code', $cleanSamityCode)
                                ->orWhere('samity_code', 'like', "%{$cleanSamityCode}");
                        })
                        ->first();
                }

                // Match existing MemberAdmission if any
                $admission = MemberAdmission::where('branch_id', $branch->id)
                    ->where('application_no', $formattedMemberCode)
                    ->first();

                if ($admission) {
                    $admission->is_app_registered = true;
                    $admission->app_registered_at = now();
                    $admission->app_registered_by = $user->id;
                    $admission->saveQuietly();
                }

                $registration = AppRegistration::withTrashed()
                    ->where('branch_id', $branch->id)
                    ->where('member_code', $formattedMemberCode)
                    ->first();

                if ($registration) {
                    $registration->restore();
                    $registration->update([
                        'samity_id' => $samity?->id ?: ($admission?->samity_id ?: $registration->samity_id),
                        'member_admission_id' => $admission?->id ?: $registration->member_admission_id,
                        'member_name' => $memberName ?: $registration->member_name,
                        'phone_number' => $phone ?: $registration->phone_number,
                        'is_registered' => true,
                        'registered_at' => now(),
                        'registered_by' => $user->id,
                        'registration_source' => 'bulk_excel',
                        'remarks' => $remarks ?: $registration->remarks,
                    ]);
                    $updated++;
                } else {
                    AppRegistration::create([
                        'branch_id' => $branch->id,
                        'samity_id' => $samity?->id ?: $admission?->samity_id,
                        'member_admission_id' => $admission?->id,
                        'member_code' => $formattedMemberCode,
                        'member_name' => $memberName,
                        'phone_number' => $phone,
                        'is_registered' => true,
                        'registered_at' => now(),
                        'registered_by' => $user->id,
                        'registration_source' => 'bulk_excel',
                        'remarks' => $remarks,
                    ]);
                    $created++;
                }
            }

            DB::commit();

            return [
                'ok' => true,
                'message' => "এক্সেল প্রসেসিং সম্পন্ন! মোট নতুন: {$created}, আপডেট: {$updated}, ব্যর্থ: {$failed}।",
                'total' => $created + $updated + $failed,
                'created' => $created,
                'updated' => $updated,
                'failed' => $failed,
                'errors' => array_slice($errors, 0, 10),
            ];
        } catch (\Throwable $e) {
            DB::rollBack();

            return [
                'ok' => false,
                'message' => 'এক্সেল প্রক্রিয়াকরণে ত্রুটি: '.$e->getMessage(),
                'total' => 0,
                'created' => 0,
                'updated' => 0,
                'failed' => 0,
                'errors' => [$e->getMessage()],
            ];
        }
    }

    /**
     * Generate sample Excel template
     */
    public function generateSampleExcelTemplate(): StreamedResponse
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('App_Register_Template');

        // Headers
        $headers = [
            'A1' => 'Branch Code (শাখা কোড)',
            'B1' => 'Samity Code (সমিতি কোড)',
            'C1' => 'Member Code (সদস্য কোড)',
            'D1' => 'Member Name (সদস্যের নাম)',
            'E1' => 'Phone Number (মোবাইল নম্বর)',
            'F1' => 'Remarks (মন্তব্য)',
        ];

        foreach ($headers as $cell => $text) {
            $sheet->setCellValue($cell, $text);
        }

        // Header style
        $headerStyle = [
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 11],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1E40AF'], // Tailwind blue-800
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
            'borders' => [
                'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CBD5E1']],
            ],
        ];
        $sheet->getStyle('A1:F1')->applyFromArray($headerStyle);
        $sheet->getRowDimension(1)->setRowHeight(30);

        // Sample Rows
        $sampleRows = [
            ['0001', '0001', '0001000001', 'মোছাঃ ফাতেমা খাতুন', '01712345678', 'অ্যাপ রেজিস্টার সম্পন্ন'],
            ['0001', '0002', '0001000002', 'মোছাঃ রহিমা বেগম', '01812345678', 'নতুন এন্ট্রি'],
            ['0002', '0001', '0002000015', 'মোছাঃ বিলকিস আক্তার', '01912345678', ''],
        ];

        $rowIdx = 2;
        foreach ($sampleRows as $row) {
            $sheet->setCellValueExplicit("A{$rowIdx}", $row[0], \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
            $sheet->setCellValueExplicit("B{$rowIdx}", $row[1], \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
            $sheet->setCellValueExplicit("C{$rowIdx}", $row[2], \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
            $sheet->setCellValue("D{$rowIdx}", $row[3]);
            $sheet->setCellValueExplicit("E{$rowIdx}", $row[4], \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
            $sheet->setCellValue("F{$rowIdx}", $row[5]);
            $rowIdx++;
        }

        // Auto width
        foreach (range('A', 'F') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        return new StreamedResponse(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="App_Register_Sample_Template.xlsx"',
            'Cache-Control' => 'max-age=0',
        ]);
    }

    /**
     * Get branch-wise summary report
     */
    public function getBranchSummaryReport(array $filters, User $user): array
    {
        $accessibleBranches = $user->getAccessibleBranches();
        if ($accessibleBranches->isEmpty()) {
            $accessibleBranches = Branch::all();
        }

        $accessibleBranchIds = $accessibleBranches->pluck('id')->toArray();

        $query = DB::table('branches')
            ->leftJoin('areas', 'branches.area_id', '=', 'areas.id')
            ->leftJoin('zones', 'areas.zone_id', '=', 'zones.id')
            ->whereIn('branches.id', $accessibleBranchIds)
            ->whereNull('branches.deleted_at');

        if (! empty($filters['branch_id'])) {
            $query->where('branches.id', (int) $filters['branch_id']);
        } elseif (! empty($filters['area_id'])) {
            $query->where('branches.area_id', (int) $filters['area_id']);
        } elseif (! empty($filters['zone_id'])) {
            $query->where('areas.zone_id', (int) $filters['zone_id']);
        }

        // Date range filters on app_registrations
        $fromDate = ! empty($filters['from_date']) ? Carbon::parse($filters['from_date'])->startOfDay() : null;
        $toDate = ! empty($filters['to_date']) ? Carbon::parse($filters['to_date'])->endOfDay() : null;

        // Subquery for registration statistics
        $regSubQuery = DB::table('app_registrations')
            ->where('is_registered', true)
            ->whereNull('deleted_at');

        if ($fromDate && $toDate) {
            $regSubQuery->whereBetween('registered_at', [$fromDate, $toDate]);
        } elseif ($fromDate) {
            $regSubQuery->where('registered_at', '>=', $fromDate);
        } elseif ($toDate) {
            $regSubQuery->where('registered_at', '<=', $toDate);
        }

        if (! empty($filters['source'])) {
            $regSubQuery->where('registration_source', $filters['source']);
        }

        $regCounts = $regSubQuery->groupBy('branch_id')
            ->select(
                'branch_id',
                DB::raw('COUNT(*) as total_registered'),
                DB::raw("COUNT(CASE WHEN registration_source = 'admission_switch' THEN 1 END) as switch_count"),
                DB::raw("COUNT(CASE WHEN registration_source = 'single_entry' THEN 1 END) as single_count"),
                DB::raw("COUNT(CASE WHEN registration_source = 'bulk_excel' THEN 1 END) as bulk_count")
            )
            ->get()
            ->keyBy('branch_id');

        $branches = $query->select(
            'branches.id as branch_id',
            'branches.name as branch_name',
            'branches.code as branch_code',
            'areas.id as area_id',
            'areas.name as area_name',
            'zones.id as zone_id',
            'zones.name as zone_name'
        )
            ->orderBy('branches.code')
            ->get();

        $rows = [];
        $totalAll = 0;
        $totalSwitch = 0;
        $totalSingle = 0;
        $totalBulk = 0;

        foreach ($branches as $branch) {
            $stat = $regCounts->get($branch->branch_id);
            $total = (int) ($stat->total_registered ?? 0);
            $switch = (int) ($stat->switch_count ?? 0);
            $single = (int) ($stat->single_count ?? 0);
            $bulk = (int) ($stat->bulk_count ?? 0);

            $totalAll += $total;
            $totalSwitch += $switch;
            $totalSingle += $single;
            $totalBulk += $bulk;

            $rows[] = [
                'branch_id' => $branch->branch_id,
                'branch_name' => $branch->branch_name,
                'branch_code' => $branch->branch_code,
                'area_id' => $branch->area_id,
                'area_name' => $branch->area_name,
                'zone_id' => $branch->zone_id,
                'zone_name' => $branch->zone_name,
                'switch_count' => $switch,
                'single_count' => $single,
                'bulk_count' => $bulk,
                'total_registered' => $total,
            ];
        }

        return [
            'rows' => $rows,
            'totals' => [
                'total_branches' => count($rows),
                'total_registered' => $totalAll,
                'total_switch' => $totalSwitch,
                'total_single' => $totalSingle,
                'total_bulk' => $totalBulk,
            ],
        ];
    }

    /**
     * Get ledger report with pagination
     */
    public function getLedgerReport(array $filters, User $user, int $perPage = 25): LengthAwarePaginator
    {
        $accessibleBranches = $user->getAccessibleBranches();
        if ($accessibleBranches->isEmpty()) {
            $accessibleBranches = Branch::all();
        }
        $accessibleBranchIds = $accessibleBranches->pluck('id')->toArray();

        $query = AppRegistration::query()
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
            $query->where('registered_at', '>=', Carbon::parse($filters['from_date'])->startOfDay());
        }

        if (! empty($filters['to_date'])) {
            $query->where('registered_at', '<=', Carbon::parse($filters['to_date'])->endOfDay());
        }

        if (! empty($filters['search'])) {
            $clean = MemberCodeService::toEnglishDigits(trim($filters['search']));
            $query->where(function ($q) use ($clean) {
                $q->where('member_code', 'like', "%{$clean}%")
                    ->orWhere('member_name', 'like', "%{$clean}%")
                    ->orWhere('phone_number', 'like', "%{$clean}%");
            });
        }

        return $query->orderBy('registered_at', 'desc')->paginate($perPage)->withQueryString();
    }
}

