import React from 'react';
import { formatDateBangla } from '@/utils/dateUtils';

const DATE_BOX_COUNT = 8;
const DateDigitBoxes = ({ dateStr }: { dateStr: string }) => {
    const digits = (dateStr || '').replace(/\D/g, '').split('');
    const boxes = Array.from({ length: DATE_BOX_COUNT }, (_, i) => digits[i] ?? '');
    return (
        <span className="inline-flex gap-0.5 flex-wrap items-center text-[12px]">
            {boxes.map((ch, i) => (
                <span key={i} className="border border-gray-600 inline-flex items-center justify-center min-w-[14px] w-[14px] h-[18px] font-mono leading-none">
                    {ch}
                </span>
            ))}
        </span>
    );
};


const dofaLabel = (round: number | undefined): string => {
    if (round == null || round < 1) return '১ম দফা';
    const labels: Record<number, string> = { 1: '১ম দফা', 2: '২য় দফা', 3: '৩য় দফা', 4: '৪র্থ দফা', 5: '৫ম দফা', 6: '৬ষ্ঠ দফা', 7: '৭ম দফা', 8: '৮ম দফা', 9: '৯ম দফা', 10: '১০ম দফা' };
    return labels[round] || `${round}তম দফা`;
};

const noDecimal = (v: any): string => {
    if (v === null || v === undefined || v === '') return '';
    const n = Number(String(v).replace(/[^\d.-]/g, ''));
    return Number.isNaN(n) ? String(v).replace(/\.[0-9]+$/, '') : String(Math.round(n));
};

const BANGLA_0_TO_99: Record<number, string> = {
    0: 'শূন্য', 1: 'এক', 2: 'দুই', 3: 'তিন', 4: 'চার', 5: 'পাঁচ', 6: 'ছয়', 7: 'সাত', 8: 'আট', 9: 'নয়', 10: 'দশ',
    11: 'এগারো', 12: 'বারো', 13: 'তেরো', 14: 'চৌদ্দ', 15: 'পনেরো', 16: 'ষোল', 17: 'সতেরো', 18: 'আঠারো', 19: 'উনিশ',
    20: 'কুড়ি', 21: 'একুশ', 22: 'বাইশ', 23: 'তেইশ', 24: 'চব্বিশ', 25: 'পঁচিশ', 26: 'ছাব্বিশ', 27: 'সাতাশ', 28: 'আটাশ', 29: 'ঊনত্রিশ',
    30: 'ত্রিশ', 31: 'একত্রিশ', 32: 'বত্রিশ', 33: 'তেত্রিশ', 34: 'চৌত্রিশ', 35: 'পঁয়ত্রিশ', 36: 'ছত্রিশ', 37: 'সাঁইত্রিশ', 38: 'আটত্রিশ', 39: 'ঊনচল্লিশ',
    40: 'চল্লিশ', 41: 'একচল্লিশ', 42: 'বিয়াল্লিশ', 43: 'তেতাল্লিশ', 44: 'চুয়াল্লিশ', 45: 'পঁয়তাল্লিশ', 46: 'ছেচল্লিশ', 47: 'সাতচল্লিশ', 48: 'আটচল্লিশ', 49: 'ঊনপঞ্চাশ',
    50: 'পঞ্চাশ', 51: 'একান্ন', 52: 'বাহান্ন', 53: 'তেপ্পান্ন', 54: 'চুয়ান্ন', 55: 'পঞ্চান্ন', 56: 'ছাপ্পান্ন', 57: 'সাতান্ন', 58: 'আটান্ন', 59: 'ঊনষাট',
    60: 'ষাট', 61: 'একষট্টি', 62: 'বাষট্টি', 63: 'তেষট্টি', 64: 'চৌষট্টি', 65: 'পঁয়ষট্টি', 66: 'ছয়ষট্টি', 67: 'সাতষট্টি', 68: 'আটষট্টি', 69: 'ঊনসত্তর',
    70: 'সত্তর', 71: 'একাত্তর', 72: 'বাহাত্তর', 73: 'তিয়াত্তর', 74: 'চুয়াত্তর', 75: 'পঁচাত্তর', 76: 'ছিয়াত্তর', 77: 'সাতাত্তর', 78: 'আটাত্তর', 79: 'ঊনআশি',
    80: 'আশি', 81: 'একাশি', 82: 'বিরাশি', 83: 'তিরাশি', 84: 'চুরাশি', 85: 'পঁচাশি', 86: 'ছিয়াশি', 87: 'সাতাশি', 88: 'আটাশি', 89: 'ঊননব্বই',
    90: 'নব্বই', 91: 'একানব্বই', 92: 'বিরানব্বই', 93: 'তিরানব্বই', 94: 'চুরানব্বই', 95: 'পঁচানব্বই', 96: 'ছিয়ানব্বই', 97: 'সাতানব্বই', 98: 'আটানব্বই', 99: 'নিরানব্বই',
};

export function numberToWordsBangla(value: string | number | null | undefined): string {
    const num = typeof value === 'number' ? value : parseFloat(String(value || '').replace(/[^\d.]/g, ''));
    if (Number.isNaN(num) || num < 0) return '';
    const n = Math.floor(num);
    if (n === 0) return BANGLA_0_TO_99[0];
    const twoDigits = (x: number): string => (x >= 0 && x <= 99 ? BANGLA_0_TO_99[x] : '');
    const upTo999 = (x: number): string => {
        if (x === 0) return '';
        if (x <= 99) return twoDigits(x);
        const h = Math.floor(x / 100);
        const r = x % 100;
        const hundred = h === 1 ? 'একশ' : (twoDigits(h) + 'শ');
        return r ? hundred + ' ' + twoDigits(r) : hundred;
    };
    if (n < 1000) return upTo999(n);
    if (n < 100000) {
        const th = Math.floor(n / 1000);
        const r = n % 1000;
        const thousand = th === 1 ? 'এক হাজার' : (upTo999(th) + ' হাজার');
        return (thousand + (r ? ' ' + upTo999(r) : '')).trim();
    }
    if (n < 10000000) {
        const lkh = Math.floor(n / 100000);
        const r = n % 100000;
        const lakh = lkh === 1 ? 'এক লক্ষ' : (upTo999(lkh) + ' লক্ষ');
        return (lakh + (r ? ' ' + numberToWordsBangla(r) : '')).trim();
    }
    const cr = Math.floor(n / 10000000);
    const r = n % 10000000;
    const crore = cr === 1 ? 'এক কোটি' : (numberToWordsBangla(cr) + ' কোটি');
    return (crore + (r ? ' ' + numberToWordsBangla(r) : '')).trim();
}

