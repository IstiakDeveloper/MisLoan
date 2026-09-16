import { useState, useEffect, useMemo } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import type { RequestPayload } from '@inertiajs/core';
import AdminLayout from '@/layouts/admin-layout';
import {
    Plus,
    Printer,
    Save,
    Upload,
    X,
    ArrowLeft,
    Check,
    CheckCircle2,
    Copy,
    Eye,
    EyeOff,
    Camera,
    User,
    Users,
    Calendar,
    Coins,
    Percent,
    Clock,
    Sparkles,
    AlertCircle,
    FileText,
    ShieldCheck,
    CreditCard,
    Phone,
    MapPin,
    Loader2,
    Building2,
    Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateBangla, todayIsoDate } from '@/utils/dateUtils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { fileToCompressedDataUrl } from '@/utils/imageUpload';
import { withLiveMemberCode } from '@/utils/memberCodeUtils';
import { selfOccupation } from '@/utils/memberFamilyInfo';

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
    
    // Nominees — one row by default, more can be added
    nominees: Array<{
        name: string;
        relation: string;
        percentage: number;
        photo: string | null;
        nid_birth_registration: string;
    }>;
    
    // Nominee NID/Birth Registration
    nominee_nid_birth_registration: string;
    
    // Monthly deposit submission date
    monthly_deposit_submission_date: string;
    
    // Signatures are taken by hand on the printed form; only PINs are captured
    officer_pin: string;
    accountant_pin: string;
    branch_manager_pin: string;
    
    // Branch info
    branch_name: string;
    branch_address: string;
    area_name: string;
    samity_name: string;
}

interface Props {
    memberAdmission: any;
    savingsProduct: any;
    branch: any;
    existingApplication?: any;
    savedData?: any;
    onlyPreview?: boolean;
}

