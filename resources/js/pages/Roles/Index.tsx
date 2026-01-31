import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Plus, Search, MoreVertical, Edit, Trash2, Shield } from 'lucide-react';
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
            role.display_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getPermissionCount = (role: Role) => {
        return role.permissions ? role.permissions.length : 0;
    };

    return (
        <AdminLayout>
            <Head title="Role Management" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
                        <p className="text-sm text-gray-600 mt-1">
                            Manage roles and permissions for your system
                        </p>
                    </div>
                    <button
                        onClick={handleAddNew}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add New Role
                    </button>
                </div>

                {/* Content Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    {/* Search Bar */}
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search roles..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Role Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Display Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Description
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Permissions
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Users
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredRoles.map((role) => (
                                    <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                                    <Shield className="w-4 h-4 text-blue-600" />
                                                </div>
                                                <span className="text-sm font-medium text-gray-900 font-mono">
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
                                            <div className="text-sm text-gray-600 max-w-xs truncate">
                                                {role.description || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                {getPermissionCount(role)} permissions
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-gray-600">
                                                {role.users_count || 0} users
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="relative inline-block">
                                                <button
                                                    onClick={() =>
                                                        setOpenDropdown(
                                                            openDropdown === role.id ? null : role.id
                                                        )
                                                    }
                                                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                                                >
                                                    <MoreVertical className="w-4 h-4 text-gray-600" />
                                                </button>
                                                {openDropdown === role.id && (
                                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 animate-in fade-in slide-in-from-top-2 duration-200">
                                                        <button
                                                            onClick={() => handleEdit(role)}
                                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleDelete(role.id, role.display_name)
                                                            }
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
                        {filteredRoles.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                                No roles found
                            </div>
                        )}
                    </div>
                </div>
            </div>

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
