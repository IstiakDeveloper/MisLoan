export interface FamilyMember {
    id?: number;
    member_name: string;
    relation_with_head: string;
    gender: 'male' | 'female' | 'other';
    age_years?: number;
    age_months?: number;
    education_level?: string;
    occupation?: string;
    monthly_income?: number;
    business_details?: string;
    job_details?: string;
    other_income_details?: string;
}

export interface OtherAsset {
    id?: number;
    asset_description: string;
    quantity_amount?: string;
    estimated_value?: number;
}

export interface MemberAdmission {
    id: number;
    application_no: string;
    branch_id: number;
    samity_id: number;
    member_category_id: number;
    survey_date: string;
    admission_date: string;

    // Personal Information
    applicant_name_en: string;
    father_name_en: string;
    mother_name_en: string;
    spouse_name_en?: string;
    applicant_name_bn: string;
    father_name_bn: string;
    mother_name_bn: string;
    spouse_name_bn?: string;

    // Contact & Status
    marital_status: 'single' | 'married' | 'divorced' | 'widowed';
    mobile_number: string;
    alternative_mobile?: string;

    // Present Address
    present_division: string;
    present_district: string;
    present_upazila: string;
    present_union?: string;
    present_village_road?: string;
    present_post_code?: string;

    // Permanent Address
    permanent_address_same: boolean;
    permanent_division?: string;
    permanent_district?: string;
    permanent_upazila?: string;
    permanent_union?: string;
    permanent_village_road?: string;
    permanent_post_code?: string;

    // Identity
    nid_number?: string;
    smart_card_number?: string;
    birth_certificate_number?: string;
    date_of_birth?: string;
    gender: 'male' | 'female' | 'other';
    family_member_mobile?: string;

    // Guarantor
    guarantor_name?: string;
    guarantor_mobile?: string;
    tin_number?: string;
    want_sms_service: boolean;

    // Economic
    business_details?: string;
    job_details?: string;
    other_income_details?: string;
    total_asset_value?: number;
    house_type?: string;

    // Property
    mud_house_count: number;
    tin_house_count: number;
    brick_house_count: number;
    semi_brick_house_count: number;

    // Livestock
    cow_buffalo_count: number;
    goat_sheep_count: number;
    duck_chicken_count: number;
    other_livestock?: string;
    other_livestock_count: number;

    // Land
    cultivable_land_amount?: number;
    cultivable_land_value?: number;
    non_cultivable_land_amount?: number;
    non_cultivable_land_value?: number;
    total_land_amount?: number;
    total_land_value?: number;

    // Financial
    monthly_income?: number;
    monthly_expense?: number;
    monthly_savings?: number;

    // Additional
    interviewer_name?: string;
    employee_name?: string;
    other_loan_info?: string;
    requested_loan_amount?: number;
    project_name?: string;
    estimated_annual_project_income?: number;
    collector_comment?: string;
    guardian_name?: string;
    applicant_signature?: string | File | null;
    customer_photo?: File | null;
    customer_nid_photo?: File | null;
    guardian_photo?: File | null;
    guardian_nid_photo?: File | null;

    // Legacy / old member data entry
    is_legacy?: boolean;
    loan_dofa?: number | string | null;

    // Status
    status: 'draft' | 'submitted' | 'under_review' | 'ready_for_head_office' | 'approved' | 'rejected' | 'needs_revision' | 'pending_head_office';
    submitted_at?: string;
    reviewed_at?: string;
    rejection_reason?: string;
    selected_approvers?: number[];
    revision_count?: number;
    revision_comments?: string;

    created_at: string;
    updated_at: string;
    printed_at?: string | null;

    // Number of loan applications linked to this member (used to guard delete)
    loan_applications_count?: number;

    // Tracking: কার কাছে পেন্ডিং / কোন অবস্থায় (for branch user list)
    tracking_state?: { label: string; pending_with_name: string | null };

    // Relations
    branch?: any;
    samity?: any;
    member_category?: any;
    created_by?: number | { id: number; name: string } | null;
    createdBy?: { id: number; name: string } | null;
    submitted_by?: any;
    reviewed_by?: any;
    family_members?: FamilyMember[];
    other_assets?: OtherAsset[];
    approvals?: Array<{
        id: number;
        user: { id: number; name: string };
        level: string;
        status: string;
        approver_signature?: string;
        approved_at?: string;
    }>;
}

export type MemberAdmissionFormData = Omit<MemberAdmission, 'id' | 'application_no' | 'created_at' | 'updated_at' | 'status' | 'submitted_at' | 'reviewed_at' | 'branch' | 'samity' | 'member_category' | 'submitted_by' | 'reviewed_by'>;
