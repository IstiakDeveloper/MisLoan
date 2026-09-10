import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    Printer,
    ArrowLeft,
    FileText,
    Shield,
    HeartPulse,
    SearchCheck,
    CheckCircle2,
    Layers,
    BadgeCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import LoanAgreement from './Forms/LoanAgreement';
import GuarantorCommitment from './Forms/GuarantorCommitment';
import DeathRiskFund from './Forms/DeathRiskFund';
import FieldInvestigation from './Forms/FieldInvestigation';
import LoanApplicationApproval from './Forms/LoanApplicationApproval';

interface Props {
    application: any;
    initialFormId?: number | null;
}

export default function Print({ application, initialFormId = null }: Props) {
    const [selectedForm, setSelectedForm] = useState<number | 'all'>(
        initialFormId && [1, 2, 3, 4, 5].includes(initialFormId) ? initialFormId : 'all'
    );

    const hasMeaningfulData = (data: any): boolean => {
        if (data === null || data === undefined || data === '') return false;
        if (typeof data === 'string') {
            const trimmed = data.trim();
            return trimmed !== '' && trimmed !== 'null' && trimmed !== '{}' && trimmed !== '[]' && trimmed.length >= 3;
        }
        if (Array.isArray(data)) {
            if (data.length === 0) return false;
            return data.some((item) => hasMeaningfulData(item));
        }
        if (typeof data === 'object') {
            const keys = Object.keys(data);
            if (keys.length === 0) return false;
            return keys.some((key) => hasMeaningfulData(data[key]));
        }
        return true;
    };

    const hasAgreement = hasMeaningfulData(application.loan_agreement_data);
    const hasGuarantor = hasMeaningfulData(application.guarantor_info);
    const hasDeathRisk = hasMeaningfulData(application.nominee_info);
    const hasInvestigation = hasMeaningfulData(application.asset_info);
    const hasApproval = hasMeaningfulData(application.business_plan) || application.approved_amount != null;

    const availableForms: Array<{ id: number; title: string; icon: any; hasData: boolean }> = [
        { id: 1, title: '১. ঋণ চুক্তিপত্র', icon: FileText, hasData: hasAgreement },
        { id: 2, title: '২. জামিনদার অঙ্গীকারনামা', icon: Shield, hasData: hasGuarantor },
        { id: 3, title: '৩. মৃত্যুঝুঁকি তহবিল', icon: HeartPulse, hasData: hasDeathRisk },
        { id: 4, title: '৪. সরেজমিনে তদন্ত', icon: SearchCheck, hasData: hasInvestigation },
        { id: 5, title: '৫. ঋণ অনুমোদনপত্র', icon: CheckCircle2, hasData: hasApproval },
    ];

    const savedForms = availableForms.filter((f) => f.hasData);
    const previewAmount = Number(application.approved_amount || application.requested_amount || 0);
    const member = application.member_admission || application.memberAdmission || (application.legacy_member_snapshot ? (typeof application.legacy_member_snapshot === 'string' ? JSON.parse(application.legacy_member_snapshot) : application.legacy_member_snapshot) : null);
    const loanProduct = application.loan_product || application.loanProduct;
    const loanCategory = application.loan_category || application.loanCategory;
    const branch = application.branch || member?.branch;

    const commonProps = {
        onlyPreview: true as const,
        embedded: true as const,
        existingApplication: application,
        member: member,
        loanProduct: loanProduct,
        loanCategory: loanCategory,
        requestedAmount: previewAmount,
        branch: branch,
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            window.print();
        }, 500);
        return () => clearTimeout(timer);
    }, [selectedForm]);

    const handlePrintClick = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900 print:bg-white print:text-black">
            <Head title={`ঋণ ফাইল প্রিন্ট - ${member?.applicant_name_bn || member?.applicant_name_en || ''} (#${application.application_no})`}>
                <style>{`
                    * {
                        box-sizing: border-box;
                    }
                    body {
                        font-family: 'Noto Sans Bengali', 'Kalpurush', 'Arial', sans-serif;
                        color: #000;
                        background: #f1f5f9;
                        margin: 0;
                        padding: 0;
                    }
                    @media print {
                        @page {
                            size: A4 portrait;
                            margin: 8mm 10mm;
                        }
                        body {
                            print-color-adjust: exact !important;
                            -webkit-print-color-adjust: exact !important;
                            background: #fff !important;
                        }
                        .no-print {
                            display: none !important;
                        }
                        .print-page-break {
                            page-break-after: always !important;
                            break-after: page !important;
                        }
                        .print-card-wrapper {
                            box-shadow: none !important;
                            border: none !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            width: 100% !important;
                            max-width: 100% !important;
                        }
                    }
                `}</style>
            </Head>

            {/* Top Interactive Control Bar (Hidden when printing) */}
            <div className="no-print sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm p-3 sm:p-4">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => window.history.back()}
                            className="h-9 w-9 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-base font-bold text-slate-900">
                                    {member?.applicant_name_bn || member?.applicant_name_en}
                                </h1>
                                <span className="font-mono text-xs bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-lg border border-emerald-200">
                                    আবেদন #{application.application_no}
                                </span>
                                <Badge className="bg-emerald-600 text-white font-semibold text-xs">
                                    ৳ {previewAmount.toLocaleString('en-IN')}
                                </Badge>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {loanProduct?.product_name} ({loanCategory?.category_name_bn || loanCategory?.category_name}) | শাখা: {branch?.name}
                            </p>
                        </div>
                    </div>

                    {/* Form filter tabs & Print button */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto max-w-full">
                            <button
                                type="button"
                                onClick={() => setSelectedForm('all')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                                    selectedForm === 'all'
                                        ? 'bg-white text-emerald-700 shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Layers className="w-3.5 h-3.5" />
                                সব ফরম একসাথে ({savedForms.length})
                            </button>
                            {availableForms.map((form) => {
                                const FormIcon = form.icon;
                                const isSelected = selectedForm === form.id;
                                return (
                                    <button
                                        key={form.id}
                                        type="button"
                                        onClick={() => setSelectedForm(form.id)}
                                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                                            isSelected
                                                ? 'bg-white text-emerald-700 shadow-xs'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        <FormIcon className="w-3.5 h-3.5" />
                                        <span>{form.title}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <Button
                            onClick={handlePrintClick}
                            className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs gap-1.5 cursor-pointer shrink-0"
                        >
                            <Printer className="w-4 h-4" />
                            প্রিন্ট করুন
                        </Button>
                    </div>
                </div>
            </div>

            {/* Printable Content Area */}
            <div className="max-w-5xl mx-auto p-2 sm:p-6 space-y-6 print:p-0 print:m-0 print:space-y-0">
                
                {/* Form 1: Loan Agreement */}
                {(selectedForm === 'all' || selectedForm === 1) && (
                    <div className="print-card-wrapper bg-white rounded-2xl p-4 sm:p-8 shadow-sm border border-slate-200 print:rounded-none print:border-none print:p-0 print-page-break">
                        <LoanAgreement
                            {...commonProps}
                            savedData={application.loan_agreement_data}
                        />
                    </div>
                )}

                {/* Form 2: Guarantor Commitment */}
                {(selectedForm === 'all' || selectedForm === 2) && (
                    <div className="print-card-wrapper bg-white rounded-2xl p-4 sm:p-8 shadow-sm border border-slate-200 print:rounded-none print:border-none print:p-0 print-page-break">
                        <GuarantorCommitment
                            {...commonProps}
                            savedData={application.guarantor_info}
                        />
                    </div>
                )}

                {/* Form 3: Death Risk Fund */}
                {(selectedForm === 'all' || selectedForm === 3) && (
                    <div className="print-card-wrapper bg-white rounded-2xl p-4 sm:p-8 shadow-sm border border-slate-200 print:rounded-none print:border-none print:p-0 print-page-break">
                        <DeathRiskFund
                            {...commonProps}
                            savedData={application.nominee_info}
                        />
                    </div>
                )}

                {/* Form 4: Field Investigation */}
                {(selectedForm === 'all' || selectedForm === 4) && (
                    <div className="print-card-wrapper bg-white rounded-2xl p-4 sm:p-8 shadow-sm border border-slate-200 print:rounded-none print:border-none print:p-0 print-page-break">
                        <FieldInvestigation
                            {...commonProps}
                            savedData={application.asset_info}
                        />
                    </div>
                )}

                {/* Form 5: Loan Application Approval */}
                {(selectedForm === 'all' || selectedForm === 5) && (
                    <div className="print-card-wrapper bg-white rounded-2xl p-4 sm:p-8 shadow-sm border border-slate-200 print:rounded-none print:border-none print:p-0">
                        <LoanApplicationApproval
                            {...commonProps}
                            savedData={application.business_plan}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
