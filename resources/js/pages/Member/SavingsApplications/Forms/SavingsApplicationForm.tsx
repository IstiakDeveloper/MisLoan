import { useState, useEffect, useMemo } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Plus, Printer, Save, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface SavingsFormData {
    // Office use
    account_opening_date: string;
    monthly_savings_amount: number;
    term_years: number | null;
    duration_months: number | null;
    account_no: string;
    member_no: string;
    
    // Applicant photo
    applicant_photo: string | null;
    
    // Applicant details
    applicant_name_bn: string;
    applicant_name_en: string;
    nid_number: string;
    father_husband_guardian: string;
    current_address_village: string;
    current_address_post_office: string;
    current_address_upazila: string;
    current_address_district: string;
    permanent_address_village: string;
    permanent_address_post_office: string;
    permanent_address_upazila: string;
    permanent_address_district: string;
    profession: string;
    source_of_income: string;
    
    // Nominees (up to 3)
    nominees: Array<{
        name: string;
        relation: string;
        signature: string | null;
        percentage: number;
        photo: string | null;
        nid_birth_registration: string;
    }>;
    
    // Nominee NID/Birth Registration
    nominee_nid_birth_registration: string;
    
    // Monthly deposit submission date
    monthly_deposit_submission_date: string;
    
    // Signatures
    applicant_signature: string | null;
    officer_signature: string | null;
    officer_pin: string;
    accountant_signature: string | null;
    accountant_pin: string;
    branch_manager_signature: string | null;
    branch_manager_pin: string;
    
    // Branch info
    branch_name: string;
    branch_address: string;
    area_name: string;
}

interface Props {
    memberAdmission: any;
    savingsProduct: any;
    branch: any;
    existingApplication?: any;
    savedData?: any;
    onlyPreview?: boolean;
}

const formatDateBangla = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

