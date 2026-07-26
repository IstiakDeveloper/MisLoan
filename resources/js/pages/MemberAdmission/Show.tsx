import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft,
    Edit,
    Send,
    Printer,
    Banknote,
    FileText,
    Paperclip,
    MessageSquare,
    CheckCircle2,
    XCircle,
    RotateCcw,
    Download,
    Eye,
    Clock,
    CreditCard,
    Image as ImageIcon,
} from 'lucide-react';
import { MemberAdmission } from '@/types/memberAdmission';
import MemberAdmissionFormView from '@/components/MemberAdmissionFormView';
import { formatDate } from '@/utils/dateUtils';

interface Props {
    admission: MemberAdmission & {
        customer_photo_path?: string;
        customer_nid_photo_path?: string;
        guardian_photo_path?: string;
        guardian_nid_photo_path?: string;
        applicant_signature_path?: string;
        approvals?: Array<{
            id: number;
            level: string;
            status: string;
            comments?: string;
            approved_at?: string;
            updated_at?: string;
            approver_pin?: string;
            user?: {
                id: number;
                name: string;
                role?: { name: string };
            };
        }>;
    };
    auth?: {
        user: {
            has_all_access: boolean;
        };
    };
}

export default function Show({ admission, auth }: Props) {
    const pageAuth = usePage().props.auth as { user?: { id?: number; has_all_access?: boolean; role?: { name: string } } } | undefined;
    const roleName = pageAuth?.user?.role?.name?.toLowerCase() || '';
    const isHeadOffice = auth?.user?.has_all_access ?? pageAuth?.user?.has_all_access ?? false;
    // Only Branch User can send ready admissions to Head Office (not Branch Manager)
    const isBranchUser = roleName === 'branch_user';
    const isFieldOfficer = roleName === 'field_officer';
    const canApplyLoan =
        admission.status === 'approved' &&
        (roleName === 'branch_user' ||
            (isFieldOfficer &&
                Number(admission.created_by ?? admission.createdBy?.id) === Number(pageAuth?.user?.id)));
    const backUrl = isHeadOffice ? '/head-office/admission-members' : '/member-admissions';

    const [activeTab, setActiveTab] = useState<'form' | 'attachments' | 'approvals'>('form');
    const [selectedImagePreview, setSelectedImagePreview] = useState<{ url: string; title: string } | null>(null);

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: any; label: string }> = {
            draft: { variant: 'secondary', label: 'Draft (খসড়া)' },
            submitted: { variant: 'default', label: 'Submitted (জমা দেওয়া)' },
            under_review: { variant: 'default', label: 'Under Review (পর্যালোচনায়)' },
            pending_head_office: { variant: 'default', label: 'Pending Head Office (হেড অফিসে অপেক্ষমান)' },
            approved: { variant: 'default', label: 'Approved (অনুমোদিত)' },
            rejected: { variant: 'destructive', label: 'Rejected (বাতিল)' },
            needs_revision: { variant: 'default', label: 'Needs Revision (সংশোধন প্রয়োজন)' },
        };
        const config = variants[status] || { variant: 'secondary', label: status };
        return (
            <Badge
                variant={config.variant}
                className={
                    status === 'approved'
                        ? 'bg-green-500 hover:bg-green-600'
                        : status === 'under_review'
                        ? 'bg-yellow-500 hover:bg-yellow-600'
                        : status === 'submitted'
                        ? 'bg-blue-500 hover:bg-blue-600'
                        : status === 'pending_head_office'
                        ? 'bg-purple-500 hover:bg-purple-600'
                        : status === 'needs_revision'
                        ? 'bg-orange-500 hover:bg-orange-600'
                        : ''
                }
            >
                {config.label}
            </Badge>
        );
    };

    const handleSubmit = () => {
        const msg = admission.is_legacy
            ? `আবেদন নং ${admission.application_no} পুরাতন সদস্য — জমা দিলে স্বয়ংক্রিয়ভাবে অনুমোদিত হবে। চালিয়ে যাবেন?`
            : `Are you sure you want to submit application ${admission.application_no}?`;
        if (confirm(msg)) {
            router.patch(`/member-admissions/${admission.id}/submit`);
        }
    };

    const handleSendToHeadOffice = () => {
        if (confirm(`এই আবেদনটি Head Office এ পাঠাতে চান? (${admission.application_no})`)) {
            router.patch(`/member-admissions/${admission.id}/send-to-head-office`);
        }
    };

    const handlePrint = () => {
        const printUrl = isHeadOffice
            ? `/head-office/admissions/${admission.id}/print`
            : `/member-admissions/${admission.id}/print`;
        window.open(printUrl, '_blank');
    };

    const isEditable = admission.can_be_edited ?? (admission.status === 'draft' || admission.status === 'submitted' || admission.status === 'under_review' || admission.status === 'needs_revision');

    // Attachments list
    const attachments = [
        {
            title: 'সদস্যের NID কার্ডের ছবি',
            fieldKey: 'customer_nid_photo_path',
            path: admission.customer_nid_photo_path,
            required: true,
            icon: <CreditCard className="w-5 h-5 text-emerald-600" />,
        },
        {
            title: 'সদস্যের পাসপোর্ট সাইজ ছবি',
            fieldKey: 'customer_photo_path',
            path: admission.customer_photo_path,
            required: false,
            icon: <ImageIcon className="w-5 h-5 text-blue-600" />,
        },
        {
            title: 'অভিভাবকের ছবি',
            fieldKey: 'guardian_photo_path',
            path: admission.guardian_photo_path,
            required: false,
            icon: <ImageIcon className="w-5 h-5 text-purple-600" />,
        },
        {
            title: 'অভিভাবকের NID কার্ডের ছবি',
            fieldKey: 'guardian_nid_photo_path',
            path: admission.guardian_nid_photo_path,
            required: false,
            icon: <CreditCard className="w-5 h-5 text-indigo-600" />,
        },
        {
            title: 'আবেদনকারীর স্বাক্ষর',
            fieldKey: 'applicant_signature_path',
            path: admission.applicant_signature_path,
            required: false,
            icon: <FileText className="w-5 h-5 text-amber-600" />,
        },
    ].filter((att) => Boolean(att.path));

    const approvalsList = admission.approvals || [];
    const commentsCount = approvalsList.filter((a) => Boolean(a.comments)).length;

    return (
        <AdminLayout>
            <Head title={`জরিপ ও সদস্য ভর্তি - ${admission.application_no}`} />

            <div className="space-y-3 sm:space-y-4 max-w-[210mm] mx-auto w-full px-0 sm:px-4 py-1 sm:py-4 print:p-0 print:max-w-none">
                {/* ── ACTION BAR (Hidden on Print) ────────────────────────────────────────── */}
                <div className="print:hidden sticky top-14 z-30 -mx-0 sm:mx-0 bg-white/95 backdrop-blur-sm sm:bg-white sm:backdrop-blur-none border-b sm:border border-slate-200 sm:rounded-2xl shadow-sm sm:shadow-sm">
                    <div className="flex flex-col gap-3 p-3 sm:p-4">
                        <div className="flex items-start gap-2.5 min-w-0">
                            <Link
                                href={backUrl}
                                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shrink-0 touch-manipulation"
                                aria-label="Go Back"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                    <h1 className="text-base sm:text-xl font-extrabold text-slate-900 leading-snug">
                                        সদস্য ভর্তি আবেদনপত্র
                                    </h1>
                                    {getStatusBadge(admission.status)}
                                    {admission.is_legacy && (
                                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                            পুরাতন{admission.loan_dofa ? ` · দফা ${admission.loan_dofa}` : ''}
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] sm:text-xs text-slate-500 mt-1 font-medium break-words">
                                    আবেদন নং: <span className="font-mono font-bold text-blue-700">{admission.application_no}</span>
                                    <span className="text-slate-300 mx-1">|</span>
                                    সদস্য: <span className="font-bold text-slate-800">{admission.applicant_name_bn || admission.applicant_name_en}</span>
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:w-auto pt-2.5 border-t border-slate-100">
                            {canApplyLoan && (
                                <Link
                                    href={`/member/loan-applications?member_id=${admission.id}`}
                                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-11 sm:min-h-9 sm:h-9 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-xs transition touch-manipulation col-span-1"
                                >
                                    <Banknote className="w-4 h-4 shrink-0" />
                                    <span>ঋণ আবেদন</span>
                                </Link>
                            )}
                            <button
                                type="button"
                                onClick={handlePrint}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-11 sm:min-h-9 sm:h-9 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 shadow-xs transition touch-manipulation"
                            >
                                <Printer className="w-4 h-4 shrink-0" />
                                <span>প্রিন্ট</span>
                            </button>
                            {isEditable && (
                                <Link
                                    href={`/member-admissions/${admission.id}/edit`}
                                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-11 sm:min-h-9 sm:h-9 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-xs transition touch-manipulation"
                                >
                                    <Edit className="w-4 h-4 shrink-0" />
                                    <span>সম্পাদনা</span>
                                </Link>
                            )}
                            {admission.status === 'draft' && (
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-11 sm:min-h-9 sm:h-9 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-xs transition touch-manipulation"
                                >
                                    <Send className="w-4 h-4 shrink-0" />
                                    <span>জমা দিন</span>
                                </button>
                            )}
                            {admission.status === 'ready_for_head_office' && isBranchUser && (
                                <button
                                    type="button"
                                    onClick={handleSendToHeadOffice}
                                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-11 sm:min-h-9 sm:h-9 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 shadow-xs transition touch-manipulation col-span-2 sm:col-span-1"
                                >
                                    <Send className="w-4 h-4 shrink-0" />
                                    <span>Head Office এ পাঠান</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── TABS NAVIGATION BAR (Hidden on Print) ─────────────────────────────────── */}
                <div className="print:hidden mx-0 sm:mx-0 px-2 sm:px-0">
                    <div className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center sm:gap-2 sm:overflow-x-auto sm:scrollbar-none border-b border-slate-200 pb-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab('form')}
                            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3.5 py-2.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all touch-manipulation min-h-14 sm:min-h-0 ${
                                activeTab === 'form'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                        >
                            <FileText className="w-4 h-4 shrink-0" />
                            <span className="text-center leading-tight">আবেদনপত্র</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('attachments')}
                            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3.5 py-2.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all touch-manipulation min-h-14 sm:min-h-0 relative ${
                                activeTab === 'attachments'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                        >
                            <span className="relative">
                                <Paperclip className="w-4 h-4 shrink-0" />
                                <span className={`absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-extrabold flex items-center justify-center ${
                                    activeTab === 'attachments' ? 'bg-white text-blue-700' : 'bg-blue-100 text-blue-800'
                                }`}>
                                    {attachments.length}
                                </span>
                            </span>
                            <span className="text-center leading-tight">সংযুক্তি</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('approvals')}
                            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3.5 py-2.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all touch-manipulation min-h-14 sm:min-h-0 relative ${
                                activeTab === 'approvals'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                        >
                            <span className="relative">
                                <MessageSquare className="w-4 h-4 shrink-0" />
                                {commentsCount > 0 && (
                                    <span className={`absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-extrabold flex items-center justify-center ${
                                        activeTab === 'approvals' ? 'bg-white text-blue-700' : 'bg-amber-100 text-amber-900'
                                    }`}>
                                        {commentsCount}
                                    </span>
                                )}
                            </span>
                            <span className="text-center leading-tight">অনুমোদন</span>
                        </button>
                    </div>
                </div>

                {/* ── TAB 1: FORM VIEW ─────────────────────────────────────────────────── */}
                <div className={activeTab === 'form' ? 'block' : 'hidden print:block'}>
                    <div className="overflow-x-auto -mx-0 sm:mx-0 rounded-none sm:rounded-xl border-y sm:border border-slate-200 bg-white print:overflow-visible print:border-0 print:rounded-none">
                        <div className="min-w-0 sm:min-w-0 print:min-w-0">
                            <MemberAdmissionFormView admission={admission as any} printMode={false} />
                        </div>
                    </div>
                </div>

                {/* ── TAB 2: ATTACHMENTS & NID DOCUMENTS VIEW ───────────────────────────── */}
                {activeTab === 'attachments' && (
                    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-3.5 sm:p-6 shadow-sm space-y-4 sm:space-y-6 print:hidden animate-fade-in mx-2 sm:mx-0">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 sm:pb-4">
                            <div className="min-w-0">
                                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <Paperclip className="w-5 h-5 text-blue-600 shrink-0" />
                                    <span className="truncate">সংযুক্তি ও NID ({attachments.length})</span>
                                </h3>
                                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                                    জাতীয় পরিচয়পত্র, ছবি ও অন্যান্য ডকুমেন্ট দেখুন
                                </p>
                            </div>
                        </div>

                        {attachments.length === 0 ? (
                            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500">
                                <Paperclip className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                                <p className="text-sm font-semibold">কোনো ডকুমেন্ট ফাইল আপলোড করা নেই।</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {attachments.map((att) => {
                                    const fileUrl = `/storage/${att.path}`;
                                    const isPdf = att.path?.toLowerCase().endsWith('.pdf');

                                    return (
                                        <div
                                            key={att.fieldKey}
                                            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 p-4 hover:border-blue-400 hover:bg-white hover:shadow-md transition-all space-y-3"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    {att.icon}
                                                    <h4 className="text-xs font-bold text-slate-900 truncate">
                                                        {att.title}
                                                    </h4>
                                                </div>
                                            </div>

                                            {/* Preview Thumbnail */}
                                            <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center shadow-inner">
                                                {isPdf ? (
                                                    <div className="p-4 text-center text-red-600">
                                                        <FileText className="w-10 h-10 mx-auto mb-1" />
                                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                                            PDF Document
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={fileUrl}
                                                        alt={att.title}
                                                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                )}
                                            </div>

                                            {/* Download / View Actions */}
                                            <div className="flex items-center gap-2 pt-1">
                                                {!isPdf && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedImagePreview({ url: fileUrl, title: att.title })}
                                                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        <span>বড় করে দেখুন</span>
                                                    </button>
                                                )}
                                                <a
                                                    href={fileUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    download
                                                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-900 text-xs font-bold transition shadow-xs"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                    <span>ডাউনলোড</span>
                                                </a>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB 3: APPROVALS HISTORY & COMMENTS TIMELINE ───────────────────────── */}
                {activeTab === 'approvals' && (
                    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-3.5 sm:p-6 shadow-sm space-y-4 sm:space-y-6 print:hidden animate-fade-in mx-2 sm:mx-0">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 sm:pb-4">
                            <div className="min-w-0">
                                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-blue-600 shrink-0" />
                                    <span>অনুমোদন হিস্ট্রি</span>
                                </h3>
                                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                                    অফিসারদের মন্তব্য ও অনুমোদনের ইতিহাস
                                </p>
                            </div>
                        </div>

                        {approvalsList.length === 0 ? (
                            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500">
                                <MessageSquare className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                                <p className="text-sm font-semibold">এখনো কোনো অনুমোদন তথ্য নেই।</p>
                            </div>
                        ) : (
                            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                                {approvalsList.map((app, idx) => {
                                    const isApproved = app.status === 'approved';
                                    const isReturned = app.status === 'returned';
                                    const isRejected = app.status === 'rejected';
                                    const isPending = app.status === 'pending';

                                    return (
                                        <div key={app.id || idx} className="relative flex flex-col gap-2">
                                            {/* Timeline Bullet */}
                                            <div className={`absolute -left-[31px] top-1.5 w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs border-2 border-white shadow-sm ${
                                                isApproved ? 'bg-emerald-600' :
                                                isReturned ? 'bg-amber-500' :
                                                isRejected ? 'bg-rose-600' : 'bg-blue-500'
                                            }`}>
                                                {isApproved ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                                                 isReturned ? <RotateCcw className="w-3.5 h-3.5" /> :
                                                 isRejected ? <XCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                                            </div>

                                            {/* Timeline Content Card */}
                                            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 space-y-2">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                                        <span className="font-bold text-slate-900 text-sm">
                                                            {app.user?.name || 'অনুমোদনকারী কর্মকর্তা'}
                                                        </span>
                                                        <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                                            {app.level || app.user?.role?.name || 'Officer'}
                                                        </span>
                                                        {app.approver_pin && (
                                                            <span className="text-[10px] font-mono text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded font-bold">
                                                                PIN: {app.approver_pin}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                                        <span>{formatDate(app.approved_at || app.updated_at)}</span>
                                                        <Badge className={
                                                            isApproved ? 'bg-emerald-600' :
                                                            isReturned ? 'bg-amber-600' :
                                                            isRejected ? 'bg-rose-600' : 'bg-blue-600'
                                                        }>
                                                            {isApproved ? 'অনুমোদিত' :
                                                             isReturned ? 'ফেরত পাঠানো' :
                                                             isRejected ? 'বাতিল' : 'অপেক্ষমান'}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                {/* Written Comment Quote Box */}
                                                {app.comments ? (
                                                    <div className="mt-2 bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
                                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 text-blue-700">
                                                            <MessageSquare className="w-3.5 h-3.5" />
                                                            <span>অফিসারের মন্তব্য:</span>
                                                        </p>
                                                        <p className="text-xs text-slate-800 font-medium leading-relaxed italic whitespace-pre-wrap">
                                                            "{app.comments}"
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-slate-400 italic">কোনো মন্তব্য লেখা হয়নি</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── IMAGE LIGHTBOX / PREVIEW MODAL ─────────────────────────────────────── */}
            {selectedImagePreview && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-md p-0 sm:p-4 animate-fade-in">
                    <div className="relative max-w-3xl w-full bg-slate-900 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-800 text-white max-h-[92vh] flex flex-col">
                        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 shrink-0">
                            <h4 className="text-sm font-bold truncate pr-2">{selectedImagePreview.title}</h4>
                            <button
                                type="button"
                                onClick={() => setSelectedImagePreview(null)}
                                className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition touch-manipulation shrink-0"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-3 sm:p-4 flex items-center justify-center flex-1 min-h-0 overflow-auto bg-black">
                            <img
                                src={selectedImagePreview.url}
                                alt={selectedImagePreview.title}
                                className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg"
                            />
                        </div>
                        <div className="flex items-center justify-stretch sm:justify-end px-4 sm:px-6 py-3 border-t border-slate-800 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                            <a
                                href={selectedImagePreview.url}
                                target="_blank"
                                rel="noreferrer"
                                download
                                className="w-full sm:w-auto text-center px-4 py-2.5 min-h-11 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition touch-manipulation"
                            >
                                ডাউনলোড করুন
                            </a>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @media print {
                    body {
                        font-size: 14pt;
                        line-height: 1.7;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    @page {
                        margin: 14mm 8mm 10mm 8mm;
                        size: A4 portrait;
                    }
                    .form-print-document {
                        padding: 0 8mm 8mm 8mm !important;
                        padding-top: 6mm !important;
                        font-size: 14pt !important;
                        line-height: 1.7 !important;
                    }
                    .form-print-section {
                        padding-top: 4mm !important;
                        padding-bottom: 4mm !important;
                    }
                    .form-print-document > header.form-print-section {
                        margin-bottom: 6mm !important;
                    }
                    .form-print-document > header.form-print-section + .form-print-section {
                        margin-top: 2mm !important;
                        margin-bottom: 4mm !important;
                    }
                    .print\\:break-inside-avoid,
                    .form-print-section {
                        break-inside: avoid;
                        page-break-inside: avoid;
                    }
                    .form-print-page-break-before { page-break-before: always; }
                }
            `}</style>
        </AdminLayout>
    );
}