function renderPage1(d: any, branch?: any, categoryName?: string) {
    const cat = categoryName || d.category_name || 'ঋণ';
    const fmt = formatDateBangla;
    const nidDigits = (d.nid_smart_card || '').replace(/\D/g, '').slice(0, 17).split('');
    return (
        <div id="preview-page-1" data-sync="page-1" className="bg-white border border-gray-300 p-4 print:p-0 print:border-none text-[12px] print:text-[11px] print:leading-tight" style={{ pageBreakAfter: 'always' }}>
            <div className="flex flex-col items-center justify-center mb-2 border-b-2 border-gray-400 pb-1">
                <div className="flex items-center gap-3 mb-1">
                    <img src="/logo.png" alt="Logo" className="h-14 w-14 object-contain print:block" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <div className="text-center">
                        <h1 className="text-[12px] font-bold leading-tight print:text-[12px]">মৌসুমী</h1>
                        <p className="text-[12px] leading-tight print:text-[12px]">{branch?.address || d.branch_address || 'উকিলপাড়া, নওগাঁ।'}</p>
                    </div>
                </div>
                <div className="text-center rounded-lg border-2 border-gray-600 px-3 py-1 mt-1">
                    <h2 className="text-[12px] font-semibold print:text-[12px]">({cat} ঋণ আবেদন ও অনুমোদনপত্র)</h2>
                </div>
            </div>
            <div className="mb-2 grid grid-cols-2 gap-x-4">
                {/* বাম পাশ – আবেদনের তারিখ, বরাবর (recipient_to), মাধ্যম যথাযথ কর্তৃপক্ষ (ঠিকানা); গ্যাপ নেই */}
                <div className="flex flex-col gap-1">
                    <div><span>আবেদনের তারিখ:</span><span className="ml-1 inline-flex items-center"><DateDigitBoxes dateStr={fmt(d.application_date)} /></span></div>
                    <div><span>বরাবর,</span></div>
                    <div><span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] mx-1 align-bottom">{d.recipient_to || ''}</span></div>
                    <div><span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] mx-1 align-bottom">{d.authority_medium || ''}</span></div>
                    <div><span>মাধ্যম যথাযথ কর্তৃপক্ষ।</span></div>
                </div>
                {/* ডান পাশ – ড্যাশড বর্ডার, বাম থেকে সাজানো, তারিখ বক্স অ্যালাইন একই */}
                <div className="flex flex-col gap-1 border border-dashed border-gray-600 p-2 items-start justify-center">
                    <div className="flex items-center gap-2 w-full">
                        <span className="min-w-[148px] shrink-0">ঋণ অনুমোদনের তারিখ:</span>
                        <DateDigitBoxes dateStr={fmt(d.loan_approval_date)} />
                    </div>
                    <div className="flex items-center gap-2 w-full">
                        <span className="min-w-[148px] shrink-0">ঋণ বিতরণের তারিখ:</span>
                        <DateDigitBoxes dateStr={fmt(d.loan_disbursement_date)} />
                    </div>
                    <div className="flex items-center gap-2 w-full">
                        <span className="min-w-[148px] shrink-0">ঋণ পরিশোধের তারিখ:</span>
                        <DateDigitBoxes dateStr={fmt(d.loan_repayment_date)} />
                    </div>
                </div>
            </div>
            <div className="mb-3 leading-relaxed">
                <p>
                    জনাব,<br />
                    আমি নিম্নস্বাক্ষরকারী অত্র সংস্থার আওতাধীন <span>{d.committee_name || ''}</span> সমিতির (সমিতি কোড <span>{(d.committee_code || '').length >= 4 ? (d.committee_code || '').slice(4) : (d.committee_code || '')}</span>) একজন {(d.member_type === 'old' ? 'পুরাতন' : 'নতুন')} সদস্য।{d.member_type === 'old' ? ` আমি গত ${d.years_involved || '......'} বছর যাবৎ ${cat} কার্যক্রমের সাথে সম্পৃক্ত।` : ''} বর্তমানে আমার ব্যবসা পরিচালনা ও পরিধি বৃদ্ধির লক্ষ্যে {cat} কর্মসূচির আওতায় ঋণ গ্রহণ করতে ইচ্ছুক। এমতাবস্থায় ঋণ গ্রহণার্থে আমার প্রয়োজনীয় তথ্যাবলি নিম্নে প্রদান করলাম:
                </p>
            </div>
            <div data-sync="item-1" className="mb-1">
                <span>১. আবেদনকারীর নাম:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[140px] mx-1 align-bottom">{d.member_name_detail || d.applicant_name_bn || d.member_name || ''}</span>
                <span className="ml-2">সদস্য কোড:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] mx-1 align-bottom">{d.member_code || ''}</span>
                <span className="ml-2">বয়স:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom">{d.age ?? ''}</span> বছর।
            </div>
            <div data-sync="item-2" className="mb-1">
                <span>২. পিতা/স্বামীর নাম:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[200px] ml-1 align-bottom">{d.father_husband_name || ''}</span>
            </div>
            <div data-sync="item-3" className="mb-1">
                <span>৩. ঠিকানা:</span>
                <div className="ml-4 mt-0.5">
                    <div><span>ক) স্থায়ী: গ্রাম/মহল্লা:</span> <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] ml-1 align-bottom">{d.permanent_address_line1 || ''}</span> ডাকঘর: <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{d.permanent_address_line2 || ''}</span> উপজেলা: <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{d.permanent_address_line3?.split(',')[0]?.trim() || ''}</span> জেলা: <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{d.permanent_address_line3?.split(',')[1]?.trim() || ''}</span></div>
                    <div><span>খ) বর্তমান: গ্রাম/মহল্লা:</span> <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] ml-1 align-bottom">{d.current_address_line1 || ''}</span> ডাকঘর: <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{d.current_address_line2 || ''}</span> উপজেলা: <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{d.current_address_line3?.split(',')[0]?.trim() || ''}</span> জেলা: <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{d.current_address_line3?.split(',')[1]?.trim() || ''}</span></div>
                </div>
            </div>
            <div className="mb-1">
                <span>৪. NID/Smart Card No:</span>
                <span className="inline-flex gap-0.5 ml-1">
                    {Array.from({ length: nidDigits.length }, (_, i) => (
                        <span key={i} className="border border-gray-500 w-4 inline-block text-center min-h-[14px]">{nidDigits[i] ?? ''}</span>
                    ))}
                </span>
            </div>
            <div className="mb-1">
                <span>৫. পেশা:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] mx-1 align-bottom">{d.occupation || ''}</span>
                <span className="ml-2">৬. শিক্ষাগত যোগ্যতা:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] ml-1 align-bottom">{d.educational_qualification || ''}</span>
            </div>
            <div className="mb-1">
                <span>৭. সমিতিতে ভর্তির তারিখ:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] mx-1 align-bottom">{fmt(d.admission_date)}</span>
                <span className="ml-2">৮. পরিবারের মোট সদস্য সংখ্যা:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom">{d.family_members_count ?? ''}</span>
                <span className="ml-2">৯. পরিবারের উপার্জনক্ষম সদস্য সংখ্যা:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] ml-1 align-bottom">{d.earning_members_count ?? ''}</span>
            </div>
            <div className="mb-1">
                <span>১০. ইতোপূর্বে গৃহীত ঋণের তথ্য: মোট কতোবার</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[60px] mx-1 align-bottom">{d.previous_loan_times || ''}</span>
                <span>...কতো টাকা।</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{noDecimal(d.previous_loan_amount)}</span>
            </div>
            <div className="mb-1">
                <span>১১. সর্বশেষ পরিশোধিত ঋণের পরিমাণ:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] mx-1 align-bottom">{noDecimal(d.last_repaid_loan_amount)}</span>
                <span className="ml-2">১২. সর্বশেষ পরিশোধিত প্রকল্পের নাম:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] ml-1 align-bottom">{d.last_repaid_project_name || ''}</span>
            </div>
            <div data-sync="item-13" className="mb-1">
                <span>১৩. সাধারণ সঞ্চয় (দফা ও পরিমাণ):</span>
                <span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom">{dofaLabel(d.loan_round)}</span>
                <span className="ml-1">পরিমাণ (৳):</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] mx-1 align-bottom">{noDecimal(d.general_savings_amount ?? d.savings_amount)}</span>
                <span className="ml-1">সঞ্চয়ের বিপরিতে:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[32px] mx-1 align-bottom">{d.is_against_savings ? 'হ্যাঁ' : 'না'}</span>
                {d.is_against_savings && d.against_savings_amount != null && d.against_savings_amount !== '' && (
                    <span className="ml-1">বিপরিতে পরিমাণ (৳):</span>
                )}
                {d.is_against_savings && d.against_savings_amount != null && d.against_savings_amount !== '' && (
                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[60px] mx-1 align-bottom">{noDecimal(d.against_savings_amount)}</span>
                )}
            </div>
            <div className="mb-1">
                <span>১৪. ঋণ প্রস্তাবনার তারিখ:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] mx-1 align-bottom">{fmt(d.loan_proposal_date)}</span>
            </div>
            <div className="mb-1">
                <span>১৫. প্রকল্পের নাম:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] mx-1 align-bottom">{d.project_name || d.proposed_project_name || ''}</span>
                <span className="ml-2">১৬. প্রকল্পে নিয়োজিত জনবল সংখ্যা:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[50px] ml-1 align-bottom">{d.project_manpower || ''}</span>
            </div>
            <div className="mb-1">
                <span>১৭. প্রকল্পের ১/১.৫/২ বছরের আয় (স্ভাব্য):</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] mx-1 align-bottom">{noDecimal(d.project_income_1_2_yr)}</span>
                <span className="ml-2">১৮. প্রকল্পের ১/১.৫/২ বছরের ব্যয় (স্ভাব্য):</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{noDecimal(d.project_expense_1_2_yr)}</span>
            </div>
            <div className="mb-1">
                <span>১৯. বার্ষিক নিট লাভ (স্ভাব্য):</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{noDecimal(d.annual_net_profit)}</span>
            </div>
            <div className="mb-2">
                <span>২০. প্রকল্পে বিনিয়োগিত মূলধনের পরিমাণ:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] mx-1 align-bottom">{noDecimal(d.capital_total || (Number(d.capital_own || 0) + Number(d.capital_applied_loan || 0)))}</span>
                <span className="ml-2">(ক) নিজস্ব মূলধনের পরিমাণ:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] mx-1 align-bottom">{noDecimal(d.capital_own)}</span>
                <span className="ml-2">(খ) আবেদনকৃত ঋণের পরিমাণ:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] ml-1 align-bottom">{noDecimal(d.capital_applied_loan)}</span>
            </div>
            <div data-sync="item-21" className="mb-2">
                <p className="font-bold text-[12px] mb-1">২১. পারিবারিক সম্পদ (স্থাবর ও অস্থাবর)</p>
                <table className="w-full border-collapse border border-gray-600 text-[12px]">
                    <thead>
                        <tr>
                            <th className="border border-gray-600 px-1 py-0.5">সম্পদের পরিমাণ (স্থাবর)</th>
                            <th className="border border-gray-600 px-1 py-0.5">আনুমানিক মূল্য</th>
                            <th className="border border-gray-600 px-1 py-0.5">সম্পদের বিবরণ (অস্থাবর)</th>
                            <th className="border border-gray-600 px-1 py-0.5">আনুমানিক মূল্য</th>
                        </tr>
                    </thead>
                    <tbody>
                        {((d.family_assets || []) as any[]).map((row, idx) => (
                            <tr key={idx}>
                                <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{noDecimal(row.fixed_quantity)}</span></td>
                                <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{noDecimal(row.fixed_value)}</span></td>
                                <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{row.movable_desc || ''}</span></td>
                                <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{noDecimal(row.movable_value)}</span></td>
                            </tr>
                        ))}
                        <tr>
                            <td className="border border-gray-600 px-1 py-0.5 font-bold">মোট</td>
                            <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{(() => {
                                const total = ((d.family_assets || []) as any[]).reduce((s, r) => s + (Number(String(r.fixed_value || '').replace(/[^\d.-]/g, '')) || 0), 0);
                                return total ? String(total) : '';
                            })()}</span></td>
                            <td className="border border-gray-600 px-1 py-0.5 font-bold">মোট</td>
                            <td className="border border-gray-600 px-1 py-0.5"><span className="border-b border-dotted border-gray-600 inline-block w-full min-h-[12px]">{(() => {
                                const total = ((d.family_assets || []) as any[]).reduce((s, r) => s + (Number(String(r.movable_value || '').replace(/[^\d.-]/g, '')) || 0), 0);
                                return total ? String(total) : '';
                            })()}</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div className="mb-2 text-[12px] leading-relaxed">
                <p>
                    উল্লিখিত তথ্যাবলি সঠিক। আমার আবেদনকৃত <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] align-bottom">{noDecimal(d.approval_amount_digits || d.capital_applied_loan)}</span> টাকা {cat} কর্মসূচির আওতায় ঋণ প্রদান করলে সংস্থার যাবতীয় নিয়ম-কানুন মেনে নির্ধারিত তারিখে ঋণের কিস্তি পরিশোধ করবো।
                </p>
                <div className="flex justify-end mt-4 flex-col items-end">
                    <div className="border-b border-dotted border-gray-500 w-32 sm:w-40 min-h-[22px] mb-1" />
                    <div className="min-h-[28px]">
                        {d.applicant_signature ? (
                            <img src={d.applicant_signature} alt="আবেদনকারীর স্বাক্ষর" className="h-6 object-contain" />
                        ) : (
                            <span className="text-[11px] text-gray-500">আবেদনকারীর স্বাক্ষর</span>
                        )}
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="border border-gray-600 p-1 text-center">
                    <p className="text-[10px] font-bold">অফিসারের স্বাক্ষর ও সিল</p>
                    <div className="border-b border-dotted border-gray-600 min-h-[35px] mt-1"></div>
                </div>
                <div className="border border-gray-600 p-1 text-center">
                    <p className="text-[10px] font-bold">শাখা ব্যবস্থাপকের স্বাক্ষর ও সিল</p>
                    <div className="border-b border-dotted border-gray-600 min-h-[35px] mt-1"></div>
                </div>
            </div>
            <div className="mb-2 text-[12px]">
                <p>
                    আবেদনকারীর যাবতীয় তথ্যাদি সরেজমিনে যাচাই সাপেক্ষে উক্ত প্রকল্পে <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] align-bottom">{noDecimal(d.approval_amount_digits || d.capital_applied_loan)}</span> (কথায় <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] align-bottom">{d.approval_amount_words || ''}</span>) টাকা ঋণ বিতরণের জন্য অনুমোদন করা হলো।
                </p>
            </div>
            <div className="flex justify-end mt-5 flex-col items-end">
                <div className="border-b border-dotted border-gray-500 w-40 sm:w-48 min-h-[28px] mb-1" />
                <div className="min-h-[36px] flex items-center justify-end">
                    {d.approver_signature ? (
                        <img src={d.approver_signature} alt="অনুমোদনকারীর স্বাক্ষর" className="h-7 object-contain" />
                    ) : (
                        <span className="text-[11px] text-gray-500">অনুমোদনকারীর স্বাক্ষর ও সিল</span>
                    )}
                </div>
            </div>
            <div className="text-right mt-2 text-[12px]">১ / ৪</div>
        </div>
    );
}

