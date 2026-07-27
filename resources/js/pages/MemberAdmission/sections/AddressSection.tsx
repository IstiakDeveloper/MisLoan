import React from 'react';
import FormSection from '@/components/MemberAdmission/FormSection';
import bangladeshData from '@/data/bangladeshAddresses.json';
import { Home } from 'lucide-react';

interface AddressSectionProps {
    data: any;
    setData: (field: string, value: any) => void;
    errors: Record<string, string>;
    presentDistricts: string[];
    presentUpazilas: string[];
    permanentDistricts: string[];
    permanentUpazilas: string[];
    handlePresentDivisionChange: (division: string) => void;
    handlePresentDistrictChange: (district: string) => void;
    handlePermanentDivisionChange: (division: string) => void;
    handlePermanentDistrictChange: (district: string) => void;
    handleSameAddressToggle: (checked: boolean) => void;
}

export default function AddressSection({
    data,
    setData,
    errors,
    presentDistricts,
    presentUpazilas,
    permanentDistricts,
    permanentUpazilas,
    handlePresentDivisionChange,
    handlePresentDistrictChange,
    handlePermanentDivisionChange,
    handlePermanentDistrictChange,
    handleSameAddressToggle,
}: AddressSectionProps) {
    const inputClass = (hasErr?: boolean) =>
        `w-full rounded-xl border ${hasErr ? 'border-red-500 bg-red-50/50 ring-2 ring-red-200' : 'border-gray-300 bg-white'} px-3 py-2 text-xs md:text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all`;

    return (
        <FormSection
            title="৩. ঠিকানা বিবরণী (বর্তমান ও স্থায়ী)"
            icon={<Home className="w-4 h-4 text-teal-600" />}
            subtitle="বিভাগ, জেলা, উপজেলা, ইউনিয়ন, ওয়ার্ড/গ্রাম ও পোস্ট কোড"
        >
            <div className="space-y-4">
                <div>
                    <h4 className="text-xs font-bold text-gray-800 mb-2">১০. Present Address (বর্তমান ঠিকানা)</h4>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                                Division (বিভাগ) <span className="text-red-500 font-bold">*</span>
                            </label>
                            <select
                                value={data.present_division}
                                onChange={(e) => handlePresentDivisionChange(e.target.value)}
                                className={inputClass(Boolean(errors.present_division))}
                            >
                                <option value="">Select Division</option>
                                {bangladeshData.divisions.map((division) => (
                                    <option key={division} value={division}>
                                        {division}
                                    </option>
                                ))}
                            </select>
                            {errors.present_division && (
                                <p className="mt-1 text-xs text-red-600 font-medium">{errors.present_division}</p>
                            )}
                        </div>

                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                                District (জেলা) <span className="text-red-500 font-bold">*</span>
                            </label>
                            <select
                                value={data.present_district}
                                onChange={(e) => handlePresentDistrictChange(e.target.value)}
                                disabled={!data.present_division}
                                className={inputClass(Boolean(errors.present_district))}
                            >
                                <option value="">Select District</option>
                                {presentDistricts.map((district) => (
                                    <option key={district} value={district}>
                                        {district}
                                    </option>
                                ))}
                            </select>
                            {errors.present_district && (
                                <p className="mt-1 text-xs text-red-600 font-medium">{errors.present_district}</p>
                            )}
                        </div>

                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                                Upazila (উপজেলা) <span className="text-red-500 font-bold">*</span>
                            </label>
                            <select
                                value={data.present_upazila}
                                onChange={(e) => setData('present_upazila', e.target.value)}
                                disabled={!data.present_district}
                                className={inputClass(Boolean(errors.present_upazila))}
                            >
                                <option value="">Select Upazila</option>
                                {presentUpazilas.map((upazila) => (
                                    <option key={upazila} value={upazila}>
                                        {upazila}
                                    </option>
                                ))}
                            </select>
                            {errors.present_upazila && (
                                <p className="mt-1 text-xs text-red-600 font-medium">{errors.present_upazila}</p>
                            )}
                        </div>

                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">Union (ইউনিয়ন)</label>
                            <input
                                type="text"
                                value={data.present_union}
                                onChange={(e) => setData('present_union', e.target.value)}
                                className={inputClass()}
                            />
                        </div>

                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">Village/Road (গ্রাম/রাস্তা/পাড়া)</label>
                            <input
                                type="text"
                                value={data.present_village_road}
                                onChange={(e) => setData('present_village_road', e.target.value)}
                                className={inputClass()}
                            />
                        </div>

                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">Post Code (পোস্ট কোড)</label>
                            <input
                                type="text"
                                value={data.present_post_code}
                                onChange={(e) => setData('present_post_code', e.target.value)}
                                className={inputClass()}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-teal-50/60 rounded-xl border border-teal-100">
                    <input
                        type="checkbox"
                        id="same_address"
                        checked={data.permanent_address_same}
                        onChange={(e) => handleSameAddressToggle(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    <label htmlFor="same_address" className="text-xs md:text-sm font-bold text-teal-900 select-none cursor-pointer">
                        Permanent address same as present address (স্থায়ী ঠিকানা বর্তমান ঠিকানার মতো)
                    </label>
                </div>

                {!data.permanent_address_same && (
                    <div>
                        <h4 className="text-xs font-bold text-gray-800 mb-2">১১. Permanent Address (স্থায়ী ঠিকানা)</h4>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
                            <div>
                                <label className="mb-0.5 block text-xs font-semibold text-gray-700">Division (বিভাগ)</label>
                                <select
                                    value={data.permanent_division}
                                    onChange={(e) => handlePermanentDivisionChange(e.target.value)}
                                    className={inputClass()}
                                >
                                    <option value="">Select Division</option>
                                    {bangladeshData.divisions.map((division) => (
                                        <option key={division} value={division}>
                                            {division}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-0.5 block text-xs font-semibold text-gray-700">District (জেলা)</label>
                                <select
                                    value={data.permanent_district}
                                    onChange={(e) => handlePermanentDistrictChange(e.target.value)}
                                    disabled={!data.permanent_division}
                                    className={inputClass()}
                                >
                                    <option value="">Select District</option>
                                    {permanentDistricts.map((district) => (
                                        <option key={district} value={district}>
                                            {district}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-0.5 block text-xs font-semibold text-gray-700">Upazila (উপজেলা)</label>
                                <select
                                    value={data.permanent_upazila}
                                    onChange={(e) => setData('permanent_upazila', e.target.value)}
                                    disabled={!data.permanent_district}
                                    className={inputClass()}
                                >
                                    <option value="">Select Upazila</option>
                                    {permanentUpazilas.map((upazila) => (
                                        <option key={upazila} value={upazila}>
                                            {upazila}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-0.5 block text-xs font-semibold text-gray-700">Union (ইউনিয়ন)</label>
                                <input
                                    type="text"
                                    value={data.permanent_union}
                                    onChange={(e) => setData('permanent_union', e.target.value)}
                                    className={inputClass()}
                                />
                            </div>

                            <div>
                                <label className="mb-0.5 block text-xs font-semibold text-gray-700">Village/Road (গ্রাম/রাস্তা/পাড়া)</label>
                                <input
                                    type="text"
                                    value={data.permanent_village_road}
                                    onChange={(e) => setData('permanent_village_road', e.target.value)}
                                    className={inputClass()}
                                />
                            </div>

                            <div>
                                <label className="mb-0.5 block text-xs font-semibold text-gray-700">Post Code (পোস্ট কোড)</label>
                                <input
                                    type="text"
                                    value={data.permanent_post_code}
                                    onChange={(e) => setData('permanent_post_code', e.target.value)}
                                    className={inputClass()}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </FormSection>
    );
}
