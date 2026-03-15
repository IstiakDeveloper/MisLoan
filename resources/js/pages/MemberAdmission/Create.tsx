import React, { useState, useEffect } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Save, Send, Plus, Trash2, Search, ChevronDown } from 'lucide-react';
import { MemberAdmissionFormData, FamilyMember, OtherAsset } from '@/types/memberAdmission';
import bangladeshData from '@/data/bangladeshAddresses.json';
import ApproverSelectionStep from '@/components/MemberAdmission/ApproverSelectionStep';
import FormSection from '@/components/MemberAdmission/FormSection';

interface SamityItem {
    id: number;
    samity_name: string;
    samity_code?: string;
    branch_id: number;
    branch?: { id: number; name: string; code?: string };
}

interface Props {
    branches: Array<{ id: number; name: string }>;
    samities: Array<SamityItem>;
    categories: Array<{ id: number; category_name: string }>;
    availableApprovers: Array<{ id: number; name: string; email: string; role: { name: string } }>;
}

/** Samity code without branch prefix (first 4 digits). e.g. 00010071 → 0071 */
function getSamityDisplayCode(samity: SamityItem): string {
    const code = samity.samity_code || '';
    const branchCode = samity.branch?.code || '';
    if (branchCode && code.startsWith(branchCode)) {
        return code.slice(branchCode.length);
    }
    return code;
}

