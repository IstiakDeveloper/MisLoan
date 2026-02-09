import { useEffect, useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Save, Printer, Eye, Upload, X, ArrowLeft } from 'lucide-react';

interface FieldInvestigationData {
    // Branch & Date
    branch_name: string;
    branch_address: string;
    field_visit_date: string;
    loan_disbursement_date: string;

    // Member Information (from MemberAdmission)
    member_name: string;
    member_no: string;
    samity_name: string;
    samity_code: string;
    nid_number: string;
    member_mobile: string;

    // Information Provider
    information_provider_name: string;
    information_provider_mobile: string;
    relationship_with_member: string;

    // Table Data
    main_profession: string;
    family_members_count: number;
    earning_members_count: number;

    previous_loan_amount: number;
    current_loan_demand: number;

    own_land_amount: string;
    mortgaged_land_amount: string;
    land_value: number;

    house_type: string; // ছাপড়া/টিন/মাটি/পাকা
    room_count: number;

    has_tubewell: boolean;
    has_latrine: boolean;

    cow_count: number;
    buffalo_count: number;
    goat_count: number;
    sheep_count: number;
    duck_chicken_count: number;

    primary_school_count: number;
    secondary_school_count: number;
    college_count: number;
    madrasah_count: number;
    university_count: number;

    savings_amount: number;

    house_identification: string;

    other_organization_loans: string;

    previous_repayment_type: string; // কিস্তিতে পরিশোধ / সঞ্চয়ের সাথে সমন্বয়

    general_savings_default_count: number;
    emergency_savings_default_count: number;
    term_savings_default_count: number;

    term_savings_due_installments: number;
    term_savings_due_amount: number;

    comments: string;

    // Signatures
    member_signature: string | null;
    branch_manager_signature: string | null;
}

interface Props {
    member: any;
    loanProduct: any;
    loanCategory: any;
    requestedAmount: number;
    branch?: any;
    existingApplication?: any;
    savedData?: FieldInvestigationData;
}

const formatDateBangla = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

