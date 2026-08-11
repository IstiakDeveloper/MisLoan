import React from 'react';
import { formatDateBangla } from '@/utils/dateUtils';
import { AgrosorProfileData } from './Types';

const str = (v: any) => (v != null && v !== '' ? String(v) : '');
const num = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

/** Page-1 only: large logo left (full header height), text+title to the right */
function Header() {
    return (
        <div className="mb-3 flex items-center justify-center gap-2">
            {/* Logo fills the full header height (red-mark area) */}
            <img
                src="/logo.png"
                alt="মৌসুমী"
                className="h-[72px] w-[72px] object-contain shrink-0"
                onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                }}
            />
            <div className="flex flex-col items-center justify-center">
                <h1 className="text-[22px] font-bold leading-none tracking-wide">মৌসুমী</h1>
                <p className="text-[12px] font-semibold leading-tight mt-0.5">উকিলপাড়া, নওগাঁ</p>
                <div className="mt-1.5 inline-block rounded-full border-2 border-black px-5 py-1">
                    <h2 className="text-[13px] font-bold text-black leading-tight whitespace-nowrap">
                        অগ্রসর ঋণ আবেদন ও অনুমোদনপত্র
                    </h2>
                </div>
            </div>
        </div>
    );
}

const a4Page =
    'w-[21cm] min-h-[29.7cm] mx-auto bg-white box-border px-8 py-7 print:w-full print:max-w-none print:min-h-0 print:mx-0 print:px-[5mm] print:py-[4mm] border border-gray-300 shadow-sm print:border-none print:shadow-none flex flex-col';

