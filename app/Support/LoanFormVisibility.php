<?php

namespace App\Support;

use App\Models\LoanApplication;
use App\Models\Role;

class LoanFormVisibility
{
    public const ONE_LAKH = 100000.0;

    /** Sufolon: ঋণ চুক্তিপত্র up to this amount; above → Agrosor Profile (Form 5) */
    public const SUFOLON_AGREEMENT_MAX = 99000.0;

    public static function isWeekly(?object $product): bool
    {
        return strtolower((string) ($product->installment_type ?? 'monthly')) === 'weekly';
    }

    public static function isSufolon(?object $product = null, ?object $category = null): bool
    {
        if ($category) {
            $code = strtoupper(trim((string) ($category->category_code ?? '')));
            if ($code === 'SFL') {
                return true;
            }
            $catName = mb_strtolower(
                trim((string) ($category->category_name ?? '').' '.($category->category_name_bn ?? '')),
                'UTF-8'
            );
            if (
                str_contains($catName, 'sufolon')
                || str_contains($catName, 'শুফলন')
                || str_contains($catName, 'সুফলন')
            ) {
                return true;
            }
        }

        if (! $product) {
            return false;
        }

        $rel = $product->loanCategory ?? $product->loan_category ?? null;
        if ($rel && self::isSufolon(null, $rel)) {
            return true;
        }

        $pCode = strtoupper(trim((string) ($product->product_code ?? '')));
        if ($pCode === 'SFL' || str_contains($pCode, 'SUFOLON')) {
            return true;
        }

        $pName = mb_strtolower(
            trim((string) ($product->product_name ?? '').' '.($product->product_name_bn ?? '')),
            'UTF-8'
        );

        return str_contains($pName, 'sufolon')
            || str_contains($pName, 'সুফলন')
            || str_contains($pName, 'শুফলন');
    }

    public static function sufolonAgreementMax(): float
    {
        try {
            return app(\App\Services\LoanWorkflowConfigService::class)->sufolonAgreementMax();
        } catch (\Throwable) {
            return self::SUFOLON_AGREEMENT_MAX;
        }
    }

    public static function guarantorMinAmount(): float
    {
        try {
            return app(\App\Services\LoanWorkflowConfigService::class)->guarantorMinAmount();
        } catch (\Throwable) {
            return self::GUARANTOR_MIN_AMOUNT;
        }
    }

    public static function bmCeiling(): float
    {
        try {
            return app(\App\Services\LoanWorkflowConfigService::class)->bmApprovalCeiling();
        } catch (\Throwable) {
            return self::BM_CEILING;
        }
    }

    public static function oneLakh(): float
    {
        try {
            return app(\App\Services\LoanWorkflowConfigService::class)->monthlyInvestigationMax();
        } catch (\Throwable) {
            return self::ONE_LAKH;
        }
    }

    /** Field Officer submit: weekly = Form 1, monthly = Form 5; Sufolon ≤ max = Form 1, > max = Form 5 */
    public static function foSubmitFormIds(?object $product, float $amount, ?object $category = null): array
    {
        if (self::isSufolon($product, $category)) {
            return $amount <= self::sufolonAgreementMax() ? [1] : [5];
        }

        if (self::isWeekly($product)) {
            try {
                $weeklyMin = app(\App\Services\LoanWorkflowConfigService::class)->weeklyApprovalFormMinAmount();
                if ($weeklyMin !== null && $weeklyMin > 0 && $amount >= $weeklyMin) {
                    return [5];
                }
            } catch (\Throwable) {
                // fall back to default
            }

            return [1];
        }

        return [5];
    }

    /** Guarantor Commitment (Form 2) is required only from this amount upward */
    public const GUARANTOR_MIN_AMOUNT = 20000.0;

    public const BM_CEILING = 70000.0;

    public const BM_FORM_INCOMPLETE_MESSAGE = 'অনুমোদন করার আগে সরেজমিন তদন্ত প্রতিবেদন (ফর্ম ৪) পূরণ করতে হবে।';

    /** Branch Manager before approve/forward: Form 4 is required only when loan amount is within BM ceiling (< 70,000 TK) */
    public static function bmRequiredFormIds(?object $product, float $amount, ?object $category = null): array
    {
        if ($amount >= self::bmCeiling()) {
            return [];
        }

        if (self::isSufolon($product, $category)) {
            if ($amount <= self::sufolonAgreementMax()) {
                return [4];
            }

            return $amount < self::oneLakh() ? [4] : [];
        }

        if (self::isWeekly($product)) {
            return [4];
        }

        return $amount < self::oneLakh() ? [4] : [];
    }