/** Print/Preview view - matches the exact form layout */
export function SavingsApplicationPrintView({ data }: { data: SavingsFormData }) {
    const d = data || {};
    const fmt = formatDateBangla;
    const num = (v: any) => (v != null && v !== '' ? Number(v) : 0);
    const str = (v: any) => (v != null && v !== '' ? String(v) : '');
    
    return (
        <div className="bg-white border border-gray-300 p-4 rounded-lg" style={{ fontFamily: 'system-ui, Arial, sans-serif', fontSize: '13px', maxWidth: '100%' }}>
            {/* Header */}
            <div className="mb-3 pb-2 border-b-2 border-gray-400">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" alt="Logo" style={{ height: '40px', width: '40px', objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        <div>
                            <p className="font-bold mb-0" style={{ fontSize: '18px', fontWeight: 'bold' }}>মৌসুমী</p>
                            <p className="leading-tight" style={{ fontSize: '12px' }}>{str(d.branch_address)}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="font-bold" style={{ fontSize: '16px' }}>মেয়াদী সঞ্চয় কর্মসূচির আবেদনপত্র</p>
                        <p style={{ fontSize: '12px' }}>Fixed Deposit Scheme Application Form</p>
                    </div>
                </div>
            </div>

            {/* Office Use Section */}
            <div className="mb-3 grid grid-cols-2 gap-4" style={{ fontSize: '12px' }}>
                <div className="border border-gray-400 p-2">
                    <p className="font-bold mb-2">অফিস কর্তৃক পূরণীয়:</p>
                    <div className="space-y-1">
                        <p>হিসাব খোলার তারিখ: <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px]">{fmt(d.account_opening_date)}</span></p>
                        <p>মাসিক সঞ্চয়ের পরিমাণ: <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px]">{num(d.monthly_savings_amount).toLocaleString('bn-BD')}</span> টাকা</p>
                        <p>মেয়াদ: 
                            <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-2">
                                {(d as any).duration_months != null
                                    ? (d as any).duration_months >= 12
                                        ? `${Math.round((d as any).duration_months / 12)} বছর`
                                        : `${(d as any).duration_months} মাস`
                                    : d.term_years === 5 ? '৫ বছর' : d.term_years === 10 ? '১০ বছর' : ''}
                            </span>
                        </p>
                        <p>হিসাব নং: <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px]">{str(d.account_no)}</span></p>
                        <p>সদস্য নং: <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px]">{str(d.member_no)}</span></p>
                    </div>
                </div>
                <div className="border border-gray-400 p-2 flex items-center justify-center">
                    <div className="text-center">
                        <p className="mb-2" style={{ fontSize: '11px' }}>আবেদনকারীর ছবি</p>
                        {d.applicant_photo ? (
                            <img src={d.applicant_photo} alt="Applicant" style={{ width: '100px', height: '120px', objectFit: 'cover', border: '1px solid #ccc' }} />
                        ) : (
                            <div style={{ width: '100px', height: '120px', border: '1px solid #ccc', backgroundColor: '#f5f5f5' }}></div>
                        )}
                    </div>
                </div>
            </div>

            {/* Applicant Details */}
            <div className="mb-3" style={{ fontSize: '12px' }}>
                <p className="mb-1">বরাবর শাখা ব্যবস্থাপক</p>
                <p className="mb-1">শাখা: <span className="border-b border-dotted border-gray-600 inline-block min-w-[150px]">{str(d.branch_name)}</span> অঞ্চল: <span className="border-b border-dotted border-gray-600 inline-block min-w-[150px]">{str(d.area_name)}</span></p>
                <p className="mb-2">জনাব</p>
                <p className="mb-1">আমি <span className="border-b border-dotted border-gray-600 inline-block min-w-[200px]">{str(d.applicant_name_bn)}</span> জাতীয় পরিচয়পত্র নং: <span className="border-b border-dotted border-gray-600 inline-block min-w-[150px]">{str(d.nid_number)}</span></p>
                <p className="mb-1">পিতা/স্বামী/অভিভাবক: <span className="border-b border-dotted border-gray-600 inline-block min-w-[200px]">{str(d.father_husband_guardian)}</span></p>
                <p className="mb-1">বর্তমান ঠিকানা: গ্রাম <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px]">{str(d.current_address_village)}</span>, ডাকঘর <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px]">{str(d.current_address_post_office)}</span>, উপজেলা <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px]">{str(d.current_address_upazila)}</span>, জেলা <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px]">{str(d.current_address_district)}</span></p>
                <p className="mb-1">স্থায়ী ঠিকানা: গ্রাম <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px]">{str(d.permanent_address_village)}</span>, ডাকঘর <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px]">{str(d.permanent_address_post_office)}</span>, উপজেলা <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px]">{str(d.permanent_address_upazila)}</span>, জেলা <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px]">{str(d.permanent_address_district)}</span></p>
                <p className="mb-1">পেশা: <span className="border-b border-dotted border-gray-600 inline-block min-w-[150px]">{str(d.profession)}</span> আয়ের উৎস: <span className="border-b border-dotted border-gray-600 inline-block min-w-[150px]">{str(d.source_of_income)}</span></p>
            </div>

            {/* Declaration */}
            <div className="mb-3 p-2 border border-gray-400" style={{ fontSize: '11px', lineHeight: '1.6' }}>
                <p className="mb-1">আমি উক্ত সংস্থার নিয়ম-কানুন ও শর্তাবলী জানি এবং তা মেনে চলার জন্য সম্মত আছি। আমি মেয়াদী সঞ্চয় কর্মসূচিতে অংশগ্রহণের জন্য আবেদন করছি। আমার অনুপস্থিতিতে (মৃত্যু) উল্লেখিত নমিনি/নমিনিগণ উপযুক্ত কাগজপত্র দাখিল করে সঞ্চয়ের টাকা উত্তোলন করতে পারবেন।</p>
            </div>

            {/* Nominee Table */}
            <div className="mb-3">
                <table className="w-full border-collapse border border-gray-600" style={{ fontSize: '11px' }}>
                    <thead>
                        <tr className="text-center bg-gray-100">
                            <th className="border border-gray-600 px-1 py-1">ক্র.নং</th>
                            <th className="border border-gray-600 px-1 py-1">নমিনি/নমিনিগণের নাম</th>
                            <th className="border border-gray-600 px-1 py-1">সম্পর্ক</th>
                            <th className="border border-gray-600 px-1 py-1">নমিনি/নমিনিগণের<br/>স্বাক্ষর/টিপসহি</th>
                            <th className="border border-gray-600 px-1 py-1">প্রাপ্য অংশ %</th>
                            <th className="border border-gray-600 px-1 py-1">ছবি</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(Array.isArray(d.nominees) ? d.nominees : []).map((nominee: any, idx: number) => (
                            <tr key={idx}>
                                <td className="border border-gray-600 px-1 py-1 text-center">{idx + 1}</td>
                                <td className="border border-gray-600 px-1 py-1">{str(nominee?.name)}</td>
                                <td className="border border-gray-600 px-1 py-1">{str(nominee?.relation)}</td>
                                <td className="border border-gray-600 px-1 py-1 text-center">
                                    {nominee?.signature && <img src={nominee.signature} alt="Signature" style={{ height: '20px', width: '60px', objectFit: 'contain' }} />}
                                </td>
                                <td className="border border-gray-600 px-1 py-1 text-center">{num(nominee?.percentage)}%</td>
                                <td className="border border-gray-600 px-1 py-1 text-center">
                                    {nominee?.photo ? (
                                        <img src={nominee.photo} alt="Nominee" style={{ width: '40px', height: '50px', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '40px', height: '50px', border: '1px solid #ccc', backgroundColor: '#f5f5f5', margin: '0 auto' }}></div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <p className="mt-1 text-xs" style={{ fontSize: '10px' }}>নমিনির ছবি (ছবির পেছনে নমিনির স্বাক্ষর থাকতে হবে এবং ছবিটি সদস্য কর্তৃক সত্যায়িত হওয়া আবশ্যক)</p>
            </div>

            {/* Nominee NID/Birth Registration */}
            <div className="mb-3" style={{ fontSize: '12px' }}>
                <p>নমিনি/নমিনিগণের জাতীয় পরিচয়পত্র/জন্ম নিবন্ধন নং: <span className="border-b border-dotted border-gray-600 inline-block min-w-[300px]">{str(d.nominee_nid_birth_registration)}</span></p>
                <p>মাসিক জমা প্রদানের তারিখ: <span className="border-b border-dotted border-gray-600 inline-block min-w-[150px]">{fmt(d.monthly_deposit_submission_date)}</span></p>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-4 mt-4" style={{ fontSize: '12px' }}>
                <div>
                    <p className="mb-2">আবেদনকারীর স্বাক্ষর:</p>
                    {d.applicant_signature && <img src={d.applicant_signature} alt="Applicant Signature" style={{ height: '30px', width: '80px', objectFit: 'contain' }} />}
                    <p className="mt-1">নাম: <span className="border-b border-dotted border-gray-600 inline-block min-w-[180px]">{str(d.applicant_name_bn)}</span></p>
                </div>
                <div></div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4" style={{ fontSize: '12px' }}>
                <div>
                    <p className="mb-1">অফিসারের স্বাক্ষর:</p>
                    {d.officer_signature && <img src={d.officer_signature} alt="Officer Signature" style={{ height: '30px', width: '80px', objectFit: 'contain' }} />}
                    <p className="mt-1">PIN নং: <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px]">{str(d.officer_pin)}</span></p>
                </div>
                <div>
                    <p className="mb-1">হিসাবরক্ষকের স্বাক্ষর:</p>
                    {d.accountant_signature && <img src={d.accountant_signature} alt="Accountant Signature" style={{ height: '30px', width: '80px', objectFit: 'contain' }} />}
                    <p className="mt-1">PIN নং: <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px]">{str(d.accountant_pin)}</span></p>
                </div>
                <div>
                    <p className="mb-1">শাখা ব্যবস্থাপকের স্বাক্ষর:</p>
                    {d.branch_manager_signature && <img src={d.branch_manager_signature} alt="Branch Manager Signature" style={{ height: '30px', width: '80px', objectFit: 'contain' }} />}
                    <p className="mt-1">PIN নং: <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px]">{str(d.branch_manager_pin)}</span></p>
                </div>
            </div>
        </div>
    );
}

