import { FormEvent, useEffect, useState } from 'react';
import { useForm } from '@inertiajs/react';
import { X } from 'lucide-react';

interface Zone {
    id: number;
    name: string;
    code: string;
}

interface Area {
    id: number;
    name: string;
    code: string;
    zone: Zone;
}

interface Branch {
    id: number;
    name: string;
    code: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    manager_name: string | null;
    is_active: boolean;
    area: Area;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    branch: Branch | null;
    zones: Zone[];
    areas: Area[];
}

export default function BranchModal({ isOpen, onClose, branch, zones, areas }: Props) {
    const [selectedZone, setSelectedZone] = useState<string>(
        branch?.area.zone.id.toString() || ''
    );
    const [filteredAreas, setFilteredAreas] = useState<Area[]>(areas);

    const { data, setData, post, put, processing, errors, reset } = useForm({
        area_id: branch?.area.id.toString() || '',
        name: branch?.name || '',
        code: branch?.code || '',
        address: branch?.address || '',
        phone: branch?.phone || '',
        email: branch?.email || '',
        manager_name: branch?.manager_name || '',
        login_pin: '',
        is_active: branch?.is_active ?? true,
    });

    useEffect(() => {
        if (branch) {
            setSelectedZone(branch.area.zone.id.toString());
            setData({
                area_id: branch.area.id.toString(),
                name: branch.name,
                code: branch.code,
                address: branch.address || '',
                phone: branch.phone || '',
                email: branch.email || '',
                manager_name: branch.manager_name || '',
                login_pin: '',
                is_active: branch.is_active,
            });
        } else {
            setSelectedZone('');
            reset();
        }
    }, [branch, isOpen]);

    useEffect(() => {
        if (selectedZone) {
            const filtered = areas.filter((area) => area.zone.id.toString() === selectedZone);
            setFilteredAreas(filtered);

            if (data.area_id && !filtered.find((a) => a.id.toString() === data.area_id)) {
                setData('area_id', '');
            }
        } else {
            setFilteredAreas(areas);
        }
    }, [selectedZone, areas]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        if (branch) {
            put(`/organizations/branches/${branch.id}`, {
                onSuccess: () => {
                    reset();
                    onClose();
                },
            });
        } else {
            post('/organizations/branches', {
                onSuccess: () => {
                    reset();
                    onClose();
                },
            });
        }
    };

    const handleClose = () => {
        reset();
        setSelectedZone('');
        onClose();
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
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {branch ? 'Edit Branch' : 'Create New Branch'}
                    </h3>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="zone" className="block text-sm font-medium text-gray-700 mb-1">
                                Zone <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="zone"
                                value={selectedZone}
                                onChange={(e) => setSelectedZone(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                required
                            >
                                <option value="">Select Zone</option>
                                {zones.map((zone) => (
                                    <option key={zone.id} value={zone.id.toString()}>
                                        {zone.name} ({zone.code})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="area_id" className="block text-sm font-medium text-gray-700 mb-1">
                                Area <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="area_id"
                                value={data.area_id}
                                onChange={(e) => setData('area_id', e.target.value)}
                                disabled={!selectedZone}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                                required
                            >
                                <option value="">Select Area</option>
                                {filteredAreas.map((area) => (
                                    <option key={area.id} value={area.id.toString()}>
                                        {area.name} ({area.code})
                                    </option>
                                ))}
                            </select>
                            {errors.area_id && <p className="text-red-500 text-sm mt-1">{errors.area_id}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                Branch Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="e.g., Mirpur-10 Branch"
                                required
                            />
                            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                        </div>

                        <div>
                            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                                Branch Code <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="code"
                                type="text"
                                value={data.code}
                                onChange={(e) => setData('code', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="e.g., DHK-A01-B01"
                                required
                            />
                            {errors.code && <p className="text-red-500 text-sm mt-1">{errors.code}</p>}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                            Address
                        </label>
                        <textarea
                            id="address"
                            value={data.address}
                            onChange={(e) => setData('address', e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Full address of the branch..."
                        />
                        {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                                Phone Number
                            </label>
                            <input
                                id="phone"
                                type="text"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="e.g., 01700000000"
                            />
                            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="e.g., branch@example.com"
                            />
                            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="manager_name" className="block text-sm font-medium text-gray-700 mb-1">
                            Manager Name
                        </label>
                        <input
                            id="manager_name"
                            type="text"
                            value={data.manager_name}
                            onChange={(e) => setData('manager_name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Branch manager's name"
                        />
                        {errors.manager_name && <p className="text-red-500 text-sm mt-1">{errors.manager_name}</p>}
                    </div>

                    <div>
                        <label htmlFor="login_pin" className="block text-sm font-medium text-gray-700 mb-1">
                            Branch Login PIN
                        </label>
                        <input
                            id="login_pin"
                            type="password"
                            inputMode="numeric"
                            value={data.login_pin}
                            onChange={(e) => setData('login_pin', e.target.value.replace(/\D/g, ''))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder={branch ? 'Leave blank to keep current PIN' : '4–12 digit PIN (default 12345678 if empty)'}
                        />
                        {errors.login_pin && <p className="text-red-500 text-sm mt-1">{errors.login_pin}</p>}
                    </div>

                    <div className="flex items-center">
                        <input
                            id="is_active"
                            type="checkbox"
                            checked={data.is_active}
                            onChange={(e) => setData('is_active', e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                            Active
                        </label>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {processing ? 'Saving...' : branch ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
