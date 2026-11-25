import addresses from '@/data/bangladeshAddresses.json';
import AdminLayout from '@/layouts/admin-layout';
import AddressSection from '@/pages/MemberAdmission/sections/AddressSection';
import EconomicPropertySection from '@/pages/MemberAdmission/sections/EconomicPropertySection';
import FamilyMembersSection from '@/pages/MemberAdmission/sections/FamilyMembersSection';
import FinancialCommentsSection from '@/pages/MemberAdmission/sections/FinancialCommentsSection';
import OtherAssetsSection from '@/pages/MemberAdmission/sections/OtherAssetsSection';
import {
    cycleAdmissionEdits,
    restoreCycleAdmissionDraft,
} from '@/utils/cycleAdmissionDraft';
import { toEnglishDigits } from '@/utils/memberCodeUtils';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import CycleIdentitySection from './CycleIdentitySection';
import CyclePersonalInfoSection from './CyclePersonalInfoSection';

const photos: Record<string, string> = {
    customer_photo: 'customer_photo_path',
    customer_nid_photo: 'customer_nid_photo_path',
    customer_nid_back_photo: 'customer_nid_back_photo_path',
    guardian_photo: 'guardian_photo_path',
    guardian_nid_photo: 'guardian_nid_photo_path',
    applicant_signature: 'applicant_signature_path',
};

