import React from 'react';
import { formatDateBangla, toBanglaDigits, formatBanglaNumber } from '@/utils/dateUtils';
import { LoanAgreementData } from './Types';

export function LoanAgreementPrintView({ data }: { data: LoanAgreementData }) {
    const d = data || {} as LoanAgreementData;
    const fmt = formatDateBangla;
    const num = (v: any) => (v != null && v !== '' && !isNaN(Number(v)) ? Number(v) : 0);
    const str = (v: any) => (v != null && v !== '' ? String(v) : '');
    const bn = (v: any) => toBanglaDigits(v);
    const bnNum = (v: any) => formatBanglaNumber(v);

    // Employment stats extraction (supports both self_emp_* and self_* aliases)
    const selfFullFemale = str(d.self_emp_full_female || d.self_full_female);
    const selfFullMale = str(d.self_emp_full_male || d.self_full_male);
    const selfPartFemale = str(d.self_emp_part_female || d.self_part_female);
    const selfPartMale = str(d.self_emp_part_male || d.self_part_male);
    const wageFullFemale = str(d.wage_emp_full_female || d.wage_full_female);
    const wageFullMale = str(d.wage_emp_full_male || d.wage_full_male);
    const wagePartFemale = str(d.wage_emp_part_female || d.wage_part_female);
    const wagePartMale = str(d.wage_emp_part_male || d.wage_part_male);

    const fullTimeTotal = num(selfFullFemale) + num(selfFullMale) + num(wageFullFemale) + num(wageFullMale);
    const partTimeTotal = num(selfPartFemale) + num(selfPartMale) + num(wagePartFemale) + num(wagePartMale);

    // Calculate service charge percentage rate for terms clause (4)
    const rawRate = d.service_charge_rate != null && d.service_charge_rate !== ''
        ? String(d.service_charge_rate)
        : (d.interest_rate != null && d.interest_rate !== '' && Number(d.interest_rate) > 0
            ? String(d.interest_rate)
            : (num(d.loan_amount) > 0 && num(d.service_charge) > 0
                ? ((num(d.service_charge) / num(d.loan_amount)) * 100).toFixed(2).replace(/\.00$/, '')
                : ''));
    const serviceChargeRate = bn(rawRate);

    // Sufolon loans are 6-month lump-sum repayments (1 installment)
    const totalAmount = num(d.total_amount || (num(d.loan_amount) + num(d.service_charge)));
    const catName = `${d.loan_category_name || ''}`.toLowerCase();
    const prodName = `${d.loan_product_name || ''}`.toLowerCase();
    const isSufolon = catName.includes('sufolon') || catName.includes('শুফলন') || catName.includes('সুফলন') ||
                      prodName.includes('sufolon') || prodName.includes('সুফলন') || prodName.includes('শুফলন') ||
                      num(d.number_of_installments) === 1;

    const displayInstallments = isSufolon ? 1 : (num(d.number_of_installments) || 1);
    const displayInstallmentAmount = isSufolon ? totalAmount : (num(d.installment_amount) || totalAmount);
    const displayLastInstallmentAmount = isSufolon ? totalAmount : (num(d.last_installment_amount) || displayInstallmentAmount);

    // Convert mobile number to array of 11 digits for grid boxes
    const mobileDigits = (str(d.mobile_number) || '').padEnd(11, ' ').slice(0, 11).split('').map(ch => bn(ch));

    return (
        <div
            className="bg-white border border-gray-300 p-6 sm:p-8 rounded-lg text-gray-900 print:border-none print:p-0 print:m-0 w-full overflow-x-auto"
            style={{ fontFamily: 'Kalpurush, Arial, sans-serif', fontSize: '14px', lineHeight: '1.6', color: '#000' }}
        >
            {/* PAGE 1: Everything above "সাক্ষীগণের স্বাক্ষর :" */}
            <div className="page-1-wrapper space-y-4">
                {/* Header: page-centered text; logo glued to left of that block */}
                <div className="mb-3 flex flex-col items-center">
                    <div className="relative inline-flex flex-col items-center">
                        <img
                            src="/logo.png"
                            alt="মৌসুমী"
                            className="absolute right-full top-1/2 mr-2 h-[72px] w-[72px] -translate-y-1/2 object-contain"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                        <h1 className="text-[22px] font-bold leading-none tracking-wide text-black">মৌসুমী</h1>
                        <p className="text-[12px] font-semibold leading-tight mt-0.5 text-black">উকিলপাড়া, নওগাঁ</p>
                        <div className="mt-1.5 inline-block rounded-full border-2 border-black px-5 py-1">
                            <h2 className="text-[13px] font-bold text-black leading-tight whitespace-nowrap">
                                ঋণ চুক্তিপত্র
                            </h2>
                        </div>
                    </div>
                    <p className="text-xs font-bold mt-2 text-center">
                        ঋণ কর্মসূচির নাম :{' '}
                        <span className="border-b border-dotted border-gray-800 inline-block min-w-[200px] text-left px-2 text-sm font-bold">
                            {str(d.loan_category_name)}
                        </span>
                    </p>
                </div>

                {/* ১ম পক্ষ (ঋণ দাতা) */}
                <div className="text-xs sm:text-sm space-y-1 mb-2">
                    <p className="font-bold text-black text-sm">১ম পক্ষ (ঋণ দাতা)</p>
                    <p className="pl-3">
                        শাখার নাম : <span className="border-b border-dotted border-gray-800 inline-block min-w-[260px] px-1 font-semibold">{str(d.branch_name)}</span>
                    </p>
                    <p className="pl-3">
                        ঠিকানা : <span className="border-b border-dotted border-gray-800 inline-block min-w-[260px] px-1 font-semibold">{str(d.branch_address)}</span>
                    </p>
                </div>

                {/* ২য় পক্ষ (ঋণ গ্রহীতা) */}
                <div className="text-xs sm:text-sm space-y-1.5 mb-3">
                    <p className="font-bold text-black text-sm">২য় পক্ষ (ঋণ গ্রহীতা)</p>
                    <div className="pl-3 space-y-1.5 text-xs sm:text-sm leading-relaxed">
                        <p className="flex flex-wrap gap-x-4 gap-y-1">
                            <span>নাম : <span className="border-b border-dotted border-gray-800 px-2 font-bold text-sm">{str(d.member_name_bn)}</span></span>
                            <span>পিতা/স্বামী : <span className="border-b border-dotted border-gray-800 px-2 font-semibold">{str(d.father_husband_name)}</span></span>
                            <span>সদস্য নং : <span className="border-b border-dotted border-gray-800 px-2 font-bold">{bn(d.member_code)}</span></span>
                            <span>সমিতির কোড নং : <span className="border-b border-dotted border-gray-800 px-2 font-semibold">{bn(d.samity_code)}</span></span>
                        </p>
                        <p className="flex flex-wrap gap-x-4 gap-y-1">
                            <span>সমিতির নাম : <span className="border-b border-dotted border-gray-800 px-2 font-semibold">{str(d.samity_name)}</span></span>
                            <span>মোবাইল নং : <span className="border-b border-dotted border-gray-800 px-2 font-semibold">{bn(d.mobile_number)}</span></span>
                            <span>গ্রাম : <span className="border-b border-dotted border-gray-800 px-2 font-semibold">{str(d.village)}</span></span>
                            <span>ডাকঘর : <span className="border-b border-dotted border-gray-800 px-2 font-semibold">{str(d.union)}</span></span>
                        </p>
                        <p className="flex flex-wrap gap-x-4 gap-y-1">
                            <span>ইউনিয়ন : <span className="border-b border-dotted border-gray-800 px-2 font-semibold">{str(d.union)}</span></span>
                            <span>থানা : <span className="border-b border-dotted border-gray-800 px-2 font-semibold">{str(d.upazila)}</span></span>
                            <span>জেলা : <span className="border-b border-dotted border-gray-800 px-2 font-semibold">{str(d.district)}</span></span>
                            <span>তারিখ : <span className="border-b border-dotted border-gray-800 px-2 font-semibold">{fmt(d.disbursement_date)}</span></span>
                        </p>
                    </div>
                    <p className="mt-2 text-xs sm:text-sm font-medium leading-relaxed">
                        (১) ১ম পক্ষ ২য় পক্ষকে ঋণ বাবদ <span className="border-b border-dotted border-gray-800 px-3 font-bold text-sm text-green-800">{bnNum(d.loan_amount)}</span> টাকা নিম্নে উল্লেখিত মেয়াদে এবং চুক্তিতে প্রদান করলেন।
                    </p>
                </div>

                {/* ঋণের বিবরণ (Table) */}
                <div className="mb-3">
                    <h3 className="text-center font-bold text-xs sm:text-sm mb-1.5">ঋণের বিবরণ</h3>
                    <table className="w-full border-collapse border border-black text-xs">
                        <thead>
                            <tr className="bg-gray-100 text-center font-bold">
                                <th rowSpan={2} className="border border-black px-1.5 py-1">প্রকল্পের নাম</th>
                                <th rowSpan={2} className="border border-black px-1.5 py-1">ঋণের মেয়াদ</th>
                                <th rowSpan={2} className="border border-black px-1.5 py-1">ঋণ গ্রহীতার নাম</th>
                                <th colSpan={2} className="border border-black px-1.5 py-0.5">টাকার পরিমাণ</th>
                                <th rowSpan={2} className="border border-black px-1.5 py-1">প্রদানের তারিখ</th>
                                <th rowSpan={2} className="border border-black px-1.5 py-1">পরিশোধের শেষ তারিখ</th>
                                <th rowSpan={2} className="border border-black px-1.5 py-1">কিস্তির সংখ্যা</th>
                                <th rowSpan={2} className="border border-black px-1.5 py-1">কিস্তির পরিমাণ</th>
                                <th rowSpan={2} className="border border-black px-1.5 py-1">শেষ কিস্তি</th>
                            </tr>
                            <tr className="bg-gray-100 text-center font-bold">
                                <th className="border border-black px-1 py-0.5">মূল টাকা</th>
                                <th className="border border-black px-1 py-0.5">সা. চা. সহ</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="text-center font-medium h-8">
                                <td className="border border-black px-1.5 py-1 text-left">{str(d.loan_purpose)}</td>
                                <td className="border border-black px-1.5 py-1 whitespace-nowrap">{bn(d.loan_duration_months)} মাস</td>
                                <td className="border border-black px-1.5 py-1 text-left font-bold whitespace-nowrap">{str(d.member_name_bn)}</td>
                                <td className="border border-black px-1.5 py-1 font-bold text-green-800 whitespace-nowrap">{bnNum(d.loan_amount)}</td>
                                <td className="border border-black px-1.5 py-1 whitespace-nowrap">{bnNum(d.total_amount || d.loan_amount + d.service_charge)}</td>
                                <td className="border border-black px-1.5 py-1 whitespace-nowrap">{fmt(d.disbursement_date)}</td>
                                <td className="border border-black px-1.5 py-1 whitespace-nowrap">{fmt(d.last_installment_date)}</td>
                                <td className="border border-black px-1.5 py-1 whitespace-nowrap">{bn(displayInstallments)}</td>
                                <td className="border border-black px-1.5 py-1 whitespace-nowrap">{bnNum(displayInstallmentAmount)}</td>
                                <td className="border border-black px-1.5 py-1 whitespace-nowrap">{bnNum(displayLastInstallmentAmount)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Terms & Conditions (১ to ১১) */}
                <div className="space-y-1 text-xs sm:text-[12px] leading-relaxed mb-3">
                    <p>(১) ২য় পক্ষ চুক্তিপত্রে উল্লেখিত উদ্দেশ্য ছাড়া অন্য কোন প্রকল্পে ঋণের টাকা ব্যবহার করতে পারবেন না।</p>
                    <p>(৩) গৃহীত ঋণের শর্তানুযায়ী ব্যবহার নিশ্চিত করার জন্য ঋণ গ্রহীতাগণ মৌসুমীর দায়িত্বপ্রাপ্ত অফিসারের নিকট আয়-ব্যয়ের হিসাব দেখাতে বাধ্য থাকবেন।</p>
                    <p>(৪) ঋণ ফেরত দেওয়ার নিয়ম অনুযায়ী ২য় পক্ষ ১ম পক্ষের নিকট {serviceChargeRate ? `${str(serviceChargeRate)}` : '........'}% হারে সেবামূল্যসহ ঋণের টাকা ফেরত দিতে বাধ্য থাকবেন।</p>
                    <p>(৫) সমিতির ঋণ গ্রহীতাগণ স্বনির্ভর হওয়ার লক্ষ্যে সমিতির নির্ধারিত হার অনুযায়ী সঞ্চয় তহবিল জমা করবেন।</p>
                    <p>(৬) যদি কোন বিশেষ কারণে ২য় পক্ষ নির্দিষ্ট সময়ে ঋণের কিস্তি পরিশোধে ব্যর্থ হন, সেক্ষেত্রে অবশ্যই লিখিতভাবে গ্রহণযোগ্য কারণ দর্শানো সাপেক্ষে ২য় পক্ষ ১ম পক্ষ বরাবর নির্ধারিত জরিমানা সহ সংশ্লিষ্ট ঋণের কিস্তির টাকা প্রদান করতে বাধ্য থাকবেন।</p>
                    <p>(৭) এতদিন পর্যন্ত উপরোক্ত ঋণের টাকা ও তার উপর ধার্যকৃত সেবামূল্য পরিশোধ না হবে, ততদিন পর্যন্ত উক্ত ঋণের টাকা দ্বারা অর্জিত সম্পত্তি ১ম পক্ষের সম্পত্তি হিসাবে বিবেচিত হবে।</p>
                    <p>(৮) ২য় পক্ষ ঋণ পরিশোধে ব্যর্থ হলে ১ম পক্ষ আইনানুগ ব্যবস্থা গ্রহণের অধিকার সংরক্ষণ করেন।</p>
                    <p>(৯) কোন প্রকল্পে ব্যবহৃত টাকার লোকসান হলেও তার দায় দায়িত্ব গ্রহীতার থাকবে। তাকে ঋণের সম্পূর্ণ টাকা সেবামূল্যসহ পরিশোধ করতে হবে।</p>
                    <p>(১০) ঋণের টাকা সম্পূর্ণ পরিশোধ না হওয়া পর্যন্ত ঋণ গ্রহীতা তার ব্যক্তিগত সঞ্চয় ফেরত নিতে পারবে না।</p>
                    <p>(১১) ঋণ গ্রহীতার মৃত্যু হলে বা দেশ ত্যাগ করলে সেক্ষেত্রে ১ম পক্ষ উক্ত ঋণের টাকা পরিশোধ বিষয়ে যে সিদ্ধান্ত গ্রহণ করবে তা কার্যকর বলে বিবেচিত হবে।</p>
                </div>

                {/* Declaration Statement */}
                <p className="text-xs sm:text-[12.5px] font-medium leading-relaxed mb-3 pl-4">
                    এতদ্বারা আমরা ১ম ও ২য় পক্ষ স্বেচ্ছায়, স্বজ্ঞানে ও সুস্থ শরীরে কারোর দ্বারা প্ররোচিত না হয়ে নিম্নলিখিত সাক্ষীগণের সামনে এই চুক্তিপত্রে স্বাক্ষর সম্পাদন করলাম।
                </p>

                {/* Ticket Box & 2nd Party Signature Section */}
                <div className="relative pt-2">
                    {/* Revenue Ticket Right */}
                    <div className="absolute right-4 top-0 border-2 border-black w-24 h-16 flex items-center justify-center text-center bg-gray-50/50">
                        <span className="text-sm font-bold">টিকিট</span>
                    </div>

                    <div className="space-y-2 text-xs sm:text-sm">
                        <p className="font-bold text-black text-sm">২য় পক্ষের স্বাক্ষর :</p>
                        
                        <div className="pl-4 space-y-1.5">
                            <p>
                                ঋণ গ্রহীতার স্বাক্ষর : <span className="border-b border-dotted border-gray-800 inline-block min-w-[200px]">
                                    {d.applicant_signature_image && (
                                        <img src={d.applicant_signature_image} alt="Sig" style={{ height: '24px', width: '70px', objectFit: 'contain' }} className="inline-block" />
                                    )}
                                </span>
                            </p>
                            <p>
                                নাম : <span className="border-b border-dotted border-gray-800 inline-block min-w-[220px] font-bold px-1 text-sm">{str(d.applicant_signature_name) || str(d.member_name_bn)}</span>
                            </p>
                            <p className="pt-1">
                                অভিভাবকের স্বাক্ষর : <span className="border-b border-dotted border-gray-800 inline-block min-w-[200px]">
                                    {d.guardian_signature_image && (
                                        <img src={d.guardian_signature_image} alt="Sig" style={{ height: '24px', width: '70px', objectFit: 'contain' }} className="inline-block" />
                                    )}
                                </span>
                            </p>
                            <p>
                                নাম : <span className="border-b border-dotted border-gray-800 inline-block min-w-[220px] font-bold px-1 text-sm">{str(d.guardian_name)}</span>
                            </p>
                        </div>
                    </div>

                    {/* Mobile 11 Digit Grid Box */}
                    <div className="flex items-center justify-end gap-2 mt-3 pr-4">
                        <span className="font-bold text-xs sm:text-sm">মোবাইল নং :</span>
                        <div className="flex">
                            {mobileDigits.map((digit, idx) => (
                                <div key={idx} className="w-5.5 h-6.5 border border-black flex items-center justify-center font-bold text-xs sm:text-sm bg-white">
                                    {digit.trim()}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* PAGE 2 BREAK: Strictly starts from "সাক্ষীগণের স্বাক্ষর :" */}
            <div style={{ pageBreakBefore: 'always', breakBefore: 'page' }} className="page-break print-page-2 pt-6 mt-8 print:pt-0 print:mt-0">
                {/* 1. সাক্ষীগণের স্বাক্ষর */}
                <div className="text-xs sm:text-sm space-y-2 mb-4">
                    <p className="font-bold text-black text-sm">সাক্ষীগণের স্বাক্ষর :</p>
                    <div className="pl-4 space-y-2 text-xs sm:text-sm">
                        <p className="flex justify-between items-center">
                            <span>১. সভানেত্রীর নাম : <span className="border-b border-dotted border-gray-800 inline-block min-w-[240px] font-semibold px-1">{str(d.president_name)}</span></span>
                            <span className="mr-12">স্বাক্ষর : <span className="border-b border-dotted border-gray-800 inline-block min-w-[220px]">
                                {d.president_signature_image && <img src={d.president_signature_image} alt="Sig" style={{ height: '24px', width: '70px', objectFit: 'contain' }} className="inline-block" />}
                            </span></span>
                        </p>
                        <p className="flex justify-between items-center">
                            <span>২. সম্পাদিকার নাম : <span className="border-b border-dotted border-gray-800 inline-block min-w-[240px] font-semibold px-1">{str(d.secretary_name)}</span></span>
                            <span className="mr-12">স্বাক্ষর : <span className="border-b border-dotted border-gray-800 inline-block min-w-[220px]">
                                {d.secretary_signature_image && <img src={d.secretary_signature_image} alt="Sig" style={{ height: '24px', width: '70px', objectFit: 'contain' }} className="inline-block" />}
                            </span></span>
                        </p>
                    </div>
                </div>

                {/* 2. Member & Samity Summary paragraph */}
                <div className="text-xs sm:text-sm leading-relaxed space-y-1.5 mb-4">
                    <p>
                        আবেদনকারী <span className="border-b border-dotted border-gray-800 px-2 font-bold text-sm">{str(d.samity_name)}</span> সমিতির একজন সক্রিয় সদস্য। উক্ত সমিতির সদস্য সংখ্যা <span className="border-b border-dotted border-gray-800 px-2 font-semibold">{bn(d.samity_member_count) || '........'}</span> জন।
                    </p>
                    <p>
                        বর্তমান ঋণ সংখ্যা <span className="border-b border-dotted border-gray-800 px-2 font-semibold">{bn(d.current_loan_count) || '........'}</span> জন। মোট চলতি ঋণ <span className="border-b border-dotted border-gray-800 px-2 font-semibold">{bnNum(d.total_current_loan) || '........'}</span> টাকা। মেয়াদোত্তীর্ণ ঋণ <span className="border-b border-dotted border-gray-800 px-2 font-semibold">{bnNum(d.expired_loan_amount) || '........'}</span> টাকা।
                    </p>
                    <p>
                        মেয়াদোত্তীর্ণ ঋণ গ্রহী সংখ্যা <span className="border-b border-dotted border-gray-800 px-2 font-semibold">{bn(d.expired_loan_members) || '........'}</span> জন। চলতি বকেয়া <span className="border-b border-dotted border-gray-800 px-2 font-semibold">{bnNum(d.current_due_amount) || '........'}</span> টাকা, <span className="border-b border-dotted border-gray-800 px-2 font-semibold">{bn(d.due_members) || '........'}</span> জন। আদায়ের হার <span className="border-b border-dotted border-gray-800 px-2 font-semibold">{bn(d.realization_rate) || '........'}</span>।
                    </p>
                </div>

                {/* 3. ভর্তি ফরমের সাথে সংযুক্ত সংক্রান্ত তথ্য (টিক চিহ্ন দিন) Table */}
                <div className="mb-4">
                    <p className="font-bold text-xs sm:text-sm mb-1.5">ভর্তি ফরমের সাথে সংযুক্ত সংক্রান্ত তথ্য (টিক চিহ্ন দিন) :</p>
                    <table className="w-full border-collapse border border-black text-xs sm:text-sm">
                        <tbody>
                            <tr>
                                <td className="border border-black px-3 py-1.5">
                                    <div className="flex items-center gap-4">
                                        <span>সদস্যের ছবি :</span>
                                        <span className="border border-black px-2.5 py-0.5 flex items-center gap-1 font-semibold">
                                            {d.has_member_photo !== false ? '✓' : ''} আছে
                                        </span>
                                        <span className="border border-black px-2.5 py-0.5 flex items-center gap-1 font-semibold">
                                            {d.has_member_photo === false ? '✓' : ''} নাই
                                        </span>
                                    </div>
                                </td>
                                <td className="border border-black px-3 py-1.5">
                                    <div className="flex items-center gap-4">
                                        <span>সদস্যের জাতীয় পরিচয়পত্রের কপি :</span>
                                        <span className="border border-black px-2.5 py-0.5 flex items-center gap-1 font-semibold">
                                            {d.has_member_nid !== false ? '✓' : ''} আছে
                                        </span>
                                        <span className="border border-black px-2.5 py-0.5 flex items-center gap-1 font-semibold">
                                            {d.has_member_nid === false ? '✓' : ''} নাই
                                        </span>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-black px-3 py-1.5">
                                    <div className="flex items-center gap-4">
                                        <span>অভিভাবকের ছবি :</span>
                                        <span className="border border-black px-2.5 py-0.5 flex items-center gap-1 font-semibold">
                                            {d.has_guardian_photo !== false ? '✓' : ''} আছে
                                        </span>
                                        <span className="border border-black px-2.5 py-0.5 flex items-center gap-1 font-semibold">
                                            {d.has_guardian_photo === false ? '✓' : ''} নাই
                                        </span>
                                    </div>
                                </td>
                                <td className="border border-black px-3 py-1.5">
                                    <div className="flex items-center gap-4">
                                        <span>অভিভাবকের জাতীয় পরিচয়পত্রের কপি :</span>
                                        <span className="border border-black px-2.5 py-0.5 flex items-center gap-1 font-semibold">
                                            {d.has_guardian_nid !== false ? '✓' : ''} আছে
                                        </span>
                                        <span className="border border-black px-2.5 py-0.5 flex items-center gap-1 font-semibold">
                                            {d.has_guardian_nid === false ? '✓' : ''} নাই
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* 4. Recommendation Lines */}
                <div className="space-y-6 text-xs sm:text-sm mb-5">
                    <div className="flex justify-between items-end pt-2">
                        <p>
                            আবেদনকারীকে <span className="border-b border-dotted border-gray-800 px-4 font-bold text-sm sm:text-base text-green-800">{bnNum(d.loan_amount)}</span> টাকা ঋণ মঞ্জুর করা যেতে পারে।
                        </p>
                        <div className="text-center min-w-[200px]">
                            <div className="h-[67px] print:h-[67px]" aria-hidden="true" />
                            <p className="font-semibold border-t border-dotted border-gray-800 pt-1">
                                সংশ্লিষ্ট অফিসারের স্বাক্ষর (সিল সহ)
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-between items-end pt-3">
                        <p>
                            আবেদনকারীকে <span className="border-b border-dotted border-gray-800 px-4 font-bold text-sm sm:text-base text-green-800">{bnNum(d.loan_amount)}</span> টাকা ঋণ মঞ্জুর করা হলো।
                        </p>
                        <div className="text-center min-w-[250px]">
                            <div className="h-[67px] print:h-[67px]" aria-hidden="true" />
                            <p className="font-semibold border-t border-dotted border-gray-800 pt-1">
                                শাখা ব্যবস্থাপক/আঞ্চলিক ব্যবস্থাপকের স্বাক্ষর (সিল সহ)
                            </p>
                        </div>
                    </div>
                </div>

                {/* 5. কর্মসংস্থান সংক্রান্ত তথ্য (Table matching Photo 2) */}
                <div className="mb-5">
                    <p className="font-bold text-xs sm:text-sm mb-1.5">কর্মসংস্থান সংক্রান্ত তথ্য :</p>
                    <table className="w-full border-collapse border border-black text-xs">
                        <thead>
                            <tr className="bg-gray-100 text-center font-bold">
                                <th rowSpan={3} className="border border-black px-1 py-1 w-28">ঋণ কার্যক্রমের নাম</th>
                                <th colSpan={4} className="border border-black px-1 py-1">স্ব-কর্মসংস্থান/পারিবারিক কর্মসংস্থান</th>
                                <th colSpan={4} className="border border-black px-1 py-1">মজুরি ভিত্তিক কর্মসংস্থান</th>
                                <th colSpan={2} className="border border-black px-1 py-1">মোট</th>
                            </tr>
                            <tr className="bg-gray-100 text-center font-bold">
                                <th colSpan={2} className="border border-black px-1 py-0.5">পূর্ণকালীন</th>
                                <th colSpan={2} className="border border-black px-1 py-0.5">খণ্ডকালীন</th>
                                <th colSpan={2} className="border border-black px-1 py-0.5">পূর্ণকালীন</th>
                                <th colSpan={2} className="border border-black px-1 py-0.5">খণ্ডকালীন</th>
                                <th rowSpan={2} className="border border-black px-1 py-0.5">পূর্ণ সময়<br/>৯ = ১+২+৫+৬</th>
                                <th rowSpan={2} className="border border-black px-1 py-0.5">আংশিক সময়<br/>১০ = ৩+৪+৭+৮</th>
                            </tr>
                            <tr className="bg-gray-100 text-center font-bold">
                                <th className="border border-black px-1 py-0.5">মহিলা<br/>১</th>
                                <th className="border border-black px-1 py-0.5">পুরুষ<br/>২</th>
                                <th className="border border-black px-1 py-0.5">মহিলা<br/>৩</th>
                                <th className="border border-black px-1 py-0.5">পুরুষ<br/>৪</th>
                                <th className="border border-black px-1 py-0.5">মহিলা<br/>৫</th>
                                <th className="border border-black px-1 py-0.5">পুরুষ<br/>৬</th>
                                <th className="border border-black px-1 py-0.5">মহিলা<br/>৭</th>
                                <th className="border border-black px-1 py-0.5">পুরুষ<br/>৮</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="text-center font-medium h-8">
                                <td className="border border-black px-1.5 py-1 text-left font-semibold">{str(d.loan_category_name) || str(d.loan_product_name)}</td>
                                <td className="border border-black px-1 py-1">{bn(selfFullFemale) || ''}</td>
                                <td className="border border-black px-1 py-1">{bn(selfFullMale) || ''}</td>
                                <td className="border border-black px-1 py-1">{bn(selfPartFemale) || ''}</td>
                                <td className="border border-black px-1 py-1">{bn(selfPartMale) || ''}</td>
                                <td className="border border-black px-1 py-1">{bn(wageFullFemale) || ''}</td>
                                <td className="border border-black px-1 py-1">{bn(wageFullMale) || ''}</td>
                                <td className="border border-black px-1 py-1">{bn(wagePartFemale) || ''}</td>
                                <td className="border border-black px-1 py-1">{bn(wagePartMale) || ''}</td>
                                <td className="border border-black px-1 py-1 font-bold text-sm">
                                    {bn(fullTimeTotal) || ''}
                                </td>
                                <td className="border border-black px-1 py-1 font-bold text-sm">
                                    {bn(partTimeTotal) || ''}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* 6. ১ম পক্ষ Signatures section */}
                <div className="pt-3">
                    <p className="font-bold text-sm mb-4 text-black">১ম পক্ষ :</p>
                    <div className="grid grid-cols-3 gap-6 text-xs sm:text-sm">
                        <div className="space-y-1.5">
                            <p>অফিসারের স্বাক্ষর : <span className="border-b border-dotted border-gray-800 inline-block min-w-[120px]">
                                {d.credit_officer_signature && <img src={d.credit_officer_signature} alt="Sig" style={{ height: '22px', width: '60px', objectFit: 'contain' }} className="inline-block" />}
                            </span></p>
                            <p>নাম : <span className="border-b border-dotted border-gray-800 inline-block min-w-[140px] font-semibold">{str(d.credit_officer_name)}</span></p>
                            <p>পিন : <span className="border-b border-dotted border-gray-800 inline-block min-w-[140px] font-semibold">{bn(d.credit_officer_pin)}</span></p>
                        </div>
                        <div className="space-y-1.5">
                            <p>হিসাবরক্ষকের স্বাক্ষর : <span className="border-b border-dotted border-gray-800 inline-block min-w-[120px]">
                                {d.accountant_signature && <img src={d.accountant_signature} alt="Sig" style={{ height: '22px', width: '60px', objectFit: 'contain' }} className="inline-block" />}
                            </span></p>
                            <p>নাম : <span className="border-b border-dotted border-gray-800 inline-block min-w-[140px] font-semibold">{str(d.accountant_name)}</span></p>
                            <p>পিন : <span className="border-b border-dotted border-gray-800 inline-block min-w-[140px] font-semibold">{bn(d.accountant_pin)}</span></p>
                        </div>
                        <div className="space-y-1.5">
                            <p>ব্যবস্থাপকের স্বাক্ষর : <span className="border-b border-dotted border-gray-800 inline-block min-w-[120px]">
                                {d.branch_manager_signature && <img src={d.branch_manager_signature} alt="Sig" style={{ height: '22px', width: '60px', objectFit: 'contain' }} className="inline-block" />}
                            </span></p>
                            <p>নাম : <span className="border-b border-dotted border-gray-800 inline-block min-w-[140px] font-semibold">{str(d.branch_manager_name)}</span></p>
                            <p>পিন : <span className="border-b border-dotted border-gray-800 inline-block min-w-[140px] font-semibold">{bn(d.branch_manager_pin)}</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
