<?php

namespace App\Http\Controllers;

use App\Models\MemberAdmission;
use App\Models\Branch;
use App\Models\Role;
use App\Models\Samity;
use App\Models\MemberCategory;
use App\Services\ApprovalService;
use App\Services\ImageCompressionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class MemberAdmissionController extends Controller
{
    public function index(Request $request)
    {
        $query = MemberAdmission::with([
            'branch.area.zone',
            'samity',
            'memberCategory',
            'submittedBy',
            'createdBy',
            'approvals.user',
        ]);

        // Filter by branch (for branch users)
        if (!auth()->user()->has_all_access && auth()->user()->branch_id) {
            $query->where('branch_id', auth()->user()->branch_id);
        }

        // Build stats query
        $statsQuery = MemberAdmission::query();
        if (!auth()->user()->has_all_access && auth()->user()->branch_id) {
            $statsQuery->where('branch_id', auth()->user()->branch_id);
        }

        // Calculate stats
        $stats = [
            'total' => $statsQuery->count(),
            'draft' => (clone $statsQuery)->where('status', 'draft')->count(),
            'submitted' => (clone $statsQuery)->where('status', 'submitted')->count(),
            'under_review' => (clone $statsQuery)->where('status', 'under_review')->count(),
            'needs_revision' => (clone $statsQuery)->where('status', 'needs_revision')->count(),
            'approved' => (clone $statsQuery)->where('status', 'approved')->count(),
            'rejected' => (clone $statsQuery)->where('status', 'rejected')->count(),
        ];

        // Filters (সর্বমোট ক্লিক করলে status খালি পাঠালে কোনো স্ট্যাটাস ফিল্টার নাই)
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

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

        if ($request->filled('from_date')) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }
        if ($request->filled('to_date')) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        $admissions = $query->orderBy('created_at', 'desc')->paginate(15);

        $admissions = $admissions->through(function (MemberAdmission $admission) {
            $arr = $admission->toArray();
            $arr['tracking_state'] = $admission->getTrackingState();
            return $arr;
        });

        return Inertia::render('MemberAdmission/Index', [
            'admissions' => $admissions,
            'filters' => $request->only(['status', 'branch_id', 'search', 'from_date', 'to_date']),
            'stats' => $stats,
        ]);
    }

    public function create()
    {
        $branches = Branch::with(['area.zone'])->active()->orderBy('name')->get();
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
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'samity_id' => 'required|exists:samities,id',
            'member_category_id' => 'required|exists:member_categories,id',
            'survey_date' => 'required|date',
            'admission_date' => 'required|date',

            // Personal Information - English
            'applicant_name_en' => 'required|string|max:255',
            'father_name_en' => 'required|string|max:255',
            'mother_name_en' => 'required|string|max:255',
            'spouse_name_en' => 'nullable|string|max:255',

            // Personal Information - Bangla
            'applicant_name_bn' => 'required|string|max:255',
            'father_name_bn' => 'required|string|max:255',
            'mother_name_bn' => 'required|string|max:255',
            'spouse_name_bn' => 'nullable|string|max:255',

            // Contact & Status
            'marital_status' => 'required|in:single,married,divorced,widowed',
            'mobile_number' => 'required|string|max:20',
            'alternative_mobile' => 'nullable|string|max:20',

            // Present Address
            'present_division' => 'required|string',
            'present_district' => 'required|string',
            'present_upazila' => 'required|string',
            'present_union' => 'nullable|string',
            'present_village_road' => 'nullable|string',
            'present_post_code' => 'nullable|string|max:10',

            // Permanent Address
            'permanent_address_same' => 'boolean',
            'permanent_division' => 'nullable|required_if:permanent_address_same,false|string',
            'permanent_district' => 'nullable|required_if:permanent_address_same,false|string',
            'permanent_upazila' => 'nullable|required_if:permanent_address_same,false|string',
            'permanent_union' => 'nullable|string',
            'permanent_village_road' => 'nullable|string',
            'permanent_post_code' => 'nullable|string|max:10',

            // Identity
            'nid_number' => 'required|string|max:20',
            'smart_card_number' => 'nullable|string|max:20',
            'birth_certificate_number' => 'nullable|string|max:30',
            'date_of_birth' => 'nullable|date',
            'gender' => 'required|in:male,female,other',
            'family_member_mobile' => 'nullable|string|max:20',

            // Guarantor
            'guarantor_name' => 'nullable|string|max:255',
            'guarantor_mobile' => 'nullable|string|max:20',
            'tin_number' => 'nullable|string|max:20',
            'want_sms_service' => 'boolean',

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
            'collector_comment' => 'nullable|string',
            'guardian_name' => 'nullable|string|max:255',

            // Customer Documents (Optional) - Max 10MB (will be compressed)
            'customer_photo' => 'nullable|image|mimes:jpeg,png,jpg|max:10240',
            'customer_nid_photo' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:10240',

            // Guardian Documents (Optional) - Max 10MB (will be compressed)
            'guardian_photo' => 'nullable|image|mimes:jpeg,png,jpg|max:10240',
            'guardian_nid_photo' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:10240',

            // Applicant Signature - Max 10MB (will be compressed)
            'applicant_signature' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:10240',

            // Family Members
            'family_members' => 'nullable|array',
            'family_members.*.member_name' => 'required|string',
            'family_members.*.relation_with_head' => 'required|string',
            'family_members.*.gender' => 'required|in:male,female,other',
            'family_members.*.age_years' => 'nullable|integer',
            'family_members.*.age_months' => 'nullable|integer',
            'family_members.*.education_level' => 'nullable|string',
            'family_members.*.occupation' => 'nullable|string',
            'family_members.*.monthly_income' => 'nullable|numeric',

            // Other Assets
            'other_assets' => 'nullable|array',
            'other_assets.*.asset_description' => 'required|string',
            'other_assets.*.quantity_amount' => 'nullable|string',
            'other_assets.*.estimated_value' => 'nullable|numeric',

            // Selected Approvers — no longer used; submit goes to branch manager only
            'selected_approvers' => 'nullable|array',
            'selected_approvers.*' => 'exists:users,id',
        ]);

        DB::beginTransaction();
        try {
            // Initialize compression service
            $compressionService = app(ImageCompressionService::class);

            // Handle file uploads
            $admissionData = $validated;

            // Customer Photo (Required) - Compress
            if ($request->hasFile('customer_photo')) {
                $compressedPath = $compressionService->compressPhoto($request->file('customer_photo'), 'admissions/customer_photos');
                if ($compressedPath) {
                    $admissionData['customer_photo_path'] = $compressedPath;
                } else {
                    throw new \Exception('Failed to compress customer photo');
                }
            }

            // Customer NID Photo (Required) - Compress with higher quality
            if ($request->hasFile('customer_nid_photo')) {
                $compressedPath = $compressionService->compressDocument($request->file('customer_nid_photo'), 'admissions/customer_nids');
                if ($compressedPath) {
                    $admissionData['customer_nid_photo_path'] = $compressedPath;
                } else {
                    throw new \Exception('Failed to compress customer NID photo');
                }
            }

            // Guardian Photo (Optional) - Compress
            if ($request->hasFile('guardian_photo')) {
                $compressedPath = $compressionService->compressPhoto($request->file('guardian_photo'), 'admissions/guardian_photos');
                if ($compressedPath) {
                    $admissionData['guardian_photo_path'] = $compressedPath;
                } else {
                    throw new \Exception('Failed to compress guardian photo');
                }
            }

            // Guardian NID Photo (Optional) - Compress with higher quality
            if ($request->hasFile('guardian_nid_photo')) {
                $compressedPath = $compressionService->compressDocument($request->file('guardian_nid_photo'), 'admissions/guardian_nids');
                if ($compressedPath) {
                    $admissionData['guardian_nid_photo_path'] = $compressedPath;
                } else {
                    throw new \Exception('Failed to compress guardian NID photo');
                }
            }

            // Applicant Signature - Compress
            if ($request->hasFile('applicant_signature')) {
                $compressedPath = $compressionService->compressPhoto($request->file('applicant_signature'), 'signatures/applicants');
                if ($compressedPath) {
                    $admissionData['applicant_signature_path'] = $compressedPath;
                } else {
                    throw new \Exception('Failed to compress signature');
                }
            }

            // Remove file objects from data
            unset($admissionData['customer_photo'], $admissionData['customer_nid_photo'],
                  $admissionData['guardian_photo'], $admissionData['guardian_nid_photo'],
                  $admissionData['applicant_signature']);

            $admissionData['created_by'] = auth()->id();

            // মোট জমির পরিমাণ ও মূল্য (আবাদযোগ্য + অনাবাদি)
            $admissionData['total_land_amount'] = ($admissionData['cultivable_land_amount'] ?? 0) + ($admissionData['non_cultivable_land_amount'] ?? 0);
            $admissionData['total_land_value'] = ($admissionData['cultivable_land_value'] ?? 0) + ($admissionData['non_cultivable_land_value'] ?? 0);

            $authUser = auth()->user();
            $authUser->loadMissing('role');
            if ($authUser->role?->name === Role::FIELD_OFFICER) {
                $admissionData['interviewer_name'] = $admissionData['interviewer_name'] ?: $authUser->name;
                $admissionData['employee_name'] = $admissionData['employee_name'] ?: $authUser->name;
            }

            $admission = MemberAdmission::create($admissionData);

            // Save family members
            if (!empty($validated['family_members'])) {
                foreach ($validated['family_members'] as $index => $member) {
                    $admission->familyMembers()->create([
                        'sl_no' => $index + 1,
                        'member_name' => $member['member_name'],
                        'relation_with_head' => $member['relation_with_head'],
                        'gender' => $member['gender'],
                        'age_years' => $member['age_years'] ?? null,
                        'age_months' => $member['age_months'] ?? null,
                        'education_level' => $member['education_level'] ?? null,
                        'occupation' => $member['occupation'] ?? null,
                        'monthly_income' => $member['monthly_income'] ?? null,
                    ]);
                }
            }

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

            return redirect()->route('member-admissions.index')
                ->with('success', 'Member admission created successfully! Application No: ' . $admission->application_no);

        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withInput()->with('error', 'Failed to create admission: ' . $e->getMessage());
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

    public function edit(MemberAdmission $memberAdmission)
    {
        // Check if can be edited
        if (!$memberAdmission->canBeEdited()) {
            return back()->with('error', 'This admission cannot be edited!');
        }

        $memberAdmission->load(['familyMembers', 'otherAssets']);

        $branches = Branch::with(['area.zone'])->active()->orderBy('name')->get();
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
        ]);
    }

    public function update(Request $request, MemberAdmission $memberAdmission)
    {
        // Check if can be edited
        if (!$memberAdmission->canBeEdited()) {
            return back()->with('error', 'This admission cannot be edited!');
        }

        $validated = $request->validate([
            // Same validation rules as store method
            'branch_id' => 'required|exists:branches,id',
            'samity_id' => 'required|exists:samities,id',
            'member_category_id' => 'required|exists:member_categories,id',
            'nid_number' => 'required|string|max:20',

            // Customer Documents (Optional) - Max 10MB (will be compressed)
            'customer_photo' => 'nullable|image|mimes:jpeg,png,jpg|max:10240',
            'customer_nid_photo' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:10240',

            // Guardian Documents (Optional) - Max 10MB (will be compressed)
            'guardian_photo' => 'nullable|image|mimes:jpeg,png,jpg|max:10240',
            'guardian_nid_photo' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:10240',

            // Applicant Signature - Max 10MB (will be compressed)
            'applicant_signature' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:10240',

            // Additional fields
            'interviewer_name' => 'nullable|string|max:255',
            'employee_name' => 'nullable|string|max:255',

            // Family Members
            'family_members' => 'nullable|array',

            // Other Assets
            'other_assets' => 'nullable|array',

            // Selected Approvers — no longer used; submit goes to branch manager only
            'selected_approvers' => 'nullable|array',
            'selected_approvers.*' => 'exists:users,id',
            // ... (all other fields same as store)
        ]);

        DB::beginTransaction();
        try {
            // Initialize compression service
            $compressionService = app(ImageCompressionService::class);

            $updateData = $validated;

            // Handle customer photo upload - Compress
            if ($request->hasFile('customer_photo')) {
                $compressionService->delete($memberAdmission->customer_photo_path);
                $compressedPath = $compressionService->compressPhoto($request->file('customer_photo'), 'admissions/customer_photos');
                if ($compressedPath) {
                    $updateData['customer_photo_path'] = $compressedPath;
                } else {
                    throw new \Exception('Failed to compress customer photo');
                }
            }

            // Handle customer NID photo upload - Compress
            if ($request->hasFile('customer_nid_photo')) {
                $compressionService->delete($memberAdmission->customer_nid_photo_path);
                $compressedPath = $compressionService->compressDocument($request->file('customer_nid_photo'), 'admissions/customer_nids');
                if ($compressedPath) {
                    $updateData['customer_nid_photo_path'] = $compressedPath;
                } else {
                    throw new \Exception('Failed to compress customer NID photo');
                }
            }

            // Handle guardian photo upload - Compress
            if ($request->hasFile('guardian_photo')) {
                $compressionService->delete($memberAdmission->guardian_photo_path);
                $compressedPath = $compressionService->compressPhoto($request->file('guardian_photo'), 'admissions/guardian_photos');
                if ($compressedPath) {
                    $updateData['guardian_photo_path'] = $compressedPath;
                } else {
                    throw new \Exception('Failed to compress guardian photo');
                }
            }

            // Handle guardian NID photo upload - Compress
            if ($request->hasFile('guardian_nid_photo')) {
                $compressionService->delete($memberAdmission->guardian_nid_photo_path);
                $compressedPath = $compressionService->compressDocument($request->file('guardian_nid_photo'), 'admissions/guardian_nids');
                if ($compressedPath) {
                    $updateData['guardian_nid_photo_path'] = $compressedPath;
                } else {
                    throw new \Exception('Failed to compress guardian NID photo');
                }
            }

            // Handle applicant signature upload - Compress
            if ($request->hasFile('applicant_signature')) {
                $compressionService->delete($memberAdmission->applicant_signature_path);
                $compressedPath = $compressionService->compressPhoto($request->file('applicant_signature'), 'signatures/applicants');
                if ($compressedPath) {
                    $updateData['applicant_signature_path'] = $compressedPath;
                } else {
                    throw new \Exception('Failed to compress signature');
                }
            }

            // Remove file objects from data
            unset($updateData['customer_photo'], $updateData['customer_nid_photo'],
                  $updateData['guardian_photo'], $updateData['guardian_nid_photo'],
                  $updateData['applicant_signature']);

            $authUser = auth()->user();
            $authUser->loadMissing('role');
            if ($authUser->role?->name === Role::FIELD_OFFICER) {
                $updateData['interviewer_name'] = $updateData['interviewer_name'] ?: $authUser->name;
                $updateData['employee_name'] = $updateData['employee_name'] ?: $authUser->name;
            }

            // মোট জমির পরিমাণ ও মূল্য (আবাদযোগ্য + অনাবাদি)
            $cultivableAmount = $updateData['cultivable_land_amount'] ?? $memberAdmission->cultivable_land_amount ?? 0;
            $cultivableValue = $updateData['cultivable_land_value'] ?? $memberAdmission->cultivable_land_value ?? 0;
            $nonCultivableAmount = $updateData['non_cultivable_land_amount'] ?? $memberAdmission->non_cultivable_land_amount ?? 0;
            $nonCultivableValue = $updateData['non_cultivable_land_value'] ?? $memberAdmission->non_cultivable_land_value ?? 0;
            $updateData['total_land_amount'] = $cultivableAmount + $nonCultivableAmount;
            $updateData['total_land_value'] = $cultivableValue + $nonCultivableValue;

            $memberAdmission->update($updateData);

            // Update family members
            $memberAdmission->familyMembers()->delete();
            if (!empty($validated['family_members'])) {
                foreach ($validated['family_members'] as $index => $member) {
                    $memberAdmission->familyMembers()->create([
                        'sl_no' => $index + 1,
                        'member_name' => $member['member_name'],
                        'relation_with_head' => $member['relation_with_head'],
                        'gender' => $member['gender'],
                        'age_years' => $member['age_years'] ?? null,
                        'age_months' => $member['age_months'] ?? null,
                        'education_level' => $member['education_level'] ?? null,
                        'occupation' => $member['occupation'] ?? null,
                        'monthly_income' => $member['monthly_income'] ?? null,
                    ]);
                }
            }

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

            return redirect()->route('member-admissions.index')
                ->with('success', 'Member admission updated successfully!');

        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withInput()->with('error', 'Failed to update admission: ' . $e->getMessage());
        }
    }

    public function destroy(MemberAdmission $memberAdmission)
    {
        // Only draft admissions can be deleted
        if (!$memberAdmission->isDraft()) {
            return back()->with('error', 'Only draft admissions can be deleted!');
        }

        $memberAdmission->delete();

        return redirect()->route('member-admissions.index')
            ->with('success', 'Member admission deleted successfully!');
    }

    public function submit(MemberAdmission $memberAdmission)
    {
        $user = auth()->user();
        $user->loadMissing('role');
        if (!$memberAdmission->isDraft()) {
            return back()->with('error', 'Only draft admissions can be submitted!');
        }

        $authUser = auth()->user();
        DB::transaction(function () use ($memberAdmission, $authUser) {
            $memberAdmission->update([
                'status' => 'submitted',
                'submitted_by' => $authUser->id,
                'submitted_at' => now(),
            ]);

            $approvalService = app(ApprovalService::class);
            $approvalService->createApprovalWorkflow($memberAdmission);
        });

        return redirect()->route('member-admissions.index')
            ->with('success', 'Member admission submitted successfully and sent for approval!');
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

        return redirect()->route('member-admissions.index')
            ->with('success', 'Member admission resubmitted successfully!');
    }

    /**
     * After all approvals, branch user sends admission to Head Office.
     * This replaces the previous auto-send from ApprovalService.
     */
    public function sendToHeadOffice(MemberAdmission $memberAdmission)
    {
        $user = auth()->user();
        $user->loadMissing('role');
        if ($memberAdmission->status !== 'ready_for_head_office') {
            return back()->with('error', 'শুধু শাখা অনুমোদিত আবেদনই Head Office এ পাঠানো যাবে।');
        }

        $authUser = auth()->user();
        $memberAdmission->update([
            'status' => 'pending_head_office',
            'submitted_by' => $authUser->id,
            'submitted_at' => now(),
        ]);

        return redirect()->route('member-admissions.index')
            ->with('success', 'আবেদনটি Head Office এ পাঠানো হয়েছে।');
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

        return redirect()->route('member-admissions.index')
            ->with('success', 'Member admission rejected successfully!');
    }
}
