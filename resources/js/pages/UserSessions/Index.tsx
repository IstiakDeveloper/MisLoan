import {
    ConfigurationCard,
    ConfigurationHeader,
    ConfigurationPage,
    EmptyState,
    StatCard,
    StatGrid,
} from '@/components/configuration';
import AdminLayout from '@/layouts/admin-layout';
import { Head, Link, router } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    Check,
    Copy,
    Filter,
    Globe,
    Laptop,
    LogOut,
    Monitor,
    RefreshCw,
    Search,
    Shield,
    ShieldAlert,
    Smartphone,
    Tablet,
    UserCheck,
    UsersRound,
    X,
} from 'lucide-react';
import { ChangeEvent, useMemo, useState } from 'react';

interface Role {
    id: number;
    name: string;
    display_name: string;
}

interface Branch {
    id: number;
    name: string;
    code: string;
}

interface UserSessionItem {
    id: string;
    user_id: number;
    ip_address: string;
    user_agent: string | null;
    device: string;
    device_type: 'desktop' | 'mobile' | 'tablet';
    platform: string;
    browser: string;
    last_activity: number;
    last_activity_formatted: string;
    last_activity_human: string;
    status: 'active' | 'idle' | 'inactive';
    is_current: boolean;
    user: {
        id: number;
        name: string;
        username: string;
        email: string | null;
        phone: string | null;
        is_active: boolean;
        has_all_access: boolean;
        avatar: string | null;
        role: {
            id: number;
            name: string;
            display_name: string;
        } | null;
        branch: {
            id: number;
            name: string;
            code: string;
        } | null;
        area: {
            id: number;
            name: string;
        } | null;
        zone: {
            id: number;
            name: string;
        } | null;
    } | null;
}

interface SessionStats {
    total_sessions: number;
    online_users: number;
    desktop_sessions: number;
    mobile_sessions: number;
    idle_sessions: number;
}

interface Props {
    sessions: UserSessionItem[];
    stats: SessionStats;
    roles: Role[];
    branches: Branch[];
    filters: {
        search?: string;
        role_id?: string;
        branch_id?: string;
        device_type?: string;
        status?: string;
    };
}

