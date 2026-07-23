import {
    ConfigurationCard,
    ConfigurationHeader,
    ConfigurationPage,
    EmptyState,
    ServerPagination,
    StatusBadge,
} from '@/components/configuration';
import { useCanMutate } from '@/hooks/use-can-mutate';
import AdminLayout from '@/layouts/admin-layout';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Edit,
    Filter,
    KeyRound,
    MoreVertical,
    Plus,
    Power,
    PowerOff,
    Search,
    Send,
    Trash2,
    UsersRound,
    X,
    ToggleLeft,
    ToggleRight,
    PenTool,
} from 'lucide-react';
import { ChangeEvent, useRef, useState } from 'react';
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

interface Props {
    users: PaginatedUsers;
    roles: Role[];
    zones: Zone[];
    areas: Area[];
    branches: Branch[];
    filters: {
        search?: string;
        role_id?: string;
        zone_id?: string;
        area_id?: string;
        branch_id?: string;
        is_active?: string;
    };
}

export default function Index({
    users,
    roles,
    zones,
    areas,
    branches,
    filters,
}: Props) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [openDropdown, setOpenDropdown] = useState<number | null>(null);
    const [userModalOpen, setUserModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showFilters, setShowFilters] = useState(false);

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

    const handleAddNew = () => {
        setSelectedUser(null);
        setUserModalOpen(true);
    };

    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setUserModalOpen(true);
        setOpenDropdown(null);
    };

    const handleDelete = (id: number, name: string) => {
        if (confirm(`Are you sure you want to delete user "${name}"?`)) {
            router.delete(`/users/${id}`);
        }
        setOpenDropdown(null);
    };

    const handleToggleStatus = (id: number) => {
        router.patch(`/users/${id}/toggle-status`);
        setOpenDropdown(null);
    };

    const handleResetPassword = (id: number, name: string) => {
        if (confirm(`Are you sure you want to reset password for "${name}"?`)) {
            router.post(`/users/${id}/reset-password`);
        }
        setOpenDropdown(null);
    };

    const handleSendCredentials = (id: number, name: string) => {
        if (confirm(`"${name}" এর login credentials ইমেইল করা হবে. নিশ্চিত?`)) {
            router.post(`/users/${id}/send-credentials`);
        }
        setOpenDropdown(null);
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

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/users', { search: searchQuery }, { preserveState: true });
    };

    const handleFilter = () => {
        router.get(
            '/users',
            {
                search: searchQuery,
                role_id: filterRole,
                zone_id: filterZone,
                area_id: filterArea,
                branch_id: filterBranch,
                is_active: filterStatus,
            },
            { preserveState: true },
        );
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setFilterRole('');
        setFilterZone('');
        setFilterArea('');
        setFilterBranch('');
        setFilterStatus('');
        router.get('/users');
    };

    const handlePageChange = (url: string | null) => {
        if (url) {
            router.get(url);
        }
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

        // reset value so same file can be re-selected if needed
        event.target.value = '';
        setOpenDropdown(null);
    };

    return (
        <AdminLayout>
            <Head title="User Management" />

            <ConfigurationPage>
                <ConfigurationHeader
                    title="User Management"
                    description="Manage user access, organizational assignments, credentials, and signatures."
                    icon={UsersRound}
                    actions={
                        canMutate ? (
                        <>
                            <button
                                onClick={handleOpenBranchSummaryModal}
                                className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/20 sm:flex-none"
                            >
                                <Send className="h-4 w-4" />
                                Branch User List Mail
                            </button>
                            <button
                                onClick={handleOpenBulkMailModal}
                                className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/20 sm:flex-none"
                            >
                                <Send className="h-4 w-4" />
                                Send Login Info (All)
                            </button>
                            <button
                                onClick={handleAddNew}
                                className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50 sm:flex-none"
                            >
                                <Plus className="h-4 w-4" />
                                Add New User
                            </button>
                        </>
                        ) : undefined
                    }
                />

                {/* Content Card */}
                <ConfigurationCard>
                    {/* Search & Filters */}
                    <div className="space-y-4 border-b border-slate-200 bg-slate-50/70 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <form
                                onSubmit={handleSearch}
                                className="w-full sm:max-w-md sm:flex-1"
                            >
                                <div className="relative">
                                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by name, username, email, or phone..."
                                        value={searchQuery}
                                        onChange={(e) =>
                                            setSearchQuery(e.target.value)
                                        }
                                        className="h-10 w-full rounded-lg border border-slate-300 bg-white pr-4 pl-10 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    />
                                </div>
                            </form>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex min-h-10 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                                    showFilters
                                        ? 'border-blue-300 bg-blue-50 text-blue-700'
                                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <Filter className="h-4 w-4" />
                                Filters
                            </button>
                        </div>

                        {showFilters && (
                            <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-5">
                                <select
                                    value={filterRole}
                                    onChange={(e) =>
                                        setFilterRole(e.target.value)
                                    }
                                    className="rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">All Roles</option>
                                    {roles.map((role) => (
                                        <option key={role.id} value={role.id}>
                                            {role.display_name}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={filterZone}
                                    onChange={(e) =>
                                        setFilterZone(e.target.value)
                                    }
                                    className="rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">All Zones</option>
                                    {zones.map((zone) => (
                                        <option key={zone.id} value={zone.id}>
                                            {zone.name}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={filterArea}
                                    onChange={(e) =>
                                        setFilterArea(e.target.value)
                                    }
                                    className="rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">All Areas</option>
                                    {areas.map((area) => (
                                        <option key={area.id} value={area.id}>
                                            {area.name}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={filterBranch}
                                    onChange={(e) =>
                                        setFilterBranch(e.target.value)
                                    }
                                    className="rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">All Branches</option>
                                    {branches.map((branch) => (
                                        <option
                                            key={branch.id}
                                            value={branch.id}
                                        >
                                            {branch.name}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={filterStatus}
                                    onChange={(e) =>
                                        setFilterStatus(e.target.value)
                                    }
                                    className="rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">All Status</option>
                                    <option value="1">Active</option>
                                    <option value="0">Inactive</option>
                                </select>

                                <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end xl:col-span-5">
                                    <button
                                        onClick={handleClearFilters}
                                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
                                    >
                                        Clear
                                    </button>
                                    <button
                                        onClick={handleFilter}
                                        className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                                    >
                                        Apply Filters
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px]">
                            <thead className="border-b border-gray-200 bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                        User
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                        Role
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                        Organization
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                        Phone
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                                        
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {users.data.map((user) => (
                                    <tr
                                        key={user.id}
                                        className="transition-colors hover:bg-gray-50"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-600">
                                                    {user.name
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {user.name}
                                                        {user.has_all_access && (
                                                            <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-800">
                                                                Super Admin
                                                            </span>
                                                        )}
                                                    </div>
                                                    {user.username && (
                                                        <div className="text-sm text-gray-600">
                                                            @{user.username}
                                                        </div>
                                                    )}
                                                    <div className="text-sm text-gray-500">
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                                                {user.role.display_name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">
                                                {/* Single assignment (for branch-level users) */}
                                                {user.branch &&
                                                !user.branches?.length ? (
                                                    <>
                                                        <div className="font-medium">
                                                            {user.branch.name}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {user.area?.name} •{' '}
                                                            {user.zone?.name}
                                                        </div>
                                                    </>
                                                ) : user.area &&
                                                  !user.areas?.length ? (
                                                    <>
                                                        <div className="font-medium">
                                                            {user.area.name}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {user.zone?.name}
                                                        </div>
                                                    </>
                                                ) : user.zone &&
                                                  !user.zones?.length ? (
                                                    <div className="font-medium">
                                                        {user.zone.name}
                                                    </div>
                                                ) : null}

                                                {/* Multi-assignments */}
                                                {user.zones?.length ||
                                                user.areas?.length ||
                                                user.branches?.length ? (
                                                    <div className="space-y-2">
                                                        {user.zones &&
                                                            user.zones.length >
                                                                0 && (
                                                                <div>
                                                                    <div className="mb-1 text-xs font-medium text-gray-500">
                                                                        Zones:
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {user.zones
                                                                            .slice(
                                                                                0,
                                                                                2,
                                                                            )
                                                                            .map(
                                                                                (
                                                                                    zone,
                                                                                ) => (
                                                                                    <span
                                                                                        key={
                                                                                            zone.id
                                                                                        }
                                                                                        className="inline-flex items-center rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800"
                                                                                    >
                                                                                        {
                                                                                            zone.name
                                                                                        }
                                                                                    </span>
                                                                                ),
                                                                            )}
                                                                        {user
                                                                            .zones
                                                                            .length >
                                                                            2 && (
                                                                            <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                                                                                +
                                                                                {user
                                                                                    .zones
                                                                                    .length -
                                                                                    2}{' '}
                                                                                more
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        {user.areas &&
                                                            user.areas.length >
                                                                0 && (
                                                                <div>
                                                                    <div className="mb-1 text-xs font-medium text-gray-500">
                                                                        Areas:
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {user.areas
                                                                            .slice(
                                                                                0,
                                                                                2,
                                                                            )
                                                                            .map(
                                                                                (
                                                                                    area,
                                                                                ) => (
                                                                                    <span
                                                                                        key={
                                                                                            area.id
                                                                                        }
                                                                                        className="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
                                                                                    >
                                                                                        {
                                                                                            area.name
                                                                                        }
                                                                                    </span>
                                                                                ),
                                                                            )}
                                                                        {user
                                                                            .areas
                                                                            .length >
                                                                            2 && (
                                                                            <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                                                                                +
                                                                                {user
                                                                                    .areas
                                                                                    .length -
                                                                                    2}{' '}
                                                                                more
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        {user.branches &&
                                                            user.branches
                                                                .length > 0 && (
                                                                <div>
                                                                    <div className="mb-1 text-xs font-medium text-gray-500">
                                                                        Branches:
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {user.branches
                                                                            .slice(
                                                                                0,
                                                                                2,
                                                                            )
                                                                            .map(
                                                                                (
                                                                                    branch,
                                                                                ) => (
                                                                                    <span
                                                                                        key={
                                                                                            branch.id
                                                                                        }
                                                                                        className="inline-flex items-center rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                                                                                    >
                                                                                        {
                                                                                            branch.name
                                                                                        }
                                                                                    </span>
                                                                                ),
                                                                            )}
                                                                        {user
                                                                            .branches
                                                                            .length >
                                                                            2 && (
                                                                            <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                                                                                +
                                                                                {user
                                                                                    .branches
                                                                                    .length -
                                                                                    2}{' '}
                                                                                more
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                    </div>
                                                ) : null}

                                                {/* No assignment */}
                                                {!user.branch &&
                                                    !user.area &&
                                                    !user.zone &&
                                                    !user.branches?.length &&
                                                    !user.areas?.length &&
                                                    !user.zones?.length && (
                                                        <span className="text-gray-400">
                                                            -
                                                        </span>
                                                    )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-gray-600">
                                                {user.phone || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <StatusBadge
                                                active={user.is_active}
                                            />
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1">
                                                {canMutate ? (
                                                <>
                                                <button
                                                    onClick={() => handleToggleStatus(user.id)}
                                                    className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                                                        user.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                                                    }`}
                                                    title={user.is_active ? "Deactivate" : "Activate"}
                                                >
                                                    {user.is_active ? <ToggleRight className="size-4" /> : <ToggleLeft className="size-4" />}
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="flex h-7 w-7 items-center justify-center rounded-md text-blue-600 transition-colors hover:bg-blue-50"
                                                    title="Edit"
                                                >
                                                    <Edit className="size-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleResetPassword(user.id, user.name)}
                                                    className="flex h-7 w-7 items-center justify-center rounded-md text-orange-600 transition-colors hover:bg-orange-50"
                                                    title="Reset Password"
                                                >
                                                    <KeyRound className="size-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleSendCredentials(user.id, user.name)}
                                                    className="flex h-7 w-7 items-center justify-center rounded-md text-indigo-600 transition-colors hover:bg-indigo-50"
                                                    title="Send Login Email"
                                                >
                                                    <Send className="size-4" />
                                                </button>
                                                {canUpdateSignature && (
                                                    <>
                                                        <button
                                                            onClick={() => handleOpenSignaturePicker(user.id)}
                                                            className="flex h-7 w-7 items-center justify-center rounded-md text-teal-600 transition-colors hover:bg-teal-50"
                                                            title="Update Signature"
                                                        >
                                                            <PenTool className="size-4" />
                                                        </button>
                                                        <input
                                                            type="file"
                                                            accept="image/png,image/jpg,image/jpeg,image/gif"
                                                            className="hidden"
                                                            ref={(el) => {
                                                                fileInputRefs.current[user.id] = el;
                                                            }}
                                                            onChange={(e) => handleSignatureChange(user.id, e)}
                                                        />
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(user.id, user.name)}
                                                    className="flex h-7 w-7 items-center justify-center rounded-md text-red-600 transition-colors hover:bg-red-50"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="size-4" />
                                                </button>
                                                </>
                                                ) : (
                                                    <span className="text-xs text-slate-400">View only</span>
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
                                title="No users found"
                                description="Adjust the filters or add a new user."
                            />
                        )}
                    </div>

                    <ServerPagination
                        links={users.links}
                        summary={`Page ${users.current_page} of ${users.last_page}`}
                        perPage={users.per_page || 50}
                        onPerPageChange={(size) => {
                            router.get(
                                '/users',
                                { ...filters, search: searchQuery, per_page: size },
                                { preserveState: true, replace: true }
                            );
                        }}
                    />
                </ConfigurationCard>
            </ConfigurationPage>

            {/* Bulk Mail Modal - Role অনুযায়ী বাদ */}
            {bulkMailModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Bulk Mail – কাদের বাদ দেবেন?
                            </h3>
                            <button
                                type="button"
                                onClick={() => setBulkMailModalOpen(false)}
                                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <p className="mb-4 text-sm text-gray-600">
                            নিচের যে রোলগুলো বাদ দিতে চান সেগুলো সিলেক্ট করুন।
                            বাদ দেওয়া রোলের কোনো ইউজারকে মেইল যাবে না।
                        </p>
                        <div className="mb-5 max-h-48 space-y-2 overflow-y-auto">
                            {roles.map((role) => (
                                <label
                                    key={role.id}
                                    className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-gray-50"
                                >
                                    <input
                                        type="checkbox"
                                        checked={excludeRoleIds.includes(
                                            role.id,
                                        )}
                                        onChange={() =>
                                            toggleExcludeRole(role.id)
                                        }
                                        className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                    />
                                    <span className="text-sm font-medium text-gray-800">
                                        {role.display_name}
                                    </span>
                                </label>
                            ))}
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setBulkMailModalOpen(false)}
                                className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
                            >
                                বাতিল
                            </button>
                            <button
                                type="button"
                                onClick={handleSendAllCredentials}
                                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                            >
                                <Send className="h-4 w-4" />
                                মেইল পাঠান
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Branch Summary Mail Modal */}
            {branchSummaryModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Branch User List – ইমেইল পাঠান
                            </h3>
                            <button
                                type="button"
                                onClick={() => setBranchSummaryModalOpen(false)}
                                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <p className="mb-4 text-sm text-gray-600">
                            নির্বাচিত শাখার Branch User, Branch Manager এবং
                            Field Officer দের তথ্যসহ সুন্দর grid আকারে ইমেইল
                            যাবে।
                        </p>
                        <div className="mb-5 space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Branch নির্বাচন করুন
                                </label>
                                <select
                                    value={selectedBranchIdForSummary}
                                    onChange={(e) =>
                                        setSelectedBranchIdForSummary(
                                            e.target.value,
                                        )
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="">
                                        -- Select Branch --
                                    </option>
                                    <option value="all">
                                        All Branches (prottek branch er jonno
                                        alada mail)
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
                                <p className="mt-1 text-xs text-gray-500">
                                    আগের ফিল্টারের branch থাকলে সেটাই auto
                                    select হয়ে যাবে।
                                </p>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Target Email (optional)
                                </label>
                                <input
                                    type="email"
                                    value={targetEmailForSummary}
                                    onChange={(e) =>
                                        setTargetEmailForSummary(e.target.value)
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-teal-500"
                                    placeholder="যদি নির্দিষ্ট ইমেইল এ পাঠাতে চান (না দিলে branch এর ইমেইল ব্যবহার হবে)"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setBranchSummaryModalOpen(false)}
                                className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
                            >
                                বাতিল
                            </button>
                            <button
                                type="button"
                                onClick={handleSendBranchSummary}
                                className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-white hover:bg-teal-700"
                            >
                                <Send className="h-4 w-4" />
                                মেইল পাঠান
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal */}
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
