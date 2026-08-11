import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Save, Eye, ArrowLeft, X, Minimize2, Printer, AlertCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { fileToCompressedDataUrl } from '@/utils/imageUpload';
import {
    clearLoanDraftLocal,
    loadLoanDraftLocal,
    loanDraftStorageKey,
    saveLoanDraftLocal,
} from '@/utils/loanDraftStorage';

import { ApprovalFormProps, LoanApplicationApprovalData } from './Types';
import FormPage1 from './FormPage1';
import FormPage2 from './FormPage2';
import FormPage3 from './FormPage3';
import FormPage4 from './FormPage4';
import PrintPreview from './PrintPreview';
import { getRequiredSavingsPercent } from '@/components/LoanApplications/GeneralSavingsSection';

export const toInputDate = (value: string | null | undefined): string => {
    if (value == null || value === '') return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

/** Local datetime for `<input type="datetime-local">` (YYYY-MM-DDTHH:mm) */
export const toLocalDateTimeInput = (value?: string | Date | null): string => {
    const d = value ? new Date(value) : new Date();
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day}T${h}:${min}`;
};

function getNidOrSmartCard(member: { nid_number?: string | null; smart_card_number?: string | null } | null | undefined): string {
    if (!member) return '';
    const nid = member.nid_number != null ? String(member.nid_number).trim() : '';
    const smart = member.smart_card_number != null ? String(member.smart_card_number).trim() : '';
    if (nid && nid !== '0') return nid;
    if (smart && smart !== '0') return smart;
    return '';
}

function getAgeFromDOB(dob: string | null | undefined, refDate: string | null | undefined): string {
    if (!dob || !refDate) return '';
    const birth = new Date(dob);
    const ref = new Date(refDate);
    if (Number.isNaN(birth.getTime()) || Number.isNaN(ref.getTime())) return '';
    let age = ref.getFullYear() - birth.getFullYear();
    const m = ref.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--;
    return age >= 0 ? String(age) : '';
}

/** পারিবারিক তথ্যের «নিজ» সারি থেকে পেশা ও শিক্ষাগত যোগ্যতা */
function getSelfOccupationAndEducation(member: any): {
    occupation: string;
    educational_qualification: string;
} {
    if (!member) {
        return { occupation: '', educational_qualification: '' };
    }
    const family =
        member.family_members ?? member.familyMembers ?? [];
    const self = Array.isArray(family)
        ? family.find((m: any) => m?.relation_with_head === 'নিজ')
        : null;

    const occupation =
        String(self?.occupation || '').trim() ||
        String(member.business_details || '').trim() ||
        String(member.job_details || '').trim() ||
        '';

    const educational_qualification = String(self?.education_level || '').trim();

    return { occupation, educational_qualification };
}

const fromData = (v: any): string => (v !== null && v !== undefined && v !== '' ? String(v) : '');
const fmtValue = (v: any): string => {
    if (v === null || v === undefined || v === '') return '';
    const n = Number(v);
    return Number.isNaN(n) ? String(v) : String(Math.round(n));
};

function getFamilyAssetsFromMember(member: any) {
    if (!member) return [];
    const otherAssets = member.other_assets ?? member.otherAssets ?? [];
    const rows = [];
    const cultAmt = fromData(member.cultivable_land_amount);
    const cultVal = fmtValue(member.cultivable_land_value);
    const nonCultAmt = fromData(member.non_cultivable_land_amount);
    const nonCultVal = fmtValue(member.non_cultivable_land_value);
    const mov = (a: any) => ({
        movable_desc: a?.asset_description ?? '',
        movable_value: a?.estimated_value != null ? fmtValue(a.estimated_value) : '',
    });
    rows.push({ fixed_quantity: cultAmt, fixed_value: cultVal, ...mov(otherAssets[0]) });
    rows.push({ fixed_quantity: nonCultAmt, fixed_value: nonCultVal, ...mov(otherAssets[1]) });
    for (let i = 2; i < otherAssets.length; i++) {
        rows.push({ fixed_quantity: '', fixed_value: '', ...mov(otherAssets[i]) });
    }
    return rows;
}

function formSelectionUrl(isLegacy: boolean, member: any, loanProduct: any, loanCategory: any, requestedAmount: number) {
    const params = new URLSearchParams({ loan_product_id: String(loanProduct.id), loan_category_id: String(loanCategory.id), requested_amount: String(requestedAmount) });
    if (isLegacy) params.set('legacy', '1'); else params.set('member_id', String(member?.id ?? ''));
    return `/member/loan-applications/form-selection?${params.toString()}`;
}

export default function ApprovalForm({
    member,
    loanProduct,
    loanCategory,
    requestedAmount,
    branch,
    existingApplication,
    savedData,
    onlyPreview,
    savingsProducts = [],
    loanRound = 1,
    isLegacy = false,
}: ApprovalFormProps) {
    const categoryName = loanCategory?.category_name_bn || loanCategory?.category_name || 'ঋণ';

    if (onlyPreview && savedData) {
        return (
            <div className="print-container">
                <PrintPreview formData={savedData} branch={branch} categoryName={categoryName} />
            </div>
        );
    }

    const [activeStep, setActiveStep] = useState<number>(1);
    const [showPreview, setShowPreview] = useState(false);
    const [viewAllPages, setViewAllPages] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saveError, setSaveError] = useState<string | null>(null);
    const [localRestored, setLocalRestored] = useState(false);
    const [saving, setSaving] = useState(false);
    const skipNextLocalSave = useRef(true);
    const isMobile = useIsMobile();
    const page = usePage<{ flash?: { error?: string | null; success?: string | null } }>();
    const flashError = page.props.flash?.error || null;

    const draftKey = useMemo(
        () =>
            loanDraftStorageKey(
                'loan_approval',
                isLegacy ? 'legacy' : member?.id,
                loanProduct.id,
                loanCategory.id
            ),
        [isLegacy, member?.id, loanProduct.id, loanCategory.id]
    );

    const leftPaneRef = useRef<HTMLDivElement>(null);
    const rightPaneRef = useRef<HTMLDivElement>(null);

    const handleFocusInLeftPane = (e: React.FocusEvent | React.MouseEvent | React.KeyboardEvent) => {
        const target = e.target as HTMLElement;
        const anchor = target.closest('[data-sync]') as HTMLElement;
        
        if (anchor && anchor.dataset.sync) {
            const syncId = anchor.dataset.sync;
            setTimeout(() => {
                if (!rightPaneRef.current) return;
                const previewAnchor = rightPaneRef.current.querySelector(`[data-sync="${syncId}"]`) as HTMLElement;
                if (previewAnchor) {
                    previewAnchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        }
    };

    const isOldMemberFromAdmission = !!(member?.is_legacy);
    const loanDofaValue = member?.loan_dofa != null && member?.loan_dofa !== ''
        ? String(member.loan_dofa)
        : '';
    const projectNameFromAdmission = member?.project_name || '';
    const annualNetFromAdmission = member?.estimated_annual_project_income != null && member?.estimated_annual_project_income !== ''
        ? fmtValue(member.estimated_annual_project_income)
        : '';
    const selfFromFamily = getSelfOccupationAndEducation(member);

    const { data, setData, processing } = useForm<LoanApplicationApprovalData>({
        category_name: categoryName,
        branch_address: branch?.address || '',
        application_date: new Date().toISOString().split('T')[0],
        loan_approval_date: '',
        loan_disbursement_date: '',
        loan_repayment_date: '',
        recipient_to: '',
        authority_medium: '',
        committee_name: member?.samity?.samity_name_bn || member?.samity?.samity_name || '',
        committee_code: member?.samity?.samity_code || member?.samity?.id?.toString() || '',
        member_type: isOldMemberFromAdmission || isLegacy ? 'old' : 'new',
        years_involved: isOldMemberFromAdmission ? loanDofaValue : '',
        member_name_detail: member?.applicant_name_bn || member?.applicant_name_en || '',
        member_code: member?.application_no || '',
        member_mobile: member?.mobile_number || '',
        age: getAgeFromDOB(member?.date_of_birth, new Date().toISOString().split('T')[0]),
        father_husband_name: member?.father_name_bn || member?.spouse_name_bn || '',
        permanent_address_line1: member?.permanent_village_road || member?.present_village_road || '',
        permanent_address_line2: member?.permanent_post_code || member?.present_post_code || '',
        permanent_address_line3: [member?.permanent_upazila || member?.present_upazila, member?.permanent_district || member?.present_district].filter(Boolean).join(', '),
        current_address_line1: member?.present_village_road || member?.permanent_village_road || '',
        current_address_line2: member?.present_post_code || member?.permanent_post_code || '',
        current_address_line3: [member?.present_upazila || member?.permanent_upazila, member?.present_district || member?.permanent_district].filter(Boolean).join(', '),
        nid_smart_card: getNidOrSmartCard(member),
        occupation: selfFromFamily.occupation,
        educational_qualification: selfFromFamily.educational_qualification,
        admission_date: member?.admission_date || '',
        family_members_count: (member?.family_members?.length ?? member?.familyMembers?.length ?? 0) || 0,
        earning_members_count: '',
        previous_loan_times: isOldMemberFromAdmission ? loanDofaValue : '',
        previous_loan_amount: '',
        last_repaid_loan_amount: '',
        last_repaid_project_name: isOldMemberFromAdmission ? projectNameFromAdmission : '',
        savings_amount: '',
        general_savings_product_id: null,
        general_savings_amount: '',
        is_against_savings: false,
        against_savings_product_id: null,
        against_savings_amount: '',
        loan_round: loanRound,
        loan_proposal_date: '',
        project_name: projectNameFromAdmission,
        proposed_project_name: projectNameFromAdmission,
        project_manpower: '',
        project_manpower_total: '',
        project_manpower_family: '',
        project_manpower_outside: '',
        project_manpower_trained: '',
        project_income_1_2_yr: '',
        project_expense_1_2_yr: '',
        annual_net_profit: annualNetFromAdmission,
        capital_total: '',
        capital_own: '',
        capital_applied_loan: requestedAmount ? String(requestedAmount) : '',
        approval_amount_digits: requestedAmount ? String(requestedAmount) : '',
        family_assets: getFamilyAssetsFromMember(member),
        applicant_signature: '',
        approver_signature: '',
        
        // Page 2
        entrepreneur_fulltime_years: '',
        entrepreneur_fulltime_months: '',
        entrepreneur_parttime_years: '',
        entrepreneur_parttime_months: '',
        loan_experience_years: '',
        loan_experience_months: '',
        raw_material_purchase_location: '',
        product_marketing_location: '',
        last_year_capital: '',
        last_year_sales: '',
        last_year_profit_loss: '',
        license_authority_1: '', license_number_1: '', license_validity_1: '',
        license_authority_2: '', license_number_2: '', license_validity_2: '',
        income_tax_certification: 'no',
        total_loans_taken: isOldMemberFromAdmission ? loanDofaValue : '',
        last_three_loans: [
            { loan_number: '', loan_date: '', loan_amount: '', project_name: '', savings_status: '' },
            { loan_number: '', loan_date: '', loan_amount: '', project_name: '', savings_status: '' },
            { loan_number: '', loan_date: '', loan_amount: '', project_name: '', savings_status: '' },
        ],
        other_loan_status: Array(7).fill({ current_status: '', round: '', borrower_name: '', mobile: '', remarks: '' }),
        invest_plan_applied_amount: requestedAmount ? String(requestedAmount) : '',
        invest_use_capital: '',
        invest_plan_own_amount: '',
        invest_use_running: '',
        invest_plan_other_amount: '',
        invest_use_other: '',
        invest_plan_total: requestedAmount ? String(requestedAmount) : '',
        invest_use_total: '',
        
        // Page 3
        est_emp_salary: '', est_transport: '', est_bills: '', est_rent: '', est_loan_charge: '',
        est_other_exp_1_desc: '', est_other_exp_1_amount: '',
        est_other_exp_2_desc: '', est_other_exp_2_amount: '',
        est_other_exp_3_desc: '', est_other_exp_3_amount: '',
        est_main_income_desc: projectNameFromAdmission,
        est_main_income_amount: (() => {
            const months = Number(loanProduct?.duration_months || loanProduct?.loan_duration_months || 0);
            const years = months > 0 ? months / 12 : 1;
            const annual = Number(annualNetFromAdmission) || 0;
            return annual > 0 ? String(Math.round(annual * years)) : '';
        })(),
        est_other_income_desc: '', est_other_income_amount: '',
        loan_duration_months: loanProduct?.duration_months
            ? String(loanProduct.duration_months)
            : (loanProduct?.loan_duration_months ? String(loanProduct.loan_duration_months) : ''),
        applied_service_charge_rate: loanProduct?.interest_rate != null && loanProduct?.interest_rate !== ''
            ? String(loanProduct.interest_rate)
            : (loanProduct?.service_charge != null && loanProduct?.service_charge !== ''
                ? String(loanProduct.service_charge)
                : ''),
        installment_type: (() => {
            const t = String(loanProduct?.installment_type || '').toLowerCase();
            if (t === 'lump_sum' || t.includes('lump')) return 'এককালীন';
            if (t === 'weekly' || t.includes('week')) return 'সাপ্তাহিক কিস্তি';
            return 'মাসিক কিস্তি';
        })(),
        installment_principal: (() => {
            const amount = Number(requestedAmount) || 0;
            const t = String(loanProduct?.installment_type || '').toLowerCase();
            const n = t === 'lump_sum' || t.includes('lump')
                ? 1
                : (Number(loanProduct?.number_of_installments) || Number(loanProduct?.duration_months) || 0);
            return amount > 0 && n > 0 ? String(Math.round(amount / n)) : '';
        })(),
        installment_service_charge: (() => {
            const amount = Number(requestedAmount) || 0;
            const t = String(loanProduct?.installment_type || '').toLowerCase();
            const n = t === 'lump_sum' || t.includes('lump')
                ? 1
                : (Number(loanProduct?.number_of_installments) || Number(loanProduct?.duration_months) || 0);
            if (amount <= 0 || n <= 0) return '';
            const scPerThousand = Number(loanProduct?.service_charge_per_thousand) || 0;
            const rate = Number(loanProduct?.interest_rate || 0);
            const months = Number(loanProduct?.duration_months || 12) || 12;
            const totalSc = scPerThousand > 0
                ? (amount / 1000) * scPerThousand
                : amount * (rate / 100) * (months / 12);
            return String(Math.round(totalSc / n));
        })(),
        number_of_installments: loanProduct?.number_of_installments
            ? String(loanProduct.number_of_installments)
            : (loanProduct?.duration_months ? String(loanProduct.duration_months) : ''),
        guarantor_1_name: member?.guarantor_name || '', guarantor_1_address: '', guarantor_1_mobile: member?.guarantor_mobile || '', guarantor_1_relation: '', guarantor_1_profession: '', guarantor_1_monthly_income: '', guarantor_1_assets_amount: '', guarantor_1_potential_value: '', guarantor_1_interviewer_name: '', guarantor_1_interviewer_designation: '',
        guarantor_2_name: '', guarantor_2_address: '', guarantor_2_mobile: '', guarantor_2_relation: '', guarantor_2_profession: '', guarantor_2_monthly_income: '', guarantor_2_assets_amount: '', guarantor_2_potential_value: '', guarantor_2_interviewer_name: '', guarantor_2_interviewer_designation: '',
        
        informant_1_name: '', informant_1_address: '', informant_1_mobile: '', informant_1_relation: '', informant_1_profession: '', informant_1_loan_info: '', informant_1_asset_info: '', informant_1_overall_comment: '',
        informant_2_name: '', informant_2_address: '', informant_2_mobile: '', informant_2_relation: '', informant_2_profession: '', informant_2_loan_info: '', informant_2_asset_info: '', informant_2_overall_comment: '',
        
        // Page 4
        employee_workplace_name: '', employee_monthly_salary: '', employee_received_in_hand: '', employee_other_income: '', employee_approver_presence_time: '', employee_who_was_with: '', employee_bank_name: '', employee_salary_per_statement: '',
        expatriate_monthly_income: '', expatriate_channel: '', expatriate_confirmation_method: '', expatriate_country: '', expatriate_years_living: '', expatriate_work_permit_checked: '',
        project_environmental_legal_issues: 'না',
        risk_disaster_experience: 'নাই',
        risk_credit_sale: 'নাই',
        future_micro_enterprise_plan: '',
        loan_program_name: projectNameFromAdmission,
        self_emp_full_female: '', self_emp_full_male: '', self_emp_part_female: '', self_emp_part_male: '',
        wage_emp_full_female: '', wage_emp_full_male: '', wage_emp_part_female: '', wage_emp_part_male: '',
        
        officer_post_inspection_comments: '',
        officer_post_inspection_signature: '',
        branch_manager_post_inspection_comments: '',
        branch_manager_post_inspection_signature: '',
        regional_manager_comments: '',
        regional_manager_signature: '',
        zonal_manager_comments: '',
        zonal_manager_signature: '',
        final_approver_comments: '',
        final_approver_signature: '',
        final_approved_loan_amount_digits: '',
        final_approved_loan_amount_words: '',
        
        ...(savedData || {}),
        // Draft-এ খালি থাকলে ভর্তি ফর্মের «নিজ» সারি থেকে নিন
        occupation:
            String((savedData as any)?.occupation || '').trim() ||
            selfFromFamily.occupation,
        educational_qualification:
            String((savedData as any)?.educational_qualification || '').trim() ||
            selfFromFamily.educational_qualification,
    });

    useEffect(() => {
        const local = loadLoanDraftLocal<Partial<LoanApplicationApprovalData>>(draftKey);
        if (local?.data) {
            setData((prev) => {
                const merged = { ...prev, ...local.data };
                return {
                    ...merged,
                    occupation:
                        String(merged.occupation || '').trim() || selfFromFamily.occupation,
                    educational_qualification:
                        String(merged.educational_qualification || '').trim() ||
                        selfFromFamily.educational_qualification,
                };
            });
            setLocalRestored(true);
        }
        const t = setTimeout(() => {
            skipNextLocalSave.current = false;
        }, 500);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draftKey]);

    useEffect(() => {
        if (skipNextLocalSave.current) return;
        const t = setTimeout(() => saveLoanDraftLocal(draftKey, data), 700);
        return () => clearTimeout(t);
    }, [data, draftKey]);

    useEffect(() => {
        if (flashError) setSaveError(flashError);
    }, [flashError]);

    const handleImageUpload = async (field: string, file: File | null) => {
        if (!file) return;
        const result = await fileToCompressedDataUrl(file, { maxWidth: 900 });
        if (!result.ok) {
            alert(result.error);
            return;
        }
        setData(field, result.dataUrl);
    };

    const removeImage = (field: string) => setData(field, '');

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setErrors({});
        setSaveError(null);

        // Soft draft: savings % — show red error + confirm before save
        const effectiveDofa =
            data.loan_round != null && Number(data.loan_round) >= 1
                ? Number(data.loan_round)
                : loanRound || 1;
        const requiredPercent = getRequiredSavingsPercent(
            loanProduct?.installment_type,
            effectiveDofa,
            !!data.is_against_savings,
            loanProduct?.duration_months
        );
        const minSavings = Math.ceil(((Number(requestedAmount) || 0) * requiredPercent) / 100);
        const generalAmount = Number(data.general_savings_amount) || 0;
        const totalSavingsRaw = data.savings_amount;
        const totalSavingsEmpty =
            totalSavingsRaw === '' ||
            totalSavingsRaw == null ||
            Number.isNaN(Number(totalSavingsRaw));

        if (totalSavingsEmpty) {
            const msg = 'মোট সঞ্চয়ের পরিমাণ লিখুন (সদস্যের কাছে এখন কত সঞ্চয় আছে)।';
            setErrors({ savings_amount: msg });
            const ok = confirm(`${msg}\nতবুও খসড়া সেভ করবেন?`);
            if (!ok) return;
            setErrors({});
        }

        if ((Number(requestedAmount) || 0) > 0 && generalAmount < minSavings) {
            const msg = `সাধারণ সঞ্চয় সর্বনিম্ন ${requiredPercent}% (৳${minSavings.toLocaleString('bn-BD')}) থাকা উচিত। এখন আছে ৳${generalAmount.toLocaleString('bn-BD')}।`;
            setErrors({ general_savings_amount: msg });
            const ok = confirm(`${msg}\nতবুও খসড়া সেভ করবেন? পরে সংশোধন করতে পারবেন।`);
            if (!ok) return;
            setErrors({});
        }

        // Soft draft: consistency mismatches only warn — still allow save
        const income = Number(data.project_income_1_2_yr) || 0;
        const expense = Number(data.project_expense_1_2_yr) || 0;
        const net = Number(data.annual_net_profit) || 0;
        const hasIncomeExpense =
            data.project_income_1_2_yr !== '' &&
            data.project_income_1_2_yr != null &&
            data.project_expense_1_2_yr !== '' &&
            data.project_expense_1_2_yr != null;
        const hasNet = data.annual_net_profit !== '' && data.annual_net_profit != null;
        if (hasIncomeExpense && hasNet && income - expense !== net) {
            const ok = confirm(
                `আয় − ব্যয় = বার্ষিক নিট লাভ মিলছে না (${income} − ${expense} ≠ ${net}).\nতবুও খসড়া সেভ করবেন? পরে সংশোধন করতে পারবেন।`
            );
            if (!ok) return;
        }

        const planTotal = Number(data.invest_plan_total) || 0;
        const useTotal = Number(data.invest_use_total) || 0;
        const hasPlanTotal = data.invest_plan_total !== '' && data.invest_plan_total != null;
        const hasUseTotal = data.invest_use_total !== '' && data.invest_use_total != null;
        if (hasPlanTotal && hasUseTotal && planTotal !== useTotal) {
            const ok = confirm(
                `বিনিয়োগের খাতের মোট (${planTotal}) এবং ঋণের ব্যবহারের মোট (${useTotal}) মিলছে না।\nতবুও খসড়া সেভ করবেন?`
            );
            if (!ok) return;
        }

        const payload = {
            member_id: isLegacy ? null : member.id,
            loan_product_id: loanProduct.id,
            loan_category_id: loanCategory.id,
            requested_amount: requestedAmount,
            draft: 1,
            form_data: {
                ...data,
                member_type: isOldMemberFromAdmission || isLegacy ? 'old' : 'new',
                years_involved: isOldMemberFromAdmission || isLegacy
                    ? (data.years_involved || loanDofaValue)
                    : '',
                previous_loan_times: isOldMemberFromAdmission || isLegacy
                    ? (data.previous_loan_times || loanDofaValue)
                    : '',
            },
            is_legacy: isLegacy,
            legacy: isLegacy ? 1 : 0,
        };

        setSaving(true);
        saveLoanDraftLocal(draftKey, data);

        router.post(`/member/loan-applications/forms/loan-application-approval/save-draft`, payload, {
            preserveScroll: true,
            onSuccess: () => {
                clearLoanDraftLocal(draftKey);
                setLocalRestored(false);
            },
            onError: (err) => {
                setErrors(err);
                const first = Object.values(err || {})[0];
                setSaveError(
                    (typeof first === 'string' && first) ||
                        'খসড়া সার্ভারে সেভ হয়নি — আপনার ফর্মের তথ্য হারায়নি (লোকাল ব্যাকআপ আছে)। আবার চেষ্টা করুন।'
                );
                window.scrollTo({ top: 0, behavior: 'smooth' });
            },
            onFinish: () => setSaving(false),
        });
    };

    const commonProps = {
        data,
        setData,
        member,
        isLegacy,
        handleImageUpload,
        removeImage,
        loanProduct,
        loanCategory,
        requestedAmount,
        savingsProducts,
        loanRound,
        errors,
    };


    return (
        <AdminLayout>
            <Head title="আগ্রসর আবেদন ও অনুমোদনপত্র" />
            
            <div className="container mx-auto px-2 sm:px-4 py-4 md:py-6 print:p-0 print:m-0 print:w-full print:max-w-none pb-20 sm:pb-6">
                {(saveError || flashError) && (
                    <div className="mb-4 rounded-xl border-2 border-amber-500 bg-amber-50 p-4 print:hidden">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-sm font-bold text-amber-950">সংরক্ষণ ব্যর্থ — আপনার তথ্য মুছে যায়নি</h3>
                                <p className="text-sm text-amber-900 mt-1">{saveError || flashError}</p>
                            </div>
                        </div>
                    </div>
                )}
                {localRestored && !saveError && (
                    <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 print:hidden">
                        এই ডিভাইসে আগের অসম্পূর্ণ খসড়া থেকে তথ্য পুনরুদ্ধার করা হয়েছে। «সেভ ড্রাফট» চাপলে সার্ভারে সেভ হবে।
                    </div>
                )}

                {/* Top Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-6 print:hidden gap-3">
                    <div className="w-full md:w-auto">
                        <h2 className="text-lg md:text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <span>আগ্রসর আবেদন ও অনুমোদনপত্র</span>
                        </h2>
                        <div className="text-xs md:text-sm text-gray-600 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                            {isLegacy ? (
                                <span className="font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">উত্তরাধিকার/ম্যানুয়াল আবেদন</span>
                            ) : (
                                <span>সদস্য: <strong className="text-gray-900">{member?.applicant_name_bn || member?.applicant_name_en}</strong> ({member?.application_no})</span>
                            )}
                            <span className="hidden sm:inline text-gray-300">|</span>
                            <span>ক্যাটাগরি: <strong className="text-gray-900">{categoryName}</strong></span>
                            <span className="hidden sm:inline text-gray-300">|</span>
                            <span>পরিমাণ: <strong className="text-emerald-700">৳{requestedAmount}</strong></span>
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                        <button
                            type="button"
                            onClick={() => router.visit(formSelectionUrl(isLegacy, member, loanProduct, loanCategory, requestedAmount))}
                            className="flex items-center gap-1.5 px-3 py-2 bg-gray-600 text-white rounded-lg text-xs md:text-sm hover:bg-gray-700 transition-all font-medium whitespace-nowrap"
                        >
                            <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">ফর্ম তালিকা</span>
                        </button>
                        
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-xs md:text-sm hover:bg-emerald-700 transition-all font-medium whitespace-nowrap"
                            >
                                <Printer className="w-4 h-4" /> <span className="hidden sm:inline">প্রিন্ট</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowPreview(!showPreview)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm transition-all font-bold whitespace-nowrap ${showPreview ? 'bg-indigo-600 text-white shadow-md' : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'}`}
                            >
                                <Eye className="w-4 h-4" /> {showPreview ? 'ফর্মে ফিরে যান' : 'লাইভ প্রিভিউ'}
                            </button>
                            <button
                                onClick={() => handleSubmit()}
                                disabled={processing || saving}
                                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs md:text-sm hover:from-blue-700 hover:to-indigo-700 shadow-sm transition-all disabled:opacity-50 font-bold whitespace-nowrap"
                            >
                                <Save className="w-4 h-4" /> <span>{processing || saving ? 'সেভ হচ্ছে...' : 'খসড়া সংরক্ষণ'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content Layout */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 print:shadow-none print:border-none p-1 print:p-0">
                    <div className="flex flex-col lg:flex-row gap-0 lg:gap-3 min-h-[calc(100vh-160px)] print:block">
                        {/* LEFT SIDE: FORM (All pages continuous) */}
                        <div 
                            className={`w-full ${showPreview ? 'hidden lg:block lg:w-1/2' : 'lg:w-1/2'} print:hidden lg:h-[calc(100vh-160px)] overflow-y-auto pr-1 custom-scrollbar`}
                            onFocusCapture={handleFocusInLeftPane}
                            onClickCapture={handleFocusInLeftPane}
                            ref={leftPaneRef}
                        >
                            <div className="bg-gray-50/60 p-3 lg:p-5 rounded-lg min-h-full">
                                {Object.keys(errors).length > 0 && (
                                    <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-xs md:text-sm">
                                        <strong>কিছু ত্রুটি পাওয়া গেছে:</strong>
                                        <ul className="list-disc pl-5 mt-2 space-y-0.5">
                                            {Object.entries(errors).map(([key, msg]) => (
                                                <li key={key}>{msg}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                
                                <div className="space-y-6">
                                    <FormPage1 {...commonProps} />
                                    <FormPage2 {...commonProps} />
                                    <FormPage3 {...commonProps} />
                                    <FormPage4 {...commonProps} />
                                </div>
                            </div>
                        </div>

                        {/* RIGHT SIDE: PREVIEW */}
                        <div 
                            ref={rightPaneRef}
                            className={`print:block print:h-auto print:overflow-visible print:w-full print:m-0 print:p-0 lg:h-[calc(100vh-160px)] lg:overflow-y-auto lg:pl-2 scroll-smooth ${
                                !showPreview 
                                    ? 'hidden lg:block lg:w-1/2' 
                                    : 'fixed inset-0 z-50 bg-gray-900/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto lg:relative lg:inset-auto lg:z-auto lg:bg-transparent lg:p-0 lg:w-1/2'
                            }`}
                        >
                            <div className="bg-white rounded-xl shadow-2xl lg:shadow-sm p-3 lg:p-6 print:shadow-none print:p-0 print:m-0 print:w-full print:h-auto print:overflow-visible print:rounded-none print:bg-white min-h-max mb-10 w-full relative">
                                {/* Mobile Header Bar */}
                                <div className="flex justify-between items-center bg-indigo-600 text-white p-3 -mx-3 -mt-3 mb-3 rounded-t-xl lg:hidden print:hidden sticky top-0 z-20 shadow-md">
                                    <div className="flex items-center gap-2 font-bold text-sm">
                                        <Eye className="w-5 h-5" />
                                        <span>লাইভ আবেদনপত্র প্রিভিউ</span>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPreview(false)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition-all active:scale-95"
                                    >
                                        <X className="w-4 h-4" />
                                        ফর্মে ফিরে যান
                                    </button>
                                </div>
                                
                                {/* Full Width Responsive Preview Document Container */}
                                <div className="w-full overflow-x-auto print:overflow-visible">
                                    <PrintPreview formData={data} branch={branch} categoryName={categoryName} />
                                </div>

                                {/* Mobile Bottom Floating Close Button */}
                                <div className="lg:hidden print:hidden mt-6 pt-3 border-t border-gray-200 flex justify-center sticky bottom-2 z-30">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPreview(false)}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-full shadow-2xl text-xs font-bold active:scale-95 transition-all border-2 border-white"
                                    >
                                        <X className="w-4 h-4" />
                                        ফর্মে ফিরে যান (ইনপুট করুন)
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile Sticky Bottom Action Bar */}
                <div className="md:hidden print:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 p-2.5 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] flex items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold active:scale-95 transition-all flex items-center gap-1 shadow-sm"
                    >
                        <Printer className="w-4 h-4" /> প্রিন্ট
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowPreview(!showPreview)}
                            className={`px-3 py-2 border rounded-lg text-xs font-bold active:scale-95 transition-all flex items-center gap-1 ${showPreview ? 'bg-indigo-600 text-white shadow-sm border-indigo-600' : 'bg-indigo-50 border-indigo-200 text-indigo-700'}`}
                        >
                            <Eye className="w-4 h-4" /> {showPreview ? 'ফর্মে ফিরুন' : 'লাইভ প্রিভিউ'}
                        </button>

                        <button
                            type="button"
                            onClick={() => handleSubmit()}
                            disabled={processing || saving}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-bold active:scale-95 transition-all shadow-md flex items-center gap-1.5"
                        >
                            <Save className="w-4 h-4" />
                            <span>{processing || saving ? '...' : 'খসড়া সংরক্ষণ'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}



