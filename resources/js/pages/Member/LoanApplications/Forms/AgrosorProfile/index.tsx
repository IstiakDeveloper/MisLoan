import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { AlertCircle, ArrowLeft, Eye, Printer, Save, X } from 'lucide-react';
import {
    clearLoanDraftLocal,
    loadLoanDraftLocal,
    loanDraftStorageKey,
    saveLoanDraftLocal,
} from '@/utils/loanDraftStorage';
import {
    calcInstallmentSchedule,
    getInstallmentTypeLabel,
    getLoanDurationMonths,
} from '@/utils/loanInterest';
import { AgrosorProfileData, AgrosorProfileProps } from './Types';
import FormPage1 from './FormPage1';
import FormPage2 from './FormPage2';
import PrintPreview from './PrintPreview';
import { numberToWordsBangla } from '../ApprovalForm/PrintPreview';
import { withLiveMemberCode } from '@/utils/memberCodeUtils';
import { afterLoanFormSaveUrl } from '@/utils/loanFormNavigation';

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

const fmt = (v: any): string => {
    if (v === null || v === undefined || v === '') return '';
    const n = Number(v);
    return Number.isNaN(n) ? String(v) : String(Math.round(n));
};

const str = (v: any): string => (v != null && v !== '' ? String(v) : '');

function buildGuarantorAddress(member: any): string {
    if (!member) return '';
    return [
        member.present_village_road || member.permanent_village_road,
        member.present_union || member.permanent_union,
        member.present_upazila || member.permanent_upazila,
        member.present_district || member.permanent_district,
        member.present_post_code || member.permanent_post_code,
    ]
        .filter(Boolean)
        .join(', ');
}

function buildLivestockSummary(member: any): string {
    if (!member) return '';
    const parts: string[] = [];
    if (Number(member.cow_buffalo_count) > 0) parts.push(`গরু/মহিষ: ${member.cow_buffalo_count}`);
    if (Number(member.goat_sheep_count) > 0) parts.push(`ছাগল/ভেড়া: ${member.goat_sheep_count}`);
    if (Number(member.duck_chicken_count) > 0) parts.push(`হাঁস/মুরগি: ${member.duck_chicken_count}`);
    if (member.other_livestock) {
        parts.push(
            String(member.other_livestock) +
                (member.other_livestock_count ? ` (${member.other_livestock_count})` : ''),
        );
    }
    return parts.join(', ');
}

function buildBuildingSummary(member: any): { qty: string; value: string } {
    if (!member) return { qty: '', value: '' };
    const parts: string[] = [];
    if (Number(member.brick_house_count) > 0) parts.push(`পাকা: ${member.brick_house_count}`);
    if (Number(member.semi_brick_house_count) > 0) parts.push(`আধা-পাকা: ${member.semi_brick_house_count}`);
    if (Number(member.tin_house_count) > 0) parts.push(`টিন: ${member.tin_house_count}`);
    if (Number(member.mud_house_count) > 0) parts.push(`কাঁচা: ${member.mud_house_count}`);
    if (member.house_type) parts.push(String(member.house_type));
    return { qty: parts.join(', '), value: '' };
}

function emptyOtherLoan() {
    return {
        source_name: '',
        custom_source: '',
        is_custom: false,
        current_status: '',
        round: '',
        borrower_name: '',
        mobile: '',
        remarks: '',
    };
}

function parseOtherLoansFromAdmission(member: any) {
    const empty = () => [emptyOtherLoan(), emptyOtherLoan(), emptyOtherLoan()];
    const info = member?.other_loan_info;
    if (!info) return empty();
    if (Array.isArray(info) && info.length > 0) {
        return info.slice(0, 5).map((row: any) => ({
            ...emptyOtherLoan(),
            source_name: str(row.source || row.source_name || row.institution || row.name),
            current_status: str(row.amount || row.current_status || row.loan_amount),
            round: str(row.duration || row.round || row.term),
            borrower_name: str(row.borrower_name || row.informant_name),
            mobile: str(row.mobile || row.phone),
            remarks: str(row.remarks || row.comment || row.rate || row.service_charge),
        }));
    }
    if (typeof info === 'string' && info.trim()) {
        const rows = empty();
        rows[0] = { ...emptyOtherLoan(), source_name: info.trim() };
        return rows;
    }
    return empty();
}

