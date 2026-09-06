import { useState, JSX } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { ArrowLeft, FileSpreadsheet, LayoutGrid, Printer, Table } from 'lucide-react';
import { useAutoFitPrint } from '@/hooks/useAutoFitPrint';

interface Branch {
    id: number;
    name: string;
    code: string;
    phone?: string | null;
    email?: string | null;
    is_active: boolean;
}

interface Area {
    id: number;
    name: string;
    code: string;
    is_active: boolean;
    branches: Branch[];
}

interface Zone {
    id: number;
    name: string;
    code: string;
    is_active: boolean;
    areas: Area[];
}

interface Summary {
    total_zones: number;
    total_areas: number;
    total_branches: number;
}

interface Props {
    generatedAt: string;
    zones: Zone[];
    summary: Summary;
    includeInactive: boolean;
}

export default function StructurePrint({
    generatedAt,
    zones,
    summary,
    includeInactive: _includeInactive,
}: Props) {
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

    // Filter out Head Office completely from zones, areas, and branches
    const displayZones = zones
        .filter((z) => {
            const lowerName = (z.name || '').toLowerCase();
            return z.code !== '00' && !lowerName.includes('head office') && !lowerName.includes('প্রধান কার্যালয়');
        })
        .map((z) => ({
            ...z,
            areas: (z.areas || [])
                .filter((a) => {
                    const lowerAreaName = (a.name || '').toLowerCase();
                    return a.code !== '000' && !lowerAreaName.includes('head office') && !lowerAreaName.includes('unassigned');
                })
                .map((a) => ({
                    ...a,
                    branches: (a.branches || []).filter((b) => {
                        const lowerBranchName = (b.name || '').toLowerCase();
                        return b.code !== '0000' && b.code !== '1000' && !lowerBranchName.includes('head office') && !lowerBranchName.includes('unknown');
                    }),
                })),
        }));

    const totalZoneCount = displayZones.length;
    const totalAreaCount = displayZones.reduce((acc, z) => acc + z.areas.length, 0);
    const totalBranchCount = displayZones.reduce(
        (acc, z) => acc + z.areas.reduce((aAcc, a) => aAcc + a.branches.length, 0),
        0
    );

    // Initialize auto-fit hook for 1-page print safety
    const { printWithAutoFit } = useAutoFitPrint([viewMode, orientation, displayZones], '.print-container');

    const handlePrint = () => {
        printWithAutoFit();
    };

    const handleExportCsv = () => {
        const escapeCell = (val: unknown) => {
            const s = String(val ?? '');
            const escaped = s.replace(/"/g, '""');
            return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
        };

        const rows: string[][] = [
            ['Zone Code', 'Zonal Office Name', 'Regional Code', 'Regional Office Name', 'Branch Code', 'Branch Name', 'Status'],
        ];

        displayZones.forEach((z) => {
            z.areas.forEach((a) => {
                if (a.branches.length === 0) {
                    rows.push([z.code, z.name, a.code, a.name, '-', '-', a.is_active ? 'Active' : 'Inactive']);
                } else {
                    a.branches.forEach((b) => {
                        rows.push([
                            z.code,
                            z.name,
                            a.code,
                            a.name,
                            b.code,
                            b.name,
                            b.is_active ? 'Active' : 'Inactive',
                        ]);
                    });
                }
            });
        });

        const csv = rows.map((r) => r.map(escapeCell).join(',')).join('\r\n');
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `organization_structure_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    return (
        <AdminLayout>
            <Head title="Organization Structure - 1 Page PDF / Print" />

            <style>{`
                @page {
                    size: A4 ${orientation};
                    margin: 5mm 6mm 6mm 6mm;
                }

                @media print {
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        font-size: 8pt !important;
                    }

                    body * {
                        visibility: hidden;
                    }

                    .org-structure-print-area,
                    .org-structure-print-area * {
                        visibility: visible;
                    }

                    .org-structure-print-area {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    .no-print {
                        display: none !important;
                    }

                    .page-break-avoid {
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }
                }
            `}</style>

            <div className="mx-auto max-w-7xl px-3 py-4 print:max-w-none print:p-0">
                {/* Control Toolbar (Hidden in Print) */}
                <div className="no-print mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => router.visit('/organizations')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                ফিরে যান (Organizations)
                            </button>
                            <div>
                                <h1 className="text-base font-bold text-slate-900">
                                    Organization Structure (১ পাতা PDF / প্রিন্ট)
                                </h1>
                                <p className="text-xs text-slate-500">
                                    জোন কোড অনুযায়ী জোনাল অফিস, রিজিওনাল অফিস ও শাখা অফিসসমূহের কাঠামো (Head Office ব্যতীত)
                                </p>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Layout Toggle */}
                            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('grid')}
                                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 font-medium transition ${
                                        viewMode === 'grid'
                                            ? 'bg-white text-blue-700 shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <LayoutGrid className="h-3.5 w-3.5" />
                                    গ্রিড কার্ড ভিউ
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('table')}
                                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 font-medium transition ${
                                        viewMode === 'table'
                                            ? 'bg-white text-blue-700 shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <Table className="h-3.5 w-3.5" />
                                    তালিকা টেবিল ভিউ
                                </button>
                            </div>

                            {/* Orientation Toggle */}
                            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setOrientation('portrait')}
                                    className={`rounded-md px-2.5 py-1.5 font-medium transition ${
                                        orientation === 'portrait'
                                            ? 'bg-white text-blue-700 shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    Portrait
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setOrientation('landscape')}
                                    className={`rounded-md px-2.5 py-1.5 font-medium transition ${
                                        orientation === 'landscape'
                                            ? 'bg-white text-blue-700 shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    Landscape
                                </button>
                            </div>

                            {/* Export CSV */}
                            <button
                                type="button"
                                onClick={handleExportCsv}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none"
                            >
                                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                                Export CSV
                            </button>

                            {/* Print / Download PDF */}
                            <button
                                type="button"
                                onClick={handlePrint}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                <Printer className="h-3.5 w-3.5" />
                                ১ পাতা PDF / Print
                            </button>
                        </div>
                    </div>

                    <div className="mt-2.5 border-t border-slate-100 pt-2 text-xs text-slate-500">
                        প্রিন্ট করার সময় ব্রাউজার প্রিন্ট ডায়ালগ থেকে <strong>"Save as PDF"</strong> নির্বাচন করে সরাসরি ১ পাতার পরিষ্কার PDF ফাইল হিসেবে সংরক্ষণ করুন।
                    </div>
                </div>

                {/* Printable Single-Page Sheet */}
                <div className="org-structure-print-area print-container bg-white">
                    <div className="print-page-sheet rounded-xl border border-slate-200 bg-white p-5 shadow-xs print:rounded-none print:border-none print:p-0 print:shadow-none">
                        <div className="print-page-content">
                            {/* Organization Header */}
                            <div className="border-b-2 border-slate-800 pb-2 text-center">
                                <div className="relative flex min-h-[46px] items-center justify-center">
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2">
                                        <img
                                            src="/logo.png"
                                            alt="Logo"
                                            className="h-10 w-auto object-contain"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    </div>
                                    <div className="text-center">
                                        <h2 className="text-xl font-black tracking-tight text-slate-900 print:text-lg">
                                            মৌসুমী
                                        </h2>
                                        <p className="text-[10px] font-medium text-slate-600">
                                            প্রধান কার্যালয়: উকিলপাড়া, নওগাঁ | অপারেশন ও ফিল্ড ম্যানেজমেন্ট
                                        </p>
                                        <div className="mt-0.5 inline-block rounded-full bg-slate-100 px-3 py-0.5 text-xs font-bold text-slate-800 print:bg-transparent print:p-0 print:underline">
                                            সাংগঠনিক কাঠামো ও অফিস তালিকা (Organization Structure)
                                        </div>
                                    </div>
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 text-right text-[9px] text-slate-500">
                                        <div><strong>তারিখ:</strong> {generatedAt}</div>
                                        <div><strong>ফরম্যাট:</strong> ১ পাতা রেফারেন্স</div>
                                    </div>
                                </div>

                                {/* Header Meta Summary Bar */}
                                <div className="mt-2 flex items-center justify-between rounded-md bg-slate-50 px-3 py-1 text-[10px] font-medium text-slate-700 print:border print:border-slate-300 print:bg-slate-100">
                                    <div>
                                        <span className="text-slate-500">মোট জোনাল অফিস (Zone):</span>{' '}
                                        <strong className="text-slate-900 font-mono">{totalZoneCount} টি</strong>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">মোট রিজিওনাল অফিস (Area):</span>{' '}
                                        <strong className="text-slate-900 font-mono">{totalAreaCount} টি</strong>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">মোট শাখা অফিস (Branch):</span>{' '}
                                        <strong className="text-slate-900 font-mono">{totalBranchCount} টি</strong>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">শ্রেণীবিভাগ:</span>{' '}
                                        <span className="text-blue-700 font-bold">Zone Code ভিত্তিক অনুক্রম</span>
                                    </div>
                                </div>
                            </div>

                            {/* VIEW MODE 1: GRID / CARD HIERARCHY (COMPACT 3-COLUMN BALANCED VIEW) */}
                            {viewMode === 'grid' && (
                                <div className="mt-3">
                                    <div
                                        className={`grid gap-3 ${
                                            displayZones.length === 3
                                                ? 'grid-cols-3'
                                                : displayZones.length === 4
                                                ? 'grid-cols-4'
                                                : displayZones.length === 2
                                                ? 'grid-cols-2'
                                                : 'grid-cols-3'
                                        } print:gap-2`}
                                    >
                                        {displayZones.map((zone) => {
                                            const totalBranchesInZone = zone.areas.reduce(
                                                (sum, a) => sum + a.branches.length,
                                                0
                                            );
                                            return (
                                                <div
                                                    key={zone.id}
                                                    className="page-break-avoid flex flex-col rounded-lg border border-slate-300 bg-white overflow-hidden shadow-2xs print:border-slate-400 print:shadow-none"
                                                >
                                                    {/* Zone Header Banner */}
                                                    <div className="border-b border-blue-200 bg-gradient-to-r from-blue-700 to-indigo-800 px-2.5 py-1.5 text-white print:bg-blue-900 print:text-white">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="rounded bg-white/20 px-1.5 py-0.2 font-mono text-[10px] font-black">
                                                                    {zone.code}
                                                                </span>
                                                                <span className="text-xs font-black tracking-tight">
                                                                    {zone.name}
                                                                </span>
                                                            </div>
                                                            <span className="text-[9px] font-medium text-blue-100">
                                                                {totalBranchesInZone} শাখা
                                                            </span>
                                                        </div>
                                                        <div className="text-[8.5px] text-blue-100/90 font-medium">
                                                            জোনাল অফিস কোড: <span className="font-mono font-bold text-white">{zone.code}</span>
                                                        </div>
                                                    </div>

                                                    {/* Regional Offices (Areas) in this Zone */}
                                                    <div className="flex-1 divide-y divide-slate-200 p-1.5 space-y-1.5 print:p-1 print:space-y-1">
                                                        {zone.areas.length === 0 ? (
                                                            <div className="py-2 text-center text-[9px] text-slate-400">
                                                                কোনো অঞ্চল পাওয়া যায়নি
                                                            </div>
                                                        ) : (
                                                            zone.areas.map((area) => (
                                                                <div
                                                                    key={area.id}
                                                                    className="rounded border border-slate-200 bg-slate-50/70 p-1.5 print:border-slate-300 print:bg-white"
                                                                >
                                                                    {/* Regional Office Header */}
                                                                    <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                                                                        <div className="flex items-center gap-1">
                                                                            <span className="rounded bg-emerald-100 px-1 py-0.2 font-mono text-[8.5px] font-bold text-emerald-800 print:border print:border-emerald-700">
                                                                                {area.code}
                                                                            </span>
                                                                            <span className="text-[10px] font-bold text-slate-800">
                                                                                {area.name}
                                                                            </span>
                                                                        </div>
                                                                        <span className="text-[8px] font-semibold text-slate-500">
                                                                            ({area.branches.length} শাখা)
                                                                        </span>
                                                                    </div>

                                                                    {/* Branch List Table */}
                                                                    <table className="w-full text-left border-collapse text-[8.5px]">
                                                                        <thead>
                                                                            <tr className="text-slate-500 border-b border-slate-200 text-[7.5px] uppercase">
                                                                                <th className="w-9 font-semibold">Code</th>
                                                                                <th className="font-semibold">শাখার নাম (Branch)</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-slate-100">
                                                                            {area.branches.length === 0 ? (
                                                                                <tr>
                                                                                    <td colSpan={2} className="py-1 text-center text-[8px] text-slate-400">
                                                                                        শাখা নেই
                                                                                    </td>
                                                                                </tr>
                                                                            ) : (
                                                                                area.branches.map((branch) => (
                                                                                    <tr key={branch.id} className="hover:bg-white">
                                                                                        <td className="py-0.5 font-mono font-semibold text-slate-700">
                                                                                            {branch.code}
                                                                                        </td>
                                                                                        <td className="py-0.5 font-medium text-slate-900">
                                                                                            {branch.name}
                                                                                        </td>
                                                                                    </tr>
                                                                                ))
                                                                            )}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* VIEW MODE 2: COMPACT STRUCTURED TABLE VIEW */}
                            {viewMode === 'table' && (
                                <div className="mt-3 overflow-hidden rounded-lg border border-slate-300 print:border-slate-500">
                                    <table className="w-full border-collapse text-[8.5px]">
                                        <thead>
                                            <tr className="bg-slate-800 text-white text-[9px] print:bg-slate-900">
                                                <th className="border border-slate-600 px-2 py-1 text-center w-10">ক্রঃ</th>
                                                <th className="border border-slate-600 px-2 py-1 text-center w-24">Zone Code</th>
                                                <th className="border border-slate-600 px-2 py-1 text-left w-36">জোনাল অফিস (Zone)</th>
                                                <th className="border border-slate-600 px-2 py-1 text-center w-24">Regional Code</th>
                                                <th className="border border-slate-600 px-2 py-1 text-left w-36">রিজিওনাল অফিস (Area)</th>
                                                <th className="border border-slate-600 px-2 py-1 text-center w-24">Branch Code</th>
                                                <th className="border border-slate-600 px-2 py-1 text-left">শাখা অফিস (Branch Name)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                let serial = 0;
                                                const rows: JSX.Element[] = [];

                                                displayZones.forEach((z) => {
                                                    const zoneTotalBranches = z.areas.reduce((sum, a) => sum + Math.max(a.branches.length, 1), 0);
                                                    let zonePrinted = false;

                                                    z.areas.forEach((a) => {
                                                        const areaTotalBranches = Math.max(a.branches.length, 1);
                                                        let areaPrinted = false;

                                                        if (a.branches.length === 0) {
                                                            serial++;
                                                            rows.push(
                                                                <tr key={`empty-${z.id}-${a.id}`} className="hover:bg-slate-50 border-b border-slate-200">
                                                                    <td className="border border-slate-300 px-1 py-0.5 text-center font-mono">{serial}</td>
                                                                    {!zonePrinted && (
                                                                        <>
                                                                            <td rowSpan={zoneTotalBranches} className="border border-slate-300 px-2 py-1 text-center font-mono font-bold bg-blue-50/40 align-top">
                                                                                {z.code}
                                                                            </td>
                                                                            <td rowSpan={zoneTotalBranches} className="border border-slate-300 px-2 py-1 font-bold text-blue-900 bg-blue-50/40 align-top">
                                                                                {z.name}
                                                                            </td>
                                                                        </>
                                                                    )}
                                                                    <td className="border border-slate-300 px-2 py-1 text-center font-mono font-semibold bg-emerald-50/30">
                                                                        {a.code}
                                                                    </td>
                                                                    <td className="border border-slate-300 px-2 py-1 font-semibold text-emerald-900 bg-emerald-50/30">
                                                                        {a.name}
                                                                    </td>
                                                                    <td colSpan={2} className="border border-slate-300 px-2 py-1 text-center text-slate-400 italic">
                                                                        শাখা নেই
                                                                    </td>
                                                                </tr>
                                                            );
                                                            zonePrinted = true;
                                                        } else {
                                                            a.branches.forEach((b) => {
                                                                serial++;
                                                                rows.push(
                                                                    <tr key={b.id} className="hover:bg-slate-50 border-b border-slate-200">
                                                                        <td className="border border-slate-300 px-1 py-0.5 text-center font-mono">{serial}</td>
                                                                        {!zonePrinted && (
                                                                            <>
                                                                                <td rowSpan={zoneTotalBranches} className="border border-slate-300 px-2 py-1 text-center font-mono font-bold bg-blue-50/40 align-top text-blue-800">
                                                                                    {z.code}
                                                                                </td>
                                                                                <td rowSpan={zoneTotalBranches} className="border border-slate-300 px-2 py-1 font-bold text-slate-900 bg-blue-50/40 align-top">
                                                                                    {z.name}
                                                                                </td>
                                                                            </>
                                                                        )}
                                                                        {!areaPrinted && (
                                                                            <>
                                                                                <td rowSpan={areaTotalBranches} className="border border-slate-300 px-2 py-1 text-center font-mono font-semibold bg-emerald-50/20 text-emerald-800 align-top">
                                                                                    {a.code}
                                                                                </td>
                                                                                <td rowSpan={areaTotalBranches} className="border border-slate-300 px-2 py-1 font-semibold text-slate-900 bg-emerald-50/20 align-top">
                                                                                    {a.name}
                                                                                </td>
                                                                            </>
                                                                        )}
                                                                        <td className="border border-slate-300 px-2 py-0.5 text-center font-mono font-bold text-slate-800">
                                                                            {b.code}
                                                                        </td>
                                                                        <td className="border border-slate-300 px-2 py-0.5 font-medium text-slate-900">
                                                                            {b.name}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                                zonePrinted = true;
                                                                areaPrinted = true;
                                                            });
                                                        }
                                                    });
                                                });

                                                return rows;
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Signatures & Footer Block */}
                            <div className="page-break-avoid mt-5 border-t border-slate-300 pt-3">
                                <div className="grid grid-cols-4 gap-4 text-center text-[9px] text-slate-700">
                                    <div>
                                        <div className="h-6 border-b border-dashed border-slate-400"></div>
                                        <div className="mt-1 font-semibold">প্রস্তুতকারী</div>
                                    </div>
                                    <div>
                                        <div className="h-6 border-b border-dashed border-slate-400"></div>
                                        <div className="mt-1 font-semibold">যাচাইকারী কর্মকর্তা</div>
                                    </div>
                                    <div>
                                        <div className="h-6 border-b border-dashed border-slate-400"></div>
                                        <div className="mt-1 font-semibold">অপারেশন ম্যানেজার</div>
                                    </div>
                                    <div>
                                        <div className="h-6 border-b border-dashed border-slate-400"></div>
                                        <div className="mt-1 font-semibold">হেড অব এমআইএস / হেড অফিস</div>
                                    </div>
                                </div>
                                <div className="mt-2 flex items-center justify-between text-[8px] text-slate-400 print:text-slate-500">
                                    <span>মৌসুমী লোন ম্যানেজমেন্ট সিস্টেম (MisLoan) | Organization Structure Summary</span>
                                    <span>পাতা ১ এর ১ (Single Page Report)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
