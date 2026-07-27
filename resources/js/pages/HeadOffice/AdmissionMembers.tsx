import React, { useState, useEffect } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate } from '@/utils/dateUtils';
import {
    Search,
    Eye,
    Pencil,
    CalendarDays,
    Filter,
    ChevronLeft,
    ChevronRight,
    PlayCircle,
    Trash2,
    FileText,
    X,
    Printer,
    CheckCircle,
    Circle,
    Users,
    Building2,
    Phone,
    MapPin,
    Download,
} from 'lucide-react';
import { MemberAdmission } from '@/types/memberAdmission';

interface Zone {
    id: number;
    name: string;
    code: string;
}

interface Area {
    id: number;
    name: string;
    code: string;
    zone_id: number;
    zone?: Zone;
}

interface Branch {
    id: number;
    name: string;
    code: string;
    area_id: number;
    area?: {
        id: number;
        name: string;
        zone: Zone;
    };
}

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
        zone_id?: number;
        area_id?: number;
        branch_id?: number;
        date_from?: string;
        date_to?: string;
        had_issues?: string;
        printed?: string;
    };
    stats: {
        total: number;
        draft: number;
        submitted: number;
        under_review: number;
        pending_head_office: number;
        approved: number;
        rejected: number;
        needs_revision: number;
    };
    zones: Zone[];
    areas: Area[];
    branches: Branch[];
}

function creatorName(admission: MemberAdmission): string {
    if (admission.createdBy?.name) return admission.createdBy.name;
    if (typeof admission.created_by === 'object' && admission.created_by?.name) {
        return admission.created_by.name;
    }
    return '—';
}

function branchLabel(admission: MemberAdmission): { name: string; meta?: string } {
    const branch = admission.branch as
        | { name?: string; code?: string; area?: { name?: string; zone?: { name?: string } } }
        | undefined;
    if (!branch?.name) return { name: '—' };
    const area = branch.area?.name;
    const zone = branch.area?.zone?.name;
    const meta = [area, zone].filter(Boolean).join(' · ') || undefined;
    return { name: branch.name, meta };
}