/** Print/Preview view - matches the exact form layout */
export function SavingsApplicationPrintView({ data }: { data: SavingsFormData }) {
    const d = data || {};
    const fmt = formatDateBangla;
    const num = (v: any) => (v != null && v !== '' ? Number(v) : 0);
    const str = (v: any) => (v != null && v !== '' ? String(v) : '');
    const years = d.term_years
        || ((d as any).duration_months != null && (d as any).duration_months >= 12
            ? Math.round((d as any).duration_months / 12)
            : null);
    const nominees = Array.isArray(d.nominees) ? d.nominees : [];
    const nomineeRowCount = Math.max(nominees.length, 1);
    
    return (
        <div className="bg-white border border-gray-300 p-4 rounded-lg" style={{ fontFamily: 'system-ui, Arial, sans-serif', fontSize: '13px', maxWidth: '100%' }}>
            {/* Header: office box (1fr) | org title (exact center) | photo (1fr right-aligned) */}
            <div className="mb-3 grid grid-cols-[1fr_1.4fr_1fr] gap-3 items-start">
                <div className="border-2 border-gray-700 p-2" style={{ fontSize: '11px' }}>
                    <p className="font-bold mb-2 text-center border-b border-gray-400 pb-1">অফিস কর্তৃক পূরণীয়</p>
                    <div className="space-y-1.5">
                        <p>হিসাব খোলার তারিখ: <span className="border-b border-dotted border-gray-600 inline-block min-w-[85px]">{fmt(d.account_opening_date)}</span></p>
                        <p>মাসিক সঞ্চয়ের পরিমাণ: <span className="border-b border-dotted border-gray-600 inline-block min-w-[65px]">{num(d.monthly_savings_amount).toLocaleString('bn-BD')}</span></p>
                        <p>
                            মেয়াদ:{' '}
                            <span className="inline-flex flex-wrap gap-x-1.5">
                                <span>{years === 5 ? '☑' : '☐'} ৫ বছর</span>
                                <span>{years === 10 ? '☑' : '☐'} ১০ বছর</span>
                                {years && years !== 5 && years !== 10 ? <span>☑ {years} বছর</span> : null}
                            </span>
                            <span className="text-[10px] text-gray-500"> (টিক দিন)</span>
                        </p>
                        <p>হিসাব নং: <span className="border-b border-dotted border-gray-600 inline-block min-w-[85px]">{str(d.account_no)}</span></p>
                        <p>সদস্য নং: <span className="border-b border-dotted border-gray-600 inline-block min-w-[85px]">{str(d.member_no)}</span></p>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center pt-1 text-center">
                    <div className="flex items-center justify-center gap-2.5 mb-1">
                        <img
                            src="/logo.png"
                            alt="মৌসুমী"
                            className="h-12 w-12 object-contain shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <div className="text-center">
                            <h1 className="font-black leading-tight text-black" style={{ fontSize: '22px' }}>মৌসুমী</h1>
                            <p className="leading-tight text-gray-800" style={{ fontSize: '12px' }}>{str(d.branch_address) || str(d.branch_name) || 'উকিলপাড়া, নওগাঁ।'}</p>
                        </div>
                    </div>
                    <p className="mt-1 font-bold border border-gray-700 rounded-full px-3 py-0.5 inline-block whitespace-nowrap" style={{ fontSize: '13px' }}>
                        মেয়াদী সঞ্চয় কর্মসূচির আবেদনপত্র
                    </p>
                </div>
                <div className="flex justify-end">
                    <div className="border-2 border-gray-700 p-2 text-center w-[112px] shrink-0">
                        {d.applicant_photo ? (
                            <img src={d.applicant_photo} alt="Applicant" className="mx-auto" style={{ width: '92px', height: '110px', objectFit: 'cover', border: '1px solid #ccc' }} />
                        ) : (
                            <div className="mx-auto" style={{ width: '92px', height: '110px', border: '1px solid #ccc', backgroundColor: '#f5f5f5' }}></div>
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
                <p className="mb-1">পেশা: <span className="border-b border-dotted border-gray-600 inline-block min-w-[150px]">{str(d.profession)}</span> আয়ের উৎস: <span className="border-b border-dotted border-gray-600 inline-block min-w-[150px]">{str(d.source_of_income)}</span></p>
                <p className="mt-2 leading-relaxed" style={{ fontSize: '11px', textAlign: 'justify' }}>
                    আপনার শাখার <span className="border-b border-dotted border-gray-600 inline-block min-w-[140px]">{str(d.samity_name)}</span> সমিতির একজন সদস্য, মৌসুমী পরিচালিত মেয়াদী সঞ্চয় কর্মসূচির নিয়ম-কানুন সম্পর্কে অবগত হয়ে সঞ্চয় করার আবেদন করছি। উল্লেখ্য যে, আমার অবর্তমানে (মৃত্যুর পর) নিম্নলিখিত নমিনি/নমিনিগণ উপযুক্ত প্রমাণপত্র দাখিল সাপেক্ষে নিম্নোক্ত হারে আমার জমাকৃত সঞ্চয় উত্তোলন করতে পারবেন।
                </p>
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
                        {Array.from({ length: nomineeRowCount }).map((_, idx) => {
                            const nominee = nominees[idx];
                            return (
                                <tr key={idx}>
                                    <td className="border border-gray-600 px-1 py-2 text-center">{idx + 1}</td>
                                    <td className="border border-gray-600 px-1 py-2">{str(nominee?.name)}</td>
                                    <td className="border border-gray-600 px-1 py-2">{str(nominee?.relation)}</td>
                                    <td className="border border-gray-600 px-1 py-2"></td>
                                    <td className="border border-gray-600 px-1 py-2 text-center">{nominee?.percentage ? `${num(nominee.percentage)}%` : ''}</td>
                                    <td className="border border-gray-600 px-1 py-1 text-center align-middle">
                                        {nominee?.photo ? (
                                            <img src={nominee.photo} alt={`নমিনি ${idx + 1}`} className="mx-auto" style={{ width: '38px', height: '48px', objectFit: 'cover', border: '1px solid #999' }} />
                                        ) : (
                                            <div className="mx-auto" style={{ width: '38px', height: '48px', border: '1px solid #ccc', backgroundColor: '#f5f5f5' }}></div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <p className="mt-1 text-[9px] leading-tight text-gray-600">
                    নমিনির ছবি (ছবির পেছনে নমিনির স্বাক্ষর থাকতে হবে এবং ছবিটি সদস্য কর্তৃক সত্যায়িত হওয়া আবশ্যক)
                </p>
            </div>

            {/* Nominee NID/Birth Registration */}
            <div className="mb-3" style={{ fontSize: '12px' }}>
                <p>নমিনি/নমিনিগণের জাতীয় পরিচয়পত্র/জন্ম নিবন্ধন নং: <span className="border-b border-dotted border-gray-600 inline-block min-w-[300px]">{str(d.nominee_nid_birth_registration) || nominees.map((n: any) => n?.nid_birth_registration).filter(Boolean).join(', ')}</span></p>
                <p>মাসিক জমা প্রদানের তারিখ: <span className="border-b border-dotted border-gray-600 inline-block min-w-[150px]">{fmt(d.monthly_deposit_submission_date)}</span></p>
            </div>

            {/* Signatures — signed by hand on the printed form */}
            <div className="grid grid-cols-2 gap-4 mt-4" style={{ fontSize: '12px' }}>
                <div>
                    <div className="border-b border-gray-600 w-[180px]" style={{ height: '32px' }} />
                    <p className="mt-1">আবেদনকারীর স্বাক্ষর</p>
                    <p className="mt-1">নাম: <span className="border-b border-dotted border-gray-600 inline-block min-w-[180px]">{str(d.applicant_name_bn)}</span></p>
                </div>
                <div></div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6" style={{ fontSize: '12px' }}>
                <div>
                    <div className="border-b border-gray-600 w-[140px]" style={{ height: '32px' }} />
                    <p className="mt-1">অফিসারের স্বাক্ষর</p>
                    <p className="mt-1">PIN নং: <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px]">{str(d.officer_pin)}</span></p>
                </div>
                <div>
                    <div className="border-b border-gray-600 w-[140px]" style={{ height: '32px' }} />
                    <p className="mt-1">হিসাবরক্ষকের স্বাক্ষর</p>
                    <p className="mt-1">PIN নং: <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px]">{str(d.accountant_pin)}</span></p>
                </div>
                <div>
                    <div className="border-b border-gray-600 w-[140px]" style={{ height: '32px' }} />
                    <p className="mt-1">শাখা ব্যবস্থাপকের স্বাক্ষর</p>
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
                <SavingsApplicationPrintView data={withLiveMemberCode(savedData, memberAdmission)} />
            </div>
        );
    }

    const [showPreview, setShowPreview] = useState(false);
    const [imagePreview, setImagePreview] = useState<Record<string, string>>({});
    const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

    const durationMonths = existingApplication?.duration_months ?? savingsProduct?.duration_months ?? null;

    const { data, setData, post, processing } = useForm<SavingsFormData>(withLiveMemberCode({
        // Office use – auto from product
        account_opening_date: existingApplication?.account_opening_date || todayIsoDate(),
        monthly_savings_amount: existingApplication?.monthly_savings_amount ?? savingsProduct?.min_amount ?? 0,
        term_years: existingApplication?.term_years ?? (durationMonths && durationMonths >= 12 ? Math.round(durationMonths / 12) : null),
        duration_months: durationMonths,
        account_no: existingApplication?.account_no || '',
        member_no: memberAdmission?.application_no || existingApplication?.member_no || '',
        
        // Applicant photo
        applicant_photo: existingApplication?.applicant_photo || null,
        
        // Applicant details
        applicant_name_bn: memberAdmission?.applicant_name_bn || '',
        applicant_name_en: memberAdmission?.applicant_name_en || '',
        nid_number: memberAdmission?.nid_number || '',
        father_husband_guardian: memberAdmission?.father_name_bn || memberAdmission?.spouse_name_bn || '',
        current_address_village: memberAdmission?.present_village_road || '',
        current_address_post_office: memberAdmission?.present_union || memberAdmission?.present_post_code || '',
        current_address_upazila: memberAdmission?.present_upazila || '',
        current_address_district: memberAdmission?.present_district || '',
        permanent_address_village: memberAdmission?.permanent_village_road || memberAdmission?.present_village_road || '',
        permanent_address_post_office: memberAdmission?.permanent_union || memberAdmission?.permanent_post_code || memberAdmission?.present_union || memberAdmission?.present_post_code || '',
        permanent_address_upazila: memberAdmission?.permanent_upazila || memberAdmission?.present_upazila || '',
        permanent_address_district: memberAdmission?.permanent_district || memberAdmission?.present_district || '',
        profession: existingApplication?.profession || selfOccupation(memberAdmission),
        source_of_income: existingApplication?.source_of_income || memberAdmission?.project_name || '',
        
        // Nominees – default one; user can add more via button
        nominees: (existingApplication?.nominee_info && existingApplication.nominee_info.length > 0)
            ? existingApplication.nominee_info.map((n: any) => ({
                name: n.name ?? '',
                relation: n.relation ?? '',
                percentage: Number(n.percentage) || 0,
                photo: n.photo ?? null,
                nid_birth_registration: n.nid ?? n.birth_registration_no ?? '',
              }))
            : [{ name: '', relation: '', percentage: 0, photo: null, nid_birth_registration: '' }],
        
        // Nominee NID/Birth Registration
        nominee_nid_birth_registration: '',
        
        // Monthly deposit submission date
        monthly_deposit_submission_date: existingApplication?.monthly_deposit_submission_date || '',
        
        // Signatures are handwritten on the printed form
        officer_pin: existingApplication?.officer_pin || '',
        accountant_pin: existingApplication?.accountant_pin || '',
        branch_manager_pin: existingApplication?.branch_manager_pin || '',
        
        // Branch info
        branch_name: branch?.name || '',
        branch_address: branch?.address || '',
        area_name: branch?.area?.name || '',
        samity_name: memberAdmission?.samity?.samity_name_bn || memberAdmission?.samity?.samity_name || '',
    }, memberAdmission));

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
    const errors = useMemo<Record<string, string>>(() => ({
        ...localErrors, 
        ...backendErrors,
        monthly_savings_amount: localErrors.monthly_savings_amount || backendErrors.monthly_savings_amount || backendErrors.deposit_amount,
    }), [localErrors, backendErrors]);

    // Load saved data if exists, then always prefer the live member code
    useEffect(() => {
        if (existingApplication && existingApplication.form_data) {
            const formData = existingApplication.form_data;
            setData((prev) => withLiveMemberCode({
                ...prev,
                ...formData,
            }, memberAdmission));
        } else if (memberAdmission?.application_no) {
            setData('member_no', memberAdmission.application_no);
        }
    }, [existingApplication, memberAdmission?.application_no]);

    const handleImageUpload = async (field: string, file: File | null) => {
        if (!file) return;

        const result = await fileToCompressedDataUrl(file, { maxWidth: 800 });
        if (!result.ok) {
            alert(result.error);
            return;
        }

        setData(field as any, result.dataUrl);
        setImagePreview(prev => ({ ...prev, [field]: result.dataUrl }));
    };

    const handleNomineePhotoUpload = async (index: number, file: File | null) => {
        if (!file) return;

        const result = await fileToCompressedDataUrl(file, { maxWidth: 800 });
        if (!result.ok) {
            alert(result.error);
            return;
        }

        const updatedNominees = [...data.nominees];
        updatedNominees[index] = { ...updatedNominees[index], photo: result.dataUrl };
        setData('nominees', updatedNominees);
        setImagePreview(prev => ({ ...prev, [`nominee_${index}_photo`]: result.dataUrl }));
    };

    const copyCurrentToPermanentAddress = () => {
        setData(prev => ({
            ...prev,
            permanent_address_village: prev.current_address_village || '',
            permanent_address_post_office: prev.current_address_post_office || '',
            permanent_address_upazila: prev.current_address_upazila || '',
            permanent_address_district: prev.current_address_district || '',
        }));
    };

    const totalNomineePercentage = useMemo(() => {
        return (data.nominees || []).reduce((acc, curr) => acc + (Number(curr.percentage) || 0), 0);
    }, [data.nominees]);

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
                officer_pin: data.officer_pin,
                accountant_pin: data.accountant_pin,
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
                })),
            };
            router.post(`/member/savings-applications/${existingApplication.id}/save-form`, savePayload as unknown as RequestPayload, {
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
                officer_pin: data.officer_pin || null,
                accountant_pin: data.accountant_pin || null,
                branch_manager_pin: data.branch_manager_pin || null,
                form_data: data,
                nominee_info: nomineeInfo,
            };

            router.post('/member/savings-applications', payload as RequestPayload, {
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
            <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-24 space-y-6">
                {/* ── TOP ACTION & HEADER BAR ─────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 savings-form-no-print">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => router.visit('/member/savings-applications')}
                            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-2xs"
                            title="তালিকায় ফিরে যান"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold font-mono">
                                    {savingsProduct?.product_code || 'SAVINGS'}
                                </span>
                                <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                                    মেয়াদী সঞ্চয় আবেদনপত্র
                                </h1>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                আবেদনকারীর প্রয়োজনীয় তথ্যাবলী সঠিকভাবে পূরণ করুন
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                            type="button"
                            onClick={() => setShowPreview(!showPreview)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                        >
                            {showPreview ? (
                                <>
                                    <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                                    <span>প্রিভিউ লুকান</span>
                                </>
                            ) : (
                                <>
                                    <Eye className="w-3.5 h-3.5 text-purple-600" />
                                    <span>প্রিভিউ দেখুন</span>
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={handlePrint}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                        >
                            <Printer className="w-3.5 h-3.5 text-slate-600" />
                            <span>প্রিন্ট ফরম্যাট</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={processing}
                            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-600/20 transition active:scale-95 disabled:opacity-50"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>সংরক্ষণ হচ্ছে...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-3.5 h-3.5" />
                                    <span>সংরক্ষণ করুন</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* ── MEMBER & PRODUCT SUMMARY HERO BAR ───────────────────────────── */}
                <div className="savings-form-no-print rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-5 sm:p-6 shadow-xl border border-slate-700/60">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                        <div className="flex items-center gap-4">
                            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white font-black text-lg shrink-0 shadow-md">
                                {(memberAdmission?.applicant_name_bn || memberAdmission?.applicant_name_en || 'U').charAt(0)}
                            </div>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-base sm:text-lg font-bold text-white">
                                        {memberAdmission?.applicant_name_bn || memberAdmission?.applicant_name_en}
                                    </h2>
                                    <span className="px-2 py-0.5 rounded-md bg-purple-500/30 text-purple-200 text-[10px] font-mono font-bold border border-purple-400/20">
                                        সদস্য নং: {memberAdmission?.application_no || data.member_no || '—'}
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 mt-1">
                                    <span>NID: {memberAdmission?.nid_number || '—'}</span>
                                    <span>মোবাইল: {memberAdmission?.mobile_number || '—'}</span>
                                    {memberAdmission?.samity && (
                                        <span>সমিতি: {memberAdmission.samity.samity_name_bn || memberAdmission.samity.samity_name}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-700/60 text-xs">
                            <div className="px-3 py-2 rounded-xl bg-white/10 border border-white/10">
                                <span className="text-[10px] text-slate-400 block">স্কিম / পণ্য</span>
                                <span className="font-bold text-purple-200 truncate block max-w-[160px]">
                                    {savingsProduct?.product_name_bn || savingsProduct?.product_name}
                                </span>
                            </div>
                            <div className="px-3 py-2 rounded-xl bg-white/10 border border-white/10">
                                <span className="text-[10px] text-slate-400 block">মেয়াদ</span>
                                <span className="font-bold text-white">
                                    {savingsProduct?.duration_months
                                        ? savingsProduct.duration_months >= 12
                                            ? `${Math.round(savingsProduct.duration_months / 12)} বছর`
                                            : `${savingsProduct.duration_months} মাস`
                                        : '—'}
                                </span>
                            </div>
                            <div className="px-3 py-2 rounded-xl bg-white/10 border border-white/10">
                                <span className="text-[10px] text-slate-400 block">মুনাফার হার</span>
                                <span className="font-bold text-emerald-300">
                                    {savingsProduct?.interest_rate != null ? `${savingsProduct.interest_rate}%` : '—'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── BACKEND ERROR ALERT NOTIFICATION ────────────────────────────── */}
                {backendErrors && Object.keys(backendErrors).length > 0 && (
                    <div className="savings-form-no-print p-4 rounded-2xl bg-red-50/90 border border-red-200 text-red-900 shadow-sm animate-in fade-in">
                        <div className="flex items-center gap-2 mb-2 font-bold text-xs text-red-800">
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                            <span>আবেদনের তথ্যে কিছু ত্রুটি রয়েছে, অনুগ্রহ করে সংশোধন করুন:</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                            {Object.entries(backendErrors).map(([key, value]: [string, any]) => (
                                <span key={key} className="px-2.5 py-1 rounded-lg bg-red-100/80 text-red-800 font-medium">
                                    {Array.isArray(value) ? value[0] : value}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <form onSubmit={handleSave}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-1">
                        {/* ── LEFT SIDE: MODERN MINIMAL INPUT FORM ────────────────────── */}
                        <div className="space-y-6 savings-form-no-print">
                            {/* SECTION 1: OFFICE USE */}
                            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-black text-xs border border-purple-100">
                                            ১
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">
                                                অফিস কর্তৃক পূরণীয় তথ্য
                                            </h3>
                                            <p className="text-[11px] text-slate-400">
                                                হিসাব ও কিস্তির প্রাথমিক তথ্য
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                        Office Use
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            হিসাব খোলার তারিখ
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                value={data.account_opening_date}
                                                onChange={(e) => setData('account_opening_date', e.target.value)}
                                                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
                                            />
                                        </div>
                                    </div>

                                    <div data-field="monthly_savings_amount">
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                                            <span>মাসিক সঞ্চয়ের পরিমাণ (৳) <span className="text-red-500">*</span></span>
                                            <span className="text-[10px] font-normal text-slate-400">
                                                সীমা: ৳{(savingsProduct?.min_amount ?? 0).toLocaleString('bn-BD')}
                                                {savingsProduct?.max_amount ? ` – ৳${Number(savingsProduct.max_amount).toLocaleString('bn-BD')}` : ''}
                                            </span>
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">৳</span>
                                            <input
                                                type="number"
                                                step="1"
                                                min={savingsProduct?.min_amount ?? 0}
                                                max={savingsProduct?.max_amount ?? undefined}
                                                placeholder={`যেমন: ${(savingsProduct?.min_amount ?? 500)}`}
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
                                                className={`w-full pl-8 pr-3.5 py-2.5 bg-slate-50/70 border rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition ${
                                                    errors.monthly_savings_amount || errors.deposit_amount ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                                                }`}
                                            />
                                        </div>
                                        {(errors.monthly_savings_amount || errors.deposit_amount) && (
                                            <p className="text-red-500 text-xs mt-1 font-medium">
                                                {errors.monthly_savings_amount || errors.deposit_amount}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            মেয়াদ (স্কিম অনুযায়ী নির্ধারিত)
                                        </label>
                                        <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                                            <span className="px-2.5 py-1 rounded-lg bg-purple-600 text-white font-bold font-mono">
                                                {savingsProduct?.duration_months ? `${Math.round(savingsProduct.duration_months / 12)} বছর` : '—'}
                                            </span>
                                            <span className="text-slate-500 font-medium">
                                                {savingsProduct?.duration_months} মাস মেয়াদী
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            হিসাব নং
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="হিসাব নম্বর লিখুন"
                                            value={data.account_no}
                                            onChange={(e) => setData('account_no', e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition font-mono"
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            সদস্য নং / কোড
                                        </label>
                                        <input
                                            type="text"
                                            value={data.member_no}
                                            onChange={(e) => setData('member_no', e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: APPLICANT PHOTO & DETAILS */}
                            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-5">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-black text-xs border border-purple-100">
                                            ২
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">
                                                আবেদনকারীর ব্যক্তিগত তথ্য
                                            </h3>
                                            <p className="text-[11px] text-slate-400">
                                                ছবি, নাম ও পূর্ণাঙ্গ ঠিকানা
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Applicant Photo Card */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-2">
                                        আবেদনকারীর ছবি (পাসপোর্ট সাইজ)
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <div className="relative w-24 h-28 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/80 overflow-hidden flex items-center justify-center group shrink-0">
                                            {imagePreview.applicant_photo || data.applicant_photo ? (
                                                <>
                                                    <img
                                                        src={imagePreview.applicant_photo || data.applicant_photo || ''}
                                                        alt="আবেদনকারী"
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setData('applicant_photo', null);
                                                            setImagePreview(prev => ({ ...prev, applicant_photo: '' }));
                                                        }}
                                                        className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white shadow-xs opacity-80 hover:opacity-100 transition"
                                                        title="ছবি মুছুন"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="text-center p-2">
                                                    <Camera className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                                                    <span className="text-[10px] text-slate-400 font-medium">ছবি নেই</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/70 text-slate-700 text-xs font-bold cursor-pointer transition">
                                                <Upload className="w-3.5 h-3.5" />
                                                <span>ছবি আপলোড করুন</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleImageUpload('applicant_photo', e.target.files?.[0] || null)}
                                                    className="hidden"
                                                />
                                            </label>
                                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                                JPG বা PNG ফাইল নির্বাচন করুন। ছবি স্বয়ংক্রিয়ভাবে অপ্টিমাইজ হয়ে ফর্মে যুক্ত হবে।
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div data-field="applicant_name_bn">
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            আবেদনকারীর নাম (বাংলা) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.applicant_name_bn}
                                            onChange={(e) => {
                                                setData('applicant_name_bn', e.target.value);
                                                if (localErrors.applicant_name_bn) {
                                                    setLocalErrors(prev => {
                                                        const next = { ...prev };
                                                        delete next.applicant_name_bn;
                                                        return next;
                                                    });
                                                }
                                            }}
                                            className={`w-full px-3.5 py-2.5 bg-slate-50/70 border rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition ${
                                                errors.applicant_name_bn ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                                            }`}
                                        />
                                        {errors.applicant_name_bn && (
                                            <p className="text-red-500 text-xs mt-1 font-medium">{errors.applicant_name_bn}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            আবেদনকারীর নাম (English)
                                        </label>
                                        <input
                                            type="text"
                                            value={data.applicant_name_en}
                                            onChange={(e) => setData('applicant_name_en', e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
                                        />
                                    </div>

                                    <div data-field="nid_number">
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            জাতীয় পরিচয়পত্র নং (NID) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.nid_number}
                                            onChange={(e) => {
                                                setData('nid_number', e.target.value);
                                                if (localErrors.nid_number) {
                                                    setLocalErrors(prev => {
                                                        const next = { ...prev };
                                                        delete next.nid_number;
                                                        return next;
                                                    });
                                                }
                                            }}
                                            className={`w-full px-3.5 py-2.5 bg-slate-50/70 border rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition font-mono ${
                                                errors.nid_number ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                                            }`}
                                        />
                                        {errors.nid_number && (
                                            <p className="text-red-500 text-xs mt-1 font-medium">{errors.nid_number}</p>
                                        )}
                                    </div>

                                    <div data-field="father_husband_guardian">
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            পিতা/স্বামী/অভিভাবক <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.father_husband_guardian}
                                            onChange={(e) => {
                                                setData('father_husband_guardian', e.target.value);
                                                if (localErrors.father_husband_guardian) {
                                                    setLocalErrors(prev => {
                                                        const next = { ...prev };
                                                        delete next.father_husband_guardian;
                                                        return next;
                                                    });
                                                }
                                            }}
                                            className={`w-full px-3.5 py-2.5 bg-slate-50/70 border rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition ${
                                                errors.father_husband_guardian ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                                            }`}
                                        />
                                        {errors.father_husband_guardian && (
                                            <p className="text-red-500 text-xs mt-1 font-medium">{errors.father_husband_guardian}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Address Section */}
                                <div className="space-y-4 pt-2">
                                    {/* Current Address */}
                                    <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200/80 space-y-3">
                                        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5 text-purple-600" />
                                            <span>বর্তমান ঠিকানা</span>
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                                            <div className="sm:col-span-2">
                                                <label className="block text-[11px] font-semibold text-slate-500 mb-1">গ্রাম/রাস্তা</label>
                                                <input
                                                    type="text"
                                                    value={data.current_address_village}
                                                    onChange={(e) => setData('current_address_village', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-purple-600 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-slate-500 mb-1">ডাকঘর</label>
                                                <input
                                                    type="text"
                                                    value={data.current_address_post_office}
                                                    onChange={(e) => setData('current_address_post_office', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-purple-600 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-slate-500 mb-1">উপজেলা</label>
                                                <input
                                                    type="text"
                                                    value={data.current_address_upazila}
                                                    onChange={(e) => setData('current_address_upazila', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-purple-600 focus:outline-none"
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <label className="block text-[11px] font-semibold text-slate-500 mb-1">জেলা</label>
                                                <input
                                                    type="text"
                                                    value={data.current_address_district}
                                                    onChange={(e) => setData('current_address_district', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-purple-600 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Permanent Address */}
                                    <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200/80 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                                                <span>স্থায়ী ঠিকানা</span>
                                            </h4>
                                            <button
                                                type="button"
                                                onClick={copyCurrentToPermanentAddress}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition"
                                                title="বর্তমান ঠিকানার তথ্য এখানে বসান"
                                            >
                                                <Copy className="w-3 h-3" />
                                                <span>বর্তমান ঠিকানার অনুরূপ</span>
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                                            <div className="sm:col-span-2">
                                                <label className="block text-[11px] font-semibold text-slate-500 mb-1">গ্রাম/রাস্তা</label>
                                                <input
                                                    type="text"
                                                    value={data.permanent_address_village}
                                                    onChange={(e) => setData('permanent_address_village', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-purple-600 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-slate-500 mb-1">ডাকঘর</label>
                                                <input
                                                    type="text"
                                                    value={data.permanent_address_post_office}
                                                    onChange={(e) => setData('permanent_address_post_office', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-purple-600 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-slate-500 mb-1">উপজেলা</label>
                                                <input
                                                    type="text"
                                                    value={data.permanent_address_upazila}
                                                    onChange={(e) => setData('permanent_address_upazila', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-purple-600 focus:outline-none"
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <label className="block text-[11px] font-semibold text-slate-500 mb-1">জেলা</label>
                                                <input
                                                    type="text"
                                                    value={data.permanent_address_district}
                                                    onChange={(e) => setData('permanent_address_district', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-purple-600 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            পেশা
                                        </label>
                                        <input
                                            type="text"
                                            value={data.profession}
                                            onChange={(e) => setData('profession', e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            আয়ের উৎস
                                        </label>
                                        <input
                                            type="text"
                                            value={data.source_of_income}
                                            onChange={(e) => setData('source_of_income', e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 3: NOMINEES */}
                            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-black text-xs border border-purple-100">
                                            ৩
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">
                                                নমিনি সংক্রান্ত তথ্যাবলী
                                            </h3>
                                            <p className="text-[11px] text-slate-400">
                                                মৃত্যুর পর সঞ্চয় উত্তোলনের অধিকারী ব্যক্তি(গণ)
                                            </p>
                                        </div>
                                    </div>

                                    {/* Share percentage tracker pill */}
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                                            totalNomineePercentage === 100
                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                : totalNomineePercentage > 100
                                                    ? 'bg-red-50 text-red-800 border-red-200'
                                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                        }`}>
                                            মোট অংশ: {totalNomineePercentage}%
                                            {totalNomineePercentage === 100 ? ' (সম্পূর্ণ)' : ` (বাকি: ${Math.max(100 - totalNomineePercentage, 0)}%)`}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() => setData('nominees', [...data.nominees, { name: '', relation: '', percentage: 0, photo: null, nid_birth_registration: '' }])}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition shadow-2xs"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>নমিনি যোগ</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {data.nominees.map((nominee, idx) => (
                                        <div key={idx} className="p-4 rounded-2xl bg-slate-50/50 border border-slate-200 space-y-3 relative group">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[11px] font-bold inline-flex items-center justify-center">
                                                        {idx + 1}
                                                    </span>
                                                    <h4 className="text-xs font-bold text-slate-800">
                                                        {idx === 0 ? 'প্রধান নমিনি' : `সহ-নমিনি (${idx + 1})`}
                                                    </h4>
                                                </div>

                                                {data.nominees.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setData('nominees', data.nominees.filter((_, i) => i !== idx))}
                                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-800 p-1 rounded-lg hover:bg-red-50 transition"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        <span>মুছুন</span>
                                                    </button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-600 mb-1">নাম</label>
                                                    <input
                                                        type="text"
                                                        value={nominee.name}
                                                        placeholder="নমিনির নাম লিখুন"
                                                        onChange={(e) => {
                                                            const updated = [...data.nominees];
                                                            updated[idx].name = e.target.value;
                                                            setData('nominees', updated);
                                                        }}
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-purple-600 focus:outline-none"
                                                    />
                                                </div>

                                                <div data-field={`nominee_${idx}_relation`}>
                                                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                                        সম্পর্ক {nominee.name && '*'}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={nominee.relation}
                                                        placeholder="যেমন: স্বামী, স্ত্রী, পিতা, মাতা"
                                                        onChange={(e) => {
                                                            const updated = [...data.nominees];
                                                            updated[idx].relation = e.target.value;
                                                            setData('nominees', updated);
                                                            if (localErrors[`nominee_${idx}_relation`]) {
                                                                setLocalErrors(prev => {
                                                                    const next = { ...prev };
                                                                    delete next[`nominee_${idx}_relation`];
                                                                    return next;
                                                                });
                                                            }
                                                        }}
                                                        className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-medium focus:border-purple-600 focus:outline-none ${
                                                            errors[`nominee_${idx}_relation`] ? 'border-red-500' : 'border-slate-200'
                                                        }`}
                                                    />
                                                    {errors[`nominee_${idx}_relation`] && (
                                                        <p className="text-red-500 text-[10px] mt-1 font-medium">{errors[`nominee_${idx}_relation`]}</p>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-600 mb-1">NID / জন্ম নিবন্ধন নং</label>
                                                    <input
                                                        type="text"
                                                        value={nominee.nid_birth_registration}
                                                        placeholder="NID বা জন্ম নিবন্ধন নম্বর"
                                                        onChange={(e) => {
                                                            const updated = [...data.nominees];
                                                            updated[idx].nid_birth_registration = e.target.value;
                                                            setData('nominees', updated);
                                                        }}
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-purple-600 focus:outline-none font-mono"
                                                    />
                                                </div>

                                                <div data-field={`nominee_${idx}_percentage`}>
                                                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                                        প্রাপ্য অংশ (%) {nominee.name && '*'}
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            placeholder="যেমন: 100"
                                                            value={nominee.percentage || ''}
                                                            onChange={(e) => {
                                                                const updated = [...data.nominees];
                                                                updated[idx].percentage = Number(e.target.value);
                                                                setData('nominees', updated);
                                                                if (localErrors[`nominee_${idx}_percentage`]) {
                                                                    setLocalErrors(prev => {
                                                                        const next = { ...prev };
                                                                        delete next[`nominee_${idx}_percentage`];
                                                                        return next;
                                                                    });
                                                                }
                                                            }}
                                                            className={`w-full pr-8 pl-3 py-2 bg-white border rounded-xl text-xs font-bold focus:border-purple-600 focus:outline-none ${
                                                                errors[`nominee_${idx}_percentage`] ? 'border-red-500' : 'border-slate-200'
                                                            }`}
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
                                                    </div>
                                                    {errors[`nominee_${idx}_percentage`] && (
                                                        <p className="text-red-500 text-[10px] mt-1 font-medium">{errors[`nominee_${idx}_percentage`]}</p>
                                                    )}
                                                </div>

                                                <div className="sm:col-span-2 flex items-center gap-3 pt-1">
                                                    <div className="w-12 h-14 rounded-xl border border-dashed border-slate-300 bg-white overflow-hidden flex items-center justify-center shrink-0">
                                                        {imagePreview[`nominee_${idx}_photo`] || nominee.photo ? (
                                                            <img
                                                                src={imagePreview[`nominee_${idx}_photo`] || nominee.photo || ''}
                                                                alt={`নমিনি ${idx + 1}`}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <User className="w-5 h-5 text-slate-300" />
                                                        )}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-bold cursor-pointer transition shadow-2xs">
                                                            <Camera className="w-3 h-3 text-slate-500" />
                                                            <span>স্ট্যাম্প ছবি আপলোড</span>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={(e) => handleNomineePhotoUpload(idx, e.target.files?.[0] || null)}
                                                                className="hidden"
                                                            />
                                                        </label>
                                                        <p className="text-[10px] text-slate-400">ছোট স্ট্যাম্প সাইজ ছবি</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            নমিনির সম্মিলিত NID / জন্ম নিবন্ধন
                                        </label>
                                        <input
                                            type="text"
                                            value={data.nominee_nid_birth_registration}
                                            onChange={(e) => setData('nominee_nid_birth_registration', e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            মাসিক সঞ্চয় জমা দেওয়ার তারিখ
                                        </label>
                                        <input
                                            type="date"
                                            value={data.monthly_deposit_submission_date}
                                            onChange={(e) => setData('monthly_deposit_submission_date', e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 4: OFFICER PINS */}
                            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-black text-xs border border-purple-100">
                                            ৪
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">
                                                কর্মকর্তাদের অনুমোদন পিন (PIN)
                                            </h3>
                                            <p className="text-[11px] text-slate-400">
                                                মুদ্রিত ফর্মে হাতে স্বাক্ষর করা হবে; এখানে শুধু PIN প্রদান করুন
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                                    <div className="p-3.5 rounded-2xl bg-slate-50/60 border border-slate-200">
                                        <span className="text-[11px] font-bold text-slate-600 block mb-1">অফিসার PIN</span>
                                        <input
                                            type="text"
                                            placeholder="PIN No"
                                            value={data.officer_pin}
                                            onChange={(e) => setData('officer_pin', e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold focus:border-purple-600 focus:outline-none"
                                        />
                                    </div>
                                    <div className="p-3.5 rounded-2xl bg-slate-50/60 border border-slate-200">
                                        <span className="text-[11px] font-bold text-slate-600 block mb-1">হিসাবরক্ষক PIN</span>
                                        <input
                                            type="text"
                                            placeholder="PIN No"
                                            value={data.accountant_pin}
                                            onChange={(e) => setData('accountant_pin', e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold focus:border-purple-600 focus:outline-none"
                                        />
                                    </div>
                                    <div className="p-3.5 rounded-2xl bg-slate-50/60 border border-slate-200">
                                        <span className="text-[11px] font-bold text-slate-600 block mb-1">শাখা ব্যবস্থাপক PIN</span>
                                        <input
                                            type="text"
                                            placeholder="PIN No"
                                            value={data.branch_manager_pin}
                                            onChange={(e) => setData('branch_manager_pin', e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold focus:border-purple-600 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* BOTTOM SUBMIT BUTTON */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-600/25 transition active:scale-95 disabled:opacity-50"
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>আবেদনপত্র সংরক্ষণ হচ্ছে...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            <span>আবেদনপত্র সংরক্ষণ করুন</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* ── RIGHT SIDE: LIVE PREVIEW (PRINT COMPLIANT) ─────────────── */}
                        <div className={`lg:sticky lg:top-4 lg:h-fit print:block print-container savings-form-print-area ${
                            showPreview ? 'block' : 'hidden lg:block'
                        }`}>
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-5 print:shadow-none print:p-0 print:border-none print:rounded-none">
                                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2 savings-form-no-print">
                                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                        <Eye className="w-3.5 h-3.5 text-purple-600" />
                                        <span>লাইভ প্রিন্ট প্রিভিউ</span>
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium">কাগজের ফর্ম অনুসারে প্রদর্শিত</span>
                                </div>
                                <SavingsApplicationPrintView data={withLiveMemberCode(data, memberAdmission)} />
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
