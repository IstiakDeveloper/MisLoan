import { FormEvent, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import { X } from 'lucide-react';

interface LoanCategory {
    id: number;
    category_name: string;
    category_name_bn: string;
    category_code: string;
    description: string | null;
    description_bn: string | null;
    target_group: string;
    is_active: boolean;
    display_order: number;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    category: LoanCategory | null;
}

export default function CategoryModal({ isOpen, onClose, category }: Props) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        category_name: '',
        category_name_bn: '',
        category_code: '',
        description: '',
        description_bn: '',
        target_group: 'both',
        is_active: true,
        display_order: 0,
    });

    useEffect(() => {
        if (category) {
            setData({
                category_name: category.category_name,
                category_name_bn: category.category_name_bn,
                category_code: category.category_code,
                description: category.description || '',
                description_bn: category.description_bn || '',
                target_group: category.target_group,
                is_active: category.is_active,
                display_order: category.display_order,
            });
        } else {
            reset();
        }
    }, [category, isOpen]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        if (category) {
            put(`/loan-categories/${category.id}`, {
                onSuccess: () => {
                    reset();
                    onClose();
                },
            });
        } else {
            post('/loan-categories', {
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
            <div
                className="absolute inset-0 bg-black/50 transition-opacity"
                onClick={handleClose}
            />

            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {category ? 'Edit Loan Category (ঋণ ক্যাটাগরি সম্পাদনা)' : 'Create New Loan Category (নতুন ঋণ ক্যাটাগরি তৈরি)'}
                    </h3>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Category Name (English) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.category_name}
                                    onChange={(e) => setData('category_name', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="e.g., Jagaron"
                                    required
                                />
                                {errors.category_name && <p className="text-red-500 text-sm mt-1">{errors.category_name}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Category Name (Bangla) (ক্যাটাগরির নাম) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.category_name_bn}
                                    onChange={(e) => setData('category_name_bn', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="যেমন: জাগরণ"
                                    required
                                />
                                {errors.category_name_bn && <p className="text-red-500 text-sm mt-1">{errors.category_name_bn}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Category Code <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.category_code}
                                    onChange={(e) => setData('category_code', e.target.value.toUpperCase())}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                                    placeholder="e.g., JAG"
                                    required
                                />
                                {errors.category_code && <p className="text-red-500 text-sm mt-1">{errors.category_code}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Target Group (লক্ষ্য গোষ্ঠী) <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={data.target_group}
                                    onChange={(e) => setData('target_group', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="both">Both (উভয়)</option>
                                    <option value="female">Female Only (শুধু মহিলা)</option>
                                    <option value="male">Male Only (শুধু পুরুষ)</option>
                                </select>
                                {errors.target_group && <p className="text-red-500 text-sm mt-1">{errors.target_group}</p>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description (English)
                            </label>
                            <textarea
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Brief description..."
                            />
                            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description (Bangla) (বিবরণ)
                            </label>
                            <textarea
                                value={data.description_bn}
                                onChange={(e) => setData('description_bn', e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="সংক্ষিপ্ত বিবরণ..."
                            />
                            {errors.description_bn && <p className="text-red-500 text-sm mt-1">{errors.description_bn}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Display Order (ক্রম)
                                </label>
                                <input
                                    type="number"
                                    value={data.display_order}
                                    onChange={(e) => setData('display_order', parseInt(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    min={0}
                                />
                            </div>

                            <div className="flex items-end">
                                <label className="flex items-center gap-2 cursor-pointer pb-2">
                                    <input
                                        type="checkbox"
                                        checked={data.is_active}
                                        onChange={(e) => setData('is_active', e.target.checked)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Active (সক্রিয়)</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel (বাতিল)
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {processing ? 'Saving... (সংরক্ষণ হচ্ছে)' : category ? 'Update (আপডেট করুন)' : 'Create (তৈরি করুন)'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