    public static function requiresGuarantorForm(float $amount): bool
    {
        return $amount >= self::guarantorMinAmount();
    }

    /**
     * Branch User before disburse. Form 2 (জামিনদার অঙ্গীকার) only at configured guarantor min amount or more.
     *
     * @return int[]
     */
    public static function disburseFormIds(float $amount): array
    {
        return self::requiresGuarantorForm($amount) ? [2, 3] : [3];
    }

    public static function disburseIncompleteMessage(float $amount): string
    {
        if (self::requiresGuarantorForm($amount)) {
            return 'বিতরণের আগে জামিনদার অঙ্গীকার (ফর্ম ২) ও মৃত্যুঝুঁকি তহবিল (ফর্ম ৩) পূরণ করতে হবে।';
        }

        return 'বিতরণের আগে মৃত্যুঝুঁকি তহবিল (ফর্ম ৩) পূরণ করতে হবে।';
    }

    /**
     * First required disbursement form that is not yet saved, or null when both are complete.
     */
    public static function nextDisburseFormId(array $formSaved, float $amount): ?int
    {
        foreach (self::disburseFormIds($amount) as $id) {
            if (! ($formSaved[$id] ?? false)) {
                return $id;
            }
        }

        return null;
    }

    /**
     * Where to send the user after saving a form in the disbursement wizard.
     * Form 2 always continues to form 3; form 3 returns to the show page to confirm disbursement.
     *
     * @param  array{member_id?: int|string|null, product_id?: int|string|null, category_id?: int|string|null, amount?: float|int|string|null, legacy?: bool|int|string|null}  $query
     * @return array{route: string, parameters: array<string, mixed>}
     */
    public static function disburseWizardNextLocation(int $savedFormId, int $applicationId, array $query = []): array
    {
        if ($savedFormId === 2) {
            $parameters = [
                'amount' => $query['amount'] ?? 0,
                'application_id' => $applicationId,
                'return' => 'disburse',
                'action' => 'disburse',
                'step' => 3,
            ];
            if (! empty($query['member_id'])) {
                $parameters['member_id'] = $query['member_id'];
            }
            if (! empty($query['product_id'])) {
                $parameters['product_id'] = $query['product_id'];
            }
            if (! empty($query['category_id'])) {
                $parameters['category_id'] = $query['category_id'];
            }
            if (! empty($query['legacy'])) {
                $parameters['legacy'] = 1;
            }

            return [
                'route' => 'member.loan-applications.forms.death-risk-fund',
                'parameters' => $parameters,
            ];
        }

        return [
            'route' => 'member.loan-applications.show',
            'parameters' => [
                'id' => $applicationId,
                'action' => 'disburse',
            ],
        ];
    }

    /**
     * Statuses where the loan has not been disbursed (or cancelled) yet.
     *
     * @return string[]
     */
    public static function preDisbursementStatuses(): array
    {
        return [
            LoanApplication::STATUS_DRAFT,
            LoanApplication::STATUS_PENDING,
            LoanApplication::STATUS_SUBMITTED,
            LoanApplication::STATUS_UNDER_REVIEW,
            LoanApplication::STATUS_READY_FOR_HEAD_OFFICE,
            LoanApplication::STATUS_PENDING_HEAD_OFFICE,
            LoanApplication::STATUS_APPROVED,
            LoanApplication::STATUS_PENDING_DISBURSEMENT,
            LoanApplication::STATUS_PENDING_AMOUNT_APPROVAL,
            LoanApplication::STATUS_REJECTED,
            LoanApplication::STATUS_NEEDS_CORRECTION,
        ];
    }

    public static function isBeforeDisbursement(string $status): bool
    {
        return in_array($status, self::preDisbursementStatuses(), true);
    }

    /**
     * Statuses where the application is still at branch (not yet received by Head Office).
     *
     * @return string[]
     */
    public static function preHeadOfficeStatuses(): array
    {
        return [
            LoanApplication::STATUS_DRAFT,
            LoanApplication::STATUS_PENDING,
            LoanApplication::STATUS_SUBMITTED,
            LoanApplication::STATUS_UNDER_REVIEW,
            LoanApplication::STATUS_READY_FOR_HEAD_OFFICE,
            LoanApplication::STATUS_REJECTED,
            LoanApplication::STATUS_NEEDS_CORRECTION,
        ];
    }

    public static function isBeforeHeadOffice(string $status): bool
    {
        return in_array($status, self::preHeadOfficeStatuses(), true);
    }

