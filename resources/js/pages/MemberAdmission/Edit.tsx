import bangladeshData from '@/data/bangladeshAddresses.json';
import AdminLayout from '@/layouts/admin-layout';
import {
    FamilyMember,
    MemberAdmission,
    MemberAdmissionFormData,
    OtherAsset,
} from '@/types/memberAdmission';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { AlertCircle, ArrowLeft, Save, Send, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import AddressSection from './sections/AddressSection';
import EconomicPropertySection from './sections/EconomicPropertySection';
import FamilyMembersSection from './sections/FamilyMembersSection';
import FinancialCommentsSection from './sections/FinancialCommentsSection';
import IdentitySection from './sections/IdentitySection';
import OrganizationSection from './sections/OrganizationSection';
import OtherAssetsSection from './sections/OtherAssetsSection';
import PersonalInfoSection from './sections/PersonalInfoSection';

interface SamityItem {
    id: number;
    samity_name: string;
    samity_code?: string;
    branch_id: number;
    branch?: { id: number; name: string; code?: string };
}

interface Props {
    admission: MemberAdmission;
    branches: Array<{ id: number; name: string }>;
    samities: Array<SamityItem>;
    categories: Array<{ id: number; category_name: string }>;
    availableApprovers: Array<{
        id: number;
        name: string;
        email: string;
        role: { name: string };
        level?: string;
    }>;
    for_submit?: boolean;
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

function toNumVal(val: number | string | undefined | null): string | number {
    if (val === 0 || val === '0' || val === '' || val === undefined || val === null) return '';
    return val;
}

const FIELD_NAMES_BN: Record<string, string> = {
    application_no: 'সদস্য নং / আবেদন নম্বর',
    branch_id: 'শাখা (Branch)',
    samity_id: 'সমিতি (Samity)',
    member_category_id: 'সদস্য শ্রেণি',
    survey_date: 'জরিপের তারিখ',
    admission_date: 'ভর্তির তারিখ',
    applicant_name_bn: 'আবেদনকারীর নাম (বাংলা)',
    applicant_name_en: 'আবেদনকারীর নাম (ইংরেজি)',
    father_name_bn: 'পিতার নাম (বাংলা)',
    father_name_en: 'পিতার নাম (ইংরেজি)',
    mother_name_bn: 'মাতার নাম (বাংলা)',
    mother_name_en: 'মাতার নাম (ইংরেজি)',
    spouse_name_bn: 'স্বামীর/স্ত্রীর নাম (বাংলা)',
    spouse_name_en: 'স্বামীর/স্ত্রীর নাম (ইংরেজি)',
    marital_status: 'বৈবাহিক অবস্থা',
    mobile_number: 'মোবাইল নম্বর',
    alternative_mobile: 'বিকল্প মোবাইল নম্বর',
    present_division: 'বর্তমান বিভাগ',
    present_district: 'বর্তমান জেলা',
    present_upazila: 'বর্তমান উপজেলা',
    nid_number: 'জাতীয় পরিচয়পত্র (NID)',
    smart_card_number: 'স্মার্ট কার্ড নম্বর',
    date_of_birth: 'জন্ম তারিখ',
    gender: 'লিঙ্গ',
    customer_photo: 'সদস্যের ছবি',
    customer_nid_photo: 'সদস্যের NID ছবি',
    guardian_photo: 'অভিভাবকের ছবি',
    guardian_nid_photo: 'অভিভাবকের NID ছবি',
    applicant_signature: 'আবেদনকারীর স্বাক্ষর',
    loan_dofa: 'ঋণের দফা',
};

function getFieldNameBn(key: string): string {
    if (FIELD_NAMES_BN[key]) return FIELD_NAMES_BN[key];
    const baseKey = key.split('.')[0];
    if (FIELD_NAMES_BN[baseKey]) return FIELD_NAMES_BN[baseKey];
    return key;
}

export default function Edit({
    admission,
    branches,
    samities,
    categories,
    availableApprovers,
    for_submit = false,
}: Props) {
    const page = usePage<{
        auth: {
            user?: {
                id: number;
                role?: { name: string };
                has_all_access?: boolean;
            };
        };
    }>();
    const [saving, setSaving] = useState(false);

    const [availableSamities, setAvailableSamities] = useState(samities);
    const [samitySearchQuery, setSamitySearchQuery] = useState('');
    const [samityDropdownOpen, setSamityDropdownOpen] = useState(false);

    // Address dropdown states
    const [presentDistricts, setPresentDistricts] = useState<string[]>([]);
    const [presentUpazilas, setPresentUpazilas] = useState<string[]>([]);
    const [permanentDistricts, setPermanentDistricts] = useState<string[]>([]);
    const [permanentUpazilas, setPermanentUpazilas] = useState<string[]>([]);

    const hasAllAccess = !!page.props.auth?.user?.has_all_access;

    const parseNum = (val: any) => {
        if (val === null || val === undefined || val === '') return '';
        const num = Number(val);
        return isNaN(num) ? '' : num;
    };

    const { data, setData, errors } =
        useForm<MemberAdmissionFormData>({
            application_no: admission.application_no || '',
            branch_id: admission.branch_id || 0,
            samity_id: admission.samity_id || 0,
            member_category_id: admission.member_category_id || 0,
            survey_date: admission.survey_date || '',
            admission_date: admission.admission_date || '',

            // Personal Information
            applicant_name_en: admission.applicant_name_en || '',
            father_name_en: admission.father_name_en || '',
            mother_name_en: admission.mother_name_en || '',
            spouse_name_en: admission.spouse_name_en || '',
            applicant_name_bn: admission.applicant_name_bn || '',
            father_name_bn: admission.father_name_bn || '',
            mother_name_bn: admission.mother_name_bn || '',
            spouse_name_bn: admission.spouse_name_bn || '',

            marital_status: admission.marital_status || 'single',
            mobile_number: admission.mobile_number || '',
            alternative_mobile: admission.alternative_mobile || '',

            // Present Address
            present_division: admission.present_division || '',
            present_district: admission.present_district || '',
            present_upazila: admission.present_upazila || '',
            present_union: admission.present_union || '',
            present_village_road: admission.present_village_road || '',
            present_post_code: admission.present_post_code || '',

            // Permanent Address
            permanent_address_same: admission.permanent_address_same || false,
            permanent_division: admission.permanent_division || '',
            permanent_district: admission.permanent_district || '',
            permanent_upazila: admission.permanent_upazila || '',
            permanent_union: admission.permanent_union || '',
            permanent_village_road: admission.permanent_village_road || '',
            permanent_post_code: admission.permanent_post_code || '',

            // Identity
            nid_number: admission.nid_number || '',
            smart_card_number: admission.smart_card_number || '',
            birth_certificate_number: admission.birth_certificate_number || '',
            date_of_birth: admission.date_of_birth || '',
            gender: admission.gender || 'male',
            family_member_mobile: admission.family_member_mobile || '',

            // Guarantor
            guarantor_name: admission.guarantor_name || '',
            guarantor_mobile: admission.guarantor_mobile || '',
            tin_number: admission.tin_number || '',
            want_sms_service: admission.want_sms_service || false,

            // Economic
            business_details: admission.business_details || '',
            job_details: admission.job_details || '',
            other_income_details: admission.other_income_details || '',
            total_asset_value: parseNum(admission.total_asset_value),
            house_type: admission.house_type || '',

            // Property
            mud_house_count: parseNum(admission.mud_house_count),
            tin_house_count: parseNum(admission.tin_house_count),
            brick_house_count: parseNum(admission.brick_house_count),
            semi_brick_house_count: parseNum(admission.semi_brick_house_count),

            // Livestock
            cow_buffalo_count: parseNum(admission.cow_buffalo_count),
            goat_sheep_count: parseNum(admission.goat_sheep_count),
            duck_chicken_count: parseNum(admission.duck_chicken_count),
            other_livestock: admission.other_livestock || '',
            other_livestock_count: parseNum(admission.other_livestock_count),

            // Land
            cultivable_land_amount: parseNum(admission.cultivable_land_amount),
            cultivable_land_value: parseNum(admission.cultivable_land_value),
            non_cultivable_land_amount: parseNum(admission.non_cultivable_land_amount),
            non_cultivable_land_value: parseNum(admission.non_cultivable_land_value),

            // Financial
            monthly_income: parseNum(admission.monthly_income),
            monthly_expense: parseNum(admission.monthly_expense),
            monthly_savings: parseNum(admission.monthly_savings),

            // Additional
            interviewer_name: admission.interviewer_name || '',
            employee_name: admission.employee_name || '',
            other_loan_info: admission.other_loan_info || '',
            requested_loan_amount: admission.requested_loan_amount || '',
            project_name: admission.project_name || '',
            estimated_annual_project_income: admission.estimated_annual_project_income || '',
            collector_comment: admission.collector_comment || '',
            guardian_name: admission.guardian_name || '',

            // Documents
            customer_photo: null,
            customer_nid_photo: null,
            guardian_photo: null,
            guardian_nid_photo: null,
            applicant_signature: null,

            family_members: admission.family_members || [],
            other_assets: admission.other_assets || [],
            selected_approvers: admission.approver_assignments
                ? admission.approver_assignments.map((assignment: any) => assignment.approver_user_id)
                : [],
            is_legacy: !!admission.is_legacy,
            loan_dofa: admission.loan_dofa || '',
        });

    useEffect(() => {
        if (data.branch_id) {
            const filtered = samities.filter((s) => s.branch_id === data.branch_id);
            setAvailableSamities(filtered);

            const selected = filtered.find((s) => s.id === data.samity_id);
            if (selected) {
                const disp = getSamityDisplayCode(selected);
                setSamitySearchQuery(disp ? `${disp} - ${selected.samity_name}` : selected.samity_name);
            }
        }
    }, [data.branch_id, data.samity_id]);

    const filteredSamities = availableSamities.filter((s) => {
        const q = samitySearchQuery.trim().toLowerCase();
        if (!q) return true;
        const nameMatch = s.samity_name.toLowerCase().includes(q);
        const codeMatch = s.samity_code ? s.samity_code.toLowerCase().includes(q) : false;
        const displayCodeMatch = getSamityDisplayCode(s).toLowerCase().includes(q);
        return nameMatch || codeMatch || displayCodeMatch;
    });

    const selectedSamity = samities.find((s) => s.id === data.samity_id);

    const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newBranchId = Number(e.target.value);
        setData('branch_id', newBranchId);
        setData('samity_id', 0);
        setSamitySearchQuery('');
    };

    // Calculate monthly savings automatically
    useEffect(() => {
        const income = Number(data.monthly_income) || 0;
        const expense = Number(data.monthly_expense) || 0;
        const savings = Math.max(0, income - expense);
        if (data.monthly_savings !== savings) {
            setData('monthly_savings', savings);
        }
    }, [data.monthly_income, data.monthly_expense]);

    // Address Cascades Init
    useEffect(() => {
        if (data.present_division) {
            const districts = (bangladeshData.districtsByDivision as Record<string, string[]>)[data.present_division] || [];
            setPresentDistricts(districts);
        }
        if (data.present_district) {
            const upazilas = (bangladeshData.upazilasByDistrict as Record<string, string[]>)[data.present_district] || [];
            setPresentUpazilas(upazilas);
        }
        if (data.permanent_division) {
            const districts = (bangladeshData.districtsByDivision as Record<string, string[]>)[data.permanent_division] || [];
            setPermanentDistricts(districts);
        }
        if (data.permanent_district) {
            const upazilas = (bangladeshData.upazilasByDistrict as Record<string, string[]>)[data.permanent_district] || [];
            setPermanentUpazilas(upazilas);
        }
    }, []);

    const handlePresentDivisionChange = (division: string) => {
        setData('present_division', division);
        setData('present_district', '');
        setData('present_upazila', '');
        if (division) {
            const districts = (bangladeshData.districtsByDivision as Record<string, string[]>)[division] || [];
            setPresentDistricts(districts);
        } else {
            setPresentDistricts([]);
        }
        setPresentUpazilas([]);
    };

    const handlePresentDistrictChange = (district: string) => {
        setData('present_district', district);
        setData('present_upazila', '');
        if (district) {
            const upazilas = (bangladeshData.upazilasByDistrict as Record<string, string[]>)[district] || [];
            setPresentUpazilas(upazilas);
        } else {
            setPresentUpazilas([]);
        }
    };

    const handlePermanentDivisionChange = (division: string) => {
        setData('permanent_division', division);
        setData('permanent_district', '');
        setData('permanent_upazila', '');
        if (division) {
            const districts = (bangladeshData.districtsByDivision as Record<string, string[]>)[division] || [];
            setPermanentDistricts(districts);
        } else {
            setPermanentDistricts([]);
        }
        setPermanentUpazilas([]);
    };

    const handlePermanentDistrictChange = (district: string) => {
        setData('permanent_district', district);
        setData('permanent_upazila', '');
        if (district) {
            const upazilas = (bangladeshData.upazilasByDistrict as Record<string, string[]>)[district] || [];
            setPermanentUpazilas(upazilas);
        } else {
            setPermanentUpazilas([]);
        }
    };

    const handleSameAddressToggle = (checked: boolean) => {
        setData('permanent_address_same', checked);
        if (checked) {
            setData('permanent_division', data.present_division);
            setData('permanent_district', data.present_district);
            setData('permanent_upazila', data.present_upazila);
            setData('permanent_union', data.present_union);
            setData('permanent_village_road', data.present_village_road);
            setData('permanent_post_code', data.present_post_code);
        }
    };

    const handleSubmit = (options?: { submitAfterSave?: boolean }) => {
        // Edit page only saves (draft/update). Submit is from the list; incomplete → redirects here with errors.
        // When for_submit: Save & Submit saves then submits in one request.
        const submitAfterSave = !!options?.submitAfterSave;
        const formData = new FormData();
        formData.append('_method', 'PUT');
        formData.append('draft', '1');
        if (submitAfterSave) {
            formData.append('submit_after_save', '1');
        }

        Object.keys(data).forEach((key) => {
            const val = (data as any)[key];
            if (val === null || val === undefined) return;
            if (
                (key === 'branch_id' ||
                    key === 'samity_id' ||
                    key === 'member_category_id' ||
                    key === 'loan_dofa') &&
                (val === 0 || val === '0' || val === '')
            ) {
                return;
            }
            if (key === 'family_members' || key === 'other_assets' || key === 'selected_approvers') {
                formData.append(key, JSON.stringify(val));
            } else if (val instanceof File) {
                formData.append(key, val);
            } else if (typeof val === 'boolean') {
                formData.append(key, val ? '1' : '0');
            } else if (val !== '') {
                formData.append(key, String(val));
            }
        });

        const postUrl = submitAfterSave
            ? `/member-admissions/${admission.id}?draft=1&for_submit=1`
            : `/member-admissions/${admission.id}?draft=1`;

        router.post(postUrl, formData, {
            preserveScroll: true,
            onStart: () => setSaving(true),
            onFinish: () => setSaving(false),
            onSuccess: () => {
                if (!submitAfterSave) {
                    router.visit('/member-admissions');
                }
            },
            onError: () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            },
        });
    };

    // Repeaters
    const addFamilyMember = () => {
        setData('family_members', [
            ...data.family_members!,
            {
                member_name: '',
                relation_with_head: '',
                gender: 'male',
                age_years: 0,
                age_months: 0,
                marital_status: '',
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

    const updateFamilyMember = (
        index: number,
        field: keyof FamilyMember,
        value: any
    ) => {
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

    const updateOtherAsset = (
        index: number,
        field: keyof OtherAsset,
        value: any
    ) => {
        const newAssets = [...data.other_assets!];
        newAssets[index] = { ...newAssets[index], [field]: value };
        setData('other_assets', newAssets);
    };

    const serverErrors = errors || {};
    const validationErrors = (page.props as any).errors || {};
    const mergedErrors = { ...validationErrors, ...serverErrors };
    const errorList = Object.entries(mergedErrors);

    return (
        <AdminLayout>
            <Head title={`Edit Application #${admission.id}`} />

            <div className="max-w-full space-y-4">
                {/* HERO HEADER BANNER */}
                <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
                    <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-gradient-to-tr from-indigo-600/30 to-purple-500/20 blur-3xl pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2 max-w-2xl">
                            <div className="flex items-center gap-2">
                                <Link
                                    href="/member-admissions"
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md transition-all active:scale-95"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    <span>তালিকায় ফিরে যান</span>
                                </Link>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold backdrop-blur-md">
                                    আবেদন #{admission.id}
                                </span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                                {for_submit ? 'আবশ্যকীয় তথ্য পূরণ করে জমা দিন' : 'ভর্তি আবেদন সংশোধন ও আপডেট'}
                            </h1>
                            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                                {for_submit
                                    ? 'লাল চিহ্নিত ফিল্ডগুলো পূরণ করে «সংরক্ষণ ও জমা দিন» চাপুন — আলাদা করে আবার জমা দেওয়ার দরকার নেই।'
                                    : 'আবেদনকারীর প্রয়োজনীয় সকল তথ্য হালনাগাদ করুন।'}
                            </p>
                        </div>

                        <div className="hidden md:flex items-center gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => handleSubmit()}
                                disabled={saving}
                                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-bold transition-all active:scale-95 shadow-sm disabled:opacity-50"
                            >
                                <Save className="w-4 h-4 text-amber-400" />
                                <span>খসড়া সংরক্ষণ</span>
                            </button>
                            {for_submit && (
                                <button
                                    type="button"
                                    onClick={() => handleSubmit({ submitAfterSave: true })}
                                    disabled={saving}
                                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <Send className="w-4 h-4" />
                                    <span>সংরক্ষণ ও জমা দিন</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ERROR SUMMARY ALERT BANNER */}
                {errorList.length > 0 && (
                    <div className="rounded-2xl border-2 border-red-500 bg-red-50 p-4 sm:p-5 shadow-xl transition-all">
                        <div className="flex items-start gap-3.5">
                            <div className="rounded-xl bg-red-600 p-2.5 text-white shrink-0 shadow-md">
                                <AlertCircle className="w-6 h-6 animate-pulse" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base sm:text-lg font-bold text-red-900 leading-tight">
                                    আবেদনটি জমা দেওয়ার আগে নিচের {errorList.length}টি তথ্য পূরণ/সংশোধন করুন:
                                </h3>
                                <p className="text-xs text-red-700 mt-1 mb-3 font-medium">
                                    {for_submit
                                        ? 'লাল চিহ্নিত ফিল্ডগুলো পূরণ করে «সংরক্ষণ ও জমা দিন» বাটনে ক্লিক করুন।'
                                        : 'লাল চিহ্নিত ফিল্ডগুলো পূরণ করে খসড়া সংরক্ষণ করুন, তারপর তালিকা থেকে আবার জমা দিন।'}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {errorList.map(([key, msg]) => (
                                        <div key={key} className="flex items-start gap-2 text-xs font-semibold text-red-900 bg-white p-2.5 rounded-xl border border-red-200 shadow-xs">
                                            <span className="w-2 h-2 rounded-full bg-red-600 shrink-0 mt-1" />
                                            <div className="min-w-0 flex-1">
                                                <span className="font-bold text-red-950 block">{getFieldNameBn(key)}:</span>
                                                <span className="text-red-700 font-medium leading-relaxed">{String(msg)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODULAR FORM SECTIONS */}
                <div className="space-y-5">
                    <OrganizationSection
                        data={data}
                        setData={setData}
                        errors={mergedErrors}
                        branches={branches}
                        hasAllAccess={hasAllAccess}
                        handleBranchChange={handleBranchChange}
                        samitySearchQuery={samitySearchQuery}
                        setSamitySearchQuery={setSamitySearchQuery}
                        samityDropdownOpen={samityDropdownOpen}
                        setSamityDropdownOpen={setSamityDropdownOpen}
                        filteredSamities={filteredSamities}
                        getSamityDisplayCode={getSamityDisplayCode}
                        selectedSamity={selectedSamity}
                        categories={categories}
                        isLegacyMember={data.is_legacy}
                    />

                    <PersonalInfoSection
                        data={data}
                        setData={setData}
                        errors={mergedErrors}
                    />

                    <AddressSection
                        data={data}
                        setData={setData}
                        errors={mergedErrors}
                        presentDistricts={presentDistricts}
                        presentUpazilas={presentUpazilas}
                        permanentDistricts={permanentDistricts}
                        permanentUpazilas={permanentUpazilas}
                        handlePresentDivisionChange={handlePresentDivisionChange}
                        handlePresentDistrictChange={handlePresentDistrictChange}
                        handlePermanentDivisionChange={handlePermanentDivisionChange}
                        handlePermanentDistrictChange={handlePermanentDistrictChange}
                        handleSameAddressToggle={handleSameAddressToggle}
                    />

                    <IdentitySection
                        data={data}
                        setData={setData}
                        errors={mergedErrors}
                    />

                    <EconomicPropertySection
                        data={data}
                        setData={setData}
                        toNumVal={toNumVal}
                        toNumChange={toNumChange}
                    />

                    <FamilyMembersSection
                        familyMembers={data.family_members || []}
                        addFamilyMember={addFamilyMember}
                        removeFamilyMember={removeFamilyMember}
                        updateFamilyMember={updateFamilyMember}
                        toNumVal={toNumVal}
                        toNumChange={toNumChange}
                    />

                    <OtherAssetsSection
                        otherAssets={data.other_assets || []}
                        addOtherAsset={addOtherAsset}
                        removeOtherAsset={removeOtherAsset}
                        updateOtherAsset={updateOtherAsset}
                        toNumVal={toNumVal}
                        toNumChange={toNumChange}
                    />

                    <FinancialCommentsSection
                        data={data}
                        setData={setData}
                        errors={mergedErrors}
                        toNumVal={toNumVal}
                        toNumChange={toNumChange}
                    />

                    {/* Form Actions (Desktop) */}
                    <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                        <button
                            type="button"
                            onClick={() => router.visit('/member-admissions')}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs sm:text-sm font-bold transition-all active:scale-95"
                        >
                            <X className="w-4 h-4" />
                            <span>বাতিল (Cancel)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSubmit()}
                            disabled={saving}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-amber-400 text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            <span>খসড়া সংরক্ষণ (Save Draft)</span>
                        </button>
                        {for_submit && (
                            <button
                                type="button"
                                onClick={() => handleSubmit({ submitAfterSave: true })}
                                disabled={saving}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50"
                            >
                                <Send className="w-4 h-4" />
                                <span>সংরক্ষণ ও জমা দিন (Save & Submit)</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* MOBILE FLOATING ACTION BAR */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 z-50 flex items-center justify-between gap-2 shadow-2xl">
                    <button
                        type="button"
                        onClick={() => handleSubmit()}
                        disabled={saving}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 text-amber-400 text-xs font-bold shadow-sm active:scale-95 transition disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        <span>খসড়া</span>
                    </button>
                    {for_submit && (
                        <button
                            type="button"
                            onClick={() => handleSubmit({ submitAfterSave: true })}
                            disabled={saving}
                            className="flex-[1.5] inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-md active:scale-95 transition disabled:opacity-50"
                        >
                            <Send className="w-4 h-4" />
                            <span>সংরক্ষণ ও জমা</span>
                        </button>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
