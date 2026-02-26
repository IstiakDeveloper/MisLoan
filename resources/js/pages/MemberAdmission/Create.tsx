import React, { useState, useEffect } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import {
    Save,
    Send,
    Plus,
    Trash2,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { MemberAdmissionFormData, FamilyMember, OtherAsset } from '@/types/memberAdmission';
import bangladeshData from '@/data/bangladeshAddresses.json';
import ApproverSelectionStep from '@/components/MemberAdmission/ApproverSelectionStep';

interface Props {
    branches: Array<{ id: number; name: string }>;
    samities: Array<{ id: number; samity_name: string; branch_id: number }>;
    categories: Array<{ id: number; category_name: string }>;
    availableApprovers: Array<{ id: number; name: string; email: string; role: { name: string } }>;
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
    const [currentStep, setCurrentStep] = useState(1);
    const [availableSamities, setAvailableSamities] = useState(samities);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

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
            }
        }
    }, [data.branch_id]);

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

    const validateStep = (step: number): boolean => {
        const errors: Record<string, string> = {};

        if (step === 1) {
            if (!data.branch_id) errors.branch_id = 'Branch is required';
            if (!data.samity_id) errors.samity_id = 'Samity is required';
            if (!data.member_category_id) errors.member_category_id = 'Member Category is required';
            if (!data.survey_date) errors.survey_date = 'Survey Date is required';
            if (!data.admission_date) errors.admission_date = 'Admission Date is required';
        } else if (step === 2) {
            if (!data.applicant_name_en) errors.applicant_name_en = 'Applicant Name (English) is required';
            if (!data.father_name_en) errors.father_name_en = 'Father Name is required';
            if (!data.mobile_number) errors.mobile_number = 'Mobile Number is required';
        } else if (step === 3) {
            if (!data.present_village_road) errors.present_village_road = 'Present Address is required';
        } else if (step === 4) {
            if (!data.nid_number && !data.birth_certificate_number) {
                errors.nid_number = 'Either NID or Birth Certificate is required';
            }
            if (!data.date_of_birth) errors.date_of_birth = 'Date of Birth is required';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrevious = () => {
        setCurrentStep(currentStep - 1);
    };

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

    const steps = [
        { id: 1, title: '১. সংস্থা ও তারিখ' },
        { id: 2, title: '২. ব্যক্তিগত তথ্য' },
        { id: 3, title: '৩. ঠিকানা' },
        { id: 4, title: '৪. ১২–১৫ পরিচয় ও জামিনদার' },
        { id: 5, title: '৫. ১৬ পরিবার ও আর্থিক কর্মকাণ্ড' },
        { id: 6, title: '৬. সম্পত্তি (১৭–১৯)' },
        { id: 7, title: '৭. আর্থিক তথ্য (২০)' },
        { id: 8, title: '৮. অন্যান্য তথ্য ও অনুমোদনকারী (২১–২৩)' },
    ];

    return (
        <AdminLayout>
            <Head title="New Member Admission Application" />

            <div className="space-y-6 max-w-full">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">New Member Admission Application</h1>
                        <p className="text-sm text-gray-600 mt-1">Fill out the application form for member admission</p>
                    </div>
                </div>

                {/* Progress Steps */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-8 overflow-x-auto">
                        {steps.map((step, index) => (
                            <div key={step.id} className="flex items-center">
                                <button
                                    onClick={() => setCurrentStep(step.id)}
                                    className={`flex flex-col items-center min-w-[80px] ${
                                        currentStep === step.id ? 'text-blue-600' : 'text-gray-400'
                                    }`}
                                >
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold mb-2 ${
                                            currentStep === step.id
                                                ? 'bg-blue-600 text-white'
                                                : currentStep > step.id
                                                ? 'bg-green-500 text-white'
                                                : 'bg-gray-200 text-gray-600'
                                        }`}
                                    >
                                        {step.id}
                                    </div>
                                    <span className="text-xs text-center whitespace-nowrap">{step.title}</span>
                                </button>
                                {index < steps.length - 1 && (
                                    <div
                                        className={`h-1 w-12 mx-2 ${
                                            currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                                        }`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Form Content */}
                    <div className="space-y-6">
                        {/* Step 1: Organization & Dates */}
                        {currentStep === 1 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900">Organization & Date</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Branch (শাখা) <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={data.branch_id}
                                            onChange={handleBranchChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                            disabled={!hasAllAccess}
                                        >
                                            <option value={0}>Select Branch</option>
                                            {branches.map((branch) => (
                                                <option key={branch.id} value={branch.id}>
                                                    {branch.name}
                                                </option>
                                            ))}
                                        </select>
                                        {(errors.branch_id || validationErrors.branch_id) && (
                                            <p className="mt-1 text-sm text-red-600">{errors.branch_id || validationErrors.branch_id}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            ১. Samity (সমিতি) <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={data.samity_id}
                                            onChange={(e) => setData('samity_id', Number(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            disabled={!data.branch_id}
                                        >
                                            <option value={0}>Select Samity</option>
                                            {availableSamities.map((samity) => (
                                                <option key={samity.id} value={samity.id}>
                                                    {samity.samity_name}
                                                </option>
                                            ))}
                                        </select>
                                        {(errors.samity_id || validationErrors.samity_id) && (
                                            <p className="mt-1 text-sm text-red-600">{errors.samity_id || validationErrors.samity_id}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            ২. Member Category (সদস্য শ্রেণি) <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={data.member_category_id}
                                            onChange={(e) => setData('member_category_id', Number(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value={0}>Select Category</option>
                                            {categories.map((category) => (
                                                <option key={category.id} value={category.id}>
                                                    {category.category_name}
                                                </option>
                                            ))}
                                        </select>
                                        {(errors.member_category_id || validationErrors.member_category_id) && (
                                            <p className="mt-1 text-sm text-red-600">{errors.member_category_id || validationErrors.member_category_id}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            জরিপের তারিখ <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={data.survey_date}
                                            onChange={(e) => setData('survey_date', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        {(errors.survey_date || validationErrors.survey_date) && (
                                            <p className="mt-1 text-sm text-red-600">{errors.survey_date || validationErrors.survey_date}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            ভর্তির তারিখ <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={data.admission_date}
                                            onChange={(e) => setData('admission_date', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        {(errors.admission_date || validationErrors.admission_date) && (
                                            <p className="mt-1 text-sm text-red-600">{errors.admission_date || validationErrors.admission_date}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Personal Information */}
                        {currentStep === 2 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            ৩. Applicant's Name (English) (আবেদনকারীর নাম - ইংরেজি) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.applicant_name_en}
                                            onChange={(e) => setData('applicant_name_en', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        {errors.applicant_name_en && (
                                            <p className="mt-1 text-sm text-red-600">{errors.applicant_name_en}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            ৩. Applicant's Name (বাংলায়) (আবেদনকারীর নাম - বাংলা) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.applicant_name_bn}
                                            onChange={(e) => setData('applicant_name_bn', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        {errors.applicant_name_bn && (
                                            <p className="mt-1 text-sm text-red-600">{errors.applicant_name_bn}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            ৪. Father's Name (English) (পিতার নাম - ইংরেজি) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.father_name_en}
                                            onChange={(e) => setData('father_name_en', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        {errors.father_name_en && (
                                            <p className="mt-1 text-sm text-red-600">{errors.father_name_en}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            ৪. Father's Name (বাংলায়) (পিতার নাম - বাংলা) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.father_name_bn}
                                            onChange={(e) => setData('father_name_bn', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        {errors.father_name_bn && (
                                            <p className="mt-1 text-sm text-red-600">{errors.father_name_bn}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            ৫. Mother's Name (English) (মাতার নাম - ইংরেজি) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.mother_name_en}
                                            onChange={(e) => setData('mother_name_en', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        {errors.mother_name_en && (
                                            <p className="mt-1 text-sm text-red-600">{errors.mother_name_en}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            ৫. Mother's Name (বাংলায়) (মাতার নাম - বাংলা) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.mother_name_bn}
                                            onChange={(e) => setData('mother_name_bn', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        {errors.mother_name_bn && (
                                            <p className="mt-1 text-sm text-red-600">{errors.mother_name_bn}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            ৭. বৈবাহিক অবস্থা (Marital Status) (বৈবাহিক অবস্থা) <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={data.marital_status}
                                            onChange={(e) => setData('marital_status', e.target.value as any)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="single">Single</option>
                                            <option value="married">Married</option>
                                            <option value="divorced">Divorced</option>
                                            <option value="widowed">Widowed</option>
                                        </select>
                                        {errors.marital_status && (
                                            <p className="mt-1 text-sm text-red-600">{errors.marital_status}</p>
                                        )}
                                    </div>

                                    {data.marital_status === 'married' && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    ৬. Spouse Name (English) (স্বামী/স্ত্রীর নাম - ইংরেজি)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={data.spouse_name_en}
                                                    onChange={(e) => setData('spouse_name_en', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    ৬. Spouse Name (বাংলায়) (স্বামী/স্ত্রীর নাম - বাংলা)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={data.spouse_name_bn}
                                                    onChange={(e) => setData('spouse_name_bn', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                        </>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            ৮. মোবাইল নং (Mobile Number) (মোবাইল নং) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="tel"
                                            value={data.mobile_number}
                                            onChange={(e) => setData('mobile_number', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        {errors.mobile_number && (
                                            <p className="mt-1 text-sm text-red-600">{errors.mobile_number}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            ৯. বিকল্প মোবাইল নং (Alternative Mobile) (বিকল্প মোবাইল নং)
                                        </label>
                                        <input
                                            type="tel"
                                            value={data.alternative_mobile}
                                            onChange={(e) => setData('alternative_mobile', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Address */}
                        {currentStep === 3 && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">১০. Present Address (বর্তমান ঠিকানা)</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Division (বিভাগ) <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                value={data.present_division}
                                                onChange={(e) => setData('present_division', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                <option value="">Select Division (বিভাগ নির্বাচন করুন)</option>
                                                {bangladeshData.divisions.map((division) => (
                                                    <option key={division} value={division}>{division}</option>
                                                ))}
                                            </select>
                                            {errors.present_division && (
                                                <p className="mt-1 text-sm text-red-600">{errors.present_division}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                District (জেলা) <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                value={data.present_district}
                                                onChange={(e) => setData('present_district', e.target.value)}
                                                disabled={!data.present_division}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                            >
                                                <option value="">Select District (জেলা নির্বাচন করুন)</option>
                                                {presentDistricts.map((district) => (
                                                    <option key={district} value={district}>{district}</option>
                                                ))}
                                            </select>
                                            {errors.present_district && (
                                                <p className="mt-1 text-sm text-red-600">{errors.present_district}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Upazila (উপজেলা) <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                value={data.present_upazila}
                                                onChange={(e) => setData('present_upazila', e.target.value)}
                                                disabled={!data.present_district}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                            >
                                                <option value="">Select Upazila (উপজেলা নির্বাচন করুন)</option>
                                                {presentUpazilas.map((upazila) => (
                                                    <option key={upazila} value={upazila}>{upazila}</option>
                                                ))}
                                            </select>
                                            {errors.present_upazila && (
                                                <p className="mt-1 text-sm text-red-600">{errors.present_upazila}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Union (ইউনিয়ন)</label>
                                            <input
                                                type="text"
                                                value={data.present_union}
                                                onChange={(e) => setData('present_union', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Village/Road (গ্রাম/রাস্তা)
                                            </label>
                                            <input
                                                type="text"
                                                value={data.present_village_road}
                                                onChange={(e) => setData('present_village_road', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Post Code (পোস্ট কোড)</label>
                                            <input
                                                type="text"
                                                value={data.present_post_code}
                                                onChange={(e) => setData('present_post_code', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">১১. Permanent Address (স্থায়ী ঠিকানা)</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Division (বিভাগ)</label>
                                                <select
                                                    value={data.permanent_division}
                                                    onChange={(e) => setData('permanent_division', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    <option value="">Select Division (বিভাগ নির্বাচন করুন)</option>
                                                    {bangladeshData.divisions.map((division) => (
                                                        <option key={division} value={division}>{division}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">District (জেলা)</label>
                                                <select
                                                    value={data.permanent_district}
                                                    onChange={(e) => setData('permanent_district', e.target.value)}
                                                    disabled={!data.permanent_division}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                >
                                                    <option value="">Select District (জেলা নির্বাচন করুন)</option>
                                                    {permanentDistricts.map((district) => (
                                                        <option key={district} value={district}>{district}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Upazila (উপজেলা)</label>
                                                <select
                                                    value={data.permanent_upazila}
                                                    onChange={(e) => setData('permanent_upazila', e.target.value)}
                                                    disabled={!data.permanent_district}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                >
                                                    <option value="">Select Upazila (উপজেলা নির্বাচন করুন)</option>
                                                    {permanentUpazilas.map((upazila) => (
                                                        <option key={upazila} value={upazila}>{upazila}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Union (ইউনিয়ন)</label>
                                                <input
                                                    type="text"
                                                    value={data.permanent_union}
                                                    onChange={(e) => setData('permanent_union', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Village/Road (গ্রাম/রাস্তা)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={data.permanent_village_road}
                                                    onChange={(e) => setData('permanent_village_road', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Post Code (পোস্ট কোড)</label>
                                                <input
                                                    type="text"
                                                    value={data.permanent_post_code}
                                                    onChange={(e) => setData('permanent_post_code', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 4: Identity - ১২, ১৩ (ফরম অনুযায়ী) */}
                        {currentStep === 4 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900">১২. Identity Information (পরিচয় তথ্য)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">National ID No.</label>
                                        <input
                                            type="text"
                                            value={data.nid_number}
                                            onChange={(e) => setData('nid_number', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Smart Card No.
                                        </label>
                                        <input
                                            type="text"
                                            value={data.smart_card_number}
                                            onChange={(e) => setData('smart_card_number', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mt-6">১৩. Other Identity Information (জন্ম সনদ নং, DOB, Gender, Family Mobile)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">জন্ম সনদ নং (প্রযোজ্য ক্ষেত্রে)</label>
                                        <input
                                            type="text"
                                            value={data.birth_certificate_number}
                                            onChange={(e) => setData('birth_certificate_number', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                                        <input
                                            type="date"
                                            value={data.date_of_birth}
                                            onChange={(e) => setData('date_of_birth', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender (লিঙ্গ) <span className="text-red-500">*</span></label>
                                        <select
                                            value={data.gender}
                                            onChange={(e) => setData('gender', e.target.value as any)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                        </select>
                                        {errors.gender && <p className="mt-1 text-sm text-red-600">{errors.gender}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Family Members Mobile Number</label>
                                        <input
                                            type="tel"
                                            value={data.family_member_mobile}
                                            onChange={(e) => setData('family_member_mobile', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 4 (cont.): Guarantor - ১৪, ১৫ (ফরম অনুযায়ী) */}
                        {currentStep === 4 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900">১৪. Co-Applicant/Guarantor Name, ১৫. TIN ও এসএমএস</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">১৪. Co-Applicant/Guarantor Name</label>
                                        <input
                                            type="text"
                                            value={data.guarantor_name}
                                            onChange={(e) => setData('guarantor_name', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Guarantor Mobile Number
                                        </label>
                                        <input
                                            type="tel"
                                            value={data.guarantor_mobile}
                                            onChange={(e) => setData('guarantor_mobile', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">১৫. TIN (ট্র্যাক্স সার্টিফিকেট নং)</label>
                                        <input
                                            type="text"
                                            value={data.tin_number}
                                            onChange={(e) => setData('tin_number', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                            </div>
                        )}

                        {/* Step 5: ১৬. পরিবারের তথ্য + আর্থিক কর্মকাণ্ড */}
                        {currentStep === 5 && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900">১৬. পরিবারের তথ্য / Family Members</h3>
                                    <button
                                        type="button"
                                        onClick={addFamilyMember}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Member
                                    </button>
                                </div>

                                {data.family_members && data.family_members.length > 0 ? (
                                    <div className="space-y-4">
                                        {data.family_members.map((member, index) => (
                                            <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
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
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Name (নাম)</label>
                                                        <input
                                                            type="text"
                                                            value={member.member_name}
                                                            onChange={(e) => updateFamilyMember(index, 'member_name', e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Relationship (সম্পর্ক)</label>
                                                        <input
                                                            type="text"
                                                            value={member.relation_with_head}
                                                            onChange={(e) => updateFamilyMember(index, 'relation_with_head', e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender (লিঙ্গ)</label>
                                                        <select
                                                            value={member.gender}
                                                            onChange={(e) => updateFamilyMember(index, 'gender', e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        >
                                                            <option value="male">Male</option>
                                                            <option value="female">Female</option>
                                                            <option value="other">Other</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Age - Years (বয়স - বছর)</label>
                                                        <input
                                                            type="number"
                                                            value={member.age_years}
                                                            onChange={(e) => updateFamilyMember(index, 'age_years', Number(e.target.value))}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Age - Months (বয়স - মাস)</label>
                                                        <input
                                                            type="number"
                                                            value={member.age_months}
                                                            onChange={(e) => updateFamilyMember(index, 'age_months', Number(e.target.value))}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Education Level (শিক্ষাগত যোগ্যতা)</label>
                                                        <input
                                                            type="text"
                                                            value={member.education_level}
                                                            onChange={(e) => updateFamilyMember(index, 'education_level', e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Occupation (পেশা)</label>
                                                        <input
                                                            type="text"
                                                            value={member.occupation}
                                                            onChange={(e) => updateFamilyMember(index, 'occupation', e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Income (মাসিক আয়)</label>
                                                        <input
                                                            type="number"
                                                            value={member.monthly_income}
                                                            onChange={(e) => updateFamilyMember(index, 'monthly_income', Number(e.target.value))}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">No family members added</div>
                                )}

                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                    <p className="font-medium text-sm text-gray-800 mb-2">আর্থিক কর্মকাণ্ড সম্পর্কিত (প্রযোজ্য ক্ষেত্রে ✓/লিখুন)</p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">ক. ব্যবসা</label>
                                            <input
                                                type="text"
                                                value={data.business_details || ''}
                                                onChange={(e) => setData('business_details', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">খ. চাকরি</label>
                                            <input
                                                type="text"
                                                value={data.job_details || ''}
                                                onChange={(e) => setData('job_details', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">গ. অন্যান্য</label>
                                            <input
                                                type="text"
                                                value={data.other_income_details || ''}
                                                onChange={(e) => setData('other_income_details', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 6: ১৭, ১৮, ১৯ Property Info (including ১৯(iv) other assets) */}
                        {currentStep === 6 && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            ১৭. মোট সম্পদের পরিমাণ (Total Asset Value)
                                        </label>
                                        <input
                                            type="number"
                                            value={data.total_asset_value}
                                            onChange={(e) => setData('total_asset_value', Number(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">১৮. বাড়ীর ধরণ (House Type)</label>
                                        <input
                                            type="text"
                                            value={data.house_type}
                                            onChange={(e) => setData('house_type', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">১৯. (i) মোট ঘরের সংখ্যা / House Property</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Mud House (মাটির ঘর)</label>
                                            <input
                                                type="number"
                                                value={data.mud_house_count}
                                                onChange={(e) => setData('mud_house_count', Number(e.target.value))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Tin House (টিনের ঘর)</label>
                                            <input
                                                type="number"
                                                value={data.tin_house_count}
                                                onChange={(e) => setData('tin_house_count', Number(e.target.value))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Brick House (ইটের ঘর)</label>
                                            <input
                                                type="number"
                                                value={data.brick_house_count}
                                                onChange={(e) => setData('brick_house_count', Number(e.target.value))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Semi-Brick House (আধা-পাকা ঘর)
                                            </label>
                                            <input
                                                type="number"
                                                value={data.semi_brick_house_count}
                                                onChange={(e) => setData('semi_brick_house_count', Number(e.target.value))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">১৯. (ii) গবাদি পশু-পাখির তথ্য / Livestock</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Cow/Buffalo (গরু/মহিষ)</label>
                                            <input
                                                type="number"
                                                value={data.cow_buffalo_count}
                                                onChange={(e) => setData('cow_buffalo_count', Number(e.target.value))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Goat/Sheep (ছাগল/ভেড়া)</label>
                                            <input
                                                type="number"
                                                value={data.goat_sheep_count}
                                                onChange={(e) => setData('goat_sheep_count', Number(e.target.value))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Duck/Chicken (হাঁস/মুরগি)</label>
                                            <input
                                                type="number"
                                                value={data.duck_chicken_count}
                                                onChange={(e) => setData('duck_chicken_count', Number(e.target.value))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Other Count (অন্যান্য সংখ্যা)
                                            </label>
                                            <input
                                                type="number"
                                                value={data.other_livestock_count}
                                                onChange={(e) => setData('other_livestock_count', Number(e.target.value))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Other Livestock Description (অন্যান্য গবাদিপশু বিবরণ)
                                            </label>
                                            <input
                                                type="text"
                                                value={data.other_livestock}
                                                onChange={(e) => setData('other_livestock', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">১৯. (iii) জমির পরিমাণ ও মূল্য / Land Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Cultivable Land - Acres (আবাদযোগ্য জমি - শতক)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={data.cultivable_land_amount}
                                                onChange={(e) => setData('cultivable_land_amount', Number(e.target.value))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Cultivable Land Value (আবাদযোগ্য জমির মূল্য)
                                            </label>
                                            <input
                                                type="number"
                                                value={data.cultivable_land_value}
                                                onChange={(e) => setData('cultivable_land_value', Number(e.target.value))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Non-Cultivable Land - Acres (অনাবাদি জমি - শতক)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={data.non_cultivable_land_amount}
                                                onChange={(e) =>
                                                    setData('non_cultivable_land_amount', Number(e.target.value))
                                                }
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Non-Cultivable Land Value (অনাবাদি জমির মূল্য)
                                            </label>
                                            <input
                                                type="number"
                                                value={data.non_cultivable_land_value}
                                                onChange={(e) => setData('non_cultivable_land_value', Number(e.target.value))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* ১৯. (iv) অস্থায়ী সম্পদের তথ্য (ফরম অনুযায়ী ১৯-এর অংশ) */}
                                <div className="space-y-4 pt-2">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-gray-900">১৯. (iv) অস্থায়ী সম্পদের তথ্য</h3>
                                        <button
                                            type="button"
                                            onClick={addOtherAsset}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add Asset
                                        </button>
                                    </div>

                                    {data.other_assets && data.other_assets.length > 0 ? (
                                        <div className="space-y-4">
                                            {data.other_assets.map((asset, index) => (
                                                <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
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
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">অস্থায়ী সম্পদের বিবরণ</label>
                                                            <input
                                                                type="text"
                                                                value={asset.asset_description}
                                                                onChange={(e) => updateOtherAsset(index, 'asset_description', e.target.value)}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">সংখ্যা/পরিমাণ</label>
                                                            <input
                                                                type="text"
                                                                value={asset.quantity_amount}
                                                                onChange={(e) => updateOtherAsset(index, 'quantity_amount', e.target.value)}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">সম্ভাব্য মূল্য</label>
                                                            <input
                                                                type="number"
                                                                value={asset.estimated_value}
                                                                onChange={(e) => updateOtherAsset(index, 'estimated_value', Number(e.target.value))}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                            </div>
                        )}

                        {/* Step 7: Financial Info (২০) */}
                        {currentStep === 7 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900">২০. পরিবারের মোট মাসিক আয়</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">মাসিক আয়</label>
                                        <input
                                            type="number"
                                            value={data.monthly_income}
                                            onChange={(e) => setData('monthly_income', Number(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">মাসিক ব্যয়</label>
                                        <input
                                            type="number"
                                            value={data.monthly_expense}
                                            onChange={(e) => setData('monthly_expense', Number(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">সঞ্চয়</label>
                                        <input
                                            type="number"
                                            value={data.monthly_savings}
                                            onChange={(e) => setData('monthly_savings', Number(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 8: Additional (২১–২৩) + Documents — approver selection removed; submit goes to branch manager */}
                        {currentStep === 8 && (
                            <ApproverSelectionStep
                                approvers={[]}
                                selectedApprovers={[]}
                                onApproverToggle={() => {}}
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
                        )}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={handlePrevious}
                            disabled={currentStep === 1}
                            className="flex items-center gap-2 px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Previous
                        </button>

                        <div className="flex items-center gap-4">
                            {currentStep === steps.length ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => handleSubmit(true)}
                                        disabled={processing}
                                        className="flex items-center gap-2 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
                                    >
                                        <Save className="w-4 h-4" />
                                        Save Draft
                                    </button>
                                    {!isFieldOfficer && (
                                        <button
                                            type="button"
                                            onClick={() => handleSubmit(false)}
                                            disabled={processing}
                                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                        >
                                            <Send className="w-4 h-4" />
                                            Submit
                                        </button>
                                    )}
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Next
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Validation Errors */}
                    {Object.keys(validationErrors).length > 0 && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</p>
                            <ul className="list-disc list-inside text-sm text-red-600">
                                {Object.values(validationErrors).map((error, index) => (
                                    <li key={index}>{error}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
