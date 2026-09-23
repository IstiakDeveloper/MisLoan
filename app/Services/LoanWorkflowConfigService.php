<?php

namespace App\Services;

use App\Models\Role;
use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

class LoanWorkflowConfigService
{
    public const SETTING_KEY = 'loan_workflow_configuration';

    public const CACHE_KEY = 'settings.loan_workflow_configuration';

    // Default Fallbacks
    public const DEFAULT_BM_APPROVAL_CEILING = 70000.0;

    public const DEFAULT_SUFOLON_AGREEMENT_MAX = 99000.0;

    public const DEFAULT_GUARANTOR_MIN_AMOUNT = 20000.0;

    public const DEFAULT_BM_INVESTIGATION_CEILING = 70000.0;

    public const DEFAULT_MONTHLY_INVESTIGATION_MAX = 100000.0;

    /**
     * Default role ceilings (null = unlimited)
     */
    public const DEFAULT_ROLE_CEILINGS = [
        Role::BRANCH_MANAGER => 70000.0,
        Role::AREA_MANAGER => null,
        Role::ZONE_MANAGER => null,
        Role::ADMF => null,
        Role::DMF => null,
        Role::ED => null,
    ];

    /**
     * Get the full configuration array with defaults merged.
     *
     * @return array{
     *     bm_approval_ceiling: float,
     *     sufolon_agreement_max: float,
     *     guarantor_min_amount: float,
     *     bm_investigation_ceiling: float,
     *     monthly_investigation_max: float,
     *     role_ceilings: array<string, ?float>
     * }
     */
    public function get(): array
    {
        $stored = Cache::rememberForever(self::CACHE_KEY, function () {
            $raw = Setting::query()->where('key', self::SETTING_KEY)->value('value');
            if (! is_string($raw) || trim($raw) === '') {
                return null;
            }

            $decoded = json_decode($raw, true);

            return is_array($decoded) ? $decoded : null;
        });

        return $this->mergeWithDefaults($stored ?? []);
    }

    public function bmApprovalCeiling(): float
    {
        $config = $this->get();

        return (float) ($config['bm_approval_ceiling'] ?? self::DEFAULT_BM_APPROVAL_CEILING);
    }

    public function sufolonAgreementMax(): float
    {
        $config = $this->get();

        return (float) ($config['sufolon_agreement_max'] ?? self::DEFAULT_SUFOLON_AGREEMENT_MAX);
    }

    public function guarantorMinAmount(): float
    {
        $config = $this->get();

        return (float) ($config['guarantor_min_amount'] ?? self::DEFAULT_GUARANTOR_MIN_AMOUNT);
    }

    public function bmInvestigationCeiling(): float
    {
        $config = $this->get();

        return (float) ($config['bm_investigation_ceiling'] ?? self::DEFAULT_BM_INVESTIGATION_CEILING);
    }

    public function monthlyInvestigationMax(): float
    {
        $config = $this->get();

        return (float) ($config['monthly_investigation_max'] ?? self::DEFAULT_MONTHLY_INVESTIGATION_MAX);
    }

    /**
     * Minimum loan amount for weekly loans to require the 4-page Approval Form (null = monthly only / as current default).
     */
    public function weeklyApprovalFormMinAmount(): ?float
    {
        $config = $this->get();

        return isset($config['weekly_approval_form_min_amount']) && is_numeric($config['weekly_approval_form_min_amount'])
            ? (float) $config['weekly_approval_form_min_amount']
            : null;
    }

    /**
     * Get ceiling for a given role (null means unlimited).
     */
    public function roleCeiling(?string $roleName): ?float
    {
        if ($roleName === null || $roleName === '') {
            return null;
        }

        $config = $this->get();
        $ceilings = $config['role_ceilings'] ?? [];

        if (array_key_exists($roleName, $ceilings)) {
            $val = $ceilings[$roleName];

            return $val !== null ? (float) $val : null;
        }

        if ($roleName === Role::BRANCH_MANAGER) {
            return $this->bmApprovalCeiling();
        }

        return null;
    }

    /**
     * Update settings and invalidate cache.
     *
     * @param  array<string, mixed>  $input
     */
    public function update(array $input): void
    {
        $current = $this->get();

        $bmCeiling = isset($input['bm_approval_ceiling']) && is_numeric($input['bm_approval_ceiling'])
            ? (float) $input['bm_approval_ceiling']
            : $current['bm_approval_ceiling'];

        $sufolonMax = isset($input['sufolon_agreement_max']) && is_numeric($input['sufolon_agreement_max'])
            ? (float) $input['sufolon_agreement_max']
            : $current['sufolon_agreement_max'];

        $guarantorMin = isset($input['guarantor_min_amount']) && is_numeric($input['guarantor_min_amount'])
            ? (float) $input['guarantor_min_amount']
            : $current['guarantor_min_amount'];

        $investigationCeiling = isset($input['bm_investigation_ceiling']) && is_numeric($input['bm_investigation_ceiling'])
            ? (float) $input['bm_investigation_ceiling']
            : $current['bm_investigation_ceiling'];

        $monthlyInvMax = isset($input['monthly_investigation_max']) && is_numeric($input['monthly_investigation_max'])
            ? (float) $input['monthly_investigation_max']
            : $current['monthly_investigation_max'];

        $weeklyApprovalFormMin = isset($input['weekly_approval_form_min_amount']) && is_numeric($input['weekly_approval_form_min_amount'])
            ? (float) $input['weekly_approval_form_min_amount']
            : (array_key_exists('weekly_approval_form_min_amount', $input) && ($input['weekly_approval_form_min_amount'] === null || $input['weekly_approval_form_min_amount'] === '') ? null : $current['weekly_approval_form_min_amount']);

        $roleCeilings = $current['role_ceilings'];
        if (isset($input['role_ceilings']) && is_array($input['role_ceilings'])) {
            foreach ($input['role_ceilings'] as $role => $val) {
                if ($val === null || $val === '' || $val === 'unlimited') {
                    $roleCeilings[$role] = null;
                } elseif (is_numeric($val)) {
                    $roleCeilings[$role] = (float) $val;
                }
            }
        }

        // Keep branch_manager role_ceiling in sync with bm_approval_ceiling
        $roleCeilings[Role::BRANCH_MANAGER] = $bmCeiling;

        $payload = [
            'bm_approval_ceiling' => $bmCeiling,
            'sufolon_agreement_max' => $sufolonMax,
            'guarantor_min_amount' => $guarantorMin,
            'bm_investigation_ceiling' => $investigationCeiling,
            'monthly_investigation_max' => $monthlyInvMax,
            'weekly_approval_form_min_amount' => $weeklyApprovalFormMin,
            'role_ceilings' => $roleCeilings,
        ];

        Setting::query()->updateOrCreate(
            ['key' => self::SETTING_KEY],
            ['value' => json_encode($payload)]
        );

        Cache::forget(self::CACHE_KEY);
        Cache::forever(self::CACHE_KEY, $payload);
    }

