<?php

namespace App\Services;

use App\Models\LoanApplication;
use App\Models\LoanMember;
use App\Models\MemberAdmission;
use Carbon\Carbon;

class MemberAdmissionLoanSyncService
{
    /**
     * Push live admission identity onto every bound loan form snapshot.
     *
     * Each loan stays bound to this admission via member_admission_id.
     * Disbursed / cancelled loans are frozen. Empty form JSON is left alone
     * so the first open still hydrates from the live member.
     *
     * @return int Number of loan applications whose stored snapshots changed
     */
    public function syncBoundLoans(MemberAdmission $member): int
    {
        $member->loadMissing(['samity', 'familyMembers', 'otherAssets']);

        $loans = LoanApplication::query()
            ->where('member_admission_id', $member->id)
            ->whereNotIn('status', [
                LoanApplication::STATUS_DISBURSED,
                LoanApplication::STATUS_CANCELLED,
            ])
            ->get();

        $updated = 0;

        foreach ($loans as $loan) {
            if ($this->overlayOnLoan($loan, $member)) {
                $loan->save();
                $updated++;
            }
        }

        $this->syncLoanMembers($loans->pluck('id')->filter()->all(), $member);

        return $updated;
    }

    /**
     * Overlay admission-sourced fields onto a loan's JSON snapshots (in memory).
     */
    public function overlayOnLoan(LoanApplication $loan, MemberAdmission $member): bool
    {
        $dirty = false;

        $loan->loan_agreement_data = $this->overlayJson(
            $loan->loan_agreement_data,
            $this->agreementFields($member),
            $dirty,
        );
        $loan->guarantor_info = $this->overlayJson(
            $loan->guarantor_info,
            $this->guarantorFields($member),
            $dirty,
        );
        $loan->nominee_info = $this->overlayJson(
            $loan->nominee_info,
            $this->nomineeFields($member),
            $dirty,
        );
        $loan->asset_info = $this->overlayJson(
            $loan->asset_info,
            $this->investigationFields($member),
            $dirty,
        );
        $loan->business_plan = $this->overlayJson(
            $loan->business_plan,
            $this->approvalFields($member),
            $dirty,
        );

        $snapshot = $loan->legacy_member_snapshot;
        if (is_array($snapshot) && $snapshot !== []) {
            $loan->legacy_member_snapshot = $this->overlayJson(
                $snapshot,
                $this->snapshotFields($member),
                $dirty,
            );
        }

        $familyJson = $loan->family_members;
        if (is_array($familyJson) && $familyJson !== []) {
            $mapped = $this->mappedFamilyMembers($member);
            if ($mapped !== [] && $familyJson !== $mapped) {
                $loan->family_members = $mapped;
                $dirty = true;
            }
        }

        if ($member->samity_id && (int) $loan->samity_id !== (int) $member->samity_id) {
            $loan->samity_id = $member->samity_id;
            $dirty = true;
        }

        if ($member->monthly_income !== null && (string) $loan->monthly_income !== (string) $member->monthly_income) {
            $loan->monthly_income = $member->monthly_income;
            $dirty = true;
        }

        if ($member->monthly_expense !== null && (string) $loan->monthly_expense !== (string) $member->monthly_expense) {
            $loan->monthly_expense = $member->monthly_expense;
            $dirty = true;
        }

        return $dirty;
    }

    /**
     * @param  list<int>  $loanIds
     */
    private function syncLoanMembers(array $loanIds, MemberAdmission $member): void
    {
        if ($loanIds === []) {
            return;
        }

        $code = trim((string) $member->application_no);
        $name = $this->memberName($member);
        $samity = $member->samity;

        LoanMember::whereIn('loan_application_id', $loanIds)->update(array_filter([
            'member_code' => $code !== '' ? $code : null,
            'member_name' => $name !== '' ? $name : null,
            'member_mobile' => $member->mobile_number ?: null,
            'somiti_name' => $samity?->samity_name_bn ?: $samity?->samity_name,
            'somiti_code' => $samity?->samity_code,
            'project_name' => $member->project_name ?: null,
        ], fn ($v) => $v !== null));
    }

