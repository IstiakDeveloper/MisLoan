import {
    ConfigurationCard,
    ConfigurationHeader,
    ConfigurationPage,
    ConfigurationToolbar,
    EmptyState,
    LocalPagination,
    SearchField,
} from '@/components/configuration';
import AdminLayout from '@/layouts/admin-layout';
import { Head, router } from '@inertiajs/react';
import { Edit, Plus, Shield, Trash2 } from 'lucide-react';
import { useState } from 'react';
import RoleModal from './Components/RoleModal';

interface Role {
    id: number;
    name: string;
    display_name: string;
    description: string | null;
    permissions: string[];
    users_count?: number;
}

interface Permission {
    [key: string]: {
        [key: string]: string;
    };
}

interface Props {
    roles: Role[];
    permissions: Permission;
}

export default function Index({ roles, permissions }: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [openDropdown, setOpenDropdown] = useState<number | null>(null);
    const [roleModalOpen, setRoleModalOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Ensure roles is always an array
    const rolesList = Array.isArray(roles) ? roles : [];

    const handleAddNew = () => {
        setSelectedRole(null);
        setRoleModalOpen(true);
    };

    const handleEdit = (role: Role) => {
        setSelectedRole(role);
        setRoleModalOpen(true);
        setOpenDropdown(null);
    };

    const handleDelete = (id: number, name: string) => {
        if (confirm(`Are you sure you want to delete role "${name}"?`)) {
            router.delete(`/roles/${id}`);
        }
        setOpenDropdown(null);
    };

    const filteredRoles = rolesList.filter(
        (role) =>
            role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            role.display_name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const paginatedRoles = filteredRoles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const getPermissionCount = (role: Role) => {
        return role.permissions ? role.permissions.length : 0;
    };

    return (
        <AdminLayout>
            <Head title="Role Management" />

            <ConfigurationPage>
                <ConfigurationHeader
                    title="Role Management"
                    description="Define clear access profiles and permission sets for system users."
                    icon={Shield}
                    actions={
                        <button
                            onClick={handleAddNew}
                            className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50 focus:ring-4 focus:ring-white/30 focus:outline-none sm:w-auto"
                        >
                            <Plus className="h-4 w-4" />
                            Add New Role
                        </button>
                    }
                />

                {/* Content Card */}
                <ConfigurationCard>
                    {/* Search Bar */}
                    <ConfigurationToolbar>
                        <SearchField
                            placeholder="Search roles..."
                            value={searchQuery}
                            onChange={(value) => {
                                setSearchQuery(value);
                                setCurrentPage(1);
                            }}
                        />
                        <p className="text-xs text-slate-500 sm:ml-auto">
                            {filteredRoles.length} of {rolesList.length} roles
                        </p>
                    </ConfigurationToolbar>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[820px]">
                            <thead className="border-b border-gray-200 bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                        Role Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                        Display Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                        Description
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                        Permissions
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                        Users
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                                        
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {paginatedRoles.map((role) => (
                                    <tr
                                        key={role.id}
                                        className="transition-colors hover:bg-gray-50"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                                                    <Shield className="h-4 w-4 text-blue-600" />
                                                </div>
                                                <span className="font-mono text-sm font-medium text-gray-900">
                                                    {role.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {role.display_name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="max-w-xs truncate text-sm text-gray-600">
                                                {role.description || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                                                {getPermissionCount(role)}{' '}
                                                permissions
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-gray-600">
                                                {role.users_count || 0} users
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => handleEdit(role)}
                                                    className="flex h-7 w-7 items-center justify-center rounded-md text-blue-600 transition-colors hover:bg-blue-50"
                                                    title="Edit"
                                                >
                                                    <Edit className="size-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(role.id, role.display_name)}
                                                    className="flex h-7 w-7 items-center justify-center rounded-md text-red-600 transition-colors hover:bg-red-50"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="size-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredRoles.length === 0 && (
                            <EmptyState
                                icon={Shield}
                                title="No roles found"
                                description="Try a different search or add a role."
                            />
                        )}
                    </div>

                    <LocalPagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(filteredRoles.length / itemsPerPage)}
                        totalItems={filteredRoles.length}
                        perPage={itemsPerPage}
                        itemLabel="roles"
                        onPageChange={handlePageChange}
                        onPerPageChange={(size) => {
                            setItemsPerPage(size);
                            setCurrentPage(1);
                        }}
                    />
                </ConfigurationCard>
            </ConfigurationPage>

            {/* Modal */}
            <RoleModal
                isOpen={roleModalOpen}
                onClose={() => setRoleModalOpen(false)}
                role={selectedRole}
                permissions={permissions}
            />
        </AdminLayout>
    );
}
