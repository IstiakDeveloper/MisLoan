import { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import {
    Search,
    User,
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    PiggyBank,
    Clock,
    Percent,
    Coins,
    Users,
    Phone,
    CreditCard,
    X,
    Sparkles,
    Check,
    Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import SavingsApplicationForm from './Forms/SavingsApplicationForm';
import ProfitSavingsForm from './Forms/ProfitSavingsForm';

interface Member {
    id: number;
    application_no: string;
    applicant_name_en: string;
    applicant_name_bn: string;
    nid_number: string;
    mobile_number: string;
    father_name_bn?: string;
    mother_name_bn?: string;
    spouse_name_bn?: string;
    present_village_road?: string;
    present_union?: string;
    present_upazila?: string;
    present_district?: string;
    present_post_code?: string;
    permanent_village_road?: string;
    permanent_union?: string;
    permanent_upazila?: string;
    permanent_district?: string;
    permanent_post_code?: string;
    samity?: {
        id: number;
        samity_name: string;
        samity_name_bn: string;
        samity_code: string;
    };
    status: string;
}

interface Props {
    savingsProduct: any;
    memberAdmission?: Member | null;
    branch: any;
    existingApplication?: any;
    formType?: string | null;
}

export default function Create({ savingsProduct, memberAdmission: initialMember, branch, existingApplication, formType }: Props) {
    const [memberSearchQuery, setMemberSearchQuery] = useState('');
    const [memberSearchResults, setMemberSearchResults] = useState<Member[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async () => {
        const q = memberSearchQuery.trim();
        if (q.length < 2) {
            setMemberSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const response = await fetch(`/member/savings-applications/search-members?query=${encodeURIComponent(q)}`);
            if (!response.ok) throw new Error('Search failed');
            const contentType = response.headers.get('content-type');
            if (!contentType?.includes('application/json')) {
                setMemberSearchResults([]);
                return;
            }
            const data = await response.json();
            setMemberSearchResults(data.members || []);
        } catch {
            setMemberSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleMemberSelect = (member: Member) => {
        if (member.status !== 'approved') {
            alert('শুধুমাত্র অনুমোদিত সদস্যদের জন্য সঞ্চয় আবেদন করা যাবে।');
            return;
        }
        // Reload page with member_id so backend sends full member + form
        router.visit(`/member/savings-applications/create/${savingsProduct.id}?member_id=${member.id}`);
    };

    useEffect(() => {
        const q = memberSearchQuery.trim();
        if (q.length < 2) {
            setMemberSearchResults([]);
            return;
        }
        const timeoutId = setTimeout(handleSearch, 300);
        return () => clearTimeout(timeoutId);
    }, [memberSearchQuery]);

    // When member is selected (from URL member_id), show the category's form
    if (initialMember) {
        const FormComponent = formType === 'profit_savings' ? ProfitSavingsForm : SavingsApplicationForm;

        return (
            <FormComponent
                memberAdmission={initialMember}
                savingsProduct={savingsProduct}
                branch={branch}
                existingApplication={existingApplication}
            />
        );
    }

    const formatAmount = (n: number) => (n ?? 0).toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const durationLabel = savingsProduct?.duration_months
        ? savingsProduct.duration_months >= 12
            ? `${Math.round(savingsProduct.duration_months / 12)} বছর`
            : `${savingsProduct.duration_months} মাস`
        : '—';

    return (
        <AdminLayout>
            <Head title="সদস্য নির্বাচন - সঞ্চয় আবেদন" />

            <div className="max-w-4xl mx-auto space-y-6 py-4 px-3 sm:px-6 pb-20">
                {/* ── 1. TOP STEPPER & BACK BUTTON ────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <button
                        onClick={() => router.visit('/member/savings-applications')}
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition active:scale-95 w-fit"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>তালিকায় ফিরে যান</span>
                    </button>

                    {/* Stepper Indicator */}
                    <div className="flex items-center gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>১. স্কিম নির্বাচিত</span>
                        </div>
                        <span className="text-slate-300">➔</span>
                        <div className="flex items-center gap-1.5 text-purple-700 font-bold bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                            <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] inline-flex items-center justify-center font-black">২</span>
                            <span>সদস্য নির্বাচন</span>
                        </div>
                        <span className="text-slate-300">➔</span>
                        <div className="flex items-center gap-1.5 text-slate-400 font-medium px-2 py-1">
                            <span>৩. ফর্ম পূরণ</span>
                        </div>
                    </div>
                </div>

                {/* ── 2. SELECTED PRODUCT HERO CARD ────────────────────────────────────── */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-6 sm:p-7 shadow-xl border border-slate-700/60">
                    <div className="absolute -right-10 -bottom-10 w-52 h-52 rounded-full bg-purple-600/20 blur-3xl pointer-events-none" />
                    <div className="absolute left-1/2 -top-10 w-40 h-40 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-md bg-purple-500/30 text-purple-200 text-[11px] font-mono font-bold border border-purple-400/30">
                                    কোড: {savingsProduct.product_code}
                                </span>
                                {savingsProduct.savings_category && (
                                    <span className="px-2.5 py-0.5 rounded-md bg-white/10 text-slate-200 text-[11px] font-semibold border border-white/10">
                                        {savingsProduct.savings_category.category_name_bn || savingsProduct.savings_category.category_name}
                                    </span>
                                )}
                            </div>

                            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                                {savingsProduct.product_name_bn || savingsProduct.product_name}
                            </h1>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-slate-300">
                                <span className="inline-flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>মেয়াদ: <strong className="text-white">{durationLabel}</strong></span>
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <Percent className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>মুনাফা: <strong className="text-white">{savingsProduct.interest_rate ?? 0}%</strong></span>
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                                    <span>সীমা: <strong className="text-white">৳{formatAmount(savingsProduct.min_amount)}{savingsProduct.max_amount ? ` – ৳${formatAmount(savingsProduct.max_amount)}` : ''}</strong></span>
                                </span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => router.visit('/member/savings-applications')}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 backdrop-blur-sm transition active:scale-95 shrink-0 self-start sm:self-center"
                        >
                            <span>স্কিম পরিবর্তন করুন</span>
                        </button>
                    </div>
                </div>

                {/* ── 3. SEARCH & MEMBER SELECTION ────────────────────────────────────── */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-7 space-y-6">
                    <div>
                        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                            <Users className="w-5 h-5 text-purple-600" />
                            <span>আবেদনকারী সদস্য নির্বাচন করুন</span>
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            সদস্যের নাম, জাতীয় পরিচয়পত্র (NID), মোবাইল নম্বর অথবা আবেদন/সদস্য কোড দিয়ে অনুসন্ধান করুন।
                        </p>
                    </div>

                    {/* Search Input Box */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="সদস্যের নাম, NID, মোবাইল অথবা আবেদন নং লিখুন..."
                            value={memberSearchQuery}
                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-10 py-3.5 text-sm bg-slate-50/70 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 focus:bg-white transition-all shadow-2xs font-medium placeholder:text-slate-400"
                            autoComplete="off"
                            autoFocus
                        />
                        {memberSearchQuery && (
                            <button
                                onClick={() => setMemberSearchQuery('')}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Quick Search Tags / Guidance */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-slate-400">দ্রুত সার্চ টিপস:</span>
                        <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-600 font-medium">ন্যূনতম ২ অক্ষর লিখুন</span>
                        <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-600 font-medium">মোবাইল নম্বর</span>
                        <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-600 font-medium">জাতীয় পরিচয়পত্র নং</span>
                    </div>

                    {/* Loading State */}
                    {isSearching && (
                        <div className="py-8 flex items-center justify-center gap-2.5 text-xs font-bold text-purple-700">
                            <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                            <span>সদস্য তথ্য অনুসন্ধান করা হচ্ছে...</span>
                        </div>
                    )}

                    {/* Results List */}
                    {memberSearchQuery.trim().length >= 2 && !isSearching && memberSearchResults.length > 0 && (
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
                                <span>প্রাপ্ত সদস্যসমূহ ({memberSearchResults.length})</span>
                                <span>অনুমোদিত সদস্যদের নির্বাচন করুন</span>
                            </div>

                            <div className="grid grid-cols-1 gap-3 max-h-[440px] overflow-y-auto pr-1">
                                {memberSearchResults.map((member) => {
                                    const isApproved = member.status === 'approved';

                                    return (
                                        <div
                                            key={member.id}
                                            className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                                                isApproved
                                                    ? 'border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/30 hover:shadow-sm'
                                                    : 'border-slate-200 bg-slate-50/60 opacity-60'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3.5">
                                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-100 to-indigo-100 text-purple-700 flex items-center justify-center font-black text-sm shrink-0 border border-purple-200/60">
                                                    {(member.applicant_name_bn || member.applicant_name_en || 'U').charAt(0)}
                                                </div>

                                                <div className="space-y-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="text-sm font-bold text-slate-900">
                                                            {member.applicant_name_bn || member.applicant_name_en}
                                                        </h3>
                                                        <span className="px-2 py-0.5 rounded-md bg-purple-100/70 text-purple-800 text-[10px] font-mono font-bold">
                                                            {member.application_no}
                                                        </span>
                                                        {member.samity && (
                                                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium">
                                                                সমিতি: {member.samity.samity_name_bn || member.samity.samity_name}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                                        <span className="inline-flex items-center gap-1">
                                                            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                                                            <span>NID: {member.nid_number}</span>
                                                        </span>
                                                        <span className="inline-flex items-center gap-1">
                                                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                            <span>{member.mobile_number}</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="shrink-0 self-end sm:self-center">
                                                {isApproved ? (
                                                    <Button
                                                        type="button"
                                                        onClick={() => handleMemberSelect(member)}
                                                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm px-4 py-2"
                                                    >
                                                        <span>নির্বাচন ও আবেদন</span>
                                                        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                                                    </Button>
                                                ) : (
                                                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                                                        অনুমোদিত নয়
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Empty Result */}
                    {memberSearchQuery.trim().length >= 2 && !isSearching && memberSearchResults.length === 0 && (
                        <div className="py-12 text-center space-y-2 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                            <Users className="w-8 h-8 text-slate-300 mx-auto" />
                            <p className="text-xs sm:text-sm font-bold text-slate-700">কোনো সদস্য পাওয়া যায়নি</p>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                অনুগ্রহ করে নাম, NID বা মোবাইল নম্বরের বানান সঠিক আছে কি না পরীক্ষা করুন অথবা অন্য কোনো তথ্য দিয়ে চেষ্টা করুন।
                            </p>
                        </div>
                    )}

                    {/* Initial State Prompt */}
                    {memberSearchQuery.trim().length < 2 && (
                        <div className="py-10 text-center space-y-1.5 border border-slate-100 rounded-2xl bg-slate-50/40">
                            <Search className="w-7 h-7 text-slate-300 mx-auto" />
                            <p className="text-xs font-bold text-slate-600">অনুসন্ধান শুরু করুন</p>
                            <p className="text-[11px] text-slate-400">
                                উপরের সার্চ বক্সে সদস্যের নাম বা মোবাইল নম্বর টাইপ করুন
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
