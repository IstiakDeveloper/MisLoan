export interface LoanAgreementData {
    branch_name: string;
    branch_address: string;
    member_name_bn: string;
    member_code: string;
    father_husband_name: string;
    mother_name: string;
    nid_number: string;
    mobile_number: string;
    samity_name: string;
    samity_code: string;
    village: string;
    union: string;
    upazila: string;
    district: string;
    loan_amount: number;
    loan_category_name: string;
    loan_product_name: string;
    loan_purpose: string;
    loan_duration_months: number;
    service_charge: number;
    service_charge_rate?: string | number;
    interest_rate?: string | number;
    total_amount: number;
    number_of_installments: number;
    installment_amount: number;
    last_installment_amount: number;
    disbursement_date: string;
    last_installment_date: string;
    applicant_signature_name: string;
    applicant_signature_image: string | null;
    guardian_name: string;
    guardian_signature_image: string | null;
    president_name: string;
    president_signature_image: string | null;
    secretary_name: string;
    secretary_signature_image: string | null;
    house_acres: string;
    house_decimal: string;
    land_acres: string;
    land_decimal: string;
    house_value: string;
    land_value: string;
    
    // Page 2 Samity & Attachment Summary
    samity_member_count?: string;
    current_loan_count?: string;
    total_current_loan?: string;
    expired_loan_amount?: string;
    expired_loan_members?: string;
    current_due_amount?: string;
    due_members?: string;
    realization_rate?: string;
    has_member_photo?: boolean;
    has_member_nid?: boolean;
    has_guardian_photo?: boolean;
    has_guardian_nid?: boolean;

    // Employment statistics (supports both aliases)
    self_emp_full_female?: string;
    self_emp_full_male?: string;
    self_emp_part_female?: string;
    self_emp_part_male?: string;
    wage_emp_full_female?: string;
    wage_emp_full_male?: string;
    wage_emp_part_female?: string;
    wage_emp_part_male?: string;
    self_full_female?: string;
    self_full_male?: string;
    self_part_female?: string;
    self_part_male?: string;
    wage_full_female?: string;
    wage_full_male?: string;
    wage_part_female?: string;
    wage_part_male?: string;

    // Officers
    credit_officer_name: string;
    credit_officer_pin: string;
    credit_officer_signature: string | null;
    field_officer_name: string;
    field_officer_pin: string;
    field_officer_signature: string | null;
    accountant_name?: string;
    accountant_pin?: string;
    accountant_signature?: string | null;
    branch_manager_name: string;
    branch_manager_pin: string;
    branch_manager_signature: string | null;
}

export interface LoanAgreementProps {
    member: any;
    loanProduct: any;
    loanCategory: any;
    requestedAmount: number;
    branch?: any;
    auth?: any;
    existingApplication?: any;
    savedData?: any;
    onlyPreview?: boolean;
    isLegacy?: boolean;
}
