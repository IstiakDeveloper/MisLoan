import { FormEvent, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import { X } from 'lucide-react';

interface SavingsProduct {
    id: number;
    product_name: string;
    product_name_bn: string | null;
    product_code: string;
    description: string | null;
    deposit_type: string;
    duration_months: number;
    min_amount: number;
    max_amount: number | null;
    monthly_installment: number | null;
    interest_rate: number;
    is_active: boolean;
    display_order: number;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    product: SavingsProduct | null;
}

interface FormData {
    product_name: string;
    product_name_bn: string;
    product_code: string;
    description: string;
    deposit_type: string;
    duration_months: number;
    min_amount: number;
    max_amount: number | string;
    monthly_installment: number | string;
    interest_rate: number;
    is_active: boolean;
    display_order: number;
}

const defaultFormData: FormData = {
    product_name: '',
    product_name_bn: '',
    product_code: '',
    description: '',
    deposit_type: 'monthly',
    duration_months: 12,
    min_amount: 0,
    max_amount: '',
    monthly_installment: '',
    interest_rate: 0,
    is_active: true,
    display_order: 0,
};

export default function ProductModal({ isOpen, onClose, product }: Props) {
    const form = useForm(defaultFormData);
    const { data, post, put, processing, errors, reset, setData } = form;

    useEffect(() => {
        if (product) {
            setData({
                product_name: product.product_name,
                product_name_bn: product.product_name_bn || '',
                product_code: product.product_code,
                description: product.description || '',
                deposit_type: product.deposit_type,
                duration_months: product.duration_months,
                min_amount: Number(product.min_amount),
                max_amount: product.max_amount != null ? Number(product.max_amount) : '',
                monthly_installment: product.monthly_installment != null ? Number(product.monthly_installment) : '',
                interest_rate: Number(product.interest_rate),
                is_active: product.is_active,
                display_order: product.display_order,
            });
        } else {
            reset();
        }
    }, [product, isOpen]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        form.transform((d) => ({
            ...d,
            max_amount: d.max_amount === '' ? null : Number(d.max_amount),
            monthly_installment: d.monthly_installment === '' ? null : Number(d.monthly_installment),
        }));
        if (product) {
            put(`/savings-products/${product.id}`, {
                onSuccess: () => {
                    reset();
                    onClose();
                },
            });
        } else {
            post('/savings-products', {
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
            <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={handleClose} />

            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {product ? 'সঞ্চয় পণ্য সম্পাদনা' : 'নতুন সঞ্চয় পণ্য যোগ করুন'}
                    </h3>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Product Code <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.product_code}
                                    onChange={(e) => setData('product_code', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                                    placeholder="e.g. 21, 21.01, 22.01"
                                    required
                                />
                                {errors.product_code && (
                                    <p className="text-red-500 text-sm mt-1">{errors.product_code}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Interest Rate (%) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    max={100}
                                    value={data.interest_rate}
                                    onChange={(e) => setData('interest_rate', parseFloat(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                                {errors.interest_rate && (
                                    <p className="text-red-500 text-sm mt-1">{errors.interest_rate}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Product Name (English) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.product_name}
                                    onChange={(e) => setData('product_name', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                                {errors.product_name && (
                                    <p className="text-red-500 text-sm mt-1">{errors.product_name}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Product Name (বাংলা)
                                </label>
                                <input
                                    type="text"
                                    value={data.product_name_bn}
                                    onChange={(e) => setData('product_name_bn', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Deposit Type <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={data.deposit_type}
                                    onChange={(e) => setData('deposit_type', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="monthly">Monthly (মাসিক)</option>
                                    <option value="lump_sum">Lump Sum (এককালীন)</option>
                                    <option value="recurring">Recurring (পুনরাবৃত্ত)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Duration (months) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    value={data.duration_months}
                                    onChange={(e) => setData('duration_months', parseInt(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                                {errors.duration_months && (
                                    <p className="text-red-500 text-sm mt-1">{errors.duration_months}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Min Amount (৳) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    step="1"
                                    value={data.min_amount}
                                    onChange={(e) => setData('min_amount', parseFloat(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                                {errors.min_amount && (
                                    <p className="text-red-500 text-sm mt-1">{errors.min_amount}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Max Amount (৳)
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    step="1"
                                    value={data.max_amount}
                                    onChange={(e) =>
                                        setData('max_amount', e.target.value === '' ? '' : parseFloat(e.target.value))
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Optional"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Monthly Installment (৳)
                            </label>
                            <input
                                type="number"
                                min={0}
                                step="1"
                                value={data.monthly_installment}
                                onChange={(e) =>
                                    setData(
                                        'monthly_installment',
                                        e.target.value === '' ? '' : parseFloat(e.target.value)
                                    )
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Optional for monthly products"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={data.display_order}
                                    onChange={(e) => setData('display_order', parseInt(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div className="flex items-center gap-2 pt-6">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={data.is_active}
                                    onChange={(e) => setData('is_active', e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                                    Active (সক্রিয়)
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            বাতিল
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {processing ? 'সংরক্ষণ হচ্ছে...' : product ? 'আপডেট করুন' : 'যোগ করুন'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
