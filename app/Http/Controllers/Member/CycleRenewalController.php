<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Concerns\RequiresSuperAdminDeletePin;
use App\Http\Controllers\Controller;
use App\Http\Requests\Member\SaveCycleAdmissionRequest;
use App\Models\LoanCategory;
use App\Models\MemberCategory;
use App\Models\MemberLoanCycle;
use App\Models\Role;
use App\Models\SavingsProduct;
use App\Services\CycleLoanFormService;
use App\Services\CycleRenewalService;
use App\Services\ImageCompressionService;
use App\Support\LoanFormVisibility;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class CycleRenewalController extends Controller
{
    use RequiresSuperAdminDeletePin;

    public function authorizeCycle(Request $request, MemberLoanCycle $cycle, bool $write = false): void
    {
        $user = $request->user();
        abort_unless($user, 403);
        $user->loadMissing('role');
        $privileged = $user->has_all_access || $user->isSuperAdmin() || $user->isHeadOffice();
        abort_unless($privileged || $user->canAccessBranch((int) $cycle->branch_id), 403);
        if ($write) {
            abort_unless($privileged || in_array($user->role?->name, [Role::FIELD_OFFICER, Role::BRANCH_USER, Role::BRANCH_MANAGER], true), 403);
        }
        abort_if($cycle->state === 'discarded', 404);
    }

    public function edit(Request $request, MemberLoanCycle $cycle)
    {
        $this->authorizeCycle($request, $cycle, true);
        app(CycleRenewalService::class)->lockEditable($cycle);

        return Inertia::render('Member/CycleHub/AdmissionEdit', [
            'cycle' => $cycle->only(['id', 'number', 'revision', 'loan_id', 'master_admission_id']),
            'admission' => app(CycleRenewalService::class)->admissionForCycle($cycle),
            'editableFields' => array_values(array_filter(array_keys((new SaveCycleAdmissionRequest)->rules()), fn ($field) => ! str_contains($field, '.'))),
            'categories' => MemberCategory::active()->orderBy('category_name')->get(),
            'documentManifest' => $cycle->document_manifest ?? [],
        ]);
    }

    public function update(SaveCycleAdmissionRequest $request, MemberLoanCycle $cycle)
    {
        $this->authorizeCycle($request, $cycle, true);
        $newPaths = [];
        try {
            DB::transaction(function () use ($request, $cycle, &$newPaths) {
                $service = app(CycleRenewalService::class);
                $cycle = $service->lockEditable($cycle, $request->integer('revision'));
                $member = $cycle->admission;
                $member->fill(Arr::only($service->admissionForCycle($cycle), $member->getFillable()));
                $data = $request->validated();
                if (! empty($data['mobile_number']) && $service->duplicateMobile($cycle, $data['mobile_number'])) {
                    throw ValidationException::withMessages(['mobile_number' => 'এই মোবাইল নম্বর অন্য সদস্যের জন্য ব্যবহার হয়েছে।']);
                }
                $manifest = $cycle->document_manifest ?? [];
                foreach ([
                    'customer_photo' => 'customer_photo_path', 'customer_nid_photo' => 'customer_nid_photo_path',
                    'customer_nid_back_photo' => 'customer_nid_back_photo_path', 'guardian_photo' => 'guardian_photo_path',
                    'guardian_nid_photo' => 'guardian_nid_photo_path', 'applicant_signature' => 'applicant_signature_path',
                ] as $field => $column) {
                    if ($request->hasFile($field)) {
                        $compress = app(ImageCompressionService::class);
                        $directory = 'cycles/'.$cycle->id.'/documents';
                        $path = str_contains($field, 'nid') ? $compress->compressDocument($request->file($field), $directory) : $compress->compressPhoto($request->file($field), $directory);
                        if (! $path) {
                            throw ValidationException::withMessages([$field => 'ফাইল সংরক্ষণ হয়নি। আবার চেষ্টা করুন।']);
                        }
                        $data[$column] = $path;
                        $newPaths[] = $path;
                        $manifest[] = ['source' => null, 'path' => $path, 'missing' => false];
                    } elseif ($request->boolean('clear_'.$field)) {
                        $data[$column] = null;
                    }
                    unset($data[$field]);
                }
                if (array_key_exists('nid_both_sides', $data) && ! $data['nid_both_sides']) {
                    $data['customer_nid_back_photo_path'] = null;
                }
                $member->fill(Arr::only($data, $member->getFillable()));
                if ($member->permanent_address_same) {
                    foreach (['division', 'district', 'upazila', 'union', 'village_road', 'post_code'] as $part) {
                        $member->{'permanent_'.$part} = $member->{'present_'.$part};
                    }
                }
                foreach (['mud_house_count', 'tin_house_count', 'brick_house_count', 'semi_brick_house_count', 'cow_buffalo_count', 'goat_sheep_count', 'duck_chicken_count', 'other_livestock_count'] as $field) {
                    $member->{$field} = (int) $member->{$field};
                }
                $member->total_land_amount = (float) $member->cultivable_land_amount + (float) $member->non_cultivable_land_amount;
                $member->total_land_value = (float) $member->cultivable_land_value + (float) $member->non_cultivable_land_value;
                // Do not run Admission's code-normalization / cross-file sync
                // hooks on a cycle's independent copy.
                $member->saveQuietly();
                foreach (['family_members' => 'familyMembers', 'other_assets' => 'otherAssets'] as $key => $relation) {
                    if (array_key_exists($key, $data)) {
                        $member->{$relation}()->delete();
                        foreach ($data[$key] as $index => $row) {
                            if (empty($row[$key === 'family_members' ? 'member_name' : 'asset_description'])) {
                                continue;
                            }
                            if ($key === 'family_members') {
                                $row['relation_with_head'] = ($row['relation_with_head'] ?? null) ?: 'অন্যান্য';
                                $row['gender'] = ($row['gender'] ?? null) ?: 'male';
                            }
                            $member->{$relation}()->create(['sl_no' => $index + 1, ...Arr::except($row, ['id', 'member_admission_id', 'created_at', 'updated_at'])]);
                        }
                    }
                }
                $member->load(CycleRenewalService::ADMISSION_RELATIONS);
                $admissionChanged = $this->admissionContent($cycle->admission_snapshot) !== $this->admissionContent($member->toArray());
                $cycle->admission_snapshot = $member->toArray();
                $cycle->document_manifest = $manifest;
                $cycle->setRelation('admission', $member);
                if ($cycle->loan && $admissionChanged) {
                    app(CycleLoanFormService::class)->prepare($cycle, $cycle->loan, true);
                }
                $service->snapshot($cycle);
            });
        } catch (\Throwable $e) {
            foreach ($newPaths as $path) {
                if (str_starts_with($path, 'cycles/'.$cycle->id.'/documents/')) {
                    Storage::disk('public')->delete($path);
                }
            }
            throw $e;
        }

        return redirect()->route($request->boolean('continue') ? 'member.cycle-hub.renewals.loan' : 'member.cycle-hub.renewals.edit', $cycle->id)->with('success', 'এই দফার ভর্তি তথ্য সংরক্ষিত হয়েছে।');
    }

    public function checkUnique(Request $request, MemberLoanCycle $cycle)
    {
        $this->authorizeCycle($request, $cycle, true);
        app(CycleRenewalService::class)->lockEditable($cycle);
        $data = $request->validate(['mobile_number' => 'nullable|string|max:20']);
        $duplicate = app(CycleRenewalService::class)->duplicateMobile($cycle, $data['mobile_number'] ?? null);

        return response()->json(['errors' => $duplicate
            ? ['mobile_number' => 'এই মোবাইল নম্বর অন্য সদস্যের জন্য ব্যবহার হয়েছে।']
            : (object) []]);
    }

    public function loan(Request $request, MemberLoanCycle $cycle)
    {
        $this->authorizeCycle($request, $cycle, true);
        app(CycleRenewalService::class)->lockEditable($cycle);

        return Inertia::render('Member/CycleHub/LoanSelection', [
            'cycle' => $cycle->only(['id', 'number', 'revision', 'loan_id']),
            'admission' => app(CycleRenewalService::class)->admissionForCycle($cycle),
            'loan' => $cycle->loan?->only(['id', 'loan_category_id', 'loan_product_id', 'requested_amount']),
            'categories' => LoanCategory::where('is_active', true)->with(['loanProducts' => fn ($q) => $q->where('is_active', true)])->get(),
        ]);
    }

    public function selectLoan(Request $request, MemberLoanCycle $cycle)
    {
        $this->authorizeCycle($request, $cycle, true);
        $data = $request->validate(['revision' => 'required|integer|min:1', 'loan_product_id' => 'required|integer', 'loan_category_id' => 'required|integer', 'requested_amount' => 'required|numeric|min:1']);
        $cycle = app(CycleRenewalService::class)->selectLoan($cycle, $data['loan_product_id'], $data['loan_category_id'], $data['requested_amount'], $data['revision']);

        return redirect()->route('member.cycle-hub.cycle-view', ['admission' => $cycle->admission_id, 'loan_id' => $cycle->loan_id])->with('success', 'এই দফার জন্য প্রয়োজনীয় ফর্ম প্রস্তুত হয়েছে। যাচাই করে সংরক্ষণ করুন।');
    }

    public function form(Request $request, MemberLoanCycle $cycle, int $form)
    {
        $this->authorizeCycle($request, $cycle, true);
        $loan = $cycle->loan?->load(['loanProduct.loanCategory', 'loanCategory', 'branch', 'approvals']);
        abort_unless($loan, 404);
        abort_if($cycle->state === 'closed', 403);
        $visible = LoanFormVisibility::visibleFormIdsForShow(null, $loan->status, $loan->loanProduct, (float) $loan->requested_amount, $loan->loanCategory);
        abort_unless(in_array($form, $visible, true), 404);
        $user = $request->user();
        if ($user->canHeadOfficeDeleteOrEdit() && ! $this->isLoanEditUnlocked((int) $loan->id)) {
            return redirect()->route('member.loan-applications.show', ['id' => $loan->id, 'workflow' => 1])->with('error', 'ফর্ম এডিট করতে আগে আপনার পাসওয়ার্ড দিন।');
        }
        $editable = LoanFormVisibility::editableFormIdsForUser($user->role?->name, $loan->status, $loan->loanProduct, (float) $loan->requested_amount, $loan->loanCategory);
        if (! ($user->has_all_access || $user->isSuperAdmin() || $user->isHeadOffice())) {
            abort_unless(in_array($form, $editable, true), 403);
        }
        $member = app(CycleRenewalService::class)->memberForCycle($cycle);

        // Start these existing pages with an exact application, never rediscover a
        // draft by member/product. Their existing save validators remain in charge.
        return Inertia::render('Member/CycleHub/LoanForm', [
            'cycleId' => $cycle->id, 'revision' => $cycle->revision, 'formId' => $form,
            'member' => $member, 'branch' => $member->branch, 'loanProduct' => $loan->loanProduct,
            'loanCategory' => $loan->loanCategory, 'requestedAmount' => $loan->approved_amount ?: $loan->requested_amount,
            'existingApplication' => $loan, 'savedData' => $loan->{CycleLoanFormService::COLUMNS[$form]},
            'loanRound' => $cycle->number, 'isLegacy' => false,
            'savingsProducts' => SavingsProduct::where('is_active', true)->orderBy('product_code')->get(),
        ]);
    }

    public function discard(Request $request, MemberLoanCycle $cycle)
    {
        $this->authorizeCycle($request, $cycle, true);
        $request->validate(['revision' => 'required|integer|min:1']);
        DB::transaction(function () use ($cycle, $request) {
            $cycle = app(CycleRenewalService::class)->lockEditable($cycle, $request->integer('revision'));
            abort_if($cycle->submitted_snapshot, 422, 'জমা দেওয়া দফা মুছে ফেলা যাবে না।');
            if ($cycle->loan) {
                $cycle->loan->approvals()->delete();
                $cycle->loan->delete();
            }
            $cycle->update(['state' => 'discarded', 'open_member_id' => null, 'revision' => $cycle->revision + 1]);
        });

        return redirect()->route('member.cycle-hub.index', ['member_id' => $cycle->master_admission_id])->with('success', 'এই দফার খসড়া বাতিল হয়েছে। আগের ফাইল সংরক্ষিত আছে।');
    }

    public function print(Request $request, MemberLoanCycle $cycle)
    {
        $this->authorizeCycle($request, $cycle);
        $display = app(CycleRenewalService::class)->display($cycle);
        $loan = $display['loan'];

        return Inertia::render('Member/CycleHub/CyclePrint', [
            'admission' => $display['admission'], 'loan' => $loan, 'number' => $cycle->number,
            'form' => $request->filled('form') ? $request->integer('form') : null,
            'visibleFormIds' => $loan ? LoanFormVisibility::visibleFormIdsForShow(null, $loan->status, $loan->loanProduct, (float) $loan->requested_amount, $loan->loanCategory) : [],
        ]);
    }

    private function admissionContent(array $snapshot): array
    {
        $normalized = [];
        foreach ($snapshot as $field => $value) {
            if (in_array($field, ['id', 'member_admission_id', 'sl_no', 'created_at', 'updated_at', 'deleted_at', 'status', 'submitted_at', 'reviewed_at', 'submitted_by', 'reviewed_by', 'printed_at'], true)) {
                continue;
            }
            if (is_array($value)) {
                $normalized[$field] = $this->admissionContent($value);
            } elseif (preg_match('/(?:_amount|_value|_income|_expense|_savings|_count|age_years|age_months)$/', (string) $field)) {
                $normalized[$field] = (string) (float) $value;
            } elseif ($value === null || $value === '') {
                continue;
            } else {
                $normalized[$field] = $value;
            }
        }
        ksort($normalized);

        return $normalized;
    }
}
