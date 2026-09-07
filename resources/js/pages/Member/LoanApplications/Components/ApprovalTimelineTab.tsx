import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    CheckCircle2,
    RotateCcw,
    XCircle,
    Clock,
    MessageSquare,
    Edit,
    AlertCircle,
} from 'lucide-react';
import { formatDateTime } from '@/utils/dateUtils';

interface Props {
    approvalsList: any[];
    commentsCount: number;
    canModifyComment: boolean;
    onEditComment: (approval: any) => void;
    issues?: any[];
    canRespondToIssues?: boolean;
    onOpenIssueAction?: (issueId: number, action: 'resolve' | 'reject') => void;
    onNewIssue?: () => void;
    onEditIssue?: (issue: any) => void;
    isHeadOffice?: boolean;
}

export default function ApprovalTimelineTab({
    approvalsList = [],
    commentsCount = 0,
    canModifyComment,
    onEditComment,
    issues = [],
    canRespondToIssues = false,
    onOpenIssueAction,
    onNewIssue,
    onEditIssue,
    isHeadOffice = false,
}: Props) {
    return (
        <div className="printable-area p-3.5 sm:p-6 space-y-6 animate-in fade-in duration-150">
            {/* ── 1. APPROVAL TIMELINE SECTION (MIRRORING MEMBER ADMISSION) ── */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-4 border-b border-slate-100 gap-2">
                    <div>
                        <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-blue-600 shrink-0" />
                            <span>অনুমোদন হিস্ট্রি ও টাইমলাইন</span>
                        </h3>
                        <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                            বিভিন্ন স্তরের অফিসারদের মন্তব্য ও অনুমোদনের ইতিহাস
                        </p>
                    </div>
                    <div className="text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl self-start sm:self-auto">
                        মোট মন্তব্য: <span className="text-blue-600 font-bold">{commentsCount}টি</span>
                    </div>
                </div>

                {approvalsList.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500">
                        <MessageSquare className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-80" />
                        <p className="text-sm font-semibold">এখনো কোনো অনুমোদন তথ্য নেই।</p>
                    </div>
                ) : (
                    <div className="relative pl-6 sm:pl-7 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                        {approvalsList.map((app: any, idx: number) => {
                            const isApproved = app.status === 'approved';
                            const isReturned = app.status === 'returned';
                            const isRejected = app.status === 'rejected';

                            return (
                                <div key={app.id || idx} className="relative flex flex-col gap-2">
                                    {/* Timeline Bullet */}
                                    <div
                                        className={`absolute -left-[31px] sm:-left-[33px] top-1.5 w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs border-2 border-white shadow-sm ${
                                            isApproved
                                                ? 'bg-emerald-600'
                                                : isReturned
                                                ? 'bg-amber-500'
                                                : isRejected
                                                ? 'bg-rose-600'
                                                : 'bg-blue-500'
                                        }`}
                                    >
                                        {isApproved ? (
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                        ) : isReturned ? (
                                            <RotateCcw className="w-3.5 h-3.5" />
                                        ) : isRejected ? (
                                            <XCircle className="w-3.5 h-3.5" />
                                        ) : (
                                            <Clock className="w-3.5 h-3.5" />
                                        )}
                                    </div>

                                    {/* Timeline Content Card */}
                                    <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-2">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                                <span className="font-bold text-slate-900 text-sm">
                                                    {app.user?.name || 'অনুমোদনকারী কর্মকর্তা'}
                                                </span>
                                                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                                    {app.level || app.user?.role?.name || 'Officer'}
                                                </span>
                                                {app.user?.pin && (
                                                    <span className="text-[10px] font-mono text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded font-bold">
                                                        PIN: {app.user.pin}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                                <span>
                                                    {formatDateTime(
                                                        app.approved_at || app.updated_at || app.created_at
                                                    )}
                                                </span>
                                                <Badge
                                                    className={
                                                        isApproved
                                                            ? 'bg-emerald-600 text-white'
                                                            : isReturned
                                                            ? 'bg-amber-600 text-white'
                                                            : isRejected
                                                            ? 'bg-rose-600 text-white'
                                                            : 'bg-blue-600 text-white'
                                                    }
                                                >
                                                    {isApproved
                                                        ? 'অনুমোদিত'
                                                        : isReturned
                                                        ? 'ফেরত পাঠানো'
                                                        : isRejected
                                                        ? 'বাতিল'
                                                        : 'অপেক্ষমান'}
                                                </Badge>
                                            </div>
                                        </div>

                                        {/* Written Comment Quote Box */}
                                        <div className="mt-2 bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 text-blue-700">
                                                    <MessageSquare className="w-3.5 h-3.5" />
                                                    <span>অফিসারের মন্তব্য:</span>
                                                </p>
                                                {canModifyComment && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onEditComment(app)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-900 border border-indigo-200 rounded-lg transition active:scale-95 cursor-pointer shadow-2xs"
                                                        title="মন্তব্য সম্পাদন করুন"
                                                    >
                                                        <Edit className="w-3 h-3 text-indigo-600" />
                                                        <span>{app.comments ? 'সম্পাদনা' : 'মন্তব্য যোগ করুন'}</span>
                                                    </button>
                                                )}
                                            </div>
                                            {app.comments ? (
                                                <p className="text-xs text-slate-800 font-medium leading-relaxed italic whitespace-pre-wrap">
                                                    "{app.comments}"
                                                </p>
                                            ) : (
                                                <p className="text-xs text-slate-400 italic">
                                                    কোনো মন্তব্য লেখা হয়নি
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── 2. HEAD OFFICE INQUIRIES & ISSUES SECTION ── */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
                    <div>
                        <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                            <span>হেড অফিস বার্তা ও পর্যবেক্ষণ ট্র্যাকার</span>
                        </h4>
                        <p className="text-[11px] text-slate-500">
                            হেড অফিস থেকে উত্থাপিত পর্যবেক্ষণ এবং শাখা থেকে প্রদত্ত সমাধান
                        </p>
                    </div>
                    {isHeadOffice && onNewIssue && (
                        <Button
                            size="sm"
                            onClick={onNewIssue}
                            className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer self-start sm:self-auto"
                        >
                            <AlertCircle className="w-3.5 h-3.5 mr-1" />
                            নতুন সমস্যা লিখুন
                        </Button>
                    )}
                </div>

                {issues.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                        <p className="font-bold text-slate-700 text-xs">কোনো সমস্যা বা বার্তা পাওয়া যায়নি</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            আবেদনে কোনো ত্রুটি বা পর্যবেক্ষণ থাকলে তা এখানে প্রদর্শিত হবে।
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {issues.map((issue) => (
                            <div
                                key={issue.id}
                                className={`p-3.5 sm:p-4 rounded-2xl border text-xs sm:text-sm transition shadow-2xs ${
                                    issue.status === 'pending'
                                        ? 'bg-amber-50/80 border-amber-200'
                                        : issue.status === 'resolved'
                                        ? 'bg-emerald-50/50 border-emerald-200'
                                        : 'bg-rose-50/50 border-rose-200'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-slate-900">হেড অফিসের বার্তা</span>
                                        <Badge
                                            className={
                                                issue.status === 'pending'
                                                    ? 'bg-amber-200 text-amber-900 border-amber-300'
                                                    : issue.status === 'resolved'
                                                    ? 'bg-emerald-200 text-emerald-900 border-emerald-300'
                                                    : 'bg-rose-200 text-rose-900 border-rose-300'
                                            }
                                        >
                                            {issue.status === 'pending'
                                                ? 'পেন্ডিং'
                                                : issue.status === 'resolved'
                                                ? 'সমাধান করা হয়েছে'
                                                : 'প্রত্যাখ্যান করা হয়েছে'}
                                        </Badge>
                                    </div>
                                    <span className="text-[11px] text-slate-500 font-mono whitespace-nowrap">
                                        {formatDateTime(issue.created_at)}
                                    </span>
                                </div>

                                <p className="text-slate-800 whitespace-pre-wrap bg-white/80 p-3 rounded-xl border border-slate-200/60 leading-relaxed">
                                    {issue.issue_description}
                                </p>
                                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-xs text-slate-500">
                                        প্রেরক: <span className="font-semibold text-slate-700">{issue.reporter?.name || 'হেড অফিস কর্মকর্তা'}</span>
                                    </p>
                                    {isHeadOffice && onEditIssue && issue.status === 'pending' && !issue.response_message && (
                                        <button
                                            type="button"
                                            onClick={() => onEditIssue(issue)}
                                            className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-900 border border-indigo-200 rounded-lg transition active:scale-95 cursor-pointer shadow-2xs"
                                            title="সমস্যা সম্পাদনা করুন"
                                        >
                                            <Edit className="w-3 h-3 text-indigo-600" />
                                            <span>আপডেট</span>
                                        </button>
                                    )}
                                </div>

                                {/* Branch Response */}
                                {issue.response_message ? (
                                    <div className="mt-3 p-3 rounded-xl bg-indigo-50/80 border border-indigo-200/80">
                                        <div className="flex items-center gap-2 mb-1">
                                            <MessageSquare className="w-4 h-4 text-indigo-700" />
                                            <span className="font-bold text-indigo-900">শাখার উত্তর</span>
                                        </div>
                                        <p className="text-indigo-950 whitespace-pre-wrap leading-relaxed">{issue.response_message}</p>
                                        {issue.responder && (
                                            <p className="text-[11px] text-indigo-700 mt-1.5 font-medium">
                                                — {issue.responder.name} {issue.responded_at && `(${formatDateTime(issue.responded_at)})`}
                                            </p>
                                        )}
                                    </div>
                                ) : issue.status === 'pending' && (
                                    <div className="mt-2 text-xs text-slate-400 italic">
                                        শাখা থেকে এখনো কোনো উত্তর পাওয়া যায়নি।
                                    </div>
                                )}

                                {/* Branch Action Buttons */}
                                {issue.status === 'pending' && canRespondToIssues && onOpenIssueAction && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Button
                                            size="sm"
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs cursor-pointer"
                                            onClick={() => onOpenIssueAction(issue.id, 'resolve')}
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-1" />
                                            সমাধান করেছি — উত্তর দিন
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg text-xs cursor-pointer"
                                            onClick={() => onOpenIssueAction(issue.id, 'reject')}
                                        >
                                            <XCircle className="w-4 h-4 mr-1" />
                                            সমস্যা অস্বীকার করুন
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
