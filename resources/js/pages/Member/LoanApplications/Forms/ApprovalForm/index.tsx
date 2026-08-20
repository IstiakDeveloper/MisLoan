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
import PrintPreview, { numberToWordsBangla } from './PrintPreview';
import { triggerPrintWithAutoFit } from '@/hooks/useAutoFitPrint';
import { getRequiredSavingsPercent } from '@/components/LoanApplications/GeneralSavingsSection';
import { afterLoanFormSaveUrl } from '@/utils/loanFormNavigation';
import { getLoanYears, scaleAnnualToLoanYears } from './FormPage3';
import { calculateLoanSchedule, installmentFormFields } from '@/utils/loanInterest';

export const toInputDate = (value: string | null | undefined): string => {
    if (value == null || value === '') return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

function lastApprovedAt(app?: any): string {
    const approvals = Array.isArray(app?.approvals) ? app.approvals : [];
    const approved = approvals.filter((a: any) => a?.status === 'approved' && a?.approved_at);
    if (approved.length === 0) return '';
    return toInputDate(approved[approved.length - 1].approved_at);
}

function resolveLoanOfficialDates(
    saved: any,
    app: any,
    loanProduct: any,
    loanCategory: any,
) {
    const approval =
        toInputDate(saved?.loan_approval_date) ||
        toInputDate(app?.reviewed_at) ||
        lastApprovedAt(app);
    const disbursement =
        toInputDate(saved?.loan_disbursement_date) ||
        toInputDate(saved?.disbursement_date) ||
        toInputDate(app?.disbursed_at);
    let repayment =
        toInputDate(saved?.loan_repayment_date) ||
        toInputDate(saved?.repayment_date) ||
        toInputDate(app?.expected_end_date);
    if (!repayment && disbursement) {
        repayment =
            calculateLoanSchedule(
                Number(app?.requested_amount || app?.approved_amount) || 1,
                loanProduct,
                loanCategory,
                disbursement,
            ).lastInstallmentDate || '';
    }
    return { approval, disbursement, repayment };
}

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

function resolveBackUrl(
    isLegacy: boolean,
    member: any,
    loanProduct: any,
    loanCategory: any,
    requestedAmount: number,
    existingApplication?: any,
) {
    return afterLoanFormSaveUrl({
        existingApplication,
        isLegacy,
        member,
        loanProduct,
        loanCategory,
        requestedAmount,
        formId: 5,
    });
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
    const loanDurationMonths = loanProduct?.duration_months || loanProduct?.loan_duration_months || '';
    const durationNetFromAdmission = scaleAnnualToLoanYears(
        member?.estimated_annual_project_income,
        loanDurationMonths,
    );
    const selfFromFamily = getSelfOccupationAndEducation(member);
    const officialDates = resolveLoanOfficialDates(
        savedData,
        existingApplication,
        loanProduct,
        loanCategory,
    );
    const computedInstallment = installmentFormFields(
        Number(requestedAmount) || 0,
        loanProduct,
        loanCategory,
    );

    const { data, setData, processing } = useForm<LoanApplicationApprovalData>({
        category_name: categoryName,
        branch_address: branch?.address || '',
        application_date: new Date().toISOString().split('T')[0],
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
        other_loan_status: Array.from({ length: 7 }, () => ({
            current_status: '',
            round: '',
            borrower_name: '',
            mobile: '',
            remarks: '',
            source_name: '',
            custom_source: '',
            is_custom: false,
        })),
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
        installment_type: computedInstallment.installment_type,
        installment_principal: computedInstallment.installment_principal,
        installment_service_charge: computedInstallment.installment_service_charge,
        installment_total: computedInstallment.installment_total,
        number_of_installments: computedInstallment.number_of_installments
            || (loanProduct?.number_of_installments
                ? String(loanProduct.number_of_installments)
                : (loanProduct?.duration_months ? String(loanProduct.duration_months) : '')),
        last_installment_amount: computedInstallment.last_installment_amount,
        last_installment_principal: computedInstallment.last_installment_principal,
        last_installment_service_charge: computedInstallment.last_installment_service_charge,
        total_principal: computedInstallment.total_principal,
        total_service_charge: computedInstallment.total_service_charge,
        total_payable: computedInstallment.total_payable,
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
        // Always recompute schedule from product factors — never keep stale draft values
        ...computedInstallment,
        loan_duration_months: loanProduct?.duration_months
            ? String(loanProduct.duration_months)
            : (loanProduct?.loan_duration_months ? String(loanProduct.loan_duration_months) : ''),
        applied_service_charge_rate: loanProduct?.interest_rate != null && loanProduct?.interest_rate !== ''
            ? String(loanProduct.interest_rate)
            : (loanProduct?.service_charge != null && loanProduct?.service_charge !== ''
                ? String(loanProduct.service_charge)
                : ''),
        annual_net_profit:
            durationNetFromAdmission ||
            String((savedData as any)?.annual_net_profit || '') ||
            annualNetFromAdmission,
        ...(() => {
            const years = getLoanYears(loanDurationMonths);
            const annual = Number(annualNetFromAdmission) || 0;
            const src = savedData || {};
            let income = Number(src.project_income_1_2_yr) || 0;
            let expense = Number(src.project_expense_1_2_yr) || 0;
            if (
                annual > 0 &&
                years !== 1 &&
                income > 0 &&
                Math.round(income - expense) === Math.round(annual)
            ) {
                income = Math.round(income * years);
                expense = Math.round(expense * years);
            }
            const other = Number(src.est_other_income_amount) || 0;
            const result: Record<string, string> = {};
            if (Number(src.project_income_1_2_yr) > 0) {
                result.project_income_1_2_yr = String(income);
            }
            if (src.project_expense_1_2_yr !== '' && src.project_expense_1_2_yr != null) {
                result.project_expense_1_2_yr = String(expense);
            }
            if (income > 0) {
                result.est_main_income_amount = String(Math.max(0, income - other));
            }
            return result;
        })(),
        ...(Number(requestedAmount) > 0 ? {
            final_approved_loan_amount_digits: String(requestedAmount),
            final_approved_loan_amount_words: numberToWordsBangla(Number(requestedAmount)) + ' টাকা',
        } : {}),
        loan_approval_date: officialDates.approval || String((savedData as any)?.loan_approval_date || ''),
        loan_disbursement_date: officialDates.disbursement || String((savedData as any)?.loan_disbursement_date || ''),
        loan_repayment_date: officialDates.repayment || String((savedData as any)?.loan_repayment_date || ''),
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
            const restored = { ...local.data } as Partial<LoanApplicationApprovalData>;
            delete restored.installment_type;
            delete restored.installment_principal;
            delete restored.installment_service_charge;
            delete restored.installment_total;
            delete restored.number_of_installments;
            delete restored.last_installment_amount;
            delete restored.last_installment_principal;
            delete restored.last_installment_service_charge;
            delete restored.total_principal;
            delete restored.total_service_charge;
            delete restored.total_payable;
            delete restored.applied_service_charge_rate;
            delete restored.loan_duration_months;
            setData((prev) => {
                const merged = { ...prev, ...restored };
                return {
                    ...merged,
                    loan_approval_date: String(merged.loan_approval_date || '').trim() || prev.loan_approval_date,
                    loan_disbursement_date: String(merged.loan_disbursement_date || '').trim() || prev.loan_disbursement_date,
                    loan_repayment_date: String(merged.loan_repayment_date || '').trim() || prev.loan_repayment_date,
                    occupation:
                        String(merged.occupation || '').trim() || selfFromFamily.occupation,
                    educational_qualification:
                        String(merged.educational_qualification || '').trim() ||
                        selfFromFamily.educational_qualification,
                    ...installmentFormFields(
                        Number(merged.invest_plan_applied_amount) ||
                            Number(merged.capital_applied_loan) ||
                            Number(requestedAmount) ||
                            0,
                        loanProduct,
                        loanCategory,
                    ),
                    annual_net_profit: durationNetFromAdmission || merged.annual_net_profit,
                    ...(() => {
                        const years = getLoanYears(loanDurationMonths);
                        const annual = Number(annualNetFromAdmission) || 0;
                        const income = Number(merged.project_income_1_2_yr) || 0;
                        const expense = Number(merged.project_expense_1_2_yr) || 0;
                        if (
                            annual > 0 &&
                            years !== 1 &&
                            income > 0 &&
                            Math.round(income - expense) === Math.round(annual)
                        ) {
                            return {
                                project_income_1_2_yr: String(Math.round(income * years)),
                                project_expense_1_2_yr: String(Math.round(expense * years)),
                            };
                        }
                        return {};
                    })(),
                    est_main_income_amount:
                        durationNetFromAdmission || merged.est_main_income_amount,
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

    useEffect(() => {
        if (!data.loan_disbursement_date || data.loan_repayment_date) return;
        const next =
            calculateLoanSchedule(
                Number(requestedAmount) || 1,
                loanProduct,
                loanCategory,
                data.loan_disbursement_date,
            ).lastInstallmentDate || '';
        if (next) setData('loan_repayment_date', next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.loan_disbursement_date]);

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
                `আয় − ব্যয় = নিট লাভ মিলছে না (${income} − ${expense} ≠ ${net}).\nতবুও খসড়া সেভ করবেন? পরে সংশোধন করতে পারবেন।`
            );
            if (!ok) return;
        }

        const page3Income =
            (Number(data.est_main_income_amount) || 0) + (Number(data.est_other_income_amount) || 0);
        const page3Expense =
            (Number(data.est_emp_salary) || 0) +
            (Number(data.est_transport) || 0) +
            (Number(data.est_bills) || 0) +
            (Number(data.est_rent) || 0) +
            (Number(data.est_loan_charge) || 0) +
            (Number(data.est_other_exp_1_amount) || 0) +
            (Number(data.est_other_exp_2_amount) || 0) +
            (Number(data.est_other_exp_3_amount) || 0);
        if (!hasIncomeExpense) {
            const msg = 'পৃষ্ঠা ১-এ সম্ভাব্য আয় ও সম্ভাব্য ব্যয় লিখুন। পৃষ্ঠা ৩-এর হিসাব সেখান থেকে মিলতে হবে।';
            setErrors({ project_income_1_2_yr: msg });
            const ok = confirm(`${msg}\nতবুও খসড়া সেভ করবেন?`);
            if (!ok) return;
            setErrors({});
        } else {
            if (page3Income !== income) {
                const msg = `পৃষ্ঠা ৩-এর মোট আয় (${page3Income}) পৃষ্ঠা ১-এর সম্ভাব্য আয় (${income})-এর সমান হতে হবে।`;
                setErrors({ est_main_income_amount: msg });
                const ok = confirm(`${msg}\nতবুও খসড়া সেভ করবেন?`);
                if (!ok) return;
                setErrors({});
            }
            if (page3Expense !== expense) {
                const msg = `পৃষ্ঠা ৩-এর মোট ব্যয় (${page3Expense}) পৃষ্ঠা ১-এর সম্ভাব্য ব্যয় (${expense})-এর সমান হতে হবে।`;
                setErrors({ est_emp_salary: msg });
                const ok = confirm(`${msg}\nতবুও খসড়া সেভ করবেন?`);
                if (!ok) return;
                setErrors({});
            }
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
            application_id: existingApplication?.id || undefined,
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

    const liveInstallment = useMemo(
        () =>
            installmentFormFields(
                Number(data.invest_plan_applied_amount) ||
                    Number(data.capital_applied_loan) ||
                    Number(data.approval_amount_digits) ||
                    Number(requestedAmount) ||
                    0,
                loanProduct,
                loanCategory,
            ),
        [
            data.invest_plan_applied_amount,
            data.capital_applied_loan,
            data.approval_amount_digits,
            requestedAmount,
            loanProduct,
            loanCategory,
        ],
    );
    const previewData = { ...data, ...liveInstallment };

    if (onlyPreview) {
        return (
            <div className="print-container" style={{ fontFamily: 'Kalpurush, Arial, sans-serif', color: '#000' }}>
                <PrintPreview formData={previewData} branch={branch} categoryName={categoryName} />
            </div>
        );
    }

    return (
        <AdminLayout>
            <Head title="আগ্রসর আবেদন ও অনুমোদনপত্র">
                <style>{`
                    @media print {
                        @page {
                            size: A4 portrait;
                            margin: 8mm 10mm;
                        }

                        body * {
                            visibility: hidden !important;
                            box-shadow: none !important;
                        }

                        .print-container,
                        .print-container * {
                            visibility: visible !important;
                            font-family: Kalpurush, Arial, sans-serif !important;
                        }

                        .print-container .font-mono,
                        .print-container .font-mono * {
                            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                        }

                        nav, header, aside, .sidebar, [role="navigation"], .print\\:hidden {
                            display: none !important;
                        }

                        .print-container {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            max-width: 100% !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            background: white !important;
                        }

                        p, span, td, th, div {
                            color: black !important;
                        }
                    }
                `}</style>
            </Head>
            
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
                                <span>সদস্য: <strong className="text-gray-900">{member?.applicant_name_bn || member?.applicant_name_en}</strong></span>
                            )}
                            {existingApplication?.application_no && (
                                <span>আবেদন নং: <strong className="font-mono text-gray-900">{existingApplication.application_no}</strong></span>
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
                            onClick={() =>
                                router.visit(
                                    resolveBackUrl(isLegacy, member, loanProduct, loanCategory, requestedAmount, existingApplication),
                                )
                            }
                            className="flex items-center gap-1.5 px-3 py-2 bg-gray-600 text-white rounded-lg text-xs md:text-sm hover:bg-gray-700 transition-all font-medium whitespace-nowrap"
                        >
                            <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">ফর্ম তালিকা</span>
                        </button>
                        
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => triggerPrintWithAutoFit('.loan-approval-print')}
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
                                    <PrintPreview formData={previewData} branch={branch} categoryName={categoryName} />
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
                        onClick={() => triggerPrintWithAutoFit('.loan-approval-print')}
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



