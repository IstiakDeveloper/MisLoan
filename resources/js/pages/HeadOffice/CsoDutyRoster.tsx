import { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    Edit3,
    CheckCircle2,
    Clock,
    AlertCircle,
    UserCheck,
    Building2,
    Banknote,
    UserPlus,
    Layers,
    MapPin,
    Shield,
    Sparkles,
    Save,
    X,
    HelpCircle,
} from 'lucide-react';

interface Zone {
    id: number;
    name: string;
}

interface Area {
    id: number;
    name: string;
    code?: string;
    zone?: Zone | null;
    branch_count?: number;
    pending_loans?: number;
    pending_admissions?: number;
}

interface CsoUser {
    id: number;
    name: string;
    email: string;
    username?: string;
    phone?: string;
}

interface RosterEntry {
    user: CsoUser;
    areas: Area[];
    total_branches: number;
    pending_loans: number;
    pending_admissions: number;
    notes?: string | null;
}

interface DutyBoard {
    date: string;
    is_manual: boolean;
    roster: RosterEntry[];
    unassigned_areas: Area[];
}

interface PageProps {
    date: string;
    dutyBoard: DutyBoard;
    allAreas: Area[];
    activeCsos: CsoUser[];
    canManage: boolean;
}

export default function CsoDutyRoster({
    date,
    dutyBoard,
    allAreas,
    activeCsos,
    canManage,
}: PageProps) {
    const [selectedDate, setSelectedDate] = useState(date);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [notes, setNotes] = useState('');

    // State for manual editing mapping: userId -> areaIds[]
    const [manualAllocations, setManualAllocations] = useState<Record<number, number[]>>({});

    const handleDateChange = (newDate: string) => {
        setSelectedDate(newDate);
        router.get(
            '/head-office/cso-duty-roster',
            { date: newDate },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handlePreviousDay = () => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() - 1);
        handleDateChange(d.toISOString().split('T')[0]);
    };

    const handleNextDay = () => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + 1);
        handleDateChange(d.toISOString().split('T')[0]);
    };

    const handleToday = () => {
        const todayStr = new Date().toISOString().split('T')[0];
        handleDateChange(todayStr);
    };

    const openEditModal = () => {
        const initialMap: Record<number, number[]> = {};
        activeCsos.forEach((cso) => {
            const entry = dutyBoard.roster.find((r) => r.user.id === cso.id);
            initialMap[cso.id] = entry ? entry.areas.map((a) => a.id) : [];
        });
        setManualAllocations(initialMap);
        setNotes(dutyBoard.roster[0]?.notes || '');
        setIsEditModalOpen(true);
    };

    const toggleAreaForUser = (userId: number, areaId: number) => {
        setManualAllocations((prev) => {
            const currentAreas = prev[userId] || [];
            let updatedUserAreas: number[];

            if (currentAreas.includes(areaId)) {
                updatedUserAreas = currentAreas.filter((id) => id !== areaId);
            } else {
                // If this area was assigned to another user, remove it from them
                updatedUserAreas = [...currentAreas, areaId];
            }

            const updated = { ...prev, [userId]: updatedUserAreas };

            // Remove this area from other users if newly selected
            if (!currentAreas.includes(areaId)) {
                Object.keys(updated).forEach((uidStr) => {
                    const uid = Number(uidStr);
                    if (uid !== userId) {
                        updated[uid] = (updated[uid] || []).filter((id) => id !== areaId);
                    }
                });
            }

            return updated;
        });
    };

    const handleSaveManualAllocations = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        router.post(
            '/head-office/cso-duty-roster',
            {
                date: selectedDate,
                allocations: manualAllocations,
                notes: notes || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsEditModalOpen(false);
                    setIsSaving(false);
                },
                onError: () => {
                    setIsSaving(false);
                },
            }
        );
    };

    const handleResetToAuto = () => {
        if (!confirm('Are you sure you want to reset this date to Automatic Cyclic Rotation?')) {
            return;
        }
        setIsResetting(true);
        router.post(
            '/head-office/cso-duty-roster/reset',
            { date: selectedDate },
            {
                preserveScroll: true,
                onSuccess: () => setIsResetting(false),
                onError: () => setIsResetting(false),
            }
        );
    };

    // Calculate total pending counts across all roster
    const overallStats = useMemo(() => {
        return dutyBoard.roster.reduce(
            (acc, curr) => {
                acc.branches += curr.total_branches;
                acc.loans += curr.pending_loans;
                acc.admissions += curr.pending_admissions;
                return acc;
            },
            { branches: 0, loans: 0, admissions: 0 }
        );
    }, [dutyBoard.roster]);

    const isToday = selectedDate === new Date().toISOString().split('T')[0];

    return (
        <AdminLayout>
            <Head title="CSO Duty Roster - Daily Area Allocation" />

            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
                {/* Header Section */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-gradient-to-bl from-blue-500/10 via-indigo-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

                    <div className="space-y-2 relative z-10">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl shadow-md shadow-blue-500/20">
                                <CalendarDays className="w-6 h-6 stroke-[2.2]" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                        CSO Daily Duty Roster
                                    </h1>
                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                                        দৈনিক এরিয়া বণ্টন
                                    </span>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                                    Customer Service Officer (CSO)-দের জন্য প্রতিদিনের এলাকা ভিত্তিক আবেদন মনিটরিং ও নিরপেক্ষ ভেরিফিকেশন ব্যবস্থা
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Date Control Toolbar */}
                    <div className="flex flex-wrap items-center gap-2.5 relative z-10 bg-slate-50 p-2 rounded-2xl border border-slate-200/70">
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={handlePreviousDay}
                                className="p-2 hover:bg-white text-slate-600 rounded-xl transition-all shadow-xs hover:text-blue-600"
                                title="Previous Day"
                            >
                                <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                            </button>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => handleDateChange(e.target.value)}
                                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-xs"
                            />
                            <button
                                type="button"
                                onClick={handleNextDay}
                                className="p-2 hover:bg-white text-slate-600 rounded-xl transition-all shadow-xs hover:text-blue-600"
                                title="Next Day"
                            >
                                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={handleToday}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                                isToday
                                    ? 'bg-blue-600 text-white shadow-blue-500/20'
                                    : 'bg-white text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            Today
                        </button>
                    </div>
                </div>

                {/* Status Bar & Overall Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Allocation Mode Card */}
                    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block">
                                Roster Status
                            </span>
                            <div className="flex items-center gap-2">
                                {dutyBoard.is_manual ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                        <Edit3 className="w-3.5 h-3.5" /> Manual Override
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <Sparkles className="w-3.5 h-3.5" /> Auto Rotation
                                    </span>
                                )}
                            </div>
                        </div>

                        {canManage && (
                            <div className="flex items-center gap-1.5">
                                {dutyBoard.is_manual ? (
                                    <button
                                        type="button"
                                        onClick={handleResetToAuto}
                                        disabled={isResetting}
                                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all text-xs font-semibold flex items-center gap-1 shadow-xs"
                                        title="Reset to Auto Rotation"
                                    >
                                        <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                                    </button>
                                ) : null}
                                <button
                                    type="button"
                                    onClick={openEditModal}
                                    className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-500/20 flex items-center gap-1.5"
                                >
                                    <Edit3 className="w-3.5 h-3.5" /> Customize
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Active CSOs Metric */}
                    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                            <UserCheck className="w-5 h-5 stroke-[2.2]" />
                        </div>
                        <div>
                            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block">
                                Active CSOs
                            </span>
                            <span className="text-xl font-black text-slate-900">
                                {activeCsos.length} জন
                            </span>
                        </div>
                    </div>

                    {/* Pending Loans Metric */}
                    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                            <Banknote className="w-5 h-5 stroke-[2.2]" />
                        </div>
                        <div>
                            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block">
                                Pending Loans (HO)
                            </span>
                            <span className="text-xl font-black text-slate-900">
                                {overallStats.loans} টি
                            </span>
                        </div>
                    </div>

                    {/* Pending Admissions Metric */}
                    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                            <UserPlus className="w-5 h-5 stroke-[2.2]" />
                        </div>
                        <div>
                            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block">
                                Pending Admissions (HO)
                            </span>
                            <span className="text-xl font-black text-slate-900">
                                {overallStats.admissions} টি
                            </span>
                        </div>
                    </div>
                </div>

                {/* Unassigned Areas Warning (If any) */}
                {dutyBoard.unassigned_areas && dutyBoard.unassigned_areas.length > 0 && (
                    <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <h4 className="text-xs font-bold uppercase tracking-wide">
                                কিছু এরিয়া এখনো কোনো CSO-কে বরাদ্দ করা হয়নি:
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                                {dutyBoard.unassigned_areas.map((a) => (
                                    <span
                                        key={a.id}
                                        className="px-2 py-0.5 bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-xs font-semibold"
                                    >
                                        {a.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Duty Roster Cards Grid */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-blue-600" />
                            অফিসার ভিত্তিক এলাকা বরাদ্দ তালিকা ({selectedDate})
                        </h2>
                        <span className="text-xs font-semibold text-slate-400">
                            মোট এরিয়া: {allAreas.length} টি
                        </span>
                    </div>

                    {dutyBoard.roster.length === 0 ? (
                        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 space-y-3">
                            <UserCheck className="w-12 h-12 text-slate-300 mx-auto" />
                            <h3 className="text-base font-bold text-slate-700">কোনো সক্রিয় CSO পাওয়া যায়নি</h3>
                            <p className="text-xs text-slate-500 max-w-md mx-auto">
                                ইউজার ম্যানেজমেন্ট থেকে অফিসারদের রোল <strong>Customer Service Officer (CSO)</strong> হিসেবে অ্যাসাইন এবং সক্রিয় করুন।
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {dutyBoard.roster.map((entry, idx) => (
                                <div
                                    key={entry.user.id}
                                    className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-5 relative overflow-hidden group"
                                >
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-full pointer-events-none" />

                                    <div className="space-y-4">
                                        {/* User Header */}
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-indigo-700 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-500/20">
                                                    {entry.user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                                                        {entry.user.name}
                                                    </h3>
                                                    <p className="text-xs text-slate-400 font-medium">
                                                        {entry.user.email || entry.user.username} {entry.user.phone ? `• ${entry.user.phone}` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-xl text-[11px] font-bold">
                                                CSO #{idx + 1}
                                            </span>
                                        </div>

                                        {/* Workload Stats Bar */}
                                        <div className="grid grid-cols-3 gap-2 bg-slate-50/80 p-2.5 rounded-2xl border border-slate-100 text-center">
                                            <div>
                                                <span className="text-[10px] font-bold uppercase text-slate-400 block">বরাদ্দ এরিয়া</span>
                                                <span className="text-xs sm:text-sm font-black text-slate-800">
                                                    {entry.areas.length} টি
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase text-slate-400 block">পেন্ডিং লোন</span>
                                                <span className="text-xs sm:text-sm font-black text-emerald-600">
                                                    {entry.pending_loans} টি
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase text-slate-400 block">পেন্ডিং ভর্তি</span>
                                                <span className="text-xs sm:text-sm font-black text-purple-600">
                                                    {entry.pending_admissions} টি
                                                </span>
                                            </div>
                                        </div>

                                        {/* Assigned Areas List */}
                                        <div className="space-y-2">
                                            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block">
                                                আজকের দায়িত্বপ্রাপ্ত এরিয়াসমূহ:
                                            </span>
                                            {entry.areas.length === 0 ? (
                                                <p className="text-xs text-slate-400 italic">কোনো এরিয়া বরাদ্দ নেই</p>
                                            ) : (
                                                <div className="flex flex-wrap gap-2">
                                                    {entry.areas.map((area) => (
                                                        <div
                                                            key={area.id}
                                                            className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200/70 rounded-xl flex items-center gap-2 shadow-2xs"
                                                        >
                                                            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                                            <div className="text-left">
                                                                <span className="text-xs font-bold text-slate-800 block leading-tight">
                                                                    {area.name}
                                                                </span>
                                                                {area.zone && (
                                                                    <span className="text-[9.5px] font-semibold text-slate-400 block leading-none">
                                                                        {area.zone.name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Note / Footer */}
                                    {entry.notes && (
                                        <div className="pt-2 border-t border-slate-100 text-left">
                                            <p className="text-[11px] text-slate-500 font-medium italic">
                                                📝 নোট: {entry.notes}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Explanation Card for System Operations */}
                <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
                    <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-12 translate-y-12">
                        <Shield className="w-64 h-64 text-white" />
                    </div>

                    <div className="space-y-4 max-w-3xl relative z-10">
                        <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                            <Sparkles className="w-4 h-4" />
                            স্বয়ংক্রিয় রোটেশন পদ্ধতি (System Logic)
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                            দৈনিক এরিয়া রোটেশন কীভাবে কাজ করে?
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                            প্রতিদিন মধ্যরাতে সিস্টেম স্বয়ংক্রিয়ভাবে সক্রিয় CSO অফিসারদের তালিকা ও মোট এরিয়াগুলো বিশ্লেষণ করে সাইক্লিক পদ্ধতিতে (Cyclic Offset) এরিয়া পুনর্বণ্টন করে। 
                            এর ফলে কোনো অফিসার একই এরিয়া টানা কাজ করবেন না এবং নিরপেক্ষ যাচাই প্রক্রিয়া নিশ্চিত হবে। হেড অফিস চাইলে যেকোনো দিন বিশেষ প্রয়োজনে ম্যানুয়াল ওভাররাইড করতে পারবে।
                        </p>
                    </div>
                </div>
            </div>

            {/* Manual Edit / Allocation Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-lg font-black text-slate-900">
                                    ম্যানুয়ালি এরিয়া বরাদ্দ করুন ({selectedDate})
                                </h3>
                                <p className="text-xs text-slate-500">
                                    প্রতিটি CSO-র জন্য পছন্দসই এরিয়াগুলো নির্বাচন করুন
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsEditModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSaveManualAllocations} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                            <div className="space-y-6">
                                {activeCsos.map((cso) => {
                                    const userSelectedAreaIds = manualAllocations[cso.id] || [];

                                    return (
                                        <div key={cso.id} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                                                        {cso.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">{cso.name}</h4>
                                                        <span className="text-[10px] text-slate-400 font-medium">{cso.email}</span>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg">
                                                    নির্বাচিত: {userSelectedAreaIds.length} টি এরিয়া
                                                </span>
                                            </div>

                                            {/* Area selection chips */}
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
                                                {allAreas.map((area) => {
                                                    const isChecked = userSelectedAreaIds.includes(area.id);
                                                    return (
                                                        <button
                                                            key={area.id}
                                                            type="button"
                                                            onClick={() => toggleAreaForUser(cso.id, area.id)}
                                                            className={`px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all border flex items-center justify-between gap-1.5 ${
                                                                isChecked
                                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                                                    : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50/30'
                                                            }`}
                                                        >
                                                            <span className="truncate">{area.name}</span>
                                                            {isChecked && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700">নোট / কারণ (ঐচ্ছিক):</label>
                                    <input
                                        type="text"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="উদাহরণ: অফিসার ছুটিতে থাকায় বিশেষ বণ্টন"
                                        className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                                    />
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    {isSaving ? 'Saving...' : 'Save Allocation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