function renderPage2(d: any, categoryName?: string) {
    const cat = categoryName || d.category_name || 'ঋণ';
    const fmt = formatDateBangla;
    return (
        <div id="preview-page-2" data-sync="page-2" className="bg-white border border-gray-300 p-4 print:p-0 print:border-none text-[12px] print:text-[11px] print:leading-tight" style={{ pageBreakAfter: 'always' }}>
            <div className="flex justify-center mb-1">
                <div className="inline-block text-center rounded-lg border-2 border-gray-600 px-3 py-1">
                    <h2 className="text-[12px] font-bold print:text-[12px]">{cat} ঋণের প্রোফাইল</h2>
                </div>

            </div>
            <div className="mb-1">
                <div className="flex justify-center items-center">
                    <h3 className="font-bold text-[12px] mb-2 border border-gray-600 px-3 py-1 inline-block mx-auto">
                        ক. উদ্যোগ বিষয়ক সাধারণ তথ্যাবলী:
                    </h3>
                </div>
                <div className="space-y-2">
                    <div><span>১. প্রস্তাবিত প্রকল্পের নাম:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[300px] ml-1 align-bottom">{d.proposed_project_name || d.project_name || ''}</span></div>
                    <div><span>২. উদ্যোক্তাদের সংশ্লিষ্টতা-</span>
                        <div className="ml-4 mt-1">
                            <div><span>(ক) সার্বক্ষণিক: কতোদিন কাজটিতে নিযুক্ত আছে</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom">{d.entrepreneur_fulltime_years || ''}</span> বছর, <span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom">{d.entrepreneur_fulltime_months || ''}</span> মাস</div>
                            <div><span>(খ) খণ্ডকালীন: কতোদিন কাজটিতে নিযুক্ত আছে</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom">{d.entrepreneur_parttime_years || ''}</span> বছর, <span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom">{d.entrepreneur_parttime_months || ''}</span> মাস</div>
                        </div>
                    </div>
                    <div><span>৩. ঋণ কার্যক্রমে উদ্যোক্তার অভিজ্ঞতা:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom">{d.loan_experience_years || ''}</span> বছর, <span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom">{d.loan_experience_months || ''}</span> মাস</div>
                    <div>
                        <div>
                            <span>৪. প্রকল্পে নিয়োগকৃত জনবল</span>
                            <span className="border-b border-dotted border-gray-600 inline-block min-w-[150px] mx-1 align-bottom">
                                {d.project_manpower_total || d.project_manpower || ''}
                            </span>
                            <span>জন।</span>
                        </div>
                        <div className="ml-4 mt-1 space-y-0.5">
                            <div>
                                <span>(ক) পরিবারের মধ্যে</span>
                                <span className="border-b border-dotted border-gray-600 inline-block min-w-[150px] mx-1 align-bottom">
                                    {d.project_manpower_family || ''}
                                </span>
                                <span>জন</span>
                            </div>
                            <div>
                                <span>(খ) পরিবারের বাইরে</span>
                                <span className="border-b border-dotted border-gray-600 inline-block min-w-[150px] mx-1 align-bottom">
                                    {d.project_manpower_outside || ''}
                                </span>
                                <span>জন</span>
                            </div>
                            <div>
                                <span>(গ) প্রশিক্ষণপ্রাপ্ত লোকবল</span>
                                <span className="border-b border-dotted border-gray-600 inline-block min-w-[150px] mx-1 align-bottom">
                                    {d.project_manpower_trained || ''}
                                </span>
                                <span>জন</span>
                            </div>
                        </div>
                    </div>
                    {/* ৫. উৎপাদন ও বাজারজাতকরণের সংক্ষিপ্ত তথ্য (২ কলামের টেবিল) */}
                    <div>
                        <div><span>৫. উৎপাদন ও বাজারজাতকরণ সংক্রান্ত তথ্য:</span></div>
                        <table className="w-full border-collapse border border-gray-600 text-[12px] mt-1">
                            <tbody>
                                <tr>
                                    <td className="w-1/2 border border-gray-600 px-1 py-0.5 align-top">
                                        ব্যবহৃত কাঁচামাল ক্রয়ের স্থান (নাম ও ঠিকানাসহ):
                                    </td>
                                    <td className="w-1/2 border border-gray-600 px-2 py-0.5">
                                        {d.raw_material_purchase_location || ''}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="w-1/2 border border-gray-600 px-1 py-0.5 align-top">
                                        উৎপাদিত পণ্য বাজারজাতকরণের স্থান কোথায়? (নাম ও ঠিকানাসহ):
                                    </td>
                                    <td className="w-1/2 border border-gray-600 px-2 py-0.5">
                                        {d.product_marketing_location || ''}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* ৬. গত ১ বছরের আর্থিক তথ্য (টেবিল আকারে) */}
                    <div className="mt-2">
                        <div><span>৬. বিগত ০১ বছরের আর্থিক তথ্য:</span></div>
                        <table className="w-full border-collapse border border-gray-600 text-[12px] mt-1">
                            <thead>
                                <tr className="font-normal">
                                    <td className="border border-gray-600 px-1 py-0.5 text-center">পুঁজির পরিমাণ</td>
                                    <td className="border border-gray-600 px-1 py-0.5 text-center">বিক্রয় (সারা বছর)</td>
                                    <td className="border border-gray-600 px-1 py-0.5 text-center">মোট লাভ/ক্ষতি</td>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-gray-600 px-2 py-0.5 text-center">
                                        <span className="inline-block min-w-[120px]">
                                            {noDecimal(d.last_year_capital)}
                                        </span>
                                    </td>
                                    <td className="border border-gray-600 px-2 py-0.5 text-center">
                                        <span className="inline-block min-w-[120px]">
                                            {noDecimal(d.last_year_sales)}
                                        </span>
                                    </td>
                                    <td className="border border-gray-600 px-2 py-0.5 text-center">
                                        <span className="inline-block min-w-[120px]">
                                            {noDecimal(d.last_year_profit_loss)}
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* ৭. প্রযোজ্য ক্ষেত্রে ট্রেড লাইসেন্স ও অন্যান্য লাইসেন্স এবং আয়ের প্রমাণ সম্পর্কিত তথ্য */}
                    <div className="mt-2 space-y-1">
                        <div>
                            <span>৭. প্রযোজ্য ক্ষেত্রে ট্রেড লাইসেন্স ও অন্যান্য লাইসেন্স এবং আয়ের প্রমাণ সম্পর্কিত তথ্য:</span>
                        </div>
                        <div>
                            <div>
                                <span>(ক) লাইসেন্স প্রদানকারী কর্তৃপক্ষ</span>
                                <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] mx-0.5 align-bottom">
                                    {d.license_authority_1 || ''}
                                </span>
                                <span>লাইসেন্স নম্বর</span>
                                <span className="border-b border-dotted border-gray-600 inline-block min-w-[90px] mx-0.5 align-bottom">
                                    {d.license_number_1 || ''}
                                </span>
                                <span>মেয়াদ</span>
                                <span className="border-b border-dotted border-gray-600 inline-block min-w-[70px] mx-0.5 align-bottom">
                                    {d.license_validity_1 || ''}
                                </span>
                            </div>
                            <div>
                                <span>(খ) লাইসেন্স প্রদানকারী কর্তৃপক্ষ</span>
                                <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] mx-0.5 align-bottom">
                                    {d.license_authority_2 || ''}
                                </span>
                                <span>লাইসেন্স নম্বর</span>
                                <span className="border-b border-dotted border-gray-600 inline-block min-w-[90px] mx-0.5 align-bottom">
                                    {d.license_number_2 || ''}
                                </span>
                                <span>মেয়াদ</span>
                                <span className="border-b border-dotted border-gray-600 inline-block min-w-[70px] mx-0.5 align-bottom">
                                    {d.license_validity_2 || ''}
                                </span>
                            </div>
                            <div>
                                <span>(গ) আয়ের প্রত্যয়ন আছে কি?</span>
                                <span className="mx-1">{d.income_tax_certification === 'yes' ? '☑' : '☐'} হ্যাঁ</span>
                                <span className="mx-1">{d.income_tax_certification === 'no' ? '☑' : '☐'} না;</span>
                                <span>হ্যাঁ হলে, ফটোকপি গ্রহণ করতে হবে।</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="mb-1">
                <div className="flex justify-center items-center">
                    <h3 className="font-bold text-[12px] mb-2 border border-gray-600 px-3 py-1 inline-block mx-auto bg-gray-200">
                        খ. আর্থিক তথ্য বিবরণী সমূহ:
                    </h3>
                </div>

                <div className="space-y-2">
                    {/* ০১. সর্বশেষ ৩ দফার ঋণ গ্রহণ সংক্রান্ত তথ্য */}
                    <div>
                        <span>০১. সদস্য এ' পর্যন্ত </span>
                        <span className="border-b border-dotted border-gray-600 inline-block min-w-[150px] mx-1 align-bottom">
                            {d.total_loans_taken || d.previous_loan_times || ''}
                        </span>
                        <span>দফায় ঋণ গ্রহণ করেছেন। সর্বশেষ ৩ দফার ঋণ গ্রহণ সংক্রান্ত তথ্য:</span>
                        <table className="w-full border-collapse border border-gray-600 text-[12px] mt-1">
                            <thead>
                                <tr className="bg-gray-100 font-semibold text-center">
                                    <td className="border border-gray-600 px-1 py-0.5 w-[26%]">বিবরণ</td>
                                    <td className="border border-gray-600 px-1 py-0.5">দফা নং {d.last_three_loans?.[0]?.loan_number || '...'}</td>
                                    <td className="border border-gray-600 px-1 py-0.5">দফা নং {d.last_three_loans?.[1]?.loan_number || '...'}</td>
                                    <td className="border border-gray-600 px-1 py-0.5">দফা নং {d.last_three_loans?.[2]?.loan_number || '...'}</td>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const loans = ((d.last_three_loans || []) as any[]).slice(0, 3);
                                    const cell = (i: number, v: any) => (
                                        <td className="border border-gray-600 px-1 py-0.5 text-center">
                                            <span className="inline-block min-w-[120px] min-h-[14px]">{v ?? ''}</span>
                                        </td>
                                    );
                                    const l = (i: number) => loans[i] || {};
                                    return (
                                        <>
                                            <tr>
                                                <td className="border border-gray-600 px-1 py-0.5">ঋণ গ্রহণের তারিখ</td>
                                                {cell(0, fmt(l(0).loan_date))}
                                                {cell(1, fmt(l(1).loan_date))}
                                                {cell(2, fmt(l(2).loan_date))}
                                            </tr>

                                            <tr>
                                                <td className="border border-gray-600 px-1 py-0.5">গৃহীত ঋণের পরিমাণ</td>
                                                {cell(0, noDecimal(l(0).loan_amount))}
                                                {cell(1, noDecimal(l(1).loan_amount))}
                                                {cell(2, noDecimal(l(2).loan_amount))}
                                            </tr>
                                            <tr>
                                                <td className="border border-gray-600 px-1 py-0.5">প্রকল্পের নাম</td>
                                                {cell(0, l(0).project_name || '')}
                                                {cell(1, l(1).project_name || '')}
                                                {cell(2, l(2).project_name || '')}
                                            </tr>
                                            <tr>
                                                <td className="border border-gray-600 px-1 py-0.5">সঞ্চয় স্থিতি</td>
                                                {cell(0, l(0).savings_status || '')}
                                                {cell(1, l(1).savings_status || '')}
                                                {cell(2, l(2).savings_status || '')}
                                            </tr>
                                        </>
                                    );
                                })()}
                            </tbody>
                        </table>
                    </div>

                    {/* ০২. অন্যান্য ঋণ গ্রহণ স্থিতি */}
                    <div className="mt-1">
                        <div><span>০২. অন্যান্য উৎস থেকে গৃহীত ঋণের বিবরণ (চলমান ঋণ):</span></div>
                        <table className="w-full border-collapse border border-gray-600 text-[12px] mt-1">
                            <thead>
                                <tr className="font-normal">
                                    <td className="border border-gray-600 px-1 py-0.5 w-[18%]">সংস্থার/প্রতিষ্ঠানের নাম</td>
                                    <td className="border border-gray-600 px-1 py-0.5 w-[18%]">বর্তমান গৃহীত ঋণের পরিমাণ</td>
                                    <td className="border border-gray-600 px-1 py-0.5 w-[12%] text-center">ঋণের মেয়াদ</td>
                                    <td className="border border-gray-600 px-1 py-0.5 w-[20%]">তথ্য প্রদানকারীর নাম</td>
                                    <td className="border border-gray-600 px-1 py-0.5 w-[14%] text-center">মোবাইল নম্বর</td>
                                    <td className="border border-gray-600 px-1 py-0.5 w-[18%]">মন্তব্য</td>
                                </tr>
                            </thead>
                            <tbody>
                                {(['ব্যাংক', 'এনজিও', 'গ্রামীণ বাংলাদেশ', 'আন্তর্জাতিক/বেসরকারি', 'অন্যান্য', '', ''] as string[]).map((label, idx) => (
                                    <tr key={idx}>
                                        <td className="border border-gray-600 px-1 py-0.5">{label}</td>
                                        <td className="border border-gray-600 px-1 py-0.5"><span className="inline-block w-full min-h-[14px]">{d.other_loan_status?.[idx]?.current_status || ''}</span></td>
                                        <td className="border border-gray-600 px-1 py-0.5 text-center"><span className="inline-block w-full min-h-[14px]">{d.other_loan_status?.[idx]?.round || ''}</span></td>
                                        <td className="border border-gray-600 px-1 py-0.5"><span className="inline-block w-full min-h-[14px]">{d.other_loan_status?.[idx]?.borrower_name || ''}</span></td>
                                        <td className="border border-gray-600 px-1 py-0.5 text-center"><span className="inline-block w-full min-h-[14px]">{d.other_loan_status?.[idx]?.mobile || ''}</span></td>
                                        <td className="border border-gray-600 px-1 py-0.5"><span className="inline-block w-full min-h-[14px]">{d.other_loan_status?.[idx]?.remarks || ''}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="mt-1 text-[11px]">* উল্লেখ্য, ব্যাংক বা অন্য কোন প্রতিষ্ঠানিক উৎস এমনকি ব্যাক্তিগতভাবে গৃহীত ধার হলেও উল্লেখ করতে হবে।</div>
                    </div>

                    {/* ০৩. বিনিয়োগের পরিকল্পনা */}
                    <div className="mt-1">
                        <div><span>০৩. বিনিয়োগের পরিকল্পনা:</span></div>
                        <table className="w-full border-collapse border border-gray-600 text-[12px] mt-1">
                            <thead>
                                <tr className="font-normal">
                                    <td className="border border-gray-600 px-1 py-0.5 w-[30%] text-center">বিনিয়োগের খাত</td>
                                    <td className="border border-gray-600 px-1 py-0.5 w-[15%] text-center">টাকার পরিমাণ</td>
                                    <td className="border border-gray-600 px-1 py-0.5 w-[30%] text-center">ঋণের ব্যবহার</td>
                                    <td className="border border-gray-600 px-1 py-0.5 w-[15%] text-center">টাকার পরিমাণ</td>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-gray-600 px-1 py-0.5">সংস্থার অনুমোদনকৃত ঋণে ব্যয়ের পরিমাণ</td>
                                    <td className="border border-gray-600 px-1 py-0.5 text-center">
                                        <span className="inline-block min-w-[80px] min-h-[14px]">{noDecimal(d.invest_plan_applied_amount)}</span>
                                    </td>
                                    <td className="border border-gray-600 px-1 py-0.5">
                                        <div>মূলধনী ব্যয়:</div>
                                        <div className="ml-4">
                                            <span>(ক) যন্ত্রপাতি ক্রয়</span>
                                        </div>
                                        <div className="ml-4">
                                            <span>(খ) গৃহ নির্মাণ</span>
                                        </div>
                                    </td>
                                    <td className="border border-gray-600 px-1 py-0.5 text-center">
                                        <span className="inline-block min-w-[80px] min-h-[14px]">{noDecimal(d.invest_use_capital)}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-600 px-1 py-0.5">নিজস্ব তহবিল</td>
                                    <td className="border border-gray-600 px-1 py-0.5 text-center">
                                        <span className="inline-block min-w-[80px] min-h-[14px]">{noDecimal(d.invest_plan_own_amount)}</span>
                                    </td>
                                    <td className="border border-gray-600 px-1 py-0.5">উদ্যোগ পরিচালনার ব্যয়</td>
                                    <td className="border border-gray-600 px-1 py-0.5 text-center">
                                        <span className="inline-block min-w-[80px] min-h-[14px]">{noDecimal(d.invest_use_running)}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-600 px-1 py-0.5">অন্যান্য উৎস যদি থাকে <span className='text-xs'>(নাম উল্লেখ করতে হবে)</span></td>
                                    <td className="border border-gray-600 px-1 py-0.5 text-center">
                                        <span className="inline-block min-w-[80px] min-h-[14px]">{noDecimal(d.invest_plan_other_amount)}</span>
                                    </td>
                                    <td className="border border-gray-600 px-1 py-0.5">কাচামাল ক্রয় </td>
                                    <td className="border border-gray-600 px-1 py-0.5 text-center">
                                        <span className="inline-block min-w-[80px] min-h-[14px]">{noDecimal(d.invest_use_other)}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-600 px-1 py-0.5 text-center font-semibold">মোট</td>
                                    <td className="border border-gray-600 px-1 py-0.5 text-center">
                                        <span className="inline-block min-w-[80px] min-h-[14px]">{noDecimal(d.invest_plan_total)}</span>
                                    </td>
                                    <td className="border border-gray-600 px-1 py-0.5 text-center font-semibold">মোট</td>
                                    <td className="border border-gray-600 px-1 py-0.5 text-center">
                                        <span className="inline-block min-w-[80px] min-h-[14px]">{noDecimal(d.invest_use_total)}</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div className="text-right mt-2 text-[12px]">২ / ৪</div>
        </div>
    );
}


function renderPage3(d: any) {
    const fmt = formatDateBangla;
    
    // Calculations for Income/Expense
    const exp_emp = Number(d.est_emp_salary) || 0;
    const exp_trans = Number(d.est_transport) || 0;
    const exp_bills = Number(d.est_bills) || 0;
    const exp_rent = Number(d.est_rent) || 0;
    const exp_loan = Number(d.est_loan_charge) || 0;
    const exp_o1 = Number(d.est_other_exp_1_amount) || 0;
    const exp_o2 = Number(d.est_other_exp_2_amount) || 0;
    const exp_o3 = Number(d.est_other_exp_3_amount) || 0;
    const total_exp = exp_emp + exp_trans + exp_bills + exp_rent + exp_loan + exp_o1 + exp_o2 + exp_o3;
    
    const inc_main = Number(d.est_main_income_amount) || 0;
    const inc_other = Number(d.est_other_income_amount) || 0;
    const total_inc = inc_main + inc_other;
    
    const net_profit = total_inc - total_exp;
    const exp_percent = total_inc > 0 ? ((total_exp / total_inc) * 100).toFixed(2) : '0.00';
    const profit_percent = total_inc > 0 ? ((net_profit / total_inc) * 100).toFixed(2) : '0.00';

    const inst_prin = Number(d.installment_principal) || 0;
    const inst_sc = Number(d.installment_service_charge) || 0;
    const inst_total = inst_prin + inst_sc;
    const loan_dur = Number(d.loan_duration_months) || 0;
    const total_payable = inst_total * loan_dur;

    return (
        <div id="preview-page-3" data-sync="page-3" className="bg-white p-4 print:p-0 print:border-none text-[12px] print:text-[11px] print:leading-tight" style={{ pageBreakAfter: 'always' }}>
            <div className="mb-6">
                <h3 className="font-bold mb-3 text-[13px]">০৪. উদ্যোগের ১/১.৫/২ বছর এর সম্ভাব্য আয়-ব্যয় হিসাব:</h3>
                <table className="w-full border-collapse border border-gray-600 mb-3 text-center align-middle">
                    <thead>
                        <tr>
                            <th className="border border-gray-600 p-2 font-semibold w-[35%]">ব্যয়</th>
                            <th className="border border-gray-600 p-2 font-semibold w-[15%]">টাকার পরিমাণ</th>
                            <th className="border border-gray-600 p-2 font-semibold w-[35%]">আয়</th>
                            <th className="border border-gray-600 p-2 font-semibold w-[15%]">টাকার পরিমাণ</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-gray-600 p-2 text-left">
                                উদ্যোগ পরিচালনা ব্যয়:<br/>
                                (ক) কর্মচারীর বেতন ভাতা বাবদ<br/>
                                (খ) পরিবহন বাবদ<br/>
                                (গ) বিভিন্ন বিল বাবদ<br/>
                                (ঘ) ঘর/স্থাপনা ভাড়া বাবদ<br/>
                                (ঙ) ঋণের সার্ভিস চার্জ বাবদ<br/>
                                (চ) {d.est_other_exp_1_name || '.............................................'}<br/>
                                (ছ) {d.est_other_exp_2_name || '.............................................'}<br/>
                                (জ) {d.est_other_exp_3_name || '.............................................'}
                            </td>
                            <td className="border border-gray-600 p-2 align-top pt-5">
                                {d.est_emp_salary || ''}<br/>
                                {d.est_transport || ''}<br/>
                                {d.est_bills || ''}<br/>
                                {d.est_rent || ''}<br/>
                                {d.est_loan_charge || ''}<br/>
                                {d.est_other_exp_1_amount || ''}<br/>
                                {d.est_other_exp_2_amount || ''}<br/>
                                {d.est_other_exp_3_amount || ''}
                            </td>
                            <td className="border border-gray-600 p-2 text-left align-top">
                                উদ্যোগের মূল আয়<br/>
                                (মূল আয়ের খাত উল্লেখ করতে হবে)<br/>
                                <div className="mt-2 text-center underline font-semibold">{d.est_main_income_source || ''}</div>
                                <div className="mt-6 border-t border-gray-600 pt-1">
                                    অন্যান্য আয় (খাত উল্লেখ করতে হবে)<br/>
                                    <div className="mt-1 text-center underline font-semibold">{d.est_other_income_source || ''}</div>
                                </div>
                            </td>
                            <td className="border border-gray-600 p-2 align-top">
                                <br/><br/><br/>{d.est_main_income_amount || ''}
                                <br/><br/><br/><br/>{d.est_other_income_amount || ''}
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-gray-600 p-2 text-left">মোট ব্যয়:</td>
                            <td className="border border-gray-600 p-2">{total_exp || ''}</td>
                            <td className="border border-gray-600 p-2 border-b-0 bg-gray-100"></td>
                            <td className="border border-gray-600 p-2 border-b-0 bg-gray-100"></td>
                        </tr>
                        <tr>
                            <td className="border border-gray-600 p-2 text-left">নিট লাভ/উদ্বৃত্ত</td>
                            <td className="border border-gray-600 p-2">{net_profit || ''}</td>
                            <td className="border border-gray-600 p-2 text-center font-bold">মোট</td>
                            <td className="border border-gray-600 p-2 font-bold">{total_inc || ''}</td>
                        </tr>
                        <tr>
                            <td className="border border-gray-600 p-2 text-center font-bold">মোট</td>
                            <td className="border border-gray-600 p-2 font-bold">{total_exp + net_profit || ''}</td>
                            <td className="border border-gray-600 p-2 bg-gray-100"></td>
                            <td className="border border-gray-600 p-2 bg-gray-100"></td>
                        </tr>
                    </tbody>
                </table>
                <div className="text-[12px] print:text-[11px] mb-6 leading-relaxed">
                    উদ্যোগের মোট আয়ের <span className="underline px-2 font-bold">{exp_percent}</span>% ব্যয় হবে [(মোট ব্যয় ÷ মোট আয়) ১০০%]<br/>
                    উদ্যোগের মোট আয়ের <span className="underline px-2 font-bold">{profit_percent}</span>% নিট লাভ থাকবে [(নিট লাভ ÷ মোট আয়) ১০০%]
                </div>
            </div>

            <div className="mb-6">
                <div className="inline-block border border-gray-600 px-3 py-2 font-bold mb-3 bg-gray-100">গ. অন্যান্য তথ্যাবলী:</div>
                <div className="flex justify-between mb-3">
                    <span>০১. (ক) ঋণের মেয়াদ...<span className="underline font-bold px-2">{d.loan_duration_months || ''} মাস</span>...</span>
                    <span>(খ) আরোপিত ঋণের সার্ভিস চার্জের হার (%)...<span className="underline font-bold px-2">{d.applied_service_charge_rate || ''}%</span>...</span>
                    <span>(গ) ঋণ পরিশোধের তফসিল:</span>
                </div>
                <table className="w-full border-collapse border border-gray-600 mb-6 text-center align-middle">
                    <thead>
                        <tr>
                            <th className="border border-gray-600 p-2 font-semibold">কিস্তির ধরণ</th>
                            <th className="border border-gray-600 p-2 font-semibold">আসল (টাকা)</th>
                            <th className="border border-gray-600 p-2 font-semibold">সার্ভিস চার্জ (টাকা)</th>
                            <th className="border border-gray-600 p-2 font-semibold">মোট (টাকা)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-gray-600 p-2">{d.installment_type || 'মাসিক কিস্তি'}</td>
                            <td className="border border-gray-600 p-2">{d.installment_principal || ''}</td>
                            <td className="border border-gray-600 p-2">{d.installment_service_charge || ''}</td>
                            <td className="border border-gray-600 p-2">{inst_total || ''}</td>
                        </tr>
                        <tr>
                            <td className="border border-gray-600 p-2 text-left pl-2" colSpan={3}>মোট পরিশোধের পরিমাণ</td>
                            <td className="border border-gray-600 p-2 font-bold">{total_payable || ''}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="mb-6">
                <div className="flex justify-between font-bold mb-3">
                    <span>০২. জামিনদারের তথ্য: (ক) ১ম জামিনদার</span>
                    <span className="w-1/2 pl-2">(খ) ২য় জামিনদার</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="border border-dotted border-gray-600 p-2 leading-loose">
                        জামিনদারের নাম: {d.guarantor_1_name || '...........................................'}<br/>
                        ঠিকানা: {d.guarantor_1_address || '......................................................'}<br/>
                        মোবাইল নম্বর: {d.guarantor_1_mobile || '............................................'}<br/>
                        ঋণীর সাথে সম্পর্ক: {d.guarantor_1_relation || '....................'} পেশা: {d.guarantor_1_profession || '......................'}<br/>
                        মাসিক আয়: {d.guarantor_1_monthly_income || '.............'} জামিনদারের সম্পদের পরিমাণ: {d.guarantor_1_assets_amount || '.............'}<br/>
                        সম্ভাব্য মূল্য: {d.guarantor_1_potential_value || '............................................'}<br/>
                        সাক্ষাৎকারীর নাম: {d.guarantor_1_interviewer_name || '.....................'} পদবী: {d.guarantor_1_interviewer_designation || 'বিএম/আরএম/জেডএম'}
                    </div>
                    <div className="border border-dotted border-gray-600 p-2 leading-loose">
                        জামিনদারের নাম: {d.guarantor_2_name || '...........................................'}<br/>
                        ঠিকানা: {d.guarantor_2_address || '......................................................'}<br/>
                        মোবাইল নম্বর: {d.guarantor_2_mobile || '............................................'}<br/>
                        ঋণীর সাথে সম্পর্ক: {d.guarantor_2_relation || '....................'} পেশা: {d.guarantor_2_profession || '......................'}<br/>
                        মাসিক আয়: {d.guarantor_2_monthly_income || '.............'} জামিনদারের সম্পদের পরিমাণ: {d.guarantor_2_assets_amount || '.............'}<br/>
                        সম্ভাব্য মূল্য: {d.guarantor_2_potential_value || '............................................'}<br/>
                        সাক্ষাৎকারীর নাম: {d.guarantor_2_interviewer_name || '.....................'} পদবী: {d.guarantor_2_interviewer_designation || 'বিএম/আরএম/জেডএম'}
                    </div>
                </div>
            </div>

            <div className="mb-0">
                <div className="flex justify-between font-bold mb-3">
                    <span>০৩. ঋণী ও জামিনদার সম্পর্কে তথ্য প্রদানকারী: (ক) ১ম জন</span>
                    <span className="w-1/2 pl-2">(খ) ২য় জন</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="border border-dotted border-gray-600 p-2 leading-loose">
                        তথ্য প্রদানকারীর নাম: {d.informant_1_name || '..........................................'}<br/>
                        ঠিকানা: {d.informant_1_address || '......................................................'}<br/>
                        মোবাইল নম্বর: {d.informant_1_mobile || '............................................'}<br/>
                        ঋণীর সাথে সম্পর্ক: {d.informant_1_relation || '....................'} পেশা: {d.informant_1_profession || '......................'}<br/>
                        ঋণ সংক্রান্ত তথ্য: {d.informant_1_loan_info || '............................................'}<br/>
                        সম্পদ সংক্রান্ত তথ্য: {d.informant_1_asset_info || '.........................................'}<br/>
                        তথ্য প্রদানকারীর সার্বিক মন্তব্য: {d.informant_1_overall_comment || '..................................'}
                    </div>
                    <div className="border border-dotted border-gray-600 p-2 leading-loose">
                        তথ্য প্রদানকারীর নাম: {d.informant_2_name || '..........................................'}<br/>
                        ঠিকানা: {d.informant_2_address || '......................................................'}<br/>
                        মোবাইল নম্বর: {d.informant_2_mobile || '............................................'}<br/>
                        ঋণীর সাথে সম্পর্ক: {d.informant_2_relation || '....................'} পেশা: {d.informant_2_profession || '......................'}<br/>
                        ঋণ সংক্রান্ত তথ্য: {d.informant_2_loan_info || '............................................'}<br/>
                        সম্পদ সংক্রান্ত তথ্য: {d.informant_2_asset_info || '.........................................'}<br/>
                        তথ্য প্রদানকারীর সার্বিক মন্তব্য: {d.informant_2_overall_comment || '..................................'}
                    </div>
                </div>
            </div>
        </div>
    );
}


function renderPage4(d: any) {
    const fmt = formatDateBangla;
    return (
        <div id="preview-page-4" data-sync="page-4" className="bg-white p-4 print:p-0 text-[14px] print:leading-tight">
            <div className="mb-6">
                <div className="font-bold mb-3">০৪. চাকরিজীবীর ক্ষেত্রে (প্রযোজ্য ক্ষেত্রে): <span className="font-normal border-b border-dotted border-gray-600 inline-block min-w-[250px]">{d.employee_workplace_name || ''}</span> মাসিক বেতন: <span className="font-normal border-b border-dotted border-gray-600 inline-block min-w-[250px]">{d.employee_monthly_salary ? fmt(d.employee_monthly_salary) : ''}</span> হাতে প্রাপ্তি: <span className="font-normal border-b border-dotted border-gray-600 inline-block min-w-[250px]">{d.employee_received_in_hand ? fmt(d.employee_received_in_hand) : ''}</span></div>
                <div className="mb-3">অন্যান্য খাতের আয়: <span className="border-b border-dotted border-gray-600 inline-block min-w-[250px]">{d.employee_other_income ? fmt(d.employee_other_income) : ''}</span> কর্মস্থলে ঋণ অনুমোদনকারীর উপস্থিতির তারিখ ও সময়: <span className="border-b border-dotted border-gray-600 inline-block min-w-[250px]">{d.employee_approver_presence_time || ''}</span> সাথে কে ছিলো: <span className="border-b border-dotted border-gray-600 inline-block min-w-[250px]">{d.employee_who_was_with || ''}</span></div>
                <div className="mb-3">যে ব্যাংকে বেতন হয়: <span className="border-b border-dotted border-gray-600 inline-block min-w-[250px]">{d.employee_bank_name || ''}</span> ব্যাংক স্টেটমেন্ট যাচাই অনুযায়ী হাতে বেতন পাওয়ার পরিমাণ: <span className="border-b border-dotted border-gray-600 inline-block min-w-[250px]">{d.employee_salary_per_statement ? fmt(d.employee_salary_per_statement) : ''}</span></div>
            </div>

            <div className="mb-6">
                <div className="font-bold mb-3">০৫. প্রবাসী সদস্যের রেমিটেন্স এর তথ্য (প্রযোজ্য ক্ষেত্রে): <span className="font-normal">মাসিক আয়:</span> <span className="font-normal border-b border-dotted border-gray-600 inline-block min-w-[250px]">{d.expatriate_monthly_income ? fmt(d.expatriate_monthly_income) : ''}</span> যে চ্যানেলে আসে: <span className="font-normal border-b border-dotted border-gray-600 inline-block min-w-[250px]">{d.expatriate_channel || ''}</span></div>
                <div className="mb-3">যা দেখে নিশ্চিত হলেন: <span className="border-b border-dotted border-gray-600 inline-block min-w-[250px]">{d.expatriate_confirmation_method || ''}</span> প্রবাসী সদস্য যে দেশে থাকে: <span className="border-b border-dotted border-gray-600 inline-block min-w-[250px]">{d.expatriate_country || ''}</span> কতো বছর ধরে থাকে: <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px]">{d.expatriate_years_living ? fmt(d.expatriate_years_living) : ''}</span> ওয়ার্কপারমিট যাচাই: <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px]">{d.expatriate_work_permit_checked || ''}</span></div>
            </div>

            <div className="mb-6">
                <span className="font-bold">০৬. প্রকল্পে পরিবেশ ও আইনগত কোনো জটিলতা আছে কি-না? (টিক চিহ্ন দিন)</span> <span className="ml-4">(ক) হ্যাঁ</span> {d.project_environmental_legal_issues === 'হ্যাঁ' ? '✓' : ''} <span className="ml-4">(খ) না</span> {d.project_environmental_legal_issues === 'না' ? '✓' : ''}
            </div>

            <div className="mb-6">
                <div className="font-bold">০৭. ঝুঁকি প্রতিরোধের উপায় (Risk Coverage Measures) লিখুন:-</div>
                <div className="ml-4">
                    (ক) প্রযোজ্য ক্ষেত্রে দুর্যোগ মোকাবিলার অভিজ্ঞতা: (i) আছে {d.risk_disaster_experience === 'আছে' ? '✓' : ''} (ii) নাই {d.risk_disaster_experience === 'নাই' ? '✓' : ''} &nbsp;&nbsp;&nbsp;
                    (খ) প্রযোজ্য ক্ষেত্রে বাকিতে বিক্রয়ের পরিমাণ/হার: (i) আছে {d.risk_credit_sale === 'আছে' ? '✓' : ''} (ii) নাই {d.risk_credit_sale === 'নাই' ? '✓' : ''}
                </div>
            </div>

            <div className="mb-6">
                <span className="font-bold">০৮. ভবিষ্যতে ক্ষুদ্র উদ্যোগ বিষয়ে কি ধরণের পরিকল্পনা রয়েছে?</span> <span className="border-b border-dotted border-gray-600 inline-block min-w-[400px]">{d.future_micro_enterprise_plan || ''}</span>
            </div>

            <div className="mb-6 mt-6">
                <div className="font-bold mb-3">৯. কর্মসংস্থান সংক্রান্ত তথ্য:</div>
                <table className="w-full border-collapse border border-black text-center text-[13px]">
                    <thead>
                        <tr>
                            <th rowSpan={3} className="border border-black font-normal p-2">ঋণ কার্যক্রমের নাম</th>
                            <th colSpan={2} className="border border-black font-normal p-2">স্ব-কর্মসংস্থান/পারিবারিক কর্মসংস্থান</th>
                            <th colSpan={2} className="border border-black font-normal p-2">মজুরি ভিত্তিক কর্মসংস্থান</th>
                            <th colSpan={2} className="border border-black font-normal p-2">মোট</th>
                        </tr>
                        <tr>
                            <th className="border border-black font-normal p-2">পূর্ণকালীন</th>
                            <th className="border border-black font-normal p-2">খণ্ডকালীন</th>
                            <th className="border border-black font-normal p-2">পূর্ণকালীন</th>
                            <th className="border border-black font-normal p-2">খণ্ডকালীন</th>
                            <th rowSpan={2} className="border border-black font-normal p-2 whitespace-nowrap">পূর্ণ সময়<br/>৯ = ১+২+৫+৬</th>
                            <th rowSpan={2} className="border border-black font-normal p-2 whitespace-nowrap">আংশিক সময়<br/>১০ = ৩+৪+৭+৮</th>
                        </tr>
                        <tr>
                            <th className="border border-black p-0 font-normal"><div className="flex"><div className="w-1/2 border-r border-black py-2.5">মহিলা</div><div className="w-1/2 py-2.5">পুরুষ</div></div></th>
                            <th className="border border-black p-0 font-normal"><div className="flex"><div className="w-1/2 border-r border-black py-2.5">মহিলা</div><div className="w-1/2 py-2.5">পুরুষ</div></div></th>
                            <th className="border border-black p-0 font-normal"><div className="flex"><div className="w-1/2 border-r border-black py-2.5">মহিলা</div><div className="w-1/2 py-2.5">পুরুষ</div></div></th>
                            <th className="border border-black p-0 font-normal"><div className="flex"><div className="w-1/2 border-r border-black py-2.5">মহিলা</div><div className="w-1/2 py-2.5">পুরুষ</div></div></th>
                        </tr>
                        <tr>
                            <td className="border border-black bg-gray-100 p-0 text-[13px]"></td>
                            <td className="border border-black bg-gray-100 p-0 text-[13px]"><div className="flex"><div className="w-1/2 border-r border-black py-2.5">১</div><div className="w-1/2 py-2.5">২</div></div></td>
                            <td className="border border-black bg-gray-100 p-0 text-[13px]"><div className="flex"><div className="w-1/2 border-r border-black py-2.5">৩</div><div className="w-1/2 py-2.5">৪</div></div></td>
                            <td className="border border-black bg-gray-100 p-0 text-[13px]"><div className="flex"><div className="w-1/2 border-r border-black py-2.5">৫</div><div className="w-1/2 py-2.5">৬</div></div></td>
                            <td className="border border-black bg-gray-100 p-0 text-[13px]"><div className="flex"><div className="w-1/2 border-r border-black py-2.5">৭</div><div className="w-1/2 py-2.5">৮</div></div></td>
                            <td className="border border-black bg-gray-100 p-0 text-[13px]"></td>
                            <td className="border border-black bg-gray-100 p-0 text-[13px]"></td>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-black p-2">{d.loan_program_name || ''}</td>
                            <td className="border border-black p-0"><div className="flex h-full min-h-[20px]"><div className="w-1/2 border-r border-black py-2">{fmt(d.self_emp_full_female)}</div><div className="w-1/2 py-2">{fmt(d.self_emp_full_male)}</div></div></td>
                            <td className="border border-black p-0"><div className="flex h-full min-h-[20px]"><div className="w-1/2 border-r border-black py-2">{fmt(d.self_emp_part_female)}</div><div className="w-1/2 py-2">{fmt(d.self_emp_part_male)}</div></div></td>
                            <td className="border border-black p-0"><div className="flex h-full min-h-[20px]"><div className="w-1/2 border-r border-black py-2">{fmt(d.wage_emp_full_female)}</div><div className="w-1/2 py-2">{fmt(d.wage_emp_full_male)}</div></div></td>
                            <td className="border border-black p-0"><div className="flex h-full min-h-[20px]"><div className="w-1/2 border-r border-black py-2">{fmt(d.wage_emp_part_female)}</div><div className="w-1/2 py-2">{fmt(d.wage_emp_part_male)}</div></div></td>
                            <td className="border border-black p-2">{ fmt((Number(d.self_emp_full_female||0) + Number(d.self_emp_full_male||0) + Number(d.wage_emp_full_female||0) + Number(d.wage_emp_full_male||0))) }</td>
                            <td className="border border-black p-2">{ fmt((Number(d.self_emp_part_female||0) + Number(d.self_emp_part_male||0) + Number(d.wage_emp_part_female||0) + Number(d.wage_emp_part_male||0))) }</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="flex justify-between items-end mt-16 mb-6 px-4">
                <div className="text-center relative">
                    {d.member?.signature_image_url && <img src={d.member.signature_image_url} alt="Signature" className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-10 object-contain" />}
                    <div className="border-t border-dotted border-gray-600 min-w-[250px] pt-1 text-[14px]">সদস্যের স্বাক্ষর:</div>
                    <div className="mt-1 flex items-center justify-center gap-1">
                        <span className="text-[14px]">সদস্যের মোবাইল নং</span>
                        <div className="flex border border-gray-600">
                            {String(d.member?.mobile_number || '').padEnd(11, ' ').slice(0, 11).split('').map((char, i) => (
                                <div key={i} className={`w-4 h-5 flex items-center justify-center text-[13px] ${i > 0 ? 'border-l border-gray-600' : ''}`}>{char.trim()}</div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="text-center relative">
                    <div className="border-t border-dotted border-gray-600 min-w-[250px] pt-1 text-[14px]">প্রোফাইল পূরণকারীর স্বাক্ষর ও সিল:</div>
                </div>
            </div>

            <div className="border border-black mb-6 w-full md:w-3/4 mx-auto md:mx-0 print:w-[85%] print:mx-auto">
                <div className="text-center font-bold border-b border-black py-2">ঘ. সংস্থার অফিস পর্যায়ে পূরণীয়:</div>
                
                <div className="border-b border-black p-2 min-h-[50px] relative">
                    <div className="font-bold text-[14px]">(ক) অফিসারের পরিদর্শনোত্তর মন্তব্য, স্বাক্ষর ও সিল:</div>
                    <div className="mt-1 text-[14px]">{d.officer_post_inspection_comments || ''}</div>
                    {d.officer_post_inspection_signature && <img src={d.officer_post_inspection_signature} alt="Signature" className="absolute bottom-1 right-1 w-20 h-10 object-contain" />}
                </div>
                
                <div className="border-b border-black p-2 min-h-[50px] relative">
                    <div className="font-bold text-[14px]">(খ) শাখা ব্যবস্থাপকের পরিদর্শনোত্তর মন্তব্য, স্বাক্ষর ও সিল:</div>
                    <div className="mt-1 text-[14px]">{d.branch_manager_post_inspection_comments || ''}</div>
                    {d.branch_manager_post_inspection_signature && <img src={d.branch_manager_post_inspection_signature} alt="Signature" className="absolute bottom-1 right-1 w-20 h-10 object-contain" />}
                </div>

                <div className="border-b border-black p-2 min-h-[50px] relative">
                    <div className="font-bold text-[14px]">(গ) আঞ্চলিক ব্যবস্থাপকের পরিদর্শনোত্তর মন্তব্য, স্বাক্ষর ও সিল:</div>
                    <div className="mt-1 text-[14px]">{d.regional_manager_comments || ''}</div>
                    {d.regional_manager_signature && <img src={d.regional_manager_signature} alt="Signature" className="absolute bottom-1 right-1 w-20 h-10 object-contain" />}
                </div>

                <div className="border-b border-black p-2 min-h-[50px] relative">
                    <div className="font-bold text-[14px]">(ঘ) জোনাল ম্যানেজারের পরিদর্শনোত্তর মন্তব্য, স্বাক্ষর ও সিল:</div>
                    <div className="mt-1 text-[14px]">{d.zonal_manager_comments || ''}</div>
                    {d.zonal_manager_signature && <img src={d.zonal_manager_signature} alt="Signature" className="absolute bottom-1 right-1 w-20 h-10 object-contain" />}
                </div>

                <div className="p-2 min-h-[70px]">
                    <div className="font-bold text-[14px]">(ঙ) সংস্থার চূড়ান্ত অনুমোদনকারীর মন্তব্য ও অনুমোদিত ঋণের বিবরণ:</div>
                    <div className="mt-1 border-b border-dotted border-gray-600 min-h-[20px] text-[14px]">{d.final_approver_comments || ''}</div>
                </div>
            </div>

            <div className="flex justify-between items-end mt-6 px-2 print:mt-10">
                <div>
                    <span className="font-bold">টাকা:</span> <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] font-bold">{d.final_approved_loan_amount_digits ? fmt(d.final_approved_loan_amount_digits) + '/-' : ''}</span>
                    <span className="font-bold ml-4">কথায়:</span> <span className="border-b border-dotted border-gray-600 inline-block min-w-[250px] font-bold">{d.final_approved_loan_amount_words || ''}</span>
                </div>
                <div className="text-center relative">
                    {d.final_approver_signature && <img src={d.final_approver_signature} alt="Signature" className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-10 object-contain" />}
                    <div className="border-t border-dotted border-gray-600 min-w-[250px] pt-1 text-[14px]">চূড়ান্ত অনুমোদনকারীর স্বাক্ষর ও সিল:</div>
                </div>
            </div>
        </div>
    );
}



export default function LoanApplicationApprovalPrint({ formData: d, branch, categoryName: cat }: any) {
    if (!d) return null;
    return (
        <div className="w-[21cm] min-h-[29.7cm] mx-auto bg-white p-8 print:p-0">
            {renderPage1(d, branch, cat)}
            {renderPage2(d, cat)}
            {renderPage3(d)}
            {renderPage4(d)}
        </div>
    );
}