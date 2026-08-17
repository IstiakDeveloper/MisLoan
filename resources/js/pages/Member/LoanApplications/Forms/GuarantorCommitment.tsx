import { useEffect, useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDateBangla } from '@/utils/dateUtils';
import { calculateTotalServiceCharge } from '@/utils/loanInterest';
import { Save, Printer, Eye, ArrowLeft, ShieldCheck, UserCheck, CreditCard, FileText } from 'lucide-react';
import { numberToWordsBangla } from './ApprovalForm/PrintPreview';
import { afterLoanFormSaveUrl } from '@/utils/loanFormNavigation';
import { useAutoFitPrint } from '@/hooks/useAutoFitPrint';

interface GuarantorCommitmentData {
    branch_name: string;
    branch_address: string;
    
    // Guarantor Info
    guarantor_name: string;
    guarantor_father_or_spouse: string;
    guarantor_nid: string;
    guarantor_mobile: string;
    guarantor_village: string;
    guarantor_post_office: string;
    guarantor_upazila: string;
    guarantor_district: string;
    guarantor_signature_image: string | null;
    
    // Member/Loan Applicant Info
    member_name: string;
    member_father_or_spouse: string;
    member_nid: string;
    member_mobile: string;
    member_village: string;
    member_post_office: string;
    member_upazila: string;
    member_district: string;
    member_code: string;
    samity_name: string;
    samity_code: string;
    
    // Loan Details
    loan_date: string;
    loan_amount: number;
    loan_amount_words: string;
    
    // Witness Signatures
    witness1_signature_image: string | null;
    witness2_signature_image: string | null;
    witness3_signature_image: string | null;
}

interface Props {
    member: any;
    loanProduct: any;
    loanCategory: any;
    requestedAmount: number;
    branch?: any;
    isLegacy?: boolean;
    existingApplication?: any;
    savedData?: GuarantorCommitmentData;
    /** Show page: only render print view with this data (no layout/inputs) */
    onlyPreview?: boolean;
    embedded?: boolean;
    afterSaveUrl?: string;
    saveButtonLabel?: string;
}

function resolveBackUrl(
    afterSaveUrl: string | undefined,
    isLegacy: boolean,
    member: any,
    loanProduct: any,
    loanCategory: any,
    requestedAmount: number,
    existingApplication?: any,
) {
    if (typeof window !== 'undefined') {
        const currentParams = new URLSearchParams(window.location.search);
        if (currentParams.get('return') === 'disburse' && currentParams.get('application_id')) {
            return `/member/loan-applications/${currentParams.get('application_id')}?action=disburse`;
        }
    }
    return afterLoanFormSaveUrl({
        afterSaveUrl,
        existingApplication,
        isLegacy,
        member,
        loanProduct,
        loanCategory,
        requestedAmount,
        formId: 2,
    });
}

/** Service charge from base loan amount & product (prorated by duration for annual rates) */
function calcServiceCharge(baseAmount: number, loanProduct: any): number {
    return calculateTotalServiceCharge(baseAmount, loanProduct);
}

function calcLoanAmountWithServiceCharge(baseAmount: number, loanProduct: any): number {
    const amount = Number(baseAmount) || 0;
    if (amount <= 0) return 0;
    return Math.round(amount + calcServiceCharge(amount, loanProduct));
}

