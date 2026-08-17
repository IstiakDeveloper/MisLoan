import React from 'react';
import { formatDateBangla } from '@/utils/dateUtils';
import { AgrosorProfileData } from './Types';
import { useAutoFitPrint } from '@/hooks/useAutoFitPrint';

const str = (v: any) => (v != null && v !== '' ? String(v) : '');
const cell = (v: any) => (v != null && v !== '' ? String(v) : '\u00A0');
const num = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

/** Page-1 only: logo left, text+title to the right */
function Header() {
    return (
        <div className="mb-2 flex items-center justify-center gap-3">
            <img
                src="/logo.png"
                alt="মৌসুমী"
                className="h-16 w-16 object-contain shrink-0"
                onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                }}
            />
            <div className="flex flex-col items-center justify-center">
                <h1 className="text-[22px] font-bold leading-none tracking-wide">মৌসুমী</h1>
                <p className="text-[12px] font-semibold leading-tight mt-0.5">উকিলপাড়া, নওগাঁ</p>
                <div className="mt-1.5 inline-block rounded-full border-2 border-black px-5 py-0.5">
                    <h2 className="text-[13px] font-bold text-black leading-tight whitespace-nowrap">
                        অগ্রসর ঋণ আবেদন ও অনুমোদনপত্র
                    </h2>
                </div>
            </div>
        </div>
    );
}

