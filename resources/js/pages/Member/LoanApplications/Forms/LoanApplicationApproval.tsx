import { useState, useEffect } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Save, Printer, Upload, X, ArrowLeft } from 'lucide-react';

// Comprehensive interface for all form data
interface LoanApplicationApprovalData {
    // Page 1: Basic Application Info (জাগরণ/বুনিয়াদ/অগ্রসর)
    application_date: string;
    loan_approval_date: string;
    loan_disbursement_date: string;
    loan_repayment_date: string;
    application_time: string;
    branch_name: string;
    center_name: string;
    member_name: string;
    applicant_name_bn: string;
    applicant_name_en: string;
    applicant_photo: string | null;
    proposer_photo: string | null;
    member_code: string;
    recipient_to: string;       // বরাবর
    authority_medium: string;  // মাধ্যম: যথাযথ কর্তৃপক্ষ
    committee_name: string;    // সমিতির নাম
    committee_code: string;   // সমিতি কোড
    years_involved: string;    // গত ... বছর
    admission_date: string;    // সমিতিতে ভর্তির তারিখ
    previous_loan_times: string;
    previous_loan_amount: string;
    last_repaid_loan_amount: string;
    last_repaid_project_name: string;
    loan_proposal_date: string;
    project_name: string;
    project_manpower: string;
    project_income_1_2_yr: string;
    project_expense_1_2_yr: string;
    annual_net_profit: string;
    capital_own: string;
    capital_applied_loan: string;
    approval_amount_digits: string;
    approval_amount_words: string;
    // পারিবারিক সম্পদ (স্থাবর ও অস্থাবর) - 4 rows
    family_assets: Array<{
        fixed_quantity: string;
        fixed_value: string;
        movable_desc: string;
        movable_value: string;
    }>;
    approver_signature: string | null;  // অনুমোদনকারীর স্বাক্ষর ও সিল
    
    // Page 1: Personal Details (26 fields)
    member_name_detail: string;
    father_husband_name: string;
    mother_name: string;
    date_of_birth: string;
    age: number;
    nationality: string;
    occupation: string;
    educational_qualification: string;
    religion: string;
    mobile_number: string;
    alternative_mobile: string;
    nid_smart_card: string;
    id_card_number: string;
    gender: string;
    current_address_line1: string;
    current_address_line2: string;
    current_address_line3: string;
    permanent_address_line1: string;
    permanent_address_line2: string;
    permanent_address_line3: string;
    has_poverty_certificate: boolean;
    voter_id_number: string;
    family_members_count: number;
    earning_members_count: number;  // পরিবারের উপার্জনক্ষম সদস্য সংখ্যা
    male_count: number;
    female_count: number;
    marital_status: string; // 'married' | 'unmarried'
    is_freedom_fighter: boolean;
    is_widow_divorced: boolean;
    is_ethnic_minority: boolean;
    is_physically_disabled: boolean;
    current_loan_amount: number;
    other_loan_source: string;
    
    // Page 1: Property Details Table
    property_details: Array<{
        land_area_decimal: string;
        house_type_rooms: string;
        fridge_tv: string;
        total_assets_taka: string;
    }>;
    
    // Page 1: Income Details Table
    income_sources: Array<{
        source: string;
        monthly_income: number;
    }>;
    total_income: number;
    
    // Page 1: Proposer Details
    proposer_member_code: string;
    proposer_name: string;
    proposer_father_husband: string;
    proposer_address: string;
    proposer_nid: string;
    proposer_signature_date: string;
    
    // Page 1: Recommender Details
    recommender_name: string;
    recommender_father_husband: string;
    recommender_address: string;
    recommender_nid: string;
    recommender_signature_date: string;
    
    // Page 1: General Manager Recommendation
    gm_recommendation: string;
    gm_date: string;
    gm_signature: string | null;
    
    // Page 1: Applicant Signature
    applicant_signature_date: string;
    applicant_signature: string | null;
    
    // Page 2: জাগরণ/বুনিয়াদ/অগ্রসর ঋণের প্রোফাইল
    // ক. উদ্যোগ বিষয়ক সাধারণ তথ্যাবলী
    proposed_project_name: string;  // প্রস্তাবিত প্রকল্পের নাম
    entrepreneur_fulltime_years: string;  // সার্বক্ষণিক: বছর
    entrepreneur_fulltime_months: string;  // সার্বক্ষণিক: মাস
    entrepreneur_parttime_years: string;  // খণ্ডকালীন: বছর
    entrepreneur_parttime_months: string;  // খণ্ডকালীন: মাস
    loan_experience_years: string;  // ঋণ কার্যক্রমে অভিজ্ঞতা: বছর
    loan_experience_months: string;  // ঋণ কার্যক্রমে অভিজ্ঞতা: মাস
    project_manpower_total: string;  // প্রকল্পে নিয়োগকৃত লোকবল (মোট)
    project_manpower_family: string;  // (ক) পরিবারের মধ্য হতে
    project_manpower_outside: string;  // (খ) পরিবারের বাইরে
    project_manpower_trained: string;  // (গ) প্রশিক্ষণপ্রাপ্ত লোকবল
    raw_material_purchase_location: string;  // ব্যবহৃত কাঁচামাল ক্রয়ের স্থান
    product_marketing_location: string;  // উৎপাদিত পণ্য বাজারজাতকরণের স্থান
    last_year_capital: string;  // বিগত ০১ বছরের পুঁজির পরিমাণ
    last_year_sales: string;  // বিগত ০১ বছরের বিক্রয়
    last_year_profit_loss: string;  // বিগত ০১ বছরের মোট লাভ/ক্ষতি
    license1_authority: string;  // লাইসেন্স ১: প্রদানকারী কর্তৃপক্ষ
    license1_number: string;  // লাইসেন্স ১: নম্বর
    license1_validity: string;  // লাইসেন্স ১: মেয়াদ
    license2_authority: string;  // লাইসেন্স ২: প্রদানকারী কর্তৃপক্ষ
    license2_number: string;  // লাইসেন্স ২: নম্বর
    license2_validity: string;  // লাইসেন্স ২: মেয়াদ
    has_income_tax_clearance: boolean;  // আয়কর প্রত্যয়ন আছে কি?
    
    // খ. আর্থিক তথ্য বিবরণী সমূহ
    total_loans_taken: string;  // সদস্য এ' পর্যন্ত ... দফায় ঋণ গ্রহণ করেছে
    last_three_loans: Array<{  // সর্বশেষ ৩ দফার ঋণ
        loan_number: string;  // দফা নং
        loan_date: string;  // ঋণ গ্রহণের তারিখ
        loan_amount: string;  // গৃহীত ঋণের পরিমাণ
        project_name: string;  // প্রকল্পের নাম
        savings_status: string;  // সঞ্চয় স্থিতি
    }>;
    other_ongoing_loans: Array<{  // অন্যান্য উৎস থেকে গৃহীত ঋণ (চলমান)
        organization_name: string;  // সংস্থা/প্রতিষ্ঠানের নাম (ব্র্যাক, দাবী, ব্যুরো বাংলাদেশ, আরডিআরএস/বেডো, ব্যাংক, বা অন্যান্য)
        current_loan_amount: string;  // বর্তমান গৃহীত ঋণের পরিমাণ
        loan_term: string;  // ঋণের মেয়াদ
        info_provider_name: string;  // তথ্য প্রদানকারীর নাম
        mobile_number: string;  // মোবাইল নম্বর
        remarks: string;  // মন্তব্য
    }>;
    investment_plan_sources: Array<{  // বিনিয়োগের পরিকল্পনা: তহবিলের উৎস
        source: string;  // তহবিলের উৎস
        amount: string;  // টাকার পরিমাণ
    }>;
    investment_plan_uses: Array<{  // বিনিয়োগের পরিকল্পনা: তহবিলের ব্যবহার
        use: string;  // তহবিলের ব্যবহার
        amount: string;  // টাকার পরিমাণ
    }>;
    
    // Page 2: Old fields (keeping for backward compatibility, but Page 2 will use new structure)
    verification_name: string;
    verification_father_husband: string;
    verification_village: string;
    verification_post_office: string;
    verification_upazila: string;
    verification_district: string;
    
    // Page 2: Family Income Sources Table
    family_income_sources: Array<{
        source: string;
        monthly_income: number;
    }>;
    total_family_income: number;
    
    // Page 2: Family Expenditure Sources Table
    family_expenditure_sources: Array<{
        source: string;
        monthly_expenditure: number;
    }>;
    total_family_expenditure: number;
    
    // Page 2: Land and Assets Table
    land_assets_details: Array<{
        land_area_decimal: string;
        house_type: string;
        other_assets: string;
        total_asset_value: number;
    }>;
    
    // Page 2: Verification Checklist (9 questions)
    verification_checklist: {
        is_other_ngo_member: boolean;
        wants_to_use_loan_for_other: boolean;
        unwilling_to_repay: boolean;
        has_case_against: boolean;
        has_bad_reputation: boolean;
        has_criminal_record: boolean;
        is_loan_defaulter: boolean;
        has_dispute: boolean;
        other_issues: boolean;
    };
    
    // Page 2: Other Loan Information Table
    other_loans: Array<{
        ngo_name: string;
        loan_amount: number;
        paid_amount: number;
        remaining_amount: number;
    }>;
    
    // Page 2: Investigating Officer Signature
    investigating_officer_signature_date: string;
    investigating_officer_signature: string | null;
    
    // Page 3: উদ্যোগের ১/১.৫/২ বছর এর সম্ভাব্য আয়-ব্যয় হিসাব
    // ০৪. উদ্যোগের আয়-ব্যয় হিসাব
    initiative_expenses: Array<{  // উদ্যোগ পরিচালনা ব্যয়
        category: string;  // (ক) কর্মচারীর বেতন ভাতা বাবদ, (খ) পরিবহন বাবদ, etc.
        amount: string;  // টাকার পরিমাণ
    }>;
    initiative_main_income: string;  // উদ্যোগের মূল আয় (মূল আয়ের খাত উল্লেখ করতে হবে)
    initiative_other_income: string;  // অন্যান্য আয় (খাত উল্লেখ করতে হবে)
    initiative_total_expenditure: string;  // মোট ব্যয়
    initiative_net_profit: string;  // নিট লাভ/উদ্বৃত্ত
    initiative_expenditure_percentage: string;  // উদ্যোগের মোট আয়ের ...% ব্যয় হবে
    initiative_profit_percentage: string;  // উদ্যোগের মোট আয়ের ...% নিট লাভ থাকবে
    
    // গ. অন্যান্য তথ্যাবলী
    // ০১. ঋণের মেয়াদ ও সার্ভিস চার্জ
    loan_term_months: string;  // (ক) ঋণের মেয়াদ
    loan_service_charge_rate: string;  // (খ) আরোপিত ঋণের সার্ভিস চার্জের হার (%)
    repayment_schedule_monthly_principal: string;  // মাসিক কিস্তি: আসল
    repayment_schedule_monthly_service_charge: string;  // মাসিক কিস্তি: সার্ভিস চার্জ
    repayment_schedule_monthly_total: string;  // মাসিক কিস্তি: মোট
    repayment_schedule_total_principal: string;  // মোট পরিশোধের পরিমাণ: আসল
    repayment_schedule_total_service_charge: string;  // মোট পরিশোধের পরিমাণ: সার্ভিস চার্জ
    repayment_schedule_total_amount: string;  // মোট পরিশোধের পরিমাণ: মোট
    
    // ০২. জামিনদারের তথ্য
    guarantors: Array<{  // ১ম ও ২য় জামিনদার
        name: string;  // জামিনদারের নাম
        address: string;  // ঠিকানা
        mobile_number: string;  // মোবাইল নম্বর
        relationship_with_borrower: string;  // ঋণীর সাথে সম্পর্ক
        occupation: string;  // পেশা
        monthly_income: string;  // মাসিক আয়
        asset_amount: string;  // জামিনদারের সম্পদের পরিমাণ
        estimated_value: string;  // সম্ভাব্য মূল্য
        interviewer_name: string;  // সাক্ষাতকারীর নাম
        interviewer_designation: string;  // পদবী: বিএম/আরএম/জেডএম
    }>;
    
    // ০৩. ঋণী ও জামিনদার সম্পর্কে তথ্য প্রদানকারী
    information_providers: Array<{  // ১ম ও ২য় জন
        name: string;  // তথ্য প্রদানকারীর নাম
        address: string;  // ঠিকানা
        mobile_number: string;  // মোবাইল নম্বর
        relationship_with_borrower: string;  // ঋণীর সাথে সম্পর্ক
        occupation: string;  // পেশা
        loan_related_info: string;  // ঋণ সংক্রান্ত তথ্য
        asset_related_info: string;  // সম্পদ সংক্রান্ত তথ্য
        overall_remarks: string;  // তথ্য প্রদানকারীর সার্বিক মন্তব্য
    }>;
    
    // Page 3: Old fields (keeping for backward compatibility)
    family_members: Array<{
        name: string;
        relationship: string;
        age: number;
        gender: string;
        education: string;
        occupation: string;
        monthly_income: number;
    }>;
    
    // Page 3: Family Status
    family_marital_status: string;
    children_count: number;
    has_spouse: boolean;
    has_other_loans: boolean;
    family_mobile: string;
    family_email: string;
    family_address: string;
    family_occupation: string;
    family_monthly_income: number;
    family_nid: string;
    passport_number: string;
    has_electricity: boolean;
    toilet_system: string;
    drinking_water_source: string;
    has_disabled_member: boolean;
    has_freedom_fighter: boolean;
    has_ethnic_minority: boolean;
    
    // Page 3: Land Details (Own)
    own_land_details: Array<{
        land_type: string;
        area_decimal: string;
        current_value: number;
    }>;
    
    // Page 3: Land Details (Leased)
    leased_land_details: Array<{
        land_type: string;
        area_decimal: string;
        current_value: number;
    }>;
    
    // Page 3: Economic Status
    annual_income: number;
    annual_expenditure: number;
    savings_amount: number;
    loan_purpose: string;
    loan_amount: number;
    loan_installment_count: number;
    loan_term: string;
    monthly_installment: number;
    has_repayment_capacity: boolean;
    is_unwilling_to_repay: boolean;
    has_mortgage_cosigner: boolean;
    mortgage_cosigner_name: string;
    mortgage_cosigner_address: string;
    mortgage_cosigner_nid: string;
    mortgage_cosigner_mobile: string;
    borrower_situation_analysis: string;
    
    // Page 3: Risk Analysis (Percentages)
    risk_analysis: {
        income_source_percentage: number;
        previous_loan_percentage: number;
        social_impact_percentage: number;
        socio_economic_percentage: number;
        project_productivity_percentage: number;
        other_percentage: number;
        total_risk_percentage: number;
    };
    
    // Page 3: Investigating Officer Signature (Page 3)
    investigating_officer_signature_date_page3: string;
    investigating_officer_signature_page3: string | null;
    
    // Page 4: I. Applicant Details (Continued)
    // ০৪. চাকরিজীবীর ক্ষেত্রে (প্রযোজ্য ক্ষেত্রে)
    employee_workplace_name: string;  // কর্মস্থলের নাম
    employee_monthly_salary: string;  // মাসিক বেতন
    employee_received_in_hand: string;  // হাতে প্রাপ্তি
    employee_other_income: string;  // অন্যান্য খাতের আয়
    employee_approver_presence_date_time: string;  // কর্মস্থলে ঋণ অনুমোদনকারীর উপস্থিতির তারিখ ও সময়
    employee_who_was_present: string;  // সাথে কে ছিলো
    employee_salary_bank: string;  // যে ব্যাংকে বেতন হয়
    employee_bank_statement_verified_amount: string;  // ব্যাংক স্টেটমেন্ট যাচাই অনুযায়ী হাতে বেতন পাওয়ার পরিমাণ
    
    // ০৫. প্রবাসী সদস্যের রেমিটেন্স এর তথ্য
    expatriate_monthly_income: string;  // মাসিক আয়
    expatriate_channel: string;  // যে চ্যানেলে আসে
    expatriate_confirmation_source: string;  // যা দেখে নিশ্চিত হলেন
    expatriate_country: string;  // প্রবাসী সদস্য যে দেশে থাকে
    expatriate_years_abroad: string;  // কতো বছর ধরে থাকে
    expatriate_work_permit_verified: boolean;  // ওয়ার্ক পারমিট যাচাই (হ্যাঁ/না)
    
    // ০৬. প্রকল্পে পরিবেশ ও আইনগত জটিলতা
    has_environmental_legal_complexity: boolean;  // আছে কি-না (হ্যাঁ/না)
    
    // ০৭. ঝুঁকি প্রতিরোধের উপায়
    has_disaster_management_experience: boolean;  // দুর্যোগ মোকাবিলার অভিজ্ঞতা (আছে/নাই)
    has_credit_sales: boolean;  // বাকিতে বিক্রয়ের পরিমাণ/হার (আছে/নাই)
    
    // ০৮. ভবিষ্যতে ক্ষুদ্র উদ্যোগ বিষয়ে পরিকল্পনা
    future_small_venture_plans: string;  // ভবিষ্যতে ক্ষুদ্র উদ্যোগ বিষয়ে কি ধরণের পরিকল্পনা রয়েছে?
    
    // ০৯. কর্মসংস্থান সংক্রান্ত তথ্য
    employment_data: Array<{  // ঋণ কার্যক্রমের নাম অনুযায়ী
        loan_activity_name: string;  // ঋণ কার্যক্রমের নাম
        self_employment_fulltime_female: string;  // ১. স্ব-কর্মসংস্থান/পারিবারিক: পূর্ণকালীন: মহিলা
        self_employment_fulltime_male: string;  // ২. স্ব-কর্মসংস্থান/পারিবারিক: পূর্ণকালীন: পুরুষ
        self_employment_parttime_female: string;  // ৩. স্ব-কর্মসংস্থান/পারিবারিক: খণ্ডকালীন: মহিলা
        self_employment_parttime_male: string;  // ৪. স্ব-কর্মসংস্থান/পারিবারিক: খণ্ডকালীন: পুরুষ
        wage_employment_fulltime_female: string;  // ৫. মজুরি ভিত্তিক: পূর্ণকালীন: মহিলা
        wage_employment_fulltime_male: string;  // ৬. মজুরি ভিত্তিক: পূর্ণকালীন: পুরুষ
        wage_employment_parttime_female: string;  // ৭. মজুরি ভিত্তিক: খণ্ডকালীন: মহিলা
        wage_employment_parttime_male: string;  // ৮. মজুরি ভিত্তিক: খণ্ডকালীন: পুরুষ
        total_fulltime: string;  // ৯ = ১+২+৫+৬ (মোট: পূর্ণ সময়)
        total_parttime: string;  // ১০ = ৩+৪+৭+৮ (মোট: আংশিক সময়)
    }>;
    
    // সদস্যের স্বাক্ষর
    member_signature_page4: string | null;  // সদস্যের স্বাক্ষর
    member_mobile_digits: string[];  // সদস্যের মোবাইল নং (11 boxes)
    profile_filler_signature: string | null;  // প্রোফাইল পূরণকারীর স্বাক্ষর ও সিল
    
    // II. ঘ. সংস্থার অফিস পর্যায়ে পূরণীয়
    officer_post_inspection_comments: string;  // (ক) অফিসারের পরিদর্শনোত্তর মন্তব্য
    officer_post_inspection_signature: string | null;  // অফিসারের স্বাক্ষর ও সিল
    branch_manager_post_inspection_comments: string;  // (খ) শাখা ব্যবস্থাপকের পরিদর্শনোত্তর মন্তব্য
    branch_manager_post_inspection_signature: string | null;  // শাখা ব্যবস্থাপকের স্বাক্ষর ও সিল
    regional_manager_post_inspection_comments: string;  // (গ) আঞ্চলিক ব্যবস্থাপকের পরিদর্শনোত্তর মন্তব্য
    regional_manager_post_inspection_signature: string | null;  // আঞ্চলিক ব্যবস্থাপকের স্বাক্ষর ও সিল
    zonal_manager_post_inspection_comments: string;  // (ঘ) জোনাল ম্যানেজারের পরিদর্শনোত্তর মন্তব্য
    zonal_manager_post_inspection_signature: string | null;  // জোনাল ম্যানেজারের স্বাক্ষর ও সিল
    final_approver_comments: string;  // (ঙ) সংস্থার চূড়ান্ত অনুমোদনকারীর মন্তব্য
    final_approved_loan_amount_digits: string;  // অনুমোদিত ঋণের পরিমাণ (টাকা)
    final_approved_loan_amount_words: string;  // অনুমোদিত ঋণের পরিমাণ (কথায়)
    final_approver_signature: string | null;  // চূড়ান্ত অনুমোদনকারীর স্বাক্ষর ও সিল
    
    // Page 4: Old fields (keeping for backward compatibility)
    risk_analysis_table: Array<{
        serial_no: number;
        description: string;
        full_marks: number;
        obtained_marks: number;
        remarks: string;
    }>;
    total_marks: number;
    
    // Page 4: Recommendation
    loan_proposal: string;
    proposed_loan_amount: number;
    proposed_member_name: string;
    proposed_amount: number;
    proposal_date: string;
    proposal_signature: string | null;
    proposal_investigating_officer_signature_date: string;
    
    // Page 4: Loan Approval and Disbursement
    approval_committee_date_time: string;
    approved_for_disbursement: boolean;
    not_disbursed: boolean;
    disbursement_date_time: string;
    approving_officer_signature_date: string;
    approving_officer_signature: string | null;
    
    // Page 4: Mortgage and Co-signer Details
    mortgage_name: string;
    mortgage_father_name: string;
    mortgage_mother_name: string;
    mortgage_address: string;
    mortgage_occupation: string;
    mortgage_mobile: string;
    mortgage_nid: string;
    mortgage_signature_date: string;
    branch_manager_signature_date: string;
    branch_manager_signature: string | null;
    
    // Page 4: Bank Account Details
    bank_account_number: string;
    bank_name: string;
    bank_branch_name: string;
    account_type: string;
    account_opening_date: string;
    cheque_number: string;
    swift_code: string;
    ifsc_code: string;
    bank_applicant_signature_date: string;
    bank_branch_manager_signature_date: string;
    
    // Page 4: Review Checklist (15 questions)
    review_checklist: {
        is_organization_member: boolean;
        age_between_18_65: boolean;
        is_poor: boolean;
        is_loan_defaulter: boolean;
        has_valid_nid: boolean;
        has_bank_account: boolean;
        has_proper_address: boolean;
        has_income_source: boolean;
        can_repay_loan: boolean;
        has_guarantor: boolean;
        has_proper_documents: boolean;
        has_no_criminal_case: boolean;
        has_good_reputation: boolean;
        meets_all_criteria: boolean;
        other_conditions: boolean;
    };
    review_remarks: string;
    recommending_officer_signature_date: string;
    recommending_officer_signature: string | null;
    