function buildGuarantorCommitmentDefaults(
    member: any,
    loanProduct: any,
    requestedAmount: number,
    branch?: any,
): GuarantorCommitmentData {
    const baseLoanAmount = Number(requestedAmount) || 0;
    const loanAmount = calcLoanAmountWithServiceCharge(baseLoanAmount, loanProduct);
    const words = loanAmount > 0 ? numberToWordsBangla(loanAmount) : '';
    return {
        branch_name: branch?.name || '',
        branch_address: branch?.address || '',
        guarantor_name: member?.guarantor_name || '',
        guarantor_father_or_spouse: '',
        guarantor_nid: '',
        guarantor_mobile: member?.guarantor_mobile || '',
        guarantor_village: member?.present_village_road || member?.permanent_village_road || '',
        guarantor_post_office: member?.present_post_code || member?.permanent_post_code || '',
        guarantor_upazila: member?.present_upazila || member?.permanent_upazila || '',
        guarantor_district: member?.present_district || member?.permanent_district || '',
        guarantor_signature_image: null,
        member_name: member?.applicant_name_bn || member?.applicant_name_en || '',
        member_father_or_spouse: member?.father_name_bn || member?.spouse_name_bn || member?.father_name_en || '',
        member_nid: member?.nid_number || member?.smart_card_number || '',
        member_mobile: member?.mobile_number || '',
        member_village: member?.present_village_road || member?.permanent_village_road || '',
        member_post_office: member?.present_post_code || member?.permanent_post_code || '',
        member_upazila: member?.present_upazila || member?.permanent_upazila || '',
        member_district: member?.present_district || member?.permanent_district || '',
        member_code: member?.application_no || '',
        samity_name: member?.samity?.samity_name_bn || member?.samity?.samity_name || '',
        samity_code: member?.samity?.samity_code || member?.samity?.id?.toString() || '',
        loan_date: new Date().toISOString().split('T')[0],
        loan_amount: loanAmount,
        loan_amount_words: words ? words + ' টাকা' : '',
        witness1_signature_image: null,
        witness2_signature_image: null,
        witness3_signature_image: null,
    };
}

function GuarantorCommitmentOnlyPreview({ member, loanProduct, requestedAmount, branch, savedData }: any) {
    const baseLoanAmount = Number(requestedAmount) || 0;
    const defaults = buildGuarantorCommitmentDefaults(member, loanProduct, requestedAmount, branch);
    const previewData = savedData && Object.keys(savedData).length > 0
        ? {
            ...defaults,
            ...savedData,
            ...(baseLoanAmount > 0 ? {
                loan_amount: defaults.loan_amount,
                loan_amount_words: defaults.loan_amount_words,
            } : {}),
        }
        : defaults;

    useAutoFitPrint([previewData], '.guarantor-commitment-sheet');

    return (
        <div className="print-container">
            <GuarantorCommitmentPrintView data={previewData} />
        </div>
    );
}