    /**
     * Who may change loan product, amount, and terms.
     * Branch users (accountants) and branch managers may edit in all statuses except disbursed and cancelled.
     * Privileged users (Head Office, Super Admin) may edit without branch-stage restrictions.
     * Field officers may edit only while the application is still a draft / sent back.
     */
    public static function canEditLoanDetails(?string $roleName, string $status, bool $isPrivileged = false): bool
    {
        if ($isPrivileged) {
            return true;
        }

        $roleName = strtolower((string) $roleName);

        if (in_array($status, [LoanApplication::STATUS_DISBURSED, LoanApplication::STATUS_CANCELLED], true)) {
            return false;
        }

        if (in_array($roleName, [Role::BRANCH_USER, Role::BRANCH_MANAGER], true)) {
            return true;
        }

        if ($roleName === Role::FIELD_OFFICER) {
            return in_array($status, [
                LoanApplication::STATUS_DRAFT,
                LoanApplication::STATUS_REJECTED,
                LoanApplication::STATUS_NEEDS_CORRECTION,
            ], true);
        }

        return false;
    }

    public static function loanDetailsDeniedMessage(string $status): string
    {
        if ($status === LoanApplication::STATUS_DISBURSED) {
            return 'ঋণ বিতরণ সম্পন্ন হওয়ার পর ঋণ বিবরণ পরিবর্তন করা যাবে না।';
        }

        if ($status === LoanApplication::STATUS_CANCELLED) {
            return 'বাতিল আবেদনের ঋণ বিবরণ পরিবর্তন করা যাবে না।';
        }

        return 'ঋণ বিবরণ পরিবর্তনের অনুমতি নেই।';
    }

    /**
     * Statuses where Branch Manager has not yet approved / forwarded (their submit).
     *
     * @return string[]
     */
    public static function bmPreSubmitStatuses(): array
    {
        return [
            LoanApplication::STATUS_DRAFT,
            LoanApplication::STATUS_REJECTED,
            LoanApplication::STATUS_NEEDS_CORRECTION,
            LoanApplication::STATUS_SUBMITTED,
            LoanApplication::STATUS_UNDER_REVIEW,
        ];
    }

    /**
     * Form IDs the current user may fill/edit at this application status.
     *
     * @return int[]
     */
    public static function editableFormIdsForUser(?string $roleName, string $status, ?object $product, float $amount, ?object $category = null): array
    {
        $roleName = strtolower((string) $roleName);

        // Branch User may edit every relevant form until the loan is disbursed.
        if ($roleName === Role::BRANCH_USER) {
            if (self::isBeforeDisbursement($status)) {
                return self::visibleFormIdsForShow($roleName, $status, $product, $amount, $category);
            }

            return [];
        }

        if ($status === LoanApplication::STATUS_PENDING_DISBURSEMENT) {
            if ($roleName === Role::BRANCH_MANAGER) {
                return self::disburseFormIds($amount);
            }

            return [];
        }

        // Branch Manager may edit every relevant form (including Guarantor / Death Risk)
        // until they approve or forward the application.
        if ($roleName === Role::BRANCH_MANAGER && in_array($status, self::bmPreSubmitStatuses(), true)) {
            return self::visibleFormIdsForShow($roleName, $status, $product, $amount, $category);
        }

        if (in_array($status, [LoanApplication::STATUS_DRAFT, LoanApplication::STATUS_REJECTED, LoanApplication::STATUS_NEEDS_CORRECTION], true)) {
            if ($roleName === Role::FIELD_OFFICER) {
                return self::foSubmitFormIds($product, $amount, $category);
            }
        }

        return [];
    }

    /**
     * Primary application form type stored on create / product change.
     * Weekly / Sufolon ≤99k → loan agreement (Form 1); otherwise Form 5.
     */
    public static function primaryFormType(?object $product, float $amount, ?object $category = null): string
    {
        $foForms = self::foSubmitFormIds($product, $amount, $category);

        return (($foForms[0] ?? 1) === 5) ? 'loan_application_approval' : 'loan_agreement';
    }