    /**
     * Reset settings to hardcoded defaults.
     */
    public function resetToDefaults(): void
    {
        Setting::query()->where('key', self::SETTING_KEY)->delete();
        Cache::forget(self::CACHE_KEY);
    }

    /**
     * Export as shared array for Inertia / frontend components.
     *
     * @return array<string, mixed>
     */
    public function toSharedArray(): array
    {
        $config = $this->get();

        return [
            'bm_approval_ceiling' => $config['bm_approval_ceiling'],
            'sufolon_agreement_max' => $config['sufolon_agreement_max'],
            'guarantor_min_amount' => $config['guarantor_min_amount'],
            'bm_investigation_ceiling' => $config['bm_investigation_ceiling'],
            'monthly_investigation_max' => $config['monthly_investigation_max'],
            'weekly_approval_form_min_amount' => $config['weekly_approval_form_min_amount'],
            'role_ceilings' => $config['role_ceilings'],
            'defaults' => [
                'bm_approval_ceiling' => self::DEFAULT_BM_APPROVAL_CEILING,
                'sufolon_agreement_max' => self::DEFAULT_SUFOLON_AGREEMENT_MAX,
                'guarantor_min_amount' => self::DEFAULT_GUARANTOR_MIN_AMOUNT,
                'bm_investigation_ceiling' => self::DEFAULT_BM_INVESTIGATION_CEILING,
                'monthly_investigation_max' => self::DEFAULT_MONTHLY_INVESTIGATION_MAX,
                'weekly_approval_form_min_amount' => null,
                'role_ceilings' => self::DEFAULT_ROLE_CEILINGS,
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $stored
     * @return array{
     *     bm_approval_ceiling: float,
     *     sufolon_agreement_max: float,
     *     guarantor_min_amount: float,
     *     bm_investigation_ceiling: float,
     *     monthly_investigation_max: float,
     *     weekly_approval_form_min_amount: ?float,
     *     role_ceilings: array<string, ?float>
     * }
     */
    protected function mergeWithDefaults(array $stored): array
    {
        $roleCeilings = self::DEFAULT_ROLE_CEILINGS;
        if (isset($stored['role_ceilings']) && is_array($stored['role_ceilings'])) {
            foreach ($stored['role_ceilings'] as $role => $ceiling) {
                $roleCeilings[$role] = ($ceiling !== null && is_numeric($ceiling)) ? (float) $ceiling : null;
            }
        }

        $bmCeiling = isset($stored['bm_approval_ceiling']) && is_numeric($stored['bm_approval_ceiling'])
            ? (float) $stored['bm_approval_ceiling']
            : self::DEFAULT_BM_APPROVAL_CEILING;

        $roleCeilings[Role::BRANCH_MANAGER] = $bmCeiling;

        return [
            'bm_approval_ceiling' => $bmCeiling,
            'sufolon_agreement_max' => isset($stored['sufolon_agreement_max']) && is_numeric($stored['sufolon_agreement_max'])
                ? (float) $stored['sufolon_agreement_max']
                : self::DEFAULT_SUFOLON_AGREEMENT_MAX,
            'guarantor_min_amount' => isset($stored['guarantor_min_amount']) && is_numeric($stored['guarantor_min_amount'])
                ? (float) $stored['guarantor_min_amount']
                : self::DEFAULT_GUARANTOR_MIN_AMOUNT,
            'bm_investigation_ceiling' => isset($stored['bm_investigation_ceiling']) && is_numeric($stored['bm_investigation_ceiling'])
                ? (float) $stored['bm_investigation_ceiling']
                : self::DEFAULT_BM_INVESTIGATION_CEILING,
            'monthly_investigation_max' => isset($stored['monthly_investigation_max']) && is_numeric($stored['monthly_investigation_max'])
                ? (float) $stored['monthly_investigation_max']
                : self::DEFAULT_MONTHLY_INVESTIGATION_MAX,
            'weekly_approval_form_min_amount' => isset($stored['weekly_approval_form_min_amount']) && is_numeric($stored['weekly_approval_form_min_amount'])
                ? (float) $stored['weekly_approval_form_min_amount']
                : null,
            'role_ceilings' => $roleCeilings,
        ];
    }
}
