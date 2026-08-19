import React, { useState, useEffect, useRef } from 'react';
import FormSection from '@/components/MemberAdmission/FormSection';
import { SmartDateInput } from '@/components/ui/SmartDateInput';
import { Building2, ChevronDown, Search, Lock } from 'lucide-react';
import { toEnglishDigits, formatBranchCode, parseMemberCode } from '@/utils/memberCodeUtils';

interface SamityItem {
    id: number;
    samity_name: string;
    samity_code?: string;
    branch_id: number;
    branch?: { id: number; name: string; code?: string };
}

interface OrganizationSectionProps {
    data: any;
    setData: (field: string, value: any) => void;
    errors: Record<string, string>;
    branches: Array<{ id: number; name: string; code?: string }>;
    hasAllAccess: boolean;
    handleBranchChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    samitySearchQuery: string;
    setSamitySearchQuery: (q: string) => void;
    samityDropdownOpen: boolean;
    setSamityDropdownOpen: (open: boolean) => void;
    filteredSamities: Array<SamityItem>;
    getSamityDisplayCode: (samity: SamityItem) => string;
    selectedSamity?: SamityItem;
    categories: Array<{ id: number; category_name: string }>;
    isLegacyMember: boolean;
}

export default function OrganizationSection({
    data,
    setData,
    errors,
    branches,
    hasAllAccess,
    handleBranchChange,
    samitySearchQuery,
    setSamitySearchQuery,
    samityDropdownOpen,
    setSamityDropdownOpen,
    filteredSamities,
    getSamityDisplayCode,
    selectedSamity,
    categories,
    isLegacyMember,
}: OrganizationSectionProps) {
    const currentBranch = branches.find((b) => Number(b.id) === Number(data.branch_id));
    const branchPrefix = formatBranchCode(currentBranch?.code || (data.branch_id ? String(data.branch_id) : '0001'));

    // Extract initial serial if application_no already has a value
    const getInitialSerial = () => {
        if (!data.application_no) return '';
        const clean = toEnglishDigits(data.application_no).replace(/\D/g, '');
        if (clean.length === 10 && clean.startsWith(branchPrefix)) {
            return clean.slice(4);
        }
        if (clean.startsWith(branchPrefix) && clean.length > 4) {
            return clean.slice(branchPrefix.length);
        }
        return clean;
    };

    const [serialInput, setSerialInput] = useState<string>(getInitialSerial);

    // Sync serial input if branch or application_no changes externally (e.g. initial form fill / branch switch)
    const prevBranchRef = useRef(branchPrefix);
    useEffect(() => {
        if (prevBranchRef.current !== branchPrefix) {
            prevBranchRef.current = branchPrefix;
            if (serialInput) {
                setData('application_no', `${branchPrefix}${serialInput.padStart(6, '0')}`);
            }
        }
    }, [branchPrefix]);

    const handleSerialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const clean = toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 6);
        setSerialInput(clean);
        if (!clean) {
            setData('application_no', '');
        } else {
            setData('application_no', `${branchPrefix}${clean.padStart(6, '0')}`);
        }
    };

    const previewCode = serialInput
        ? `${branchPrefix}${serialInput.padStart(6, '0')}`
        : `${branchPrefix}000001`;

    return (
        <FormSection
            title="১. সংস্থা, শাখা ও সমিতি পরিচিতি"
            icon={<Building2 className="w-4 h-4 text-indigo-600" />}
            subtitle="শাখা, সমিতি, ক্যাটাগরি, জরিপ ও ভর্তির তারিখ নির্বাচন করুন"
        >
            <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            Member Code / মেম্বার কোড (১০ ডিজিট)
                        </label>
                        <div className="flex items-stretch rounded-xl border border-gray-300 overflow-hidden focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 bg-white shadow-2xs">
                            <div
                                className="flex items-center gap-1.5 bg-slate-100 px-3 py-2 border-r border-gray-300 text-xs font-mono font-bold text-slate-700 select-none shrink-0"
                                title="শাখা কোড (অপরিবর্তনীয় ও ফিক্সড)"
                            >
                                <Lock className="w-3.5 h-3.5 text-slate-400" />
                                <span>{branchPrefix}</span>
                            </div>
                            <input
                                type="text"
                                value={serialInput}
                                onChange={handleSerialChange}
                                maxLength={6}
                                placeholder="যেমন: 590 বা 000590"
                                className="w-full border-0 px-3 py-2 text-xs md:text-sm font-mono font-bold text-indigo-700 focus:outline-hidden focus:ring-0"
                            />
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500 flex-wrap gap-1">
                            <span>১০ ডিজিট কোড: <span className="font-mono font-bold text-blue-700">{previewCode}</span></span>
                            <span className="text-[10px] text-slate-400">শাখা কোড {branchPrefix} ফিক্সড, বাকি ৬ ডিজিট মেম্বার কোড</span>
                        </div>
                        {errors.application_no && (
                            <p className="mt-1 text-xs text-red-600 font-medium">{errors.application_no}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            Branch (শাখা) <span className="text-red-500 font-bold">*</span>
                        </label>
                        <select
                            value={data.branch_id}
                            onChange={handleBranchChange}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs md:text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 font-medium"
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
                            <p className="mt-1 text-xs text-red-600 font-medium">{errors.branch_id}</p>
                        )}
                    </div>

                    <div className="relative">
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            ১. Samity (সমিতি) <span className="text-red-500 font-bold">*</span>
                        </label>
                        <div
                            className={`flex w-full items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs md:text-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 ${!data.branch_id ? 'cursor-not-allowed bg-gray-50 opacity-70' : ''}`}
                        >
                            <Search className="h-4 w-4 flex-shrink-0 text-gray-400" />
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
                                className="min-w-0 flex-1 border-0 p-0 text-xs md:text-sm focus:ring-0 focus:outline-none disabled:cursor-not-allowed disabled:bg-transparent font-medium"
                            />
                            <ChevronDown
                                className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${samityDropdownOpen ? 'rotate-180' : ''}`}
                            />
                        </div>
                        {samityDropdownOpen && data.branch_id && (
                            <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
                                {filteredSamities.length === 0 ? (
                                    <li className="px-3 py-2 text-xs text-gray-500">No samity found</li>
                                ) : (
                                    filteredSamities.map((samity) => {
                                        const displayCode = getSamityDisplayCode(samity);
                                        const label = displayCode
                                            ? `${displayCode} - ${samity.samity_name}`
                                            : samity.samity_name;
                                        return (
                                            <li key={samity.id}>
                                                <button
                                                    type="button"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => {
                                                        setData('samity_id', Number(samity.id));
                                                        setSamitySearchQuery(label);
                                                        setSamityDropdownOpen(false);
                                                    }}
                                                    className={`w-full px-3 py-2 text-left text-xs md:text-sm hover:bg-indigo-50 ${Number(data.samity_id) === Number(samity.id) ? 'bg-indigo-50 font-bold text-indigo-700' : 'text-gray-700'}`}
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
                            <p className="mt-1 text-[11px] text-gray-500">
                                Selected: {getSamityDisplayCode(selectedSamity) ? `${getSamityDisplayCode(selectedSamity)} - ${selectedSamity.samity_name}` : selectedSamity.samity_name}
                            </p>
                        )}
                        {errors.samity_id && (
                            <p className="mt-1 text-xs text-red-600 font-medium">{errors.samity_id}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            ২. Member Category (সদস্য শ্রেণি) <span className="text-red-500 font-bold">*</span>
                        </label>
                        <select
                            value={data.member_category_id}
                            onChange={(e) => setData('member_category_id', Number(e.target.value))}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs md:text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium"
                        >
                            <option value={0}>Select Category</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.category_name}
                                </option>
                            ))}
                        </select>
                        {errors.member_category_id && (
                            <p className="mt-1 text-xs text-red-600 font-medium">{errors.member_category_id}</p>
                        )}
                    </div>

                    {isLegacyMember && (
                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                                ঋণের দফা (কত নাম্বার দফায় ডাটা উঠানো) <span className="text-red-500 font-bold">*</span>
                            </label>
                            <input
                                type="number"
                                min={1}
                                value={data.loan_dofa ?? ''}
                                onChange={(e) => setData('loan_dofa', e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="যেমন: ১, ২, ৩..."
                                className="w-full rounded-xl border border-amber-300 bg-amber-50/50 px-3 py-2 text-xs md:text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 font-medium text-amber-900"
                            />
                            <p className="mt-1 text-[11px] text-amber-700 font-medium">
                                আগে কতবার ঋণ নিয়েছিল / এখন কত নাম্বার দফায় এই ডাটা উঠানো হচ্ছে।
                            </p>
                            {errors.loan_dofa && (
                                <p className="mt-1 text-xs text-red-600 font-medium">{errors.loan_dofa}</p>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            জরিপের তারিখ <span className="text-red-500 font-bold">*</span>
                        </label>
                        <SmartDateInput
                            value={data.survey_date}
                            onChange={(val) => setData('survey_date', val)}
                            error={Boolean(errors.survey_date)}
                            className="w-full rounded-xl border border-gray-300 text-xs md:text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium"
                        />
                        {errors.survey_date && (
                            <p className="mt-1 text-xs text-red-600 font-medium">{errors.survey_date}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            ভর্তির তারিখ <span className="text-red-500 font-bold">*</span>
                        </label>
                        <SmartDateInput
                            value={data.admission_date}
                            onChange={(val) => setData('admission_date', val)}
                            error={Boolean(errors.admission_date)}
                            className="w-full rounded-xl border border-gray-300 text-xs md:text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium"
                        />
                        {errors.admission_date && (
                            <p className="mt-1 text-xs text-red-600 font-medium">{errors.admission_date}</p>
                        )}
                    </div>
                </div>
            </div>
        </FormSection>
    );
}
