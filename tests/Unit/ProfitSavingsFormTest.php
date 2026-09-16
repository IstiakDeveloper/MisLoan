<?php

use App\Support\SavingsFormVisibility;

function profitSavingsFormSource(): string
{
    return (string) file_get_contents(
        resource_path('js/pages/Member/SavingsApplications/Forms/ProfitSavingsForm.tsx')
    );
}

test('the profit savings form keeps every field of the paper application', function () {
    $form = profitSavingsFormSource();

    expect($form)
        ->toContain('স্বেচ্ছা সঞ্চয়/মাসিক মুনাফা/দ্বিগুণ মুনাফা প্রকল্পের আবেদনপত্র')
        ->toContain('উকিলপাড়া, নওগাঁ।')
        ->toContain('শাখার নাম')
        ->toContain('আবেদনের তারিখ')
        ->toContain('সদস্য কোড নম্বর')
        ->toContain('সমিতি কোড নম্বর')
        ->toContain('মাতার নাম')
        ->toContain('শিক্ষাগত যোগ্যতা')
        ->toContain('বৈবাহিক অবস্থা')
        ->toContain('জাতীয় পরিচয় পত্র নম্বর')
        ->toContain('মাসিক উদ্বৃত্ত')
        ->toContain('নমিনি সংক্রান্ত তথ্য')
        ->toContain('অঙ্গীকার নামা (মৌসুমী মাসিক ও দ্বিগুণ মুনাফা প্রকল্পের ক্ষেত্রে প্রযোজ্য)')
        ->toContain('অফিসারের স্বাক্ষর ও সিল')
        ->toContain('হিসাবরক্ষকের স্বাক্ষর ও সিল')
        ->toContain('শাখা ব্যবস্থাপকের স্বাক্ষর ও সিল');
});

test('the three schemes of the paper form are driven by the selected product', function () {
    $form = profitSavingsFormSource();

    expect($form)
        ->toContain("voluntary: 'স্বেচ্ছা সঞ্চয়'")
        ->toContain("monthly_profit: 'মৌসুমী মাসিক মুনাফা প্রকল্প'")
        ->toContain("double_profit: 'মৌসুমী দ্বিগুণ মুনাফা প্রকল্প'")
        ->toContain('export function schemeFromProduct')
        ->toContain("name.includes('mdbs')")
        ->toContain('scheme === \'double_profit\' ? amount * 2 : 0');
});

test('the printed term is derived from the term saved on the application', function () {
    $form = profitSavingsFormSource();

    expect($form)
        ->toContain('const DOUBLE_PROFIT_TERM_MONTHS = 77')
        ->toContain("const DOUBLE_PROFIT_TERM_LABEL = '৬ বছর ৫ মাস'")
        ->toContain('const label = monthsToBanglaTerm(data.duration_months)')
        ->toContain("prev.scheme === 'double_profit' ? label : prev.double_profit_term_label");
});

test('the profit savings form takes signatures by hand and one nominee row by default', function () {
    $form = profitSavingsFormSource();

    expect($form)
        ->not->toContain('applicant_signature')
        ->not->toContain('officer_signature')
        ->toContain('সব স্বাক্ষর ও সিল ছাপানো ফর্মে হাতে নেওয়া হবে')
        ->toContain('Math.max(nominees.length, 1)')
        ->toContain('alt={`নমিনি ${idx + 1}`}');
});

test('member admission values prefill the profit savings form', function () {
    $form = profitSavingsFormSource();

    expect($form)
        ->toContain("import { selfAge, selfEducation, selfOccupation } from '@/utils/memberFamilyInfo'")
        ->toContain('education: selfEducation(memberAdmission)')
        ->toContain('age: selfAge(memberAdmission)')
        ->toContain('profession: existingApplication?.profession || selfOccupation(memberAdmission)')
        ->toContain('marital_status: MARITAL_STATUS_BN[');
});

test('the family info helper reads education, age and profession from the admission family table', function () {
    $helper = (string) file_get_contents(
        resource_path('js/utils/memberFamilyInfo.ts')
    );

    expect($helper)
        ->toContain("const SELF_RELATIONS = ['নিজ', 'নিজে', 'self']")
        ->toContain('row?.relation_with_head')
        ->toContain('Number(row?.sl_no) === 1')
        ->toContain('education_level')
        ->toContain('age_years')
        ->toContain('occupation')
        ->toContain('ageFromDateOfBirth(member?.date_of_birth)');
});

test('the create page renders the profit savings form for category 24 and 25 products', function () {
    $create = (string) file_get_contents(
        resource_path('js/pages/Member/SavingsApplications/Create.tsx')
    );
    $controller = (string) file_get_contents(
        app_path('Http/Controllers/Member/SavingsApplicationController.php')
    );

    expect($create)
        ->toContain("import ProfitSavingsForm from './Forms/ProfitSavingsForm'")
        ->toContain("formType === 'profit_savings' ? ProfitSavingsForm : SavingsApplicationForm");

    expect($controller)
        ->toContain("'formType' => SavingsFormVisibility::formType(")
        ->and(SavingsFormVisibility::FORM_PROFIT_SAVINGS)->toBe('profit_savings');
});
