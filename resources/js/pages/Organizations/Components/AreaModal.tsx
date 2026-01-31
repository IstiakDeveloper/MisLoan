import { FormEvent, useEffect } from 'react';
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
    description: string | null;
    is_active: boolean;
    zone: Zone;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    area: Area | null;
    zones: Zone[];
}

export default function AreaModal({ isOpen, onClose, area, zones }: Props) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        zone_id: area?.zone.id.toString() || '',
        name: area?.name || '',
        code: area?.code || '',
        description: area?.description || '',
        is_active: area?.is_active ?? true,
    });

    useEffect(() => {
        if (area) {
            setData({
                zone_id: area.zone.id.toString(),
                name: area.name,
                code: area.code,
                description: area.description || '',
                is_active: area.is_active,
            });
        } else {
            reset();
        }
    }, [area, isOpen]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        if (area) {
            put(`/organizations/areas/${area.id}`, {
                onSuccess: () => {
                    reset();
                    onClose();
                },
            });
        } else {
            post('/organizations/areas', {
                onSuccess: () => {
                    reset();
                    onClose();
                },
            });
        }
    };

    const handleClose = () => {
        reset();
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
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {area ? 'Edit Area' : 'Create New Area'}
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
                    <div>
                        <label htmlFor="zone_id" className="block text-sm font-medium text-gray-700 mb-1">
                            Zone <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="zone_id"
                            value={data.zone_id}
                            onChange={(e) => setData('zone_id', e.target.value)}
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
                        {errors.zone_id && <p className="text-red-500 text-sm mt-1">{errors.zone_id}</p>}
                    </div>

                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                            Area Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="e.g., Mirpur Area"
                            required
                        />
                        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                    </div>

                    <div>
                        <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                            Area Code <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="code"
                            type="text"
                            value={data.code}
                            onChange={(e) => setData('code', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="e.g., DHK-A01"
                            required
                        />
                        {errors.code && <p className="text-red-500 text-sm mt-1">{errors.code}</p>}
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            id="description"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Additional information about the area..."
                        />
                        {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
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
                            {processing ? 'Saving...' : area ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
