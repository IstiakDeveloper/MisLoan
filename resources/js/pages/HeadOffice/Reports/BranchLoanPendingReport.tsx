import { Head, router } from '@inertiajs/react';
import { Clock, Filter, Printer, RotateCcw } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate } from '@/utils/dateUtils';

interface Column {
    key: string;
    code: string;
    label: string;
}

interface Counts {
    total: number;
    [key: string]: number;
}

interface ReportRow extends Counts {
    serial: number;
    branch_id: number;
    branch_name: string;
    branch_code?: string | null;
    area_name: string;
    zone_name: string;
}

interface OrgOption {
    id: number | string;
    name: string;
    code?: string | null;
    zone_id?: number | string | null;
    area_id?: number | string | null;
}

interface Filters {
    date_from: string;
    date_to: string;
    zone_id: string;
    area_id: string;
    branch_id: string;
}

interface Props {
    rows: ReportRow[];
    totals: Counts;
    columns: Column[];
    filters: Filters;
    zones: OrgOption[];
    areas: OrgOption[];
    branches: OrgOption[];
}

export default function BranchLoanPendingReport({
    rows,
    totals,
    columns,
    filters,
    zones,
    areas,
    branches,
}: Props) {
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [zoneId, setZoneId] = useState(filters.zone_id || '');
    const [areaId, setAreaId] = useState(filters.area_id || '');
    const [branchId, setBranchId] = useState(filters.branch_id || '');

    const filteredAreas = useMemo(() => {
        if (!zoneId) {
            return areas;
        }

        return areas.filter((area) => String(area.zone_id) === zoneId);
    }, [areas, zoneId]);

    const filteredBranches = useMemo(() => {
        if (areaId) {
            return branches.filter((branch) => String(branch.area_id) === areaId);
        }

        if (!zoneId) {
            return branches;
        }

        const areaIds = new Set(filteredAreas.map((area) => String(area.id)));

        return branches.filter((branch) => areaIds.has(String(branch.area_id)));
    }, [areaId, branches, filteredAreas, zoneId]);

    const query = () => {
        const params = new URLSearchParams();
        if (dateFrom) params.set('date_from', dateFrom);
        if (dateTo) params.set('date_to', dateTo);
        if (zoneId) params.set('zone_id', zoneId);
        if (areaId) params.set('area_id', areaId);
        if (branchId) params.set('branch_id', branchId);

        return params.toString();
    };

    const applyFilters = (event: FormEvent) => {
        event.preventDefault();
        router.get(`/reports/branch-loan-pending?${query()}`);
    };

    const resetFilters = () => {
        router.get('/reports/branch-loan-pending');
    };

    const openPrint = () => {
        window.open(`/reports/branch-loan-pending/print?${query()}`, '_blank');
    };

    const rangeLabel =
        filters.date_from && filters.date_to
            ? `${formatDate(filters.date_from)} – ${formatDate(filters.date_to)}`
            : '';

    return (
        <AdminLayout>
            <Head title="Branch-wise Loan Pending Report" />

            <div className="space-y-5 pb-12">
                <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs md:flex-row md:items-center md:justify-between md:p-6">
                    <div>
                        <div className="mb-1 flex items-center gap-2.5 text-sm font-bold text-brand">
                            <span className="rounded-lg bg-brand-soft p-1.5 text-brand-dark">
                                <Clock className="h-4 w-4" />
                            </span>
                            <span>শাখাভিত্তিক পেন্ডিং ঋণ</span>
                        </div>
                        <h1 className="text-xl font-black tracking-tight text-slate-800 md:text-2xl">
                            Branch-wise Loan Pending Report
                        </h1>
                        <p className="mt-1 text-xs text-slate-500 md:text-sm">
                            প্রতিটি শাখায় ঋণ এখন কোন অবস্থায় কতগুলো আছে। {rangeLabel}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={openPrint}
                        className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-brand/20 transition-all hover:bg-brand-dark"
                    >
                        <Printer className="h-3.5 w-3.5" />
                        প্রিন্ট
                    </button>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                    <form onSubmit={applyFilters} className="space-y-3.5">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-700">
                            <Filter className="h-4 w-4 text-brand" />
                            তারিখ ও শাখা
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                হতে (From)
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(event) => setDateFrom(event.target.value)}
                                    className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 text-xs text-slate-700 outline-none focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand"
                                />
                            </label>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                পর্যন্ত (To)
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(event) => setDateTo(event.target.value)}
                                    className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 text-xs text-slate-700 outline-none focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand"
                                />
                            </label>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                জোন
                                <select
                                    value={zoneId}
                                    onChange={(event) => {
                                        setZoneId(event.target.value);
                                        setAreaId('');
                                        setBranchId('');
                                    }}
                                    className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 text-xs text-slate-700 outline-none focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand"
                                >
                                    <option value="">সব জোন</option>
                                    {zones.map((zone) => (
                                        <option key={zone.id} value={String(zone.id)}>
                                            {zone.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                অঞ্চল
                                <select
                                    value={areaId}
                                    onChange={(event) => {
                                        setAreaId(event.target.value);
                                        setBranchId('');
                                    }}
                                    className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 text-xs text-slate-700 outline-none focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand"
                                >
                                    <option value="">সব অঞ্চল</option>
                                    {filteredAreas.map((area) => (
                                        <option key={area.id} value={String(area.id)}>
                                            {area.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                শাখা
                                <select
                                    value={branchId}
                                    onChange={(event) => setBranchId(event.target.value)}
                                    className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 text-xs text-slate-700 outline-none focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand"
                                >
                                    <option value="">সব শাখা</option>
                                    {filteredBranches.map((branch) => (
                                        <option key={branch.id} value={String(branch.id)}>
                                            {branch.name}
                                            {branch.code ? ` (${branch.code})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
                            >
                                দেখুন
                            </button>
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                রিসেট
                            </button>
                        </div>
                    </form>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse text-xs">
                            <thead className="bg-slate-100 text-slate-700">
                                <tr>
                                    <th className="border border-slate-200 px-2 py-2 text-center">ক্রঃ</th>
                                    <th className="border border-slate-200 px-2 py-2 text-left">জোন</th>
                                    <th className="border border-slate-200 px-2 py-2 text-left">অঞ্চল</th>
                                    <th className="border border-slate-200 px-2 py-2 text-left">শাখা</th>
                                    {columns.map((column) => (
                                        <th
                                            key={column.key}
                                            title={column.label}
                                            className="border border-slate-200 px-2 py-2 text-center"
                                        >
                                            {column.code}
                                        </th>
                                    ))}
                                    <th className="border border-slate-200 px-2 py-2 text-center">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={columns.length + 5}
                                            className="border border-slate-200 px-3 py-8 text-center text-slate-500"
                                        >
                                            এই তারিখে কোনো শাখা নেই।
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((row) => (
                                        <tr key={row.branch_id} className="odd:bg-white even:bg-slate-50/70">
                                            <td className="border border-slate-200 px-2 py-1.5 text-center">{row.serial}</td>
                                            <td className="border border-slate-200 px-2 py-1.5">{row.zone_name || '—'}</td>
                                            <td className="border border-slate-200 px-2 py-1.5">{row.area_name || '—'}</td>
                                            <td className="border border-slate-200 px-2 py-1.5 font-semibold text-slate-800">
                                                {row.branch_name}
                                                {row.branch_code ? ` (${row.branch_code})` : ''}
                                            </td>
                                            {columns.map((column) => (
                                                <td key={column.key} className="border border-slate-200 px-2 py-1.5 text-center tabular-nums">
                                                    {row[column.key] ?? 0}
                                                </td>
                                            ))}
                                            <td className="border border-slate-200 px-2 py-1.5 text-center font-bold tabular-nums">
                                                {row.total}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {rows.length > 0 && (
                                <tfoot>
                                    <tr className="bg-slate-800 text-white">
                                        <td colSpan={4} className="border border-slate-700 px-2 py-2 text-right font-bold">
                                            মোট
                                        </td>
                                        {columns.map((column) => (
                                            <td key={column.key} className="border border-slate-700 px-2 py-2 text-center font-bold tabular-nums">
                                                {totals[column.key] ?? 0}
                                            </td>
                                        ))}
                                        <td className="border border-slate-700 px-2 py-2 text-center font-bold tabular-nums">
                                            {totals.total}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 px-4 py-3 text-[11px] text-slate-500">
                        {columns.map((column) => (
                            <span key={column.key}>
                                <span className="font-bold text-slate-700">{column.code}</span> = {column.label}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
