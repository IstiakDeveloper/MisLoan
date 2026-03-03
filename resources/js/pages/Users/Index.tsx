import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Plus, Search, MoreVertical, Edit, Trash2, Power, PowerOff, KeyRound, Filter, Send, X } from 'lucide-react';
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

export default function Index({ users, roles, zones, areas, branches, filters }: Props) {
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
            prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
        );
    };

    const handleSendAllCredentials = () => {
        router.post('/users/send-credentials-all', { exclude_role_ids: excludeRoleIds }, {
            onSuccess: () => setBulkMailModalOpen(false),
        });
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
            { preserveState: true }
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

    return (
        <AdminLayout>
            <Head title="User Management" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                        <p className="text-sm text-gray-600 mt-1">
                            Manage system users and their access
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleOpenBulkMailModal}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                        >
                            <Send className="w-4 h-4" />
                            Send Login Info (All)
                        </button>
                        <button
                            onClick={handleAddNew}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add New User
                        </button>
                    </div>
                </div>

                {/* Content Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    {/* Search & Filters */}
                    <div className="px-6 py-4 border-b border-gray-200 space-y-4">
                        <div className="flex items-center gap-3">
                            <form onSubmit={handleSearch} className="flex-1 max-w-md">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by name, email, or phone..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </form>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                                    showFilters
                                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <Filter className="w-4 h-4" />
                                Filters
                            </button>
                        </div>

                        {showFilters && (
                            <div className="grid grid-cols-5 gap-3 p-4 bg-gray-50 rounded-lg">
                                <select
                                    value={filterRole}
                                    onChange={(e) => setFilterRole(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                    onChange={(e) => setFilterZone(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                    onChange={(e) => setFilterArea(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                    onChange={(e) => setFilterBranch(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">All Branches</option>
                                    {branches.map((branch) => (
                                        <option key={branch.id} value={branch.id}>
                                            {branch.name}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">All Status</option>
                                    <option value="1">Active</option>
                                    <option value="0">Inactive</option>
                                </select>

                                <div className="col-span-5 flex justify-end gap-2">
                                    <button
                                        onClick={handleClearFilters}
                                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Clear
                                    </button>
                                    <button
                                        onClick={handleFilter}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Apply Filters
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Role
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Organization
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Phone
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.data.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {user.name}
                                                        {user.has_all_access && (
                                                            <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                                                                Super Admin
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-gray-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {user.role.display_name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">
                                                {/* Single assignment (for branch-level users) */}
                                                {user.branch && !user.branches?.length ? (
                                                    <>
                                                        <div className="font-medium">{user.branch.name}</div>
                                                        <div className="text-xs text-gray-500">
                                                            {user.area?.name} • {user.zone?.name}
                                                        </div>
                                                    </>
                                                ) : user.area && !user.areas?.length ? (
                                                    <>
                                                        <div className="font-medium">{user.area.name}</div>
                                                        <div className="text-xs text-gray-500">{user.zone?.name}</div>
                                                    </>
                                                ) : user.zone && !user.zones?.length ? (
                                                    <div className="font-medium">{user.zone.name}</div>
                                                ) : null}

                                                {/* Multi-assignments */}
                                                {(user.zones?.length || user.areas?.length || user.branches?.length) ? (
                                                    <div className="space-y-2">
                                                        {user.zones && user.zones.length > 0 && (
                                                            <div>
                                                                <div className="text-xs font-medium text-gray-500 mb-1">Zones:</div>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {user.zones.slice(0, 2).map((zone) => (
                                                                        <span key={zone.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                                                            {zone.name}
                                                                        </span>
                                                                    ))}
                                                                    {user.zones.length > 2 && (
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                                                            +{user.zones.length - 2} more
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {user.areas && user.areas.length > 0 && (
                                                            <div>
                                                                <div className="text-xs font-medium text-gray-500 mb-1">Areas:</div>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {user.areas.slice(0, 2).map((area) => (
                                                                        <span key={area.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                                            {area.name}
                                                                        </span>
                                                                    ))}
                                                                    {user.areas.length > 2 && (
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                                                            +{user.areas.length - 2} more
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {user.branches && user.branches.length > 0 && (
                                                            <div>
                                                                <div className="text-xs font-medium text-gray-500 mb-1">Branches:</div>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {user.branches.slice(0, 2).map((branch) => (
                                                                        <span key={branch.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                                            {branch.name}
                                                                        </span>
                                                                    ))}
                                                                    {user.branches.length > 2 && (
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                                                            +{user.branches.length - 2} more
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : null}

                                                {/* No assignment */}
                                                {!user.branch && !user.area && !user.zone &&
                                                 !user.branches?.length && !user.areas?.length && !user.zones?.length && (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-gray-600">{user.phone || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    user.is_active
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                }`}
                                            >
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="relative inline-block">
                                                <button
                                                    onClick={() =>
                                                        setOpenDropdown(openDropdown === user.id ? null : user.id)
                                                    }
                                                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                                                >
                                                    <MoreVertical className="w-4 h-4 text-gray-600" />
                                                </button>
                                                {openDropdown === user.id && (
                                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 animate-in fade-in slide-in-from-top-2 duration-200">
                                                        <button
                                                            onClick={() => handleEdit(user)}
                                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggleStatus(user.id)}
                                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                                        >
                                                            {user.is_active ? (
                                                                <>
                                                                    <PowerOff className="w-4 h-4" />
                                                                    Deactivate
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Power className="w-4 h-4" />
                                                                    Activate
                                                                </>
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => handleResetPassword(user.id, user.name)}
                                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                                        >
                                                            <KeyRound className="w-4 h-4" />
                                                            Reset Password
                                                        </button>
                                                        <button
                                                            onClick={() => handleSendCredentials(user.id, user.name)}
                                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                                        >
                                                            <Send className="w-4 h-4" />
                                                            Send Login Email
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(user.id, user.name)}
                                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {users.data.length === 0 && (
                            <div className="text-center py-12 text-gray-500">No users found</div>
                        )}
                    </div>

                    {/* Pagination */}
                    {users.last_page > 1 && (
                        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                                Showing {users.data.length} of {users.total} users
                            </div>
                            <div className="flex items-center gap-2">
                                {users.links.map((link, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handlePageChange(link.url)}
                                        disabled={!link.url || link.active}
                                        className={`px-3 py-1 text-sm rounded transition-colors ${
                                            link.active
                                                ? 'bg-blue-600 text-white'
                                                : link.url
                                                ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bulk Mail Modal - Role অনুযায়ী বাদ */}
            {bulkMailModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Bulk Mail – কাদের বাদ দেবেন?
                            </h3>
                            <button
                                type="button"
                                onClick={() => setBulkMailModalOpen(false)}
                                className="p-1 rounded-lg text-gray-500 hover:bg-gray-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                            নিচের যে রোলগুলো বাদ দিতে চান সেগুলো সিলেক্ট করুন। বাদ দেওয়া রোলের কোনো ইউজারকে মেইল যাবে না।
                        </p>
                        <div className="space-y-2 max-h-48 overflow-y-auto mb-5">
                            {roles.map((role) => (
                                <label
                                    key={role.id}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={excludeRoleIds.includes(role.id)}
                                        onChange={() => toggleExcludeRole(role.id)}
                                        className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                    />
                                    <span className="text-sm font-medium text-gray-800">
                                        {role.display_name}
                                    </span>
                                </label>
                            ))}
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setBulkMailModalOpen(false)}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                            >
                                বাতিল
                            </button>
                            <button
                                type="button"
                                onClick={handleSendAllCredentials}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                <Send className="w-4 h-4" />
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
