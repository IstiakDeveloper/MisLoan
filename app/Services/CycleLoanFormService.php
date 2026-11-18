<?php

namespace App\Services;

use App\Http\Controllers\Member\LoanApplicationController;
use App\Models\LoanApplication;
use App\Models\LoanCategory;
use App\Models\LoanProduct;
use App\Models\MemberAdmission;
use App\Models\MemberLoanCycle;
use App\Support\LoanFormVisibility;
use App\Support\NumberToWordsBangla;
use Illuminate\Support\Arr;

/** Preparation and ownership rules used only by Cycle Hub renewals. */
class CycleLoanFormService
{
    public const COLUMNS = [1 => 'loan_agreement_data', 2 => 'guarantor_info', 3 => 'nominee_info', 4 => 'asset_info', 5 => 'business_plan'];

    public function resetPreviousAuthorization(array $data): array
    {
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $data[$key] = $this->resetPreviousAuthorization($value);
            } elseif (preg_match('/(?:signature|_signed|_verified|_approved|_reviewed|approval_date|sanction_date|disbursement_date|repayment_date|last_installment_date|manager_comment|approval_comment|officer_.*comment|recommendation|committee_decision|_user_saved|_prefill_only)/i', (string) $key)) {
                unset($data[$key]);
            }
        }

        return $data;
    }

    public function prepare(MemberLoanCycle $cycle, LoanApplication $loan, bool $termsChanged = false): void
    {
        $member = app(CycleRenewalService::class)->memberForCycle($cycle);
        $product = $loan->loanProduct;
        $category = $loan->loanCategory;
        $amount = (float) $loan->requested_amount;
        $visible = LoanFormVisibility::visibleFormIdsForShow(null, $loan->status, $product, $amount, $category);
        $old = $cycle->source_snapshot;
        $source = new LoanApplication(Arr::only($this->resetPreviousAuthorization($old['loan'] ?? []), $loan->getFillable()));
        $sourceProduct = new LoanProduct($old['product'] ?? []);
        $sourceCategory = new LoanCategory($old['category'] ?? []);
        $sourceProduct->setRelation('loanCategory', $sourceCategory);
        $source->setRelation('loanProduct', $sourceProduct)->setRelation('loanCategory', $sourceCategory);
        $loan->setRelation('memberAdmission', $member)->setRelation('branch', $member->branch)->setRelation('samity', $member->samity);

        // Incompatible approval variants must not bring old profile-only entries.
        $expectedVariant = LoanFormVisibility::isSufolon($product, $category) && $amount > LoanFormVisibility::sufolonAgreementMax()
            ? 'agrosor_profile' : 'approval_form';
        $sourceVariant = LoanFormVisibility::isSufolon($sourceProduct, $sourceCategory)
            && (float) ($source->requested_amount ?? 0) > LoanFormVisibility::sufolonAgreementMax()
                ? 'agrosor_profile' : 'approval_form';
        if ($sourceVariant !== $expectedVariant) {
            $source->business_plan = null;
        }
        if ($loan->business_plan && ($loan->business_plan['form_variant'] ?? 'approval_form') !== $expectedVariant) {
            $loan->business_plan = null;
        }

        // Reuse existing defaults without changing the normal application's service.
        app(LoanApplicationCloneService::class)->cloneAndMerge($loan, $source);
        app(MemberAdmissionLoanSyncService::class)->overlayOnLoan($loan, $member);

        // This calls the exact calculation used by the current disbursement flow.
        $calculator = new class extends LoanApplicationController
        {
            public function charge(float $amount, LoanProduct $product, int $months): float
            {
                return $this->calculateTotalServiceCharge($amount, $product, $months);
            }
        };
        $charge = $calculator->charge($amount, $product, (int) $loan->loan_term_months);
        $total = $amount + $charge;
        $installments = max(1, (int) $loan->number_of_installments);
        // Match the existing form's per-thousand/factor/rounding precedence.
        $perThousand = (float) ($product->installment_amount_per_thousand ?? 0);
        $principalFactor = (float) ($product->loan_installment_factor ?? 0);
        $interestFactor = (float) ($product->interest_installment_factor ?? 0);
        $installment = $installments === 1 ? $total : ($perThousand > 0 ? round($amount / 1000 * $perThousand)
            : (($principalFactor > 0 || $interestFactor > 0) ? round(($principalFactor > 0 ? $amount * $principalFactor : $amount / $installments) + ($interestFactor > 0 ? $amount * $interestFactor : $charge / $installments)) : ceil($total / $installments)));
        $lastPerThousand = (float) ($product->last_installment_per_thousand ?? 0);
        $lastInstallment = $installments === 1 ? $total : ($lastPerThousand > 0 ? round($amount / 1000 * $lastPerThousand) : $total - $installment * ($installments - 1));
        $loan->installment_amount = $installment;

        foreach (self::COLUMNS as $formId => $column) {
            if (! in_array($formId, $visible, true)) {
                $loan->{$column} = null;

                continue;
            }
            $data = is_array($loan->{$column}) ? $loan->{$column} : [];
            // Unlike the normal live-sync service, explicit clears must replace old
            // copied values too. These are owned by this cycle's admission.
            $data = array_replace($data, $this->admissionFields($formId, $member));
            $data = LoanFormVisibility::overlaySavedFormLoanTerms(
                $formId, $data, $product, $category, $amount, $installments,
                (int) $loan->loan_term_months, $charge, $total, $installment,
                NumberToWordsBangla::convert($amount).' টাকা',
                NumberToWordsBangla::convert($total).' টাকা', $loan->purpose_of_loan,
            );
            $data['loan_round'] = $cycle->number;
            if ($formId === 1) {
                $data['last_installment_amount'] = $lastInstallment > 0 ? $lastInstallment : $installment;
            }
            if ($formId === 5) {
                $data['form_variant'] = $expectedVariant;
                $data['loan_proposal_date'] = $cycle->created_at->toDateString();
            }
            if ($formId === 4) {
                if (empty($data[LoanFormVisibility::USER_SAVED_KEY]) || $termsChanged) {
                    $data['field_visit_date'] = '';
                    $data['comments'] = '';
                    $data['previous_repayment_type'] = '';
                }
                $data['previous_loan_amount'] = $old['loan']['disbursed_amount'] ?? $old['loan']['approved_amount'] ?? $old['loan']['requested_amount'] ?? 0;
                foreach (['monthly_income', 'monthly_expense', 'monthly_savings', 'cultivable_land_amount', 'cultivable_land_value', 'non_cultivable_land_amount', 'non_cultivable_land_value', 'mud_house_count', 'tin_house_count', 'brick_house_count', 'semi_brick_house_count', 'cow_buffalo_count', 'goat_sheep_count', 'duck_chicken_count', 'other_livestock'] as $field) {
                    $data[$field] = $member->{$field};
                }
            }
            if ($formId === 2) {
                $data['guarantor_name'] = $member->guarantor_name ?? '';
                $data['guarantor_mobile'] = $member->guarantor_mobile ?? '';
                if (! empty($data['guarantors']) && is_array($data['guarantors'][0] ?? null)) {
                    $data['guarantors'][0]['guarantor_name'] = $member->guarantor_name ?? '';
                    $data['guarantors'][0]['guarantor_mobile'] = $member->guarantor_mobile ?? '';
                }
            }
            // No old approval/disbursement dates or attestations on a fresh form.
            if (empty($data[LoanFormVisibility::USER_SAVED_KEY]) || $termsChanged) {
                $data = LoanFormVisibility::markPrefill($this->resetPreviousAuthorization($data));
                foreach (['disbursement_date', 'loan_disbursement_date', 'loan_approval_date', 'loan_sanction_date', 'loan_repayment_date', 'repayment_date', 'last_installment_date'] as $date) {
                    $data[$date] = '';
                }
            }
            $loan->{$column} = $data;
        }
        $loan->monthly_income = $member->monthly_income;
        if (! in_array(2, $visible, true)) {
            $loan->guarantors_list = null;
        }
        if (! in_array(4, $visible, true)) {
            $loan->asset_details = null;
            $loan->liability_details = null;
        }
        $loan->monthly_expense = $member->monthly_expense;
        $loan->family_members = $member->familyMembers->map->attributesToArray()->all();
        $loan->applicant_photo = $member->customer_photo_path;
        $loan->guarantor_photo = $member->guardian_photo_path;
        if ($termsChanged) {
            $loan->guarantor_verified_at = null;
            $loan->guarantor_verified_by = null;
        }
        $loan->save();
    }

    private function admissionFields(int $form, MemberAdmission $member): array
    {
        $name = $member->applicant_name_bn ?: $member->applicant_name_en ?: '';
        $father = $member->father_name_bn ?: $member->spouse_name_bn ?: $member->father_name_en ?: '';
        $code = (string) $member->application_no;
        $nid = $member->identityNumber();
        $samity = MemberCodeService::formatSamityNameWithCode($member->samity?->samity_name_bn ?: $member->samity?->samity_name, $member->samity?->samity_code);
        $samityCode = $member->samity?->samity_code ?: (string) ($member->samity_id ?? '');
        $address = [
            'village' => $member->present_village_road ?: $member->permanent_village_road ?: '',
            'post_office' => $member->present_post_code ?: $member->permanent_post_code ?: '',
            'union' => $member->present_union ?: $member->permanent_union ?: '',
            'upazila' => $member->present_upazila ?: $member->permanent_upazila ?: '',
            'district' => $member->present_district ?: $member->permanent_district ?: '',
        ];
        $photoUrl = fn ($path) => $path ? (str_starts_with($path, '/storage/') ? $path : '/storage/'.$path) : null;

        return match ($form) {
            1 => [...$address, 'member_name_bn' => $name, 'member_code' => $code, 'father_husband_name' => $father,
                'mother_name' => $member->mother_name_bn ?: $member->mother_name_en ?: '',
                'nid_number' => $nid, 'mobile_number' => $member->mobile_number ?? '',
                'samity_name' => $samity, 'samity_code' => $samityCode,
                'guardian_name' => $member->guardian_name ?: $member->guarantor_name ?: '',
                'house_value' => (string) ($member->total_asset_value ?? ''), 'land_value' => (string) ($member->total_land_value ?? '')],
            2 => ['member_name' => $name, 'member_code' => $code, 'member_father_or_spouse' => $father,
                'member_nid' => $nid, 'member_mobile' => $member->mobile_number ?? '',
                'member_village' => $address['village'], 'member_post_office' => $address['post_office'],
                'member_upazila' => $address['upazila'], 'member_district' => $address['district'],
                'samity_name' => $samity, 'samity_code' => $samityCode],
            3 => [...Arr::except($address, ['union']), 'loan_recipient_name' => $name,
                'loan_recipient_code1' => $code, 'loan_recipient_code2' => $code,
                'nid_number' => $nid, 'mobile_number' => $member->mobile_number ?? '',
                'samity_name' => $samity, 'guardian_name' => $member->guardian_name ?? '',
                'loan_recipient_photo' => $photoUrl($member->customer_photo_path), 'guardian_photo' => $photoUrl($member->guardian_photo_path)],
            4 => ['member_name' => $name, 'member_no' => $code, 'member_mobile' => $member->mobile_number ?? '',
                'nid_number' => $nid, 'samity_name' => $samity, 'samity_code' => $samityCode,
                'main_profession' => $member->business_details ?: $member->job_details ?: '',
                'family_members_count' => $member->familyMembers->count(),
                'own_land_amount' => $member->total_land_amount ?? 0, 'land_value' => $member->total_land_value ?? 0,
                'house_type' => $member->house_type ?? '', 'cow_count' => $member->cow_buffalo_count ?? 0,
                'goat_count' => $member->goat_sheep_count ?? 0, 'duck_chicken_count' => $member->duck_chicken_count ?? 0,
                'other_organization_loans' => $member->other_loan_info ?? ''],
            5 => ['member_name_detail' => $name, 'member_code' => $code, 'member_mobile' => $member->mobile_number ?? '',
                'father_husband_name' => $father, 'nid_smart_card' => $nid,
                'current_address_line1' => $address['village'], 'current_address_line2' => $address['post_office'],
                'current_address_line3' => collect([$address['upazila'], $address['district']])->filter()->implode(', '),
                'permanent_address_line1' => $member->permanent_village_road ?: $address['village'],
                'permanent_address_line2' => $member->permanent_post_code ?: $address['post_office'],
                'permanent_address_line3' => collect([$member->permanent_upazila ?: $address['upazila'], $member->permanent_district ?: $address['district']])->filter()->implode(', '),
                'guarantor_1_name' => $member->guarantor_name ?? '', 'guarantor_1_mobile' => $member->guarantor_mobile ?? '',
                'family_members_count' => $member->familyMembers->count(), 'project_name' => $member->project_name ?? '',
                'proposed_project_name' => $member->project_name ?? '', 'business_income' => $member->estimated_annual_project_income ?? 0,
                'business_capital' => $member->total_asset_value ?? 0, 'committee_name' => $samity, 'committee_code' => $samityCode],
        };
    }
}
