<?php

namespace App\Services;

use App\Models\LoanApplication;
use App\Models\LoanProduct;
use App\Models\MemberAdmission;
use App\Support\LoanFormVisibility;
use App\Support\NumberToWordsBangla;

class LoanApplicationCloneService
{
    /**
     * Find the latest previous loan application for a member admission.
     */
    public function findPreviousLoan(LoanApplication|MemberAdmission|int $currentLoanOrAdmission, ?int $excludeLoanId = null): ?LoanApplication
    {
        $memberAdmission = null;
        if ($currentLoanOrAdmission instanceof LoanApplication) {
            $excludeLoanId = $excludeLoanId ?: (int) $currentLoanOrAdmission->id;
            $memberAdmission = $currentLoanOrAdmission->memberAdmission;
            if (! $memberAdmission && $currentLoanOrAdmission->member_admission_id) {
                $memberAdmission = MemberAdmission::find($currentLoanOrAdmission->member_admission_id);
            }
        } elseif ($currentLoanOrAdmission instanceof MemberAdmission) {
            $memberAdmission = $currentLoanOrAdmission;
        } elseif (is_numeric($currentLoanOrAdmission)) {
            $memberAdmission = MemberAdmission::find($currentLoanOrAdmission);
        }

        if (! $memberAdmission) {
            return null;
        }

        $admissionIds = [(int) $memberAdmission->id];

        // Traverse previous admission cycle chain
        $prevId = $memberAdmission->previous_admission_id;
        while ($prevId) {
            $admissionIds[] = (int) $prevId;
            $prevAdm = MemberAdmission::select('id', 'previous_admission_id')->find($prevId);
            $prevId = $prevAdm?->previous_admission_id;
        }

        // Also check by member code / application_no or NID if existing member
        if (! empty($memberAdmission->application_no)) {
            $sameCodeIds = MemberAdmission::where('application_no', $memberAdmission->application_no)
                ->where('branch_id', $memberAdmission->branch_id)
                ->pluck('id')
                ->toArray();
            $admissionIds = array_unique(array_merge($admissionIds, $sameCodeIds));
        }

        if (! empty($memberAdmission->nid_number)) {
            $sameNidIds = MemberAdmission::where('nid_number', $memberAdmission->nid_number)
                ->pluck('id')
                ->toArray();
            $admissionIds = array_unique(array_merge($admissionIds, $sameNidIds));
        }

        // Query loan applications matching any of these admission records
        $previousLoan = LoanApplication::with(['loanProduct', 'loanCategory', 'memberAdmission'])
            ->whereIn('member_admission_id', $admissionIds)
            ->when($excludeLoanId, fn ($q) => $q->where('id', '!=', $excludeLoanId))
            ->where(function ($q) {
                $q->whereNotNull('guarantor_info')
                    ->orWhereNotNull('nominee_info')
                    ->orWhereNotNull('loan_agreement_data')
                    ->orWhereNotNull('asset_info')
                    ->orWhereNotNull('business_plan')
                    ->orWhereIn('status', [
                        LoanApplication::STATUS_SUBMITTED,
                        LoanApplication::STATUS_UNDER_REVIEW,
                        LoanApplication::STATUS_READY_FOR_HEAD_OFFICE,
                        LoanApplication::STATUS_PENDING_HEAD_OFFICE,
                        LoanApplication::STATUS_APPROVED,
                        LoanApplication::STATUS_PENDING_DISBURSEMENT,
                        LoanApplication::STATUS_DISBURSED,
                        LoanApplication::STATUS_REPAID,
                    ]);
            })
            ->latest('id')
            ->first();

        return $previousLoan;
    }

    /**
     * Calculate total loan amount with service charge.
     */
    public function calcLoanAmountWithServiceCharge(float $baseAmount, ?LoanProduct $loanProduct): float
    {
        if ($baseAmount <= 0) {
            return 0.0;
        }
        $rate = (float) ($loanProduct?->interest_rate ?? 0);
        $durationMonths = (int) ($loanProduct?->duration_months ?? 12);
        if ($durationMonths <= 0) {
            $durationMonths = 12;
        }
        $serviceCharge = ($baseAmount * ($rate / 100)) * ($durationMonths / 12);

        return round($baseAmount + $serviceCharge);
    }

