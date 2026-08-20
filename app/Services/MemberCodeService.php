<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\LoanMember;
use App\Models\MemberAdmission;
use App\Models\SavingsApplication;
use App\Models\TeamBasedApprovalItem;
use Illuminate\Database\Eloquent\Builder;

class MemberCodeService
{
    /**
     * Convert Bengali digits (০-৯) to English digits (0-9).
     */
    public static function toEnglishDigits(?string $input): string
    {
        if ($input === null || $input === '') {
            return '';
        }

        $bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
        $en = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

        return str_replace($bn, $en, (string) $input);
    }

    /**
     * Format 4-digit Branch Code (e.g. 1 -> '0001', '0042' -> '0042').
     */
    public static function formatBranchCode(mixed $branchCode): string
    {
        $clean = preg_replace('/\D/', '', self::toEnglishDigits((string) $branchCode));
        if ($clean === '') {
            return '0001';
        }

        return str_pad($clean, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Format 6-digit Member Serial (e.g. 65 -> '000065', 1 -> '000001').
     */
    public static function formatMemberSerial(mixed $serial): string
    {
        $clean = preg_replace('/\D/', '', self::toEnglishDigits((string) $serial));
        if ($clean === '') {
            return '000001';
        }

        return str_pad(substr($clean, -6), 6, '0', STR_PAD_LEFT);
    }

    /**
     * Combine 4-digit Branch Code and 6-digit Member Serial into 10-digit code.
     */
    public static function formatFullCode(mixed $branchCode, mixed $serial): string
    {
        return self::formatBranchCode($branchCode) . self::formatMemberSerial($serial);
    }

    /**
     * Resolve Branch Code string from branchId or branch object.
     */
    public static function resolveBranchCode(?int $branchId = null, mixed $branchObj = null): string
    {
        if ($branchObj && isset($branchObj->code) && !empty($branchObj->code)) {
            return self::formatBranchCode($branchObj->code);
        }

        if (!$branchId && auth()->check() && auth()->user()->branch_id) {
            $branchId = (int) auth()->user()->branch_id;
        }

        if ($branchId) {
            $branch = Branch::find($branchId);
            if ($branch && !empty($branch->code)) {
                return self::formatBranchCode($branch->code);
            }
        }

        return '0001';
    }

    /**
     * Normalize any user-supplied member code into exact 10-digit code:
     * 4-digit branch code + 6-digit zero-padded serial.
     * E.g. '65' or '৬৫' with branch 0001 -> '0001000065'.
     */
    public static function normalizeMemberCode(?string $input, ?int $branchId = null, mixed $branchCode = null): string
    {
        $clean = preg_replace('/\D/', '', self::toEnglishDigits($input));
        $resolvedBranchCode = $branchCode ? self::formatBranchCode($branchCode) : self::resolveBranchCode($branchId);

        if ($clean === '') {
            return self::generateNextMemberCode($branchId, $resolvedBranchCode);
        }

        // Exactly 10 digits
        if (strlen($clean) === 10) {
            // If it starts with the expected branch code, keep it
            if (str_starts_with($clean, $resolvedBranchCode)) {
                return $clean;
            }
            // If user explicitly entered a 10 digit code with a 4-digit branch prefix and 6-digit serial
            return $clean;
        }

        // If length is 6 or less (just the serial number e.g. 65 -> 000065)
        if (strlen($clean) <= 6) {
            return $resolvedBranchCode . str_pad($clean, 6, '0', STR_PAD_LEFT);
        }

        // If length is between 7 and 9 digits
        if (strlen($clean) > 4 && str_starts_with($clean, $resolvedBranchCode)) {
            $serial = substr($clean, 4);
            return $resolvedBranchCode . str_pad($serial, 6, '0', STR_PAD_LEFT);
        }

        // Fallback: treat last 6 as serial
        $serial = substr($clean, -6);
        return $resolvedBranchCode . str_pad($serial, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Generate next sequential 10-digit member code for a given branch.
     * Format: {4-digit branch code}{6-digit sequential serial}
     * E.g. 0001000001, 0001000002...
     */
    public static function generateNextMemberCode(?int $branchId = null, mixed $branchCode = null): string
    {
        $resolvedBranchCode = $branchCode ? self::formatBranchCode($branchCode) : self::resolveBranchCode($branchId);

        // Look for existing 10-digit codes for this branch
        $pattern = "^{$resolvedBranchCode}[0-9]{6}$";
        $lastAdmission = MemberAdmission::whereRaw("application_no REGEXP '{$pattern}'")
            ->orderByRaw('CAST(SUBSTRING(application_no, 5, 6) AS UNSIGNED) DESC')
            ->first();

        if ($lastAdmission && !empty($lastAdmission->application_no)) {
            $currentSerialStr = substr($lastAdmission->application_no, 4, 6);
            $nextSerialInt = ((int) $currentSerialStr) + 1;
            return $resolvedBranchCode . str_pad((string) $nextSerialInt, 6, '0', STR_PAD_LEFT);
        }

        // Check if there are any existing admissions for this branch with older format
        if ($branchId) {
            $legacyLast = MemberAdmission::where('branch_id', $branchId)
                ->whereRaw("application_no REGEXP '^[0-9]+$'")
                ->orderByRaw('CAST(application_no AS UNSIGNED) DESC')
                ->first();

            if ($legacyLast && is_numeric($legacyLast->application_no)) {
                $num = (int) $legacyLast->application_no;
                if ($num < 999999) {
                    $nextSerialInt = $num + 1;
                    return $resolvedBranchCode . str_pad((string) $nextSerialInt, 6, '0', STR_PAD_LEFT);
                }
            }
        }

        return $resolvedBranchCode . '000001';
    }

    /**
     * Apply member admission search filter on a Query Builder:
     * - Converts Bengali digits to English
     * - Searches partial code, names, phone, nid
     * - If query is <= 6 digits, also matches 6-digit zero-padded serial (e.g. 65 matches 0001000065).
     */
    public static function applyAdmissionSearch(Builder $query, string $search): void
    {
        $clean = self::toEnglishDigits(trim($search));
        if ($clean === '') {
            return;
        }

        $onlyDigits = preg_replace('/\D/', '', $clean);
        $padded6 = ($onlyDigits !== '' && strlen($onlyDigits) <= 6) ? str_pad($onlyDigits, 6, '0', STR_PAD_LEFT) : null;

        $query->where(function ($q) use ($clean, $padded6) {
            $q->where('application_no', 'like', "%{$clean}%")
              ->orWhere('applicant_name_en', 'like', "%{$clean}%")
              ->orWhere('applicant_name_bn', 'like', "%{$clean}%")
              ->orWhere('mobile_number', 'like', "%{$clean}%")
              ->orWhere('nid_number', 'like', "%{$clean}%");

            if ($padded6) {
                $q->orWhere('application_no', 'like', "%{$padded6}");
                $q->orWhere('application_no', 'like', "%{$padded6}%");
            }
        });
    }

    /**
     * Apply loan application search filter on a Query Builder:
     * - Searches loan application_no
     * - Searches member admission names, phone, nid, and member code (with 6-digit zero-padded support).
     */
    public static function applyLoanSearch(Builder $query, string $search): void
    {
        $clean = self::toEnglishDigits(trim($search));
        if ($clean === '') {
            return;
        }

        $onlyDigits = preg_replace('/\D/', '', $clean);
        $padded6 = ($onlyDigits !== '' && strlen($onlyDigits) <= 6) ? str_pad($onlyDigits, 6, '0', STR_PAD_LEFT) : null;

        $query->where(function ($q) use ($clean, $padded6) {
            $q->where('application_no', 'like', "%{$clean}%")
              ->orWhereHas('memberAdmission', function ($mq) use ($clean, $padded6) {
                  $mq->where('applicant_name_en', 'like', "%{$clean}%")
                     ->orWhere('applicant_name_bn', 'like', "%{$clean}%")
                     ->orWhere('mobile_number', 'like', "%{$clean}%")
                     ->orWhere('nid_number', 'like', "%{$clean}%")
                     ->orWhere('application_no', 'like', "%{$clean}%");

                  if ($padded6) {
                      $mq->orWhere('application_no', 'like', "%{$padded6}");
                      $mq->orWhere('application_no', 'like', "%{$padded6}%");
                  }
              });
        });
    }

    /**
     * Apply savings application search filter on a Query Builder:
     */
    public static function applySavingsSearch(Builder $query, string $search): void
    {
        $clean = self::toEnglishDigits(trim($search));
        if ($clean === '') {
            return;
        }

        $onlyDigits = preg_replace('/\D/', '', $clean);
        $padded6 = ($onlyDigits !== '' && strlen($onlyDigits) <= 6) ? str_pad($onlyDigits, 6, '0', STR_PAD_LEFT) : null;

        $query->where(function ($q) use ($clean, $padded6) {
            $q->where('application_no', 'like', "%{$clean}%")
              ->orWhereHas('memberAdmission', function ($mq) use ($clean, $padded6) {
                  $mq->where('applicant_name_en', 'like', "%{$clean}%")
                     ->orWhere('applicant_name_bn', 'like', "%{$clean}%")
                     ->orWhere('nid_number', 'like', "%{$clean}%")
                     ->orWhere('mobile_number', 'like', "%{$clean}%")
                     ->orWhere('application_no', 'like', "%{$clean}%");

                  if ($padded6) {
                      $mq->orWhere('application_no', 'like', "%{$padded6}");
                      $mq->orWhere('application_no', 'like', "%{$padded6}%");
                  }
              })
              ->orWhereHas('savingsProduct', function ($pq) use ($clean) {
                  $pq->where('product_name', 'like', "%{$clean}%")
                     ->orWhere('product_name_bn', 'like', "%{$clean}%");
              });
        });
    }

    /**
     * Push the live member code into every related loan form snapshot
     * (and matching savings / team-based rows) after application_no changes.
     */
    public static function syncRelatedRecords(
        int $memberAdmissionId,
        string $newCode,
        ?string $oldCode = null,
        ?string $memberName = null,
    ): void {
        $member = MemberAdmission::query()
            ->select(['id', 'application_no', 'applicant_name_bn', 'applicant_name_en', 'nid_number', 'mobile_number'])
            ->find($memberAdmissionId);

        if (! $member) {
            return;
        }

        $member->application_no = $newCode;
        if ($memberName) {
            $member->applicant_name_bn = $member->applicant_name_bn ?: $memberName;
        }

        self::syncCurrentCodeForMember($member, $oldCode);
    }

    /**
     * Write this member's current application_no onto all related loan forms and records.
     *
     * @return int Number of loan applications whose form JSON actually changed
     */
    public static function syncCurrentCodeForMember(MemberAdmission $member, ?string $oldCode = null): int
    {
        $newCode = trim((string) $member->application_no);
        if ($newCode === '') {
            return 0;
        }

        $memberName = $member->applicant_name_bn ?: $member->applicant_name_en;
        $updated = 0;
        $loans = LoanApplication::where('member_admission_id', $member->id)->get();

        foreach ($loans as $loan) {
            if (self::overlayMemberCodeOnLoanApplication($loan, $newCode, $memberName)) {
                $loan->save();
                $updated++;
            }
        }

        $loanIds = $loans->pluck('id')->filter()->all();
        if ($loanIds !== []) {
            LoanMember::whereIn('loan_application_id', $loanIds)->update([
                'member_code' => $newCode,
            ]);
        }

        SavingsApplication::where('member_admission_id', $member->id)->update([
            'member_no' => $newCode,
        ]);

        self::syncTeamBasedMemberCode($member, $newCode, $oldCode);

        return $updated;
    }

    /**
     * Backfill: push every member's current code onto their existing loan forms.
     *
     * @param  list<int>|null  $loanIds  When set, only members of these loan applications are synced.
     * @return array{members: int, loans: int}
     */
    public static function syncAllCurrentMemberCodes(?array $loanIds = null): array
    {
        $membersSynced = 0;
        $loansUpdated = 0;

        $query = MemberAdmission::query()
            ->select(['id', 'application_no', 'applicant_name_bn', 'applicant_name_en', 'nid_number', 'mobile_number'])
            ->whereNotNull('application_no')
            ->where('application_no', '!=', '')
            ->whereHas('loanApplications', function ($q) use ($loanIds) {
                if ($loanIds) {
                    $q->whereIn('id', $loanIds);
                }
            });

        $query->chunkById(50, function ($members) use (&$membersSynced, &$loansUpdated) {
            foreach ($members as $member) {
                $changed = self::syncCurrentCodeForMember($member);
                if ($changed > 0) {
                    $membersSynced++;
                    $loansUpdated += $changed;
                }
            }
        });

        return [
            'members' => $membersSynced,
            'loans' => $loansUpdated,
        ];
    }

    private static function syncTeamBasedMemberCode(MemberAdmission $member, string $newCode, ?string $oldCode): void
    {
        if ($oldCode && $oldCode !== $newCode) {
            TeamBasedApprovalItem::where('member_code', $oldCode)->update([
                'member_code' => $newCode,
            ]);
        }

        $itemQuery = TeamBasedApprovalItem::query()
            ->where(function ($q) use ($newCode) {
                $q->whereNull('member_code')->orWhere('member_code', '!=', $newCode);
            })
            ->where(function ($q) use ($member) {
                $matched = false;
                if (! empty($member->nid_number)) {
                    $q->orWhere('nid_number', $member->nid_number);
                    $matched = true;
                }
                if (! empty($member->mobile_number)) {
                    $q->orWhere('member_phone', $member->mobile_number);
                    $matched = true;
                }
                if (! $matched) {
                    $q->whereRaw('0 = 1');
                }
            });

        $itemQuery->update(['member_code' => $newCode]);
    }

    /**
     * Overlay the live member code onto saved loan-form JSON. Returns true if anything changed.
     */
    public static function overlayMemberCodeOnLoanApplication(
        LoanApplication $loan,
        string $newCode,
        ?string $memberName = null,
    ): bool {
        $dirty = false;

        $loan->loan_agreement_data = self::setJsonMemberCodeFields(
            $loan->loan_agreement_data,
            ['member_code' => $newCode],
            $dirty,
        );

        $loan->guarantor_info = self::setJsonMemberCodeFields(
            $loan->guarantor_info,
            ['member_code' => $newCode],
            $dirty,
        );

        $business = is_array($loan->business_plan) ? $loan->business_plan : null;
        if (is_array($business) && $business !== []) {
            $fields = ['member_code' => $newCode];
            $name = $memberName;
            if (! $name && is_string($business['member_name_code'] ?? null)) {
                $name = trim(explode(' / ', $business['member_name_code'], 2)[0]);
            }
            if ($name !== null && $name !== '') {
                $fields['member_name_code'] = $name.' / '.$newCode;
            }
            $loan->business_plan = self::setJsonMemberCodeFields($business, $fields, $dirty);
        }

        $loan->asset_info = self::setJsonMemberCodeFields(
            $loan->asset_info,
            ['member_no' => $newCode],
            $dirty,
        );

        $loan->nominee_info = self::setJsonMemberCodeFields(
            $loan->nominee_info,
            [
                'loan_recipient_code1' => $newCode,
                'loan_recipient_code2' => $newCode,
            ],
            $dirty,
        );

        $snapshot = $loan->legacy_member_snapshot;
        if (is_array($snapshot) && $snapshot !== []) {
            $loan->legacy_member_snapshot = self::setJsonMemberCodeFields(
                $snapshot,
                [
                    'application_no' => $newCode,
                    'member_code' => $newCode,
                ],
                $dirty,
            );
        }

        return $dirty;
    }

    /**
     * @param  array<string, mixed>|null  $data
     * @param  array<string, string>  $fields
     * @return array<string, mixed>|null
     */
    private static function setJsonMemberCodeFields(mixed $data, array $fields, bool &$dirty): mixed
    {
        if (! is_array($data) || $data === []) {
            return $data;
        }

        foreach ($fields as $key => $value) {
            if (($data[$key] ?? null) !== $value) {
                $data[$key] = $value;
                $dirty = true;
            }
        }

        return $data;
    }
}
