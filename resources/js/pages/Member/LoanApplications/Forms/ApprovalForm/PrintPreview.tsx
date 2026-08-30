import React from 'react';
import { formatDateBangla } from '@/utils/dateUtils';
import { useAutoFitPrint } from '@/hooks/useAutoFitPrint';
import { formatLoanYearsLabel, getReducingServiceChargeRate } from './FormPage3';

const PRINT_FONT = 'Kalpurush, Arial, sans-serif';
const pageFontStyle = { fontFamily: PRINT_FONT, color: '#000' } as const;

const DATE_BOX_COUNT = 8;
const DateDigitBoxes = ({ dateStr }: { dateStr: string }) => {
    // Keep Bangla digits (০-৯); \D would strip them and leave the boxes empty.
    const digits = (dateStr || '').replace(/[^\d০-৯]/g, '').split('');
    const boxes = Array.from({ length: DATE_BOX_COUNT }, (_, i) => digits[i] ?? '');
    return (
        <span className="inline-flex gap-0.5 flex-wrap items-center text-[12px] print:text-[12px]">
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
    const durationLabel = `${formatLoanYearsLabel(d.loan_duration_months)} বছর`;
    const branchName = branch?.name || branch?.branch_name || d.branch_name || '';
    return (
        <div
            id="preview-page-1"
            data-sync="page-1"
            data-print-page="1"
            className="print-page-sheet bg-white border border-gray-300 p-5 print:p-0 print:border-none text-[13px] print:text-[12.5px] print:leading-normal w-full"
            style={{ ...pageFontStyle }}
        >
            <div className="print-page-content flex flex-col justify-between h-full w-full box-border">
                <div className="space-y-2">
                    {/* Header */}
                    <div className="flex flex-col items-center justify-center mb-2 border-b-2 border-gray-500 pb-1.5">
                        <div className="flex items-center gap-3 mb-1">
                            <img src="/logo.png" alt="Logo" className="h-13 w-13 object-contain print:block" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            <div className="text-center">
                                <h1 className="text-[22px] font-bold leading-tight text-black print:text-[20px]">মৌসুমী</h1>
                                <p className="text-[12px] leading-tight print:text-[11.5px] text-gray-800">{branch?.address || d.branch_address || 'উকিলপাড়া, নওগাঁ।'}</p>
                            </div>
                        </div>
                        <p className="text-[12px] print:text-[11.5px] text-gray-800 font-medium">
                            শাখা: <span className="font-semibold">{branchName || ''}</span>
                        </p>
                        <div className="text-center rounded-lg border-2 border-gray-700 px-4 py-0.5 mt-0.5">
                            <h2 className="text-[12.5px] font-bold print:text-[12px]">({cat} ঋণ আবেদন ও অনুমোদনপত্র)</h2>
                        </div>
                    </div>

                    {/* Top 2 columns */}
                    <div className="grid grid-cols-2 gap-x-4 mb-2 text-[12.5px] print:text-[12px]">
                        <div className="flex flex-col gap-1 justify-center">
                            <div className="flex items-center gap-1.5">
                                <span className="font-semibold">আবেদনের তারিখ:</span>
                                <span className="inline-flex items-center"><DateDigitBoxes dateStr={fmt(d.application_date)} /></span>
                            </div>
                            <div><span>বরাবর,</span></div>
                            <div><span className="border-b border-dotted border-gray-600 inline-block min-w-[140px] mx-1 align-bottom font-medium">{d.recipient_to === 'প্রধান নির্বাহী' ? 'নির্বাহী পরিচালক' : (d.recipient_to || '')}</span></div>
                            <div><span className="border-b border-dotted border-gray-600 inline-block min-w-[140px] mx-1 align-bottom font-medium">{d.authority_medium || ''}</span></div>
                            <div><span>মাধ্যম যথাযথ কর্তৃপক্ষ।</span></div>
                        </div>
                        <div className="flex flex-col gap-1.5 border border-dashed border-gray-600 p-2 items-start justify-center rounded text-[12px] print:text-[11.5px]">
                            <div className="flex items-center justify-between w-full">
                                <span className="shrink-0 font-medium">ঋণ অনুমোদনের তারিখ:</span>
                                <DateDigitBoxes dateStr={fmt(d.loan_approval_date)} />
                            </div>
                            <div className="flex items-center justify-between w-full">
                                <span className="shrink-0 font-medium">ঋণ বিতরণের তারিখ:</span>
                                <DateDigitBoxes dateStr={fmt(d.loan_disbursement_date)} />
                            </div>
                            <div className="flex items-center justify-between w-full">
                                <span className="shrink-0 font-medium">ঋণ পরিশোধের তারিখ:</span>
                                <DateDigitBoxes dateStr={fmt(d.loan_repayment_date)} />
                            </div>
                        </div>
                    </div>

                    {/* Intro paragraph */}
                    <div className="leading-relaxed text-[12.5px] print:text-[12px] mb-2">
                        <p>
                            জনাব, আমি নিম্নস্বাক্ষরকারী অত্র সংস্থার আওতাধীন <strong className="border-b border-dotted border-gray-600 px-1">{d.committee_name || '.............'}</strong> সমিতির (সমিতি কোড: <strong className="font-mono border-b border-dotted border-gray-600 px-1">{(d.committee_code || '').length >= 4 ? (d.committee_code || '').slice(4) : (d.committee_code || '.....')}</strong>) একজন <strong className="underline underline-offset-2">{(d.member_type === 'old' ? 'পুরাতন' : 'নতুন')}</strong> সদস্য।{d.member_type === 'old' ? ` দফা: ${d.years_involved || '......'}।` : ''} বর্তমানে আমার ব্যবসা পরিচালনা ও পরিধি বৃদ্ধির লক্ষ্যে <strong className="px-0.5">{cat}</strong> কর্মসূচির আওতায় ঋণ গ্রহণ করতে ইচ্ছুক। এমতাবস্থায় ঋণ গ্রহণার্থে প্রয়োজনীয় তথ্যাবলি নিম্নে প্রদান করলাম:
                        </p>
                    </div>

                    {/* Form items 1 - 20 */}
                    <div className="space-y-1.5 text-[12.5px] print:text-[12px] leading-normal">
                        <div data-sync="item-1" className="flex flex-wrap items-baseline gap-x-3">
                            <span>১. আবেদনকারীর নাম: <strong className="border-b border-dotted border-gray-600 inline-block min-w-[150px]">{d.member_name_detail || d.applicant_name_bn || d.member_name || ''}</strong></span>
                            <span>সদস্য কোড: <strong className="font-mono border-b border-dotted border-gray-600 inline-block min-w-[80px]">{d.member_code || ''}</strong></span>
                            <span>বয়স: <strong className="border-b border-dotted border-gray-600 inline-block min-w-[35px] text-center">{d.age ?? ''}</strong> বছর</span>
                        </div>
                        <div data-sync="item-2">
                            <span>২. পিতা/স্বামীর নাম: <span className="border-b border-dotted border-gray-600 inline-block min-w-[220px] font-medium">{d.father_husband_name || ''}</span></span>
                        </div>
                        <div data-sync="item-3" className="space-y-1">
                            <span>৩. ঠিকানা:</span>
                            <div className="ml-3 pl-2 border-l-2 border-gray-300 space-y-1">
                                <div className="flex flex-wrap items-baseline gap-x-2">
                                    <span>ক) স্থায়ী: গ্রাম/মহল্লা: <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] font-medium">{d.permanent_address_line1 || ''}</span></span>
                                    <span>পোস্ট: <span className="border-b border-dotted border-gray-600 inline-block min-w-[60px] font-medium">{d.permanent_address_line2 || ''}</span></span>
                                    <span>উপজেলা: <span className="border-b border-dotted border-gray-600 inline-block min-w-[90px] font-medium">{d.permanent_address_line3?.split(',')[0]?.trim() || ''}</span></span>
                                    <span>জেলা: <span className="border-b border-dotted border-gray-600 inline-block min-w-[90px] font-medium">{d.permanent_address_line3?.split(',')[1]?.trim() || ''}</span></span>
                                </div>
                                <div className="flex flex-wrap items-baseline gap-x-2">
                                    <span>খ) বর্তমান: গ্রাম/মহল্লা: <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] font-medium">{d.current_address_line1 || ''}</span></span>
                                    <span>পোস্ট: <span className="border-b border-dotted border-gray-600 inline-block min-w-[60px] font-medium">{d.current_address_line2 || ''}</span></span>
                                    <span>উপজেলা: <span className="border-b border-dotted border-gray-600 inline-block min-w-[90px] font-medium">{d.current_address_line3?.split(',')[0]?.trim() || ''}</span></span>
                                    <span>জেলা: <span className="border-b border-dotted border-gray-600 inline-block min-w-[90px] font-medium">{d.current_address_line3?.split(',')[1]?.trim() || ''}</span></span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 pt-0.5">
                            <span>৪. NID/Smart Card No:</span>
                            <span className="inline-flex gap-0.5">
                                {Array.from({ length: Math.max(nidDigits.length, 10) }, (_, i) => (
                                    <span key={i} className="border border-gray-500 w-4 h-4.5 inline-flex items-center justify-center font-mono text-[12px] leading-none">{nidDigits[i] ?? ''}</span>
                                ))}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-baseline gap-x-3">
                            <span>৫. পেশা: <span className="border-b border-dotted border-gray-600 inline-block min-w-[110px] font-medium">{d.occupation || ''}</span></span>
                            <span>৬. শিক্ষাগত যোগ্যতা: <span className="border-b border-dotted border-gray-600 inline-block min-w-[110px] font-medium">{d.educational_qualification || ''}</span></span>
                        </div>
                        <div className="flex flex-wrap items-baseline gap-x-3">
                            <span>৭. সমিতিতে ভর্তির তারিখ: <span className="border-b border-dotted border-gray-600 inline-block min-w-[85px] font-medium">{fmt(d.admission_date)}</span></span>
                            <span>৮. পরিবারের মোট সদস্য: <span className="border-b border-dotted border-gray-600 inline-block min-w-[35px] text-center font-medium">{d.family_members_count ?? ''}</span></span>
                            <span>৯. উপার্জনক্ষম সদস্য: <span className="border-b border-dotted border-gray-600 inline-block min-w-[35px] text-center font-medium">{d.earning_members_count ?? ''}</span></span>
                        </div>
                        {d.member_type === 'old' && (
                            <div className="flex flex-wrap items-baseline gap-x-2.5">
                                <span>১০. পূর্বে গৃহীত ঋণ: <span className="border-b border-dotted border-gray-600 inline-block min-w-[45px] text-center font-medium">{d.previous_loan_times || ''}</span> বার</span>
                                <span>মোট: <span className="border-b border-dotted border-gray-600 inline-block min-w-[75px] font-medium">{noDecimal(d.previous_loan_amount)}</span> ৳</span>
                                <span>১১. সর্বশেষ পরিশোধ: <span className="border-b border-dotted border-gray-600 inline-block min-w-[75px] font-medium">{noDecimal(d.last_repaid_loan_amount)}</span> ৳</span>
                                <span>১২. প্রকল্প: <span className="border-b border-dotted border-gray-600 inline-block min-w-[100px] font-medium">{d.last_repaid_project_name || ''}</span></span>
                            </div>
                        )}
                        <div data-sync="item-13" className="flex flex-wrap items-baseline gap-x-2">
                            <span>১৩. সাধারণ সঞ্চয়: <span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] text-center font-medium">{dofaLabel(d.loan_round)}</span></span>
                            <span>মোট সঞ্চয়: <strong className="border-b border-dotted border-gray-600 inline-block min-w-[70px] font-semibold">{noDecimal(d.savings_amount)}</strong> ৳</span>
                            <span>সাধারণ: <span className="border-b border-dotted border-gray-600 inline-block min-w-[70px] font-medium">{noDecimal(d.general_savings_amount)}</span> ৳</span>
                            <span>সঞ্চয়ের বিপরীতে: <span className="border-b border-dotted border-gray-600 inline-block min-w-[28px] text-center font-medium">{d.is_against_savings ? 'হ্যাঁ' : 'না'}</span></span>
                            {d.is_against_savings && d.against_savings_amount != null && d.against_savings_amount !== '' && (
                                <span>(পরিমাণ: <span className="border-b border-dotted border-gray-600 inline-block min-w-[60px] font-medium">{noDecimal(d.against_savings_amount)}</span> ৳)</span>
                            )}
                        </div>
                        <div className="flex flex-wrap items-baseline gap-x-3">
                            <span>১৪. ঋণ প্রস্তাবনার তারিখ: <span className="border-b border-dotted border-gray-600 inline-block min-w-[85px] font-medium">{fmt(d.loan_proposal_date)}</span></span>
                            <span>১৫. প্রকল্পের নাম: <strong className="border-b border-dotted border-gray-600 inline-block min-w-[120px]">{d.project_name || d.proposed_project_name || ''}</strong></span>
                            <span>১৬. জনবল: <span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] text-center font-medium">{d.project_manpower || ''}</span> জন</span>
                        </div>
                        <div className="flex flex-wrap items-baseline gap-x-3">
                            <span>১৭. সম্ভাব্য আয় ({durationLabel}): <span className="border-b border-dotted border-gray-600 inline-block min-w-[70px] font-medium">{noDecimal(d.project_income_1_2_yr)}</span> ৳</span>
                            <span>১৮. সম্ভাব্য ব্যয় ({durationLabel}): <span className="border-b border-dotted border-gray-600 inline-block min-w-[70px] font-medium">{noDecimal(d.project_expense_1_2_yr)}</span> ৳</span>
                            <span>১৯. নিট লাভ ({durationLabel}): <strong className="border-b border-dotted border-gray-600 inline-block min-w-[75px]">{noDecimal(d.annual_net_profit)}</strong> ৳</span>
                        </div>
                        <div className="flex flex-wrap items-baseline gap-x-3">
                            <span>২০. মোট মূলধন: <strong className="border-b border-dotted border-gray-600 inline-block min-w-[80px]">{noDecimal(d.capital_total || (Number(d.capital_own || 0) + Number(d.capital_applied_loan || 0)))}</strong> ৳</span>
                            <span>(ক) নিজস্ব: <span className="border-b border-dotted border-gray-600 inline-block min-w-[70px] font-medium">{noDecimal(d.capital_own)}</span> ৳</span>
                            <span>(খ) আবেদনকৃত ঋণ: <strong className="border-b border-dotted border-gray-600 inline-block min-w-[80px] text-emerald-900">{noDecimal(d.capital_applied_loan)}</strong> ৳</span>
                        </div>
                    </div>

                    {/* 21. Family Assets Table */}
                    <div data-sync="item-21" className="mt-2 mb-2">
                        <p className="font-bold text-[12.5px] print:text-[12px] mb-1">২১. পারিবারিক সম্পদ (স্থাবর ও অস্থাবর)</p>
                        <table className="w-full border-collapse border border-gray-600 text-[12px] print:text-[11.5px]">
                            <thead>
                                <tr className="bg-gray-100/70 text-[11.5px] print:text-[11px]">
                                    <th className="border border-gray-600 px-2 py-1">সম্পদের পরিমাণ (স্থাবর)</th>
                                    <th className="border border-gray-600 px-2 py-1">আনুমানিক মূল্য (৳)</th>
                                    <th className="border border-gray-600 px-2 py-1">সম্পদের বিবরণ (অস্থাবর)</th>
                                    <th className="border border-gray-600 px-2 py-1">আনুমানিক মূল্য (৳)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {((d.family_assets || []) as any[]).map((row, idx) => (
                                    <tr key={idx}>
                                        <td className="border border-gray-600 px-2 py-1">{noDecimal(row.fixed_quantity)}</td>
                                        <td className="border border-gray-600 px-2 py-1 text-center font-medium">{noDecimal(row.fixed_value)}</td>
                                        <td className="border border-gray-600 px-2 py-1">{row.movable_desc || ''}</td>
                                        <td className="border border-gray-600 px-2 py-1 text-center font-medium">{noDecimal(row.movable_value)}</td>
                                    </tr>
                                ))}
                                <tr className="font-bold bg-gray-100/60">
                                    <td className="border border-gray-600 px-2 py-1">মোট</td>
                                    <td className="border border-gray-600 px-2 py-1 text-center">{(() => {
                                        const total = ((d.family_assets || []) as any[]).reduce((s, r) => s + (Number(String(r.fixed_value || '').replace(/[^\d.-]/g, '')) || 0), 0);
                                        return total ? String(total) : '';
                                    })()}</td>
                                    <td className="border border-gray-600 px-2 py-1">মোট</td>
                                    <td className="border border-gray-600 px-2 py-1 text-center">{(() => {
                                        const total = ((d.family_assets || []) as any[]).reduce((s, r) => s + (Number(String(r.movable_value || '').replace(/[^\d.-]/g, '')) || 0), 0);
                                        return total ? String(total) : '';
                                    })()}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Declaration */}
                    <div className="text-[12px] print:text-[11.5px] leading-relaxed mt-2">
                        <p>
                            উল্লিখিত তথ্যাবলি সঠিক। আমার আবেদনকৃত <strong className="border-b border-dotted border-gray-600 inline-block min-w-[80px] text-center font-bold">{noDecimal(d.approval_amount_digits || d.capital_applied_loan)}</strong> টাকা <strong className="px-0.5">{cat}</strong> কর্মসূচির আওতায় ঋণ প্রদান করলে সংস্থার যাবতীয় নিয়ম-কানুন মেনে নির্ধারিত তারিখে ঋণের কিস্তি পরিশোধ করবো।
                        </p>
                        <div className="flex justify-end mt-2 flex-col items-end">
                            <div className="border-b border-dotted border-gray-600 w-44 min-h-[18px]" />
                            <span className="text-[11px] text-gray-700 font-medium mt-0.5">আবেদনকারীর স্বাক্ষর</span>
                        </div>
                    </div>

                    {/* Officer Signatures */}
                    <div className="grid grid-cols-2 gap-3 my-2">
                        <div className="border border-gray-600 p-2 text-center rounded">
                            <p className="text-[11px] font-bold">অফিসারের স্বাক্ষর ও সিল</p>
                            <div className="border-b border-dotted border-gray-500 min-h-[28px] mt-1"></div>
                        </div>
                        <div className="border border-gray-600 p-2 text-center rounded">
                            <p className="text-[11px] font-bold">শাখা ব্যবস্থাপকের স্বাক্ষর ও সিল</p>
                            <div className="border-b border-dotted border-gray-500 min-h-[28px] mt-1"></div>
                        </div>
                    </div>

                    {/* Approval Statement */}
                    <div className="text-[12px] print:text-[11.5px] leading-relaxed my-2">
                        <p>
                            আবেদনকারীর যাবতীয় তথ্যাদি সরেজমিনে যাচাই সাপেক্ষে উক্ত প্রকল্পে <strong className="border-b border-dotted border-gray-600 inline-block min-w-[80px] text-center font-bold">{noDecimal(d.approval_amount_digits || d.capital_applied_loan)}</strong> (কথায় <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] font-medium">{d.approval_amount_words || numberToWordsBangla(d.approval_amount_digits || d.capital_applied_loan)}</span>) টাকা ঋণ বিতরণের জন্য অনুমোদন করা হলো।
                        </p>
                    </div>

                    {/* Approver Signature */}
                    <div className="flex justify-end mt-2 flex-col items-end">
                        <div className="border-b border-dotted border-gray-600 w-48 min-h-[22px]" />
                        <span className="text-[11.5px] font-bold text-gray-800 mt-0.5">অনুমোদনকারীর স্বাক্ষর ও সিল</span>
                    </div>
                </div>

                {/* Page Number */}
                <div className="text-right mt-2 text-[12px] text-gray-600 font-mono">১ / ৪</div>
            </div>
        </div>
    );
}