export default function FieldInvestigation({
    member,
    loanProduct,
    loanCategory,
    requestedAmount,
    branch,
    existingApplication,
    savedData,
}: Props) {
    const [errors, setErrors] = useState<Record<string, string>>({});

    const { data, setData, processing } = useForm<FieldInvestigationData>({
        branch_name: branch?.name || '',
        branch_address: branch?.address || '',
        field_visit_date: new Date().toISOString().split('T')[0],
        loan_disbursement_date: new Date().toISOString().split('T')[0],

        // Member Info (auto-filled from MemberAdmission)
        member_name: member?.applicant_name_bn || '',
        member_no: member?.application_no || '',
        samity_name: member?.samity?.samity_name_bn || member?.samity?.samity_name || '',
        samity_code: member?.samity?.samity_code || member?.samity?.id?.toString() || '',
        nid_number: member?.nid_number || '',
        member_mobile: member?.mobile_number || '',

        // Information Provider (External)
        information_provider_name: '',
        information_provider_mobile: '',
        relationship_with_member: '',

        // Table Data (All blank - user will fill manually)
        main_profession: '',
        family_members_count: 0,
        earning_members_count: 0,

        previous_loan_amount: 0,
        current_loan_demand: 0,

        own_land_amount: '',
        mortgaged_land_amount: '',
        land_value: 0,

        house_type: '',
        room_count: 0,

        has_tubewell: false,
        has_latrine: false,

        cow_count: 0,
        buffalo_count: 0,
        goat_count: 0,
        sheep_count: 0,
        duck_chicken_count: 0,

        primary_school_count: 0,
        secondary_school_count: 0,
        college_count: 0,
        madrasah_count: 0,
        university_count: 0,

        savings_amount: 0,

        house_identification: '',

        other_organization_loans: '',

        previous_repayment_type: '',

        general_savings_default_count: 0,
        emergency_savings_default_count: 0,
        term_savings_default_count: 0,

        term_savings_due_installments: 0,
        term_savings_due_amount: 0,

        comments: '',

        // Signatures
        member_signature: null,
        branch_manager_signature: null,
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

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!data.information_provider_name?.trim()) {
            newErrors.information_provider_name = 'তথ্য প্রদানকারীর নাম আবশ্যক';
        }
        if (!data.relationship_with_member?.trim()) {
            newErrors.relationship_with_member = 'সম্পর্ক আবশ্যক';
        }
        if (!data.field_visit_date) {
            newErrors.field_visit_date = 'পরিদর্শনের তারিখ আবশ্যক';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSaveDraft = () => {
        if (!validateForm()) {
            alert('অনুগ্রহ করে সকল আবশ্যক ক্ষেত্র পূরণ করুন');
            return;
        }

        router.post(
            '/member/loan-applications/forms/field-investigation/save-draft',
            {
                member_id: member.id,
                loan_product_id: loanProduct.id,
                loan_category_id: loanCategory.id,
                requested_amount: requestedAmount,
                form_data: data,
            },
            {
                onSuccess: () => {
                    alert('সরেজমিনে তদন্ত প্রতিবেদন ড্রাফট হিসেবে সংরক্ষিত হয়েছে।');
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
        const printWindow = window.open('', '_blank', 'width=900,height=1200');
        if (!printWindow) {
            window.print();
            return;
        }

        const headHtml = document.head.innerHTML;
        const printContainer = document.querySelector('.print-container') as HTMLElement | null;

        if (!printContainer) {
            window.print();
            return;
        }

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

    const renderPreview = () => {
        return (
            <div className="bg-white border border-gray-300 p-4 print:p-2" style={{ fontSize: '11px' }}>
                {/* Header */}
                <div className="flex flex-col items-center justify-center mb-3 border-b-2 border-gray-400 pb-2">
                    <div className="flex items-center justify-center gap-3 mb-1">
                        <img 
                            src="/logo.png" 
                            alt="Logo" 
                            className="h-16 w-16 object-contain print:h-14 print:w-14"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                        <div className="text-center">
                            <h1 className="text-lg font-bold leading-tight print:text-base">মৌসুমী</h1>
                            <p className="text-xs leading-tight print:text-[10px]">{data.branch_address}</p>
                            <p className="text-xs leading-tight print:text-[10px]">ঋণ কর্মসূচি</p>
                        </div>
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-center font-bold mb-3 print:mb-2" style={{ fontSize: '14px' }}>
                    <span className="print:text-[12px]">সমিতিতে ঋণ আবেদন অনুযায়ী শাখা ব্যবস্থাপক কর্তৃক সদস্যের বাড়ি সরেজমিনে তদন্ত প্রতিবেদন</span>
                </h2>

                {/* Member Information */}
                <div className="mb-2" style={{ fontSize: '10px' }}>
                    <div className="space-y-0.5">
                        <div className="flex gap-1 items-baseline">
                            <span className="w-32 flex-shrink-0">সদস্য নাম:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.member_name || ''}</span>
                            <span className="w-24 flex-shrink-0 ml-2">সদস্য নং:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.member_no || ''}</span>
                        </div>
                        <div className="flex gap-1 items-baseline">
                            <span className="w-32 flex-shrink-0">সমিতির নাম:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.samity_name || ''}</span>
                            <span className="w-28 flex-shrink-0 ml-2">সমিতি কোড নং:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.samity_code || ''}</span>
                        </div>
                        <div className="flex gap-1 items-baseline">
                            <span className="w-36 flex-shrink-0">জাতীয় পরিচয়পত্র নং:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.nid_number || ''}</span>
                            <span className="w-32 flex-shrink-0 ml-2">সদস্যের মোবাইল নং:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.member_mobile || ''}</span>
                        </div>
                        <div className="flex gap-1 items-baseline">
                            <span className="w-40 flex-shrink-0">তথ্য প্রদানকারীর নাম:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.information_provider_name || ''}</span>
                            <span className="w-24 flex-shrink-0 ml-2">মোবাইল নং:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.information_provider_mobile || ''}</span>
                        </div>
                        <div className="flex gap-1 items-baseline">
                            <span className="w-40 flex-shrink-0">সদস্যের সাথে সম্পর্ক:</span>
                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[12px]">{data.relationship_with_member || ''}</span>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="mb-2">
                    <table className="w-full border-collapse border border-gray-600" style={{ fontSize: '9px' }}>
                        <thead>
                            <tr>
                                <th className="border border-gray-600 px-1 py-0.5 w-8">ক্রঃ নং</th>
                                <th className="border border-gray-600 px-1 py-0.5">বিবরণ</th>
                                <th className="border border-gray-600 px-1 py-0.5 w-48">পরিমাণ/সংখ্যা</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Row 1 */}
                            <tr>
                                <td className="border border-gray-600 px-1 py-0.5 text-center">১</td>
                                <td className="border border-gray-600 px-1 py-0.5">মূল পেশা, পরিবারের লোক সংখ্যা ও উপার্জনকারী সংখ্যা</td>
                                <td className="border border-gray-600 px-1 py-0.5">
                                    <div className="space-y-0.5">
                                        <div className="flex gap-1">
                                            <span className="w-20">পেশা:</span>
                                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{data.main_profession || ''}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <span className="w-20">লোক সংখ্যা:</span>
                                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{data.family_members_count || ''}</span>
                                            <span className="w-24 ml-1">উপার্জনকারী:</span>
                                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{data.earning_members_count || ''}</span>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            {/* Row 2 */}
                            <tr>
                                <td className="border border-gray-600 px-1 py-0.5 text-center">২</td>
                                <td className="border border-gray-600 px-1 py-0.5">বিগত দফায় পরিশোধিত ঋণের পরিমাণ ও বর্তমান ঋণের চাহিদা</td>
                                <td className="border border-gray-600 px-1 py-0.5">
                                    <div className="space-y-0.5">
                                        <div className="flex gap-1">
                                            <span className="w-20">পরিশোধিত:</span>
                                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{data.previous_loan_amount || ''}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <span className="w-20">বর্তমান চাহিদা:</span>
                                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{data.current_loan_demand || ''}</span>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            {/* Row 3 */}
                            <tr>
                                <td className="border border-gray-600 px-1 py-0.5 text-center">৩</td>
                                <td className="border border-gray-600 px-1 py-0.5">নিজস্ব জমির পরিমাণ ও বন্ধকী জমির পরিমান এবং মূল্য</td>
                                <td className="border border-gray-600 px-1 py-0.5">
                                    <div className="space-y-0.5">
                                        <div className="flex gap-1">
                                            <span className="w-16">নিজস্ব:</span>
                                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{data.own_land_amount || ''}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <span className="w-16">বন্ধকী:</span>
                                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{data.mortgaged_land_amount || ''}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <span className="w-16">মূল্য:</span>
                                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{data.land_value || ''}</span>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            {/* Row 4 */}
                            <tr>
                                <td className="border border-gray-600 px-1 py-0.5 text-center">৪</td>
                                <td className="border border-gray-600 px-1 py-0.5">বাড়ীর ধরণ ও ঘরের সংখ্যা (টিক চিহ্ন দিন)</td>
                                <td className="border border-gray-600 px-1 py-0.5">
                                    <div className="space-y-0.5">
                                        <div className="flex gap-1">
                                            <span className="w-32">ধরণ:</span>
                                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{data.house_type || ''}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <span className="w-32">ছাপড়া/টিন/মাটি/পাকা-ঘরের সংখ্যা:</span>
                                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{data.room_count || ''}</span>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            {/* Row 5 */}
                            <tr>
                                <td className="border border-gray-600 px-1 py-0.5 text-center">৫</td>
                                <td className="border border-gray-600 px-1 py-0.5">নিজস্ব টিউবওয়েল ও স্বাস্থ্যসম্মত পায়খানা আছে কি-না (টিক চিহ্ন দিন)</td>
                                <td className="border border-gray-600 px-1 py-0.5">
                                    <div className="space-y-0.5">
                                        <div className="flex gap-2 items-center">
                                            <span>টিউবওয়েল-</span>
                                            <span className="border border-gray-600 w-3 h-3 inline-block">{data.has_tubewell ? '✓' : ''}</span>
                                            <span>হ্যাঁ</span>
                                            <span className="border border-gray-600 w-3 h-3 inline-block ml-2">{!data.has_tubewell ? '✓' : ''}</span>
                                            <span>না</span>
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            <span>স্বাস্থ্যসম্মত পায়খানা-</span>
                                            <span className="border border-gray-600 w-3 h-3 inline-block">{data.has_latrine ? '✓' : ''}</span>
                                            <span>হ্যাঁ</span>
                                            <span className="border border-gray-600 w-3 h-3 inline-block ml-2">{!data.has_latrine ? '✓' : ''}</span>
                                            <span>না</span>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            {/* Row 6 */}
                            <tr>
                                <td className="border border-gray-600 px-1 py-0.5 text-center">৬</td>
                                <td className="border border-gray-600 px-1 py-0.5">গবাদি পশুর সংখ্যা (গরু, মহিষ, ছাগল, ভেড়া ইত্যাদি)</td>
                                <td className="border border-gray-600 px-1 py-0.5">
                                    <div className="grid grid-cols-3 gap-1">
                                        <div className="flex gap-1">
                                            <span className="w-12">গরু-</span>
                                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{data.cow_count || ''}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <span className="w-12">মহিষ-</span>
                                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{data.buffalo_count || ''}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <span className="w-12">ছাগল-</span>
                                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{data.goat_count || ''}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <span className="w-12">ভেড়া-</span>
                                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{data.sheep_count || ''}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <span className="w-16">হাঁস-মুরগী-</span>
                                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{data.duck_chicken_count || ''}</span>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            {/* Row 7 */}
                            <tr>
                                <td className="border border-gray-600 px-1 py-0.5 text-center">৭</td>
                                <td className="border border-gray-600 px-1 py-0.5">স্কুলে/কলেজে পড়ে এমন ছেলে-মেয়ের সংখ্যা</td>
                                <td className="border border-gray-600 px-1 py-0.5">
                                    <div className="grid grid-cols-3 gap-1">
                                        <div className="flex gap-1">
                                            <span className="w-20">প্রাথমিক স্কুল-</span>
                                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{data.primary_school_count || ''}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <span className="w-20">মাধ্যমিক স্কুল-</span>
                                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{data.secondary_school_count || ''}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <span className="w-16">কলেজ-</span>
                                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{data.college_count || ''}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <span className="w-16">মাদ্রাসা-</span>
                                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{data.madrasah_count || ''}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <span className="w-20">বিশ্ববিদ্যালয়-</span>
                                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{data.university_count || ''}</span>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            {/* Row 8 */}
                            <tr>
                                <td className="border border-gray-600 px-1 py-0.5 text-center">৮</td>
                                <td className="border border-gray-600 px-1 py-0.5">সঞ্চয়ের পরিমাণ</td>
                                <td className="border border-gray-600 px-1 py-0.5">
                                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px]">{data.savings_amount || ''}</span>
                                </td>
                            </tr>
                            {/* Row 9 */}
                            <tr>
                                <td className="border border-gray-600 px-1 py-0.5 text-center">৯</td>
                                <td className="border border-gray-600 px-1 py-0.5">সদস্যের বাড়ী চেনার নির্দেশনা</td>
                                <td className="border border-gray-600 px-1 py-0.5">
                                    <div className="border-b border-dotted border-gray-600 min-h-[30px]">{data.house_identification || ''}</div>
                                </td>
                            </tr>
                            {/* Row 10 */}
                            <tr>
                                <td className="border border-gray-600 px-1 py-0.5 text-center">১০</td>
                                <td className="border border-gray-600 px-1 py-0.5">অন্যান্য সংস্থা হতে ঋণ গ্রহণের তথ্য</td>
                                <td className="border border-gray-600 px-1 py-0.5">
                                    <div className="border-b border-dotted border-gray-600 min-h-[30px]">{data.other_organization_loans || ''}</div>
                                </td>
                            </tr>
                            {/* Row 11 */}
                            <tr>
                                <td className="border border-gray-600 px-1 py-0.5 text-center">১১</td>
                                <td className="border border-gray-600 px-1 py-0.5">বিগত দফার পরিশোধের ধরণ (টিক চিহ্ন দিন)</td>
                                <td className="border border-gray-600 px-1 py-0.5">
                                    <div className="space-y-0.5">
                                        <div className="flex gap-2 items-center">
                                            <span className="border border-gray-600 w-3 h-3 inline-block">{data.previous_repayment_type === 'installment' ? '✓' : ''}</span>
                                            <span>কিস্তিতে পরিশোধ করেছেন</span>
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            <span className="border border-gray-600 w-3 h-3 inline-block">{data.previous_repayment_type === 'savings_adjustment' ? '✓' : ''}</span>
                                            <span>সঞ্চয়ের সাথে সমন্বয় করেছেন</span>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            {/* Row 12 */}
                            <tr>
                                <td className="border border-gray-600 px-1 py-0.5 text-center">১২</td>
                                <td className="border border-gray-600 px-1 py-0.5">গত ৬ মাসে/১ বছরে কতবার সঞ্চয় খেলাপী করেছেন</td>
                                <td className="border border-gray-600 px-1 py-0.5">
                                    <div className="space-y-0.5">
                                        <div className="flex gap-1">
                                            <span className="w-20">সাধারণ:</span>
                                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{data.general_savings_default_count || ''}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <span className="w-20">আপদকালীন:</span>
                                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{data.emergency_savings_default_count || ''}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <span className="w-20">মেয়াদী:</span>
                                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{data.term_savings_default_count || ''}</span>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            {/* Row 13 */}
                            <tr>
                                <td className="border border-gray-600 px-1 py-0.5 text-center">১৩</td>
                                <td className="border border-gray-600 px-1 py-0.5">বর্তমানে সদস্যের মেয়াদী সঞ্চয়ের কয়টি কিস্তি বাঁকী আছে</td>
                                <td className="border border-gray-600 px-1 py-0.5">
                                    <div className="space-y-0.5">
                                        <div className="flex gap-1">
                                            <span className="w-24">কিস্তি সংখ্যা:</span>
                                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{data.term_savings_due_installments || ''}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <span className="w-24">টাকার পরিমাণ:</span>
                                            <span className="border-b border-dotted border-gray-600 flex-1 min-h-[10px]">{data.term_savings_due_amount || ''}</span>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Dates */}
                <div className="mb-2 flex gap-4" style={{ fontSize: '10px' }}>
                    <div className="flex gap-1 items-baseline">
                        <span className="w-40">সরেজমিনে পরিদর্শনের তারিখ:</span>
                        <span className="border-b border-dotted border-gray-600 flex-1 min-w-[100px]">{formatDateBangla(data.field_visit_date) || ''}</span>
                    </div>
                    <div className="flex gap-1 items-baseline">
                        <span className="w-32">ঋণ প্রদানের তারিখ:</span>
                        <span className="border-b border-dotted border-gray-600 flex-1 min-w-[100px]">{formatDateBangla(data.loan_disbursement_date) || ''}</span>
                    </div>
                </div>

                {/* Comments */}
                <div className="mb-2" style={{ fontSize: '10px' }}>
                    <p className="font-bold mb-0.5">মন্তব্য:</p>
                    <div className="border border-gray-600 min-h-[40px] p-1">{data.comments || ''}</div>
                </div>

                {/* Signatures */}
                <div className="flex gap-4 mt-2" style={{ fontSize: '10px' }}>
                    <div className="flex-1">
                        <p className="mb-0.5">সদস্য/তথ্য প্রদানকারীর স্বাক্ষর:</p>
                        <div className="border-b border-dotted border-gray-600 h-6">
                            {data.member_signature && (
                                <img src={data.member_signature} alt="Signature" className="h-5 object-contain" />
                            )}
                        </div>
                    </div>
                    <div className="flex-1">
                        <p className="mb-0.5">শাখা ব্যবস্থাপকের স্বাক্ষর ও সিল:</p>
                        <div className="border-b border-dotted border-gray-600 h-6">
                            {data.branch_manager_signature && (
                                <img src={data.branch_manager_signature} alt="Signature" className="h-5 object-contain" />
                            )}
                        </div>
                    </div>
                </div>

                {/* Note */}
                <p className="text-center mt-2 text-[9px] italic">
                    নোট: প্রতিবেদনটি ঋণ আবেদনের সাথে সংযুক্ত করে সংরক্ষণ করতে হবে।
                </p>
            </div>
        );
    };

    return (
        <AdminLayout>
            <Head title="সরেজমিনে তদন্ত প্রতিবেদন">
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
                            <h1 className="text-lg font-bold">সরেজমিনে তদন্ত প্রতিবেদন</h1>
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

                {/* Form Content - Left: Input, Right: Preview */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:grid-cols-1">
                    {/* LEFT SIDE: INPUT FORM */}
                    <div className="space-y-4 print:hidden">
                        {/* Member Information */}
                        <div className="bg-white rounded-lg shadow-sm p-4 border">
                            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">১</span>
                                সদস্য তথ্য (Auto-filled)
                            </h3>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <label className="block text-xs font-medium mb-1">সদস্য নাম</label>
                                    <input type="text" value={data.member_name} disabled className="w-full px-2 py-1.5 text-sm border rounded-md bg-gray-50" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">সদস্য নং</label>
                                    <input type="text" value={data.member_no} disabled className="w-full px-2 py-1.5 text-sm border rounded-md bg-gray-50" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">সমিতির নাম</label>
                                    <input type="text" value={data.samity_name} disabled className="w-full px-2 py-1.5 text-sm border rounded-md bg-gray-50" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">সমিতি কোড নং</label>
                                    <input type="text" value={data.samity_code} disabled className="w-full px-2 py-1.5 text-sm border rounded-md bg-gray-50" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">জাতীয় পরিচয়পত্র নং</label>
                                    <input type="text" value={data.nid_number} disabled className="w-full px-2 py-1.5 text-sm border rounded-md bg-gray-50" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">সদস্যের মোবাইল নং</label>
                                    <input type="text" value={data.member_mobile} disabled className="w-full px-2 py-1.5 text-sm border rounded-md bg-gray-50" />
                                </div>
                            </div>
                        </div>

                        {/* Information Provider */}
                        <div className="bg-white rounded-lg shadow-sm p-4 border">
                            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">২</span>
                                তথ্য প্রদানকারী
                            </h3>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <label className="block text-xs font-medium mb-1">
                                        তথ্য প্রদানকারীর নাম: <span className="text-red-600">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={data.information_provider_name}
                                        onChange={(e) => {
                                            setData('information_provider_name', e.target.value);
                                            if (errors.information_provider_name) {
                                                setErrors(prev => {
                                                    const newErrors = { ...prev };
                                                    delete newErrors.information_provider_name;
                                                    return newErrors;
                                                });
                                            }
                                        }}
                                        className={`w-full px-2 py-1.5 text-sm border rounded-md ${errors.information_provider_name ? 'border-red-500 bg-red-50' : ''}`}
                                    />
                                    {errors.information_provider_name && (
                                        <p className="text-xs text-red-600 mt-0.5">{errors.information_provider_name}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">মোবাইল নং</label>
                                    <input
                                        type="text"
                                        value={data.information_provider_mobile}
                                        onChange={(e) => setData('information_provider_mobile', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium mb-1">
                                        সদস্যের সাথে সম্পর্ক: <span className="text-red-600">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={data.relationship_with_member}
                                        onChange={(e) => {
                                            setData('relationship_with_member', e.target.value);
                                            if (errors.relationship_with_member) {
                                                setErrors(prev => {
                                                    const newErrors = { ...prev };
                                                    delete newErrors.relationship_with_member;
                                                    return newErrors;
                                                });
                                            }
                                        }}
                                        placeholder="যেমন: স্বামী, পিতা"
                                        className={`w-full px-2 py-1.5 text-sm border rounded-md ${errors.relationship_with_member ? 'border-red-500 bg-red-50' : ''}`}
                                    />
                                    {errors.relationship_with_member && (
                                        <p className="text-xs text-red-600 mt-0.5">{errors.relationship_with_member}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Table Data Input */}
                        <div className="bg-white rounded-lg shadow-sm p-4 border">
                            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">৩</span>
                                তদন্ত তথ্য
                            </h3>
                            <div className="space-y-4 text-sm">
                                {/* Row 1 */}
                                <div>
                                    <label className="block text-xs font-medium mb-1">মূল পেশা</label>
                                    <input
                                        type="text"
                                        value={data.main_profession}
                                        onChange={(e) => setData('main_profession', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium mb-1">পরিবারের লোক সংখ্যা</label>
                                        <input
                                            type="number"
                                            value={data.family_members_count}
                                            onChange={(e) => setData('family_members_count', parseInt(e.target.value))}
                                            className="w-full px-2 py-1.5 text-sm border rounded-md"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1">উপার্জনকারী সংখ্যা</label>
                                        <input
                                            type="number"
                                            value={data.earning_members_count}
                                            onChange={(e) => setData('earning_members_count', parseInt(e.target.value))}
                                            className="w-full px-2 py-1.5 text-sm border rounded-md"
                                        />
                                    </div>
                                </div>

                                {/* Row 2 */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium mb-1">বিগত দফায় পরিশোধিত ঋণ</label>
                                        <input
                                            type="number"
                                            value={data.previous_loan_amount}
                                            onChange={(e) => setData('previous_loan_amount', parseFloat(e.target.value))}
                                            className="w-full px-2 py-1.5 text-sm border rounded-md"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1">বর্তমান ঋণের চাহিদা</label>
                                        <input
                                            type="number"
                                            value={data.current_loan_demand}
                                            onChange={(e) => setData('current_loan_demand', parseFloat(e.target.value))}
                                            className="w-full px-2 py-1.5 text-sm border rounded-md"
                                        />
                                    </div>
                                </div>

                                {/* Row 3 */}
                                <div>
                                    <label className="block text-xs font-medium mb-1">নিজস্ব জমির পরিমাণ</label>
                                    <input
                                        type="text"
                                        value={data.own_land_amount}
                                        onChange={(e) => setData('own_land_amount', e.target.value)}
                                        placeholder="যেমন: ৫ কাঠা"
                                        className="w-full px-2 py-1.5 text-sm border rounded-md"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium mb-1">বন্ধকী জমির পরিমাণ</label>
                                        <input
                                            type="text"
                                            value={data.mortgaged_land_amount}
                                            onChange={(e) => setData('mortgaged_land_amount', e.target.value)}
                                            className="w-full px-2 py-1.5 text-sm border rounded-md"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1">মূল্য (৳)</label>
                                        <input
                                            type="number"
                                            value={data.land_value}
                                            onChange={(e) => setData('land_value', parseFloat(e.target.value))}
                                            className="w-full px-2 py-1.5 text-sm border rounded-md"
                                        />
                                    </div>
                                </div>

                                {/* Row 4 */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium mb-1">বাড়ীর ধরণ</label>
                                        <select
                                            value={data.house_type}
                                            onChange={(e) => setData('house_type', e.target.value)}
                                            className="w-full px-2 py-1.5 text-sm border rounded-md"
                                        >
                                            <option value="">নির্বাচন করুন</option>
                                            <option value="ছাপড়া">ছাপড়া</option>
                                            <option value="টিন">টিন</option>
                                            <option value="মাটি">মাটি</option>
                                            <option value="পাকা">পাকা</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1">ঘরের সংখ্যা</label>
                                        <input
                                            type="number"
                                            value={data.room_count}
                                            onChange={(e) => setData('room_count', parseInt(e.target.value))}
                                            className="w-full px-2 py-1.5 text-sm border rounded-md"
                                        />
                                    </div>
                                </div>

                                {/* Row 5 */}
                                <div>
                                    <label className="block text-xs font-medium mb-2">টিউবওয়েল ও পায়খানা</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={data.has_tubewell}
                                                    onChange={(e) => setData('has_tubewell', e.target.checked)}
                                                    className="w-4 h-4"
                                                />
                                                <span className="text-xs">নিজস্ব টিউবওয়েল আছে</span>
                                            </label>
                                        </div>
                                        <div>
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={data.has_latrine}
                                                    onChange={(e) => setData('has_latrine', e.target.checked)}
                                                    className="w-4 h-4"
                                                />
                                                <span className="text-xs">স্বাস্থ্যসম্মত পায়খানা আছে</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Row 6 */}
                                <div>
                                    <label className="block text-xs font-medium mb-1">গবাদি পশুর সংখ্যা</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs mb-1">গরু</label>
                                            <input
                                                type="number"
                                                value={data.cow_count}
                                                onChange={(e) => setData('cow_count', parseInt(e.target.value))}
                                                className="w-full px-2 py-1.5 text-sm border rounded-md"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs mb-1">মহিষ</label>
                                            <input
                                                type="number"
                                                value={data.buffalo_count}
                                                onChange={(e) => setData('buffalo_count', parseInt(e.target.value))}
                                                className="w-full px-2 py-1.5 text-sm border rounded-md"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs mb-1">ছাগল</label>
                                            <input
                                                type="number"
                                                value={data.goat_count}
                                                onChange={(e) => setData('goat_count', parseInt(e.target.value))}
                                                className="w-full px-2 py-1.5 text-sm border rounded-md"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs mb-1">ভেড়া</label>
                                            <input
                                                type="number"
                                                value={data.sheep_count}
                                                onChange={(e) => setData('sheep_count', parseInt(e.target.value))}
                                                className="w-full px-2 py-1.5 text-sm border rounded-md"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs mb-1">হাঁস-মুরগী</label>
                                            <input
                                                type="number"
                                                value={data.duck_chicken_count}
                                                onChange={(e) => setData('duck_chicken_count', parseInt(e.target.value))}
                                                className="w-full px-2 py-1.5 text-sm border rounded-md"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Row 7 */}
                                <div>
                                    <label className="block text-xs font-medium mb-1">স্কুলে/কলেজে পড়ে এমন ছেলে-মেয়ের সংখ্যা</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs mb-1">প্রাথমিক স্কুল</label>
                                            <input
                                                type="number"
                                                value={data.primary_school_count}
                                                onChange={(e) => setData('primary_school_count', parseInt(e.target.value))}
                                                className="w-full px-2 py-1.5 text-sm border rounded-md"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs mb-1">মাধ্যমিক স্কুল</label>
                                            <input
                                                type="number"
                                                value={data.secondary_school_count}
                                                onChange={(e) => setData('secondary_school_count', parseInt(e.target.value))}
                                                className="w-full px-2 py-1.5 text-sm border rounded-md"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs mb-1">কলেজ</label>
                                            <input
                                                type="number"
                                                value={data.college_count}
                                                onChange={(e) => setData('college_count', parseInt(e.target.value))}
                                                className="w-full px-2 py-1.5 text-sm border rounded-md"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs mb-1">মাদ্রাসা</label>
                                            <input
                                                type="number"
                                                value={data.madrasah_count}
                                                onChange={(e) => setData('madrasah_count', parseInt(e.target.value))}
                                                className="w-full px-2 py-1.5 text-sm border rounded-md"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs mb-1">বিশ্ববিদ্যালয়</label>
                                            <input
                                                type="number"
                                                value={data.university_count}
                                                onChange={(e) => setData('university_count', parseInt(e.target.value))}
                                                className="w-full px-2 py-1.5 text-sm border rounded-md"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Row 8 */}
                                <div>
                                    <label className="block text-xs font-medium mb-1">সঞ্চয়ের পরিমাণ (৳)</label>
                                    <input
                                        type="number"
                                        value={data.savings_amount}
                                        onChange={(e) => setData('savings_amount', parseFloat(e.target.value))}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md"
                                    />
                                </div>

                                {/* Row 9 */}
                                <div>
                                    <label className="block text-xs font-medium mb-1">সদস্যের বাড়ী চেনার নির্দেশনা</label>
                                    <textarea
                                        value={data.house_identification}
                                        onChange={(e) => setData('house_identification', e.target.value)}
                                        rows={3}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md"
                                        placeholder="বাড়ী চেনার জন্য নির্দেশনা লিখুন"
                                    />
                                </div>

                                {/* Row 10 */}
                                <div>
                                    <label className="block text-xs font-medium mb-1">অন্যান্য সংস্থা হতে ঋণ গ্রহণের তথ্য</label>
                                    <textarea
                                        value={data.other_organization_loans}
                                        onChange={(e) => setData('other_organization_loans', e.target.value)}
                                        rows={3}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md"
                                        placeholder="অন্যান্য সংস্থা থেকে ঋণের তথ্য"
                                    />
                                </div>

                                {/* Row 11 */}
                                <div>
                                    <label className="block text-xs font-medium mb-1">বিগত দফার পরিশোধের ধরণ</label>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="previous_repayment_type"
                                                value="installment"
                                                checked={data.previous_repayment_type === 'installment'}
                                                onChange={(e) => setData('previous_repayment_type', e.target.value)}
                                                className="w-4 h-4"
                                            />
                                            <span className="text-xs">কিস্তিতে পরিশোধ করেছেন</span>
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="previous_repayment_type"
                                                value="savings_adjustment"
                                                checked={data.previous_repayment_type === 'savings_adjustment'}
                                                onChange={(e) => setData('previous_repayment_type', e.target.value)}
                                                className="w-4 h-4"
                                            />
                                            <span className="text-xs">সঞ্চয়ের সাথে সমন্বয় করেছেন</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Row 12 */}
                                <div>
                                    <label className="block text-xs font-medium mb-1">গত ৬ মাসে/১ বছরে কতবার সঞ্চয় খেলাপী করেছেন</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs mb-1">সাধারণ</label>
                                            <input
                                                type="number"
                                                value={data.general_savings_default_count}
                                                onChange={(e) => setData('general_savings_default_count', parseInt(e.target.value))}
                                                className="w-full px-2 py-1.5 text-sm border rounded-md"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs mb-1">আপদকালীন</label>
                                            <input
                                                type="number"
                                                value={data.emergency_savings_default_count}
                                                onChange={(e) => setData('emergency_savings_default_count', parseInt(e.target.value))}
                                                className="w-full px-2 py-1.5 text-sm border rounded-md"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs mb-1">মেয়াদী</label>
                                            <input
                                                type="number"
                                                value={data.term_savings_default_count}
                                                onChange={(e) => setData('term_savings_default_count', parseInt(e.target.value))}
                                                className="w-full px-2 py-1.5 text-sm border rounded-md"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Row 13 */}
                                <div>
                                    <label className="block text-xs font-medium mb-1">বর্তমানে সদস্যের মেয়াদী সঞ্চয়ের কয়টি কিস্তি বাঁকী আছে</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs mb-1">কিস্তি সংখ্যা</label>
                                            <input
                                                type="number"
                                                value={data.term_savings_due_installments}
                                                onChange={(e) => setData('term_savings_due_installments', parseInt(e.target.value))}
                                                className="w-full px-2 py-1.5 text-sm border rounded-md"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs mb-1">টাকার পরিমাণ (৳)</label>
                                            <input
                                                type="number"
                                                value={data.term_savings_due_amount}
                                                onChange={(e) => setData('term_savings_due_amount', parseFloat(e.target.value))}
                                                className="w-full px-2 py-1.5 text-sm border rounded-md"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Dates */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium mb-1">
                                            সরেজমিনে পরিদর্শনের তারিখ: <span className="text-red-600">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={data.field_visit_date}
                                            onChange={(e) => {
                                                setData('field_visit_date', e.target.value);
                                                if (errors.field_visit_date) {
                                                    setErrors(prev => {
                                                        const newErrors = { ...prev };
                                                        delete newErrors.field_visit_date;
                                                        return newErrors;
                                                    });
                                                }
                                            }}
                                            className={`w-full px-2 py-1.5 text-sm border rounded-md ${errors.field_visit_date ? 'border-red-500 bg-red-50' : ''}`}
                                        />
                                        {errors.field_visit_date && (
                                            <p className="text-xs text-red-600 mt-0.5">{errors.field_visit_date}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1">ঋণ প্রদানের তারিখ</label>
                                        <input
                                            type="date"
                                            value={data.loan_disbursement_date}
                                            onChange={(e) => setData('loan_disbursement_date', e.target.value)}
                                            className="w-full px-2 py-1.5 text-sm border rounded-md"
                                        />
                                    </div>
                                </div>

                                {/* Comments */}
                                <div>
                                    <label className="block text-xs font-medium mb-1">মন্তব্য</label>
                                    <textarea
                                        value={data.comments}
                                        onChange={(e) => setData('comments', e.target.value)}
                                        rows={4}
                                        className="w-full px-2 py-1.5 text-sm border rounded-md"
                                        placeholder="মন্তব্য লিখুন"
                                    />
                                </div>

                                {/* Signatures */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium mb-1">সদস্য/তথ্য প্রদানকারীর স্বাক্ষর:</label>
                                        {data.member_signature ? (
                                            <div className="relative">
                                                <img src={data.member_signature} alt="Signature" className="h-16 w-32 object-contain border rounded" />
                                                <button onClick={() => removeImage('member_signature')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex items-center gap-2 px-3 py-2 bg-gray-100 border border-dashed rounded cursor-pointer hover:bg-gray-200 w-fit">
                                                <Upload className="w-4 h-4" />
                                                <span className="text-xs">Upload</span>
                                                <input type="file" accept="image/png,image/jpg,image/jpeg" onChange={(e) => handleImageUpload('member_signature', e.target.files?.[0] || null)} className="hidden" />
                                            </label>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1">শাখা ব্যবস্থাপকের স্বাক্ষর ও সিল:</label>
                                        {data.branch_manager_signature ? (
                                            <div className="relative">
                                                <img src={data.branch_manager_signature} alt="Signature" className="h-16 w-32 object-contain border rounded" />
                                                <button onClick={() => removeImage('branch_manager_signature')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex items-center gap-2 px-3 py-2 bg-gray-100 border border-dashed rounded cursor-pointer hover:bg-gray-200 w-fit">
                                                <Upload className="w-4 h-4" />
                                                <span className="text-xs">Upload</span>
                                                <input type="file" accept="image/png,image/jpg,image/jpeg" onChange={(e) => handleImageUpload('branch_manager_signature', e.target.files?.[0] || null)} className="hidden" />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT SIDE: PREVIEW */}
                    <div className="lg:sticky lg:top-4 lg:h-fit print:block print-container">
                        <div className="bg-white rounded-lg shadow-lg p-4 print:shadow-none print:p-2 print:rounded-none print:bg-white">
                            <h3 className="text-sm font-bold mb-3 print:hidden">Preview</h3>
                            {renderPreview()}
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
