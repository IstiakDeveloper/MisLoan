import bangladeshData from '@/data/bangladeshAddresses.json';
import AdminLayout from '@/layouts/admin-layout';
import {
    FamilyMember,
    MemberAdmissionFormData,
    OtherAsset,
} from '@/types/memberAdmission';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { ChevronRight, History, Save, Send, Sparkles, UserPlus, X } from 'lucide-react';
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
    branches: Array<{ id: number; name: string }>;
    samities: Array<SamityItem>;
    categories: Array<{ id: number; category_name: string }>;
    availableApprovers: Array<{
        id: number;
        name: string;
        email: string;
        role: { name: string };
    }>;
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

function toNumChange(val: string): number | string {
    if (val === '') return '';
    const num = Number(val);
    return isNaN(num) ? '' : num;
}

export default function Create({
    branches,
    samities,
    categories,
    availableApprovers,
}: Props) {
    const page = usePage<{
        auth: {
            user?: {
                name?: string;
                pin?: string;
                username?: string;
                role?: { name: string };
                has_all_access?: boolean;
                branch?: { id: number };
            };
        };
    }>();
    const pageAuth = page.props.auth;
    const currentUser = pageAuth.user;
    const isFieldOfficer = pageAuth.user?.role?.name === 'field_officer';
    const [availableSamities, setAvailableSamities] = useState(samities);
    const [samitySearchQuery, setSamitySearchQuery] = useState('');
    const [samityDropdownOpen, setSamityDropdownOpen] = useState(false);
    const [memberTypeChosen, setMemberTypeChosen] = useState(false);

    // Address dropdown states
    const [presentDistricts, setPresentDistricts] = useState<string[]>([]);
    const [presentUpazilas, setPresentUpazilas] = useState<string[]>([]);
    const [permanentDistricts, setPermanentDistricts] = useState<string[]>([]);
    const [permanentUpazilas, setPermanentUpazilas] = useState<string[]>([]);

    // Auto-fill branch for branch users (no all-access) using shared auth.user.branch.id
    const hasAllAccess = !!pageAuth.user?.has_all_access;
    const initialBranchId =
        !hasAllAccess && pageAuth.user?.branch?.id
            ? pageAuth.user.branch.id
            : 0;

    const { data, setData, post, processing, errors } =
        useForm<MemberAdmissionFormData>({
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
            interviewer_name: currentUser?.name || '',
            employee_name: currentUser?.pin || currentUser?.username || '',
            other_loan_info: '',
            requested_loan_amount: '',
            project_name: '',
            estimated_annual_project_income: '',
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
            is_legacy: false,
            loan_dofa: '',
        });

    const isLegacyMember = !!data.is_legacy;

    const chooseMemberType = (legacy: boolean) => {
        setData((prev) => ({
            ...prev,
            is_legacy: legacy,
            loan_dofa: legacy ? prev.loan_dofa || '' : '',
        }));
        setMemberTypeChosen(true);
    };

    useEffect(() => {
        if (currentUser?.name && !data.interviewer_name) {
            setData('interviewer_name', currentUser.name);
        }
        if ((currentUser?.pin || currentUser?.username) && !data.employee_name) {
            setData('employee_name', currentUser.pin || currentUser.username || '');
        }
    }, [currentUser?.name, currentUser?.pin, currentUser?.username]);

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
                    setSamitySearchQuery(
                        disp ? `${disp} - ${selected.samity_name}` : selected.samity_name
                    );
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

    // Address Cascades
    const handlePresentDivisionChange = (division: string) => {
        setData('present_division', division);
        setData('present_district', '');
        setData('present_upazila', '');
        if (division) {
            const districts = (bangladeshData.districts as Record<string, string[]>)[division] || [];
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
            const upazilas = (bangladeshData.upazilas as Record<string, string[]>)[district] || [];
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
            const districts = (bangladeshData.districts as Record<string, string[]>)[division] || [];
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
            const upazilas = (bangladeshData.upazilas as Record<string, string[]>)[district] || [];
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

    const handleSubmit = (saveAsDraft: boolean) => {
        if (isLegacyMember && !saveAsDraft) {
            const dofa = Number(data.loan_dofa);
            if (!dofa || dofa < 1) {
                alert('পুরাতন সদস্যের জন্য ঋণের দফা দেওয়া বাধ্যতামূলক।');
                return;
            }
        }
        post(`/member-admissions${saveAsDraft ? '?draft=1' : ''}`, {
            preserveScroll: true,
            onSuccess: () => {
                router.visit('/member-admissions');
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

    return (
        <AdminLayout>
            <Head title="New Member Admission Application" />

            {/* Member type selection modal */}
            {!memberTypeChosen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white text-center relative overflow-hidden">
                            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-blue-500/20 blur-2xl" />
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 border border-white/20 mb-3 text-blue-400">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-extrabold text-white tracking-tight">সদস্যের ধরন নির্বাচন করুন</h2>
                        </div>

                        {/* Options Body */}
                        <div className="p-6 space-y-3.5">
                            <button
                                type="button"
                                onClick={() => chooseMemberType(false)}
                                className="group w-full flex items-center justify-between p-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 hover:bg-blue-50/80 hover:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md text-left active:scale-[0.99]"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30 group-hover:scale-105 transition-transform">
                                        <UserPlus className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="text-base font-extrabold text-slate-800 group-hover:text-blue-900">
                                            নতুন সদস্য ভর্তি
                                        </div>
                                    </div>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white transition-all shadow-sm">
                                    <ChevronRight className="w-5 h-5" />
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => chooseMemberType(true)}
                                className="group w-full flex items-center justify-between p-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 hover:bg-amber-50/80 hover:border-amber-500 transition-all duration-200 shadow-sm hover:shadow-md text-left active:scale-[0.99]"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-600/30 group-hover:scale-105 transition-transform">
                                        <History className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="text-base font-extrabold text-slate-800 group-hover:text-amber-900">
                                            পুরাতন সদস্য (আগের ডাটা এন্ট্রি)
                                        </div>
                                    </div>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-amber-600 group-hover:border-amber-600 group-hover:text-white transition-all shadow-sm">
                                    <ChevronRight className="w-5 h-5" />
                                </div>
                            </button>
                        </div>

                        {/* Footer */}
                        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 text-center">
                            <button
                                type="button"
                                onClick={() => router.visit('/member-admissions')}
                                className="px-5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-all"
                            >
                                বাতিল
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className={`max-w-full space-y-4 ${!memberTypeChosen ? 'pointer-events-none opacity-40' : ''}`}>
                {/* HERO HEADER BANNER */}
                <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
                    <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-gradient-to-tr from-blue-600/30 to-teal-500/20 blur-3xl pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2 max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/20 text-blue-300 text-xs font-semibold backdrop-blur-md">
                                <Save className="w-4 h-4 text-blue-400" />
                                <span>
                                    {isLegacyMember
                                        ? 'পুরাতন সদস্য — ডাটা উঠানো (অটো অনুমোদন)'
                                        : 'Member Admission Registration Form'}
                                </span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                                {isLegacyMember ? 'পুরাতন সদস্য ভর্তি ফর্ম' : 'নতুন সদস্য ভর্তি ফর্ম'}
                            </h1>
                            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                                {isLegacyMember
                                    ? 'আগের সদস্যের তথ্য উঠান এবং ঋণের দফা উল্লেখ করুন। জমা দিলে স্বয়ংক্রিয়ভাবে অনুমোদিত হবে।'
                                    : 'আবেদনকারীর সমস্ত তথ্য ও নথি সঠিক উপায়ে পূরণ করুন। যেকোনো সময় খসড়া হিসেবে সংরক্ষণ করা যাবে।'}
                            </p>
                        </div>

                        <div className="hidden md:flex items-center gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => handleSubmit(true)}
                                disabled={processing || !memberTypeChosen}
                                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-bold transition-all active:scale-95 shadow-sm disabled:opacity-50"
                            >
                                <Save className="w-4 h-4 text-amber-400" />
                                <span>খসড়া সংরক্ষণ</span>
                            </button>
                            {!isFieldOfficer && (
                                <button
                                    type="button"
                                    onClick={() => handleSubmit(false)}
                                    disabled={processing || !memberTypeChosen}
                                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <Send className="w-4 h-4" />
                                    <span>{isLegacyMember ? 'সংরক্ষণ ও অনুমোদন' : 'আবেদন জমা দিন'}</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* MODULAR FORM SECTIONS */}
                <div className="space-y-5">
                    <OrganizationSection
                        data={data}
                        setData={setData}
                        errors={errors}
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
                        isLegacyMember={isLegacyMember}
                    />

                    <PersonalInfoSection
                        data={data}
                        setData={setData}
                        errors={errors}
                    />

                    <AddressSection
                        data={data}
                        setData={setData}
                        errors={errors}
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
                        errors={errors}
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
                        errors={errors}
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
                            onClick={() => handleSubmit(true)}
                            disabled={processing}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-amber-400 text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            <span>খসড়া সংরক্ষণ (Save Draft)</span>
                        </button>
                        {!isFieldOfficer && (
                            <button
                                type="button"
                                onClick={() => handleSubmit(false)}
                                disabled={processing}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50"
                            >
                                <Send className="w-4 h-4" />
                                <span>{isLegacyMember ? 'সংরক্ষণ ও অনুমোদন' : 'আবেদন জমা দিন'}</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* MOBILE FLOATING ACTION BAR */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 z-50 flex items-center justify-between gap-2 shadow-2xl">
                    <button
                        type="button"
                        onClick={() => handleSubmit(true)}
                        disabled={processing || !memberTypeChosen}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 text-amber-400 text-xs font-bold shadow-sm active:scale-95 transition disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        <span>খসড়া</span>
                    </button>
                    {!isFieldOfficer && (
                        <button
                            type="button"
                            onClick={() => handleSubmit(false)}
                            disabled={processing || !memberTypeChosen}
                            className="flex-[1.5] inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-md active:scale-95 transition disabled:opacity-50"
                        >
                            <Send className="w-4 h-4" />
                            <span>{isLegacyMember ? 'অনুমোদন' : 'জমা দিন'}</span>
                        </button>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