function renderPage2(d: any, categoryName?: string) {
    const cat = categoryName || d.category_name || 'ঋণ';
    const fmt = formatDateBangla;
    return (
        <div
            id="preview-page-2"
            data-sync="page-2"
            data-print-page="2"
            className="print-page-sheet bg-white border border-gray-300 p-5 print:p-0 print:border-none text-[13.5px] print:text-[13px] print:leading-normal"
            style={{ ...pageFontStyle }}
        >
            <div className="print-page-content flex flex-col justify-between h-full">
                <div>
                    {/* Header */}
                    <div className="flex justify-center mb-1">
                        <div className="inline-block text-center rounded-lg border-2 border-gray-600 px-3 py-1">
                            <h2 className="text-[12px] font-bold print:text-[12px]">{cat} ঋণের প্রোফাইল</h2>
                        </div>
                    </div>

                    {/* Section ক */}
                    <div className="mb-1">
                        <div className="flex justify-center items-center">
                            <h3 className="font-bold text-[12px] mb-2 border border-gray-600 px-3 py-1 inline-block mx-auto bg-gray-50">
                                ক. উদ্যোগ বিষয়ক সাধারণ তথ্যাবলী:
                            </h3>
                        </div>
                        <div className="space-y-2">
                            <div><span>১. প্রস্তাবিত প্রকল্পের নাম:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[300px] ml-1 align-bottom">{d.proposed_project_name || d.project_name || ''}</span></div>
                            <div><span>২. উদ্যোক্তাদের সংশ্লিষ্টতা-</span>
                                <div className="ml-4 mt-1">
                                    <div><span>(ক) সার্বক্ষণিক: কতোদিন কাজটিতে নিযুক্ত আছে</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom text-center">{d.entrepreneur_fulltime_years || ''}</span> বছর, <span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom text-center">{d.entrepreneur_fulltime_months || ''}</span> মাস</div>
                                    <div><span>(খ) খণ্ডকালীন: কতোদিন কাজটিতে নিযুক্ত আছে</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom text-center">{d.entrepreneur_parttime_years || ''}</span> বছর, <span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom text-center">{d.entrepreneur_parttime_months || ''}</span> মাস</div>
                                </div>
                            </div>
                            <div><span>৩. ঋণ কার্যক্রমে উদ্যোক্তার অভিজ্ঞতা:</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom text-center">{d.loan_experience_years || ''}</span> বছর, <span className="border-b border-dotted border-gray-600 inline-block min-w-[40px] mx-1 align-bottom text-center">{d.loan_experience_months || ''}</span> মাস</div>
                            <div>
                                <div>
                                    <span>৪. প্রকল্পে নিয়োগকৃত জনবল</span>
                                    <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] mx-1 align-bottom text-center">
                                        {d.project_manpower_total || d.project_manpower || ''}
                                    </span>
                                    <span>জন।</span>
                                </div>
                                <div className="ml-4 mt-1 flex flex-wrap gap-x-4">
                                    <div>
                                        <span>(ক) পরিবারের মধ্যে</span>
                                        <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] mx-1 align-bottom text-center">
                                            {d.project_manpower_family || ''}
                                        </span>
                                        <span>জন</span>
                                    </div>
                                    <div>
                                        <span>(খ) পরিবারের বাইরে</span>
                                        <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] mx-1 align-bottom text-center">
                                            {d.project_manpower_outside || ''}
                                        </span>
                                        <span>জন</span>
                                    </div>
                                    <div>
                                        <span>(গ) প্রশিক্ষণপ্রাপ্ত লোকবল</span>
                                        <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px] mx-1 align-bottom text-center">
                                            {d.project_manpower_trained || ''}
                                        </span>
                                        <span>জন</span>
                                    </div>
                                </div>
                            </div>

                            {/* ৫. কাঁচামাল ও বাজারজাতকরণ */}
                            <div>
                                <div><span>৫. উৎপাদন ও বাজারজাতকরণ সংক্রান্ত তথ্য:</span></div>
                                <table className="w-full border-collapse border border-gray-600 text-[12px] mt-1">
                                    <tbody>
                                        <tr>
                                            <td className="w-1/2 border border-gray-600 px-1.5 py-1 align-top">
                                                ব্যবহৃত কাঁচামাল ক্রয়ের স্থান (নাম ও ঠিকানাসহ):
                                            </td>
                                            <td className="w-1/2 border border-gray-600 px-2 py-1 break-words">
                                                {d.raw_material_purchase_location || ''}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="w-1/2 border border-gray-600 px-1.5 py-1 align-top">
                                                উৎপাদিত পণ্য বাজারজাতকরণের স্থান কোথায়? (নাম ও ঠিকানাসহ):
                                            </td>
                                            <td className="w-1/2 border border-gray-600 px-2 py-1 break-words">
                                                {d.product_marketing_location || ''}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* ৬. ১ বছরের আর্থিক তথ্য */}
                            <div className="mt-2">
                                <div><span>৬. বিগত ০১ বছরের আর্থিক তথ্য:</span></div>
                                <table className="w-full border-collapse border border-gray-600 text-[12px] mt-1">
                                    <thead>
                                        <tr className="bg-gray-50 font-normal">
                                            <td className="border border-gray-600 px-1 py-0.5 text-center font-semibold">পুঁজির পরিমাণ</td>
                                            <td className="border border-gray-600 px-1 py-0.5 text-center font-semibold">বিক্রয় (সারা বছর)</td>
                                            <td className="border border-gray-600 px-1 py-0.5 text-center font-semibold">মোট লাভ/ক্ষতি</td>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="border border-gray-600 px-2 py-0.5 text-center">
                                                <span className="inline-block min-w-[120px]">{noDecimal(d.last_year_capital)}</span>
                                            </td>
                                            <td className="border border-gray-600 px-2 py-0.5 text-center">
                                                <span className="inline-block min-w-[120px]">{noDecimal(d.last_year_sales)}</span>
                                            </td>
                                            <td className="border border-gray-600 px-2 py-0.5 text-center">
                                                <span className="inline-block min-w-[120px]">{noDecimal(d.last_year_profit_loss)}</span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* ৭. লাইসেন্স */}
                            <div className="mt-2 space-y-1">
                                <div><span>৭. প্রযোজ্য ক্ষেত্রে ট্রেড লাইসেন্স ও অন্যান্য লাইসেন্স এবং আয়ের প্রমাণ সম্পর্কিত তথ্য:</span></div>
                                <div>
                                    <div>
                                        <span>(ক) লাইসেন্স প্রদানকারী কর্তৃপক্ষ</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] mx-0.5 align-bottom">{d.license_authority_1 || ''}</span>
                                        <span>লাইসেন্স নম্বর</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[90px] mx-0.5 align-bottom">{d.license_number_1 || ''}</span>
                                        <span>মেয়াদ</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[70px] mx-0.5 align-bottom">{d.license_validity_1 || ''}</span>
                                    </div>
                                    <div>
                                        <span>(খ) লাইসেন্স প্রদানকারী কর্তৃপক্ষ</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] mx-0.5 align-bottom">{d.license_authority_2 || ''}</span>
                                        <span>লাইসেন্স নম্বর</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[90px] mx-0.5 align-bottom">{d.license_number_2 || ''}</span>
                                        <span>মেয়াদ</span><span className="border-b border-dotted border-gray-600 inline-block min-w-[70px] mx-0.5 align-bottom">{d.license_validity_2 || ''}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span>(গ) আয়ের প্রত্যয়ন আছে কি?</span>
                                        <span>{d.income_tax_certification === 'yes' ? '☑' : '☐'} হ্যাঁ</span>
                                        <span>{d.income_tax_certification === 'no' ? '☑' : '☐'} না;</span>
                                        <span className="text-gray-700">হ্যাঁ হলে, ফটোকপি গ্রহণ করতে হবে।</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section খ */}
                    <div className="mb-0">
                        <div className="flex justify-center items-center">
                            <h3 className="font-bold text-[12px] mb-2 border border-gray-600 px-3 py-1 inline-block mx-auto bg-gray-100">
                                খ. আর্থিক তথ্য বিবরণী সমূহ:
                            </h3>
                        </div>

                        <div className="space-y-2">
                            {/* ০১. সর্বশেষ ৩ দফার ঋণ */}
                            <div>
                                <span>০১. সদস্য এ' পর্যন্ত </span>
                                <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px] mx-1 align-bottom text-center font-bold">
                                    {d.total_loans_taken || d.previous_loan_times || ''}
                                </span>
                                <span>দফায় ঋণ গ্রহণ করেছেন। সর্বশেষ ৩ দফার ঋণ গ্রহণ সংক্রান্ত তথ্য:</span>
                                <table className="w-full border-collapse border border-gray-600 text-[12px] mt-1">
                                    <thead>
                                        <tr className="bg-gray-50 font-semibold text-center">
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
                                                    <span className="inline-block min-w-[100px] min-h-[14px]">{v ?? ''}</span>
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

                            {/* ০২. অন্যান্য ঋণ স্থিতি */}
                            <div className="mt-1">
                                <div><span>০২. অন্যান্য উৎস থেকে গৃহীত ঋণের বিবরণ (চলমান ঋণ):</span></div>
                                <table className="w-full border-collapse border border-gray-600 text-[11px] mt-1">
                                    <thead>
                                        <tr className="bg-gray-50 font-semibold text-center">
                                            <td className="border border-gray-600 px-1 py-0.5 w-[18%]">সংস্থার/প্রতিষ্ঠানের নাম</td>
                                            <td className="border border-gray-600 px-1 py-0.5 w-[18%]">বর্তমান গৃহীত পরিমাণ</td>
                                            <td className="border border-gray-600 px-1 py-0.5 w-[12%] text-center">ঋণের মেয়াদ</td>
                                            <td className="border border-gray-600 px-1 py-0.5 w-[20%]">তথ্য প্রদানকারীর নাম</td>
                                            <td className="border border-gray-600 px-1 py-0.5 w-[14%] text-center">মোবাইল নম্বর</td>
                                            <td className="border border-gray-600 px-1 py-0.5 w-[18%]">মন্তব্য</td>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(['ব্যাংক', 'এনজিও', 'গ্রামীণ বাংলাদেশ', 'আন্তর্জাতিক/বেসরকারি', 'অন্যান্য', '', ''] as string[]).map((label, idx) => (
                                            <tr key={idx}>
                                                <td className="border border-gray-600 px-1 py-0.5">{d.other_loan_status?.[idx]?.source_name || label}</td>
                                                <td className="border border-gray-600 px-1 py-0.5 text-center"><span className="inline-block w-full min-h-[14px]">{d.other_loan_status?.[idx]?.current_status || ''}</span></td>
                                                <td className="border border-gray-600 px-1 py-0.5 text-center"><span className="inline-block w-full min-h-[14px]">{d.other_loan_status?.[idx]?.round || ''}</span></td>
                                                <td className="border border-gray-600 px-1 py-0.5"><span className="inline-block w-full min-h-[14px]">{d.other_loan_status?.[idx]?.borrower_name || ''}</span></td>
                                                <td className="border border-gray-600 px-1 py-0.5 text-center font-mono text-[10px]"><span className="inline-block w-full min-h-[14px]">{d.other_loan_status?.[idx]?.mobile || ''}</span></td>
                                                <td className="border border-gray-600 px-1 py-0.5"><span className="inline-block w-full min-h-[14px]">{d.other_loan_status?.[idx]?.remarks || ''}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* ০৩. বিনিয়োগের পরিকল্পনা */}
                            <div className="mt-1">
                                <div><span>০৩. বিনিয়োগের পরিকল্পনা:</span></div>
                                <table className="w-full border-collapse border border-gray-600 text-[12px] mt-1">
                                    <thead>
                                        <tr className="bg-gray-50 font-semibold text-center">
                                            <td className="border border-gray-600 px-1 py-0.5 w-[30%]">বিনিয়োগের খাত</td>
                                            <td className="border border-gray-600 px-1 py-0.5 w-[15%]">টাকার পরিমাণ</td>
                                            <td className="border border-gray-600 px-1 py-0.5 w-[35%]">ঋণের ব্যবহার</td>
                                            <td className="border border-gray-600 px-1 py-0.5 w-[20%]">টাকার পরিমাণ</td>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="border border-gray-600 px-1 py-0.5">সংস্থার অনুমোদনকৃত ঋণে ব্যয়ের পরিমাণ</td>
                                            <td className="border border-gray-600 px-1 py-0.5 text-center font-semibold">
                                                <span className="inline-block min-w-[80px]">{noDecimal(d.invest_plan_applied_amount)}</span>
                                            </td>
                                            <td className="border border-gray-600 px-1 py-0.5">
                                                <div>মূলধনী ব্যয়: (ক) যন্ত্রপাতি ক্রয় (খ) গৃহ নির্মাণ</div>
                                            </td>
                                            <td className="border border-gray-600 px-1 py-0.5 text-center">
                                                <span className="inline-block min-w-[80px]">{noDecimal(d.invest_use_capital)}</span>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="border border-gray-600 px-1 py-0.5">নিজস্ব তহবিল</td>
                                            <td className="border border-gray-600 px-1 py-0.5 text-center font-semibold">
                                                <span className="inline-block min-w-[80px]">{noDecimal(d.invest_plan_own_amount)}</span>
                                            </td>
                                            <td className="border border-gray-600 px-1 py-0.5">উদ্যোগ পরিচালনার ব্যয়</td>
                                            <td className="border border-gray-600 px-1 py-0.5 text-center">
                                                <span className="inline-block min-w-[80px]">{noDecimal(d.invest_use_running)}</span>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="border border-gray-600 px-1 py-0.5">অন্যান্য উৎস (যদি থাকে)</td>
                                            <td className="border border-gray-600 px-1 py-0.5 text-center font-semibold">
                                                <span className="inline-block min-w-[80px]">{noDecimal(d.invest_plan_other_amount)}</span>
                                            </td>
                                            <td className="border border-gray-600 px-1 py-0.5">কাঁচামাল ক্রয়</td>
                                            <td className="border border-gray-600 px-1 py-0.5 text-center">
                                                <span className="inline-block min-w-[80px]">{noDecimal(d.invest_use_other)}</span>
                                            </td>
                                        </tr>
                                        <tr className="font-bold bg-gray-50">
                                            <td className="border border-gray-600 px-1 py-0.5 text-center">মোট</td>
                                            <td className="border border-gray-600 px-1 py-0.5 text-center">
                                                <span className="inline-block min-w-[80px]">{noDecimal(d.invest_plan_total)}</span>
                                            </td>
                                            <td className="border border-gray-600 px-1 py-0.5 text-center">মোট</td>
                                            <td className="border border-gray-600 px-1 py-0.5 text-center">
                                                <span className="inline-block min-w-[80px]">{noDecimal(d.invest_use_total)}</span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Page Number */}
                <div className="text-right mt-2 text-[12px] text-gray-600 font-mono">২ / ৪</div>
            </div>
        </div>
    );
}

