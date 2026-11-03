import React, { useState, useEffect, useMemo, useRef } from 'react';
import { router } from '@inertiajs/react';
import {
    Smartphone,
    Upload,
    Download,
    UserCheck,
    Search,
    Check,
    AlertCircle,
    X,
    Building2,
    Users,
    Phone,
    FileSpreadsheet,
    Loader2,
    CheckCircle2,
    Info,
} from 'lucide-react';
import { formatBranchLabel } from '@/utils/branchLabel';

interface BranchOption {
    id: number;
    name: string;
    code?: string;
    area_id?: number;
}

interface SamityOption {
    id: number;
    samity_name: string;
    samity_code?: string;
    branch_id: number;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    branches: BranchOption[];
    currentBranchId?: number;
    hasMultipleBranches: boolean;
    onSuccess?: () => void;
}

export default function NewAppRegisterModal({
    isOpen,
    onClose,
    branches = [],
    currentBranchId,
    hasMultipleBranches,
    onSuccess,
}: Props) {
    const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');

    // Single Entry State
    const [allBranches, setAllBranches] = useState<BranchOption[]>(branches);
    const [selectedBranchId, setSelectedBranchId] = useState<number>(() => {
        return currentBranchId || (branches.length > 0 ? branches[0].id : 0);
    });
    const [branchSearch, setBranchSearch] = useState('');
    const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);

    // Fetch all active branches when modal opens so that any branch can be selected
    useEffect(() => {
        if (isOpen) {
            fetch('/app-registrations/branches', { headers: { Accept: 'application/json' } })
                .then((res) => (res.ok ? res.json() : []))
                .then((data) => {
                    if (Array.isArray(data) && data.length > 0) {
                        setAllBranches(data);
                        if (!selectedBranchId && data.length > 0) {
                            setSelectedBranchId(currentBranchId || data[0].id);
                        }
                    }
                })
                .catch(() => {});
        }
    }, [isOpen]);

    const [samities, setSamities] = useState<SamityOption[]>([]);
    const [loadingSamities, setLoadingSamities] = useState(false);
    const [selectedSamityId, setSelectedSamityId] = useState<number>(0);
    const [samitySearch, setSamitySearch] = useState('');
    const [samityDropdownOpen, setSamityDropdownOpen] = useState(false);

    const [memberCode, setMemberCode] = useState('');
    const [memberName, setMemberName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [remarks, setRemarks] = useState('');
    const [isExistingMember, setIsExistingMember] = useState(false);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [singleSubmitting, setSingleSubmitting] = useState(false);
    const [singleSuccessMsg, setSingleSuccessMsg] = useState('');
    const [singleErrorMsg, setSingleErrorMsg] = useState('');

    // Bulk Upload State
    const [bulkFile, setBulkFile] = useState<File | null>(null);
    const [bulkBranchId, setBulkBranchId] = useState<number>(currentBranchId || (branches[0]?.id ?? 0));
    const [bulkUploading, setBulkUploading] = useState(false);
    const [bulkResult, setBulkResult] = useState<{
        ok: boolean;
        message: string;
        created?: number;
        updated?: number;
        failed?: number;
        errors?: string[];
    } | null>(null);

    const branchRef = useRef<HTMLDivElement>(null);
    const samityRef = useRef<HTMLDivElement>(null);

    // Sync default branch
    useEffect(() => {
        if (currentBranchId && !selectedBranchId) {
            setSelectedBranchId(currentBranchId);
        }
    }, [currentBranchId]);

    // Close dropdowns on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (branchRef.current && !branchRef.current.contains(event.target as Node)) {
                setBranchDropdownOpen(false);
            }
            if (samityRef.current && !samityRef.current.contains(event.target as Node)) {
                setSamityDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load samities when selected branch changes
    useEffect(() => {
        if (!selectedBranchId) {
            setSamities([]);
            setSelectedSamityId(0);
            return;
        }

        setLoadingSamities(true);
        fetch(`/app-registrations/samities-by-branch?branch_id=${selectedBranchId}`, {
            headers: { Accept: 'application/json' },
        })
            .then((res) => {
                if (res.ok) return res.json();
                return [];
            })
            .then((data) => {
                const items = Array.isArray(data) ? data : (data?.data || []);
                setSamities(items);
            })
            .catch(() => {
                setSamities([]);
            })
            .finally(() => {
                setLoadingSamities(false);
            });
    }, [selectedBranchId]);

    // Filter branches
    const filteredBranches = useMemo(() => {
        if (!branchSearch.trim()) return allBranches;
        const q = branchSearch.toLowerCase();
        return allBranches.filter((b) =>
            b.name.toLowerCase().includes(q) || (b.code && b.code.toLowerCase().includes(q))
        );
    }, [allBranches, branchSearch]);

    // Filter samities
    const filteredSamities = useMemo(() => {
        if (!samitySearch.trim()) return samities;
        const q = samitySearch.toLowerCase();
        return samities.filter((s) =>
            s.samity_name.toLowerCase().includes(q) || (s.samity_code && s.samity_code.toLowerCase().includes(q))
        );
    }, [samities, samitySearch]);

    const currentBranch = useMemo(() => {
        return allBranches.find((b) => b.id === selectedBranchId) || allBranches[0];
    }, [allBranches, selectedBranchId]);

    const currentSamity = useMemo(() => {
        return samities.find((s) => s.id === selectedSamityId);
    }, [samities, selectedSamityId]);

    // Lookup member by code
    const handleCodeBlur = async () => {
        if (!memberCode.trim() || !selectedBranchId) return;

        setLookupLoading(true);
        try {
            const res = await fetch(
                `/app-registrations/lookup-member?branch_id=${selectedBranchId}&member_code=${encodeURIComponent(memberCode.trim())}`,
                { headers: { Accept: 'application/json' } }
            );
            if (res.ok) {
                const data = await res.json();
                if (data.found) {
                    setIsExistingMember(true);
                    if (data.member_name) setMemberName(data.member_name);
                    if (data.phone_number) setPhoneNumber(data.phone_number);
                    if (data.samity_id) setSelectedSamityId(data.samity_id);
                } else {
                    setIsExistingMember(false);
                }
            }
        } catch (e) {
            // Silently ignore lookup failure
        } finally {
            setLookupLoading(false);
        }
    };

    // Single Entry Submit
    const handleSingleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSingleErrorMsg('');
        setSingleSuccessMsg('');

        if (!selectedBranchId) {
            setSingleErrorMsg('অনুগ্রহ করে শাখা সিলেক্ট করুন।');
            return;
        }
        if (!memberCode.trim()) {
            setSingleErrorMsg('সদস্য কোড আবশ্যক।');
            return;
        }
        if (!memberName.trim()) {
            setSingleErrorMsg('সদস্যের নাম আবশ্যক।');
            return;
        }

        setSingleSubmitting(true);
        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch('/app-registrations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    branch_id: selectedBranchId,
                    samity_id: selectedSamityId || null,
                    member_code: memberCode.trim(),
                    member_name: memberName.trim(),
                    phone_number: phoneNumber.trim(),
                    remarks: remarks.trim(),
                }),
            });

            const data = await res.json();
            if (res.ok && data.ok) {
                setSingleSuccessMsg(data.message || 'অ্যাপ রেজিস্ট্রেশন সফলভাবে সম্পন্ন হয়েছে!');
                // Reset form fields
                setMemberCode('');
                setMemberName('');
                setPhoneNumber('');
                setRemarks('');
                setIsExistingMember(false);
                if (onSuccess) onSuccess();
            } else {
                setSingleErrorMsg(data.message || 'সংরক্ষণ ব্যর্থ হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
            }
        } catch (err: any) {
            setSingleErrorMsg(err?.message || 'নেটওয়ার্ক সমস্যা। আবার চেষ্টা করুন।');
        } finally {
            setSingleSubmitting(false);
        }
    };

    // Bulk Excel Submit
    const handleBulkSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bulkFile) return;

        setBulkUploading(true);
        setBulkResult(null);

        const formData = new FormData();
        formData.append('file', bulkFile);
        if (bulkBranchId) {
            formData.append('branch_id', String(bulkBranchId));
        }

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch('/app-registrations/bulk-upload', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: formData,
            });

            const data = await res.json();
            setBulkResult(data);
            if (data.ok && onSuccess) {
                onSuccess();
            }
        } catch (err: any) {
            setBulkResult({
                ok: false,
                message: err?.message || 'এক্সেল আপলোডে ত্রুটি ঘটেছে।',
            });
        } finally {
            setBulkUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
                {/* 1. Modal Header */}
                <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                            <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                                নতুন অ্যাপ রেজিস্ট্রেশন (New App Register)
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                এটি নতুন ভর্তি আবেদন নয়, শুধু অ্যাপ ব্যবহারের এন্ট্রি সংরক্ষণ করে
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* 2. Navigation Tabs */}
                <div className="flex border-b border-slate-200 bg-slate-50/80 px-6 pt-2">
                    <button
                        type="button"
                        onClick={() => {
                            setActiveTab('single');
                            setSingleErrorMsg('');
                            setSingleSuccessMsg('');
                        }}
                        className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                            activeTab === 'single'
                                ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl shadow-2xs'
                                : 'border-transparent text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <UserCheck size={15} />
                        <span>একক এন্ট্রি (Single Entry)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setActiveTab('bulk');
                            setBulkResult(null);
                        }}
                        className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                            activeTab === 'bulk'
                                ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl shadow-2xs'
                                : 'border-transparent text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <FileSpreadsheet size={15} />
                        <span>বাল্ক এক্সেল আপলোড (Bulk Excel)</span>
                    </button>
                </div>

                {/* 3. Modal Body */}
                <div className="p-6 overflow-y-auto space-y-4">
                    {activeTab === 'single' ? (
                        <form onSubmit={handleSingleSubmit} className="space-y-4">
                            {singleSuccessMsg && (
                                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
                                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                    <span>{singleSuccessMsg}</span>
                                </div>
                            )}

                            {singleErrorMsg && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
                                    <AlertCircle size={16} className="text-red-600 shrink-0" />
                                    <span>{singleErrorMsg}</span>
                                </div>
                            )}

                            {/* Branch Selection */}
                            <div className="space-y-1.5" ref={branchRef}>
                                <label className="block text-xs font-bold text-slate-700">
                                    শাখা (Branch) <span className="text-red-500">*</span>
                                </label>
                                {!hasMultipleBranches && allBranches.length <= 1 ? (
                                    <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
                                        <Building2 size={15} className="text-blue-600" />
                                        <span>{currentBranch ? formatBranchLabel(currentBranch) : 'শাখা নির্ধারিত'}</span>
                                        <span className="ml-auto text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-mono">
                                            অটো সিলেক্টেড
                                        </span>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
                                            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 hover:border-blue-500 transition-colors focus:ring-2 focus:ring-blue-100"
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                <Building2 size={15} className="text-slate-400" />
                                                <span>{currentBranch ? formatBranchLabel(currentBranch) : 'শাখা সিলেক্ট করুন'}</span>
                                            </div>
                                            <span className="text-slate-400 text-xs">▼</span>
                                        </button>

                                        {branchDropdownOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 overflow-hidden animate-in fade-in">
                                                <div className="p-2 border-b border-slate-100">
                                                    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                                                        <Search size={14} className="text-slate-400" />
                                                        <input
                                                            type="text"
                                                            value={branchSearch}
                                                            onChange={(e) => setBranchSearch(e.target.value)}
                                                            placeholder="শাখা খুঁজুন..."
                                                            className="w-full bg-transparent outline-none text-xs"
                                                            autoFocus
                                                        />
                                                    </div>
                                                </div>
                                                <ul className="max-h-48 overflow-y-auto divide-y divide-slate-50 text-xs">
                                                    {filteredBranches.map((b) => (
                                                        <li
                                                            key={b.id}
                                                            onClick={() => {
                                                                setSelectedBranchId(b.id);
                                                                setBranchDropdownOpen(false);
                                                                setBranchSearch('');
                                                            }}
                                                            className={`px-3.5 py-2 cursor-pointer hover:bg-blue-50 flex items-center justify-between ${
                                                                b.id === selectedBranchId ? 'bg-blue-50/80 font-bold text-blue-700' : 'text-slate-700'
                                                            }`}
                                                        >
                                                            <span>{formatBranchLabel(b)}</span>
                                                            {b.id === selectedBranchId && <Check size={14} className="text-blue-600" />}
                                                        </li>
                                                    ))}
                                                    {filteredBranches.length === 0 && (
                                                        <li className="px-3.5 py-3 text-center text-slate-400 text-xs">
                                                            কোনো শাখা পাওয়া যায়নি
                                                        </li>
                                                    )}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Samity Selection Combo */}
                            <div className="space-y-1.5" ref={samityRef}>
                                <div className="flex items-center justify-between">
                                    <label className="block text-xs font-bold text-slate-700">
                                        সমিতি নির্বাচন (Samity Selection)
                                    </label>
                                    {loadingSamities && (
                                        <span className="text-[10px] text-blue-600 flex items-center gap-1">
                                            <Loader2 size={11} className="animate-spin" /> লোড হচ্ছে...
                                        </span>
                                    )}
                                </div>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setSamityDropdownOpen(!samityDropdownOpen)}
                                        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 hover:border-blue-500 transition-colors focus:ring-2 focus:ring-blue-100"
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <Users size={15} className="text-slate-400" />
                                            <span>
                                                {currentSamity
                                                    ? `${currentSamity.samity_name} (${currentSamity.samity_code || 'N/A'})`
                                                    : 'সমিতি সিলেক্ট করুন (ঐচ্ছিক)'}
                                            </span>
                                        </div>
                                        <span className="text-slate-400 text-xs">▼</span>
                                    </button>

                                    {samityDropdownOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 overflow-hidden animate-in fade-in">
                                            <div className="p-2 border-b border-slate-100">
                                                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                                                    <Search size={14} className="text-slate-400" />
                                                    <input
                                                        type="text"
                                                        value={samitySearch}
                                                        onChange={(e) => setSamitySearch(e.target.value)}
                                                        placeholder="সমিতির নাম বা কোড দিয়ে খুঁজুন..."
                                                        className="w-full bg-transparent outline-none text-xs"
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>
                                            <ul className="max-h-48 overflow-y-auto divide-y divide-slate-50 text-xs">
                                                <li
                                                    onClick={() => {
                                                        setSelectedSamityId(0);
                                                        setSamityDropdownOpen(false);
                                                        setSamitySearch('');
                                                    }}
                                                    className="px-3.5 py-2 cursor-pointer hover:bg-slate-50 text-slate-500 italic"
                                                >
                                                    -- সমিতি ছাড়া --
                                                </li>
                                                {filteredSamities.map((s) => (
                                                    <li
                                                        key={s.id}
                                                        onClick={() => {
                                                            setSelectedSamityId(s.id);
                                                            setSamityDropdownOpen(false);
                                                            setSamitySearch('');
                                                        }}
                                                        className={`px-3.5 py-2 cursor-pointer hover:bg-blue-50 flex items-center justify-between ${
                                                            s.id === selectedSamityId ? 'bg-blue-50/80 font-bold text-blue-700' : 'text-slate-700'
                                                        }`}
                                                    >
                                                        <span>
                                                            {s.samity_name} {s.samity_code ? `(${s.samity_code})` : ''}
                                                        </span>
                                                        {s.id === selectedSamityId && <Check size={14} className="text-blue-600" />}
                                                    </li>
                                                ))}
                                                {filteredSamities.length === 0 && (
                                                    <li className="px-3.5 py-3 text-center text-slate-400 text-xs">
                                                        কোনো সমিতি পাওয়া যায়নি
                                                    </li>
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Member Code & Auto-lookup */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-xs font-bold text-slate-700">
                                            সদস্য কোড (Member Code) <span className="text-red-500">*</span>
                                        </label>
                                        {lookupLoading && (
                                            <span className="text-[10px] text-blue-600 flex items-center gap-1">
                                                <Loader2 size={10} className="animate-spin" /> খোঁজা হচ্ছে...
                                            </span>
                                        )}
                                    </div>
                                    <input
                                        type="text"
                                        value={memberCode}
                                        onChange={(e) => {
                                            setMemberCode(e.target.value);
                                            setIsExistingMember(false);
                                        }}
                                        onBlur={handleCodeBlur}
                                        placeholder="উদাঃ 0001000045 বা 45"
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    />
                                    {isExistingMember && (
                                        <p className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium mt-1">
                                            <CheckCircle2 size={13} className="text-emerald-600" />
                                            ভর্তি তালিকা থেকে তথ্য স্বয়ংক্রিয়ভাবে লোড হয়েছে
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-700">
                                        সদস্যের নাম (Member Name) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={memberName}
                                        onChange={(e) => setMemberName(e.target.value)}
                                        placeholder="সদস্যের নাম লিখুন"
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    />
                                </div>
                            </div>

                            {/* Phone & Remarks */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-700">
                                        মোবাইল নম্বর (Phone Number)
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                            <Phone size={14} />
                                        </div>
                                        <input
                                            type="text"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            placeholder="017xxxxxxxx"
                                            className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-700">
                                        মন্তব্য (Remarks - ঐচ্ছিক)
                                    </label>
                                    <input
                                        type="text"
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        placeholder="কোনো নোট থাকলে লিখুন"
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    />
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                                >
                                    বাতিল
                                </button>
                                <button
                                    type="submit"
                                    disabled={singleSubmitting}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-60"
                                >
                                    {singleSubmitting ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            <span>সংরক্ষণ হচ্ছে...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check size={14} />
                                            <span>রেজিস্ট্রেশন সংরক্ষণ করুন</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    ) : (
                        /* Tab 2: Bulk Excel Upload */
                        <form onSubmit={handleBulkSubmit} className="space-y-4">
                            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-start gap-3">
                                <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
                                <div className="text-xs text-blue-900 space-y-1">
                                    <p className="font-bold">এক্সেল ফাইলের মাধ্যমে একসাথে শত শত মেম্বার এন্ট্রি করুন:</p>
                                    <p className="text-blue-700 text-[11px]">
                                        সঠিক ফরম্যাটের জন্য নিচের বাটন থেকে নমুনা ফাইল ডাউনলোড করুন। ফাইলে শাখা কোড, সমিতি কোড, মেম্বার কোড, নাম ও ফোন নম্বর থাকতে হবে।
                                    </p>
                                </div>
                            </div>

                            {/* Sample Download Button */}
                            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                <div className="flex items-center gap-2 text-xs text-slate-700">
                                    <FileSpreadsheet size={18} className="text-emerald-600" />
                                    <span className="font-semibold">নমুনা এক্সেল টেমপ্লেট ফাইল</span>
                                </div>
                                <a
                                    href="/app-registrations/sample-template"
                                    download
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors"
                                >
                                    <Download size={13} />
                                    <span>নমুনা এক্সেল ডাউনলোড</span>
                                </a>
                            </div>

                            {/* Default Branch if multi-branch */}
                            {(hasMultipleBranches || allBranches.length > 1) && (
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-700">
                                        ডিফল্ট শাখা (Default Branch)
                                    </label>
                                    <select
                                        value={bulkBranchId}
                                        onChange={(e) => setBulkBranchId(Number(e.target.value))}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800"
                                    >
                                        {allBranches.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {formatBranchLabel(b)}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-slate-500">
                                        * এক্সেলে নির্দিষ্ট শাখা কোড না থাকলে এই ডিফল্ট শাখায় এন্ট্রি হবে।
                                    </p>
                                </div>
                            )}

                            {/* File Upload Box */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700">
                                    এক্সেল ফাইল নির্বাচন করুন (.xlsx, .xls) <span className="text-red-500">*</span>
                                </label>
                                <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center transition-colors bg-slate-50/50">
                                    <input
                                        type="file"
                                        id="excel-file-input"
                                        accept=".xlsx, .xls, .csv"
                                        onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                                        className="hidden"
                                    />
                                    <label htmlFor="excel-file-input" className="cursor-pointer space-y-2 block">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-2xs">
                                            <Upload className="w-6 h-6" />
                                        </div>
                                        <div className="text-xs text-slate-700">
                                            {bulkFile ? (
                                                <span className="font-bold text-blue-600">{bulkFile.name}</span>
                                            ) : (
                                                <span>
                                                    <span className="font-bold text-blue-600 underline">ফাইল বাছাই করুন</span>{' '}
                                                    অথবা এখানে ড্র্যাগ করুন
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-400">সর্বোচ্চ ফাইল সাইজ: ১০ মেগাবাইট</p>
                                    </label>
                                </div>
                            </div>

                            {/* Result Box */}
                            {bulkResult && (
                                <div
                                    className={`p-4 rounded-2xl text-xs border ${
                                        bulkResult.ok
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                            : 'bg-red-50 border-red-200 text-red-900'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 font-bold text-sm">
                                        {bulkResult.ok ? (
                                            <CheckCircle2 className="text-emerald-600" size={18} />
                                        ) : (
                                            <AlertCircle className="text-red-600" size={18} />
                                        )}
                                        <span>{bulkResult.message}</span>
                                    </div>
                                    {bulkResult.ok && (
                                        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                                            <div className="p-2 bg-white/80 rounded-xl border border-emerald-100">
                                                <div className="text-[10px] text-slate-500 font-semibold">নতুন এন্ট্রি</div>
                                                <div className="text-base font-bold text-emerald-700">{bulkResult.created ?? 0}</div>
                                            </div>
                                            <div className="p-2 bg-white/80 rounded-xl border border-emerald-100">
                                                <div className="text-[10px] text-slate-500 font-semibold">আপডেট</div>
                                                <div className="text-base font-bold text-blue-700">{bulkResult.updated ?? 0}</div>
                                            </div>
                                            <div className="p-2 bg-white/80 rounded-xl border border-emerald-100">
                                                <div className="text-[10px] text-slate-500 font-semibold">ত্রুটি/ব্যর্থ</div>
                                                <div className="text-base font-bold text-red-700">{bulkResult.failed ?? 0}</div>
                                            </div>
                                        </div>
                                    )}
                                    {bulkResult.errors && bulkResult.errors.length > 0 && (
                                        <ul className="mt-2.5 list-disc list-inside text-[11px] text-red-700 space-y-0.5">
                                            {bulkResult.errors.map((err, i) => (
                                                <li key={i}>{err}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}

                            {/* Bulk Submit Button */}
                            <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                                >
                                    বন্ধ করুন
                                </button>
                                <button
                                    type="submit"
                                    disabled={!bulkFile || bulkUploading}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-60"
                                >
                                    {bulkUploading ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            <span>আপলোড ও প্রসেস হচ্ছে...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={14} />
                                            <span>এক্সেল আপলোড সম্পন্ন করুন</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

