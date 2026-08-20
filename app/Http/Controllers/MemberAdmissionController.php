<?php

namespace App\Http\Controllers;

use App\Models\MemberAdmission;
use App\Models\Branch;
use App\Models\Role;
use App\Models\Samity;
use App\Models\MemberCategory;
use App\Models\User;
use App\Services\ApprovalService;
use App\Services\ImageCompressionService;
use App\Services\NotificationService;
use App\Support\AdmissionFormVisibility;
use App\Support\RoleListWorkQueue;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class MemberAdmissionController extends Controller
{
    use Concerns\AppliesRoleDefaultListFilter;
    use Concerns\ResolvesListPerPage;

    /**
     * Head Office / SuperAdmin / full-access users may edit admissions in any status.
     */
    private function canManageAnyStatus(): bool
    {
        $user = auth()->user();

        return $user && ($user->has_all_access || $user->isSuperAdmin() || $user->isHeadOffice());
    }

    private function userCanEditAdmission(MemberAdmission $memberAdmission): bool
    {
        $user = auth()->user();

        return $user && $memberAdmission->canBeEditedBy($user);
    }

    private function admissionNotEditableResponse(MemberAdmission $memberAdmission)
    {
        $message = $memberAdmission->hasDisbursedLoan()
            ? 'ঋণ বিতরণ সম্পন্ন হওয়ার পর ভর্তি ফর্ম সম্পাদনা করা যাবে না।'
            : 'এই ভর্তি আবেদন এখন সম্পাদনা করা যাবে না।';

        return back()->with('error', $message);
    }

    /**
     * Clear Bangla messages for oversized / invalid admission document uploads.
     */
    private function admissionFileValidationMessages(): array
    {
        return [
            'customer_photo.image' => 'সদস্যের ছবি JPG বা PNG হতে হবে।',
            'customer_photo.mimes' => 'সদস্যের ছবি JPG বা PNG হতে হবে।',
            'customer_photo.max' => 'সদস্যের ছবি সর্বোচ্চ ১০MB হতে পারবে। ছোট ছবি দিয়ে আবার চেষ্টা করুন।',
            'customer_nid_photo.mimes' => 'সদস্যের NID ছবি JPG, PNG বা PDF হতে হবে।',
            'customer_nid_photo.max' => 'সদস্যের NID ছবি সর্বোচ্চ ১০MB হতে পারবে। ছোট ফাইল দিয়ে আবার চেষ্টা করুন।',
            'customer_nid_back_photo.mimes' => 'সদস্যের NID পেছনের পাশের ছবি JPG, PNG বা PDF হতে হবে।',
            'customer_nid_back_photo.max' => 'সদস্যের NID পেছনের পাশের ছবি সর্বোচ্চ ১০MB হতে পারবে। ছোট ফাইল দিয়ে আবার চেষ্টা করুন।',
            'guardian_photo.image' => 'অভিভাবকের ছবি JPG বা PNG হতে হবে।',
            'guardian_photo.mimes' => 'অভিভাবকের ছবি JPG বা PNG হতে হবে।',
            'guardian_photo.max' => 'অভিভাবকের ছবি সর্বোচ্চ ১০MB হতে পারবে। ছোট ছবি দিয়ে আবার চেষ্টা করুন।',
            'guardian_nid_photo.mimes' => 'অভিভাবকের NID ছবি JPG, PNG বা PDF হতে হবে।',
            'guardian_nid_photo.max' => 'অভিভাবকের NID ছবি সর্বোচ্চ ১০MB হতে পারবে। ছোট ফাইল দিয়ে আবার চেষ্টা করুন।',
            'applicant_signature.image' => 'স্বাক্ষরের ছবি JPG বা PNG হতে হবে।',
            'applicant_signature.mimes' => 'স্বাক্ষরের ছবি JPG বা PNG হতে হবে।',
            'applicant_signature.max' => 'স্বাক্ষরের ছবি সর্বোচ্চ ১০MB হতে পারবে। ছোট ছবি দিয়ে আবার চেষ্টা করুন।',
        ];
    }

    /**
     * Draft saves send 0 / "" for empty selects — convert to null so nullable|exists passes.
     */
    private function normalizeAdmissionRequest(Request $request): void
    {
        // FormData sometimes sends JSON-encoded arrays as strings
        foreach (['family_members', 'other_assets', 'selected_approvers'] as $jsonKey) {
            $raw = $request->input($jsonKey);
            if (is_string($raw) && $raw !== '') {
                $decoded = json_decode($raw, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $request->merge([$jsonKey => $decoded]);
                }
            }
        }

        $nullableKeys = [
            'branch_id',
            'samity_id',
            'member_category_id',
            'survey_date',
            'admission_date',
            'date_of_birth',
            'loan_dofa',
            'requested_loan_amount',
            'estimated_annual_project_income',
        ];

        $merged = [];
        foreach ($nullableKeys as $key) {
            if (!$request->exists($key)) {
                continue;
            }
            $value = $request->input($key);
            if ($value === '' || $value === null || $value === '0' || $value === 0) {
                $merged[$key] = null;
            }
        }

        // Clean nested family_members and other_assets arrays so empty strings become null
        foreach (['family_members', 'other_assets'] as $arrayKey) {
            $items = $request->input($arrayKey);
            if (is_array($items)) {
                $cleaned = [];
                foreach ($items as $item) {
                    if (is_array($item)) {
                        foreach ($item as $k => $v) {
                            if ($v === '') {
                                $item[$k] = null;
                            }
                        }
                        $cleaned[] = $item;
                    }
                }
                $merged[$arrayKey] = $cleaned;
            }
        }

        if ($merged !== []) {
            $request->merge($merged);
        }
    }

    private function isDraftSave(Request $request): bool
    {
        return $request->boolean('draft') || $request->query('draft') == '1';
    }

    /**
     * Duplicate NID / Smart Card / mobile — same identity number in either field is rejected.
     *
     * @return array<string, string>
     */
    private function uniqueIdentityErrors(mixed $nid, mixed $smartCard, mixed $mobile, ?int $ignoreId = null): array
    {
        $nid = is_scalar($nid) ? trim((string) $nid) : '';
        $smartCard = is_scalar($smartCard) ? trim((string) $smartCard) : '';
        $mobile = is_scalar($mobile) ? trim((string) $mobile) : '';

        $errors = [];

        $nidDup = MemberAdmission::findDuplicateByIdentity($nid, $ignoreId);
        if ($nidDup) {
            $errors['nid_number'] = $this->duplicateIdentityMessage($nidDup);
        }

        $smartDup = MemberAdmission::findDuplicateByIdentity($smartCard, $ignoreId);
        if ($smartDup) {
            $errors['smart_card_number'] = $this->duplicateIdentityMessage($smartDup);
        }

        $mobileDup = MemberAdmission::findDuplicateByMobile($mobile, $ignoreId);
        if ($mobileDup) {
            $errors['mobile_number'] = $this->duplicateMobileMessage($mobileDup);
        }

        return $errors;
    }

    private function duplicateIdentityMessage(MemberAdmission $dup): string
    {
        $name = trim((string) ($dup->applicant_name_bn ?: $dup->applicant_name_en)) ?: 'অজানা';
        $appNo = $dup->application_no ?: '—';

        return "এই NID/স্মার্ট কার্ড নম্বর ইতিমধ্যে ব্যবহৃত হয়েছে (আবেদন নং: {$appNo}, নাম: {$name})। একই পরিচয়পত্র দিয়ে নতুন ভর্তি নেওয়া যাবে না।";
    }

    private function duplicateMobileMessage(MemberAdmission $dup): string
    {
        $name = trim((string) ($dup->applicant_name_bn ?: $dup->applicant_name_en)) ?: 'অজানা';
        $appNo = $dup->application_no ?: '—';

        return "এই মোবাইল নম্বর ইতিমধ্যে ব্যবহৃত হয়েছে (আবেদন নং: {$appNo}, নাম: {$name})। আলাদা মোবাইল নম্বর দিন।";
    }

    private function assertUniqueIdentity(mixed $nid, mixed $smartCard, mixed $mobile, ?int $ignoreId = null): void
    {
        $errors = $this->uniqueIdentityErrors($nid, $smartCard, $mobile, $ignoreId);
        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }

    /**
     * Live uniqueness check for Admission Create/Edit fields.
     */
    public function checkUnique(Request $request)
    {
        $ignoreId = $request->filled('ignore_id') ? (int) $request->input('ignore_id') : 0;

        return response()->json([
            'errors' => $this->uniqueIdentityErrors(
                $request->input('nid_number'),
                $request->input('smart_card_number'),
                $request->input('mobile_number'),
                $ignoreId > 0 ? $ignoreId : null
            ),
        ]);
    }

    /**
     * Soft family-member row for draft/create — empty rows skipped; empties → null.
     * Only include columns that exist so missing migrations never block draft save.
     */
    private function buildFamilyMemberRow(int $slNo, array $member): ?array
    {
        $name = trim((string) ($member['member_name'] ?? ''));
        $relation = trim((string) ($member['relation_with_head'] ?? ''));
        // Completely blank row — skip (draft soft)
        if ($name === '' && $relation === '') {
            return null;
        }

        $gender = $member['gender'] ?? null;
        if (!in_array($gender, ['male', 'female', 'other'], true)) {
            $gender = 'other';
        }

        $row = [
            'sl_no' => $slNo,
            // DB columns are NOT NULL — soft placeholders for incomplete draft rows
            'member_name' => $name !== '' ? $name : 'নাম নেই',
            'relation_with_head' => $relation !== '' ? $relation : 'নির্ধারিত নয়',
            'gender' => $gender,
            'age_years' => isset($member['age_years']) && $member['age_years'] !== '' && $member['age_years'] !== null
                ? (int) $member['age_years']
                : null,
            'age_months' => isset($member['age_months']) && $member['age_months'] !== '' && $member['age_months'] !== null
                ? (int) $member['age_months']
                : null,
            'education_level' => ($member['education_level'] ?? null) !== '' ? ($member['education_level'] ?? null) : null,
            'occupation' => ($member['occupation'] ?? null) !== '' ? ($member['occupation'] ?? null) : null,
            'monthly_income' => isset($member['monthly_income']) && $member['monthly_income'] !== '' && $member['monthly_income'] !== null
                ? $member['monthly_income']
                : null,
        ];

        if (\Schema::hasColumn('member_family_members', 'marital_status')) {
            $ms = $member['marital_status'] ?? null;
            $row['marital_status'] = in_array($ms, ['single', 'married', 'divorced', 'widowed'], true) ? $ms : null;
        }

        return $row;
    }

    /**
     * Persist family members softly (skip blank rows). Never blocks draft on incomplete rows.
     */
    private function syncFamilyMembers(MemberAdmission $admission, ?array $familyMembers): void
    {
        $admission->familyMembers()->delete();
        if (empty($familyMembers) || !is_array($familyMembers)) {
            return;
        }

        $sl = 0;
        foreach ($familyMembers as $member) {
            if (!is_array($member)) {
                continue;
            }
            $row = $this->buildFamilyMemberRow($sl + 1, $member);
            if ($row === null) {
                continue;
            }
            $sl++;
            $row['sl_no'] = $sl;
            $admission->familyMembers()->create($row);
        }
    }

    public function index(Request $request)
    {
        $user = auth()->user();
        $user->loadMissing('role');
        $isFieldOfficer = $user->role?->name === Role::FIELD_OFFICER;
        $workQueue = RoleListWorkQueue::resolveWithDates($request, false, $user);
        $statusFilter = $workQueue['status'];
        $fromDate = $workQueue['date_from'];
        $toDate = $workQueue['date_to'];

        $query = MemberAdmission::with([
            'branch.area.zone',
            'samity',
            'memberCategory',
            'submittedBy',
            'createdBy',
            'approvals.user',
        ]);

        // Records stay on the branch; field officers only see their own in that branch.
        if (!$user->has_all_access) {
            $query->whereIn('branch_id', $user->getAccessibleBranches()->pluck('id'));
        }
        if ($isFieldOfficer) {
            $query->assignedToOfficer((int) $user->id);
        }

        // Build stats query with active date, branch, and search filters (excluding status filter for stats)
        $statsQuery = MemberAdmission::query();
        if (!$user->has_all_access) {
            $statsQuery->whereIn('branch_id', $user->getAccessibleBranches()->pluck('id'));
        }
        if ($isFieldOfficer) {
            $statsQuery->assignedToOfficer((int) $user->id);
        }

        if ($request->has('branch_id') && $request->branch_id) {
            $statsQuery->where('branch_id', $request->branch_id);
        }

        if ($request->filled('search')) {
            \App\Services\MemberCodeService::applyAdmissionSearch($statsQuery, $request->search);
        }

        $this->applyCoalesceDateRange($statsQuery, $fromDate, $toDate, 'COALESCE(reviewed_at, submitted_at, created_at)');

        // Calculate stats
        $stats = [
            'total' => $statsQuery->count(),
            'draft' => (clone $statsQuery)->where('status', 'draft')->count(),
            'submitted' => (clone $statsQuery)->where('status', 'submitted')->count(),
            'under_review' => (clone $statsQuery)->where('status', 'under_review')->count(),
            'ready_for_head_office' => (clone $statsQuery)->where('status', 'ready_for_head_office')->count(),
            'pending_head_office' => (clone $statsQuery)->where('status', 'pending_head_office')->count(),
            'needs_revision' => (clone $statsQuery)->where('status', 'needs_revision')->count(),
            'approved' => (clone $statsQuery)->where('status', 'approved')->count(),
            'rejected' => (clone $statsQuery)->where('status', 'rejected')->count(),
            'pending_my_approval' => $this->countPendingMyApproval($statsQuery, $user, 'admission'),
        ];

        $this->applyResolvedStatusFilter($query, $statusFilter, $user, 'admission');

        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->filled('search')) {
            \App\Services\MemberCodeService::applyAdmissionSearch($query, $request->search);
        }

        $this->applyCoalesceDateRange($query, $fromDate, $toDate, 'COALESCE(reviewed_at, submitted_at, created_at)');

        $perPage = $this->resolvePerPage($request);
        $query->withExists([
            'loanApplications as has_disbursed_loan' => function ($q) {
                $q->where('status', \App\Models\LoanApplication::STATUS_DISBURSED);
            },
        ]);
        $admissions = $query->orderByRaw('COALESCE(reviewed_at, submitted_at, created_at) desc')->paginate($perPage)->withQueryString();

        $admissions = $admissions->through(function (MemberAdmission $admission) use ($user) {
            $arr = $admission->toArray();
            $arr['tracking_state'] = $admission->getTrackingState();
            $activeLoan = $admission->loanApplications()
                ->whereIn('status', [
                    \App\Models\LoanApplication::STATUS_SUBMITTED,
                    \App\Models\LoanApplication::STATUS_UNDER_REVIEW,
                    \App\Models\LoanApplication::STATUS_READY_FOR_HEAD_OFFICE,
                    \App\Models\LoanApplication::STATUS_PENDING_HEAD_OFFICE,
                    \App\Models\LoanApplication::STATUS_PENDING_DISBURSEMENT,
                    \App\Models\LoanApplication::STATUS_DISBURSED,
                ])
                ->latest('id')
                ->first();
            $arr['has_active_loan'] = $activeLoan !== null;
            $arr['active_loan_status'] = $activeLoan?->status;
            $hasDisbursedLoan = (bool) ($admission->has_disbursed_loan ?? false);
            $arr['has_disbursed_loan'] = $hasDisbursedLoan;
            $arr['can_be_edited'] = AdmissionFormVisibility::canEditAdmissionForm(
                $user->role?->name,
                (string) $admission->status,
                $hasDisbursedLoan,
                $this->canManageAnyStatus()
            );
            return $arr;
        });

        return Inertia::render('MemberAdmission/Index', [
            'admissions' => $admissions,
            'filters' => array_merge(
                $request->only(['branch_id', 'search']),
                [
                    'status' => $workQueue['status_param'],
                    'per_page' => $perPage,
                    'from_date' => $fromDate,
                    'to_date' => $toDate,
                ]
            ),
            'stats' => $stats,
            'workQueue' => $this->listWorkQueueProps($workQueue),
        ]);
    }

    /**
     * Export branch admissions to XLSX (same filters as index).
     */
    public function exportExcel(Request $request)
    {
        $user = auth()->user();
        $user->loadMissing('role');
        $isFieldOfficer = $user->role?->name === Role::FIELD_OFFICER;

        $query = MemberAdmission::with([
            'branch.area.zone',
            'samity',
            'memberCategory',
            'submittedBy',
            'createdBy',
            'approvals.user',
        ]);

        if (!$user->has_all_access) {
            $query->whereIn('branch_id', $user->getAccessibleBranches()->pluck('id'));
        }
        if ($isFieldOfficer) {
            $query->assignedToOfficer((int) $user->id);
        }

        if ($request->has('branch_id') && $request->branch_id) {
            $query->where('branch_id', $request->branch_id);
        }

        $workQueue = RoleListWorkQueue::resolveWithDates($request, false, $user);
        $this->applyResolvedStatusFilter($query, $workQueue['status'], $user, 'admission');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('application_no', 'like', "%{$search}%")
                  ->orWhere('applicant_name_en', 'like', "%{$search}%")
                  ->orWhere('applicant_name_bn', 'like', "%{$search}%")
                  ->orWhere('mobile_number', 'like', "%{$search}%")
                  ->orWhere('nid_number', 'like', "%{$search}%");
            });
        }

        $fromDate = $workQueue['date_from'];
        $toDate = $workQueue['date_to'];

        $this->applyCoalesceDateRange($query, $fromDate, $toDate, 'COALESCE(reviewed_at, submitted_at, created_at)');

        $admissions = $query->orderByRaw('COALESCE(reviewed_at, submitted_at, created_at) desc')->get();

        $statusLabels = [
            'draft' => 'খসড়া',
            'submitted' => 'জমা',
            'under_review' => 'পর্যালোচনায়',
            'ready_for_head_office' => 'শাখা অনুমোদিত',
            'pending_head_office' => 'হেড অফিসে',
            'approved' => 'অনুমোদিত',
            'rejected' => 'প্রত্যাখ্যাত',
            'needs_revision' => 'সংশোধন',
        ];

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('ভর্তি আবেদন');

        $headers = [
            'ক্রমিক',
            'সদস্য/আবেদন নং',
            'আবেদনকারী (বাংলা)',
            'আবেদনকারী (ইংরেজি)',
            'মোবাইল নম্বর',
            'NID নম্বর',
            'শাখা',
            'সমিতি',
            'ক্যাটাগরি',
            'তৈরি করেছেন',
            'স্ট্যাটাস',
            'পেন্ডিং অবস্থান',
            'জমাদানের তারিখ',
            'অনুমোদন/পর্যালোচনা তারিখ',
            'তৈরির তারিখ',
        ];

        $sheet->fromArray($headers, null, 'A1');
        $lastColumn = Coordinate::stringFromColumnIndex(count($headers));
        $sheet->getStyle("A1:{$lastColumn}1")->applyFromArray([
            'font' => ['bold' => true, 'size' => 11, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1E293B'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
                'wrapText' => true,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => '334155'],
                ],
            ],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(28);

        $row = 2;
        foreach ($admissions as $index => $admission) {
            $tracking = $admission->getTrackingState();
            $sheet->fromArray([
                $index + 1,
                $admission->application_no,
                $admission->applicant_name_bn,
                $admission->applicant_name_en,
                $admission->mobile_number,
                $admission->nid_number,
                $admission->branch?->name ?? '',
                $admission->samity?->samity_name ?? '',
                $admission->memberCategory?->category_name ?? '',
                $admission->createdBy?->name ?? '',
                $statusLabels[$admission->status] ?? $admission->status,
                $tracking['label'] ?? '',
                $admission->submitted_at ? $admission->submitted_at->format('Y-m-d') : '',
                $admission->reviewed_at ? $admission->reviewed_at->format('Y-m-d') : '',
                $admission->created_at ? $admission->created_at->format('Y-m-d H:i') : '',
            ], null, "A{$row}");

            $sheet->getStyle("A{$row}:{$lastColumn}{$row}")->applyFromArray([
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color' => ['rgb' => 'CBD5E1'],
                    ],
                ],
                'alignment' => [
                    'vertical' => Alignment::VERTICAL_CENTER,
                ],
            ]);
            $row++;
        }

        foreach (range(1, count($headers)) as $col) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($col))->setAutoSize(true);
        }

        $filename = 'member_admissions_' . date('Y_m_d_His') . '.xlsx';
        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function create()
    {
        $branches = Branch::with(['area.zone'])->active()->orderedByCode()->get();
        $categories = MemberCategory::active()->orderBy('category_name')->get();
        $samities = Samity::with(['branch'])->active()->orderBy('samity_name')->get();

        // Get available approvers for user's branch
        $approvers = [];
        if (auth()->user()->branch_id) {
            $approvalService = app(ApprovalService::class);
            $approvers = $approvalService->getAvailableApprovers(auth()->user()->branch_id);
        }

        return Inertia::render('MemberAdmission/Create', [
            'branches' => $branches,
            'categories' => $categories,
            'samities' => $samities,
            'availableApprovers' => $approvers,
            'suggested_application_no' => MemberAdmission::generateApplicationNumber(),
        ]);
    }

    public function store(Request $request)
    {
        $this->normalizeAdmissionRequest($request);
        $saveAsDraft = $this->isDraftSave($request);

        $validated = $request->validate([
            'application_no' => 'nullable|string|max:50|unique:member_admissions,application_no',
            'branch_id' => 'nullable|exists:branches,id',
            'samity_id' => 'nullable|exists:samities,id',
            'member_category_id' => 'nullable|exists:member_categories,id',
            'survey_date' => 'nullable|date',
            'admission_date' => 'nullable|date',

            // Personal Information - English
            'applicant_name_en' => 'nullable|string|max:255',
            'father_name_en' => 'nullable|string|max:255',
            'mother_name_en' => 'nullable|string|max:255',
            'spouse_name_en' => 'nullable|string|max:255',

            // Personal Information - Bangla
            'applicant_name_bn' => 'nullable|string|max:255',
            'father_name_bn' => 'nullable|string|max:255',
            'mother_name_bn' => 'nullable|string|max:255',
            'spouse_name_bn' => 'nullable|string|max:255',

            // Contact & Status
            'marital_status' => 'nullable|in:single,married,divorced,widowed',
            'mobile_number' => 'nullable|string|max:20',
            'alternative_mobile' => 'nullable|string|max:20',

            // Present Address
            'present_division' => 'nullable|string',
            'present_district' => 'nullable|string',
            'present_upazila' => 'nullable|string',
            'present_union' => 'nullable|string',
            'present_village_road' => 'nullable|string',
            'present_post_code' => 'nullable|string|max:10',

            // Permanent Address
            'permanent_address_same' => 'nullable|boolean',
            'permanent_division' => 'nullable|string',
            'permanent_district' => 'nullable|string',
            'permanent_upazila' => 'nullable|string',
            'permanent_union' => 'nullable|string',
            'permanent_village_road' => 'nullable|string',
            'permanent_post_code' => 'nullable|string|max:10',

            // Identity
            'nid_number' => 'nullable|string|max:20',
            'smart_card_number' => 'nullable|string|max:20',
            'birth_certificate_number' => 'nullable|string|max:30',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other',
            'family_member_mobile' => 'nullable|string|max:20',

            // Guarantor
            'guarantor_name' => 'nullable|string|max:255',
            'guarantor_mobile' => 'nullable|string|max:20',
            'tin_number' => 'nullable|string|max:20',
            'want_sms_service' => 'nullable|boolean',

            // Economic
            'business_details' => 'nullable|string',
            'job_details' => 'nullable|string',
            'other_income_details' => 'nullable|string',
            'total_asset_value' => 'nullable|numeric',
            'house_type' => 'nullable|string',

            // Property counts
            'mud_house_count' => 'nullable|integer|min:0',
            'tin_house_count' => 'nullable|integer|min:0',
            'brick_house_count' => 'nullable|integer|min:0',
            'semi_brick_house_count' => 'nullable|integer|min:0',

            // Livestock
            'cow_buffalo_count' => 'nullable|integer|min:0',
            'goat_sheep_count' => 'nullable|integer|min:0',
            'duck_chicken_count' => 'nullable|integer|min:0',
            'other_livestock' => 'nullable|string',
            'other_livestock_count' => 'nullable|integer|min:0',

            // Land
            'cultivable_land_amount' => 'nullable|numeric',
            'cultivable_land_value' => 'nullable|numeric',
            'non_cultivable_land_amount' => 'nullable|numeric',
            'non_cultivable_land_value' => 'nullable|numeric',

            // Financial
            'monthly_income' => 'nullable|numeric',
            'monthly_expense' => 'nullable|numeric',
            'monthly_savings' => 'nullable|numeric',

            // Additional
            'interviewer_name' => 'nullable|string|max:255',
            'employee_name' => 'nullable|string|max:255',
            'other_loan_info' => 'nullable|string',
            'requested_loan_amount' => 'nullable|numeric',
            'project_name' => 'nullable|string|max:255',
            'estimated_annual_project_income' => 'nullable|numeric',
            'collector_comment' => 'nullable|string',
            'guardian_name' => 'nullable|string|max:255',

            // Customer Documents (Optional) - Max 10MB (will be compressed)
            'customer_photo' => 'nullable|image|mimes:jpeg,png,jpg|max:10240',
            'customer_nid_photo' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:10240',
            'customer_nid_back_photo' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:10240',
            'nid_both_sides' => 'nullable|boolean',

            // Guardian Documents (Optional) - Max 10MB (will be compressed)
            'guardian_photo' => 'nullable|image|mimes:jpeg,png,jpg|max:10240',
            'guardian_nid_photo' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:10240',

            // Applicant Signature - Max 10MB (will be compressed)
            'applicant_signature' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:10240',

            // Family Members
            'family_members' => 'nullable|array',
            'family_members.*.member_name' => 'nullable|string',
            'family_members.*.relation_with_head' => 'nullable|string',
            'family_members.*.gender' => 'nullable|in:male,female,other',
            'family_members.*.age_years' => 'nullable|integer',
            'family_members.*.age_months' => 'nullable|integer',
            'family_members.*.marital_status' => 'nullable|in:single,married,divorced,widowed',
            'family_members.*.education_level' => 'nullable|string',
            'family_members.*.occupation' => 'nullable|string',
            'family_members.*.monthly_income' => 'nullable|numeric',

            // Other Assets
            'other_assets' => 'nullable|array',
            'other_assets.*.asset_description' => 'nullable|string',
            'other_assets.*.quantity_amount' => 'nullable|string',
            'other_assets.*.estimated_value' => 'nullable|numeric',

            // Selected Approvers — no longer used; submit goes to branch manager only
            'selected_approvers' => 'nullable|array',
            'selected_approvers.*' => 'exists:users,id',

            // Legacy / old member
            'is_legacy' => 'nullable|boolean',
            'loan_dofa' => 'nullable|integer|min:1|max:999',
        ], $this->admissionFileValidationMessages());

        $this->assertUniqueIdentity(
            $request->input('nid_number'),
            $request->input('smart_card_number'),
            $request->input('mobile_number')
        );

        $isLegacy = $request->boolean('is_legacy');
        // loan_dofa only required on final submit (not draft)
        if ($isLegacy && !$saveAsDraft && empty($validated['loan_dofa'])) {
            return back()->withInput()->withErrors([
                'loan_dofa' => 'পুরাতন সদস্যের জন্য ঋণের দফা দেওয়া বাধ্যতামূলক।',
            ]);
        }

        DB::beginTransaction();
        try {
            // Initialize compression service
            $compressionService = app(ImageCompressionService::class);

            // Handle file uploads
            $admissionData = $validated;

            // Customer Photo - Compress (no old file to preserve on create)
            if ($request->hasFile('customer_photo')) {
                $compressedPath = $compressionService->compressPhoto($request->file('customer_photo'), 'admissions/customer_photos');
                if ($compressedPath) {
                    $admissionData['customer_photo_path'] = $compressedPath;
                } else {
                    throw new \Exception('সদস্যের ছবি প্রসেস করা যায়নি। অন্য ছবি দিয়ে আবার চেষ্টা করুন। আপনার ফর্মের তথ্য মুছে যায়নি।');
                }
            }

            // Customer NID Photo - Compress with higher quality
            if ($request->hasFile('customer_nid_photo')) {
                $compressedPath = $compressionService->compressDocument($request->file('customer_nid_photo'), 'admissions/customer_nids');
                if ($compressedPath) {
                    $admissionData['customer_nid_photo_path'] = $compressedPath;
                } else {
                    throw new \Exception('সদস্যের NID ছবি প্রসেস করা যায়নি। অন্য ছবি/ফাইল দিয়ে আবার চেষ্টা করুন। আপনার ফর্মের তথ্য মুছে যায়নি।');
                }
            }

            // Customer NID back side (only when both sides selected)
            if ($request->boolean('nid_both_sides') && $request->hasFile('customer_nid_back_photo')) {
                $compressedPath = $compressionService->compressDocument($request->file('customer_nid_back_photo'), 'admissions/customer_nids');
                if ($compressedPath) {
                    $admissionData['customer_nid_back_photo_path'] = $compressedPath;
                } else {
                    throw new \Exception('সদস্যের NID পেছনের পাশের ছবি প্রসেস করা যায়নি। অন্য ছবি/ফাইল দিয়ে আবার চেষ্টা করুন। আপনার ফর্মের তথ্য মুছে যায়নি।');
                }
            }

            // Guardian Photo (Optional) - Compress
            if ($request->hasFile('guardian_photo')) {
                $compressedPath = $compressionService->compressPhoto($request->file('guardian_photo'), 'admissions/guardian_photos');
                if ($compressedPath) {
                    $admissionData['guardian_photo_path'] = $compressedPath;
                } else {
                    throw new \Exception('অভিভাবকের ছবি প্রসেস করা যায়নি। অন্য ছবি দিয়ে আবার চেষ্টা করুন। আপনার ফর্মের তথ্য মুছে যায়নি।');
                }
            }

            // Guardian NID Photo (Optional) - Compress with higher quality
            if ($request->hasFile('guardian_nid_photo')) {
                $compressedPath = $compressionService->compressDocument($request->file('guardian_nid_photo'), 'admissions/guardian_nids');
                if ($compressedPath) {
                    $admissionData['guardian_nid_photo_path'] = $compressedPath;
                } else {
                    throw new \Exception('অভিভাবকের NID ছবি প্রসেস করা যায়নি। অন্য ছবি/ফাইল দিয়ে আবার চেষ্টা করুন। আপনার ফর্মের তথ্য মুছে যায়নি।');
                }
            }

            // Applicant Signature - Compress
            if ($request->hasFile('applicant_signature')) {
                $compressedPath = $compressionService->compressPhoto($request->file('applicant_signature'), 'signatures/applicants');
                if ($compressedPath) {
                    $admissionData['applicant_signature_path'] = $compressedPath;
                } else {
                    throw new \Exception('স্বাক্ষরের ছবি প্রসেস করা যায়নি। অন্য ছবি দিয়ে আবার চেষ্টা করুন। আপনার ফর্মের তথ্য মুছে যায়নি।');
                }
            }

            // Remove file objects from data
            unset($admissionData['customer_photo'], $admissionData['customer_nid_photo'],
                  $admissionData['customer_nid_back_photo'],
                  $admissionData['guardian_photo'], $admissionData['guardian_nid_photo'],
                  $admissionData['applicant_signature']);

            $admissionData['created_by'] = auth()->id();
            $admissionData['assigned_officer_id'] = auth()->id();
            if (empty($admissionData['branch_id']) && auth()->user()?->branch_id) {
                $admissionData['branch_id'] = auth()->user()->branch_id;
            }
            $admissionData['is_legacy'] = $isLegacy;
            $admissionData['loan_dofa'] = $isLegacy ? ($validated['loan_dofa'] ?? null) : null;
            $admissionData['nid_both_sides'] = $request->boolean('nid_both_sides');
            if (!$admissionData['nid_both_sides']) {
                $admissionData['customer_nid_back_photo_path'] = null;
            }
            $admissionData['permanent_address_same'] = (bool) ($admissionData['permanent_address_same'] ?? false);
            $admissionData['want_sms_service'] = array_key_exists('want_sms_service', $admissionData)
                ? (bool) $admissionData['want_sms_service']
                : true;
            unset($admissionData['selected_approvers'], $admissionData['family_members'], $admissionData['other_assets'], $admissionData['draft']);

            if (empty($admissionData['application_no'])) {
                unset($admissionData['application_no']);
            }

            // মোট জমির পরিমাণ ও মূল্য (আবাদযোগ্য + অনাবাদি)
            $admissionData['total_land_amount'] = ($admissionData['cultivable_land_amount'] ?? 0) + ($admissionData['non_cultivable_land_amount'] ?? 0);
            $admissionData['total_land_value'] = ($admissionData['cultivable_land_value'] ?? 0) + ($admissionData['non_cultivable_land_value'] ?? 0);

            $authUser = auth()->user();
            $authUser->loadMissing('role');
            if (in_array($authUser->role?->name, [Role::FIELD_OFFICER, Role::BRANCH_MANAGER], true)) {
                $admissionData['interviewer_name'] = $admissionData['interviewer_name'] ?: $authUser->name;
                $admissionData['employee_name'] = $admissionData['employee_name'] ?: ($authUser->pin ?: $authUser->username);
            }

            // Draft = always draft status; legacy final submit auto-approves
            if ($saveAsDraft || !$isLegacy) {
                $admissionData['status'] = 'draft';
            }
            if ($isLegacy && !$saveAsDraft) {
                $admissionData['status'] = 'approved';
                $admissionData['submitted_by'] = $authUser->id;
                $admissionData['submitted_at'] = now();
                $admissionData['reviewed_by'] = $authUser->id;
                $admissionData['reviewed_at'] = now();
            }

            $admission = MemberAdmission::create($admissionData);

            // Save family members (soft — blank rows skipped; missing columns ignored)
            $this->syncFamilyMembers($admission, $validated['family_members'] ?? null);

            // Save other assets
            if (!empty($validated['other_assets'])) {
                foreach ($validated['other_assets'] as $index => $asset) {
                    $admission->otherAssets()->create([
                        'sl_no' => $index + 1,
                        'asset_description' => $asset['asset_description'],
                        'quantity_amount' => $asset['quantity_amount'] ?? null,
                        'estimated_value' => $asset['estimated_value'] ?? null,
                    ]);
                }
            }

            DB::commit();

            if ($isLegacy && !$saveAsDraft) {
                return redirect()->route('member-admissions.index')
                    ->with('success', 'পুরাতন সদস্যের ভর্তি স্বয়ংক্রিয়ভাবে অনুমোদিত হয়েছে! আবেদন নং: ' . $admission->application_no);
            }

            return redirect()->route('member-admissions.index')
                ->with('success', 'Member admission created successfully! Application No: ' . $admission->application_no);

        } catch (\Exception $e) {
            DB::rollBack();
            $message = 'খসড়া সংরক্ষণ করা যায়নি: ' . $e->getMessage() . ' — আপনার দেওয়া তথ্য মুছে যায়নি, আবার চেষ্টা করুন।';

            return back()->withInput()->withErrors([
                'draft_save' => $message,
            ])->with('error', $message);
        }
    }

    public function show(MemberAdmission $memberAdmission)
    {
        $memberAdmission->load([
            'branch.area.zone',
            'samity',
            'memberCategory',
            'createdBy',
            'submittedBy',
            'reviewedBy',
            'familyMembers',
            'otherAssets',
            'approvals.user',
        ]);

        $memberAdmission->setAttribute('has_disbursed_loan', $memberAdmission->hasDisbursedLoan());
        $memberAdmission->setAttribute('can_be_edited', $memberAdmission->canBeEditedBy(auth()->user()));

        return Inertia::render('MemberAdmission/Show', [
            'admission' => $memberAdmission,
        ]);
    }

    /**
     * Print single admission profile
     */
    public function printSingle(MemberAdmission $memberAdmission)
    {
        $memberAdmission->load([
            'branch.area.zone',
            'samity',
            'memberCategory',
            'submittedBy',
            'reviewedBy',
            'familyMembers',
            'otherAssets',
        ]);

        return Inertia::render('HeadOffice/AdmissionPrintSingle', [
            'admission' => $memberAdmission,
        ]);
    }

    public function edit(Request $request, MemberAdmission $memberAdmission)
    {
        if (!$this->userCanEditAdmission($memberAdmission)) {
            return $this->admissionNotEditableResponse($memberAdmission);
        }

        $memberAdmission->load(['familyMembers', 'otherAssets']);

        $branches = Branch::with(['area.zone'])->active()->orderedByCode()->get();
        $categories = MemberCategory::active()->orderBy('category_name')->get();
        $samities = Samity::where('branch_id', $memberAdmission->branch_id)->active()->get();

        // Get available approvers
        $approvers = [];
        if ($memberAdmission->branch_id) {
            $approvalService = app(ApprovalService::class);
            $approvers = $approvalService->getAvailableApprovers($memberAdmission->branch_id);
        }

        return Inertia::render('MemberAdmission/Edit', [
            'admission' => $memberAdmission,
            'branches' => $branches,
            'categories' => $categories,
            'samities' => $samities,
            'availableApprovers' => $approvers,
            'for_submit' => $request->boolean('for_submit'),
        ]);
    }

    public function update(Request $request, MemberAdmission $memberAdmission)
    {
        if (!$this->userCanEditAdmission($memberAdmission)) {
            return $this->admissionNotEditableResponse($memberAdmission);
        }

        $this->normalizeAdmissionRequest($request);
        $saveAsDraft = $this->isDraftSave($request);

        $validated = $request->validate([
            'application_no' => 'nullable|string|max:50|unique:member_admissions,application_no,' . $memberAdmission->id,
            'branch_id' => 'nullable|exists:branches,id',
            'samity_id' => 'nullable|exists:samities,id',
            'member_category_id' => 'nullable|exists:member_categories,id',
            'survey_date' => 'nullable|date',
            'admission_date' => 'nullable|date',

            // Personal Information - English
            'applicant_name_en' => 'nullable|string|max:255',
            'father_name_en' => 'nullable|string|max:255',
            'mother_name_en' => 'nullable|string|max:255',
            'spouse_name_en' => 'nullable|string|max:255',

            // Personal Information - Bangla
            'applicant_name_bn' => 'nullable|string|max:255',
            'father_name_bn' => 'nullable|string|max:255',
            'mother_name_bn' => 'nullable|string|max:255',
            'spouse_name_bn' => 'nullable|string|max:255',

            // Contact & Status
            'marital_status' => 'nullable|in:single,married,divorced,widowed',
            'mobile_number' => 'nullable|string|max:20',
            'alternative_mobile' => 'nullable|string|max:20',

            // Present Address
            'present_division' => 'nullable|string',
            'present_district' => 'nullable|string',
            'present_upazila' => 'nullable|string',
            'present_union' => 'nullable|string',
            'present_village_road' => 'nullable|string',
            'present_post_code' => 'nullable|string|max:10',

            // Permanent Address
            'permanent_address_same' => 'nullable|boolean',
            'permanent_division' => 'nullable|string',
            'permanent_district' => 'nullable|string',
            'permanent_upazila' => 'nullable|string',
            'permanent_union' => 'nullable|string',
            'permanent_village_road' => 'nullable|string',
            'permanent_post_code' => 'nullable|string|max:10',

            // Identity
            'nid_number' => 'nullable|string|max:20',
            'smart_card_number' => 'nullable|string|max:20',
            'birth_certificate_number' => 'nullable|string|max:30',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other',
            'family_member_mobile' => 'nullable|string|max:20',

            // Guarantor
            'guarantor_name' => 'nullable|string|max:255',
            'guarantor_mobile' => 'nullable|string|max:20',
            'tin_number' => 'nullable|string|max:20',
            'want_sms_service' => 'nullable|boolean',

            // Economic
            'business_details' => 'nullable|string',
            'job_details' => 'nullable|string',
            'other_income_details' => 'nullable|string',
            'total_asset_value' => 'nullable|numeric',
            'house_type' => 'nullable|string',

            // Property counts
            'mud_house_count' => 'nullable|integer|min:0',
            'tin_house_count' => 'nullable|integer|min:0',
            'brick_house_count' => 'nullable|integer|min:0',
            'semi_brick_house_count' => 'nullable|integer|min:0',

            // Livestock
            'cow_buffalo_count' => 'nullable|integer|min:0',
            'goat_sheep_count' => 'nullable|integer|min:0',
            'duck_chicken_count' => 'nullable|integer|min:0',
            'other_livestock' => 'nullable|string',
            'other_livestock_count' => 'nullable|integer|min:0',

            // Land
            'cultivable_land_amount' => 'nullable|numeric',
            'cultivable_land_value' => 'nullable|numeric',
            'non_cultivable_land_amount' => 'nullable|numeric',
            'non_cultivable_land_value' => 'nullable|numeric',

            // Financial
            'monthly_income' => 'nullable|numeric',
            'monthly_expense' => 'nullable|numeric',
            'monthly_savings' => 'nullable|numeric',

            // Additional
            'interviewer_name' => 'nullable|string|max:255',
            'employee_name' => 'nullable|string|max:255',
            'other_loan_info' => 'nullable|string',
            'requested_loan_amount' => 'nullable|numeric',
            'project_name' => 'nullable|string|max:255',
            'estimated_annual_project_income' => 'nullable|numeric',
            'collector_comment' => 'nullable|string',
            'guardian_name' => 'nullable|string|max:255',

            // Customer Documents (Optional) - Max 10MB (will be compressed)
            'customer_photo' => 'nullable|image|mimes:jpeg,png,jpg|max:10240',
            'customer_nid_photo' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:10240',
            'customer_nid_back_photo' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:10240',
            'nid_both_sides' => 'nullable|boolean',

            // Guardian Documents (Optional) - Max 10MB (will be compressed)
            'guardian_photo' => 'nullable|image|mimes:jpeg,png,jpg|max:10240',
            'guardian_nid_photo' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:10240',

            // Applicant Signature - Max 10MB (will be compressed)
            'applicant_signature' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:10240',

            // Family Members
            'family_members' => 'nullable|array',
            'family_members.*.member_name' => 'nullable|string',
            'family_members.*.relation_with_head' => 'nullable|string',
            'family_members.*.gender' => 'nullable|in:male,female,other',
            'family_members.*.age_years' => 'nullable|integer',
            'family_members.*.age_months' => 'nullable|integer',
            'family_members.*.marital_status' => 'nullable|in:single,married,divorced,widowed',
            'family_members.*.education_level' => 'nullable|string',
            'family_members.*.occupation' => 'nullable|string',
            'family_members.*.monthly_income' => 'nullable|numeric',

            // Other Assets
            'other_assets' => 'nullable|array',
            'other_assets.*.asset_description' => 'nullable|string',
            'other_assets.*.quantity_amount' => 'nullable|string',
            'other_assets.*.estimated_value' => 'nullable|numeric',

            // Selected Approvers — no longer used; submit goes to branch manager only
            'selected_approvers' => 'nullable|array',
            'selected_approvers.*' => 'exists:users,id',

            // Legacy / old member — type can change while still draft (before submit)
            'is_legacy' => 'nullable|boolean',
            'loan_dofa' => 'nullable|integer|min:1|max:999',
        ], $this->admissionFileValidationMessages());

        $this->assertUniqueIdentity(
            $request->input('nid_number'),
            $request->input('smart_card_number'),
            $request->input('mobile_number'),
            $memberAdmission->id
        );

        $canChangeMemberType = $memberAdmission->isDraft();
        $isLegacy = (bool) $memberAdmission->is_legacy;
        if ($canChangeMemberType && $request->has('is_legacy')) {
            $isLegacy = $request->boolean('is_legacy');
        }

        // loan_dofa only required on final submit (not draft)
        if ($isLegacy && !$saveAsDraft && empty($validated['loan_dofa']) && empty($memberAdmission->loan_dofa)) {
            return back()->withInput()->withErrors([
                'loan_dofa' => 'পুরাতন সদস্যের জন্য ঋণের দফা দেওয়া বাধ্যতামূলক।',
            ]);
        }

        DB::beginTransaction();
        try {
            // Initialize compression service
            $compressionService = app(ImageCompressionService::class);
            $oldPathsToDelete = [];

            $updateData = $validated;
            if ($canChangeMemberType) {
                $updateData['is_legacy'] = $isLegacy;
            } else {
                unset($updateData['is_legacy']);
            }
            if ($isLegacy) {
                $updateData['loan_dofa'] = $validated['loan_dofa'] ?? $memberAdmission->loan_dofa;
            } else {
                $updateData['loan_dofa'] = null;
            }
            unset($updateData['selected_approvers'], $updateData['family_members'], $updateData['other_assets'], $updateData['draft']);
            if (empty($updateData['application_no'])) {
                unset($updateData['application_no']);
            }
            if (array_key_exists('permanent_address_same', $updateData)) {
                $updateData['permanent_address_same'] = (bool) $updateData['permanent_address_same'];
            }
            if (array_key_exists('want_sms_service', $updateData)) {
                $updateData['want_sms_service'] = (bool) $updateData['want_sms_service'];
            }
            $updateData['nid_both_sides'] = $request->boolean('nid_both_sides');
            if (!$updateData['nid_both_sides'] && !$request->hasFile('customer_nid_back_photo')) {
                if ($memberAdmission->customer_nid_back_photo_path) {
                    $oldPathsToDelete[] = $memberAdmission->customer_nid_back_photo_path;
                }
                $updateData['customer_nid_back_photo_path'] = null;
            }

            // Compress NEW file first; only delete old file after DB commit succeeds
            if ($request->hasFile('customer_photo')) {
                $compressedPath = $compressionService->compressPhoto($request->file('customer_photo'), 'admissions/customer_photos');
                if (!$compressedPath) {
                    throw new \Exception('সদস্যের ছবি প্রসেস করা যায়নি। অন্য ছবি দিয়ে আবার চেষ্টা করুন। আগের ছবি ও খসড়া অপরিবর্তিত আছে।');
                }
                if ($memberAdmission->customer_photo_path) {
                    $oldPathsToDelete[] = $memberAdmission->customer_photo_path;
                }
                $updateData['customer_photo_path'] = $compressedPath;
            }

            if ($request->hasFile('customer_nid_photo')) {
                $compressedPath = $compressionService->compressDocument($request->file('customer_nid_photo'), 'admissions/customer_nids');
                if (!$compressedPath) {
                    throw new \Exception('সদস্যের NID ছবি প্রসেস করা যায়নি। অন্য ছবি/ফাইল দিয়ে আবার চেষ্টা করুন। আগের ছবি ও খসড়া অপরিবর্তিত আছে।');
                }
                if ($memberAdmission->customer_nid_photo_path) {
                    $oldPathsToDelete[] = $memberAdmission->customer_nid_photo_path;
                }
                $updateData['customer_nid_photo_path'] = $compressedPath;
            }

            if ($request->boolean('nid_both_sides') && $request->hasFile('customer_nid_back_photo')) {
                $compressedPath = $compressionService->compressDocument($request->file('customer_nid_back_photo'), 'admissions/customer_nids');
                if (!$compressedPath) {
                    throw new \Exception('সদস্যের NID পেছনের পাশের ছবি প্রসেস করা যায়নি। অন্য ছবি/ফাইল দিয়ে আবার চেষ্টা করুন। আগের ছবি ও খসড়া অপরিবর্তিত আছে।');
                }
                if ($memberAdmission->customer_nid_back_photo_path) {
                    $oldPathsToDelete[] = $memberAdmission->customer_nid_back_photo_path;
                }
                $updateData['customer_nid_back_photo_path'] = $compressedPath;
            }

            if ($request->hasFile('guardian_photo')) {
                $compressedPath = $compressionService->compressPhoto($request->file('guardian_photo'), 'admissions/guardian_photos');
                if (!$compressedPath) {
                    throw new \Exception('অভিভাবকের ছবি প্রসেস করা যায়নি। অন্য ছবি দিয়ে আবার চেষ্টা করুন। আগের ছবি ও খসড়া অপরিবর্তিত আছে।');
                }
                if ($memberAdmission->guardian_photo_path) {
                    $oldPathsToDelete[] = $memberAdmission->guardian_photo_path;
                }
                $updateData['guardian_photo_path'] = $compressedPath;
            }

            if ($request->hasFile('guardian_nid_photo')) {
                $compressedPath = $compressionService->compressDocument($request->file('guardian_nid_photo'), 'admissions/guardian_nids');
                if (!$compressedPath) {
                    throw new \Exception('অভিভাবকের NID ছবি প্রসেস করা যায়নি। অন্য ছবি/ফাইল দিয়ে আবার চেষ্টা করুন। আগের ছবি ও খসড়া অপরিবর্তিত আছে।');
                }
                if ($memberAdmission->guardian_nid_photo_path) {
                    $oldPathsToDelete[] = $memberAdmission->guardian_nid_photo_path;
                }
                $updateData['guardian_nid_photo_path'] = $compressedPath;
            }

            if ($request->hasFile('applicant_signature')) {
                $compressedPath = $compressionService->compressPhoto($request->file('applicant_signature'), 'signatures/applicants');
                if (!$compressedPath) {
                    throw new \Exception('স্বাক্ষরের ছবি প্রসেস করা যায়নি। অন্য ছবি দিয়ে আবার চেষ্টা করুন। আগের ছবি ও খসড়া অপরিবর্তিত আছে।');
                }
                if ($memberAdmission->applicant_signature_path) {
                    $oldPathsToDelete[] = $memberAdmission->applicant_signature_path;
                }
                $updateData['applicant_signature_path'] = $compressedPath;
            }

            // Clear photos the user removed in the edit form (only when no replacement file uploaded)
            $clearablePhotos = [
                'customer_photo' => 'customer_photo_path',
                'customer_nid_photo' => 'customer_nid_photo_path',
                'customer_nid_back_photo' => 'customer_nid_back_photo_path',
                'guardian_photo' => 'guardian_photo_path',
                'guardian_nid_photo' => 'guardian_nid_photo_path',
                'applicant_signature' => 'applicant_signature_path',
            ];
            foreach ($clearablePhotos as $field => $pathColumn) {
                if ($request->boolean("clear_{$field}") && !$request->hasFile($field)) {
                    if ($memberAdmission->{$pathColumn}) {
                        $oldPathsToDelete[] = $memberAdmission->{$pathColumn};
                    }
                    $updateData[$pathColumn] = null;
                }
            }

            // Remove file objects from data
            unset($updateData['customer_photo'], $updateData['customer_nid_photo'],
                  $updateData['customer_nid_back_photo'],
                  $updateData['guardian_photo'], $updateData['guardian_nid_photo'],
                  $updateData['applicant_signature']);

            $authUser = auth()->user();
            $authUser->loadMissing('role');
            if (in_array($authUser->role?->name, [Role::FIELD_OFFICER, Role::BRANCH_MANAGER], true)) {
                $updateData['interviewer_name'] = $updateData['interviewer_name'] ?: $authUser->name;
                $updateData['employee_name'] = $updateData['employee_name'] ?: ($authUser->pin ?: $authUser->username);
            }

            // মোট জমির পরিমাণ ও মূল্য (আবাদযোগ্য + অনাবাদি)
            $cultivableAmount = $updateData['cultivable_land_amount'] ?? $memberAdmission->cultivable_land_amount ?? 0;
            $cultivableValue = $updateData['cultivable_land_value'] ?? $memberAdmission->cultivable_land_value ?? 0;
            $nonCultivableAmount = $updateData['non_cultivable_land_amount'] ?? $memberAdmission->non_cultivable_land_amount ?? 0;
            $nonCultivableValue = $updateData['non_cultivable_land_value'] ?? $memberAdmission->non_cultivable_land_value ?? 0;
            $updateData['total_land_amount'] = $cultivableAmount + $nonCultivableAmount;
            $updateData['total_land_value'] = $cultivableValue + $nonCultivableValue;

            // Legacy draft: final save (not draft) → auto-approve
            $legacyAutoApproved = false;
            if ($isLegacy && !$saveAsDraft && $memberAdmission->isDraft()) {
                $updateData['status'] = 'approved';
                $updateData['submitted_by'] = auth()->id();
                $updateData['submitted_at'] = now();
                $updateData['reviewed_by'] = auth()->id();
                $updateData['reviewed_at'] = now();
                $legacyAutoApproved = true;
            } elseif ($saveAsDraft && $memberAdmission->isDraft()) {
                $updateData['status'] = 'draft';
            }

            $memberAdmission->update($updateData);

            // Update family members (soft — blank rows skipped)
            $this->syncFamilyMembers($memberAdmission, $validated['family_members'] ?? null);

            // Update other assets
            $memberAdmission->otherAssets()->delete();
            if (!empty($validated['other_assets'])) {
                foreach ($validated['other_assets'] as $index => $asset) {
                    $memberAdmission->otherAssets()->create([
                        'sl_no' => $index + 1,
                        'asset_description' => $asset['asset_description'],
                        'quantity_amount' => $asset['quantity_amount'] ?? null,
                        'estimated_value' => $asset['estimated_value'] ?? null,
                    ]);
                }
            }

            DB::commit();

            foreach ($oldPathsToDelete as $oldPath) {
                $compressionService->delete($oldPath);
            }

            if ($legacyAutoApproved) {
                return redirect()->route('member-admissions.index')
                    ->with('success', 'পুরাতন সদস্যের ভর্তি স্বয়ংক্রিয়ভাবে অনুমোদিত হয়েছে!');
            }

            // Save filled fields then submit in one step (from edit-for-submit flow)
            if ($request->boolean('submit_after_save') && $memberAdmission->fresh()->isDraft()) {
                return $this->submit($memberAdmission->fresh());
            }

            return redirect()->route('member-admissions.index')
                ->with('success', 'Member admission updated successfully!');

        } catch (\Exception $e) {
            DB::rollBack();
            $message = 'খসড়া আপডেট করা যায়নি: ' . $e->getMessage() . ' — আগের সংরক্ষিত তথ্য মুছে যায়নি।';

            return back()->withInput()->withErrors([
                'draft_save' => $message,
            ])->with('error', $message);
        }
    }

    public function destroy(MemberAdmission $memberAdmission)
    {
        // Only draft admissions can be deleted
        if (!$memberAdmission->isDraft()) {
            return back()->with('error', 'Only draft admissions can be deleted!');
        }

        $memberAdmission->delete();

        return $this->redirectToListPreservingFilters('member-admissions.index', 'Member admission deleted successfully!');
    }

    public function submit(MemberAdmission $memberAdmission)
    {
        $user = auth()->user();
        $user->loadMissing('role');
        if (!$memberAdmission->isDraft()) {
            return back()->with('error', 'Only draft admissions can be submitted!');
        }

        // Validate required fields before submitting for approval
        $rules = [
            'branch_id' => 'required',
            'samity_id' => 'required',
            'member_category_id' => 'required',
            'survey_date' => 'required',
            'admission_date' => 'required',

            // Personal Information
            'applicant_name_en' => 'required',
            'father_name_en' => 'required',
            'mother_name_en' => 'required',
            'applicant_name_bn' => 'required',
            'father_name_bn' => 'required',
            'mother_name_bn' => 'required',
            'marital_status' => 'required',
            'mobile_number' => 'required',

            // Address
            'present_division' => 'required',
            'present_district' => 'required',
            'present_upazila' => 'required',

            // Identity & Photo
            'nid_number' => 'required_without:smart_card_number',
            'smart_card_number' => 'required_without:nid_number',
            'gender' => 'required',
            'customer_nid_photo_path' => 'required',
        ];

        $messages = [
            'branch_id.required' => 'শাখা নির্বাচন করা বাধ্যতামূলক।',
            'samity_id.required' => 'সমিতি নির্বাচন করা বাধ্যতামূলক।',
            'member_category_id.required' => 'সদস্য শ্রেণি নির্বাচন করা বাধ্যতামূলক।',
            'survey_date.required' => 'জরিপের তারিখ দেওয়া বাধ্যতামূলক।',
            'admission_date.required' => 'ভর্তির তারিখ দেওয়া বাধ্যতামূলক।',
            'applicant_name_en.required' => 'আবেদনকারীর নাম (ইংরেজি) বাধ্যতামূলক।',
            'father_name_en.required' => 'পিতার নাম (ইংরেজি) বাধ্যতামূলক।',
            'mother_name_en.required' => 'মাতার নাম (ইংরেজি) বাধ্যতামূলক।',
            'applicant_name_bn.required' => 'আবেদনকারীর নাম (বাংলা) বাধ্যতামূলক।',
            'father_name_bn.required' => 'পিতার নাম (বাংলা) বাধ্যতামূলক।',
            'mother_name_bn.required' => 'মাতার নাম (বাংলা) বাধ্যতামূলক।',
            'marital_status.required' => 'বৈবাহিক অবস্থা বাধ্যতামূলক।',
            'mobile_number.required' => 'মোবাইল নম্বর বাধ্যতামূলক।',
            'present_division.required' => 'বর্তমান বিভাগ বাধ্যতামূলক।',
            'present_district.required' => 'বর্তমান জেলা বাধ্যতামূলক।',
            'present_upazila.required' => 'বর্তমান উপজেলা বাধ্যতামূলক।',
            'nid_number.required_without' => 'জাতীয় পরিচয়পত্র (NID) নম্বর অথবা স্মার্ট কার্ড নম্বর যেকোনো একটি প্রদান করা বাধ্যতামূলক।',
            'smart_card_number.required_without' => 'জাতীয় পরিচয়পত্র (NID) নম্বর অথবা স্মার্ট কার্ড নম্বর যেকোনো একটি প্রদান করা বাধ্যতামূলক।',
            'gender.required' => 'লিঙ্গ নির্বাচন বাধ্যতামূলক।',
            'customer_nid_photo_path.required' => 'সদস্যের NID ছবি আপলোড করা বাধ্যতামূলক।',
        ];

        $data = $memberAdmission->toArray();
        foreach (['branch_id', 'samity_id', 'member_category_id'] as $fk) {
            if (empty($data[$fk]) || (int) $data[$fk] === 0) {
                $data[$fk] = null;
            }
        }

        $validator = \Illuminate\Support\Facades\Validator::make($data, $rules, $messages);

        if ($validator->fails()) {
            return redirect()->route('member-admissions.edit', [
                'memberAdmission' => $memberAdmission->id,
                'for_submit' => 1,
            ])
                ->withErrors($validator)
                ->with('error', 'আবেদনটি জমা দেওয়ার আগে লাল চিহ্নিত আবশ্যকীয় তথ্যগুলো পূরণ করুন।');
        }

        $uniqueErrors = $this->uniqueIdentityErrors(
            $memberAdmission->nid_number,
            $memberAdmission->smart_card_number,
            $memberAdmission->mobile_number,
            $memberAdmission->id
        );
        if ($uniqueErrors !== []) {
            return redirect()->route('member-admissions.edit', [
                'memberAdmission' => $memberAdmission->id,
                'for_submit' => 1,
            ])
                ->withErrors($uniqueErrors)
                ->with('error', 'এই NID, স্মার্ট কার্ড অথবা মোবাইল নম্বর ইতিমধ্যে অন্য ভর্তি আবেদনে ব্যবহৃত হয়েছে।');
        }

        // «নিজ» family row is required and must be filled (feeds loan application later)
        $selfMember = $memberAdmission->familyMembers()
            ->where('relation_with_head', 'নিজ')
            ->first();
        $selfName = trim((string) ($selfMember?->member_name ?? ''));
        $selfAge = $selfMember?->age_years;
        if (
            !$selfMember
            || $selfName === ''
            || $selfName === 'নাম নেই'
            || $selfAge === null
            || (int) $selfAge < 1
        ) {
            return redirect()->route('member-admissions.edit', [
                'memberAdmission' => $memberAdmission->id,
                'for_submit' => 1,
            ])
                ->withErrors([
                    'family_members' => 'পরিবারের সদস্য তালিকায় «নিজ» (আবেদনকারী) সারির নাম ও বয়স পূরণ বাধ্যতামূলক।',
                ])
                ->with('error', 'পরিবারের সদস্য তালিকায় «নিজ» (আবেদনকারী) সারির নাম ও বয়স পূরণ বাধ্যতামূলক।');
        }

        if (
            $memberAdmission->nid_both_sides
            && empty($memberAdmission->customer_nid_back_photo_path)
        ) {
            return redirect()->route('member-admissions.edit', [
                'memberAdmission' => $memberAdmission->id,
                'for_submit' => 1,
            ])
                ->withErrors([
                    'customer_nid_back_photo' => 'দুই পাশের NID নির্বাচন করা হয়েছে — পেছনের পাশের ছবি আপলোড বাধ্যতামূলক।',
                ])
                ->with('error', 'দুই পাশের NID নির্বাচন করা হয়েছে — পেছনের পাশের ছবি আপলোড বাধ্যতামূলক।');
        }

        if ($memberAdmission->is_legacy && empty($memberAdmission->loan_dofa)) {
            return redirect()->route('member-admissions.edit', [
                'memberAdmission' => $memberAdmission->id,
                'for_submit' => 1,
            ])
                ->withErrors(['loan_dofa' => 'পুরাতন সদস্যের জন্য ঋণের দফা দেওয়া বাধ্যতামূলক।'])
                ->with('error', 'পুরাতন সদস্যের জন্য ঋণের দফা দেওয়া বাধ্যতামূলক।');
        }

        $authUser = auth()->user();

        // Legacy / old member: auto-approve, no approver workflow
        if ($memberAdmission->is_legacy) {
            DB::transaction(function () use ($memberAdmission, $authUser) {
                $memberAdmission->update([
                    'status' => 'approved',
                    'submitted_by' => $authUser->id,
                    'submitted_at' => now(),
                    'reviewed_by' => $authUser->id,
                    'reviewed_at' => now(),
                ]);
            });

            return $this->redirectToListPreservingFilters('member-admissions.index', 'পুরাতন সদস্যের ভর্তি স্বয়ংক্রিয়ভাবে অনুমোদিত হয়েছে!');
        }

        DB::transaction(function () use ($memberAdmission, $authUser) {
            $memberAdmission->update([
                'status' => 'submitted',
                'submitted_by' => $authUser->id,
                'submitted_at' => now(),
            ]);

            $approvalService = app(ApprovalService::class);
            $approvalService->createApprovalWorkflow($memberAdmission);
        });

        // Notify Branch Manager(s) of the branch
        $branchManagers = User::where('branch_id', $memberAdmission->branch_id)
            ->where('is_active', 1)
            ->whereHas('role', fn ($q) => $q->where('name', Role::BRANCH_MANAGER))
            ->get();

        if ($branchManagers->isNotEmpty()) {
            app(NotificationService::class)->send(
                users: $branchManagers,
                type: 'member_admission',
                title: 'নতুন সদস্য আবেদন জমা হয়েছে',
                message: "সদস্য আবেদন নং {$memberAdmission->application_no} ({$memberAdmission->applicant_name_bn}) অনুমোদনের জন্য জমা দেওয়া হয়েছে।",
                notifiable: $memberAdmission,
                actionUrl: '/approvals',
                details: [
                    'আবেদন নং' => $memberAdmission->application_no,
                    'আবেদনকারীর নাম' => $memberAdmission->applicant_name_bn ?: $memberAdmission->applicant_name_en,
                    'মোবাইল' => $memberAdmission->mobile_number ?? 'N/A',
                    'শাখা' => $memberAdmission->branch?->name ?? 'N/A',
                ]
            );
        }

        return $this->redirectToListPreservingFilters('member-admissions.index', 'Member admission submitted successfully and sent for approval!');
    }

    /**
     * Resubmit admission after revision
     */
    public function resubmit(Request $request, MemberAdmission $memberAdmission)
    {
        $user = auth()->user();
        $user->loadMissing('role');
        $request->validate([
            'revision_note' => 'required|string|max:2000',
        ]);

        if ($memberAdmission->status !== 'needs_revision') {
            return back()->with('error', 'Only admissions that need revision can be resubmitted!');
        }

        DB::transaction(function () use ($memberAdmission, $request) {
            // Append revision note to revision_comments with timestamp and user
            $currentComments = $memberAdmission->revision_comments ?? '';
            $newComment = "\n\n--- Branch Revision Note (" . now()->format('Y-m-d H:i') . " by " . auth()->user()->name . ") ---\n";
            $newComment .= $request->revision_note;

            // Mark all branch approvals as approved (no need to re-approve by branch)
            $memberAdmission->approvals()
                ->where('level', 'branch')
                ->update([
                    'status' => 'approved',
                    'approved_at' => now(),
                    'comments' => 'Re-approved after revision',
                ]);

            // Clear all issues
            $memberAdmission->issues()->delete();

            $authUser = auth()->user();
            $memberAdmission->update([
                'status' => 'pending_head_office',
                'revision_comments' => $currentComments . $newComment,
                'submitted_by' => $authUser->id,
                'submitted_at' => now(),
            ]);
        });

        // Notify Head Office users
        $headOfficeUsers = User::where('is_active', 1)
            ->where(function ($q) {
                $q->where('has_all_access', 1)
                  ->orWhereHas('role', fn ($r) => $r->whereIn('name', ['super_admin', 'head_office', 'ed']));
            })->get();

        if ($headOfficeUsers->isNotEmpty()) {
            app(NotificationService::class)->send(
                users: $headOfficeUsers,
                type: 'member_admission',
                title: 'সংশোধিত সদস্য আবেদন পুনঃজমা দেওয়া হয়েছে',
                message: "সদস্য আবেদন নং {$memberAdmission->application_no} ({$memberAdmission->applicant_name_bn}) সংশোধন করে পুনঃজমা দেওয়া হয়েছে।",
                notifiable: $memberAdmission,
                actionUrl: '/head-office/process-admissions',
                details: [
                    'আবেদন নং' => $memberAdmission->application_no,
                    'আবেদনকারীর নাম' => $memberAdmission->applicant_name_bn ?: $memberAdmission->applicant_name_en,
                    'শাখা' => $memberAdmission->branch?->name ?? 'N/A',
                ]
            );
        }

        return $this->redirectToListPreservingFilters('member-admissions.index', 'Member admission resubmitted successfully!');
    }

    /**
     * After all approvals, branch user sends admission to Head Office.
     * This replaces the previous auto-send from ApprovalService.
     */
    public function sendToHeadOffice(MemberAdmission $memberAdmission)
    {
        $user = auth()->user();
        $user->loadMissing('role');
        $roleName = strtolower($user->role->name ?? '');

        // Only Branch User can send to Head Office (Branch Manager cannot)
        if ($roleName !== 'branch_user') {
            return back()->with('error', 'শুধুমাত্র শাখা ব্যবহারকারী (Branch User) হেড অফিসে পাঠাতে পারবেন।');
        }

        if ($memberAdmission->status !== 'ready_for_head_office') {
            return back()->with('error', 'শুধু শাখা অনুমোদিত আবেদনই Head Office এ পাঠানো যাবে।');
        }

        $memberAdmission->update([
            'status' => 'pending_head_office',
            'submitted_by' => $user->id,
            'submitted_at' => now(),
        ]);

        // Notify Head Office users
        $headOfficeUsers = User::where('is_active', 1)
            ->where(function ($q) {
                $q->where('has_all_access', 1)
                  ->orWhereHas('role', fn ($r) => $r->whereIn('name', ['super_admin', 'head_office', 'ed']));
            })->get();

        if ($headOfficeUsers->isNotEmpty()) {
            app(NotificationService::class)->send(
                users: $headOfficeUsers,
                type: 'member_admission',
                title: 'সদস্য আবেদন হেড অফিসে পাঠানো হয়েছে',
                message: "সদস্য আবেদন নং {$memberAdmission->application_no} ({$memberAdmission->applicant_name_bn}) শাখা কর্তৃক হেড অফিসে অনুমোদনের জন্য পাঠানো হয়েছে।",
                notifiable: $memberAdmission,
                actionUrl: '/head-office/process-admissions',
                details: [
                    'আবেদন নং' => $memberAdmission->application_no,
                    'আবেদনকারীর নাম' => $memberAdmission->applicant_name_bn ?: $memberAdmission->applicant_name_en,
                    'শাখা' => $memberAdmission->branch?->name ?? 'N/A',
                    'প্রেরক' => $user->name,
                ]
            );
        }

        return back()->with('success', 'আবেদনটি Head Office এ পাঠানো হয়েছে।');
    }

    /**
     * Branch user: send multiple ready admissions to Head Office at once.
     */
    public function sendToHeadOfficeBulk(Request $request)
    {
        $user = auth()->user();
        $user->loadMissing('role');
        $roleName = strtolower($user->role->name ?? '');

        if ($roleName !== 'branch_user') {
            return back()->with('error', 'শুধুমাত্র শাখা ব্যবহারকারী (Branch User) হেড অফিসে পাঠাতে পারবেন।');
        }

        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|distinct',
        ]);

        $ids = array_map('intval', $validated['ids']);

        $query = MemberAdmission::query()
            ->whereIn('id', $ids)
            ->where('status', 'ready_for_head_office');

        if (! $user->has_all_access) {
            $accessibleBranchIds = $user->getAccessibleBranches()->pluck('id')->all();
            $query->whereIn('branch_id', $accessibleBranchIds ?: [0]);
        }

        $admissions = $query->with('branch')->get();

        if ($admissions->isEmpty()) {
            return back()->with('error', 'পাঠানোর মতো শাখা অনুমোদিত আবেদন পাওয়া যায়নি।');
        }

        DB::transaction(function () use ($admissions, $user) {
            foreach ($admissions as $admission) {
                $admission->update([
                    'status' => 'pending_head_office',
                    'submitted_by' => $user->id,
                    'submitted_at' => now(),
                ]);
            }
        });

        $count = $admissions->count();
        $branchName = $admissions->first()?->branch?->name ?? 'N/A';
        $sampleNos = $admissions->take(5)->pluck('application_no')->filter()->implode(', ');

        $headOfficeUsers = User::where('is_active', 1)
            ->where(function ($q) {
                $q->where('has_all_access', 1)
                    ->orWhereHas('role', fn ($r) => $r->whereIn('name', ['super_admin', 'head_office', 'ed']));
            })->get();

        if ($headOfficeUsers->isNotEmpty()) {
            app(NotificationService::class)->send(
                users: $headOfficeUsers,
                type: 'member_admission',
                title: 'একাধিক সদস্য আবেদন হেড অফিসে পাঠানো হয়েছে',
                message: "{$count}টি সদস্য ভর্তি আবেদন শাখা কর্তৃক হেড অফিসে অনুমোদনের জন্য পাঠানো হয়েছে।",
                notifiable: $admissions->first(),
                actionUrl: '/head-office/process-admissions',
                details: [
                    'মোট' => (string) $count,
                    'নমুনা আবেদন নং' => $sampleNos ?: 'N/A',
                    'শাখা' => $branchName,
                    'প্রেরক' => $user->name,
                ]
            );
        }

        return $this->redirectToListPreservingFilters('member-admissions.index', "{$count}টি আবেদন Head Office এ পাঠানো হয়েছে।");
    }

    /**
     * Reject admission permanently
     */
    public function reject(Request $request, MemberAdmission $memberAdmission)
    {
        $request->validate([
            'rejection_reason' => 'required|string|max:2000',
        ]);

        if ($memberAdmission->status !== 'needs_revision') {
            return back()->with('error', 'Only admissions that need revision can be rejected!');
        }

        $memberAdmission->update([
            'status' => 'rejected',
            'rejection_reason' => $request->rejection_reason,
            'reviewed_by' => auth()->id(),
            'reviewed_at' => now(),
        ]);

        return $this->redirectToListPreservingFilters('member-admissions.index', 'Member admission rejected successfully!');
    }

    /**
     * Update Member Code (application_no) before loan disbursement.
     */
    public function updateMemberCode(Request $request, MemberAdmission $memberAdmission)
    {
        if ($memberAdmission->hasDisbursedLoan()) {
            return back()->withErrors(['error' => 'ঋণ বিতরণ সম্পন্ন হওয়ার পর মেম্বার কোড পরিবর্তন করা যাবে না।']);
        }

        $memberAdmission->loadMissing('branch');
        $normalizedCode = \App\Services\MemberCodeService::normalizeMemberCode(
            $request->input('member_code'),
            $memberAdmission->branch_id,
            $memberAdmission->branch?->code
        );

        $exists = MemberAdmission::where('application_no', $normalizedCode)
            ->where('id', '!=', $memberAdmission->id)
            ->exists();

        if ($exists) {
            return back()->withErrors(['member_code' => "মেম্বার কোড {$normalizedCode} ইতিমধ্যে অন্য সদস্যের জন্য ব্যবহার করা হয়েছে।"]);
        }

        $oldCode = $memberAdmission->application_no;
        $memberName = $memberAdmission->applicant_name_bn ?: $memberAdmission->applicant_name_en;

        DB::transaction(function () use ($memberAdmission, $normalizedCode, $oldCode, $memberName) {
            $memberAdmission->update([
                'application_no' => $normalizedCode,
            ]);

            \App\Services\MemberCodeService::syncRelatedRecords(
                (int) $memberAdmission->id,
                $normalizedCode,
                $oldCode,
                $memberName
            );
        });

        return back()->with('success', 'মেম্বার কোড সফলভাবে আপডেট করা হয়েছে: ' . $normalizedCode);
    }
}