export default function Create({ branches, samities, categories, availableApprovers }: Props) {
    const page = usePage<{
        auth: {
            user?: {
                role?: { name: string };
                has_all_access?: boolean;
                branch?: { id: number };
            };
        };
    }>();
    const pageAuth = page.props.auth;
    const isFieldOfficer = pageAuth.user?.role?.name === 'field_officer';
    const [availableSamities, setAvailableSamities] = useState(samities);
    const [samitySearchQuery, setSamitySearchQuery] = useState('');
    const [samityDropdownOpen, setSamityDropdownOpen] = useState(false);

    // Address dropdown states
    const [presentDistricts, setPresentDistricts] = useState<string[]>([]);
    const [presentUpazilas, setPresentUpazilas] = useState<string[]>([]);
    const [permanentDistricts, setPermanentDistricts] = useState<string[]>([]);
    const [permanentUpazilas, setPermanentUpazilas] = useState<string[]>([]);

    // Auto-fill branch for branch users (no all-access) using shared auth.user.branch.id
    const hasAllAccess = !!pageAuth.user?.has_all_access;
    const initialBranchId =
        !hasAllAccess && pageAuth.user?.branch?.id ? pageAuth.user.branch.id : 0;

    const { data, setData, post, processing, errors } = useForm<MemberAdmissionFormData>({
        branch_id: initialBranchId,
        samity_id: 0,
        member_category_id: 0,
        survey_date: '',
        admission_date: '',

        // Personal Information
        applicant_name_en: '',
        father_name_en: '',
        mother_name_en: '',
        spouse_name_en: '',
        applicant_name_bn: '',
        father_name_bn: '',
        mother_name_bn: '',
        spouse_name_bn: '',

        marital_status: 'single',
        mobile_number: '',
        alternative_mobile: '',

        // Present Address
        present_division: '',
        present_district: '',
        present_upazila: '',
        present_union: '',
        present_village_road: '',
        present_post_code: '',

        // Permanent Address
        permanent_address_same: false,
        permanent_division: '',
        permanent_district: '',
        permanent_upazila: '',
        permanent_union: '',
        permanent_village_road: '',
        permanent_post_code: '',

        // Identity
        nid_number: '',
        smart_card_number: '',
        birth_certificate_number: '',
        date_of_birth: '',
        gender: 'male',
        family_member_mobile: '',

        // Guarantor
        guarantor_name: '',
        guarantor_mobile: '',
        tin_number: '',
        want_sms_service: false,

        // Economic
        business_details: '',
        job_details: '',
        other_income_details: '',
        total_asset_value: 0,
        house_type: '',

        // Property
        mud_house_count: 0,
        tin_house_count: 0,
        brick_house_count: 0,
        semi_brick_house_count: 0,

        // Livestock
        cow_buffalo_count: 0,
        goat_sheep_count: 0,
        duck_chicken_count: 0,
        other_livestock: '',
        other_livestock_count: 0,

        // Land
        cultivable_land_amount: 0,
        cultivable_land_value: 0,
        non_cultivable_land_amount: 0,
        non_cultivable_land_value: 0,

        // Financial
        monthly_income: 0,
        monthly_expense: 0,
        monthly_savings: 0,

        // Additional
        interviewer_name: '',
        employee_name: '',
        other_loan_info: '',
        collector_comment: '',
        guardian_name: '',

        // Documents
        customer_photo: null,
        customer_nid_photo: null,
        guardian_photo: null,
        guardian_nid_photo: null,
        applicant_signature: null,

        family_members: [],
        other_assets: [],
        selected_approvers: [],
    });

    useEffect(() => {
        if (data.branch_id) {
            const filtered = samities.filter((s) => s.branch_id === data.branch_id);
            setAvailableSamities(filtered);
            if (!filtered.find((s) => s.id === data.samity_id)) {
                setData('samity_id', 0);
                setSamitySearchQuery('');
            } else {
                const selected = filtered.find((s) => s.id === data.samity_id);
                if (selected) {
                    const disp = getSamityDisplayCode(selected);
                    setSamitySearchQuery(disp ? `${disp} - ${selected.samity_name}` : selected.samity_name);
                }
            }
        } else {
            setSamitySearchQuery('');
        }
    }, [data.branch_id, data.samity_id]);

    const filteredSamities = availableSamities.filter((s) => {
        const q = samitySearchQuery.trim().toLowerCase();
        if (!q) return true;
        const nameMatch = s.samity_name.toLowerCase().includes(q);
        const displayCode = getSamityDisplayCode(s);
        const codeMatch = displayCode.toLowerCase().includes(q) || (s.samity_code || '').toLowerCase().includes(q);
        return nameMatch || codeMatch;
    });
    const selectedSamity = availableSamities.find((s) => s.id === data.samity_id);

    const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const branchId = Number(e.target.value);
        setData('branch_id', branchId);
    };

    useEffect(() => {
        if (data.permanent_address_same) {
            setData((prev) => ({
                ...prev,
                permanent_division: prev.present_division,
                permanent_district: prev.present_district,
                permanent_upazila: prev.present_upazila,
                permanent_union: prev.present_union,
                permanent_village_road: prev.present_village_road,
                permanent_post_code: prev.present_post_code,
            }));
        }
    }, [data.permanent_address_same]);

    // Update present districts when division changes
    useEffect(() => {
        if (data.present_division) {
            const districts = bangladeshData.districtsByDivision[data.present_division as keyof typeof bangladeshData.districtsByDivision] || [];
            setPresentDistricts(districts);
            if (!districts.includes(data.present_district)) {
                setData('present_district', '');
                setPresentUpazilas([]);
            }
        }
    }, [data.present_division]);

    // Update present upazilas when district changes
    useEffect(() => {
        if (data.present_district) {
            const upazilas = bangladeshData.upazilasByDistrict[data.present_district as keyof typeof bangladeshData.upazilasByDistrict] || [];
            setPresentUpazilas(upazilas);
            if (!upazilas.includes(data.present_upazila)) {
                setData('present_upazila', '');
            }
        }
    }, [data.present_district]);

    // Update permanent districts when division changes
    useEffect(() => {
        if (data.permanent_division) {
            const districts = bangladeshData.districtsByDivision[data.permanent_division as keyof typeof bangladeshData.districtsByDivision] || [];
            setPermanentDistricts(districts);
            if (!districts.includes(data.permanent_district)) {
                setData('permanent_district', '');
                setPermanentUpazilas([]);
            }
        }
    }, [data.permanent_division]);

    // Update permanent upazilas when district changes
    useEffect(() => {
        if (data.permanent_district) {
            const upazilas = bangladeshData.upazilasByDistrict[data.permanent_district as keyof typeof bangladeshData.upazilasByDistrict] || [];
            setPermanentUpazilas(upazilas);
            if (!upazilas.includes(data.permanent_upazila)) {
                setData('permanent_upazila', '');
            }
        }
    }, [data.permanent_district]);

    // Auto-calculate সঞ্চয় = মাসিক আয় - মাসিক ব্যয়
    useEffect(() => {
        const income = Number(data.monthly_income) || 0;
        const expense = Number(data.monthly_expense) || 0;
        setData('monthly_savings', Math.max(0, income - expense));
    }, [data.monthly_income, data.monthly_expense]);

    // Auto-save draft every 2 minutes
    useEffect(() => {
        const interval = setInterval(() => {
            if (data.branch_id && data.samity_id) {
                // Save draft silently
                post('/member-admissions?draft=1', {
                    preserveScroll: true,
                    preserveState: true,
                    only: [],
                    onSuccess: () => console.log('Draft auto-saved'),
                });
            }
        }, 120000); // 2 minutes

        return () => clearInterval(interval);
    }, [data]);

    const handleSubmit = (saveAsDraft: boolean) => {
        // Submit goes to branch manager automatically; no approver selection needed
        post(`/member-admissions${saveAsDraft ? '?draft=1' : ''}`, {
            preserveScroll: true,
            onSuccess: () => {
                router.visit('/member-admissions');
            },
        });
    };

    const addFamilyMember = () => {
        setData('family_members', [
            ...data.family_members!,
            {
                member_name: '',
                relation_with_head: '',
                gender: 'male',
                age_years: 0,
                age_months: 0,
                education_level: '',
                occupation: '',
                monthly_income: 0,
                business_details: '',
                job_details: '',
                other_income_details: '',
            },
        ]);
    };

    const removeFamilyMember = (index: number) => {
        const newMembers = data.family_members!.filter((_, i) => i !== index);
        setData('family_members', newMembers);
    };

    const updateFamilyMember = (index: number, field: keyof FamilyMember, value: any) => {
        const newMembers = [...data.family_members!];
        newMembers[index] = { ...newMembers[index], [field]: value };
        setData('family_members', newMembers);
    };

    const addOtherAsset = () => {
        setData('other_assets', [
            ...data.other_assets!,
            {
                asset_description: '',
                quantity_amount: '',
                estimated_value: 0,
            },
        ]);
    };

    const removeOtherAsset = (index: number) => {
        const newAssets = data.other_assets!.filter((_, i) => i !== index);
        setData('other_assets', newAssets);
    };

    const updateOtherAsset = (index: number, field: keyof OtherAsset, value: any) => {
        const newAssets = [...data.other_assets!];
        newAssets[index] = { ...newAssets[index], [field]: value };
        setData('other_assets', newAssets);
    };

    return (
        <AdminLayout>
            <Head title="New Member Admission Application" />

            <div className="space-y-4 max-w-full">
                <header className="pb-2">
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">New Member Admission</h1>
                    <p className="text-xs md:text-sm text-gray-500 mt-1">Complete the form below. All sections on this page.</p>
                </header>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-6">
                    <div className="space-y-4 md:space-y-6">
                        {/* ১. সংস্থা ও তারিখ */}
                        <FormSection title="Organization & Date">
                            <div className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                            Branch (শাখা) <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={data.branch_id}
                                            onChange={handleBranchChange}
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                            disabled={!hasAllAccess}
                                        >
                                            <option value={0}>Select Branch</option>
                                            {branches.map((branch) => (
                                                <option key={branch.id} value={branch.id}>
                                                    {branch.name}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.branch_id && (
                                            <p className="mt-0.5 text-xs text-red-600">{errors.branch_id}</p>
                                        )}
                                    </div>

                                    <div className="relative">
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                            ১. Samity (সমিতি) <span className="text-red-500">*</span>
                                        </label>
                                        <div
                                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 ${!data.branch_id ? 'bg-gray-50 cursor-not-allowed opacity-70' : ''}`}
                                        >
                                            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                            <input
                                                type="text"
                                                placeholder="Search by name or code..."
                                                value={samitySearchQuery}
                                                onChange={(e) => {
                                                    setSamitySearchQuery(e.target.value);
                                                    setSamityDropdownOpen(true);
                                                }}
                                                onFocus={() => data.branch_id && setSamityDropdownOpen(true)}
                                                onBlur={() => setTimeout(() => setSamityDropdownOpen(false), 150)}
                                                disabled={!data.branch_id}
                                                className="flex-1 min-w-0 border-0 p-0 text-sm focus:ring-0 focus:outline-none disabled:bg-transparent disabled:cursor-not-allowed"
                                            />
                                            <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${samityDropdownOpen ? 'rotate-180' : ''}`} />
                                        </div>
                                        {samityDropdownOpen && data.branch_id && (
                                            <ul className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg py-1">
                                                {filteredSamities.length === 0 ? (
                                                    <li className="px-3 py-2 text-sm text-gray-500">No samity found</li>
                                                ) : (
                                                    filteredSamities.map((samity) => {
                                                        const displayCode = getSamityDisplayCode(samity);
                                                        const label = displayCode ? `${displayCode} - ${samity.samity_name}` : samity.samity_name;
                                                        return (
                                                            <li key={samity.id}>
                                                                <button
                                                                    type="button"
                                                                    onMouseDown={(e) => e.preventDefault()}
                                                                    onClick={() => {
                                                                        setData('samity_id', samity.id);
                                                                        setSamitySearchQuery(label);
                                                                        setSamityDropdownOpen(false);
                                                                    }}
                                                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${data.samity_id === samity.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                                                                >
                                                                    {label}
                                                                </button>
                                                            </li>
                                                        );
                                                    })
                                                )}
                                            </ul>
                                        )}
                                        {selectedSamity && !samityDropdownOpen && (
                                            <p className="mt-1 text-xs text-gray-500">
                                                Selected: {getSamityDisplayCode(selectedSamity) ? `${getSamityDisplayCode(selectedSamity)} - ${selectedSamity.samity_name}` : selectedSamity.samity_name}
                                            </p>
                                        )}
                                        {errors.samity_id && (
                                            <p className="mt-0.5 text-xs text-red-600">{errors.samity_id}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                            ২. Member Category (সদস্য শ্রেণি) <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={data.member_category_id}
                                            onChange={(e) => setData('member_category_id', Number(e.target.value))}
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value={0}>Select Category</option>
                                            {categories.map((category) => (
                                                <option key={category.id} value={category.id}>
                                                    {category.category_name}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.member_category_id && (
                                            <p className="mt-0.5 text-xs text-red-600">{errors.member_category_id}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                            জরিপের তারিখ <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={data.survey_date}
                                            onChange={(e) => setData('survey_date', e.target.value)}
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        {errors.survey_date && (
                                            <p className="mt-0.5 text-xs text-red-600">{errors.survey_date}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                            ভর্তির তারিখ <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={data.admission_date}
                                            onChange={(e) => setData('admission_date', e.target.value)}
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        {errors.admission_date && (
                                            <p className="mt-0.5 text-xs text-red-600">{errors.admission_date}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </FormSection>

                        {/* ২. ব্যক্তিগত তথ্য */}
                        <FormSection title="Personal Information">
                            {/* ২ কলাম: বাম = বাংলা, ডান = ইংরেজি */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                {/* কলাম ১ — বাংলা */}
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                            ৩. আবেদনকারীর নাম (বাংলায়) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.applicant_name_bn}
                                            onChange={(e) => setData('applicant_name_bn', e.target.value)}
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        {errors.applicant_name_bn && (
                                            <p className="mt-0.5 text-xs text-red-600">{errors.applicant_name_bn}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                            ৪. পিতার নাম (বাংলায়) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.father_name_bn}
                                            onChange={(e) => setData('father_name_bn', e.target.value)}
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        {errors.father_name_bn && (
                                            <p className="mt-0.5 text-xs text-red-600">{errors.father_name_bn}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                            ৫. মাতার নাম (বাংলায়) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.mother_name_bn}
                                            onChange={(e) => setData('mother_name_bn', e.target.value)}
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        {errors.mother_name_bn && (
                                            <p className="mt-0.5 text-xs text-red-600">{errors.mother_name_bn}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                            ৬. বৈবাহিক অবস্থা <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={data.marital_status}
                                            onChange={(e) => setData('marital_status', e.target.value as any)}
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="single">Single</option>
                                            <option value="married">Married</option>
                                            <option value="divorced">Divorced</option>
                                            <option value="widowed">Widowed</option>
                                        </select>
                                        {errors.marital_status && (
                                            <p className="mt-0.5 text-xs text-red-600">{errors.marital_status}</p>
                                        )}
                                    </div>
                                    {data.marital_status === 'married' && (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                                ৭. স্বামী/স্ত্রীর নাম (বাংলায়)
                                            </label>
                                            <input
                                                type="text"
                                                value={data.spouse_name_bn}
                                                onChange={(e) => setData('spouse_name_bn', e.target.value)}
                                                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                                {data.marital_status === 'married' ? '৮' : '৭'}. মোবাইল নং <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="tel"
                                                value={data.mobile_number}
                                                onChange={(e) => setData('mobile_number', e.target.value)}
                                                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                            {errors.mobile_number && (
                                                <p className="mt-0.5 text-xs text-red-600">{errors.mobile_number}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                                {data.marital_status === 'married' ? '৯' : '৮'}. বিকল্প মোবাইল নং
                                            </label>
                                            <input
                                                type="tel"
                                                value={data.alternative_mobile}
                                                onChange={(e) => setData('alternative_mobile', e.target.value)}
                                                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* কলাম ২ — ইংরেজি */}
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                            Applicant's Name (English) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.applicant_name_en}
                                            onChange={(e) => setData('applicant_name_en', e.target.value)}
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        {errors.applicant_name_en && (
                                            <p className="mt-0.5 text-xs text-red-600">{errors.applicant_name_en}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                            Father's Name (English) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.father_name_en}
                                            onChange={(e) => setData('father_name_en', e.target.value)}
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        {errors.father_name_en && (
                                            <p className="mt-0.5 text-xs text-red-600">{errors.father_name_en}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                            Mother's Name (English) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.mother_name_en}
                                            onChange={(e) => setData('mother_name_en', e.target.value)}
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        {errors.mother_name_en && (
                                            <p className="mt-0.5 text-xs text-red-600">{errors.mother_name_en}</p>
                                        )}
                                    </div>

                                    {data.marital_status === 'married' && (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                                Spouse Name (English)
                                            </label>
                                            <input
                                                type="text"
                                                value={data.spouse_name_en}
                                                onChange={(e) => setData('spouse_name_en', e.target.value)}
                                                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </FormSection>

                        {/* ৩. ঠিকানা */}
                        <section className="border-b border-gray-100 pb-4 last:border-0">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-800 mb-2">১০. Present Address (বর্তমান ঠিকানা)</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                            Division (বিভাগ) <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={data.present_division}
                                            onChange={(e) => setData('present_division', e.target.value)}
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">Select Division (বিভাগ নির্বাচন করুন)</option>
                                            {bangladeshData.divisions.map((division) => (
                                                <option key={division} value={division}>{division}</option>
                                            ))}
                                        </select>
                                        {errors.present_division && (
                                            <p className="mt-0.5 text-xs text-red-600">{errors.present_division}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                            District (জেলা) <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={data.present_district}
                                            onChange={(e) => setData('present_district', e.target.value)}
                                            disabled={!data.present_division}
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                        >
                                            <option value="">Select District (জেলা নির্বাচন করুন)</option>
                                            {presentDistricts.map((district) => (
                                                <option key={district} value={district}>{district}</option>
                                            ))}
                                        </select>
                                        {errors.present_district && (
                                            <p className="mt-0.5 text-xs text-red-600">{errors.present_district}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                            Upazila (উপজেলা) <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={data.present_upazila}
                                            onChange={(e) => setData('present_upazila', e.target.value)}
                                            disabled={!data.present_district}
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                        >
                                            <option value="">Select Upazila (উপজেলা নির্বাচন করুন)</option>
                                            {presentUpazilas.map((upazila) => (
                                                <option key={upazila} value={upazila}>{upazila}</option>
                                            ))}
                                        </select>
                                        {errors.present_upazila && (
                                            <p className="mt-0.5 text-xs text-red-600">{errors.present_upazila}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">Union (ইউনিয়ন)</label>
                                        <input
                                            type="text"
                                            value={data.present_union}
                                            onChange={(e) => setData('present_union', e.target.value)}
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                            Village/Road (গ্রাম/রাস্তা)
                                        </label>
                                        <input
                                            type="text"
                                            value={data.present_village_road}
                                            onChange={(e) => setData('present_village_road', e.target.value)}
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">Post Code (পোস্ট কোড)</label>
                                        <input
                                            type="text"
                                            value={data.present_post_code}
                                            onChange={(e) => setData('present_post_code', e.target.value)}
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="same_address"
                                    checked={data.permanent_address_same}
                                    onChange={(e) => setData('permanent_address_same', e.target.checked)}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="same_address" className="text-sm font-medium text-gray-700">
                                    Permanent address same as present address (স্থায়ী ঠিকানা বর্তমান ঠিকানার মতো)
                                </label>
                            </div>

                            {!data.permanent_address_same && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-800 mb-2 mt-3">১১. Permanent Address (স্থায়ী ঠিকানা)</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-0.5">Division (বিভাগ)</label>
                                            <select
                                                value={data.permanent_division}
                                                onChange={(e) => setData('permanent_division', e.target.value)}
                                                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                <option value="">Select Division (বিভাগ নির্বাচন করুন)</option>
                                                {bangladeshData.divisions.map((division) => (
                                                    <option key={division} value={division}>{division}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-0.5">District (জেলা)</label>
                                            <select
                                                value={data.permanent_district}
                                                onChange={(e) => setData('permanent_district', e.target.value)}
                                                disabled={!data.permanent_division}
                                                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                            >
                                                <option value="">Select District (জেলা নির্বাচন করুন)</option>
                                                {permanentDistricts.map((district) => (
                                                    <option key={district} value={district}>{district}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-0.5">Upazila (উপজেলা)</label>
                                            <select
                                                value={data.permanent_upazila}
                                                onChange={(e) => setData('permanent_upazila', e.target.value)}
                                                disabled={!data.permanent_district}
                                                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                            >
                                                <option value="">Select Upazila (উপজেলা নির্বাচন করুন)</option>
                                                {permanentUpazilas.map((upazila) => (
                                                    <option key={upazila} value={upazila}>{upazila}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-0.5">Union (ইউনিয়ন)</label>
                                            <input
                                                type="text"
                                                value={data.permanent_union}
                                                onChange={(e) => setData('permanent_union', e.target.value)}
                                                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                                Village/Road (গ্রাম/রাস্তা)
                                            </label>
                                            <input
                                                type="text"
                                                value={data.permanent_village_road}
                                                onChange={(e) => setData('permanent_village_road', e.target.value)}
                                                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-0.5">Post Code (পোস্ট কোড)</label>
                                            <input
                                                type="text"
                                                value={data.permanent_post_code}
                                                onChange={(e) => setData('permanent_post_code', e.target.value)}
                                                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* ৪. পরিচয় ও জামিনদার */}
                        <section className="border-b border-gray-100 pb-4 last:border-0">
                            <h3 className="text-sm font-semibold text-gray-900 mb-2">১২. Identity Information (পরিচয় তথ্য)</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-0.5">National ID No.</label>
                                    <input
                                        type="text"
                                        value={data.nid_number}
                                        onChange={(e) => setData('nid_number', e.target.value)}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                        Smart Card No.
                                    </label>
                                    <input
                                        type="text"
                                        value={data.smart_card_number}
                                        onChange={(e) => setData('smart_card_number', e.target.value)}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            <h3 className="text-sm font-semibold text-gray-800 mt-4 mb-2">১৩. Other Identity Information (জন্ম সনদ নং, DOB, Gender, Family Mobile)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 mt-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-0.5">জন্ম সনদ নং (প্রযোজ্য ক্ষেত্রে)</label>
                                    <input
                                        type="text"
                                        value={data.birth_certificate_number}
                                        onChange={(e) => setData('birth_certificate_number', e.target.value)}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Date of Birth</label>
                                    <input
                                        type="date"
                                        value={data.date_of_birth}
                                        onChange={(e) => setData('date_of_birth', e.target.value)}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Gender (লিঙ্গ) <span className="text-red-500">*</span></label>
                                    <select
                                        value={data.gender}
                                        onChange={(e) => setData('gender', e.target.value as any)}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                    {errors.gender && <p className="mt-0.5 text-xs text-red-600">{errors.gender}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Family Members Mobile Number</label>
                                    <input
                                        type="tel"
                                        value={data.family_member_mobile}
                                        onChange={(e) => setData('family_member_mobile', e.target.value)}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <h3 className="text-sm font-semibold text-gray-800 mt-4 mb-2">১৪. Co-Applicant/Guarantor Name, ১৫. TIN ও এসএমএস</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-0.5">১৪. Co-Applicant/Guarantor Name</label>
                                    <input
                                        type="text"
                                        value={data.guarantor_name}
                                        onChange={(e) => setData('guarantor_name', e.target.value)}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                        Guarantor Mobile Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={data.guarantor_mobile}
                                        onChange={(e) => setData('guarantor_mobile', e.target.value)}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-0.5">১৫. TIN (ট্র্যাক্স সার্টিফিকেট নং)</label>
                                    <input
                                        type="text"
                                        value={data.tin_number}
                                        onChange={(e) => setData('tin_number', e.target.value)}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="want_sms"
                                        checked={data.want_sms_service}
                                        onChange={(e) => setData('want_sms_service', e.target.checked)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <label htmlFor="want_sms" className="text-sm font-medium text-gray-700">
                                        সদস্য কি এসএমএস সেবা নিতে চান?
                                    </label>
                                </div>
                            </div>
                        </section>

                        {/* ৫. পরিবার ও আর্থিক কর্মকাণ্ড */}
                        <section className="border-b border-gray-100 pb-4 last:border-0">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-gray-900">১৬. পরিবারের তথ্য / Family Members</h3>
                                <button
                                    type="button"
                                    onClick={addFamilyMember}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs md:text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Member
                                </button>
                            </div>

                            {data.family_members && data.family_members.length > 0 ? (
                                <div className="space-y-4">
                                    {data.family_members.map((member, index) => (
                                        <div key={index} className="p-2.5 border border-gray-200 rounded-md bg-gray-50/50">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="font-medium text-gray-900">Member #{index + 1}</h4>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFamilyMember(index)}
                                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Name (নাম)</label>
                                                    <input
                                                        type="text"
                                                        value={member.member_name}
                                                        onChange={(e) => updateFamilyMember(index, 'member_name', e.target.value)}
                                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Relationship (সম্পর্ক)</label>
                                                    <input
                                                        type="text"
                                                        value={member.relation_with_head}
                                                        onChange={(e) => updateFamilyMember(index, 'relation_with_head', e.target.value)}
                                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Gender (লিঙ্গ)</label>
                                                    <select
                                                        value={member.gender}
                                                        onChange={(e) => updateFamilyMember(index, 'gender', e.target.value)}
                                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                                    >
                                                        <option value="male">Male</option>
                                                        <option value="female">Female</option>
                                                        <option value="other">Other</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Age - Years (বয়স - বছর)</label>
                                                    <input
                                                        type="number"
                                                        value={member.age_years}
                                                        onChange={(e) => updateFamilyMember(index, 'age_years', Number(e.target.value))}
                                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Age - Months (বয়স - মাস)</label>
                                                    <input
                                                        type="number"
                                                        value={member.age_months}
                                                        onChange={(e) => updateFamilyMember(index, 'age_months', Number(e.target.value))}
                                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Education Level (শিক্ষাগত যোগ্যতা)</label>
                                                    <input
                                                        type="text"
                                                        value={member.education_level}
                                                        onChange={(e) => updateFamilyMember(index, 'education_level', e.target.value)}
                                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Occupation (পেশা)</label>
                                                    <input
                                                        type="text"
                                                        value={member.occupation}
                                                        onChange={(e) => updateFamilyMember(index, 'occupation', e.target.value)}
                                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Monthly Income (মাসিক আয়)</label>
                                                    <input
                                                        type="number"
                                                        value={member.monthly_income}
                                                        onChange={(e) => updateFamilyMember(index, 'monthly_income', Number(e.target.value))}
                                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">No family members added</div>
                            )}

                            {data.family_members && data.family_members.length > 0 && (
                                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md">
                                    <p className="font-medium text-sm text-gray-800 mb-2">আর্থিক কর্মকাণ্ড সম্পর্কিত (যেকোন একটি সিলেক্ট করুন)</p>
                                    <div className="flex flex-wrap gap-6">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="economic_activity"
                                                checked={!!data.business_details}
                                                onChange={() => {
                                                    setData('business_details', '✓');
                                                    setData('job_details', '');
                                                    setData('other_income_details', '');
                                                }}
                                                className="w-4 h-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm font-medium text-gray-700">ক. ব্যবসা</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="economic_activity"
                                                checked={!!data.job_details}
                                                onChange={() => {
                                                    setData('business_details', '');
                                                    setData('job_details', '✓');
                                                    setData('other_income_details', '');
                                                }}
                                                className="w-4 h-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm font-medium text-gray-700">খ. চাকরি</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="economic_activity"
                                                checked={!!data.other_income_details}
                                                onChange={() => {
                                                    setData('business_details', '');
                                                    setData('job_details', '');
                                                    setData('other_income_details', '✓');
                                                }}
                                                className="w-4 h-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm font-medium text-gray-700">গ. অন্যান্য</span>
                                        </label>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* ৬. সম্পত্তি (১৭–১৯) */}
                        <section className="border-b border-gray-100 pb-4 last:border-0">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 mb-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                        ১৭. মোট সম্পদের পরিমাণ (Total Asset Value)
                                    </label>
                                    <input
                                        type="number"
                                        value={data.total_asset_value}
                                        onChange={(e) => setData('total_asset_value', Number(e.target.value))}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-0.5">১৮. বাড়ীর ধরণ (House Type)</label>
                                    <input
                                        type="text"
                                        value={data.house_type}
                                        onChange={(e) => setData('house_type', e.target.value)}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 mb-2">১৯. (i) মোট ঘরের সংখ্যা / House Property</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">Mud House (মাটির ঘর)</label>
                                        <input
                                            type="number"
                                            value={data.mud_house_count}
                                            onChange={(e) => setData('mud_house_count', Number(e.target.value))}
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">Tin House (টিনের ঘর)</label>
                                        <input
                                            type="number"
                                            value={data.tin_house_count}
                                            onChange={(e) => setData('tin_house_count', Number(e.target.value))}
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">Brick House (ইটের ঘর)</label>
                                        <input
                                            type="number"
                                            value={data.brick_house_count}
                                            onChange={(e) => setData('brick_house_count', Number(e.target.value))}
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                            Semi-Brick House (আধা-পাকা ঘর)
                                        </label>
                                        <input
                                            type="number"
                                            value={data.semi_brick_house_count}
                                            onChange={(e) => setData('semi_brick_house_count', Number(e.target.value))}
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 mb-2">১৯. (ii) গবাদি পশু-পাখির তথ্য / Livestock</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">Cow/Buffalo (গরু/মহিষ)</label>
                                        <input
                                            type="number"
                                            value={data.cow_buffalo_count}
                                            onChange={(e) => setData('cow_buffalo_count', Number(e.target.value))}
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">Goat/Sheep (ছাগল/ভেড়া)</label>
                                        <input
                                            type="number"
                                            value={data.goat_sheep_count}
                                            onChange={(e) => setData('goat_sheep_count', Number(e.target.value))}
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">Duck/Chicken (হাঁস/মুরগি)</label>
                                        <input
                                            type="number"
                                            value={data.duck_chicken_count}
                                            onChange={(e) => setData('duck_chicken_count', Number(e.target.value))}
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                            Other Count (অন্যান্য সংখ্যা)
                                        </label>
                                        <input
                                            type="number"
                                            value={data.other_livestock_count}
                                            onChange={(e) => setData('other_livestock_count', Number(e.target.value))}
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                            Other Livestock Description (অন্যান্য গবাদিপশু বিবরণ)
                                        </label>
                                        <input
                                            type="text"
                                            value={data.other_livestock}
                                            onChange={(e) => setData('other_livestock', e.target.value)}
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 mb-2">১৯. (iii) জমির পরিমাণ ও মূল্য / Land Information</h3>
                                {/* মোট জমির পরিমাণ — প্রথমে, অটো ক্যালকুলেটেড */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                            মোট জমির পরিমাণ (শতক)
                                        </label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={(Number(data.cultivable_land_amount) || 0) + (Number(data.non_cultivable_land_amount) || 0) || ''}
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md bg-gray-50 text-gray-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                            মোট জমির মূল্য
                                        </label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={(Number(data.cultivable_land_value) || 0) + (Number(data.non_cultivable_land_value) || 0) || ''}
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md bg-gray-50 text-gray-700"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                            Cultivable Land - Acres (আবাদযোগ্য জমি - শতক)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={data.cultivable_land_amount}
                                            onChange={(e) => setData('cultivable_land_amount', Number(e.target.value))}
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                            Cultivable Land Value (আবাদযোগ্য জমির মূল্য)
                                        </label>
                                        <input
                                            type="number"
                                            value={data.cultivable_land_value}
                                            onChange={(e) => setData('cultivable_land_value', Number(e.target.value))}
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                            Non-Cultivable Land - Acres (অনাবাদি জমি - শতক)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={data.non_cultivable_land_amount}
                                            onChange={(e) =>
                                                setData('non_cultivable_land_amount', Number(e.target.value))
                                            }
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                            Non-Cultivable Land Value (অনাবাদি জমির মূল্য)
                                        </label>
                                        <input
                                            type="number"
                                            value={data.non_cultivable_land_value}
                                            onChange={(e) => setData('non_cultivable_land_value', Number(e.target.value))}
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ১৯. (iv) অস্থায়ী সম্পদের তথ্য (ফরম অনুযায়ী ১৯-এর অংশ) */}
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-gray-900">১৯. (iv) অস্থায়ী সম্পদের তথ্য</h3>
                                    <button
                                        type="button"
                                        onClick={addOtherAsset}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs md:text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Asset
                                    </button>
                                </div>

                                {data.other_assets && data.other_assets.length > 0 ? (
                                    <div className="space-y-4">
                                        {data.other_assets.map((asset, index) => (
                                            <div key={index} className="p-2.5 border border-gray-200 rounded-md bg-gray-50/50">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="font-medium text-gray-900">Asset #{index + 1}</h4>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeOtherAsset(index)}
                                                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">অস্থায়ী সম্পদের বিবরণ</label>
                                                        <input
                                                            type="text"
                                                            value={asset.asset_description}
                                                            onChange={(e) => updateOtherAsset(index, 'asset_description', e.target.value)}
                                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">সংখ্যা/পরিমাণ</label>
                                                        <input
                                                            type="text"
                                                            value={asset.quantity_amount}
                                                            onChange={(e) => updateOtherAsset(index, 'quantity_amount', e.target.value)}
                                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-600 mb-0.5">সম্ভাব্য মূল্য</label>
                                                        <input
                                                            type="number"
                                                            value={asset.estimated_value}
                                                            onChange={(e) => updateOtherAsset(index, 'estimated_value', Number(e.target.value))}
                                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">No assets added</div>
                                )}
                            </div>
                        </section>

                        {/* ৭. আর্থিক তথ্য (২০) */}
                        <section className="border-b border-gray-100 pb-4 last:border-0">
                            <h3 className="text-sm font-semibold text-gray-900 mb-2">২০. পরিবারের মোট মাসিক আয়</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-0.5">মাসিক আয়</label>
                                    <input
                                        type="number"
                                        value={data.monthly_income}
                                        onChange={(e) => setData('monthly_income', Number(e.target.value))}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-0.5">মাসিক ব্যয়</label>
                                    <input
                                        type="number"
                                        value={data.monthly_expense}
                                        onChange={(e) => setData('monthly_expense', Number(e.target.value))}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-0.5">সঞ্চয় (আয় − ব্যয়)</label>
                                    <input
                                        type="number"
                                        value={data.monthly_savings}
                                        readOnly
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md bg-gray-50 text-gray-700"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* ৮. অন্যান্য তথ্য ও নথিপত্র (২১–২৩) */}
                        <section className="pb-2">
                            <ApproverSelectionStep
                                approvers={[]}
                                selectedApprovers={[]}
                                onApproverToggle={() => { }}
                                hideApproverSelection
                                interviewerName={data.interviewer_name || ''}
                                employeeName={data.employee_name || ''}
                                guardianName={data.guardian_name || ''}
                                otherLoanInfo={data.other_loan_info || ''}
                                collectorComment={data.collector_comment || ''}
                                customerPhoto={data.customer_photo || null}
                                customerNidPhoto={data.customer_nid_photo || null}
                                guardianPhoto={data.guardian_photo || null}
                                guardianNidPhoto={data.guardian_nid_photo || null}
                                applicantSignature={data.applicant_signature || null}
                                onFieldChange={(field, value) => setData(field as any, value)}
                                errors={errors}
                            />
                        </section>
                    </div>

                    {/* Form Actions */}
                    <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={() => handleSubmit(true)}
                            disabled={processing}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 md:px-5 md:py-2.5 text-xs md:text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors min-h-[40px] sm:min-h-0"
                        >
                            <Save className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
                            Save Draft
                        </button>
                        {!isFieldOfficer && (
                            <button
                                type="button"
                                onClick={() => handleSubmit(false)}
                                disabled={processing}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 md:px-5 md:py-2.5 text-xs md:text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors min-h-[40px] sm:min-h-0"
                            >
                                <Send className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
                                Submit Application
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
