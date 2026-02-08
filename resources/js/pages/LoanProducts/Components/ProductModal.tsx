import { FormEvent, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import { X } from 'lucide-react';

interface LoanCategory {
    id: number;
    category_name: string;
    category_name_bn: string;
    category_code: string;
}

interface LoanProduct {
    id: number;
    loan_category_id: number;
    product_name: string;
    product_name_bn: string;
    product_code: string;
    description: string | null;
    description_bn: string | null;
    installment_type: string;
    duration_months: number;
    number_of_installments: number;
    min_amount: number;
    max_amount: number;
    interest_rate: number;
    service_charge: number;
    interest_calculation_type: string;
    gender_restriction: string;
    min_age: number;
    max_age: number;
    requires_guarantor: boolean;
    number_of_guarantors: number;
    eligibility_conditions: Record<string, any> | null;
    required_documents: string[] | null;
    is_active: boolean;
    display_order: number;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    product: LoanProduct | null;
    categories: LoanCategory[];
}

interface FormData {
    loan_category_id: string;
    product_name: string;
    product_name_bn: string;
    product_code: string;
    description: string;
    description_bn: string;
    installment_type: string;
    duration_months: number;
    number_of_installments: number;
    min_amount: number;
    max_amount: number;
    interest_rate: number;
    service_charge: number;
    interest_calculation_type: string;
    gender_restriction: string;
    min_age: number;
    max_age: number;
    requires_guarantor: boolean;
    number_of_guarantors: number;
    eligibility_conditions: Record<string, any>;
    required_documents: string[];
    is_active: boolean;
    display_order: number;
}

const defaultFormData: FormData = {
    loan_category_id: '',
    product_name: '',
    product_name_bn: '',
    product_code: '',
    description: '',
    description_bn: '',
    installment_type: 'weekly',
    duration_months: 12,
    number_of_installments: 52,
    min_amount: 5000,
    max_amount: 50000,
    interest_rate: 12.5,
    service_charge: 0,
    interest_calculation_type: 'flat',
    gender_restriction: 'both',
    min_age: 18,
    max_age: 60,
    requires_guarantor: true,
    number_of_guarantors: 1,
    eligibility_conditions: {},
    required_documents: [],
    is_active: true,
    display_order: 0,
};

export default function ProductModal({ isOpen, onClose, product, categories }: Props) {
    const form = useForm(defaultFormData);
    const { data, post, put, processing, errors, reset } = form;
    const setData = form.setData as any;

    useEffect(() => {
        if (product) {
            setData({
                loan_category_id: String(product.loan_category_id),
                product_name: product.product_name,
                product_name_bn: product.product_name_bn,
                product_code: product.product_code,
                description: product.description || '',
                description_bn: product.description_bn || '',
                installment_type: product.installment_type,
                duration_months: product.duration_months,
                number_of_installments: product.number_of_installments,
                min_amount: product.min_amount,
                max_amount: product.max_amount,
                interest_rate: product.interest_rate,
                service_charge: product.service_charge,
                interest_calculation_type: product.interest_calculation_type,
                gender_restriction: product.gender_restriction,
                min_age: product.min_age,
                max_age: product.max_age,
                requires_guarantor: product.requires_guarantor,
                number_of_guarantors: product.number_of_guarantors,
                eligibility_conditions: product.eligibility_conditions || {},
                required_documents: product.required_documents || [],
                is_active: product.is_active,
                display_order: product.display_order,
            });
        } else {
            reset();
        }
    }, [product, isOpen]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        if (product) {
            put(`/loan-products/${product.id}`, {
                onSuccess: () => { reset(); onClose(); },
            });
        } else {
            post('/loan-products', {
                onSuccess: () => { reset(); onClose(); },
            });
        }
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const availableDocuments = [
        { key: 'nid', label: 'জাতীয় পরিচয়পত্র (NID)' },
        { key: 'photo', label: 'ছবি' },
        { key: 'guarantor_nid', label: 'জামিনদারের NID' },
        { key: 'business_plan', label: 'ব্যবসায়িক পরিকল্পনা' },
        { key: 'trade_license', label: 'ট্রেড লাইসেন্স' },
        { key: 'bank_statement', label: 'ব্যাংক স্টেটমেন্ট' },
        { key: 'land_documents', label: 'জমির কাগজপত্র' },
        { key: 'income_plan', label: 'আয়ের পরিকল্পনা' },
        { key: 'crop_plan', label: 'ফসল পরিকল্পনা' },
        { key: 'farm_plan', label: 'খামার পরিকল্পনা' },
        { key: 'admission_letter', label: 'ভর্তি পত্র' },
        { key: 'student_id', label: 'ছাত্র আইডি' },
        { key: 'fee_structure', label: 'ফি স্ট্রাকচার' },
        { key: 'financial_statements', label: 'আর্থিক বিবরণী' },
        { key: 'technical_proposal', label: 'প্রযুক্তিগত প্রস্তাব' },
        { key: 'cost_estimate', label: 'ব্যয় প্রাক্কলন' },
        { key: 'adaptation_plan', label: 'অভিযোজন পরিকল্পনা' },
    ];

    const toggleDocument = (doc: string) => {
        const docs = data.required_documents || [];
        const updated = docs.includes(doc)
            ? docs.filter(d => d !== doc)
            : [...docs, doc];
        // @ts-ignore - Inertia useForm deep type limitation
        setData('required_documents', updated);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={handleClose} />

            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {product ? 'Edit Loan Product (ঋণ পণ্য সম্পাদনা)' : 'Create New Loan Product (নতুন ঋণ পণ্য তৈরি)'}
                    </h3>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
                    <div className="p-6 space-y-6">
                        {/* Basic Info */}
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b">Basic Information (মৌলিক তথ্য)</h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Category (ক্যাটাগরি) <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={data.loan_category_id}
                                        onChange={(e) => setData('loan_category_id', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    >
                                        <option value="">Select (নির্বাচন করুন)</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.category_name_bn} ({cat.category_code})
                                            </option>
                                        ))}
                                    </select>
                                    {errors.loan_category_id && <p className="text-red-500 text-sm mt-1">{errors.loan_category_id}</p>}
                                </div>
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
                                    {errors.product_name && <p className="text-red-500 text-sm mt-1">{errors.product_name}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Product Name (Bangla) (পণ্যের নাম) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={data.product_name_bn}
                                        onChange={(e) => setData('product_name_bn', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                    {errors.product_name_bn && <p className="text-red-500 text-sm mt-1">{errors.product_name_bn}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Product Code <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={data.product_code}
                                        onChange={(e) => setData('product_code', e.target.value.toUpperCase())}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                                        placeholder="e.g., JAG-WK-01"
                                        required
                                    />
                                    {errors.product_code && <p className="text-red-500 text-sm mt-1">{errors.product_code}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Display Order (ক্রম)</label>
                                    <input
                                        type="number"
                                        value={data.display_order}
                                        onChange={(e) => setData('display_order', parseInt(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        min={0}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description (English)</label>
                                    <textarea
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        rows={2}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description (Bangla) (বিবরণ)</label>
                                    <textarea
                                        value={data.description_bn}
                                        onChange={(e) => setData('description_bn', e.target.value)}
                                        rows={2}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Installment & Duration */}
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b">Installment & Duration (কিস্তি ও মেয়াদ)</h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Installment Type (কিস্তির ধরন) <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={data.installment_type}
                                        onChange={(e) => setData('installment_type', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="weekly">Weekly (সাপ্তাহিক)</option>
                                        <option value="monthly">Monthly (মাসিক)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Duration (Months) (মেয়াদ মাস) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={data.duration_months}
                                        onChange={(e) => setData('duration_months', parseInt(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        min={1}
                                        required
                                    />
                                    {errors.duration_months && <p className="text-red-500 text-sm mt-1">{errors.duration_months}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Number of Installments (কিস্তি সংখ্যা) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={data.number_of_installments}
                                        onChange={(e) => setData('number_of_installments', parseInt(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        min={1}
                                        required
                                    />
                                    {errors.number_of_installments && <p className="text-red-500 text-sm mt-1">{errors.number_of_installments}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Amount & Interest */}
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b">Loan Amount & Interest (ঋণের পরিমাণ ও সুদ)</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Minimum Amount (সর্বনিম্ন পরিমাণ) (৳) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={data.min_amount}
                                        onChange={(e) => setData('min_amount', parseFloat(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        min={0}
                                        step={100}
                                        required
                                    />
                                    {errors.min_amount && <p className="text-red-500 text-sm mt-1">{errors.min_amount}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Maximum Amount (সর্বোচ্চ পরিমাণ) (৳) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={data.max_amount}
                                        onChange={(e) => setData('max_amount', parseFloat(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        min={0}
                                        step={100}
                                        required
                                    />
                                    {errors.max_amount && <p className="text-red-500 text-sm mt-1">{errors.max_amount}</p>}
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 mt-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Interest Rate (সুদের হার) (%) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={data.interest_rate}
                                        onChange={(e) => setData('interest_rate', parseFloat(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        min={0}
                                        max={100}
                                        step={0.01}
                                        required
                                    />
                                    {errors.interest_rate && <p className="text-red-500 text-sm mt-1">{errors.interest_rate}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Service Charge (সার্ভিস চার্জ) (%)</label>
                                    <input
                                        type="number"
                                        value={data.service_charge}
                                        onChange={(e) => setData('service_charge', parseFloat(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        min={0}
                                        max={100}
                                        step={0.01}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Interest Calculation Type (সুদ গণনা পদ্ধতি) <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={data.interest_calculation_type}
                                        onChange={(e) => setData('interest_calculation_type', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="flat">Flat (সমান)</option>
                                        <option value="reducing">Reducing (ক্রমহ্রাসমান)</option>
                                        <option value="compound">Compound (চক্রবৃদ্ধি)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Eligibility */}
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b">Eligibility Criteria (যোগ্যতার শর্ত)</h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Gender Restriction (লিঙ্গ বিধিনিষেধ) <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={data.gender_restriction}
                                        onChange={(e) => setData('gender_restriction', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="both">Both (উভয়)</option>
                                        <option value="female">Female Only (শুধু মহিলা)</option>
                                        <option value="male">Male Only (শুধু পুরুষ)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Minimum Age (সর্বনিম্ন বয়স) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={data.min_age}
                                        onChange={(e) => setData('min_age', parseInt(e.target.value) || 18)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        min={18}
                                        max={100}
                                        required
                                    />
                                    {errors.min_age && <p className="text-red-500 text-sm mt-1">{errors.min_age}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Maximum Age (সর্বোচ্চ বয়স) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={data.max_age}
                                        onChange={(e) => setData('max_age', parseInt(e.target.value) || 60)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        min={18}
                                        max={100}
                                        required
                                    />
                                    {errors.max_age && <p className="text-red-500 text-sm mt-1">{errors.max_age}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={data.requires_guarantor}
                                            onChange={(e) => setData('requires_guarantor', e.target.checked)}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Requires Guarantor (জামিনদার প্রয়োজন)</span>
                                    </label>
                                </div>
                                {data.requires_guarantor && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Number of Guarantors (জামিনদার সংখ্যা)</label>
                                        <input
                                            type="number"
                                            value={data.number_of_guarantors}
                                            onChange={(e) => setData('number_of_guarantors', parseInt(e.target.value) || 0)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            min={0}
                                            max={5}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Required Documents */}
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b">Required Documents (প্রয়োজনীয় কাগজপত্র)</h4>
                            <div className="grid grid-cols-3 gap-2">
                                {availableDocuments.map((doc) => (
                                    <label key={doc.key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={(data.required_documents || []).includes(doc.key)}
                                            onChange={() => toggleDocument(doc.key)}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">{doc.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Active Status */}
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={data.is_active}
                                onChange={(e) => setData('is_active', e.target.checked)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">Active (সক্রিয়)</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200 sticky bottom-0">
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
                            {processing ? 'Saving... (সংরক্ষণ হচ্ছে)' : product ? 'Update (আপডেট করুন)' : 'Create (তৈরি করুন)'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