export default function AdmissionMembers({ admissions, filters, stats, zones, areas, branches }: Props) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedAdmission, setSelectedAdmission] = useState<MemberAdmission | null>(null);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [markAsPrintedCheckbox, setMarkAsPrintedCheckbox] = useState(false);

    const today = new Date().toISOString().split('T')[0];
    const monthStart = `${today.slice(0, 7)}-01`;
    const [dateFrom, setDateFrom] = useState(filters.date_from || monthStart);
    const [dateTo, setDateTo] = useState(filters.date_to || today);
    const isTodayFilter = dateFrom === today && dateTo === today;

    const [selectedZone, setSelectedZone] = useState(filters.zone_id?.toString() || '');
    const [selectedArea, setSelectedArea] = useState(filters.area_id?.toString() || '');
    const [selectedBranch, setSelectedBranch] = useState(filters.branch_id?.toString() || '');
    const [hadIssues, setHadIssues] = useState(filters.had_issues || '');
    const [printedFilter, setPrintedFilter] = useState(filters.printed || '');

    const [filteredAreas, setFilteredAreas] = useState<Area[]>(areas);
    const [filteredBranches, setFilteredBranches] = useState<Branch[]>(branches);

    useEffect(() => {
        if (selectedZone) {
            const filtered = areas.filter((area) => area.zone_id.toString() === selectedZone);
            setFilteredAreas(filtered);
            if (selectedArea && !filtered.find((a) => a.id.toString() === selectedArea)) {
                setSelectedArea('');
            }
        } else {
            setFilteredAreas(areas);
        }
    }, [selectedZone, areas]);

    useEffect(() => {
        if (selectedArea) {
            const filtered = branches.filter((branch) => branch.area_id.toString() === selectedArea);
            setFilteredBranches(filtered);
            if (selectedBranch && !filtered.find((b) => b.id.toString() === selectedBranch)) {
                setSelectedBranch('');
            }
        } else if (selectedZone) {
            const zoneAreaIds = filteredAreas.map((a) => a.id);
            setFilteredBranches(branches.filter((branch) => zoneAreaIds.includes(branch.area_id)));
        } else {
            setFilteredBranches(branches);
        }
    }, [selectedArea, selectedZone, filteredAreas, branches]);

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { bg: string; text: string; label: string }> = {
            draft: { bg: 'bg-slate-100 border-slate-300', text: 'text-slate-700', label: 'খসড়া' },
            submitted: { bg: 'bg-sky-50 border-sky-300', text: 'text-sky-800', label: 'জমা' },
            under_review: { bg: 'bg-amber-50 border-amber-300', text: 'text-amber-800', label: 'পর্যালোচনায়' },
            ready_for_head_office: { bg: 'bg-cyan-50 border-cyan-300', text: 'text-cyan-800', label: 'শাখা অনুমোদিত' },
            pending_head_office: { bg: 'bg-blue-50 border-blue-400', text: 'text-blue-800', label: 'হেড অফিসে' },
            approved: { bg: 'bg-emerald-50 border-emerald-300', text: 'text-emerald-800', label: 'অনুমোদিত' },
            rejected: { bg: 'bg-rose-50 border-rose-300', text: 'text-rose-800', label: 'প্রত্যাখ্যাত' },
            needs_revision: { bg: 'bg-orange-50 border-orange-300', text: 'text-orange-800', label: 'সংশোধন' },
        };
        const config = variants[status] || {
            bg: 'bg-slate-100 border-slate-300',
            text: 'text-slate-700',
            label: status,
        };
        return (
            <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap ${config.bg} ${config.text}`}
            >
                {config.label}
            </span>
        );
    };

    const filterPayload = (overrides: Record<string, string> = {}) => ({
        search: searchQuery,
        status: statusFilter,
        zone_id: selectedZone,
        area_id: selectedArea,
        branch_id: selectedBranch,
        date_from: dateFrom,
        date_to: dateTo,
        had_issues: hadIssues,
        printed: printedFilter,
        ...overrides,
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/head-office/admission-members', filterPayload(), { preserveState: true });
    };

    const handleFilterChange = (status: string) => {
        setStatusFilter(status);
        router.get('/head-office/admission-members', filterPayload({ status }), { preserveState: true });
    };

    const handleTodayFilter = () => {
        setDateFrom(today);
        setDateTo(today);
        router.get(
            '/head-office/admission-members',
            filterPayload({ date_from: today, date_to: today }),
            { preserveState: true }
        );
    };

    const clearFilters = () => {
        setSearchQuery('');
        setStatusFilter('');
        setSelectedZone('');
        setSelectedArea('');
        setSelectedBranch('');
        setDateFrom(monthStart);
        setDateTo(today);
        setHadIssues('');
        setPrintedFilter('');
        router.get(
            '/head-office/admission-members',
            { date_from: monthStart, date_to: today },
            { preserveState: true }
        );
    };

    const getPrintParams = () => {
        const params: Record<string, string> = {};
        if (searchQuery) params.search = searchQuery;
        if (statusFilter) params.status = statusFilter;
        if (selectedZone) params.zone_id = selectedZone;
        if (selectedArea) params.area_id = selectedArea;
        if (selectedBranch) params.branch_id = selectedBranch;
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
        if (hadIssues) params.had_issues = hadIssues;
        if (printedFilter) params.printed = printedFilter;
        return params;
    };

    const buildPageUrl = (page: number) => {
        const params = new URLSearchParams(getPrintParams());
        params.set('page', String(page));
        return `/head-office/admission-members?${params.toString()}`;
    };

    const handlePrintConfirm = () => {
        const params = getPrintParams();
        window.open(`/head-office/admission-members/print?${new URLSearchParams(params).toString()}`, '_blank');
        if (markAsPrintedCheckbox) {
            router.post('/head-office/admission-members/mark-printed', params, { preserveScroll: true });
        }
        setShowPrintModal(false);
        setMarkAsPrintedCheckbox(false);
    };

    const handleExportExcel = () => {
        const params = new URLSearchParams(getPrintParams());
        window.location.href = `/head-office/admission-members/export?${params.toString()}`;
    };

    const handleDelete = (id: number, applicationNo: string) => {
        if (confirm(`Are you sure you want to delete application ${applicationNo}?`)) {
            router.delete(`/head-office/admissions/${id}`, { preserveScroll: true });
        }
    };

    const openHistoryModal = (admission: MemberAdmission) => {
        setSelectedAdmission(admission);
        setShowHistoryModal(true);
    };

    const hasActiveFilters =
        searchQuery ||
        statusFilter ||
        selectedZone ||
        selectedArea ||
        selectedBranch ||
        hadIssues ||
        printedFilter ||
        dateFrom !== monthStart ||
        dateTo !== today;

    const statCards = [
        { label: 'সর্বমোট', count: stats.total, filter: '' },
        { label: 'খসড়া', count: stats.draft, filter: 'draft' },
        { label: 'জমা', count: stats.submitted, filter: 'submitted' },
        { label: 'পর্যালোচনা', count: stats.under_review, filter: 'under_review' },
        { label: 'হেড অফিস', count: stats.pending_head_office, filter: 'pending_head_office' },
        { label: 'সংশোধন', count: stats.needs_revision || 0, filter: 'needs_revision' },
        { label: 'অনুমোদিত', count: stats.approved, filter: 'approved' },
        { label: 'প্রত্যাখ্যাত', count: stats.rejected, filter: 'rejected' },
    ];

    const ActionButtons = ({ admission }: { admission: MemberAdmission }) => (
        <div className="flex items-center justify-end gap-1">
            <a
                href={`/head-office/admissions/${admission.id}`}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 hover:border-blue-600 rounded-md transition"
                title="দেখুন"
            >
                <Eye className="w-4 h-4" />
            </a>
            <Link
                href={`/member-admissions/${admission.id}/edit`}
                className="p-1.5 text-sky-700 hover:text-white hover:bg-sky-600 border border-sky-200 hover:border-sky-600 rounded-md transition"
                title="সম্পাদনা"
            >
                <Pencil className="w-4 h-4" />
            </Link>
            {admission.status === 'approved' && (admission.revision_count ?? 0) > 0 && (
                <button
                    onClick={() => openHistoryModal(admission)}
                    className="p-1.5 text-blue-700 hover:text-white hover:bg-blue-700 border border-blue-200 hover:border-blue-700 rounded-md transition"
                    title="ইতিহাস"
                >
                    <FileText className="w-4 h-4" />
                </button>
            )}
            {(admission.loan_applications_count ?? 0) > 0 ? (
                <span className="p-1.5 text-slate-300 cursor-not-allowed" title="ঋণ আবেদন থাকায় মুছে ফেলা যাবে না">
                    <Trash2 className="w-4 h-4" />
                </span>
            ) : (
                <button
                    onClick={() => handleDelete(admission.id, admission.application_no)}
                    className="p-1.5 text-rose-500 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-md transition"
                    title="মুছুন"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            )}
        </div>
    );

    return (
        <AdminLayout>
            <Head title="Admission Members" />

            <div className="max-w-[1400px] mx-auto space-y-5 py-4 px-3 sm:px-6 pb-16">
                {/* Header */}
                <div className="relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 px-5 py-5 shadow-md shadow-blue-900/10">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15),_transparent_50%)] pointer-events-none" />
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-blue-100 mb-1">
                            <Users className="w-3.5 h-3.5" />
                            Head Office
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                            সদস্য ভর্তি তালিকা
                        </h1>
                        <p className="text-sm text-blue-100 mt-0.5">
                            সব শাখার ভর্তি আবেদন · পেন্ডিং অবস্থান ট্র্যাকিং
                        </p>
                    </div>
                    <div className="relative z-10 flex flex-wrap items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={handleExportExcel}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white text-emerald-700 hover:bg-emerald-50 text-sm font-semibold shadow-sm transition"
                            title="Excel ডাউনলোড"
                        >
                            <Download className="w-4 h-4" />
                            XLSX Download
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowPrintModal(true)}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-500/40 hover:bg-blue-500/60 text-white border border-white/30 text-sm font-semibold transition"
                        >
                            <Printer className="w-4 h-4" />
                            প্রিন্ট
                        </button>
                        <Link
                            href="/head-office/process-admissions"
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white text-blue-700 hover:bg-blue-50 text-sm font-semibold shadow-sm transition"
                        >
                            <PlayCircle className="w-4 h-4" />
                            Process
                        </Link>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                    {statCards.map((stat) => (
                        <button
                            key={stat.label}
                            type="button"
                            onClick={() => handleFilterChange(stat.filter)}
                            className={`rounded-xl px-3 py-2.5 text-left border transition shadow-sm ${
                                statusFilter === stat.filter
                                    ? 'border-blue-600 bg-blue-600 text-white shadow-blue-200'
                                    : 'border-blue-100 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50/60'
                            }`}
                        >
                            <div className="text-xl font-bold tabular-nums leading-none">{stat.count}</div>
                            <div className={`text-[11px] font-medium mt-1 ${statusFilter === stat.filter ? 'text-blue-100' : 'text-slate-500'}`}>
                                {stat.label}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl border border-blue-100 p-3.5 shadow-sm">
                    <form onSubmit={handleSearch} className="space-y-3">
                        <div className="flex flex-wrap gap-2 items-end">
                            <div className="flex-1 min-w-[200px]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="আবেদন নং, নাম, মোবাইল, এনআইডি..."
                                        className="w-full pl-9 pr-3 py-2 text-sm border border-blue-200 rounded-lg bg-blue-50/30 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                                    />
                                </div>
                            </div>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="px-2.5 py-2 text-sm border border-blue-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                            />
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="px-2.5 py-2 text-sm border border-blue-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                            />
                            <button
                                type="button"
                                onClick={handleTodayFilter}
                                title="শুধু আজকের ডেটা"
                                className={`px-3 py-2 text-sm rounded-lg border font-medium transition flex items-center gap-1.5 ${
                                    isTodayFilter
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
                                }`}
                            >
                                <CalendarDays className="w-3.5 h-3.5" />
                                Today
                            </button>
                            <select
                                value={selectedZone}
                                onChange={(e) => setSelectedZone(e.target.value)}
                                className="px-2.5 py-2 text-sm border border-blue-200 rounded-lg bg-white"
                            >
                                <option value="">সব জোন</option>
                                {zones.map((zone) => (
                                    <option key={zone.id} value={zone.id.toString()}>
                                        {zone.name}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={selectedArea}
                                onChange={(e) => setSelectedArea(e.target.value)}
                                disabled={!selectedZone && filteredAreas.length === 0}
                                className="px-2.5 py-2 text-sm border border-blue-200 rounded-lg bg-white disabled:bg-slate-100"
                            >
                                <option value="">সব এলাকা</option>
                                {filteredAreas.map((area) => (
                                    <option key={area.id} value={area.id.toString()}>
                                        {area.name}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={selectedBranch}
                                onChange={(e) => setSelectedBranch(e.target.value)}
                                disabled={!selectedZone && !selectedArea && filteredBranches.length === 0}
                                className="px-2.5 py-2 text-sm border border-blue-200 rounded-lg bg-white disabled:bg-slate-100"
                            >
                                <option value="">সব শাখা</option>
                                {filteredBranches.map((branch) => (
                                    <option key={branch.id} value={branch.id.toString()}>
                                        {branch.name}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-2.5 py-2 text-sm border border-blue-200 rounded-lg bg-white"
                            >
                                <option value="">সব স্ট্যাটাস</option>
                                <option value="draft">খসড়া</option>
                                <option value="submitted">জমা</option>
                                <option value="under_review">পর্যালোচনায়</option>
                                <option value="pending_head_office">হেড অফিসে</option>
                                <option value="approved">অনুমোদিত</option>
                                <option value="rejected">প্রত্যাখ্যাত</option>
                                <option value="needs_revision">সংশোধন</option>
                            </select>
                            <select
                                value={hadIssues}
                                onChange={(e) => setHadIssues(e.target.value)}
                                className="px-2.5 py-2 text-sm border border-blue-200 rounded-lg bg-white"
                            >
                                <option value="">ইস্যু: সব</option>
                                <option value="yes">ইস্যু ছিল</option>
                                <option value="no">সরাসরি অনুমোদিত</option>
                            </select>
                            <select
                                value={printedFilter}
                                onChange={(e) => setPrintedFilter(e.target.value)}
                                className="px-2.5 py-2 text-sm border border-blue-200 rounded-lg bg-white"
                            >
                                <option value="">প্রিন্ট: সব</option>
                                <option value="yes">প্রিন্ট সম্পন্ন</option>
                                <option value="no">অপ্রিন্টেড</option>
                            </select>
                            <button
                                type="submit"
                                className="px-3.5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-1.5 shadow-sm shadow-blue-200"
                            >
                                <Filter className="w-3.5 h-3.5" />
                                Apply
                            </button>
                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="px-3 py-2 text-sm bg-white text-slate-600 border border-blue-200 rounded-lg hover:bg-blue-50 font-medium flex items-center gap-1.5"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    Clear
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* List */}
                <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
                    {/* Mobile cards */}
                    <div className="md:hidden divide-y divide-blue-100">
                        {admissions.data.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 text-sm">কোনো ভর্তি আবেদন পাওয়া যায়নি</div>
                        ) : (
                            admissions.data.map((admission) => {
                                const branch = branchLabel(admission);
                                return (
                                    <div key={admission.id} className="p-4 space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                                                    {admission.application_no}
                                                </span>
                                                <h3 className="font-semibold text-slate-900 text-sm mt-1.5">
                                                    {admission.applicant_name_bn || admission.applicant_name_en}
                                                </h3>
                                                {admission.applicant_name_bn && admission.applicant_name_en && (
                                                    <p className="text-xs text-slate-500">{admission.applicant_name_en}</p>
                                                )}
                                            </div>
                                            {getStatusBadge(admission.status)}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2.5 bg-blue-50/50 p-3 rounded-lg border border-blue-100 text-xs">
                                            <div>
                                                <span className="text-[10px] font-semibold uppercase text-blue-400 block">মোবাইল</span>
                                                <p className="font-medium text-slate-800 flex items-center gap-1 mt-0.5">
                                                    <Phone className="w-3 h-3 text-blue-400" /> {admission.mobile_number || '—'}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-semibold uppercase text-blue-400 block">শাখা</span>
                                                <p className="font-medium text-slate-800 truncate mt-0.5 flex items-center gap-1">
                                                    <Building2 className="w-3 h-3 text-blue-400 shrink-0" />
                                                    {branch.name}
                                                </p>
                                                {branch.meta && (
                                                    <p className="text-[10px] text-slate-400 truncate">{branch.meta}</p>
                                                )}
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-semibold uppercase text-blue-400 block">সমিতি</span>
                                                <p className="font-medium text-slate-800 truncate mt-0.5">
                                                    {admission.samity?.samity_name || '—'}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-semibold uppercase text-blue-400 block">তৈরি করেছেন</span>
                                                <p className="font-medium text-slate-800 truncate mt-0.5">{creatorName(admission)}</p>
                                            </div>
                                            <div className="col-span-2 border-t border-blue-100 pt-1.5 mt-0.5 flex items-center justify-between gap-2">
                                                <span className="text-[10px] font-semibold uppercase text-blue-400 flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" /> কার কাছে পেন্ডিং
                                                </span>
                                                <span className="font-semibold text-blue-800 bg-white border border-blue-200 px-2 py-0.5 rounded-md text-[11px]">
                                                    {admission.tracking_state?.label ?? '—'}
                                                </span>
                                            </div>
                                        </div>
                                        <ActionButtons admission={admission} />
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gradient-to-r from-blue-700 to-blue-600 text-[11px] font-semibold text-white uppercase tracking-wide">
                                    <th className="py-3.5 px-3 border-b border-blue-500">আবেদন নং</th>
                                    <th className="py-3.5 px-3 border-b border-blue-500">আবেদনকারী</th>
                                    <th className="py-3.5 px-3 border-b border-blue-500">মোবাইল</th>
                                    <th className="py-3.5 px-3 border-b border-blue-500">শাখা</th>
                                    <th className="py-3.5 px-3 border-b border-blue-500">সমিতি</th>
                                    <th className="py-3.5 px-3 border-b border-blue-500">তৈরি করেছেন</th>
                                    <th className="py-3.5 px-3 border-b border-blue-500">স্ট্যাটাস</th>
                                    <th className="py-3.5 px-3 border-b border-blue-500">পেন্ডিং অবস্থান</th>
                                    <th className="py-3.5 px-3 border-b border-blue-500">প্রিন্ট</th>
                                    <th className="py-3.5 px-3 border-b border-blue-500">তারিখ</th>
                                    <th className="py-3.5 px-3 border-b border-blue-500 text-right">অ্যাকশন</th>
                                </tr>
                            </thead>
                            <tbody>
                                {admissions.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="py-12 text-center text-slate-400 border-b border-blue-100">
                                            কোনো ভর্তি আবেদন পাওয়া যায়নি
                                        </td>
                                    </tr>
                                ) : (
                                    admissions.data.map((admission, index) => {
                                        const branch = branchLabel(admission);
                                        return (
                                            <tr
                                                key={admission.id}
                                                className={`text-sm border-b border-blue-100 hover:bg-blue-50/70 transition-colors ${
                                                    index % 2 === 1 ? 'bg-sky-50/40' : 'bg-white'
                                                }`}
                                            >
                                                <td className="py-3 px-3 font-mono font-semibold text-blue-700 text-xs whitespace-nowrap">
                                                    {admission.application_no}
                                                </td>
                                                <td className="py-3 px-3">
                                                    <div className="font-semibold text-slate-900">
                                                        {admission.applicant_name_bn || admission.applicant_name_en}
                                                    </div>
                                                    {admission.applicant_name_bn && admission.applicant_name_en && (
                                                        <div className="text-xs text-slate-500">{admission.applicant_name_en}</div>
                                                    )}
                                                    {admission.member_category?.category_name && (
                                                        <div className="text-[10px] text-blue-400 mt-0.5">
                                                            {admission.member_category.category_name}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 text-slate-700 whitespace-nowrap">{admission.mobile_number || '—'}</td>
                                                <td className="py-3 px-3">
                                                    <div className="font-medium text-slate-800 flex items-center gap-1.5">
                                                        <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                                        {branch.name}
                                                    </div>
                                                    {branch.meta && (
                                                        <div className="text-[11px] text-slate-400 mt-0.5 pl-5">{branch.meta}</div>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 text-slate-700">
                                                    {admission.samity?.samity_name || '—'}
                                                </td>
                                                <td className="py-3 px-3 text-slate-700">{creatorName(admission)}</td>
                                                <td className="py-3 px-3">{getStatusBadge(admission.status)}</td>
                                                <td className="py-3 px-3">
                                                    <span className="inline-flex items-center gap-1 font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-1 rounded-md text-[11px]">
                                                        <MapPin className="w-3 h-3 shrink-0 text-blue-500" />
                                                        {admission.tracking_state?.label ?? '—'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-sm">
                                                    {admission.printed_at ? (
                                                        <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-medium">
                                                            <CheckCircle className="w-3.5 h-3.5" />
                                                            সম্পন্ন
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
                                                            <Circle className="w-3.5 h-3.5" />
                                                            অপ্রিন্টেড
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 text-slate-600 text-xs whitespace-nowrap">
                                                    {admission.submitted_at
                                                        ? formatDate(admission.submitted_at)
                                                        : formatDate(admission.created_at)}
                                                </td>
                                                <td className="py-3 px-3">
                                                    <ActionButtons admission={admission} />
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {admissions.last_page > 1 && (
                        <div className="px-4 py-3 border-t border-blue-100 bg-blue-50/50 flex items-center justify-between">
                            <div className="text-sm text-slate-600">
                                <span className="font-medium">{admissions.from}</span>–
                                <span className="font-medium">{admissions.to}</span> /{' '}
                                <span className="font-medium">{admissions.total}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link
                                    href={buildPageUrl(admissions.current_page - 1)}
                                    className={`p-2 rounded-lg border ${
                                        admissions.current_page === 1
                                            ? 'border-blue-100 text-slate-300 pointer-events-none'
                                            : 'border-blue-200 text-blue-700 hover:bg-white bg-white'
                                    }`}
                                    preserveState
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Link>
                                <span className="text-sm text-slate-600 px-2">
                                    {admissions.current_page} / {admissions.last_page}
                                </span>
                                <Link
                                    href={buildPageUrl(admissions.current_page + 1)}
                                    className={`p-2 rounded-lg border ${
                                        admissions.current_page === admissions.last_page
                                            ? 'border-blue-100 text-slate-300 pointer-events-none'
                                            : 'border-blue-200 text-blue-700 hover:bg-white bg-white'
                                    }`}
                                    preserveState
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* Print Modal */}
                {showPrintModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                            <h3 className="text-lg font-semibold text-slate-900 mb-3">প্রিন্ট</h3>
                            <p className="text-sm text-slate-600 mb-4">
                                বর্তমান ফিল্টার অনুযায়ী তালিকা প্রিন্ট করা হবে। প্রিন্টের পর নিচের চেকবক্স চিহ্নিত করলে এই
                                তালিকার সব রেকর্ড <strong>প্রিন্ট সম্পন্ন</strong> হিসেবে নোট থাকবে।
                            </p>
                            <label className="flex items-center gap-2 cursor-pointer mb-6">
                                <input
                                    type="checkbox"
                                    checked={markAsPrintedCheckbox}
                                    onChange={(e) => setMarkAsPrintedCheckbox(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-sm font-medium text-slate-700">প্রিন্ট সম্পন্ন চিহ্নিত করুন</span>
                            </label>
                            <div className="flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPrintModal(false);
                                        setMarkAsPrintedCheckbox(false);
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200"
                                >
                                    বাতিল
                                </button>
                                <button
                                    type="button"
                                    onClick={handlePrintConfirm}
                                    className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 flex items-center gap-1"
                                >
                                    <Printer className="w-4 h-4" />
                                    প্রিন্ট
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* History Modal */}
                {showHistoryModal && selectedAdmission && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Revision History</h3>
                                    <p className="text-sm text-slate-600">
                                        {selectedAdmission.application_no} — {selectedAdmission.applicant_name_en}
                                    </p>
                                </div>
                                <button onClick={() => { setShowHistoryModal(false); setSelectedAdmission(null); }} className="p-2 hover:bg-slate-100 rounded-full">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-blue-600" />
                                        <span className="text-sm font-medium text-slate-700">Total Revisions:</span>
                                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                                            {selectedAdmission.revision_count}
                                        </span>
                                    </div>
                                </div>
                                {selectedAdmission.revision_comments ? (
                                    <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
                                        {selectedAdmission.revision_comments.split('\n\n').map((comment, index) => {
                                            const isHeadOffice = comment.includes('Head Office') || comment.includes('Issue');
                                            const isBranch = comment.includes('Branch Revision Note');
                                            return (
                                                <div
                                                    key={index}
                                                    className={`p-3 rounded-lg border ${
                                                        isHeadOffice
                                                            ? 'bg-orange-50 border-orange-200'
                                                            : isBranch
                                                              ? 'bg-emerald-50 border-emerald-200'
                                                              : 'bg-white border-slate-200'
                                                    }`}
                                                >
                                                    <p className="text-sm whitespace-pre-wrap text-slate-800">{comment.trim()}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-slate-500">
                                        <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                        <p>No revision history available</p>
                                    </div>
                                )}
                            </div>
                            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end rounded-b-2xl">
                                <button
                                    onClick={() => { setShowHistoryModal(false); setSelectedAdmission(null); }}
                                    className="px-6 py-2 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
