import { useState, useEffect } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDateBangla } from '@/utils/dateUtils';
import { Printer, Save, Eye, Calculator, Upload, X, ArrowLeft } from 'lucide-react';

interface LoanAgreementData {
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
    credit_officer_name: string;
    credit_officer_pin: string;
    credit_officer_signature: string | null;
    field_officer_name: string;
    field_officer_pin: string;
    field_officer_signature: string | null;
    branch_manager_name: string;
    branch_manager_pin: string;
    branch_manager_signature: string | null;
}

interface Props {
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

/** Show/Print view only – matches Show page (compact logo + sizes for view/print). */
export function LoanAgreementPrintView({ data }: { data: any }) {
    const d = data || {};
    const fmt = formatDateBangla;
    const num = (v: any) => (v != null && v !== '' ? Number(v) : 0);
    const str = (v: any) => (v != null && v !== '' ? String(v) : '');
    return (
        <div className="bg-white border border-gray-300 p-4 rounded-lg" style={{ fontFamily: 'system-ui, Arial, sans-serif', fontSize: '13px', maxWidth: '100%' }}>
            <div className="mb-3 pb-2 border-b-2 border-gray-400">
                <div className="flex items-center justify-center gap-2 mb-1">
                    <img src="/logo.png" alt="Logo" style={{ height: '40px', width: '40px', objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <div className="text-center">
                        <p className="font-bold mb-0" style={{ fontSize: '18px', fontWeight: 'bold' }}>মৌসুমী</p>
                        <p className="leading-tight" style={{ fontSize: '12px' }}>{str(d.branch_address)}</p>
                        <p className="font-semibold" style={{ fontSize: '14px', fontWeight: '600' }}>(খান চুক্তিপত্র)</p>
                    </div>
                </div>
                <div className="text-right" style={{ fontSize: '12px' }}>
                    <p>খান কর্মসূচির নাম: <span className="border-b border-dotted border-gray-600 inline-block min-w-[180px]">{str(d.loan_category_name)}</span></p>
                </div>
            </div>
            <div className="mb-2 leading-relaxed" style={{ fontSize: '12px', lineHeight: '1.5' }}>
                <p className="font-bold mb-1">১ম পক্ষ (খান দাতা)</p>
                <p className="mb-1">শাখার নাম: <span className="border-b border-dotted border-gray-600 inline-block min-w-[240px]">{str(d.branch_name)}</span></p>
                <p>ঠিকানা: <span className="border-b border-dotted border-gray-600 inline-block min-w-[240px]">{str(d.branch_address)}</span></p>
            </div>
            <div className="mb-2 leading-relaxed" style={{ fontSize: '12px', lineHeight: '1.5' }}>
                <div className="flex justify-between items-center mb-1">
                    <p className="font-bold">২য় পক্ষ (খান গ্রহীতা)</p>
                    <p>তারিখ: {fmt(d.disbursement_date)}</p>
                </div>
                <p className="mb-1">নাম: <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px]">{str(d.member_name_bn)}</span> পিতা/স্বামী: <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px]">{str(d.father_husband_name)}</span> সদস্য নং: <span className="border-b border-dotted border-gray-600 inline-block min-w-[60px]">{str(d.member_code)}</span> সমিতির কোড নং: <span className="border-b border-dotted border-gray-600 inline-block min-w-[60px]">{str(d.samity_code)}</span></p>
                <p className="mb-1">সমিতির নাম: <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px]">{str(d.samity_name)}</span> মোবাইল নং: <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px]">{str(d.mobile_number)}</span> গ্রাম: <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px]">{str(d.village)}</span> ডাকঘর: <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px]"></span></p>
                <p className="mb-2">ইউনিয়ন: <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px]">{str(d.union)}</span> থানা: <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px]">{str(d.upazila)}</span> জেলা: <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px]">{str(d.district)}</span></p>
                <p className="mt-2">(১) ১ম পক্ষ ২য় পক্ষকে খান বাবদ <span className="font-semibold">{num(d.loan_amount).toLocaleString('bn-BD')}</span> টাকা নিম্নে উল্লেখিত মেয়াদে এবং চুক্তিতে প্রদান করবেন।</p>
            </div>
            <div className="mb-2">
                <h3 className="text-center font-bold mb-1" style={{ fontSize: '13px' }}>খানের বিবরণ</h3>
                <table className="w-full border-collapse border border-gray-600" style={{ fontSize: '11px' }}>
                    <thead>
                        <tr className="text-center">
                            <th className="border border-gray-600 px-1 py-0.5">প্রকল্পের নাম</th>
                            <th className="border border-gray-600 px-1 py-0.5">খানের মেয়াদ</th>
                            <th className="border border-gray-600 px-1 py-0.5">খান গ্রহীতার নাম</th>
                            <th className="border border-gray-600 px-1 py-0.5">টাকার পরিমাণ:<br/>মূল টাকা</th>
                            <th className="border border-gray-600 px-1 py-0.5">সা. চা. সহ</th>
                            <th className="border border-gray-600 px-1 py-0.5">প্রদানের তারিখ</th>
                            <th className="border border-gray-600 px-1 py-0.5">পরিশোধের শেষ তারিখ</th>
                            <th className="border border-gray-600 px-1 py-0.5">কিস্তির সংখ্যা</th>
                            <th className="border border-gray-600 px-1 py-0.5">কিস্তির পরিমাণ</th>
                            <th className="border border-gray-600 px-1 py-0.5">শেষ কিস্তি</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-gray-600 px-1 py-1 text-center">{str(d.loan_product_name)}</td>
                            <td className="border border-gray-600 px-1 py-1 text-center">{str(d.loan_duration_months)}</td>
                            <td className="border border-gray-600 px-1 py-1">{str(d.member_name_bn)}</td>
                            <td className="border border-gray-600 px-1 py-1 text-center">{num(d.loan_amount).toLocaleString('bn-BD')}</td>
                            <td className="border border-gray-600 px-1 py-1 text-center">{num(d.service_charge).toLocaleString('bn-BD')}</td>
                            <td className="border border-gray-600 px-1 py-1 text-center">{fmt(d.disbursement_date)}</td>
                            <td className="border border-gray-600 px-1 py-1 text-center">{fmt(d.last_installment_date)}</td>
                            <td className="border border-gray-600 px-1 py-1 text-center">{str(d.number_of_installments)}</td>
                            <td className="border border-gray-600 px-1 py-1 text-center">{num(d.installment_amount).toLocaleString('bn-BD')}</td>
                            <td className="border border-gray-600 px-1 py-1 text-center">{num(d.last_installment_amount).toLocaleString('bn-BD')}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div className="space-y-0.5 mb-2 leading-tight" style={{ fontSize: '12px', lineHeight: '1.45' }}>
                <p>(১) ২য় পক্ষ চুক্তিপত্রে উল্লেখিত উদ্দেশ্য ছাড়া অন্য কোন প্রকারে খানের টাকা ব্যবহার করতে পারবেন না।</p>
                <p>(২) পূর্বিত খানের শর্তানুযায়ী ব্যবহার নিশ্চিত করার জন্য খান গ্রহীতাগণ মৌসুমীর দায়িত্বপ্রাপ্ত অফিসারের নিকট আয়-ব্যয়ের হিসাব দেখাতে বাধ্য থাকবেন।</p>
                <p>(৩) খান ফেরত দেওয়ার নিয়ম অনুযায়ী ২য় পক্ষ ১ম পক্ষের নিকট {str(d.service_charge)}% হারে সেবাগ্রহণসহ খানের টাকা ফেরত দিতে বাধ্য থাকবেন।</p>
                <p>(৪) সমিতির খান গ্রহীতাগণ প্রতিটি বছরের মুনাফা সমিতির নির্ধারিত হার অনুযায়ী সঞ্চয় তহবিল জমা করবেন।</p>
                <p>(৫) যদি কোন বিশেষ কারণে ২য় পক্ষ নিরিখ সময়ে খানের বিহিত পরিশোধে বাধ্য হন, সেক্ষেত্রে অবশ্যই লিখিতভাবে যথাযথমূলক কারণ দর্শানো সাপেক্ষে ২য় পক্ষ ১ম পক্ষ ব্যবহার নির্ধারিত জরিমানা সহ সংশ্লিষ্ট খানের কিস্তির টাকা প্রদান করতে বাধ্য থাকবেন।</p>
                <p>(৬) বর্তমান পর্যন্ত উপরোক্ত খানের টাকা ও তার উপর ধার্যকৃত সেবাগ্রহণ পরিশোধ না হলে, তৎনির্দিন পর্যন্ত উক্ত খানের টাকা ঘামা অতিরিক্ত সম্পদ্দি ১ম পক্ষের সম্পদ্দি হিসাবে বিবেচিত হবে।</p>
                <p>(৭) ২য় পক্ষ খান পরিশোধের ১ম পক্ষ আইনগত ব্যবস্থা গ্রহণের অধিকার সংরক্ষণ করবেন।</p>
                <p>(৮) কোন প্রকারে ব্যবহৃত টাকার লোকসান হলেও তার দায় দায়িত্ব গ্রহীতার থাকবে। তাকে খানের সম্পূর্ণ টাকা সেবাগ্রহণসহ পরিশোধ করতে হবে।</p>
                <p>(১০) খানের টাকা সম্পূর্ণ পরিশোধ না হওয়া পর্যন্ত খান গ্রহীতা তার ব্যক্তিগত সম্পদ ফেরত নিতে পারবে না।</p>
                <p>(১১) খান গ্রহীতার মৃত্যু হলে বা দেশ ত্যাগ করলে সেক্ষেত্রে ১ম পক্ষ উক্ত খানের টাকা পরিশোধ বিষয়ে যে সিদ্ধান্ত গ্রহণ করবে তা কার্যকর যথা বিবেচিত হবে।</p>
            </div>
            <p className="mb-3 leading-tight" style={{ fontSize: '12px' }}>এতদ্বারা আমরা ১ম ও ২য় পক্ষ স্বেচ্ছায়, স্বজ্ঞানে ও সুস্থ শরীরে কারুক্ত দাতা প্রেরোদিত না হয়ে নিম্নলিখিত স্বাক্ষীগণের সামনে এই চুক্তিপত্রে স্বাক্ষর সম্পাদন করলাম।</p>
            <div className="mb-2 leading-tight" style={{ fontSize: '12px' }}>
                <p className="font-bold mb-1">২য় পক্ষের স্বাক্ষর:</p>
                <p className="mb-1">খান গ্রহীতার স্বাক্ষর: <span className="border-b border-dotted border-gray-600 inline-block min-w-[160px]"></span></p>
                {d.applicant_signature_image && <img src={d.applicant_signature_image} alt="Signature" style={{ height: '28px', width: '56px', objectFit: 'contain', marginBottom: '2px', marginLeft: '48px' }} />}
                <p className="mb-2">নাম: <span className="border-b border-dotted border-gray-600 inline-block min-w-[180px]">{str(d.applicant_signature_name) || str(d.member_name_bn)}</span></p>
                <p className="mb-1">অভিভাবকের স্বাক্ষর: <span className="border-b border-dotted border-gray-600 inline-block min-w-[160px]"></span></p>
                {d.guardian_signature_image && <img src={d.guardian_signature_image} alt="Signature" style={{ height: '28px', width: '56px', objectFit: 'contain', marginBottom: '2px', marginLeft: '48px' }} />}
                <p className="mb-2">নাম: <span className="border-b border-dotted border-gray-600 inline-block min-w-[180px]">{str(d.guardian_name)}</span></p>
            </div>
        </div>
    );
}