export default function AdmissionEdit({
    cycle,
    admission,
    categories,
    editableFields,
    documentManifest = [],
}: {
    cycle: {
        id: number;
        number: number;
        revision: number;
        master_admission_id: number;
    };
    admission: Record<string, any>;
    categories: Array<{ id: number; category_name: string }>;
    editableFields: string[];
    documentManifest?: Array<{
        source: string | null;
        path: string | null;
        missing: boolean;
    }>;
}) {
    const page = usePage();
    const userId = (page.props.auth as { user?: { id: number } })?.user?.id;
    const localKey = `misloan_cycle_admission_${userId}_${cycle.id}`;
    const form = useForm<Record<string, any>>(() => {
        const initial: Record<string, any> = {
            ...admission,
            revision: cycle.revision,
        };
        Object.entries(photos).forEach(([field, column]) => {
            initial[field] = admission[column] || null;
        });
        try {
            const cached = JSON.parse(localStorage.getItem(localKey) || 'null');
            return restoreCycleAdmissionDraft(
                initial,
                cached,
                editableFields,
                Object.keys(photos),
            );
        } catch {
            /* Server copy remains available. */
        }
        return initial;
    });
    const { data, errors, processing } = form;
    const serverErrors = errors || {};
    const validationErrors = (page.props as any)?.errors || {};
    const mergedErrors = { ...validationErrors, ...serverErrors };
    const hasErrors = Object.keys(mergedErrors).length > 0;
    const setData = (field: string, value: any) => {
        if (!editableFields.includes(field)) return;
        form.setData((previous: Record<string, any>) => ({
            ...previous,
            [field]: value,
        }));
    };
    useEffect(() => {
        form.setData((previous: Record<string, any>) => ({
            ...previous,
            revision: cycle.revision,
        }));
    }, [cycle.revision]);
    useEffect(() => {
        const timer = setTimeout(() => {
            try {
                localStorage.setItem(
                    localKey,
                    JSON.stringify(
                        {
                            id: admission.id,
                            ...cycleAdmissionEdits(data, editableFields),
                        },
                        (_key, value) =>
                            value instanceof File ? undefined : value,
                    ),
                );
            } catch {
                /* Server save is still available. */
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [data, localKey]);

    const save = (proceed: boolean) => {
        form.transform((values) => {
            const payload: Record<string, any> = {
                ...cycleAdmissionEdits(values, editableFields),
                continue: proceed,
                family_members: JSON.stringify(values.family_members || []),
                other_assets: JSON.stringify(values.other_assets || []),
            };
            Object.entries(photos).forEach(([field, column]) => {
                if (payload[field] instanceof File) return;
                if (payload[field] === null && admission[column])
                    payload[`clear_${field}`] = true;
                delete payload[field];
            });
            return payload;
        });
        form.post(`/member/cycle-hub/renewals/${cycle.id}/admission`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                try {
                    localStorage.removeItem(localKey);
                } catch {
                    /* Optional backup. */
                }
            },
        });
    };
    const number = (value: string) =>
        value === '' ? '' : Number(toEnglishDigits(value));
    const numericProps = {
        toNumVal: (value: any) => value ?? '',
        toNumChange: number,
    };
    const districts = addresses.districtsByDivision as Record<string, string[]>;
    const upazilas = addresses.upazilasByDistrict as Record<string, string[]>;
    const changeAddress = (
        prefix: 'present' | 'permanent',
        part: 'division' | 'district',
        value: string,
    ) => {
        form.setData((previous: Record<string, any>) => ({
            ...previous,
            [`${prefix}_${part}`]: value,
            [`${prefix}_upazila`]: '',
            ...(part === 'division' ? { [`${prefix}_district`]: '' } : {}),
        }));
    };
    const buttons = (
        <div className="flex flex-wrap gap-3">
            <button
                type="button"
                disabled={processing}
                onClick={() => save(false)}
                className="rounded-xl border border-emerald-700 px-5 py-3 text-emerald-800 disabled:opacity-50"
            >
                খসড়া সংরক্ষণ
            </button>
            <button
                type="button"
                disabled={processing}
                onClick={() => save(true)}
                className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
                সংরক্ষণ ও ঋণ নির্বাচন
            </button>
            <Link
                href={`/member/cycle-hub?member_id=${cycle.master_admission_id}`}
                className="rounded-xl border px-5 py-3"
            >
                Cycle Hub-এ ফিরুন
            </Link>
        </div>
    );

    return (
        <AdminLayout>
            <Head title={`দফা ${cycle.number} — ভর্তি তথ্য`} />
            <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
                <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                    <h1 className="text-xl font-bold">
                        দফা {cycle.number} — সদস্যের ভর্তি তথ্য
                    </h1>
                    <p className="text-sm">
                        সদস্য নং: {admission.application_no}। প্রয়োজন হলে এই
                        দফার তথ্য সংশোধন করুন; পরিবর্তন ছাড়াও সংরক্ষণ করে এগোতে
                        পারবেন।
                    </p>
                    <p className="text-sm text-emerald-900">
                        সদস্য নম্বর, NID ও স্মার্ট কার্ড আগের সদস্য ফাইলের মতোই
                        থাকবে। এই দফায় পরিচয়ের তথ্য পরিবর্তন করা যাবে না।
                    </p>
                    {buttons}
                </div>
                {hasErrors && (
                    <div
                        role="alert"
                        className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800"
                    >
                        <p className="mb-1 font-semibold">
                            অনুগ্রহ করে নিচের ত্রুটিগুলো সংশোধন করুন:
                        </p>
                        <ul className="list-inside list-disc space-y-0.5 text-sm">
                            {Object.entries(mergedErrors).map(
                                ([key, message]) => (
                                    <li key={key}>{String(message)}</li>
                                ),
                            )}
                        </ul>
                    </div>
                )}
                {documentManifest.some((file) => file.missing) && (
                    <p
                        role="status"
                        className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm"
                    >
                        আগের ফাইলের কিছু ডকুমেন্ট পাওয়া যায়নি। প্রয়োজনীয়
                        ডকুমেন্ট পুনরায় সংযুক্ত করুন।
                    </p>
                )}
                <div className="grid gap-4 rounded-2xl border bg-white p-5 sm:grid-cols-3">
                    <label className="text-sm">
                        সদস্য শ্রেণি
                        <select
                            value={data.member_category_id || ''}
                            onChange={(e) =>
                                setData(
                                    'member_category_id',
                                    Number(e.target.value) || null,
                                )
                            }
                            className="mt-1 w-full rounded-lg border p-2"
                        >
                            <option value="">নির্বাচন করুন</option>
                            {categories.map((category) => (
                                <option value={category.id} key={category.id}>
                                    {category.category_name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="text-sm">
                        জরিপের তারিখ
                        <input
                            type="date"
                            value={data.survey_date || ''}
                            onChange={(e) =>
                                setData('survey_date', e.target.value)
                            }
                            className="mt-1 w-full rounded-lg border p-2"
                        />
                    </label>
                    <p className="text-sm">
                        শাখা: {admission.branch?.name}
                        <br />
                        সমিতি:{' '}
                        {admission.samity?.samity_name_bn ||
                            admission.samity?.samity_name}
                        <br />
                        ভর্তির তারিখ: {admission.admission_date}
                    </p>
                </div>
                <CyclePersonalInfoSection
                    data={data}
                    setData={setData}
                    errors={mergedErrors}
                    cycleId={cycle.id}
                />
                <AddressSection
                    data={data}
                    setData={setData}
                    errors={mergedErrors}
                    presentDistricts={districts[data.present_division] || []}
                    presentUpazilas={upazilas[data.present_district] || []}
                    permanentDistricts={
                        districts[data.permanent_division] || []
                    }
                    permanentUpazilas={upazilas[data.permanent_district] || []}
                    handlePresentDivisionChange={(value) =>
                        changeAddress('present', 'division', value)
                    }
                    handlePresentDistrictChange={(value) =>
                        changeAddress('present', 'district', value)
                    }
                    handlePermanentDivisionChange={(value) =>
                        changeAddress('permanent', 'division', value)
                    }
                    handlePermanentDistrictChange={(value) =>
                        changeAddress('permanent', 'district', value)
                    }
                    handleSameAddressToggle={(checked) => {
                        form.setData((previous: Record<string, any>) => {
                            const next: Record<string, any> = {
                                ...previous,
                                permanent_address_same: checked,
                            };
                            if (checked)
                                [
                                    'division',
                                    'district',
                                    'upazila',
                                    'union',
                                    'village_road',
                                    'post_code',
                                ].forEach((part) => {
                                    next[`permanent_${part}`] =
                                        previous[`present_${part}`];
                                });
                            return next;
                        });
                    }}
                />
                <CycleIdentitySection
                    data={data}
                    setData={setData}
                    errors={mergedErrors}
                />
                <EconomicPropertySection
                    data={data}
                    setData={setData}
                    errors={mergedErrors}
                    {...numericProps}
                />
                <FamilyMembersSection
                    familyMembers={data.family_members || []}
                    {...numericProps}
                    addFamilyMember={() =>
                        setData('family_members', [
                            ...(data.family_members || []),
                            {
                                member_name: '',
                                relation_with_head: '',
                                gender: 'male',
                            },
                        ])
                    }
                    removeFamilyMember={(index) =>
                        setData(
                            'family_members',
                            data.family_members.filter(
                                (_row: any, i: number) => i !== index,
                            ),
                        )
                    }
                    updateFamilyMember={(index, field, value) =>
                        setData(
                            'family_members',
                            data.family_members.map((row: any, i: number) =>
                                i === index ? { ...row, [field]: value } : row,
                            ),
                        )
                    }
                    patchFamilyMember={(index, patch) =>
                        setData(
                            'family_members',
                            data.family_members.map((row: any, i: number) =>
                                i === index ? { ...row, ...patch } : row,
                            ),
                        )
                    }
                    applicantDefaults={{
                        name: data.applicant_name_bn || data.applicant_name_en,
                        gender: data.gender,
                        marital_status: data.marital_status,
                        monthly_income: data.monthly_income,
                    }}
                />
                <OtherAssetsSection
                    otherAssets={data.other_assets || []}
                    {...numericProps}
                    addOtherAsset={() =>
                        setData('other_assets', [
                            ...(data.other_assets || []),
                            { asset_description: '' },
                        ])
                    }
                    removeOtherAsset={(index) =>
                        setData(
                            'other_assets',
                            data.other_assets.filter(
                                (_row: any, i: number) => i !== index,
                            ),
                        )
                    }
                    updateOtherAsset={(index, field, value) =>
                        setData(
                            'other_assets',
                            data.other_assets.map((row: any, i: number) =>
                                i === index ? { ...row, [field]: value } : row,
                            ),
                        )
                    }
                />
                <FinancialCommentsSection
                    data={data}
                    setData={setData}
                    errors={mergedErrors}
                    {...numericProps}
                />
                {buttons}
            </div>
        </AdminLayout>
    );
}
