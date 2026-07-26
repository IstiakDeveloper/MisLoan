<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Controller;
use App\Models\SavingsApplication;
use App\Models\SavingsProduct;
use App\Models\MemberAdmission;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

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
        if (strlen($value) < 500 && !str_starts_with($value, 'data:')) {
            return $value;
        }
        if (!str_starts_with($value, 'data:image')) {
            return $value;
        }
        // data:image/jpeg;base64,XXXX
        if (!preg_match('#^data:image/(\w+);base64,(.+)$#', $value, $m)) {
            return null;
        }
        $ext = $m[1] === 'jpeg' ? 'jpg' : $m[1];
        $data = base64_decode($m[2], true);
        if ($data === false) {
            return null;
        }
        $dir = 'savings-applications' . ($subDir ? '/' . $subDir : '');
        $filename = $prefix . '_' . uniqid() . '.' . $ext;
        $path = $dir . '/' . $filename;
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
        return asset('storage/' . ltrim($value, '/'));
    }

    /**
     * Process validated data: save any base64 photo/signature fields to storage and replace with path.
     */
    private function processImageFields(array $validated, ?int $applicationId = null): array
    {
        $subDir = $applicationId ? (string) $applicationId : '';
        $out = $validated;
        foreach (['applicant_photo', 'applicant_signature', 'officer_signature', 'accountant_signature', 'branch_manager_signature'] as $key) {
            if (!empty($out[$key])) {
                $stored = $this->storeImageOrPath($out[$key], $subDir, $key);
                $out[$key] = $stored ?? (str_starts_with($out[$key], 'data:') ? null : $out[$key]);
            }
        }
        if (!empty($out['nominee_info']) && is_array($out['nominee_info'])) {
            foreach ($out['nominee_info'] as $i => $nominee) {
                if (!empty($nominee['photo'])) {
                    $stored = $this->storeImageOrPath($nominee['photo'], $subDir, 'nominee_photo_' . $i);
                    $out['nominee_info'][$i]['photo'] = $stored ?? (str_starts_with($nominee['photo'], 'data:') ? null : $nominee['photo']);
                }
                if (!empty($nominee['signature'])) {
                    $stored = $this->storeImageOrPath($nominee['signature'], $subDir, 'nominee_sig_' . $i);
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
        $dateFrom = $request->input('date_from', now()->toDateString());
        $dateTo = $request->input('date_to', now()->toDateString());
        $search = trim($request->input('search', ''));

        // Exclude G. Savings (21.01) – not applied via this flow; other savings products only
        $products = SavingsProduct::where('is_active', true)
            ->where('product_code', '!=', '21.01')
            ->orderBy('display_order')
            ->orderBy('product_code')
            ->get();

        // Select only columns needed for list – exclude LONGTEXT (photos/signatures) to avoid sort buffer overflow
        $query = SavingsApplication::with([
            'savingsProduct:id,product_name,product_name_bn,product_code,min_amount,max_amount,duration_months',
            'memberAdmission:id,application_no,applicant_name_en,applicant_name_bn,nid_number,mobile_number',
        ])
            ->select([
                'id', 'application_no', 'member_admission_id', 'savings_product_id', 'branch_id', 'samity_id',
                'status', 'deposit_amount', 'monthly_installment', 'maturity_amount', 'maturity_date',
                'created_at', 'submitted_at',
            ])
            ->when(!$user->has_all_access, function ($q) use ($user) {
                $q->whereIn('branch_id', $user->getAccessibleBranches()->pluck('id'));
            })
            ->where(function ($q) use ($user) {
                $q->where('status', '!=', 'draft')
                  ->orWhere('submitted_by', $user->id);
            });

        if ($dateFrom) {
            $query->where('created_at', '>=', $dateFrom . ' 00:00:00');
        }
        if ($dateTo) {
            $query->where('created_at', '<=', $dateTo . ' 23:59:59');
        }
        if ($search !== '') {
            $pattern = '%' . strtolower($search) . '%';
            $query->where(function ($q) use ($pattern) {
                $q->whereRaw('LOWER(application_no) LIKE ?', [$pattern])
                    ->orWhereHas('memberAdmission', function ($mq) use ($pattern) {
                        $mq->whereRaw('LOWER(applicant_name_en) LIKE ?', [$pattern])
                            ->orWhereRaw('LOWER(applicant_name_bn) LIKE ?', [$pattern])
                            ->orWhereRaw('LOWER(nid_number) LIKE ?', [$pattern])
                            ->orWhereRaw('LOWER(mobile_number) LIKE ?', [$pattern])
                            ->orWhereRaw('LOWER(application_no) LIKE ?', [$pattern]);
                    })
                    ->orWhereHas('savingsProduct', function ($pq) use ($pattern) {
                        $pq->whereRaw('LOWER(product_name) LIKE ?', [$pattern])
                            ->orWhereRaw('LOWER(product_name_bn) LIKE ?', [$pattern]);
                    });
            });
        }

        $applications = $query->orderBy('created_at', 'desc')->paginate(20);

        return Inertia::render('Member/SavingsApplications/Index', [
            'products' => $products,
            'applications' => $applications,
        ]);
    }

    /**
     * Search approved members by branch (for member select).
     */
    public function searchMembers(Request $request)
    {
        $user = $request->user();
        if (!$user || !$user->branch_id) {
            return response()->json(['members' => []]);
        }

        $query = trim($request->input('query', ''));
        if (strlen($query) < 1) {
            return response()->json(['members' => []]);
        }

        $pattern = '%' . strtolower($query) . '%';
        $members = MemberAdmission::where('branch_id', $user->branch_id)
            ->where('status', 'approved')
            ->where(function ($q) use ($pattern) {
                $q->whereRaw('LOWER(applicant_name_en) LIKE ?', [$pattern])
                    ->orWhereRaw('LOWER(applicant_name_bn) LIKE ?', [$pattern])
                    ->orWhereRaw('LOWER(nid_number) LIKE ?', [$pattern])
                    ->orWhereRaw('LOWER(mobile_number) LIKE ?', [$pattern])
                    ->orWhereRaw('LOWER(application_no) LIKE ?', [$pattern]);
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
        $savingsProduct = SavingsProduct::findOrFail($productId);
        if ($savingsProduct->product_code === '21.01') {
            return redirect()->route('member.savings-applications.index')
                ->with('error', 'জি. সঞ্চয় (G. Savings) এর জন্য এই আবেদন ফ্লো ব্যবহার করা হয় না।');
        }
        $branch = \App\Models\Branch::with('area:id,name')->where('id', $user->branch_id)->first();

        $memberAdmission = null;
        if ($request->filled('member_id')) {
            $memberAdmission = MemberAdmission::where('branch_id', $user->branch_id)
                ->where('id', $request->member_id)
                ->where('status', 'approved')
                ->with('samity:id,samity_name,samity_name_bn,samity_code')
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
                if (!empty($existingApplication['nominee_info']) && is_array($existingApplication['nominee_info'])) {
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
        $product = SavingsProduct::findOrFail($validated['savings_product_id']);
        $member = MemberAdmission::findOrFail($validated['member_admission_id']);

        if ($validated['deposit_amount'] < $product->min_amount || ($product->max_amount && $validated['deposit_amount'] > $product->max_amount)) {
            return back()->withErrors([
                'deposit_amount' => 'জমার পরিমাণ ' . $product->min_amount . ' - ' . ($product->max_amount ?? 'সর্বোচ্চ') . ' এর মধ্যে হতে হবে।',
            ])->withInput();
        }

        $monthlyInstallment = $validated['monthly_installment'] ?? $validated['deposit_amount'];
        $maturityAmount = $product->calculateMaturityAmount($validated['deposit_amount'], $monthlyInstallment);
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
                'branch_id' => $user->branch_id,
                'samity_id' => $validated['samity_id'] ?? $member->samity_id,
                'deposit_amount' => $validated['deposit_amount'],
                'monthly_installment' => $monthlyInstallment,
                'duration_months' => $durationMonths,
                'maturity_amount' => $maturityAmount,
                'maturity_date' => $maturityDate,
                'monthly_savings_amount' => $validated['monthly_savings_amount'] ?? $monthlyInstallment,
                'status' => 'draft',
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
                ->with('success', 'আবেদন সংরক্ষণ হয়েছে। আবেদন নং: ' . $app->application_no);
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
        if (!$application->canBeEdited()) {
            return back()->withErrors(['error' => 'এই আবেদন সম্পাদনা করা যাবে না।']);
        }

        $validated = $request->validate([
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

        if (!empty($validated['duration_months'])) {
            $validated['maturity_date'] = now()->addMonths((int) $validated['duration_months']);
            $product = $application->savingsProduct;
            if ($product) {
                $validated['maturity_amount'] = $product->calculateMaturityAmount(
                    (float) $application->deposit_amount,
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
            'savingsProduct',
            'memberAdmission',
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
        if (!empty($app['nominee_info']) && is_array($app['nominee_info'])) {
            foreach ($app['nominee_info'] as $i => $n) {
                $app['nominee_info'][$i]['photo'] = $this->imagePathToUrl($n['photo'] ?? null);
                $app['nominee_info'][$i]['signature'] = $this->imagePathToUrl($n['signature'] ?? null);
            }
        }

        return Inertia::render('Member/SavingsApplications/Show', [
            'application' => $app,
        ]);
    }

    public function submit($id)
    {
        $application = SavingsApplication::findOrFail($id);
        if (!$application->canBeEdited()) {
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

    public function destroy($id)
    {
        $application = SavingsApplication::findOrFail($id);
        if (!in_array($application->status, ['draft', 'submitted'])) {
            return back()->withErrors(['error' => 'শুধুমাত্র খসড়া/জমা আবেদন মুছতে পারবেন।']);
        }
        $application->delete();
        return redirect()->route('member.savings-applications.index')->with('success', 'আবেদন মুছে ফেলা হয়েছে।');
    }
}
