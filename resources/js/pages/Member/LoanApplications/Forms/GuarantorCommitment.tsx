import { useEffect, useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Save, Printer, Eye, Upload, X, ArrowLeft } from 'lucide-react';

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
    existingApplication?: any;
    savedData?: GuarantorCommitmentData;
}

const formatDateBangla = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

export default function GuarantorCommitment({
    member,
    loanProduct,
    loanCategory,
    requestedAmount,
    branch,
    existingApplication,
    savedData,
}: Props) {
    const [showPreview, setShowPreview] = useState(false);

    const { data, setData, processing } = useForm<GuarantorCommitmentData>({
        branch_name: branch?.name || '',
        branch_address: branch?.address || '',
        
        // Guarantor Info
        guarantor_name: '',
        guarantor_father_or_spouse: '',
        guarantor_nid: '',
        guarantor_mobile: '',
        guarantor_village: '',
        guarantor_post_office: '',
        guarantor_upazila: '',
        guarantor_district: '',
        guarantor_signature_image: null,
        
        // Member Info (auto-filled from member admission)
        member_name: member?.applicant_name_bn || '',
        member_father_or_spouse: member?.father_name_bn || member?.spouse_name_bn || '',
        member_nid: member?.nid_number || '',
        member_mobile: member?.mobile_number || '',
        member_village: member?.present_village_road || '',
        member_post_office: '',
        member_upazila: member?.present_upazila || '',
        member_district: member?.present_district || '',
        member_code: member?.application_no || '',
        samity_name: member?.samity?.samity_name_bn || member?.samity?.samity_name || '',
        samity_code: member?.samity?.samity_code || member?.samity?.id?.toString() || '',
        
        // Loan Details
        loan_date: new Date().toISOString().split('T')[0],
        loan_amount: requestedAmount || 0,
        loan_amount_words: '',
        
        // Witness Signatures
        witness1_signature_image: null,
        witness2_signature_image: null,
        witness3_signature_image: null,
    });

    // Load saved data if exists
    useEffect(() => {
        if (savedData) {
            setData(prev => ({
                ...prev,
                ...savedData,
            }));
            setShowPreview(true);
        }
    }, [savedData]);

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
            '/member/loan-applications/forms/guarantor-commitment/save-draft',
            {
                member_id: member.id,
                loan_product_id: loanProduct.id,
                loan_category_id: loanCategory.id,
                requested_amount: requestedAmount,
                agreement_data: data,
            },
            {
                onSuccess: () => {
                    alert('জামিনদার/দায়িত্ব গ্রহণকারীর অঙ্গীকার নামা ড্রাফট হিসেবে সংরক্ষিত হয়েছে।');
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
            <Head title="ঋণের জামিনদার/দায়িত্ব গ্রহণকারীর অঙ্গীকার নামা" />

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
                            <h1 className="text-lg font-bold">ঋণের জামিনদার/দায়িত্ব গ্রহণকারীর অঙ্গীকার নামা</h1>
                            <p className="text-xs text-gray-600">
                                ফর্ম পূরণ করে ড্রাফট হিসেবে সংরক্ষণ করুন এবং প্রিন্ট নিন।
                            </p>
                            {existingApplication && (
                                <p className="text-xs text-blue-600 mt-1">
                                    ✓ Draft সংরক্ষিত আছে - Application No: {existingApplication.application_no || 'Pending'}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowPreview(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                        >
                            <Eye className="w-4 h-4" />
                            Preview
                        </button>
                        <button
                            onClick={handleSaveDraft}
                            disabled={processing}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {processing ? 'সংরক্ষণ হচ্ছে...' : 'ড্রাফট সংরক্ষণ করুন'}
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
                        {/* Guarantor Info */}
                        <div className="bg-white rounded-lg shadow-sm p-4 border">
                            <h3 className="text-sm font-bold mb-3">জামিনদার/দায়িত্ব গ্রহণকারীর তথ্য</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium mb-1">নাম (মো./মোছা./শ্রী.)</label>
                                    <input
                                        type="text"
                                        value={data.guarantor_name}
                                        onChange={(e) => setData('guarantor_name', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">স্বামী/পিতা</label>
                                    <input
                                        type="text"
                                        value={data.guarantor_father_or_spouse}
                                        onChange={(e) => setData('guarantor_father_or_spouse', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">জাতীয় পরিচয়পত্র নং</label>
                                    <input
                                        type="text"
                                        value={data.guarantor_nid}
                                        onChange={(e) => setData('guarantor_nid', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">মোবাইল</label>
                                    <input
                                        type="text"
                                        value={data.guarantor_mobile}
                                        onChange={(e) => setData('guarantor_mobile', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">গ্রাম</label>
                                    <input
                                        type="text"
                                        value={data.guarantor_village}
                                        onChange={(e) => setData('guarantor_village', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">ডাকঘর</label>
                                    <input
                                        type="text"
                                        value={data.guarantor_post_office}
                                        onChange={(e) => setData('guarantor_post_office', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">উপজেলা</label>
                                    <input
                                        type="text"
                                        value={data.guarantor_upazila}
                                        onChange={(e) => setData('guarantor_upazila', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">জেলা</label>
                                    <input
                                        type="text"
                                        value={data.guarantor_district}
                                        onChange={(e) => setData('guarantor_district', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Member/Loan Applicant Info */}
                        <div className="bg-white rounded-lg shadow-sm p-4 border">
                            <h3 className="text-sm font-bold mb-3">ঋণ গ্রহীতার তথ্য (Auto-filled)</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium mb-1">নাম (মো./মোছা./শ্রী.)</label>
                                    <input
                                        type="text"
                                        value={data.member_name}
                                        onChange={(e) => setData('member_name', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md bg-gray-50"
                                        disabled
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">স্বামী/পিতা</label>
                                    <input
                                        type="text"
                                        value={data.member_father_or_spouse}
                                        onChange={(e) => setData('member_father_or_spouse', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md bg-gray-50"
                                        disabled
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">জাতীয় পরিচয়পত্র নং</label>
                                    <input
                                        type="text"
                                        value={data.member_nid}
                                        onChange={(e) => setData('member_nid', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md bg-gray-50"
                                        disabled
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">মোবাইল</label>
                                    <input
                                        type="text"
                                        value={data.member_mobile}
                                        onChange={(e) => setData('member_mobile', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md bg-gray-50"
                                        disabled
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">গ্রাম</label>
                                    <input
                                        type="text"
                                        value={data.member_village}
                                        onChange={(e) => setData('member_village', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md bg-gray-50"
                                        disabled
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">ডাকঘর</label>
                                    <input
                                        type="text"
                                        value={data.member_post_office}
                                        onChange={(e) => setData('member_post_office', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">উপজেলা</label>
                                    <input
                                        type="text"
                                        value={data.member_upazila}
                                        onChange={(e) => setData('member_upazila', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md bg-gray-50"
                                        disabled
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">জেলা</label>
                                    <input
                                        type="text"
                                        value={data.member_district}
                                        onChange={(e) => setData('member_district', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md bg-gray-50"
                                        disabled
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">সদস্য নং</label>
                                    <input
                                        type="text"
                                        value={data.member_code}
                                        onChange={(e) => setData('member_code', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">সমিতির নাম</label>
                                    <input
                                        type="text"
                                        value={data.samity_name}
                                        onChange={(e) => setData('samity_name', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md bg-gray-50"
                                        disabled
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">সমিতি নং</label>
                                    <input
                                        type="text"
                                        value={data.samity_code}
                                        onChange={(e) => setData('samity_code', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md bg-gray-50"
                                        disabled
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Loan Details */}
                        <div className="bg-white rounded-lg shadow-sm p-4 border">
                            <h3 className="text-sm font-bold mb-3">ঋণের বিবরণ</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium mb-1">অদ্য/গত তারিখ</label>
                                    <input
                                        type="date"
                                        value={data.loan_date}
                                        onChange={(e) => setData('loan_date', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">ঋণের পরিমাণ (৳)</label>
                                    <input
                                        type="number"
                                        value={data.loan_amount}
                                        onChange={(e) => setData('loan_amount', Number(e.target.value || 0))}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium mb-1">ঋণের পরিমাণ (কথায়)</label>
                                    <input
                                        type="text"
                                        value={data.loan_amount_words}
                                        onChange={(e) => setData('loan_amount_words', e.target.value)}
                                        placeholder="যেমন: পাঁচ হাজার টাকা মাত্র"
                                        className="w-full px-2 py-1.5 text-sm border rounded-md"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Signatures */}
                        <div className="bg-white rounded-lg shadow-sm p-4 border">
                            <h3 className="text-sm font-bold mb-3">স্বাক্ষর</h3>
                            
                            {/* Guarantor Signature */}
                            <div className="mb-4">
                                <label className="block text-xs font-medium mb-2">জামিনদারের স্বাক্ষর</label>
                                {data.guarantor_signature_image ? (
                                    <div className="relative inline-block">
                                        <img src={data.guarantor_signature_image} alt="Signature" className="h-20 w-32 object-contain border rounded" />
                                        <button
                                            onClick={() => removeImage('guarantor_signature_image')}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex items-center gap-2 px-3 py-2 bg-gray-100 border border-dashed rounded cursor-pointer hover:bg-gray-200 w-fit">
                                        <Upload className="w-4 h-4" />
                                        <span className="text-xs">Upload PNG/JPG</span>
                                        <input
                                            type="file"
                                            accept="image/png,image/jpg,image/jpeg"
                                            onChange={(e) => handleImageUpload('guarantor_signature_image', e.target.files?.[0] || null)}
                                            className="hidden"
                                        />
                                    </label>
                                )}
                            </div>

                            {/* Witness Signatures */}
                            <div className="space-y-3">
                                <p className="text-xs font-semibold mb-2">স্বাক্ষীগণের স্বাক্ষর (৩ জন)</p>
                                
                                {[1, 2, 3].map((num) => {
                                    const field = `witness${num}_signature_image` as keyof GuarantorCommitmentData;
                                    return (
                                        <div key={num}>
                                            <label className="block text-xs font-medium mb-1">{num}. স্বাক্ষীর স্বাক্ষর</label>
                                            {data[field] ? (
                                                <div className="relative inline-block">
                                                    <img src={data[field] as string} alt={`Witness ${num}`} className="h-16 w-24 object-contain border rounded" />
                                                    <button
                                                        onClick={() => removeImage(field)}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 border border-dashed rounded cursor-pointer hover:bg-gray-200 w-fit">
                                                    <Upload className="w-3 h-3" />
                                                    <span className="text-xs">Upload</span>
                                                    <input
                                                        type="file"
                                                        accept="image/png,image/jpg,image/jpeg"
                                                        onChange={(e) => handleImageUpload(field, e.target.files?.[0] || null)}
                                                        className="hidden"
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* PREVIEW / PRINT LAYOUT */}
                    {showPreview ? (
                        <div className="lg:sticky lg:top-4 lg:h-fit print:block print-container">
                            <div className="bg-white rounded-lg shadow-lg p-8 print:shadow-none print:p-6 print:rounded-none print:bg-white">
                                {/* Header */}
                                <div className="mb-4 pb-2 border-b">
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
                                                <p className="text-sm print:text-base mb-1">শাখা: <span className="border-b border-dotted px-16">{data.branch_name}</span></p>
                                                <p className="text-base font-semibold print:text-lg">ঋণের জামিনদার/দায়িত্ব গ্রহণকারীর অঙ্গীকার নামা</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Main Content */}
                                <div className="text-sm print:text-base leading-relaxed space-y-2">
                                    {/* Guarantor Info */}
                                    <p>
                                        আমি মো./মোছা./শ্রী <span className="border-b border-dotted px-24">{data.guarantor_name || ''}</span>, স্বামী/পিতা: <span className="border-b border-dotted px-24">{data.guarantor_father_or_spouse || ''}</span>
                                    </p>
                                    <p>
                                        জাতীয় পরিচয়পত্র নং: <span className="border-b border-dotted px-20">{data.guarantor_nid || ''}</span> গ্রাম: <span className="border-b border-dotted px-16">{data.guarantor_village || ''}</span> ডাকঘর: <span className="border-b border-dotted px-16">{data.guarantor_post_office || ''}</span>
                                    </p>
                                    <p>
                                        উপজেলা: <span className="border-b border-dotted px-16">{data.guarantor_upazila || ''}</span> জেলা: <span className="border-b border-dotted px-16">{data.guarantor_district || ''}</span> মোবাইল: <span className="border-b border-dotted px-16">{data.guarantor_mobile || ''}</span>
                                    </p>

                                    {/* Declaration */}
                                    <p className="mt-3">
                                        এই মর্মে অঙ্গীকার করছি যে, মৌসুমী সংস্থার <span className="border-b border-dotted px-16">{data.branch_name || ''}</span> শাখার সদস্য মো./মোছা./শ্রী <span className="border-b border-dotted px-24">{data.member_name || ''}</span>
                                    </p>
                                    <p>
                                        স্বামী/পিতা: <span className="border-b border-dotted px-24">{data.member_father_or_spouse || ''}</span> জাতীয় পরিচয়পত্র নং: <span className="border-b border-dotted px-20">{data.member_nid || ''}</span>
                                    </p>
                                    <p>
                                        গ্রাম: <span className="border-b border-dotted px-16">{data.member_village || ''}</span> ডাকঘর: <span className="border-b border-dotted px-16">{data.member_post_office || ''}</span>
                                    </p>
                                    <p>
                                        উপজেলা: <span className="border-b border-dotted px-16">{data.member_upazila || ''}</span> জেলা: <span className="border-b border-dotted px-16">{data.member_district || ''}</span> মোবাইল: <span className="border-b border-dotted px-16">{data.member_mobile || ''}</span>
                                    </p>
                                    <p>
                                        অদ্য/গত <span className="border-b border-dotted px-16">{data.loan_date ? formatDateBangla(data.loan_date) : ''}</span> তারিখে সংস্থার <span className="border-b border-dotted px-16">{data.branch_name || ''}</span> শাখা থেকে সার্ভিস চার্জ সহ <span className="border-b border-dotted px-16">{data.loan_amount ? `৳${data.loan_amount.toLocaleString()}` : ''}</span> টাকা, (কথায় <span className="border-b border-dotted px-32">{data.loan_amount_words || ''}</span>) টাকা ঋণ গ্রহণ করেছেন।
                                    </p>
                                    <p>
                                        উক্ত শাখায় তার সদস্য নং: <span className="border-b border-dotted px-16">{data.member_code || ''}</span> এবং সমিতির নাম: <span className="border-b border-dotted px-16">{data.samity_name || ''}</span> সমিতি নং: <span className="border-b border-dotted px-16">{data.samity_code || ''}</span>
                                    </p>
                                    <p className="mt-2">
                                        । ঋণ গ্রহণকারী ব্যক্তি আমার পরিচিত এবং আমি তাকে চিনি ও জানি। আমি আরও অঙ্গীকার করছি যে উক্ত ঋণের টাকা তিনি পরিশোধ করতে ব্যর্থ হলে বা অপারগতা প্রকাশ করলে ঋণের সমুদয় টাকা আমি নিম্নোক্ত শর্তে পরিশোধ করবো।
                                    </p>

                                    {/* Conditions */}
                                    <p className="mt-4 font-semibold">শর্তাবলী:</p>
                                    <ol className="list-decimal list-inside space-y-2 ml-2">
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

                                    {/* Final Declaration */}
                                    <p className="mt-4">
                                        উক্ত ব্যাপারে আমাকে কেহ বা কাহারা প্রলোভন, কোন প্রকার ভয়ভীতি দেখায় নাই বা চাপ সৃষ্টি করে নাই। এতদার্থে স্বেচ্ছায়, সজ্ঞানে অন্যের বিনা প্ররোচনায় অত্র অঙ্গীকারনামা পড়ে, শুনে, বুঝে স্বাক্ষীগণের সম্মুখে সহি স্বাক্ষর সম্পাদন করলাম।
                                    </p>

                                    {/* Signatures Section */}
                                    <div className="mt-8 flex justify-between items-start">
                                        {/* Witness Signatures */}
                                        <div className="flex-1">
                                            <p className="font-bold mb-2 text-sm print:text-base">স্বাক্ষীর স্বাক্ষর:</p>
                                            <div className="space-y-3">
                                                {[1, 2, 3].map((num) => {
                                                    const field = `witness${num}_signature_image` as keyof GuarantorCommitmentData;
                                                    return (
                                                        <div key={num} className="mb-2">
                                                            <p className="text-xs print:text-sm mb-1">{num}.</p>
                                                            {data[field] && (
                                                                <img src={data[field] as string} alt={`Witness ${num}`} className="h-12 w-20 object-contain border rounded" />
                                                            )}
                                                            <p className="border-b border-dotted w-32 mt-1"></p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Guarantor Signature */}
                                        <div className="flex-1 text-right">
                                            <p className="font-bold mb-2 text-sm print:text-base">ঋণের জামিনদার/দায়িত্ব গ্রহণকারীর স্বাক্ষর</p>
                                            {data.guarantor_signature_image && (
                                                <img src={data.guarantor_signature_image} alt="Guarantor Signature" className="h-16 w-28 object-contain border rounded mx-auto mb-2" />
                                            )}
                                            <p className="border-b border-dotted w-40 inline-block"></p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-[600px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            <div className="text-center">
                                <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600 font-semibold mb-2">Preview দেখতে উপরের বাটন ক্লিক করুন</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