function formSelectionUrl(isLegacy: boolean, member: any, loanProduct: any, loanCategory: any, requestedAmount: number) {
    const params = new URLSearchParams({ loan_product_id: String(loanProduct.id), loan_category_id: String(loanCategory.id), requested_amount: String(requestedAmount) });
    if (isLegacy) params.set('legacy', '1'); else params.set('member_id', String(member?.id ?? ''));
    return `/member/loan-applications/form-selection?${params.toString()}`;
}

export default function LoanAgreement({ member, loanProduct, loanCategory, requestedAmount, branch, auth, existingApplication, savedData, onlyPreview, isLegacy = false }: Props) {
    if (onlyPreview && savedData) {
        return (
            <div className="print-container">
                <LoanAgreementPrintView data={savedData} />
            </div>
        );
    }
    const [showPreview, setShowPreview] = useState(false);

    const { data, setData, post, processing } = useForm<LoanAgreementData>({
        // Branch Info (Auto-filled from current user's branch)
        branch_name: branch?.name || '',
        branch_address: branch?.address || '',

        // Member Info (Auto-filled)
        member_name_bn: member?.applicant_name_bn || '',
        member_code: member?.application_no || '', // Editable
        father_husband_name: member?.father_name_bn || member?.spouse_name_bn || '',
        mother_name: member?.mother_name_bn || '',
        nid_number: member?.nid_number || '',
        mobile_number: member?.mobile_number || '',

        // Samity Info (From member's samity table data)
        samity_name: member?.samity?.samity_name_bn || member?.samity?.samity_name || '',
        samity_code: member?.samity?.samity_code || member?.samity?.id?.toString() || '',

        // Address (Auto-filled from member admission)
        village: member?.present_village_road || '',
        union: member?.present_union || '',
        upazila: member?.present_upazila || '',
        district: member?.present_district || '',

        // Loan Details
        loan_amount: requestedAmount,
        loan_category_name: loanCategory?.category_name_bn || '',
        loan_product_name: loanProduct?.product_name_bn || '',
        loan_purpose: '',
        loan_duration_months: loanProduct?.duration_months || 12,

        // Calculated
        service_charge: 0,
        total_amount: 0,
        number_of_installments: 0,
        installment_amount: 0,
        last_installment_amount: 0,
        disbursement_date: new Date().toISOString().split('T')[0],
        last_installment_date: '',

        // Signatures with images
        applicant_signature_name: '',
        applicant_signature_image: null as string | null,
        guardian_name: '',
        guardian_signature_image: null as string | null,
        president_name: '',
        president_signature_image: null as string | null,
        secretary_name: '',
        secretary_signature_image: null as string | null,

        // Property
        house_acres: '',
        house_decimal: '',
        land_acres: '',
        land_decimal: '',
        house_value: '',
        land_value: '',

        // Officers with signatures
        credit_officer_name: '',
        credit_officer_pin: '',
        credit_officer_signature: null as string | null,
        field_officer_name: '',
        field_officer_pin: '',
        field_officer_signature: null as string | null,
        branch_manager_name: '',
        branch_manager_pin: '',
        branch_manager_signature: null as string | null,
    });

    // Load saved data if exists
    useEffect(() => {
        if (savedData) {
            setData(prev => ({
                ...prev,
                ...savedData,
            }));
        }
    }, [savedData]);

    // Auto-calculate
    useEffect(() => {
        if (data.loan_amount && loanProduct) {
            calculateLoanDetails();
        }
    }, [data.loan_amount, data.disbursement_date]);

    const calculateLoanDetails = () => {
        const loanAmount = parseFloat(data.loan_amount.toString());
        const serviceChargeRate = loanProduct.service_charge_per_thousand || 0;
        const serviceCharge = (loanAmount / 1000) * serviceChargeRate;
        const totalAmount = loanAmount + serviceCharge;

        const installmentType = loanProduct.installment_type;
        const durationMonths = loanProduct.duration_months || 12;
        let numberOfInstallments = 0;

        if (installmentType === 'weekly') {
            numberOfInstallments = Math.ceil((durationMonths * 30) / 7);
        } else {
            numberOfInstallments = durationMonths;
        }

        const installmentAmountPerThousand = loanProduct.installment_amount_per_thousand || 0;
        const installmentAmount = (loanAmount / 1000) * installmentAmountPerThousand;

        const lastInstallmentPerThousand = loanProduct.last_installment_per_thousand || installmentAmountPerThousand;
        const lastInstallmentAmount = (loanAmount / 1000) * lastInstallmentPerThousand;

        const disbursementDate = new Date(data.disbursement_date);
        let lastInstallmentDate = new Date(disbursementDate);

        if (installmentType === 'weekly') {
            lastInstallmentDate.setDate(lastInstallmentDate.getDate() + (numberOfInstallments * 7));
        } else {
            lastInstallmentDate.setMonth(lastInstallmentDate.getMonth() + numberOfInstallments);
        }

        setData({
            ...data,
            service_charge: Math.round(serviceCharge),
            total_amount: Math.round(totalAmount),
            number_of_installments: numberOfInstallments,
            installment_amount: Math.round(installmentAmount),
            last_installment_amount: Math.round(lastInstallmentAmount),
            last_installment_date: lastInstallmentDate.toISOString().split('T')[0],
        });
    };

    const handleGenerate = () => {
        calculateLoanDetails();
        setTimeout(() => {
            setShowPreview(true);
        }, 100);
    };

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
        const payload: any = {
            loan_product_id: loanProduct.id,
            loan_category_id: loanCategory.id,
            requested_amount: requestedAmount,
            agreement_data: data as any,
        };
        if (isLegacy) payload.legacy = 1; else payload.member_id = member?.id;
        router.post('/member/loan-applications/forms/loan-agreement/save-draft', payload, {
            onSuccess: () => {
                alert('খান চুক্তিপত্র সংরক্ষিত হয়েছে।');
                router.visit(formSelectionUrl(isLegacy, member, loanProduct, loanCategory, requestedAmount));
            },
            onError: (errors) => {
                console.error('Save draft error:', errors);
                alert('ড্রাফট সংরক্ষণে ত্রুটি হয়েছে');
            },
        });
    };

    const handlePrint = () => {
        // Try to print only the agreement content in a clean window
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

        // Reuse current head (for Tailwind / fonts) so styles apply
        const headHtml = document.head.innerHTML;

        printWindow.document.open();
        printWindow.document.write(`
            <html>
                <head>
                    ${headHtml}
                    <style>
                        @page {
                            size: A4;
                            margin: 1cm;
                        }
                        @media print {
                            html, body {
                                margin: 0;
                                padding: 0;
                                background: white;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                            /* Let browser decide page breaks, don't force new page */
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

        // Slight delay so browser can render before printing
        setTimeout(() => {
            printWindow.print();
        }, 300);
    };

    return (
        <AdminLayout>
            <Head title="খান চুক্তিপত্র - Loan Agreement">
                <style>{`
                    @media print {
                        @page {
                            size: A4;
                            margin: 1cm;
                        }

                        html, body, #app {
                            margin: 0 !important;
                            padding: 0 !important;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                            background: white !important;
                        }

                        /* Global: hide everything by default */
                        body * {
                            visibility: hidden !important;
                            box-shadow: none !important;
                            text-shadow: none !important;
                        }

                        /* Only show the agreement content */
                        .print-container,
                        .print-container * {
                            visibility: visible !important;
                        }

                        /* Hide admin layout chrome */
                        nav, header, aside, .sidebar, [role="navigation"],
                        .print\\:hidden {
                            display: none !important;
                        }

                        /* Layout overrides so it prints as full A4 page */
                        .print-container {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            max-width: 100% !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            background: white !important;
                            box-shadow: none !important;
                        }

                        /* Remove sticky positioning from preview wrapper */
                        .lg\\:sticky {
                            position: static !important;
                            top: auto !important;
                        }

                        /* Keep borders visible */
                        .border, .border-black, [class*="border-"] {
                            border-color: black !important;
                        }

                        /* Make dotted borders solid for clarity */
                        .border-dotted {
                            border-style: solid !important;
                            border-bottom-width: 1px !important;
                        }

                        .page-break {
                            page-break-before: always;
                            break-before: page;
                        }

                        /* Ensure tables don't break across pages */
                        table {
                            page-break-inside: avoid;
                            break-inside: avoid;
                        }

                        /* Ensure signature sections stay together */
                        .signature-section {
                            page-break-inside: avoid;
                            break-inside: avoid;
                        }

                        /* Ensure text is black */
                        p, span, td, th, div {
                            color: black !important;
                        }

                        /* Hide empty images */
                        img:not([src]), img[src=""], img[src="null"] {
                            display: none !important;
                        }
                    }
                `}</style>
            </Head>

            <div className="max-w-[1600px] mx-auto p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 print:hidden">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.visit(formSelectionUrl(isLegacy, member, loanProduct, loanCategory, requestedAmount))}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </button>
                        <div>
                            <h1 className="text-lg font-bold">ঋণ চুক্তিপত্র (Loan Agreement)</h1>
                            <p className="text-xs text-gray-600">Form পূরণ করুন এবং সংরক্ষণ করুন। পরে অন্যান্য ফর্ম পূরণ করতে পারবেন।</p>
                            {existingApplication && (
                                <p className="text-xs text-blue-600 mt-1">
                                    ✓ Draft সংরক্ষিত আছে - Application No: {existingApplication.application_no || 'Pending'}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleGenerate}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                        >
                            <Calculator className="w-4 h-4" />
                            Calculate & Preview
                        </button>
                        <button
                            onClick={handleSaveDraft}
                            disabled={processing}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {processing ? 'সংরক্ষণ হচ্ছে...' : 'খান চুক্তিপত্র সংরক্ষণ করুন'}
                        </button>
                        {showPreview && (
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700"
                            >
                                <Printer className="w-4 h-4" />
                                Print
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:grid-cols-1">
                    {/* INPUT FORM */}
                    <div className="space-y-4 print:hidden">
                        {/* Branch */}
                        <div className="bg-white rounded-lg shadow-sm p-4 border">
                            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">১</span>
                                শাখা তথ্য (Auto-filled)
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium mb-1">শাখার নাম</label>
                                    <input
                                        type="text"
                                        value={data.branch_name}
                                        onChange={(e) => setData('branch_name', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">ঠিকানা</label>
                                    <input
                                        type="text"
                                        value={data.branch_address}
                                        onChange={(e) => setData('branch_address', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Member */}
                        <div className="bg-white rounded-lg shadow-sm p-4 border">
                            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">২</span>
                                সদস্য তথ্য (Member Info)
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium mb-1">নাম (বাংলা)</label>
                                    <input type="text" value={data.member_name_bn} disabled className="w-full px-2 py-1.5 text-sm border rounded-md bg-gray-50" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">সদস্য নম্বর (Editable)</label>
                                    <input
                                        type="text"
                                        value={data.member_code}
                                        onChange={(e) => setData('member_code', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">পিতা/স্বামী</label>
                                    <input type="text" value={data.father_husband_name} disabled className="w-full px-2 py-1.5 text-sm border rounded-md bg-gray-50" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">মাতার নাম</label>
                                    <input type="text" value={data.mother_name} disabled className="w-full px-2 py-1.5 text-sm border rounded-md bg-gray-50" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">NID</label>
                                    <input type="text" value={data.nid_number} disabled className="w-full px-2 py-1.5 text-sm border rounded-md bg-gray-50" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">মোবাইল</label>
                                    <input type="text" value={data.mobile_number} disabled className="w-full px-2 py-1.5 text-sm border rounded-md bg-gray-50" />
                                </div>
                            </div>
                        </div>

                        {/* Address */}
                        <div className="bg-white rounded-lg shadow-sm p-4 border">
                            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">৩</span>
                                ঠিকানা (Auto-filled from Member Admission)
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium mb-1">সমিতি</label>
                                    <input type="text" value={data.samity_name} disabled className="w-full px-2 py-1.5 text-sm border rounded-md bg-gray-50" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">সমিতি কোড</label>
                                    <input type="text" value={data.samity_code} disabled className="w-full px-2 py-1.5 text-sm border rounded-md bg-gray-50" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">গ্রাম</label>
                                    <input
                                        type="text"
                                        value={data.village}
                                        disabled
                                        className="w-full px-2 py-1.5 text-sm border rounded-md bg-gray-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">ইউনিয়ন</label>
                                    <input
                                        type="text"
                                        value={data.union}
                                        disabled
                                        className="w-full px-2 py-1.5 text-sm border rounded-md bg-gray-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">উপজেলা</label>
                                    <input
                                        type="text"
                                        value={data.upazila}
                                        disabled
                                        className="w-full px-2 py-1.5 text-sm border rounded-md bg-gray-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">জেলা</label>
                                    <input
                                        type="text"
                                        value={data.district}
                                        disabled
                                        className="w-full px-2 py-1.5 text-sm border rounded-md bg-gray-50"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Loan */}
                        <div className="rounded-lg shadow-sm p-4 border border-green-200 bg-green-50">
                            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs">৪</span>
                                ঋণের বিবরণ (Loan Details)
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium mb-1">প্রকল্পের নাম *</label>
                                    <input
                                        type="text"
                                        value={data.loan_purpose}
                                        onChange={(e) => setData('loan_purpose', e.target.value)}
                                        placeholder="যেমন: গৃহস্থালী কাজ"
                                        className="w-full px-2 py-1.5 text-sm border rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">ঋণের পরিমাণ (৳)</label>
                                    <input
                                        type="number"
                                        value={data.loan_amount}
                                        onChange={(e) => setData('loan_amount', parseFloat(e.target.value))}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md font-bold text-green-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">প্রদানের তারিখ</label>
                                    <input
                                        type="date"
                                        value={data.disbursement_date}
                                        onChange={(e) => setData('disbursement_date', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">মেয়াদ (মাস)</label>
                                    <input type="number" value={data.loan_duration_months} disabled className="w-full px-2 py-1.5 text-sm border rounded-md bg-gray-50" />
                                </div>
                                <div className="col-span-2 bg-white p-3 rounded border">
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                        <div>
                                            <span className="text-gray-600">Service Charge:</span>
                                            <p className="font-bold text-orange-600">৳{data.service_charge.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Total:</span>
                                            <p className="font-bold text-blue-600">৳{data.total_amount.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Installments:</span>
                                            <p className="font-bold text-purple-600">{data.number_of_installments} টি</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Per Installment:</span>
                                            <p className="font-bold text-green-600">৳{data.installment_amount.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Last Installment:</span>
                                            <p className="font-bold text-red-600">৳{data.last_installment_amount.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">End Date:</span>
                                            <p className="font-bold">{formatDateBangla(data.last_installment_date)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Signatures */}
                        <div className="bg-white rounded-lg shadow-sm p-4 border">
                            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">৫</span>
                                স্বাক্ষর ও সাক্ষী (Signatures with Images)
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                {/* Applicant */}
                                <div>
                                    <label className="block text-xs font-medium mb-1">আবেদনকারীর স্বাক্ষর</label>
                                    <input
                                        type="text"
                                        value={data.applicant_signature_name}
                                        onChange={(e) => setData('applicant_signature_name', e.target.value)}
                                        placeholder="নাম"
                                        className="w-full px-2 py-1.5 text-sm border rounded-md mb-2"
                                    />
                                    <div className="flex items-start gap-2">
                                        {data.applicant_signature_image ? (
                                            <div className="relative">
                                                <img src={data.applicant_signature_image} alt="Signature" className="h-20 w-32 object-contain border rounded" />
                                                <button
                                                    onClick={() => removeImage('applicant_signature_image')}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex items-center gap-2 px-3 py-2 bg-gray-100 border border-dashed rounded cursor-pointer hover:bg-gray-200">
                                                <Upload className="w-4 h-4" />
                                                <span className="text-xs">Upload PNG/JPG</span>
                                                <input
                                                    type="file"
                                                    accept="image/png,image/jpg,image/jpeg"
                                                    onChange={(e) => handleImageUpload('applicant_signature_image', e.target.files?.[0] || null)}
                                                    className="hidden"
                                                />
                                            </label>
                                        )}
                                    </div>
                                </div>

                                {/* Guardian */}
                                <div>
                                    <label className="block text-xs font-medium mb-1">অভিভাবকের স্বাক্ষর</label>
                                    <input
                                        type="text"
                                        value={data.guardian_name}
                                        onChange={(e) => setData('guardian_name', e.target.value)}
                                        placeholder="নাম"
                                        className="w-full px-2 py-1.5 text-sm border rounded-md mb-2"
                                    />
                                    <div className="flex items-start gap-2">
                                        {data.guardian_signature_image ? (
                                            <div className="relative">
                                                <img src={data.guardian_signature_image} alt="Signature" className="h-20 w-32 object-contain border rounded" />
                                                <button
                                                    onClick={() => removeImage('guardian_signature_image')}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex items-center gap-2 px-3 py-2 bg-gray-100 border border-dashed rounded cursor-pointer hover:bg-gray-200">
                                                <Upload className="w-4 h-4" />
                                                <span className="text-xs">Upload PNG/JPG</span>
                                                <input
                                                    type="file"
                                                    accept="image/png,image/jpg,image/jpeg"
                                                    onChange={(e) => handleImageUpload('guardian_signature_image', e.target.files?.[0] || null)}
                                                    className="hidden"
                                                />
                                            </label>
                                        )}
                                    </div>
                                </div>

                                <div className="col-span-2 pt-3 border-t">
                                    <p className="text-xs font-semibold mb-3">সাক্ষীগণ (Witnesses)</p>
                                </div>

                                {/* President */}
                                <div>
                                    <label className="block text-xs mb-1">সভানেত্রী</label>
                                    <input
                                        type="text"
                                        value={data.president_name}
                                        onChange={(e) => setData('president_name', e.target.value)}
                                        placeholder="নাম"
                                        className="w-full px-2 py-1.5 text-sm border rounded-md mb-2"
                                    />
                                    <div className="flex items-start gap-2">
                                        {data.president_signature_image ? (
                                            <div className="relative">
                                                <img src={data.president_signature_image} alt="Signature" className="h-20 w-32 object-contain border rounded" />
                                                <button
                                                    onClick={() => removeImage('president_signature_image')}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex items-center gap-2 px-3 py-2 bg-gray-100 border border-dashed rounded cursor-pointer hover:bg-gray-200">
                                                <Upload className="w-4 h-4" />
                                                <span className="text-xs">Upload PNG/JPG</span>
                                                <input
                                                    type="file"
                                                    accept="image/png,image/jpg,image/jpeg"
                                                    onChange={(e) => handleImageUpload('president_signature_image', e.target.files?.[0] || null)}
                                                    className="hidden"
                                                />
                                            </label>
                                        )}
                                    </div>
                                </div>

                                {/* Secretary */}
                                <div>
                                    <label className="block text-xs mb-1">সম্পাদিকা</label>
                                    <input
                                        type="text"
                                        value={data.secretary_name}
                                        onChange={(e) => setData('secretary_name', e.target.value)}
                                        placeholder="নাম"
                                        className="w-full px-2 py-1.5 text-sm border rounded-md mb-2"
                                    />
                                    <div className="flex items-start gap-2">
                                        {data.secretary_signature_image ? (
                                            <div className="relative">
                                                <img src={data.secretary_signature_image} alt="Signature" className="h-20 w-32 object-contain border rounded" />
                                                <button
                                                    onClick={() => removeImage('secretary_signature_image')}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex items-center gap-2 px-3 py-2 bg-gray-100 border border-dashed rounded cursor-pointer hover:bg-gray-200">
                                                <Upload className="w-4 h-4" />
                                                <span className="text-xs">Upload PNG/JPG</span>
                                                <input
                                                    type="file"
                                                    accept="image/png,image/jpg,image/jpeg"
                                                    onChange={(e) => handleImageUpload('secretary_signature_image', e.target.files?.[0] || null)}
                                                    className="hidden"
                                                />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Property */}
                        <div className="bg-white rounded-lg shadow-sm p-4 border">
                            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">৬</span>
                                সম্পত্তি তথ্য
                            </h3>
                            <div className="grid grid-cols-4 gap-3">
                                <div>
                                    <label className="block text-xs mb-1">বাড়ি (Acres)</label>
                                    <input
                                        type="text"
                                        value={data.house_acres}
                                        onChange={(e) => setData('house_acres', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs mb-1">বাড়ি (Decimal)</label>
                                    <input
                                        type="text"
                                        value={data.house_decimal}
                                        onChange={(e) => setData('house_decimal', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs mb-1">জমি (Acres)</label>
                                    <input
                                        type="text"
                                        value={data.land_acres}
                                        onChange={(e) => setData('land_acres', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs mb-1">জমি (Decimal)</label>
                                    <input
                                        type="text"
                                        value={data.land_decimal}
                                        onChange={(e) => setData('land_decimal', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs mb-1">বাড়ির মূল্য (৳)</label>
                                    <input
                                        type="text"
                                        value={data.house_value}
                                        onChange={(e) => setData('house_value', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs mb-1">জমির মূল্য (৳)</label>
                                    <input
                                        type="text"
                                        value={data.land_value}
                                        onChange={(e) => setData('land_value', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Officers */}
                        <div className="bg-white rounded-lg shadow-sm p-4 border">
                            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">৭</span>
                                কর্মকর্তা (Officers with Signatures)
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium mb-1">Credit Officer</label>
                                    <input
                                        type="text"
                                        value={data.credit_officer_name}
                                        onChange={(e) => setData('credit_officer_name', e.target.value)}
                                        placeholder="নাম"
                                        className="w-full px-2 py-1.5 text-sm border rounded-md mb-1"
                                    />
                                    <input
                                        type="text"
                                        value={data.credit_officer_pin}
                                        onChange={(e) => setData('credit_officer_pin', e.target.value)}
                                        placeholder="PIN"
                                        className="w-full px-2 py-1.5 text-sm border rounded-md mb-2"
                                    />
                                    {data.credit_officer_signature ? (
                                        <div className="relative inline-block">
                                            <img src={data.credit_officer_signature} alt="Signature" className="h-16 w-28 object-contain border rounded" />
                                            <button onClick={() => removeImage('credit_officer_signature')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 border border-dashed rounded cursor-pointer hover:bg-gray-200 w-fit">
                                            <Upload className="w-3 h-3" />
                                            <span className="text-xs">স্বাক্ষর Upload</span>
                                            <input type="file" accept="image/png,image/jpg,image/jpeg" onChange={(e) => handleImageUpload('credit_officer_signature', e.target.files?.[0] || null)} className="hidden" />
                                        </label>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">Field Officer</label>
                                    <input
                                        type="text"
                                        value={data.field_officer_name}
                                        onChange={(e) => setData('field_officer_name', e.target.value)}
                                        placeholder="নাম"
                                        className="w-full px-2 py-1.5 text-sm border rounded-md mb-1"
                                    />
                                    <input
                                        type="text"
                                        value={data.field_officer_pin}
                                        onChange={(e) => setData('field_officer_pin', e.target.value)}
                                        placeholder="PIN"
                                        className="w-full px-2 py-1.5 text-sm border rounded-md mb-2"
                                    />
                                    {data.field_officer_signature ? (
                                        <div className="relative inline-block">
                                            <img src={data.field_officer_signature} alt="Signature" className="h-16 w-28 object-contain border rounded" />
                                            <button onClick={() => removeImage('field_officer_signature')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 border border-dashed rounded cursor-pointer hover:bg-gray-200 w-fit">
                                            <Upload className="w-3 h-3" />
                                            <span className="text-xs">স্বাক্ষর Upload</span>
                                            <input type="file" accept="image/png,image/jpg,image/jpeg" onChange={(e) => handleImageUpload('field_officer_signature', e.target.files?.[0] || null)} className="hidden" />
                                        </label>
                                    )}
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium mb-1">Branch Manager</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <input
                                                type="text"
                                                value={data.branch_manager_name}
                                                onChange={(e) => setData('branch_manager_name', e.target.value)}
                                                placeholder="নাম"
                                                className="w-full px-2 py-1.5 text-sm border rounded-md mb-1"
                                            />
                                            <input
                                                type="text"
                                                value={data.branch_manager_pin}
                                                onChange={(e) => setData('branch_manager_pin', e.target.value)}
                                                placeholder="PIN"
                                                className="w-full px-2 py-1.5 text-sm border rounded-md mb-2"
                                            />
                                            {data.branch_manager_signature ? (
                                                <div className="relative inline-block">
                                                    <img src={data.branch_manager_signature} alt="Signature" className="h-16 w-28 object-contain border rounded" />
                                                    <button onClick={() => removeImage('branch_manager_signature')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 border border-dashed rounded cursor-pointer hover:bg-gray-200 w-fit">
                                                    <Upload className="w-3 h-3" />
                                                    <span className="text-xs">স্বাক্ষর Upload</span>
                                                    <input type="file" accept="image/png,image/jpg,image/jpeg" onChange={(e) => handleImageUpload('branch_manager_signature', e.target.files?.[0] || null)} className="hidden" />
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PREVIEW */}
                    {showPreview ? (
                        <div className="lg:sticky lg:top-4 lg:h-fit print:block print-container">
                            <div className="bg-white rounded-lg shadow-lg p-8 print:shadow-none print:p-6 print:rounded-none print:bg-white">
                                {/* Header */}
                                <div className="mb-3 pb-2 border-b">
                                    <div className="flex items-center justify-center mb-2">
                                        <div className="flex items-center gap-3">
                                            <img 
                                                src="/logo.png" 
                                                alt="Logo" 
                                                className="h-16 w-16 object-contain print:h-14 print:w-14"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                            <div className="text-center">
                                                <p className="text-2xl font-bold mb-0 print:text-3xl">মৌসুমী</p>
                                                <p className="text-sm print:text-base">{data.branch_address}</p>
                                                <p className="text-base font-semibold print:text-lg">(খান চুক্তিপত্র)</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right text-sm print:text-base">
                                        <p>খান কর্মসূচির নাম: <span className="border-b border-dotted px-20">{data.loan_category_name}</span></p>
                                    </div>
                                </div>

                                {/* ১ম পক্ষ */}
                                <div className="mb-2 text-sm print:text-base leading-relaxed">
                                    <p className="font-bold">১ম পক্ষ (খান দাতা)</p>
                                    <p>শাখার নাম: <span className="border-b border-dotted px-32">{data.branch_name}</span></p>
                                    <p>ঠিকানা: <span className="border-b border-dotted px-32">{data.branch_address}</span></p>
                                </div>

                                {/* ২য় পক্ষ */}
                                <div className="mb-2 text-sm print:text-base leading-relaxed">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="font-bold">২য় পক্ষ (খান গ্রহীতা)</p>
                                        <p>তারিখ: {formatDateBangla(data.disbursement_date)}</p>
                                    </div>
                                    <p>নাম: {data.member_name_bn} পিতা/স্বামী: {data.father_husband_name} সদস্য নং: {data.member_code} সমিতির কোড নং: {data.samity_code}</p>
                                    <p>সমিতির নাম: {data.samity_name} মোবাইল নং: {data.mobile_number} গ্রাম: {data.village} ডাকঘর: </p>
                                    <p>ইউনিয়ন: {data.union} থানা: {data.upazila} জেলা: {data.district}</p>
                                    <p className="mt-2">(১) ১ম পক্ষ ২য় পক্ষকে খান বাবদ {data.loan_amount.toLocaleString()} টাকা নিম্নে উল্লেখিত মেয়াদে এবং চুক্তিতে প্রদান করবেন।</p>
                                </div>

                                {/* খানের বিবরণ Table */}
                                <div className="mb-2">
                                    <h3 className="text-sm print:text-base font-bold mb-1 text-center">খানের বিবরণ</h3>
                                    <table className="w-full border-collapse border border-black text-xs print:text-sm">
                                        <thead>
                                            <tr className="text-center">
                                                <th className="border border-black px-0.5 py-0.5 font-normal">প্রকল্পের নাম</th>
                                                <th className="border border-black px-0.5 py-0.5 font-normal">খানের মেয়াদ</th>
                                                <th className="border border-black px-0.5 py-0.5 font-normal">খান গ্রহীতার নাম</th>
                                                <th className="border border-black px-0.5 py-0.5 font-normal">টাকার পরিমাণ:<br/>মূল টাকা</th>
                                                <th className="border border-black px-0.5 py-0.5 font-normal">সা. চা. সহ</th>
                                                <th className="border border-black px-0.5 py-0.5 font-normal">প্রদানের তারিখ</th>
                                                <th className="border border-black px-0.5 py-0.5 font-normal">পরিশোধের শেষ তারিখ</th>
                                                <th className="border border-black px-0.5 py-0.5 font-normal">কিস্তির সংখ্যা</th>
                                                <th className="border border-black px-0.5 py-0.5 font-normal">কিস্তির পরিমাণ</th>
                                                <th className="border border-black px-0.5 py-0.5 font-normal">শেষ কিস্তি</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className="border border-black px-2 py-1.5 text-center text-xs print:text-sm">{data.loan_product_name}</td>
                                                <td className="border border-black px-2 py-1.5 text-center text-xs print:text-sm">{data.loan_duration_months}</td>
                                                <td className="border border-black px-2 py-1.5 text-xs print:text-sm">{data.member_name_bn}</td>
                                                <td className="border border-black px-2 py-1.5 text-center text-xs print:text-sm">{data.loan_amount.toLocaleString()}</td>
                                                <td className="border border-black px-2 py-1.5 text-center text-xs print:text-sm">{data.service_charge.toLocaleString()}</td>
                                                <td className="border border-black px-2 py-1.5 text-center text-xs print:text-sm">{formatDateBangla(data.disbursement_date)}</td>
                                                <td className="border border-black px-2 py-1.5 text-center text-xs print:text-sm">{formatDateBangla(data.last_installment_date)}</td>
                                                <td className="border border-black px-2 py-1.5 text-center text-xs print:text-sm">{data.number_of_installments}</td>
                                                <td className="border border-black px-2 py-1.5 text-center text-xs print:text-sm">{data.installment_amount.toLocaleString()}</td>
                                                <td className="border border-black px-2 py-1.5 text-center text-xs print:text-sm">{data.last_installment_amount.toLocaleString()}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Terms */}
                                <div className="space-y-0.5 text-sm print:text-base mb-2 leading-tight">
                                    <p>(১) ২য় পক্ষ চুক্তিপত্রে উল্লেখিত উদ্দেশ্য ছাড়া অন্য কোন প্রকারে খানের টাকা ব্যবহার করতে পারবেন না।</p>
                                    <p>(২) পূর্বিত খানের শর্তানুযায়ী ব্যবহার নিশ্চিত করার জন্য খান গ্রহীতাগণ মৌসুমীর দায়িত্বপ্রাপ্ত অফিসারের নিকট আয়-ব্যয়ের হিসাব দেখাতে বাধ্য থাকবেন।</p>
                                    <p>(৩) খান ফেরত দেওয়ার নিয়ম অনুযায়ী ২য় পক্ষ ১ম পক্ষের নিকট {data.service_charge}% হারে সেবাগ্রহণসহ খানের টাকা ফেরত দিতে বাধ্য থাকবেন।</p>
                                    <p>(৪) সমিতির খান গ্রহীতাগণ প্রতিটি বছরের মুনাফা সমিতির নির্ধারিত হার অনুযায়ী সঞ্চয় তহবিল জমা করবেন।</p>
                                    <p>(৫) যদি কোন বিশেষ কারণে ২য় পক্ষ নিরিখ সময়ে খানের বিহিত পরিশোধে বাধ্য হন, সেক্ষেত্রে অবশ্যই লিখিতভাবে যথাযথমূলক কারণ দর্শানো সাপেক্ষে ২য় পক্ষ ১ম পক্ষ ব্যবহার নির্ধারিত জরিমানা সহ সংশ্লিষ্ট খানের কিস্তির টাকা প্রদান করতে বাধ্য থাকবেন।</p>
                                    <p>(৬) বর্তমান পর্যন্ত উপরোক্ত খানের টাকা ও তার উপর ধার্যকৃত সেবাগ্রহণ পরিশোধ না হলে, তৎনির্দিন পর্যন্ত উক্ত খানের টাকা ঘামা অতিরিক্ত সম্পদ্দি ১ম পক্ষের সম্পদ্দি হিসাবে বিবেচিত হবে।</p>
                                    <p>(৭) ২য় পক্ষ খান পরিশোধের ১ম পক্ষ আইনগত ব্যবস্থা গ্রহণের অধিকার সংরক্ষণ করবেন।</p>
                                    <p>(৮) কোন প্রকারে ব্যবহৃত টাকার লোকসান হলেও তার দায় দায়িত্ব গ্রহীতার থাকবে। তাকে খানের সম্পূর্ণ টাকা সেবাগ্রহণসহ পরিশোধ করতে হবে।</p>
                                    <p>(১০) খানের টাকা সম্পূর্ণ পরিশোধ না হওয়া পর্যন্ত খান গ্রহীতা তার ব্যক্তিগত সম্পদ ফেরত নিতে পারবে না।</p>
                                    <p>(১১) খান গ্রহীতার মৃত্যু হলে বা দেশ ত্যাগ করলে সেক্ষেত্রে ১ম পক্ষ উক্ত খানের টাকা পরিশোধ বিষয়ে যে সিদ্ধান্ত গ্রহণ করবে তা কার্যকর যথা বিবেচিত হবে।</p>
                                </div>

                                <p className="text-sm print:text-base mb-3 leading-tight">এতদ্বারা আমরা ১ম ও ২য় পক্ষ স্বেচ্ছায়, স্বজ্ঞানে ও সুস্থ শরীরে কারুক্ত দাতা প্রেরোদিত না হয়ে নিম্নলিখিত স্বাক্ষীগণের সামনে এই চুক্তিপত্রে স্বাক্ষর সম্পাদন করলাম।</p>

                                {/* টিকিট */}
                                <div className="border border-black p-1.5 inline-block float-right mb-3 text-center" style={{width: '80px'}}>
                                    <p className="text-sm print:text-base font-bold">টিকিট</p>
                                </div>

                                <div className="clear-both"></div>

                                {/* ২য় পক্ষ স্বাক্ষর */}
                                <div className="mb-4 text-sm print:text-base leading-tight">
                                    <p className="font-bold mb-1.5">২য় পক্ষের স্বাক্ষর:</p>
                                    <p className="mb-1">খান গ্রহীতার স্বাক্ষর: <span className="border-b border-dotted px-20"></span></p>
                                    {data.applicant_signature_image && (
                                        <img src={data.applicant_signature_image} alt="Signature" className="h-8 w-16 object-contain mb-0.5 ml-16" />
                                    )}
                                    <p className="mb-2">নাম: <span className="border-b border-dotted px-24">{data.applicant_signature_name || data.member_name_bn}</span></p>
                                    <p className="mb-1">অভিভাবকের স্বাক্ষর: <span className="border-b border-dotted px-20"></span></p>
                                    {data.guardian_signature_image && (
                                        <img src={data.guardian_signature_image} alt="Signature" className="h-8 w-16 object-contain mb-0.5 ml-16" />
                                    )}
                                    <p className="mb-2">নাম: <span className="border-b border-dotted px-24">{data.guardian_name}</span></p>
                                    <p className="mb-0.5">মোবাইল নং:</p>
                                    <div className="grid grid-cols-11 gap-0.5 w-36">
                                        {data.mobile_number.split('').map((digit: string, i: number) => (
                                            <div key={i} className="border border-black h-5 print:h-6 flex items-center justify-center text-xs print:text-sm">{digit}</div>
                                        ))}
                                    </div>
                                </div>

                                {/* Page 2 */}
                                <div className="page-break mt-8 pt-8">
                                    {/* সাক্ষীগণের স্বাক্ষর */}
                                    <div className="mb-4 text-sm print:text-base">
                                        <p className="font-bold mb-2">সাক্ষীগণের স্বাক্ষর:</p>
                                        <p className="mb-1">১. সভানেত্রীর স্বাক্ষর: <span className="border-b border-dotted px-16"></span> স্বাক্ষর: <span className="border-b border-dotted px-16"></span></p>
                                        {data.president_signature_image && (
                                            <img src={data.president_signature_image} alt="Signature" className="h-10 w-20 object-contain mb-1 ml-4" />
                                        )}
                                        <p className="mb-3">নাম: <span className="border-b border-dotted px-20">{data.president_name}</span></p>
                                        <p className="mb-1">২. সম্পাদিকার স্বাক্ষর: <span className="border-b border-dotted px-16"></span> স্বাক্ষর: <span className="border-b border-dotted px-16"></span></p>
                                        {data.secretary_signature_image && (
                                            <img src={data.secretary_signature_image} alt="Signature" className="h-10 w-20 object-contain mb-1 ml-4" />
                                        )}
                                        <p className="mb-3">নাম: <span className="border-b border-dotted px-20">{data.secretary_name}</span></p>
                                    </div>

                                    {/* Property witness info */}
                                    <div className="mb-4 text-sm print:text-base leading-relaxed">
                                        <p>আবেদনকারী {data.member_name_bn} সমিতির একজন সচিব সদস্য। উক্ত সমিতির সদস্য সংখ্যা <span className="border-b border-dotted px-8"></span> জন।</p>
                                        <p>নইটমিন কন সংস্থা <span className="border-b border-dotted px-8"></span> জন । মেয়াত চলিত কন <span className="border-b border-dotted px-8"></span> টাকা । মেয়াদিকী কন <span className="border-b border-dotted px-8"></span> টাকা ।</p>
                                        <p>মেয়াদিকী কন সংস্থা <span className="border-b border-dotted px-8"></span> জন । মেয়াত রকেয়া <span className="border-b border-dotted px-8"></span> টাকা । <span className="border-b border-dotted px-8"></span> জন । আদায়ের হার <span className="border-b border-dotted px-8"></span> ।</p>
                                    </div>

                                    {/* Property table heading */}
                                    <div className="mb-2 text-sm print:text-base">
                                        <p className="font-semibold">ভূমি ফরমের সাধে সংক্ষিপ্ত সংখ্যার তথ্য (টিচ টিচ দিন) :</p>
                                    </div>

                                    {/* Property details */}
                                    <div className="mb-4 text-sm print:text-base leading-relaxed">
                                        <p>সদস্যের দুবী: <span className="border-b border-dotted px-8">{data.house_acres}</span> নাইট <span className="border-b border-dotted px-8">{data.house_decimal}</span> সদস্যের জাতীয় পরিচয়ের কার্ড: <span className="border-b border-dotted px-8">{data.house_acres}</span> নাইট <span className="border-b border-dotted px-8">{data.house_decimal}</span></p>
                                        <p>অভিভাবকের দুবী: <span className="border-b border-dotted px-8">{data.land_acres}</span> নাইট <span className="border-b border-dotted px-8">{data.land_decimal}</span> অভিভাবকের জাতীয় পরিচয়ের কার্ড: <span className="border-b border-dotted px-8"></span> নাইট <span className="border-b border-dotted px-8"></span></p>
                                    </div>

                                    <p className="text-sm print:text-base mb-4">আবেদনকারী <span className="border-b border-dotted px-12"></span> টাকা খান মঞ্জুর করা যেয়ে যারে।</p>

                                    <p className="text-sm print:text-base mb-4 text-right">সর্বশেষ অভিসারের স্বাক্ষর (সিল সহ)</p>

                                    <p className="text-sm print:text-base mb-4">আবেদনকারী <span className="border-b border-dotted px-12"></span> টাকা খান মঞ্জুর করা হলো।</p>

                                    <p className="text-sm print:text-base mb-6 text-right">সামা ব্যবস্থাপক/আখলিক ব্যবস্থাপকের স্বাক্ষর (সিল সহ)</p>

                                    {/* কর্মকর্তা সংক্ষিপ্ত তথ্য table */}
                                    <div className="mb-6">
                                        <h3 className="text-sm print:text-base font-bold mb-1">কর্মকর্তা সংক্ষিপ্ত তথ্য:</h3>
                                        <table className="w-full border-collapse border border-black text-xs print:text-sm">
                                            <thead>
                                                <tr>
                                                    <th className="border border-black px-1 py-0.5" rowSpan={2}>খান কর্মকর্তার নাম</th>
                                                    <th className="border border-black px-1 py-0.5" colSpan={4}>বঃ-কর্মসংস্থান/পারিবারিক কর্মসংস্থান</th>
                                                    <th className="border border-black px-1 py-0.5" colSpan={2}>মঞ্জুরি দিক্ষ কর্মসংস্থান</th>
                                                    <th className="border border-black px-1 py-0.5" rowSpan={2} colSpan={2}>মোট<br/>পূর্ব সময় আর্থিক সময়</th>
                                                </tr>
                                                <tr>
                                                    <th className="border border-black px-1 py-0.5">পূর্বকালীন</th>
                                                    <th className="border border-black px-1 py-0.5">বর্তমান</th>
                                                    <th className="border border-black px-1 py-0.5">মাহিলা</th>
                                                    <th className="border border-black px-1 py-0.5">পুরুষ</th>
                                                    <th className="border border-black px-1 py-0.5">মাহিলা</th>
                                                    <th className="border border-black px-1 py-0.5">পুরুষ</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td className="border border-black px-1 py-1"></td>
                                                    <td className="border border-black px-1 py-1 text-center">গ</td>
                                                    <td className="border border-black px-1 py-1 text-center">ঘ</td>
                                                    <td className="border border-black px-1 py-1 text-center">গ</td>
                                                    <td className="border border-black px-1 py-1 text-center">ঘ</td>
                                                    <td className="border border-black px-1 py-1 text-center">গ</td>
                                                    <td className="border border-black px-1 py-1 text-center">ঘ</td>
                                                    <td className="border border-black px-1 py-1 text-center">গ = ১+২+৪+৫</td>
                                                    <td className="border border-black px-1 py-1 text-center">ঘ = ৩+৪+৬+৭</td>
                                                </tr>
                                                <tr>
                                                    <td className="border border-black px-1 py-1"></td>
                                                    <td className="border border-black px-1 py-1"></td>
                                                    <td className="border border-black px-1 py-1"></td>
                                                    <td className="border border-black px-1 py-1"></td>
                                                    <td className="border border-black px-1 py-1"></td>
                                                    <td className="border border-black px-1 py-1"></td>
                                                    <td className="border border-black px-1 py-1"></td>
                                                    <td className="border border-black px-1 py-1"></td>
                                                    <td className="border border-black px-1 py-1"></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* ১ম পক্ষ */}
                                    <div className="text-sm print:text-base">
                                        <p className="font-bold mb-3">১ম পক্ষ:</p>
                                        <div className="grid grid-cols-3 gap-6">
                                            <div>
                                                <p className="mb-1">অফিসারের স্বাক্ষর:</p>
                                                {data.credit_officer_signature && (
                                                    <img src={data.credit_officer_signature} alt="Signature" className="h-10 w-20 object-contain mb-1" />
                                                )}
                                                <p className="mb-1">নাম: <span className="border-b border-dotted px-8">{data.credit_officer_name}</span></p>
                                                <p>পিন: <span className="border-b border-dotted px-8">{data.credit_officer_pin}</span></p>
                                            </div>
                                            <div>
                                                <p className="mb-1">হিসাবরক্ষনের স্বাক্ষর:</p>
                                                {data.field_officer_signature && (
                                                    <img src={data.field_officer_signature} alt="Signature" className="h-10 w-20 object-contain mb-1" />
                                                )}
                                                <p className="mb-1">নাম: <span className="border-b border-dotted px-8">{data.field_officer_name}</span></p>
                                                <p>পিন: <span className="border-b border-dotted px-8">{data.field_officer_pin}</span></p>
                                            </div>
                                            <div>
                                                <p className="mb-1">ব্যবস্থাপকের স্বাক্ষর:</p>
                                                {data.branch_manager_signature && (
                                                    <img src={data.branch_manager_signature} alt="Signature" className="h-10 w-20 object-contain mb-1" />
                                                )}
                                                <p className="mb-1">নাম: <span className="border-b border-dotted px-8">{data.branch_manager_name}</span></p>
                                                <p>পিন: <span className="border-b border-dotted px-8">{data.branch_manager_pin}</span></p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-[600px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            <div className="text-center">
                                <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600 font-semibold mb-2">Click "Calculate & Preview"</p>
                                <p className="text-sm text-gray-500">Fill the form and preview complete loan agreement</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Print Styles */}
            <style>{`
                @media print {
                    body { margin: 0; padding: 0; }
                    .page-break { page-break-before: always; }
                }
            `}</style>
        </AdminLayout>
    );
}
