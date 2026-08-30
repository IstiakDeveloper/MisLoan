import React, { useState, useMemo } from 'react';
import {
    ChevronDown,
    ChevronRight,
    Search,
    Phone,
    Layers,
    Building2,
    MapPin,
    FolderGit2,
    Users,
    AlertCircle,
    CheckCircle2,
    FolderPlus,
    FolderMinus,
    Clock,
} from 'lucide-react';

export interface StageBreakdownItem {
    label: string;
    admission: number;
    loan: number;
    total: number;
}

export interface HierarchyNode {
    id: number;
    key: string;
    type: 'zone' | 'area' | 'branch';
    name: string;
    code?: string;
    parent_name?: string;
    manager_name: string;
    manager_phone?: string | null;
    manager_role: string;
    admission_pending: number;
    loan_pending: number;
    total_pending: number;
    loan_amount: number;
    areas_count?: number;
    branches_count?: number;
    stages?: {
        branch: StageBreakdownItem;
        area: StageBreakdownItem;
        zone: StageBreakdownItem;
        senior_ho: StageBreakdownItem;
        correction: StageBreakdownItem;
    };
    children?: HierarchyNode[];
}

interface HierarchicalPendingMonitorProps {
    tree: HierarchyNode[];
    title?: string;
    subtitle?: string;
    accentColor?: 'purple' | 'indigo' | 'blue';
    defaultExpandAll?: boolean;
}

