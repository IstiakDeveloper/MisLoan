<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\LoanCategory;
use App\Models\LoanProduct;
use App\Models\MemberAdmission;
use App\Models\MemberFamilyMember;
use App\Models\MemberLoanCycle;
use App\Models\MemberOtherAsset;
use App\Models\Samity;
use App\Models\User;
use App\Support\LoanFormVisibility;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CycleRenewalService
{
    public const ADMISSION_RELATIONS = ['branch', 'samity', 'memberCategory', 'familyMembers', 'otherAssets'];

    public function start(MemberAdmission $member, User $user, ?int $sourceLoanId = null): array
    {
        $manifest = [];
        try {
            return DB::transaction(function () use ($member, $user, $sourceLoanId, &$manifest) {
                $master = $member->canonicalAdmission();
                MemberAdmission::whereKey($master->id)->lockForUpdate()->firstOrFail();
                if ($member->sisterAdmissionQuery()->whereNull('previous_admission_id')->count() > 1) {
                    throw ValidationException::withMessages(['cycle' => 'এই সদস্য নম্বরে একাধিক মূল ভর্তি রেকর্ড আছে। নতুন দফা শুরুর আগে Head Office থেকে সঠিক সদস্য ফাইল যাচাই করুন।']);
                }
                $open = MemberLoanCycle::where('open_member_id', $master->id)->lockForUpdate()->first();
                if ($open && (! $open->loan_id || $open->loan?->isDraft())) {
                    return [$open, true];
                }
                if ($open) {
                    $open->update(['open_member_id' => null, 'state' => 'submitted']);
                }
                $active = $master->existingRegularLoanForm();
                $sources = $master->sisterLoanQuery()->where('status', LoanApplication::STATUS_REPAID)
                    ->when($sourceLoanId, fn ($q) => $q->whereKey($sourceLoanId))
                    ->with(['memberAdmission', 'loanProduct', 'loanCategory'])->latest('id')->get();
                $sourceLoan = $sourceLoanId ? $sources->first()
                    : ($sources->first(fn ($loan) => ! $loan->loanProduct?->isCode38()) ?? $sources->first());
                if (! $sourceLoan) {
                    throw ValidationException::withMessages(['cycle' => $active ? MemberAdmission::alreadyLoanFormMessage($active) : 'নতুন দফা শুরু করতে আগের পরিশোধিত ঋণ নির্বাচন করুন।']);
                }
                $source = $sourceLoan->memberAdmission->load(self::ADMISSION_RELATIONS);
                $sourceCycle = MemberLoanCycle::where('loan_id', $sourceLoan->id)->first();
                $number = max(
                    (int) $master->sisterAdmissionQuery()->max('loan_dofa'),
                    (int) MemberLoanCycle::where('master_admission_id', $master->id)->max('number'),
                    $master->sisterLoanQuery()->whereNotIn('status', ['cancelled', 'rejected'])->count(), 1,
                ) + 1;
                $directory = 'cycles/'.Str::uuid();
                $snapshot = app(CycleDocumentService::class)->copyPayload([
                    'admission' => $sourceCycle?->admission_snapshot ?? $source->toArray(),
                    'loan' => ($sourceCycle?->state === 'closed' ? ($sourceCycle->working_snapshot['loan'] ?? null) : null) ?? Arr::except($sourceLoan->attributesToArray(), ['member_display']),
                    'product' => ($sourceCycle?->state === 'closed' ? ($sourceCycle->working_snapshot['product'] ?? null) : null) ?? $sourceLoan->loanProduct?->attributesToArray(),
                    'category' => ($sourceCycle?->state === 'closed' ? ($sourceCycle->working_snapshot['category'] ?? null) : null) ?? $sourceLoan->loanCategory?->attributesToArray(),
                ], $directory, $manifest);
                $data = Arr::only($snapshot['admission'], $source->getFillable());
                foreach (['submitted_at', 'submitted_by', 'reviewed_at', 'reviewed_by', 'returned_at', 'returned_by', 'rejection_reason', 'revision_comments', 'printed_at', 'surveyor_signature_path', 'surveyor_pin', 'submitted_by_signature_path', 'submitted_by_pin', 'selected_approvers', 'applicant_signature'] as $field) {
                    unset($data[$field]);
                }
                $clone = MemberAdmission::create(array_merge($data, [
                    'previous_admission_id' => $source->id, 'loan_dofa' => $number,
                    'is_legacy' => true, 'status' => 'draft', 'revision_count' => 0,
                    'survey_date' => now()->toDateString(), 'created_by' => $user->id,
                    'assigned_officer_id' => $user->id,
                ]));
                foreach (['familyMembers' => 'family_members', 'otherAssets' => 'other_assets'] as $relation => $key) {
                    foreach ($snapshot['admission'][$key] ?? [] as $row) {
                        $clone->{$relation}()->create(Arr::except($row, ['id', 'member_admission_id', 'created_at', 'updated_at']));
                    }
                }
                $cycle = MemberLoanCycle::create([
                    'master_admission_id' => $master->id, 'open_member_id' => $master->id,
                    'source_admission_id' => $source->id, 'source_loan_id' => $sourceLoan->id,
                    'admission_id' => $clone->id, 'branch_id' => $master->branch_id,
                    'created_by' => $user->id, 'number' => $number,
                    'source_snapshot' => $snapshot, 'admission_snapshot' => $clone->load(self::ADMISSION_RELATIONS)->toArray(),
                    'document_manifest' => $manifest,
                ]);

                return [$cycle, false];
            }, 3);
        } catch (\Throwable $e) {
            foreach ($manifest as $file) {
                if (! empty($file['path']) && str_starts_with($file['path'], 'cycles/')) {
                    Storage::disk('public')->delete($file['path']);
                }
            }
            throw $e;
        }
    }

    public function lockEditable(MemberLoanCycle $cycle, ?int $revision = null): MemberLoanCycle
    {
        $cycle = MemberLoanCycle::whereKey($cycle->id)->lockForUpdate()->firstOrFail();
        $status = $cycle->loan?->status;
        if ($cycle->state === 'discarded' || ($status && ! in_array($status, ['draft', 'rejected', 'needs_correction'], true))) {
            throw ValidationException::withMessages(['cycle' => 'এই দফা এখন সম্পাদনাযোগ্য নয়।']);
        }
        if ($revision !== null && $cycle->revision !== $revision) {
            throw ValidationException::withMessages(['revision' => 'অন্য একটি পেজ থেকে তথ্য বদলেছে। পেজ রিফ্রেশ করে আবার চেষ্টা করুন।']);
        }

        return $cycle;
    }

    public function selectLoan(MemberLoanCycle $cycle, int $productId, int $categoryId, float $amount, int $revision): MemberLoanCycle
    {
        return DB::transaction(function () use ($cycle, $productId, $categoryId, $amount, $revision) {
            $master = MemberAdmission::whereKey($cycle->master_admission_id)->lockForUpdate()->firstOrFail();
            $cycle = $this->lockEditable($cycle, $revision);
            $product = LoanProduct::where('is_active', true)->where('loan_category_id', $categoryId)->find($productId);
            $category = LoanCategory::where('is_active', true)->find($categoryId);
            if (! $product || ! $category || $amount <= 0 || $amount < (float) $product->min_amount || ($product->max_amount !== null && $amount > (float) $product->max_amount)) {
                throw ValidationException::withMessages(['requested_amount' => 'সঠিক ক্যাটাগরি, প্রোডাক্ট ও অনুমোদিত সীমার ঋণের পরিমাণ দিন।']);
            }
            $decision = $master->resolveActiveLoanCreate($productId, $categoryId);
            if ($decision['action'] !== 'create' && (int) $decision['loan']->id !== (int) $cycle->loan_id) {
                throw ValidationException::withMessages(['cycle' => MemberAdmission::alreadyLoanFormMessage($decision['loan'])]);
            }
            // Code 38 loans may coexist; a second regular loan must still be blocked
            // when switching a cycle draft from Code 38 to a regular product.
            if (! $product->isCode38()) {
                $otherRegular = $master->activeLoanForms()->first(fn ($l) => (int) $l->id !== (int) $cycle->loan_id && ! $l->loanProduct?->isCode38());
                if ($otherRegular) {
                    throw ValidationException::withMessages(['cycle' => MemberAdmission::alreadyLoanFormMessage($otherRegular)]);
                }
            }
            $loan = $cycle->loan ?? new LoanApplication;
            $changed = $loan->exists && ((int) $loan->loan_product_id !== $productId || (int) $loan->loan_category_id !== $categoryId || (float) $loan->requested_amount !== $amount);
            $duration = max(1, (int) ($product->duration_months ?: 12));
            $lump = LoanFormVisibility::isSufolon($product, $category) || str_starts_with((string) $product->product_code, '4.') || $product->main_product_code === '4' || str_contains((string) $product->installment_type, 'lump');
            $installments = $lump ? 1 : max(1, (int) ($product->number_of_installments ?: ($product->installment_type === 'weekly' ? 46 : $duration)));
            $loan->fill([
                'member_admission_id' => $cycle->admission_id, 'branch_id' => $cycle->branch_id,
                'samity_id' => $cycle->admission->samity_id, 'loan_product_id' => $productId,
                'loan_category_id' => $categoryId, 'requested_amount' => $amount,
                'loan_term_months' => $duration, 'number_of_installments' => $installments,
                'repayment_frequency' => in_array($product->installment_type, ['weekly', 'monthly'], true) ? $product->installment_type : 'monthly',
            ]);
            if (! $loan->exists) {
                $purpose = $cycle->admission_snapshot['project_name'] ?: ($cycle->source_snapshot['loan']['purpose_of_loan'] ?? ($cycle->source_snapshot['loan']['loan_agreement_data']['loan_purpose'] ?? 'ঋণ আবেদন'));
                $loan->fill(['application_no' => LoanApplication::generateApplicationNo(), 'status' => 'draft', 'submitted_by' => $cycle->created_by, 'purpose_of_loan' => $purpose]);
            }
            $loan->save();
            $loan->setRelation('loanProduct', $product)->setRelation('loanCategory', $category);
            app(CycleLoanFormService::class)->prepare($cycle, $loan, $changed);
            $cycle->loan_id = $loan->id;
            $cycle->setRelation('loan', $loan);
            $this->snapshot($cycle);

            return $cycle;
        }, 3);
    }

    public function snapshot(MemberLoanCycle $cycle): void
    {
        if ($cycle->state === 'closed') {
            return;
        }
        $loan = $cycle->loan;
        $cycle->working_snapshot = $loan ? [
            'loan' => Arr::except($loan->attributesToArray(), ['member_display']),
            'product' => $loan->loanProduct?->attributesToArray(),
            'category' => $loan->loanCategory?->attributesToArray(),
        ] : null;
        if ($loan && ! in_array($loan->status, ['draft', 'rejected', 'needs_correction'], true)) {
            if (! $cycle->submitted_snapshot) {
                $cycle->submitted_snapshot = ['admission' => $cycle->admission_snapshot, ...($cycle->working_snapshot ?? [])];
                $cycle->submitted_at = now();
            }
            $cycle->state = 'submitted';
            $cycle->open_member_id = null;
        }
        if ($loan?->status === LoanApplication::STATUS_REPAID) {
            $cycle->state = 'closed';
        }
        $cycle->revision++;
        $cycle->save();
    }

    /** Read-only dossier. Closed cycles use their captured loan and product version. */
    public function display(MemberLoanCycle $cycle): array
    {
        $admission = $cycle->admission_snapshot;
        $member = $this->memberForCycle($cycle);
        $loan = $cycle->loan?->load(['loanProduct.loanCategory', 'loanCategory', 'branch', 'samity', 'disbursedBy', 'repaidBy', 'submittedBy']);
        if ($cycle->state === 'closed' && $cycle->working_snapshot) {
            $snapshot = $cycle->working_snapshot;
            $loan = (new LoanApplication)->forceFill(Arr::except($snapshot['loan'], ['member_display']));
            $category = (new LoanCategory)->forceFill($snapshot['category'] ?? []);
            $product = (new LoanProduct)->forceFill($snapshot['product'] ?? []);
            $product->setRelation('loanCategory', $category);
            $loan->setRelation('loanProduct', $product)->setRelation('loanCategory', $category);
            foreach (['disbursedBy', 'repaidBy', 'submittedBy'] as $relation) {
                $loan->setRelation($relation, null);
            }
        }
        if ($loan) {
            $loan->setRelation('memberAdmission', $member)->setRelation('branch', $member->branch)->setRelation('samity', $member->samity);
        }

        return ['admission' => $admission, 'loan' => $loan];
    }

    public function memberForCycle(MemberLoanCycle $cycle): MemberAdmission
    {
        $admission = $cycle->admission_snapshot;
        $member = (new MemberAdmission)->forceFill(Arr::only($admission, [...(new MemberAdmission)->getFillable(), 'id', 'created_at', 'updated_at']));
        $member->setRelation('branch', ! empty($admission['branch']) ? (new Branch)->forceFill($admission['branch']) : null);
        $member->setRelation('samity', ! empty($admission['samity']) ? (new Samity)->forceFill($admission['samity']) : null);
        $member->setRelation('familyMembers', collect($admission['family_members'] ?? [])->map(fn ($row) => (new MemberFamilyMember)->forceFill($row)));
        $member->setRelation('otherAssets', collect($admission['other_assets'] ?? [])->map(fn ($row) => (new MemberOtherAsset)->forceFill($row)));

        return $member;
    }
}
