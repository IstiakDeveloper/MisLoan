import React from 'react';
import { FileText, UserCheck, MessageSquare, AlertCircle } from 'lucide-react';

interface Props {
    activeTab: 'forms' | 'details' | 'approvals';
    setActiveTab: (tab: 'forms' | 'details' | 'approvals') => void;
    savedFormCount?: number;
    totalFormCount?: number;
    commentsCount?: number;
    pendingIssuesCount?: number;
}

export default function LoanShowTabs({
    activeTab,
    setActiveTab,
    savedFormCount = 0,
    totalFormCount = 4,
    commentsCount = 0,
    pendingIssuesCount = 0,
}: Props) {
    return (
        <div className="print:hidden mx-0 px-2 sm:px-0">
            <div className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center sm:gap-2 sm:overflow-x-auto sm:scrollbar-none border-b border-slate-200 pb-2">
                {/* ── TAB 1: APPLICATION FORMS ── */}
                <button
                    type="button"
                    onClick={() => setActiveTab('forms')}
                    className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all touch-manipulation min-h-14 sm:min-h-0 cursor-pointer ${
                        activeTab === 'forms'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                    <span className="relative">
                        <FileText className="w-4 h-4 shrink-0" />
                        <span
                            className={`absolute -top-1.5 -right-3 min-w-[18px] h-4 px-1 rounded-full text-[9px] font-extrabold flex items-center justify-center ${
                                activeTab === 'forms'
                                    ? 'bg-white text-blue-700'
                                    : 'bg-blue-100 text-blue-800'
                            }`}
                        >
                            {savedFormCount}/{totalFormCount}
                        </span>
                    </span>
                    <span className="text-center leading-tight ml-1">আবেদন ফর্মসমূহ</span>
                </button>

                {/* ── TAB 2: MEMBER & LOAN DETAILS ── */}
                <button
                    type="button"
                    onClick={() => setActiveTab('details')}
                    className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all touch-manipulation min-h-14 sm:min-h-0 cursor-pointer ${
                        activeTab === 'details'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                    <UserCheck className="w-4 h-4 shrink-0" />
                    <span className="text-center leading-tight">সদস্য ও ঋণ বিস্তারিত</span>
                </button>

                {/* ── TAB 3: APPROVAL TIMELINE & ISSUES ── */}
                <button
                    type="button"
                    onClick={() => setActiveTab('approvals')}
                    className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all touch-manipulation min-h-14 sm:min-h-0 relative cursor-pointer ${
                        activeTab === 'approvals'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                    <span className="relative">
                        <MessageSquare className="w-4 h-4 shrink-0" />
                        {pendingIssuesCount > 0 ? (
                            <span className="absolute -top-1.5 -right-3 min-w-[18px] h-4 px-1 rounded-full text-[9px] font-extrabold flex items-center justify-center bg-rose-500 text-white animate-pulse">
                                {pendingIssuesCount}
                            </span>
                        ) : commentsCount > 0 ? (
                            <span
                                className={`absolute -top-1.5 -right-3 min-w-[18px] h-4 px-1 rounded-full text-[9px] font-extrabold flex items-center justify-center ${
                                    activeTab === 'approvals'
                                        ? 'bg-white text-blue-700'
                                        : 'bg-amber-100 text-amber-900'
                                }`}
                            >
                                {commentsCount}
                            </span>
                        ) : null}
                    </span>
                    <span className="text-center leading-tight ml-1">অনুমোদন ও পর্যবেক্ষণ</span>
                </button>
            </div>
        </div>
    );
}