export default function Index({ sessions, stats, roles, branches, filters }: Props) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [filterRole, setFilterRole] = useState(filters.role_id || '');
    const [filterBranch, setFilterBranch] = useState(filters.branch_id || '');
    const [filterDevice, setFilterDevice] = useState(filters.device_type || '');
    const [filterStatus, setFilterStatus] = useState(filters.status || '');
    const [showFilters, setShowFilters] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Modals
    const [sessionToTerminate, setSessionToTerminate] = useState<UserSessionItem | null>(null);
    const [userToTerminateAll, setUserToTerminateAll] = useState<UserSessionItem['user'] | null>(null);
    const [terminateAllOthersModalOpen, setTerminateAllOthersModalOpen] = useState(false);
    const [copiedIp, setCopiedIp] = useState<string | null>(null);

    const hasActiveFilters = Boolean(
        searchQuery || filterRole || filterBranch || filterDevice || filterStatus,
    );

    const applyFilters = (overrides?: Partial<typeof filters>) => {
        const nextFilters = {
            search: searchQuery,
            role_id: filterRole,
            branch_id: filterBranch,
            device_type: filterDevice,
            status: filterStatus,
            ...overrides,
        };

        const cleaned: Record<string, string> = {};
        Object.entries(nextFilters).forEach(([k, v]) => {
            if (v) cleaned[k] = v;
        });

        router.get('/user-sessions', cleaned, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters({ search: searchQuery });
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setFilterRole('');
        setFilterBranch('');
        setFilterDevice('');
        setFilterStatus('');
        router.get('/user-sessions', {}, { preserveState: true, preserveScroll: true });
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.reload({
            onFinish: () => setIsRefreshing(false),
        });
    };

    const handleCopyIp = (ip: string) => {
        navigator.clipboard.writeText(ip);
        setCopiedIp(ip);
        setTimeout(() => setCopiedIp(null), 2000);
    };

    const confirmTerminateSession = () => {
        if (!sessionToTerminate) return;
        router.delete(`/user-sessions/${sessionToTerminate.id}`, {
            preserveScroll: true,
            onFinish: () => setSessionToTerminate(null),
        });
    };

    const confirmTerminateUserSessions = () => {
        if (!userToTerminateAll) return;
        router.post(`/user-sessions/destroy-user/${userToTerminateAll.id}`, {}, {
            preserveScroll: true,
            onFinish: () => setUserToTerminateAll(null),
        });
    };

    const confirmTerminateAllOthers = () => {
        router.post('/user-sessions/destroy-all-others', {}, {
            preserveScroll: true,
            onFinish: () => setTerminateAllOthersModalOpen(false),
        });
    };

    const getDeviceIcon = (deviceType: string) => {
        switch (deviceType) {
            case 'mobile':
                return <Smartphone className="size-4 text-amber-600" />;
            case 'tablet':
                return <Tablet className="size-4 text-indigo-600" />;
            default:
                return <Monitor className="size-4 text-blue-600" />;
        }
    };

    return (
        <AdminLayout>
            <Head title="Active User Sessions" />

            <ConfigurationPage>
                {/* Header */}
                <ConfigurationHeader
                    title="Active User Sessions"
                    description="Monitor real-time logged-in users, device details, IP addresses, and manage session termination."
                    icon={Activity}
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href="/users"
                                className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs sm:text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/20 active:scale-98"
                            >
                                <UsersRound className="size-4" />
                                User Management
                            </Link>

                            <button
                                type="button"
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs sm:text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/20 active:scale-98 disabled:opacity-60"
                                title="Refresh active sessions"
                            >
                                <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                <span className="hidden sm:inline">Refresh</span>
                            </button>

                            {sessions.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => setTerminateAllOthersModalOpen(true)}
                                    className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-md shadow-rose-900/20 transition hover:bg-rose-700 active:scale-98"
                                >
                                    <ShieldAlert className="size-4" />
                                    Logout Other Sessions
                                </button>
                            )}
                        </div>
                    }
                />

                {/* KPI Metrics Summary Grid */}
                <StatGrid>
                    <StatCard
                        label="Active Sessions"
                        value={stats.total_sessions}
                        icon={Activity}
                        tone="blue"
                    />
                    <StatCard
                        label="Logged-in Users"
                        value={stats.online_users}
                        icon={UserCheck}
                        tone="green"
                    />
                    <StatCard
                        label="Desktop Browsers"
                        value={stats.desktop_sessions}
                        icon={Monitor}
                        tone="purple"
                    />
                    <StatCard
                        label="Mobile / Tablets"
                        value={stats.mobile_sessions}
                        icon={Smartphone}
                        tone="orange"
                    />
                </StatGrid>

                {/* Main Content Card */}
                <ConfigurationCard>
                    {/* Filter & Toolbar Area */}
                    <div className="space-y-4 border-b border-slate-200/80 bg-slate-50/80 p-4 sm:p-5">
                        {/* Top Bar: Search & Quick Status Tabs */}
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            {/* Quick Status Tabs */}
                            <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-200/60 p-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFilterStatus('');
                                        setFilterDevice('');
                                        applyFilters({ status: '', device_type: '' });
                                    }}
                                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                                        filterStatus === '' && filterDevice === ''
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    All Sessions
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                        {stats.total_sessions}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setFilterStatus('active');
                                        setFilterDevice('');
                                        applyFilters({ status: 'active', device_type: '' });
                                    }}
                                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                                        filterStatus === 'active'
                                            ? 'bg-emerald-600 text-white shadow-sm'
                                            : 'text-slate-600 hover:text-emerald-700'
                                    }`}
                                >
                                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Active Now
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                            filterStatus === 'active'
                                                ? 'bg-emerald-700 text-white'
                                                : 'bg-emerald-100 text-emerald-800'
                                        }`}
                                    >
                                        {stats.total_sessions - stats.idle_sessions}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setFilterStatus('idle');
                                        setFilterDevice('');
                                        applyFilters({ status: 'idle', device_type: '' });
                                    }}
                                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                                        filterStatus === 'idle'
                                            ? 'bg-amber-600 text-white shadow-sm'
                                            : 'text-slate-600 hover:text-amber-700'
                                    }`}
                                >
                                    <span className="size-1.5 rounded-full bg-amber-400" />
                                    Idle (5-30m)
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                            filterStatus === 'idle'
                                                ? 'bg-amber-700 text-white'
                                                : 'bg-amber-100 text-amber-800'
                                        }`}
                                    >
                                        {stats.idle_sessions}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setFilterDevice('mobile');
                                        setFilterStatus('');
                                        applyFilters({ device_type: 'mobile', status: '' });
                                    }}
                                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                                        filterDevice === 'mobile'
                                            ? 'bg-orange-600 text-white shadow-sm'
                                            : 'text-slate-600 hover:text-orange-700'
                                    }`}
                                >
                                    <Smartphone className="size-3" />
                                    Mobile
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                            filterDevice === 'mobile'
                                                ? 'bg-orange-700 text-white'
                                                : 'bg-orange-100 text-orange-800'
                                        }`}
                                    >
                                        {stats.mobile_sessions}
                                    </span>
                                </button>
                            </div>

                            {/* Search & Toggle Filters Button */}
                            <div className="flex items-center gap-2">
                                <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-72">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search user, IP, branch..."
                                        value={searchQuery}
                                        onChange={handleSearchChange}
                                        className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs sm:text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearchQuery('');
                                                applyFilters({ search: '' });
                                            }}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            <X className="size-3.5" />
                                        </button>
                                    )}
                                </form>

                                <button
                                    type="button"
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs sm:text-sm font-semibold transition-all ${
                                        showFilters || filterRole || filterBranch
                                            ? 'border-blue-300 bg-blue-50 text-blue-700 shadow-sm'
                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    <Filter className="size-3.5" />
                                    <span>Filter</span>
                                    {(filterRole || filterBranch) && (
                                        <span className="size-2 rounded-full bg-blue-600" />
                                    )}
                                </button>

                                {hasActiveFilters && (
                                    <button
                                        type="button"
                                        onClick={handleClearFilters}
                                        className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-500 hover:bg-slate-50 hover:text-rose-600"
                                        title="Clear all filters"
                                    >
                                        <X className="size-3.5" />
                                        <span className="hidden sm:inline">Reset</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Expandable Advanced Filters */}
                        {showFilters && (
                            <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5 sm:grid-cols-3">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                                        Role
                                    </label>
                                    <select
                                        value={filterRole}
                                        onChange={(e) => {
                                            setFilterRole(e.target.value);
                                            applyFilters({ role_id: e.target.value });
                                        }}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-1.5 px-2.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="">All Roles</option>
                                        {roles.map((r) => (
                                            <option key={r.id} value={r.id}>
                                                {r.display_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                                        Branch
                                    </label>
                                    <select
                                        value={filterBranch}
                                        onChange={(e) => {
                                            setFilterBranch(e.target.value);
                                            applyFilters({ branch_id: e.target.value });
                                        }}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-1.5 px-2.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="">All Branches</option>
                                        {branches.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.name} ({b.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                                        Device Type
                                    </label>
                                    <select
                                        value={filterDevice}
                                        onChange={(e) => {
                                            setFilterDevice(e.target.value);
                                            applyFilters({ device_type: e.target.value });
                                        }}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-1.5 px-2.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="">All Devices</option>
                                        <option value="desktop">Desktop / Laptop</option>
                                        <option value="mobile">Mobile Phone</option>
                                        <option value="tablet">Tablet / iPad</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sessions Table */}
                    {sessions.length === 0 ? (
                        <EmptyState
                            icon={Activity}
                            title="No Active Sessions Found"
                            description={
                                hasActiveFilters
                                    ? 'No logged-in user sessions match your search or filter criteria.'
                                    : 'There are currently no active user sessions recorded in the system.'
                            }
                            action={
                                hasActiveFilters ? (
                                    <button
                                        type="button"
                                        onClick={handleClearFilters}
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
                                    >
                                        Clear Filters
                                    </button>
                                ) : undefined
                            }
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs sm:text-sm">
                                <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    <tr>
                                        <th scope="col" className="py-3 px-4 sm:px-6">
                                            User Account
                                        </th>
                                        <th scope="col" className="py-3 px-4">
                                            Role & Office
                                        </th>
                                        <th scope="col" className="py-3 px-4">
                                            Device & Client
                                        </th>
                                        <th scope="col" className="py-3 px-4">
                                            IP Address
                                        </th>
                                        <th scope="col" className="py-3 px-4">
                                            Last Activity
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-center">
                                            Status
                                        </th>
                                        <th scope="col" className="py-3 px-4 sm:px-6 text-right">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {sessions.map((item) => {
                                        const user = item.user;
                                        return (
                                            <tr
                                                key={item.id}
                                                className={`transition-colors hover:bg-slate-50/80 ${
                                                    item.is_current ? 'bg-blue-50/40' : ''
                                                }`}
                                            >
                                                {/* User Info */}
                                                <td className="py-3.5 px-4 sm:px-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                            {user?.avatar ? (
                                                                <img
                                                                    src={user.avatar}
                                                                    alt={user.name}
                                                                    className="size-9 rounded-full object-cover ring-2 ring-slate-100"
                                                                />
                                                            ) : (
                                                                <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 font-bold text-white text-xs shadow-sm">
                                                                    {user?.name
                                                                        ? user.name.slice(0, 2).toUpperCase()
                                                                        : '??'}
                                                                </div>
                                                            )}
                                                            <span
                                                                className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white ${
                                                                    item.status === 'active'
                                                                        ? 'bg-emerald-500'
                                                                        : 'bg-amber-400'
                                                                }`}
                                                                title={
                                                                    item.status === 'active'
                                                                        ? 'Online Active'
                                                                        : 'Idle'
                                                                }
                                                            />
                                                        </div>

                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-1.5 font-bold text-slate-900 truncate">
                                                                <span>{user?.name ?? 'Unknown User'}</span>
                                                                {item.is_current && (
                                                                    <span className="inline-flex items-center rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                                                                        You
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-[11px] text-slate-500 truncate flex items-center gap-2">
                                                                <span>@{user?.username ?? '-'}</span>
                                                                {user?.phone && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span>{user.phone}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Role & Office */}
                                                <td className="py-3.5 px-4">
                                                    <div className="space-y-1">
                                                        <div className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                                                            <Shield className="size-3 text-slate-500" />
                                                            {user?.role?.display_name ?? 'No Role'}
                                                        </div>
                                                        {user?.branch && (
                                                            <div className="text-[11px] text-slate-500 truncate">
                                                                {user.branch.name} ({user.branch.code})
                                                            </div>
                                                        )}
                                                        {!user?.branch && (user?.area || user?.zone) && (
                                                            <div className="text-[11px] text-slate-500 truncate">
                                                                {user.area?.name ?? user.zone?.name}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Device & Client */}
                                                <td className="py-3.5 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="rounded-lg bg-slate-100 p-2">
                                                            {getDeviceIcon(item.device_type)}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-slate-800 text-xs">
                                                                {item.browser}
                                                            </div>
                                                            <div className="text-[11px] text-slate-500">
                                                                {item.platform} • {item.device}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* IP Address */}
                                                <td className="py-3.5 px-4">
                                                    <div className="flex items-center gap-1.5 font-mono text-xs text-slate-700">
                                                        <Globe className="size-3.5 text-slate-400" />
                                                        <span>{item.ip_address}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopyIp(item.ip_address)}
                                                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                                                            title="Copy IP"
                                                        >
                                                            {copiedIp === item.ip_address ? (
                                                                <Check className="size-3 text-emerald-600" />
                                                            ) : (
                                                                <Copy className="size-3" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </td>

                                                {/* Last Activity */}
                                                <td className="py-3.5 px-4">
                                                    <div className="space-y-0.5">
                                                        <div className="font-semibold text-slate-800 text-xs">
                                                            {item.last_activity_human}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400">
                                                            {item.last_activity_formatted}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Status Badge */}
                                                <td className="py-3.5 px-4 text-center">
                                                    {item.status === 'active' ? (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/60">
                                                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                            Active
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200/60">
                                                            <span className="size-1.5 rounded-full bg-amber-500" />
                                                            Idle
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Actions */}
                                                <td className="py-3.5 px-4 sm:px-6 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {item.is_current ? (
                                                            <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-400">
                                                                Current Session
                                                            </span>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSessionToTerminate(item)}
                                                                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 active:scale-95"
                                                                    title="Force logout this device session"
                                                                >
                                                                    <LogOut className="size-3.5" />
                                                                    <span>Logout Device</span>
                                                                </button>

                                                                {user && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setUserToTerminateAll(user)}
                                                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-rose-600 active:scale-95"
                                                                        title="Terminate all sessions for this user"
                                                                    >
                                                                        <span>All</span>
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </ConfigurationCard>
            </ConfigurationPage>

            {/* Terminate Single Session Confirmation Modal */}
            {sessionToTerminate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex size-11 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                                <LogOut className="size-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    Terminate User Session?
                                </h3>
                                <p className="text-xs text-slate-500">
                                    সেশনটি এখনই বন্ধ করতে চান?
                                </p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1.5 text-xs text-slate-700">
                            <div>
                                <span className="font-semibold text-slate-500">User: </span>
                                <span className="font-bold text-slate-900">
                                    {sessionToTerminate.user?.name} (@{sessionToTerminate.user?.username})
                                </span>
                            </div>
                            <div>
                                <span className="font-semibold text-slate-500">Client: </span>
                                <span>
                                    {sessionToTerminate.browser} on {sessionToTerminate.platform}
                                </span>
                            </div>
                            <div>
                                <span className="font-semibold text-slate-500">IP Address: </span>
                                <span className="font-mono">{sessionToTerminate.ip_address}</span>
                            </div>
                        </div>

                        <p className="text-xs text-slate-600">
                            This will immediately log out this device. The user will be redirected to the login page on their next interaction.
                        </p>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setSessionToTerminate(null)}
                                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmTerminateSession}
                                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
                            >
                                Confirm Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Terminate All Sessions for Specific User Modal */}
            {userToTerminateAll && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex size-11 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                                <ShieldAlert className="size-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    Logout All Sessions for User?
                                </h3>
                                <p className="text-xs text-slate-500">
                                    এই ব্যবহারকারীর সকল সক্রিয় ডিভাইস থেকে লগআউট করুন
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">
                            Are you sure you want to terminate all active sessions for{' '}
                            <strong className="text-slate-900 font-bold">{userToTerminateAll.name}</strong>?
                            They will be immediately logged out from all phones, tablets, and computers.
                        </p>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setUserToTerminateAll(null)}
                                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmTerminateUserSessions}
                                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
                            >
                                Terminate All Sessions
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Terminate All Other Sessions Modal */}
            {terminateAllOthersModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex size-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                                <AlertTriangle className="size-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    Logout All Other Sessions?
                                </h3>
                                <p className="text-xs text-slate-500">
                                    অন্যান্য সকল ব্যবহারকারীর সেশন বন্ধ করুন
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">
                            This action will forcibly log out <strong>all other active sessions</strong> across the system except your current device session.
                            Users will need to log in again to continue working.
                        </p>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setTerminateAllOthersModalOpen(false)}
                                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmTerminateAllOthers}
                                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
                            >
                                Logout All Others
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
