import React from 'react';
import FormSection from '@/components/MemberAdmission/FormSection';
import { OtherAsset } from '@/types/memberAdmission';
import { Calculator, Plus, Trash2 } from 'lucide-react';

interface OtherAssetsSectionProps {
    otherAssets: Array<OtherAsset>;
    addOtherAsset: () => void;
    removeOtherAsset: (index: number) => void;
    updateOtherAsset: (index: number, field: keyof OtherAsset, value: any) => void;
    toNumVal: (val: any) => any;
    toNumChange: (val: string) => any;
}

export default function OtherAssetsSection({
    otherAssets,
    addOtherAsset,
    removeOtherAsset,
    updateOtherAsset,
    toNumVal,
    toNumChange,
}: OtherAssetsSectionProps) {
    const inputClass = "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs md:text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all";

    return (
        <FormSection
            title="১৯. (iv) অস্থায়ী সম্পদের তথ্য"
            icon={<Calculator className="w-4 h-4 text-amber-600" />}
            subtitle="অন্যান্য অস্থায়ী সম্পদ ও আনুমানিক মূল্য বিবরণী"
        >
            <div className="flex justify-end mb-3">
                <button
                    type="button"
                    onClick={addOtherAsset}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    <span>Add Asset (সম্পদ যুক্ত করুন)</span>
                </button>
            </div>

            {otherAssets && otherAssets.length > 0 ? (
                <div className="space-y-4">
                    {otherAssets.map((asset, index) => (
                        <div key={index} className="rounded-2xl border border-gray-200/90 bg-gray-50/70 p-3.5 sm:p-4 space-y-3 shadow-sm">
                            <div className="flex items-center justify-between border-b border-gray-200/80 pb-2.5">
                                <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg">
                                    সম্পদ #{index + 1}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => removeOtherAsset(index)}
                                    className="inline-flex items-center gap-1 text-xs text-red-600 font-bold hover:text-red-800 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span>মুছে ফেলুন</span>
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-3">
                                <div>
                                    <label className="mb-0.5 block text-xs font-semibold text-gray-700">অস্থায়ী সম্পদের বিবরণ</label>
                                    <input
                                        type="text"
                                        value={asset.asset_description}
                                        onChange={(e) => updateOtherAsset(index, 'asset_description', e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className="mb-0.5 block text-xs font-semibold text-gray-700">সংখ্যা/পরিমাণ</label>
                                    <input
                                        type="text"
                                        value={asset.quantity_amount}
                                        onChange={(e) => updateOtherAsset(index, 'quantity_amount', e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className="mb-0.5 block text-xs font-semibold text-gray-700">সম্ভাব্য মূল্য</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={toNumVal(asset.estimated_value)}
                                        onChange={(e) => updateOtherAsset(index, 'estimated_value', toNumChange(e.target.value))}
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-8 text-center text-xs md:text-sm text-gray-500 font-medium bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                    কোনো অতিরিক্ত সম্পদ যুক্ত করা হয়নি।
                </div>
            )}
        </FormSection>
    );
}