    /**
     * @param  array<string, mixed>|null  $data
     * @param  array<string, mixed>  $fields
     * @return array<string, mixed>|null
     */
    private function overlayJson(mixed $data, array $fields, bool &$dirty): mixed
    {
        if (! is_array($data) || $data === []) {
            return $data;
        }

        foreach ($fields as $key => $value) {
            if ($value === null) {
                continue;
            }

            if (($data[$key] ?? null) !== $value) {
                $data[$key] = $value;
                $dirty = true;
            }
        }

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    private function agreementFields(MemberAdmission $member): array
    {
        $code = $this->memberCode($member);
        $name = $this->memberName($member);
        $samity = $member->samity;

        return array_filter([
            'member_name_bn' => $name,
            'member_code' => $code,
            'father_husband_name' => $this->fatherOrSpouse($member),
            'mother_name' => $member->mother_name_bn ?: $member->mother_name_en,
            'nid_number' => $this->nid($member),
            'mobile_number' => $member->mobile_number,
            'samity_name' => $samity?->samity_name_bn ?: $samity?->samity_name,
            'samity_code' => $samity?->samity_code ?: (string) $samity?->id,
            'applicant_signature_image' => $member->applicant_signature_path,
        ], fn ($v) => $v !== null && $v !== '');
    }

    /**
     * @return array<string, mixed>
     */
    private function guarantorFields(MemberAdmission $member): array
    {
        $samity = $member->samity;

        return array_filter([
            'member_name' => $this->memberName($member),
            'member_father_or_spouse' => $this->fatherOrSpouse($member),
            'member_nid' => $this->nid($member),
            'member_mobile' => $member->mobile_number,
            'member_village' => $member->present_village_road ?: $member->permanent_village_road,
            'member_post_office' => $member->present_post_code ?: $member->permanent_post_code,
            'member_upazila' => $member->present_upazila ?: $member->permanent_upazila,
            'member_district' => $member->present_district ?: $member->permanent_district,
            'member_code' => $this->memberCode($member),
            'samity_name' => $samity?->samity_name_bn ?: $samity?->samity_name,
            'samity_code' => $samity?->samity_code ?: (string) $samity?->id,
        ], fn ($v) => $v !== null && $v !== '');
    }

    /**
     * @return array<string, mixed>
     */
    private function nomineeFields(MemberAdmission $member): array
    {
        $code = $this->memberCode($member);
        $samity = $member->samity;

        return array_filter([
            'loan_recipient_name' => $this->memberName($member),
            'loan_recipient_code1' => $code,
            'loan_recipient_code2' => $code,
            'samity_name' => $samity?->samity_name_bn ?: $samity?->samity_name,
            'village' => $member->present_village_road ?: $member->permanent_village_road,
            'post_office' => $member->present_post_code ?: $member->permanent_post_code,
            'upazila' => $member->present_upazila ?: $member->permanent_upazila,
            'district' => $member->present_district ?: $member->permanent_district,
            'age' => $this->age($member),
            'nid_number' => $this->nid($member),
            'mobile_number' => $member->mobile_number,
            'loan_recipient_photo' => $this->storageUrl($member->customer_photo_path),
            'guardian_photo' => $this->storageUrl($member->guardian_photo_path),
        ], fn ($v) => $v !== null && $v !== '');
    }

    /**
     * @return array<string, mixed>
     */
    private function investigationFields(MemberAdmission $member): array
    {
        $samity = $member->samity;
        $rooms = (int) $member->brick_house_count
            + (int) $member->semi_brick_house_count
            + (int) $member->tin_house_count
            + (int) $member->mud_house_count;
        $land = $member->total_land_amount ?: $member->cultivable_land_amount;
        $familyCount = $member->familyMembers->count();

        return array_filter([
            'member_name' => $this->memberName($member),
            'member_no' => $this->memberCode($member),
            'samity_name' => $samity?->samity_name_bn ?: $samity?->samity_name,
            'samity_code' => $samity?->samity_code ?: (string) $samity?->id,
            'nid_number' => $this->nid($member),
            'member_mobile' => $member->mobile_number,
            'main_profession' => $member->business_details ?: $member->job_details ?: $member->other_income_details,
            'family_members_count' => $familyCount > 0 ? $familyCount : null,
            'own_land_amount' => $this->positiveString($land),
            'land_value' => $this->positiveNumber($member->total_land_value ?: $member->cultivable_land_value),
            'house_type' => $member->house_type,
            'room_count' => $rooms > 0 ? $rooms : null,
            'cow_count' => $member->cow_buffalo_count,
            'goat_count' => $member->goat_sheep_count,
            'duck_chicken_count' => $member->duck_chicken_count,
            'other_organization_loans' => $member->other_loan_info,
            'comments' => $member->collector_comment,
            'member_signature' => $member->applicant_signature_path,
        ], fn ($v) => $v !== null && $v !== '');
    }

    /**
     * @return array<string, mixed>
     */
    private function approvalFields(MemberAdmission $member): array
    {
        $code = $this->memberCode($member);
        $name = $this->memberName($member);
        $samity = $member->samity;
        $self = $this->selfOccupationAndEducation($member);
        $project = (string) ($member->project_name ?: '');

        $fields = [
            'committee_name' => $samity?->samity_name_bn ?: $samity?->samity_name,
            'committee_code' => $samity?->samity_code ?: (string) $samity?->id,
            'member_name_detail' => $name,
            'member_code' => $code,
            'member_mobile' => $member->mobile_number,
            'age' => $this->age($member),
            'father_husband_name' => $this->fatherOrSpouse($member),
            'permanent_address_line1' => $member->permanent_village_road ?: $member->present_village_road,
            'permanent_address_line2' => $member->permanent_post_code ?: $member->present_post_code,
            'permanent_address_line3' => $this->upazilaDistrict(
                $member->permanent_upazila ?: $member->present_upazila,
                $member->permanent_district ?: $member->present_district,
            ),
            'current_address_line1' => $member->present_village_road ?: $member->permanent_village_road,
            'current_address_line2' => $member->present_post_code ?: $member->permanent_post_code,
            'current_address_line3' => $this->upazilaDistrict(
                $member->present_upazila ?: $member->permanent_upazila,
                $member->present_district ?: $member->permanent_district,
            ),
            'nid_smart_card' => $this->nid($member),
            'admission_date' => $this->dateString($member->admission_date),
            'family_members_count' => $member->familyMembers->count() ?: null,
            'project_name' => $project,
            'proposed_project_name' => $project,
            'est_main_income_desc' => $project,
            'loan_program_name' => $project,
            'occupation' => $self['occupation'],
            'educational_qualification' => $self['education'],
            'annual_net_profit' => $this->positiveString($member->estimated_annual_project_income),
            'member_name_code' => collect([$name, $code])->filter()->implode(' / '),
            'samity_name_code' => collect([
                $samity?->samity_name_bn ?: $samity?->samity_name,
                $samity?->samity_code,
            ])->filter()->implode(' / '),
            'implemented_project_name' => $project,
            'immovable_land_qty' => $this->positiveString($member->cultivable_land_amount),
            'immovable_land_value' => $this->positiveString($member->cultivable_land_value),
            'immovable_homestead_qty' => $this->positiveString($member->non_cultivable_land_amount),
            'immovable_homestead_value' => $this->positiveString($member->non_cultivable_land_value),
            'family_assets' => $this->familyAssets($member),
        ];

        return array_filter($fields, fn ($v) => $v !== null && $v !== '' && $v !== []);
    }

    /**
     * @return array<string, mixed>
     */
    private function snapshotFields(MemberAdmission $member): array
    {
        return array_filter([
            'application_no' => $this->memberCode($member),
            'member_code' => $this->memberCode($member),
            'applicant_name_bn' => $member->applicant_name_bn,
            'applicant_name_en' => $member->applicant_name_en,
            'father_name_bn' => $member->father_name_bn,
            'mother_name_bn' => $member->mother_name_bn,
            'spouse_name_bn' => $member->spouse_name_bn,
            'nid_number' => $member->nid_number,
            'smart_card_number' => $member->smart_card_number,
            'mobile_number' => $member->mobile_number,
            'present_village_road' => $member->present_village_road,
            'present_upazila' => $member->present_upazila,
            'present_district' => $member->present_district,
            'project_name' => $member->project_name,
        ], fn ($v) => $v !== null && $v !== '');
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function mappedFamilyMembers(MemberAdmission $member): array
    {
        return $member->familyMembers->map(fn ($row) => [
            'member_name' => $row->member_name,
            'relation_with_head' => $row->relation_with_head,
            'gender' => $row->gender,
            'age_years' => $row->age_years,
            'age_months' => $row->age_months,
            'marital_status' => $row->marital_status,
            'education_level' => $row->education_level,
            'occupation' => $row->occupation,
            'monthly_income' => $row->monthly_income,
        ])->values()->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function familyAssets(MemberAdmission $member): array
    {
        $assets = $member->otherAssets->values();
        $movable = function (int $i) use ($assets): array {
            $row = $assets->get($i);

            return [
                'movable_desc' => $row->asset_description ?? '',
                'movable_value' => $row && $row->estimated_value !== null
                    ? (string) (int) round((float) $row->estimated_value)
                    : '',
            ];
        };

        $rows = [
            [
                'fixed_quantity' => $this->positiveString($member->cultivable_land_amount) ?: '',
                'fixed_value' => $this->positiveString($member->cultivable_land_value) ?: '',
                ...$movable(0),
            ],
            [
                'fixed_quantity' => $this->positiveString($member->non_cultivable_land_amount) ?: '',
                'fixed_value' => $this->positiveString($member->non_cultivable_land_value) ?: '',
                ...$movable(1),
            ],
        ];

        for ($i = 2; $i < $assets->count(); $i++) {
            $rows[] = [
                'fixed_quantity' => '',
                'fixed_value' => '',
                ...$movable($i),
            ];
        }

        return $rows;
    }

    /**
     * @return array{occupation: string, education: string}
     */
    private function selfOccupationAndEducation(MemberAdmission $member): array
    {
        $self = $member->familyMembers->first(function ($row) {
            $rel = trim((string) $row->relation_with_head);

            return in_array($rel, ['নিজ', 'নিজে', 'self', 'Self', 'আবেদনকারী'], true);
        });

        $occupation = trim((string) ($self?->occupation ?: $member->business_details ?: $member->job_details ?: ''));
        $education = trim((string) ($self?->education_level ?: ''));

        return ['occupation' => $occupation, 'education' => $education];
    }

    private function memberName(MemberAdmission $member): string
    {
        return trim((string) ($member->applicant_name_bn ?: $member->applicant_name_en ?: ''));
    }

    private function memberCode(MemberAdmission $member): string
    {
        return trim((string) $member->application_no);
    }

    private function fatherOrSpouse(MemberAdmission $member): string
    {
        return trim((string) ($member->father_name_bn ?: $member->spouse_name_bn ?: $member->father_name_en ?: ''));
    }

    private function nid(MemberAdmission $member): string
    {
        $nid = trim((string) $member->nid_number);
        if ($nid !== '' && $nid !== '0') {
            return $nid;
        }

        $smart = trim((string) $member->smart_card_number);

        return ($smart !== '' && $smart !== '0') ? $smart : '';
    }

    private function age(MemberAdmission $member): string
    {
        if (! $member->date_of_birth) {
            return '';
        }

        try {
            $age = Carbon::parse($member->date_of_birth)->age;

            return $age >= 0 ? (string) $age : '';
        } catch (\Throwable) {
            return '';
        }
    }

    private function dateString(mixed $value): string
    {
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d');
        }

        return $value ? (string) $value : '';
    }

    private function upazilaDistrict(?string $upazila, ?string $district): string
    {
        return collect([$upazila, $district])->filter()->implode(', ');
    }

    private function positiveString(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_numeric($value) && (float) $value <= 0) {
            return null;
        }

        return (string) $value;
    }

    private function positiveNumber(mixed $value): ?float
    {
        if ($value === null || $value === '' || ! is_numeric($value)) {
            return null;
        }

        $n = (float) $value;

        return $n > 0 ? $n : null;
    }

    private function storageUrl(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }

        if (str_starts_with($path, 'http') || str_starts_with($path, '/storage/')) {
            return $path;
        }

        return '/storage/'.$path;
    }
}