export default function PrintPreview({ formData }: { formData: AgrosorProfileData }) {
    const d = formData || {};

    // Auto-fit strictly on 1 page per sheet
    useAutoFitPrint([d], '.agrosor-print-container');

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
            className="agrosor-print-container print-container w-full max-w-[21cm] mx-auto bg-white p-4 print:p-0"
            style={{ fontFamily: 'Kalpurush, Arial, sans-serif', color: '#000' }}
        >
            <style>{`
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
                    .agrosor-print-container,
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

            {/* ========== PAGE 1 ========== */}
            <div
                id="preview-page-1"
                data-sync="page-1"
                data-print-page="1"
                className="print-page-sheet bg-white border border-gray-300 p-5 print:p-0 print:border-none text-[12px] print:text-[12px] print:leading-normal w-full"
            >
                <div className="print-page-content flex flex-col justify-between h-full w-full box-border">
                    <div className="space-y-2">
                        <Header />

                        <div className="grid grid-cols-3 gap-x-3 text-[12px] mb-1.5">
                            <p>
                                ঋণ আবেদনের তারিখ:{' '}
                                <strong className="border-b border-dotted border-black px-1 inline-block min-w-[90px]">
                                    {formatDateBangla(d.application_date) || '..................'}
                                </strong>
                            </p>
                            <p>
                                ঋণ বিতরণের তারিখ:{' '}
                                <strong className="border-b border-dotted border-black px-1 inline-block min-w-[90px]">
                                    {formatDateBangla(d.disbursement_date) || '..................'}
                                </strong>
                            </p>
                            <p>
                                ঋণ পরিশোধের তারিখ:{' '}
                                <strong className="border-b border-dotted border-black px-1 inline-block min-w-[90px]">
                                    {formatDateBangla(d.repayment_date) || '..................'}
                                </strong>
                            </p>
                        </div>

                        <div className="text-[12px] leading-relaxed space-y-1 mb-1.5">
                            <p>
                                সদস্য/সদস্যার নাম ও কোড নং:{' '}
                                <strong className="border-b border-dotted border-black px-1 inline-block min-w-[180px]">
                                    {str(d.member_name_code) || '................................'}
                                </strong>{' '}
                                সমিতির নাম ও কোড নম্বর:{' '}
                                <strong className="border-b border-dotted border-black px-1 inline-block min-w-[160px]">
                                    {str(d.samity_name_code) || '................................'}
                                </strong>
                            </p>
                            <p>
                                বাস্তবায়িত প্রকল্পের নাম:{' '}
                                <strong className="border-b border-dotted border-black px-1 inline-block min-w-[180px]">
                                    {str(d.implemented_project_name) || '................................'}
                                </strong>{' '}
                                বিকল্প প্রকল্পের নাম:{' '}
                                <strong className="border-b border-dotted border-black px-1 inline-block min-w-[160px]">
                                    {str(d.alternative_project_name) || '................................'}
                                </strong>
                            </p>
                        </div>

                        <div>
                            <p className="font-bold text-[12px] mb-1">১. কর্মসংস্থান সংক্রান্ত তথ্য:</p>
                            <table className="w-full table-fixed border-collapse border border-black text-[10.5px] mb-1.5 text-center">
                                <colgroup>
                                    <col className="w-[20%]" />
                                    <col className="w-[7.5%]" />
                                    <col className="w-[7.5%]" />
                                    <col className="w-[7.5%]" />
                                    <col className="w-[7.5%]" />
                                    <col className="w-[7.5%]" />
                                    <col className="w-[7.5%]" />
                                    <col className="w-[7.5%]" />
                                    <col className="w-[7.5%]" />
                                    <col className="w-[10%]" />
                                    <col className="w-[10%]" />
                                </colgroup>
                                <thead>
                                    <tr className="bg-gray-100/70">
                                        <th className="border border-black px-1.5 py-1.5 font-semibold align-middle" rowSpan={3}>
                                            ঋণ কার্যক্রমের নাম
                                        </th>
                                        <th className="border border-black px-1 py-1.5 font-semibold align-middle" colSpan={4}>
                                            স্ব-কর্মসংস্থান/পারিবারিক কর্মসংস্থান
                                        </th>
                                        <th className="border border-black px-1 py-1.5 font-semibold align-middle" colSpan={4}>
                                            মজুরি ভিত্তিক কর্মসংস্থান
                                        </th>
                                        <th className="border border-black px-1 py-1.5 font-semibold align-middle" colSpan={2}>
                                            মোট
                                        </th>
                                    </tr>
                                    <tr className="bg-gray-100/70">
                                        <th className="border border-black px-0.5 py-1 align-middle" colSpan={2}>পূর্ণকালীন</th>
                                        <th className="border border-black px-0.5 py-1 align-middle" colSpan={2}>খণ্ডকালীন</th>
                                        <th className="border border-black px-0.5 py-1 align-middle" colSpan={2}>পূর্ণকালীন</th>
                                        <th className="border border-black px-0.5 py-1 align-middle" colSpan={2}>খণ্ডকালীন</th>
                                        <th className="border border-black px-0.5 py-1 leading-tight align-middle">
                                            পূর্ণ সময়
                                            <br />
                                            <span className="font-normal text-[9px]">৯=১+২+৫+৬</span>
                                        </th>
                                        <th className="border border-black px-0.5 py-1 leading-tight align-middle">
                                            আংশিক সময়
                                            <br />
                                            <span className="font-normal text-[9px]">১০=৩+৪+৭+৮</span>
                                        </th>
                                    </tr>
                                    <tr className="bg-gray-100/70 text-[9.5px]">
                                        <th className="border border-black px-0.5 py-1 align-middle">পুরুষ ১</th>
                                        <th className="border border-black px-0.5 py-1 align-middle">মহিলা ২</th>
                                        <th className="border border-black px-0.5 py-1 align-middle">পুরুষ ৩</th>
                                        <th className="border border-black px-0.5 py-1 align-middle">মহিলা ৪</th>
                                        <th className="border border-black px-0.5 py-1 align-middle">পুরুষ ৫</th>
                                        <th className="border border-black px-0.5 py-1 align-middle">মহিলা ৬</th>
                                        <th className="border border-black px-0.5 py-1 align-middle">পুরুষ ৭</th>
                                        <th className="border border-black px-0.5 py-1 align-middle">মহিলা ৮</th>
                                        <th className="border border-black px-0.5 py-1 align-middle">৯</th>
                                        <th className="border border-black px-0.5 py-1 align-middle">১০</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {empDisplay.map((row: any, i: number) => {
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
                                                <td className="border border-black px-2 py-1.5 text-left font-medium truncate align-middle">
                                                    {cell(row.activity_name)}
                                                </td>
                                                <td className="border border-black px-1 py-1.5 align-middle">{cell(row.self_full_male)}</td>
                                                <td className="border border-black px-1 py-1.5 align-middle">{cell(row.self_full_female)}</td>
                                                <td className="border border-black px-1 py-1.5 align-middle">{cell(row.self_part_male)}</td>
                                                <td className="border border-black px-1 py-1.5 align-middle">{cell(row.self_part_female)}</td>
                                                <td className="border border-black px-1 py-1.5 align-middle">{cell(row.wage_full_male)}</td>
                                                <td className="border border-black px-1 py-1.5 align-middle">{cell(row.wage_full_female)}</td>
                                                <td className="border border-black px-1 py-1.5 align-middle">{cell(row.wage_part_male)}</td>
                                                <td className="border border-black px-1 py-1.5 align-middle">{cell(row.wage_part_female)}</td>
                                                <td className="border border-black px-1 py-1.5 font-bold align-middle bg-gray-50/50">{cell(full || '')}</td>
                                                <td className="border border-black px-1 py-1.5 font-bold align-middle bg-gray-50/50">{cell(part || '')}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="text-[12px] leading-relaxed space-y-1 mb-1.5">
                            <p>
                                ২. উৎপাদিত পণ্য সামগ্রীর কাঁচামালের উৎস ও বিবরণ (টিক চিহ্ন দিন): <strong className="px-1">{rawLabel}</strong>
                            </p>
                            <p>
                                ৩. চূড়ান্ত উৎপাদিত পণ্য সামগ্রী বিক্রয় তথ্য (টিক চিহ্ন দিন): <strong className="px-1">{salesLabel}</strong>
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-1.5">
                            <div>
                                <p className="font-bold text-[12px] mb-1">স্থাবর সম্পদ</p>
                                <table className="w-full border-collapse border border-black text-[11px]">
                                    <thead>
                                        <tr className="bg-gray-100/70">
                                            <th className="border border-black px-2 py-1.5">বিবরণ</th>
                                            <th className="border border-black px-2 py-1.5">শতাংশ/সংখ্যা</th>
                                            <th className="border border-black px-2 py-1.5">বর্তমান মূল্য (৳)</th>
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
                                                <td className="border border-black px-2 py-1.5">{label}</td>
                                                <td className="border border-black px-2 py-1.5 text-center">{cell(qty)}</td>
                                                <td className="border border-black px-2 py-1.5 text-center font-medium">{cell(val)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <p className="font-bold text-[12px] mb-1">অস্থাবর সম্পদ</p>
                                <table className="w-full border-collapse border border-black text-[11px]">
                                    <thead>
                                        <tr className="bg-gray-100/70">
                                            <th className="border border-black px-2 py-1.5">বিবরণ</th>
                                            <th className="border border-black px-2 py-1.5">বর্তমান মূল্য (৳)</th>
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
                                                <td className="border border-black px-2 py-1.5">{label}</td>
                                                <td className="border border-black px-2 py-1.5 text-center font-medium">{cell(val)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div>
                            <p className="font-bold text-[12px] mb-1">৫. বিভিন্ন উৎস হতে গৃহীত ঋণের বিবরণ</p>
                            <table className="w-full border-collapse border border-black text-[10.5px] mb-1.5">
                                <thead>
                                    <tr className="bg-gray-100/70">
                                        {[
                                            'সংস্থার/প্রতিষ্ঠানের নাম',
                                            'বর্তমান গৃহীত ঋণের পরিমাণ (৳)',
                                            'ঋণের মেয়াদ',
                                            'তথ্য প্রদানকারীর নাম',
                                            'মোবাইল নম্বর',
                                            'মন্তব্য',
                                        ].map((h) => (
                                            <th key={h} className="border border-black px-2 py-1.5 font-semibold">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {otherLoanDisplay.map((row: any, i: number) => (
                                        <tr key={i}>
                                            <td className="border border-black px-2 py-1.5">
                                                {cell(row.source_name || row.source)}
                                            </td>
                                            <td className="border border-black px-2 py-1.5 text-center font-medium">
                                                {cell(row.current_status || row.amount)}
                                            </td>
                                            <td className="border border-black px-2 py-1.5 text-center">
                                                {cell(row.round || row.duration)}
                                            </td>
                                            <td className="border border-black px-2 py-1.5">
                                                {cell(row.borrower_name)}
                                            </td>
                                            <td className="border border-black px-2 py-1.5 text-center font-mono">
                                                {cell(row.mobile)}
                                            </td>
                                            <td className="border border-black px-2 py-1.5">
                                                {cell(row.remarks || row.rate)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div>
                            <p className="font-bold text-[12px] mb-1">৬. আগামী ০১ বছরের উৎপাদন/ব্যবসায়িক পরিকল্পনা</p>
                            <table className="w-full border-collapse border border-black text-[11px] mb-1">
                                <thead>
                                    <tr className="bg-gray-100/70">
                                        {['প্রকল্পের নাম', 'বিনিয়োগের পরিমাণ (৳)', 'সম্ভাব্য নীট আয় (৳)'].map((h) => (
                                            <th key={h} className="border border-black px-2.5 py-1.5">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {planDisplay.map((row: any, i: number) => (
                                        <tr key={i}>
                                            <td className="border border-black px-2.5 py-1.5">{cell(row.project_name)}</td>
                                            <td className="border border-black px-2.5 py-1.5 text-center font-medium">{cell(row.investment)}</td>
                                            <td className="border border-black px-2.5 py-1.5 text-center font-medium">{cell(row.net_income)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="mt-auto pt-2 text-right text-[12px] text-gray-600 font-mono">১ / ২</div>
                </div>
            </div>

            {/* ========== PAGE 2 ========== */}
            <div
                id="preview-page-2"
                data-sync="page-2"
                data-print-page="2"
                className="print-page-sheet bg-white border border-gray-300 p-5 print:p-0 print:border-none text-[12.5px] print:text-[12px] print:leading-normal w-full"
            >
                <div className="print-page-content flex flex-col justify-between h-full w-full box-border">
                    <div className="space-y-2">
                        <div>
                            <p className="font-bold text-[12px] mb-1">৭. পরিকল্পনা অনুযায়ী বিনিয়োগকৃত তহবিল এবং তহবিলের উৎস</p>
                            <table className="w-full border-collapse border border-black text-[11px] mb-1.5">
                                <thead>
                                    <tr className="bg-gray-100/70">
                                        {['তহবিলের উৎস', 'টাকার পরিমাণ (৳)', 'মন্তব্য'].map((h) => (
                                            <th key={h} className="border border-black px-2 py-1">
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
                                            <td className="border border-black px-2 py-1.5">{label}</td>
                                            <td className="border border-black px-2 py-1.5 text-center font-bold">{cell(amount)}</td>
                                            <td className="border border-black px-2 py-1.5">{cell(remarks)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div>
                            <p className="font-bold text-[12px] mb-1">৮. সম্ভাব্য বিকল্প উৎস হতে বাৎসরিক আয়</p>
                            <table className="w-full border-collapse border border-black text-[11px] mb-1.5">
                                <tbody>
                                    {[
                                        ['কৃষি হতে', d.alt_income_agriculture],
                                        ['চাকরি হতে', d.alt_income_job],
                                        ['অন্যান্য', d.alt_income_other],
                                        ['মোট', d.alt_income_total],
                                    ].map(([label, val]) => (
                                        <tr key={String(label)}>
                                            <td className="border border-black px-2 py-1.5 w-1/2">{label}</td>
                                            <td className="border border-black px-2 py-1.5 text-center font-medium">{cell(val)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="text-[12px] leading-relaxed space-y-1 mb-1.5">
                            <p>
                                ৯. গত বছরের আয়-ব্যয় — মোট আয়:{' '}
                                <strong className="border-b border-dotted border-black px-1 inline-block min-w-[75px] text-center">
                                    {cell(d.last_year_total_income) || '........'}
                                </strong>{' '}
                                মোট ব্যয়:{' '}
                                <strong className="border-b border-dotted border-black px-1 inline-block min-w-[75px] text-center">
                                    {cell(d.last_year_total_expense) || '........'}
                                </strong>{' '}
                                নিট লাভ:{' '}
                                <strong className="border-b border-dotted border-black px-1 inline-block min-w-[75px] text-center">
                                    {cell(d.last_year_net_profit) || '........'}
                                </strong>
                            </p>
                            <p>
                                ১০. চলমান ঋণের দফা নং:{' '}
                                <strong className="border-b border-dotted border-black px-1 inline-block min-w-[55px] text-center">
                                    {cell(d.current_loan_round) || '........'}
                                </strong>
                                ; আবেদিত ঋণের পরিমাণ:{' '}
                                <strong className="border-b border-dotted border-black px-1 inline-block min-w-[90px] text-center text-emerald-900">
                                    {cell(d.applied_loan_amount) || '........'}
                                </strong>
                            </p>
                        </div>

                        <div>
                            <p className="font-bold text-[12px] mb-1">১১. বিগত ঋণের তথ্য (সর্বশেষ ৩ দফা)</p>
                            <table className="w-full border-collapse border border-black text-[10.5px] mb-1.5">
                                <thead>
                                    <tr className="bg-gray-100/70">
                                        {['ক্র.', 'গ্রহণের তারিখ', 'দফা', 'প্রকল্প', 'বিকল্প প্রকল্প', 'পরিশোধের তারিখ'].map((h) => (
                                            <th key={h} className="border border-black px-1.5 py-1">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {prevDisplay.map((row: any, i: number) => (
                                        <tr key={i}>
                                            <td className="border border-black px-1.5 py-1 text-center">{i + 1}</td>
                                            <td className="border border-black px-1.5 py-1 text-center">
                                                {formatDateBangla(row.receive_date) || cell(row.receive_date)}
                                            </td>
                                            <td className="border border-black px-1.5 py-1 text-center font-medium">{cell(row.round)}</td>
                                            <td className="border border-black px-1.5 py-1">{cell(row.project_name)}</td>
                                            <td className="border border-black px-1.5 py-1">{cell(row.alt_project)}</td>
                                            <td className="border border-black px-1.5 py-1 text-center">
                                                {formatDateBangla(row.repay_date) || cell(row.repay_date)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="text-[12px] leading-relaxed space-y-1 mb-1">
                            <p>
                                ১২. ক) মেয়াদকাল:{' '}
                                <strong className="border-b border-dotted border-black px-1 inline-block min-w-[75px] text-center">
                                    {cell(d.loan_duration_label) || '........'}
                                </strong>{' '}
                                খ) সার্ভিস চার্জ হার:{' '}
                                <strong className="border-b border-dotted border-black px-1 inline-block min-w-[45px] text-center">
                                    {cell(d.service_charge_rate) || '........'}
                                </strong>
                                %
                            </p>
                        </div>

                        <div>
                            <p className="font-bold text-[12px] mb-1">গ) ঋণ পরিশোধের তফসিল</p>
                            <table className="w-full border-collapse border border-black text-[11px] mb-1.5">
                                <thead>
                                    <tr className="bg-gray-100/70">
                                        {['পরিশোধের ধরণ', 'আসল (৳)', 'সার্ভিস চার্জ (৳)', 'মোট (৳)'].map((h) => (
                                            <th key={h} className="border border-black px-2 py-1">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border border-black px-2 py-1.5">এককালীন</td>
                                        <td className="border border-black px-2 py-1.5 text-center font-medium">{cell(d.installment_principal)}</td>
                                        <td className="border border-black px-2 py-1.5 text-center font-medium">{cell(d.installment_service_charge)}</td>
                                        <td className="border border-black px-2 py-1.5 text-center font-bold">{cell(d.installment_total)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="text-[12px] leading-relaxed space-y-1.5 mb-1.5">
                            <p className="font-bold text-[12px]">১৩. জামিনদারের তথ্য</p>
                            <p>
                                ১| নাম:{' '}
                                <strong className="border-b border-dotted border-black px-1 inline-block min-w-[130px]">
                                    {str(d.guarantor_1_name) || '........................'}
                                </strong>{' '}
                                ঠিকানা:{' '}
                                <span className="border-b border-dotted border-black px-1 inline-block min-w-[150px]">
                                    {str(d.guarantor_1_address) || '........................'}
                                </span>{' '}
                                মোবাইল:{' '}
                                <span className="font-mono border-b border-dotted border-black px-1 inline-block min-w-[95px]">
                                    {str(d.guarantor_1_mobile) || '..............'}
                                </span>
                            </p>
                            <p>
                                ২| নাম:{' '}
                                <strong className="border-b border-dotted border-black px-1 inline-block min-w-[130px]">
                                    {str(d.guarantor_2_name) || '........................'}
                                </strong>{' '}
                                ঠিকানা:{' '}
                                <span className="border-b border-dotted border-black px-1 inline-block min-w-[150px]">
                                    {str(d.guarantor_2_address) || '........................'}
                                </span>{' '}
                                মোবাইল:{' '}
                                <span className="font-mono border-b border-dotted border-black px-1 inline-block min-w-[95px]">
                                    {str(d.guarantor_2_mobile) || '..............'}
                                </span>
                            </p>
                            <div className="flex justify-end pt-1">
                                <p>
                                    সদস্য/সদস্যার স্বাক্ষর:{' '}
                                    <span className="border-b border-dotted border-black px-8 inline-block min-w-[160px]">
                                        {str(d.member_signature)}
                                    </span>
                                </p>
                            </div>
                        </div>

                        <div className="border border-black p-2.5 space-y-1 text-[12px]">
                            <p className="font-bold text-center text-[12.5px] border-b border-black pb-1 bg-gray-100/70">সংস্থার অফিস পর্যায়ে পূরণীয়</p>
                            <p className="min-h-[22px]">
                                (ক) অফিসারের মন্তব্য:{' '}
                                <span className="font-medium">
                                    {str(d.officer_post_inspection_comments || d.officer_comments) ||
                                        '................................................................'}
                                </span>
                            </p>
                            <p className="min-h-[22px]">
                                (খ) শাখা ব্যবস্থাপকের মন্তব্য:{' '}
                                <span className="font-medium">
                                    {str(d.branch_manager_post_inspection_comments || d.bm_comments) ||
                                        '................................................................'}
                                </span>
                            </p>
                            <p className="min-h-[22px]">
                                (গ) আঞ্চলিক ব্যবস্থাপকের মন্তব্য:{' '}
                                <span className="font-medium">
                                    {str(d.regional_manager_comments || d.rm_comments) ||
                                        '................................................................'}
                                </span>
                            </p>
                            <p className="min-h-[22px]">
                                (ঘ) চূড়ান্ত অনুমোদনকারীর মন্তব্য:{' '}
                                <span className="font-medium">
                                    {str(d.final_approver_comments) ||
                                        '................................................................'}
                                </span>
                            </p>
                            <div className="flex justify-between items-end pt-2">
                                <p>
                                    টাকা:{' '}
                                    <strong className="border-b border-dotted border-black px-1 min-w-[80px] inline-block font-bold">
                                        {str(d.final_approved_loan_amount_digits) || '........'}
                                    </strong>{' '}
                                    কথায়:{' '}
                                    <span className="border-b border-dotted border-black px-1 min-w-[160px] inline-block font-bold">
                                        {str(d.final_approved_loan_amount_words) || '................................'}
                                    </span>
                                </p>
                                <div className="text-center">
                                    <div className="h-10 w-44" />
                                    <p className="border-t border-dotted border-black pt-1 font-bold text-[11.5px]">চূড়ান্ত অনুমোদনকারীর স্বাক্ষর ও তারিখ</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto pt-2 text-right text-[11.5px] text-gray-600 font-mono">২ / ২</div>
                </div>
            </div>
        </div>
    );
}
