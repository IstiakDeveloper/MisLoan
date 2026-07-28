import {
    ConfigurationCard,
    ConfigurationHeader,
    ConfigurationPage,
    EmptyState,
    ServerPagination,
    StatCard,
    StatGrid,
    StatusBadge,
} from '@/components/configuration';
import { useCanMutate } from '@/hooks/use-can-mutate';
import AdminLayout from '@/layouts/admin-layout';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Building,
    CheckCircle2,
    Edit,
    FileCheck,
    Filter,
    Globe,
    KeyRound,
    Mail,
    MapPin,
    PenTool,
    Phone,
    Plus,
    RefreshCw,
    RotateCcw,
    Search,
    Send,
    Shield,
    ShieldCheck,
    SlidersHorizontal,
    ToggleLeft,
    ToggleRight,
    Trash2,
    UserCheck,
    UsersRound,
    UserX,
    X,
} from 'lucide-react';
import { ChangeEvent, useMemo, useRef, useState } from 'react';
import UserModal from './Components/UserModal';

interface Role {
    id: number;
    name: string;
    display_name: string;
}

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
}

interface Branch {
    id: number;
    name: string;
    code: string;
    area_id: number;
}

interface User {
    id: number;
    name: string;
    username: string;
    email: string;
    phone: string | null;
    role: Role;
    zone: Zone | null;
    area: Area | null;
    branch: Branch | null;
    zones?: Zone[];
    areas?: Area[];
    branches?: Branch[];
    is_active: boolean;
    has_all_access: boolean;
    signature?: string | null;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedUsers {
    data: User[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: PaginationLink[];
}

interface UserStats {
    total: number;
    active: number;
    inactive: number;
    super_admins: number;
}

interface Props {
    users: PaginatedUsers;
    roles: Role[];
    zones: Zone[];
    areas: Area[];
    branches: Branch[];
    stats?: UserStats;
    filters: {
        search?: string;
        role_id?: string;
        zone_id?: string;
        area_id?: string;
        branch_id?: string;
        is_active?: string;
    };
    hrmSyncEnabled?: boolean;
}

export default function Index({
    users,
    roles,
    zones,
    areas,
    branches,
    stats,
    filters,
    hrmSyncEnabled = false,
}: Props) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [userModalOpen, setUserModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [syncingFromHrm, setSyncingFromHrm] = useState(false);

    const [filterRole, setFilterRole] = useState(filters.role_id || '');
    const [filterZone, setFilterZone] = useState(filters.zone_id || '');
    const [filterArea, setFilterArea] = useState(filters.area_id || '');
    const [filterBranch, setFilterBranch] = useState(filters.branch_id || '');
    const [filterStatus, setFilterStatus] = useState(filters.is_active || '');

    const [bulkMailModalOpen, setBulkMailModalOpen] = useState(false);
    const [excludeRoleIds, setExcludeRoleIds] = useState<number[]>([]);
    const [branchSummaryModalOpen, setBranchSummaryModalOpen] = useState(false);
    const [selectedBranchIdForSummary, setSelectedBranchIdForSummary] =
        useState<string>('');
    const [targetEmailForSummary, setTargetEmailForSummary] =
        useState<string>('');

    const page = usePage() as {
        props: { auth?: { user?: { has_all_access?: boolean } } };
    };
    const authUser = page.props.auth?.user;
    const canMutate = useCanMutate();
    const canUpdateSignature = canMutate && !!authUser?.has_all_access;

    const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

    // Cascading options calculation
    const availableAreas = useMemo(() => {
        if (!filterZone) return areas;
        return areas.filter((a) => a.zone_id === Number(filterZone));
    }, [areas, filterZone]);

    const availableBranches = useMemo(() => {
        if (filterArea) {
            return branches.filter((b) => b.area_id === Number(filterArea));
        }
        if (filterZone) {
            const validAreaIds = new Set(availableAreas.map((a) => a.id));
            return branches.filter((b) => validAreaIds.has(b.area_id));
        }
        return branches;
    }, [branches, filterArea, filterZone, availableAreas]);

    // Active filter chips calculation
    const activeFiltersList = useMemo(() => {
        const list: { key: string; label: string; value: string }[] = [];

        if (searchQuery.trim()) {
            list.push({
                key: 'search',
                label: 'Search',
                value: `"${searchQuery}"`,
            });
        }
        if (filterRole) {
            const roleObj = roles.find((r) => r.id.toString() === filterRole);
            if (roleObj) {
                list.push({
                    key: 'role_id',
                    label: 'Role',
                    value: roleObj.display_name,
                });
            }
        }
        if (filterZone) {
            const zoneObj = zones.find((z) => z.id.toString() === filterZone);
            if (zoneObj) {
                list.push({
                    key: 'zone_id',
                    label: 'Zone',
                    value: zoneObj.name,
                });
            }
        }
        if (filterArea) {
            const areaObj = areas.find((a) => a.id.toString() === filterArea);
            if (areaObj) {
                list.push({
                    key: 'area_id',
                    label: 'Area',
                    value: areaObj.name,
                });
            }
        }
        if (filterBranch) {
            const branchObj = branches.find(
                (b) => b.id.toString() === filterBranch,
            );
            if (branchObj) {
                list.push({
                    key: 'branch_id',
                    label: 'Branch',
                    value: branchObj.name,
                });
            }
        }
        if (filterStatus !== '') {
            list.push({
                key: 'is_active',
                label: 'Status',
                value: filterStatus === '1' ? 'Active' : 'Inactive',
            });
        }

        return list;
    }, [
        searchQuery,
        filterRole,
        filterZone,
        filterArea,
        filterBranch,
        filterStatus,
        roles,
        zones,
        areas,
        branches,
    ]);

    const activeFilterCount = activeFiltersList.length;

    // Direct actions
    const handleAddNew = () => {
        setSelectedUser(null);
        setUserModalOpen(true);
    };

    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setUserModalOpen(true);
    };

    const handleDelete = (id: number, name: string) => {
        if (confirm(`Are you sure you want to delete user "${name}"?`)) {
            router.delete(`/users/${id}`);
        }
    };

    const handleToggleStatus = (id: number) => {
        router.patch(`/users/${id}/toggle-status`);
    };

    const handleSyncFromHrm = () => {
        if (
            !confirm(
                'HRM থেকে active Field Officer গুলো sync হবে। PIN/username HRM format-এ update হবে (যেমন 27 → 0027), password HRM-এর মতো হবে, নতুনদের create হবে। Phone/signature change হবে না।',
            )
        ) {
            return;
        }

        setSyncingFromHrm(true);
        router.post(
            '/users/sync-from-hrm',
            {},
            {
                preserveScroll: true,
                onFinish: () => setSyncingFromHrm(false),
            },
        );
    };

    const handleResetPassword = (id: number, name: string) => {
        if (confirm(`Are you sure you want to reset password for "${name}"?`)) {
            router.post(`/users/${id}/reset-password`);
        }
    };

    const handleSendCredentials = (id: number, name: string) => {
        if (confirm(`"${name}" এর login credentials ইমেইল করা হবে. নিশ্চিত?`)) {
            router.post(`/users/${id}/send-credentials`);
        }
    };

    const handleOpenBulkMailModal = () => {
        setExcludeRoleIds([]);
        setBulkMailModalOpen(true);
    };

    const toggleExcludeRole = (roleId: number) => {
        setExcludeRoleIds((prev) =>
            prev.includes(roleId)
                ? prev.filter((id) => id !== roleId)
                : [...prev, roleId],
        );
    };

    const handleSendAllCredentials = () => {
        router.post(
            '/users/send-credentials-all',
            { exclude_role_ids: excludeRoleIds },
            {
                onSuccess: () => setBulkMailModalOpen(false),
            },
        );
    };

    const handleOpenBranchSummaryModal = () => {
        setSelectedBranchIdForSummary(filterBranch || '');
        setTargetEmailForSummary('');
        setBranchSummaryModalOpen(true);
    };

    const handleSendBranchSummary = () => {
        if (!selectedBranchIdForSummary) {
            alert('Please select a branch or All Branches.');
            return;
        }

        const isAll = selectedBranchIdForSummary === 'all';

        router.post(
            '/users/send-branch-summary',
            {
                branch_id: isAll ? undefined : selectedBranchIdForSummary,
                email: isAll ? undefined : targetEmailForSummary || undefined,
                all_branches: isAll,
            },
            {
                onSuccess: () => setBranchSummaryModalOpen(false),
            },
        );
    };

    // Filter handlers
    const applyFilters = (newParams?: Record<string, string>) => {
        const queryParams = {
            search: searchQuery,
            role_id: filterRole,
            zone_id: filterZone,
            area_id: filterArea,
            branch_id: filterBranch,
            is_active: filterStatus,
            ...newParams,
        };

        // Clean empty keys
        Object.keys(queryParams).forEach((key) => {
            if (!queryParams[key as keyof typeof queryParams]) {
                delete queryParams[key as keyof typeof queryParams];
            }
        });

        router.get('/users', queryParams, {
            preserveState: true,
            replace: true,
        });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const handleStatusTabClick = (statusVal: string) => {
        setFilterStatus(statusVal);
        applyFilters({ is_active: statusVal });
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setFilterRole('');
        setFilterZone('');
        setFilterArea('');
        setFilterBranch('');
        setFilterStatus('');
        router.get('/users', {}, { preserveState: true, replace: true });
    };

    const handleRemoveIndividualFilter = (key: string) => {
        let updatedSearch = searchQuery;
        let updatedRole = filterRole;
        let updatedZone = filterZone;
        let updatedArea = filterArea;
        let updatedBranch = filterBranch;
        let updatedStatus = filterStatus;

        if (key === 'search') {
            updatedSearch = '';
            setSearchQuery('');
        } else if (key === 'role_id') {
            updatedRole = '';
            setFilterRole('');
        } else if (key === 'zone_id') {
            updatedZone = '';
            updatedArea = '';
            updatedBranch = '';
            setFilterZone('');
            setFilterArea('');
            setFilterBranch('');
        } else if (key === 'area_id') {
            updatedArea = '';
            updatedBranch = '';
            setFilterArea('');
            setFilterBranch('');
        } else if (key === 'branch_id') {
            updatedBranch = '';
            setFilterBranch('');
        } else if (key === 'is_active') {
            updatedStatus = '';
            setFilterStatus('');
        }

        applyFilters({
            search: updatedSearch,
            role_id: updatedRole,
            zone_id: updatedZone,
            area_id: updatedArea,
            branch_id: updatedBranch,
            is_active: updatedStatus,
        });
    };

    const handleOpenSignaturePicker = (userId: number) => {
        const input = fileInputRefs.current[userId];
        if (input) {
            input.click();
        }
    };

    const handleSignatureChange = (
        userId: number,
        event: ChangeEvent<HTMLInputElement>,
    ) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData: Record<string, any> = {
            signature: file,
        };

        router.post(`/users/${userId}/signature`, formData, {
            forceFormData: true,
        });

        event.target.value = '';
    };

    // Helper for role color badges
    const getRoleBadgeStyle = (roleName: string) => {
        switch (roleName) {
            case 'super_admin':
            case 'admin':
            case 'head_office':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'branch_manager':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'field_officer':
                return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'zone_manager':
            case 'area_manager':
                return 'bg-amber-100 text-amber-800 border-amber-200';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <AdminLayout>
            <Head title="User Management" />

            <ConfigurationPage>
                {/* Header */}
                <ConfigurationHeader
                    title="User Management"
                    description="Manage user roles, access control, branch assignments, credentials, and digital signatures."
                    icon={UsersRound}
                    actions={
                        canMutate ? (
                            <>
                                {hrmSyncEnabled && (
                                    <button
                                        type="button"
                                        onClick={handleSyncFromHrm}
                                        disabled={syncingFromHrm}
                                        className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/20 active:scale-98 disabled:opacity-60"
                                    >
                                        <RefreshCw
                                            className={`size-4 ${syncingFromHrm ? 'animate-spin' : ''}`}
                                        />
                                        {syncingFromHrm
                                            ? 'Syncing...'
                                            : 'Sync Officers from HRM'}
                                    </button>
                                )}
                                <button
                                    onClick={handleOpenBranchSummaryModal}
                                    className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/20 active:scale-98"
                                >
                                    <Send className="size-4" />
                                    Branch User List Mail
                                </button>
                                <button
                                    onClick={handleOpenBulkMailModal}
                                    className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/20 active:scale-98"
                                >
                                    <Mail className="size-4" />
                                    Send Login Info (All)
                                </button>
                                <button
                                    onClick={handleAddNew}
                                    className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-md shadow-blue-900/10 transition hover:bg-blue-50 active:scale-98"
                                >
                                    <Plus className="size-4" />
                                    Add New User
                                </button>
                            </>
                        ) : undefined
                    }
                />

                {/* KPI Metrics Summary Grid */}
                <StatGrid>
                    <StatCard
                        label="Total Registered Users"
                        value={stats?.total ?? users.total}
                        icon={UsersRound}
                        tone="blue"
                    />
                    <StatCard
                        label="Active Accounts"
                        value={stats?.active ?? '-'}
                        icon={UserCheck}
                        tone="green"
                    />
                    <StatCard
                        label="Inactive / Suspended"
                        value={stats?.inactive ?? '-'}
                        icon={UserX}
                        tone="orange"
                    />
                    <StatCard
                        label="Super Administrators"
                        value={stats?.super_admins ?? '-'}
                        icon={ShieldCheck}
                        tone="purple"
                    />
                </StatGrid>

                {/* Main Content Card */}
                <ConfigurationCard>
                    {/* Filter & Toolbar Area */}
                    <div className="space-y-4 border-b border-slate-200/80 bg-slate-50/80 p-4 sm:p-5">
                        {/* Top Bar: Search, Quick Tabs & Filter Toggle */}
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            {/* Quick Status Tabs */}
                            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-200/60 p-1">
                                <button
                                    type="button"
                                    onClick={() => handleStatusTabClick('')}
                                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                                        filterStatus === ''
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    All Users
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                        {stats?.total ?? users.total}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleStatusTabClick('1')}
                                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                                        filterStatus === '1'
                                            ? 'bg-emerald-600 text-white shadow-sm'
                                            : 'text-slate-600 hover:text-emerald-700'
                                    }`}
                                >
                                    <span className="size-1.5 rounded-full bg-emerald-400" />
                                    Active
                                    {stats?.active !== undefined && (
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                filterStatus === '1'
                                                    ? 'bg-emerald-700 text-white'
                                                    : 'bg-emerald-100 text-emerald-800'
                                            }`}
                                        >
                                            {stats.active}
                                        </span>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleStatusTabClick('0')}
                                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                                        filterStatus === '0'
                                            ? 'bg-slate-700 text-white shadow-sm'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <span className="size-1.5 rounded-full bg-slate-400" />
                                    Inactive
                                    {stats?.inactive !== undefined && (
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                filterStatus === '0'
                                                    ? 'bg-slate-800 text-slate-200'
                                                    : 'bg-slate-200 text-slate-700'
                                            }`}
                                        >
                                            {stats.inactive}
                                        </span>
                                    )}
                                </button>
                            </div>

                            {/* Search & Filter Controls */}
                            <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center lg:justify-end">
                                <form
                                    onSubmit={handleSearchSubmit}
                                    className="relative w-full sm:max-w-md"
                                >
                                    <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search name, username, email, phone..."
                                        value={searchQuery}
                                        onChange={(e) =>
                                            setSearchQuery(e.target.value)
                                        }
                                        className="h-10 w-full rounded-xl border border-slate-300 bg-white pr-9 pl-10 text-sm text-slate-900 shadow-sm transition outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearchQuery('');
                                                applyFilters({ search: '' });
                                            }}
                                            className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            <X className="size-4" />
                                        </button>
                                    )}
                                </form>

                                <button
                                    type="button"
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-all ${
                                        showFilters || activeFilterCount > 0
                                            ? 'border-blue-300 bg-blue-50 text-blue-700 shadow-sm'
                                            : 'border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-100'
                                    }`}
                                >
                                    <SlidersHorizontal className="size-4" />
                                    <span>Filters</span>
                                    {activeFilterCount > 0 && (
                                        <span className="flex size-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                                            {activeFilterCount}
                                        </span>
                                    )}
                                </button>

                                {activeFilterCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleClearFilters}
                                        className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                                        title="Reset all filters"
                                    >
                                        <RotateCcw className="size-3.5" />
                                        Reset
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Collapsible Advanced Filters Drawer */}
                        {showFilters && (
                            <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-sm transition-all">
                                <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                                    <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                                        <Filter className="size-3.5 text-blue-600" />
                                        Refine Users List
                                    </h4>
                                    <span className="text-xs font-medium text-slate-500">
                                        Showing {users.total} total matching
                                        records
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                                    {/* Role Filter */}
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                                            Role
                                        </label>
                                        <select
                                            value={filterRole}
                                            onChange={(e) =>
                                                setFilterRole(e.target.value)
                                            }
                                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                        >
                                            <option value="">All Roles</option>
                                            {roles.map((role) => (
                                                <option
                                                    key={role.id}
                                                    value={role.id}
                                                >
                                                    {role.display_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Zone Filter */}
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                                            Zone
                                        </label>
                                        <select
                                            value={filterZone}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setFilterZone(val);
                                                setFilterArea('');
                                                setFilterBranch('');
                                            }}
                                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                        >
                                            <option value="">All Zones</option>
                                            {zones.map((zone) => (
                                                <option
                                                    key={zone.id}
                                                    value={zone.id}
                                                >
                                                    {zone.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Area Filter */}
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                                            Area
                                        </label>
                                        <select
                                            value={filterArea}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setFilterArea(val);
                                                setFilterBranch('');
                                            }}
                                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                        >
                                            <option value="">
                                                {filterZone
                                                    ? 'All Areas in Zone'
                                                    : 'All Areas'}
                                            </option>
                                            {availableAreas.map((area) => (
                                                <option
                                                    key={area.id}
                                                    value={area.id}
                                                >
                                                    {area.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Branch Filter */}
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                                            Branch
                                        </label>
                                        <select
                                            value={filterBranch}
                                            onChange={(e) =>
                                                setFilterBranch(e.target.value)
                                            }
                                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                        >
                                            <option value="">
                                                {filterArea
                                                    ? 'All Branches in Area'
                                                    : 'All Branches'}
                                            </option>
                                            {availableBranches.map((branch) => (
                                                <option
                                                    key={branch.id}
                                                    value={branch.id}
                                                >
                                                    {branch.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Status Filter */}
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                                            Status
                                        </label>
                                        <select
                                            value={filterStatus}
                                            onChange={(e) =>
                                                setFilterStatus(e.target.value)
                                            }
                                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                        >
                                            <option value="">All Status</option>
                                            <option value="1">Active</option>
                                            <option value="0">Inactive</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                                    <button
                                        type="button"
                                        onClick={handleClearFilters}
                                        className="rounded-xl border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                    >
                                        Clear
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyFilters()}
                                        className="rounded-xl bg-blue-600 px-5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-98"
                                    >
                                        Apply Filters
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Active Filter Chips / Tags */}
                        {activeFiltersList.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <span className="text-xs font-semibold text-slate-500">
                                    Active Filters:
                                </span>
                                {activeFiltersList.map((item) => (
                                    <span
                                        key={item.key}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/80 px-2.5 py-1 text-xs font-medium text-blue-900 shadow-xs"
                                    >
                                        <span className="text-blue-600 font-semibold">
                                            {item.label}:
                                        </span>{' '}
                                        {item.value}
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleRemoveIndividualFilter(
                                                    item.key,
                                                )
                                            }
                                            className="ml-0.5 rounded-full p-0.5 text-blue-600 hover:bg-blue-200 hover:text-blue-900"
                                        >
                                            <X className="size-3" />
                                        </button>
                                    </span>
                                ))}

                                <button
                                    type="button"
                                    onClick={handleClearFilters}
                                    className="text-xs font-semibold text-blue-600 underline hover:text-blue-800"
                                >
                                    Clear all
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px]">
                            <thead className="border-b border-slate-200 bg-slate-50/90 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="px-6 py-3.5">User Identity</th>
                                    <th className="px-6 py-3.5">System Role</th>
                                    <th className="px-6 py-3.5">
                                        Organization / Scope
                                    </th>
                                    <th className="px-6 py-3.5">Contact Phone</th>
                                    <th className="px-6 py-3.5">Account Status</th>
                                    <th className="px-6 py-3.5 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white text-sm">
                                {users.data.map((user) => (
                                    <tr
                                        key={user.id}
                                        className="transition-colors hover:bg-blue-50/40"
                                    >
                                        {/* User Identity Column */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3.5">
                                                {/* Initials Avatar */}
                                                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-sm shadow-blue-500/20">
                                                    {user.name
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </div>
                                                <div className="min-w-0 space-y-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-slate-900">
                                                            {user.name}
                                                        </span>
                                                        {user.has_all_access && (
                                                            <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                                                                <Shield className="size-3" />
                                                                Super Admin
                                                            </span>
                                                        )}
                                                        {user.signature && (
                                                            <span
                                                                className="inline-flex items-center gap-1 text-teal-600"
                                                                title="Digital signature attached"
                                                            >
                                                                <FileCheck className="size-3.5" />
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 text-xs text-slate-500">
                                                        {user.username && (
                                                            <span className="font-mono text-slate-600">
                                                                @{user.username}
                                                            </span>
                                                        )}
                                                        <span className="flex items-center gap-1 text-slate-500">
                                                            <Mail className="size-3 text-slate-400" />
                                                            {user.email}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Role Column */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getRoleBadgeStyle(user.role.name)}`}
                                            >
                                                {user.role.display_name}
                                            </span>
                                        </td>

                                        {/* Organization / Scope Column */}
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-slate-800">
                                                {/* Single Primary Assignment */}
                                                {user.branch &&
                                                !user.branches?.length ? (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                                                            <Building className="size-3.5 text-blue-600" />
                                                            {user.branch.name}
                                                        </div>
                                                        <div className="flex items-center gap-1 text-slate-500">
                                                            <MapPin className="size-3 text-slate-400" />
                                                            {user.area?.name ||
                                                                '-'}{' '}
                                                            •{' '}
                                                            {user.zone?.name ||
                                                                '-'}
                                                        </div>
                                                    </div>
                                                ) : user.area &&
                                                  !user.areas?.length ? (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                                                            <MapPin className="size-3.5 text-amber-600" />
                                                            {user.area.name}
                                                        </div>
                                                        <div className="text-slate-500">
                                                            Zone:{' '}
                                                            {user.zone?.name}
                                                        </div>
                                                    </div>
                                                ) : user.zone &&
                                                  !user.zones?.length ? (
                                                    <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                                                        <Globe className="size-3.5 text-purple-600" />
                                                        {user.zone.name}
                                                    </div>
                                                ) : null}

                                                {/* Multi-Assignments Badges */}
                                                {(user.zones?.length ||
                                                    user.areas?.length ||
                                                    user.branches?.length) ? (
                                                    <div className="space-y-1.5">
                                                        {user.zones &&
                                                            user.zones.length >
                                                                0 && (
                                                                <div className="flex flex-wrap items-center gap-1">
                                                                    <span className="text-[11px] font-semibold text-slate-400">
                                                                        Zones:
                                                                    </span>
                                                                    {user.zones
                                                                        .slice(
                                                                            0,
                                                                            2,
                                                                        )
                                                                        .map(
                                                                            (
                                                                                z,
                                                                            ) => (
                                                                                <span
                                                                                    key={
                                                                                        z.id
                                                                                    }
                                                                                    className="rounded bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700"
                                                                                >
                                                                                    {
                                                                                        z.name
                                                                                    }
                                                                                </span>
                                                                            ),
                                                                        )}
                                                                    {user.zones
                                                                        .length >
                                                                        2 && (
                                                                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                                                                            +
                                                                            {user
                                                                                .zones
                                                                                .length -
                                                                                2}{' '}
                                                                            more
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        {user.areas &&
                                                            user.areas.length >
                                                                0 && (
                                                                <div className="flex flex-wrap items-center gap-1">
                                                                    <span className="text-[11px] font-semibold text-slate-400">
                                                                        Areas:
                                                                    </span>
                                                                    {user.areas
                                                                        .slice(
                                                                            0,
                                                                            2,
                                                                        )
                                                                        .map(
                                                                            (
                                                                                a,
                                                                            ) => (
                                                                                <span
                                                                                    key={
                                                                                        a.id
                                                                                    }
                                                                                    className="rounded bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700"
                                                                                >
                                                                                    {
                                                                                        a.name
                                                                                    }
                                                                                </span>
                                                                            ),
                                                                        )}
                                                                    {user.areas
                                                                        .length >
                                                                        2 && (
                                                                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                                                                            +
                                                                            {user
                                                                                .areas
                                                                                .length -
                                                                                2}{' '}
                                                                            more
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        {user.branches &&
                                                            user.branches
                                                                .length > 0 && (
                                                                <div className="flex flex-wrap items-center gap-1">
                                                                    <span className="text-[11px] font-semibold text-slate-400">
                                                                        Branches:
                                                                    </span>
                                                                    {user.branches
                                                                        .slice(
                                                                            0,
                                                                            2,
                                                                        )
                                                                        .map(
                                                                            (
                                                                                b,
                                                                            ) => (
                                                                                <span
                                                                                    key={
                                                                                        b.id
                                                                                    }
                                                                                    className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
                                                                                >
                                                                                    {
                                                                                        b.name
                                                                                    }
                                                                                </span>
                                                                            ),
                                                                        )}
                                                                    {user
                                                                        .branches
                                                                        .length >
                                                                        2 && (
                                                                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                                                                            +
                                                                            {user
                                                                                .branches
                                                                                .length -
                                                                                2}{' '}
                                                                            more
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                    </div>
                                                ) : null}

                                                {!user.branch &&
                                                    !user.area &&
                                                    !user.zone &&
                                                    !user.branches?.length &&
                                                    !user.areas?.length &&
                                                    !user.zones?.length && (
                                                        <span className="text-slate-400">
                                                            All Access / Global
                                                        </span>
                                                    )}
                                            </div>
                                        </td>

                                        {/* Phone Column */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {user.phone ? (
                                                <div className="flex items-center gap-1.5 text-slate-700">
                                                    <Phone className="size-3.5 text-slate-400" />
                                                    <span>{user.phone}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">
                                                    —
                                                </span>
                                            )}
                                        </td>

                                        {/* Status Column */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <StatusBadge
                                                active={user.is_active}
                                            />
                                        </td>

                                        {/* Actions Column */}
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1">
                                                {canMutate ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleToggleStatus(
                                                                    user.id,
                                                                )
                                                            }
                                                            className={`flex size-8 items-center justify-center rounded-lg transition-colors ${
                                                                user.is_active
                                                                    ? 'text-emerald-600 hover:bg-emerald-50'
                                                                    : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                                            }`}
                                                            title={
                                                                user.is_active
                                                                    ? 'Deactivate User'
                                                                    : 'Activate User'
                                                            }
                                                        >
                                                            {user.is_active ? (
                                                                <ToggleRight className="size-5" />
                                                            ) : (
                                                                <ToggleLeft className="size-5" />
                                                            )}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleEdit(user)
                                                            }
                                                            className="flex size-8 items-center justify-center rounded-lg text-blue-600 transition-colors hover:bg-blue-50"
                                                            title="Edit User Profile"
                                                        >
                                                            <Edit className="size-4" />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleResetPassword(
                                                                    user.id,
                                                                    user.name,
                                                                )
                                                            }
                                                            className="flex size-8 items-center justify-center rounded-lg text-amber-600 transition-colors hover:bg-amber-50"
                                                            title="Reset Password"
                                                        >
                                                            <KeyRound className="size-4" />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleSendCredentials(
                                                                    user.id,
                                                                    user.name,
                                                                )
                                                            }
                                                            className="flex size-8 items-center justify-center rounded-lg text-indigo-600 transition-colors hover:bg-indigo-50"
                                                            title="Send Credentials Email"
                                                        >
                                                            <Send className="size-4" />
                                                        </button>

                                                        {canUpdateSignature && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleOpenSignaturePicker(
                                                                            user.id,
                                                                        )
                                                                    }
                                                                    className="flex size-8 items-center justify-center rounded-lg text-teal-600 transition-colors hover:bg-teal-50"
                                                                    title="Upload / Change Digital Signature"
                                                                >
                                                                    <PenTool className="size-4" />
                                                                </button>
                                                                <input
                                                                    type="file"
                                                                    accept="image/png,image/jpg,image/jpeg,image/gif"
                                                                    className="hidden"
                                                                    ref={(
                                                                        el,
                                                                    ) => {
                                                                        fileInputRefs.current[
                                                                            user.id
                                                                        ] = el;
                                                                    }}
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        handleSignatureChange(
                                                                            user.id,
                                                                            e,
                                                                        )
                                                                    }
                                                                />
                                                            </>
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    user.id,
                                                                    user.name,
                                                                )
                                                            }
                                                            className="flex size-8 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50"
                                                            title="Delete User"
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-slate-400">
                                                        View mode
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {users.data.length === 0 && (
                            <EmptyState
                                icon={UsersRound}
                                title="No users matched your criteria"
                                description="Try adjusting your search query, role, or branch filters."
                            />
                        )}
                    </div>

                    {/* Pagination */}
                    <ServerPagination
                        links={users.links}
                        summary={`Showing ${users.data.length} of ${users.total} users (Page ${users.current_page} of ${users.last_page})`}
                        perPage={users.per_page || 50}
                        onPerPageChange={(size) => {
                            applyFilters({ per_page: size.toString() });
                        }}
                    />
                </ConfigurationCard>
            </ConfigurationPage>

            {/* Bulk Credentials Mail Modal */}
            {bulkMailModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
                    <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
                            <div className="flex items-center gap-2">
                                <Mail className="size-5 text-blue-600" />
                                <h3 className="font-semibold text-slate-900">
                                    Bulk Mail – Send Credentials
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setBulkMailModalOpen(false)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                            >
                                <X className="size-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="mb-4 text-xs leading-relaxed text-slate-600">
                                Select any roles you wish to <strong>exclude</strong> from the bulk email dispatch. Excluded roles will not receive login info.
                            </p>
                            <div className="mb-5 max-h-52 space-y-2 overflow-y-auto pr-1">
                                {roles.map((role) => (
                                    <label
                                        key={role.id}
                                        className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200/80 p-3 transition hover:bg-slate-50"
                                    >
                                        <span className="text-xs font-semibold text-slate-800">
                                            {role.display_name}
                                        </span>
                                        <input
                                            type="checkbox"
                                            checked={excludeRoleIds.includes(
                                                role.id,
                                            )}
                                            onChange={() =>
                                                toggleExcludeRole(role.id)
                                            }
                                            className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </label>
                                ))}
                            </div>
                            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setBulkMailModalOpen(false)}
                                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSendAllCredentials}
                                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-98"
                                >
                                    <Send className="size-4" />
                                    Send Bulk Mails
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Branch Summary Mail Modal */}
            {branchSummaryModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
                    <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
                            <div className="flex items-center gap-2">
                                <Building className="size-5 text-teal-600" />
                                <h3 className="font-semibold text-slate-900">
                                    Branch User List Email
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setBranchSummaryModalOpen(false)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                            >
                                <X className="size-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-xs leading-relaxed text-slate-600">
                                Selected branch user details (Branch Manager, Field Officers, Staff) will be generated as a formatted table and emailed.
                            </p>
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                    Select Target Branch
                                </label>
                                <select
                                    value={selectedBranchIdForSummary}
                                    onChange={(e) =>
                                        setSelectedBranchIdForSummary(
                                            e.target.value,
                                        )
                                    }
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                                >
                                    <option value="">-- Select Branch --</option>
                                    <option value="all">
                                        All Branches (send separate mail per branch)
                                    </option>
                                    {branches.map((branch) => (
                                        <option
                                            key={branch.id}
                                            value={branch.id}
                                        >
                                            {branch.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                    Target Custom Email (Optional)
                                </label>
                                <input
                                    type="email"
                                    value={targetEmailForSummary}
                                    onChange={(e) =>
                                        setTargetEmailForSummary(e.target.value)
                                    }
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                                    placeholder="Leave blank to use default branch email address"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setBranchSummaryModalOpen(false)}
                                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSendBranchSummary}
                                    className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 active:scale-98"
                                >
                                    <Send className="size-4" />
                                    Send Email
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* User Edit / Create Modal */}
            <UserModal
                isOpen={userModalOpen}
                onClose={() => setUserModalOpen(false)}
                user={selectedUser}
                roles={roles}
                zones={zones}
                areas={areas}
                branches={branches}
            />
        </AdminLayout>
    );
}