    /**
     * Overwrite product / amount / term fields on an already-saved form payload.
     * Member, signature, and narrative fields are kept.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public static function overlaySavedFormLoanTerms(
        int $formId,
        array $data,
        object $product,
        ?object $category,
        float $amount,
        int $installments,
        int $termMonths,
        float $serviceCharge,
        float $totalRepayable,
        float $installmentAmount,
        string $wordsAmount,
        string $wordsTotal,
        ?string $purpose = null,
    ): array {
        $productName = (string) ($product->product_name_bn ?: $product->product_name ?: '');
        $categoryName = (string) ($category?->category_name_bn ?: $category?->category_name ?: '');
        $interestRate = (float) ($product->interest_rate ?? $product->service_charge ?? 0);
        $amountWords = $wordsAmount !== '' ? $wordsAmount : '';
        $totalWords = $wordsTotal !== '' ? $wordsTotal : '';

        $loanInstFactor = (float) ($product->loan_installment_factor ?? 0);
        $intInstFactor = (float) ($product->interest_installment_factor ?? 0);
        $installmentTypeStr = strtolower((string) ($product->installment_type ?? 'monthly'));
        $isLumpProduct = $installmentTypeStr === 'lump_sum' || str_contains($installmentTypeStr, 'lump');
        $formTypeLabel = $isLumpProduct || $installments <= 1 ? 'এককালীন' : ($installmentTypeStr === 'weekly' ? 'সাপ্তাহিক কিস্তি' : 'মাসিক কিস্তি');

        if ($isLumpProduct || $installments <= 1) {
            $fPrin = (int) round($amount);
            $fSc = (int) round($serviceCharge);
            $fLastPrin = $fPrin;
            $fLastInst = (int) round($totalRepayable);
            $fLastSc = $fSc;
        } else {
            $fPrin = $loanInstFactor > 0 ? (int) round($amount * $loanInstFactor) : (int) round($amount / max(1, $installments));
            $fSc = $intInstFactor > 0 ? (int) round($amount * $intInstFactor) : (int) round($installmentAmount - $fPrin);
            $fLastPrin = (int) round($amount - $fPrin * ($installments - 1));
            $fLastInst = (int) round($totalRepayable - (int) round($installmentAmount) * ($installments - 1));
            if ($fLastInst <= 0) {
                $fLastInst = (int) round($installmentAmount);
            }
            $fLastSc = (int) round($fLastInst - $fLastPrin);
        }

        return match ($formId) {
            1 => array_merge($data, [
                'loan_amount' => $amount,
                'loan_amount_words' => $amountWords,
                'loan_category_name' => $categoryName,
                'loan_product_name' => $productName,
                'product_name' => $productName,
                'loan_duration_months' => $termMonths,
                'service_charge' => $serviceCharge,
                'service_charge_rate' => $interestRate > 0 ? (string) $interestRate : ($data['service_charge_rate'] ?? ''),
                'interest_rate' => $interestRate,
                'total_amount' => $totalRepayable,
                'number_of_installments' => $installments,
                'installment_amount' => $installmentAmount,
                'last_installment_amount' => $installmentAmount,
                ...($purpose !== null && $purpose !== '' ? ['loan_purpose' => $purpose] : []),
            ]),
            2 => array_merge($data, [
                'loan_amount' => round($totalRepayable),
                'loan_amount_words' => $totalWords,
            ]),
            3 => array_merge($data, [
                'loan_amount_received' => $amount,
                'loan_amount_words' => $amountWords,
            ]),
            4 => array_merge($data, [
                'current_loan_demand' => $amount,
                'recommended_loan_amount' => $amount,
            ]),
            5 => array_merge($data, [
                'form_variant' => (self::isSufolon($product, $category) && $amount > self::sufolonAgreementMax())
                    ? 'agrosor_profile'
                    : 'approval_form',
                'applied_loan_amount' => (string) $amount,
                'fund_applied_loan' => (string) $amount,
                'capital_applied_loan' => (string) $amount,
                'approval_amount_digits' => (string) $amount,
                'approval_amount_words' => $amountWords,
                'category_name' => $categoryName,
                'loan_duration_months' => (string) $termMonths,
                'loan_duration_label' => $termMonths.' মাস',
                'service_charge_rate' => $interestRate > 0 ? (string) $interestRate : ($data['service_charge_rate'] ?? ''),
                'installment_type' => $formTypeLabel,
                'installment_principal' => (string) $fPrin,
                'installment_service_charge' => (string) $fSc,
                'installment_total' => (string) (int) round($installmentAmount),
                'number_of_installments' => (string) $installments,
                'last_installment_amount' => (string) $fLastInst,
                'last_installment_principal' => (string) $fLastPrin,
                'last_installment_service_charge' => (string) $fLastSc,
                'total_principal' => (string) (int) round($amount),
                'total_service_charge' => (string) (int) round($serviceCharge),
                'total_payable' => (string) (int) round($totalRepayable),
                'est_loan_charge' => (string) (int) round($serviceCharge),
                ...($purpose !== null && $purpose !== '' ? ['loan_purpose' => $purpose, 'proposed_project_name' => $purpose] : []),
            ]),
            default => $data,
        };
    }

    /**
     * JSON columns for forms that must be cleared when the product/amount
     * no longer uses them (same set as creating a new loan).
     *
     * @param  int[]  $newVisibleFormIds
     * @return string[]
     */
    public static function formColumnsToClear(array $newVisibleFormIds): array
    {
        $columns = [];
        foreach ([1, 2, 3, 4, 5] as $formId) {
            if (in_array($formId, $newVisibleFormIds, true)) {
                continue;
            }

            $column = self::formIdToColumn($formId);
            if ($column !== null) {
                $columns[] = $column;
            }
        }

        return $columns;
    }

