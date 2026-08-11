import { useState, useEffect, useMemo, useRef } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Printer, Save, Eye, Calculator, ArrowLeft, AlertCircle } from 'lucide-react';
import { fileToCompressedDataUrl } from '@/utils/imageUpload';
import {
    clearLoanDraftLocal,
    loadLoanDraftLocal,
    loanDraftStorageKey,
    saveLoanDraftLocal,
} from '@/utils/loanDraftStorage';

import { LoanAgreementData, LoanAgreementProps } from './Types';
import { LoanAgreementPrintView } from './LoanAgreementPrintView';
import { LoanAgreementForm } from './LoanAgreementForm';
import { afterLoanFormSaveUrl } from '@/utils/loanFormNavigation';

function getAcresAndDecimals(totalDecimals: any): { acres: string; decimal: string } {
    if (totalDecimals == null || totalDecimals === '' || isNaN(Number(totalDecimals))) {
        return { acres: '', decimal: '' };
    }
    const val = Number(totalDecimals);
    if (val <= 0) return { acres: '', decimal: '' };
    const acres = Math.floor(val / 100);
    const decimal = Math.round(val % 100);
    return {
        acres: acres > 0 ? String(acres) : '০',
        decimal: String(decimal),
    };
}

/** Admission + product defaults for preview when form not yet saved */
export function buildLoanAgreementDefaults(
    member: any,
    loanProduct: any,
    loanCategory: any,
    requestedAmount: number,
    branch?: any,
): LoanAgreementData {
    const landInfo = getAcresAndDecimals(member?.total_land_amount || member?.cultivable_land_amount);
    return {
        branch_name: branch?.name || '',
        branch_address: branch?.address || '',
        member_name_bn: member?.applicant_name_bn || member?.applicant_name_en || '',
        member_code: member?.application_no || '',
        father_husband_name: member?.father_name_bn || member?.spouse_name_bn || member?.father_name_en || '',
        mother_name: member?.mother_name_bn || member?.mother_name_en || '',
        nid_number: member?.nid_number || member?.smart_card_number || '',
        mobile_number: member?.mobile_number || '',
        samity_name: member?.samity?.samity_name_bn || member?.samity?.samity_name || '',
        samity_code: member?.samity?.samity_code || member?.samity?.id?.toString() || '',
        village: member?.present_village_road || member?.permanent_village_road || '',
        union: member?.present_union || member?.permanent_union || '',
        upazila: member?.present_upazila || member?.permanent_upazila || '',
        district: member?.present_district || member?.permanent_district || '',
        loan_amount: requestedAmount || 0,
        loan_category_name: loanCategory?.category_name_bn || loanCategory?.category_name || '',
        loan_product_name: loanProduct?.product_name_bn || loanProduct?.product_name || '',
        loan_purpose: member?.project_name || member?.business_name || member?.main_profession || member?.profession || '',
        loan_duration_months: loanProduct?.duration_months || 12,
        service_charge: 0,
        total_amount: 0,
        number_of_installments: 0,
        installment_amount: 0,
        last_installment_amount: 0,
        disbursement_date: new Date().toISOString().split('T')[0],
        last_installment_date: '',
        applicant_signature_name: member?.applicant_name_bn || '',
        applicant_signature_image: member?.applicant_signature_path || null,
        guardian_name: member?.guardian_name || member?.father_name_bn || member?.spouse_name_bn || '',
        guardian_signature_image: member?.guardian_signature_path || null,
        president_name: '',
        president_signature_image: null,
        secretary_name: '',
        secretary_signature_image: null,
        house_acres: '',
        house_decimal: '',
        land_acres: landInfo.acres,
        land_decimal: landInfo.decimal,
        house_value:
            member?.total_asset_value != null && Number(member.total_asset_value) > 0
                ? String(member.total_asset_value)
                : '',
        land_value:
            member?.total_land_value != null && Number(member.total_land_value) > 0
                ? String(member.total_land_value)
                : member?.cultivable_land_value != null
                  ? String(member.cultivable_land_value)
                  : '',
        self_emp_full_female: '',
        self_emp_full_male: '',
        self_emp_part_female: '',
        self_emp_part_male: '',
        wage_emp_full_female: '',
        wage_emp_full_male: '',
        wage_emp_part_female: '',
        wage_emp_part_male: '',
        credit_officer_name: '',
        credit_officer_pin: '',
        credit_officer_signature: null,
        field_officer_name: '',
        field_officer_pin: '',
        field_officer_signature: null,
        accountant_name: '',
        accountant_pin: '',
        accountant_signature: null,
        branch_manager_name: '',
        branch_manager_pin: '',
        branch_manager_signature: null,
    };
}

