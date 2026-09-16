import { FormEvent, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import { X } from 'lucide-react';

interface SavingsCategory {
    id: number;
    category_name: string;
    category_name_bn: string;
    category_code: string;
    description: string | null;
    description_bn: string | null;
    is_active: boolean;
    display_order: number;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    category: SavingsCategory | null;
}

export default function CategoryModal({ isOpen, onClose, category }: Props) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        category_name: '',
        category_name_bn: '',
        category_code: '',
        description: '',
        description_bn: '',
        is_active: true,
        display_order: 0,
    });

    useEffect(() => {
        if (category) {
            setData({
                category_name: category.category_name,
                category_name_bn: category.category_name_bn || '',
                category_code: category.category_code,
                description: category.description || '',
                description_bn: category.description_bn || '',
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
            put(`/savings-categories/${category.id}`, {
                onSuccess: () => {
                    reset();
                    onClose();
                },
            });
        } else {
            post('/savings-categories', {
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

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={handleClose} />

            <div className="relative mx-4 max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {category ? 'সঞ্চয় ক্যাটাগরি সম্পাদনা' : 'নতুন সঞ্চয় ক্যাটাগরি তৈরি'}
                    </h3>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="max-h-[calc(90vh-140px)] overflow-y-auto">
                    <div className="space-y-4 p-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Category Name (English) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.category_name}
                                    onChange={(e) => setData('category_name', e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., General Savings"
                                    required
                                />
                                {errors.category_name && (
                                    <p className="mt-1 text-sm text-red-500">{errors.category_name}</p>
                                )}
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Category Name (বাংলা) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.category_name_bn}
                                    onChange={(e) => setData('category_name_bn', e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                                    placeholder="যেমন: সাধারণ সঞ্চয়"
                                    required
                                />
                                {errors.category_name_bn && (
                                    <p className="mt-1 text-sm text-red-500">{errors.category_name_bn}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Category Code <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.category_code}
                                onChange={(e) => setData('category_code', e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono focus:border-transparent focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. 21, 22, 23"
                                required
                            />
                            {errors.category_code && (
                                <p className="mt-1 text-sm text-red-500">{errors.category_code}</p>
                            )}
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                            <textarea
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                rows={2}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Description (বাংলা)</label>
                            <textarea
                                value={data.description_bn}
                                onChange={(e) => setData('description_bn', e.target.value)}
                                rows={2}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Display Order</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={data.display_order}
                                    onChange={(e) => setData('display_order', parseInt(e.target.value) || 0)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex items-center gap-2 pt-6">
                                <input
                                    type="checkbox"
                                    id="savings_category_is_active"
                                    checked={data.is_active}
                                    onChange={(e) => setData('is_active', e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="savings_category_is_active" className="text-sm font-medium text-gray-700">
                                    Active (সক্রিয়)
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            বাতিল
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {processing ? 'সংরক্ষণ হচ্ছে...' : category ? 'আপডেট করুন' : 'যোগ করুন'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