    // Page 4: Loan Approval Committee Decision
    committee_approval: boolean;
    approved_loan_amount: number;
    approved_installment_count: number;
    approved_monthly_installment: number;
    approved_disbursement_date: string;
    disbursement_method: string;
    committee_other_remarks: string;
    committee_members: Array<{
        serial_no: number;
        name: string;
        designation: string;
        signature: string | null;
    }>;
    committee_chairman_signature_date: string;
    committee_chairman_signature: string | null;
    
    // Page 4: Final Approval
    gm_final_approval: boolean;
    gm_final_remarks: string;
    gm_final_date: string;
    gm_final_signature: string | null;
}

interface Props {
    member: any;
    loanProduct: any;
    loanCategory: any;
    requestedAmount: number;
    branch?: any;
    existingApplication?: any;
    savedData?: any;
}

// Helper function to calculate age
const calculateAge = (dateOfBirth: string | null): number => {
    if (!dateOfBirth) return 0;
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

// Helper: normalize ISO or any date string to YYYY-MM-DD for input[type="date"] and display
const toInputDate = (value: string | null | undefined): string => {
    if (value == null || value === '') return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

// Helper function to format date for display (DD/MM/YYYY)
const formatDateBangla = (dateString: string | null): string => {
    if (!dateString) return '';
    const normalized = toInputDate(dateString);
    if (!normalized) return '';
    const [y, m, d] = normalized.split('-');
    return `${d}/${m}/${y}`;
};

export default function LoanApplicationApproval({
    member,
    loanProduct,
    loanCategory,
    requestedAmount,
    branch,
    existingApplication,
    savedData,
}: Props) {
    // সিলেক্টেড লোন ক্যাটাগরির নাম (জাগরণ/বুনিয়াদ/অগ্রসর এর বদলে)
    const categoryName = loanCategory?.category_name_bn || 'জাগরণ/বুনিয়াদ/অগ্রসর';

    const [activePage, setActivePage] = useState(1);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Load photos from MemberAdmission
    const memberPhotoUrl = member?.customer_photo_path 
        ? (member.customer_photo_path.startsWith('http') ? member.customer_photo_path : `/storage/${member.customer_photo_path}`)
        : null;
    const guardianPhotoUrl = member?.guardian_photo_path 
        ? (member.guardian_photo_path.startsWith('http') ? member.guardian_photo_path : `/storage/${member.guardian_photo_path}`)
        : null;
    const applicantSignatureUrl = member?.applicant_signature_path 
        ? (member.applicant_signature_path.startsWith('http') ? member.applicant_signature_path : `/storage/${member.applicant_signature_path}`)
        : null;
    const guardianSignatureUrl = member?.guardian_signature_path 
        ? (member.guardian_signature_path.startsWith('http') ? member.guardian_signature_path : `/storage/${member.guardian_signature_path}`)
        : null;

    // Calculate age
    const memberAge = calculateAge(member?.date_of_birth);

    // Calculate male/female count from family members
    const maleCount = member?.familyMembers?.filter((fm: any) => fm.gender === 'male').length || 0;
    const femaleCount = member?.familyMembers?.filter((fm: any) => fm.gender === 'female').length || 0;

    // Calculate total room count
    const totalRoomCount = (member?.mud_house_count || 0) + (member?.tin_house_count || 0) + (member?.brick_house_count || 0) + (member?.semi_brick_house_count || 0);

    // Prepare family members data (using correct field names from MemberFamilyMember)
    const familyMembersData = member?.familyMembers?.map((fm: any) => ({
        name: fm.member_name || '',
        relationship: fm.relation_with_head || '',
        age: fm.age_years || 0,
        gender: fm.gender === 'male' ? 'পুরুষ' : fm.gender === 'female' ? 'মহিলা' : 'অন্যান্য',
        education: fm.education_level || '',
        occupation: fm.occupation || '',
        monthly_income: fm.monthly_income || 0,
    })) || [];

    const { data, setData, processing } = useForm<LoanApplicationApprovalData>({
        // Page 1: Basic Application Info
        application_date: toInputDate(savedData?.application_date) || toInputDate(new Date().toISOString()) || new Date().toISOString().split('T')[0],
        loan_approval_date: toInputDate(savedData?.loan_approval_date) || '',
        loan_disbursement_date: toInputDate(savedData?.loan_disbursement_date) || '',
        loan_repayment_date: toInputDate(savedData?.loan_repayment_date) || '',
        application_time: savedData?.application_time || new Date().toTimeString().slice(0, 5),
        branch_name: branch?.name || '',
        center_name: member?.samity?.samity_name_bn || member?.samity?.samity_name || '',
        member_name: member?.applicant_name_bn || '',
        applicant_name_bn: member?.applicant_name_bn || '',
        applicant_name_en: member?.applicant_name_en || '',
        applicant_photo: savedData?.applicant_photo || memberPhotoUrl || null,
        proposer_photo: savedData?.proposer_photo || guardianPhotoUrl || null,
        member_code: member?.application_no || '',
        recipient_to: savedData?.recipient_to || '',
        authority_medium: savedData?.authority_medium || '',
        committee_name: savedData?.committee_name || member?.samity?.samity_name_bn || member?.samity?.samity_name || '',
        committee_code: savedData?.committee_code || member?.application_no || '',
        years_involved: savedData?.years_involved || '',
        admission_date: toInputDate(savedData?.admission_date) || toInputDate(member?.admission_date) || '',
        previous_loan_times: savedData?.previous_loan_times || '',
        previous_loan_amount: savedData?.previous_loan_amount || '',
        last_repaid_loan_amount: savedData?.last_repaid_loan_amount || '',
        last_repaid_project_name: savedData?.last_repaid_project_name || '',
        loan_proposal_date: toInputDate(savedData?.loan_proposal_date) || '',
        project_name: savedData?.project_name || '',
        project_manpower: savedData?.project_manpower || '',
        project_income_1_2_yr: savedData?.project_income_1_2_yr || '',
        project_expense_1_2_yr: savedData?.project_expense_1_2_yr || '',
        annual_net_profit: savedData?.annual_net_profit || '',
        capital_own: savedData?.capital_own || '',
        capital_applied_loan: savedData?.capital_applied_loan || (requestedAmount ? String(requestedAmount) : ''),
        approval_amount_digits: savedData?.approval_amount_digits || (requestedAmount ? String(requestedAmount) : ''),
        approval_amount_words: savedData?.approval_amount_words || '',
        family_assets: savedData?.family_assets || [
            { fixed_quantity: '', fixed_value: '', movable_desc: '', movable_value: '' },
            { fixed_quantity: '', fixed_value: '', movable_desc: '', movable_value: '' },
            { fixed_quantity: '', fixed_value: '', movable_desc: '', movable_value: '' },
            { fixed_quantity: '', fixed_value: '', movable_desc: '', movable_value: '' },
        ],
        approver_signature: savedData?.approver_signature || null,
        
        // Page 1: Personal Details (Auto-filled from MemberAdmission)
        member_name_detail: savedData?.member_name_detail || member?.applicant_name_bn || '',
        father_husband_name: savedData?.father_husband_name || member?.father_name_bn || member?.spouse_name_bn || '',
        mother_name: savedData?.mother_name || member?.mother_name_bn || '',
        date_of_birth: toInputDate(savedData?.date_of_birth) || toInputDate(member?.date_of_birth) || '',
        age: savedData?.age || memberAge,
        nationality: savedData?.nationality || 'বাংলাদেশী',
        occupation: savedData?.occupation || member?.business_details || member?.job_details || '',
        educational_qualification: savedData?.educational_qualification || '',
        religion: savedData?.religion || '',
        mobile_number: savedData?.mobile_number || member?.mobile_number || '',
        nid_smart_card: savedData?.nid_smart_card || member?.nid_number || member?.smart_card_number || '',
        id_card_number: savedData?.id_card_number || member?.birth_certificate_number || '',
        alternative_mobile: savedData?.alternative_mobile || member?.alternative_mobile || '',
        gender: savedData?.gender || (member?.gender === 'male' ? 'পুরুষ' : member?.gender === 'female' ? 'মহিলা' : 'অন্যান্য'),
        current_address_line1: savedData?.current_address_line1 || member?.present_village_road || '',
        current_address_line2: savedData?.current_address_line2 || member?.present_union || '',
        current_address_line3: savedData?.current_address_line3 || `${member?.present_upazila || ''}, ${member?.present_district || ''}, ${member?.present_post_code || ''}`,
        permanent_address_line1: savedData?.permanent_address_line1 || member?.permanent_village_road || member?.present_village_road || '',
        permanent_address_line2: savedData?.permanent_address_line2 || member?.permanent_union || member?.present_union || '',
        permanent_address_line3: savedData?.permanent_address_line3 || `${member?.permanent_upazila || member?.present_upazila || ''}, ${member?.permanent_district || member?.present_district || ''}, ${member?.permanent_post_code || member?.present_post_code || ''}`,
        has_poverty_certificate: savedData?.has_poverty_certificate || false,
        voter_id_number: savedData?.voter_id_number || '',
        family_members_count: savedData?.family_members_count || member?.familyMembers?.length || 0,
        earning_members_count: savedData?.earning_members_count ?? (member?.familyMembers?.length || 0),
        male_count: savedData?.male_count || maleCount,
        female_count: savedData?.female_count || femaleCount,
        marital_status: savedData?.marital_status || (member?.marital_status === 'married' ? 'married' : 'unmarried'),
        is_freedom_fighter: savedData?.is_freedom_fighter || false,
        is_widow_divorced: savedData?.is_widow_divorced || (member?.marital_status === 'widowed' || member?.marital_status === 'divorced'),
        is_ethnic_minority: savedData?.is_ethnic_minority || false,
        is_physically_disabled: savedData?.is_physically_disabled || false,
        current_loan_amount: savedData?.current_loan_amount || 0,
        other_loan_source: savedData?.other_loan_source || member?.other_loan_info || '',
        
        // Page 1: Property Details (Auto-filled from MemberAdmission)
        property_details: savedData?.property_details || [
            { 
                land_area_decimal: member?.cultivable_land_amount ? `${member.cultivable_land_amount} ডেসিমেল` : '', 
                house_type_rooms: member?.house_type ? `${member.house_type} (${totalRoomCount} কক্ষ)` : '', 
                fridge_tv: '', 
                total_assets_taka: member?.total_asset_value?.toString() || '' 
            }
        ],
        
        // Page 1: Income Sources (Auto-filled from MemberAdmission)
        income_sources: savedData?.income_sources || [
            { source: 'চাকুরী/ব্যবসা', monthly_income: (member?.job_details || member?.business_details) ? (member?.monthly_income || 0) : 0 },
            { source: 'কৃষি', monthly_income: 0 },
            { source: 'মৎস্য চাষ', monthly_income: 0 },
            { source: 'পশু পালন', monthly_income: 0 },
            { source: 'অন্যান্য', monthly_income: member?.other_income_details ? parseFloat(member.other_income_details) || 0 : 0 },
        ],
        total_income: savedData?.total_income || member?.monthly_income || 0,
        
        // Page 1: Proposer Details
        proposer_member_code: '',
        proposer_name: '',
        proposer_father_husband: '',
        proposer_address: '',
        proposer_nid: '',
        proposer_signature_date: '',
        
        // Page 1: Recommender Details
        recommender_name: '',
        recommender_father_husband: '',
        recommender_address: '',
        recommender_nid: '',
        recommender_signature_date: '',
        
        // Page 1: General Manager Recommendation
        gm_recommendation: '',
        gm_date: '',
        gm_signature: null,
        
        // Page 1: Applicant Signature (Auto-filled from MemberAdmission)
        applicant_signature_date: toInputDate(savedData?.applicant_signature_date) || '',
        applicant_signature: savedData?.applicant_signature || applicantSignatureUrl || null,
        
        // Page 2: জাগরণ/বুনিয়াদ/অগ্রসর ঋণের প্রোফাইল - ক. উদ্যোগ বিষয়ক সাধারণ তথ্যাবলী
        proposed_project_name: savedData?.proposed_project_name || savedData?.project_name || '',
        entrepreneur_fulltime_years: savedData?.entrepreneur_fulltime_years || '',
        entrepreneur_fulltime_months: savedData?.entrepreneur_fulltime_months || '',
        entrepreneur_parttime_years: savedData?.entrepreneur_parttime_years || '',
        entrepreneur_parttime_months: savedData?.entrepreneur_parttime_months || '',
        loan_experience_years: savedData?.loan_experience_years || '',
        loan_experience_months: savedData?.loan_experience_months || '',
        project_manpower_total: savedData?.project_manpower_total || savedData?.project_manpower || '',
        project_manpower_family: savedData?.project_manpower_family || '',
        project_manpower_outside: savedData?.project_manpower_outside || '',
        project_manpower_trained: savedData?.project_manpower_trained || '',
        raw_material_purchase_location: savedData?.raw_material_purchase_location || '',
        product_marketing_location: savedData?.product_marketing_location || '',
        last_year_capital: savedData?.last_year_capital || '',
        last_year_sales: savedData?.last_year_sales || '',
        last_year_profit_loss: savedData?.last_year_profit_loss || '',
        license1_authority: savedData?.license1_authority || '',
        license1_number: savedData?.license1_number || '',
        license1_validity: savedData?.license1_validity || '',
        license2_authority: savedData?.license2_authority || '',
        license2_number: savedData?.license2_number || '',
        license2_validity: savedData?.license2_validity || '',
        has_income_tax_clearance: savedData?.has_income_tax_clearance || false,
        
        // Page 2: খ. আর্থিক তথ্য বিবরণী সমূহ
        total_loans_taken: savedData?.total_loans_taken || savedData?.previous_loan_times || '',
        last_three_loans: savedData?.last_three_loans || [
            { loan_number: '', loan_date: '', loan_amount: '', project_name: '', savings_status: '' },
            { loan_number: '', loan_date: '', loan_amount: '', project_name: '', savings_status: '' },
            { loan_number: '', loan_date: '', loan_amount: '', project_name: '', savings_status: '' },
        ],
        other_ongoing_loans: savedData?.other_ongoing_loans || [
            { organization_name: 'ব্র্যাক', current_loan_amount: '', loan_term: '', info_provider_name: '', mobile_number: '', remarks: '' },
            { organization_name: 'দাবী', current_loan_amount: '', loan_term: '', info_provider_name: '', mobile_number: '', remarks: '' },
            { organization_name: 'ব্যুরো বাংলাদেশ', current_loan_amount: '', loan_term: '', info_provider_name: '', mobile_number: '', remarks: '' },
            { organization_name: 'আরডিআরএস/বেডো', current_loan_amount: '', loan_term: '', info_provider_name: '', mobile_number: '', remarks: '' },
            { organization_name: 'ব্যাংক', current_loan_amount: '', loan_term: '', info_provider_name: '', mobile_number: '', remarks: '' },
            { organization_name: '', current_loan_amount: '', loan_term: '', info_provider_name: '', mobile_number: '', remarks: '' },
        ],
        investment_plan_sources: savedData?.investment_plan_sources || [
            { source: 'সংস্থায় আবেদনকৃত ঋণের পরিমাণ', amount: savedData?.capital_applied_loan || String(requestedAmount) || '' },
            { source: 'নিজস্ব তহবিল', amount: savedData?.capital_own || '' },
            { source: 'অন্যান্য উৎস যদি থাকে (নাম উল্লেখ করতে হবে)', amount: '' },
            { source: 'মোট', amount: '' },
        ],
        investment_plan_uses: savedData?.investment_plan_uses || [
            { use: 'মূলধনী ব্যয়: (ক) যন্ত্রপাতি ক্রয়', amount: '' },
            { use: 'মূলধনী ব্যয়: (খ) গৃহ নির্মাণ', amount: '' },
            { use: 'উদ্যোগ পরিচালনা ব্যয়', amount: '' },
            { use: 'কাঁচামাল ক্রয়', amount: '' },
            { use: 'মোট', amount: '' },
        ],
        
        // Page 2: Investigation (old fields - keeping for compatibility)
        verification_name: member?.applicant_name_bn || '',
        verification_father_husband: member?.father_name_bn || member?.spouse_name_bn || '',
        verification_village: member?.present_village_road || '',
        verification_post_office: member?.present_post_code || '',
        verification_upazila: member?.present_upazila || '',
        verification_district: member?.present_district || '',
        
        // Page 2: Family Income Sources (Auto-filled from MemberAdmission)
        family_income_sources: savedData?.family_income_sources || [
            { source: 'কৃষি', monthly_income: 0 },
            { source: 'মৎস্য চাষ', monthly_income: 0 },
            { source: 'পশুপালন', monthly_income: 0 },
            { source: 'ব্যবসা', monthly_income: member?.business_details ? (member?.monthly_income || 0) : 0 },
            { source: 'চাকুরী', monthly_income: member?.job_details ? (member?.monthly_income || 0) : 0 },
            { source: 'প্রবাসী আয়', monthly_income: 0 },
            { source: 'অন্যান্য', monthly_income: member?.other_income_details ? parseFloat(member.other_income_details) || 0 : 0 },
        ],
        total_family_income: savedData?.total_family_income || member?.monthly_income || 0,
        
        // Page 2: Family Expenditure Sources (Auto-filled from MemberAdmission)
        family_expenditure_sources: savedData?.family_expenditure_sources || [
            { source: 'খাদ্য', monthly_expenditure: 0 },
            { source: 'শিক্ষা', monthly_expenditure: 0 },
            { source: 'চিকিৎসা', monthly_expenditure: 0 },
            { source: 'পোশাক', monthly_expenditure: 0 },
            { source: 'বাড়ি ভাড়া', monthly_expenditure: 0 },
            { source: 'অন্যান্য', monthly_expenditure: 0 },
        ],
        total_family_expenditure: savedData?.total_family_expenditure || member?.monthly_expense || 0,
        
        // Page 2: Land and Assets
        land_assets_details: [
            { land_area_decimal: '', house_type: '', other_assets: '', total_asset_value: 0 }
        ],
        
        // Page 2: Verification Checklist
        verification_checklist: {
            is_other_ngo_member: false,
            wants_to_use_loan_for_other: false,
            unwilling_to_repay: false,
            has_case_against: false,
            has_bad_reputation: false,
            has_criminal_record: false,
            is_loan_defaulter: false,
            has_dispute: false,
            other_issues: false,
        },
        
        // Page 2: Other Loans
        other_loans: [
            { ngo_name: '', loan_amount: 0, paid_amount: 0, remaining_amount: 0 }
        ],
        
        // Page 2: Investigating Officer Signature
        investigating_officer_signature_date: '',
        investigating_officer_signature: null,
        
        // Page 3: উদ্যোগের ১/১.৫/২ বছর এর সম্ভাব্য আয়-ব্যয় হিসাব
        initiative_expenses: savedData?.initiative_expenses || [
            { category: '(ক) কর্মচারীর বেতন ভাতা বাবদ', amount: '' },
            { category: '(খ) পরিবহন বাবদ', amount: '' },
            { category: '(গ) বিভিন্ন বিল বাবদ', amount: '' },
            { category: '(ঘ) ঘর/স্থাপনা ভাড়া বাবদ', amount: '' },
            { category: '(ঙ) ঋণের সার্ভিস চার্জ বাবদ', amount: '' },
            { category: '(চ) ................', amount: '' },
            { category: '(ছ) ................', amount: '' },
            { category: '(জ) ................', amount: '' },
        ],
        initiative_main_income: savedData?.initiative_main_income || '',
        initiative_other_income: savedData?.initiative_other_income || '',
        initiative_total_expenditure: savedData?.initiative_total_expenditure || '',
        initiative_net_profit: savedData?.initiative_net_profit || '',
        initiative_expenditure_percentage: savedData?.initiative_expenditure_percentage || '',
        initiative_profit_percentage: savedData?.initiative_profit_percentage || '',
        
        // গ. অন্যান্য তথ্যাবলী - ০১. ঋণের মেয়াদ ও সার্ভিস চার্জ
        loan_term_months: savedData?.loan_term_months || loanProduct?.duration_months?.toString() || '',
        loan_service_charge_rate: savedData?.loan_service_charge_rate || '',
        repayment_schedule_monthly_principal: savedData?.repayment_schedule_monthly_principal || '',
        repayment_schedule_monthly_service_charge: savedData?.repayment_schedule_monthly_service_charge || '',
        repayment_schedule_monthly_total: savedData?.repayment_schedule_monthly_total || '',
        repayment_schedule_total_principal: savedData?.repayment_schedule_total_principal || '',
        repayment_schedule_total_service_charge: savedData?.repayment_schedule_total_service_charge || '',
        repayment_schedule_total_amount: savedData?.repayment_schedule_total_amount || '',
        
        // ০২. জামিনদারের তথ্য (১ম ও ২য়)
        guarantors: savedData?.guarantors || [
            { name: '', address: '', mobile_number: '', relationship_with_borrower: '', occupation: '', monthly_income: '', asset_amount: '', estimated_value: '', interviewer_name: '', interviewer_designation: '' },
            { name: '', address: '', mobile_number: '', relationship_with_borrower: '', occupation: '', monthly_income: '', asset_amount: '', estimated_value: '', interviewer_name: '', interviewer_designation: '' },
        ],
        
        // ০৩. তথ্য প্রদানকারী (১ম ও ২য় জন)
        information_providers: savedData?.information_providers || [
            { name: '', address: '', mobile_number: '', relationship_with_borrower: '', occupation: '', loan_related_info: '', asset_related_info: '', overall_remarks: '' },
            { name: '', address: '', mobile_number: '', relationship_with_borrower: '', occupation: '', loan_related_info: '', asset_related_info: '', overall_remarks: '' },
        ],
        
        // Page 3: Family Members (Auto-filled from MemberAdmission)
        family_members: savedData?.family_members || familyMembersData,
        
        // Page 3: Family Status (Auto-filled from MemberAdmission)
        family_marital_status: savedData?.family_marital_status || (member?.marital_status === 'married' ? 'married' : 'unmarried'),
        children_count: savedData?.children_count || member?.familyMembers?.filter((fm: any) => {
            const relation = fm.relation_with_head?.toLowerCase() || '';
            return relation.includes('son') || relation.includes('daughter') || relation.includes('ছেলে') || relation.includes('মেয়ে');
        }).length || 0,
        has_spouse: savedData?.has_spouse !== undefined ? savedData.has_spouse : (member?.marital_status === 'married'),
        has_other_loans: savedData?.has_other_loans || !!member?.other_loan_info,
        family_mobile: savedData?.family_mobile || member?.mobile_number || member?.family_member_mobile || '',
        family_email: savedData?.family_email || '',
        family_address: savedData?.family_address || member?.present_village_road || '',
        family_occupation: savedData?.family_occupation || member?.business_details || member?.job_details || '',
        family_monthly_income: savedData?.family_monthly_income || member?.monthly_income || 0,
        family_nid: savedData?.family_nid || member?.nid_number || '',
        passport_number: savedData?.passport_number || '',
        has_electricity: savedData?.has_electricity || false,
        toilet_system: savedData?.toilet_system || '',
        drinking_water_source: savedData?.drinking_water_source || '',
        has_disabled_member: savedData?.has_disabled_member || false,
        has_freedom_fighter: savedData?.has_freedom_fighter || false,
        has_ethnic_minority: savedData?.has_ethnic_minority || false,
        
        // Page 3: Own Land Details (Auto-filled from MemberAdmission)
        own_land_details: savedData?.own_land_details || [
            { land_type: 'আবাদী', area_decimal: member?.cultivable_land_amount?.toString() || '', current_value: member?.cultivable_land_value || 0 },
            { land_type: 'অনাবাদী', area_decimal: member?.non_cultivable_land_amount?.toString() || '', current_value: member?.non_cultivable_land_value || 0 },
            { land_type: 'মোট', area_decimal: ((member?.cultivable_land_amount || 0) + (member?.non_cultivable_land_amount || 0)).toString(), current_value: ((member?.cultivable_land_value || 0) + (member?.non_cultivable_land_value || 0)) },
        ],
        
        // Page 3: Leased Land Details
        leased_land_details: savedData?.leased_land_details || [
            { land_type: 'আবাদী', area_decimal: '', current_value: 0 },
            { land_type: 'অনাবাদী', area_decimal: '', current_value: 0 },
            { land_type: 'মোট', area_decimal: '', current_value: 0 },
        ],
        
        // Page 3: Economic Status (Auto-filled from MemberAdmission)
        annual_income: savedData?.annual_income || ((member?.monthly_income || 0) * 12),
        annual_expenditure: savedData?.annual_expenditure || ((member?.monthly_expense || 0) * 12),
        savings_amount: savedData?.savings_amount || member?.monthly_savings || 0,
        loan_purpose: '',
        loan_amount: requestedAmount,
        loan_installment_count: loanProduct?.number_of_installments || loanProduct?.duration_months || 12,
        loan_term: `${loanProduct?.duration_months || 12} মাস`,
        monthly_installment: 0,
        has_repayment_capacity: false,
        is_unwilling_to_repay: false,
        has_mortgage_cosigner: false,
        mortgage_cosigner_name: '',
        mortgage_cosigner_address: '',
        mortgage_cosigner_nid: '',
        mortgage_cosigner_mobile: '',
        borrower_situation_analysis: '',
        
        // Page 3: Risk Analysis
        risk_analysis: {
            income_source_percentage: 0,
            previous_loan_percentage: 0,
            social_impact_percentage: 0,
            socio_economic_percentage: 0,
            project_productivity_percentage: 0,
            other_percentage: 0,
            total_risk_percentage: 0,
        },
        
        // Page 3: Investigating Officer Signature
        investigating_officer_signature_date_page3: '',
        investigating_officer_signature_page3: null,
        
        // Page 4: I. Applicant Details (Continued)
        // ০৪. চাকরিজীবীর ক্ষেত্রে
        employee_workplace_name: savedData?.employee_workplace_name || '',
        employee_monthly_salary: savedData?.employee_monthly_salary || '',
        employee_received_in_hand: savedData?.employee_received_in_hand || '',
        employee_other_income: savedData?.employee_other_income || '',
        employee_approver_presence_date_time: savedData?.employee_approver_presence_date_time || '',
        employee_who_was_present: savedData?.employee_who_was_present || '',
        employee_salary_bank: savedData?.employee_salary_bank || '',
        employee_bank_statement_verified_amount: savedData?.employee_bank_statement_verified_amount || '',
        
        // ০৫. প্রবাসী সদস্যের রেমিটেন্স
        expatriate_monthly_income: savedData?.expatriate_monthly_income || '',
        expatriate_channel: savedData?.expatriate_channel || '',
        expatriate_confirmation_source: savedData?.expatriate_confirmation_source || '',
        expatriate_country: savedData?.expatriate_country || '',
        expatriate_years_abroad: savedData?.expatriate_years_abroad || '',
        expatriate_work_permit_verified: savedData?.expatriate_work_permit_verified || false,
        
        // ০৬. প্রকল্পে পরিবেশ ও আইনগত জটিলতা
        has_environmental_legal_complexity: savedData?.has_environmental_legal_complexity || false,
        
        // ০৭. ঝুঁকি প্রতিরোধের উপায়
        has_disaster_management_experience: savedData?.has_disaster_management_experience || false,
        has_credit_sales: savedData?.has_credit_sales || false,
        
        // ০৮. ভবিষ্যতে ক্ষুদ্র উদ্যোগ বিষয়ে পরিকল্পনা
        future_small_venture_plans: savedData?.future_small_venture_plans || '',
        
        // ০৯. কর্মসংস্থান সংক্রান্ত তথ্য
        employment_data: savedData?.employment_data || [
            { loan_activity_name: '', self_employment_fulltime_female: '', self_employment_fulltime_male: '', self_employment_parttime_female: '', self_employment_parttime_male: '', wage_employment_fulltime_female: '', wage_employment_fulltime_male: '', wage_employment_parttime_female: '', wage_employment_parttime_male: '', total_fulltime: '', total_parttime: '' },
        ],
        
        // সদস্যের স্বাক্ষর
        member_signature_page4: savedData?.member_signature_page4 || null,
        member_mobile_digits: savedData?.member_mobile_digits || (member?.mobile_number ? member.mobile_number.replace(/\D/g, '').slice(0, 11).split('') : Array(11).fill('')),
        profile_filler_signature: savedData?.profile_filler_signature || null,
        
        // II. ঘ. সংস্থার অফিস পর্যায়ে পূরণীয়
        officer_post_inspection_comments: savedData?.officer_post_inspection_comments || '',
        officer_post_inspection_signature: savedData?.officer_post_inspection_signature || null,
        branch_manager_post_inspection_comments: savedData?.branch_manager_post_inspection_comments || '',
        branch_manager_post_inspection_signature: savedData?.branch_manager_post_inspection_signature || null,
        regional_manager_post_inspection_comments: savedData?.regional_manager_post_inspection_comments || '',
        regional_manager_post_inspection_signature: savedData?.regional_manager_post_inspection_signature || null,
        zonal_manager_post_inspection_comments: savedData?.zonal_manager_post_inspection_comments || '',
        zonal_manager_post_inspection_signature: savedData?.zonal_manager_post_inspection_signature || null,
        final_approver_comments: savedData?.final_approver_comments || '',
        final_approved_loan_amount_digits: savedData?.final_approved_loan_amount_digits || '',
        final_approved_loan_amount_words: savedData?.final_approved_loan_amount_words || '',
        final_approver_signature: savedData?.final_approver_signature || null,
        
        // Page 4: Risk Analysis Table (old fields - keeping for compatibility)
        risk_analysis_table: savedData?.risk_analysis_table || [
            { serial_no: 1, description: 'পরিবারের আয়ের উৎস, ব্যয় ও সম্পদের পরিমাণ', full_marks: 20, obtained_marks: 0, remarks: '' },
            { serial_no: 2, description: 'এনজিও\'র পূর্ববর্তী ঋণ সংক্রান্ত তথ্য', full_marks: 15, obtained_marks: 0, remarks: '' },
            { serial_no: 3, description: 'সামাজিক প্রভাব', full_marks: 10, obtained_marks: 0, remarks: '' },
            { serial_no: 4, description: 'ঋণ গ্রহীতার পরিবারের আর্থ-সামাজিক অবস্থা', full_marks: 15, obtained_marks: 0, remarks: '' },
            { serial_no: 5, description: 'প্রস্তাবিত প্রকল্পের উৎপাদনশীলতা', full_marks: 20, obtained_marks: 0, remarks: '' },
            { serial_no: 6, description: 'অন্যান্য (যদি থাকে)', full_marks: 20, obtained_marks: 0, remarks: '' },
        ],
        total_marks: savedData?.total_marks || 0,
        
        // Page 4: Recommendation
        loan_proposal: '',
        proposed_loan_amount: requestedAmount,
        proposed_member_name: member?.applicant_name_bn || '',
        proposed_amount: requestedAmount,
        proposal_date: '',
        proposal_signature: null,
        proposal_investigating_officer_signature_date: '',
        
        // Page 4: Loan Approval and Disbursement
        approval_committee_date_time: '',
        approved_for_disbursement: false,
        not_disbursed: false,
        disbursement_date_time: '',
        approving_officer_signature_date: '',
        approving_officer_signature: null,
        
        // Page 4: Mortgage and Co-signer
        mortgage_name: '',
        mortgage_father_name: '',
        mortgage_mother_name: '',
        mortgage_address: '',
        mortgage_occupation: '',
        mortgage_mobile: '',
        mortgage_nid: '',
        mortgage_signature_date: '',
        branch_manager_signature_date: '',
        branch_manager_signature: null,
        
        // Page 4: Bank Account Details
        bank_account_number: '',
        bank_name: '',
        bank_branch_name: '',
        account_type: '',
        account_opening_date: '',
        cheque_number: '',
        swift_code: '',
        ifsc_code: '',
        bank_applicant_signature_date: '',
        bank_branch_manager_signature_date: '',
        
        // Page 4: Review Checklist
        review_checklist: {
            is_organization_member: true,
            age_between_18_65: false,
            is_poor: false,
            is_loan_defaulter: false,
            has_valid_nid: true,
            has_bank_account: false,
            has_proper_address: true,
            has_income_source: false,
            can_repay_loan: false,
            has_guarantor: false,
            has_proper_documents: false,
            has_no_criminal_case: true,
            has_good_reputation: true,
            meets_all_criteria: false,
            other_conditions: false,
        },
        review_remarks: '',
        recommending_officer_signature_date: '',
        recommending_officer_signature: null,
        
        // Page 4: Committee Decision
        committee_approval: false,
        approved_loan_amount: 0,
        approved_installment_count: 0,
        approved_monthly_installment: 0,
        approved_disbursement_date: '',
        disbursement_method: '',
        committee_other_remarks: '',
        committee_members: [
            { serial_no: 1, name: '', designation: '', signature: null },
            { serial_no: 2, name: '', designation: '', signature: null },
            { serial_no: 3, name: '', designation: '', signature: null },
            { serial_no: 4, name: '', designation: '', signature: null },
        ],
        committee_chairman_signature_date: '',
        committee_chairman_signature: null,
        
        // Page 4: Final Approval
        gm_final_approval: false,
        gm_final_remarks: '',
        gm_final_date: '',
        gm_final_signature: null,
    });

    // Date fields: normalize from API/draft (e.g. ISO) to YYYY-MM-DD for inputs
    const DATE_FIELDS = new Set([
        'application_date', 'loan_approval_date', 'loan_disbursement_date', 'loan_repayment_date',
        'date_of_birth', 'admission_date', 'loan_proposal_date', 'applicant_signature_date', 'gm_date',
        'proposer_signature_date', 'recommender_signature_date', 'investigating_officer_signature_date',
        'investigating_officer_signature_date_page3', 'proposal_date', 'proposal_investigating_officer_signature_date',
        'approval_committee_date_time', 'disbursement_date_time', 'approving_officer_signature_date',
        'mortgage_signature_date', 'branch_manager_signature_date', 'account_opening_date',
        'bank_applicant_signature_date', 'bank_branch_manager_signature_date', 'recommending_officer_signature_date',
        'approved_disbursement_date', 'committee_chairman_signature_date', 'gm_final_date',
    ]);

    // Load saved data (but preserve auto-filled member data for fields not in savedData)
    useEffect(() => {
        if (savedData) {
            setData(prev => {
                const updated = { ...prev };
                Object.keys(savedData).forEach(key => {
                    const val = savedData[key];
                    if (val !== null && val !== undefined && val !== '') {
                        if (DATE_FIELDS.has(key) && typeof val === 'string') {
                            (updated as any)[key] = toInputDate(val);
                        } else {
                            (updated as any)[key] = val;
                        }
                    }
                });
                return updated;
            });
        }
    }, [savedData]);

    // Calculate age from date of birth
    useEffect(() => {
        if (data.date_of_birth) {
            const birthDate = new Date(data.date_of_birth);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            setData('age', age);
        }
    }, [data.date_of_birth]);

    // Calculate totals
    useEffect(() => {
        const totalIncome = data.income_sources.reduce((sum, item) => sum + (item.monthly_income || 0), 0);
        setData('total_income', totalIncome);
    }, [data.income_sources]);

    useEffect(() => {
        const totalFamilyIncome = data.family_income_sources.reduce((sum, item) => sum + (item.monthly_income || 0), 0);
        setData('total_family_income', totalFamilyIncome);
    }, [data.family_income_sources]);

    useEffect(() => {
        const totalFamilyExpenditure = data.family_expenditure_sources.reduce((sum, item) => sum + (item.monthly_expenditure || 0), 0);
        setData('total_family_expenditure', totalFamilyExpenditure);
    }, [data.family_expenditure_sources]);

    useEffect(() => {
        const totalMarks = data.risk_analysis_table.reduce((sum, item) => sum + (item.obtained_marks || 0), 0);
        setData('total_marks', totalMarks);
    }, [data.risk_analysis_table]);

    useEffect(() => {
        const totalRisk = 
            (data.risk_analysis.income_source_percentage || 0) +
            (data.risk_analysis.previous_loan_percentage || 0) +
            (data.risk_analysis.social_impact_percentage || 0) +
            (data.risk_analysis.socio_economic_percentage || 0) +
            (data.risk_analysis.project_productivity_percentage || 0) +
            (data.risk_analysis.other_percentage || 0);
        setData('risk_analysis', { ...data.risk_analysis, total_risk_percentage: totalRisk });
    }, [
        data.risk_analysis.income_source_percentage,
        data.risk_analysis.previous_loan_percentage,
        data.risk_analysis.social_impact_percentage,
        data.risk_analysis.socio_economic_percentage,
        data.risk_analysis.project_productivity_percentage,
        data.risk_analysis.other_percentage,
    ]);

    const handleImageUpload = (field: string, file: File | null) => {
        if (!file) return;
        if (!file.type.match(/image\/(png|jpg|jpeg)/)) {
            alert('শুধুমাত্র PNG, JPG বা JPEG ফাইল আপলোড করুন');
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setData(field as any, reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const removeImage = (field: string) => {
        setData(field as any, null);
    };

    const handleSaveDraft = () => {
        router.post(
            '/member/loan-applications/forms/loan-application-approval/save-draft',
            {
                member_id: member.id,
                loan_product_id: loanProduct.id,
                loan_category_id: loanCategory.id,
                requested_amount: requestedAmount,
                form_data: JSON.parse(JSON.stringify(data)),
            },
            {
                onSuccess: () => {
                    alert(`${categoryName} ঋণ আবেদন ও অনুমোদনপত্র ড্রাফট হিসেবে সংরক্ষিত হয়েছে।`);
                    router.visit(`/member/loan-applications/form-selection?member_id=${member.id}&loan_product_id=${loanProduct.id}&loan_category_id=${loanCategory.id}&requested_amount=${requestedAmount}`);
                },
                onError: (errors) => {
                    console.error('Save draft error:', errors);
                    alert('ড্রাফট সংরক্ষণে ত্রুটি হয়েছে');
                },
            }
        );
    };

    const handlePrint = () => {
        window.print();
    };

    // Render Page 1 — জাগরণ/বুনিয়াদ/অগ্রসর ঋণ আবেদন ও অনুমোদনপত্র (১০০% স্ক্যান মিল)
    const renderPage1 = () => {
        const nidDigits = (data.nid_smart_card || '').replace(/\D/g, '').slice(0, 17).split('');
        return (
            <div className="bg-white border border-gray-300 p-4 print:p-2" style={{ fontSize: '11px', pageBreakAfter: 'always' }}>
                {/* Header: Logo + মৌসুমী উকিলপাড়া, নওগাঁ। */}
                <div className="flex flex-col items-center justify-center mb-2 border-b-2 border-gray-400 pb-2">
                    <div className="flex items-center gap-3 mb-1">
                        <img
                            src="/logo.png"
                            alt="Logo"
                            className="h-16 w-16 object-contain print:h-14 print:w-14"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <div className="text-center">
                            <h1 className="text-lg font-bold leading-tight print:text-base">মৌসুমী</h1>
                            <p className="text-xs leading-tight print:text-[10px]">{branch?.address || 'উকিলপাড়া, নওগাঁ।'}</p>
                        </div>
                    </div>
                </div>

                {/* Form Title in rounded box */}
                <div className="text-center mb-3 rounded-lg border-2 border-gray-600 p-2">
                    <h2 className="text-base font-bold print:text-sm">({categoryName} ঋণ আবেদন ও অনুমোদনপত্র)</h2>
                </div>

                {/* Dates row: আবেদনের তারিখ | ঋণ অনুমোদনের তারিখ | ঋণ বিতরণের তারিখ | ঋণ পরিশোধের তারিখ (each DD MM YYYY) */}
                <div className="mb-2 grid grid-cols-4 gap-2" style={{ fontSize: '10px' }}>
                    <div>
                        <span>আবেদনের তারিখ:</span>
                        <span className="border-b border-dotted border-gray-600 inline-block min-w-[90px] ml-1">{formatDateBangla(data.application_date) || ''}</span>
                    </div>
                    <div>
                        <span>ঋণ অনুমোদনের তারিখ:</span>
                        <span className="border-b border-dotted border-gray-600 inline-block min-w-[90px] ml-1">{formatDateBangla(data.loan_approval_date) || ''}</span>
                    </div>
                    <div>
                        <span>ঋণ বিতরণের তারিখ:</span>
                        <span className="border-b border-dotted border-gray-600 inline-block min-w-[90px] ml-1">{formatDateBangla(data.loan_disbursement_date) || ''}</span>
                    </div>
                    <div>
                        <span>ঋণ পরিশোধের তারিখ:</span>
                        <span className="border-b border-dotted border-gray-600 inline-block min-w-[90px] ml-1">{formatDateBangla(data.loan_repayment_date) || ''}</span>
                    </div>
                </div>

                {/* বরাবর | মাধ্যম: যথাযথ কর্তৃপক্ষ। */}
                <div className="mb-2" style={{ fontSize: '10px' }}>
                    <span>বরাবর,</span>
                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] mx-1 align-bottom">{data.recipient_to || ''}</span>
                    <span className="ml-2">মাধ্যম: যথাযথ কর্তৃপক্ষ।</span>
                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] mx-1 align-bottom">{data.authority_medium || ''}</span>
                </div>

                {/* Declaration with blanks: সমিতির নাম, সমিতি কোড, গত ... বছর */}
                <div className="mb-3 text-xs leading-relaxed">
                    <p>
                        জনাব,<br />
                        আমি নিম্নস্বাক্ষরকারী অত্র সংস্থার আওতাধীন <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] align-bottom">{data.committee_name || ''}</span> সমিতির (সমিতি কোড <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] align-bottom">{data.committee_code || ''}</span>) একজন নতুন/পুরাতন সদস্য। আমি গত <span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] align-bottom">{data.years_involved || ''}</span> বছর যাবৎ {categoryName} কার্যক্রমের সাথে সম্পৃক্ত। বর্তমানে আমার ব্যবসা পরিচালনা ও পরিধি বৃদ্ধির লক্ষ্যে {categoryName} কর্মসূচির আওতায় ঋণ গ্রহণ করতে ইচ্ছুক। এমতাবস্থায় ঋণ গ্রহণার্থে আমার প্রয়োজনীয় তথ্যাবলি নিম্নে প্রদান করলাম:
                    </p>
                </div>

                {/* ১. আবেদনকারীর নাম | সদস্য কোড | বয়স বছর। */}
                <div className="mb-1" style={{ fontSize: '10px' }}>
                    <span>১. আবেদনকারীর নাম:</span>
                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[140px] mx-1 align-bottom">{data.member_name_detail || data.applicant_name_bn || ''}</span>
                    <span className="ml-2">সদস্য কোড:</span>
                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] mx-1 align-bottom">{data.member_code || ''}</span>
                    <span className="ml-2">বয়স:</span>
                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom">{data.age ?? ''}</span>
                    <span>বছর।</span>
                </div>

                {/* ২. পিতা/স্বামীর নাম */}
                <div className="mb-1" style={{ fontSize: '10px' }}>
                    <span>২. পিতা/স্বামীর নাম:</span>
                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[200px] ml-1 align-bottom">{data.father_husband_name || ''}</span>
                </div>

                {/* ৩. ঠিকানা ক) স্থায়ী খ) বর্তমান */}
                <div className="mb-1" style={{ fontSize: '10px' }}>
                    <span>৩. ঠিকানা:</span>
                    <div className="ml-4 mt-0.5">
                        <div><span>ক) স্থায়ী: গ্রাম/মহল্লা:</span> <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] ml-1 align-bottom">{data.permanent_address_line1 || ''}</span> ডাকঘর: <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{data.permanent_address_line2 || ''}</span> উপজেলা: <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{data.permanent_address_line3?.split(',')[0]?.trim() || ''}</span> জেলা: <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{data.permanent_address_line3?.split(',')[1]?.trim() || ''}</span></div>
                        <div><span>খ) বর্তমান: গ্রাম/মহল্লা:</span> <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] ml-1 align-bottom">{data.current_address_line1 || ''}</span> ডাকঘর: <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{data.current_address_line2 || ''}</span> উপজেলা: <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{data.current_address_line3?.split(',')[0]?.trim() || ''}</span> জেলা: <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{data.current_address_line3?.split(',')[1]?.trim() || ''}</span></div>
                    </div>
                </div>

                {/* ৪. NID/Smart Card No — 17 boxes */}
                <div className="mb-1" style={{ fontSize: '10px' }}>
                    <span>৪. NID/Smart Card No:</span>
                    <span className="inline-flex gap-0.5 ml-1">
                        {Array.from({ length: 17 }, (_, i) => (
                            <span key={i} className="border border-gray-500 w-4 inline-block text-center min-h-[14px]">{nidDigits[i] ?? ''}</span>
                        ))}
                    </span>
                </div>

                {/* ৫. পেশা ৬. শিক্ষাগত যোগ্যতা */}
                <div className="mb-1" style={{ fontSize: '10px' }}>
                    <span>৫. পেশা:</span>
                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] mx-1 align-bottom">{data.occupation || ''}</span>
                    <span className="ml-2">৬. শিক্ষাগত যোগ্যতা:</span>
                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] ml-1 align-bottom">{data.educational_qualification || ''}</span>
                </div>

                {/* ৭. সমিতিতে ভর্তির তারিখ ৮. পরিবারের মোট সদস্য ৯. উপার্জনক্ষম সদস্য */}
                <div className="mb-1" style={{ fontSize: '10px' }}>
                    <span>৭. সমিতিতে ভর্তির তারিখ:</span>
                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] mx-1 align-bottom">{formatDateBangla(data.admission_date) || ''}</span>
                    <span className="ml-2">৮. পরিবারের মোট সদস্য সংখ্যা:</span>
                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom">{data.family_members_count ?? ''}</span>
                    <span className="ml-2">৯. পরিবারের উপার্জনক্ষম সদস্য সংখ্যা:</span>
                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] ml-1 align-bottom">{data.earning_members_count ?? ''}</span>
                </div>

                {/* ১০. ইতোপূর্বে গৃহীত ঋণের তথ্য */}
                <div className="mb-1" style={{ fontSize: '10px' }}>
                    <span>১০. ইতোপূর্বে গৃহীত ঋণের তথ্য: মোট কতোবার</span>
                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[60px] mx-1 align-bottom">{data.previous_loan_times || ''}</span>
                    <span>...কতো টাকা।</span>
                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{data.previous_loan_amount || ''}</span>
                </div>

                {/* ১১. সর্বশেষ পরিশোধিত ঋণের পরিমাণ ১২. সর্বশেষ পরিশোধিত প্রকল্পের নাম */}
                <div className="mb-1" style={{ fontSize: '10px' }}>
                    <span>১১. সর্বশেষ পরিশোধিত ঋণের পরিমাণ:</span>
                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] mx-1 align-bottom">{data.last_repaid_loan_amount || ''}</span>
                    <span className="ml-2">১২. সর্বশেষ পরিশোধিত প্রকল্পের নাম:</span>
                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] ml-1 align-bottom">{data.last_repaid_project_name || ''}</span>
                </div>

                {/* ১৩. মোট সঞ্চয়ের পরিমাণ ১৪. ঋণ প্রস্তাবনার তারিখ */}
                <div className="mb-1" style={{ fontSize: '10px' }}>
                    <span>১৩. মোট সঞ্চয়ের পরিমাণ:</span>
                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] mx-1 align-bottom">{data.savings_amount ?? ''}</span>
                    <span className="ml-2">১৪. ঋণ প্রস্তাবনার তারিখ:</span>
                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{formatDateBangla(data.loan_proposal_date) || ''}</span>
                </div>

                {/* ১৫. প্রকল্পের নাম ১৬. প্রকল্পে নিয়োজিত জনবল সংখ্যা */}
                <div className="mb-1" style={{ fontSize: '10px' }}>
                    <span>১৫. প্রকল্পের নাম:</span>
                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] mx-1 align-bottom">{data.project_name || ''}</span>
                    <span className="ml-2">১৬. প্রকল্পে নিয়োজিত জনবল সংখ্যা:</span>
                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[50px] ml-1 align-bottom">{data.project_manpower || ''}</span>
                </div>

                {/* ১৭. আয় (স্ভাব্য) ১৮. ব্যয় (স্ভাব্য) ১৯. বার্ষিক নিট লাভ (স্ভাব্য) */}
                <div className="mb-1" style={{ fontSize: '10px' }}>
                    <span>১৭. প্রকল্পের ১/১.৫/২ বছরের আয় (স্ভাব্য):</span>
                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] mx-1 align-bottom">{data.project_income_1_2_yr || ''}</span>
                    <span className="ml-2">১৮. প্রকল্পের ১/১.৫/২ বছরের ব্যয় (স্ভাব্য):</span>
                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{data.project_expense_1_2_yr || ''}</span>
                </div>
                <div className="mb-1" style={{ fontSize: '10px' }}>
                    <span>১৯. বার্ষিক নিট লাভ (স্ভাব্য):</span>
                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{data.annual_net_profit || ''}</span>
                </div>

                {/* ২০. প্রকল্পে বিনিয়োগিত মূলধন (ক) নিজস্ব (খ) আবেদনকৃত ঋণ */}
                <div className="mb-2" style={{ fontSize: '10px' }}>
                    <span>২০. প্রকল্পে বিনিয়োগিত মূলধনের পরিমাণ:</span>
                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] mx-1 align-bottom">{Number(data.capital_own || 0) + Number(data.capital_applied_loan || 0) || ''}</span>
                    <span className="ml-2">(ক) নিজস্ব মূলধনের পরিমাণ:</span>
                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] mx-1 align-bottom">{data.capital_own || ''}</span>
                    <span className="ml-2">(খ) আবেদনকৃত ঋণের পরিমাণ:</span>
                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{data.capital_applied_loan || ''}</span>
                </div>

                {/* ২১. পারিবারিক সম্পদ (স্থাবর ও অস্থাবর) — 4 columns, 4 rows + মোট */}
                <div className="mb-2">
                    <p className="font-bold text-xs mb-1">২১. পারিবারিক সম্পদ (স্থাবর ও অস্থাবর)</p>
                    <table className="w-full border-collapse border border-gray-600 text-xs">
                        <thead>
                            <tr>
                                <th className="border border-gray-600 px-1 py-0.5">সম্পদের পরিমাণ (স্থাবর)</th>
                                <th className="border border-gray-600 px-1 py-0.5">আনুমানিক মূল্য</th>
                                <th className="border border-gray-600 px-1 py-0.5">সম্পদের বিবরণ (অস্থাবর)</th>
                                <th className="border border-gray-600 px-1 py-0.5">আনুমানিক মূল্য</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data.family_assets || []).slice(0, 4).map((row, idx) => (
                                <tr key={idx}>
                                    <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{row.fixed_quantity || ''}</span></td>
                                    <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{row.fixed_value || ''}</span></td>
                                    <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{row.movable_desc || ''}</span></td>
                                    <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{row.movable_value || ''}</span></td>
                                </tr>
                            ))}
                            <tr>
                                <td className="border border-gray-600 px-1 py-0.5 font-bold">মোট</td>
                                <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]"></span></td>
                                <td className="border border-gray-600 px-1 py-0.5 font-bold">মোট</td>
                                <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]"></span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Final declaration + amount in digits & words */}
                <div className="mb-2 text-xs leading-relaxed">
                    <p>
                        উল্লিখিত তথ্যাবলি সঠিক। আমার আবেদনকৃত <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] align-bottom">{data.approval_amount_digits || ''}</span> টাকা {categoryName} কর্মসূচির আওতায় ঋণ প্রদান করলে সংস্থার যাবতীয় নিয়ম-কানুন মেনে নির্ধারিত তারিখে ঋণের কিস্তি পরিশোধ করবো।
                    </p>
                </div>

                {/* Signatures: সুপারিশকারীগণের স্বাক্ষর | আবেদনকারীর স্বাক্ষর | শাখা ব্যবস্থাপকের স্বাক্ষর ও সিল */}
                <div className="grid grid-cols-3 gap-2 mb-2" style={{ fontSize: '10px' }}>
                    <div className="border border-gray-600 p-1 text-center">
                        <p className="font-bold">সুপারিশকারীগণের স্বাক্ষর</p>
                        <p className="text-[10px]">অফিসারের স্বাক্ষর ও সিল</p>
                        <div className="border-b border-dotted border-gray-600 min-h-[28px] mt-1"></div>
                    </div>
                    <div className="border border-gray-600 p-1 text-center">
                        <p className="font-bold">আবেদনকারীর স্বাক্ষর:</p>
                        <div className="min-h-[28px] mt-1">
                            {data.applicant_signature && <img src={data.applicant_signature} alt="Applicant" className="h-6 mx-auto object-contain" />}
                        </div>
                    </div>
                    <div className="border border-gray-600 p-1 text-center">
                        <p className="font-bold">শাখা ব্যবস্থাপকের স্বাক্ষর ও সিল</p>
                        <div className="border-b border-dotted border-gray-600 min-h-[28px] mt-1"></div>
                    </div>
                </div>

                {/* Approval line */}
                <div className="mb-2 text-xs">
                    <p>
                        আবেদনকারীর যাবতীয় তথ্যাদি সরেজমিনে যাচাই সাপেক্ষে উক্ত প্রকল্পে <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] align-bottom">{data.approval_amount_digits || ''}</span> (কথায় <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] align-bottom">{data.approval_amount_words || ''}</span>) টাকা ঋণ বিতরণের জন্য অনুমোদন করা হলো।
                    </p>
                </div>

                {/* অনুমোদনকারীর স্বাক্ষর ও সিল */}
                <div className="border border-gray-600 p-1 inline-block" style={{ fontSize: '10px' }}>
                    <p className="font-bold">অনুমোদনকারীর স্বাক্ষর ও সিল:</p>
                    <div className="min-h-[32px] mt-1 w-40">
                        {data.approver_signature && <img src={data.approver_signature} alt="Approver" className="h-7 object-contain" />}
                    </div>
                </div>

                <div className="text-right mt-2 text-xs">১ / ৪</div>
            </div>
        );
    };

    // Render Page 2 — জাগরণ/বুনিয়াদ/অগ্রসর ঋণের প্রোফাইল (১০০% স্ক্যান মিল)
    const renderPage2 = () => {
        return (
            <div className="bg-white border border-gray-300 p-4 print:p-2" style={{ fontSize: '11px', pageBreakAfter: 'always' }}>
                {/* Form Title in rounded box (no header/logo on Page 2) */}
                <div className="text-center mb-3 rounded-lg border-2 border-gray-600 p-2">
                    <h2 className="text-base font-bold print:text-sm">{categoryName} ঋণের প্রোফাইল</h2>
                </div>

                {/* ক. উদ্যোগ বিষয়ক সাধারণ তথ্যাবলী */}
                <div className="mb-3">
                    <h3 className="font-bold text-xs mb-2">ক. উদ্যোগ বিষয়ক সাধারণ তথ্যাবলী:</h3>
                    <div className="space-y-2" style={{ fontSize: '10px' }}>
                        {/* ১. প্রস্তাবিত প্রকল্পের নাম */}
                        <div>
                            <span>১. প্রস্তাবিত প্রকল্পের নাম:</span>
                            <span className="border-b border-dotted border-gray-600 inline-block min-w-[300px] ml-1 align-bottom">{data.proposed_project_name || ''}</span>
                        </div>

                        {/* ২. উদ্যোক্তাদের সংশ্লিষ্টতা */}
                        <div>
                            <span>২. উদ্যোক্তাদের সংশ্লিষ্টতা-</span>
                            <div className="ml-4 mt-1">
                                <div>
                                    <span>(ক) সার্বক্ষণিক: কতোদিন কাজটিতে নিযুক্ত আছে</span>
                                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom">{data.entrepreneur_fulltime_years || ''}</span>
                                    <span>বছর,</span>
                                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom">{data.entrepreneur_fulltime_months || ''}</span>
                                    <span>মাস</span>
                                </div>
                                <div className="mt-1">
                                    <span>(খ) খণ্ডকালীন: কতোদিন কাজটিতে নিযুক্ত আছে</span>
                                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom">{data.entrepreneur_parttime_years || ''}</span>
                                    <span>বছর,</span>
                                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom">{data.entrepreneur_parttime_months || ''}</span>
                                    <span>মাস</span>
                                </div>
                            </div>
                        </div>

                        {/* ৩. ঋণ কার্যক্রমে উদ্যোক্তার অভিজ্ঞতা */}
                        <div>
                            <span>৩. ঋণ কার্যক্রমে উদ্যোক্তার অভিজ্ঞতা:</span>
                            <span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom">{data.loan_experience_years || ''}</span>
                            <span>বছর,</span>
                            <span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom">{data.loan_experience_months || ''}</span>
                            <span>মাস</span>
                        </div>

                        {/* ৪. প্রকল্পে নিয়োগকৃত লোকবল */}
                        <div>
                            <span>৪. প্রকল্পে নিয়োগকৃত লোকবল</span>
                            <span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom">{data.project_manpower_total || ''}</span>
                            <span>জন;</span>
                            <div className="ml-4 mt-1">
                                <div>
                                    <span>(ক) পরিবারের মধ্য হতে</span>
                                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom">{data.project_manpower_family || ''}</span>
                                    <span>জন</span>
                                </div>
                                <div className="mt-1">
                                    <span>(খ) পরিবারের বাইরে</span>
                                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom">{data.project_manpower_outside || ''}</span>
                                    <span>জন</span>
                                </div>
                                <div className="mt-1">
                                    <span>(গ) প্রশিক্ষণপ্রাপ্ত লোকবল</span>
                                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom">{data.project_manpower_trained || ''}</span>
                                    <span>জন</span>
                                </div>
                            </div>
                        </div>

                        {/* ৫. উৎপাদন ও বাজারজাতকরণ সংক্রান্ত তথ্য */}
                        <div>
                            <span>৫. উৎপাদন ও বাজারজাতকরণ সংক্রান্ত তথ্য:</span>
                            <div className="ml-4 mt-1 space-y-1">
                                <div>
                                    <span>ব্যবহৃত কাঁচামাল ক্রয়ের স্থান (নাম ও ঠিকানাসহ):</span>
                                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[250px] ml-1 align-bottom">{data.raw_material_purchase_location || ''}</span>
                                </div>
                                <div>
                                    <span>উৎপাদিত পণ্য বাজারজাতকরণের স্থান কোথায়? (নাম ও ঠিকানাসহ):</span>
                                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[250px] ml-1 align-bottom">{data.product_marketing_location || ''}</span>
                                </div>
                            </div>
                        </div>

                        {/* ৬. বিগত ০১ বছরের আর্থিক তথ্য */}
                        <div>
                            <span>৬. বিগত ০১ বছরের আর্থিক তথ্য:</span>
                            <table className="w-full border-collapse border border-gray-600 mt-1 text-xs">
                                <thead>
                                    <tr>
                                        <th className="border border-gray-600 px-1 py-0.5">পুঁজির পরিমাণ</th>
                                        <th className="border border-gray-600 px-1 py-0.5">বিক্রয় (সারা বছর)</th>
                                        <th className="border border-gray-600 px-1 py-0.5">মোট লাভ/ক্ষতি</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{data.last_year_capital || ''}</span></td>
                                        <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{data.last_year_sales || ''}</span></td>
                                        <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{data.last_year_profit_loss || ''}</span></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* ৭. ট্রেড লাইসেন্স ও অন্যান্য লাইসেন্স এবং আয়কর প্রত্যয়ন */}
                        <div>
                            <span>৭. প্রযোজ্য ক্ষেত্রে ট্রেড লাইসেন্স ও অন্যান্য লাইসেন্স এবং আয়কর প্রত্যয়ন সংক্রান্ত তথ্য:</span>
                            <div className="ml-4 mt-1 space-y-1">
                                <div>
                                    <span>(ক) লাইসেন্স প্রদানকারী কর্তৃপক্ষ:</span>
                                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] mx-1 align-bottom">{data.license1_authority || ''}</span>
                                    <span>লাইসেন্স নম্বর:</span>
                                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] mx-1 align-bottom">{data.license1_number || ''}</span>
                                    <span>মেয়াদ:</span>
                                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] mx-1 align-bottom">{data.license1_validity || ''}</span>
                                </div>
                                <div>
                                    <span>(খ) লাইসেন্স প্রদানকারী কর্তৃপক্ষ:</span>
                                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] mx-1 align-bottom">{data.license2_authority || ''}</span>
                                    <span>লাইসেন্স নম্বর:</span>
                                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] mx-1 align-bottom">{data.license2_number || ''}</span>
                                    <span>মেয়াদ:</span>
                                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] mx-1 align-bottom">{data.license2_validity || ''}</span>
                                </div>
                                <div>
                                    <span>(গ) আয়কর প্রত্যয়ন আছে কি?</span>
                                    <span className={`border border-gray-600 w-3 h-3 inline-block ml-2 ${data.has_income_tax_clearance ? 'bg-black' : ''}`}></span>
                                    <span>হ্যাঁ</span>
                                    <span className={`border border-gray-600 w-3 h-3 inline-block ml-2 ${!data.has_income_tax_clearance ? 'bg-black' : ''}`}></span>
                                    <span>না; হ্যাঁ হলে, ফটোকপি গ্রহণ করতে হবে।</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* খ. আর্থিক তথ্য বিবরণী সমূহ */}
                <div className="mb-3">
                    <h3 className="font-bold text-xs mb-2">খ. আর্থিক তথ্য বিবরণী সমূহ:</h3>
                    <div className="space-y-3" style={{ fontSize: '10px' }}>
                        {/* ১. সর্বশেষ ৩ দফার ঋণ */}
                        <div>
                            <div className="mb-1">
                                <span>১. সদস্য এ' পর্যন্ত</span>
                                <span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom">{data.total_loans_taken || ''}</span>
                                <span>দফায় ঋণ গ্রহণ করেছে। সর্বশেষ ৩ দফার ঋণ গ্রহণ সংক্রান্ত তথ্য:</span>
                            </div>
                            <table className="w-full border-collapse border border-gray-600 text-xs">
                                <thead>
                                    <tr>
                                        <th className="border border-gray-600 px-1 py-0.5">বিবরণ</th>
                                        <th className="border border-gray-600 px-1 py-0.5">দফা নং <span className="border-b border-dotted border-gray-600 inline-block min-w-[60px] align-bottom">{(data.last_three_loans || [])[0]?.loan_number || ''}</span></th>
                                        <th className="border border-gray-600 px-1 py-0.5">দফা নং <span className="border-b border-dotted border-gray-600 inline-block min-w-[60px] align-bottom">{(data.last_three_loans || [])[1]?.loan_number || ''}</span></th>
                                        <th className="border border-gray-600 px-1 py-0.5">দফা নং <span className="border-b border-dotted border-gray-600 inline-block min-w-[60px] align-bottom">{(data.last_three_loans || [])[2]?.loan_number || ''}</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border border-gray-600 px-1 py-0.5">ঋণ গ্রহণের তারিখ</td>
                                        <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{formatDateBangla((data.last_three_loans || [])[0]?.loan_date) || ''}</span></td>
                                        <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{formatDateBangla((data.last_three_loans || [])[1]?.loan_date) || ''}</span></td>
                                        <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{formatDateBangla((data.last_three_loans || [])[2]?.loan_date) || ''}</span></td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-600 px-1 py-0.5">গৃহীত ঋণের পরিমাণ</td>
                                        <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{(data.last_three_loans || [])[0]?.loan_amount || ''}</span></td>
                                        <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{(data.last_three_loans || [])[1]?.loan_amount || ''}</span></td>
                                        <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{(data.last_three_loans || [])[2]?.loan_amount || ''}</span></td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-600 px-1 py-0.5">প্রকল্পের নাম</td>
                                        <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{(data.last_three_loans || [])[0]?.project_name || ''}</span></td>
                                        <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{(data.last_three_loans || [])[1]?.project_name || ''}</span></td>
                                        <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{(data.last_three_loans || [])[2]?.project_name || ''}</span></td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-600 px-1 py-0.5">সঞ্চয় স্থিতি</td>
                                        <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{(data.last_three_loans || [])[0]?.savings_status || ''}</span></td>
                                        <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{(data.last_three_loans || [])[1]?.savings_status || ''}</span></td>
                                        <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{(data.last_three_loans || [])[2]?.savings_status || ''}</span></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* ২. অন্যান্য উৎস থেকে গৃহীত ঋণের বিবরণ */}
                        <div>
                            <p className="mb-1">২. অন্যান্য উৎস থেকে গৃহীত ঋণের বিবরণ (চলমান ঋণ):</p>
                            <table className="w-full border-collapse border border-gray-600 text-xs">
                                <thead>
                                    <tr>
                                        <th className="border border-gray-600 px-1 py-0.5">সংস্থা/প্রতিষ্ঠানের নাম</th>
                                        <th className="border border-gray-600 px-1 py-0.5">বর্তমান গৃহীত ঋণের পরিমাণ</th>
                                        <th className="border border-gray-600 px-1 py-0.5">ঋণের মেয়াদ</th>
                                        <th className="border border-gray-600 px-1 py-0.5">তথ্য প্রদানকারীর নাম</th>
                                        <th className="border border-gray-600 px-1 py-0.5">মোবাইল নম্বর</th>
                                        <th className="border border-gray-600 px-1 py-0.5">মন্তব্য</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(data.other_ongoing_loans || []).map((loan, idx) => (
                                        <tr key={idx}>
                                            <td className="border border-gray-600 px-1 py-0.5">{loan.organization_name || <span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]"></span>}</td>
                                            <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{loan.current_loan_amount || ''}</span></td>
                                            <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{loan.loan_term || ''}</span></td>
                                            <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{loan.info_provider_name || ''}</span></td>
                                            <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{loan.mobile_number || ''}</span></td>
                                            <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{loan.remarks || ''}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <p className="text-[9px] mt-1 italic">* উল্লেখ্য, ব্যাংক বা অন্য কোনো প্রাতিষ্ঠানিক উৎস এমনকি ব্যক্তিগতভাবে গৃহীত ধার হলেও তা উল্লেখ করতে হবে।</p>
                        </div>

                        {/* ৩. বিনিয়োগের পরিকল্পনা */}
                        <div>
                            <p className="mb-1">৩. বিনিয়োগের পরিকল্পনা:</p>
                            <div className="grid grid-cols-2 gap-2">
                                {/* তহবিলের উৎস */}
                                <div>
                                    <p className="font-bold text-xs mb-1">তহবিলের উৎস</p>
                                    <table className="w-full border-collapse border border-gray-600 text-xs">
                                        <thead>
                                            <tr>
                                                <th className="border border-gray-600 px-1 py-0.5">তহবিলের উৎস</th>
                                                <th className="border border-gray-600 px-1 py-0.5">টাকার পরিমাণ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(data.investment_plan_sources || []).map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="border border-gray-600 px-1 py-0.5">{item.source}</td>
                                                    <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{item.amount || ''}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {/* তহবিলের ব্যবহার */}
                                <div>
                                    <p className="font-bold text-xs mb-1">তহবিলের ব্যবহার</p>
                                    <table className="w-full border-collapse border border-gray-600 text-xs">
                                        <thead>
                                            <tr>
                                                <th className="border border-gray-600 px-1 py-0.5">তহবিলের ব্যবহার</th>
                                                <th className="border border-gray-600 px-1 py-0.5">টাকার পরিমাণ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(data.investment_plan_uses || []).map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="border border-gray-600 px-1 py-0.5">{item.use}</td>
                                                    <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{item.amount || ''}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-right mt-2 text-xs">২ / ৪</div>
            </div>
        );
    };

    // Render Page 3 — উদ্যোগের আয়-ব্যয় হিসাব, জামিনদার, তথ্য প্রদানকারী (১০০% স্ক্যান মিল)
    const renderPage3 = () => {
        return (
            <div className="bg-white border border-gray-300 p-4 print:p-2" style={{ fontSize: '11px', pageBreakAfter: 'always' }}>
                {/* No header/logo on Page 3 */}

                {/* ০৪. উদ্যোগের ১/১.৫/২ বছর এর সম্ভাব্য আয়-ব্যয় হিসাব */}
                <div className="mb-3">
                    <h3 className="font-bold text-xs mb-2">০৪. উদ্যোগের ১/১.৫/২ বছর এর সম্ভাব্য আয়-ব্যয় হিসাব:</h3>
                    <table className="w-full border-collapse border border-gray-600 text-xs">
                        <thead>
                            <tr>
                                <th className="border border-gray-600 px-1 py-0.5">ব্যয়</th>
                                <th className="border border-gray-600 px-1 py-0.5">টাকার পরিমাণ</th>
                                <th className="border border-gray-600 px-1 py-0.5">আয়</th>
                                <th className="border border-gray-600 px-1 py-0.5">টাকার পরিমাণ</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border border-gray-600 px-1 py-0.5 font-bold" colSpan={2}>উদ্যোগ পরিচালনা ব্যয়:</td>
                                <td className="border border-gray-600 px-1 py-0.5 font-bold" colSpan={2}>উদ্যোগের মূল আয় (মূল আয়ের খাত উল্লেখ করতে হবে)</td>
                            </tr>
                            {(data.initiative_expenses || []).map((expense, idx) => (
                                <tr key={idx}>
                                    <td className="border border-gray-600 px-1 py-0.5">{expense.category}</td>
                                    <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{expense.amount || ''}</span></td>
                                    <td className="border border-gray-600 px-1 py-0.5">{idx === 0 ? 'উদ্যোগের মূল আয়' : idx === 1 ? 'অন্যান্য আয় (খাত উল্লেখ করতে হবে)' : ''}</td>
                                    <td className="border border-gray-600 px-1 py-0.5">
                                        {idx === 0 ? <span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{data.initiative_main_income || ''}</span> : ''}
                                        {idx === 1 ? <span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{data.initiative_other_income || ''}</span> : ''}
                                    </td>
                                </tr>
                            ))}
                            <tr>
                                <td className="border border-gray-600 px-1 py-0.5 font-bold">মোট ব্যয়:</td>
                                <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{data.initiative_total_expenditure || ''}</span></td>
                                <td className="border border-gray-600 px-1 py-0.5 font-bold">মোট</td>
                                <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{Number(data.initiative_main_income || 0) + Number(data.initiative_other_income || 0) || ''}</span></td>
                            </tr>
                            <tr>
                                <td className="border border-gray-600 px-1 py-0.5 font-bold">নিট লাভ/উদ্বৃত্ত</td>
                                <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{data.initiative_net_profit || ''}</span></td>
                                <td className="border border-gray-600 px-1 py-0.5 font-bold">মোট</td>
                                <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]"></span></td>
                            </tr>
                        </tbody>
                    </table>
                    <div className="mt-2 space-y-1" style={{ fontSize: '10px' }}>
                        <div>
                            <span>উদ্যোগের মোট আয়ের</span>
                            <span className="border-b border-dotted border-gray-600 inline-block min-w-[50px] mx-1 align-bottom">{data.initiative_expenditure_percentage || ''}</span>
                            <span>% ব্যয় হবে (মোট ব্যয় + মোট আয়) ১০০%</span>
                        </div>
                        <div>
                            <span>উদ্যোগের মোট আয়ের</span>
                            <span className="border-b border-dotted border-gray-600 inline-block min-w-[50px] mx-1 align-bottom">{data.initiative_profit_percentage || ''}</span>
                            <span>% নিট লাভ থাকবে (নিট লাভ + মোট আয়) ১০০%</span>
                        </div>
                    </div>
                </div>

                {/* গ. অন্যান্য তথ্যাবলী */}
                <div className="mb-3">
                    <h3 className="font-bold text-xs mb-2">গ. অন্যান্য তথ্যাবলী:</h3>
                    <div className="space-y-3" style={{ fontSize: '10px' }}>
                        {/* ০১. ঋণের মেয়াদ ও সার্ভিস চার্জ */}
                        <div>
                            <p className="mb-1">
                                <span>০১. (ক) ঋণের মেয়াদ</span>
                                <span className="border-b border-dotted border-gray-600 inline-block min-w-[60px] mx-1 align-bottom">{data.loan_term_months || ''}</span>
                                <span>(খ) আরোপিত ঋণের সার্ভিস চার্জের হার (%)</span>
                                <span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom">{data.loan_service_charge_rate || ''}</span>
                                <span>(গ) ঋণ পরিশোধের তফশিল:</span>
                            </p>
                            <table className="w-full border-collapse border border-gray-600 text-xs mt-1">
                                <thead>
                                    <tr>
                                        <th className="border border-gray-600 px-1 py-0.5">কিস্তির ধরণ</th>
                                        <th className="border border-gray-600 px-1 py-0.5">আসল (টাকা)</th>
                                        <th className="border border-gray-600 px-1 py-0.5">সার্ভিস চার্জ (টাকা)</th>
                                        <th className="border border-gray-600 px-1 py-0.5">মোট (টাকা)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border border-gray-600 px-1 py-0.5">মাসিক কিস্তি</td>
                                        <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{data.repayment_schedule_monthly_principal || ''}</span></td>
                                        <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{data.repayment_schedule_monthly_service_charge || ''}</span></td>
                                        <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{data.repayment_schedule_monthly_total || ''}</span></td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-600 px-1 py-0.5">মোট পরিশোধের পরিমাণ</td>
                                        <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{data.repayment_schedule_total_principal || ''}</span></td>
                                        <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{data.repayment_schedule_total_service_charge || ''}</span></td>
                                        <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{data.repayment_schedule_total_amount || ''}</span></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* ০২. জামিনদারের তথ্য */}
                        <div>
                            <p className="mb-1 font-bold">০২. জামিনদারের তথ্য: (ক) ১ম জামিনদার (খ) ২য় জামিনদার</p>
                            <div className="grid grid-cols-2 gap-2">
                                {(data.guarantors || []).map((guarantor, idx) => (
                                    <div key={idx} className="border border-gray-600 p-2">
                                        <p className="font-bold text-xs mb-1">{idx === 0 ? '১ম জামিনদার' : '২য় জামিনদার'}</p>
                                        <div className="space-y-1 text-xs">
                                            <div>
                                                <span>জামিনদারের নাম:</span>
                                                <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] ml-1 align-bottom">{guarantor.name || ''}</span>
                                            </div>
                                            <div>
                                                <span>ঠিকানা:</span>
                                                <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] ml-1 align-bottom">{guarantor.address || ''}</span>
                                            </div>
                                            <div>
                                                <span>মোবাইল নম্বর:</span>
                                                <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] ml-1 align-bottom">{guarantor.mobile_number || ''}</span>
                                            </div>
                                            <div>
                                                <span>ঋণীর সাথে সম্পর্ক:</span>
                                                <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{guarantor.relationship_with_borrower || ''}</span>
                                            </div>
                                            <div>
                                                <span>পেশা:</span>
                                                <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] ml-1 align-bottom">{guarantor.occupation || ''}</span>
                                            </div>
                                            <div>
                                                <span>মাসিক আয়:</span>
                                                <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{guarantor.monthly_income || ''}</span>
                                            </div>
                                            <div>
                                                <span>জামিনদারের সম্পদের পরিমাণ:</span>
                                                <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{guarantor.asset_amount || ''}</span>
                                            </div>
                                            <div>
                                                <span>সম্ভাব্য মূল্য:</span>
                                                <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{guarantor.estimated_value || ''}</span>
                                            </div>
                                            <div>
                                                <span>সাক্ষাতকারীর নাম:</span>
                                                <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] ml-1 align-bottom">{guarantor.interviewer_name || ''}</span>
                                            </div>
                                            <div>
                                                <span>পদবী: বিএম/আরএম/জেডএম</span>
                                                <span className="border-b border-dotted border-gray-600 inline-block min-w-[60px] ml-1 align-bottom">{guarantor.interviewer_designation || ''}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ০৩. তথ্য প্রদানকারী */}
                        <div>
                            <p className="mb-1 font-bold">০৩. ঋণী ও জামিনদার সম্পর্কে তথ্য প্রদানকারী: (ক) ১ম জন (খ) ২য় জন</p>
                            <div className="grid grid-cols-2 gap-2">
                                {(data.information_providers || []).map((provider, idx) => (
                                    <div key={idx} className="border border-gray-600 p-2">
                                        <p className="font-bold text-xs mb-1">{idx === 0 ? '১ম জন' : '২য় জন'}</p>
                                        <div className="space-y-1 text-xs">
                                            <div>
                                                <span>তথ্য প্রদানকারীর নাম:</span>
                                                <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] ml-1 align-bottom">{provider.name || ''}</span>
                                            </div>
                                            <div>
                                                <span>ঠিকানা:</span>
                                                <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] ml-1 align-bottom">{provider.address || ''}</span>
                                            </div>
                                            <div>
                                                <span>মোবাইল নম্বর:</span>
                                                <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] ml-1 align-bottom">{provider.mobile_number || ''}</span>
                                            </div>
                                            <div>
                                                <span>ঋণীর সাথে সম্পর্ক:</span>
                                                <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{provider.relationship_with_borrower || ''}</span>
                                            </div>
                                            <div>
                                                <span>পেশা:</span>
                                                <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] ml-1 align-bottom">{provider.occupation || ''}</span>
                                            </div>
                                            <div>
                                                <span>ঋণ সংক্রান্ত তথ্য:</span>
                                                <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] ml-1 align-bottom">{provider.loan_related_info || ''}</span>
                                            </div>
                                            <div>
                                                <span>সম্পদ সংক্রান্ত তথ্য:</span>
                                                <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] ml-1 align-bottom">{provider.asset_related_info || ''}</span>
                                            </div>
                                            <div>
                                                <span>তথ্য প্রদানকারীর সার্বিক মন্তব্য:</span>
                                                <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] ml-1 align-bottom">{provider.overall_remarks || ''}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-right mt-2 text-xs">৩ / ৪</div>
            </div>
        );
    };

    // Render Page 4 — I. Applicant Details (Continued) + II. ঘ. সংস্থার অফিস পর্যায়ে পূরণীয় (১০০% স্ক্যান মিল)
    const renderPage4 = () => {
        const mobileDigits = (data.member_mobile_digits || Array(11).fill('')).slice(0, 11);
        return (
            <div className="bg-white border border-gray-300 p-4 print:p-2" style={{ fontSize: '11px' }}>
                {/* No header/logo on Page 4 */}

                {/* I. Applicant Details (Continued) */}
                <div className="mb-3">
                    <h3 className="font-bold text-xs mb-2">I. Applicant Details (Continued)</h3>
                    <div className="space-y-2" style={{ fontSize: '10px' }}>
                        {/* ০৪. চাকরিজীবীর ক্ষেত্রে */}
                        <div>
                            <p className="font-bold mb-1">০৪. চাকরিজীবীর ক্ষেত্রে (প্রযোজ্য ক্ষেত্রে):</p>
                            <div className="ml-4 space-y-1">
                                <div>
                                    <span>কর্মস্থলের নাম:</span>
                                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[200px] ml-1 align-bottom">{data.employee_workplace_name || ''}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <span>মাসিক বেতন:</span>
                                        <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] ml-1 align-bottom">{data.employee_monthly_salary || ''}</span>
                                    </div>
                                    <div>
                                        <span>হাতে প্রাপ্তি:</span>
                                        <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] ml-1 align-bottom">{data.employee_received_in_hand || ''}</span>
                                    </div>
                                    <div>
                                        <span>অন্যান্য খাতের আয়:</span>
                                        <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] ml-1 align-bottom">{data.employee_other_income || ''}</span>
                                    </div>
                                    <div>
                                        <span>কর্মস্থলে ঋণ অনুমোদনকারীর উপস্থিতির তারিখ ও সময়:</span>
                                        <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] ml-1 align-bottom">{data.employee_approver_presence_date_time || ''}</span>
                                    </div>
                                    <div>
                                        <span>সাথে কে ছিলো:</span>
                                        <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] ml-1 align-bottom">{data.employee_who_was_present || ''}</span>
                                    </div>
                                    <div>
                                        <span>যে ব্যাংকে বেতন হয়:</span>
                                        <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] ml-1 align-bottom">{data.employee_salary_bank || ''}</span>
                                    </div>
                                </div>
                                <div>
                                    <span>ব্যাংক স্টেটমেন্ট যাচাই অনুযায়ী হাতে বেতন পাওয়ার পরিমাণ:</span>
                                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] ml-1 align-bottom">{data.employee_bank_statement_verified_amount || ''}</span>
                                </div>
                            </div>
                        </div>

                        {/* ০৫. প্রবাসী সদস্যের রেমিটেন্স */}
                        <div>
                            <p className="font-bold mb-1">০৫. প্রবাসী সদস্যের রেমিটেন্স এর তথ্য (প্রযোজ্য ক্ষেত্রে):</p>
                            <div className="ml-4 space-y-1">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <span>মাসিক আয়:</span>
                                        <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] ml-1 align-bottom">{data.expatriate_monthly_income || ''}</span>
                                    </div>
                                    <div>
                                        <span>যে চ্যানেলে আসে:</span>
                                        <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] ml-1 align-bottom">{data.expatriate_channel || ''}</span>
                                    </div>
                                    <div>
                                        <span>যা দেখে নিশ্চিত হলেন:</span>
                                        <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] ml-1 align-bottom">{data.expatriate_confirmation_source || ''}</span>
                                    </div>
                                    <div>
                                        <span>প্রবাসী সদস্য যে দেশে থাকে:</span>
                                        <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] ml-1 align-bottom">{data.expatriate_country || ''}</span>
                                    </div>
                                    <div>
                                        <span>কতো বছর ধরে থাকে:</span>
                                        <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{data.expatriate_years_abroad || ''}</span>
                                    </div>
                                    <div>
                                        <span>ওয়ার্ক পারমিট যাচাই:</span>
                                        <span className={`border border-gray-600 w-3 h-3 inline-block ml-2 ${data.expatriate_work_permit_verified ? 'bg-black' : ''}`}></span>
                                        <span>(ক) হ্যাঁ</span>
                                        <span className={`border border-gray-600 w-3 h-3 inline-block ml-2 ${!data.expatriate_work_permit_verified ? 'bg-black' : ''}`}></span>
                                        <span>(খ) না</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ০৬. প্রকল্পে পরিবেশ ও আইনগত জটিলতা */}
                        <div>
                            <p className="font-bold mb-1">০৬. প্রকল্পে পরিবেশ ও আইনগত কোনো জটিলতা আছে কি-না? (টিক চিহ্ন দিন):</p>
                            <div className="ml-4">
                                <span className={`border border-gray-600 w-3 h-3 inline-block ml-2 ${data.has_environmental_legal_complexity ? 'bg-black' : ''}`}></span>
                                <span>(ক) হ্যাঁ</span>
                                <span className={`border border-gray-600 w-3 h-3 inline-block ml-2 ${!data.has_environmental_legal_complexity ? 'bg-black' : ''}`}></span>
                                <span>(খ) না</span>
                            </div>
                        </div>

                        {/* ০৭. ঝুঁকি প্রতিরোধের উপায় */}
                        <div>
                            <p className="font-bold mb-1">০৭. ঝুঁকি প্রতিরোধের উপায় (Risk Coverage Measures) লিখুন:-</p>
                            <div className="ml-4 space-y-1">
                                <div>
                                    <span>(ক) প্রযোজ্য ক্ষেত্রে দুর্যোগ মোকাবিলার অভিজ্ঞতা:</span>
                                    <span className={`border border-gray-600 w-3 h-3 inline-block ml-2 ${data.has_disaster_management_experience ? 'bg-black' : ''}`}></span>
                                    <span>(i) আছে</span>
                                    <span className={`border border-gray-600 w-3 h-3 inline-block ml-2 ${!data.has_disaster_management_experience ? 'bg-black' : ''}`}></span>
                                    <span>(ii) নাই</span>
                                </div>
                                <div>
                                    <span>(খ) প্রযোজ্য ক্ষেত্রে বাকিতে বিক্রয়ের পরিমাণ/হার:</span>
                                    <span className={`border border-gray-600 w-3 h-3 inline-block ml-2 ${data.has_credit_sales ? 'bg-black' : ''}`}></span>
                                    <span>(i) আছে</span>
                                    <span className={`border border-gray-600 w-3 h-3 inline-block ml-2 ${!data.has_credit_sales ? 'bg-black' : ''}`}></span>
                                    <span>(ii) নাই</span>
                                </div>
                            </div>
                        </div>

                        {/* ০৮. ভবিষ্যতে ক্ষুদ্র উদ্যোগ বিষয়ে পরিকল্পনা */}
                        <div>
                            <p className="font-bold mb-1">০৮. ভবিষ্যতে ক্ষুদ্র উদ্যোগ বিষয়ে কি ধরণের পরিকল্পনা রয়েছে?</p>
                            <div className="ml-4 border border-gray-600 min-h-[60px] p-1">
                                <span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[50px]">{data.future_small_venture_plans || ''}</span>
                            </div>
                        </div>

                        {/* ০৯. কর্মসংস্থান সংক্রান্ত তথ্য */}
                        <div>
                            <p className="font-bold mb-1">০৯. কর্মসংস্থান সংক্রান্ত তথ্য:</p>
                            <table className="w-full border-collapse border border-gray-600 text-xs">
                                <thead>
                                    <tr>
                                        <th rowSpan={3} className="border border-gray-600 px-1 py-0.5">ঋণ কার্যক্রমের নাম</th>
                                        <th colSpan={4} className="border border-gray-600 px-1 py-0.5">স্ব-কর্মসংস্থান/পারিবারিক কর্মসংস্থান</th>
                                        <th colSpan={4} className="border border-gray-600 px-1 py-0.5">মজুরি ভিত্তিক কর্মসংস্থান</th>
                                        <th colSpan={2} className="border border-gray-600 px-1 py-0.5">মোট</th>
                                    </tr>
                                    <tr>
                                        <th colSpan={2} className="border border-gray-600 px-1 py-0.5">পূর্ণকালীন</th>
                                        <th colSpan={2} className="border border-gray-600 px-1 py-0.5">খণ্ডকালীন</th>
                                        <th colSpan={2} className="border border-gray-600 px-1 py-0.5">পূর্ণকালীন</th>
                                        <th colSpan={2} className="border border-gray-600 px-1 py-0.5">খণ্ডকালীন</th>
                                        <th className="border border-gray-600 px-1 py-0.5">পূর্ণ সময়</th>
                                        <th className="border border-gray-600 px-1 py-0.5">আংশিক সময়</th>
                                    </tr>
                                    <tr>
                                        <th className="border border-gray-600 px-1 py-0.5">মহিলা</th>
                                        <th className="border border-gray-600 px-1 py-0.5">পুরুষ</th>
                                        <th className="border border-gray-600 px-1 py-0.5">মহিলা</th>
                                        <th className="border border-gray-600 px-1 py-0.5">পুরুষ</th>
                                        <th className="border border-gray-600 px-1 py-0.5">মহিলা</th>
                                        <th className="border border-gray-600 px-1 py-0.5">পুরুষ</th>
                                        <th className="border border-gray-600 px-1 py-0.5">মহিলা</th>
                                        <th className="border border-gray-600 px-1 py-0.5">পুরুষ</th>
                                        <th className="border border-gray-600 px-1 py-0.5">৯ = ১+২+৫+৬</th>
                                        <th className="border border-gray-600 px-1 py-0.5">১০ = ৩+৪+৭+৮</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(data.employment_data || []).map((row, idx) => (
                                        <tr key={idx}>
                                            <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{row.loan_activity_name || ''}</span></td>
                                            <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{row.self_employment_fulltime_female || ''}</span></td>
                                            <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{row.self_employment_fulltime_male || ''}</span></td>
                                            <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{row.self_employment_parttime_female || ''}</span></td>
                                            <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{row.self_employment_parttime_male || ''}</span></td>
                                            <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{row.wage_employment_fulltime_female || ''}</span></td>
                                            <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{row.wage_employment_fulltime_male || ''}</span></td>
                                            <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{row.wage_employment_parttime_female || ''}</span></td>
                                            <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{row.wage_employment_parttime_male || ''}</span></td>
                                            <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{row.total_fulltime || ''}</span></td>
                                            <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{row.total_parttime || ''}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* সদস্যের স্বাক্ষর */}
                        <div className="mt-2 flex items-center gap-4">
                            <div>
                                <p className="text-xs mb-1">সদস্যের স্বাক্ষর:</p>
                                <div className="border-b border-dotted border-gray-600 w-32 h-8">
                                    {data.member_signature_page4 && <img src={data.member_signature_page4} alt="Member Signature" className="h-6 object-contain" />}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs mb-1">সদস্যের মোবাইল নং</p>
                                <span className="inline-flex gap-0.5">
                                    {Array.from({ length: 11 }, (_, i) => (
                                        <span key={i} className="border border-gray-500 w-4 inline-block text-center min-h-[14px]">{mobileDigits[i] ?? ''}</span>
                                    ))}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs mb-1">প্রোফাইল পূরণকারীর স্বাক্ষর ও সিল:</p>
                                <div className="border-b border-dotted border-gray-600 w-32 h-8">
                                    {data.profile_filler_signature && <img src={data.profile_filler_signature} alt="Profile Filler" className="h-6 object-contain" />}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* II. ঘ. সংস্থার অফিস পর্যায়ে পূরণীয় */}
                <div className="mb-3">
                    <h3 className="font-bold text-xs mb-2">II. ঘ. সংস্থার অফিস পর্যায়ে পূরণীয়:</h3>
                    <div className="space-y-2" style={{ fontSize: '10px' }}>
                        {/* (ক) অফিসারের পরিদর্শনোত্তর মন্তব্য */}
                        <div className="border border-gray-600 p-2">
                            <p className="font-bold mb-1">(ক) অফিসারের পরিদর্শনোত্তর মন্তব্য, স্বাক্ষর ও সিল:</p>
                            <div className="border border-gray-400 min-h-[60px] p-1 mb-1">
                                {data.officer_post_inspection_comments || ''}
                            </div>
                            <div className="border-b border-dotted border-gray-600 min-h-[32px] w-40">
                                {data.officer_post_inspection_signature && <img src={data.officer_post_inspection_signature} alt="Officer" className="h-7 object-contain" />}
                            </div>
                        </div>

                        {/* (খ) শাখা ব্যবস্থাপকের পরিদর্শনোত্তর মন্তব্য */}
                        <div className="border border-gray-600 p-2">
                            <p className="font-bold mb-1">(খ) শাখা ব্যবস্থাপকের পরিদর্শনোত্তর মন্তব্য, স্বাক্ষর ও সিল:</p>
                            <div className="border border-gray-400 min-h-[60px] p-1 mb-1">
                                {data.branch_manager_post_inspection_comments || ''}
                            </div>
                            <div className="border-b border-dotted border-gray-600 min-h-[32px] w-40">
                                {data.branch_manager_post_inspection_signature && <img src={data.branch_manager_post_inspection_signature} alt="Branch Manager" className="h-7 object-contain" />}
                            </div>
                        </div>

                        {/* (গ) আঞ্চলিক ব্যবস্থাপকের পরিদর্শনোত্তর মন্তব্য */}
                        <div className="border border-gray-600 p-2">
                            <p className="font-bold mb-1">(গ) আঞ্চলিক ব্যবস্থাপকের পরিদর্শনোত্তর মন্তব্য, স্বাক্ষর ও সিল:</p>
                            <div className="border border-gray-400 min-h-[60px] p-1 mb-1">
                                {data.regional_manager_post_inspection_comments || ''}
                            </div>
                            <div className="border-b border-dotted border-gray-600 min-h-[32px] w-40">
                                {data.regional_manager_post_inspection_signature && <img src={data.regional_manager_post_inspection_signature} alt="Regional Manager" className="h-7 object-contain" />}
                            </div>
                        </div>

                        {/* (ঘ) জোনাল ম্যানেজারের পরিদর্শনোত্তর মন্তব্য */}
                        <div className="border border-gray-600 p-2">
                            <p className="font-bold mb-1">(ঘ) জোনাল ম্যানেজারের পরিদর্শনোত্তর মন্তব্য, স্বাক্ষর ও সিল:</p>
                            <div className="border border-gray-400 min-h-[60px] p-1 mb-1">
                                {data.zonal_manager_post_inspection_comments || ''}
                            </div>
                            <div className="border-b border-dotted border-gray-600 min-h-[32px] w-40">
                                {data.zonal_manager_post_inspection_signature && <img src={data.zonal_manager_post_inspection_signature} alt="Zonal Manager" className="h-7 object-contain" />}
                            </div>
                        </div>

                        {/* (ঙ) সংস্থার চূড়ান্ত অনুমোদনকারীর মন্তব্য */}
                        <div className="border border-gray-600 p-2">
                            <p className="font-bold mb-1">(ঙ) সংস্থার চূড়ান্ত অনুমোদনকারীর মন্তব্য ও অনুমোদিত ঋণের বিবরণ</p>
                            <div className="border border-gray-400 min-h-[60px] p-1 mb-1">
                                {data.final_approver_comments || ''}
                            </div>
                            <div className="flex items-center gap-4">
                                <div>
                                    <span>টাকা:</span>
                                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] ml-1 align-bottom">{data.final_approved_loan_amount_digits || ''}</span>
                                </div>
                                <div>
                                    <span>কথায়:</span>
                                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[150px] ml-1 align-bottom">{data.final_approved_loan_amount_words || ''}</span>
                                </div>
                                <div className="ml-auto">
                                    <p className="text-xs mb-1">চূড়ান্ত অনুমোদনকারীর স্বাক্ষর ও সিল:</p>
                                    <div className="border-b border-dotted border-gray-600 min-h-[32px] w-40">
                                        {data.final_approver_signature && <img src={data.final_approver_signature} alt="Final Approver" className="h-7 object-contain" />}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-right mt-2 text-xs">৪ / ৪</div>
            </div>
        );
    };

    return (
        <AdminLayout>
            <Head title={`${categoryName} ঋণ আবেদন ও অনুমোদনপত্র`}>
                <style>{`
                    @media print {
                        @page {
                            size: A4;
                            margin: 1cm;
                        }
                        html, body, #app {
                            margin: 0 !important;
                            padding: 0 !important;
                            background: white !important;
                        }
                        body * {
                            visibility: hidden !important;
                        }
                        .print-container,
                        .print-container * {
                            visibility: visible !important;
                        }
                        nav, header, aside, .sidebar, [role="navigation"],
                        .print\\:hidden {
                            display: none !important;
                        }
                        .print-container {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            margin: 0 !important;
                            padding: 0 !important;
                        }
                    }
                `}</style>
            </Head>

            <div className="max-w-[1600px] mx-auto p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 print:hidden">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.visit(`/member/loan-applications/form-selection?member_id=${member.id}&loan_product_id=${loanProduct.id}&loan_category_id=${loanCategory.id}&requested_amount=${requestedAmount}`)}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </button>
                        <div>
                            <h1 className="text-lg font-bold">{categoryName} ঋণ আবেদন ও অনুমোদনপত্র</h1>
                            <p className="text-xs text-gray-600">Form পূরণ করুন এবং সংরক্ষণ করুন।</p>
                            {existingApplication && (
                                <p className="text-xs text-blue-600 mt-1">
                                    ✓ Draft সংরক্ষিত আছে - Application No: {existingApplication.application_no || 'Pending'}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSaveDraft}
                            disabled={processing}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {processing ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                        </button>
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700"
                        >
                            <Printer className="w-4 h-4" />
                            Print
                        </button>
                    </div>
                </div>

                {/* Page Navigation */}
                <div className="flex gap-2 mb-4 print:hidden">
                    {[1, 2, 3, 4].map((page) => (
                        <button
                            key={page}
                            onClick={() => setActivePage(page)}
                            className={`px-4 py-2 rounded-md text-sm ${
                                activePage === page
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            Page {page}
                        </button>
                    ))}
                </div>

                {/* Form Content - Left: Input, Right: Preview */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:grid-cols-1">
                    {/* LEFT SIDE: INPUT FORM */}
                    <div className="space-y-4 print:hidden">
                        {activePage === 1 && (
                            <>
                                {/* Page 1: জাগরণ/বুনিয়াদ/অগ্রসর - Basic & Dates */}
                                <div className="bg-white rounded-lg shadow-sm p-4 border">
                                    <h3 className="text-sm font-bold mb-3">পেজ ১: {categoryName} ঋণ আবেদন ও অনুমোদনপত্র</h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium mb-1">আবেদনের তারিখ</label>
                                                <input
                                                    type="date"
                                                    value={data.application_date}
                                                    onChange={(e) => setData('application_date', e.target.value)}
                                                    className="w-full px-2 py-1.5 text-sm border rounded-md"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">ঋণ অনুমোদনের তারিখ</label>
                                                <input type="date" value={data.loan_approval_date} onChange={(e) => setData('loan_approval_date', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">ঋণ বিতরণের তারিখ</label>
                                                <input type="date" value={data.loan_disbursement_date} onChange={(e) => setData('loan_disbursement_date', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">ঋণ পরিশোধের তারিখ</label>
                                                <input type="date" value={data.loan_repayment_date} onChange={(e) => setData('loan_repayment_date', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium mb-1">বরাবর</label>
                                                <input type="text" value={data.recipient_to} onChange={(e) => setData('recipient_to', e.target.value)} placeholder="বরাবর" className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">মাধ্যম: যথাযথ কর্তৃপক্ষ</label>
                                                <input type="text" value={data.authority_medium} onChange={(e) => setData('authority_medium', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium mb-1">সমিতির নাম</label>
                                                <input type="text" value={data.committee_name} onChange={(e) => setData('committee_name', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">সমিতি কোড</label>
                                                <input type="text" value={data.committee_code} onChange={(e) => setData('committee_code', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">গত ... বছর ({categoryName} সাথে)</label>
                                                <input type="text" value={data.years_involved} onChange={(e) => setData('years_involved', e.target.value)} placeholder="বছর" className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">সমিতিতে ভর্তির তারিখ</label>
                                                <input type="date" value={data.admission_date} onChange={(e) => setData('admission_date', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium mb-1">ইতোপূর্বে ঋণ: কতোবার</label>
                                                <input type="text" value={data.previous_loan_times} onChange={(e) => setData('previous_loan_times', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">ইতোপূর্বে ঋণ: কতো টাকা</label>
                                                <input type="text" value={data.previous_loan_amount} onChange={(e) => setData('previous_loan_amount', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">সর্বশেষ পরিশোধিত ঋণের পরিমাণ</label>
                                                <input type="text" value={data.last_repaid_loan_amount} onChange={(e) => setData('last_repaid_loan_amount', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">সর্বশেষ পরিশোধিত প্রকল্পের নাম</label>
                                                <input type="text" value={data.last_repaid_project_name} onChange={(e) => setData('last_repaid_project_name', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium mb-1">ঋণ প্রস্তাবনার তারিখ</label>
                                                <input type="date" value={data.loan_proposal_date} onChange={(e) => setData('loan_proposal_date', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">প্রকল্পের নাম</label>
                                                <input type="text" value={data.project_name} onChange={(e) => setData('project_name', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">প্রকল্পে নিয়োজিত জনবল সংখ্যা</label>
                                                <input type="text" value={data.project_manpower} onChange={(e) => setData('project_manpower', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">প্রকল্পের ১/১.৫/২ বছরের আয় (স্ভাব্য)</label>
                                                <input type="text" value={data.project_income_1_2_yr} onChange={(e) => setData('project_income_1_2_yr', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">প্রকল্পের ১/১.৫/২ বছরের ব্যয় (স্ভাব্য)</label>
                                                <input type="text" value={data.project_expense_1_2_yr} onChange={(e) => setData('project_expense_1_2_yr', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">বার্ষিক নিট লাভ (স্ভাব্য)</label>
                                                <input type="text" value={data.annual_net_profit} onChange={(e) => setData('annual_net_profit', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">নিজস্ব মূলধনের পরিমাণ</label>
                                                <input type="text" value={data.capital_own} onChange={(e) => setData('capital_own', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">আবেদনকৃত ঋণের পরিমাণ</label>
                                                <input type="text" value={data.capital_applied_loan} onChange={(e) => setData('capital_applied_loan', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium mb-1">অনুমোদন পরিমাণ (অংকে)</label>
                                                <input type="text" value={data.approval_amount_digits} onChange={(e) => setData('approval_amount_digits', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">অনুমোদন পরিমাণ (কথায়)</label>
                                                <input type="text" value={data.approval_amount_words} onChange={(e) => setData('approval_amount_words', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium mb-1">সময়</label>
                                                <input type="time" value={data.application_time} onChange={(e) => setData('application_time', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">পরিবারের উপার্জনক্ষম সদস্য সংখ্যা</label>
                                                <input type="number" value={data.earning_members_count} onChange={(e) => setData('earning_members_count', parseInt(e.target.value) || 0)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium mb-1">শাখার নাম (Auto-filled)</label>
                                                <input type="text" value={data.branch_name} disabled className="w-full px-2 py-1.5 text-sm border rounded-md bg-gray-50" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">কেন্দ্রের নাম (Auto-filled)</label>
                                                <input type="text" value={data.center_name} disabled className="w-full px-2 py-1.5 text-sm border rounded-md bg-gray-50" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-2">২১. পারিবারিক সম্পদ (স্থাবর ও অস্থাবর)</label>
                                            <div className="overflow-x-auto">
                                                <table className="w-full border text-xs">
                                                    <thead>
                                                        <tr>
                                                            <th className="border p-1">স্থাবর পরিমাণ</th>
                                                            <th className="border p-1">আনুমানিক মূল্য</th>
                                                            <th className="border p-1">অস্থাবর বিবরণ</th>
                                                            <th className="border p-1">আনুমানিক মূল্য</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(data.family_assets || []).map((row, idx) => (
                                                            <tr key={idx}>
                                                                <td className="border p-1"><input type="text" value={row.fixed_quantity} onChange={(e) => setData('family_assets', data.family_assets.map((r, i) => i === idx ? { ...r, fixed_quantity: e.target.value } : r))} className="w-full px-1 py-0.5 border rounded" /></td>
                                                                <td className="border p-1"><input type="text" value={row.fixed_value} onChange={(e) => setData('family_assets', data.family_assets.map((r, i) => i === idx ? { ...r, fixed_value: e.target.value } : r))} className="w-full px-1 py-0.5 border rounded" /></td>
                                                                <td className="border p-1"><input type="text" value={row.movable_desc} onChange={(e) => setData('family_assets', data.family_assets.map((r, i) => i === idx ? { ...r, movable_desc: e.target.value } : r))} className="w-full px-1 py-0.5 border rounded" /></td>
                                                                <td className="border p-1"><input type="text" value={row.movable_value} onChange={(e) => setData('family_assets', data.family_assets.map((r, i) => i === idx ? { ...r, movable_value: e.target.value } : r))} className="w-full px-1 py-0.5 border rounded" /></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">অনুমোদনকারীর স্বাক্ষর ও সিল</label>
                                            {data.approver_signature ? (
                                                <div className="relative">
                                                    <img src={data.approver_signature} alt="Approver" className="w-24 h-12 object-contain border rounded" />
                                                    <button onClick={() => setData('approver_signature', null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X className="w-3 h-3" /></button>
                                                </div>
                                            ) : (
                                                <label className="flex items-center gap-2 px-3 py-2 bg-gray-100 border border-dashed rounded cursor-pointer hover:bg-gray-200 w-fit">
                                                    <Upload className="w-4 h-4" />
                                                    <span className="text-xs">Upload</span>
                                                    <input type="file" accept="image/png,image/jpg,image/jpeg" onChange={(e) => handleImageUpload('approver_signature', e.target.files?.[0] || null)} className="hidden" />
                                                </label>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">আবেদনকারীর ছবি</label>
                                            {data.applicant_photo ? (
                                                <div className="relative">
                                                    <img src={data.applicant_photo} alt="Applicant" className="w-20 h-24 object-cover border rounded" />
                                                    <button onClick={() => removeImage('applicant_photo')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="flex items-center gap-2 px-3 py-2 bg-gray-100 border border-dashed rounded cursor-pointer hover:bg-gray-200 w-fit">
                                                    <Upload className="w-4 h-4" />
                                                    <span className="text-xs">Upload Photo</span>
                                                    <input type="file" accept="image/png,image/jpg,image/jpeg" onChange={(e) => handleImageUpload('applicant_photo', e.target.files?.[0] || null)} className="hidden" />
                                                </label>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">প্রস্তাবকারীর ছবি</label>
                                            {data.proposer_photo ? (
                                                <div className="relative">
                                                    <img src={data.proposer_photo} alt="Proposer" className="w-20 h-24 object-cover border rounded" />
                                                    <button onClick={() => removeImage('proposer_photo')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="flex items-center gap-2 px-3 py-2 bg-gray-100 border border-dashed rounded cursor-pointer hover:bg-gray-200 w-fit">
                                                    <Upload className="w-4 h-4" />
                                                    <span className="text-xs">Upload Photo</span>
                                                    <input type="file" accept="image/png,image/jpg,image/jpeg" onChange={(e) => handleImageUpload('proposer_photo', e.target.files?.[0] || null)} className="hidden" />
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Page 1: Personal Details - All Fields Editable */}
                                <div className="bg-white rounded-lg shadow-sm p-4 border">
                                    <h3 className="text-sm font-bold mb-3">Page 1: Personal Details (Editable)</h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium mb-1">সদস্যের নাম</label>
                                                <input
                                                    type="text"
                                                    value={data.member_name_detail}
                                                    onChange={(e) => setData('member_name_detail', e.target.value)}
                                                    className="w-full px-2 py-1.5 text-sm border rounded-md"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">পিতা/স্বামীর নাম</label>
                                                <input
                                                    type="text"
                                                    value={data.father_husband_name}
                                                    onChange={(e) => setData('father_husband_name', e.target.value)}
                                                    className="w-full px-2 py-1.5 text-sm border rounded-md"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium mb-1">মাতার নাম</label>
                                                <input
                                                    type="text"
                                                    value={data.mother_name}
                                                    onChange={(e) => setData('mother_name', e.target.value)}
                                                    className="w-full px-2 py-1.5 text-sm border rounded-md"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">জন্ম তারিখ</label>
                                                <input
                                                    type="date"
                                                    value={data.date_of_birth}
                                                    onChange={(e) => setData('date_of_birth', e.target.value)}
                                                    className="w-full px-2 py-1.5 text-sm border rounded-md"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium mb-1">বয়স (Auto-calculated)</label>
                                                <input
                                                    type="number"
                                                    value={data.age}
                                                    disabled
                                                    className="w-full px-2 py-1.5 text-sm border rounded-md bg-gray-50"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">জাতীয়তা</label>
                                                <input
                                                    type="text"
                                                    value={data.nationality}
                                                    onChange={(e) => setData('nationality', e.target.value)}
                                                    className="w-full px-2 py-1.5 text-sm border rounded-md"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium mb-1">পেশা</label>
                                                <input
                                                    type="text"
                                                    value={data.occupation}
                                                    onChange={(e) => setData('occupation', e.target.value)}
                                                    className="w-full px-2 py-1.5 text-sm border rounded-md"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">শিক্ষাগত যোগ্যতা</label>
                                                <input
                                                    type="text"
                                                    value={data.educational_qualification}
                                                    onChange={(e) => setData('educational_qualification', e.target.value)}
                                                    className="w-full px-2 py-1.5 text-sm border rounded-md"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium mb-1">ধর্ম</label>
                                                <input
                                                    type="text"
                                                    value={data.religion}
                                                    onChange={(e) => setData('religion', e.target.value)}
                                                    className="w-full px-2 py-1.5 text-sm border rounded-md"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">লিঙ্গ</label>
                                                <select
                                                    value={data.gender}
                                                    onChange={(e) => setData('gender', e.target.value)}
                                                    className="w-full px-2 py-1.5 text-sm border rounded-md"
                                                >
                                                    <option value="">নির্বাচন করুন</option>
                                                    <option value="পুরুষ">পুরুষ</option>
                                                    <option value="মহিলা">মহিলা</option>
                                                    <option value="অন্যান্য">অন্যান্য</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium mb-1">মোবাইল নং</label>
                                                <input
                                                    type="text"
                                                    value={data.mobile_number}
                                                    onChange={(e) => setData('mobile_number', e.target.value)}
                                                    className="w-full px-2 py-1.5 text-sm border rounded-md"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">বিকল্প মোবাইল নং</label>
                                                <input
                                                    type="text"
                                                    value={data.alternative_mobile}
                                                    onChange={(e) => setData('alternative_mobile', e.target.value)}
                                                    className="w-full px-2 py-1.5 text-sm border rounded-md"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium mb-1">NID/Smart Card No</label>
                                                <input
                                                    type="text"
                                                    value={data.nid_smart_card}
                                                    onChange={(e) => setData('nid_smart_card', e.target.value)}
                                                    className="w-full px-2 py-1.5 text-sm border rounded-md"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">পরিচয়পত্র নং (যদি থাকে)</label>
                                                <input
                                                    type="text"
                                                    value={data.id_card_number}
                                                    onChange={(e) => setData('id_card_number', e.target.value)}
                                                    className="w-full px-2 py-1.5 text-sm border rounded-md"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">বর্তমান ঠিকানা</label>
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    placeholder="গ্রাম/রাস্তা"
                                                    value={data.current_address_line1}
                                                    onChange={(e) => setData('current_address_line1', e.target.value)}
                                                    className="w-full px-2 py-1.5 text-sm border rounded-md"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="ইউনিয়ন"
                                                    value={data.current_address_line2}
                                                    onChange={(e) => setData('current_address_line2', e.target.value)}
                                                    className="w-full px-2 py-1.5 text-sm border rounded-md"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="উপজেলা, জেলা, ডাক কোড"
                                                    value={data.current_address_line3}
                                                    onChange={(e) => setData('current_address_line3', e.target.value)}
                                                    className="w-full px-2 py-1.5 text-sm border rounded-md"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">স্থায়ী ঠিকানা</label>
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    placeholder="গ্রাম/রাস্তা"
                                                    value={data.permanent_address_line1}
                                                    onChange={(e) => setData('permanent_address_line1', e.target.value)}
                                                    className="w-full px-2 py-1.5 text-sm border rounded-md"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="ইউনিয়ন"
                                                    value={data.permanent_address_line2}
                                                    onChange={(e) => setData('permanent_address_line2', e.target.value)}
                                                    className="w-full px-2 py-1.5 text-sm border rounded-md"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="উপজেলা, জেলা, ডাক কোড"
                                                    value={data.permanent_address_line3}
                                                    onChange={(e) => setData('permanent_address_line3', e.target.value)}
                                                    className="w-full px-2 py-1.5 text-sm border rounded-md"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">ভোটার নং</label>
                                            <input
                                                type="text"
                                                value={data.voter_id_number}
                                                onChange={(e) => setData('voter_id_number', e.target.value)}
                                                className="w-full px-2 py-1.5 text-sm border rounded-md"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium mb-1">পুরুষ সংখ্যা</label>
                                                <input
                                                    type="number"
                                                    value={data.male_count}
                                                    onChange={(e) => setData('male_count', parseInt(e.target.value) || 0)}
                                                    className="w-full px-2 py-1.5 text-sm border rounded-md"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">মহিলা সংখ্যা</label>
                                                <input
                                                    type="number"
                                                    value={data.female_count}
                                                    onChange={(e) => setData('female_count', parseInt(e.target.value) || 0)}
                                                    className="w-full px-2 py-1.5 text-sm border rounded-md"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-2">বিশেষ অবস্থা</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={data.is_freedom_fighter}
                                                        onChange={(e) => setData('is_freedom_fighter', e.target.checked)}
                                                        className="w-4 h-4"
                                                    />
                                                    <span className="text-xs">মুক্তিযোদ্ধা</span>
                                                </label>
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={data.is_widow_divorced}
                                                        onChange={(e) => setData('is_widow_divorced', e.target.checked)}
                                                        className="w-4 h-4"
                                                    />
                                                    <span className="text-xs">বিধবা/স্বামী পরিত্যক্তা</span>
                                                </label>
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={data.is_ethnic_minority}
                                                        onChange={(e) => setData('is_ethnic_minority', e.target.checked)}
                                                        className="w-4 h-4"
                                                    />
                                                    <span className="text-xs">ক্ষুদ্র নৃ-গোষ্ঠী</span>
                                                </label>
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={data.is_physically_disabled}
                                                        onChange={(e) => setData('is_physically_disabled', e.target.checked)}
                                                        className="w-4 h-4"
                                                    />
                                                    <span className="text-xs">শারীরিক প্রতিবন্ধী</span>
                                                </label>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">দরিদ্রতার সনদ</label>
                                            <div className="flex gap-4">
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name="has_poverty_certificate"
                                                        checked={data.has_poverty_certificate === true}
                                                        onChange={() => setData('has_poverty_certificate', true)}
                                                        className="w-4 h-4"
                                                    />
                                                    <span className="text-xs">আছে</span>
                                                </label>
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name="has_poverty_certificate"
                                                        checked={data.has_poverty_certificate === false}
                                                        onChange={() => setData('has_poverty_certificate', false)}
                                                        className="w-4 h-4"
                                                    />
                                                    <span className="text-xs">নাই</span>
                                                </label>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">বর্তমান ঋণের পরিমাণ (অন্যান্য উৎস থেকে)</label>
                                            <input
                                                type="number"
                                                value={data.current_loan_amount}
                                                onChange={(e) => setData('current_loan_amount', parseFloat(e.target.value) || 0)}
                                                className="w-full px-2 py-1.5 text-sm border rounded-md"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">অন্যান্য ঋণের সূত্র</label>
                                            <textarea
                                                value={data.other_loan_source}
                                                onChange={(e) => setData('other_loan_source', e.target.value)}
                                                rows={2}
                                                className="w-full px-2 py-1.5 text-sm border rounded-md"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Page 1: Property Details Table */}
                                <div className="bg-white rounded-lg shadow-sm p-4 border">
                                    <h3 className="text-sm font-bold mb-3">সম্পত্তির বিবরণ</h3>
                                    <div className="space-y-2">
                                        {data.property_details.map((item, index) => (
                                            <div key={index} className="grid grid-cols-4 gap-2 text-xs">
                                                <div>
                                                    <label className="block text-xs mb-1">জমির পরিমাণ</label>
                                                    <input
                                                        type="text"
                                                        value={item.land_area_decimal}
                                                        onChange={(e) => {
                                                            const newDetails = [...data.property_details];
                                                            newDetails[index].land_area_decimal = e.target.value;
                                                            setData('property_details', newDetails);
                                                        }}
                                                        className="w-full px-2 py-1 text-xs border rounded"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs mb-1">ঘরের ধরন</label>
                                                    <input
                                                        type="text"
                                                        value={item.house_type_rooms}
                                                        onChange={(e) => {
                                                            const newDetails = [...data.property_details];
                                                            newDetails[index].house_type_rooms = e.target.value;
                                                            setData('property_details', newDetails);
                                                        }}
                                                        className="w-full px-2 py-1 text-xs border rounded"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs mb-1">ফ্রিজ/টিভি</label>
                                                    <input
                                                        type="text"
                                                        value={item.fridge_tv}
                                                        onChange={(e) => {
                                                            const newDetails = [...data.property_details];
                                                            newDetails[index].fridge_tv = e.target.value;
                                                            setData('property_details', newDetails);
                                                        }}
                                                        className="w-full px-2 py-1 text-xs border rounded"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs mb-1">মোট সম্পদ</label>
                                                    <input
                                                        type="text"
                                                        value={item.total_assets_taka}
                                                        onChange={(e) => {
                                                            const newDetails = [...data.property_details];
                                                            newDetails[index].total_assets_taka = e.target.value;
                                                            setData('property_details', newDetails);
                                                        }}
                                                        className="w-full px-2 py-1 text-xs border rounded"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => setData('property_details', [...data.property_details, { land_area_decimal: '', house_type_rooms: '', fridge_tv: '', total_assets_taka: '' }])}
                                            className="text-xs text-blue-600 hover:text-blue-800"
                                        >
                                            + Add Row
                                        </button>
                                    </div>
                                </div>

                                {/* Page 1: Income Sources Table */}
                                <div className="bg-white rounded-lg shadow-sm p-4 border">
                                    <h3 className="text-sm font-bold mb-3">আয়ের উৎস ও পরিমাণ</h3>
                                    <div className="space-y-2">
                                        {data.income_sources.map((item, index) => (
                                            <div key={index} className="grid grid-cols-2 gap-2 text-xs">
                                                <div>
                                                    <label className="block text-xs mb-1">{item.source}</label>
                                                    <input
                                                        type="number"
                                                        value={item.monthly_income}
                                                        onChange={(e) => {
                                                            const newSources = [...data.income_sources];
                                                            newSources[index].monthly_income = parseFloat(e.target.value) || 0;
                                                            setData('income_sources', newSources);
                                                        }}
                                                        className="w-full px-2 py-1 text-xs border rounded"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Page 1: Proposer & Recommender Details */}
                                <div className="bg-white rounded-lg shadow-sm p-4 border">
                                    <h3 className="text-sm font-bold mb-3">প্রস্তাবকারী ও সুপারিশকারীর তথ্য</h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium mb-1">প্রস্তাবকারী সদস্য কোড</label>
                                                <input
                                                    type="text"
                                                    value={data.proposer_member_code}
                                                    onChange={(e) => setData('proposer_member_code', e.target.value)}
                                                    className="w-full px-2 py-1.5 text-sm border rounded-md"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">প্রস্তাবকারীর নাম</label>
                                                <input
                                                    type="text"
                                                    value={data.proposer_name}
                                                    onChange={(e) => setData('proposer_name', e.target.value)}
                                                    className="w-full px-2 py-1.5 text-sm border rounded-md"
                                                />
                                            </div>
                                        </div>
                                        {/* Add more proposer/recommender fields... */}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Page 2: ক্যাটাগরি ঋণের প্রোফাইল */}
                        {activePage === 2 && (
                            <>
                                {/* ক. উদ্যোগ বিষয়ক সাধারণ তথ্যাবলী */}
                                <div className="bg-white rounded-lg shadow-sm p-4 border">
                                    <h3 className="text-sm font-bold mb-3">ক. উদ্যোগ বিষয়ক সাধারণ তথ্যাবলী</h3>
                                    <div className="space-y-3 text-sm">
                                        <div>
                                            <label className="block text-xs font-medium mb-1">১. প্রস্তাবিত প্রকল্পের নাম</label>
                                            <input type="text" value={data.proposed_project_name} onChange={(e) => setData('proposed_project_name', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">২. উদ্যোক্তাদের সংশ্লিষ্টতা</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-xs">(ক) সার্বক্ষণিক: বছর</label>
                                                    <input type="text" value={data.entrepreneur_fulltime_years} onChange={(e) => setData('entrepreneur_fulltime_years', e.target.value)} className="w-full px-2 py-1 text-xs border rounded" />
                                                </div>
                                                <div>
                                                    <label className="text-xs">মাস</label>
                                                    <input type="text" value={data.entrepreneur_fulltime_months} onChange={(e) => setData('entrepreneur_fulltime_months', e.target.value)} className="w-full px-2 py-1 text-xs border rounded" />
                                                </div>
                                                <div>
                                                    <label className="text-xs">(খ) খণ্ডকালীন: বছর</label>
                                                    <input type="text" value={data.entrepreneur_parttime_years} onChange={(e) => setData('entrepreneur_parttime_years', e.target.value)} className="w-full px-2 py-1 text-xs border rounded" />
                                                </div>
                                                <div>
                                                    <label className="text-xs">মাস</label>
                                                    <input type="text" value={data.entrepreneur_parttime_months} onChange={(e) => setData('entrepreneur_parttime_months', e.target.value)} className="w-full px-2 py-1 text-xs border rounded" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs font-medium mb-1">৩. ঋণ কার্যক্রমে অভিজ্ঞতা: বছর</label>
                                                <input type="text" value={data.loan_experience_years} onChange={(e) => setData('loan_experience_years', e.target.value)} className="w-full px-2 py-1 text-xs border rounded" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">মাস</label>
                                                <input type="text" value={data.loan_experience_months} onChange={(e) => setData('loan_experience_months', e.target.value)} className="w-full px-2 py-1 text-xs border rounded" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">৪. প্রকল্পে নিয়োগকৃত লোকবল</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-xs">মোট</label>
                                                    <input type="text" value={data.project_manpower_total} onChange={(e) => setData('project_manpower_total', e.target.value)} className="w-full px-2 py-1 text-xs border rounded" />
                                                </div>
                                                <div>
                                                    <label className="text-xs">(ক) পরিবারের মধ্য হতে</label>
                                                    <input type="text" value={data.project_manpower_family} onChange={(e) => setData('project_manpower_family', e.target.value)} className="w-full px-2 py-1 text-xs border rounded" />
                                                </div>
                                                <div>
                                                    <label className="text-xs">(খ) পরিবারের বাইরে</label>
                                                    <input type="text" value={data.project_manpower_outside} onChange={(e) => setData('project_manpower_outside', e.target.value)} className="w-full px-2 py-1 text-xs border rounded" />
                                                </div>
                                                <div>
                                                    <label className="text-xs">(গ) প্রশিক্ষণপ্রাপ্ত</label>
                                                    <input type="text" value={data.project_manpower_trained} onChange={(e) => setData('project_manpower_trained', e.target.value)} className="w-full px-2 py-1 text-xs border rounded" />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">৫. কাঁচামাল ক্রয়ের স্থান (নাম ও ঠিকানাসহ)</label>
                                            <input type="text" value={data.raw_material_purchase_location} onChange={(e) => setData('raw_material_purchase_location', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">৫. উৎপাদিত পণ্য বাজারজাতকরণের স্থান (নাম ও ঠিকানাসহ)</label>
                                            <input type="text" value={data.product_marketing_location} onChange={(e) => setData('product_marketing_location', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">৬. বিগত ০১ বছরের আর্থিক তথ্য</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                    <label className="text-xs">পুঁজির পরিমাণ</label>
                                                    <input type="text" value={data.last_year_capital} onChange={(e) => setData('last_year_capital', e.target.value)} className="w-full px-2 py-1 text-xs border rounded" />
                                                </div>
                                                <div>
                                                    <label className="text-xs">বিক্রয় (সারা বছর)</label>
                                                    <input type="text" value={data.last_year_sales} onChange={(e) => setData('last_year_sales', e.target.value)} className="w-full px-2 py-1 text-xs border rounded" />
                                                </div>
                                                <div>
                                                    <label className="text-xs">মোট লাভ/ক্ষতি</label>
                                                    <input type="text" value={data.last_year_profit_loss} onChange={(e) => setData('last_year_profit_loss', e.target.value)} className="w-full px-2 py-1 text-xs border rounded" />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">৭. লাইসেন্স ১</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                    <label className="text-xs">প্রদানকারী কর্তৃপক্ষ</label>
                                                    <input type="text" value={data.license1_authority} onChange={(e) => setData('license1_authority', e.target.value)} className="w-full px-2 py-1 text-xs border rounded" />
                                                </div>
                                                <div>
                                                    <label className="text-xs">লাইসেন্স নম্বর</label>
                                                    <input type="text" value={data.license1_number} onChange={(e) => setData('license1_number', e.target.value)} className="w-full px-2 py-1 text-xs border rounded" />
                                                </div>
                                                <div>
                                                    <label className="text-xs">মেয়াদ</label>
                                                    <input type="text" value={data.license1_validity} onChange={(e) => setData('license1_validity', e.target.value)} className="w-full px-2 py-1 text-xs border rounded" />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">৭. লাইসেন্স ২</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                    <label className="text-xs">প্রদানকারী কর্তৃপক্ষ</label>
                                                    <input type="text" value={data.license2_authority} onChange={(e) => setData('license2_authority', e.target.value)} className="w-full px-2 py-1 text-xs border rounded" />
                                                </div>
                                                <div>
                                                    <label className="text-xs">লাইসেন্স নম্বর</label>
                                                    <input type="text" value={data.license2_number} onChange={(e) => setData('license2_number', e.target.value)} className="w-full px-2 py-1 text-xs border rounded" />
                                                </div>
                                                <div>
                                                    <label className="text-xs">মেয়াদ</label>
                                                    <input type="text" value={data.license2_validity} onChange={(e) => setData('license2_validity', e.target.value)} className="w-full px-2 py-1 text-xs border rounded" />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">৭. আয়কর প্রত্যয়ন আছে কি?</label>
                                            <div className="flex gap-4">
                                                <label className="flex items-center gap-2">
                                                    <input type="radio" name="has_income_tax_clearance" checked={data.has_income_tax_clearance === true} onChange={() => setData('has_income_tax_clearance', true)} className="w-4 h-4" />
                                                    <span className="text-xs">হ্যাঁ</span>
                                                </label>
                                                <label className="flex items-center gap-2">
                                                    <input type="radio" name="has_income_tax_clearance" checked={data.has_income_tax_clearance === false} onChange={() => setData('has_income_tax_clearance', false)} className="w-4 h-4" />
                                                    <span className="text-xs">না</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* খ. আর্থিক তথ্য বিবরণী সমূহ */}
                                <div className="bg-white rounded-lg shadow-sm p-4 border">
                                    <h3 className="text-sm font-bold mb-3">খ. আর্থিক তথ্য বিবরণী সমূহ</h3>
                                    <div className="space-y-3 text-sm">
                                        <div>
                                            <label className="block text-xs font-medium mb-1">১. সদস্য এ' পর্যন্ত কতো দফায় ঋণ গ্রহণ করেছে</label>
                                            <input type="text" value={data.total_loans_taken} onChange={(e) => setData('total_loans_taken', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-2">সর্বশেষ ৩ দফার ঋণ</label>
                                            {(data.last_three_loans || []).map((loan, idx) => (
                                                <div key={idx} className="border p-2 mb-2 rounded">
                                                    <p className="text-xs font-bold mb-1">দফা {idx + 1}</p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="text-xs">দফা নং</label>
                                                            <input type="text" value={loan.loan_number} onChange={(e) => setData('last_three_loans', data.last_three_loans.map((l, i) => i === idx ? { ...l, loan_number: e.target.value } : l))} className="w-full px-2 py-1 text-xs border rounded" />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs">ঋণ গ্রহণের তারিখ</label>
                                                            <input type="date" value={loan.loan_date} onChange={(e) => setData('last_three_loans', data.last_three_loans.map((l, i) => i === idx ? { ...l, loan_date: e.target.value } : l))} className="w-full px-2 py-1 text-xs border rounded" />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs">গৃহীত ঋণের পরিমাণ</label>
                                                            <input type="text" value={loan.loan_amount} onChange={(e) => setData('last_three_loans', data.last_three_loans.map((l, i) => i === idx ? { ...l, loan_amount: e.target.value } : l))} className="w-full px-2 py-1 text-xs border rounded" />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs">প্রকল্পের নাম</label>
                                                            <input type="text" value={loan.project_name} onChange={(e) => setData('last_three_loans', data.last_three_loans.map((l, i) => i === idx ? { ...l, project_name: e.target.value } : l))} className="w-full px-2 py-1 text-xs border rounded" />
                                                        </div>
                                                        <div className="col-span-2">
                                                            <label className="text-xs">সঞ্চয় স্থিতি</label>
                                                            <input type="text" value={loan.savings_status} onChange={(e) => setData('last_three_loans', data.last_three_loans.map((l, i) => i === idx ? { ...l, savings_status: e.target.value } : l))} className="w-full px-2 py-1 text-xs border rounded" />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-2">২. অন্যান্য উৎস থেকে গৃহীত ঋণ (চলমান)</label>
                                            {(data.other_ongoing_loans || []).map((loan, idx) => (
                                                <div key={idx} className="border p-2 mb-2 rounded">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="text-xs">সংস্থা/প্রতিষ্ঠানের নাম</label>
                                                            <input type="text" value={loan.organization_name} onChange={(e) => setData('other_ongoing_loans', data.other_ongoing_loans.map((l, i) => i === idx ? { ...l, organization_name: e.target.value } : l))} className="w-full px-2 py-1 text-xs border rounded" />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs">বর্তমান গৃহীত ঋণের পরিমাণ</label>
                                                            <input type="text" value={loan.current_loan_amount} onChange={(e) => setData('other_ongoing_loans', data.other_ongoing_loans.map((l, i) => i === idx ? { ...l, current_loan_amount: e.target.value } : l))} className="w-full px-2 py-1 text-xs border rounded" />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs">ঋণের মেয়াদ</label>
                                                            <input type="text" value={loan.loan_term} onChange={(e) => setData('other_ongoing_loans', data.other_ongoing_loans.map((l, i) => i === idx ? { ...l, loan_term: e.target.value } : l))} className="w-full px-2 py-1 text-xs border rounded" />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs">তথ্য প্রদানকারীর নাম</label>
                                                            <input type="text" value={loan.info_provider_name} onChange={(e) => setData('other_ongoing_loans', data.other_ongoing_loans.map((l, i) => i === idx ? { ...l, info_provider_name: e.target.value } : l))} className="w-full px-2 py-1 text-xs border rounded" />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs">মোবাইল নম্বর</label>
                                                            <input type="text" value={loan.mobile_number} onChange={(e) => setData('other_ongoing_loans', data.other_ongoing_loans.map((l, i) => i === idx ? { ...l, mobile_number: e.target.value } : l))} className="w-full px-2 py-1 text-xs border rounded" />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs">মন্তব্য</label>
                                                            <input type="text" value={loan.remarks} onChange={(e) => setData('other_ongoing_loans', data.other_ongoing_loans.map((l, i) => i === idx ? { ...l, remarks: e.target.value } : l))} className="w-full px-2 py-1 text-xs border rounded" />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-2">৩. বিনিয়োগের পরিকল্পনা: তহবিলের উৎস</label>
                                            {(data.investment_plan_sources || []).map((item, idx) => (
                                                <div key={idx} className="grid grid-cols-2 gap-2 mb-1">
                                                    <input type="text" value={item.source} onChange={(e) => setData('investment_plan_sources', data.investment_plan_sources.map((s, i) => i === idx ? { ...s, source: e.target.value } : s))} className="w-full px-2 py-1 text-xs border rounded" />
                                                    <input type="text" value={item.amount} onChange={(e) => setData('investment_plan_sources', data.investment_plan_sources.map((s, i) => i === idx ? { ...s, amount: e.target.value } : s))} placeholder="টাকার পরিমাণ" className="w-full px-2 py-1 text-xs border rounded" />
                                                </div>
                                            ))}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-2">৩. বিনিয়োগের পরিকল্পনা: তহবিলের ব্যবহার</label>
                                            {(data.investment_plan_uses || []).map((item, idx) => (
                                                <div key={idx} className="grid grid-cols-2 gap-2 mb-1">
                                                    <input type="text" value={item.use} onChange={(e) => setData('investment_plan_uses', data.investment_plan_uses.map((u, i) => i === idx ? { ...u, use: e.target.value } : u))} className="w-full px-2 py-1 text-xs border rounded" />
                                                    <input type="text" value={item.amount} onChange={(e) => setData('investment_plan_uses', data.investment_plan_uses.map((u, i) => i === idx ? { ...u, amount: e.target.value } : u))} placeholder="টাকার পরিমাণ" className="w-full px-2 py-1 text-xs border rounded" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Page 3: উদ্যোগের আয়-ব্যয় হিসাব, জামিনদার, তথ্য প্রদানকারী */}
                        {activePage === 3 && (
                            <>
                                {/* ০৪. উদ্যোগের ১/১.৫/২ বছর এর সম্ভাব্য আয়-ব্যয় হিসাব */}
                                <div className="bg-white rounded-lg shadow-sm p-4 border">
                                    <h3 className="text-sm font-bold mb-3">০৪. উদ্যোগের ১/১.৫/২ বছর এর সম্ভাব্য আয়-ব্যয় হিসাব</h3>
                                    <div className="space-y-3 text-sm">
                                        <div>
                                            <label className="block text-xs font-medium mb-2">উদ্যোগ পরিচালনা ব্যয়</label>
                                            {(data.initiative_expenses || []).map((expense, idx) => (
                                                <div key={idx} className="grid grid-cols-2 gap-2 mb-1">
                                                    <input type="text" value={expense.category} onChange={(e) => setData('initiative_expenses', data.initiative_expenses.map((ex, i) => i === idx ? { ...ex, category: e.target.value } : ex))} className="w-full px-2 py-1 text-xs border rounded" />
                                                    <input type="text" value={expense.amount} onChange={(e) => setData('initiative_expenses', data.initiative_expenses.map((ex, i) => i === idx ? { ...ex, amount: e.target.value } : ex))} placeholder="টাকার পরিমাণ" className="w-full px-2 py-1 text-xs border rounded" />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs font-medium mb-1">মোট ব্যয়</label>
                                                <input type="text" value={data.initiative_total_expenditure} onChange={(e) => setData('initiative_total_expenditure', e.target.value)} className="w-full px-2 py-1 text-xs border rounded" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">নিট লাভ/উদ্বৃত্ত</label>
                                                <input type="text" value={data.initiative_net_profit} onChange={(e) => setData('initiative_net_profit', e.target.value)} className="w-full px-2 py-1 text-xs border rounded" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">উদ্যোগের মূল আয় (মূল আয়ের খাত উল্লেখ করতে হবে)</label>
                                            <input type="text" value={data.initiative_main_income} onChange={(e) => setData('initiative_main_income', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">অন্যান্য আয় (খাত উল্লেখ করতে হবে)</label>
                                            <input type="text" value={data.initiative_other_income} onChange={(e) => setData('initiative_other_income', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs font-medium mb-1">উদ্যোগের মোট আয়ের ...% ব্যয় হবে</label>
                                                <input type="text" value={data.initiative_expenditure_percentage} onChange={(e) => setData('initiative_expenditure_percentage', e.target.value)} className="w-full px-2 py-1 text-xs border rounded" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">উদ্যোগের মোট আয়ের ...% নিট লাভ থাকবে</label>
                                                <input type="text" value={data.initiative_profit_percentage} onChange={(e) => setData('initiative_profit_percentage', e.target.value)} className="w-full px-2 py-1 text-xs border rounded" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* গ. অন্যান্য তথ্যাবলী */}
                                <div className="bg-white rounded-lg shadow-sm p-4 border">
                                    <h3 className="text-sm font-bold mb-3">গ. অন্যান্য তথ্যাবলী</h3>
                                    <div className="space-y-3 text-sm">
                                        {/* ০১. ঋণের মেয়াদ ও সার্ভিস চার্জ */}
                                        <div>
                                            <label className="block text-xs font-medium mb-1">০১. (ক) ঋণের মেয়াদ</label>
                                            <input type="text" value={data.loan_term_months} onChange={(e) => setData('loan_term_months', e.target.value)} placeholder="মাস" className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">(খ) আরোপিত ঋণের সার্ভিস চার্জের হার (%)</label>
                                            <input type="text" value={data.loan_service_charge_rate} onChange={(e) => setData('loan_service_charge_rate', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">(গ) ঋণ পরিশোধের তফশিল</label>
                                            <div className="space-y-2">
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div>
                                                        <label className="text-xs">মাসিক কিস্তি: আসল</label>
                                                        <input type="text" value={data.repayment_schedule_monthly_principal} onChange={(e) => setData('repayment_schedule_monthly_principal', e.target.value)} className="w-full px-2 py-1 text-xs border rounded" />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs">সার্ভিস চার্জ</label>
                                                        <input type="text" value={data.repayment_schedule_monthly_service_charge} onChange={(e) => setData('repayment_schedule_monthly_service_charge', e.target.value)} className="w-full px-2 py-1 text-xs border rounded" />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs">মোট</label>
                                                        <input type="text" value={data.repayment_schedule_monthly_total} onChange={(e) => setData('repayment_schedule_monthly_total', e.target.value)} className="w-full px-2 py-1 text-xs border rounded" />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs">মোট পরিশোধ: আসল</label>
                                                        <input type="text" value={data.repayment_schedule_total_principal} onChange={(e) => setData('repayment_schedule_total_principal', e.target.value)} className="w-full px-2 py-1 text-xs border rounded" />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs">সার্ভিস চার্জ</label>
                                                        <input type="text" value={data.repayment_schedule_total_service_charge} onChange={(e) => setData('repayment_schedule_total_service_charge', e.target.value)} className="w-full px-2 py-1 text-xs border rounded" />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs">মোট</label>
                                                        <input type="text" value={data.repayment_schedule_total_amount} onChange={(e) => setData('repayment_schedule_total_amount', e.target.value)} className="w-full px-2 py-1 text-xs border rounded" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ০২. জামিনদারের তথ্য */}
                                        <div>
                                            <label className="block text-xs font-medium mb-2">০২. জামিনদারের তথ্য</label>
                                            {(data.guarantors || []).map((guarantor, idx) => (
                                                <div key={idx} className="border p-2 mb-2 rounded">
                                                    <p className="font-bold text-xs mb-1">{idx === 0 ? '১ম জামিনদার' : '২য় জামিনদার'}</p>
                                                    <div className="space-y-2">
                                                        <input type="text" value={guarantor.name} onChange={(e) => setData('guarantors', data.guarantors.map((g, i) => i === idx ? { ...g, name: e.target.value } : g))} placeholder="জামিনদারের নাম" className="w-full px-2 py-1 text-xs border rounded" />
                                                        <input type="text" value={guarantor.address} onChange={(e) => setData('guarantors', data.guarantors.map((g, i) => i === idx ? { ...g, address: e.target.value } : g))} placeholder="ঠিকানা" className="w-full px-2 py-1 text-xs border rounded" />
                                                        <input type="text" value={guarantor.mobile_number} onChange={(e) => setData('guarantors', data.guarantors.map((g, i) => i === idx ? { ...g, mobile_number: e.target.value } : g))} placeholder="মোবাইল নম্বর" className="w-full px-2 py-1 text-xs border rounded" />
                                                        <input type="text" value={guarantor.relationship_with_borrower} onChange={(e) => setData('guarantors', data.guarantors.map((g, i) => i === idx ? { ...g, relationship_with_borrower: e.target.value } : g))} placeholder="ঋণীর সাথে সম্পর্ক" className="w-full px-2 py-1 text-xs border rounded" />
                                                        <input type="text" value={guarantor.occupation} onChange={(e) => setData('guarantors', data.guarantors.map((g, i) => i === idx ? { ...g, occupation: e.target.value } : g))} placeholder="পেশা" className="w-full px-2 py-1 text-xs border rounded" />
                                                        <input type="text" value={guarantor.monthly_income} onChange={(e) => setData('guarantors', data.guarantors.map((g, i) => i === idx ? { ...g, monthly_income: e.target.value } : g))} placeholder="মাসিক আয়" className="w-full px-2 py-1 text-xs border rounded" />
                                                        <input type="text" value={guarantor.asset_amount} onChange={(e) => setData('guarantors', data.guarantors.map((g, i) => i === idx ? { ...g, asset_amount: e.target.value } : g))} placeholder="সম্পদের পরিমাণ" className="w-full px-2 py-1 text-xs border rounded" />
                                                        <input type="text" value={guarantor.estimated_value} onChange={(e) => setData('guarantors', data.guarantors.map((g, i) => i === idx ? { ...g, estimated_value: e.target.value } : g))} placeholder="সম্ভাব্য মূল্য" className="w-full px-2 py-1 text-xs border rounded" />
                                                        <input type="text" value={guarantor.interviewer_name} onChange={(e) => setData('guarantors', data.guarantors.map((g, i) => i === idx ? { ...g, interviewer_name: e.target.value } : g))} placeholder="সাক্ষাতকারীর নাম" className="w-full px-2 py-1 text-xs border rounded" />
                                                        <input type="text" value={guarantor.interviewer_designation} onChange={(e) => setData('guarantors', data.guarantors.map((g, i) => i === idx ? { ...g, interviewer_designation: e.target.value } : g))} placeholder="পদবী: বিএম/আরএম/জেডএম" className="w-full px-2 py-1 text-xs border rounded" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* ০৩. তথ্য প্রদানকারী */}
                                        <div>
                                            <label className="block text-xs font-medium mb-2">০৩. ঋণী ও জামিনদার সম্পর্কে তথ্য প্রদানকারী</label>
                                            {(data.information_providers || []).map((provider, idx) => (
                                                <div key={idx} className="border p-2 mb-2 rounded">
                                                    <p className="font-bold text-xs mb-1">{idx === 0 ? '১ম জন' : '২য় জন'}</p>
                                                    <div className="space-y-2">
                                                        <input type="text" value={provider.name} onChange={(e) => setData('information_providers', data.information_providers.map((p, i) => i === idx ? { ...p, name: e.target.value } : p))} placeholder="তথ্য প্রদানকারীর নাম" className="w-full px-2 py-1 text-xs border rounded" />
                                                        <input type="text" value={provider.address} onChange={(e) => setData('information_providers', data.information_providers.map((p, i) => i === idx ? { ...p, address: e.target.value } : p))} placeholder="ঠিকানা" className="w-full px-2 py-1 text-xs border rounded" />
                                                        <input type="text" value={provider.mobile_number} onChange={(e) => setData('information_providers', data.information_providers.map((p, i) => i === idx ? { ...p, mobile_number: e.target.value } : p))} placeholder="মোবাইল নম্বর" className="w-full px-2 py-1 text-xs border rounded" />
                                                        <input type="text" value={provider.relationship_with_borrower} onChange={(e) => setData('information_providers', data.information_providers.map((p, i) => i === idx ? { ...p, relationship_with_borrower: e.target.value } : p))} placeholder="ঋণীর সাথে সম্পর্ক" className="w-full px-2 py-1 text-xs border rounded" />
                                                        <input type="text" value={provider.occupation} onChange={(e) => setData('information_providers', data.information_providers.map((p, i) => i === idx ? { ...p, occupation: e.target.value } : p))} placeholder="পেশা" className="w-full px-2 py-1 text-xs border rounded" />
                                                        <textarea value={provider.loan_related_info} onChange={(e) => setData('information_providers', data.information_providers.map((p, i) => i === idx ? { ...p, loan_related_info: e.target.value } : p))} placeholder="ঋণ সংক্রান্ত তথ্য" rows={2} className="w-full px-2 py-1 text-xs border rounded" />
                                                        <textarea value={provider.asset_related_info} onChange={(e) => setData('information_providers', data.information_providers.map((p, i) => i === idx ? { ...p, asset_related_info: e.target.value } : p))} placeholder="সম্পদ সংক্রান্ত তথ্য" rows={2} className="w-full px-2 py-1 text-xs border rounded" />
                                                        <textarea value={provider.overall_remarks} onChange={(e) => setData('information_providers', data.information_providers.map((p, i) => i === idx ? { ...p, overall_remarks: e.target.value } : p))} placeholder="তথ্য প্রদানকারীর সার্বিক মন্তব্য" rows={2} className="w-full px-2 py-1 text-xs border rounded" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Page 4: I. Applicant Details (Continued) + II. ঘ. সংস্থার অফিস পর্যায়ে পূরণীয় */}
                        {activePage === 4 && (
                            <>
                                {/* ০৪. চাকরিজীবীর ক্ষেত্রে */}
                                <div className="bg-white rounded-lg shadow-sm p-4 border">
                                    <h3 className="text-sm font-bold mb-3">০৪. চাকরিজীবীর ক্ষেত্রে (প্রযোজ্য ক্ষেত্রে)</h3>
                                    <div className="space-y-3 text-sm">
                                        <div>
                                            <label className="block text-xs font-medium mb-1">কর্মস্থলের নাম</label>
                                            <input type="text" value={data.employee_workplace_name} onChange={(e) => setData('employee_workplace_name', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium mb-1">মাসিক বেতন</label>
                                                <input type="text" value={data.employee_monthly_salary} onChange={(e) => setData('employee_monthly_salary', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">হাতে প্রাপ্তি</label>
                                                <input type="text" value={data.employee_received_in_hand} onChange={(e) => setData('employee_received_in_hand', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">অন্যান্য খাতের আয়</label>
                                                <input type="text" value={data.employee_other_income} onChange={(e) => setData('employee_other_income', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">কর্মস্থলে ঋণ অনুমোদনকারীর উপস্থিতির তারিখ ও সময়</label>
                                                <input type="text" value={data.employee_approver_presence_date_time} onChange={(e) => setData('employee_approver_presence_date_time', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">সাথে কে ছিলো</label>
                                                <input type="text" value={data.employee_who_was_present} onChange={(e) => setData('employee_who_was_present', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">যে ব্যাংকে বেতন হয়</label>
                                                <input type="text" value={data.employee_salary_bank} onChange={(e) => setData('employee_salary_bank', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-xs font-medium mb-1">ব্যাংক স্টেটমেন্ট যাচাই অনুযায়ী হাতে বেতন পাওয়ার পরিমাণ</label>
                                                <input type="text" value={data.employee_bank_statement_verified_amount} onChange={(e) => setData('employee_bank_statement_verified_amount', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ০৫. প্রবাসী সদস্যের রেমিটেন্স */}
                                <div className="bg-white rounded-lg shadow-sm p-4 border">
                                    <h3 className="text-sm font-bold mb-3">০৫. প্রবাসী সদস্যের রেমিটেন্স এর তথ্য</h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium mb-1">মাসিক আয়</label>
                                                <input type="text" value={data.expatriate_monthly_income} onChange={(e) => setData('expatriate_monthly_income', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">যে চ্যানেলে আসে</label>
                                                <input type="text" value={data.expatriate_channel} onChange={(e) => setData('expatriate_channel', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">যা দেখে নিশ্চিত হলেন</label>
                                                <input type="text" value={data.expatriate_confirmation_source} onChange={(e) => setData('expatriate_confirmation_source', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">প্রবাসী সদস্য যে দেশে থাকে</label>
                                                <input type="text" value={data.expatriate_country} onChange={(e) => setData('expatriate_country', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">কতো বছর ধরে থাকে</label>
                                                <input type="text" value={data.expatriate_years_abroad} onChange={(e) => setData('expatriate_years_abroad', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">ওয়ার্ক পারমিট যাচাই</label>
                                                <div className="flex gap-4">
                                                    <label className="flex items-center gap-2">
                                                        <input type="radio" checked={data.expatriate_work_permit_verified === true} onChange={() => setData('expatriate_work_permit_verified', true)} className="w-4 h-4" />
                                                        <span className="text-xs">(ক) হ্যাঁ</span>
                                                    </label>
                                                    <label className="flex items-center gap-2">
                                                        <input type="radio" checked={data.expatriate_work_permit_verified === false} onChange={() => setData('expatriate_work_permit_verified', false)} className="w-4 h-4" />
                                                        <span className="text-xs">(খ) না</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ০৬. প্রকল্পে পরিবেশ ও আইনগত জটিলতা */}
                                <div className="bg-white rounded-lg shadow-sm p-4 border">
                                    <h3 className="text-sm font-bold mb-3">০৬. প্রকল্পে পরিবেশ ও আইনগত কোনো জটিলতা আছে কি-না?</h3>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2">
                                            <input type="radio" checked={data.has_environmental_legal_complexity === true} onChange={() => setData('has_environmental_legal_complexity', true)} className="w-4 h-4" />
                                            <span className="text-xs">(ক) হ্যাঁ</span>
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input type="radio" checked={data.has_environmental_legal_complexity === false} onChange={() => setData('has_environmental_legal_complexity', false)} className="w-4 h-4" />
                                            <span className="text-xs">(খ) না</span>
                                        </label>
                                    </div>
                                </div>

                                {/* ০৭. ঝুঁকি প্রতিরোধের উপায় */}
                                <div className="bg-white rounded-lg shadow-sm p-4 border">
                                    <h3 className="text-sm font-bold mb-3">০৭. ঝুঁকি প্রতিরোধের উপায়</h3>
                                    <div className="space-y-3 text-sm">
                                        <div>
                                            <label className="block text-xs font-medium mb-1">(ক) প্রযোজ্য ক্ষেত্রে দুর্যোগ মোকাবিলার অভিজ্ঞতা</label>
                                            <div className="flex gap-4">
                                                <label className="flex items-center gap-2">
                                                    <input type="radio" checked={data.has_disaster_management_experience === true} onChange={() => setData('has_disaster_management_experience', true)} className="w-4 h-4" />
                                                    <span className="text-xs">(i) আছে</span>
                                                </label>
                                                <label className="flex items-center gap-2">
                                                    <input type="radio" checked={data.has_disaster_management_experience === false} onChange={() => setData('has_disaster_management_experience', false)} className="w-4 h-4" />
                                                    <span className="text-xs">(ii) নাই</span>
                                                </label>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">(খ) প্রযোজ্য ক্ষেত্রে বাকিতে বিক্রয়ের পরিমাণ/হার</label>
                                            <div className="flex gap-4">
                                                <label className="flex items-center gap-2">
                                                    <input type="radio" checked={data.has_credit_sales === true} onChange={() => setData('has_credit_sales', true)} className="w-4 h-4" />
                                                    <span className="text-xs">(i) আছে</span>
                                                </label>
                                                <label className="flex items-center gap-2">
                                                    <input type="radio" checked={data.has_credit_sales === false} onChange={() => setData('has_credit_sales', false)} className="w-4 h-4" />
                                                    <span className="text-xs">(ii) নাই</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ০৮. ভবিষ্যতে ক্ষুদ্র উদ্যোগ বিষয়ে পরিকল্পনা */}
                                <div className="bg-white rounded-lg shadow-sm p-4 border">
                                    <h3 className="text-sm font-bold mb-3">০৮. ভবিষ্যতে ক্ষুদ্র উদ্যোগ বিষয়ে কি ধরণের পরিকল্পনা রয়েছে?</h3>
                                    <textarea value={data.future_small_venture_plans} onChange={(e) => setData('future_small_venture_plans', e.target.value)} rows={4} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                </div>

                                {/* ০৯. কর্মসংস্থান সংক্রান্ত তথ্য */}
                                <div className="bg-white rounded-lg shadow-sm p-4 border">
                                    <h3 className="text-sm font-bold mb-3">০৯. কর্মসংস্থান সংক্রান্ত তথ্য</h3>
                                    <div className="space-y-2">
                                        {(data.employment_data || []).map((row, idx) => (
                                            <div key={idx} className="border p-2 rounded space-y-2">
                                                <div>
                                                    <label className="block text-xs font-medium mb-1">ঋণ কার্যক্রমের নাম</label>
                                                    <input type="text" value={row.loan_activity_name} onChange={(e) => {
                                                        const newData = [...(data.employment_data || [])];
                                                        newData[idx].loan_activity_name = e.target.value;
                                                        setData('employment_data', newData);
                                                    }} className="w-full px-2 py-1 text-xs border rounded" />
                                                </div>
                                                <div className="grid grid-cols-5 gap-2 text-xs">
                                                    <div>
                                                        <label className="block text-xs mb-1">১. মহিলা (পূর্ণকালীন)</label>
                                                        <input type="text" value={row.self_employment_fulltime_female} onChange={(e) => {
                                                            const newData = [...(data.employment_data || [])];
                                                            newData[idx].self_employment_fulltime_female = e.target.value;
                                                            setData('employment_data', newData);
                                                        }} className="w-full px-1 py-0.5 text-xs border rounded" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs mb-1">২. পুরুষ (পূর্ণকালীন)</label>
                                                        <input type="text" value={row.self_employment_fulltime_male} onChange={(e) => {
                                                            const newData = [...(data.employment_data || [])];
                                                            newData[idx].self_employment_fulltime_male = e.target.value;
                                                            setData('employment_data', newData);
                                                        }} className="w-full px-1 py-0.5 text-xs border rounded" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs mb-1">৩. মহিলা (খণ্ডকালীন)</label>
                                                        <input type="text" value={row.self_employment_parttime_female} onChange={(e) => {
                                                            const newData = [...(data.employment_data || [])];
                                                            newData[idx].self_employment_parttime_female = e.target.value;
                                                            setData('employment_data', newData);
                                                        }} className="w-full px-1 py-0.5 text-xs border rounded" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs mb-1">৪. পুরুষ (খণ্ডকালীন)</label>
                                                        <input type="text" value={row.self_employment_parttime_male} onChange={(e) => {
                                                            const newData = [...(data.employment_data || [])];
                                                            newData[idx].self_employment_parttime_male = e.target.value;
                                                            setData('employment_data', newData);
                                                        }} className="w-full px-1 py-0.5 text-xs border rounded" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs mb-1">৫. মহিলা (মজুরি-পূর্ণকালীন)</label>
                                                        <input type="text" value={row.wage_employment_fulltime_female} onChange={(e) => {
                                                            const newData = [...(data.employment_data || [])];
                                                            newData[idx].wage_employment_fulltime_female = e.target.value;
                                                            setData('employment_data', newData);
                                                        }} className="w-full px-1 py-0.5 text-xs border rounded" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs mb-1">৬. পুরুষ (মজুরি-পূর্ণকালীন)</label>
                                                        <input type="text" value={row.wage_employment_fulltime_male} onChange={(e) => {
                                                            const newData = [...(data.employment_data || [])];
                                                            newData[idx].wage_employment_fulltime_male = e.target.value;
                                                            setData('employment_data', newData);
                                                        }} className="w-full px-1 py-0.5 text-xs border rounded" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs mb-1">৭. মহিলা (মজুরি-খণ্ডকালীন)</label>
                                                        <input type="text" value={row.wage_employment_parttime_female} onChange={(e) => {
                                                            const newData = [...(data.employment_data || [])];
                                                            newData[idx].wage_employment_parttime_female = e.target.value;
                                                            setData('employment_data', newData);
                                                        }} className="w-full px-1 py-0.5 text-xs border rounded" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs mb-1">৮. পুরুষ (মজুরি-খণ্ডকালীন)</label>
                                                        <input type="text" value={row.wage_employment_parttime_male} onChange={(e) => {
                                                            const newData = [...(data.employment_data || [])];
                                                            newData[idx].wage_employment_parttime_male = e.target.value;
                                                            setData('employment_data', newData);
                                                        }} className="w-full px-1 py-0.5 text-xs border rounded" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs mb-1">৯. মোট পূর্ণ সময়</label>
                                                        <input type="text" value={row.total_fulltime} onChange={(e) => {
                                                            const newData = [...(data.employment_data || [])];
                                                            newData[idx].total_fulltime = e.target.value;
                                                            setData('employment_data', newData);
                                                        }} className="w-full px-1 py-0.5 text-xs border rounded" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs mb-1">১০. মোট আংশিক সময়</label>
                                                        <input type="text" value={row.total_parttime} onChange={(e) => {
                                                            const newData = [...(data.employment_data || [])];
                                                            newData[idx].total_parttime = e.target.value;
                                                            setData('employment_data', newData);
                                                        }} className="w-full px-1 py-0.5 text-xs border rounded" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => {
                                            const newData = [...(data.employment_data || [])];
                                            newData.push({ loan_activity_name: '', self_employment_fulltime_female: '', self_employment_fulltime_male: '', self_employment_parttime_female: '', self_employment_parttime_male: '', wage_employment_fulltime_female: '', wage_employment_fulltime_male: '', wage_employment_parttime_female: '', wage_employment_parttime_male: '', total_fulltime: '', total_parttime: '' });
                                            setData('employment_data', newData);
                                        }} className="text-xs px-2 py-1 bg-blue-500 text-white rounded">+ Add Row</button>
                                    </div>
                                </div>

                                {/* সদস্যের স্বাক্ষর */}
                                <div className="bg-white rounded-lg shadow-sm p-4 border">
                                    <h3 className="text-sm font-bold mb-3">সদস্যের স্বাক্ষর</h3>
                                    <div className="space-y-3 text-sm">
                                        <div>
                                            <label className="block text-xs font-medium mb-1">সদস্যের স্বাক্ষর</label>
                                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'member_signature_page4')} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">সদস্যের মোবাইল নং (11 digits)</label>
                                            <div className="flex gap-1">
                                                {Array.from({ length: 11 }, (_, i) => (
                                                    <input key={i} type="text" maxLength={1} value={(data.member_mobile_digits || [])[i] || ''} onChange={(e) => {
                                                        const digits = [...(data.member_mobile_digits || Array(11).fill(''))];
                                                        digits[i] = e.target.value.replace(/\D/g, '').slice(0, 1);
                                                        setData('member_mobile_digits', digits);
                                                    }} className="w-8 h-8 text-center text-xs border rounded" />
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">প্রোফাইল পূরণকারীর স্বাক্ষর ও সিল</label>
                                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'profile_filler_signature')} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                        </div>
                                    </div>
                                </div>

                                {/* II. ঘ. সংস্থার অফিস পর্যায়ে পূরণীয় */}
                                <div className="bg-white rounded-lg shadow-sm p-4 border">
                                    <h3 className="text-sm font-bold mb-3">II. ঘ. সংস্থার অফিস পর্যায়ে পূরণীয়</h3>
                                    <div className="space-y-3 text-sm">
                                        <div>
                                            <label className="block text-xs font-medium mb-1">(ক) অফিসারের পরিদর্শনোত্তর মন্তব্য</label>
                                            <textarea value={data.officer_post_inspection_comments} onChange={(e) => setData('officer_post_inspection_comments', e.target.value)} rows={3} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            <label className="block text-xs font-medium mb-1 mt-2">স্বাক্ষর</label>
                                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'officer_post_inspection_signature')} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">(খ) শাখা ব্যবস্থাপকের পরিদর্শনোত্তর মন্তব্য</label>
                                            <textarea value={data.branch_manager_post_inspection_comments} onChange={(e) => setData('branch_manager_post_inspection_comments', e.target.value)} rows={3} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            <label className="block text-xs font-medium mb-1 mt-2">স্বাক্ষর</label>
                                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'branch_manager_post_inspection_signature')} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">(গ) আঞ্চলিক ব্যবস্থাপকের পরিদর্শনোত্তর মন্তব্য</label>
                                            <textarea value={data.regional_manager_post_inspection_comments} onChange={(e) => setData('regional_manager_post_inspection_comments', e.target.value)} rows={3} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            <label className="block text-xs font-medium mb-1 mt-2">স্বাক্ষর</label>
                                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'regional_manager_post_inspection_signature')} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">(ঘ) জোনাল ম্যানেজারের পরিদর্শনোত্তর মন্তব্য</label>
                                            <textarea value={data.zonal_manager_post_inspection_comments} onChange={(e) => setData('zonal_manager_post_inspection_comments', e.target.value)} rows={3} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            <label className="block text-xs font-medium mb-1 mt-2">স্বাক্ষর</label>
                                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'zonal_manager_post_inspection_signature')} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">(ঙ) সংস্থার চূড়ান্ত অনুমোদনকারীর মন্তব্য</label>
                                            <textarea value={data.final_approver_comments} onChange={(e) => setData('final_approver_comments', e.target.value)} rows={3} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                            <div className="grid grid-cols-2 gap-3 mt-2">
                                                <div>
                                                    <label className="block text-xs font-medium mb-1">টাকা</label>
                                                    <input type="text" value={data.final_approved_loan_amount_digits} onChange={(e) => setData('final_approved_loan_amount_digits', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium mb-1">কথায়</label>
                                                    <input type="text" value={data.final_approved_loan_amount_words} onChange={(e) => setData('final_approved_loan_amount_words', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                                </div>
                                            </div>
                                            <label className="block text-xs font-medium mb-1 mt-2">চূড়ান্ত অনুমোদনকারীর স্বাক্ষর ও সিল</label>
                                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'final_approver_signature')} className="w-full px-2 py-1.5 text-sm border rounded-md" />
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* RIGHT SIDE: PREVIEW */}
                    <div className="lg:sticky lg:top-4 lg:h-fit print:block print-container">
                        <div className="bg-white rounded-lg shadow-lg p-4 print:shadow-none print:p-2 print:rounded-none print:bg-white">
                            <h3 className="text-sm font-bold mb-3 print:hidden">Preview</h3>
                            {activePage === 1 && renderPage1()}
                            {activePage === 2 && renderPage2()}
                            {activePage === 3 && renderPage3()}
                            {activePage === 4 && renderPage4()}
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
