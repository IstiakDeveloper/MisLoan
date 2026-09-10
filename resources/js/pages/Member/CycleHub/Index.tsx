import React, { useState, useEffect, useRef } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import {
    Search,
    User,
    Phone,
    Building2,
    RotateCw,
    PlusCircle,
    CheckCircle2,
    Clock,
    FileText,
    Printer,
    Eye,
    ArrowRight,
    Check,
    X,
    Banknote,
    BadgeCheck,
    Layers,
    ArrowUpRight,
    Sparkles,
    ShieldCheck,
    FolderKanban,
    ChevronRight,
    FileCheck,
    Filter,
    Trash2,
    Pencil,
    Edit,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface Branch {
    id: number;
    name: string;
    code: string;
}

interface Samity {
    id: number;
    samity_name: string;
    samity_name_bn: string;
    samity_code: string;
    branch_id: number;
}

interface LoanCategory {
    id: number;
    category_name: string;
    category_name_bn: string;
    category_code: string;
}

interface LoanProduct {
    id: number;
    product_name: string;
    product_name_bn: string;
    product_code: string;
    loan_category_id: number;
    min_amount: number;
    max_amount: number;
    duration_months: number;
}

interface SearchResult {
    id: number;
    application_no: string;
    applicant_name_bn: string;
    applicant_name_en: string;
    guardian_name: string;
    mobile_number: string;
    nid_number: string;
    samity_name: string;
    branch_name: string;
    current_dofa: number;
    cycles_count: number;
}

interface LoanInfo {
    id: number;
    application_no: string;
    status: string;
    requested_amount: number | string;
    approved_amount: number | string;
    disbursed_amount: number | string;
    product_name: string;
    product_code: string;
    category_name: string;
    duration_months: number;
    disbursed_at: string | null;
    disbursed_by_name: string | null;
    repaid_at: string | null;
    repaid_by_name: string | null;
    repayment_notes: string | null;
    created_at: string | null;
    has_agreement: boolean;
    has_guarantor: boolean;
    has_investigation: boolean;
    has_approval: boolean;
}

interface CycleItem {
    admission_id: number;
    dofa: number;
    admission_status: string;
    admission_date: string | null;
    survey_date: string | null;
    created_at: string | null;
    is_legacy: boolean;
    family_count: number;
    assets_count: number;
    loans: LoanInfo[];
}

interface MemberDetail {
    id: number;
    application_no: string;
    applicant_name_bn: string;
    applicant_name_en: string;
    father_name_bn: string;
    father_name_en: string;
    mother_name_bn: string;
    spouse_name_bn: string;
    mobile_number: string;
    nid_number: string;
    gender: string;
    marital_status: string;
    present_address: string;
    branch_id: number;
    branch_name: string;
    branch_code: string;
    samity_id: number;
    samity_name: string;
    samity_code: string;
    category_name: string;
    customer_photo_path: string | null;
    has_active_loan: boolean;
    active_loan: {
        id: number;
        application_no: string;
        status: string;
        amount: number | string;
    } | null;
    can_repay: boolean;
    repayable_loan_id: number | null;
    can_start_next_cycle: boolean;
    current_max_dofa: number;
    next_dofa: number;
    latest_admission_id: number;
}

interface MemberCycleData {
    member: MemberDetail;
    cycles: CycleItem[];
}

interface Props {
    branches: Branch[];
    samities: Samity[];
    loanCategories: LoanCategory[];
    loanProducts: LoanProduct[];
    initialMemberData?: MemberCycleData | null;
    userPermissions: {
        canCreateLoan: boolean;
        canRepayLoan: boolean;
        isFieldOfficer: boolean;
        isBranchUser: boolean;
    };
}

export default function Index({
    branches,
    samities,
    loanCategories,
    loanProducts,
    initialMemberData = null,
    userPermissions,
}: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBranchId, setSelectedBranchId] = useState<string>('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [memberData, setMemberData] = useState<MemberCycleData | null>(initialMemberData);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    // Repay modal state
    const [showRepayModal, setShowRepayModal] = useState(false);
    const [repayingLoanId, setRepayingLoanId] = useState<number | null>(null);
    const [repayDate, setRepayDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [repayNotes, setRepayNotes] = useState<string>('');
    const [isSubmittingRepay, setIsSubmittingRepay] = useState(false);

    // Next cycle loading state
    const [isCloningNextCycle, setIsCloningNextCycle] = useState(false);

    // Search debounce & click outside
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const searchDropdownRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target as Node)) {
                setSearchResults([]);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearchInput = (value: string) => {
        setSearchQuery(value);

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (value.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        searchTimeoutRef.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const params = new URLSearchParams({ query: value });
                if (selectedBranchId) {
                    params.set('branch_id', selectedBranchId);
                }
                const res = await fetch(`/member/cycle-hub/search?${params.toString()}`);
                const data = await res.json();
                setSearchResults(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Member search error:', err);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 250);
    };

    const loadMemberDetails = async (memberId: number) => {
        setIsLoadingDetails(true);
        setSearchResults([]);
        try {
            const res = await fetch(`/member/cycle-hub/member/${memberId}`);
            if (res.ok) {
                const data: MemberCycleData = await res.json();
                setMemberData(data);
                // Update browser URL query without full reload
                const url = new URL(window.location.href);
                url.searchParams.set('member_id', String(memberId));
                window.history.pushState({}, '', url.toString());
            } else {
                alert('সদস্যের তথ্য লোড করতে সমস্যা হয়েছে।');
            }
        } catch (err) {
            console.error('Load member details error:', err);
            alert('সার্ভার এরর, আবার চেষ্টা করুন।');
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const openRepayModal = (loanId: number) => {
        setRepayingLoanId(loanId);
        setRepayDate(new Date().toISOString().split('T')[0]);
        setRepayNotes('');
        setShowRepayModal(true);
    };

    const handleConfirmRepay = async () => {
        if (!repayingLoanId) return;
        setIsSubmittingRepay(true);
        try {
            const res = await fetch(`/member/cycle-hub/loans/${repayingLoanId}/repay`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({
                    repaid_at: repayDate,
                    repayment_notes: repayNotes,
                }),
            });

            const result = await res.json();
            if (res.ok && result.success) {
                setShowRepayModal(false);
                if (memberData?.member.id) {
                    await loadMemberDetails(memberData.member.id);
                }
            } else {
                alert(result.message || 'পরিশোধ সম্পন্ন করা সম্ভব হয়নি।');
            }
        } catch (err) {
            console.error('Repay loan error:', err);
            alert('পরিশোধ সম্পন্ন করার সময় ত্রুটি হয়েছে।');
        } finally {
            setIsSubmittingRepay(false);
        }
    };

    const handleStartNextCycle = async () => {
        if (!memberData?.member.latest_admission_id) return;
        if (!confirm(`আপনি কি এই সদস্যের পরবর্তী সাইকেল (দফা ${memberData.member.next_dofa}) শুরু করতে চান?\n\nপূর্ববর্তী ভর্তি ফর্মের তথ্য স্বয়ংক্রিয়ভাবে ক্লোন হয়ে সরাসরি এডিট পেজে যাবে এবং মেম্বার কোড অপরিবর্তিত থাকবে।`)) {
            return;
        }

        setIsCloningNextCycle(true);
        try {
            const res = await fetch(`/member/cycle-hub/admissions/${memberData.member.latest_admission_id}/start-next-cycle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
            });

            const result = await res.json();
            if (res.ok && result.success && result.edit_admission_url) {
                // Instantly redirect to the prefilled edit form for the new cycle
                window.location.href = result.edit_admission_url;
            } else {
                alert(result.message || 'পরবর্তী সাইকেল শুরু করতে সমস্যা হয়েছে।');
                setIsCloningNextCycle(false);
            }
        } catch (err) {
            console.error('Start next cycle error:', err);
            alert('পরবর্তী সাইকেল তৈরিতে ত্রুটি হয়েছে।');
            setIsCloningNextCycle(false);
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
                if (result.memberData) {
                    setMemberData(result.memberData);
                } else if (memberData?.member.id) {
                    loadMemberDetails(memberData.member.id);
                }
            } else {
                alert(result.message || 'খসড়া ঋণ আবেদন মুছতে সমস্যা হয়েছে।');
            }
        } catch (err) {
            console.error('Delete draft loan error:', err);
            alert('খসড়া ঋণ আবেদন মুছতে ত্রুটি হয়েছে।');
        }
    };

    const handleDeleteDraftAdmission = async (admissionId: number, dofa: number) => {
        if (!confirm(`আপনি কি নিশ্চিত যে দফা ${dofa} এর খসড়া (Draft) ভর্তি আবেদনটি মুছে ফেলতে চান?\n\nএটি মুছে ফেললে এই দফার তথ্য বাদ যাবে এবং সদস্য পূর্ববর্তী দফায় ফেরত যাবে।`)) {
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
                if (result.memberData) {
                    setMemberData(result.memberData);
                } else if (result.redirect_url) {
                    window.location.href = result.redirect_url;
                } else {
                    window.location.reload();
                }
            } else {
                alert(result.message || 'খসড়া ভর্তি আবেদন মুছতে সমস্যা হয়েছে।');
            }
        } catch (err) {
            console.error('Delete draft admission error:', err);
            alert('খসড়া ভর্তি আবেদন মুছতে ত্রুটি হয়েছে।');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'disbursed':
                return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-2.5 py-0.5 shadow-sm">সক্রিয় ঋণ (Disbursed)</Badge>;
            case 'repaid':
                return <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-2.5 py-0.5 shadow-sm">পরিশোধিত (Repaid)</Badge>;
            case 'approved':
                return <Badge className="bg-emerald-500 text-white font-semibold text-xs px-2.5 py-0.5">অনুমোদিত (Approved)</Badge>;
            case 'pending_disbursement':
                return <Badge className="bg-amber-600 text-white font-semibold text-xs px-2.5 py-0.5">বিতরণ অপেক্ষমাণ</Badge>;
            case 'under_review':
                return <Badge className="bg-amber-500 text-white font-semibold text-xs px-2.5 py-0.5">যাচাইাধীন</Badge>;
            case 'submitted':
                return <Badge className="bg-sky-600 text-white font-semibold text-xs px-2.5 py-0.5">জমা দেওয়া</Badge>;
            case 'draft':
                return <Badge variant="outline" className="text-slate-600 border-slate-300 text-xs px-2.5 py-0.5">খসড়া (Draft)</Badge>;
            case 'rejected':
                return <Badge variant="destructive" className="text-xs px-2.5 py-0.5">প্রত্যাখ্যাত</Badge>;
            default:
                return <Badge variant="secondary" className="text-xs px-2.5 py-0.5">{status}</Badge>;
        }
    };

    return (
        <AdminLayout>
            <Head title="সদস্য সাইকেল ও পোর্টফোলিও হাব - Member Cycle Hub" />

            <div className="w-full max-w-[1700px] mx-auto p-3 sm:p-5 lg:p-8 space-y-5 sm:space-y-8">
                
                {/* 1. HERO CENTERED SEARCH CONSOLE */}
                <div className={`relative transition-all duration-300 ${!memberData ? 'py-6 sm:py-14' : 'py-1 sm:py-3'}`}>
                    
                    {/* Background Ambient Glow (Only on Empty/Hero state) */}
                    {!memberData && (
                        <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none overflow-hidden">
                            <div className="w-[320px] sm:w-[600px] h-[220px] sm:h-[350px] bg-gradient-to-tr from-emerald-400/15 via-teal-300/10 to-transparent blur-3xl rounded-full transform -translate-y-6" />
                        </div>
                    )}

                    <div className={`mx-auto text-center space-y-3 sm:space-y-4 transition-all duration-300 ${!memberData ? 'max-w-3xl' : 'max-w-4xl'}`}>
                        
                        {/* Title & Badge (Hero mode) */}
                        {!memberData && (
                            <>
                                <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[11px] sm:text-xs font-bold shadow-xs">
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse shrink-0" />
                                    <span>সদস্য সাইকেল ও ঋণ পোর্টফোলিও হাব</span>
                                </div>
                                
                                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-snug sm:leading-tight">
                                    সদস্য খুঁজুন এবং <span className="bg-gradient-to-r from-emerald-600 to-teal-700 bg-clip-text text-transparent">সাইকেল ফাইল</span> পরিচালনা করুন
                                </h1>
                                
                                <p className="text-xs sm:text-sm lg:text-base text-slate-500 max-w-xl mx-auto leading-relaxed px-2">
                                    ১০ ডিজিট মেম্বার কোড, আবেদনকারী বা অভিভাবকের নাম, মোবাইল নম্বর অথবা NID দিয়ে সদস্যের সকল সাইকেলের ভর্তি ও ঋণের তথ্য অনুসন্ধান করুন।
                                </p>
                            </>
                        )}

                        {/* Search Container */}
                        <div className="relative mt-2 sm:mt-4 z-40" ref={searchDropdownRef}>
                            <div className="flex flex-col sm:flex-row items-stretch gap-2 bg-white/95 backdrop-blur-md p-2 sm:p-2.5 rounded-2xl shadow-xl shadow-slate-200/70 border border-slate-200/90 transition-all focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/15">
                                
                                {/* Branch Filter */}
                                {branches.length > 1 && (
                                    <div className="w-full sm:w-48 shrink-0">
                                        <select
                                            value={selectedBranchId}
                                            onChange={(e) => {
                                                setSelectedBranchId(e.target.value);
                                                if (searchQuery) handleSearchInput(searchQuery);
                                            }}
                                            className="w-full h-11 sm:h-12 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl px-3 font-semibold border border-slate-200 focus:bg-white focus:ring-0 outline-none text-xs transition-colors cursor-pointer"
                                        >
                                            <option value="">🏢 সকল ব্রাঞ্চ</option>
                                            {branches.map((b) => (
                                                <option key={b.id} value={b.id}>
                                                    {b.name} ({b.code})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Main Text Search Input */}
                                <div className="relative flex-1 flex items-center min-w-0">
                                    <Search className="absolute left-3.5 sm:left-4 w-4 h-4 sm:w-5 sm:h-5 text-slate-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="মেম্বার কোড, নাম, মোবাইল বা NID..."
                                        value={searchQuery}
                                        onChange={(e) => handleSearchInput(e.target.value)}
                                        className="w-full h-11 sm:h-12 pl-10 sm:pl-12 pr-10 bg-transparent text-slate-900 font-semibold placeholder:text-slate-400 placeholder:font-normal border-0 focus:outline-none focus:ring-0 text-xs sm:text-sm lg:text-base"
                                        autoComplete="off"
                                    />
                                    {isSearching && (
                                        <RotateCw className="absolute right-3.5 sm:right-4 w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 animate-spin" />
                                    )}
                                    {searchQuery && !isSearching && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearchQuery('');
                                                setSearchResults([]);
                                            }}
                                            className="absolute right-2.5 sm:right-3.5 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Floating Elevated Search Results Dropdown */}
                            {searchResults.length > 0 && (
                                <div className="absolute left-0 right-0 top-full mt-2 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200/90 max-h-96 overflow-y-auto z-[100] divide-y divide-slate-100 text-left animate-in fade-in-50 zoom-in-95 duration-150">
                                    <div className="p-2.5 sm:p-3 bg-slate-50/90 text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider flex flex-wrap items-center justify-between gap-1 border-b border-slate-100 sticky top-0 backdrop-blur-xs">
                                        <span>🔍 অনুসন্ধানের ফলাফল ({searchResults.length} জন)</span>
                                        <span className="text-[10px] sm:text-[11px] text-emerald-700 font-semibold">ক্লিক করে সাইকেল ফাইল লোড করুন</span>
                                    </div>
                                    {searchResults.map((m) => (
                                        <div
                                            key={m.id}
                                            onClick={() => loadMemberDetails(m.id)}
                                            className="p-3 sm:p-3.5 hover:bg-emerald-50/70 cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 group"
                                        >
                                            <div className="flex items-start sm:items-center gap-3 min-w-0">
                                                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center font-bold text-sm sm:text-base shadow-sm shrink-0">
                                                    {m.applicant_name_bn ? m.applicant_name_bn.charAt(0) : <User className="w-4 h-4 sm:w-5 sm:h-5" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                                        <span className="font-bold text-slate-900 group-hover:text-emerald-700 text-sm sm:text-base">
                                                            {m.applicant_name_bn}
                                                        </span>
                                                        {m.applicant_name_en && (
                                                            <span className="text-slate-400 text-xs font-normal">
                                                                ({m.applicant_name_en})
                                                            </span>
                                                        )}
                                                        <span className="font-mono text-[11px] sm:text-xs bg-slate-100 text-slate-800 font-bold px-1.5 sm:px-2 py-0.5 rounded-md border border-slate-200">
                                                            {m.application_no}
                                                        </span>
                                                        <Badge variant="outline" className="text-[10px] sm:text-[11px] bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold py-0">
                                                            সর্বশেষ দফা {m.current_dofa}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-[11px] sm:text-xs text-slate-500 flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-0.5 mt-1">
                                                        <span>মোবাইল: <strong className="text-slate-700">{m.mobile_number}</strong></span>
                                                        <span>সমিতি: <strong className="text-slate-700">{m.samity_name}</strong></span>
                                                        {m.branch_name && <span>শাখা: <strong className="text-slate-700">{m.branch_name}</strong></span>}
                                                        {m.nid_number && <span>NID: <strong className="text-slate-700">{m.nid_number}</strong></span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button size="sm" variant="ghost" className="w-full sm:w-auto h-8 text-xs font-bold text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white shrink-0 rounded-xl transition-all justify-center sm:justify-start">
                                                লোড করুন <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Loading Indicator */}
                {isLoadingDetails && (
                    <div className="bg-white rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center shadow-lg border border-slate-100 max-w-xl mx-auto flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-200">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <RotateCw className="w-6 h-6 sm:w-7 sm:h-7 animate-spin" />
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-bold text-slate-900">সদস্যের সাইকেল ও ফাইলসমূহ লোড হচ্ছে...</h3>
                            <p className="text-xs sm:text-sm text-slate-500 mt-1">ভর্তি ফর্ম ও সকল ঋণের ইতিহাস প্রস্তুত করা হচ্ছে</p>
                        </div>
                    </div>
                )}

                {/* 2. SELECTED MEMBER DOSSIER & CYCLES TABLE */}
                {!isLoadingDetails && memberData && (
                    <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-300">
                        
                        {/* Member Profile Master Card */}
                        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-sm border border-slate-200/90 relative overflow-hidden">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 pb-5 sm:pb-6 border-b border-slate-100">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 sm:gap-5 min-w-0">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center font-extrabold text-2xl sm:text-3xl shadow-md shrink-0 overflow-hidden border-2 border-white ring-2 ring-emerald-500/20">
                                        {memberData.member.customer_photo_path ? (
                                            <img
                                                src={`/storage/${memberData.member.customer_photo_path}`}
                                                alt="Member"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            memberData.member.applicant_name_bn?.charAt(0) || <User className="w-6 h-6 sm:w-8 sm:h-8" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900">
                                                {memberData.member.applicant_name_bn}
                                            </h2>
                                            {memberData.member.applicant_name_en && (
                                                <span className="text-slate-500 text-xs sm:text-sm font-medium">
                                                    ({memberData.member.applicant_name_en})
                                                </span>
                                            )}
                                            <span className="font-mono bg-emerald-50 text-emerald-800 font-bold px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-xl text-xs sm:text-sm border border-emerald-200">
                                                মেম্বার কোড: {memberData.member.application_no}
                                            </span>
                                            <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 font-semibold px-2 py-0.5">
                                                {memberData.member.category_name || 'সাধারণ'}
                                            </Badge>
                                        </div>
                                        <div className="text-xs sm:text-sm text-slate-600 flex flex-wrap gap-x-4 sm:gap-x-6 gap-y-1.5 mt-2.5">
                                            <span className="flex items-center gap-1.5">
                                                <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
                                                মোবাইল: <strong className="text-slate-900">{memberData.member.mobile_number}</strong>
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
                                                সমিতি: <strong className="text-slate-900">{memberData.member.samity_name} ({memberData.member.samity_code})</strong>
                                            </span>
                                            <span>
                                                শাখা: <strong className="text-slate-900">{memberData.member.branch_name}</strong>
                                            </span>
                                            {memberData.member.nid_number && (
                                                <span>
                                                    NID: <strong className="text-slate-900">{memberData.member.nid_number}</strong>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Primary Action: Start Next Cycle */}
                                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                                    {memberData.member.can_start_next_cycle && userPermissions.canCreateLoan && (
                                        <Button
                                            onClick={handleStartNextCycle}
                                            disabled={isCloningNextCycle}
                                            className="w-full sm:w-auto h-11 sm:h-12 text-xs sm:text-sm bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold px-5 sm:px-6 rounded-2xl shadow-xl shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer justify-center"
                                        >
                                            {isCloningNextCycle ? (
                                                <RotateCw className="w-4 h-4 mr-2 animate-spin" />
                                            ) : (
                                                <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2 shrink-0" />
                                            )}
                                            পরবর্তী সাইকেল (দফা {memberData.member.next_dofa}) ঋণ আবেদন করুন
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Status Bar */}
                            <div className="mt-4 sm:mt-5 pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 text-xs sm:text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-700 shrink-0">বর্তমান অবস্থা:</span>
                                    {memberData.member.has_active_loan ? (
                                        <div className="flex items-center gap-1.5 bg-amber-50 text-amber-900 px-3 py-1.5 rounded-xl border border-amber-200 font-semibold text-xs sm:text-sm">
                                            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
                                            <span>
                                                সক্রিয় ঋণ চলমান (দফা {memberData.member.current_max_dofa}) — ঋণ পরিশোধ সাপেক্ষে পরবর্তী সাইকেল উন্মুক্ত হবে
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-900 px-3 py-1.5 rounded-xl border border-emerald-200 font-semibold text-xs sm:text-sm">
                                            <BadgeCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
                                            <span>
                                                কোনো সক্রিয় ঋণ নেই (পরবর্তী দফা {memberData.member.next_dofa} এর জন্য প্রস্তুত)
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="text-slate-500 text-xs sm:text-sm">
                                    মোট সাইকেল: <strong className="text-slate-900">{memberData.cycles.length} টি</strong> | সর্বশেষ দফা: <strong className="text-slate-900">দফা {memberData.member.current_max_dofa}</strong>
                                </div>
                            </div>
                        </div>

                        {/* Cycles Table Row List */}
                        <Card className="rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden bg-white">
                            <CardHeader className="p-4 sm:p-6 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                                <div>
                                    <CardTitle className="text-sm sm:text-lg font-bold text-slate-900 flex items-center gap-2 sm:gap-2.5">
                                        <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" />
                                        সাইকেল ও ফরমসমূহের তালিকা (Cycle Dossiers)
                                    </CardTitle>
                                    <CardDescription className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">
                                        যেকোনো সাইকেলের ভর্তি ও ঋণের সকল ফর্ম একসাথে দেখতে «সম্পূর্ণ সাইকেল ফাইল দেখুন» চাপুন
                                    </CardDescription>
                                </div>
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-bold px-2.5 py-1 self-start sm:self-auto">
                                    {memberData.cycles.length} টি সাইকেল রেকর্ড
                                </Badge>
                            </CardHeader>

                            {/* Mobile Card List View (Visible on small screens < md) */}
                            <div className="block md:hidden divide-y divide-slate-100 p-3 space-y-3">
                                {memberData.cycles
                                    .slice()
                                    .reverse()
                                    .map((cycle, idx) => {
                                        const isLatest = idx === 0;
                                        const latestLoan = cycle.loans[0];

                                        return (
                                            <div
                                                key={cycle.admission_id}
                                                className={`p-4 rounded-2xl border transition-all ${
                                                    isLatest
                                                        ? 'bg-emerald-50/30 border-emerald-200/80 shadow-xs'
                                                        : 'bg-white border-slate-200/80'
                                                }`}
                                            >
                                                {/* Top Row: Dofa + Status Badge */}
                                                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-extrabold text-slate-900 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-lg text-xs font-mono">
                                                            দফা {cycle.dofa}
                                                        </span>
                                                        {isLatest && (
                                                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold py-0.5">
                                                                সর্বশেষ সাইকেল
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div>
                                                        {latestLoan ? (
                                                            getStatusBadge(latestLoan.status)
                                                        ) : (
                                                            <Badge variant="outline" className="text-slate-500 text-xs font-semibold">
                                                                ভর্তি সম্পন্ন
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Middle: Details Grid */}
                                                <div className="py-2.5 space-y-1.5 text-xs">
                                                    <div className="flex justify-between items-center text-slate-600">
                                                        <span>ভর্তির তারিখ:</span>
                                                        <span className="font-semibold text-slate-900">
                                                            {cycle.admission_date || cycle.survey_date || '—'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-start text-slate-600 gap-2">
                                                        <span>ঋণ পণ্য:</span>
                                                        <span className="font-bold text-slate-900 text-right">
                                                            {latestLoan ? (
                                                                <>
                                                                    {latestLoan.product_name}
                                                                    <span className="block text-[11px] text-slate-400 font-normal">
                                                                        ({latestLoan.category_name})
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <span className="text-slate-400 font-normal italic">ঋণ আবেদন নেই</span>
                                                            )}
                                                        </span>
                                                    </div>
                                                    {latestLoan && (
                                                        <div className="flex justify-between items-center text-slate-600">
                                                            <span>ঋণের পরিমাণ:</span>
                                                            <span className="text-emerald-700 font-extrabold text-sm">
                                                                ৳ {Number(latestLoan.disbursed_amount || latestLoan.approved_amount || latestLoan.requested_amount || 0).toLocaleString('en-IN')}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Actions Bottom Bar */}
                                                <div className="pt-2.5 border-t border-slate-100 flex flex-col gap-2">
                                                    {/* Repay button */}
                                                    {latestLoan && latestLoan.status === 'disbursed' && userPermissions.canRepayLoan && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => openRepayModal(latestLoan.id)}
                                                            className="w-full h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs justify-center"
                                                        >
                                                            <Banknote className="w-3.5 h-3.5 mr-1" />
                                                            পরিশোধ দেখান
                                                        </Button>
                                                    )}

                                                    {/* Draft Loan Edit & Delete buttons */}
                                                    {latestLoan && latestLoan.status === 'draft' && (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <a href={`/member/loan-applications/form-selection?member_id=${cycle.admission_id}`} className="w-full">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="w-full h-8 text-xs font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50 rounded-xl"
                                                                >
                                                                    <Pencil className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                                                    ঋণ এডিট
                                                                </Button>
                                                            </a>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleDeleteDraftLoan(latestLoan.id)}
                                                                className="w-full h-8 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-500" />
                                                                খসড়া মুছুন
                                                            </Button>
                                                        </div>
                                                    )}

                                                    {/* Admission Edit & Delete buttons */}
                                                    {(!latestLoan || latestLoan.status === 'draft' || latestLoan.status === 'rejected') && (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {(!latestLoan || latestLoan.status === 'draft') && (
                                                                <a href={`/member-admissions/${cycle.admission_id}/edit?cycle_renewal=1`} className="w-full">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="w-full h-8 text-xs font-semibold text-blue-700 border-blue-200 hover:bg-blue-50 rounded-xl"
                                                                    >
                                                                        <Pencil className="w-3.5 h-3.5 mr-1 text-blue-600" />
                                                                        ভর্তি এডিট
                                                                    </Button>
                                                                </a>
                                                            )}
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleDeleteDraftAdmission(cycle.admission_id, cycle.dofa)}
                                                                className="w-full h-8 text-xs font-bold text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl shadow-xs"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-500" />
                                                                দফা {cycle.dofa} মুছুন
                                                            </Button>
                                                        </div>
                                                    )}

                                                    {/* Primary View File Button */}
                                                    <Link href={`/member/cycle-hub/cycle/${cycle.admission_id}`} className="w-full">
                                                        <Button
                                                            size="sm"
                                                            className="w-full h-9 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs rounded-xl transition-all justify-center"
                                                        >
                                                            <Eye className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                                                            সম্পূর্ণ সাইকেল ফাইল দেখুন
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>

                            {/* Desktop / Tablet Table View (Hidden on mobile) */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[700px]">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                                            <th className="py-4 px-5">সাইকেল / দফা</th>
                                            <th className="py-4 px-5">ভর্তির তারিখ</th>
                                            <th className="py-4 px-5">ঋণ পণ্য ও ক্যাটাগরি</th>
                                            <th className="py-4 px-5">ঋণের পরিমাণ</th>
                                            <th className="py-4 px-5">ঋণ অবস্থা</th>
                                            <th className="py-4 px-5 text-right">সাইকেল অ্যাকশন</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {memberData.cycles
                                            .slice()
                                            .reverse()
                                            .map((cycle, idx) => {
                                                const isLatest = idx === 0;
                                                const latestLoan = cycle.loans[0];

                                                return (
                                                    <tr
                                                        key={cycle.admission_id}
                                                        className={`hover:bg-slate-50/80 transition-colors ${
                                                            isLatest ? 'bg-emerald-50/20' : ''
                                                        }`}
                                                    >
                                                        {/* Dofa */}
                                                        <td className="py-4 px-5">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-extrabold text-slate-900 bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl text-xs font-mono">
                                                                    দফা {cycle.dofa}
                                                                </span>
                                                                {isLatest && (
                                                                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold py-0.5">
                                                                        সর্বশেষ সাইকেল
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Admission Date */}
                                                        <td className="py-4 px-5 text-slate-700 font-medium">
                                                            {cycle.admission_date || cycle.survey_date || '—'}
                                                        </td>

                                                        {/* Loan Product */}
                                                        <td className="py-4 px-5 font-semibold text-slate-800">
                                                            {latestLoan ? (
                                                                <div>
                                                                    <span className="text-slate-900 font-bold">{latestLoan.product_name}</span>
                                                                    <span className="text-xs text-slate-400 block font-normal mt-0.5">
                                                                        ({latestLoan.category_name}) #{latestLoan.application_no}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-400 italic">ঋণ আবেদন নেই</span>
                                                            )}
                                                        </td>

                                                        {/* Amount */}
                                                        <td className="py-4 px-5 font-bold text-slate-900">
                                                            {latestLoan ? (
                                                                <span className="text-emerald-700 font-extrabold">৳ {Number(latestLoan.disbursed_amount || latestLoan.approved_amount || latestLoan.requested_amount || 0).toLocaleString('en-IN')}</span>
                                                            ) : (
                                                                <span className="text-slate-400">—</span>
                                                            )}
                                                        </td>

                                                        {/* Status */}
                                                        <td className="py-4 px-5">
                                                            {latestLoan ? (
                                                                getStatusBadge(latestLoan.status)
                                                            ) : (
                                                                <Badge variant="outline" className="text-slate-500 text-xs font-semibold">
                                                                    ভর্তি সম্পন্ন
                                                                </Badge>
                                                            )}
                                                        </td>

                                                        {/* Action Buttons */}
                                                        <td className="py-4 px-5 text-right">
                                                            <div className="flex items-center justify-end gap-2 flex-wrap">
                                                                {/* Repay button */}
                                                                {latestLoan && latestLoan.status === 'disbursed' && userPermissions.canRepayLoan && (
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => openRepayModal(latestLoan.id)}
                                                                        className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold px-3.5 rounded-xl shadow-xs"
                                                                    >
                                                                        <Banknote className="w-3.5 h-3.5 mr-1" />
                                                                        পরিশোধ দেখান
                                                                    </Button>
                                                                )}

                                                                {/* Draft Loan Edit & Delete buttons */}
                                                                {latestLoan && latestLoan.status === 'draft' && (
                                                                    <>
                                                                        <a href={`/member/loan-applications/form-selection?member_id=${cycle.admission_id}`}>
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                className="h-8 text-xs font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50 rounded-xl"
                                                                            >
                                                                                <Pencil className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                                                                ঋণ এডিট
                                                                            </Button>
                                                                        </a>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() => handleDeleteDraftLoan(latestLoan.id)}
                                                                            className="h-8 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-500" />
                                                                            খসড়া মুছুন
                                                                        </Button>
                                                                    </>
                                                                )}

                                                                {/* Admission Edit button (for draft or un-disbursed renewal admission) */}
                                                                {(!latestLoan || latestLoan.status === 'draft') && (
                                                                    <a href={`/member-admissions/${cycle.admission_id}/edit?cycle_renewal=1`}>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="h-8 text-xs font-semibold text-blue-700 border-blue-200 hover:bg-blue-50 rounded-xl"
                                                                        >
                                                                            <Pencil className="w-3.5 h-3.5 mr-1 text-blue-600" />
                                                                            ভর্তি এডিট
                                                                        </Button>
                                                                    </a>
                                                                )}

                                                                {/* Cycle Delete button: available when there is no loan or loan is draft */}
                                                                {(!latestLoan || latestLoan.status === 'draft' || latestLoan.status === 'rejected') && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => handleDeleteDraftAdmission(cycle.admission_id, cycle.dofa)}
                                                                        className="h-8 text-xs font-bold text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl shadow-xs"
                                                                        title={`দফা ${cycle.dofa} মুছে ফেলুন`}
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-500" />
                                                                        দফা {cycle.dofa} মুছুন
                                                                    </Button>
                                                                )}

                                                                {/* Single Unified View Button */}
                                                                <Link href={`/member/cycle-hub/cycle/${cycle.admission_id}`}>
                                                                    <Button
                                                                        size="sm"
                                                                        className="h-8 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs px-4 rounded-xl transition-all"
                                                                    >
                                                                        <Eye className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                                                                        সম্পূর্ণ সাইকেল ফাইল দেখুন
                                                                    </Button>
                                                                </Link>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                )}

                {/* 3. EMPTY STATE: 3 FEATURE HIGHLIGHT CARDS (When no member is selected) */}
                {!isLoadingDetails && !memberData && (
                    <div className="max-w-5xl mx-auto pt-2 sm:pt-4 pb-8 sm:pb-12 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                            
                            {/* Card 1 */}
                            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow space-y-2.5 sm:space-y-3">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                    <Search className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                                    ১. দ্রুত সদস্য অনুসন্ধান
                                </h3>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    ১০ ডিজিট মেম্বার কোড, নাম, মোবাইল অথবা NID টাইপ করে যেকোনো শাখার সদস্যের প্রোফাইল ও সাইকেলের বিস্তারিত তথ্য খুঁজে নিন।
                                </p>
                            </div>

                            {/* Card 2 */}
                            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow space-y-2.5 sm:space-y-3">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                                    <FolderKanban className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                                    ২. সাইকেল অনুযায়ী সম্পূর্ণ ফাইল
                                </h3>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    প্রতিটি সাইকেলের ভর্তি ফর্ম, ঋণ চুক্তিপত্র, জামিনদার অঙ্গীকারনামা, তদন্ত ও অনুমোদনপত্র এক পেজে একসাথে দেখুন ও প্রিন্ট করুন।
                                </p>
                            </div>

                            {/* Card 3 */}
                            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow space-y-2.5 sm:space-y-3">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                                    <RotateCw className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                                    ৩. পরবর্তী সাইকেল ঋণ আবেদন
                                </h3>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    পূর্ববর্তী ঋণ পরিশোধ সাপেক্ষে একই মেম্বার কোড রেখে এক ক্লিকে নতুন দফার ভর্তি অটো-ক্লোন করে সরাসরি ঋণ আবেদন তৈরি করুন।
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Repay Modal */}
                <Dialog open={showRepayModal} onOpenChange={setShowRepayModal}>
                    <DialogContent className="w-[95vw] max-w-md bg-white rounded-2xl p-4 sm:p-6">
                        <DialogHeader>
                            <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Banknote className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                                ঋণ সম্পূর্ণ পরিশোধ নিশ্চিত করুন
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500">
                                ঋণটি সম্পূর্ণ পরিশোধিত হিসেবে মার্ক করলে সদস্য পরবর্তী সাইকেলের জন্য আবেদন করতে পারবেন।
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3 sm:space-y-4 py-2 sm:py-3">
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">পরিশোধের তারিখ *</Label>
                                <Input
                                    type="date"
                                    value={repayDate}
                                    onChange={(e) => setRepayDate(e.target.value)}
                                    className="mt-1 h-10 text-xs rounded-xl"
                                />
                            </div>

                            <div>
                                <Label className="text-xs font-semibold text-slate-700">মন্তব্য / ভাউচার রেফারেন্স (ঐচ্ছিক)</Label>
                                <Textarea
                                    value={repayNotes}
                                    onChange={(e) => setRepayNotes(e.target.value)}
                                    placeholder="যেমন: শেষ কিস্তি ও ভাউচার #১২৩৪ অনুযায়ী সম্পূর্ণ পরিশোধিত..."
                                    className="mt-1 text-xs rounded-xl"
                                    rows={3}
                                />
                            </div>
                        </div>

                        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowRepayModal(false)}
                                className="w-full sm:w-auto text-xs rounded-xl"
                            >
                                বাতিল
                            </Button>
                            <Button
                                onClick={handleConfirmRepay}
                                disabled={isSubmittingRepay}
                                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                            >
                                {isSubmittingRepay ? 'প্রসেসিং...' : 'পরিশোধ সম্পন্ন করুন'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}
