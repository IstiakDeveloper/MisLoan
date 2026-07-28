<?php

namespace App\Support;

use App\Models\LoanApplication;
use App\Models\Role;

class LoanFormVisibility
{
    public const ONE_LAKH = 100000.0;

    public static function isWeekly(?object $product): bool
    {
        return strtolower((string) ($product->installment_type ?? 'monthly')) === 'weekly';
    }

    /** Field Officer submit: weekly = Form 1, monthly = Form 5 */
    public static function foSubmitFormIds(?object $product, float $amount): array
    {
        return self::isWeekly($product) ? [1] : [5];
    }

    /** Branch Manager before approve/forward: Form 4 when weekly or monthly < 1L */
    public static function bmRequiredFormIds(?object $product, float $amount): array
    {
        if (self::isWeekly($product)) {
            return [4];
        }

        return $amount < self::ONE_LAKH ? [4] : [];
    }

    /** Branch User before disburse */
    public static function disburseFormIds(): array
    {
        return [2, 3];
    }

    /**
     * Form IDs the current user may fill/edit at this application status.
     *
     * @return int[]
     */
    public static function editableFormIdsForUser(?string $roleName, string $status, ?object $product, float $amount): array
    {
        $roleName = strtolower((string) $roleName);

        if ($status === LoanApplication::STATUS_PENDING_DISBURSEMENT) {
            if (in_array($roleName, [Role::BRANCH_USER, Role::BRANCH_MANAGER], true)) {
                return self::disburseFormIds();
            }

            return [];
        }

        if (in_array($status, [LoanApplication::STATUS_SUBMITTED, LoanApplication::STATUS_UNDER_REVIEW], true)) {
            if ($roleName === Role::BRANCH_MANAGER) {
                return array_values(array_unique(array_merge(
                    self::foSubmitFormIds($product, $amount),
                    self::bmRequiredFormIds($product, $amount)
                )));
            }

            return [];
        }

        if (in_array($status, [LoanApplication::STATUS_DRAFT, LoanApplication::STATUS_REJECTED, LoanApplication::STATUS_NEEDS_CORRECTION], true)) {
            if ($roleName === Role::FIELD_OFFICER) {
                return self::foSubmitFormIds($product, $amount);
            }
            if (in_array($roleName, [Role::BRANCH_USER, Role::BRANCH_MANAGER], true)) {
                return self::foSubmitFormIds($product, $amount);
            }
        }

        return [];
    }

    /**
     * Form IDs required to be complete before an action.
     *
     * @return int[]
     */
    public static function requiredFormIdsForAction(string $action, ?object $product, float $amount): array
    {
        return match ($action) {
            'submit' => self::foSubmitFormIds($product, $amount),
            'bm_approve', 'bm_forward' => self::bmRequiredFormIds($product, $amount),
            'disburse' => self::disburseFormIds(),
            default => [],
        };
    }

    /**
     * All form IDs relevant for display on Show page (saved + editable).
     *
     * @return int[]
     */
    public static function visibleFormIdsForShow(?string $roleName, string $status, ?object $product, float $amount): array
    {
        $editable = self::editableFormIdsForUser($roleName, $status, $product, $amount);

        if ($status === LoanApplication::STATUS_DRAFT || $status === LoanApplication::STATUS_REJECTED) {
            return array_values(array_unique(array_merge(
                self::foSubmitFormIds($product, $amount),
                $editable
            )));
        }

        if (in_array($status, [LoanApplication::STATUS_SUBMITTED, LoanApplication::STATUS_UNDER_REVIEW], true)) {
            return array_values(array_unique(array_merge(
                self::foSubmitFormIds($product, $amount),
                self::bmRequiredFormIds($product, $amount)
            )));
        }

        if ($status === LoanApplication::STATUS_PENDING_DISBURSEMENT) {
            return array_values(array_unique(array_merge(
                self::foSubmitFormIds($product, $amount),
                self::bmRequiredFormIds($product, $amount),
                self::disburseFormIds()
            )));
        }

        return array_values(array_unique(array_merge(
            self::foSubmitFormIds($product, $amount),
            self::bmRequiredFormIds($product, $amount),
            self::disburseFormIds()
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
        $loan->loadMissing('loanProduct');
        $product = $loan->loanProduct;
        $amount = (float) ($loan->requested_amount ?? 0);
        $required = self::bmRequiredFormIds($product, $amount);

        if ($required === []) {
            return;
        }

        $saved = self::buildFormSavedMap($loan);
        if (! self::allRequiredFormsSaved($required, $saved)) {
            throw new \Exception('অনুমোদন/ফরওয়ার্ড করার আগে সরেজমিন তদন্ত প্রতিবেদন (ফর্ম ৪) পূরণ করতে হবে।');
        }
    }
}
