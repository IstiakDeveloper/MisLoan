<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Controller;
use App\Models\Area;
use App\Models\Branch;
use App\Models\MemberAdmission;
use App\Models\SavingsApplication;
use App\Models\SavingsCategory;
use App\Models\SavingsProduct;
use App\Models\Zone;
use App\Services\ImageCompressionService;
use App\Services\MemberCodeService;
use App\Support\SavingsFormVisibility;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class SavingsApplicationController extends Controller
{
    /**
     * If value is a base64 data URL, save to storage and return the stored path (fits in VARCHAR).
     * Otherwise return the value as-is (existing path or empty).
     */
    private function storeImageOrPath(?string $value, string $subDir = '', string $prefix = 'img'): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        // Already a short path (e.g. from previous save)
        if (strlen($value) < 500 && ! str_starts_with($value, 'data:')) {
            return $value;
        }
        if (! str_starts_with($value, 'data:image')) {
            return $value;
        }
        // data:image/jpeg;base64,XXXX
        if (! preg_match('#^data:image/(\w+);base64,(.+)$#', $value, $m)) {
            return null;
        }
        $ext = $m[1] === 'jpeg' ? 'jpg' : $m[1];
        $data = base64_decode($m[2], true);
        if ($data === false) {
            return null;
        }
        $dir = 'savings-applications'.($subDir ? '/'.$subDir : '');
        $originalName = $prefix.'.'.$ext;

        $compressed = app(ImageCompressionService::class)->compressBinary($data, $dir, $originalName);
        if ($compressed !== false) {
            return $compressed;
        }

        $filename = $prefix.'_'.uniqid().'.'.$ext;
        $path = $dir.'/'.$filename;
        Storage::disk('public')->put($path, $data);

        return $path;
    }

    /**
     * Convert stored image path to full URL for frontend img src. If value is base64 or already URL, return as-is.
     */
    private function imagePathToUrl(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (str_starts_with($value, 'data:') || str_starts_with($value, 'http')) {
            return $value;
        }

        return asset('storage/'.ltrim($value, '/'));
    }

    /**
     * Process validated data: save any base64 photo/signature fields to storage and replace with path.
     */
    private function processImageFields(array $validated, ?int $applicationId = null): array
    {
        $subDir = $applicationId ? (string) $applicationId : '';
        $out = $validated;
        foreach (['applicant_photo', 'applicant_signature', 'officer_signature', 'accountant_signature', 'branch_manager_signature'] as $key) {
            if (! empty($out[$key])) {
                $stored = $this->storeImageOrPath($out[$key], $subDir, $key);
                $out[$key] = $stored ?? (str_starts_with($out[$key], 'data:') ? null : $out[$key]);
            }
        }
        if (! empty($out['nominee_info']) && is_array($out['nominee_info'])) {
            foreach ($out['nominee_info'] as $i => $nominee) {
                if (! empty($nominee['photo'])) {
                    $stored = $this->storeImageOrPath($nominee['photo'], $subDir, 'nominee_photo_'.$i);
                    $out['nominee_info'][$i]['photo'] = $stored ?? (str_starts_with($nominee['photo'], 'data:') ? null : $nominee['photo']);
                }
                if (! empty($nominee['signature'])) {
                    $stored = $this->storeImageOrPath($nominee['signature'], $subDir, 'nominee_sig_'.$i);
                    $out['nominee_info'][$i]['signature'] = $stored ?? (str_starts_with($nominee['signature'], 'data:') ? null : $nominee['signature']);
                }
            }
        }

        return $out;
    }

    /**
     * List savings applications for the branch user.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $dateFrom = $request->filled('date_from') ? $request->input('date_from') : null;
        $dateTo = $request->filled('date_to') ? $request->input('date_to') : null;
        $search = trim($request->input('search', ''));
        $statusFilter = $request->input('status', 'all');
        $perPage = (int) $request->input('per_page', 20);
        $zoneId = $request->input('zone_id');
        $areaId = $request->input('area_id');
        $branchId = $request->input('branch_id');

        $categories = SavingsCategory::query()
            ->where('is_active', true)
            ->with(['savingsProducts' => function ($query) {
                $query->where('is_active', true)
                    ->orderBy('display_order')
                    ->orderBy('product_code');
            }])
            ->orderBy('display_order')
            ->orderBy('category_code')
            ->get(['id', 'category_name', 'category_name_bn', 'category_code', 'display_order']);

        $query = SavingsApplication::with([
            'savingsProduct:id,product_name,product_name_bn,product_code,min_amount,max_amount,duration_months,interest_rate',
            'memberAdmission:id,application_no,applicant_name_en,applicant_name_bn,nid_number,mobile_number',
            'branch:id,name,code',
            'samity:id,samity_name,samity_name_bn,samity_code',
        ])
            ->select([
                'id', 'application_no', 'account_no', 'member_no', 'member_admission_id', 'savings_product_id', 'branch_id', 'samity_id',
                'status', 'deposit_amount', 'monthly_installment', 'monthly_savings_amount', 'duration_months', 'term_years',
                'maturity_amount', 'maturity_date', 'start_date', 'account_opening_date', 'form_data', 'remarks', 'created_at', 'submitted_at', 'activated_at',
            ])
            ->when(! $user->has_all_access, function ($q) use ($user) {
                $q->whereIn('branch_id', $user->getAccessibleBranches()->pluck('id'));
            })
            ->where(function ($q) use ($user) {
                $q->where('status', '!=', 'draft')
                    ->orWhere('submitted_by', $user->id);
            });

        if ($branchId) {
            $query->where('branch_id', $branchId);
        } elseif ($areaId) {
            $query->whereHas('branch', fn ($q) => $q->where('area_id', $areaId));
        } elseif ($zoneId) {
            $query->whereHas('branch.area', fn ($q) => $q->where('zone_id', $zoneId));
        }

        if ($dateFrom) {
            $query->where('created_at', '>=', $dateFrom.' 00:00:00');
        }
        if ($dateTo) {
            $query->where('created_at', '<=', $dateTo.' 23:59:59');
        }
        if ($statusFilter && $statusFilter !== 'all') {
            if ($statusFilter === 'pending') {
                $query->whereIn('status', ['draft', 'submitted', 'under_review']);
            } else {
                $query->where('status', $statusFilter);
            }
        }
        if ($search !== '') {
            MemberCodeService::applySavingsSearch($query, $search);
        }

        $applications = $query->orderBy('created_at', 'desc')->paginate($perPage)->withQueryString();

        $applications->through(function ($app) {
            $item = $app->toArray();
            $item['savingsProduct'] = $app->savingsProduct;
            $item['savings_product'] = $app->savingsProduct;
            $item['memberAdmission'] = $app->memberAdmission;
            $item['member_admission'] = $app->memberAdmission;
            $item['branch'] = $app->branch;
            $item['samity'] = $app->samity;

            return $item;
        });

        // Base query for stats (without status filter and search, matching date & location filters)
        $statsBaseQuery = SavingsApplication::query()
            ->when(! $user->has_all_access, function ($q) use ($user) {
                $q->whereIn('branch_id', $user->getAccessibleBranches()->pluck('id'));
            })
            ->where(function ($q) use ($user) {
                $q->where('status', '!=', 'draft')
                    ->orWhere('submitted_by', $user->id);
            });

        if ($branchId) {
            $statsBaseQuery->where('branch_id', $branchId);
        } elseif ($areaId) {
            $statsBaseQuery->whereHas('branch', fn ($q) => $q->where('area_id', $areaId));
        } elseif ($zoneId) {
            $statsBaseQuery->whereHas('branch.area', fn ($q) => $q->where('zone_id', $zoneId));
        }

        if ($dateFrom) {
            $statsBaseQuery->where('created_at', '>=', $dateFrom.' 00:00:00');
        }
        if ($dateTo) {
            $statsBaseQuery->where('created_at', '<=', $dateTo.' 23:59:59');
        }

        $totalDeposit = (float) (clone $statsBaseQuery)->where('status', '!=', 'cancelled')->sum('deposit_amount');

        // Calculate total withdrawn from closed applications
        $closedApps = (clone $statsBaseQuery)->where('status', 'closed')->get(['id', 'form_data', 'deposit_amount', 'maturity_amount']);
        $totalWithdrawn = 0.0;
        foreach ($closedApps as $cApp) {
            $wData = $cApp->form_data['withdrawal'] ?? null;
            if ($wData && isset($wData['total_payout'])) {
                $totalWithdrawn += (float) $wData['total_payout'];
            } else {
                $totalWithdrawn += (float) ($cApp->maturity_amount ?: $cApp->deposit_amount);
            }
        }
        $netBalance = max(0, $totalDeposit - $totalWithdrawn);

        $stats = [
            'total' => (clone $statsBaseQuery)->count(),
            'total_accounts' => (clone $statsBaseQuery)->count(),
            'total_deposit' => $totalDeposit,
            'total_withdrawn' => $totalWithdrawn,
            'net_balance' => $netBalance,
            'active' => (clone $statsBaseQuery)->where('status', 'active')->count(),
            'matured' => (clone $statsBaseQuery)->where('status', 'matured')->count(),
            'closed' => (clone $statsBaseQuery)->where('status', 'closed')->count(),
            'pending' => (clone $statsBaseQuery)->whereIn('status', ['draft', 'submitted', 'under_review'])->count(),
            'draft' => (clone $statsBaseQuery)->where('status', 'draft')->count(),
            'submitted' => (clone $statsBaseQuery)->where('status', 'submitted')->count(),
            'under_review' => (clone $statsBaseQuery)->where('status', 'under_review')->count(),
            'approved' => (clone $statsBaseQuery)->where('status', 'approved')->count(),
            'rejected' => (clone $statsBaseQuery)->where('status', 'rejected')->count(),
        ];

        // Branches, areas, zones for location filter dropdowns
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
        $areas = Area::query()
            ->whereIn('id', $areaIds)
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'zone_id']);

        $zoneIds = $areas->pluck('zone_id')->filter()->unique();
        $zones = Zone::query()
            ->whereIn('id', $zoneIds)
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        return Inertia::render('Member/SavingsApplications/Index', [
            'categories' => $categories,
            'applications' => $applications,
            'stats' => $stats,
            'zones' => $zones,
            'areas' => $areas,
            'branches' => $branches,
            'filters' => [
                'zone_id' => $zoneId,
                'area_id' => $areaId,
                'branch_id' => $branchId,
            ],
            'selectedDate' => $dateFrom,
            'dateFrom' => $dateFrom,
            'dateTo' => $dateTo,
            'statusFilter' => $statusFilter,
            'searchFilter' => $search,
            'perPage' => $perPage,
            'savingsFormRules' => SavingsFormVisibility::frontendRules(),
        ]);
    }

    /**
     * Search approved members by branch (for member select).
     */
    public function searchMembers(Request $request)
    {
        $user = $request->user();
        if (! $user || ! $user->branch_id) {
            return response()->json(['members' => []]);
        }

        $query = trim($request->input('query', ''));
        if (strlen($query) < 1) {
            return response()->json(['members' => []]);
        }

        $members = MemberAdmission::where('branch_id', $user->branch_id)
            ->masterMembers()
            ->where('status', 'approved')
            ->where(function ($q) use ($query) {
                MemberCodeService::applyAdmissionSearch($q, $query);
            })
            ->select([
                'id', 'application_no', 'applicant_name_en', 'applicant_name_bn',
                'nid_number', 'mobile_number', 'father_name_bn', 'mother_name_bn', 'spouse_name_bn',
                'present_village_road', 'present_upazila', 'present_district', 'present_post_code',
                'permanent_village_road', 'permanent_upazila', 'permanent_district', 'permanent_post_code',
                'samity_id', 'status',
            ])
            ->with('samity:id,samity_name,samity_name_bn,samity_code')
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get();

        return response()->json(['members' => $members]);
    }

    /**
     * Show create page: product + optional member. If member_id in query, load member and show form.
     */
    public function create(Request $request, $productId)
    {
        $user = $request->user();
        $savingsProduct = SavingsProduct::query()
            ->with('savingsCategory:id,category_name,category_name_bn,category_code')
            ->findOrFail($productId);

        if (! SavingsFormVisibility::requiresApplicationForm($savingsProduct->savingsCategory, $savingsProduct)) {
            $message = SavingsFormVisibility::isAdmissionOnly($savingsProduct->savingsCategory, $savingsProduct)
                ? SavingsFormVisibility::ADMISSION_ONLY_MESSAGE
                : SavingsFormVisibility::FORM_NOT_READY_MESSAGE;

            return redirect()->route('member.savings-applications.index')
                ->with('error', $message);
        }
        $branch = Branch::with('area:id,name')->where('id', $user->branch_id)->first();

        $memberAdmission = null;
        if ($request->filled('member_id')) {
            $memberAdmission = MemberAdmission::where('branch_id', $user->branch_id)
                ->where('id', $request->member_id)
                ->where('status', 'approved')
                ->with([
                    'samity:id,samity_name,samity_name_bn,samity_code',
                    'familyMembers:id,member_admission_id,sl_no,member_name,relation_with_head,age_years,age_months,marital_status,education_level,occupation,monthly_income',
                ])
                ->first();
        }

        $existingApplication = null;
        if ($memberAdmission) {
            $existingApplication = SavingsApplication::where('member_admission_id', $memberAdmission->id)
                ->where('savings_product_id', $productId)
                ->whereIn('status', ['draft', 'rejected'])
                ->first();
            if ($existingApplication) {
                $existingApplication = $existingApplication->toArray();
                $existingApplication['applicant_photo'] = $this->imagePathToUrl($existingApplication['applicant_photo'] ?? null);
                $existingApplication['applicant_signature'] = $this->imagePathToUrl($existingApplication['applicant_signature'] ?? null);
                $existingApplication['officer_signature'] = $this->imagePathToUrl($existingApplication['officer_signature'] ?? null);
                $existingApplication['accountant_signature'] = $this->imagePathToUrl($existingApplication['accountant_signature'] ?? null);
                $existingApplication['branch_manager_signature'] = $this->imagePathToUrl($existingApplication['branch_manager_signature'] ?? null);
                if (! empty($existingApplication['nominee_info']) && is_array($existingApplication['nominee_info'])) {
                    foreach ($existingApplication['nominee_info'] as $i => $n) {
                        $existingApplication['nominee_info'][$i]['photo'] = $this->imagePathToUrl($n['photo'] ?? null);
                        $existingApplication['nominee_info'][$i]['signature'] = $this->imagePathToUrl($n['signature'] ?? null);
                    }
                }
            }
        }

        return Inertia::render('Member/SavingsApplications/Create', [
            'savingsProduct' => $savingsProduct,
            'memberAdmission' => $memberAdmission,
            'branch' => $branch,
            'existingApplication' => $existingApplication,
            'formType' => SavingsFormVisibility::formType($savingsProduct->savingsCategory, $savingsProduct),
        ]);
    }

    /**
     * Store new savings application. Expects flat request: savings_product_id, member_admission_id, deposit_amount + form fields.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'savings_product_id' => 'required|exists:savings_products,id',
            'member_admission_id' => 'required|exists:member_admissions,id',
            'samity_id' => 'nullable|exists:samities,id',
            'deposit_amount' => 'required|numeric|min:0.01',
            'monthly_installment' => 'nullable|numeric|min:0',
            'maturity_amount' => 'nullable|numeric|min:0',
            'account_opening_date' => 'nullable|date',
            'monthly_savings_amount' => 'nullable|numeric|min:0',
            'term_years' => 'nullable|integer|min:1|max:50',
            'duration_months' => 'nullable|integer|min:1|max:600',
            'account_no' => 'nullable|string|max:50',
            'member_no' => 'nullable|string|max:50',
            'applicant_photo' => 'nullable|string',
            'current_address' => 'nullable|string|max:1000',
            'permanent_address' => 'nullable|string|max:1000',
            'profession' => 'nullable|string|max:255',
            'source_of_income' => 'nullable|string|max:255',
            'monthly_deposit_submission_date' => 'nullable|date',
            'applicant_signature' => 'nullable|string',
            'officer_signature' => 'nullable|string',
            'officer_pin' => 'nullable|string|max:50',
            'accountant_signature' => 'nullable|string',
            'accountant_pin' => 'nullable|string|max:50',
            'branch_manager_signature' => 'nullable|string',
            'branch_manager_pin' => 'nullable|string|max:50',
            'form_data' => 'nullable|array',
            'nominee_info' => 'nullable|array',
            'nominee_info.*.name' => 'nullable|string|max:255',
            'nominee_info.*.relation' => 'nullable|string|max:100',
            'nominee_info.*.nid' => 'nullable|string|max:50',
            'nominee_info.*.birth_registration_no' => 'nullable|string|max:50',
            'nominee_info.*.percentage' => 'nullable|numeric|min:0|max:100',
            'nominee_info.*.photo' => 'nullable|string',
            'nominee_info.*.signature' => 'nullable|string',
        ]);

        $user = $request->user();
        $product = SavingsProduct::query()
            ->with('savingsCategory')
            ->findOrFail($validated['savings_product_id']);

        if (! SavingsFormVisibility::requiresApplicationForm($product->savingsCategory, $product)) {
            $message = SavingsFormVisibility::isAdmissionOnly($product->savingsCategory, $product)
                ? SavingsFormVisibility::ADMISSION_ONLY_MESSAGE
                : SavingsFormVisibility::FORM_NOT_READY_MESSAGE;

            return back()->withErrors(['savings_product_id' => $message])->withInput();
        }

        $member = MemberAdmission::findOrFail($validated['member_admission_id']);

        if ($validated['deposit_amount'] < $product->min_amount || ($product->max_amount && $validated['deposit_amount'] > $product->max_amount)) {
            return back()->withErrors([
                'deposit_amount' => 'জমার পরিমাণ '.$product->min_amount.' - '.($product->max_amount ?? 'সর্বোচ্চ').' এর মধ্যে হতে হবে।',
            ])->withInput();
        }

        $monthlyInstallment = $validated['monthly_installment'] ?? $validated['deposit_amount'];
        $maturityAmount = ($validated['maturity_amount'] ?? 0) > 0
            ? (float) $validated['maturity_amount']
            : $product->calculateMaturityAmount($validated['deposit_amount'], $monthlyInstallment);
        // Duration from request (product-based) or product default
        $durationMonths = (int) ($validated['duration_months'] ?? ($validated['term_years'] ? (int) $validated['term_years'] * 12 : $product->duration_months));
        if ($durationMonths < 1) {
            $durationMonths = $product->duration_months;
        }
        $maturityDate = now()->addMonths($durationMonths);

        $validated = $this->processImageFields($validated, null);

        DB::beginTransaction();
        try {
            $app = SavingsApplication::create([
                'application_no' => SavingsApplication::generateApplicationNo(),
                'member_admission_id' => $validated['member_admission_id'],
                'savings_product_id' => $validated['savings_product_id'],
                'savings_category_id' => $product->savings_category_id,
                'branch_id' => $user->branch_id,
                'samity_id' => $validated['samity_id'] ?? $member->samity_id,
                'deposit_amount' => $validated['deposit_amount'],
                'monthly_installment' => $monthlyInstallment,
                'duration_months' => $durationMonths,
                'maturity_amount' => $maturityAmount,
                'maturity_date' => $maturityDate,
                'monthly_savings_amount' => $validated['monthly_savings_amount'] ?? $monthlyInstallment,
                'status' => 'active',
                'start_date' => $validated['account_opening_date'] ?? now()->toDateString(),
                'activated_by' => $user->id,
                'activated_at' => now(),
                'submitted_by' => $user->id,
                'form_data' => $validated['form_data'] ?? null,
                'account_opening_date' => $validated['account_opening_date'] ?? null,
                'term_years' => $validated['term_years'] ?? null,
                'account_no' => $validated['account_no'] ?? null,
                'member_no' => $validated['member_no'] ?? $member->application_no,
                'applicant_photo' => $validated['applicant_photo'] ?? null,
                'current_address' => $validated['current_address'] ?? null,
                'permanent_address' => $validated['permanent_address'] ?? null,
                'profession' => $validated['profession'] ?? null,
                'source_of_income' => $validated['source_of_income'] ?? null,
                'monthly_deposit_submission_date' => $validated['monthly_deposit_submission_date'] ?? null,
                'applicant_signature' => $validated['applicant_signature'] ?? null,
                'officer_signature' => $validated['officer_signature'] ?? null,
                'officer_pin' => $validated['officer_pin'] ?? null,
                'accountant_signature' => $validated['accountant_signature'] ?? null,
                'accountant_pin' => $validated['accountant_pin'] ?? null,
                'branch_manager_signature' => $validated['branch_manager_signature'] ?? null,
                'branch_manager_pin' => $validated['branch_manager_pin'] ?? null,
                'nominee_info' => $validated['nominee_info'] ?? null,
            ]);
            DB::commit();

            return redirect()->route('member.savings-applications.show', $app->id)
                ->with('success', 'আবেদন সংরক্ষণ হয়েছে। আবেদন নং: '.$app->application_no);
        } catch (\Exception $e) {
            DB::rollBack();

            return back()->withErrors(['error' => $e->getMessage()])->withInput();
        }
    }

    /**
     * Save draft (update existing application).
     */
    public function saveForm(Request $request, $id)
    {
        $application = SavingsApplication::findOrFail($id);
        if (! $application->canBeEdited()) {
            return back()->withErrors(['error' => 'এই আবেদন সম্পাদনা করা যাবে না।']);
        }

        $validated = $request->validate([
            'account_opening_date' => 'nullable|date',
            'deposit_amount' => 'nullable|numeric|min:0.01',
            'monthly_installment' => 'nullable|numeric|min:0',
            'maturity_amount' => 'nullable|numeric|min:0',
            'monthly_savings_amount' => 'nullable|numeric|min:0',
            'term_years' => 'nullable|integer|min:1|max:50',
            'duration_months' => 'nullable|integer|min:1|max:600',
            'account_no' => 'nullable|string|max:50',
            'member_no' => 'nullable|string|max:50',
            'applicant_photo' => 'nullable|string',
            'current_address' => 'nullable|string|max:1000',
            'permanent_address' => 'nullable|string|max:1000',
            'profession' => 'nullable|string|max:255',
            'source_of_income' => 'nullable|string|max:255',
            'monthly_deposit_submission_date' => 'nullable|date',
            'applicant_signature' => 'nullable|string',
            'officer_signature' => 'nullable|string',
            'officer_pin' => 'nullable|string|max:50',
            'accountant_signature' => 'nullable|string',
            'accountant_pin' => 'nullable|string|max:50',
            'branch_manager_signature' => 'nullable|string',
            'branch_manager_pin' => 'nullable|string|max:50',
            'form_data' => 'nullable|array',
            'nominee_info' => 'nullable|array',
            'nominee_info.*.name' => 'nullable|string|max:255',
            'nominee_info.*.relation' => 'nullable|string|max:100',
            'nominee_info.*.nid' => 'nullable|string|max:50',
            'nominee_info.*.birth_registration_no' => 'nullable|string|max:50',
            'nominee_info.*.percentage' => 'nullable|numeric|min:0|max:100',
            'nominee_info.*.photo' => 'nullable|string',
            'nominee_info.*.signature' => 'nullable|string',
        ]);

        if (! empty($validated['duration_months'])) {
            $validated['maturity_date'] = now()->addMonths((int) $validated['duration_months']);
            $product = $application->savingsProduct;
            if ($product && ($validated['maturity_amount'] ?? 0) <= 0) {
                $validated['maturity_amount'] = $product->calculateMaturityAmount(
                    (float) ($validated['deposit_amount'] ?? $application->deposit_amount),
                    (float) ($validated['monthly_savings_amount'] ?? $application->monthly_installment)
                );
            }
        }
        $validated = $this->processImageFields($validated, $application->id);
        $application->update($validated);

        return back()->with('success', 'ড্রাফট সংরক্ষণ হয়েছে।');
    }

    public function show($id)
    {
        $application = SavingsApplication::with([
            'savingsProduct.savingsCategory',
            'memberAdmission.samity',
            'branch.area',
            'samity',
        ])->findOrFail($id);

        $app = $application->toArray();
        $app['savings_product'] = $application->savingsProduct;
        $app['member_admission'] = $application->memberAdmission;
        $app['applicant_photo'] = $this->imagePathToUrl($app['applicant_photo'] ?? null);
        $app['applicant_signature'] = $this->imagePathToUrl($app['applicant_signature'] ?? null);
        $app['officer_signature'] = $this->imagePathToUrl($app['officer_signature'] ?? null);
        $app['accountant_signature'] = $this->imagePathToUrl($app['accountant_signature'] ?? null);
        $app['branch_manager_signature'] = $this->imagePathToUrl($app['branch_manager_signature'] ?? null);
        if (! empty($app['nominee_info']) && is_array($app['nominee_info'])) {
            foreach ($app['nominee_info'] as $i => $n) {
                $app['nominee_info'][$i]['photo'] = $this->imagePathToUrl($n['photo'] ?? null);
                $app['nominee_info'][$i]['signature'] = $this->imagePathToUrl($n['signature'] ?? null);
            }
        }

        return Inertia::render('Member/SavingsApplications/Show', [
            'application' => $app,
            'formType' => SavingsFormVisibility::formType(
                $application->savingsProduct?->savingsCategory,
                $application->savingsProduct
            ),
        ]);
    }

    public function submit($id)
    {
        $application = SavingsApplication::findOrFail($id);
        if (! $application->canBeEdited()) {
            return back()->withErrors(['error' => 'এই আবেদন জমা দেওয়া যাবে না।']);
        }
        $application->update(['status' => 'submitted', 'submitted_at' => now()]);

        return redirect()->route('member.savings-applications.show', $application->id)
            ->with('success', 'আবেদন জমা দেওয়া হয়েছে।');
    }

    /**
     * Approve savings application (branch-level only; no head office).
     * Only users of the same branch can approve.
     */
    public function approve($id)
    {
        $user = request()->user();
        $application = SavingsApplication::findOrFail($id);
        if ($application->branch_id !== $user->branch_id) {
            return back()->withErrors(['error' => 'শুধুমাত্র আপনার শাখার আবেদন অনুমোদন করতে পারবেন।']);
        }
        if ($application->status !== 'submitted') {
            return back()->withErrors(['error' => 'শুধুমাত্র জমা দেওয়া আবেদন অনুমোদন করা যাবে।']);
        }
        $application->update([
            'status' => 'approved',
            'reviewed_by' => $user->id,
            'reviewed_at' => now(),
            'rejection_reason' => null,
        ]);

        return redirect()->route('member.savings-applications.show', $application->id)
            ->with('success', 'সঞ্চয় আবেদন অনুমোদন হয়েছে।');
    }

    /**
     * Reject savings application (branch-level only).
     */
    public function reject(Request $request, $id)
    {
        $user = $request->user();
        $application = SavingsApplication::findOrFail($id);
        if ($application->branch_id !== $user->branch_id) {
            return back()->withErrors(['error' => 'শুধুমাত্র আপনার শাখার আবেদন প্রত্যাখ্যান করতে পারবেন।']);
        }
        if ($application->status !== 'submitted') {
            return back()->withErrors(['error' => 'শুধুমাত্র জমা দেওয়া আবেদন প্রত্যাখ্যান করা যাবে।']);
        }
        $application->update([
            'status' => 'rejected',
            'reviewed_by' => $user->id,
            'reviewed_at' => now(),
            'rejection_reason' => $request->input('rejection_reason'),
        ]);

        return redirect()->route('member.savings-applications.show', $application->id)
            ->with('success', 'আবেদন প্রত্যাখ্যান হয়েছে।');
    }

    public function activate($id)
    {
        $user = request()->user();
        $application = SavingsApplication::findOrFail($id);
        $application->update([
            'status' => 'active',
            'activated_by' => $user->id,
            'activated_at' => now(),
            'start_date' => $application->start_date ?? now()->toDateString(),
            'maturity_date' => $application->maturity_date ?? now()->addMonths($application->duration_months ?: 12)->toDateString(),
        ]);

        return back()->with('success', 'সঞ্চয় হিসাব সফলভাবে সক্রিয় করা হয়েছে।');
    }

    public function withdraw(Request $request, $id)
    {
        $user = $request->user();
        $application = SavingsApplication::findOrFail($id);

        $validated = $request->validate([
            'withdrawal_date' => 'required|date',
            'months_completed' => 'nullable|integer|min:0',
            'total_deposit_paid' => 'required|numeric|min:0',
            'profit_amount' => 'nullable|numeric|min:0',
            'penalty_or_deduction' => 'nullable|numeric|min:0',
            'total_payout' => 'required|numeric|min:0',
            'remarks' => 'nullable|string|max:1000',
        ]);

        $monthsCompleted = (int) ($validated['months_completed'] ?? 0);
        $depositPaid = (float) $validated['total_deposit_paid'];
        $penaltyOrDeduction = (float) ($validated['penalty_or_deduction'] ?? 0);
        $profitAmount = (float) ($validated['profit_amount'] ?? 0);

        // Minimum 1 month tenure is strictly required for profit. If under 1 month, profit must be 0.
        if ($monthsCompleted < 1) {
            $profitAmount = 0.0;
            $validated['profit_amount'] = 0.0;
            $validated['total_payout'] = max(0.0, $depositPaid - $penaltyOrDeduction);
        }

        $formData = $application->form_data ?? [];
        $formData['withdrawal'] = [
            'withdrawal_date' => $validated['withdrawal_date'],
            'months_completed' => $monthsCompleted,
            'total_deposit_paid' => $depositPaid,
            'profit_amount' => $profitAmount,
            'penalty_or_deduction' => $penaltyOrDeduction,
            'total_payout' => (float) $validated['total_payout'],
            'withdrawn_by' => $user->id,
            'withdrawn_at' => now()->toDateTimeString(),
        ];

        $application->update([
            'status' => 'closed',
            'remarks' => $validated['remarks'] ?? $application->remarks,
            'form_data' => $formData,
        ]);

        return back()->with('success', 'সঞ্চয় হিসাব উত্তোলন ও নিষ্পত্তি সম্পন্ন হয়েছে। প্রদেয় অর্থ: ৳'.number_format($validated['total_payout'], 2));
    }

    public function destroy($id)
    {
        $application = SavingsApplication::findOrFail($id);
        if (! in_array($application->status, ['draft', 'submitted', 'closed', 'cancelled'])) {
            return back()->withErrors(['error' => 'সক্রিয় সঞ্চয় হিসাব সরাসরি মোছা যাবে না, আগে ক্লোজ করুন।']);
        }
        $application->delete();

        return redirect()->route('member.savings-applications.index')->with('success', 'আবেদন মুছে ফেলা হয়েছে।');
    }
}