    /**
     * Check whether data contains meaningful information.
     */
    private function hasMeaningfulData(mixed $data): bool
    {
        if ($data === null || $data === '' || $data === []) {
            return false;
        }
        if (is_string($data)) {
            $trimmed = trim($data);

            return $trimmed !== '' && $trimmed !== 'null' && $trimmed !== '{}' && $trimmed !== '[]';
        }
        if (is_array($data)) {
            foreach ($data as $val) {
                if ($this->hasMeaningfulData($val)) {
                    return true;
                }
            }

            return false;
        }

        return true;
    }

    /**
     * Clone previous loan application form data and admission defaults onto the target loan.
     */
    public function cloneAndMerge(LoanApplication $targetLoan, ?LoanApplication $previousLoan = null): bool
    {
        $targetLoan->loadMissing(['memberAdmission.samity', 'memberAdmission.branch', 'memberAdmission.familyMembers', 'memberAdmission.otherAssets', 'loanProduct.loanCategory', 'loanCategory']);

        $member = $targetLoan->memberAdmission;
        $product = $targetLoan->loanProduct;
        $category = $targetLoan->loanCategory ?? $product?->loanCategory;
        $requestedAmount = (float) ($targetLoan->requested_amount ?? ($product?->min_amount ?? 50000));

        if (! $previousLoan) {
            $previousLoan = $this->findPreviousLoan($targetLoan, (int) $targetLoan->id);
        }

        $dirty = false;
        $today = now()->toDateString();
        $branch = $targetLoan->branch ?? $member?->branch;
        $samity = $targetLoan->samity ?? $member?->samity;

        $totalWithServiceCharge = $this->calcLoanAmountWithServiceCharge($requestedAmount, $product);
        $totalWithServiceWords = $totalWithServiceCharge > 0 ? NumberToWordsBangla::convert($totalWithServiceCharge).' টাকা' : '';
        $requestedWords = $requestedAmount > 0 ? NumberToWordsBangla::convert($requestedAmount).' টাকা' : '';
        $termMonths = (int) ($targetLoan->loan_term_months ?: ($product?->duration_months ?? 12));
        $installments = (int) ($targetLoan->number_of_installments ?: ($product?->number_of_installments ?? $termMonths));
        $serviceCharge = max(0, $totalWithServiceCharge - $requestedAmount);
        $installmentAmount = (float) ($targetLoan->installment_amount ?: round($totalWithServiceCharge / max(1, $installments)));

        $visibleFormIds = LoanFormVisibility::visibleFormIdsForShow(
            null,
            (string) ($targetLoan->status ?: LoanApplication::STATUS_DRAFT),
            $product,
            $requestedAmount,
            $category
        );

        $primaryFormType = LoanFormVisibility::primaryFormType($product, $requestedAmount, $category);
        if (($targetLoan->form_type ?: '') !== $primaryFormType) {
            $targetLoan->form_type = $primaryFormType;
            $dirty = true;
        }

        foreach (LoanFormVisibility::formColumnsToClear($visibleFormIds) as $column) {
            if ($targetLoan->{$column} !== null) {
                $targetLoan->{$column} = null;
                $dirty = true;
            }
        }

        $shouldFillForm = fn (int $formId): bool => in_array($formId, $visibleFormIds, true);

        // ----------------------------------------------------
        // 1. GUARANTOR INFO (Form 2 - জামিনদার অঙ্গীকারনামা)
        // ----------------------------------------------------
        if ($shouldFillForm(2) && ! $this->hasMeaningfulData($targetLoan->guarantor_info)) {
            if ($previousLoan && $this->hasMeaningfulData($previousLoan->guarantor_info)) {
                $guarantorData = is_array($previousLoan->guarantor_info) ? $previousLoan->guarantor_info : [];
            } else {
                $guarantorData = [
                    'branch_name' => $branch?->name ?? '',
                    'branch_address' => $branch?->address ?? '',
                    'guarantor_name' => $member?->guarantor_name ?? '',
                    'guarantor_father_or_spouse' => '',
                    'guarantor_nid' => '',
                    'guarantor_mobile' => $member?->guarantor_mobile ?? '',
                    'guarantor_village' => $member?->present_village_road ?: ($member?->permanent_village_road ?? ''),
                    'guarantor_post_office' => $member?->present_post_code ?: ($member?->permanent_post_code ?? ''),
                    'guarantor_upazila' => $member?->present_upazila ?: ($member?->permanent_upazila ?? ''),
                    'guarantor_district' => $member?->present_district ?: ($member?->permanent_district ?? ''),
                    'guarantor_signature_image' => $member?->guardian_photo_path ?? null,
                ];
            }

            // Overlay current member and loan amount updates
            $guarantorData['branch_name'] = $branch?->name ?: ($guarantorData['branch_name'] ?? '');
            $guarantorData['branch_address'] = $branch?->address ?: ($guarantorData['branch_address'] ?? '');
            $guarantorData['member_name'] = $member?->applicant_name_bn ?: ($member?->applicant_name_en ?: ($guarantorData['member_name'] ?? ''));
            $guarantorData['member_father_or_spouse'] = $member?->father_name_bn ?: ($member?->spouse_name_bn ?: ($member?->father_name_en ?: ($guarantorData['member_father_or_spouse'] ?? '')));
            $guarantorData['member_nid'] = $member?->nid_number ?: ($member?->smart_card_number ?: ($guarantorData['member_nid'] ?? ''));
            $guarantorData['member_mobile'] = $member?->mobile_number ?: ($guarantorData['member_mobile'] ?? '');
            $guarantorData['member_village'] = $member?->present_village_road ?: ($member?->permanent_village_road ?: ($guarantorData['member_village'] ?? ''));
            $guarantorData['member_post_office'] = $member?->present_post_code ?: ($member?->permanent_post_code ?: ($guarantorData['member_post_office'] ?? ''));
            $guarantorData['member_upazila'] = $member?->present_upazila ?: ($member?->permanent_upazila ?: ($guarantorData['member_upazila'] ?? ''));
            $guarantorData['member_district'] = $member?->present_district ?: ($member?->permanent_district ?: ($guarantorData['member_district'] ?? ''));
            $guarantorData['member_code'] = (string) ($member?->application_no ?: ($guarantorData['member_code'] ?? ''));
            $guarantorData['samity_name'] = $samity?->samity_name_bn ?: ($samity?->samity_name ?: ($guarantorData['samity_name'] ?? ''));
            $guarantorData['samity_code'] = $samity?->samity_code ?: ((string) ($samity?->id ?? '') ?: ($guarantorData['samity_code'] ?? ''));
            $guarantorData['loan_date'] = $today;
            $guarantorData['loan_amount'] = $totalWithServiceCharge;
            $guarantorData['loan_amount_words'] = $totalWithServiceWords;

            $targetLoan->guarantor_info = $guarantorData;
            $dirty = true;
        }

        if ($shouldFillForm(2) && ! $this->hasMeaningfulData($targetLoan->guarantors_list) && $previousLoan && $this->hasMeaningfulData($previousLoan->guarantors_list)) {
            $targetLoan->guarantors_list = $previousLoan->guarantors_list;
            $dirty = true;
        }

        // ----------------------------------------------------
        // 2. NOMINEE INFO (Form 3 - মৃত্যুঝুঁকি তহবিল আবেদন)
        // ----------------------------------------------------
        if ($shouldFillForm(3) && ! $this->hasMeaningfulData($targetLoan->nominee_info)) {
            if ($previousLoan && $this->hasMeaningfulData($previousLoan->nominee_info)) {
                $nomineeData = is_array($previousLoan->nominee_info) ? $previousLoan->nominee_info : [];
            } else {
                $nomineeData = [
                    'branch_name' => $branch?->name ?? '',
                    'date' => $today,
                    'loan_recipient_photo' => $member?->customer_photo_path ?? null,
                    'guardian_photo' => $member?->guardian_photo_path ?? null,
                    'guardian_name' => $member?->guardian_name ?? '',
                    'relationship_with_recipient' => 'অভিভাবক',
                    'guardian_village' => $member?->present_village_road ?: ($member?->permanent_village_road ?? ''),
                    'guardian_post_office' => $member?->present_post_code ?: ($member?->permanent_post_code ?? ''),
                    'guardian_upazila' => $member?->present_upazila ?: ($member?->permanent_upazila ?? ''),
                    'guardian_district' => $member?->present_district ?: ($member?->permanent_district ?? ''),
                    'guardian_nid' => '',
                    'guardian_mobile' => $member?->guarantor_mobile ?? '',
                    'guardian_profession' => '',
                ];
            }

            // Overlay current member and loan amount updates
            $nomineeData['branch_name'] = $branch?->name ?: ($nomineeData['branch_name'] ?? '');
            $nomineeData['date'] = $today;
            $nomineeData['loan_recipient_name'] = $member?->applicant_name_bn ?: ($member?->applicant_name_en ?: ($nomineeData['loan_recipient_name'] ?? ''));
            $nomineeData['loan_recipient_code1'] = (string) ($member?->application_no ?: ($nomineeData['loan_recipient_code1'] ?? ''));
            $nomineeData['loan_recipient_code2'] = (string) ($member?->application_no ?: ($nomineeData['loan_recipient_code2'] ?? ''));
            $nomineeData['samity_name'] = $samity?->samity_name_bn ?: ($samity?->samity_name ?: ($nomineeData['samity_name'] ?? ''));
            $nomineeData['village'] = $member?->present_village_road ?: ($member?->permanent_village_road ?: ($nomineeData['village'] ?? ''));
            $nomineeData['post_office'] = $member?->present_post_code ?: ($member?->permanent_post_code ?: ($nomineeData['post_office'] ?? ''));
            $nomineeData['upazila'] = $member?->present_upazila ?: ($member?->permanent_upazila ?: ($nomineeData['upazila'] ?? ''));
            $nomineeData['district'] = $member?->present_district ?: ($member?->permanent_district ?: ($nomineeData['district'] ?? ''));
            $nomineeData['nid_number'] = $member?->nid_number ?: ($member?->smart_card_number ?: ($nomineeData['nid_number'] ?? ''));
            $nomineeData['mobile_number'] = $member?->mobile_number ?: ($nomineeData['mobile_number'] ?? '');
            $nomineeData['component_name'] = $product?->product_name_bn ?: ($product?->product_name ?: ($nomineeData['component_name'] ?? ''));
            $nomineeData['loan_sanction_date'] = $today;
            $nomineeData['loan_amount_received'] = $requestedAmount;
            $nomineeData['loan_amount_words'] = $requestedWords;
            $nomineeData['loan_term'] = ($product?->duration_months ?? 12).' মাস';

            if (! empty($member?->customer_photo_path) && empty($nomineeData['loan_recipient_photo'])) {
                $nomineeData['loan_recipient_photo'] = $member->customer_photo_path;
            }
            if (! empty($member?->guardian_photo_path) && empty($nomineeData['guardian_photo'])) {
                $nomineeData['guardian_photo'] = $member->guardian_photo_path;
            }

            $targetLoan->nominee_info = $nomineeData;
            $dirty = true;
        }

        // ----------------------------------------------------
        // 3. LOAN AGREEMENT DATA (Form 1 - ঋণ চুক্তি পত্র)
        // ----------------------------------------------------
        if ($shouldFillForm(1) && ! $this->hasMeaningfulData($targetLoan->loan_agreement_data)) {
            if ($previousLoan && $this->hasMeaningfulData($previousLoan->loan_agreement_data)) {
                $agreementData = is_array($previousLoan->loan_agreement_data) ? $previousLoan->loan_agreement_data : [];
            } else {
                $agreementData = [
                    'branch_name' => $branch?->name ?? '',
                    'branch_address' => $branch?->address ?? '',
                    'guardian_name' => $member?->guardian_name ?: ($member?->guarantor_name ?? ''),
                    'guardian_signature_image' => $member?->guardian_photo_path ?? null,
                    'loan_purpose' => 'ব্যবসা সম্প্রসারণ ও উন্নয়ন',
                    'house_acres' => '',
                    'house_decimal' => '',
                    'land_acres' => '',
                    'land_decimal' => '',
                    'house_value' => (string) ($member?->total_asset_value ?? ''),
                    'land_value' => (string) ($member?->total_land_value ?? ''),
                ];
            }

            $agreementData['branch_name'] = $branch?->name ?: ($agreementData['branch_name'] ?? '');
            $agreementData['branch_address'] = $branch?->address ?: ($agreementData['branch_address'] ?? '');
            $agreementData['member_name_bn'] = $member?->applicant_name_bn ?: ($member?->applicant_name_en ?: ($agreementData['member_name_bn'] ?? ''));
            $agreementData['member_code'] = (string) ($member?->application_no ?: ($agreementData['member_code'] ?? ''));
            $agreementData['father_husband_name'] = $member?->father_name_bn ?: ($member?->spouse_name_bn ?: ($member?->father_name_en ?: ($agreementData['father_husband_name'] ?? '')));
            $agreementData['mother_name'] = $member?->mother_name_bn ?: ($member?->mother_name_en ?: ($agreementData['mother_name'] ?? ''));
            $agreementData['nid_number'] = $member?->nid_number ?: ($member?->smart_card_number ?: ($agreementData['nid_number'] ?? ''));
            $agreementData['mobile_number'] = $member?->mobile_number ?: ($agreementData['mobile_number'] ?? '');
            $agreementData['samity_name'] = $samity?->samity_name_bn ?: ($samity?->samity_name ?: ($agreementData['samity_name'] ?? ''));
            $agreementData['samity_code'] = $samity?->samity_code ?: ((string) ($samity?->id ?? '') ?: ($agreementData['samity_code'] ?? ''));
            $agreementData['village'] = $member?->present_village_road ?: ($member?->permanent_village_road ?: ($agreementData['village'] ?? ''));
            $agreementData['union'] = $member?->present_union ?: ($member?->permanent_union ?: ($agreementData['union'] ?? ''));
            $agreementData['upazila'] = $member?->present_upazila ?: ($member?->permanent_upazila ?: ($agreementData['upazila'] ?? ''));
            $agreementData['district'] = $member?->present_district ?: ($member?->permanent_district ?: ($agreementData['district'] ?? ''));

            // Current loan numbers
            $agreementData['loan_amount'] = $requestedAmount;
            $agreementData['loan_category_name'] = $category?->category_name_bn ?: ($category?->category_name ?: ($agreementData['loan_category_name'] ?? ''));
            $agreementData['loan_product_name'] = $product?->product_name_bn ?: ($product?->product_name ?: ($agreementData['loan_product_name'] ?? ''));
            $agreementData['loan_duration_months'] = (int) ($product?->duration_months ?? 12);
            $agreementData['interest_rate'] = (float) ($product?->interest_rate ?? 0);
            $agreementData['total_amount'] = $totalWithServiceCharge;
            $agreementData['number_of_installments'] = (int) ($targetLoan->number_of_installments ?: ($product?->number_of_installments ?? 12));
            $agreementData['installment_amount'] = (float) ($targetLoan->installment_amount ?: round($totalWithServiceCharge / max(1, $agreementData['number_of_installments'])));
            $agreementData['last_installment_amount'] = $agreementData['installment_amount'];
            $agreementData['disbursement_date'] = $today;

            $targetLoan->loan_agreement_data = $agreementData;
            $dirty = true;
        }

        // ----------------------------------------------------
        // 4. ASSET INFO (Form 4 - সরেজমিন তদন্ত প্রতিবেদন)
        // ----------------------------------------------------
        if ($shouldFillForm(4) && ! $this->hasMeaningfulData($targetLoan->asset_info)) {
            if ($previousLoan && $this->hasMeaningfulData($previousLoan->asset_info)) {
                $assetData = is_array($previousLoan->asset_info) ? $previousLoan->asset_info : [];
            } else {
                $assetData = [
                    'mud_house_count' => (int) ($member?->mud_house_count ?? 0),
                    'tin_house_count' => (int) ($member?->tin_house_count ?? 0),
                    'brick_house_count' => (int) ($member?->brick_house_count ?? 0),
                    'semi_brick_house_count' => (int) ($member?->semi_brick_house_count ?? 0),
                    'cultivable_land_amount' => (float) ($member?->cultivable_land_amount ?? 0),
                    'cultivable_land_value' => (float) ($member?->cultivable_land_value ?? 0),
                    'non_cultivable_land_amount' => (float) ($member?->non_cultivable_land_amount ?? 0),
                    'non_cultivable_land_value' => (float) ($member?->non_cultivable_land_value ?? 0),
                    'cow_buffalo_count' => (int) ($member?->cow_buffalo_count ?? 0),
                    'goat_sheep_count' => (int) ($member?->goat_sheep_count ?? 0),
                    'duck_chicken_count' => (int) ($member?->duck_chicken_count ?? 0),
                    'other_livestock' => $member?->other_livestock ?? '',
                    'monthly_income' => (float) ($member?->monthly_income ?? 0),
                    'monthly_expense' => (float) ($member?->monthly_expense ?? 0),
                    'monthly_savings' => (float) ($member?->monthly_savings ?? 0),
                ];
            }

            $targetLoan->asset_info = $assetData;
            $dirty = true;
        }

        if ($shouldFillForm(4) && ! $this->hasMeaningfulData($targetLoan->asset_details) && $previousLoan && $this->hasMeaningfulData($previousLoan->asset_details)) {
            $targetLoan->asset_details = $previousLoan->asset_details;
            $dirty = true;
        }
        if ($shouldFillForm(4) && ! $this->hasMeaningfulData($targetLoan->liability_details) && $previousLoan && $this->hasMeaningfulData($previousLoan->liability_details)) {
            $targetLoan->liability_details = $previousLoan->liability_details;
            $dirty = true;
        }

        // ----------------------------------------------------
        // 5. BUSINESS PLAN & APPROVAL (Form 5 - আবেদন ও অনুমোদনপত্র)
        // ----------------------------------------------------
        if ($shouldFillForm(5) && ! $this->hasMeaningfulData($targetLoan->business_plan)) {
            if ($previousLoan && $this->hasMeaningfulData($previousLoan->business_plan)) {
                $businessData = is_array($previousLoan->business_plan) ? $previousLoan->business_plan : [];
            } else {
                $businessData = [
                    'business_type' => $member?->business_details ?: ($member?->job_details ?? ''),
                    'business_description' => $member?->project_name ?? 'ব্যবসা সম্প্রসারণ',
                    'business_income' => (float) ($member?->estimated_annual_project_income ?? 0),
                    'business_capital' => (float) ($member?->total_asset_value ?? 0),
                ];
            }

            if ($product) {
                $businessData = LoanFormVisibility::overlaySavedFormLoanTerms(
                    5,
                    $businessData,
                    $product,
                    $category,
                    $requestedAmount,
                    $installments,
                    $termMonths,
                    $serviceCharge,
                    $totalWithServiceCharge,
                    $installmentAmount,
                    $requestedWords,
                    $totalWithServiceWords,
                    $targetLoan->purpose_of_loan
                );
            }

            $targetLoan->business_plan = $businessData;
            $dirty = true;
        }

        // Clone other application attributes if missing
        if ($previousLoan) {
            $cloneAttributes = [
                'employment_details',
                'risk_measures',
                'applicant_education',
                'spouse_education',
                'collateral_info',
                'has_savings_account',
                'savings_amount',
                'savings_account_type',
                'income_sources',
                'loan_usage_breakdown',
                'monthly_income_breakdown',
                'monthly_expense_breakdown',
                'applicant_photo',
                'guarantor_photo',
                'documents_submitted',
            ];

            foreach ($cloneAttributes as $attr) {
                if ($targetLoan->{$attr} === null || $targetLoan->{$attr} === '' || $targetLoan->{$attr} === []) {
                    if ($previousLoan->{$attr} !== null && $previousLoan->{$attr} !== '' && $previousLoan->{$attr} !== []) {
                        $targetLoan->{$attr} = $previousLoan->{$attr};
                        $dirty = true;
                    }
                }
            }
        }

        if ($dirty) {
            $targetLoan->save();
        }

        return $dirty;
    }
}