function renderPage3(d: any) {
    const fmt = formatDateBangla;

    const months = Number(d.loan_duration_months) || 0;
    const years = months > 0 ? months / 12 : 0;
    const yearsEng = years > 0
        ? (Number.isInteger(years) ? String(years) : String(Math.round(years * 10) / 10))
        : '১/১.৫/২';
    const banglaMap: Record<string, string> = {
        '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
        '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯',
    };
    const yearsLabel = yearsEng.replace(/[0-9]/g, (digit: string) => banglaMap[digit] ?? digit);

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
    const inst_total = Number(d.installment_total) || (inst_prin + inst_sc);
    const loan_dur = Number(d.loan_duration_months) || 0;
    const installment_count = Number(d.number_of_installments) || loan_dur;
    const last_inst = Number(d.last_installment_amount) || inst_total;
    const total_principal = Number(d.total_principal)
        || Number(d.invest_plan_applied_amount)
        || Number(d.capital_applied_loan)
        || Number(d.approval_amount_digits)
        || 0;
    const total_sc = Number(d.total_service_charge)
        || Math.max(0, (Number(d.total_payable) || 0) - total_principal)
        || (inst_sc * installment_count);
    const total_payable = Number(d.total_payable)
        || (total_principal + total_sc)
        || (installment_count > 1
            ? inst_total * (installment_count - 1) + last_inst
            : inst_total);

    return (
        <div
            id="preview-page-3"
            data-sync="page-3"
            data-print-page="3"
            className="print-page-sheet bg-white border border-gray-300 p-5 print:p-0 print:border-none text-[13.5px] print:text-[13px] print:leading-normal"
            style={{ ...pageFontStyle }}
        >
            <div className="print-page-content flex flex-col justify-between h-full">
                <div>
                    {/* ০৪. সম্ভাব্য আয়-ব্যয় হিসাব */}
                    <div className="mb-3">
                        <h3 className="font-bold mb-2 text-[13px]">০৪. উদ্যোগের {yearsLabel} বছর এর সম্ভাব্য আয়-ব্যয় হিসাব:</h3>
                        <table className="w-full border-collapse border border-gray-600 text-center align-middle text-[12px]">
                            <thead>
                                <tr className="bg-gray-50 font-semibold">
                                    <th className="border border-gray-600 p-1.5 w-[35%]">ব্যয়</th>
                                    <th className="border border-gray-600 p-1.5 w-[15%]">টাকার পরিমাণ</th>
                                    <th className="border border-gray-600 p-1.5 w-[35%]">আয়</th>
                                    <th className="border border-gray-600 p-1.5 w-[15%]">টাকার পরিমাণ</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-gray-600 p-2 text-left leading-normal">
                                        উদ্যোগ পরিচালনা ব্যয়:<br />
                                        (ক) কর্মচারীর বেতন ভাতা বাবদ<br />
                                        (খ) পরিবহন বাবদ<br />
                                        (গ) বিভিন্ন বিল বাবদ<br />
                                        (ঘ) ঘর/স্থাপনা ভাড়া বাবদ<br />
                                        (ঙ) ঋণের সার্ভিস চার্জ বাবদ<br />
                                        (চ) {d.est_other_exp_1_name || '.............................................'}<br />
                                        (ছ) {d.est_other_exp_2_name || '.............................................'}<br />
                                        (জ) {d.est_other_exp_3_name || '.............................................'}
                                    </td>
                                    <td className="border border-gray-600 p-2 align-top pt-4 leading-normal">
                                        {d.est_emp_salary || ''}<br />
                                        {d.est_transport || ''}<br />
                                        {d.est_bills || ''}<br />
                                        {d.est_rent || ''}<br />
                                        {d.est_loan_charge || ''}<br />
                                        {d.est_other_exp_1_amount || ''}<br />
                                        {d.est_other_exp_2_amount || ''}<br />
                                        {d.est_other_exp_3_amount || ''}
                                    </td>
                                    <td className="border border-gray-600 p-2 text-left align-top leading-normal">
                                        উদ্যোগের মূল আয়<br />
                                        (মূল আয়ের খাত উল্লেখ করতে হবে)<br />
                                        <div className="mt-1 text-center font-semibold underline break-words">{d.est_main_income_desc || d.est_main_income_source || ''}</div>
                                        <div className="mt-5 border-t border-gray-400 pt-1">
                                            অন্যান্য আয় (খাত উল্লেখ করতে হবে)<br />
                                            <div className="mt-1 text-center font-semibold underline break-words">{d.est_other_income_source || ''}</div>
                                        </div>
                                    </td>
                                    <td className="border border-gray-600 p-2 align-top pt-7 leading-normal">
                                        {d.est_main_income_amount || ''}
                                        <div className="mt-10">{d.est_other_income_amount || ''}</div>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-600 p-1.5 text-left font-semibold">মোট ব্যয়:</td>
                                    <td className="border border-gray-600 p-1.5 font-bold">{total_exp || ''}</td>
                                    <td className="border border-gray-600 p-1.5 border-b-0 bg-gray-50"></td>
                                    <td className="border border-gray-600 p-1.5 border-b-0 bg-gray-50"></td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-600 p-1.5 text-left font-semibold">নিট লাভ/উদ্বৃত্ত</td>
                                    <td className="border border-gray-600 p-1.5 font-bold">{net_profit || ''}</td>
                                    <td className="border border-gray-600 p-1.5 text-center font-bold">মোট আয়</td>
                                    <td className="border border-gray-600 p-1.5 font-bold">{total_inc || ''}</td>
                                </tr>
                                <tr className="bg-gray-50 font-bold">
                                    <td className="border border-gray-600 p-1.5 text-center">মোট (ব্যয় + লাভ)</td>
                                    <td className="border border-gray-600 p-1.5">{total_exp + net_profit || ''}</td>
                                    <td className="border border-gray-600 p-1.5"></td>
                                    <td className="border border-gray-600 p-1.5"></td>
                                </tr>
                            </tbody>
                        </table>
                        <div className="text-[12px] mt-1.5 leading-tight flex justify-between">
                            <span>উদ্যোগের মোট আয়ের <span className="underline font-bold px-1">{exp_percent}%</span> ব্যয় হবে</span>
                            <span>উদ্যোগের মোট আয়ের <span className="underline font-bold px-1">{profit_percent}%</span> নিট লাভ থাকবে</span>
                        </div>
                    </div>

                    {/* Section গ. অন্যান্য তথ্যাবলী */}
                    <div className="mb-3">
                        <div className="inline-block border border-gray-600 px-3 py-1 font-bold mb-2 bg-gray-100 text-[12.5px]">গ. অন্যান্য তথ্যাবলী:</div>
                        <div className="flex justify-between text-[12.5px] mb-1.5">
                            <span>০১. (ক) ঋণের মেয়াদ: <span className="underline font-bold px-1">{d.loan_duration_months || ''} মাস</span></span>
                            <span>(খ) সার্ভিস চার্জের হার: <span className="underline font-bold px-1">{getReducingServiceChargeRate(null, d.applied_service_charge_rate, d.loan_duration_months) || d.applied_service_charge_rate || ''}%</span></span>
                            <span>(গ) ঋণ পরিশোধের তফসিল:</span>
                        </div>
                        <table className="w-full border-collapse border border-gray-600 text-center align-middle text-[12px]">
                            <thead>
                                <tr className="bg-gray-50 font-semibold">
                                    <th className="border border-gray-600 p-1.5">কিস্তির ধরণ</th>
                                    <th className="border border-gray-600 p-1.5">আসল (টাকা)</th>
                                    <th className="border border-gray-600 p-1.5">সার্ভিস চার্জ (টাকা)</th>
                                    <th className="border border-gray-600 p-1.5">মোট (টাকা)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-gray-600 p-1.5">{d.installment_type || 'মাসিক কিস্তি'}</td>
                                    <td className="border border-gray-600 p-1.5">{d.installment_principal || ''}</td>
                                    <td className="border border-gray-600 p-1.5">{d.installment_service_charge || ''}</td>
                                    <td className="border border-gray-600 p-1.5 font-semibold">{inst_total || ''}</td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-600 p-1.5 text-left font-bold pl-3">মোট পরিশোধের পরিমাণ</td>
                                    <td className="border border-gray-600 p-1.5 font-bold">{total_principal || ''}</td>
                                    <td className="border border-gray-600 p-1.5 font-bold">{total_sc || ''}</td>
                                    <td className="border border-gray-600 p-1.5 font-bold">{total_payable || ''}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* ০২. জামিনদারের তথ্য */}
                    <div className="mb-3">
                        <div className="flex justify-between font-bold mb-1 text-[12.5px]">
                            <span>০২. জামিনদারের তথ্য: (ক) ১ম জামিনদার</span>
                            <span className="w-1/2 pl-2">(খ) ২য় জামিনদার</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[12px] leading-relaxed">
                            <div className="border border-dotted border-gray-600 p-2 break-words">
                                জামিনদারের নাম: {d.guarantor_1_name || '...........................................'}<br />
                                ঠিকানা: {d.guarantor_1_address || '......................................................'}<br />
                                মোবাইল নম্বর: <span className="font-mono">{d.guarantor_1_mobile || '............................................'}</span><br />
                                ঋণীর সাথে সম্পর্ক: {d.guarantor_1_relation || '....................'} পেশা: {d.guarantor_1_profession || '......................'}<br />
                                মাসিক আয়: {d.guarantor_1_monthly_income || '.............'} সম্পদ: {d.guarantor_1_assets_amount || '.............'}<br />
                                সম্ভাব্য মূল্য: {d.guarantor_1_potential_value || '............................................'}<br />
                                সাক্ষাৎকারীর নাম: {d.guarantor_1_interviewer_name || '.....................'} পদবী: {d.guarantor_1_interviewer_designation || 'বিএম/আরএম/জেডএম'}
                            </div>
                            <div className="border border-dotted border-gray-600 p-2 break-words">
                                জামিনদারের নাম: {d.guarantor_2_name || '...........................................'}<br />
                                ঠিকানা: {d.guarantor_2_address || '......................................................'}<br />
                                মোবাইল নম্বর: <span className="font-mono">{d.guarantor_2_mobile || '............................................'}</span><br />
                                ঋণীর সাথে সম্পর্ক: {d.guarantor_2_relation || '....................'} পেশা: {d.guarantor_2_profession || '......................'}<br />
                                মাসিক আয়: {d.guarantor_2_monthly_income || '.............'} সম্পদ: {d.guarantor_2_assets_amount || '.............'}<br />
                                সম্ভাব্য মূল্য: {d.guarantor_2_potential_value || '............................................'}<br />
                                সাক্ষাৎকারীর নাম: {d.guarantor_2_interviewer_name || '.....................'} পদবী: {d.guarantor_2_interviewer_designation || 'বিএম/আরএম/জেডএম'}
                            </div>
                        </div>
                    </div>

                    {/* ০৩. তথ্য প্রদানকারী */}
                    <div className="mb-0">
                        <div className="flex justify-between font-bold mb-1 text-[12.5px]">
                            <span>০৩. ঋণী ও জামিনদার সম্পর্কে তথ্য প্রদানকারী: (ক) ১ম জন</span>
                            <span className="w-1/2 pl-2">(খ) ২য় জন</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[12px] leading-relaxed">
                            <div className="border border-dotted border-gray-600 p-2 break-words">
                                নাম: {d.informant_1_name || '..........................................'}<br />
                                ঠিকানা: {d.informant_1_address || '......................................................'}<br />
                                মোবাইল: <span className="font-mono">{d.informant_1_mobile || '............................................'}</span><br />
                                সম্পর্ক: {d.informant_1_relation || '....................'} পেশা: {d.informant_1_profession || '......................'}<br />
                                ঋণ তথ্য: {d.informant_1_loan_info || '............................................'}<br />
                                সম্পদ তথ্য: {d.informant_1_asset_info || '.........................................'}<br />
                                মন্তব্য: {d.informant_1_overall_comment || '..................................'}
                            </div>
                            <div className="border border-dotted border-gray-600 p-2 break-words">
                                নাম: {d.informant_2_name || '..........................................'}<br />
                                ঠিকানা: {d.informant_2_address || '......................................................'}<br />
                                মোবাইল: <span className="font-mono">{d.informant_2_mobile || '............................................'}</span><br />
                                সম্পর্ক: {d.informant_2_relation || '....................'} পেশা: {d.informant_2_profession || '......................'}<br />
                                ঋণ তথ্য: {d.informant_2_loan_info || '............................................'}<br />
                                সম্পদ তথ্য: {d.informant_2_asset_info || '.........................................'}<br />
                                মন্তব্য: {d.informant_2_overall_comment || '..................................'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Page Number */}
                <div className="text-right mt-2 text-[12px] text-gray-600 font-mono">৩ / ৪</div>
            </div>
        </div>
    );
}