function mergeFormData<T extends Record<string, any>>(defaults: T, savedData?: any): T {
    if (!savedData || typeof savedData !== 'object' || Object.keys(savedData).length === 0) {
        return defaults;
    }
    return { ...defaults, ...savedData };
}

export default function LoanAgreement({
    member,
    loanProduct,
    loanCategory,
    requestedAmount,
    branch,
    existingApplication,
    savedData,
    onlyPreview,
    isLegacy = false,
}: LoanAgreementProps) {
    if (onlyPreview) {
        const previewData = mergeFormData(
            buildLoanAgreementDefaults(member, loanProduct, loanCategory, requestedAmount, branch),
            savedData,
        );
        return (
            <div className="print-container">
                <LoanAgreementPrintView data={previewData} />
            </div>
        );
    }

    const [showPreview, setShowPreview] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
    const [localRestored, setLocalRestored] = useState(false);
    const skipNextLocalSave = useRef(true);

    const draftKey = useMemo(
        () =>
            loanDraftStorageKey(
                'loan_agreement',
                isLegacy ? 'legacy' : member?.id,
                loanProduct.id,
                loanCategory.id
            ),
        [isLegacy, member?.id, loanProduct.id, loanCategory.id]
    );

    const page = usePage<{ flash?: { success?: string | null; error?: string | null } }>();
    const flashError = page.props.flash?.error || null;
    const flashSuccess = page.props.flash?.success || null;

    const { data, setData, processing } = useForm<LoanAgreementData>(
        buildLoanAgreementDefaults(member, loanProduct, loanCategory, requestedAmount, branch),
    );

    // Load server draft, then overlay local backup if present (so unsaved work is never lost)
    useEffect(() => {
        const local = loadLoanDraftLocal<Partial<LoanAgreementData>>(draftKey);
        if (savedData || local?.data) {
            setData((prev) => ({
                ...prev,
                ...(savedData || {}),
                ...(local?.data || {}),
            }));
            setShowPreview(true);
            if (local?.data) {
                setLocalRestored(true);
            }
        }
        // Allow local autosave after initial hydrate
        const t = setTimeout(() => {
            skipNextLocalSave.current = false;
        }, 500);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draftKey, savedData]);

    // Continuous local backup — survives close / failed server save
    useEffect(() => {
        if (skipNextLocalSave.current) return;
        const t = setTimeout(() => {
            saveLoanDraftLocal(draftKey, data);
        }, 700);
        return () => clearTimeout(t);
    }, [data, draftKey]);

    useEffect(() => {
        if (flashError) setSaveError(flashError);
        if (flashSuccess) setSaveSuccess(flashSuccess);
    }, [flashError, flashSuccess]);

    // Auto-calculate loan details
    useEffect(() => {
        if (data.loan_amount && loanProduct) {
            calculateLoanDetails();
        }
    }, [data.loan_amount, data.disbursement_date]);

    const calculateLoanDetails = () => {
        const loanAmount = parseFloat(data.loan_amount.toString()) || 0;
        const scPerThousand = Number(loanProduct?.service_charge_per_thousand) || 0;
        const interestRate = Number(loanProduct?.interest_rate || 0);
        const durationMonths = Number(loanProduct?.duration_months || 12) || 12;

        // service_charge_per_thousand = fixed for term; else annual % prorated by months/12
        const serviceCharge = scPerThousand > 0
            ? (loanAmount / 1000) * scPerThousand
            : loanAmount * (interestRate / 100) * (durationMonths / 12);
        const totalAmount = loanAmount + serviceCharge;

        const installmentType = (loanProduct?.installment_type || '').toLowerCase();
        let numberOfInstallments = 0;

        if (installmentType === 'lump_sum') {
            numberOfInstallments = 1;
        } else if (installmentType === 'weekly') {
            numberOfInstallments = Math.ceil((durationMonths * 30) / 7);
        } else {
            numberOfInstallments = Number(loanProduct?.number_of_installments) || durationMonths;
        }

        const installmentAmountPerThousand = loanProduct?.installment_amount_per_thousand || 0;
        let installmentAmount = 0;
        if (installmentAmountPerThousand > 0) {
            installmentAmount = (loanAmount / 1000) * installmentAmountPerThousand;
        } else if (numberOfInstallments > 0) {
            installmentAmount = totalAmount / numberOfInstallments;
        }

        const lastInstallmentPerThousand = loanProduct?.last_installment_per_thousand || installmentAmountPerThousand;
        let lastInstallmentAmount = 0;
        if (lastInstallmentPerThousand > 0) {
            lastInstallmentAmount = (loanAmount / 1000) * lastInstallmentPerThousand;
        } else {
            lastInstallmentAmount = installmentAmount;
        }

        const disbursementDate = data.disbursement_date ? new Date(data.disbursement_date) : new Date();
        const lastInstallmentDate = new Date(disbursementDate);

        if (installmentType === 'lump_sum') {
            lastInstallmentDate.setMonth(lastInstallmentDate.getMonth() + durationMonths);
        } else if (installmentType === 'weekly') {
            lastInstallmentDate.setDate(lastInstallmentDate.getDate() + (numberOfInstallments * 7));
        } else {
            lastInstallmentDate.setMonth(lastInstallmentDate.getMonth() + numberOfInstallments);
        }

        setData(prev => ({
            ...prev,
            service_charge: Math.round(serviceCharge),
            total_amount: Math.round(totalAmount),
            number_of_installments: numberOfInstallments,
            installment_amount: Math.round(installmentAmount),
            last_installment_amount: Math.round(lastInstallmentAmount),
            last_installment_date: isNaN(lastInstallmentDate.getTime()) ? '' : lastInstallmentDate.toISOString().split('T')[0],
        }));
    };

    const handleCalculateAndPreview = () => {
        calculateLoanDetails();
        setShowPreview(true);
    };

    const handleImageUpload = async (field: string, file: File | null) => {
        if (!file) return;

        if (!file.type.match(/image\/(png|jpg|jpeg)/i) && !/\.(png|jpe?g)$/i.test(file.name)) {
            alert('শুধুমাত্র PNG, JPG বা JPEG ফাইল আপলোড করুন');
            return;
        }

        const result = await fileToCompressedDataUrl(file, { maxWidth: 900 });
        if (!result.ok) {
            alert(result.error);
            return;
        }
        setData(field as any, result.dataUrl);
    };

    const removeImage = (field: string) => {
        setData(field as any, null);
    };

    const handleSaveDraft = () => {
        setSaveError(null);
        setSaveSuccess(null);
        setSaving(true);

        // Soft draft: save whatever is filled — no required-field gate
        const payload: any = {
            loan_product_id: loanProduct.id,
            loan_category_id: loanCategory.id,
            requested_amount: requestedAmount,
            agreement_data: data as any,
            draft: 1,
        };
        if (isLegacy) payload.legacy = 1;
        else payload.member_id = member?.id;

        // Keep a local copy until server confirms
        saveLoanDraftLocal(draftKey, data);

        router.post('/member/loan-applications/forms/loan-agreement/save-draft', payload, {
            preserveScroll: true,
            onSuccess: () => {
                clearLoanDraftLocal(draftKey);
                setLocalRestored(false);
                setSaveSuccess('খসড়া সফলভাবে সংরক্ষিত হয়েছে। আপনার তথ্য সেভ আছে।');
                router.visit(
                    afterLoanFormSaveUrl({
                        existingApplication,
                        isLegacy,
                        member,
                        loanProduct,
                        loanCategory,
                        requestedAmount,
                        formId: 1,
                    }),
                );
            },
            onError: (errors) => {
                console.error('Save draft error:', errors);
                const first = Object.values(errors || {})[0];
                setSaveError(
                    (typeof first === 'string' && first) ||
                        'খসড়া সার্ভারে সেভ হয়নি — আপনার ফর্মের তথ্য হারায়নি (লোকাল ব্যাকআপ আছে)। আবার চেষ্টা করুন।'
                );
                window.scrollTo({ top: 0, behavior: 'smooth' });
            },
            onFinish: () => setSaving(false),
        });
    };

    const handlePrint = () => {
        const printContainer = document.querySelector('.print-container') as HTMLElement | null;

        if (!printContainer) {
            window.print();
            return;
        }

        const printWindow = window.open('', '_blank', 'width=900,height=1200');
        if (!printWindow) {
            window.print();
            return;
        }

        const headHtml = document.head.innerHTML;

        printWindow.document.open();
        printWindow.document.write(`
            <html>
                <head>
                    ${headHtml}
                    <style>
                        @page {
                            size: A4 portrait;
                            margin: 12mm 15mm;
                        }
                        @media print {
                            html, body {
                                margin: 0;
                                padding: 0;
                                background: white;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                            .page-break {
                                page-break-before: auto !important;
                                break-before: auto !important;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="print-container">
                        ${printContainer.innerHTML}
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();

        setTimeout(() => {
            printWindow.print();
        }, 300);
    };

    return (
        <AdminLayout>
            <Head title="ঋণ চুক্তিপত্র - Loan Agreement">
                <style>{`
                    @media print {
                        @page {
                            size: A4 portrait;
                            margin: 12mm 15mm;
                        }

                        body * {
                            visibility: hidden !important;
                            box-shadow: none !important;
                        }

                        .print-container,
                        .print-container * {
                            visibility: visible !important;
                        }

                        nav, header, aside, .sidebar, [role="navigation"], .print\:hidden {
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

                        .page-break {
                            page-break-before: always !important;
                            break-before: page !important;
                        }

                        table, .signature-section {
                            page-break-inside: avoid;
                            break-inside: avoid;
                        }

                        p, span, td, th, div {
                            color: black !important;
                        }
                    }
                `}</style>
            </Head>

            <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-6">
                {(saveError || flashError) && (
                    <div className="rounded-xl border-2 border-amber-500 bg-amber-50 p-4 print:hidden">
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
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 print:hidden">
                        এই ডিভাইসে আগের অসম্পূর্ণ খসড়া থেকে তথ্য পুনরুদ্ধার করা হয়েছে। «চুক্তিপত্র সংরক্ষণ করুন» চাপলে সার্ভারে সেভ হবে।
                    </div>
                )}

                {/* Top Action Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm print:hidden">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() =>
                                router.visit(
                                    afterLoanFormSaveUrl({
                                        existingApplication,
                                        isLegacy,
                                        member,
                                        loanProduct,
                                        loanCategory,
                                        requestedAmount,
                                    }),
                                )
                            }
                            className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 text-xs md:text-sm font-semibold rounded-lg hover:bg-gray-200 transition-all"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>আগে ফিরে যান</span>
                        </button>
                        <div>
                            <h1 className="text-base md:text-lg font-bold text-gray-900 flex items-center gap-2">
                                <span>ঋণ চুক্তিপত্র (Loan Agreement Form)</span>
                            </h1>
                            <p className="text-xs text-gray-500">যতটুকু পূরণ আছে খসড়া হিসেবে সেভ করা যাবে — পরে সম্পূর্ণ করে জমা দিন</p>
                            {existingApplication && (
                                <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                                    ✓ ড্রাফট সংরক্ষিত আছে — Application No: {existingApplication.application_no || 'Pending'}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={handleCalculateAndPreview}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs md:text-sm font-bold rounded-lg hover:bg-emerald-700 transition-all shadow-sm"
                        >
                            <Calculator className="w-4 h-4" />
                            <span>হিসাব ও প্রিভিউ দেখুন</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveDraft}
                            disabled={saving || processing}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs md:text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm"
                        >
                            <Save className="w-4 h-4" />
                            <span>{saving || processing ? 'সংরক্ষণ হচ্ছে...' : 'খসড়া সংরক্ষণ'}</span>
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
                    {/* Left: Input Form */}
                    <div className="print:hidden">
                        <LoanAgreementForm
                            data={data}
                            setData={setData}
                            handleImageUpload={handleImageUpload}
                            removeImage={removeImage}
                            loanProduct={loanProduct}
                            loanCategory={loanCategory}
                        />
                    </div>

                    {/* Right: Printable Document Preview */}
                    <div>
                        {showPreview ? (
                            <div className="lg:sticky lg:top-4 lg:h-fit print-container">
                                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                                    <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-4 py-2.5 flex justify-between items-center print:hidden">
                                        <span className="text-xs font-bold flex items-center gap-1.5">
                                            <Eye className="w-4 h-4 text-emerald-400" />
                                            ঋণ চুক্তিপত্র প্রিন্ট প্রিভিউ
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
                                    <LoanAgreementPrintView data={data} />
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-[500px] bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 print:hidden">
                                <div className="text-center p-6">
                                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Eye className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-base font-bold text-gray-800 mb-1">প্রিন্ট প্রিভিউ দেখতে "হিসাব ও প্রিভিউ দেখুন" বাটনে ক্লিক করুন</h3>
                                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                        বামপাশের ফর্মে তথ্য দিন বা আপডেট করুন, এরপর প্রিভিউতে চুক্তিপত্রের সঠিক ফরম্যাট ও পেজ লেআউট দেখুন।
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

export { LoanAgreementPrintView };
