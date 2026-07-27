import React from 'react';
import FormSection from '@/components/MemberAdmission/FormSection';
import { Briefcase } from 'lucide-react';

interface EconomicPropertySectionProps {
    data: any;
    setData: (field: string, value: any) => void;
    toNumVal: (val: any) => any;
    toNumChange: (val: string) => any;
}

export default function EconomicPropertySection({
    data,
    setData,
    toNumVal,
    toNumChange,
}: EconomicPropertySectionProps) {
    const inputClass = "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs md:text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all";

    const totalLandAcres = (
        Number(data.cultivable_land_amount || 0) + Number(data.non_cultivable_land_amount || 0)
    ).toFixed(2);

    return (
        <FormSection
            title="৬. অর্থনৈতিক তথ্য, গবাদিপশু ও জমিজমা"
            icon={<Briefcase className="w-4 h-4 text-emerald-600" />}
            subtitle="মোট সম্পদ, ঘরের বিবরণ, গবাদিপশু, চাষি জমি ও আয়-ব্যয়ের হিসাব"
        >
            <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            ১৭. মোট সম্পদের পরিমাণ (Total Asset Value)
                        </label>
                        <input
                            type="number"
                            placeholder="0"
                            value={toNumVal(data.total_asset_value)}
                            onChange={(e) => setData('total_asset_value', toNumChange(e.target.value))}
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                            ১৮. বাড়ীর ধরণ (House Type)
                        </label>
                        <input
                            type="text"
                            value={data.house_type}
                            onChange={(e) => setData('house_type', e.target.value)}
                            className={inputClass}
                        />
                    </div>
                </div>

                <div>
                    <h4 className="text-xs font-bold text-gray-800 mb-2">১৯. (i) মোট ঘরের সংখ্যা / House Property</h4>
                    <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">Mud House (মাটির ঘর)</label>
                            <select
                                value={data.mud_house_count}
                                onChange={(e) => setData('mud_house_count', Number(e.target.value))}
                                className={inputClass}
                            >
                                {[0, 1, 2, 3, 4, 5].map((num) => (
                                    <option key={num} value={num}>
                                        {num}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">Tin House (টিনের ঘর)</label>
                            <select
                                value={data.tin_house_count}
                                onChange={(e) => setData('tin_house_count', Number(e.target.value))}
                                className={inputClass}
                            >
                                {[0, 1, 2, 3, 4, 5].map((num) => (
                                    <option key={num} value={num}>
                                        {num}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">Brick House (পাকা ঘর)</label>
                            <select
                                value={data.brick_house_count}
                                onChange={(e) => setData('brick_house_count', Number(e.target.value))}
                                className={inputClass}
                            >
                                {[0, 1, 2, 3, 4, 5].map((num) => (
                                    <option key={num} value={num}>
                                        {num}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">Semi-Brick House (আধাপাকা ঘর)</label>
                            <select
                                value={data.semi_brick_house_count}
                                onChange={(e) => setData('semi_brick_house_count', Number(e.target.value))}
                                className={inputClass}
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

                <div>
                    <h4 className="text-xs font-bold text-gray-800 mb-2">১৯. (ii) গবাদি পশুর বিবরণ / Livestock</h4>
                    <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">Cow / Buffalo (গরু/মহিষ)</label>
                            <select
                                value={data.cow_buffalo_count}
                                onChange={(e) => setData('cow_buffalo_count', Number(e.target.value))}
                                className={inputClass}
                            >
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                    <option key={num} value={num}>
                                        {num}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">Goat / Sheep (ছাগল/ভেড়া)</label>
                            <select
                                value={data.goat_sheep_count}
                                onChange={(e) => setData('goat_sheep_count', Number(e.target.value))}
                                className={inputClass}
                            >
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                    <option key={num} value={num}>
                                        {num}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">Duck / Chicken (হাঁস/মুরগী)</label>
                            <select
                                value={data.duck_chicken_count}
                                onChange={(e) => setData('duck_chicken_count', Number(e.target.value))}
                                className={inputClass}
                            >
                                {[0, 5, 10, 15, 20, 25, 30, 40, 50, 100].map((num) => (
                                    <option key={num} value={num}>
                                        {num}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">Other Livestock Count (অন্যান্য গবাদিপশু)</label>
                            <select
                                value={data.other_livestock_count}
                                onChange={(e) => setData('other_livestock_count', Number(e.target.value))}
                                className={inputClass}
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
                                <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                                    Other Livestock Description (অন্যান্য গবাদিপশু বিবরণ)
                                </label>
                                <input
                                    type="text"
                                    value={data.other_livestock}
                                    onChange={(e) => setData('other_livestock', e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <h4 className="text-xs font-bold text-gray-800 mb-2">১৯. (iii) জমির পরিমাণ ও মূল্য / Land Information</h4>
                    <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">মোট জমির পরিমাণ (শতক)</label>
                            <input
                                type="text"
                                value={totalLandAcres}
                                readOnly
                                className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-xs md:text-sm text-gray-700 font-bold"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">Cultivable Land - Acres (আবাদযোগ্য জমি - শতক)</label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="0"
                                value={toNumVal(data.cultivable_land_amount)}
                                onChange={(e) => setData('cultivable_land_amount', toNumChange(e.target.value))}
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">Cultivable Land Value (আবাদযোগ্য জমির মূল্য)</label>
                            <input
                                type="number"
                                placeholder="0"
                                value={toNumVal(data.cultivable_land_value)}
                                onChange={(e) => setData('cultivable_land_value', toNumChange(e.target.value))}
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">Non-Cultivable Land - Acres (অনাবাদি জমি - শতক)</label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="0"
                                value={toNumVal(data.non_cultivable_land_amount)}
                                onChange={(e) => setData('non_cultivable_land_amount', toNumChange(e.target.value))}
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">Non-Cultivable Land Value (অনাবাদি জমির মূল্য)</label>
                            <input
                                type="number"
                                placeholder="0"
                                value={toNumVal(data.non_cultivable_land_value)}
                                onChange={(e) => setData('non_cultivable_land_value', toNumChange(e.target.value))}
                                className={inputClass}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </FormSection>
    );
}