/** Migrate older Agrosor drafts (source/amount/rate/duration) → 4-page shape */
function normalizeOtherLoans(raw: any): ReturnType<typeof emptyOtherLoan>[] {
    if (!Array.isArray(raw) || raw.length === 0) {
        return [emptyOtherLoan(), emptyOtherLoan(), emptyOtherLoan()];
    }
    return raw.map((row: any) => {
        if (row?.source_name != null || row?.current_status != null || row?.borrower_name != null) {
            return {
                ...emptyOtherLoan(),
                ...row,
                source_name: str(row.source_name || row.source),
                current_status: str(row.current_status || row.amount),
                round: str(row.round || row.duration),
                borrower_name: str(row.borrower_name),
                mobile: str(row.mobile),
                remarks: str(row.remarks),
                is_custom: !!row.is_custom,
                custom_source: str(row.custom_source),
            };
        }
        return {
            ...emptyOtherLoan(),
            source_name: str(row.source),
            current_status: str(row.amount),
            round: str(row.duration),
            remarks: str([row.rate, row.remarks].filter(Boolean).join(' | ')),
        };
    });
}

function mapOtherAssetsToMovable(member: any) {
    const assets = member?.other_assets ?? member?.otherAssets ?? [];
    const pick = (pred: (d: string) => boolean) => {
        const found = assets.find((a: any) => pred(String(a?.asset_description || '').toLowerCase()));
        return found?.estimated_value != null ? fmt(found.estimated_value) : '';
    };
    const furniture = pick((d) => d.includes('আসবাব') || d.includes('furniture'));
    const gold = pick((d) => d.includes('স্বর্ণ') || d.includes('gold') || d.includes('গহনা'));
    const business = pick((d) => d.includes('মূলধন') || d.includes('ব্যবসা') || d.includes('capital'));
    const others = assets
        .filter((a: any) => {
            const d = String(a?.asset_description || '').toLowerCase();
            return d && !d.includes('আসবাব') && !d.includes('furniture') && !d.includes('স্বর্ণ') && !d.includes('gold') && !d.includes('মূলধন') && !d.includes('ব্যবসা');
        })
        .map((a: any) => `${a.asset_description || ''}: ${fmt(a.estimated_value)}`.trim())
        .filter(Boolean)
        .join('; ');

    return { furniture, gold, business, others };
}

