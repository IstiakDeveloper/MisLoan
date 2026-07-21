import React, { useState, useEffect } from 'react';
import { Head, router, Link, usePage } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate, formatDateTime } from '@/utils/dateUtils';
import { Badge } from '@/components/ui/badge';
import {
    Search,
    Plus,
    Eye,
    Edit,
    Trash2,
    Send,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    Ban,
    Printer,
} from 'lucide-react';
import { MemberAdmission } from '@/types/memberAdmission';

interface Props {
    admissions: {
        data: MemberAdmission[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number;
        to: number;
    };
    filters: {
        status?: string;
        search?: string;
        from_date?: string;
        to_date?: string;
    };
    stats: {
        total: number;
        draft: number;
        submitted: number;
        under_review: number;
        approved: number;
        rejected: number;
        needs_revision?: number;
    };
}

export default function Index({ admissions, filters, stats }: Props) {
    const pageAuth = usePage().props.auth as { user?: { role?: { name: string } } } | undefined;
    const isFieldOfficer = pageAuth?.user?.role?.name === 'field_officer';
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [fromDate, setFromDate] = useState(filters.from_date || '');
    const [toDate, setToDate] = useState(filters.to_date || '');
    useEffect(() => {
        setFromDate(filters.from_date || '');
        setToDate(filters.to_date || '');
    }, [filters.from_date, filters.to_date]);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showResubmitModal, setShowResubmitModal] = useState(false);
    const [selectedAdmission, setSelectedAdmission] = useState<MemberAdmission | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [revisionNote, setRevisionNote] = useState('');

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: any; label: string }> = {
            draft: { variant: 'secondary', label: 'খসড়া' },
            submitted: { variant: 'default', label: 'জমা' },
            under_review: { variant: 'default', label: 'পর্যালোচনায়' },
            ready_for_head_office: { variant: 'default', label: 'শাখা অনুমোদিত' },
            pending_head_office: { variant: 'default', label: 'হেড অফিসে' },
            approved: { variant: 'default', label: 'অনুমোদিত' },
            rejected: { variant: 'destructive', label: 'প্রত্যাখ্যাত' },
            needs_revision: { variant: 'default', label: 'সংশোধন' },
        };

        const config = variants[status] || { variant: 'secondary', label: status };
        return (
            <Badge
                variant={config.variant}
                className={`text-[10px] px-1.5 py-0 ${
                    status === 'approved'
                        ? 'bg-green-500 hover:bg-green-600'
                        : status === 'under_review'
                        ? 'bg-amber-500 hover:bg-amber-600'
                        : status === 'submitted'
                        ? 'bg-blue-500 hover:bg-blue-600'
                        : status === 'ready_for_head_office'
                        ? 'bg-emerald-500 hover:bg-emerald-600'
                        : status === 'pending_head_office'
                        ? 'bg-purple-500 hover:bg-purple-600'
                        : status === 'needs_revision'
                        ? 'bg-orange-500 hover:bg-orange-600'
                        : ''
                }`}
            >
                {config.label}
            </Badge>
        );
    };

    const buildParams = () => {
        const params: Record<string, string> = {};
        if (searchQuery) params.search = searchQuery;
        if (statusFilter) params.status = statusFilter;
        if (fromDate) params.from_date = fromDate;
        if (toDate) params.to_date = toDate;
        return params;
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/member-admissions', buildParams(), { preserveState: true });
    };

    const handleFilterChange = (status: string) => {
        setStatusFilter(status);
        router.get('/member-admissions', { ...buildParams(), status }, { preserveState: true });
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDelete = (id: number, applicationNo: string) => {
        if (confirm(`আবেদন নং ${applicationNo} মুছে ফেলতে চান?`)) {
            router.delete(`/member-admissions/${id}`);
        }
    };

    const handleSubmit = (id: number, applicationNo: string) => {
        if (confirm(`আবেদন নং ${applicationNo} জমা দিতে চান?`)) {
            router.patch(`/member-admissions/${id}/submit`);
        }
    };

    const openResubmitModal = (admission: MemberAdmission) => {
        setSelectedAdmission(admission);
        setRevisionNote('');
        setShowResubmitModal(true);
    };

    const handleResubmit = () => {
        if (!selectedAdmission || !revisionNote.trim()) {
            alert('সংশোধনের বিবরণ লিখুন');
            return;
        }
        router.patch(`/member-admissions/${selectedAdmission.id}/resubmit`, {
            revision_note: revisionNote,
        }, {
            onSuccess: () => {
                setShowResubmitModal(false);
                setSelectedAdmission(null);
                setRevisionNote('');
            },
        });
    };

    const openRejectModal = (admission: MemberAdmission) => {
        setSelectedAdmission(admission);
        setRejectionReason('');
        setShowRejectModal(true);
    };

    const handleReject = () => {
        if (!selectedAdmission || !rejectionReason.trim()) {
            alert('প্রত্যাখ্যানের কারণ লিখুন');
            return;
        }
        router.patch(`/member-admissions/${selectedAdmission.id}/reject`, {
            rejection_reason: rejectionReason,
        }, {
            onSuccess: () => {
                setShowRejectModal(false);
                setSelectedAdmission(null);
                setRejectionReason('');
            },
        });
    };

    const statCards = [
        { label: 'সর্বমোট', count: stats.total, color: 'bg-slate-600', filter: '' },
        { label: 'খসড়া', count: stats.draft, color: 'bg-gray-500', filter: 'draft' },
        { label: 'জমা', count: stats.submitted, color: 'bg-blue-500', filter: 'submitted' },
        { label: 'পর্যালোচনা', count: stats.under_review, color: 'bg-amber-500', filter: 'under_review' },
        { label: 'সংশোধন', count: stats.needs_revision || 0, color: 'bg-orange-500', filter: 'needs_revision' },
        { label: 'অনুমোদিত', count: stats.approved, color: 'bg-green-600', filter: 'approved' },
        { label: 'প্রত্যাখ্যাত', count: stats.rejected, color: 'bg-red-500', filter: 'rejected' },
    ];

    return (
        <AdminLayout>
            <Head title="সদস্য ভর্তি" />

            <div className="space-y-3 print:block">
                {/* Header + Search row - compact - hidden when printing */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                    <div className="flex items-center justify-between md:justify-start gap-3 flex-wrap">
                        <h1 className="text-lg font-semibold text-gray-800">সদস্য ভর্তি আবেদন</h1>
                        <Link
                            href="/member-admissions/create"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors shrink-0"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            নতুন আবেদন
                        </Link>
                    </div>
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-grow sm:flex-grow-0">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="আবেদন নং, নাম, মোবাইল, এনআইডি..."
                                className="w-full sm:w-64 pl-8 pr-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button type="submit" className="px-3 py-1.5 text-sm bg-slate-600 text-white rounded-md hover:bg-slate-700 flex-grow sm:flex-grow-0 text-center justify-center">
                                খুঁজুন
                            </button>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="px-2 py-1.5 text-sm border border-gray-300 rounded-md flex-grow sm:flex-grow-0"
                                title="তারিখ থেকে"
                            />
                            <span className="text-gray-500 text-sm hidden sm:inline">–</span>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="px-2 py-1.5 text-sm border border-gray-300 rounded-md flex-grow sm:flex-grow-0"
                                title="তারিখ পর্যন্ত"
                            />
                            <button
                                type="button"
                                onClick={handlePrint}
                                className="print:hidden inline-flex flex-grow sm:flex-grow-0 justify-center items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                <Printer className="w-4 h-4" />
                                প্রিন্ট
                            </button>
                            {(searchQuery || statusFilter || fromDate || toDate) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setStatusFilter('');
                                        setFromDate('');
                                        setToDate('');
                                        router.get('/member-admissions');
                                    }}
                                    className="px-2.5 py-1.5 text-sm sm:text-xs flex-grow sm:flex-grow-0 text-center text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    রিসেট
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Summary - compact inline chips - hidden when printing */}
                <div className="flex overflow-x-auto pb-1 -mb-1 hide-scrollbar items-center gap-1.5 print:hidden">
                    {statCards.map((stat) => (
                        <button
                            key={stat.label}
                            onClick={() => handleFilterChange(stat.filter)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                                statusFilter === stat.filter
                                    ? 'ring-1 ring-offset-1 ring-slate-400 bg-slate-100 text-slate-800'
                                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <span className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-white text-xs font-semibold ${stat.color}`}>
                                {stat.count}
                            </span>
                            <span className="whitespace-nowrap">{stat.label}</span>
                        </button>
                    ))}
                </div>

                {/* Table - compact - print-friendly */}
                <div className="bg-white rounded-md border border-gray-200 overflow-hidden member-admission-index-print print:overflow-visible">
                    <div className="hidden print:block text-center py-2 border-b border-gray-300">
                        <h2 className="text-lg font-semibold">সদস্য ভর্তি আবেদন তালিকা</h2>
                        {(fromDate || toDate) && (
                            <p className="text-sm text-gray-600">তারিখ: {fromDate || 'শুরু'} – {toDate || 'শেষ'}</p>
                        )}
                        <p className="text-xs text-gray-500">প্রিন্টের সময়: {formatDateTime(new Date())}</p>
                    </div>
                    {/* Mobile View (Cards) */}
                    <div className="md:hidden divide-y divide-gray-100">
                        {admissions.data.length === 0 ? (
                            <div className="px-4 py-8 text-center text-gray-500 text-sm">
                                কোনো আবেদন পাওয়া যায়নি
                            </div>
                        ) : (
                            admissions.data.map((admission) => (
                                <div key={admission.id} className="p-4 bg-white hover:bg-gray-50/50 transition-colors">
                                    <div className="flex justify-between items-start mb-2 gap-2">
                                        <div>
                                            <div className="font-semibold text-blue-600 text-sm">{admission.application_no}</div>
                                            <div className="font-medium text-gray-900">{admission.applicant_name_bn || admission.applicant_name_en}</div>
                                            {(admission.applicant_name_bn && admission.applicant_name_en) && (
                                                <div className="text-gray-500 text-xs">{admission.applicant_name_en}</div>
                                            )}
                                        </div>
                                        <div className="flex-shrink-0">{getStatusBadge(admission.status)}</div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-xs mb-3">
                                        <div><span className="text-gray-400">মোবাইল:</span> <span className="text-gray-700">{admission.mobile_number}</span></div>
                                        <div><span className="text-gray-400">শাখা:</span> <span className="text-gray-700">{admission.branch?.name || '–'}</span></div>
                                        <div><span className="text-gray-400">সামিতি:</span> <span className="text-gray-700">{admission.samity?.samity_name || '–'}</span></div>
                                        <div><span className="text-gray-400">তারিখ:</span> <span className="text-gray-600">{formatDate(admission.created_at)}</span></div>
                                        <div className="col-span-2"><span className="text-gray-400">পেন্ডিং:</span> <span className="text-gray-600">{admission.tracking_state?.label ?? '—'}</span></div>
                                    </div>
                                    
                                    <div className="flex items-center gap-1 pt-2 border-t border-gray-50">
                                        <Link href={`/member-admissions/${admission.id}`} className="flex-1 flex justify-center items-center gap-1.5 py-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded text-xs font-medium" title="দেখুন"><Eye className="w-3.5 h-3.5" /> দেখুন</Link>
                                        {(admission.status === 'draft' || admission.status === 'rejected') && (
                                            <>
                                                <Link href={`/member-admissions/${admission.id}/edit`} className="p-1.5 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded" title="সম্পাদনা"><Edit className="w-3.5 h-3.5" /></Link>
                                                {admission.status === 'draft' && (
                                                    <button onClick={() => handleSubmit(admission.id, admission.application_no)} className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded" title="জমা দিন"><Send className="w-3.5 h-3.5" /></button>
                                                )}
                                            </>
                                        )}
                                        {admission.status === 'needs_revision' && (
                                            <>
                                                {!isFieldOfficer && (
                                                    <>
                                                        <button onClick={() => openResubmitModal(admission)} className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded" title="পুনরায় জমা"><RotateCcw className="w-3.5 h-3.5" /></button>
                                                        <button onClick={() => openRejectModal(admission)} className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded" title="প্রত্যাখ্যান"><Ban className="w-3.5 h-3.5" /></button>
                                                    </>
                                                )}
                                            </>
                                        )}
                                        {admission.status === 'ready_for_head_office' && !isFieldOfficer && (
                                            <button
                                                onClick={() => {
                                                    if (confirm(`এই আবেদনটি Head Office এ পাঠাতে চান? (${admission.application_no})`)) {
                                                        router.patch(`/member-admissions/${admission.id}/send-to-head-office`);
                                                    }
                                                }}
                                                className="p-1.5 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded"
                                                title="Head Office এ পাঠান"
                                            >
                                                <Send className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        {admission.status === 'draft' && (
                                            <button onClick={() => handleDelete(admission.id, admission.application_no)} className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded" title="মুছুন"><Trash2 className="w-3.5 h-3.5" /></button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Desktop View (Table) */}
                    <div className="hidden md:block member-admission-index-table-wrap overflow-x-auto print:overflow-visible print:block">
                        <table className="w-full text-sm member-admission-index-table">
                            <thead className="bg-gray-50/80 border-b border-gray-200">
                                <tr>
                                    <th className="px-2.5 py-2 text-left text-xs font-medium text-gray-600">আবেদন নং</th>
                                    <th className="px-2.5 py-2 text-left text-xs font-medium text-gray-600">আবেদনকারী</th>
                                    <th className="px-2.5 py-2 text-left text-xs font-medium text-gray-600">মোবাইল</th>
                                    <th className="px-2.5 py-2 text-left text-xs font-medium text-gray-600">শাখা</th>
                                    <th className="px-2.5 py-2 text-left text-xs font-medium text-gray-600">সামিতি</th>
                                    <th className="px-2.5 py-2 text-left text-xs font-medium text-gray-600">ক্যাটাগরি</th>
                                    <th className="px-2.5 py-2 text-left text-xs font-medium text-gray-600">জরিপকারী</th>
                                    <th className="px-2.5 py-2 text-left text-xs font-medium text-gray-600">স্ট্যাটাস</th>
                                    <th className="px-2.5 py-2 text-left text-xs font-medium text-gray-600">কার কাছে পেন্ডিং</th>
                                    <th className="px-2.5 py-2 text-left text-xs font-medium text-gray-600">তারিখ</th>
                                    <th className="px-2.5 py-2 text-left text-xs font-medium text-gray-600 w-24 print:hidden">কর্ম</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {admissions.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="px-2.5 py-6 text-center text-gray-500 text-sm">
                                            কোনো আবেদন পাওয়া যায়নি
                                        </td>
                                    </tr>
                                ) : (
                                    admissions.data.map((admission) => (
                                        <tr key={admission.id} className="hover:bg-gray-50/50">
                                            <td className="px-2.5 py-2 text-gray-900 font-medium whitespace-nowrap">{admission.application_no}</td>
                                            <td className="px-2.5 py-2">
                                                <div className="font-medium text-gray-900">{admission.applicant_name_bn || admission.applicant_name_en}</div>
                                                {(admission.applicant_name_bn && admission.applicant_name_en) && (
                                                    <div className="text-gray-500 text-xs">{admission.applicant_name_en}</div>
                                                )}
                                            </td>
                                            <td className="px-2.5 py-2 text-gray-700 whitespace-nowrap">{admission.mobile_number}</td>
                                            <td className="px-2.5 py-2 text-gray-700">{admission.branch?.name || '–'}</td>
                                            <td className="px-2.5 py-2 text-gray-700">{admission.samity?.samity_name || '–'}</td>
                                            <td className="px-2.5 py-2 text-gray-700">{admission.member_category?.category_name || '–'}</td>
                                            <td className="px-2.5 py-2 text-gray-600 text-xs">{admission.createdBy?.name ?? admission.interviewer_name ?? admission.employee_name ?? '–'}</td>
                                            <td className="px-2.5 py-2">{getStatusBadge(admission.status)}</td>
                                            <td className="px-2.5 py-2 text-gray-700 text-xs">
                                                {admission.tracking_state?.label ?? '—'}
                                            </td>
                                            <td className="px-2.5 py-2 text-gray-600 whitespace-nowrap">{formatDate(admission.created_at)}</td>
                                            <td className="px-2.5 py-2 print:hidden">
                                                <div className="flex items-center gap-0.5">
                                                    <Link href={`/member-admissions/${admission.id}`} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="দেখুন"><Eye className="w-3.5 h-3.5" /></Link>
                                                    {(admission.status === 'draft' || admission.status === 'rejected') && (
                                                        <>
                                                            <Link href={`/member-admissions/${admission.id}/edit`} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded" title="সম্পাদনা"><Edit className="w-3.5 h-3.5" /></Link>
                                                            {admission.status === 'draft' && (
                                                                <button onClick={() => handleSubmit(admission.id, admission.application_no)} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="জমা দিন"><Send className="w-3.5 h-3.5" /></button>
                                                            )}
                                                        </>
                                                    )}
                                                    {admission.status === 'needs_revision' && (
                                                        <>
                                                            {!isFieldOfficer && (
                                                                <>
                                                                    <button onClick={() => openResubmitModal(admission)} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="পুনরায় জমা"><RotateCcw className="w-3.5 h-3.5" /></button>
                                                                    <button onClick={() => openRejectModal(admission)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="প্রত্যাখ্যান"><Ban className="w-3.5 h-3.5" /></button>
                                                                </>
                                                            )}
                                                        </>
                                                    )}
                                                    {admission.status === 'ready_for_head_office' && !isFieldOfficer && (
                                                        <button
                                                            onClick={() => {
                                                                if (confirm(`এই আবেদনটি Head Office এ পাঠাতে চান? (${admission.application_no})`)) {
                                                                    router.patch(`/member-admissions/${admission.id}/send-to-head-office`);
                                                                }
                                                            }}
                                                            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded"
                                                            title="Head Office এ পাঠান"
                                                        >
                                                            <Send className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {admission.status === 'draft' && (
                                                        <button onClick={() => handleDelete(admission.id, admission.application_no)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="মুছুন"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination - compact - hidden when printing */}
                    {admissions.last_page > 1 && (
                        <div className="px-2.5 py-3 md:py-2 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600 print:hidden">
                            <span>{admissions.from}–{admissions.to} / {admissions.total}</span>
                            <div className="flex items-center gap-1">
                                <Link
                                    href={`/member-admissions?page=${admissions.current_page - 1}${searchQuery ? `&search=${searchQuery}` : ''}${statusFilter ? `&status=${statusFilter}` : ''}${fromDate ? `&from_date=${fromDate}` : ''}${toDate ? `&to_date=${toDate}` : ''}`}
                                    className={`p-1.5 rounded border ${admissions.current_page === 1 ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 hover:bg-gray-100'}`}
                                    preserveState
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Link>
                                <span className="px-2">পৃ. {admissions.current_page} / {admissions.last_page}</span>
                                <Link
                                    href={`/member-admissions?page=${admissions.current_page + 1}${searchQuery ? `&search=${searchQuery}` : ''}${statusFilter ? `&status=${statusFilter}` : ''}${fromDate ? `&from_date=${fromDate}` : ''}${toDate ? `&to_date=${toDate}` : ''}`}
                                    className={`p-1.5 rounded border ${admissions.current_page === admissions.last_page ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 hover:bg-gray-100'}`}
                                    preserveState
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                <style>{`
                    @media print {
                        html, body { overflow: hidden !important; height: auto !important; }
                        body * { visibility: hidden; }
                        .member-admission-index-print,
                        .member-admission-index-print * { visibility: visible; }
                        .member-admission-index-print {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            overflow: visible !important;
                            max-height: none !important;
                        }
                        .member-admission-index-table-wrap { overflow: visible !important; }
                        .member-admission-index-table { font-size: 10pt; }
                        .member-admission-index-table th,
                        .member-admission-index-table td { padding: 4px 6px; border: 1px solid #ddd; }
                    }
                `}</style>

                {/* Resubmit Modal */}
                {showResubmitModal && selectedAdmission && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                            <div className="p-4">
                                <h3 className="text-base font-semibold text-gray-900 mb-1">পুনরায় জমা: {selectedAdmission.application_no}</h3>
                                <p className="text-xs text-gray-600 mb-3">কি পরিবর্তন করেছেন তা লিখুন</p>
                                <div className="mb-3">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">সংশোধনের বিবরণ *</label>
                                    <textarea
                                        value={revisionNote}
                                        onChange={(e) => setRevisionNote(e.target.value)}
                                        rows={3}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
                                        placeholder="সংশোধন বিবরণ লিখুন..."
                                    />
                                </div>
                                {selectedAdmission.revision_comments && (
                                    <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-800">
                                        {selectedAdmission.revision_comments}
                                    </div>
                                )}
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => { setShowResubmitModal(false); setSelectedAdmission(null); setRevisionNote(''); }} className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">বাতিল</button>
                                    <button onClick={handleResubmit} className="px-3 py-1.5 text-sm text-white bg-green-600 rounded-md hover:bg-green-700">জমা দিন</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Reject Modal */}
                {showRejectModal && selectedAdmission && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                            <div className="p-4">
                                <h3 className="text-base font-semibold text-gray-900 mb-3">প্রত্যাখ্যান: {selectedAdmission.application_no}</h3>
                                <div className="mb-3">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">প্রত্যাখ্যানের কারণ *</label>
                                    <textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        rows={3}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
                                        placeholder="কারণ লিখুন..."
                                    />
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => { setShowRejectModal(false); setSelectedAdmission(null); setRejectionReason(''); }} className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">বাতিল</button>
                                    <button onClick={handleReject} className="px-3 py-1.5 text-sm text-white bg-red-600 rounded-md hover:bg-red-700">প্রত্যাখ্যান</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
