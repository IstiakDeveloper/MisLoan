import React, { useState } from 'react';
import FormSection from '@/components/MemberAdmission/FormSection';
import { Briefcase } from 'lucide-react';

const HOUSE_TYPE_OPTIONS = [
    'ছনের ঘর/মাটির ঘর',
    'টিন/টালী',
    'পাকা',
    'আধা পাকা',
    'মিশ্র',
] as const;

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
    const inputClass =
        'w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs md:text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all';

    const totalLandAcres = (
        Number(data.cultivable_land_amount || 0) + Number(data.non_cultivable_land_amount || 0)
    ).toFixed(2);

    const houseType = data.house_type || '';
    const isCustomHouseType =
        houseType !== '' && !(HOUSE_TYPE_OPTIONS as readonly string[]).includes(houseType);
    const [forceCustomHouseType, setForceCustomHouseType] = useState(false);
    const showCustomHouseType = forceCustomHouseType || isCustomHouseType;

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
                        <select
                            value={showCustomHouseType ? '__other__' : houseType}
                            onChange={(e) => {
                                const v = e.target.value;
                                if (v === '__other__') {
                                    setForceCustomHouseType(true);
                                    if ((HOUSE_TYPE_OPTIONS as readonly string[]).includes(houseType)) {
                                        setData('house_type', '');
                                    }
                                    return;
                                }
                                setForceCustomHouseType(false);
                                setData('house_type', v);
                            }}
                            className={inputClass}
                        >
                            <option value="">বাড়ীর ধরণ নির্বাচন করুন</option>
                            <option value="ছনের ঘর/মাটির ঘর">ছনের ঘর / মাটির ঘর</option>
                            <option value="টিন/টালী">টিন / টালী</option>
                            <option value="পাকা">পাকা</option>
                            <option value="আধা পাকা">আধা পাকা</option>
                            <option value="মিশ্র">মিশ্র (একাধিক ধরনের)</option>
                            <option value="__other__">অন্যান্য (লিখে দিন)</option>
                        </select>
                        {showCustomHouseType && (
                            <input
                                type="text"
                                value={houseType}
                                onChange={(e) => setData('house_type', e.target.value)}
                                className={`${inputClass} mt-1.5`}
                                placeholder="বাড়ীর ধরণ লিখুন"
                            />
                        )}
                    </div>
                </div>

                <div>
                    <h4 className="text-xs font-bold text-gray-800 mb-2">
                        ১৯. গ্রাহকের স্থায়ী সম্পদের বিবরণ — (i) মোট ঘরের সংখ্যা
                    </h4>
                    <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                                ক) ছনের ঘর / মাটির ঘর
                            </label>
                            <input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={toNumVal(data.mud_house_count)}
                                onChange={(e) => setData('mud_house_count', toNumChange(e.target.value))}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">খ) টিন / টালী</label>
                            <input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={toNumVal(data.tin_house_count)}
                                onChange={(e) => setData('tin_house_count', toNumChange(e.target.value))}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">গ) পাকা</label>
                            <input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={toNumVal(data.brick_house_count)}
                                onChange={(e) => setData('brick_house_count', toNumChange(e.target.value))}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">ঘ) আধা পাকা</label>
                            <input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={toNumVal(data.semi_brick_house_count)}
                                onChange={(e) =>
                                    setData('semi_brick_house_count', toNumChange(e.target.value))
                                }
                                className={inputClass}
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <h4 className="text-xs font-bold text-gray-800 mb-2">
                        ১৯. (ii) গবাদি পশু-পাখির তথ্য (সংখ্যায়)
                    </h4>
                    <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">ক) গরু / মহিষ</label>
                            <input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={toNumVal(data.cow_buffalo_count)}
                                onChange={(e) => setData('cow_buffalo_count', toNumChange(e.target.value))}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">খ) ছাগল / ভেড়া</label>
                            <input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={toNumVal(data.goat_sheep_count)}
                                onChange={(e) => setData('goat_sheep_count', toNumChange(e.target.value))}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">গ) হাঁস / মুরগী</label>
                            <input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={toNumVal(data.duck_chicken_count)}
                                onChange={(e) => setData('duck_chicken_count', toNumChange(e.target.value))}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                                ঘ) অন্যান্য গবাদিপশু (সংখ্যা)
                            </label>
                            <input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={toNumVal(data.other_livestock_count)}
                                onChange={(e) =>
                                    setData('other_livestock_count', toNumChange(e.target.value))
                                }
                                className={inputClass}
                            />
                        </div>
                        {Number(data.other_livestock_count) > 0 && (
                            <div className="md:col-span-2 lg:col-span-4">
                                <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                                    অন্যান্য গবাদিপশু বিবরণ
                                </label>
                                <input
                                    type="text"
                                    value={data.other_livestock || ''}
                                    onChange={(e) => setData('other_livestock', e.target.value)}
                                    className={inputClass}
                                    placeholder="যেমন: কবুতর ইত্যাদি"
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <h4 className="text-xs font-bold text-gray-800 mb-2">
                        ১৯. (iii) জমির পরিমাণ ও মূল্য / Land Information
                    </h4>
                    <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                                মোট জমির পরিমাণ (শতক)
                            </label>
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
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                                Cultivable Land - Acres (আবাদযোগ্য জমি - শতক)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="0"
                                value={toNumVal(data.cultivable_land_amount)}
                                onChange={(e) =>
                                    setData('cultivable_land_amount', toNumChange(e.target.value))
                                }
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                                Cultivable Land Value (আবাদযোগ্য জমির মূল্য)
                            </label>
                            <input
                                type="number"
                                placeholder="0"
                                value={toNumVal(data.cultivable_land_value)}
                                onChange={(e) =>
                                    setData('cultivable_land_value', toNumChange(e.target.value))
                                }
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                                Non-Cultivable Land - Acres (অনাবাদি জমি - শতক)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="0"
                                value={toNumVal(data.non_cultivable_land_amount)}
                                onChange={(e) =>
                                    setData('non_cultivable_land_amount', toNumChange(e.target.value))
                                }
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className="mb-0.5 block text-xs font-semibold text-gray-700">
                                Non-Cultivable Land Value (অনাবাদি জমির মূল্য)
                            </label>
                            <input
                                type="number"
                                placeholder="0"
                                value={toNumVal(data.non_cultivable_land_value)}
                                onChange={(e) =>
                                    setData('non_cultivable_land_value', toNumChange(e.target.value))
                                }
                                className={inputClass}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </FormSection>
    );
}