function buildInitialData(
    member: any,
    loanProduct: any,
    loanCategory: any,
    requestedAmount: number,
    branch: any,
    isLegacy: boolean,
    savedData?: AgrosorProfileData,
): AgrosorProfileData {
    const memberName = member?.applicant_name_bn || member?.applicant_name_en || member?.name || '';
    const memberCode = member?.application_no || member?.member_code || '';
    const samityName =
        member?.samity?.samity_name_bn || member?.samity?.samity_name || member?.samity_name || '';
    const samityCode = member?.samity?.samity_code || member?.samity?.id?.toString() || member?.samity_code || '';
    const projectName = member?.project_name || '';
    const annualNet =
        member?.estimated_annual_project_income != null && member?.estimated_annual_project_income !== ''
            ? fmt(member.estimated_annual_project_income)
            : '';
    const months = getLoanDurationMonths(loanProduct, 6);
    const amount = Number(requestedAmount) || 0;
    // Agrosor Profile = Sufolon only → always one lump-sum repayment
    const schedule = calcInstallmentSchedule(
        amount,
        loanProduct,
        months,
        loanCategory || { category_code: 'SFL' },
    );
    const building = buildBuildingSummary(member);
    const movable = mapOtherAssetsToMovable(member);
    const livestockText = buildLivestockSummary(member);
    const loanDofa =
        member?.loan_dofa != null && member?.loan_dofa !== '' ? String(member.loan_dofa) : '1';
    const monthlyIncome = Number(member?.monthly_income) || 0;
    const monthlyExpense = Number(member?.monthly_expense) || 0;
    const yearlyIncome = monthlyIncome > 0 ? String(Math.round(monthlyIncome * 12)) : '';
    const yearlyExpense = monthlyExpense > 0 ? String(Math.round(monthlyExpense * 12)) : '';
    const yearlyNet =
        monthlyIncome > 0 || monthlyExpense > 0
            ? String(Math.round(monthlyIncome * 12 - monthlyExpense * 12))
            : '';

    const occupation =
        String(member?.business_details || '').trim() ||
        String(member?.job_details || '').trim() ||
        '';

    const base: AgrosorProfileData = {
        form_variant: 'agrosor_profile',
        application_date: new Date().toISOString().split('T')[0],
        disbursement_date: '',
        repayment_date: '',
        member_name_code: [memberName, memberCode].filter(Boolean).join(' / '),
        samity_name_code: [samityName, samityCode].filter(Boolean).join(' / '),
        implemented_project_name: projectName,
        alternative_project_name: '',
        employment_rows: [
            {
                activity_name: projectName || occupation,
                self_full_male: '',
                self_full_female: '',
                self_part_male: '',
                self_part_female: '',
                wage_full_male: '',
                wage_full_female: '',
                wage_part_male: '',
                wage_part_female: '',
            },
            {
                activity_name: '',
                self_full_male: '',
                self_full_female: '',
                self_part_male: '',
                self_part_female: '',
                wage_full_male: '',
                wage_full_female: '',
                wage_part_male: '',
                wage_part_female: '',
            },
            {
                activity_name: '',
                self_full_male: '',
                self_full_female: '',
                self_part_male: '',
                self_part_female: '',
                wage_full_male: '',
                wage_full_female: '',
                wage_part_male: '',
                wage_part_female: '',
            },
            {
                activity_name: '',
                self_full_male: '',
                self_full_female: '',
                self_part_male: '',
                self_part_female: '',
                wage_full_male: '',
                wage_full_female: '',
                wage_part_male: '',
                wage_part_female: '',
            },
        ],
        raw_material_source: '',
        sales_market: '',
        immovable_land_qty: str(member?.cultivable_land_amount),
        immovable_land_value: fmt(member?.cultivable_land_value),
        immovable_building_qty: building.qty,
        immovable_building_value: building.value,
        immovable_homestead_qty: str(member?.non_cultivable_land_amount),
        immovable_homestead_value: fmt(member?.non_cultivable_land_value),
        immovable_pond_qty: '',
        immovable_pond_value: '',
        immovable_other_qty: '',
        immovable_other_value: member?.total_asset_value != null ? fmt(member.total_asset_value) : '',
        movable_savings: member?.monthly_savings != null ? fmt(member.monthly_savings) : '',
        movable_furniture: movable.furniture,
        movable_gold: movable.gold,
        movable_livestock: livestockText,
        movable_business_capital: movable.business,
        movable_other: movable.others,
        other_loans: parseOtherLoansFromAdmission(member),
        business_plan_rows: [
            {
                project_name: projectName,
                investment: amount ? String(amount) : '',
                net_income: annualNet,
            },
            { project_name: '', investment: '', net_income: '' },
            { project_name: '', investment: '', net_income: '' },
        ],
        fund_own: '',
        fund_own_remarks: '',
        fund_applied_loan: amount ? String(amount) : '',
        fund_applied_loan_remarks: '',
        fund_other: '',
        fund_other_remarks: '',
        fund_total: amount ? String(amount) : '',
        alt_income_agriculture: '',
        alt_income_job: member?.job_details ? yearlyIncome : '',
        alt_income_other: member?.other_income_details ? str(member.other_income_details) : '',
        alt_income_total: '',
        last_year_total_income: yearlyIncome,
        last_year_total_expense: yearlyExpense,
        last_year_net_profit: yearlyNet || annualNet,
        current_loan_round: loanDofa,
        applied_loan_amount: amount ? String(amount) : '',
        previous_loans: [
            {
                receive_date: '',
                round: loanDofa !== '1' ? String(Math.max(1, Number(loanDofa) - 1) || '') : '',
                project_name: projectName,
                alt_project: '',
                repay_date: '',
            },
            { receive_date: '', round: '', project_name: '', alt_project: '', repay_date: '' },
            { receive_date: '', round: '', project_name: '', alt_project: '', repay_date: '' },
        ],
        loan_duration_label: `${months} মাস`,
        service_charge_rate: loanProduct?.interest_rate != null ? String(loanProduct.interest_rate) : '',
        installment_type: schedule?.typeLabel || getInstallmentTypeLabel(loanProduct, loanCategory),
        installment_principal: schedule ? String(schedule.principal) : '',
        installment_service_charge: schedule ? String(schedule.serviceCharge) : '',
        installment_total: schedule ? String(schedule.principal + schedule.serviceCharge) : '',
        guarantor_1_name: member?.guarantor_name || '',
        guarantor_1_address: buildGuarantorAddress(member),
        guarantor_1_mobile: member?.guarantor_mobile || '',
        guarantor_2_name: '',
        guarantor_2_address: '',
        guarantor_2_mobile: '',
        member_signature: '',
        // Office comments — FO fills officer; BM/RM/final come from approval workflow
        officer_post_inspection_comments: '',
        officer_comments: '',
        branch_manager_post_inspection_comments: '',
        bm_comments: '',
        regional_manager_comments: '',
        rm_comments: '',
        zonal_manager_comments: '',
        final_approver_comments: '',
        final_approved_loan_amount_digits: '',
        final_approved_loan_amount_words: '',
        branch_name: branch?.name || '',
        branch_address: branch?.address || '',
        category_name: loanCategory?.category_name_bn || loanCategory?.category_name || '',
        occupation,
        is_legacy_member: !!(member?.is_legacy) || isLegacy,
    };

    return {
        ...base,
        ...(savedData || {}),
        // Prefer admission when saved draft left these empty
        member_name_code: memberCode
            ? [memberName, memberCode].filter(Boolean).join(' / ')
            : (str(savedData?.member_name_code) || base.member_name_code),
        samity_name_code: str(savedData?.samity_name_code) || base.samity_name_code,
        implemented_project_name: str(savedData?.implemented_project_name) || base.implemented_project_name,
        guarantor_1_name: str(savedData?.guarantor_1_name) || base.guarantor_1_name,
        guarantor_1_mobile: str(savedData?.guarantor_1_mobile) || base.guarantor_1_mobile,
        guarantor_1_address: str(savedData?.guarantor_1_address) || base.guarantor_1_address,
        guarantor_2_name: str(savedData?.guarantor_2_name) || base.guarantor_2_name,
        guarantor_2_mobile: str(savedData?.guarantor_2_mobile) || base.guarantor_2_mobile,
        guarantor_2_address: str(savedData?.guarantor_2_address) || base.guarantor_2_address,
        applied_loan_amount: str(savedData?.applied_loan_amount) || base.applied_loan_amount,
        fund_applied_loan: str(savedData?.fund_applied_loan) || base.fund_applied_loan,
        other_loans: normalizeOtherLoans(
            savedData?.other_loan_status || savedData?.other_loans || base.other_loans,
        ),
        // Keep approver-written office comments from saved draft / server
        officer_post_inspection_comments:
            str(savedData?.officer_post_inspection_comments) ||
            str(savedData?.officer_comments) ||
            base.officer_post_inspection_comments,
        officer_comments:
            str(savedData?.officer_comments) ||
            str(savedData?.officer_post_inspection_comments) ||
            base.officer_comments,
        branch_manager_post_inspection_comments:
            str(savedData?.branch_manager_post_inspection_comments) ||
            str(savedData?.bm_comments) ||
            '',
        bm_comments:
            str(savedData?.bm_comments) ||
            str(savedData?.branch_manager_post_inspection_comments) ||
            '',
        regional_manager_comments:
            str(savedData?.regional_manager_comments) || str(savedData?.rm_comments) || '',
        rm_comments:
            str(savedData?.rm_comments) || str(savedData?.regional_manager_comments) || '',
        zonal_manager_comments: str(savedData?.zonal_manager_comments) || '',
        final_approver_comments: str(savedData?.final_approver_comments) || '',
        final_approved_loan_amount_digits: Number(requestedAmount) > 0 ? String(requestedAmount) : (str(savedData?.final_approved_loan_amount_digits) || ''),
        final_approved_loan_amount_words: Number(requestedAmount) > 0 ? numberToWordsBangla(Number(requestedAmount)) + ' টাকা' : (str(savedData?.final_approved_loan_amount_words) || ''),
        // Never keep stale "মাসিক কিস্তি" from older drafts — always recompute lump-sum schedule
        loan_duration_label: `${months} মাস`,
        service_charge_rate:
            loanProduct?.interest_rate != null ? String(loanProduct.interest_rate) : base.service_charge_rate,
        installment_type: schedule?.typeLabel || 'এককালীন',
        installment_principal: schedule ? String(schedule.principal) : '',
        installment_service_charge: schedule ? String(schedule.serviceCharge) : '',
        installment_total: schedule
            ? String(schedule.principal + schedule.serviceCharge)
            : '',
        member_signature: '',
    };
}