export default function SavingsApplicationForm({ memberAdmission, savingsProduct, branch, existingApplication, savedData, onlyPreview }: Props) {
    if (onlyPreview && savedData) {
        return (
            <div className="print-container">
                <SavingsApplicationPrintView data={savedData} />
            </div>
        );
    }

    const [showPreview, setShowPreview] = useState(false);
    const [imagePreview, setImagePreview] = useState<Record<string, string>>({});
    const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

    const durationMonths = existingApplication?.duration_months ?? savingsProduct?.duration_months ?? null;

    const { data, setData, post, processing } = useForm<SavingsFormData>({
        // Office use – auto from product
        account_opening_date: existingApplication?.account_opening_date || new Date().toISOString().split('T')[0],
        monthly_savings_amount: existingApplication?.monthly_savings_amount ?? savingsProduct?.min_amount ?? 0,
        term_years: existingApplication?.term_years ?? (durationMonths && durationMonths >= 12 ? Math.round(durationMonths / 12) : null),
        duration_months: durationMonths,
        account_no: existingApplication?.account_no || '',
        member_no: existingApplication?.member_no || memberAdmission?.application_no || '',
        
        // Applicant photo
        applicant_photo: existingApplication?.applicant_photo || null,
        
        // Applicant details
        applicant_name_bn: memberAdmission?.applicant_name_bn || '',
        applicant_name_en: memberAdmission?.applicant_name_en || '',
        nid_number: memberAdmission?.nid_number || '',
        father_husband_guardian: memberAdmission?.father_name_bn || memberAdmission?.spouse_name_bn || '',
        current_address_village: memberAdmission?.present_village_road || '',
        current_address_post_office: memberAdmission?.present_post_code || '',
        current_address_upazila: memberAdmission?.present_upazila || '',
        current_address_district: memberAdmission?.present_district || '',
        permanent_address_village: memberAdmission?.permanent_village_road || memberAdmission?.present_village_road || '',
        permanent_address_post_office: memberAdmission?.permanent_post_code || memberAdmission?.present_post_code || '',
        permanent_address_upazila: memberAdmission?.permanent_upazila || memberAdmission?.present_upazila || '',
        permanent_address_district: memberAdmission?.permanent_district || memberAdmission?.present_district || '',
        profession: existingApplication?.profession || '',
        source_of_income: existingApplication?.source_of_income || '',
        
        // Nominees – default one; user can add more via button
        nominees: (existingApplication?.nominee_info && existingApplication.nominee_info.length > 0)
            ? existingApplication.nominee_info.map((n: any) => ({
                name: n.name ?? '',
                relation: n.relation ?? '',
                signature: n.signature ?? null,
                percentage: Number(n.percentage) || 0,
                photo: n.photo ?? null,
                nid_birth_registration: n.nid ?? n.birth_registration_no ?? '',
              }))
            : [{ name: '', relation: '', signature: null, percentage: 0, photo: null, nid_birth_registration: '' }],
        
        // Nominee NID/Birth Registration
        nominee_nid_birth_registration: '',
        
        // Monthly deposit submission date
        monthly_deposit_submission_date: existingApplication?.monthly_deposit_submission_date || '',
        
        // Signatures
        applicant_signature: existingApplication?.applicant_signature || null,
        officer_signature: existingApplication?.officer_signature || null,
        officer_pin: existingApplication?.officer_pin || '',
        accountant_signature: existingApplication?.accountant_signature || null,
        accountant_pin: existingApplication?.accountant_pin || '',
        branch_manager_signature: existingApplication?.branch_manager_signature || null,
        branch_manager_pin: existingApplication?.branch_manager_pin || '',
        
        // Branch info
        branch_name: branch?.name || '',
        branch_address: branch?.address || '',
        area_name: branch?.area?.name || '',
    });

    // Get backend validation errors from Inertia
    const pageProps = usePage().props as any;
    const rawBackendErrors = pageProps?.errors || {};
    
    // Filter out errors if the actual values are present and valid
    // Use useMemo to recalculate when data changes
    const backendErrors = useMemo(() => {
        const filtered: Record<string, any> = {};
        Object.keys(rawBackendErrors).forEach(key => {
            // Only show error if the corresponding value is actually missing or invalid
            if (key === 'savings_product_id' && savingsProduct?.id) {
                // Don't show error if savings product is selected
                return;
            }
            if (key === 'member_admission_id' && memberAdmission?.id) {
                // Don't show error if member is selected
                return;
            }
            if (key === 'deposit_amount' && data?.monthly_savings_amount && data.monthly_savings_amount > 0) {
                // Don't show error if deposit amount is valid
                return;
            }
            // Keep other errors
            filtered[key] = rawBackendErrors[key];
        });
        return filtered;
    }, [rawBackendErrors, savingsProduct?.id, memberAdmission?.id, data?.monthly_savings_amount]);
    
    // Merge local validation errors with backend errors
    // Also map deposit_amount errors to monthly_savings_amount for display
    const errors = useMemo(() => ({
        ...localErrors, 
        ...backendErrors,
        monthly_savings_amount: localErrors.monthly_savings_amount || backendErrors.monthly_savings_amount || backendErrors.deposit_amount,
    }), [localErrors, backendErrors]);

    // Load saved data if exists
    useEffect(() => {
        if (existingApplication && existingApplication.form_data) {
            const formData = existingApplication.form_data;
            Object.keys(formData).forEach(key => {
                if (formData[key] !== null && formData[key] !== undefined) {
                    setData(key as any, formData[key]);
                }
            });
        }
    }, [existingApplication]);

    const handleImageUpload = (field: string, file: File | null) => {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setData(field as any, base64String);
            setImagePreview(prev => ({ ...prev, [field]: base64String }));
        };
        reader.readAsDataURL(file);
    };

    const handleNomineeImageUpload = (index: number, field: 'photo' | 'signature', file: File | null) => {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            const updatedNominees = [...data.nominees];
            updatedNominees[index] = { ...updatedNominees[index], [field]: base64String };
            setData('nominees', updatedNominees);
            setImagePreview(prev => ({ ...prev, [`nominee_${index}_${field}`]: base64String }));
        };
        reader.readAsDataURL(file);
    };

    const validateForm = (): { valid: boolean; errors: Record<string, string> } => {
        const newErrors: Record<string, string> = {};

        const minAmt = savingsProduct?.min_amount ?? 0;
        const maxAmt = savingsProduct?.max_amount ?? null;
        if (!data.monthly_savings_amount || data.monthly_savings_amount <= 0) {
            newErrors.monthly_savings_amount = 'Monthly savings amount is required and must be greater than 0';
        } else if (data.monthly_savings_amount < minAmt) {
            newErrors.monthly_savings_amount = `Minimum deposit ৳${minAmt.toLocaleString('bn-BD')}`;
        } else if (maxAmt != null && data.monthly_savings_amount > maxAmt) {
            newErrors.monthly_savings_amount = `Maximum deposit ৳${Number(maxAmt).toLocaleString('bn-BD')}`;
        }
        if (!data.applicant_name_bn || data.applicant_name_bn.trim() === '') {
            newErrors.applicant_name_bn = 'Applicant name (Bangla) is required';
        }
        if (!data.nid_number || data.nid_number.trim() === '') {
            newErrors.nid_number = 'NID number is required';
        }
        if (!data.father_husband_guardian || data.father_husband_guardian.trim() === '') {
            newErrors.father_husband_guardian = 'Father/Spouse/Guardian name is required';
        }
        const hasNominee = data.nominees.some(n => n.name && n.name.trim() !== '');
        if (hasNominee) {
            data.nominees.forEach((nominee, index) => {
                if (nominee.name && nominee.name.trim() !== '') {
                    if (!nominee.relation || nominee.relation.trim() === '') {
                        newErrors[`nominee_${index}_relation`] = `Nominee ${index + 1} relation is required`;
                    }
                    if (!nominee.percentage || nominee.percentage <= 0) {
                        newErrors[`nominee_${index}_percentage`] = `Nominee ${index + 1} share (%) is required`;
                    }
                }
            });
        }

        setLocalErrors(newErrors);
        return { valid: Object.keys(newErrors).length === 0, errors: newErrors };
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();

        if (!existingApplication) {
            if (!savingsProduct?.id || !memberAdmission?.id) {
                alert('Error: Savings product or member not selected. Please refresh and select member again.');
                return;
            }
        }

        const { valid, errors: validationErrors } = validateForm();
        if (!valid) {
            const msg = Object.values(validationErrors).join('\n');
            alert('Please fill in required fields:\n\n' + msg);
            const firstKey = Object.keys(validationErrors)[0];
            const el = document.querySelector(`[data-field="${firstKey}"]`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                (el as HTMLElement).focus();
            }
            return;
        }
        
        if (existingApplication) {
            const savePayload = {
                form_data: data,
                account_opening_date: data.account_opening_date,
                monthly_savings_amount: data.monthly_savings_amount,
                term_years: data.term_years ?? null,
                duration_months: existingApplication?.duration_months ?? savingsProduct?.duration_months ?? data.duration_months ?? null,
                account_no: data.account_no,
                member_no: data.member_no,
                applicant_photo: data.applicant_photo,
                current_address: `${data.current_address_village}, ${data.current_address_post_office}, ${data.current_address_upazila}, ${data.current_address_district}`,
                permanent_address: `${data.permanent_address_village}, ${data.permanent_address_post_office}, ${data.permanent_address_upazila}, ${data.permanent_address_district}`,
                profession: data.profession,
                source_of_income: data.source_of_income,
                monthly_deposit_submission_date: data.monthly_deposit_submission_date,
                applicant_signature: data.applicant_signature,
                officer_signature: data.officer_signature,
                officer_pin: data.officer_pin,
                accountant_signature: data.accountant_signature,
                accountant_pin: data.accountant_pin,
                branch_manager_signature: data.branch_manager_signature,
                branch_manager_pin: data.branch_manager_pin,
                nominee_info: data.nominees.filter(n => n.name && n.name.trim() !== '').map(n => ({
                    name: n.name,
                    relation: n.relation || '',
                    mobile: '',
                    nid: n.nid_birth_registration || '',
                    birth_registration_no: n.nid_birth_registration || '',
                    address: '',
                    percentage: n.percentage || 0,
                    photo: n.photo || null,
                    signature: n.signature || null,
                })),
            };
            router.post(`/member/savings-applications/${existingApplication.id}/save-form`, savePayload, {
                preserveScroll: true,
                onSuccess: () => {
                    setShowPreview(true);
                    setLocalErrors({});
                },
                onError: () => {},
            });
        } else {
            if (!savingsProduct?.id || !memberAdmission?.id) {
                alert('ত্রুটি: প্রয়োজনীয় তথ্য পাওয়া যায়নি। অনুগ্রহ করে পৃষ্ঠাটি রিফ্রেশ করুন।');
                return;
            }
            const monthlyAmount = data.monthly_savings_amount;
            const depositAmount = (monthlyAmount && monthlyAmount > 0)
                ? monthlyAmount
                : (savingsProduct?.min_amount || 0);
            // Validate deposit amount before submission
            if (!depositAmount || depositAmount <= 0) {
                console.error('Deposit amount validation failed:', depositAmount);
                setLocalErrors(prev => ({
                    ...prev,
                    monthly_savings_amount: 'মাসিক সঞ্চয়ের পরিমাণ আবশ্যক এবং ০ এর বেশি হতে হবে',
                    deposit_amount: 'জমার পরিমাণ আবশ্যক',
                }));
                alert('ত্রুটি: মাসিক সঞ্চয়ের পরিমাণ নির্ধারণ করুন (০ এর বেশি)');
                return;
            }
            
            const nomineeInfo = data.nominees
                .filter(n => n.name && n.name.trim() !== '')
                .map(n => ({
                    name: n.name,
                    relation: n.relation || '',
                    mobile: '',
                    nid: n.nid_birth_registration || '',
                    birth_registration_no: n.nid_birth_registration || '',
                    address: '',
                    percentage: n.percentage || 0,
                    photo: n.photo || null,
                    signature: n.signature || null,
                }));

            const payload: Record<string, unknown> = {
                savings_product_id: savingsProduct.id,
                member_admission_id: memberAdmission.id,
                samity_id: memberAdmission.samity_id || null,
                deposit_amount: depositAmount,
                monthly_installment: depositAmount,
                account_opening_date: data.account_opening_date || null,
                monthly_savings_amount: data.monthly_savings_amount ?? null,
                term_years: data.term_years ?? null,
                duration_months: savingsProduct?.duration_months ?? data.duration_months ?? null,
                account_no: data.account_no || null,
                member_no: data.member_no || null,
                applicant_photo: data.applicant_photo || null,
                current_address: `${data.current_address_village || ''}, ${data.current_address_post_office || ''}, ${data.current_address_upazila || ''}, ${data.current_address_district || ''}`.trim() || null,
                permanent_address: `${data.permanent_address_village || ''}, ${data.permanent_address_post_office || ''}, ${data.permanent_address_upazila || ''}, ${data.permanent_address_district || ''}`.trim() || null,
                profession: data.profession || null,
                source_of_income: data.source_of_income || null,
                monthly_deposit_submission_date: data.monthly_deposit_submission_date || null,
                applicant_signature: data.applicant_signature || null,
                officer_signature: data.officer_signature || null,
                officer_pin: data.officer_pin || null,
                accountant_signature: data.accountant_signature || null,
                accountant_pin: data.accountant_pin || null,
                branch_manager_signature: data.branch_manager_signature || null,
                branch_manager_pin: data.branch_manager_pin || null,
                form_data: data,
                nominee_info: nomineeInfo,
            };

            router.post('/member/savings-applications', payload, {
                preserveState: false,
                preserveScroll: false,
                onSuccess: () => setLocalErrors({}),
                onError: () => {},
            });
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <AdminLayout>
            <Head title="Savings Application Form (মেয়াদী সঞ্চয় আবেদনপত্র)">
                <style>{`
                    @media print {
                        @page {
                            size: A4;
                            margin: 1cm;
                        }
                        .print\\:hidden {
                            display: none !important;
                        }
                        .savings-form-no-print {
                            display: none !important;
                        }
                        .savings-form-print-area {
                            display: block !important;
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            max-width: 100%;
                            padding: 0;
                            margin: 0;
                            background: white;
                        }
                        .print-container {
                            max-width: 100%;
                        }
                        body {
                            background: white;
                        }
                    }
                `}</style>
            </Head>
            <div className="max-w-7xl mx-auto p-6">
                <div className="mb-4 flex justify-between items-center savings-form-no-print">
                    <h1 className="text-2xl font-bold">Savings Application Form (মেয়াদী সঞ্চয় আবেদনপত্র)</h1>
                    <div className="flex gap-2">
                        <Button onClick={() => setShowPreview(!showPreview)} variant="outline">
                            {showPreview ? 'Edit' : 'Preview'}
                        </Button>
                        <Button onClick={handlePrint} variant="outline">
                            <Printer className="h-4 w-4 mr-2" />
                            Print Form
                        </Button>
                    </div>
                </div>

                {/* Backend Validation Errors Display - only show if values are actually missing */}
                {backendErrors && Object.keys(backendErrors).length > 0 && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 savings-form-no-print">
                        <h3 className="text-red-800 font-semibold mb-2">Errors (ত্রুটি):</h3>
                        <ul className="list-disc list-inside space-y-1">
                            {Object.entries(backendErrors).filter(([key]) => {
                                // Filter out errors if values are actually present
                                if (key === 'savings_product_id' && savingsProduct?.id) return false;
                                if (key === 'member_admission_id' && memberAdmission?.id) return false;
                                if (key === 'deposit_amount' && data.monthly_savings_amount && data.monthly_savings_amount > 0) return false;
                                return true;
                            }).map(([key, value]: [string, any]) => {
                                const errorMessage = Array.isArray(value) ? value[0] : value;
                                let displayKey = key;
                                
                                // Map backend field names to user-friendly Bengali names
                                if (key === 'savings_product_id') displayKey = 'Savings product';
                                else if (key === 'member_admission_id') displayKey = 'Member';
                                else if (key === 'deposit_amount') displayKey = 'জমার পরিমাণ';
                                else if (key === 'monthly_savings_amount') displayKey = 'মাসিক সঞ্চয়ের পরিমাণ';
                                else if (key === 'term_years' || key === 'duration_months') displayKey = 'Term';
                                else if (key === 'applicant_name_bn') displayKey = 'আবেদনকারীর নাম (বাংলা)';
                                else if (key === 'nid_number') displayKey = 'জাতীয় পরিচয়পত্র নং';
                                else if (key === 'father_husband_guardian') displayKey = 'পিতা/স্বামী/অভিভাবক';
                                
                                return (
                                    <li key={key} className="text-red-700 text-sm">
                                        <span className="font-medium">{displayKey}:</span> {errorMessage}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}

                <form onSubmit={handleSave}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:grid-cols-1">
                        {/* LEFT SIDE: INPUT FORM */}
                        <div className="space-y-4 savings-form-no-print">
                            {/* Product summary – auto from selected product */}
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <h3 className="text-sm font-semibold text-slate-800 mb-2">Product Info (পণ্যের তথ্য)</h3>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                    <span className="text-slate-600">Product:</span>
                                    <span className="font-medium">{savingsProduct?.product_name_bn ?? savingsProduct?.product_name}</span>
                                    <span className="text-slate-600">Code:</span>
                                    <span>{savingsProduct?.product_code ?? '—'}</span>
                                    <span className="text-slate-600">Term (মেয়াদ):</span>
                                    <span>{savingsProduct?.duration_months ? (savingsProduct.duration_months >= 12 ? `${savingsProduct.duration_months / 12} years` : `${savingsProduct.duration_months} months`) : '—'}</span>
                                    <span className="text-slate-600">Interest Rate:</span>
                                    <span>{savingsProduct?.interest_rate != null ? `${savingsProduct.interest_rate}%` : '—'}</span>
                                    <span className="text-slate-600">Deposit Limit:</span>
                                    <span>৳{(savingsProduct?.min_amount ?? 0).toLocaleString('bn-BD')}{savingsProduct?.max_amount ? ` – ৳${Number(savingsProduct.max_amount).toLocaleString('bn-BD')}` : ''}</span>
                                </div>
                            </div>
                            <div className="bg-white rounded-lg shadow p-6 space-y-6">
                                {/* Office Use Section */}
                                <div className="border-b pb-4">
                                    <h3 className="font-bold text-sm mb-4">Office Use (অফিস কর্তৃক পূরণীয়)</h3>
                                    
                                    {/* Show errors for hidden required fields - only if values are actually missing */}
                                    {((backendErrors?.savings_product_id && !savingsProduct?.id) || 
                                      (backendErrors?.member_admission_id && !memberAdmission?.id) || 
                                      (backendErrors?.deposit_amount && (!data.monthly_savings_amount || data.monthly_savings_amount <= 0))) && (
                                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                                            <p className="text-red-700 text-sm font-semibold mb-2">System error:</p>
                                            <ul className="list-disc list-inside text-red-600 text-sm space-y-1">
                                                {backendErrors.savings_product_id && !savingsProduct?.id && (
                                                    <li>Savings product not selected</li>
                                                )}
                                                {backendErrors.member_admission_id && !memberAdmission?.id && (
                                                    <li>Member not selected</li>
                                                )}
                                                {backendErrors.deposit_amount && (!data.monthly_savings_amount || data.monthly_savings_amount <= 0) && (
                                                    <li>Deposit amount not set</li>
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label>Account Opening Date (হিসাব খোলার তারিখ)</Label>
                                            <Input type="date" value={data.account_opening_date} onChange={(e) => setData('account_opening_date', e.target.value)} />
                                        </div>
                                        <div data-field="monthly_savings_amount">
                                            <Label>Monthly Savings Amount (৳) * (মাসিক সঞ্চয়)</Label>
                                            <Input
                                                type="number"
                                                step="1"
                                                min={savingsProduct?.min_amount ?? 0}
                                                max={savingsProduct?.max_amount ?? undefined}
                                                placeholder={`Min: ৳${(savingsProduct?.min_amount ?? 0).toLocaleString('bn-BD')}`}
                                                value={data.monthly_savings_amount || ''}
                                                onChange={(e) => {
                                                    const value = e.target.value === '' ? 0 : Number(e.target.value);
                                                    setData('monthly_savings_amount', value);
                                                    if (localErrors.monthly_savings_amount || localErrors.deposit_amount) {
                                                        setLocalErrors(prev => {
                                                            const next = { ...prev };
                                                            delete next.monthly_savings_amount;
                                                            delete next.deposit_amount;
                                                            return next;
                                                        });
                                                    }
                                                }}
                                                className={(errors.monthly_savings_amount || errors.deposit_amount) ? 'border-red-500' : ''}
                                            />
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                Limit: ৳{(savingsProduct?.min_amount ?? 0).toLocaleString('bn-BD')}
                                                {savingsProduct?.max_amount ? ` – ৳${Number(savingsProduct.max_amount).toLocaleString('bn-BD')}` : ''}
                                            </p>
                                            {(errors.monthly_savings_amount || errors.deposit_amount) && (
                                                <p className="text-red-500 text-xs mt-1">
                                                    {errors.monthly_savings_amount || errors.deposit_amount}
                                                </p>
                                            )}
                                        </div>
                                        <div data-field="duration_months">
                                            <Label>Term (মেয়াদ)</Label>
                                            <p className="border rounded px-3 py-2 bg-gray-50 text-gray-700">
                                                {savingsProduct?.duration_months != null
                                                    ? savingsProduct.duration_months >= 12
                                                        ? `${Math.round(savingsProduct.duration_months / 12)} years`
                                                        : `${savingsProduct.duration_months} months`
                                                    : '—'}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5">From product (not editable)</p>
                                        </div>
                                        <div>
                                            <Label>Account No (হিসাব নং)</Label>
                                            <Input value={data.account_no} onChange={(e) => setData('account_no', e.target.value)} />
                                        </div>
                                        <div>
                                            <Label>Member No (সদস্য নং)</Label>
                                            <Input value={data.member_no} onChange={(e) => setData('member_no', e.target.value)} />
                                        </div>
                                    </div>
                                </div>

                                {/* Applicant Photo */}
                                <div className="border-b pb-4">
                                    <Label>Applicant Photo (আবেদনকারীর ছবি)</Label>
                                    <div className="mt-2">
                                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload('applicant_photo', e.target.files?.[0] || null)} className="mb-2" />
                                        {imagePreview.applicant_photo && (
                                            <img src={imagePreview.applicant_photo} alt="Applicant" className="w-24 h-32 object-cover border" />
                                        )}
                                    </div>
                                </div>

                                {/* Applicant Details */}
                                <div className="border-b pb-4">
                                    <h3 className="font-bold text-sm mb-4">আবেদনকারীর তথ্য:</h3>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div data-field="applicant_name_bn">
                                                <Label>Name (Bangla) * (নাম)</Label>
                                                <Input
                                                    value={data.applicant_name_bn}
                                                    onChange={(e) => {
                                                        setData('applicant_name_bn', e.target.value);
                                                        if (localErrors.applicant_name_bn) {
                                                            setLocalErrors(prev => {
                                                                const newErrors = { ...prev };
                                                                delete newErrors.applicant_name_bn;
                                                                return newErrors;
                                                            });
                                                        }
                                                    }}
                                                    className={errors.applicant_name_bn ? 'border-red-500' : ''}
                                                />
                                                {errors.applicant_name_bn && (
                                                    <p className="text-red-500 text-xs mt-1">{errors.applicant_name_bn}</p>
                                                )}
                                            </div>
                                            <div>
                                                <Label>Name (English)</Label>
                                                <Input value={data.applicant_name_en} onChange={(e) => setData('applicant_name_en', e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div data-field="nid_number">
                                                <Label>NID No * (জাতীয় পরিচয়পত্র নং)</Label>
                                                <Input
                                                    value={data.nid_number}
                                                    onChange={(e) => {
                                                        setData('nid_number', e.target.value);
                                                        if (localErrors.nid_number) {
                                                            setLocalErrors(prev => {
                                                                const newErrors = { ...prev };
                                                                delete newErrors.nid_number;
                                                                return newErrors;
                                                            });
                                                        }
                                                    }}
                                                    className={errors.nid_number ? 'border-red-500' : ''}
                                                />
                                                {errors.nid_number && (
                                                    <p className="text-red-500 text-xs mt-1">{errors.nid_number}</p>
                                                )}
                                            </div>
                                            <div data-field="father_husband_guardian">
                                                <Label>Father/Spouse/Guardian * (পিতা/স্বামী/অভিভাবক)</Label>
                                                <Input
                                                    value={data.father_husband_guardian}
                                                    onChange={(e) => {
                                                        setData('father_husband_guardian', e.target.value);
                                                        if (localErrors.father_husband_guardian) {
                                                            setLocalErrors(prev => {
                                                                const newErrors = { ...prev };
                                                                delete newErrors.father_husband_guardian;
                                                                return newErrors;
                                                            });
                                                        }
                                                    }}
                                                    className={errors.father_husband_guardian ? 'border-red-500' : ''}
                                                />
                                                {errors.father_husband_guardian && (
                                                    <p className="text-red-500 text-xs mt-1">{errors.father_husband_guardian}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <Label>Current Address - Village (বর্তমান ঠিকানা - গ্রাম)</Label>
                                            <Input value={data.current_address_village} onChange={(e) => setData('current_address_village', e.target.value)} />
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <Label>Post Office (ডাকঘর)</Label>
                                                <Input value={data.current_address_post_office} onChange={(e) => setData('current_address_post_office', e.target.value)} />
                                            </div>
                                            <div>
                                                <Label>Upazila (উপজেলা)</Label>
                                                <Input value={data.current_address_upazila} onChange={(e) => setData('current_address_upazila', e.target.value)} />
                                            </div>
                                            <div>
                                                <Label>District (জেলা)</Label>
                                                <Input value={data.current_address_district} onChange={(e) => setData('current_address_district', e.target.value)} />
                                            </div>
                                        </div>
                                        <div>
                                            <Label>Permanent Address - Village (স্থায়ী ঠিকানা - গ্রাম)</Label>
                                            <Input value={data.permanent_address_village} onChange={(e) => setData('permanent_address_village', e.target.value)} />
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <Label>Post Office (ডাকঘর)</Label>
                                                <Input value={data.permanent_address_post_office} onChange={(e) => setData('permanent_address_post_office', e.target.value)} />
                                            </div>
                                            <div>
                                                <Label>Upazila (উপজেলা)</Label>
                                                <Input value={data.permanent_address_upazila} onChange={(e) => setData('permanent_address_upazila', e.target.value)} />
                                            </div>
                                            <div>
                                                <Label>District (জেলা)</Label>
                                                <Input value={data.permanent_address_district} onChange={(e) => setData('permanent_address_district', e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label>Profession (পেশা)</Label>
                                                <Input value={data.profession} onChange={(e) => setData('profession', e.target.value)} />
                                            </div>
                                            <div>
                                                <Label>Source of Income (আয়ের উৎস)</Label>
                                                <Input value={data.source_of_income} onChange={(e) => setData('source_of_income', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Nominees – default one, add more via button */}
                                <div className="border-b pb-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-sm">Nominee(s) Info (নমিনি তথ্য)</h3>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setData('nominees', [...data.nominees, { name: '', relation: '', signature: null, percentage: 0, photo: null, nid_birth_registration: '' }])}
                                        >
                                            <Plus className="h-4 w-4 mr-1" />
                                            Add Nominee
                                        </Button>
                                    </div>
                                    {data.nominees.map((nominee, idx) => (
                                        <div key={idx} className="mb-4 p-3 border rounded">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-semibold">নমিনি {idx + 1}:</h4>
                                                {data.nominees.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-600 hover:text-red-700"
                                                        onClick={() => setData('nominees', data.nominees.filter((_, i) => i !== idx))}
                                                    >
                                                        <X className="h-4 w-4" /> Remove
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label>Name</Label>
                                                    <Input value={nominee.name} onChange={(e) => {
                                                        const updated = [...data.nominees];
                                                        updated[idx].name = e.target.value;
                                                        setData('nominees', updated);
                                                    }} />
                                                </div>
                                                <div data-field={`nominee_${idx}_relation`}>
                                                    <Label>Relation {nominee.name && nominee.name.trim() !== '' && '*'}</Label>
                                                    <Input 
                                                        value={nominee.relation} 
                                                        onChange={(e) => {
                                                            const updated = [...data.nominees];
                                                            updated[idx].relation = e.target.value;
                                                            setData('nominees', updated);
                                                            if (localErrors[`nominee_${idx}_relation`]) {
                                                                setLocalErrors(prev => {
                                                                    const newErrors = { ...prev };
                                                                    delete newErrors[`nominee_${idx}_relation`];
                                                                    return newErrors;
                                                                });
                                                            }
                                                        }}
                                                        className={errors[`nominee_${idx}_relation`] ? 'border-red-500' : ''}
                                                    />
                                                    {errors[`nominee_${idx}_relation`] && (
                                                        <p className="text-red-500 text-xs mt-1">{errors[`nominee_${idx}_relation`]}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <Label>NID / Birth Registration No</Label>
                                                    <Input value={nominee.nid_birth_registration} onChange={(e) => {
                                                        const updated = [...data.nominees];
                                                        updated[idx].nid_birth_registration = e.target.value;
                                                        setData('nominees', updated);
                                                    }} />
                                                </div>
                                                <div data-field={`nominee_${idx}_percentage`}>
                                                    <Label>Share (%) {nominee.name && nominee.name.trim() !== '' && '*'}</Label>
                                                    <Input 
                                                        type="number" 
                                                        value={nominee.percentage} 
                                                        onChange={(e) => {
                                                            const updated = [...data.nominees];
                                                            updated[idx].percentage = Number(e.target.value);
                                                            setData('nominees', updated);
                                                            if (localErrors[`nominee_${idx}_percentage`]) {
                                                                setLocalErrors(prev => {
                                                                    const newErrors = { ...prev };
                                                                    delete newErrors[`nominee_${idx}_percentage`];
                                                                    return newErrors;
                                                                });
                                                            }
                                                        }}
                                                        className={errors[`nominee_${idx}_percentage`] ? 'border-red-500' : ''}
                                                    />
                                                    {errors[`nominee_${idx}_percentage`] && (
                                                        <p className="text-red-500 text-xs mt-1">{errors[`nominee_${idx}_percentage`]}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <Label>Photo</Label>
                                                    <input type="file" accept="image/*" onChange={(e) => handleNomineeImageUpload(idx, 'photo', e.target.files?.[0] || null)} className="mb-2" />
                                                    {imagePreview[`nominee_${idx}_photo`] && (
                                                        <img src={imagePreview[`nominee_${idx}_photo`]} alt={`Nominee ${idx + 1}`} className="w-16 h-20 object-cover border" />
                                                    )}
                                                </div>
                                                <div>
                                                    <Label>Signature</Label>
                                                    <input type="file" accept="image/*" onChange={(e) => handleNomineeImageUpload(idx, 'signature', e.target.files?.[0] || null)} className="mb-2" />
                                                    {imagePreview[`nominee_${idx}_signature`] && (
                                                        <img src={imagePreview[`nominee_${idx}_signature`]} alt={`Signature ${idx + 1}`} className="w-20 h-10 object-contain border" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div>
                                        <Label>Nominee(s) NID / Birth Registration No</Label>
                                        <Input value={data.nominee_nid_birth_registration} onChange={(e) => setData('nominee_nid_birth_registration', e.target.value)} />
                                    </div>
                                    <div className="mt-4">
                                        <Label>Monthly Deposit Submission Date</Label>
                                        <Input type="date" value={data.monthly_deposit_submission_date} onChange={(e) => setData('monthly_deposit_submission_date', e.target.value)} />
                                    </div>
                                </div>

                                {/* Signatures */}
                                <div>
                                    <h3 className="font-bold text-sm mb-4">Signatures (স্বাক্ষর)</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <Label>Applicant Signature</Label>
                                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload('applicant_signature', e.target.files?.[0] || null)} className="mb-2" />
                                            {imagePreview.applicant_signature && (
                                                <img src={imagePreview.applicant_signature} alt="Applicant Signature" className="w-20 h-10 object-contain border" />
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label>Officer Signature</Label>
                                                <input type="file" accept="image/*" onChange={(e) => handleImageUpload('officer_signature', e.target.files?.[0] || null)} className="mb-2" />
                                                {imagePreview.officer_signature && (
                                                    <img src={imagePreview.officer_signature} alt="Officer Signature" className="w-20 h-10 object-contain border" />
                                                )}
                                                <Input placeholder="PIN No" value={data.officer_pin} onChange={(e) => setData('officer_pin', e.target.value)} className="mt-2" />
                                            </div>
                                            <div>
                                                <Label>Accountant Signature</Label>
                                                <input type="file" accept="image/*" onChange={(e) => handleImageUpload('accountant_signature', e.target.files?.[0] || null)} className="mb-2" />
                                                {imagePreview.accountant_signature && (
                                                    <img src={imagePreview.accountant_signature} alt="Accountant Signature" className="w-20 h-10 object-contain border" />
                                                )}
                                                <Input placeholder="PIN No" value={data.accountant_pin} onChange={(e) => setData('accountant_pin', e.target.value)} className="mt-2" />
                                            </div>
                                        </div>
                                        <div>
                                            <Label>Branch Manager Signature</Label>
                                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload('branch_manager_signature', e.target.files?.[0] || null)} className="mb-2" />
                                            {imagePreview.branch_manager_signature && (
                                                <img src={imagePreview.branch_manager_signature} alt="Branch Manager Signature" className="w-20 h-10 object-contain border" />
                                            )}
                                            <Input placeholder="PIN No" value={data.branch_manager_pin} onChange={(e) => setData('branch_manager_pin', e.target.value)} className="mt-2" />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button type="submit" disabled={processing}>
                                        <Save className="h-4 w-4 mr-2" />
                                        Save
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT SIDE: PREVIEW - visible on desktop; only this part prints */}
                        <div className="lg:sticky lg:top-4 lg:h-fit print:block print-container savings-form-print-area">
                            <div className="bg-white rounded-lg shadow-lg p-4 print:shadow-none print:p-2 print:rounded-none print:bg-white">
                                <h3 className="text-sm font-bold mb-3 savings-form-no-print">Preview</h3>
                                <SavingsApplicationPrintView data={data} />
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
