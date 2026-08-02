import React from 'react';
import FormSection from '@/components/MemberAdmission/FormSection';
import { FamilyMember } from '@/types/memberAdmission';
import { Plus, Trash2, Users } from 'lucide-react';

interface FamilyMembersSectionProps {
    familyMembers: Array<FamilyMember>;
    addFamilyMember: () => void;
    removeFamilyMember: (index: number) => void;
    updateFamilyMember: (index: number, field: keyof FamilyMember, value: any) => void;
    toNumVal: (val: any) => any;
    toNumChange: (val: string) => any;
}

export default function FamilyMembersSection({
    familyMembers,
    addFamilyMember,
    removeFamilyMember,
    updateFamilyMember,
    toNumVal,
    toNumChange,
}: FamilyMembersSectionProps) {
    const inputClass = "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs md:text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all";

    return (
        <FormSection
            title="৫. পরিবারের সদস্য তালিকা (Family Members)"
            icon={<Users className="w-4 h-4 text-blue-600" />}
            subtitle="পরিবারের প্রতিটি সদস্যের নাম, সম্পর্ক, বয়স, পেশা ও আয়ের বিবরণ"
        >
            <div className="flex justify-end mb-3">
                <button
                    type="button"
                    onClick={addFamilyMember}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    <span>Add Member (সদস্য যুক্ত করুন)</span>
                </button>
            </div>

            {familyMembers && familyMembers.length > 0 ? (
                <div className="space-y-4">
                    {familyMembers.map((member, index) => (
                        <div key={index} className="rounded-2xl border border-gray-200/90 bg-gray-50/70 p-3.5 sm:p-4 space-y-3 shadow-sm">
                            <div className="flex items-center justify-between border-b border-gray-200/80 pb-2.5">
                                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg">
                                    সদস্য #{index + 1}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => removeFamilyMember(index)}
                                    className="inline-flex items-center gap-1 text-xs text-red-600 font-bold hover:text-red-800 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span>মুছে ফেলুন</span>
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2 lg:grid-cols-4">
                                <div>
                                    <label className="mb-0.5 block text-xs font-semibold text-gray-700">Name (নাম)</label>
                                    <input
                                        type="text"
                                        value={member.member_name}
                                        onChange={(e) => updateFamilyMember(index, 'member_name', e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className="mb-0.5 block text-xs font-semibold text-gray-700">Relationship (সম্পর্ক)</label>
                                    <select
                                        value={member.relation_with_head}
                                        onChange={(e) => updateFamilyMember(index, 'relation_with_head', e.target.value)}
                                        className={inputClass}
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
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-0.5 block text-xs font-semibold text-gray-700">Gender (লিঙ্গ)</label>
                                    <select
                                        value={member.gender}
                                        onChange={(e) => updateFamilyMember(index, 'gender', e.target.value)}
                                        className={inputClass}
                                    >
                                        <option value="male">পুরুষ (Male)</option>
                                        <option value="female">নারী (Female)</option>
                                        <option value="other">অন্যান্য (Other)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-0.5 block text-xs font-semibold text-gray-700">Age - Years (বয়স - বছর)</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={toNumVal(member.age_years)}
                                        onChange={(e) => updateFamilyMember(index, 'age_years', toNumChange(e.target.value))}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className="mb-0.5 block text-xs font-semibold text-gray-700">Age - Months (বয়স - মাস)</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={toNumVal(member.age_months)}
                                        onChange={(e) => updateFamilyMember(index, 'age_months', toNumChange(e.target.value))}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className="mb-0.5 block text-xs font-semibold text-gray-700">Marital Status (বৈবাহিক অবস্থা)</label>
                                    <select
                                        value={member.marital_status || ''}
                                        onChange={(e) => updateFamilyMember(index, 'marital_status', e.target.value)}
                                        className={inputClass}
                                    >
                                        <option value="">বৈবাহিক অবস্থা নির্বাচন করুন</option>
                                        <option value="single">অবিবাহিত (Single)</option>
                                        <option value="married">বিবাহিত (Married)</option>
                                        <option value="widowed">বিধবা/বিপত্নীক (Widowed)</option>
                                        <option value="divorced">ডিভোর্সড (Divorced)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-0.5 block text-xs font-semibold text-gray-700">Education Level (শিক্ষাগত যোগ্যতা)</label>
                                    <select
                                        value={member.education_level}
                                        onChange={(e) => updateFamilyMember(index, 'education_level', e.target.value)}
                                        className={inputClass}
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
                                    <label className="mb-0.5 block text-xs font-semibold text-gray-700">Occupation (পেশা)</label>
                                    <input
                                        type="text"
                                        value={member.occupation}
                                        onChange={(e) => updateFamilyMember(index, 'occupation', e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className="mb-0.5 block text-xs font-semibold text-gray-700">Monthly Income (মাসিক আয়)</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={toNumVal(member.monthly_income)}
                                        onChange={(e) => updateFamilyMember(index, 'monthly_income', toNumChange(e.target.value))}
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-8 text-center text-xs md:text-sm text-gray-500 font-medium bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                    কোনো পরিবারের সদস্য যুক্ত করা হয়নি।
                </div>
            )}
        </FormSection>
    );
}
