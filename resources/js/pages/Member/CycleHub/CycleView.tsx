import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import {
    ArrowLeft,
    Printer,
    FileText,
    CheckCircle2,
    Clock,
    User,
    Phone,
    Building2,
    Calendar,
    Banknote,
    Layers,
    Shield,
    FileCheck,
    SearchCheck,
    Coins,
    ArrowRight,
    ExternalLink,
    LayoutList,
    FolderKanban,
    HeartPulse,
    Info,
    Trash2,
    Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import MemberAdmissionFormView from '@/components/MemberAdmissionFormView';
import LoanAgreement from '../LoanApplications/Forms/LoanAgreement';
import GuarantorCommitment from '../LoanApplications/Forms/GuarantorCommitment';
import FieldInvestigation from '../LoanApplications/Forms/FieldInvestigation';
import LoanApplicationApproval from '../LoanApplications/Forms/LoanApplicationApproval';
import DeathRiskFund from '../LoanApplications/Forms/DeathRiskFund';

interface Props {
    admission: any;
    loanApplication: any | null;
    formSaved?: Record<number, boolean>;
    visibleFormIds?: number[];
    otherCycles: Array<{
        id: number;
        dofa: number;
        admission_status: string;
        loan_status?: string | null;
        loan_amount?: number | string | null;
    }>;
    currentDofa: number;
    userPermissions: {
        canCreateLoan: boolean;
        canRepayLoan: boolean;
        isFieldOfficer: boolean;
        isBranchUser: boolean;
    };
}

export default function CycleView({
    admission,
    loanApplication,
    formSaved = {},
    visibleFormIds,
    otherCycles,
    currentDofa,
    userPermissions,
}: Props) {
    const [viewMode, setViewMode] = useState<'single' | 'tabs'>('single');
    const [activeTab, setActiveTab] = useState<string>('admission');

    const hasLoan = !!loanApplication;
    const previewAmount = Number(loanApplication?.approved_amount || loanApplication?.requested_amount || 0);

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

    const formIsVisible = (formId: number): boolean => {
        if (visibleFormIds === undefined) {
            return true;
        }

        return visibleFormIds.includes(formId);
    };

    // Determine strictly which forms are saved, filled, and required for this product
    const hasAgreement = formIsVisible(1) && !!loanApplication && (formSaved[1] === true || (formSaved[1] === undefined && hasMeaningfulData(loanApplication.loan_agreement_data)));
    const hasGuarantor = formIsVisible(2) && !!loanApplication && (formSaved[2] === true || (formSaved[2] === undefined && hasMeaningfulData(loanApplication.guarantor_info)));
    const hasDeathRisk = formIsVisible(3) && !!loanApplication && (formSaved[3] === true || (formSaved[3] === undefined && hasMeaningfulData(loanApplication.nominee_info)));
    const hasInvestigation = formIsVisible(4) && !!loanApplication && (formSaved[4] === true || (formSaved[4] === undefined && hasMeaningfulData(loanApplication.asset_info)));
    const hasApproval = formIsVisible(5) && !!loanApplication && (formSaved[5] === true || (formSaved[5] === undefined && (hasMeaningfulData(loanApplication.business_plan) || loanApplication.approved_amount != null)));

    // Available active tabs
    const availableTabs: Array<{ id: string; label: string; icon: any }> = [
        { id: 'admission', label: '১. ভর্তি ফর্ম', icon: FileText },
    ];

    if (hasAgreement) {
        availableTabs.push({ id: 'agreement', label: `${availableTabs.length + 1}. ঋণ চুক্তিপত্র`, icon: FileCheck });
    }
    if (hasGuarantor) {
        availableTabs.push({ id: 'guarantor', label: `${availableTabs.length + 1}. জামিনদার অঙ্গীকারনামা`, icon: Shield });
    }
    if (hasDeathRisk) {
        availableTabs.push({ id: 'death_risk', label: `${availableTabs.length + 1}. মৃত্যুঝুঁকি তহবিল`, icon: HeartPulse });
    }
    if (hasInvestigation) {
        availableTabs.push({ id: 'investigation', label: `${availableTabs.length + 1}. সরেজমিনে তদন্ত প্রতিবেদন`, icon: SearchCheck });
    }
    if (hasApproval) {
        availableTabs.push({ id: 'approval', label: `${availableTabs.length + 1}. ঋণ আবেদন ও অনুমোদনপত্র`, icon: CheckCircle2 });
    }

    // Ensure activeTab is valid
    useEffect(() => {
        if (!availableTabs.some((t) => t.id === activeTab)) {
            setActiveTab('admission');
        }
    }, [activeTab, availableTabs.length]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'disbursed':
                return <Badge className="bg-emerald-600 text-white font-medium text-xs px-2.5 py-0.5 shadow-sm">সক্রিয় ঋণ (Disbursed)</Badge>;
            case 'repaid':
                return <Badge className="bg-blue-600 text-white font-medium text-xs px-2.5 py-0.5 shadow-sm">পরিশোধিত (Repaid)</Badge>;
            case 'approved':
                return <Badge className="bg-emerald-500 text-white font-medium text-xs px-2.5 py-0.5">অনুমোদিত (Approved)</Badge>;
            case 'pending_disbursement':
                return <Badge className="bg-amber-600 text-white font-medium text-xs px-2.5 py-0.5">বিতরণ অপেক্ষমাণ</Badge>;
            case 'under_review':
                return <Badge className="bg-amber-500 text-white font-medium text-xs px-2.5 py-0.5">যাচাইাধীন</Badge>;
            case 'submitted':
                return <Badge className="bg-sky-600 text-white font-medium text-xs px-2.5 py-0.5">জমা দেওয়া</Badge>;
            case 'draft':
                return <Badge variant="outline" className="text-slate-600 border-slate-300 text-xs px-2.5 py-0.5">খসড়া (Draft)</Badge>;
            case 'rejected':
                return <Badge variant="destructive" className="text-xs px-2.5 py-0.5">প্রত্যাখ্যাত</Badge>;
            default:
                return <Badge variant="secondary" className="text-xs px-2.5 py-0.5">{status}</Badge>;
        }
    };

    const handleDeleteDraftLoan = async (loanId: number) => {
        if (!confirm('আপনি কি নিশ্চিত যে এই খসড়া (Draft) ঋণ আবেদনটি মুছে ফেলতে চান?')) {
            return;
        }

        try {
            const res = await fetch(`/member/cycle-hub/loans/${loanId}/draft`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
            });

            const result = await res.json();
            if (res.ok && result.success) {
                alert(result.message || 'খসড়া ঋণ আবেদন মুছে ফেলা হয়েছে।');
                if (result.redirect_url) {
                    window.location.href = result.redirect_url;
                } else {
                    window.location.href = `/member/cycle-hub?member_id=${admission.id}`;
                }
            } else {
                alert(result.message || 'খসড়া ঋণ আবেদন মুছতে সমস্যা হয়েছে।');
            }
        } catch (err) {
            console.error('Delete draft loan error:', err);
            alert('খসড়া ঋণ আবেদন মুছতে ত্রুটি হয়েছে।');
        }
    };

    const handleDeleteDraftAdmission = async (admissionId: number) => {
        if (!confirm(`আপনি কি নিশ্চিত যে দফা ${currentDofa} এর খসড়া (Draft) ভর্তি আবেদনটি মুছে ফেলতে চান?\n\nএটি মুছে ফেললে এই দফার তথ্য বাদ যাবে এবং সদস্য পূর্ববর্তী দফায় ফেরত যাবে।`)) {
            return;
        }

        try {
            const res = await fetch(`/member/cycle-hub/admissions/${admissionId}/draft`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
            });

            const result = await res.json();
            if (res.ok && result.success) {
                alert(result.message || 'খসড়া ভর্তি আবেদন মুছে ফেলা হয়েছে।');
                if (result.redirect_url) {
                    window.location.href = result.redirect_url;
                } else {
                    window.location.href = `/member/cycle-hub`;
                }
            } else {
                alert(result.message || 'খসড়া ভর্তি আবেদন মুছতে সমস্যা হয়েছে।');
            }
        } catch (err) {
            console.error('Delete draft admission error:', err);
            alert('খসড়া ভর্তি আবেদন মুছতে ত্রুটি হয়েছে।');
        }
    };

    const scrollToSection = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const totalSavedFormsCount = availableTabs.length;

    return (
        <AdminLayout>
            <Head title={`সাইকেল ${currentDofa} ফাইল ও ফরমসমূহ - ${admission.applicant_name_bn}`} />

            <div className="w-full max-w-[1700px] mx-auto p-2.5 sm:p-5 lg:p-6 space-y-3.5 sm:space-y-4">
                
                {/* Top Sticky Navigation Bar */}
                <div className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 sticky top-1 sm:top-2 z-20 backdrop-blur-md bg-white/95">
                    <div className="flex items-start sm:items-center gap-2.5 sm:gap-3.5 min-w-0">
                        <Link href={`/member/cycle-hub?member_id=${admission.id}`} className="shrink-0 mt-0.5 sm:mt-0">
                            <Button variant="outline" size="sm" className="h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-xl hover:bg-slate-100 cursor-pointer">
                                <ArrowLeft className="w-4 h-4 text-slate-700" />
                            </Button>
                        </Link>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                <h1 className="text-sm sm:text-lg font-bold text-slate-900">
                                    {admission.applicant_name_bn}
                                </h1>
                                {admission.applicant_name_en && (
                                    <span className="text-slate-500 text-xs sm:text-sm">({admission.applicant_name_en})</span>
                                )}
                                <span className="font-mono text-[11px] sm:text-xs bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-lg border border-emerald-200">
                                    {admission.application_no}
                                </span>
                                <Badge className="bg-emerald-600 text-white font-semibold text-[10px] sm:text-xs px-2 py-0.5 rounded-lg">
                                    সাইকেল {currentDofa}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] sm:text-xs bg-slate-50 text-slate-700 border-slate-200 py-0.5">
                                    {totalSavedFormsCount} টি ফর্ম
                                </Badge>
                                {hasLoan && getStatusBadge(loanApplication.status)}
                            </div>
                            <span className="text-[11px] sm:text-xs text-slate-500 mt-1 block">
                                সমিতি: <strong>{admission.samity?.samity_name_bn || admission.samity?.samity_name} ({admission.samity?.samity_code})</strong> | শাখা: <strong>{admission.branch?.name}</strong>
                            </span>
                        </div>
                    </div>

                    {/* Controls, Quick Cycle Switcher & Print Actions */}
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        {/* View Mode Toggle */}
                        <div className="bg-slate-100 p-0.5 sm:p-1 rounded-xl flex items-center gap-1 border border-slate-200 w-full sm:w-auto justify-between sm:justify-start">
                            <button
                                type="button"
                                onClick={() => setViewMode('single')}
                                className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                    viewMode === 'single'
                                        ? 'bg-white text-emerald-700 shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <LayoutList className="w-3.5 h-3.5 shrink-0" />
                                <span>এক পেজে সব ({totalSavedFormsCount})</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('tabs')}
                                className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                    viewMode === 'tabs'
                                        ? 'bg-white text-emerald-700 shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <FolderKanban className="w-3.5 h-3.5 shrink-0" />
                                <span>ট্যাব ভিউ</span>
                            </button>
                        </div>

                        {otherCycles.length > 1 && (
                            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-0.5">
                                <span className="text-xs text-slate-500 font-medium hidden lg:inline">সাইকেল:</span>
                                <div className="flex gap-1 shrink-0">
                                    {otherCycles.map((c: any) => (
                                        <Link
                                            key={c.id}
                                            href={`/member/cycle-hub/cycle/${c.id}`}
                                            className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-bold transition-all border ${
                                                c.id === admission.id
                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            দফা {c.dofa}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Draft Loan Edit & Delete buttons */}
                        {hasLoan && loanApplication.status === 'draft' && (
                            <>
                                <a href={`/member/loan-applications/form-selection?member_id=${admission.id}`}>
                                    <Button size="sm" variant="outline" className="h-8 text-xs font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50 rounded-xl">
                                        <Pencil className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                        ঋণ এডিট
                                    </Button>
                                </a>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteDraftLoan(loanApplication.id)}
                                    className="h-8 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl"
                                >
                                    <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-500" />
                                    খসড়া ঋণ মুছুন
                                </Button>
                            </>
                        )}

                        {/* Admission Edit button (for draft or un-disbursed renewal) */}
                        {(!hasLoan || loanApplication.status === 'draft') && (
                            <a href={`/member-admissions/${admission.id}/edit?cycle_renewal=1`}>
                                <Button size="sm" variant="outline" className="h-8 text-xs font-semibold text-blue-700 border-blue-200 hover:bg-blue-50 rounded-xl">
                                    <Pencil className="w-3.5 h-3.5 mr-1 text-blue-600" />
                                    ভর্তি এডিট
                                </Button>
                            </a>
                        )}

                        {/* Cycle Delete button */}
                        {(!hasLoan || loanApplication.status === 'draft' || loanApplication.status === 'rejected') && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteDraftAdmission(admission.id)}
                                className="h-8 text-xs font-bold text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl shadow-xs"
                                title={`দফা ${currentDofa} মুছে ফেলুন`}
                            >
                                <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-500" />
                                দফা {currentDofa} মুছুন
                            </Button>
                        )}

                        <div className="flex items-center gap-1.5 flex-wrap">
                            <a
                                href={`/member-admissions/${admission.id}/print`}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <Button size="sm" variant="outline" className="h-8 text-xs font-semibold text-blue-700 border-blue-200 hover:bg-blue-50 rounded-xl">
                                    <Printer className="w-3.5 h-3.5 mr-1" />
                                    ভর্তি প্রিন্ট
                                </Button>
                            </a>

                            {hasLoan && (
                                <a
                                    href={`/member/loan-applications/${loanApplication.id}/print`}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <Button size="sm" className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs">
                                        <Printer className="w-3.5 h-3.5 mr-1" />
                                        লোন ফাইল প্রিন্ট
                                    </Button>
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Anchor Navigation Bar for Single Page Mode (Only for Saved Forms) */}
                {viewMode === 'single' && availableTabs.length > 1 && (
                    <div className="flex border border-slate-200 bg-white/95 backdrop-blur-md rounded-xl p-1 sm:p-1.5 gap-1 sm:gap-1.5 overflow-x-auto shadow-xs sticky top-[68px] sm:top-[76px] z-10">
                        {availableTabs.map((tab) => {
                            const TabIcon = tab.icon;
                            const sectionId = `section-${tab.id}`;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => scrollToSection(sectionId)}
                                    className="px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-bold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all flex items-center gap-1 sm:gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                                >
                                    <TabIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Tab Navigation for Tabbed Mode (Only for Saved Forms) */}
                {viewMode === 'tabs' && (
                    <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-2 sm:px-3 pt-2 gap-1 overflow-x-auto shadow-xs">
                        {availableTabs.map((tab) => {
                            const TabIcon = tab.icon;
                            const isCurrent = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                                        isCurrent
                                            ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
                                            : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                    }`}
                                >
                                    <TabIcon className="w-4 h-4 shrink-0" />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* CONTENT AREA: SINGLE PAGE OR TABBED FULL PREVIEW DOSSIERS */}
                <div className="space-y-4 sm:space-y-6">

                    {/* Section 1: Member Admission Form (Always present) */}
                    {(viewMode === 'single' || activeTab === 'admission') && (
                        <div id="section-admission" className="bg-white rounded-2xl p-3 sm:p-6 border border-slate-200 shadow-sm space-y-3 sm:space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                                        ১. সদস্য ভর্তি আবেদন ফর্ম (দফা {currentDofa})
                                    </h3>
                                    <span className="text-xs text-slate-500 block mt-0.5">
                                        ভর্তির তারিখ: <strong>{admission.admission_date || '—'}</strong> | ক্যাটাগরি: <strong>{admission.member_category?.category_name_bn || admission.member_category?.category_name}</strong>
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 self-start sm:self-auto">
                                    <a
                                        href={`/member-admissions/${admission.id}/print`}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <Button size="sm" variant="outline" className="h-8 text-xs text-blue-700 border-blue-200 rounded-lg hover:bg-blue-50">
                                            <Printer className="w-3.5 h-3.5 mr-1" />
                                            ভর্তি ফর্ম প্রিন্ট
                                        </Button>
                                    </a>
                                </div>
                            </div>

                            <div className="border border-slate-200 rounded-xl p-2 sm:p-4 md:p-6 bg-slate-50/40 w-full overflow-x-auto">
                                <div className="w-full min-w-0">
                                    <MemberAdmissionFormView admission={admission} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Section 2: Loan Agreement (ONLY IF SAVED) */}
                    {hasAgreement && (viewMode === 'single' || activeTab === 'agreement') && (
                        <div id="section-agreement" className="bg-white rounded-2xl p-3 sm:p-6 border border-slate-200 shadow-sm space-y-3 sm:space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                        <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                                        ঋণ চুক্তি পত্র (Loan Agreement)
                                    </h3>
                                    <span className="text-xs text-slate-500 block mt-0.5">
                                        আবেদন নং: <strong>#{loanApplication.application_no}</strong> | অনুমোদিত: <strong>৳ {Number(loanApplication.approved_amount || loanApplication.requested_amount || 0).toLocaleString('en-IN')}</strong>
                                    </span>
                                </div>
                                <div className="self-start sm:self-auto">
                                    <a
                                        href={`/member/loan-applications/${loanApplication.id}/print?form=1`}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <Button size="sm" variant="outline" className="h-8 text-xs text-blue-700 border-blue-200 rounded-lg hover:bg-blue-50">
                                            <Printer className="w-3.5 h-3.5 mr-1" />
                                            চুক্তিপত্র প্রিন্ট
                                        </Button>
                                    </a>
                                </div>
                            </div>

                            <div className="border border-slate-200 rounded-xl p-2 sm:p-4 md:p-6 bg-slate-50/40 w-full overflow-x-auto">
                                <div className="w-full min-w-0 flex justify-center">
                                    <LoanAgreement
                                        onlyPreview={true}
                                        embedded={true}
                                        existingApplication={loanApplication}
                                        member={admission}
                                        loanProduct={loanApplication.loan_product}
                                        loanCategory={loanApplication.loan_category}
                                        requestedAmount={previewAmount}
                                        branch={admission.branch}
                                        savedData={loanApplication.loan_agreement_data}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Section 3: Guarantor Commitment (ONLY IF SAVED) */}
                    {hasGuarantor && (viewMode === 'single' || activeTab === 'guarantor') && (
                        <div id="section-guarantor" className="bg-white rounded-2xl p-3 sm:p-6 border border-slate-200 shadow-sm space-y-3 sm:space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                                        ঋণের জামিনদার/দায়িত্ব গ্রহণকারীর অঙ্গীকার নামা
                                    </h3>
                                    <span className="text-xs text-slate-500 block mt-0.5">
                                        জামিনদার ও কো-অ্যাপ্লিকেন্টের বিবরণ ও অঙ্গীকার
                                    </span>
                                </div>
                                <div className="self-start sm:self-auto">
                                    <a
                                        href={`/member/loan-applications/${loanApplication.id}/print?form=2`}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <Button size="sm" variant="outline" className="h-8 text-xs text-blue-700 border-blue-200 rounded-lg hover:bg-blue-50">
                                            <Printer className="w-3.5 h-3.5 mr-1" />
                                            অঙ্গীকারনামা প্রিন্ট
                                        </Button>
                                    </a>
                                </div>
                            </div>

                            <div className="border border-slate-200 rounded-xl p-2 sm:p-4 md:p-6 bg-slate-50/40 w-full overflow-x-auto">
                                <div className="w-full min-w-0 flex justify-center">
                                    <GuarantorCommitment
                                        onlyPreview={true}
                                        embedded={true}
                                        existingApplication={loanApplication}
                                        member={admission}
                                        loanProduct={loanApplication.loan_product}
                                        loanCategory={loanApplication.loan_category}
                                        requestedAmount={previewAmount}
                                        branch={admission.branch}
                                        savedData={loanApplication.guarantor_info}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Section 4: Death Risk Fund (ONLY IF SAVED) */}
                    {hasDeathRisk && (viewMode === 'single' || activeTab === 'death_risk') && (
                        <div id="section-death-risk" className="bg-white rounded-2xl p-3 sm:p-6 border border-slate-200 shadow-sm space-y-3 sm:space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                        <HeartPulse className="w-4 h-4 text-emerald-600 shrink-0" />
                                        মৃত্যুঝুঁকি তহবিল আবেদন ও নমিনি ঘোষণা
                                    </h3>
                                    <span className="text-xs text-slate-500 block mt-0.5">
                                        সদস্যের মনোনীত উত্তরাধিকারী/নমিনির বিবরণ
                                    </span>
                                </div>
                                <div className="self-start sm:self-auto">
                                    <a
                                        href={`/member/loan-applications/${loanApplication.id}/print?form=3`}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <Button size="sm" variant="outline" className="h-8 text-xs text-blue-700 border-blue-200 rounded-lg hover:bg-blue-50">
                                            <Printer className="w-3.5 h-3.5 mr-1" />
                                            তহবিল আবেদন প্রিন্ট
                                        </Button>
                                    </a>
                                </div>
                            </div>

                            <div className="border border-slate-200 rounded-xl p-2 sm:p-4 md:p-6 bg-slate-50/40 w-full overflow-x-auto">
                                <div className="w-full min-w-0 flex justify-center">
                                    <DeathRiskFund
                                        onlyPreview={true}
                                        embedded={true}
                                        existingApplication={loanApplication}
                                        member={admission}
                                        loanProduct={loanApplication.loan_product}
                                        loanCategory={loanApplication.loan_category}
                                        requestedAmount={previewAmount}
                                        branch={admission.branch}
                                        savedData={loanApplication.nominee_info}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Section 5: Field Investigation (ONLY IF SAVED) */}
                    {hasInvestigation && (viewMode === 'single' || activeTab === 'investigation') && (
                        <div id="section-investigation" className="bg-white rounded-2xl p-3 sm:p-6 border border-slate-200 shadow-sm space-y-3 sm:space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                        <SearchCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                                        সরেজমিনে তদন্ত প্রতিবেদন (Field Investigation Report)
                                    </h3>
                                    <span className="text-xs text-slate-500 block mt-0.5">
                                        শাখা ব্যবস্থাপক / ফিল্ড অফিসার কর্তৃক সরেজমিনে তদন্ত ও যাচাইকরণ
                                    </span>
                                </div>
                                <div className="self-start sm:self-auto">
                                    <a
                                        href={`/member/loan-applications/${loanApplication.id}/print?form=4`}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <Button size="sm" variant="outline" className="h-8 text-xs text-blue-700 border-blue-200 rounded-lg hover:bg-blue-50">
                                            <Printer className="w-3.5 h-3.5 mr-1" />
                                            তদন্ত প্রতিবেদন প্রিন্ট
                                        </Button>
                                    </a>
                                </div>
                            </div>

                            <div className="border border-slate-200 rounded-xl p-2 sm:p-4 md:p-6 bg-slate-50/40 w-full overflow-x-auto">
                                <div className="w-full min-w-0 flex justify-center">
                                    <FieldInvestigation
                                        onlyPreview={true}
                                        embedded={true}
                                        existingApplication={loanApplication}
                                        member={admission}
                                        loanProduct={loanApplication.loan_product}
                                        loanCategory={loanApplication.loan_category}
                                        requestedAmount={previewAmount}
                                        branch={admission.branch}
                                        savedData={loanApplication.asset_info}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Section 6: Loan Approval Form (ONLY IF SAVED) */}
                    {hasApproval && (viewMode === 'single' || activeTab === 'approval') && (
                        <div id="section-approval" className="bg-white rounded-2xl p-3 sm:p-6 border border-slate-200 shadow-sm space-y-3 sm:space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                        জাগরণ/বুনিয়াদ/আগ্রসর ঋণ আবেদন ও অনুমোদনপত্র
                                    </h3>
                                    <span className="text-xs text-slate-500 block mt-0.5">
                                        কমিটি ও অনুমোদকগণের চূড়ান্ত অনুমোদন ও মঞ্জুরি
                                    </span>
                                </div>
                                <div className="self-start sm:self-auto">
                                    <a
                                        href={`/member/loan-applications/${loanApplication.id}/print?form=5`}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <Button size="sm" variant="outline" className="h-8 text-xs text-blue-700 border-blue-200 rounded-lg hover:bg-blue-50">
                                            <Printer className="w-3.5 h-3.5 mr-1" />
                                            অনুমোদনপত্র প্রিন্ট
                                        </Button>
                                    </a>
                                </div>
                            </div>

                            <div className="border border-slate-200 rounded-xl p-2 sm:p-4 md:p-6 bg-slate-50/40 w-full overflow-x-auto">
                                <div className="w-full min-w-0 flex justify-center">
                                    <LoanApplicationApproval
                                        onlyPreview={true}
                                        embedded={true}
                                        existingApplication={loanApplication}
                                        member={admission}
                                        loanProduct={loanApplication.loan_product}
                                        loanCategory={loanApplication.loan_category}
                                        requestedAmount={previewAmount}
                                        branch={admission.branch}
                                        savedData={loanApplication.business_plan}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notice when only admission exists with no saved loan forms */}
                    {!hasAgreement && !hasGuarantor && !hasDeathRisk && !hasInvestigation && !hasApproval && (
                        <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3 text-slate-600 text-xs">
                            <Info className="w-5 h-5 text-slate-400 shrink-0" />
                            <span>
                                এই সাইকেলে সদস্যের ভর্তি ফর্ম সংরক্ষিত আছে। কোনো অতিরিক্ত ঋণ ফর্ম এখনও সংরক্ষণ করা হয়নি।
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}

