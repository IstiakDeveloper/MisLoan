import React, { useEffect, useState } from 'react';
import { AgrosorFormPageProps } from './Types';
import { Briefcase, Factory, Landmark, Lock } from 'lucide-react';

const emptyEmpRow = () => ({
    activity_name: '',
    self_full_male: '',
    self_full_female: '',
    self_part_male: '',
    self_part_female: '',
    wage_full_male: '',
    wage_full_female: '',
    wage_part_male: '',
    wage_part_female: '',
});

const emptyOtherLoan = () => ({
    source_name: '',
    custom_source: '',
    is_custom: false,
    current_status: '',
    round: '',
    borrower_name: '',
    mobile: '',
    remarks: '',
});

const BANK_NGO_OPTIONS = [
    'ব্যাংক',
    'এনজিও',
    'গ্রামীণ ব্যাংক',
    'ব্র্যাক',
    'আশা',
    'বুরো বাংলাদেশ',
    'টিএমএসএস',
    'সোনালী ব্যাংক',
    'কৃষি ব্যাংক',
    'ইসলামী ব্যাংক',
    'পুবালী ব্যাংক',
    'সিটি ব্যাংক',
] as const;

const toNum = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

export default function FormPage1({ data, setData, member, isLegacy }: AgrosorFormPageProps) {
    const fromAdmission = !!(member && !isLegacy);

    const initialLoanCount = (data.other_loans || []).reduce((max: number, row: any, i: number) => {
        const hasValue =
            row?.current_status ||
            row?.round ||
            row?.borrower_name ||
            row?.mobile ||
            row?.remarks ||
            row?.source_name ||
            row?.source ||
            row?.amount;
        return hasValue ? Math.max(max, i + 1) : max;
    }, 1);
    const [visibleLoanCount, setVisibleLoanCount] = useState(Math.min(7, Math.max(1, initialLoanCount)));

    useEffect(() => {
        if (!Array.isArray(data.employment_rows) || data.employment_rows.length === 0) {
            setData('employment_rows', [emptyEmpRow(), emptyEmpRow(), emptyEmpRow(), emptyEmpRow()]);
        }
        if (!Array.isArray(data.other_loans) || data.other_loans.length === 0) {
            setData('other_loans', [emptyOtherLoan(), emptyOtherLoan(), emptyOtherLoan()]);
        }
        if (!Array.isArray(data.business_plan_rows) || data.business_plan_rows.length === 0) {
            setData('business_plan_rows', [
                { project_name: '', investment: '', net_income: '' },
                { project_name: '', investment: '', net_income: '' },
                { project_name: '', investment: '', net_income: '' },
            ]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const rows = Array.isArray(data.employment_rows) ? data.employment_rows : [];
    const updateEmp = (index: number, key: string, value: string) => {
        const next = rows.map((r: any, i: number) => (i === index ? { ...r, [key]: value } : r));
        setData('employment_rows', next);
    };

    const updateOtherLoan = (idx: number, patch: Record<string, any>) => {
        const list = [...(data.other_loans || [])];
        while (list.length <= idx) list.push(emptyOtherLoan());
        list[idx] = { ...emptyOtherLoan(), ...list[idx], ...patch };
        setData('other_loans', list);
    };

    const editableClass =
        'w-full border border-gray-300 rounded px-2 py-1.5 text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';
    const lockedClass =
        'w-full border border-gray-200 rounded px-2 py-1.5 text-xs bg-gray-100/90 text-gray-700 cursor-not-allowed font-medium';
    const inputClass = fromAdmission ? lockedClass : editableClass;
    const thClass = 'border border-gray-400 bg-gray-100 px-1 py-1 text-[10px] font-semibold text-center';
    const tdClass = 'border border-gray-300 px-1 py-0.5';

    return (
        <div id="agrosor-page-1" data-sync="page-1" className="space-y-5">
            <div className="flex items-center justify-between bg-gradient-to-r from-emerald-700 to-teal-700 text-white px-4 py-3 rounded-xl shadow-sm">
                <div className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    <h3 className="font-bold text-sm md:text-base">পৃষ্ঠা ১: সদস্য ও প্রকল্প তথ্য</h3>
                </div>
                {fromAdmission && (
                    <span className="text-[11px] bg-white/20 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                        <Lock className="w-3 h-3" /> ভর্তি থেকে আসা তথ্য লক
                    </span>
                )}
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">ঋণ আবেদনের তারিখ</label>
                        <input type="date" value={data.application_date || ''} onChange={(e) => setData('application_date', e.target.value)} className={editableClass} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">ঋণ বিতরণের তারিখ</label>
                        <input type="date" value={data.disbursement_date || ''} onChange={(e) => setData('disbursement_date', e.target.value)} className={editableClass} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">ঋণ পরিশোধের তারিখ</label>
                        <input type="date" value={data.repayment_date || ''} onChange={(e) => setData('repayment_date', e.target.value)} className={editableClass} />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                            <span>সদস্য/সদস্যার নাম ও কোড নং</span>
                            {fromAdmission && <Lock className="w-3 h-3 text-gray-400" />}
                        </label>
                        <input type="text" value={data.member_name_code || ''} onChange={(e) => setData('member_name_code', e.target.value)} readOnly={fromAdmission} className={inputClass} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                            <span>সমিতির নাম ও কোড নম্বর</span>
                            {fromAdmission && <Lock className="w-3 h-3 text-gray-400" />}
                        </label>
                        <input type="text" value={data.samity_name_code || ''} onChange={(e) => setData('samity_name_code', e.target.value)} readOnly={fromAdmission} className={inputClass} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                            <span>বাস্তবায়িত প্রকল্পের নাম</span>
                            {fromAdmission && <Lock className="w-3 h-3 text-gray-400" />}
                        </label>
                        <input type="text" value={data.implemented_project_name || ''} onChange={(e) => setData('implemented_project_name', e.target.value)} readOnly={fromAdmission} className={inputClass} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">বিকল্প প্রকল্পের নাম</label>
                        <input type="text" value={data.alternative_project_name || ''} onChange={(e) => setData('alternative_project_name', e.target.value)} className={editableClass} />
                    </div>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3 overflow-x-auto">
                <div className="flex items-center gap-2 font-bold text-sm text-gray-800 border-b pb-2">
                    <Factory className="w-4 h-4 text-emerald-700" />
                    <span>১. কর্মসংস্থান সংক্রান্ত তথ্য</span>
                </div>
                <table className="w-full min-w-[920px] border-collapse text-[10px] text-center">
                    <thead>
                        <tr>
                            <th className={thClass} rowSpan={3}>ঋণ কার্যক্রমের নাম</th>
                            <th className={thClass} colSpan={4}>স্ব-কর্মসংস্থান/পারিবারিক কর্মসংস্থান</th>
                            <th className={thClass} colSpan={4}>মজুরি ভিত্তিক কর্মসংস্থান</th>
                            <th className={thClass} colSpan={2}>মোট</th>
                        </tr>
                        <tr>
                            <th className={thClass} colSpan={2}>পূর্ণকালীন</th>
                            <th className={thClass} colSpan={2}>খণ্ডকালীন</th>
                            <th className={thClass} colSpan={2}>পূর্ণকালীন</th>
                            <th className={thClass} colSpan={2}>খণ্ডকালীন</th>
                            <th className={thClass}>পূর্ণ সময়<br /><span className="font-normal">৯ = ১+২+৫+৬</span></th>
                            <th className={thClass}>আংশিক সময়<br /><span className="font-normal">১০ = ৩+৪+৭+৮</span></th>
                        </tr>
                        <tr>
                            <th className={thClass}>পুরুষ (১)</th>
                            <th className={thClass}>মহিলা (২)</th>
                            <th className={thClass}>পুরুষ (৩)</th>
                            <th className={thClass}>মহিলা (৪)</th>
                            <th className={thClass}>পুরুষ (৫)</th>
                            <th className={thClass}>মহিলা (৬)</th>
                            <th className={thClass}>পুরুষ (৭)</th>
                            <th className={thClass}>মহিলা (৮)</th>
                            <th className={thClass}>৯</th>
                            <th className={thClass}>১০</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row: any, i: number) => {
                            // 4-page form formula: full = 1+2+5+6, part = 3+4+7+8
                            const full =
                                toNum(row.self_full_male) +
                                toNum(row.self_full_female) +
                                toNum(row.wage_full_male) +
                                toNum(row.wage_full_female);
                            const part =
                                toNum(row.self_part_male) +
                                toNum(row.self_part_female) +
                                toNum(row.wage_part_male) +
                                toNum(row.wage_part_female);
                            return (
                                <tr key={i}>
                                    <td className={tdClass}>
                                        <input className={editableClass} value={row.activity_name || ''} onChange={(e) => updateEmp(i, 'activity_name', e.target.value)} />
                                    </td>
                                    {(['self_full_male', 'self_full_female', 'self_part_male', 'self_part_female', 'wage_full_male', 'wage_full_female', 'wage_part_male', 'wage_part_female'] as const).map((k) => (
                                        <td key={k} className={tdClass}>
                                            <input type="number" className={editableClass} value={row[k] || ''} onChange={(e) => updateEmp(i, k, e.target.value)} />
                                        </td>
                                    ))}
                                    <td className={`${tdClass} text-center font-semibold bg-indigo-50`}>{full || ''}</td>
                                    <td className={`${tdClass} text-center font-semibold bg-indigo-50`}>{part || ''}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <p className="text-[10px] text-gray-500">মোট পূর্ণ সময় (৯) = ১+২+৫+৬ · মোট আংশিক সময় (১০) = ৩+৪+৭+৮ (৪ পাতার ফর্মের মতো)</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                <div>
                    <p className="text-xs font-semibold text-gray-800 mb-2">২. উৎপাদিত পণ্য সামগ্রীর কাঁচামালের উৎস ও বিবরণ তথ্য (টিক চিহ্ন দিন)</p>
                    <div className="flex flex-wrap gap-4 text-xs">
                        {[
                            { v: 'local', l: 'ক) স্থানীয়' },
                            { v: 'outside', l: 'খ) বাহির হতে' },
                            { v: 'other', l: 'গ) অন্যান্য' },
                        ].map((o) => (
                            <label key={o.v} className="inline-flex items-center gap-1.5">
                                <input type="radio" name="raw_material_source" checked={data.raw_material_source === o.v} onChange={() => setData('raw_material_source', o.v)} />
                                {o.l}
                            </label>
                        ))}
                    </div>
                </div>
                <div>
                    <p className="text-xs font-semibold text-gray-800 mb-2">৩. চূড়ান্ত উৎপাদিত পণ্য সামগ্রী বিক্রয় তথ্য (টিক চিহ্ন দিন)</p>
                    <div className="flex flex-wrap gap-4 text-xs">
                        {[
                            { v: 'local_market', l: 'ক) স্থানীয় বাজারে' },
                            { v: 'outside_market', l: 'খ) বহিঃ বাজারে' },
                            { v: 'other', l: 'গ) অন্যান্য' },
                        ].map((o) => (
                            <label key={o.v} className="inline-flex items-center gap-1.5">
                                <input type="radio" name="sales_market" checked={data.sales_market === o.v} onChange={() => setData('sales_market', o.v)} />
                                {o.l}
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm text-gray-800 border-b pb-2">
                    <Landmark className="w-4 h-4 text-emerald-700" />
                    <span>৪. সম্পদের বিবরণ</span>
                    {fromAdmission && (
                        <span className="ml-auto text-[10px] font-normal text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            ভর্তি ফর্ম থেকে পূর্বপূরণ
                        </span>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-gray-700">স্থাবর সম্পদ</p>
                        {[
                            ['immovable_land_qty', 'immovable_land_value', 'আবাদী জমি (শতাংশ/মূল্য)', true],
                            ['immovable_building_qty', 'immovable_building_value', 'দালান কোঠা/পাকা বাড়ি', true],
                            ['immovable_homestead_qty', 'immovable_homestead_value', 'বসত ভিটা', true],
                            ['immovable_pond_qty', 'immovable_pond_value', 'পুকুর/বাগান', false],
                            ['immovable_other_qty', 'immovable_other_value', 'অন্যান্য', false],
                        ].map(([qty, val, label, fromAdm]) => (
                            <div key={String(qty)} className="grid grid-cols-5 gap-2 items-center">
                                <span className="col-span-2 text-[11px] text-gray-700">{String(label)}</span>
                                <input
                                    type="text"
                                    placeholder="পরিমাণ"
                                    className={fromAdmission && fromAdm ? lockedClass : editableClass}
                                    readOnly={!!(fromAdmission && fromAdm)}
                                    value={data[String(qty)] || ''}
                                    onChange={(e) => setData(String(qty), e.target.value)}
                                />
                                <input
                                    type="number"
                                    placeholder="মূল্য"
                                    className={`${fromAdmission && fromAdm ? lockedClass : editableClass} col-span-2`}
                                    readOnly={!!(fromAdmission && fromAdm)}
                                    value={data[String(val)] || ''}
                                    onChange={(e) => setData(String(val), e.target.value)}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-gray-700">অস্থাবর সম্পদ</p>
                        {[
                            ['movable_savings', 'মোট সঞ্চয় (সংস্থায় জমা)', true],
                            ['movable_furniture', 'আসবাবপত্র', true],
                            ['movable_gold', 'স্বর্ণালংকার', true],
                            ['movable_livestock', 'গবাদি পশু/পাখি/মাছ', true],
                            ['movable_business_capital', 'ব্যবসায়িক মূলধন', true],
                            ['movable_other', 'অন্যান্য', true],
                        ].map(([key, label, fromAdm]) => (
                            <div key={String(key)} className="grid grid-cols-5 gap-2 items-center">
                                <span className="col-span-2 text-[11px] text-gray-700">{String(label)}</span>
                                <input
                                    type="text"
                                    placeholder="বর্তমান মূল্য / বিবরণ"
                                    className={`${fromAdmission && fromAdm ? lockedClass : editableClass} col-span-3`}
                                    readOnly={!!(fromAdmission && fromAdm)}
                                    value={data[String(key)] || ''}
                                    onChange={(e) => setData(String(key), e.target.value)}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                        <Landmark className="w-4 h-4 text-emerald-600" />
                        <span>৫. বিভিন্ন উৎস হতে গৃহীত ঋণের বিবরণ</span>
                    </div>
                    {visibleLoanCount < 7 && (
                        <button
                            type="button"
                            onClick={() => setVisibleLoanCount((prev) => Math.min(7, prev + 1))}
                            className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg font-semibold hover:bg-emerald-100 active:scale-95 transition-all"
                        >
                            + আরেকটি ঋণ যোগ করুন
                        </button>
                    )}
                </div>

                <div className="space-y-3">
                    {Array.from({ length: visibleLoanCount }).map((_, idx) => {
                        const currentObj = data.other_loans?.[idx] || emptyOtherLoan();
                        const sourceName = currentObj.source_name || currentObj.source || '';
                        const isCustom =
                            currentObj.is_custom ||
                            (sourceName !== '' && !(BANK_NGO_OPTIONS as readonly string[]).includes(sourceName));

                        return (
                            <div
                                key={idx}
                                className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs space-y-2.5"
                            >
                                <div className="text-[11px] font-bold text-gray-700 flex items-center justify-between border-b pb-1">
                                    <span>চলমান ঋণ বিবরণী #{idx + 1}</span>
                                    {idx > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const list = [...(data.other_loans || [])];
                                                list[idx] = emptyOtherLoan();
                                                setData('other_loans', list);
                                                setVisibleLoanCount((prev) => Math.max(1, prev - 1));
                                            }}
                                            className="text-[10px] text-red-500 hover:text-red-700 font-semibold"
                                        >
                                            ✕ বাদ দিন
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div>
                                        <label className="block text-[11px] text-gray-600 font-semibold mb-1">
                                            সংস্থার/প্রতিষ্ঠানের নাম (ব্যাংক/এনজিও)
                                        </label>
                                        <select
                                            value={isCustom ? 'custom' : sourceName}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === 'custom') {
                                                    updateOtherLoan(idx, {
                                                        is_custom: true,
                                                        source_name: currentObj.custom_source || '',
                                                    });
                                                } else {
                                                    updateOtherLoan(idx, {
                                                        is_custom: false,
                                                        source_name: val,
                                                        custom_source: '',
                                                    });
                                                }
                                            }}
                                            className={editableClass}
                                        >
                                            <option value="">-- ব্যাংক / এনজিও নির্বাচন করুন --</option>
                                            {BANK_NGO_OPTIONS.map((opt) => (
                                                <option key={opt} value={opt}>
                                                    {opt}
                                                </option>
                                            ))}
                                            <option value="custom">অন্যান্য / কাস্টম নাম লিখুন...</option>
                                        </select>
                                        {isCustom && (
                                            <input
                                                type="text"
                                                placeholder="কাস্টম ব্যাংক/এনজিও-এর নাম লিখুন..."
                                                value={currentObj.custom_source ?? (isCustom ? sourceName : '')}
                                                onChange={(e) =>
                                                    updateOtherLoan(idx, {
                                                        is_custom: true,
                                                        custom_source: e.target.value,
                                                        source_name: e.target.value,
                                                    })
                                                }
                                                className={`${editableClass} mt-2 bg-amber-50/60 border-amber-300`}
                                            />
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-gray-600 font-semibold mb-1">
                                            বর্তমান গৃহীত ঋণের পরিমাণ (স্থিতি)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="টাকা"
                                            value={currentObj.current_status || currentObj.amount || ''}
                                            onChange={(e) =>
                                                updateOtherLoan(idx, { current_status: e.target.value })
                                            }
                                            className={editableClass}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <div>
                                        <label className="block text-[10px] text-gray-500 font-medium mb-0.5">
                                            ঋণের মেয়াদ
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="মেয়াদ"
                                            value={currentObj.round || currentObj.duration || ''}
                                            onChange={(e) => updateOtherLoan(idx, { round: e.target.value })}
                                            className={editableClass}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-500 font-medium mb-0.5">
                                            তথ্য প্রদানকারীর নাম
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="নাম"
                                            value={currentObj.borrower_name || ''}
                                            onChange={(e) =>
                                                updateOtherLoan(idx, { borrower_name: e.target.value })
                                            }
                                            className={editableClass}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-500 font-medium mb-0.5">
                                            মোবাইল
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="মোবাইল"
                                            value={currentObj.mobile || ''}
                                            onChange={(e) => updateOtherLoan(idx, { mobile: e.target.value })}
                                            className={editableClass}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-500 font-medium mb-0.5">
                                            মন্তব্য
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="মন্তব্য"
                                            value={currentObj.remarks || ''}
                                            onChange={(e) => updateOtherLoan(idx, { remarks: e.target.value })}
                                            className={editableClass}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3 overflow-x-auto">
                <p className="font-bold text-sm text-gray-800 border-b pb-2">৬. আগামী ০১ বছরের উৎপাদন/ব্যবসায়িক পরিকল্পনা</p>
                <table className="w-full min-w-[600px] border-collapse text-xs">
                    <thead>
                        <tr>
                            {['প্রকল্পের নাম', 'প্রকল্পের বিনিয়োগের পরিমাণ', 'প্রকল্প হতে সম্ভাব্য নীট আয়'].map((h) => (
                                <th key={h} className={thClass}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {(data.business_plan_rows || []).map((row: any, i: number) => (
                            <tr key={i}>
                                {(['project_name', 'investment', 'net_income'] as const).map((k) => (
                                    <td key={k} className={tdClass}>
                                        <input
                                            className={editableClass}
                                            value={row[k] || ''}
                                            onChange={(e) => {
                                                const next = [...(data.business_plan_rows || [])];
                                                next[i] = { ...next[i], [k]: e.target.value };
                                                setData('business_plan_rows', next);
                                            }}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
