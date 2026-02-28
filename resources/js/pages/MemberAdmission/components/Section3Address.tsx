import React from 'react';
import type { MemberAdmissionFormData } from '@/types/memberAdmission';
import bangladeshData from '@/data/bangladeshAddresses.json';

interface Props {
    data: MemberAdmissionFormData;
    setData: (key: keyof MemberAdmissionFormData, value: any) => void;
    errors: Record<string, string>;
    presentDistricts: string[];
    presentUpazilas: string[];
    permanentDistricts: string[];
    permanentUpazilas: string[];
}

export default function Section3Address({
    data,
    setData,
    errors,
    presentDistricts,
    presentUpazilas,
    permanentDistricts,
    permanentUpazilas,
}: Props) {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">১০. Present Address (বর্তমান ঠিকানা)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Division (বিভাগ) <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={data.present_division ?? ''}
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
                            value={data.present_district ?? ''}
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
                            value={data.present_upazila ?? ''}
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
                            value={data.present_union ?? ''}
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
                            value={data.present_village_road ?? ''}
                            onChange={(e) => setData('present_village_road', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Post Code (পোস্ট কোড)</label>
                        <input
                            type="text"
                            value={data.present_post_code ?? ''}
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
                                value={data.permanent_division ?? ''}
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
                                value={data.permanent_district ?? ''}
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
                                value={data.permanent_upazila ?? ''}
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
                                value={data.permanent_union ?? ''}
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
                                value={data.permanent_village_road ?? ''}
                                onChange={(e) => setData('permanent_village_road', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Post Code (পোস্ট কোড)</label>
                            <input
                                type="text"
                                value={data.permanent_post_code ?? ''}
                                onChange={(e) => setData('permanent_post_code', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
