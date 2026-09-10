<?php

namespace App\Support;

use App\Models\Role;

class AdmissionFormVisibility
{
    /**
     * Statuses where FO / BM may still edit the admission form.
     *
     * @return string[]
     */
    public static function staffEditableStatuses(): array
    {
        return ['draft', 'submitted', 'under_review', 'needs_revision', 'rejected'];
    }

    /**
     * Branch User (accountant) and staff on cycle renewal / legacy admissions may edit
     * the admission form until a loan is disbursed.
     */
    public static function canEditAdmissionForm(
        ?string $roleName,
        string $status,
        bool $hasDisbursedLoan,
        bool $canManageAnyStatus = false,
        bool $isRenewalOrLegacy = false
    ): bool {
        if ($canManageAnyStatus) {
            return true;
        }

        if ($hasDisbursedLoan) {
            return false;
        }

        $roleName = strtolower((string) $roleName);

        if ($roleName === Role::BRANCH_USER) {
            return ! $hasDisbursedLoan;
        }

        if ($isRenewalOrLegacy && ! $hasDisbursedLoan) {
            return true;
        }

        return in_array($status, self::staffEditableStatuses(), true);
    }
}
