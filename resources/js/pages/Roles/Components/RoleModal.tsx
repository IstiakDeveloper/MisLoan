import { FormEvent, useEffect, useState } from 'react';
import { useForm } from '@inertiajs/react';
import { X, ChevronDown, ChevronRight } from 'lucide-react';

interface Role {
    id: number;
    name: string;
    display_name: string;
    description: string | null;
    permissions: string[];
}

interface Permission {
    [key: string]: {
        [key: string]: string;
    };
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    role: Role | null;
    permissions: Permission;
}

export default function RoleModal({ isOpen, onClose, role, permissions }: Props) {
    const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: role?.name || '',
        display_name: role?.display_name || '',
        description: role?.description || '',
        permissions: role?.permissions || [],
    });

    useEffect(() => {
        if (role) {
            setData({
                name: role.name,
                display_name: role.display_name,
                description: role.description || '',
                permissions: role.permissions || [],
            });
            // Expand all groups when editing
            setExpandedGroups(Object.keys(permissions));
        } else {
            reset();
            setExpandedGroups([]);
        }
    }, [role, isOpen]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        if (role) {
            put(`/roles/${role.id}`, {
                onSuccess: () => {
                    reset();
                    onClose();
                },
            });
        } else {
            post('/roles', {
                onSuccess: () => {
                    reset();
                    onClose();
                },
            });
        }
    };

    const handleClose = () => {
        reset();
        setExpandedGroups([]);
        onClose();
    };

    const toggleGroup = (group: string) => {
        setExpandedGroups((prev) =>
            prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
        );
    };

    const togglePermission = (permission: string) => {
        setData(
            'permissions',
            data.permissions.includes(permission)
                ? data.permissions.filter((p) => p !== permission)
                : [...data.permissions, permission]
        );
    };

    const toggleGroupPermissions = (group: string) => {
        const groupPermissions = Object.keys(permissions[group]);
        const allSelected = groupPermissions.every((p) => data.permissions.includes(p));

        if (allSelected) {
            setData(
                'permissions',
                data.permissions.filter((p) => !groupPermissions.includes(p))
            );
        } else {
            setData('permissions', [
                ...data.permissions.filter((p) => !groupPermissions.includes(p)),
                ...groupPermissions,
            ]);
        }
    };

    const isGroupSelected = (group: string) => {
        const groupPermissions = Object.keys(permissions[group]);
        return groupPermissions.every((p) => data.permissions.includes(p));
    };

    const isGroupPartiallySelected = (group: string) => {
        const groupPermissions = Object.keys(permissions[group]);
        const selectedCount = groupPermissions.filter((p) => data.permissions.includes(p)).length;
        return selectedCount > 0 && selectedCount < groupPermissions.length;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 transition-opacity"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {role ? 'Edit Role' : 'Create New Role'}
                    </h3>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
                    <div className="p-6 space-y-6">
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                        Role Name (slug) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="name"
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono"
                                        placeholder="e.g., branch_manager"
                                        required
                                    />
                                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                                </div>

                                <div>
                                    <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 mb-1">
                                        Display Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="display_name"
                                        type="text"
                                        value={data.display_name}
                                        onChange={(e) => setData('display_name', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="e.g., Branch Manager"
                                        required
                                    />
                                    {errors.display_name && <p className="text-red-500 text-sm mt-1">{errors.display_name}</p>}
                                </div>
                            </div>

                            <div>
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="Brief description of this role..."
                                />
                                {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                            </div>
                        </div>

                        {/* Permissions */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                Permissions <span className="text-red-500">*</span>
                            </label>
                            <div className="border border-gray-300 rounded-lg overflow-hidden">
                                {Object.entries(permissions).map(([group, perms]) => (
                                    <div key={group} className="border-b border-gray-200 last:border-b-0">
                                        {/* Group Header */}
                                        <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleGroup(group)}
                                                    className="text-gray-500 hover:text-gray-700"
                                                >
                                                    {expandedGroups.includes(group) ? (
                                                        <ChevronDown className="w-4 h-4" />
                                                    ) : (
                                                        <ChevronRight className="w-4 h-4" />
                                                    )}
                                                </button>
                                                <span className="text-sm font-medium text-gray-900 capitalize">
                                                    {group.replace(/_/g, ' ')}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    ({Object.keys(perms).length} permissions)
                                                </span>
                                            </div>
                                            <label className="flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={isGroupSelected(group)}
                                                    onChange={() => toggleGroupPermissions(group)}
                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                    ref={(el) => {
                                                        if (el) {
                                                            el.indeterminate = isGroupPartiallySelected(group);
                                                        }
                                                    }}
                                                />
                                                <span className="ml-2 text-sm text-gray-600">Select All</span>
                                            </label>
                                        </div>

                                        {/* Group Permissions */}
                                        {expandedGroups.includes(group) && (
                                            <div className="p-4 grid grid-cols-2 gap-3">
                                                {Object.entries(perms).map(([key, label]) => (
                                                    <label
                                                        key={key}
                                                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={data.permissions.includes(key)}
                                                            onChange={() => togglePermission(key)}
                                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                        />
                                                        <span className="text-sm text-gray-700">{label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {errors.permissions && <p className="text-red-500 text-sm mt-1">{errors.permissions}</p>}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200 sticky bottom-0">
                        <div className="text-sm text-gray-600">
                            {data.permissions.length} permission(s) selected
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {processing ? 'Saving...' : role ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