export default function HierarchicalPendingMonitor({
    tree = [],
    title = 'কর্মকর্তা ও অনুমোদকভিত্তিক পেন্ডিং মনিটর (হায়ারার্কি ড্রিল-ডাউন)',
    subtitle = 'জোন ➔ অঞ্চল ➔ শাখা ক্রমানুসারে এক্সপ্যান্ড করে প্রতিটি স্তরের দায়িত্বপ্রাপ্ত কর্মকর্তা ও পেন্ডিংয়ের লাইভ স্থিতি',
    accentColor = 'purple',
    defaultExpandAll = false,
}: HierarchicalPendingMonitorProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'zero'>('all');
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => {
        const initial = new Set<string>();
        if (defaultExpandAll) {
            const addAllKeys = (nodes: HierarchyNode[]) => {
                nodes.forEach((n) => {
                    initial.add(n.key);
                    if (n.children) addAllKeys(n.children);
                });
            };
            addAllKeys(tree);
        } else if (tree.length === 1) {
            // If only 1 root node (e.g. Zone Manager seeing their 1 zone), auto expand root
            initial.add(tree[0].key);
        }
        return initial;
    });

    const toggleExpand = (key: string) => {
        setExpandedKeys((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const expandAll = () => {
        const allKeys = new Set<string>();
        const addKeys = (nodes: HierarchyNode[]) => {
            nodes.forEach((n) => {
                allKeys.add(n.key);
                if (n.children) addKeys(n.children);
            });
        };
        addKeys(tree);
        setExpandedKeys(allKeys);
    };

    const collapseAll = () => {
        setExpandedKeys(new Set<string>());
    };

    // Filter tree recursively based on search and status
    const filterNode = (node: HierarchyNode, query: string, filter: 'all' | 'pending' | 'zero'): HierarchyNode | null => {
        const q = query.toLowerCase().trim();
        const matchesQuery =
            !q ||
            node.name.toLowerCase().includes(q) ||
            (node.code && node.code.toLowerCase().includes(q)) ||
            node.manager_name.toLowerCase().includes(q) ||
            (node.manager_phone && node.manager_phone.includes(q)) ||
            (node.parent_name && node.parent_name.toLowerCase().includes(q));

        let matchesStatus = true;
        if (filter === 'pending') {
            matchesStatus = node.total_pending > 0;
        } else if (filter === 'zero') {
            matchesStatus = node.total_pending === 0;
        }

        let filteredChildren: HierarchyNode[] = [];
        if (node.children && node.children.length > 0) {
            filteredChildren = node.children
                .map((c) => filterNode(c, query, filter))
                .filter((c): c is HierarchyNode => c !== null);
        }

        // If children match or this node matches
        if (filteredChildren.length > 0) {
            return {
                ...node,
                children: filteredChildren,
            };
        }

        if (matchesQuery && matchesStatus) {
            return {
                ...node,
                children: filteredChildren,
            };
        }

        return null;
    };

    const filteredTree = useMemo(() => {
        if (!tree || tree.length === 0) return [];
        return tree
            .map((node) => filterNode(node, searchQuery, statusFilter))
            .filter((node): node is HierarchyNode => node !== null);
    }, [tree, searchQuery, statusFilter]);

    // Auto-expand when searching
    React.useEffect(() => {
        if (searchQuery.trim()) {
            const allKeys = new Set<string>();
            const addKeys = (nodes: HierarchyNode[]) => {
                nodes.forEach((n) => {
                    allKeys.add(n.key);
                    if (n.children) addKeys(n.children);
                });
            };
            addKeys(filteredTree);
            setExpandedKeys(allKeys);
        }
    }, [searchQuery, filteredTree]);

    const colorClasses = {
        purple: {
            iconBg: 'from-purple-600 to-indigo-600',
            badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
            activeTab: 'bg-white text-purple-700 shadow-2xs font-extrabold',
            hoverRow: 'hover:bg-purple-50/40',
            zoneBadge: 'bg-purple-100 text-purple-800 border-purple-200',
            areaBadge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
            branchBadge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        },
        indigo: {
            iconBg: 'from-indigo-600 to-blue-600',
            badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
            activeTab: 'bg-white text-indigo-700 shadow-2xs font-extrabold',
            hoverRow: 'hover:bg-indigo-50/40',
            zoneBadge: 'bg-purple-100 text-purple-800 border-purple-200',
            areaBadge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
            branchBadge: 'bg-blue-100 text-blue-800 border-blue-200',
        },
        blue: {
            iconBg: 'from-blue-600 to-cyan-600',
            badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
            activeTab: 'bg-white text-blue-700 shadow-2xs font-extrabold',
            hoverRow: 'hover:bg-blue-50/40',
            zoneBadge: 'bg-purple-100 text-purple-800 border-purple-200',
            areaBadge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
            branchBadge: 'bg-cyan-100 text-cyan-800 border-cyan-200',
        },
    }[accentColor];

    // Compute aggregate summary counts
    const summaryStats = useMemo(() => {
        let totalZones = 0;
        let totalAreas = 0;
        let totalBranches = 0;
        let totalAdmissionPending = 0;
        let totalLoanPending = 0;
        let totalPending = 0;
        let totalLoanAmount = 0;

        tree.forEach((z) => {
            totalZones++;
            totalAdmissionPending += z.admission_pending;
            totalLoanPending += z.loan_pending;
            totalPending += z.total_pending;
            totalLoanAmount += z.loan_amount;
            if (z.children) {
                z.children.forEach((a) => {
                    totalAreas++;
                    if (a.children) {
                        totalBranches += a.children.length;
                    }
                });
            }
        });

        return {
            totalZones,
            totalAreas,
            totalBranches,
            totalAdmissionPending,
            totalLoanPending,
            totalPending,
            totalLoanAmount,
        };
    }, [tree]);

    return (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 space-y-4">
            {/* Section Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                    <div
                        className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${colorClasses.iconBg} text-white flex items-center justify-center shadow-xs shrink-0`}
                    >
                        <Layers size={16} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">
                                {title}
                            </h3>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${colorClasses.badgeBg}`}>
                                হায়ারার্কি ড্রিল-ডাউন (জোন ➔ অঞ্চল ➔ শাখা)
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                            {subtitle}
                        </p>
                    </div>
                </div>

                {/* Summary Pills */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200/70">
                        <span className="text-[11px] text-slate-500 font-medium">আওতাভুক্ত:</span>
                        <span className="font-bold text-slate-800">
                            {summaryStats.totalZones > 0 ? `${summaryStats.totalZones} জোন • ` : ''}
                            {summaryStats.totalAreas > 0 ? `${summaryStats.totalAreas} অঞ্চল • ` : ''}
                            {summaryStats.totalBranches} শাখা
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                        <span className="text-[11px] text-amber-700 font-medium">সর্বমোট পেন্ডিং:</span>
                        <span className="font-black text-amber-800">
                            {summaryStats.totalPending.toLocaleString()} টি
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-200">
                        <span className="text-[11px] text-purple-700 font-medium">পেন্ডিং ঋণ:</span>
                        <span className="font-black text-purple-800">
                            ৳ {summaryStats.totalLoanAmount.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>

            {/* Toolbar: Search, Filters, Expand/Collapse All */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="কর্মকর্তা, মোবাইল নম্বর, জোন, অঞ্চল বা শাখার নাম খুঁজুন..."
                            className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Expand/Collapse All buttons */}
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-[11px] font-bold">
                        <button
                            type="button"
                            onClick={expandAll}
                            className="px-2.5 py-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-all flex items-center gap-1"
                            title="সকল স্তর উন্মুক্ত করুন"
                        >
                            <FolderPlus size={12} className="text-purple-600" />
                            <span>সব খুলুন</span>
                        </button>
                        <button
                            type="button"
                            onClick={collapseAll}
                            className="px-2.5 py-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-all flex items-center gap-1"
                            title="সকল স্তর সঙ্কুচিত করুন"
                        >
                            <FolderMinus size={12} className="text-slate-500" />
                            <span>সব বন্ধ</span>
                        </button>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
                        <button
                            type="button"
                            onClick={() => setStatusFilter('all')}
                            className={`px-2.5 py-1 rounded-lg transition-all ${
                                statusFilter === 'all'
                                    ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            সব
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('pending')}
                            className={`px-2.5 py-1 rounded-lg transition-all ${
                                statusFilter === 'pending'
                                    ? 'bg-amber-500 text-white shadow-2xs font-extrabold'
                                    : 'text-slate-600 hover:text-amber-600'
                            }`}
                        >
                            পেন্ডিং আছে
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('zero')}
                            className={`px-2.5 py-1 rounded-lg transition-all ${
                                statusFilter === 'zero'
                                    ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                                    : 'text-slate-600 hover:text-emerald-600'
                            }`}
                        >
                            শূন্য
                        </button>
                    </div>
                </div>
            </div>

            {/* Hierarchical Tree Table View */}
            <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                <table className="w-full text-left text-xs border-collapse">
                    <thead>
                        <tr className="bg-slate-50/90 text-slate-600 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                            <th className="py-2.5 px-3 min-w-[260px]">স্তর ও নাম</th>
                            <th className="py-2.5 px-3 min-w-[200px]">দায়িত্বপ্রাপ্ত কর্মকর্তা ও পদবি</th>
                            <th className="py-2.5 px-3 text-center">আওতাধীন পরিধি</th>
                            <th className="py-2.5 px-3 text-center">ভর্তি পেন্ডিং</th>
                            <th className="py-2.5 px-3 text-center">ঋণ পেন্ডিং</th>
                            <th className="py-2.5 px-3 text-center">সর্বমোট পেন্ডিং</th>
                            <th className="py-2.5 px-3 text-right">ঋণের পরিমাণ (৳)</th>
                            <th className="py-2.5 px-3 text-center min-w-[100px]">অবস্থা</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredTree.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="py-10 text-center text-slate-400 font-medium">
                                    কোনো কর্মকর্তা বা ইউনিটের তথ্য পাওয়া যায়নি।
                                </td>
                            </tr>
                        ) : (
                            filteredTree.map((zoneNode) => (
                                <TreeRow
                                    key={zoneNode.key}
                                    node={zoneNode}
                                    depth={0}
                                    expandedKeys={expandedKeys}
                                    toggleExpand={toggleExpand}
                                    colorClasses={colorClasses}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Recursive Tree Row Component
interface TreeRowProps {
    node: HierarchyNode;
    depth: number;
    expandedKeys: Set<string>;
    toggleExpand: (key: string) => void;
    colorClasses: any;
}

function TreeRow({ node, depth, expandedKeys, toggleExpand, colorClasses }: TreeRowProps) {
    const isExpanded = expandedKeys.has(node.key);
    const hasChildren = Boolean(node.children && node.children.length > 0);
    const hasStages = Boolean(node.type === 'branch' && node.stages && node.total_pending > 0);
    const canExpand = hasChildren || hasStages;

    const hasPending = node.total_pending > 0;
    const isHighLoad = node.total_pending >= 10;

    const depthPadding = depth === 0 ? 'pl-3' : depth === 1 ? 'pl-8' : 'pl-14';

    const typeConfig = {
        zone: {
            label: 'জোন',
            badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
            rowBg: 'bg-slate-50/70 font-semibold',
            borderLeft: 'border-l-4 border-l-purple-600',
            icon: Building2,
        },
        area: {
            label: 'অঞ্চল',
            badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
            rowBg: 'bg-white',
            borderLeft: 'border-l-4 border-l-indigo-500',
            icon: FolderGit2,
        },
        branch: {
            label: 'শাখা',
            badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
            rowBg: 'bg-white',
            borderLeft: 'border-l-4 border-l-emerald-500',
            icon: MapPin,
        },
    }[node.type];

    return (
        <React.Fragment>
            <tr
                className={`transition-colors ${typeConfig.rowBg} ${typeConfig.borderLeft} ${
                    isHighLoad ? 'bg-amber-50/25' : ''
                } hover:bg-slate-100/60`}
            >
                {/* Unit Name & Expand Button */}
                <td className={`py-2.5 pr-3 ${depthPadding}`}>
                    <div className="flex items-center gap-2">
                        {canExpand ? (
                            <button
                                type="button"
                                onClick={() => toggleExpand(node.key)}
                                className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                                    isExpanded
                                        ? 'bg-slate-200 text-slate-800 shadow-2xs rotate-0'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                }`}
                                title={isExpanded ? 'সঙ্কুচিত করুন' : 'বিস্তারিত দেখতে চাপুন'}
                            >
                                {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                            </button>
                        ) : (
                            <span className="w-5 h-5 flex items-center justify-center text-slate-300">
                                •
                            </span>
                        )}

                        <span
                            className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border shrink-0 ${typeConfig.badgeBg}`}
                        >
                            {typeConfig.label}
                        </span>

                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                    className={`text-xs ${
                                        depth === 0
                                            ? 'font-bold text-slate-900'
                                            : depth === 1
                                            ? 'font-semibold text-slate-800'
                                            : 'font-medium text-slate-700'
                                    }`}
                                >
                                    {node.name}
                                </span>
                                {node.code && (
                                    <span className="text-[9px] font-mono px-1 py-0.1 bg-slate-100 text-slate-600 rounded border border-slate-200 shrink-0">
                                        {node.code}
                                    </span>
                                )}
                            </div>
                            {node.parent_name && (
                                <span className="text-[10px] text-slate-400 font-normal truncate block">
                                    {node.parent_name}
                                </span>
                            )}
                        </div>
                    </div>
                </td>

                {/* Manager Name, Role & Phone */}
                <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-slate-700 to-slate-900 text-white font-bold flex items-center justify-center text-xs shadow-2xs shrink-0">
                            {(node.manager_name || 'M')[0]}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 text-xs truncate">
                                    {node.manager_name}
                                </span>
                                {node.manager_phone && (
                                    <a
                                        href={`tel:${node.manager_phone}`}
                                        className="text-slate-400 hover:text-purple-600 transition-colors shrink-0"
                                        title={`সরাসরি কল করুন: ${node.manager_phone}`}
                                    >
                                        <Phone size={11} />
                                    </a>
                                )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium block truncate">
                                {node.manager_role}
                            </span>
                        </div>
                    </div>
                </td>

                {/* Scope */}
                <td className="py-2.5 px-3 text-center">
                    {node.type === 'zone' ? (
                        <span className="text-[11px] font-semibold text-slate-600">
                            {node.areas_count || 0} অঞ্চল • {node.branches_count || 0} শাখা
                        </span>
                    ) : node.type === 'area' ? (
                        <span className="text-[11px] font-semibold text-slate-600">
                            {node.branches_count || 0} শাখা
                        </span>
                    ) : (
                        <span className="text-[11px] font-semibold text-slate-400">
                            ১ শাখা
                        </span>
                    )}
                </td>

                {/* Admission Pending */}
                <td className="py-2.5 px-3 text-center">
                    <span
                        className={`inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 rounded-full text-xs font-bold ${
                            node.admission_pending > 0
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'text-slate-300'
                        }`}
                    >
                        {node.admission_pending}
                    </span>
                </td>

                {/* Loan Pending */}
                <td className="py-2.5 px-3 text-center">
                    <span
                        className={`inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 rounded-full text-xs font-bold ${
                            node.loan_pending > 0
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'text-slate-300'
                        }`}
                    >
                        {node.loan_pending}
                    </span>
                </td>

                {/* Total Pending */}
                <td className="py-2.5 px-3 text-center">
                    <span
                        className={`inline-flex items-center justify-center min-w-[28px] px-2.5 py-0.5 rounded-full text-xs font-black ${
                            hasPending
                                ? isHighLoad
                                    ? 'bg-rose-500 text-white shadow-2xs ring-2 ring-rose-200'
                                    : 'bg-purple-600 text-white shadow-2xs'
                                : 'text-slate-300 font-normal'
                        }`}
                    >
                        {node.total_pending}
                    </span>
                </td>

                {/* Loan Amount */}
                <td className="py-2.5 px-3 text-right">
                    <span className="font-mono font-bold text-slate-800 text-xs">
                        {node.loan_amount > 0
                            ? `৳ ${Math.round(node.loan_amount).toLocaleString()}`
                            : '—'}
                    </span>
                </td>

                {/* Status Indicator */}
                <td className="py-2.5 px-3 text-center">
                    {hasPending ? (
                        <span
                            className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                                isHighLoad
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                        >
                            <AlertCircle size={10} />
                            <span>{isHighLoad ? 'বেশি পেন্ডিং' : 'পেন্ডিং'}</span>
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={10} />
                            <span>স্বাভাবিক</span>
                        </span>
                    )}
                </td>
            </tr>

            {/* If Branch is expanded and has pending stages, show stage breakdown sub-row */}
            {isExpanded && node.type === 'branch' && node.stages && node.total_pending > 0 && (
                <tr className="bg-slate-50/90 border-l-4 border-l-emerald-400">
                    <td colSpan={8} className="py-2.5 pl-14 pr-4">
                        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                                    <Clock size={12} className="text-emerald-600" />
                                    <span>এই শাখার আবেদনসমূহ কার কাছে এবং কোন পর্যায়ে পেন্ডিং:</span>
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                    মোট পেন্ডিং: {node.total_pending} টি (ভর্তি: {node.admission_pending}, ঋণ: {node.loan_pending})
                                </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1">
                                {/* BM Stage */}
                                <div className={`p-2 rounded-lg border text-xs ${
                                    node.stages.branch.total > 0
                                        ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                                        : 'bg-slate-50 border-slate-100 text-slate-400'
                                }`}>
                                    <span className="text-[10px] font-bold block uppercase tracking-tight text-slate-500">
                                        শাখা ব্যবস্থাপক (BM)
                                    </span>
                                    <div className="flex items-baseline justify-between mt-1">
                                        <span className="font-extrabold text-sm">
                                            {node.stages.branch.total} টি
                                        </span>
                                        <span className="text-[10px] font-medium text-slate-500">
                                            ভর্তি: {node.stages.branch.admission} | ঋণ: {node.stages.branch.loan}
                                        </span>
                                    </div>
                                </div>

                                {/* RM Stage */}
                                <div className={`p-2 rounded-lg border text-xs ${
                                    node.stages.area.total > 0
                                        ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
                                        : 'bg-slate-50 border-slate-100 text-slate-400'
                                }`}>
                                    <span className="text-[10px] font-bold block uppercase tracking-tight text-slate-500">
                                        আঞ্চলিক ব্যবস্থাপক (RM)
                                    </span>
                                    <div className="flex items-baseline justify-between mt-1">
                                        <span className="font-extrabold text-sm">
                                            {node.stages.area.total} টি
                                        </span>
                                        <span className="text-[10px] font-medium text-slate-500">
                                            ভর্তি: {node.stages.area.admission} | ঋণ: {node.stages.area.loan}
                                        </span>
                                    </div>
                                </div>

                                {/* ZM Stage */}
                                <div className={`p-2 rounded-lg border text-xs ${
                                    node.stages.zone.total > 0
                                        ? 'bg-purple-50/70 border-purple-200 text-purple-900'
                                        : 'bg-slate-50 border-slate-100 text-slate-400'
                                }`}>
                                    <span className="text-[10px] font-bold block uppercase tracking-tight text-slate-500">
                                        জোনাল ম্যানেজার (ZM)
                                    </span>
                                    <div className="flex items-baseline justify-between mt-1">
                                        <span className="font-extrabold text-sm">
                                            {node.stages.zone.total} টি
                                        </span>
                                        <span className="text-[10px] font-medium text-slate-500">
                                            ভর্তি: {node.stages.zone.admission} | ঋণ: {node.stages.zone.loan}
                                        </span>
                                    </div>
                                </div>

                                {/* HO / Senior Stage */}
                                <div className={`p-2 rounded-lg border text-xs ${
                                    node.stages.senior_ho.total > 0
                                        ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                                        : 'bg-slate-50 border-slate-100 text-slate-400'
                                }`}>
                                    <span className="text-[10px] font-bold block uppercase tracking-tight text-slate-500">
                                        হেড অফিস / সিনিয়র অনুমোদক
                                    </span>
                                    <div className="flex items-baseline justify-between mt-1">
                                        <span className="font-extrabold text-sm">
                                            {node.stages.senior_ho.total} টি
                                        </span>
                                        <span className="text-[10px] font-medium text-slate-500">
                                            ভর্তি: {node.stages.senior_ho.admission} | ঋণ: {node.stages.senior_ho.loan}
                                        </span>
                                    </div>
                                </div>

                                {/* Correction Stage */}
                                <div className={`p-2 rounded-lg border text-xs ${
                                    node.stages.correction.total > 0
                                        ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                                        : 'bg-slate-50 border-slate-100 text-slate-400'
                                }`}>
                                    <span className="text-[10px] font-bold block uppercase tracking-tight text-slate-500">
                                        সংশোধনের জন্য ফেরত
                                    </span>
                                    <div className="flex items-baseline justify-between mt-1">
                                        <span className="font-extrabold text-sm">
                                            {node.stages.correction.total} টি
                                        </span>
                                        <span className="text-[10px] font-medium text-slate-500">
                                            ঋণ: {node.stages.correction.loan}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            )}

            {/* Recursive Children Rows */}
            {isExpanded &&
                node.children &&
                node.children.map((childNode) => (
                    <TreeRow
                        key={childNode.key}
                        node={childNode}
                        depth={depth + 1}
                        expandedKeys={expandedKeys}
                        toggleExpand={toggleExpand}
                        colorClasses={colorClasses}
                    />
                ))}
        </React.Fragment>
    );
}