export default function GuarantorCommitment({
    member,
    loanProduct,
    loanCategory,
    requestedAmount,
    branch,
    existingApplication,
    savedData,
    onlyPreview,
    embedded = false,
    afterSaveUrl,
    saveButtonLabel,
    isLegacy = false,
}: Props) {
    if (onlyPreview) {
        return (
            <GuarantorCommitmentOnlyPreview
                member={member}
                loanProduct={loanProduct}
                requestedAmount={requestedAmount}
                branch={branch}
                savedData={savedData}
            />
        );
    }

    const [showPreview, setShowPreview] = useState(true);

    const baseLoanAmount = Number(requestedAmount) || 0;
    const autoServiceCharge = Math.round(calcServiceCharge(baseLoanAmount, loanProduct));
    const initialLoanAmount = calcLoanAmountWithServiceCharge(baseLoanAmount, loanProduct);
    const initialWords = initialLoanAmount > 0 ? numberToWordsBangla(initialLoanAmount) + ' টাকা' : '';

    useAutoFitPrint([baseLoanAmount, member, loanProduct], '.guarantor-commitment-sheet');

    const { data, setData, processing } = useForm<GuarantorCommitmentData>({
        branch_name: branch?.name || '',
        branch_address: branch?.address || '',
        
        // Guarantor Info (auto-filled from MemberAdmission)
        guarantor_name: member?.guarantor_name || '',
        guarantor_father_or_spouse: '',
        guarantor_nid: '',
        guarantor_mobile: member?.guarantor_mobile || '',
        guarantor_village: member?.present_village_road || member?.permanent_village_road || '',
        guarantor_post_office: member?.present_post_code || member?.permanent_post_code || '',
        guarantor_upazila: member?.present_upazila || member?.permanent_upazila || '',
        guarantor_district: member?.present_district || member?.permanent_district || '',
        guarantor_signature_image: null,
        
        // Member Info (auto-filled from member admission)
        member_name: member?.applicant_name_bn || member?.applicant_name_en || '',
        member_father_or_spouse: member?.father_name_bn || member?.spouse_name_bn || member?.father_name_en || '',
        member_nid: member?.nid_number || member?.smart_card_number || '',
        member_mobile: member?.mobile_number || '',
        member_village: member?.present_village_road || member?.permanent_village_road || '',
        member_post_office: member?.present_post_code || member?.permanent_post_code || '',
        member_upazila: member?.present_upazila || member?.permanent_upazila || '',
        member_district: member?.present_district || member?.permanent_district || '',
        member_code: member?.application_no || '',
        samity_name: member?.samity?.samity_name_bn || member?.samity?.samity_name || '',
        samity_code: member?.samity?.samity_code || member?.samity?.id?.toString() || '',
        
        // Loan Details — loan_amount = base + service charge (auto from product)
        loan_date: new Date().toISOString().split('T')[0],
        loan_amount: initialLoanAmount,
        loan_amount_words: initialWords,
        
        // Witness Signatures
        witness1_signature_image: null,
        witness2_signature_image: null,
        witness3_signature_image: null,
    });

    // Auto-update loan amount with service charge when product/requested amount changes
    useEffect(() => {
        if (baseLoanAmount > 0 && loanProduct) {
            const calculated = calcLoanAmountWithServiceCharge(baseLoanAmount, loanProduct);
            const words = calculated > 0 ? numberToWordsBangla(calculated) + ' টাকা' : '';
            setData(prev => ({
                ...prev,
                loan_amount: calculated,
                loan_amount_words: words,
            }));
        }
    }, [baseLoanAmount, loanProduct]);

    // Auto-calculate loan amount in words (same as DeathRiskFund / ApprovalForm)
    useEffect(() => {
        if (data.loan_amount > 0) {
            const words = numberToWordsBangla(data.loan_amount);
            setData('loan_amount_words', words ? words + ' টাকা' : '');
        }
    }, [data.loan_amount]);

    // Load saved data if exists
    useEffect(() => {
        if (savedData) {
            const calculated = baseLoanAmount > 0 ? calcLoanAmountWithServiceCharge(baseLoanAmount, loanProduct) : (savedData.loan_amount || 0);
            const words = calculated > 0 ? numberToWordsBangla(calculated) + ' টাকা' : (savedData.loan_amount_words || '');
            setData(prev => ({
                ...prev,
                ...savedData,
                ...(baseLoanAmount > 0 ? {
                    loan_amount: calculated,
                    loan_amount_words: words,
                } : {}),
            }));
            setShowPreview(true);
        }
    }, [savedData, baseLoanAmount, loanProduct]);

    const handleSaveDraft = () => {
        const payload: any = { loan_product_id: loanProduct.id, loan_category_id: loanCategory.id, requested_amount: requestedAmount, agreement_data: data };
        if (isLegacy) payload.legacy = 1; else payload.member_id = member?.id;
        if (existingApplication?.id) payload.application_id = existingApplication.id;
        router.post(
            '/member/loan-applications/forms/guarantor-commitment/save-draft',
            payload,
            {
                onSuccess: () => {
                    router.visit(
                        resolveBackUrl(
                            afterSaveUrl,
                            isLegacy,
                            member,
                            loanProduct,
                            loanCategory,
                            requestedAmount,
                            existingApplication,
                        ),
                    );
                },
                onError: (errors) => {
                    console.error('Save draft error:', errors);
                    alert('খসড়া সার্ভারে সেভ হয়নি — আপনার ফর্মের তথ্য হারায়নি। আবার চেষ্টা করুন।');
                },
            }
        );
    };

    const handlePrint = () => {
        window.print();
    };

    const inputClass = 'w-full px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white';
    const disabledClass = 'w-full px-3 py-2 text-xs md:text-sm border border-gray-200 rounded-lg bg-gray-100/70 text-gray-700 font-medium cursor-not-allowed';

    const pageContent = (
        <>
            <Head title="ঋণের জামিনদার/দায়িত্ব গ্রহণকারীর অঙ্গীকার নামা">
                <style>{`
                    @media print {
                        @page {
                            size: A4 portrait;
                            margin: 15mm 20mm;
                        }

                        body * {
                            visibility: hidden !important;
                            box-shadow: none !important;
                        }

                        .print-container,
                        .print-container * {
                            visibility: visible !important;
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
                            page-break-after: avoid !important;
                            break-after: avoid !important;
                        }

                        .guarantor-commitment-sheet {
                            width: 100% !important;
                            max-height: 265mm !important;
                            page-break-inside: avoid !important;
                            break-inside: avoid !important;
                            box-sizing: border-box !important;
                        }

                        p, span, td, th, div {
                            color: black !important;
                        }
                    }
                `}</style>
            </Head>

            <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-6">
                {/* Top Action Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm print:hidden">
                    {!embedded && <div className="flex items-center gap-3">
                        <button
                            onClick={() =>
                                router.visit(
                                    resolveBackUrl(
                                        afterSaveUrl,
                                        isLegacy,
                                        member,
                                        loanProduct,
                                        loanCategory,
                                        requestedAmount,
                                        existingApplication,
                                    ),
                                )
                            }
                            className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 text-xs md:text-sm font-semibold rounded-lg hover:bg-gray-200 transition-all"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>আগে ফিরে যান</span>
                        </button>
                        <div>
                            <h1 className="text-base md:text-lg font-bold text-gray-900 flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                                <span>ঋণের জামিনদার/দায়িত্ব গ্রহণকারীর অঙ্গীকার নামা</span>
                            </h1>
                            <p className="text-xs text-gray-500">
                                MemberAdmission থেকে প্রাপ্ত তথ্যের ভিত্তিতে জামিননামা ফরম পূরণ ও প্রিন্ট প্রিভিউ দেখুন
                            </p>
                            {existingApplication && (
                                <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                                    ✓ ড্রাফট সংরক্ষিত আছে — আবেদন নং: {existingApplication.application_no || 'Pending'}
                                </p>
                            )}
                        </div>
                    </div>}
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowPreview(!showPreview)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs md:text-sm font-bold rounded-lg hover:bg-emerald-700 transition-all shadow-sm"
                        >
                            <Eye className="w-4 h-4" />
                            <span>{showPreview ? 'প্রিভিউ বন্ধ করুন' : 'প্রিভিউ দেখুন'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveDraft}
                            disabled={processing}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs md:text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm"
                        >
                            <Save className="w-4 h-4" />
                            <span>{processing ? 'সংরক্ষণ হচ্ছে...' : (saveButtonLabel || 'ড্রাফট সংরক্ষণ করুন')}</span>
                        </button>
                        {showPreview && (
                            <button
                                type="button"
                                onClick={handlePrint}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-xs md:text-sm font-bold rounded-lg hover:bg-purple-700 transition-all shadow-sm"
                            >
                                <Printer className="w-4 h-4" />
                                <span>প্রিন্ট করুন</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-1">
                    {/* INPUT FORM */}
                    <div className="space-y-5 print:hidden">
                        {/* 1. Guarantor Info */}
                        <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 border border-gray-200 space-y-4">
                            <h3 className="text-sm font-bold flex items-center gap-2 text-gray-800 border-b pb-2">
                                <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">১</span>
                                <UserCheck className="w-4 h-4 text-indigo-600" />
                                <span>জামিনদার/দায়িত্ব গ্রহণকারীর তথ্য</span>
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">জামিনদারের নাম (মো./মোছা./শ্রী.) *</label>
                                    <input
                                        type="text"
                                        value={data.guarantor_name}
                                        onChange={(e) => setData('guarantor_name', e.target.value)}
                                        placeholder="জামিনদারের নাম লিখুন"
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">স্বামী/পিতা</label>
                                    <input
                                        type="text"
                                        value={data.guarantor_father_or_spouse}
                                        onChange={(e) => setData('guarantor_father_or_spouse', e.target.value)}
                                        placeholder="স্বামী/পিতার নাম"
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">জাতীয় পরিচয়পত্র (NID) নং</label>
                                    <input
                                        type="text"
                                        value={data.guarantor_nid}
                                        onChange={(e) => setData('guarantor_nid', e.target.value)}
                                        placeholder="NID নম্বর"
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">মোবাইল নং</label>
                                    <input
                                        type="text"
                                        value={data.guarantor_mobile}
                                        onChange={(e) => setData('guarantor_mobile', e.target.value)}
                                        placeholder="মোবাইল নম্বর"
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">গ্রাম/রাস্তা</label>
                                    <input
                                        type="text"
                                        value={data.guarantor_village}
                                        onChange={(e) => setData('guarantor_village', e.target.value)}
                                        placeholder="গ্রাম"
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">ডাকঘর</label>
                                    <input
                                        type="text"
                                        value={data.guarantor_post_office}
                                        onChange={(e) => setData('guarantor_post_office', e.target.value)}
                                        placeholder="ডাকঘর"
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">উপজেলা</label>
                                    <input
                                        type="text"
                                        value={data.guarantor_upazila}
                                        onChange={(e) => setData('guarantor_upazila', e.target.value)}
                                        placeholder="উপজেলা"
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">জেলা</label>
                                    <input
                                        type="text"
                                        value={data.guarantor_district}
                                        onChange={(e) => setData('guarantor_district', e.target.value)}
                                        placeholder="জেলা"
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 2. Member/Loan Applicant Info */}
                        <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 border border-gray-200 space-y-4">
                            <h3 className="text-sm font-bold flex items-center gap-2 text-gray-800 border-b pb-2">
                                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">২</span>
                                <FileText className="w-4 h-4 text-blue-600" />
                                <span>ঋণ গ্রহীতার তথ্য (MemberAdmission থেকে স্বয়ংক্রিয়)</span>
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">ঋণ গ্রহীতার নাম</label>
                                    <input type="text" value={data.member_name} disabled className={disabledClass} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">স্বামী/পিতা</label>
                                    <input type="text" value={data.member_father_or_spouse} disabled className={disabledClass} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">NID নং</label>
                                    <input type="text" value={data.member_nid} disabled className={disabledClass} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">মোবাইল নং</label>
                                    <input type="text" value={data.member_mobile} disabled className={disabledClass} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">গ্রাম</label>
                                    <input type="text" value={data.member_village} disabled className={disabledClass} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">ডাকঘর/ইউনিয়ন</label>
                                    <input
                                        type="text"
                                        value={data.member_post_office}
                                        onChange={(e) => setData('member_post_office', e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">উপজেলা</label>
                                    <input type="text" value={data.member_upazila} disabled className={disabledClass} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">জেলা</label>
                                    <input type="text" value={data.member_district} disabled className={disabledClass} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">সদস্য নং</label>
                                    <input
                                        type="text"
                                        value={data.member_code}
                                        onChange={(e) => setData('member_code', e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">সমিতির নাম</label>
                                    <input type="text" value={data.samity_name} disabled className={disabledClass} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">সমিতি নং</label>
                                    <input type="text" value={data.samity_code} disabled className={disabledClass} />
                                </div>
                            </div>
                        </div>

                        {/* 3. Loan Details */}
                        <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 border border-gray-200 space-y-4">
                            <h3 className="text-sm font-bold flex items-center gap-2 text-gray-800 border-b pb-2">
                                <span className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs font-bold">৩</span>
                                <CreditCard className="w-4 h-4 text-emerald-600" />
                                <span>ঋণের বিবরণ</span>
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">অদ্য/গত তারিখ</label>
                                    <input
                                        type="date"
                                        value={data.loan_date}
                                        onChange={(e) => setData('loan_date', e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">আবেদনকৃত ঋণের পরিমাণ (৳)</label>
                                    <input
                                        type="text"
                                        value={baseLoanAmount > 0 ? baseLoanAmount.toLocaleString('bn-BD') : ''}
                                        readOnly
                                        className={disabledClass}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">সার্ভিস চার্জ (৳)</label>
                                    <input
                                        type="text"
                                        value={autoServiceCharge > 0 ? autoServiceCharge.toLocaleString('bn-BD') : ''}
                                        readOnly
                                        className={disabledClass}
                                    />
                                    <p className="text-[10px] text-gray-500 mt-0.5">
                                        প্রোডাক্টের ইন্টারেস্ট/সার্ভিস চার্জ হার অনুযায়ী স্বয়ংক্রিয়
                                    </p>
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">ঋণের পরিমাণ (সার্ভিস চার্জ সহ) (৳)</label>
                                    <input
                                        type="text"
                                        value={data.loan_amount > 0 ? Number(data.loan_amount).toLocaleString('bn-BD') : ''}
                                        readOnly
                                        className="w-full px-3 py-2 text-xs md:text-sm font-bold text-emerald-700 border border-emerald-300 rounded-lg bg-emerald-50/50 cursor-not-allowed"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">ঋণের পরিমাণ (কথায়)</label>
                                    <input
                                        type="text"
                                        value={data.loan_amount_words}
                                        readOnly
                                        placeholder="কথায় অটো আসবে"
                                        className={disabledClass}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Signatures Note */}
                        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
                            <h3 className="text-sm font-bold mb-1.5 text-gray-800">স্বাক্ষর সংক্রান্ত নির্দেশিকা</h3>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                জামিনদার ও সাক্ষীগণের স্বাক্ষরের নির্ধারিত স্থান প্রিন্ট প্রিভিউতে সুন্দরভাবে সাজানো আছে। ফরম প্রিন্ট করে ফিজিক্যাল পেপারে স্বাক্ষর গ্রহণ করুন।
                            </p>
                        </div>
                    </div>

                    {/* LIVE PREVIEW */}
                    <div>
                        {showPreview ? (
                            <div className="lg:sticky lg:top-4 lg:h-fit print-container">
                                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                                    <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-4 py-2.5 flex justify-between items-center print:hidden">
                                        <span className="text-xs font-bold flex items-center gap-1.5">
                                            <Eye className="w-4 h-4 text-emerald-400" />
                                            অঙ্গীকার নামা প্রিন্ট প্রিভিউ
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handlePrint}
                                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded font-semibold flex items-center gap-1"
                                        >
                                            <Printer className="w-3.5 h-3.5" />
                                            প্রিন্ট
                                        </button>
                                    </div>
                                    <GuarantorCommitmentPrintView data={data} />
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-[500px] bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 print:hidden">
                                <div className="text-center p-6">
                                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Eye className="w-8 h-8" />
                                    </div>
                                    <p className="text-gray-700 font-bold text-sm mb-1">লাইভ প্রিন্ট প্রিভিউ দেখতে চান?</p>
                                    <p className="text-gray-500 text-xs mb-4">উপরের 'প্রিভিউ দেখুন' বাটনে ক্লিক করে লাইভ প্রিভিউ দেখুন</p>
                                    <button
                                        type="button"
                                        onClick={() => setShowPreview(true)}
                                        className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all"
                                    >
                                        প্রিভিউ চালু করুন
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );

    return embedded ? pageContent : <AdminLayout>{pageContent}</AdminLayout>;
}

/** Show/Print view - 1 Page A4 Print Optimized */
export function GuarantorCommitmentPrintView({ data }: { data: any }) {
    const d = data || {};
    const fmt = formatDateBangla;

    return (
        <div
            data-print-page="1"
            className="guarantor-commitment-sheet bg-white rounded-lg border border-gray-300 px-8 py-6 sm:px-12 sm:py-8 text-gray-950 print:border-none print:px-2 print:py-0 w-full"
            style={{ fontFamily: 'Kalpurush, "Noto Sans Bengali", Arial, sans-serif', fontSize: '13.5px', lineHeight: '1.75', color: '#000' }}
        >
            {/* Header Section: Logo on Left Corner */}
            <div className="mb-4 pb-2 border-b-2 border-gray-600 flex items-center justify-between">
                {/* Left Corner Logo */}
                <div className="flex items-center">
                    <img
                        src="/logo.png"
                        alt="Logo"
                        style={{ height: '50px', width: '50px', objectFit: 'contain' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                </div>

                {/* Center Title & Branch */}
                <div className="text-center flex-1 pr-8">
                    <h1 className="font-black text-[24px] tracking-wide text-black mb-0 leading-tight">মৌসুমী</h1>
                    <p className="text-[13px] font-bold text-gray-800 mt-0.5">
                        <span className="border-b border-dotted border-gray-800 inline-block min-w-[140px] text-center font-bold px-1.5">{str(d.branch_name)}</span> শাখা
                    </p>
                    <div className="mt-1.5">
                        <span className="border-2 border-black px-5 py-0.5 rounded-full font-bold text-[13.5px] inline-block tracking-wide">
                            ঋণের জামিনদার/দায়িত্ব গ্রহণকারীর অঙ্গীকার নামা
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Statement Text */}
            <div className="space-y-2 text-[13.5px] print:text-[13px] leading-[1.8]">
                <p>
                    আমি মো./মোছা./শ্রী <span className="border-b border-dotted border-gray-800 inline-block min-w-[190px] font-bold px-1.5">{str(d.guarantor_name)}</span>, স্বামী/পিতা: <span className="border-b border-dotted border-gray-800 inline-block min-w-[190px] font-bold px-1.5">{str(d.guarantor_father_or_spouse)}</span>
                </p>
                <p>
                    জাতীয় পরিচয়পত্র নং: <span className="border-b border-dotted border-gray-800 inline-block min-w-[150px] font-bold px-1.5">{str(d.guarantor_nid)}</span> গ্রাম: <span className="border-b border-dotted border-gray-800 inline-block min-w-[130px] font-bold px-1.5">{str(d.guarantor_village)}</span> ডাকঘর: <span className="border-b border-dotted border-gray-800 inline-block min-w-[110px] font-bold px-1.5">{str(d.guarantor_post_office)}</span>
                </p>
                <p>
                    উপজেলা: <span className="border-b border-dotted border-gray-800 inline-block min-w-[120px] font-bold px-1.5">{str(d.guarantor_upazila)}</span> জেলা: <span className="border-b border-dotted border-gray-800 inline-block min-w-[120px] font-bold px-1.5">{str(d.guarantor_district)}</span> মোবাইল: <span className="border-b border-dotted border-gray-800 inline-block min-w-[130px] font-bold px-1.5">{str(d.guarantor_mobile)}</span>
                </p>
                
                <p className="pt-1.5">
                    এই মর্মে অঙ্গীকার করছি যে, মৌসুমী সংস্থার <span className="border-b border-dotted border-gray-800 inline-block min-w-[140px] font-bold px-1.5">{str(d.branch_name)}</span> শাখা থেকে সদস্য মো./মোছা./শ্রী <span className="border-b border-dotted border-gray-800 inline-block min-w-[190px] font-bold px-1.5">{str(d.member_name)}</span>
                </p>
                <p>
                    স্বামী/পিতা: <span className="border-b border-dotted border-gray-800 inline-block min-w-[180px] font-bold px-1.5">{str(d.member_father_or_spouse)}</span> জাতীয় পরিচয়পত্র নং: <span className="border-b border-dotted border-gray-800 inline-block min-w-[150px] font-bold px-1.5">{str(d.member_nid)}</span>
                </p>
                <p>
                    গ্রাম: <span className="border-b border-dotted border-gray-800 inline-block min-w-[130px] font-bold px-1.5">{str(d.member_village)}</span> ডাকঘর: <span className="border-b border-dotted border-gray-800 inline-block min-w-[110px] font-bold px-1.5">{str(d.member_post_office)}</span>
                </p>
                <p>
                    উপজেলা: <span className="border-b border-dotted border-gray-800 inline-block min-w-[120px] font-bold px-1.5">{str(d.member_upazila)}</span> জেলা: <span className="border-b border-dotted border-gray-800 inline-block min-w-[120px] font-bold px-1.5">{str(d.member_district)}</span> মোবাইল: <span className="border-b border-dotted border-gray-800 inline-block min-w-[130px] font-bold px-1.5">{str(d.member_mobile)}</span>
                </p>
                <p>
                    অদ্য/গত <span className="border-b border-dotted border-gray-800 inline-block min-w-[110px] font-bold px-1.5">{d.loan_date ? fmt(d.loan_date) : ''}</span> তারিখে সংস্থার <span className="border-b border-dotted border-gray-800 inline-block min-w-[120px] font-bold px-1.5">{str(d.branch_name)}</span> শাখা থেকে সার্ভিস চার্জ সহ <span className="border-b border-dotted border-gray-800 inline-block min-w-[120px] font-black text-green-900 px-1.5">{d.loan_amount ? `৳${Number(d.loan_amount).toLocaleString('bn-BD')}` : ''}</span> টাকা, (কথায় <span className="border-b border-dotted border-gray-800 inline-block min-w-[240px] font-bold px-1.5">{str(d.loan_amount_words)}</span>) ঋণ গ্রহণ করেছেন।
                </p>
                <p>
                    উক্ত শাখায় তার সদস্য নং: <span className="border-b border-dotted border-gray-800 inline-block min-w-[90px] font-bold px-1.5">{str(d.member_code)}</span> এবং সমিতির নাম: <span className="border-b border-dotted border-gray-800 inline-block min-w-[150px] font-bold px-1.5">{str(d.samity_name)}</span> সমিতি নং: <span className="border-b border-dotted border-gray-800 inline-block min-w-[90px] font-bold px-1.5">{str(d.samity_code)}</span>
                </p>
                
                <p className="pt-2 text-justify">
                    ঋণ গ্রহণকারী ব্যক্তি আমার পরিচিত এবং আমি তাকে চিনি ও জানি। আমি আরও অঙ্গীকার করছি যে উক্ত ঋণের টাকা তিনি পরিশোধ করতে ব্যর্থ হলে বা অপারগতা প্রকাশ করলে ঋণের সমুদয় টাকা আমি নিম্নোক্ত শর্তে পরিশোধ করবো।
                </p>

                {/* Terms & Conditions */}
                <div className="pt-1.5">
                    <p className="font-bold text-[13.5px] text-black mb-1">শর্তাবলী:</p>
                    <ol className="list-decimal list-inside space-y-1.5 pl-1.5 text-[12.5px] print:text-[12px] leading-[1.7]">
                        <li>
                            ঋণ গ্রহীতা নিয়মিত ঋণের কিস্তি প্রদানের মাধ্যমে ঋণ পরিশোধ করিবেন। যদি ঋণ গ্রহীতা ঋণ ও সেবামূল্য সময় মতো ও নিয়ম অনুযায়ী পরিশোধ করতে ব্যর্থ হন সেক্ষেত্রে আমি ঋণ গ্রহীতার পক্ষে জামিনদার হিসেবে ঋণের টাকা পরিশোধ করতে বাধ্য থাকবো। যদি আমি পরিশোধ না করি সেক্ষেত্রে ঋণ দাতা আমার বিরুদ্ধে আইনানুগ ব্যবস্থা গ্রহণের অধিকার সংরক্ষণ করেন।
                        </li>
                        <li>
                            ঋণের টাকা সম্পূর্ণ পরিশোধ না হওয়া পর্যন্ত এই অঙ্গীকারনামার মেয়াদ বজায় থাকবে।
                        </li>
                        <li>
                            জামিনদার হিসেবে ঋণের সমুদয় টাকা আমি পরিশোধে ব্যর্থ হইলে বা টাকা প্রদানে অনিহা প্রকাশ করিলে আমার বিরুদ্ধে দেশে প্রচলিত আইন অনুযায়ী আইনানুগ ব্যবস্থা গ্রহণ করিতে পারবেন।
                        </li>
                    </ol>
                </div>

                {/* Final Declaration */}
                <p className="pt-1.5 text-justify text-[12.5px] print:text-[12px] leading-[1.7]">
                    উক্ত ব্যাপারে আমাকে কেহ বা কাহারা প্রলোভন, কোন প্রকার ভয়ভীতি দেখায় নাই বা চাপ সৃষ্টি করে নাই। এতদার্থে স্বেচ্ছায়, সজ্ঞানে অন্যের বিনা প্ররোচনায় অত্র অঙ্গীকারনামা পড়ে, শুনে, বুঝে স্বাক্ষীগণের সম্মুখে সহি স্বাক্ষর সম্পাদন করলাম।
                </p>

                {/* Signatures Section with Generous Gap */}
                <div className="mt-8 pt-4 border-t-2 border-gray-500 flex justify-between items-start gap-8">
                    {/* Witness Signatures */}
                    <div className="flex-1 space-y-3">
                        <p className="font-bold text-[13px] text-black">স্বাক্ষীর স্বাক্ষর:</p>
                        <div className="space-y-4 pt-1">
                            {[1, 2, 3].map((num) => (
                                <div key={num} className="flex items-center gap-2">
                                    <span className="text-[12.5px] font-bold">{num}.</span>
                                    <span className="border-b border-dotted border-gray-800 inline-block min-w-[180px] h-[30px]">
                                        {d[`witness${num}_signature_image`] && (
                                            <img src={d[`witness${num}_signature_image`]} alt={`Witness ${num}`} style={{ height: '24px', width: '70px', objectFit: 'contain' }} className="inline-block" />
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Guarantor Signature */}
                    <div className="flex-1 text-right space-y-2">
                        <p className="font-bold text-[13px] text-black">ঋণের জামিনদার/দায়িত্ব গ্রহণকারীর স্বাক্ষর</p>
                        <div className="pt-8 pb-1">
                            <span className="border-b border-dotted border-gray-800 inline-block min-w-[220px] h-[36px]">
                                {d.guarantor_signature_image && (
                                    <img src={d.guarantor_signature_image} alt="Guarantor" style={{ height: '30px', width: '90px', objectFit: 'contain', marginLeft: 'auto' }} className="block" />
                                )}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function str(v: any): string {
    return v != null && v !== '' ? String(v) : '';
}