function renderPage4(d: any) {
    const fmt = formatDateBangla;
    return (
        <div
            id="preview-page-4"
            data-sync="page-4"
            data-print-page="4"
            className="print-page-sheet bg-white border border-gray-300 p-5 print:p-0 print:border-none text-[13px] print:text-[12.5px] print:leading-normal w-full"
            style={{ ...pageFontStyle }}
        >
            <div className="print-page-content flex flex-col justify-between h-full w-full box-border">
                <div className="space-y-2">
                    {/* ০৪. চাকরিজীবীর ক্ষেত্রে */}
                    <div className="mb-2 text-[12.5px] print:text-[12px] leading-relaxed">
                        <div className="font-bold mb-1">০৪. চাকরিজীবীর ক্ষেত্রে (প্রযোজ্য ক্ষেত্রে): <span className="font-normal border-b border-dotted border-gray-600 inline-block min-w-[180px]">{d.employee_workplace_name || ''}</span> মাসিক বেতন: <span className="font-normal border-b border-dotted border-gray-600 inline-block min-w-[90px] text-center">{noDecimal(d.employee_monthly_salary)}</span> হাতে প্রাপ্তি: <span className="font-normal border-b border-dotted border-gray-600 inline-block min-w-[90px] text-center">{noDecimal(d.employee_received_in_hand)}</span></div>
                        <div className="mb-1">অন্যান্য খাতের আয়: <span className="border-b border-dotted border-gray-600 inline-block min-w-[90px] text-center">{noDecimal(d.employee_other_income)}</span> কর্মস্থলে ঋণ অনুমোদনকারীর উপস্থিতি: <span className="border-b border-dotted border-gray-600 inline-block min-w-[120px]">{(d.employee_approver_presence_time || '').replace('T', ' ')}</span> সাথে কে ছিলো: <span className="border-b border-dotted border-gray-600 inline-block min-w-[110px]">{d.employee_who_was_with || ''}</span></div>
                        <div>যে ব্যাংকে বেতন হয়: <span className="border-b border-dotted border-gray-600 inline-block min-w-[150px]">{d.employee_bank_name || ''}</span> ব্যাংক স্টেটমেন্ট অনুযায়ী বেতন: <span className="border-b border-dotted border-gray-600 inline-block min-w-[90px] text-center">{noDecimal(d.employee_salary_per_statement)}</span></div>
                    </div>

                    {/* ০৫. প্রবাসী সদস্যের রেমিটেন্স */}
                    <div className="mb-2 text-[12.5px] print:text-[12px] leading-relaxed">
                        <div className="font-bold mb-1">০৫. প্রবাসী সদস্যের রেমিটেন্স এর তথ্য (প্রযোজ্য ক্ষেত্রে): <span className="font-normal">মাসিক আয়:</span> <span className="font-normal border-b border-dotted border-gray-600 inline-block min-w-[90px] text-center">{noDecimal(d.expatriate_monthly_income)}</span> যে চ্যানেলে আসে: <span className="font-normal border-b border-dotted border-gray-600 inline-block min-w-[110px]">{d.expatriate_channel || ''}</span></div>
                        <div>যা দেখে নিশ্চিত হলেন: <span className="border-b border-dotted border-gray-600 inline-block min-w-[110px]">{d.expatriate_confirmation_method || ''}</span> যে দেশে থাকে: <span className="border-b border-dotted border-gray-600 inline-block min-w-[90px]">{d.expatriate_country || ''}</span> বছর: <span className="border-b border-dotted border-gray-600 inline-block min-w-[45px] text-center">{noDecimal(d.expatriate_years_living)}</span> পারমিট যাচাই: <span className="border-b border-dotted border-gray-600 inline-block min-w-[80px]">{d.expatriate_work_permit_checked || ''}</span></div>
                    </div>

                    {/* ০৬. পরিবেশ ও আইনগত জটিলতা */}
                    <div className="mb-2 text-[12.5px] print:text-[12px]">
                        <span className="font-bold">০৬. প্রকল্পে পরিবেশ ও আইনগত কোনো জটিলতা আছে কি-না?</span> <span className="ml-3">(ক) হ্যাঁ</span> {d.project_environmental_legal_issues === 'হ্যাঁ' ? '✓' : ''} <span className="ml-3">(খ) না</span> {d.project_environmental_legal_issues === 'না' ? '✓' : ''}
                    </div>

                    {/* ০৭. ঝুঁকি প্রতিরোধ */}
                    <div className="mb-2 text-[12.5px] print:text-[12px]">
                        <div className="font-bold">০৭. ঝুঁকি প্রতিরোধের উপায় (Risk Coverage Measures) লিখুন:-</div>
                        <div className="ml-3 mt-0.5 leading-relaxed">
                            (ক) দুর্যোগ মোকাবিলার অভিজ্ঞতা: (i) আছে {d.risk_disaster_experience === 'আছে' ? '✓' : ''} (ii) নাই {d.risk_disaster_experience === 'নাই' ? '✓' : ''} &nbsp;&nbsp;&nbsp;
                            (খ) বাকিতে বিক্রয়ের হার: (i) আছে {d.risk_credit_sale === 'আছে' ? '✓' : ''} (ii) নাই {d.risk_credit_sale === 'নাই' ? '✓' : ''}
                        </div>
                    </div>

                    {/* ০৮. ভবিষ্যৎ পরিকল্পনা */}
                    <div className="mb-2 text-[12.5px] print:text-[12px]">
                        <span className="font-bold">০৮. ভবিষ্যতে ক্ষুদ্র উদ্যোগ বিষয়ে কি ধরণের পরিকল্পনা রয়েছে?</span> <span className="border-b border-dotted border-gray-600 inline-block min-w-[280px]">{d.future_micro_enterprise_plan || ''}</span>
                    </div>

                    {/* ৯. কর্মসংস্থান টেবিল */}
                    <div className="mb-2.5">
                        <div className="font-bold mb-1 text-[12.5px] print:text-[12px]">৯. কর্মসংস্থান সংক্রান্ত তথ্য:</div>
                        <table className="w-full table-fixed border-collapse border border-black text-center text-[11px]">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th rowSpan={3} className="border border-black font-normal p-1 w-[18%]">ঋণ কার্যক্রমের নাম</th>
                                    <th colSpan={2} className="border border-black font-normal p-1">স্ব-কর্মসংস্থান/পারিবারিক</th>
                                    <th colSpan={2} className="border border-black font-normal p-1">মজুরি ভিত্তিক</th>
                                    <th rowSpan={3} className="border border-black font-normal p-1">মোট<br />পূর্ণ সময়</th>
                                    <th rowSpan={3} className="border border-black font-normal p-1">মোট<br />আংশিক সময়</th>
                                </tr>
                                <tr className="bg-gray-50">
                                    <th className="border border-black font-normal p-1">পূর্ণকালীন</th>
                                    <th className="border border-black font-normal p-1">খণ্ডকালীন</th>
                                    <th className="border border-black font-normal p-1">পূর্ণকালীন</th>
                                    <th className="border border-black font-normal p-1">খণ্ডকালীন</th>
                                </tr>
                                <tr className="bg-gray-50">
                                    <th className="border border-black p-0 font-normal"><div className="flex"><div className="w-1/2 border-r border-black py-0.5">মহিলা</div><div className="w-1/2 py-0.5">পুরুষ</div></div></th>
                                    <th className="border border-black p-0 font-normal"><div className="flex"><div className="w-1/2 border-r border-black py-0.5">মহিলা</div><div className="w-1/2 py-0.5">পুরুষ</div></div></th>
                                    <th className="border border-black p-0 font-normal"><div className="flex"><div className="w-1/2 border-r border-black py-0.5">মহিলা</div><div className="w-1/2 py-0.5">পুরুষ</div></div></th>
                                    <th className="border border-black p-0 font-normal"><div className="flex"><div className="w-1/2 border-r border-black py-0.5">মহিলা</div><div className="w-1/2 py-0.5">পুরুষ</div></div></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-black p-1">{d.loan_program_name || ''}</td>
                                    <td className="border border-black p-0"><div className="flex h-full min-h-[18px]"><div className="w-1/2 border-r border-black py-1">{noDecimal(d.self_emp_full_female)}</div><div className="w-1/2 py-1">{noDecimal(d.self_emp_full_male)}</div></div></td>
                                    <td className="border border-black p-0"><div className="flex h-full min-h-[18px]"><div className="w-1/2 border-r border-black py-1">{noDecimal(d.self_emp_part_female)}</div><div className="w-1/2 py-1">{noDecimal(d.self_emp_part_male)}</div></div></td>
                                    <td className="border border-black p-0"><div className="flex h-full min-h-[18px]"><div className="w-1/2 border-r border-black py-1">{noDecimal(d.wage_emp_full_female)}</div><div className="w-1/2 py-1">{noDecimal(d.wage_emp_full_male)}</div></div></td>
                                    <td className="border border-black p-0"><div className="flex h-full min-h-[18px]"><div className="w-1/2 border-r border-black py-1">{noDecimal(d.wage_emp_part_female)}</div><div className="w-1/2 py-1">{noDecimal(d.wage_emp_part_male)}</div></div></td>
                                    <td className="border border-black p-1 font-semibold">{noDecimal((Number(d.self_emp_full_female || 0) + Number(d.self_emp_full_male || 0) + Number(d.wage_emp_full_female || 0) + Number(d.wage_emp_full_male || 0)))}</td>
                                    <td className="border border-black p-1 font-semibold">{noDecimal((Number(d.self_emp_part_female || 0) + Number(d.self_emp_part_male || 0) + Number(d.wage_emp_part_female || 0) + Number(d.wage_emp_part_male || 0)))}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* সদস্য ও প্রোফাইল পূরণকারী স্বাক্ষর */}
                    <div className="flex justify-between items-end mt-8 mb-3 px-3 text-[12.5px]">
                        <div className="text-center relative">
                            <div className="h-16 print:h-[72px]" aria-hidden="true" />
                            <div className="border-t border-dotted border-gray-600 min-w-[200px] pt-1 font-medium">সদস্যের স্বাক্ষর:</div>
                            <div className="mt-1 flex items-center justify-center gap-1">
                                <span>মোবাইল নং</span>
                                <div className="flex border border-gray-600">
                                    {String(d.member_mobile || d.member?.mobile_number || '').padEnd(11, ' ').slice(0, 11).split('').map((char, i) => (
                                        <div key={i} className={`w-4 h-5 flex items-center justify-center font-mono text-[11px] ${i > 0 ? 'border-l border-gray-600' : ''}`}>{char.trim()}</div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="text-center relative">
                            <div className="h-16 print:h-[72px]" aria-hidden="true" />
                            <div className="border-t border-dotted border-gray-600 min-w-[220px] pt-1 font-medium">প্রোফাইল পূরণকারীর স্বাক্ষর ও সিল:</div>
                        </div>
                    </div>

                    {/* ঘ. সংস্থার অফিস পর্যায়ে পূরণীয় */}
                    <div className="border border-black mb-2 w-full text-[12.5px] print:text-[12px]">
                        <div className="text-center font-bold border-b border-black py-1 bg-gray-100/70 text-[13px]">ঘ. সংস্থার অফিস পর্যায়ে পূরণীয়:</div>

                        <div className="border-b border-black p-2 min-h-[58px] flex flex-col justify-between">
                            <div>
                                <div className="font-bold text-[12.5px]">(ক) অফিসারের পরিদর্শনোত্তর মন্তব্য, স্বাক্ষর ও সিল:</div>
                                <div className="mt-1 leading-relaxed break-words text-[12px] text-gray-900">{d.officer_post_inspection_comments || ''}</div>
                            </div>
                            <div className="flex justify-end pt-2">
                                <span className="border-t border-dotted border-gray-400 min-w-[140px] text-[10.5px] text-gray-500 text-center">স্বাক্ষর ও সিল</span>
                            </div>
                        </div>

                        <div className="border-b border-black p-2 min-h-[58px] flex flex-col justify-between">
                            <div>
                                <div className="font-bold text-[12.5px]">(খ) শাখা ব্যবস্থাপকের পরিদর্শনোত্তর মন্তব্য, স্বাক্ষর ও সিল:</div>
                                <div className="mt-1 leading-relaxed break-words text-[12px] text-gray-900">{d.branch_manager_post_inspection_comments || ''}</div>
                            </div>
                            <div className="flex justify-end pt-2">
                                <span className="border-t border-dotted border-gray-400 min-w-[140px] text-[10.5px] text-gray-500 text-center">স্বাক্ষর ও সিল</span>
                            </div>
                        </div>

                        <div className="border-b border-black p-2 min-h-[58px] flex flex-col justify-between">
                            <div>
                                <div className="font-bold text-[12.5px]">(গ) আঞ্চলিক ব্যবস্থাপকের পরিদর্শনোত্তর মন্তব্য, স্বাক্ষর ও সিল:</div>
                                <div className="mt-1 leading-relaxed break-words text-[12px] text-gray-900">{d.regional_manager_comments || ''}</div>
                            </div>
                            <div className="flex justify-end pt-2">
                                <span className="border-t border-dotted border-gray-400 min-w-[140px] text-[10.5px] text-gray-500 text-center">স্বাক্ষর ও সিল</span>
                            </div>
                        </div>

                        <div className="border-b border-black p-2 min-h-[58px] flex flex-col justify-between">
                            <div>
                                <div className="font-bold text-[12.5px]">(ঘ) জোনাল ম্যানেজারের পরিদর্শনোত্তর মন্তব্য, স্বাক্ষর ও সিল:</div>
                                <div className="mt-1 leading-relaxed break-words text-[12px] text-gray-900">{d.zonal_manager_comments || ''}</div>
                            </div>
                            <div className="flex justify-end pt-2">
                                <span className="border-t border-dotted border-gray-400 min-w-[140px] text-[10.5px] text-gray-500 text-center">স্বাক্ষর ও সিল</span>
                            </div>
                        </div>

                        <div className="p-2 min-h-[64px] flex flex-col justify-between">
                            <div>
                                <div className="font-bold text-[12.5px]">(ঙ) সংস্থার চূড়ান্ত অনুমোদনকারীর মন্তব্য ও অনুমোদিত ঋণের বিবরণ:</div>
                                <div className="mt-1 leading-relaxed break-words text-[12px] text-gray-900">{d.final_approver_comments || ''}</div>
                            </div>
                            <div className="flex justify-end pt-2">
                                <span className="border-t border-dotted border-gray-400 min-w-[140px] text-[10.5px] text-gray-500 text-center">স্বাক্ষর ও সিল</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer block: চূড়ান্ত অনুমোদনকারীর স্বাক্ষর ও টাকা (পেজের একবারে নিচে) */}
                <div className="mt-auto pt-4 pb-1">
                    <div className="flex justify-between items-end px-2 text-[13px] print:text-[12.5px]">
                        <div className="pb-2">
                            <span className="font-bold">টাকা:</span> <strong className="border-b border-dotted border-gray-600 inline-block min-w-[110px] text-center font-bold">{d.final_approved_loan_amount_digits ? noDecimal(d.final_approved_loan_amount_digits) + '/-' : '....................'}</strong>
                            <span className="font-bold ml-4">কথায়:</span> <span className="border-b border-dotted border-gray-600 inline-block min-w-[200px] font-bold">{d.final_approved_loan_amount_words || '................................................'}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            {/* Dedicated 64px physical seal and signature space */}
                            <div className="h-16 w-52" />
                            <div className="border-t border-dotted border-gray-700 min-w-[220px] pt-1 text-center font-bold text-[12.5px]">
                                চূড়ান্ত অনুমোদনকারীর স্বাক্ষর ও সিল
                            </div>
                        </div>
                    </div>

                    {/* Page Number */}
                    <div className="text-right mt-2 text-[12px] text-gray-600 font-mono">৪ / ৪</div>
                </div>
            </div>
        </div>
    );
}

export default function LoanApplicationApprovalPrint({ formData: d, branch, categoryName: cat }: any) {
    // Automatically auto-fits only when unscaled content actually exceeds true A4 height
    useAutoFitPrint([d, branch, cat], '.loan-approval-print');

    if (!d) return null;
    return (
        <div
            className="loan-approval-print print-container w-full max-w-[21cm] mx-auto bg-white p-6 print:p-0"
            style={{ fontFamily: PRINT_FONT, color: '#000' }}
        >
            <style>{`
                .loan-approval-print,
                .loan-approval-print *:not(.font-mono) {
                    font-family: ${PRINT_FONT} !important;
                }

                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 8mm 10mm;
                    }
                    html, body {
                        width: 100% !important;
                        height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                    }
                    .loan-approval-print,
                    .print-container {
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                    }
                    .print-page-sheet {
                        width: 100% !important;
                        max-width: 100% !important;
                        min-height: 278mm !important;
                        max-height: 278mm !important;
                        box-sizing: border-box !important;
                        page-break-after: always !important;
                        break-after: page !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        overflow: hidden !important;
                        position: relative !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        display: flex !important;
                        flex-direction: column !important;
                        justify-content: space-between !important;
                        background: #ffffff !important;
                    }
                    .print-page-sheet:last-child {
                        page-break-after: auto !important;
                        break-after: auto !important;
                    }
                    .print-page-content {
                        width: 100% !important;
                        box-sizing: border-box !important;
                    }
                }

                @media screen {
                    .print-page-sheet {
                        min-height: 297mm;
                        margin-bottom: 24px;
                        box-sizing: border-box;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                    }
                }
            `}</style>
            {renderPage1(d, branch, cat)}
            {renderPage2(d, cat)}
            {renderPage3(d)}
            {renderPage4(d)}
        </div>
    );
}