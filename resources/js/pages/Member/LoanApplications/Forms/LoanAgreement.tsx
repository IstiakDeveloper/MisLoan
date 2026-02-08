import { useState, useEffect } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Printer, Save, Eye, Calculator, Upload, X } from 'lucide-react';

interface Props {
    member: any;
    loanProduct: any;
    loanCategory: any;
    requestedAmount: number;
    branch?: any;
    auth?: any;
}

export default function LoanAgreement({ member, loanProduct, loanCategory, requestedAmount, branch, auth }: Props) {
    const [showPreview, setShowPreview] = useState(false);

    const { data, setData, post, processing } = useForm({
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

    const formatDateBangla = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
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

    return (
        <AdminLayout>
            <Head title="ঋণ চুক্তিপত্র - Loan Agreement" />

            <div className="max-w-[1600px] mx-auto p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 print:hidden">
                    <div>
                        <h1 className="text-lg font-bold">ঋণ চুক্তিপত্র (Loan Agreement)</h1>
                        <p className="text-xs text-gray-600">Fill form to generate complete loan agreement</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleGenerate}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                        >
                            <Calculator className="w-4 h-4" />
                            Calculate & Preview
                        </button>
                        {showPreview && (
                            <>
                                <button
                                    onClick={() => post('/member/loan-applications/forms/loan-agreement/save')}
                                    disabled={processing}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                                >
                                    <Save className="w-4 h-4" />
                                    Save
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800"
                                >
                                    <Printer className="w-4 h-4" />
                                    Print
                                </button>
                            </>
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
                        <div className="bg-white rounded-lg shadow-sm p-4 border border-green-200 bg-green-50">
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
                        <div className="lg:sticky lg:top-4 lg:h-fit print:block">
                            <div className="bg-white rounded-lg shadow-lg p-8 print:shadow-none print:p-12">
                                {/* Header */}
                                <div className="text-center mb-6 border-b-2 pb-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-20 h-20 border-2 border-black rounded flex items-center justify-center flex-shrink-0">
                                            <span className="text-xl font-bold">মৌসুমী</span>
                                        </div>
                                        <div className="flex-1 text-center px-4">
                                            <h1 className="text-2xl font-bold mb-1">{data.branch_name}</h1>
                                            <p className="text-xs">{data.branch_address}</p>
                                            <p className="text-xs font-semibold">(ঋণ চুক্তিপত্র)</p>
                                        </div>
                                        <div className="w-20"></div>
                                    </div>
                                    <div className="text-right text-xs">
                                        <p>ঋণ কর্মসূচির নাম: <span className="border-b border-dotted">{data.loan_category_name}</span></p>
                                    </div>
                                </div>

                                {/* ১ম পক্ষ */}
                                <div className="mb-4 text-xs">
                                    <p className="font-bold mb-1">১ম পক্ষ (ঋণ দাতা)</p>
                                    <p>সংস্থার নাম: {data.branch_name}</p>
                                    <p>ঠিকানা: {data.branch_address}</p>
                                </div>

                                {/* ২য় পক্ষ */}
                                <div className="mb-4 text-xs">
                                    <p className="font-bold mb-2">২য় পক্ষ (ঋণ গ্রহীতা)</p>
                                    <div className="space-y-1">
                                        <p>নাম: <span className="border-b border-dotted px-2">{data.member_name_bn}</span> তারিখ: <span className="border-b border-dotted px-2">{formatDateBangla(data.disbursement_date)}</span></p>
                                        <p>সমিতির নাম: <span className="border-b border-dotted px-2">{data.samity_name}</span> পিতা/স্বামী: <span className="border-b border-dotted px-2">{data.father_husband_name}</span> মাতার নাম: <span className="border-b border-dotted px-2">{data.mother_name}</span></p>
                                        <p>শনাক্তকরণ: <span className="border-b border-dotted px-2">{data.nid_number}</span> গ্রাম: <span className="border-b border-dotted px-2">{data.village}</span> ইউনিয়ন: <span className="border-b border-dotted px-2">{data.union}</span></p>
                                        <p>উপজেলা: <span className="border-b border-dotted px-2">{data.upazila}</span> জেলা: <span className="border-b border-dotted px-2">{data.district}</span></p>
                                    </div>
                                    <p className="mt-2 text-justify">(১) ২য় পক্ষ ১ম পক্ষকে ঋণ বাবদ <span className="font-bold">{data.loan_amount.toLocaleString()} টাকা</span> নিচে উল্লেখিত শর্তে গ্রহণ করিতে রাজী।</p>
                                </div>

                                {/* ঋণের বিবরণ Table */}
                                <div className="mb-4">
                                    <h3 className="text-xs font-bold mb-2 text-center">ঋণের বিবরণ</h3>
                                    <table className="w-full border-collapse border border-gray-400 text-xs">
                                        <thead>
                                            <tr className="bg-gray-100">
                                                <th className="border border-gray-400 p-1">প্রকল্প</th>
                                                <th className="border border-gray-400 p-1">মেয়াদ</th>
                                                <th className="border border-gray-400 p-1">নাম</th>
                                                <th className="border border-gray-400 p-1">পরিমাণ<br/>(সা.খা.সহ)</th>
                                                <th className="border border-gray-400 p-1">প্রদান</th>
                                                <th className="border border-gray-400 p-1">শেষ তারিখ</th>
                                                <th className="border border-gray-400 p-1">কিস্তি সংখ্যা</th>
                                                <th className="border border-gray-400 p-1">কিস্তির পরিমাণ</th>
                                                <th className="border border-gray-400 p-1">শেষ কিস্তি</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className="border border-gray-400 p-1 text-center">{data.loan_purpose}</td>
                                                <td className="border border-gray-400 p-1 text-center">{data.loan_duration_months} মাস</td>
                                                <td className="border border-gray-400 p-1">{data.member_name_bn}</td>
                                                <td className="border border-gray-400 p-1 text-right font-bold">{data.total_amount.toLocaleString()}</td>
                                                <td className="border border-gray-400 p-1 text-center">{formatDateBangla(data.disbursement_date)}</td>
                                                <td className="border border-gray-400 p-1 text-center">{formatDateBangla(data.last_installment_date)}</td>
                                                <td className="border border-gray-400 p-1 text-center">{data.number_of_installments}</td>
                                                <td className="border border-gray-400 p-1 text-right">{data.installment_amount.toLocaleString()}</td>
                                                <td className="border border-gray-400 p-1 text-right">{data.last_installment_amount.toLocaleString()}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Terms */}
                                <div className="space-y-1 text-xs mb-6">
                                    <p>(২) গৃহীত ঋণের পরিবর্তে উল্লিখিত উদাহরণ ঋণ রূপ রক্ষণ কোনো প্রকার শর্তে কিংবা চুক্তি পরিবর্তনে পরিবর্তিত বাজারমূল্য মতে পরিশোধ না।</p>
                                    <p>(৩) স্বরণী স্থানের শর্তবর্তীকে বাংলাদেশ নিয়ম করার যোগ্য দৃষ্টিকোণে সিদ্ধান্ত নিতে হবে।</p>
                                    <p>(৪) ঋণ নেওয়ার জন্য যদি কোনো প্রয়োজন যদি সাক্ষ শতকরা নির্দিষ্ট {loanProduct?.interest_rate || 0}% হারে প্রযোজ্য।</p>
                                    <p>(৫) থেকে (১১) পর্যন্ত বাকি শর্তাবলী অপরিবর্তিত থাকবে।</p>
                                </div>

                                <p className="text-xs mb-6">এইমার্মে আজ উভয় পক্ষ এই চুক্তিতে স্বাক্ষর করলাম।</p>

                                {/* টিম্বচট */}
                                <div className="border-2 border-black p-3 inline-block float-right mb-4">
                                    <p className="text-xs font-bold">টিম্বচট</p>
                                </div>

                                <div className="clear-both"></div>

                                {/* ২য় পক্ষ স্বাক্ষর */}
                                <div className="mb-8 text-xs">
                                    <p className="font-bold mb-2">২য় পক্ষের স্বাক্ষর:</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="mb-1">ঋণ গ্রহীতার স্বাক্ষর:</p>
                                            {data.applicant_signature_image && (
                                                <img src={data.applicant_signature_image} alt="Signature" className="h-12 w-24 object-contain mb-1" />
                                            )}
                                            <p className="mb-3">নাম: {data.applicant_signature_name || data.member_name_bn}</p>
                                            <p className="mb-1">অভিভাবক স্বাক্ষর:</p>
                                            {data.guardian_signature_image && (
                                                <img src={data.guardian_signature_image} alt="Signature" className="h-12 w-24 object-contain mb-1" />
                                            )}
                                            <p>নাম: {data.guardian_name}</p>
                                        </div>
                                        <div>
                                            <p className="mb-1">মোবাইল নং:</p>
                                            <div className="grid grid-cols-10 gap-1">
                                                {data.mobile_number.split('').map((digit, i) => (
                                                    <div key={i} className="border border-gray-400 h-6 flex items-center justify-center text-xs">{digit}</div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Page 2 */}
                                <div className="page-break mt-8 pt-8">
                                    {/* সাক্ষী */}
                                    <div className="mb-6 text-xs">
                                        <p className="mb-1">১. সভানেত্রী স্বাক্ষর:</p>
                                        {data.president_signature_image && (
                                            <img src={data.president_signature_image} alt="Signature" className="h-12 w-24 object-contain mb-1" />
                                        )}
                                        <p className="mb-3">নাম: {data.president_name}</p>
                                        <p className="mb-1">২. সম্পাদিকা স্বাক্ষর:</p>
                                        {data.secretary_signature_image && (
                                            <img src={data.secretary_signature_image} alt="Signature" className="h-12 w-24 object-contain mb-1" />
                                        )}
                                        <p className="mb-3">নাম: {data.secretary_name}</p>
                                    </div>

                                    {/* সম্পত্তি */}
                                    <div className="mb-6 text-xs">
                                        <p className="font-semibold mb-2">আবেদনকারী:</p>
                                        <p>বাড়ি: {data.house_acres} একর {data.house_decimal} শতাংশ | মূল্য: {data.house_value} টাকা।</p>
                                        <p>জমি: {data.land_acres} একর {data.land_decimal} শতাংশ | মূল্য: {data.land_value} টাকা।</p>
                                    </div>

                                    {/* ১ম পক্ষ */}
                                    <div className="mb-6 text-xs">
                                        <p className="font-bold mb-3">১ম পক্ষ:</p>
                                        <div className="grid grid-cols-3 gap-6">
                                            <div>
                                                <p className="mb-1">অফিসার স্বাক্ষর:</p>
                                                {data.credit_officer_signature && (
                                                    <img src={data.credit_officer_signature} alt="Signature" className="h-10 w-20 object-contain mb-1" />
                                                )}
                                                <p className="mb-1">নাম: {data.credit_officer_name}</p>
                                                <p>পিন: {data.credit_officer_pin}</p>
                                            </div>
                                            <div>
                                                <p className="mb-1">ফিল্ড অফিসার স্বাক্ষর:</p>
                                                {data.field_officer_signature && (
                                                    <img src={data.field_officer_signature} alt="Signature" className="h-10 w-20 object-contain mb-1" />
                                                )}
                                                <p className="mb-1">নাম: {data.field_officer_name}</p>
                                                <p>পিন: {data.field_officer_pin}</p>
                                            </div>
                                            <div>
                                                <p className="mb-1">ম্যানেজার স্বাক্ষর:</p>
                                                {data.branch_manager_signature && (
                                                    <img src={data.branch_manager_signature} alt="Signature" className="h-10 w-20 object-contain mb-1" />
                                                )}
                                                <p className="mb-1">নাম: {data.branch_manager_name}</p>
                                                <p>পিন: {data.branch_manager_pin}</p>
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
