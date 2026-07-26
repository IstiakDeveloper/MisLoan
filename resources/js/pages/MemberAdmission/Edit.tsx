import ApproverSelectionStep from '@/components/MemberAdmission/ApproverSelectionStep';
import FormSection from '@/components/MemberAdmission/FormSection';
import { SmartDateInput } from '@/components/ui/SmartDateInput';
import bangladeshData from '@/data/bangladeshAddresses.json';
import AdminLayout from '@/layouts/admin-layout';
import {
    FamilyMember,
    MemberAdmission,
    MemberAdmissionFormData,
    OtherAsset,
} from '@/types/memberAdmission';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { AlertCircle, ArrowLeft, ChevronDown, Plus, Save, Search, Send, Trash2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

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

export default function Edit({
    admission,
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

    // Address dropdown states
    const [presentDistricts, setPresentDistricts] = useState<string[]>([]);
    const [presentUpazilas, setPresentUpazilas] = useState<string[]>([]);
    const [permanentDistricts, setPermanentDistricts] = useState<string[]>([]);
    const [permanentUpazilas, setPermanentUpazilas] = useState<string[]>([]);

    const hasAllAccess = !!pageAuth.user?.has_all_access;

    const { data, setData, put, processing, errors } =
        useForm<MemberAdmissionFormData>({
            branch_id: admission.branch_id,
            samity_id: admission.samity_id,
            member_category_id: admission.member_category_id,
            survey_date: admission.survey_date?.split('T')[0] || '',
            admission_date: admission.admission_date?.split('T')[0] || '',

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
            permanent_address_same: Boolean(admission.permanent_address_same),
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
            date_of_birth: admission.date_of_birth?.split('T')[0] || '',
            gender: admission.gender || 'male',
            family_member_mobile: admission.family_member_mobile || '',

            // Guarantor
            guarantor_name: admission.guarantor_name || '',
            guarantor_mobile: admission.guarantor_mobile || '',
            tin_number: admission.tin_number || '',
            want_sms_service: Boolean(admission.want_sms_service),

            // Economic
            business_details: admission.business_details || '',
            job_details: admission.job_details || '',
            other_income_details: admission.other_income_details || '',
            total_asset_value: admission.total_asset_value || 0,
            house_type: admission.house_type || '',

            // Property
            mud_house_count: admission.mud_house_count || 0,
            tin_house_count: admission.tin_house_count || 0,
            brick_house_count: admission.brick_house_count || 0,
            semi_brick_house_count: admission.semi_brick_house_count || 0,

            // Livestock
            cow_buffalo_count: admission.cow_buffalo_count || 0,
            goat_sheep_count: admission.goat_sheep_count || 0,
            duck_chicken_count: admission.duck_chicken_count || 0,
            other_livestock: admission.other_livestock || '',
            other_livestock_count: admission.other_livestock_count || 0,

            // Land
            cultivable_land_amount: admission.cultivable_land_amount || 0,
            cultivable_land_value: admission.cultivable_land_value || 0,
            non_cultivable_land_amount: admission.non_cultivable_land_amount || 0,
            non_cultivable_land_value: admission.non_cultivable_land_value || 0,

            // Financial
            monthly_income: admission.monthly_income || 0,
            monthly_expense: admission.monthly_expense || 0,
            monthly_savings: admission.monthly_savings || 0,

            // Additional
            interviewer_name: admission.interviewer_name || currentUser?.name || '',
            employee_name: admission.employee_name || currentUser?.pin || currentUser?.username || '',
            other_loan_info: admission.other_loan_info || '',
            requested_loan_amount: admission.requested_loan_amount || '',
            project_name: admission.project_name || '',
            estimated_annual_project_income: admission.estimated_annual_project_income || '',
            collector_comment: admission.collector_comment || '',
            guardian_name: admission.guardian_name || '',

            // Documents
            customer_photo: null as File | null,
            customer_nid_photo: null as File | null,
            guardian_photo: null as File | null,
            guardian_nid_photo: null as File | null,
            applicant_signature: null as File | null,

            family_members: admission.family_members || [],
            other_assets: admission.other_assets || [],
            selected_approvers: [],
            is_legacy: !!admission.is_legacy,
            loan_dofa: admission.loan_dofa ?? '',
        });

    const isLegacyMember = !!data.is_legacy || !!admission.is_legacy;
    useEffect(() => {
        if (data.branch_id) {
            const filtered = samities.filter(
                (s) => s.branch_id === data.branch_id,
            );
            setAvailableSamities(filtered);
            if (!filtered.find((s) => s.id === data.samity_id)) {
                setData('samity_id', 0);
                setSamitySearchQuery('');
            } else {
                const selected = filtered.find((s) => s.id === data.samity_id);
                if (selected) {
                    const disp = getSamityDisplayCode(selected);
                    setSamitySearchQuery(
                        disp
                            ? `${disp} - ${selected.samity_name}`
                            : selected.samity_name,
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
        const displayCode = getSamityDisplayCode(s);
        const codeMatch =
            displayCode.toLowerCase().includes(q) ||
            (s.samity_code || '').toLowerCase().includes(q);
        return nameMatch || codeMatch;
    });
    const selectedSamity = availableSamities.find(
        (s) => s.id === data.samity_id,
    );

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
            const districts =
                bangladeshData.districtsByDivision[
                    data.present_division as keyof typeof bangladeshData.districtsByDivision
                ] || [];
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
            const upazilas =
                bangladeshData.upazilasByDistrict[
                    data.present_district as keyof typeof bangladeshData.upazilasByDistrict
                ] || [];
            setPresentUpazilas(upazilas);
            if (!upazilas.includes(data.present_upazila)) {
                setData('present_upazila', '');
            }
        }
    }, [data.present_district]);

    // Update permanent districts when division changes
    useEffect(() => {
        if (data.permanent_division) {
            const districts =
                bangladeshData.districtsByDivision[
                    data.permanent_division as keyof typeof bangladeshData.districtsByDivision
                ] || [];
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
            const upazilas =
                bangladeshData.upazilasByDistrict[
                    data.permanent_district as keyof typeof bangladeshData.upazilasByDistrict
                ] || [];
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

    const handleSubmit = (saveAsDraft: boolean) => {
        if (isLegacyMember && !saveAsDraft) {
            const dofa = Number(data.loan_dofa);
            if (!dofa || dofa < 1) {
                alert('পুরাতন সদস্যের জন্য ঋণের দফা দেওয়া বাধ্যতামূলক।');
                return;
            }
        }
        put(`/member-admissions/${admission.id}${saveAsDraft ? '?draft=1' : ''}`, {
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

    const updateFamilyMember = (
        index: number,
        field: keyof FamilyMember,
        value: any,
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
        value: any,
    ) => {
        const newAssets = [...data.other_assets!];
        newAssets[index] = { ...newAssets[index], [field]: value };
        setData('other_assets', newAssets);
    };

    const pageErrors = (usePage().props as any).errors || {};
    const mergedErrors = { ...errors, ...pageErrors };
    const errorList = Object.entries(mergedErrors).filter(([_, msg]) => Boolean(msg));

    return (
        <AdminLayout>
            <Head title="Edit Member Admission Application" />

            <div className="max-w-full space-y-4">
                {/* ── HERO HEADER BANNER ─────────────────────────────────────────── */}
                <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
                    <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-gradient-to-tr from-blue-600/30 to-teal-500/20 blur-3xl pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2 max-w-2xl">
                            <div className="flex items-center gap-3">
                                <Link
                                    href="/member-admissions"
                                    className="rounded-xl bg-slate-800 p-2.5 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Link>
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/20 text-blue-300 text-xs font-semibold backdrop-blur-md">
                                    <Save className="w-4 h-4 text-blue-400" />
                                    <span>Edit Member Admission Form</span>
                                </div>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                                সদস্য ভর্তি আবেদন সম্পাদনা ({admission.applicant_name_bn || admission.applicant_name_en})
                            </h1>
                            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                                আবেদনকারীর প্রয়োজনীয় তথ্যসমূহ হালনাগাদ করে ড্রাফট রাখুন অথবা সরাসরি জমা দিন।
                            </p>
                        </div>

                        <div className="hidden md:flex items-center gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => handleSubmit(true)}
                                disabled={processing}
                                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-bold transition-all active:scale-95 shadow-sm disabled:opacity-50"
                            >
                                <Save className="w-4 h-4 text-amber-400" />
                                <span>খসড়া সংরক্ষণ</span>
                            </button>
                            {!isFieldOfficer && (
                                <button
                                    type="button"
                                    onClick={() => handleSubmit(false)}
                                    disabled={processing}
                                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <Send className="w-4 h-4" />
                                    <span>{isLegacyMember ? 'সংরক্ষণ ও অনুমোদন' : 'তথ্য হালনাগাদ ও জমা'}</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── ERROR SUMMARY ALERT BANNER ─────────────────────────────────── */}
                {errorList.length > 0 && (
                    <div className="rounded-2xl border-2 border-red-500 bg-red-50 p-4 sm:p-5 shadow-xl transition-all animate-bounce-once">
                        <div className="flex items-start gap-3.5">
                            <div className="rounded-xl bg-red-600 p-2.5 text-white shrink-0 shadow-md">
                                <AlertCircle className="w-6 h-6 animate-pulse" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base sm:text-lg font-bold text-red-900 leading-tight">
                                    আবেদনটি জমা দেওয়ার জন্য নিচের {errorList.length}টি তথ্য পূরণ/সংশোধন করা প্রয়োজন:
                                </h3>
                                <p className="text-xs text-red-700 mt-1 mb-3 font-medium">
                                    নিচে যেসব ইনপুট ফিল্ড লাল বর্ডারে চিহ্নিত করা হয়েছে, সেগুলো সঠিক তথ্য দিয়ে পূরণ করে পুনরায় খসড়া সংরক্ষণ করুন।
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                    {errorList.map(([key, msg]) => (
                                        <div key={key} className="flex items-center gap-2 text-xs font-semibold text-red-800 bg-white/90 p-2.5 rounded-xl border border-red-200 shadow-sm">
                                            <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0" />
                                            <span className="truncate">{String(msg)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm md:p-6">
                    <div className="space-y-4 md:space-y-6">
                        {/* ১. সংস্থা ও তারিখ */}
                        <FormSection title="Organization & Date">
                            <div className="space-y-3">
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                                    <div>
                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                            Branch (শাখা){' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </label>
                                        <select
                                            value={data.branch_id}
                                            onChange={handleBranchChange}
                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50"
                                            disabled={!hasAllAccess}
                                        >
                                            <option value={0}>
                                                Select Branch
                                            </option>
                                            {branches.map((branch) => (
                                                <option
                                                    key={branch.id}
                                                    value={branch.id}
                                                >
                                                    {branch.name}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.branch_id && (
                                            <p className="mt-0.5 text-xs text-red-600">
                                                {errors.branch_id}
                                            </p>
                                        )}
                                    </div>

                                    <div className="relative">
                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                            ১. Samity (সমিতি){' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </label>
                                        <div
                                            className={`flex w-full items-center gap-2 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 ${!data.branch_id ? 'cursor-not-allowed bg-gray-50 opacity-70' : ''}`}
                                        >
                                            <Search className="h-4 w-4 flex-shrink-0 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Search by name or code..."
                                                value={samitySearchQuery}
                                                onChange={(e) => {
                                                    setSamitySearchQuery(
                                                        e.target.value,
                                                    );
                                                    setSamityDropdownOpen(true);
                                                }}
                                                onFocus={() =>
                                                    data.branch_id &&
                                                    setSamityDropdownOpen(true)
                                                }
                                                onBlur={() =>
                                                    setTimeout(
                                                        () =>
                                                            setSamityDropdownOpen(
                                                                false,
                                                            ),
                                                        150,
                                                    )
                                                }
                                                disabled={!data.branch_id}
                                                className="min-w-0 flex-1 border-0 p-0 text-sm focus:ring-0 focus:outline-none disabled:cursor-not-allowed disabled:bg-transparent"
                                            />
                                            <ChevronDown
                                                className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${samityDropdownOpen ? 'rotate-180' : ''}`}
                                            />
                                        </div>
                                        {samityDropdownOpen &&
                                            data.branch_id && (
                                                <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                                                    {filteredSamities.length ===
                                                    0 ? (
                                                        <li className="px-3 py-2 text-sm text-gray-500">
                                                            No samity found
                                                        </li>
                                                    ) : (
                                                        filteredSamities.map(
                                                            (samity) => {
                                                                const displayCode =
                                                                    getSamityDisplayCode(
                                                                        samity,
                                                                    );
                                                                const label =
                                                                    displayCode
                                                                        ? `${displayCode} - ${samity.samity_name}`
                                                                        : samity.samity_name;
                                                                return (
                                                                    <li
                                                                        key={
                                                                            samity.id
                                                                        }
                                                                    >
                                                                        <button
                                                                            type="button"
                                                                            onMouseDown={(
                                                                                e,
                                                                            ) =>
                                                                                e.preventDefault()
                                                                            }
                                                                            onClick={() => {
                                                                                setData(
                                                                                    'samity_id',
                                                                                    samity.id,
                                                                                );
                                                                                setSamitySearchQuery(
                                                                                    label,
                                                                                );
                                                                                setSamityDropdownOpen(
                                                                                    false,
                                                                                );
                                                                            }}
                                                                            className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${data.samity_id === samity.id ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-700'}`}
                                                                        >
                                                                            {
                                                                                label
                                                                            }
                                                                        </button>
                                                                    </li>
                                                                );
                                                            },
                                                        )
                                                    )}
                                                </ul>
                                            )}
                                        {selectedSamity &&
                                            !samityDropdownOpen && (
                                                <p className="mt-1 text-xs text-gray-500">
                                                    Selected:{' '}
                                                    {getSamityDisplayCode(
                                                        selectedSamity,
                                                    )
                                                        ? `${getSamityDisplayCode(selectedSamity)} - ${selectedSamity.samity_name}`
                                                        : selectedSamity.samity_name}
                                                </p>
                                            )}
                                        {errors.samity_id && (
                                            <p className="mt-0.5 text-xs text-red-600">
                                                {errors.samity_id}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                            ২. Member Category (সদস্য শ্রেণি){' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </label>
                                        <select
                                            value={data.member_category_id}
                                            onChange={(e) =>
                                                setData(
                                                    'member_category_id',
                                                    Number(e.target.value),
                                                )
                                            }
                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value={0}>
                                                Select Category
                                            </option>
                                            {categories.map((category) => (
                                                <option
                                                    key={category.id}
                                                    value={category.id}
                                                >
                                                    {category.category_name}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.member_category_id && (
                                            <p className="mt-0.5 text-xs text-red-600">
                                                {errors.member_category_id}
                                            </p>
                                        )}
                                    </div>

                                    {isLegacyMember && (
                                        <div>
                                            <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                                ঋণের দফা (কত নাম্বার দফায় ডাটা উঠানো){' '}
                                                <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                min={1}
                                                value={data.loan_dofa ?? ''}
                                                onChange={(e) =>
                                                    setData(
                                                        'loan_dofa',
                                                        e.target.value === ''
                                                            ? ''
                                                            : Number(e.target.value),
                                                    )
                                                }
                                                placeholder="যেমন: ১, ২, ৩..."
                                                className="w-full rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500"
                                            />
                                            <p className="mt-0.5 text-[11px] text-amber-700">
                                                আগে কতবার ঋণ নিয়েছিল / এখন কত নাম্বার দফায় এই ডাটা উঠানো হচ্ছে।
                                            </p>
                                            {errors.loan_dofa && (
                                                <p className="mt-0.5 text-xs text-red-600">
                                                    {errors.loan_dofa}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    <div>
                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                            জরিপের তারিখ{' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </label>
                                        <SmartDateInput
                                            value={data.survey_date}
                                            onChange={(val) =>
                                                setData('survey_date', val)
                                            }
                                            error={Boolean(errors.survey_date)}
                                            className="w-full rounded-md border border-gray-300 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                        />
                                        {errors.survey_date && (
                                            <p className="mt-0.5 text-xs text-red-600">
                                                {errors.survey_date}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                            ভর্তির তারিখ{' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </label>
                                        <SmartDateInput
                                            value={data.admission_date}
                                            onChange={(val) =>
                                                setData('admission_date', val)
                                            }
                                            error={Boolean(
                                                errors.admission_date,
                                            )}
                                            className="w-full rounded-md border border-gray-300 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                        />
                                        {errors.admission_date && (
                                            <p className="mt-0.5 text-xs text-red-600">
                                                {errors.admission_date}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </FormSection>

                        {/* ২. ব্যক্তিগত তথ্য */}
                        <FormSection title="Personal Information">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                                {/* কলাম ১ — বাংলা */}
                                <div className="space-y-3">
                                    <div>
                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                            ৩. আবেদনকারীর নাম (বাংলায়){' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.applicant_name_bn}
                                            onChange={(e) =>
                                                setData(
                                                    'applicant_name_bn',
                                                    e.target.value,
                                                )
                                            }
                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                        />
                                        {errors.applicant_name_bn && (
                                            <p className="mt-0.5 text-xs text-red-600">
                                                {errors.applicant_name_bn}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                            ৪. পিতার নাম (বাংলায়){' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.father_name_bn}
                                            onChange={(e) =>
                                                setData(
                                                    'father_name_bn',
                                                    e.target.value,
                                                )
                                            }
                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                        />
                                        {errors.father_name_bn && (
                                            <p className="mt-0.5 text-xs text-red-600">
                                                {errors.father_name_bn}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                            ৫. মাতার নাম (বাংলায়){' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.mother_name_bn}
                                            onChange={(e) =>
                                                setData(
                                                    'mother_name_bn',
                                                    e.target.value,
                                                )
                                            }
                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                        />
                                        {errors.mother_name_bn && (
                                            <p className="mt-0.5 text-xs text-red-600">
                                                {errors.mother_name_bn}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                            ৬. বৈবাহিক অবস্থা{' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </label>
                                        <select
                                            value={data.marital_status}
                                            onChange={(e) =>
                                                setData(
                                                    'marital_status',
                                                    e.target.value as any,
                                                )
                                            }
                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="single">
                                                Single
                                            </option>
                                            <option value="married">
                                                Married
                                            </option>
                                            <option value="divorced">
                                                Divorced
                                            </option>
                                            <option value="widowed">
                                                Widowed
                                            </option>
                                        </select>
                                        {errors.marital_status && (
                                            <p className="mt-0.5 text-xs text-red-600">
                                                {errors.marital_status}
                                            </p>
                                        )}
                                    </div>
                                    {data.marital_status === 'married' && (
                                        <div>
                                            <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                                ৭. স্বামী/স্ত্রীর নাম (বাংলায়)
                                            </label>
                                            <input
                                                type="text"
                                                value={data.spouse_name_bn}
                                                onChange={(e) =>
                                                    setData(
                                                        'spouse_name_bn',
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                                        <div>
                                            <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                                {data.marital_status ===
                                                'married'
                                                    ? '৮'
                                                    : '৭'}
                                                . মোবাইল নং{' '}
                                                <span className="text-red-500">
                                                    *
                                                </span>
                                            </label>
                                            <input
                                                type="tel"
                                                value={data.mobile_number}
                                                onChange={(e) =>
                                                    setData(
                                                        'mobile_number',
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                            />
                                            {errors.mobile_number && (
                                                <p className="mt-0.5 text-xs text-red-600">
                                                    {errors.mobile_number}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                                {data.marital_status ===
                                                'married'
                                                    ? '৯'
                                                    : '৮'}
                                                . বিকল্প মোবাইল নং
                                            </label>
                                            <input
                                                type="tel"
                                                value={data.alternative_mobile}
                                                onChange={(e) =>
                                                    setData(
                                                        'alternative_mobile',
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* কলাম ২ — ইংরেজি */}
                                <div className="space-y-3">
                                    <div>
                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                            Applicant's Name (English){' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.applicant_name_en}
                                            onChange={(e) =>
                                                setData(
                                                    'applicant_name_en',
                                                    e.target.value,
                                                )
                                            }
                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                        />
                                        {errors.applicant_name_en && (
                                            <p className="mt-0.5 text-xs text-red-600">
                                                {errors.applicant_name_en}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                            Father's Name (English){' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.father_name_en}
                                            onChange={(e) =>
                                                setData(
                                                    'father_name_en',
                                                    e.target.value,
                                                )
                                            }
                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                        />
                                        {errors.father_name_en && (
                                            <p className="mt-0.5 text-xs text-red-600">
                                                {errors.father_name_en}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                            Mother's Name (English){' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.mother_name_en}
                                            onChange={(e) =>
                                                setData(
                                                    'mother_name_en',
                                                    e.target.value,
                                                )
                                            }
                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                        />
                                        {errors.mother_name_en && (
                                            <p className="mt-0.5 text-xs text-red-600">
                                                {errors.mother_name_en}
                                            </p>
                                        )}
                                    </div>

                                    {data.marital_status === 'married' && (
                                        <div>
                                            <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                                Spouse Name (English)
                                            </label>
                                            <input
                                                type="text"
                                                value={data.spouse_name_en}
                                                onChange={(e) =>
                                                    setData(
                                                        'spouse_name_en',
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </FormSection>

                        {/* ৩. ঠিকানা */}
                        <FormSection title="Address">
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-gray-800">
                                    ১০. Present Address (বর্তমান ঠিকানা)
                                </h3>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                                    <div>
                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                            Division (বিভাগ){' '}
                                            <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={data.present_division}
                                            onChange={(e) =>
                                                setData(
                                                    'present_division',
                                                    e.target.value,
                                                )
                                            }
                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">
                                                Select Division (বিভাগ নির্বাচন করুন)
                                            </option>
                                            {bangladeshData.divisions.map(
                                                (division) => (
                                                    <option
                                                        key={division}
                                                        value={division}
                                                    >
                                                        {division}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                        {errors.present_division && (
                                            <p className="mt-0.5 text-xs text-red-600">
                                                {errors.present_division}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                            District (জেলা){' '}
                                            <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={data.present_district}
                                            onChange={(e) =>
                                                setData(
                                                    'present_district',
                                                    e.target.value,
                                                )
                                            }
                                            disabled={!data.present_division}
                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50"
                                        >
                                            <option value="">
                                                Select District (জেলা নির্বাচন করুন)
                                            </option>
                                            {presentDistricts.map(
                                                (district) => (
                                                    <option
                                                        key={district}
                                                        value={district}
                                                    >
                                                        {district}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                        {errors.present_district && (
                                            <p className="mt-0.5 text-xs text-red-600">
                                                {errors.present_district}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                            Upazila (উপজেলা){' '}
                                            <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={data.present_upazila}
                                            onChange={(e) =>
                                                setData(
                                                    'present_upazila',
                                                    e.target.value,
                                                )
                                            }
                                            disabled={!data.present_district}
                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50"
                                        >
                                            <option value="">
                                                Select Upazila (উপজেলা নির্বাচন করুন)
                                            </option>
                                            {presentUpazilas.map((upazila) => (
                                                <option
                                                    key={upazila}
                                                    value={upazila}
                                                >
                                                    {upazila}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.present_upazila && (
                                            <p className="mt-0.5 text-xs text-red-600">
                                                {errors.present_upazila}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                            Union (ইউনিয়ন)
                                        </label>
                                        <input
                                            type="text"
                                            value={data.present_union}
                                            onChange={(e) =>
                                                setData(
                                                    'present_union',
                                                    e.target.value,
                                                )
                                            }
                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                            Village/Road (গ্রাম/রাস্তা)
                                        </label>
                                        <input
                                            type="text"
                                            value={data.present_village_road}
                                            onChange={(e) =>
                                                setData(
                                                    'present_village_road',
                                                    e.target.value,
                                                )
                                            }
                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                            Post Code (পোস্ট কোড)
                                        </label>
                                        <input
                                            type="text"
                                            value={data.present_post_code}
                                            onChange={(e) =>
                                                setData(
                                                    'present_post_code',
                                                    e.target.value,
                                                )
                                            }
                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="same_address"
                                    checked={data.permanent_address_same}
                                    onChange={(e) =>
                                        setData(
                                            'permanent_address_same',
                                            e.target.checked,
                                        )
                                    }
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label
                                    htmlFor="same_address"
                                    className="text-sm font-medium text-gray-700"
                                >
                                    Permanent address same as present address (স্থায়ী ঠিকানা বর্তমান ঠিকানার মতো)
                                </label>
                            </div>

                            {!data.permanent_address_same && (
                                <div className="mt-3">
                                    <h3 className="mb-2 text-sm font-semibold text-gray-800">
                                        ১১. Permanent Address (স্থায়ী ঠিকানা)
                                    </h3>
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                                        <div>
                                            <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                                Division (বিভাগ)
                                            </label>
                                            <select
                                                value={data.permanent_division}
                                                onChange={(e) =>
                                                    setData(
                                                        'permanent_division',
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="">
                                                    Select Division (বিভাগ নির্বাচন করুন)
                                                </option>
                                                {bangladeshData.divisions.map(
                                                    (division) => (
                                                        <option
                                                            key={division}
                                                            value={division}
                                                        >
                                                            {division}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                                District (জেলা)
                                            </label>
                                            <select
                                                value={data.permanent_district}
                                                onChange={(e) =>
                                                    setData(
                                                        'permanent_district',
                                                        e.target.value,
                                                    )
                                                }
                                                disabled={
                                                    !data.permanent_division
                                                }
                                                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50"
                                            >
                                                <option value="">
                                                    Select District (জেলা নির্বাচন করুন)
                                                </option>
                                                {permanentDistricts.map(
                                                    (district) => (
                                                        <option
                                                            key={district}
                                                            value={district}
                                                        >
                                                            {district}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                                Upazila (উপজেলা)
                                            </label>
                                            <select
                                                value={data.permanent_upazila}
                                                onChange={(e) =>
                                                    setData(
                                                        'permanent_upazila',
                                                        e.target.value,
                                                    )
                                                }
                                                disabled={
                                                    !data.permanent_district
                                                }
                                                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50"
                                            >
                                                <option value="">
                                                    Select Upazila (উপজেলা নির্বাচন করুন)
                                                </option>
                                                {permanentUpazilas.map(
                                                    (upazila) => (
                                                        <option
                                                            key={upazila}
                                                            value={upazila}
                                                        >
                                                            {upazila}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                                Union (ইউনিয়ন)
                                            </label>
                                            <input
                                                type="text"
                                                value={data.permanent_union}
                                                onChange={(e) =>
                                                    setData(
                                                        'permanent_union',
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                                Village/Road (গ্রাম/রাস্তা)
                                            </label>
                                            <input
                                                type="text"
                                                value={
                                                    data.permanent_village_road
                                                }
                                                onChange={(e) =>
                                                    setData(
                                                        'permanent_village_road',
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                                Post Code (পোস্ট কোড)
                                            </label>
                                            <input
                                                type="text"
                                                value={data.permanent_post_code}
                                                onChange={(e) =>
                                                    setData(
                                                        'permanent_post_code',
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </FormSection>

                        {/* ৪. পরিচয় ও জামিনদার */}
                        <FormSection title="Identity & Guarantor">
                            <h3 className="mb-2 text-sm font-semibold text-gray-900">
                                ১২. Identity Information (পরিচয় তথ্য)
                            </h3>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                                <div>
                                    <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                        National ID No. (জাতীয় পরিচয়পত্র)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="এনআইডি নম্বর"
                                        value={data.nid_number}
                                        onChange={(e) =>
                                            setData(
                                                'nid_number',
                                                e.target.value,
                                            )
                                        }
                                        className={`w-full rounded-md border px-2.5 py-1.5 text-sm focus:ring-2 ${
                                            mergedErrors.nid_number
                                                ? 'border-red-500 bg-red-50/50 ring-2 ring-red-200 focus:border-red-500 focus:ring-red-500'
                                                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                        }`}
                                    />
                                    {mergedErrors.nid_number && (
                                        <p className="mt-1 text-xs font-semibold text-red-600">
                                            ❌ {mergedErrors.nid_number}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                        Smart Card No. (স্মার্ট কার্ড নম্বর)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="স্মার্ট কার্ড নম্বর"
                                        value={data.smart_card_number}
                                        onChange={(e) =>
                                            setData(
                                                'smart_card_number',
                                                e.target.value,
                                            )
                                        }
                                        className={`w-full rounded-md border px-2.5 py-1.5 text-sm focus:ring-2 ${
                                            mergedErrors.smart_card_number
                                                ? 'border-red-500 bg-red-50/50 ring-2 ring-red-200 focus:border-red-500 focus:ring-red-500'
                                                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                        }`}
                                    />
                                    {mergedErrors.smart_card_number && (
                                        <p className="mt-1 text-xs font-semibold text-red-600">
                                            ❌ {mergedErrors.smart_card_number}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <h3 className="mt-4 mb-2 text-sm font-semibold text-gray-800">
                                ১৩. Other Identity Information (জন্ম সনদ নং, DOB, Gender, Family Mobile)
                            </h3>
                            <div className="mt-2 grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
                                <div>
                                    <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                        জন্ম সনদ নং (প্রযোজ্য ক্ষেত্রে)
                                    </label>
                                    <input
                                        type="text"
                                        value={data.birth_certificate_number}
                                        onChange={(e) =>
                                            setData(
                                                'birth_certificate_number',
                                                e.target.value,
                                            )
                                        }
                                        className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                        Date of Birth
                                    </label>
                                    <SmartDateInput
                                        value={data.date_of_birth}
                                        onChange={(val) =>
                                            setData('date_of_birth', val)
                                        }
                                        error={Boolean(errors.date_of_birth)}
                                        className="w-full rounded-md border border-gray-300 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                        Gender (লিঙ্গ){' '}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={data.gender}
                                        onChange={(e) =>
                                            setData(
                                                'gender',
                                                e.target.value as any,
                                            )
                                        }
                                        className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                    {errors.gender && (
                                        <p className="mt-0.5 text-xs text-red-600">
                                            {errors.gender}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                        Family Members Mobile Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={data.family_member_mobile}
                                        onChange={(e) =>
                                            setData(
                                                'family_member_mobile',
                                                e.target.value,
                                            )
                                        }
                                        className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <h3 className="mt-4 mb-2 text-sm font-semibold text-gray-800">
                                ১৪. Co-Applicant/Guarantor Name, ১৫. TIN ও এসএমএস
                            </h3>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                                <div>
                                    <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                        ১৪. Co-Applicant/Guarantor Name
                                    </label>
                                    <input
                                        type="text"
                                        value={data.guarantor_name}
                                        onChange={(e) =>
                                            setData(
                                                'guarantor_name',
                                                e.target.value,
                                            )
                                        }
                                        className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                        Guarantor Mobile Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={data.guarantor_mobile}
                                        onChange={(e) =>
                                            setData(
                                                'guarantor_mobile',
                                                e.target.value,
                                            )
                                        }
                                        className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                        ১৫. TIN (ট্র্যাক্স সার্টিফিকেট নং)
                                    </label>
                                    <input
                                        type="text"
                                        value={data.tin_number}
                                        onChange={(e) =>
                                            setData(
                                                'tin_number',
                                                e.target.value,
                                            )
                                        }
                                        className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="want_sms"
                                        checked={data.want_sms_service}
                                        onChange={(e) =>
                                            setData(
                                                'want_sms_service',
                                                e.target.checked,
                                            )
                                        }
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <label
                                        htmlFor="want_sms"
                                        className="text-sm font-medium text-gray-700"
                                    >
                                        সদস্য কি এসএমএস সেবা নিতে চান?
                                    </label>
                                </div>
                            </div>
                        </FormSection>

                        {/* ৫. পরিবার ও আর্থিক কর্মকাণ্ড */}
                        <FormSection title="Family Members & Economic Activity">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-gray-900">
                                    ১৬. পরিবারের তথ্য / Family Members
                                </h3>
                                <button
                                    type="button"
                                    onClick={addFamilyMember}
                                    className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 md:text-sm"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add Member
                                </button>
                            </div>

                            {data.family_members &&
                            data.family_members.length > 0 ? (
                                <div className="space-y-4 mt-3">
                                    {data.family_members.map(
                                        (member, index) => (
                                            <div
                                                key={index}
                                                className="rounded-md border border-gray-200 bg-gray-50/50 p-2.5"
                                            >
                                                <div className="mb-4 flex items-center justify-between">
                                                    <h4 className="font-medium text-gray-900">
                                                        Member #{index + 1}
                                                    </h4>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removeFamilyMember(
                                                                index,
                                                            )
                                                        }
                                                        className="rounded p-1 text-red-600 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2 lg:grid-cols-4">
                                                    <div>
                                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                                            Name (নাম)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={
                                                                member.member_name
                                                            }
                                                            onChange={(e) =>
                                                                updateFamilyMember(
                                                                    index,
                                                                    'member_name',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                                            Relationship (সম্পর্ক)
                                                        </label>
                                                        <select
                                                            value={member.relation_with_head}
                                                            onChange={(e) =>
                                                                updateFamilyMember(index, 'relation_with_head', e.target.value)
                                                            }
                                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                                                        >
                                                            <option value="">সম্পর্ক নির্বাচন করুন</option>
                                                            <option value="স্ত্রী">স্ত্রী (Wife)</option>
                                                            <option value="স্বামী">স্বামী (Husband)</option>
                                                            <option value="পুত্র">পুত্র (Son)</option>
                                                            <option value="কন্যা">কন্যা (Daughter)</option>
                                                            <option value="পিতা">পিতা (Father)</option>
                                                            <option value="মাতা">মাতা (Mother)</option>
                                                            <option value="ভাই">ভাই (Brother)</option>
                                                            <option value="বোন">বোন (Sister)</option>
                                                            <option value="অন্যান্য">অন্যান্য (Other)</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                                            Gender (লিঙ্গ)
                                                        </label>
                                                        <select
                                                            value={
                                                                member.gender
                                                            }
                                                            onChange={(e) =>
                                                                updateFamilyMember(
                                                                    index,
                                                                    'gender',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
                                                        >
                                                            <option value="male">
                                                                Male
                                                            </option>
                                                            <option value="female">
                                                                Female
                                                            </option>
                                                            <option value="other">
                                                                Other
                                                            </option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                                            Age - Years (বয়স - বছর)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            placeholder="0"
                                                            value={toNumVal(member.age_years)}
                                                            onChange={(e) =>
                                                                updateFamilyMember(index, 'age_years', toNumChange(e.target.value))
                                                            }
                                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                                            Age - Months (বয়স - মাস)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            placeholder="0"
                                                            value={toNumVal(member.age_months)}
                                                            onChange={(e) =>
                                                                updateFamilyMember(index, 'age_months', toNumChange(e.target.value))
                                                            }
                                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                                            Education Level (শিক্ষাগত যোগ্যতা)
                                                        </label>
                                                        <select
                                                            value={member.education_level}
                                                            onChange={(e) =>
                                                                updateFamilyMember(index, 'education_level', e.target.value)
                                                            }
                                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                                                        >
                                                            <option value="">শিক্ষাগত যোগ্যতা নির্বাচন করুন</option>
                                                            <option value="নিরক্ষর">নিরক্ষর</option>
                                                            <option value="স্বাক্ষরজ্ঞানসম্পন্ন">স্বাক্ষরজ্ঞানসম্পন্ন</option>
                                                            <option value="প্রাথমিক (১ম - ৫ম)">প্রাথমিক (১ম - ৫ম)</option>
                                                            <option value="মাধ্যমিক (৬ষ্ঠ - ১০ম / এসএসসি)">মাধ্যমিক (৬ষ্ঠ - ১০ম / এসএসসি)</option>
                                                            <option value="উচ্চ মাধ্যমিক (এইচএসসি)">উচ্চ মাধ্যমিক (এইচএসসি)</option>
                                                            <option value="স্নাতক (ডিগ্রী/অনার্স)">স্নাতক (ডিগ্রী/অনার্স)</option>
                                                            <option value="স্নাতকোত্তর (মাষ্টার্স)">স্নাতকোত্তর (মাষ্টার্স)</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                                            Occupation (পেশা)
                                                        </label>
                                                        <select
                                                            value={member.occupation}
                                                            onChange={(e) =>
                                                                updateFamilyMember(index, 'occupation', e.target.value)
                                                            }
                                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                                                        >
                                                            <option value="">পেশা নির্বাচন করুন</option>
                                                            <option value="কৃষি">কৃষি</option>
                                                            <option value="ব্যবসা">ব্যবসা</option>
                                                            <option value="চাকরি">চাকরি</option>
                                                            <option value="গৃহিনী">গৃহিনী</option>
                                                            <option value="দিনমজুর">দিনমজুর</option>
                                                            <option value="ড্রাইভার">ড্রাইভার</option>
                                                            <option value="প্রবাসী">প্রবাসী</option>
                                                            <option value="ছাত্র / ছাত্রী">ছাত্র / ছাত্রী</option>
                                                            <option value="অন্যান্য">অন্যান্য</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                                            Monthly Income (মাসিক আয়)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            placeholder="0"
                                                            value={toNumVal(member.monthly_income)}
                                                            onChange={(e) =>
                                                                updateFamilyMember(index, 'monthly_income', toNumChange(e.target.value))
                                                            }
                                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ),
                                    )}
                                </div>
                            ) : (
                                <div className="py-8 text-center text-gray-500">
                                    No family members added
                                </div>
                            )}

                            {data.family_members &&
                                data.family_members.length > 0 && (
                                    <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-2.5">
                                        <p className="mb-2 text-sm font-medium text-gray-800">
                                            আর্থিক কর্মকাণ্ড সম্পর্কিত (যেকোন একটি সিলেক্ট করুন)
                                        </p>
                                        <div className="flex flex-wrap gap-6">
                                            <label className="flex cursor-pointer items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="economic_activity"
                                                    checked={
                                                        !!data.business_details
                                                    }
                                                    onChange={() => {
                                                        setData(
                                                            'business_details',
                                                            '✓',
                                                        );
                                                        setData(
                                                            'job_details',
                                                            '',
                                                        );
                                                        setData(
                                                            'other_income_details',
                                                            '',
                                                        );
                                                    }}
                                                    className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm font-medium text-gray-700">
                                                    ক. ব্যবসা
                                                </span>
                                            </label>
                                            <label className="flex cursor-pointer items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="economic_activity"
                                                    checked={!!data.job_details}
                                                    onChange={() => {
                                                        setData(
                                                            'business_details',
                                                            '',
                                                        );
                                                        setData(
                                                            'job_details',
                                                            '✓',
                                                        );
                                                        setData(
                                                            'other_income_details',
                                                            '',
                                                        );
                                                    }}
                                                    className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm font-medium text-gray-700">
                                                    খ. চাকরি
                                                </span>
                                            </label>
                                            <label className="flex cursor-pointer items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="economic_activity"
                                                    checked={
                                                        !!data.other_income_details
                                                    }
                                                    onChange={() => {
                                                        setData(
                                                            'business_details',
                                                            '',
                                                        );
                                                        setData(
                                                            'job_details',
                                                            '',
                                                        );
                                                        setData(
                                                            'other_income_details',
                                                            '✓',
                                                        );
                                                    }}
                                                    className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm font-medium text-gray-700">
                                                    গ. অন্যান্য
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                )}
                        </FormSection>

                        {/* ৬. সম্পত্তি (১৭–১৯) */}
                        <FormSection title="Property & Livestock">
                            <div className="mb-4 grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
                                <div>
                                    <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                        ১৭. মোট সম্পদের পরিমাণ (Total Asset Value)
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={toNumVal(data.total_asset_value)}
                                        onChange={(e) =>
                                            setData(
                                                'total_asset_value',
                                                toNumChange(e.target.value),
                                            )
                                        }
                                        className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                        ১৮. বাড়ীর ধরণ (House Type)
                                    </label>
                                    <select
                                        value={data.house_type}
                                        onChange={(e) =>
                                            setData('house_type', e.target.value)
                                        }
                                        className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 bg-white"
                                    >
                                        <option value="">বাসস্থানের ধরন নির্বাচন করুন</option>
                                        <option value="mud">মাটির ঘর</option>
                                        <option value="tin">টিনের ঘর</option>
                                        <option value="semi_brick">আধা-পাকা ঘর</option>
                                        <option value="brick">পাকা ঘর / দালান</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-900">
                                    ১৯. (i) মোট ঘরের সংখ্যা / House Property
                                </h3>
                                <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2 lg:grid-cols-4">
                                    <div>
                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                            Mud House (মাটির ঘর)
                                        </label>
                                        <select
                                            value={data.mud_house_count}
                                            onChange={(e) =>
                                                setData('mud_house_count', Number(e.target.value))
                                            }
                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 bg-white"
                                        >
                                            {[0, 1, 2, 3, 4, 5].map((num) => (
                                                <option key={num} value={num}>
                                                    {num}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                            Tin House (টিনের ঘর)
                                        </label>
                                        <select
                                            value={data.tin_house_count}
                                            onChange={(e) =>
                                                setData('tin_house_count', Number(e.target.value))
                                            }
                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 bg-white"
                                        >
                                            {[0, 1, 2, 3, 4, 5].map((num) => (
                                                <option key={num} value={num}>
                                                    {num}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                            Brick House (ইটের ঘর)
                                        </label>
                                        <select
                                            value={data.brick_house_count}
                                            onChange={(e) =>
                                                setData('brick_house_count', Number(e.target.value))
                                            }
                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 bg-white"
                                        >
                                            {[0, 1, 2, 3, 4, 5].map((num) => (
                                                <option key={num} value={num}>
                                                    {num}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                            Semi-Brick House (আধা-পাকা ঘর)
                                        </label>
                                        <select
                                            value={data.semi_brick_house_count}
                                            onChange={(e) =>
                                                setData('semi_brick_house_count', Number(e.target.value))
                                            }
                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 bg-white"
                                        >
                                            {[0, 1, 2, 3, 4, 5].map((num) => (
                                                <option key={num} value={num}>
                                                    {num}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 space-y-4">
                                <h3 className="text-sm font-semibold text-gray-900">
                                    ১৯. (ii) গবাদি পশু-পাখির তথ্য / Livestock
                                </h3>
                                <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2 lg:grid-cols-4">
                                    <div>
                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                            Cow/Buffalo (গরু/মহিষ)
                                        </label>
                                        <select
                                            value={data.cow_buffalo_count}
                                            onChange={(e) =>
                                                setData('cow_buffalo_count', Number(e.target.value))
                                            }
                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 bg-white"
                                        >
                                            {[0, 1, 2, 3, 4, 5].map((num) => (
                                                <option key={num} value={num}>
                                                    {num}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                            Goat/Sheep (ছাগল/ভেড়া)
                                        </label>
                                        <select
                                            value={data.goat_sheep_count}
                                            onChange={(e) =>
                                                setData('goat_sheep_count', Number(e.target.value))
                                            }
                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 bg-white"
                                        >
                                            {[0, 1, 2, 3, 4, 5].map((num) => (
                                                <option key={num} value={num}>
                                                    {num}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                            Duck/Chicken (হাঁস/মুরগি)
                                        </label>
                                        <select
                                            value={data.duck_chicken_count}
                                            onChange={(e) =>
                                                setData('duck_chicken_count', Number(e.target.value))
                                            }
                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 bg-white"
                                        >
                                            {[0, 1, 2, 3, 4, 5].map((num) => (
                                                <option key={num} value={num}>
                                                    {num}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                            Other Count (অন্যান্য সংখ্যা)
                                        </label>
                                        <select
                                            value={data.other_livestock_count}
                                            onChange={(e) =>
                                                setData('other_livestock_count', Number(e.target.value))
                                            }
                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 bg-white"
                                        >
                                            {[0, 1, 2, 3, 4, 5].map((num) => (
                                                <option key={num} value={num}>
                                                    {num}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {Number(data.other_livestock_count) > 0 && (
                                        <div className="md:col-span-2">
                                            <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                                Other Livestock Description (অন্যান্য গবাদিপশু বিবরণ)
                                            </label>
                                            <input
                                                type="text"
                                                value={data.other_livestock}
                                                onChange={(e) =>
                                                    setData(
                                                        'other_livestock',
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 space-y-4">
                                <h3 className="text-sm font-semibold text-gray-900">
                                    ১৯. (iii) জমির পরিমাণ ও মূল্য / Land Information
                                </h3>
                                <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                                    <div>
                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                            মোট জমির পরিমাণ (শতক)
                                        </label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={
                                                (Number(
                                                    data.cultivable_land_amount,
                                                ) || 0) +
                                                    (Number(
                                                        data.non_cultivable_land_amount,
                                                    ) || 0) || ''
                                            }
                                            className="w-full rounded-md border border-gray-300 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                            মোট জমির মূল্য
                                        </label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={
                                                (Number(
                                                    data.cultivable_land_value,
                                                ) || 0) +
                                                    (Number(
                                                        data.non_cultivable_land_value,
                                                    ) || 0) || ''
                                            }
                                            className="w-full rounded-md border border-gray-300 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-700"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                                    <div>
                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                            Cultivable Land - Acres (আবাদযোগ্য জমি - শতক)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="0"
                                            value={toNumVal(data.cultivable_land_amount)}
                                            onChange={(e) =>
                                                setData(
                                                    'cultivable_land_amount',
                                                    toNumChange(e.target.value),
                                                )
                                            }
                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                            Cultivable Land Value (আবাদযোগ্য জমির মূল্য)
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={toNumVal(data.cultivable_land_value)}
                                            onChange={(e) =>
                                                setData(
                                                    'cultivable_land_value',
                                                    toNumChange(e.target.value),
                                                )
                                            }
                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                            Non-Cultivable Land - Acres (অনাবাদি জমি - শতক)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="0"
                                            value={toNumVal(data.non_cultivable_land_amount)}
                                            onChange={(e) =>
                                                setData(
                                                    'non_cultivable_land_amount',
                                                    toNumChange(e.target.value),
                                                )
                                            }
                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                            Non-Cultivable Land Value (অনাবাদি জমির মূল্য)
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={toNumVal(data.non_cultivable_land_value)}
                                            onChange={(e) =>
                                                setData(
                                                    'non_cultivable_land_value',
                                                    toNumChange(e.target.value),
                                                )
                                            }
                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ১৯. (iv) অস্থায়ী সম্পদের তথ্য */}
                            <div className="space-y-4 pt-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-gray-900">
                                        ১৯. (iv) অস্থায়ী সম্পদের তথ্য
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={addOtherAsset}
                                        className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 md:text-sm"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add Asset
                                    </button>
                                </div>

                                {data.other_assets &&
                                data.other_assets.length > 0 ? (
                                    <div className="space-y-4">
                                        {data.other_assets.map(
                                            (asset, index) => (
                                                <div
                                                    key={index}
                                                    className="rounded-md border border-gray-200 bg-gray-50/50 p-2.5"
                                                >
                                                    <div className="mb-4 flex items-center justify-between">
                                                        <h4 className="font-medium text-gray-900">
                                                            Asset #{index + 1}
                                                        </h4>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                removeOtherAsset(
                                                                    index,
                                                                )
                                                            }
                                                            className="rounded p-1 text-red-600 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-3">
                                                        <div>
                                                            <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                                                অস্থায়ী সম্পদের বিবরণ
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={
                                                                    asset.asset_description
                                                                }
                                                                onChange={(e) =>
                                                                    updateOtherAsset(
                                                                        index,
                                                                        'asset_description',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                                                সংখ্যা/পরিমাণ
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={
                                                                    asset.quantity_amount
                                                                }
                                                                onChange={(e) =>
                                                                    updateOtherAsset(
                                                                        index,
                                                                        'quantity_amount',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                                                সম্ভাব্য মূল্য
                                                            </label>
                                                            <input
                                                                type="number"
                                                                placeholder="0"
                                                                value={toNumVal(asset.estimated_value)}
                                                                onChange={(e) =>
                                                                    updateOtherAsset(
                                                                        index,
                                                                        'estimated_value',
                                                                        toNumChange(e.target.value),
                                                                    )
                                                                }
                                                                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                ) : (
                                    <div className="py-8 text-center text-gray-500">
                                        No assets added
                                    </div>
                                )}
                            </div>
                        </FormSection>

                        {/* ৭. আর্থিক তথ্য (২০) */}
                        <FormSection title="Financial Info">
                            <h3 className="mb-2 text-sm font-semibold text-gray-900">
                                ২০. পরিবারের মোট মাসিক আয়
                            </h3>
                            <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-3">
                                <div>
                                    <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                        মাসিক আয়
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={toNumVal(data.monthly_income)}
                                        onChange={(e) =>
                                            setData(
                                                'monthly_income',
                                                toNumChange(e.target.value),
                                            )
                                        }
                                        className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                        মাসিক ব্যয়
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={toNumVal(data.monthly_expense)}
                                        onChange={(e) =>
                                            setData(
                                                'monthly_expense',
                                                toNumChange(e.target.value),
                                            )
                                        }
                                        className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="mb-0.5 block text-xs font-medium text-gray-600">
                                        সঞ্চয় (আয় − ব্যয়)
                                    </label>
                                    <input
                                        type="number"
                                        value={data.monthly_savings}
                                        readOnly
                                        className="w-full rounded-md border border-gray-300 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-700"
                                    />
                                </div>
                            </div>
                        </FormSection>

                        {/* ৮. অন্যান্য তথ্য ও নথিপত্র (২১–২৩) */}
                        <FormSection title="Additional Documents & Approver">
                            <ApproverSelectionStep
                                approvers={[]}
                                selectedApprovers={[]}
                                onApproverToggle={() => {}}
                                hideApproverSelection
                                interviewerName={data.interviewer_name || ''}
                                employeeName={data.employee_name || ''}
                                guardianName={data.guardian_name || ''}
                                otherLoanInfo={data.other_loan_info || ''}
                                requestedLoanAmount={data.requested_loan_amount}
                                projectName={data.project_name}
                                estimatedAnnualProjectIncome={data.estimated_annual_project_income}
                                collectorComment={data.collector_comment || ''}
                                customerPhoto={data.customer_photo || null}
                                customerNidPhoto={
                                    data.customer_nid_photo || null
                                }
                                guardianPhoto={data.guardian_photo || null}
                                guardianNidPhoto={
                                    data.guardian_nid_photo || null
                                }
                                applicantSignature={
                                    data.applicant_signature || null
                                }
                                onFieldChange={(field, value) =>
                                    setData(field as any, value)
                                }
                                errors={mergedErrors}
                            />
                        </FormSection>
                    </div>

                    {/* Form Actions */}
                    <div className="mt-4 flex flex-col-reverse items-stretch justify-end gap-2 border-t border-gray-200 pt-4 sm:flex-row sm:items-center">
                        <button
                            type="button"
                            onClick={() => router.visit('/member-admissions')}
                            className="inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 sm:min-h-0 sm:w-auto md:px-5 md:py-2.5 md:text-sm"
                        >
                            <X className="h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" />
                            বাতিল (Cancel)
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSubmit(true)}
                            disabled={processing}
                            className="inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 sm:min-h-0 sm:w-auto md:px-5 md:py-2.5 md:text-sm"
                        >
                            <Save className="h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" />
                            খসড়া সংরক্ষণ (Save Draft)
                        </button>
                    </div>
                </div>

                {/* MOBILE FLOATING ACTION BAR */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 z-50 flex items-center justify-between gap-2 shadow-2xl">
                    <button
                        type="button"
                        onClick={() => router.visit('/member-admissions')}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold border border-slate-300 active:scale-95 transition"
                    >
                        <X className="w-4 h-4 text-slate-600" />
                        <span>বাতিল</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSubmit(true)}
                        disabled={processing}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md active:scale-95 transition disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        <span>খসড়া সংরক্ষণ</span>
                    </button>
                </div>
            </div>
        </AdminLayout>
    );
}