export default function PrintPreview({ formData }: { formData: AgrosorProfileData }) {
    const d = formData || {};
    const empRows = Array.isArray(d.employment_rows) ? d.employment_rows : [];
    const otherLoans = Array.isArray(d.other_loans)
        ? d.other_loans
        : Array.isArray(d.other_loan_status)
          ? d.other_loan_status
          : [];
    const planRows = Array.isArray(d.business_plan_rows) ? d.business_plan_rows : [];
    const prevLoans = Array.isArray(d.previous_loans) ? d.previous_loans : [];

    // Always show at least 4 employment rows for full-page look
    const empDisplay = [...empRows];
    while (empDisplay.length < 4) empDisplay.push({});

    const otherLoanDisplay = [...otherLoans];
    while (otherLoanDisplay.length < 3) otherLoanDisplay.push({});

    const planDisplay = [...planRows];
    while (planDisplay.length < 3) planDisplay.push({});

    const prevDisplay = [...prevLoans];
    while (prevDisplay.length < 3) prevDisplay.push({});

    const rawLabel =
        d.raw_material_source === 'local'
            ? '✓ স্থানীয়'
            : d.raw_material_source === 'outside'
              ? '✓ বাহির হতে'
              : d.raw_material_source === 'other'
                ? '✓ অন্যান্য'
                : 'স্থানীয় / বাহির হতে / অন্যান্য';

    const salesLabel =
        d.sales_market === 'local_market'
            ? '✓ স্থানীয় বাজারে'
            : d.sales_market === 'outside_market'
              ? '✓ বহিঃ বাজারে'
              : d.sales_market === 'other'
                ? '✓ অন্যান্য'
                : 'স্থানীয় বাজারে / বহিঃ বাজারে / অন্যান্য';

    return (
        <div
            className="space-y-6 print:space-y-0"
            style={{ fontFamily: 'Kalpurush, Arial, sans-serif', color: '#000' }}
        >
            <style>{`
                @media print {
                    @page { size: A4 portrait; margin: 6mm; }
                    .agrosor-a4-page {
                        width: 100% !important;
                        max-width: 100% !important;
                        min-height: auto !important;
                        margin: 0 !important;
                        padding: 4mm 5mm !important;
                        box-shadow: none !important;
                        border: none !important;
                        page-break-after: always;
                        break-after: page;
                    }
                    .agrosor-a4-page:last-child {
                        page-break-after: auto;
                        break-after: auto;
                    }
                }
            `}</style>

            {/* ========== PAGE 1 ========== */}
            <div className={`${a4Page} agrosor-a4-page`} data-sync="page-1" style={{ pageBreakAfter: 'always' }}>
                <Header />

                <div className="grid grid-cols-3 gap-x-3 gap-y-2 text-[12px] mb-3">
                    <p>
                        ঋণ আবেদনের তারিখ:{' '}
                        <span className="font-semibold border-b border-dotted border-black px-1 inline-block min-w-[90px]">
                            {formatDateBangla(d.application_date) || '..................'}
                        </span>
                    </p>
                    <p>
                        ঋণ বিতরণের তারিখ:{' '}
                        <span className="font-semibold border-b border-dotted border-black px-1 inline-block min-w-[90px]">
                            {formatDateBangla(d.disbursement_date) || '..................'}
                        </span>
                    </p>
                    <p>
                        ঋণ পরিশোধের তারিখ:{' '}
                        <span className="font-semibold border-b border-dotted border-black px-1 inline-block min-w-[90px]">
                            {formatDateBangla(d.repayment_date) || '..................'}
                        </span>
                    </p>
                </div>

                <p className="text-[12px] mb-1.5 leading-relaxed">
                    সদস্য/সদস্যার নাম ও কোড নং:{' '}
                    <span className="font-semibold border-b border-dotted border-black px-1 inline-block min-w-[180px]">
                        {str(d.member_name_code) || '................................'}
                    </span>{' '}
                    সমিতির নাম ও কোড নম্বর:{' '}
                    <span className="font-semibold border-b border-dotted border-black px-1 inline-block min-w-[160px]">
                        {str(d.samity_name_code) || '................................'}
                    </span>
                </p>
                <p className="text-[12px] mb-3 leading-relaxed">
                    বাস্তবায়িত প্রকল্পের নাম:{' '}
                    <span className="font-semibold border-b border-dotted border-black px-1 inline-block min-w-[180px]">
                        {str(d.implemented_project_name) || '................................'}
                    </span>{' '}
                    বিকল্প প্রকল্পের নাম:{' '}
                    <span className="font-semibold border-b border-dotted border-black px-1 inline-block min-w-[160px]">
                        {str(d.alternative_project_name) || '................................'}
                    </span>
                </p>

                <p className="font-bold text-[12px] mb-1">১. কর্মসংস্থান সংক্রান্ত তথ্য:</p>
                <table className="w-full border-collapse border border-black text-[9px] mb-3 text-center">
                    <thead>
                        <tr>
                            <th className="border border-black px-0.5 py-1 font-semibold" rowSpan={3}>
                                ঋণ কার্যক্রমের নাম
                            </th>
                            <th className="border border-black px-0.5 py-1 font-semibold" colSpan={4}>
                                স্ব-কর্মসংস্থান/পারিবারিক কর্মসংস্থান
                            </th>
                            <th className="border border-black px-0.5 py-1 font-semibold" colSpan={4}>
                                মজুরি ভিত্তিক কর্মসংস্থান
                            </th>
                            <th className="border border-black px-0.5 py-1 font-semibold" colSpan={2}>
                                মোট
                            </th>
                        </tr>
                        <tr>
                            <th className="border border-black px-0.5 py-0.5" colSpan={2}>পূর্ণকালীন</th>
                            <th className="border border-black px-0.5 py-0.5" colSpan={2}>খণ্ডকালীন</th>
                            <th className="border border-black px-0.5 py-0.5" colSpan={2}>পূর্ণকালীন</th>
                            <th className="border border-black px-0.5 py-0.5" colSpan={2}>খণ্ডকালীন</th>
                            <th className="border border-black px-0.5 py-0.5 leading-tight">
                                পূর্ণ সময়
                                <br />
                                <span className="font-normal">৯ = ১+২+৫+৬</span>
                            </th>
                            <th className="border border-black px-0.5 py-0.5 leading-tight">
                                আংশিক সময়
                                <br />
                                <span className="font-normal">১০ = ৩+৪+৭+৮</span>
                            </th>
                        </tr>
                        <tr>
                            <th className="border border-black px-0.5 py-0.5">পুরুষ<br />১</th>
                            <th className="border border-black px-0.5 py-0.5">মহিলা<br />২</th>
                            <th className="border border-black px-0.5 py-0.5">পুরুষ<br />৩</th>
                            <th className="border border-black px-0.5 py-0.5">মহিলা<br />৪</th>
                            <th className="border border-black px-0.5 py-0.5">পুরুষ<br />৫</th>
                            <th className="border border-black px-0.5 py-0.5">মহিলা<br />৬</th>
                            <th className="border border-black px-0.5 py-0.5">পুরুষ<br />৭</th>
                            <th className="border border-black px-0.5 py-0.5">মহিলা<br />৮</th>
                            <th className="border border-black px-0.5 py-0.5">৯</th>
                            <th className="border border-black px-0.5 py-0.5">১০</th>
                        </tr>
                    </thead>
                    <tbody>
                        {empDisplay.map((row: any, i: number) => {
                            // Same as 4-page form: full = 1+2+5+6, part = 3+4+7+8
                            const full =
                                num(row.self_full_male) +
                                num(row.self_full_female) +
                                num(row.wage_full_male) +
                                num(row.wage_full_female);
                            const part =
                                num(row.self_part_male) +
                                num(row.self_part_female) +
                                num(row.wage_part_male) +
                                num(row.wage_part_female);
                            return (
                                <tr key={i}>
                                    <td className="border border-black px-1 py-1.5 text-left min-h-[22px]">
                                        {str(row.activity_name)}
                                    </td>
                                    <td className="border border-black px-0.5 py-1.5">{str(row.self_full_male)}</td>
                                    <td className="border border-black px-0.5 py-1.5">{str(row.self_full_female)}</td>
                                    <td className="border border-black px-0.5 py-1.5">{str(row.self_part_male)}</td>
                                    <td className="border border-black px-0.5 py-1.5">{str(row.self_part_female)}</td>
                                    <td className="border border-black px-0.5 py-1.5">{str(row.wage_full_male)}</td>
                                    <td className="border border-black px-0.5 py-1.5">{str(row.wage_full_female)}</td>
                                    <td className="border border-black px-0.5 py-1.5">{str(row.wage_part_male)}</td>
                                    <td className="border border-black px-0.5 py-1.5">{str(row.wage_part_female)}</td>
                                    <td className="border border-black px-0.5 py-1.5 font-semibold">{full || ''}</td>
                                    <td className="border border-black px-0.5 py-1.5 font-semibold">{part || ''}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                <p className="text-[12px] mb-1.5">
                    ২. উৎপাদিত পণ্য সামগ্রীর কাঁচামালের উৎস ও বিবরণ তথ্য (টিক চিহ্ন দিন): {rawLabel}
                </p>
                <p className="text-[12px] mb-3">
                    ৩. চূড়ান্ত উৎপাদিত পণ্য সামগ্রী বিক্রয় তথ্য (টিক চিহ্ন দিন): {salesLabel}
                </p>

                <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                        <p className="font-bold text-[12px] mb-1">স্থাবর সম্পদ</p>
                        <table className="w-full border-collapse border border-black text-[11px]">
                            <thead>
                                <tr>
                                    <th className="border border-black px-1 py-1.5">বিবরণ</th>
                                    <th className="border border-black px-1 py-1.5">শতাংশ/সংখ্যা</th>
                                    <th className="border border-black px-1 py-1.5">বর্তমান মূল্য</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    ['আবাদী জমি', d.immovable_land_qty, d.immovable_land_value],
                                    ['দালান কোঠা/পাকা বাড়ি', d.immovable_building_qty, d.immovable_building_value],
                                    ['বসত ভিটা', d.immovable_homestead_qty, d.immovable_homestead_value],
                                    ['পুকুর/বাগান', d.immovable_pond_qty, d.immovable_pond_value],
                                    ['অন্যান্য', d.immovable_other_qty, d.immovable_other_value],
                                ].map(([label, qty, val]) => (
                                    <tr key={String(label)}>
                                        <td className="border border-black px-1 py-2">{label}</td>
                                        <td className="border border-black px-1 py-2">{str(qty)}</td>
                                        <td className="border border-black px-1 py-2">{str(val)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div>
                        <p className="font-bold text-[12px] mb-1">অস্থাবর সম্পদ</p>
                        <table className="w-full border-collapse border border-black text-[11px]">
                            <thead>
                                <tr>
                                    <th className="border border-black px-1 py-1.5">বিবরণ</th>
                                    <th className="border border-black px-1 py-1.5">বর্তমান মূল্য</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    ['মোট সঞ্চয়', d.movable_savings],
                                    ['আসবাবপত্র', d.movable_furniture],
                                    ['স্বর্ণালংকার', d.movable_gold],
                                    ['গবাদি পশু/পাখি/মাছ', d.movable_livestock],
                                    ['ব্যবসায়িক মূলধন', d.movable_business_capital],
                                    ['অন্যান্য', d.movable_other],
                                ].map(([label, val]) => (
                                    <tr key={String(label)}>
                                        <td className="border border-black px-1 py-2">{label}</td>
                                        <td className="border border-black px-1 py-2">{str(val)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <p className="font-bold text-[12px] mb-1">৫. বিভিন্ন উৎস হতে গৃহীত ঋণের বিবরণ</p>
                <table className="w-full border-collapse border border-black text-[10px] mb-3">
                    <thead>
                        <tr>
                            {[
                                'সংস্থার/প্রতিষ্ঠানের নাম',
                                'বর্তমান গৃহীত ঋণের পরিমাণ',
                                'ঋণের মেয়াদ',
                                'তথ্য প্রদানকারীর নাম',
                                'মোবাইল নম্বর',
                                'মন্তব্য',
                            ].map((h) => (
                                <th key={h} className="border border-black px-1 py-1.5 font-semibold">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {otherLoanDisplay.map((row: any, i: number) => (
                            <tr key={i}>
                                <td className="border border-black px-1 py-2.5">
                                    {str(row.source_name || row.source)}
                                </td>
                                <td className="border border-black px-1 py-2.5">
                                    {str(row.current_status || row.amount)}
                                </td>
                                <td className="border border-black px-1 py-2.5 text-center">
                                    {str(row.round || row.duration)}
                                </td>
                                <td className="border border-black px-1 py-2.5">
                                    {str(row.borrower_name)}
                                </td>
                                <td className="border border-black px-1 py-2.5 text-center">
                                    {str(row.mobile)}
                                </td>
                                <td className="border border-black px-1 py-2.5">
                                    {str(row.remarks || row.rate)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <p className="font-bold text-[12px] mb-1">৬. আগামী ০১ বছরের উৎপাদন/ব্যবসায়িক পরিকল্পনা</p>
                <table className="w-full border-collapse border border-black text-[11px] mb-2">
                    <thead>
                        <tr>
                            {['প্রকল্পের নাম', 'বিনিয়োগের পরিমাণ', 'সম্ভাব্য নীট আয়'].map((h) => (
                                <th key={h} className="border border-black px-1 py-1.5">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {planDisplay.map((row: any, i: number) => (
                            <tr key={i}>
                                <td className="border border-black px-1 py-2.5">{str(row.project_name)}</td>
                                <td className="border border-black px-1 py-2.5">{str(row.investment)}</td>
                                <td className="border border-black px-1 py-2.5">{str(row.net_income)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="mt-auto pt-2 text-right text-[11px] text-gray-600">১ / ২</div>
            </div>

            {/* ========== PAGE 2 (no header — tighter spacing) ========== */}
            <div
                className="w-[21cm] min-h-[29.7cm] mx-auto bg-white box-border px-7 py-4 print:w-full print:max-w-none print:min-h-0 print:mx-0 print:px-[5mm] print:py-[3mm] border border-gray-300 shadow-sm print:border-none print:shadow-none flex flex-col agrosor-a4-page"
                data-sync="page-2"
                style={{ pageBreakBefore: 'always' }}
            >
                <p className="font-bold text-[11px] mb-0.5">৭. পরিকল্পনা অনুযায়ী বিনিয়োগকৃত তহবিল এবং তহবিলের উৎস</p>
                <table className="w-full border-collapse border border-black text-[10px] mb-2">
                    <thead>
                        <tr>
                            {['তহবিলের উৎস', 'টাকার পরিমাণ', 'মন্তব্য'].map((h) => (
                                <th key={h} className="border border-black px-1 py-0.5">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            ['নিজস্ব তহবিল', d.fund_own, d.fund_own_remarks],
                            ['সংস্থায় আবেদনকৃত ঋণের পরিমাণ', d.fund_applied_loan, d.fund_applied_loan_remarks],
                            ['অন্যান্য উৎস', d.fund_other, d.fund_other_remarks],
                            ['মোট বিনিয়োগকৃত তহবিল', d.fund_total, ''],
                        ].map(([label, amount, remarks]) => (
                            <tr key={String(label)}>
                                <td className="border border-black px-1 py-1">{label}</td>
                                <td className="border border-black px-1 py-1">{str(amount)}</td>
                                <td className="border border-black px-1 py-1">{str(remarks)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <p className="font-bold text-[11px] mb-0.5">৮. সম্ভাব্য বিকল্প উৎস হতে বাৎসরিক আয়</p>
                <table className="w-full border-collapse border border-black text-[10px] mb-2">
                    <tbody>
                        {[
                            ['কৃষি হতে', d.alt_income_agriculture],
                            ['চাকরি হতে', d.alt_income_job],
                            ['অন্যান্য', d.alt_income_other],
                            ['মোট', d.alt_income_total],
                        ].map(([label, val]) => (
                            <tr key={String(label)}>
                                <td className="border border-black px-1 py-1 w-1/2">{label}</td>
                                <td className="border border-black px-1 py-1">{str(val)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <p className="text-[11px] mb-1 leading-snug">
                    ৯. গত বছরের আয়-ব্যয় — মোট আয়:{' '}
                    <span className="font-semibold border-b border-dotted border-black px-1 inline-block min-w-[70px]">
                        {str(d.last_year_total_income) || '........'}
                    </span>{' '}
                    মোট ব্যয়:{' '}
                    <span className="font-semibold border-b border-dotted border-black px-1 inline-block min-w-[70px]">
                        {str(d.last_year_total_expense) || '........'}
                    </span>{' '}
                    নিট লাভ:{' '}
                    <span className="font-semibold border-b border-dotted border-black px-1 inline-block min-w-[70px]">
                        {str(d.last_year_net_profit) || '........'}
                    </span>
                </p>
                <p className="text-[11px] mb-1.5 leading-snug">
                    ১০. চলমান ঋণের দফা নং:{' '}
                    <span className="font-semibold border-b border-dotted border-black px-1 inline-block min-w-[50px]">
                        {str(d.current_loan_round) || '........'}
                    </span>
                    ; আবেদিত ঋণের পরিমাণ:{' '}
                    <span className="font-semibold border-b border-dotted border-black px-1 inline-block min-w-[90px]">
                        {str(d.applied_loan_amount) || '........'}
                    </span>
                </p>

                <p className="font-bold text-[11px] mb-0.5">১১. বিগত ঋণের তথ্য (সর্বশেষ ৩ দফা)</p>
                <table className="w-full border-collapse border border-black text-[10px] mb-2">
                    <thead>
                        <tr>
                            {['ক্র.', 'গ্রহণের তারিখ', 'দফা', 'প্রকল্প', 'বিকল্প প্রকল্প', 'পরিশোধের তারিখ'].map((h) => (
                                <th key={h} className="border border-black px-1 py-0.5">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {prevDisplay.map((row: any, i: number) => (
                            <tr key={i}>
                                <td className="border border-black px-1 py-1 text-center">{i + 1}</td>
                                <td className="border border-black px-1 py-1">
                                    {formatDateBangla(row.receive_date) || str(row.receive_date)}
                                </td>
                                <td className="border border-black px-1 py-1">{str(row.round)}</td>
                                <td className="border border-black px-1 py-1">{str(row.project_name)}</td>
                                <td className="border border-black px-1 py-1">{str(row.alt_project)}</td>
                                <td className="border border-black px-1 py-1">
                                    {formatDateBangla(row.repay_date) || str(row.repay_date)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <p className="text-[11px] mb-1 leading-snug">
                    ১২. ক) মেয়াদকাল:{' '}
                    <span className="font-semibold border-b border-dotted border-black px-1 inline-block min-w-[70px]">
                        {str(d.loan_duration_label) || '........'}
                    </span>{' '}
                    খ) সার্ভিস চার্জ হার:{' '}
                    <span className="font-semibold border-b border-dotted border-black px-1 inline-block min-w-[40px]">
                        {str(d.service_charge_rate) || '........'}
                    </span>
                    %
                </p>
                <p className="font-bold text-[11px] mb-0.5">গ) ঋণ পরিশোধের তফসিল</p>
                <table className="w-full border-collapse border border-black text-[10px] mb-2">
                    <thead>
                        <tr>
                            {['পরিশোধের ধরণ', 'আসল', 'সার্ভিস চার্জ', 'মোট'].map((h) => (
                                <th key={h} className="border border-black px-1 py-0.5">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-black px-1 py-1.5">এককালীন</td>
                            <td className="border border-black px-1 py-1.5">{str(d.installment_principal)}</td>
                            <td className="border border-black px-1 py-1.5">{str(d.installment_service_charge)}</td>
                            <td className="border border-black px-1 py-1.5">{str(d.installment_total)}</td>
                        </tr>
                    </tbody>
                </table>

                <p className="font-bold text-[11px] mb-1">১৩. জামিনদারের তথ্য</p>
                <p className="text-[11px] mb-1 leading-snug">
                    ১| নাম:{' '}
                    <span className="border-b border-dotted border-black px-1 inline-block min-w-[120px]">
                        {str(d.guarantor_1_name) || '........................'}
                    </span>{' '}
                    ঠিকানা:{' '}
                    <span className="border-b border-dotted border-black px-1 inline-block min-w-[140px]">
                        {str(d.guarantor_1_address) || '........................'}
                    </span>{' '}
                    মোবাইল:{' '}
                    <span className="border-b border-dotted border-black px-1 inline-block min-w-[90px]">
                        {str(d.guarantor_1_mobile) || '..............'}
                    </span>
                </p>
                <p className="text-[11px] mb-1.5 leading-snug">
                    ২| নাম:{' '}
                    <span className="border-b border-dotted border-black px-1 inline-block min-w-[120px]">
                        {str(d.guarantor_2_name) || '........................'}
                    </span>{' '}
                    ঠিকানা:{' '}
                    <span className="border-b border-dotted border-black px-1 inline-block min-w-[140px]">
                        {str(d.guarantor_2_address) || '........................'}
                    </span>{' '}
                    মোবাইল:{' '}
                    <span className="border-b border-dotted border-black px-1 inline-block min-w-[90px]">
                        {str(d.guarantor_2_mobile) || '..............'}
                    </span>
                </p>
                <p className="text-[11px] mb-2">
                    সদস্য/সদস্যার স্বাক্ষর:{' '}
                    <span className="border-b border-dotted border-black px-8 inline-block min-w-[140px]">
                        {str(d.member_signature)}
                    </span>
                </p>

                <div className="border border-black p-2 space-y-1">
                    <p className="font-bold text-center text-[12px]">সংস্থার অফিস পর্যায়ে পূরণীয়</p>
                    <p className="text-[11px] min-h-[22px]">
                        (ক) অফিসারের মন্তব্য:{' '}
                        {str(d.officer_post_inspection_comments || d.officer_comments) ||
                            '................................................................'}
                    </p>
                    <p className="text-[11px] min-h-[22px]">
                        (খ) শাখা ব্যবস্থাপকের মন্তব্য:{' '}
                        {str(d.branch_manager_post_inspection_comments || d.bm_comments) ||
                            '................................................................'}
                    </p>
                    <p className="text-[11px] min-h-[22px]">
                        (গ) আঞ্চলিক ব্যবস্থাপকের মন্তব্য:{' '}
                        {str(d.regional_manager_comments || d.rm_comments) ||
                            '................................................................'}
                    </p>
                    <p className="text-[11px] min-h-[22px]">
                        (ঘ) চূড়ান্ত অনুমোদনকারীর মন্তব্য:{' '}
                        {str(d.final_approver_comments) ||
                            '................................................................'}
                    </p>
                    <p className="text-[11px]">
                        টাকা:{' '}
                        <span className="font-semibold">
                            {str(d.final_approved_loan_amount_digits) || '........'}
                        </span>{' '}
                        কথায়:{' '}
                        <span className="font-semibold">
                            {str(d.final_approved_loan_amount_words) || '................................'}
                        </span>
                    </p>
                    <p className="text-right mt-2 text-[11px]">চূড়ান্ত অনুমোদনকারীর স্বাক্ষর ও তারিখ</p>
                </div>

                <div className="pt-1 text-right text-[10px] text-gray-600">২ / ২</div>
            </div>
        </div>
    );
}
