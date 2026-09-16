<?php

function savingsApplicationFormSource(): string
{
    return (string) file_get_contents(
        resource_path('js/pages/Member/SavingsApplications/Forms/SavingsApplicationForm.tsx')
    );
}

test('the term savings form never uploads signatures', function () {
    $form = savingsApplicationFormSource();

    expect($form)
        ->not->toContain('applicant_signature')
        ->not->toContain('officer_signature')
        ->not->toContain('accountant_signature')
        ->not->toContain('branch_manager_signature')
        ->toContain('আবেদনকারীর স্বাক্ষর')
        ->toContain('সব স্বাক্ষর ছাপানো ফর্মে হাতে নেওয়া হবে');
});

test('nominees keep a single default row with their own stamp size photo', function () {
    $form = savingsApplicationFormSource();

    expect($form)
        ->toContain('Math.max(nominees.length, 1)')
        ->not->toContain('rowSpan={nomineeRowCount}')
        ->toContain('alt={`নমিনি ${idx + 1}`}')
        ->toContain("width: '38px', height: '48px'");
});

test('profession and source of income default to the member admission values', function () {
    $form = savingsApplicationFormSource();

    expect($form)
        ->toContain("import { selfOccupation } from '@/utils/memberFamilyInfo'")
        ->toContain('profession: existingApplication?.profession || selfOccupation(memberAdmission)')
        ->toContain("source_of_income: existingApplication?.source_of_income || memberAdmission?.project_name || ''");
});

test('the create page loads the family columns needed for profession, education and age defaults', function (string $column) {
    $controller = (string) file_get_contents(
        app_path('Http/Controllers/Member/SavingsApplicationController.php')
    );

    preg_match("/'familyMembers:([^']+)'/", $controller, $matches);

    expect($matches[1] ?? '')->toContain($column);
})->with(['relation_with_head', 'sl_no', 'occupation', 'education_level', 'age_years']);