    /**
     * Form IDs required to be complete before an action.
     *
     * @return int[]
     */
    public static function requiredFormIdsForAction(string $action, ?object $product, float $amount, ?object $category = null): array
    {
        return match ($action) {
            'submit' => self::foSubmitFormIds($product, $amount, $category),
            'bm_approve', 'bm_forward' => self::bmRequiredFormIds($product, $amount, $category),
            'disburse' => self::disburseFormIds($amount),
            default => [],
        };
    }

    /**
     * All form IDs relevant for display on Show page.
     * Always show the full set for this product/amount so blank + filled forms
     * are available in one hub (FO / BM / disburse stages).
     *
     * @return int[]
     */
    public static function visibleFormIdsForShow(?string $roleName, string $status, ?object $product, float $amount, ?object $category = null): array
    {
        return array_values(array_unique(array_merge(
            self::foSubmitFormIds($product, $amount, $category),
            self::bmRequiredFormIds($product, $amount, $category),
            self::disburseFormIds($amount)
        )));
    }

    public static function formIdToColumn(int $formId): ?string
    {
        return match ($formId) {
            1 => 'loan_agreement_data',
            2 => 'guarantor_info',
            3 => 'nominee_info',
            4 => 'asset_info',
            5 => 'business_plan',
            default => null,
        };
    }

    public static function buildFormSavedMap(LoanApplication $application): array
    {
        return [
            1 => self::hasMeaningfulFormData($application->loan_agreement_data),
            2 => self::hasMeaningfulFormData($application->guarantor_info),
            3 => self::hasMeaningfulFormData($application->nominee_info),
            4 => self::hasMeaningfulFormData($application->asset_info),
            5 => self::hasMeaningfulFormData($application->business_plan),
        ];
    }

    public static function hasMeaningfulFormData(mixed $data): bool
    {
        if ($data === null || $data === '') {
            return false;
        }

        if (is_array($data)) {
            if (count($data) === 0) {
                return false;
            }
            foreach ($data as $value) {
                if (self::hasMeaningfulFormData($value)) {
                    return true;
                }
            }

            return false;
        }

        if (is_string($data)) {
            $trimmed = trim($data);

            return $trimmed !== '' && $trimmed !== 'null' && $trimmed !== '{}' && $trimmed !== '[]' && strlen($trimmed) >= 3;
        }

        if (is_object($data)) {
            return self::hasMeaningfulFormData((array) $data);
        }

        return $data !== null;
    }

    public static function allRequiredFormsSaved(array $requiredFormIds, array $formSaved): bool
    {
        return collect($requiredFormIds)->every(fn ($id) => $formSaved[$id] ?? false);
    }

    public static function assertBmFormsComplete(LoanApplication $loan): void
    {
        $loan->loadMissing(['loanProduct.loanCategory', 'loanCategory']);
        $product = $loan->loanProduct;
        $category = $loan->loanCategory ?? $product?->loanCategory;
        $amount = (float) ($loan->requested_amount ?? 0);
        $required = self::bmRequiredFormIds($product, $amount, $category);

        if ($required === []) {
            return;
        }

        $saved = self::buildFormSavedMap($loan);
        if (! self::allRequiredFormsSaved($required, $saved)) {
            throw new \Exception(self::BM_FORM_INCOMPLETE_MESSAGE);
        }
    }

    public static function isBmFormIncompleteMessage(?string $message): bool
    {
        if ($message === null || $message === '') {
            return false;
        }

        return $message === self::BM_FORM_INCOMPLETE_MESSAGE
            || str_contains($message, 'সরেজমিন তদন্ত প্রতিবেদন (ফর্ম ৪)');
    }
}
