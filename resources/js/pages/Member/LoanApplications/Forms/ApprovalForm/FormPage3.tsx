import React from 'react';
import { FormPageProps } from './Types';

export default function FormPage3({ data, setData }: FormPageProps) {
    return (
        <div id="form-page-3" data-sync="page-3" className="border-b pb-4">
            <h3 className="font-bold mb-4 bg-gray-200 px-3 py-1 inline-block rounded">পৃষ্ঠা ৩: আয়-ব্যয় হিসাব ও অন্যান্য</h3>

            <div className="mb-4">
                <h4 className="font-semibold border-b border-gray-400 pb-1 mb-3">০৪. উদ্যোগের ১/১.৫/২ বছর এর সম্ভাব্য আয়-ব্যয় হিসাব:</h4>
                <div className="grid grid-cols-2 gap-4 border p-2 rounded bg-gray-50">
                    <div className="space-y-2">
                        <div className="font-bold border-b border-gray-300 pb-1 mb-2">ব্যয়</div>
                        <div className="flex justify-between items-center gap-2">
                            <span className="text-[12px] w-1/2">কর্মচারীর বেতন</span>
                            <input type="number" placeholder="টাকা" value={data.est_emp_salary || ''} onChange={(e) => setData('est_emp_salary', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[12px]" />
                        </div>
                        <div className="flex justify-between items-center gap-2">
                            <span className="text-[12px] w-1/2">যাতায়াত/পরিবহন</span>
                            <input type="number" placeholder="টাকা" value={data.est_transport || ''} onChange={(e) => setData('est_transport', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[12px]" />
                        </div>
                        <div className="flex justify-between items-center gap-2">
                            <span className="text-[12px] w-1/2">বিদ্যুৎ/গ্যাস/পানি/টেলিফোন</span>
                            <input type="number" placeholder="টাকা" value={data.est_bills || ''} onChange={(e) => setData('est_bills', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[12px]" />
                        </div>
                        <div className="flex justify-between items-center gap-2">
                            <span className="text-[12px] w-1/2">দোকান ভাড়া</span>
                            <input type="number" placeholder="টাকা" value={data.est_rent || ''} onChange={(e) => setData('est_rent', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[12px]" />
                        </div>
                        <div className="flex justify-between items-center gap-2">
                            <span className="text-[12px] w-1/2">ঋণের সার্ভিস চার্জ</span>
                            <input type="number" placeholder="টাকা" value={data.est_loan_charge || ''} onChange={(e) => setData('est_loan_charge', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[12px]" />
                        </div>
                        <div className="flex justify-between items-center gap-2">
                            <input type="text" placeholder="অন্যান্য খাত ১" value={data.est_other_exp_1_desc || ''} onChange={(e) => setData('est_other_exp_1_desc', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[12px]" />
                            <input type="number" placeholder="টাকা" value={data.est_other_exp_1_amount || ''} onChange={(e) => setData('est_other_exp_1_amount', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[12px]" />
                        </div>
                        <div className="flex justify-between items-center gap-2">
                            <input type="text" placeholder="অন্যান্য খাত ২" value={data.est_other_exp_2_desc || ''} onChange={(e) => setData('est_other_exp_2_desc', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[12px]" />
                            <input type="number" placeholder="টাকা" value={data.est_other_exp_2_amount || ''} onChange={(e) => setData('est_other_exp_2_amount', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[12px]" />
                        </div>
                        <div className="flex justify-between items-center gap-2">
                            <input type="text" placeholder="অন্যান্য খাত ৩" value={data.est_other_exp_3_desc || ''} onChange={(e) => setData('est_other_exp_3_desc', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[12px]" />
                            <input type="number" placeholder="টাকা" value={data.est_other_exp_3_amount || ''} onChange={(e) => setData('est_other_exp_3_amount', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[12px]" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="font-bold border-b border-gray-300 pb-1 mb-2">আয়</div>
                        <div className="flex justify-between items-center gap-2">
                            <input type="text" placeholder="প্রধান আয়ের খাত" value={data.est_main_income_desc || ''} onChange={(e) => setData('est_main_income_desc', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[12px]" />
                            <input type="number" placeholder="টাকা" value={data.est_main_income_amount || ''} onChange={(e) => setData('est_main_income_amount', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[12px]" />
                        </div>
                        <div className="flex justify-between items-center gap-2">
                            <input type="text" placeholder="অন্যান্য আয়" value={data.est_other_income_desc || ''} onChange={(e) => setData('est_other_income_desc', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[12px]" />
                            <input type="number" placeholder="টাকা" value={data.est_other_income_amount || ''} onChange={(e) => setData('est_other_income_amount', e.target.value)} className="w-1/2 border rounded px-2 py-1 text-[12px]" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-4">
                <h4 className="font-semibold border-b border-gray-400 pb-1 mb-3">গ. অন্যান্য তথ্যাবলী:</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-[12px] font-medium mb-1">০১. (ক) ঋণের মেয়াদ (মাস)</label>
                        <input type="number" value={data.loan_duration_months || ''} onChange={(e) => setData('loan_duration_months', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                    </div>
                    <div>
                        <label className="block text-[12px] font-medium mb-1">(খ) সার্ভিস চার্জের হার (%)</label>
                        <input type="number" value={data.applied_service_charge_rate || ''} onChange={(e) => setData('applied_service_charge_rate', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                    </div>
                </div>

                <div className="border p-2 rounded bg-gray-50 mb-4">
                    <label className="block text-[12px] font-medium mb-2">(গ) ঋণ পরিশোধের তফসিল:</label>
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="block text-[11px] mb-1">কিস্তির ধরণ</label>
                            <input type="text" value={data.installment_type || 'মাসিক কিস্তি'} onChange={(e) => setData('installment_type', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                        </div>
                        <div>
                            <label className="block text-[11px] mb-1">আসল (টাকা)</label>
                            <input type="number" value={data.installment_principal || ''} onChange={(e) => setData('installment_principal', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                        </div>
                        <div>
                            <label className="block text-[11px] mb-1">সার্ভিস চার্জ (টাকা)</label>
                            <input type="number" value={data.installment_service_charge || ''} onChange={(e) => setData('installment_service_charge', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                        </div>
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-[12px] font-medium mb-2">০২. জামিনদারের তথ্য</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border p-2 rounded bg-gray-50 space-y-2">
                            <h5 className="font-bold text-[11px] mb-2">(ক) ১ম জামিনদার</h5>
                            <input type="text" placeholder="জামিনদারের নাম" value={data.guarantor_1_name || ''} onChange={e => setData('guarantor_1_name', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                            <input type="text" placeholder="ঠিকানা" value={data.guarantor_1_address || ''} onChange={e => setData('guarantor_1_address', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                            <input type="text" placeholder="মোবাইল নম্বর" value={data.guarantor_1_mobile || ''} onChange={e => setData('guarantor_1_mobile', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                            <div className="flex gap-2">
                                <input type="text" placeholder="সম্পর্ক" value={data.guarantor_1_relation || ''} onChange={e => setData('guarantor_1_relation', e.target.value)} className="w-1/2 border rounded px-2 py-1.5 text-[12px]" />
                                <input type="text" placeholder="পেশা" value={data.guarantor_1_profession || ''} onChange={e => setData('guarantor_1_profession', e.target.value)} className="w-1/2 border rounded px-2 py-1.5 text-[12px]" />
                            </div>
                            <div className="flex gap-2">
                                <input type="text" placeholder="মাসিক আয়" value={data.guarantor_1_monthly_income || ''} onChange={e => setData('guarantor_1_monthly_income', e.target.value)} className="w-1/2 border rounded px-2 py-1.5 text-[12px]" />
                                <input type="text" placeholder="সম্পদের পরিমাণ" value={data.guarantor_1_assets_amount || ''} onChange={e => setData('guarantor_1_assets_amount', e.target.value)} className="w-1/2 border rounded px-2 py-1.5 text-[12px]" />
                            </div>
                            <input type="text" placeholder="সম্ভাব্য মূল্য" value={data.guarantor_1_potential_value || ''} onChange={e => setData('guarantor_1_potential_value', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                            <div className="flex gap-2">
                                <input type="text" placeholder="সাক্ষাৎকারীর নাম" value={data.guarantor_1_interviewer_name || ''} onChange={e => setData('guarantor_1_interviewer_name', e.target.value)} className="w-1/2 border rounded px-2 py-1.5 text-[12px]" />
                                <input type="text" placeholder="পদবী" value={data.guarantor_1_interviewer_designation || ''} onChange={e => setData('guarantor_1_interviewer_designation', e.target.value)} className="w-1/2 border rounded px-2 py-1.5 text-[12px]" />
                            </div>
                        </div>
                        <div className="border p-2 rounded bg-gray-50 space-y-2">
                            <h5 className="font-bold text-[11px] mb-2">(খ) ২য় জামিনদার</h5>
                            <input type="text" placeholder="জামিনদারের নাম" value={data.guarantor_2_name || ''} onChange={e => setData('guarantor_2_name', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                            <input type="text" placeholder="ঠিকানা" value={data.guarantor_2_address || ''} onChange={e => setData('guarantor_2_address', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                            <input type="text" placeholder="মোবাইল নম্বর" value={data.guarantor_2_mobile || ''} onChange={e => setData('guarantor_2_mobile', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                            <div className="flex gap-2">
                                <input type="text" placeholder="সম্পর্ক" value={data.guarantor_2_relation || ''} onChange={e => setData('guarantor_2_relation', e.target.value)} className="w-1/2 border rounded px-2 py-1.5 text-[12px]" />
                                <input type="text" placeholder="পেশা" value={data.guarantor_2_profession || ''} onChange={e => setData('guarantor_2_profession', e.target.value)} className="w-1/2 border rounded px-2 py-1.5 text-[12px]" />
                            </div>
                            <div className="flex gap-2">
                                <input type="text" placeholder="মাসিক আয়" value={data.guarantor_2_monthly_income || ''} onChange={e => setData('guarantor_2_monthly_income', e.target.value)} className="w-1/2 border rounded px-2 py-1.5 text-[12px]" />
                                <input type="text" placeholder="সম্পদের পরিমাণ" value={data.guarantor_2_assets_amount || ''} onChange={e => setData('guarantor_2_assets_amount', e.target.value)} className="w-1/2 border rounded px-2 py-1.5 text-[12px]" />
                            </div>
                            <input type="text" placeholder="সম্ভাব্য মূল্য" value={data.guarantor_2_potential_value || ''} onChange={e => setData('guarantor_2_potential_value', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                            <div className="flex gap-2">
                                <input type="text" placeholder="সাক্ষাৎকারীর নাম" value={data.guarantor_2_interviewer_name || ''} onChange={e => setData('guarantor_2_interviewer_name', e.target.value)} className="w-1/2 border rounded px-2 py-1.5 text-[12px]" />
                                <input type="text" placeholder="পদবী" value={data.guarantor_2_interviewer_designation || ''} onChange={e => setData('guarantor_2_interviewer_designation', e.target.value)} className="w-1/2 border rounded px-2 py-1.5 text-[12px]" />
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-[12px] font-medium mb-2">০৩. তথ্য প্রদানকারী</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border p-2 rounded bg-gray-50 space-y-2">
                            <h5 className="font-bold text-[11px] mb-2">(ক) ১ম জন</h5>
                            <input type="text" placeholder="নাম" value={data.informant_1_name || ''} onChange={e => setData('informant_1_name', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                            <input type="text" placeholder="ঠিকানা" value={data.informant_1_address || ''} onChange={e => setData('informant_1_address', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                            <div className="flex gap-2">
                                <input type="text" placeholder="মোবাইল" value={data.informant_1_mobile || ''} onChange={e => setData('informant_1_mobile', e.target.value)} className="w-1/3 border rounded px-2 py-1.5 text-[12px]" />
                                <input type="text" placeholder="সম্পর্ক" value={data.informant_1_relation || ''} onChange={e => setData('informant_1_relation', e.target.value)} className="w-1/3 border rounded px-2 py-1.5 text-[12px]" />
                                <input type="text" placeholder="পেশা" value={data.informant_1_profession || ''} onChange={e => setData('informant_1_profession', e.target.value)} className="w-1/3 border rounded px-2 py-1.5 text-[12px]" />
                            </div>
                            <input type="text" placeholder="ঋণ সংক্রান্ত তথ্য" value={data.informant_1_loan_info || ''} onChange={e => setData('informant_1_loan_info', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                            <input type="text" placeholder="সম্পদ সংক্রান্ত তথ্য" value={data.informant_1_asset_info || ''} onChange={e => setData('informant_1_asset_info', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                            <input type="text" placeholder="সার্বিক মন্তব্য" value={data.informant_1_overall_comment || ''} onChange={e => setData('informant_1_overall_comment', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                        </div>
                        <div className="border p-2 rounded bg-gray-50 space-y-2">
                            <h5 className="font-bold text-[11px] mb-2">(খ) ২য় জন</h5>
                            <input type="text" placeholder="নাম" value={data.informant_2_name || ''} onChange={e => setData('informant_2_name', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                            <input type="text" placeholder="ঠিকানা" value={data.informant_2_address || ''} onChange={e => setData('informant_2_address', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                            <div className="flex gap-2">
                                <input type="text" placeholder="মোবাইল" value={data.informant_2_mobile || ''} onChange={e => setData('informant_2_mobile', e.target.value)} className="w-1/3 border rounded px-2 py-1.5 text-[12px]" />
                                <input type="text" placeholder="সম্পর্ক" value={data.informant_2_relation || ''} onChange={e => setData('informant_2_relation', e.target.value)} className="w-1/3 border rounded px-2 py-1.5 text-[12px]" />
                                <input type="text" placeholder="পেশা" value={data.informant_2_profession || ''} onChange={e => setData('informant_2_profession', e.target.value)} className="w-1/3 border rounded px-2 py-1.5 text-[12px]" />
                            </div>
                            <input type="text" placeholder="ঋণ সংক্রান্ত তথ্য" value={data.informant_2_loan_info || ''} onChange={e => setData('informant_2_loan_info', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                            <input type="text" placeholder="সম্পদ সংক্রান্ত তথ্য" value={data.informant_2_asset_info || ''} onChange={e => setData('informant_2_asset_info', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                            <input type="text" placeholder="সার্বিক মন্তব্য" value={data.informant_2_overall_comment || ''} onChange={e => setData('informant_2_overall_comment', e.target.value)} className="w-full border rounded px-2 py-1.5 text-[12px]" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