export default function AgrosorProfile({
    member,
    loanProduct,
    loanCategory,
    requestedAmount,
    branch,
    existingApplication,
    savedData,
    onlyPreview,
    isLegacy = false,
}: AgrosorProfileProps) {
    const categoryName = loanCategory?.category_name_bn || loanCategory?.category_name || 'সুফলন';

    if (onlyPreview) {
        const previewData = buildInitialData(
            member,
            loanProduct,
            loanCategory,
            requestedAmount,
            branch,
            isLegacy,
            savedData && Object.keys(savedData).length > 0 ? savedData : undefined,
        );
        const months = getLoanDurationMonths(loanProduct, 6);
        const amount =
            Number(previewData.applied_loan_amount) ||
            Number(previewData.fund_applied_loan) ||
            Number(requestedAmount) ||
            0;
        const schedule = calcInstallmentSchedule(
            amount,
            { ...(loanProduct || {}), installment_type: 'lump_sum', number_of_installments: 1 },
            months,
            loanCategory || { category_code: 'SFL' },
        );
        return (
            <div className="print-container">
                <PrintPreview
                    formData={{
                        ...previewData,
                        other_loans: normalizeOtherLoans(
                            previewData.other_loan_status || previewData.other_loans,
                        ),
                        loan_duration_label: `${months} মাস`,
                        service_charge_rate:
                            loanProduct?.interest_rate != null
                                ? String(loanProduct.interest_rate)
                                : previewData.service_charge_rate,
                        installment_type: 'এককালীন',
                        installment_principal: schedule ? String(schedule.principal) : '',
                        installment_service_charge: schedule ? String(schedule.serviceCharge) : '',
                        installment_total: schedule
                            ? String(schedule.principal + schedule.serviceCharge)
                            : '',
                    }}
                />
            </div>
        );
    }

    const [showPreview, setShowPreview] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [localRestored, setLocalRestored] = useState(false);
    const [saving, setSaving] = useState(false);
    const skipNextLocalSave = useRef(true);
    const page = usePage<{ flash?: { error?: string | null } }>();
    const flashError = page.props.flash?.error || null;

    const draftKey = useMemo(
        () =>
            loanDraftStorageKey(
                'agrosor_profile',
                isLegacy ? 'legacy' : member?.id,
                loanProduct.id,
                loanCategory.id,
            ),
        [isLegacy, member?.id, loanProduct.id, loanCategory.id],
    );

    const leftPaneRef = useRef<HTMLDivElement>(null);
    const rightPaneRef = useRef<HTMLDivElement>(null);
    const previewFitRef = useRef<HTMLDivElement>(null);
    const previewContentRef = useRef<HTMLDivElement>(null);
    const [previewFit, setPreviewFit] = useState({ scale: 1, height: 0 });

    const { data, setData, processing } = useForm<AgrosorProfileData>(
        buildInitialData(member, loanProduct, loanCategory, requestedAmount, branch, isLegacy, savedData),
    );

    // Scale preview to the right panel WIDTH only (admin sidebar already reduced main content).
    // Keep vertical scroll so user can move down through pages.
    useEffect(() => {
        const fitEl = previewFitRef.current;
        const contentEl = previewContentRef.current;
        if (!fitEl || !contentEl) return;

        const measure = () => {
            if (typeof window !== 'undefined' && window.matchMedia('print').matches) {
                setPreviewFit({ scale: 1, height: 0 });
                return;
            }

            // Use the actual preview column width (content area), not the full viewport
            const availW = Math.max(fitEl.clientWidth, 0);
            // offsetWidth = layout width (ignores parent transform scale)
            const pageEl = contentEl.querySelector('.agrosor-a4-page') as HTMLElement | null;
            const naturalW = Math.max(
                pageEl?.offsetWidth ?? 0,
                contentEl.scrollWidth,
                contentEl.offsetWidth,
                794,
            );
            const naturalH = Math.max(contentEl.scrollHeight, contentEl.offsetHeight, 1);
            if (availW < 40) return;

            // Fit to column width; extra gutter + slight extra zoom-out so right edge isn't clipped
            // (scrollbar / card padding / border often eat a few px)
            const usableW = Math.max(availW - 28, 40);
            const scale = Math.min(1, (usableW / naturalW) * 0.92);
            const safe = Number.isFinite(scale) && scale > 0 ? Math.max(0.2, scale) : 1;
            setPreviewFit({ scale: safe, height: naturalH * safe });
        };

        const ro = new ResizeObserver(() => measure());
        ro.observe(fitEl);
        ro.observe(contentEl);
        if (rightPaneRef.current) ro.observe(rightPaneRef.current);
        window.addEventListener('resize', measure);
        measure();
        const t1 = window.setTimeout(measure, 50);
        const t2 = window.setTimeout(measure, 300);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', measure);
            window.clearTimeout(t1);
            window.clearTimeout(t2);
        };
    }, [data, showPreview]);

    useEffect(() => {
        const local = loadLoanDraftLocal<Partial<AgrosorProfileData>>(draftKey);
        if (local?.data) {
            const merged = { ...local.data } as Partial<AgrosorProfileData>;
            if (merged.other_loans || merged.other_loan_status) {
                merged.other_loans = normalizeOtherLoans(
                    merged.other_loan_status || merged.other_loans,
                );
            }
            // Drop stale installment schedule — FormPage2 recalculates এককালীন
            delete merged.installment_type;
            delete merged.installment_principal;
            delete merged.installment_service_charge;
            delete merged.installment_total;
            delete merged.loan_duration_label;
            delete merged.service_charge_rate;
            delete merged.member_signature;
            setData((prev) => withLiveMemberCode({ ...prev, ...merged }, member));
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

    const handleFocusInLeftPane = (e: React.FocusEvent | React.MouseEvent | React.KeyboardEvent) => {
        const target = e.target as HTMLElement;
        const anchor = target.closest('[data-sync]') as HTMLElement;
        if (anchor?.dataset.sync) {
            const syncId = anchor.dataset.sync;
            setTimeout(() => {
                if (!rightPaneRef.current) return;
                const previewAnchor = rightPaneRef.current.querySelector(
                    `[data-sync="${syncId}"]`,
                ) as HTMLElement;
                previewAnchor?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    };

    const handleSaveDraft = () => {
        setSaving(true);
        setSaveError(null);
        saveLoanDraftLocal(draftKey, data);
        router.post(
            '/member/loan-applications/forms/loan-application-approval/save-draft',
            {
                member_id: isLegacy ? undefined : member?.id,
                legacy: isLegacy ? 1 : 0,
                is_legacy: isLegacy ? 1 : 0,
                loan_product_id: loanProduct.id,
                loan_category_id: loanCategory.id,
                requested_amount: requestedAmount,
                application_id: existingApplication?.id,
                form_data: data,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    clearLoanDraftLocal(draftKey);
                    setLocalRestored(false);
                    setSaving(false);
                },
                onError: (errors) => {
                    setSaving(false);
                    const msg = Object.values(errors || {})[0];
                    setSaveError(
                        typeof msg === 'string'
                            ? msg
                            : 'খসড়া সার্ভারে সেভ হয়নি — আপনার তথ্য হারায়নি। আবার চেষ্টা করুন।',
                    );
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                },
                onFinish: () => setSaving(false),
            },
        );
    };

    const pageProps = {
        data,
        setData: (key: string, value: any) => setData(key as any, value),
        member,
        loanProduct,
        loanCategory,
        requestedAmount,
        isLegacy,
    };

    return (
        <AdminLayout>
            <Head title="অগ্রসর ঋণ আবেদন ও অনুমোদনপত্র (সুফলন)">
                <style>{`
                    @media print {
                        .agrosor-preview-fit {
                            height: auto !important;
                            overflow: visible !important;
                        }
                        .agrosor-preview-scaler {
                            transform: none !important;
                            width: auto !important;
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
                                <h3 className="text-sm font-bold text-amber-950">সংরক্ষণ ব্যর্থ — আপনার তথ্য মুছে যায়নি</h3>
                                <p className="text-sm text-amber-900 mt-1">{saveError || flashError}</p>
                            </div>
                        </div>
                    </div>
                )}
                {localRestored && !saveError && (
                    <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 print:hidden">
                        এই ডিভাইসে আগের অসম্পূর্ণ খসড়া থেকে তথ্য পুনরুদ্ধার করা হয়েছে। «খসড়া সংরক্ষণ» চাপলে সার্ভারে সেভ হবে।
                    </div>
                )}

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-6 print:hidden gap-3">
                    <div className="w-full md:w-auto">
                        <h2 className="text-lg md:text-2xl font-bold text-gray-800">
                            অগ্রসর ঋণ আবেদন ও অনুমোদনপত্র
                        </h2>
                        <div className="text-xs md:text-sm text-gray-600 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                            {isLegacy ? (
                                <span className="font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    উত্তরাধিকার/ম্যানুয়াল আবেদন
                                </span>
                            ) : (
                                <span>
                                    সদস্য:{' '}
                                    <strong className="text-gray-900">
                                        {member?.applicant_name_bn || member?.applicant_name_en}
                                    </strong>
                                </span>
                            )}
                            {existingApplication?.application_no && (
                                <span>
                                    আবেদন নং:{' '}
                                    <strong className="font-mono text-gray-900">
                                        {existingApplication.application_no}
                                    </strong>
                                </span>
                            )}
                            <span className="hidden sm:inline text-gray-300">|</span>
                            <span>
                                ক্যাটাগরি: <strong className="text-gray-900">{categoryName}</strong>
                            </span>
                            <span className="hidden sm:inline text-gray-300">|</span>
                            <span>
                                পরিমাণ: <strong className="text-emerald-700">৳{requestedAmount}</strong>
                            </span>
                        </div>
                    </div>

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
                                onClick={() => window.print()}
                                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-xs md:text-sm hover:bg-emerald-700 transition-all font-medium whitespace-nowrap"
                            >
                                <Printer className="w-4 h-4" /> <span className="hidden sm:inline">প্রিন্ট</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowPreview(!showPreview)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm transition-all font-bold whitespace-nowrap ${
                                    showPreview
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                                }`}
                            >
                                <Eye className="w-4 h-4" /> {showPreview ? 'ফর্মে ফিরে যান' : 'লাইভ প্রিভিউ'}
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveDraft}
                                disabled={processing || saving}
                                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-700 to-teal-700 text-white rounded-lg text-xs md:text-sm hover:from-emerald-800 hover:to-teal-800 shadow-sm transition-all disabled:opacity-50 font-bold whitespace-nowrap"
                            >
                                <Save className="w-4 h-4" />{' '}
                                <span>{processing || saving ? 'সেভ হচ্ছে...' : 'খসড়া সংরক্ষণ'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Continuous form + live preview (same pattern as 4-page ApprovalForm) */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 print:shadow-none print:border-none p-1 print:p-0">
                    <div className="flex flex-col lg:flex-row gap-0 lg:gap-3 min-h-[calc(100vh-160px)] print:block">
                        <div
                            className={`w-full ${showPreview ? 'hidden lg:block lg:w-1/2' : 'lg:w-1/2'} print:hidden lg:h-[calc(100vh-160px)] overflow-y-auto pr-1 custom-scrollbar`}
                            onFocusCapture={handleFocusInLeftPane}
                            onClickCapture={handleFocusInLeftPane}
                            ref={leftPaneRef}
                        >
                            <div className="bg-gray-50/60 p-3 lg:p-5 rounded-lg min-h-full space-y-6">
                                <FormPage1 {...pageProps} />
                                <FormPage2 {...pageProps} />
                            </div>
                        </div>

                        <div
                            ref={rightPaneRef}
                            className={`print:block print:h-auto print:overflow-visible print:w-full print:m-0 print:p-0 lg:h-[calc(100vh-160px)] lg:overflow-y-auto lg:pl-2 scroll-smooth custom-scrollbar ${
                                !showPreview
                                    ? 'hidden lg:block lg:w-1/2'
                                    : 'fixed inset-0 z-50 bg-gray-900/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto lg:relative lg:inset-auto lg:z-auto lg:bg-transparent lg:p-0 lg:w-1/2 lg:overflow-y-auto'
                            }`}
                        >
                            <div className="bg-white rounded-xl shadow-2xl lg:shadow-sm p-3 lg:p-3 print:shadow-none print:p-0 print:m-0 print:w-full print:h-auto print:overflow-visible print:rounded-none print:bg-white w-full relative mb-6 lg:mb-2">
                                <div className="flex justify-between items-center bg-indigo-600 text-white p-3 -mx-3 -mt-3 mb-3 rounded-t-xl lg:hidden print:hidden sticky top-0 z-20 shadow-md">
                                    <div className="flex items-center gap-2 font-bold text-sm">
                                        <Eye className="w-5 h-5" />
                                        <span>লাইভ আবেদনপত্র প্রিভিউ</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowPreview(false)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold"
                                    >
                                        <X className="w-4 h-4" />
                                        ফর্মে ফিরে যান
                                    </button>
                                </div>
                                <div
                                    ref={previewFitRef}
                                    className="agrosor-preview-fit w-full overflow-x-hidden overflow-y-hidden print:overflow-visible"
                                    style={
                                        previewFit.height > 0
                                            ? { height: previewFit.height }
                                            : undefined
                                    }
                                >
                                    <div
                                        ref={previewContentRef}
                                        className="agrosor-preview-scaler origin-top-left w-max max-w-none print:w-full"
                                        style={{
                                            transform: `scale(${previewFit.scale})`,
                                        }}
                                    >
                                        <PrintPreview formData={data} />
                                    </div>
                                </div>
                                <div className="lg:hidden print:hidden mt-6 pt-3 border-t border-gray-200 flex justify-center sticky bottom-2 z-30">
                                    <button
                                        type="button"
                                        onClick={() => setShowPreview(false)}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-full shadow-2xl text-xs font-bold border-2 border-white"
                                    >
                                        <X className="w-4 h-4" />
                                        ফর্মে ফিরে যান (ইনপুট করুন)
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
