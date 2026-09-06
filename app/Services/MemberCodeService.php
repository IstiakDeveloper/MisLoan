<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\LoanMember;
use App\Models\MemberAdmission;
use App\Models\SavingsApplication;
use App\Models\TeamBasedApprovalItem;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

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
        return self::formatBranchCode($branchCode).self::formatMemberSerial($serial);
    }

    /**
     * Resolve Branch Code string from branchId or branch object.
     */
    public static function resolveBranchCode(?int $branchId = null, mixed $branchObj = null): string
    {
        if ($branchObj && isset($branchObj->code) && ! empty($branchObj->code)) {
            return self::formatBranchCode($branchObj->code);
        }

        if (! $branchId && auth()->check() && auth()->user()->branch_id) {
            $branchId = (int) auth()->user()->branch_id;
        }

        if ($branchId) {
            $branch = Branch::find($branchId);
            if ($branch && ! empty($branch->code)) {
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
            return $resolvedBranchCode.str_pad($clean, 6, '0', STR_PAD_LEFT);
        }

        // If length is between 7 and 9 digits
        if (strlen($clean) > 4 && str_starts_with($clean, $resolvedBranchCode)) {
            $serial = substr($clean, 4);

            return $resolvedBranchCode.str_pad($serial, 6, '0', STR_PAD_LEFT);
        }

        // Fallback: treat last 6 as serial
        $serial = substr($clean, -6);

        return $resolvedBranchCode.str_pad($serial, 6, '0', STR_PAD_LEFT);
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

        if ($lastAdmission && ! empty($lastAdmission->application_no)) {
            $currentSerialStr = substr($lastAdmission->application_no, 4, 6);
            $nextSerialInt = ((int) $currentSerialStr) + 1;

            return $resolvedBranchCode.str_pad((string) $nextSerialInt, 6, '0', STR_PAD_LEFT);
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

                    return $resolvedBranchCode.str_pad((string) $nextSerialInt, 6, '0', STR_PAD_LEFT);
                }
            }
        }

        return $resolvedBranchCode.'000001';
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
     * English digits → Bengali digits (০-৯). Used when matching stored codes.
     */
    public static function toBengaliDigits(?string $input): string
    {
        if ($input === null || $input === '') {
            return '';
        }

        $en = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        $bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

        return str_replace($en, $bn, (string) $input);
    }

    /**
     * Equivalent spellings of a stored member code (English/Bengali, 10-digit, serial).
     *
     * @return list<string>
     */
    public static function codeMatchVariants(?string $code): array
    {
        $raw = trim((string) $code);
        if ($raw === '') {
            return [];
        }

        $english = self::toEnglishDigits($raw);
        $digits = preg_replace('/\D/', '', $english) ?? '';
        $variants = [$raw, $english, $digits];

        if (strlen($digits) === 10) {
            $variants[] = $digits;
            $variants[] = self::toBengaliDigits($digits);
            $serial = substr($digits, 4, 6);
            $variants[] = $serial;
            $variants[] = ltrim($serial, '0') ?: '0';
        } elseif (strlen($digits) <= 6 && $digits !== '') {
            $padded = str_pad($digits, 6, '0', STR_PAD_LEFT);
            $variants[] = $padded;
            $variants[] = ltrim($padded, '0') ?: '0';
        }

        return array_values(array_unique(array_filter($variants, fn ($v) => $v !== '')));
    }

    /**
     * Assign a new application_no to one member and push that latest code
     * onto every related record. Another member may not keep the same code.
     *
     * @return array{ok: true, code: string}|array{ok: false, field: string, message: string}
     */
    public static function assignMemberCode(MemberAdmission $member, ?string $inputCode): array
    {
        if (! $member->relationLoaded('branch') && Schema::hasTable('branches')) {
            $member->load('branch');
        }

        $normalizedCode = self::normalizeMemberCode(
            $inputCode,
            $member->branch_id,
            $member->branch?->code
        );

        if (self::findConflictingAdmission($normalizedCode, (int) $member->id, $member->branch_id)) {
            return self::duplicateCodeFailure($normalizedCode);
        }

        $oldCode = $member->application_no;
        $memberName = $member->applicant_name_bn ?: $member->applicant_name_en;

        try {
            DB::transaction(function () use ($member, $normalizedCode, $oldCode, $memberName) {
                if ((string) $member->application_no !== $normalizedCode) {
                    $member->update([
                        'application_no' => $normalizedCode,
                    ]);
                }

                $member->refresh();

                self::syncRelatedRecords(
                    (int) $member->id,
                    $normalizedCode,
                    is_string($oldCode) ? $oldCode : null,
                    $memberName
                );
            });
        } catch (UniqueConstraintViolationException) {
            return self::duplicateCodeFailure($normalizedCode);
        }

        return [
            'ok' => true,
            'code' => $normalizedCode,
        ];
    }

    /**
     * Another member already using this 10-digit code, or the same serial in this branch.
     */
    public static function findConflictingAdmission(string $normalizedCode, int $excludeId, ?int $branchId = null): ?MemberAdmission
    {
        $fullVariants = self::fullCodeMatchVariants($normalizedCode);
        $serialVariants = self::serialCodeMatchVariants($normalizedCode);

        return MemberAdmission::query()
            ->where('id', '!=', $excludeId)
            ->where(function ($q) use ($normalizedCode, $fullVariants, $serialVariants, $branchId) {
                $q->where('application_no', $normalizedCode);

                if ($fullVariants !== []) {
                    $q->orWhereIn('application_no', $fullVariants);
                }

                if ($branchId && $serialVariants !== []) {
                    $q->orWhere(function ($inner) use ($branchId, $serialVariants) {
                        $inner->where('branch_id', $branchId)
                            ->whereIn('application_no', $serialVariants);
                    });
                }
            })
            ->first();
    }

    /**
     * @return array{ok: false, field: string, message: string}
     */
    private static function duplicateCodeFailure(string $normalizedCode): array
    {
        return [
            'ok' => false,
            'field' => 'member_code',
            'message' => "মেম্বার কোড {$normalizedCode} ইতিমধ্যে অন্য সদস্যের জন্য ব্যবহার করা হয়েছে।",
        ];
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
            ->select([
                'id',
                'application_no',
                'applicant_name_bn',
                'applicant_name_en',
                'nid_number',
                'smart_card_number',
                'mobile_number',
                'alternative_mobile',
            ])
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
            if (self::overlayMemberCodeOnLoanApplication($loan, $newCode, $memberName, $oldCode)) {
                $loan->save();
                $updated++;
            }
        }

        $loanIds = $loans->pluck('id')->filter()->values()->all();
        self::syncLoanMemberCodes($member, $newCode, $oldCode, $loanIds);
        self::syncSavingsMemberCode($member, $newCode, $oldCode, $memberName);
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
            ->select([
                'id',
                'application_no',
                'applicant_name_bn',
                'applicant_name_en',
                'nid_number',
                'smart_card_number',
                'mobile_number',
                'alternative_mobile',
            ])
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

    /**
     * @param  list<int>  $loanIds
     */
    private static function syncLoanMemberCodes(
        MemberAdmission $member,
        string $newCode,
        ?string $oldCode,
        array $loanIds,
    ): void {
        $oldVariants = ($oldCode && $oldCode !== $newCode) ? self::fullCodeMatchVariants($oldCode) : [];
        $serialVariants = ($oldCode && $oldCode !== $newCode) ? self::serialCodeMatchVariants($oldCode) : [];
        $memberName = trim((string) ($member->applicant_name_bn ?: $member->applicant_name_en ?: ''));

        $query = LoanMember::query()->where(function ($q) use ($loanIds, $oldVariants, $serialVariants, $member, $memberName) {
            $matched = false;

            if ($loanIds !== []) {
                $q->orWhereIn('loan_application_id', $loanIds);
                $matched = true;
            }

            if ($oldVariants !== []) {
                $q->orWhere(function ($inner) use ($oldVariants, $member) {
                    $inner->whereIn('member_code', $oldVariants)
                        ->whereHas('loanApplication', function ($lq) use ($member) {
                            $lq->where('member_admission_id', $member->id)
                                ->orWhereNull('member_admission_id');
                        });
                });
                $matched = true;
            }

            if ($serialVariants !== [] && $memberName !== '') {
                $q->orWhere(function ($inner) use ($serialVariants, $memberName) {
                    $inner->whereIn('member_code', $serialVariants)
                        ->where('member_name', $memberName);
                });
                $matched = true;
            }

            if (! $matched) {
                $q->whereRaw('0 = 1');
            }
        });

        $query->update(['member_code' => $newCode]);
    }

    private static function syncSavingsMemberCode(
        MemberAdmission $member,
        string $newCode,
        ?string $oldCode,
        ?string $memberName,
    ): void {
        $oldCodes = ($oldCode && $oldCode !== $newCode) ? self::fullCodeMatchVariants($oldCode) : [];

        $rows = SavingsApplication::where('member_admission_id', $member->id)->get();

        foreach ($rows as $saving) {
            $dirty = false;

            if ((string) $saving->member_no !== $newCode) {
                $saving->member_no = $newCode;
                $dirty = true;
            }

            $formData = is_array($saving->form_data) ? $saving->form_data : null;
            if (is_array($formData) && $formData !== []) {
                $saving->form_data = self::rewriteJsonMemberCodes(
                    $formData,
                    $oldCodes,
                    $newCode,
                    $memberName,
                    $dirty,
                );
                $saving->form_data = self::setJsonMemberCodeFields(
                    $saving->form_data,
                    ['member_no' => $newCode],
                    $dirty,
                );
            }

            if ($dirty) {
                $saving->save();
            }
        }
    }

    private static function syncTeamBasedMemberCode(MemberAdmission $member, string $newCode, ?string $oldCode): void
    {
        $fullVariants = ($oldCode && $oldCode !== $newCode)
            ? self::fullCodeMatchVariants($oldCode)
            : [];
        $serialVariants = ($oldCode && $oldCode !== $newCode)
            ? self::serialCodeMatchVariants($oldCode)
            : [];
        $memberName = trim((string) ($member->applicant_name_bn ?: $member->applicant_name_en ?: ''));

        if ($fullVariants !== []) {
            TeamBasedApprovalItem::whereIn('member_code', $fullVariants)->update([
                'member_code' => $newCode,
            ]);
        }

        if ($serialVariants !== [] && $memberName !== '') {
            TeamBasedApprovalItem::whereIn('member_code', $serialVariants)
                ->where(function ($q) use ($memberName) {
                    $q->where('member_name', $memberName)
                        ->orWhere('name_bn', $memberName);
                })
                ->update(['member_code' => $newCode]);
        }

        $nids = self::identityMatchVariants($member->nid_number, $member->smart_card_number);
        $phones = self::phoneMatchVariants($member->mobile_number, $member->alternative_mobile);

        $itemQuery = TeamBasedApprovalItem::query()
            ->where(function ($q) use ($newCode) {
                $q->whereNull('member_code')->orWhere('member_code', '!=', $newCode);
            })
            ->where(function ($q) use ($nids, $phones) {
                $matched = false;
                if ($nids !== []) {
                    $q->orWhereIn('nid_number', $nids);
                    $matched = true;
                }
                if ($phones !== []) {
                    $q->orWhereIn('member_phone', $phones);
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
        ?string $oldCode = null,
    ): bool {
        $dirty = false;
        $oldCodes = ($oldCode && $oldCode !== $newCode) ? self::fullCodeMatchVariants($oldCode) : [];

        foreach (self::loanJsonAttributes() as $attribute) {
            $value = $loan->{$attribute};
            if (! is_array($value) || $value === []) {
                continue;
            }

            $loan->{$attribute} = self::rewriteJsonMemberCodes(
                $value,
                $oldCodes,
                $newCode,
                $memberName,
                $dirty,
            );
        }

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
     * @return list<string>
     */
    private static function loanJsonAttributes(): array
    {
        return [
            'loan_agreement_data',
            'guarantor_info',
            'guarantors_list',
            'family_members',
            'nominee_info',
            'income_sources',
            'asset_info',
            'employment_details',
            'loan_usage_breakdown',
            'monthly_income_breakdown',
            'monthly_expense_breakdown',
            'asset_details',
            'liability_details',
            'risk_measures',
            'signatures',
            'conditions_met',
            'documents_submitted',
            'business_plan',
            'legacy_member_snapshot',
        ];
    }

    /**
     * Recursively replace stored member-code values and known identity keys.
     *
     * @param  list<string>  $oldCodes
     */
    public static function rewriteJsonMemberCodes(
        mixed $data,
        array $oldCodes,
        string $newCode,
        ?string $memberName,
        bool &$dirty,
    ): mixed {
        if (! is_array($data)) {
            $replaced = self::replaceOldMemberCodeString($data, $oldCodes, $newCode);
            if (is_string($data) && $replaced !== null) {
                $dirty = true;

                return $replaced;
            }

            return $data;
        }

        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $data[$key] = self::rewriteJsonMemberCodes($value, $oldCodes, $newCode, $memberName, $dirty);

                continue;
            }

            if (! is_string($value) && ! is_numeric($value)) {
                continue;
            }

            $asString = (string) $value;

            if (in_array((string) $key, self::memberCodeJsonKeys(), true) && $asString !== $newCode) {
                $data[$key] = $newCode;
                $dirty = true;

                continue;
            }

            if ((string) $key === 'member_name_code') {
                $name = $memberName ?: trim(explode(' / ', $asString, 2)[0]);
                $next = $name !== '' ? $name.' / '.$newCode : $newCode;
                if ($asString !== $next) {
                    $data[$key] = $next;
                    $dirty = true;
                }

                continue;
            }

            $replaced = self::replaceOldMemberCodeString($asString, $oldCodes, $newCode);
            if ($replaced !== null) {
                $data[$key] = $replaced;
                $dirty = true;
            }
        }

        return $data;
    }

    /**
     * @return list<string>
     */
    private static function memberCodeJsonKeys(): array
    {
        return [
            'member_code',
            'member_no',
            'loan_recipient_code1',
            'loan_recipient_code2',
        ];
    }

    /**
     * @param  list<string>  $oldCodes
     */
    private static function replaceOldMemberCodeString(mixed $value, array $oldCodes, string $newCode): ?string
    {
        if (! is_string($value) || $oldCodes === []) {
            return null;
        }

        foreach ($oldCodes as $old) {
            if ($old === '' || $old === $newCode) {
                continue;
            }

            if ($value === $old) {
                return $newCode;
            }

            $suffix = ' / '.$old;
            if (str_ends_with($value, $suffix)) {
                return substr($value, 0, -strlen($old)).$newCode;
            }
        }

        return null;
    }

    /**
     * Full 10-digit (and script) variants only — safe for global member_code matching.
     *
     * @return list<string>
     */
    private static function fullCodeMatchVariants(string $code): array
    {
        $all = self::codeMatchVariants($code);

        return array_values(array_filter($all, function (string $variant) {
            $variantDigits = preg_replace('/\D/', '', self::toEnglishDigits($variant)) ?? '';

            return strlen($variantDigits) === 10;
        }));
    }

    /**
     * Short serial spellings (e.g. 65 / 000065). Only used with a name match.
     *
     * @return list<string>
     */
    private static function serialCodeMatchVariants(string $code): array
    {
        $digits = preg_replace('/\D/', '', self::toEnglishDigits($code)) ?? '';
        if ($digits === '') {
            return [];
        }

        $serial = strlen($digits) === 10 ? substr($digits, 4, 6) : (strlen($digits) <= 6 ? str_pad($digits, 6, '0', STR_PAD_LEFT) : '');
        if ($serial === '') {
            return [];
        }

        $unpadded = ltrim($serial, '0') ?: '0';

        return array_values(array_unique(array_filter([
            $serial,
            $unpadded,
            self::toBengaliDigits($serial),
            self::toBengaliDigits($unpadded),
        ])));
    }

    /**
     * @return list<string>
     */
    private static function identityMatchVariants(?string ...$values): array
    {
        $out = [];
        foreach ($values as $value) {
            $raw = trim((string) $value);
            if ($raw === '' || $raw === '0') {
                continue;
            }
            $out[] = $raw;
            $digits = MemberAdmission::normalizeIdentityNumber($raw);
            if ($digits !== '' && $digits !== '0') {
                $out[] = $digits;
            }
        }

        return array_values(array_unique($out));
    }

    /**
     * @return list<string>
     */
    private static function phoneMatchVariants(?string ...$values): array
    {
        $out = [];
        foreach ($values as $value) {
            $raw = trim((string) $value);
            if ($raw === '') {
                continue;
            }
            $out[] = $raw;
            $normalized = MemberAdmission::normalizeMobileNumber($raw);
            if ($normalized !== '') {
                $out[] = $normalized;
            }
        }

        return array_values(array_unique($out));
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
