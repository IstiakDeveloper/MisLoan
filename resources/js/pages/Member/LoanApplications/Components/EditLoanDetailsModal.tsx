import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    Banknote,
    CreditCard,
    X,
    Info,
    Check,
    Loader2,
    ShieldAlert,
    Clock,
    Calculator,
} from 'lucide-react';

interface Props {
    open: boolean;
    onClose: () => void;
    application: any;
    categories: any[];
    isSuperAdmin?: boolean;
    isFieldOfficer?: boolean;
}

export default function EditLoanDetailsModal({
    open,
    onClose,
    application,
    categories = [],
    isSuperAdmin = false,
    isFieldOfficer = false,
}: Props) {
    if (!open || !application) return null;

    const initialCatId = String(
        application.loan_category_id ||
            application.loan_category?.id ||
            application.loanCategory?.id ||
            ''
    );
    const initialProdId = String(
        application.loan_product_id ||
            application.loan_product?.id ||
            application.loanProduct?.id ||
            ''
    );

    const [categoryId, setCategoryId] = useState<string>(initialCatId);
    const [productId, setProductId] = useState<string>(initialProdId);
    const [requestedAmount, setRequestedAmount] = useState<string>(
        String(application.requested_amount || '')
    );
    const [installmentCount, setInstallmentCount] = useState<string>(
        String(application.number_of_installments || '')
    );
    const [durationMonths, setDurationMonths] = useState<string>(
        String(application.loan_term_months || application.duration_months || '12')
    );
    const [repaymentFrequency, setRepaymentFrequency] = useState<'weekly' | 'monthly'>(
        application.repayment_frequency === 'monthly' ? 'monthly' : 'weekly'
    );
    const [purposeOfLoan, setPurposeOfLoan] = useState<string>(
        application.purpose_of_loan || application.loan_purpose || ''
    );

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Active Category & Products
    const activeCategory = categories.find((c) => String(c.id) === String(categoryId));
    const categoryProducts = activeCategory?.loan_products || [];
    const activeProduct =
        categories
            .flatMap((c) => c.loan_products || [])
            .find((p) => String(p.id) === String(productId)) || null;

    useEffect(() => {
        setCategoryId(initialCatId);
        setProductId(initialProdId);
        setRequestedAmount(String(application.requested_amount || ''));
        setInstallmentCount(String(application.number_of_installments || ''));
        setDurationMonths(
            String(application.loan_term_months || application.duration_months || '12')
        );
        setRepaymentFrequency(
            application.repayment_frequency === 'monthly' ? 'monthly' : 'weekly'
        );
        setPurposeOfLoan(application.purpose_of_loan || application.loan_purpose || '');
        setError(null);
    }, [open, application]);

    const handleCategoryChange = (newCatId: string) => {
        setCategoryId(newCatId);
        const cat = categories.find((c) => String(c.id) === newCatId);
        const firstProd = cat?.loan_products?.[0];
        if (firstProd) {
            setProductId(String(firstProd.id));
            if (firstProd.number_of_installments) {
                setInstallmentCount(String(firstProd.number_of_installments));
            }
            if (firstProd.duration_months) {
                setDurationMonths(String(firstProd.duration_months));
            }
            if (firstProd.installment_type) {
                setRepaymentFrequency(
                    firstProd.installment_type === 'monthly' ? 'monthly' : 'weekly'
                );
            }
        } else {
            setProductId('');
        }
    };

    const handleProductChange = (newProdId: string) => {
        setProductId(newProdId);
        const prod = categories
            .flatMap((c) => c.loan_products || [])
            .find((p) => String(p.id) === newProdId);
        if (prod) {
            if (prod.number_of_installments) {
                setInstallmentCount(String(prod.number_of_installments));
            }
            if (prod.duration_months) {
                setDurationMonths(String(prod.duration_months));
            }
            if (prod.installment_type) {
                setRepaymentFrequency(
                    prod.installment_type === 'monthly' ? 'monthly' : 'weekly'
                );
            }
        }
    };

    // Dynamic Calculations
    const numAmount = parseFloat(requestedAmount) || 0;
    const interestRate = parseFloat(activeProduct?.interest_rate || '0') || 0;
    const serviceCharge = Math.round(numAmount * (interestRate / 100));
    const totalRepayable = numAmount + serviceCharge;
    const numInstallments = parseInt(installmentCount) || 1;
    const installmentAmount =
        numInstallments > 0 ? Math.round(totalRepayable / numInstallments) : 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!categoryId || !productId) {
            setError('ক্যাটাগরি ও প্রোডাক্ট নির্বাচন করুন।');
            return;
        }
        if (numAmount < 1000) {
            setError('আবেদিত ঋণের পরিমাণ সর্বনিম্ন ১,০০০ টাকা হতে হবে।');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        const url = `/member/loan-applications/${application.id}/update-loan-product`;

        router.patch(
            url,
            {
                loan_category_id: categoryId,
                loan_product_id: productId,
                requested_amount: numAmount,
                number_of_installments: numInstallments,
                loan_term_months: parseInt(durationMonths) || 12,
                repayment_frequency: repaymentFrequency,
                purpose_of_loan: purposeOfLoan,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSubmitting(false);
                    onClose();
                },
                onError: (errs) => {
                    setIsSubmitting(false);
                    const firstErr = Object.values(errs)[0];
                    setError(
                        typeof firstErr === 'string'
                            ? firstErr
                            : 'ঋণ বিবরণ সংরক্ষণ করতে ব্যর্থ হয়েছে।'
                    );
                },
            }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 print:hidden overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="border-b px-5 py-4 bg-gradient-to-r from-indigo-700 to-indigo-800 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-white/10 text-white">
                            <Banknote className="w-5 h-5 text-emerald-300" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold flex items-center gap-2">
                                ঋণ বিবরণ ও শর্তাবলী সম্পাদনা
                            </h3>
                            <p className="text-xs text-indigo-100 mt-0.5">
                                আবেদন নং: {application.application_no || '-'}{' '}
                                {application.member_admission?.applicant_name_bn &&
                                    `· ${application.member_admission.applicant_name_bn}`}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Role Status Callout Banner */}
                {isSuperAdmin ? (
                    <div className="bg-emerald-50 border-b border-emerald-100 px-5 py-2.5 flex items-center gap-2 text-xs text-emerald-900 font-semibold">
                        <ShieldAlert className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                            সুপার অ্যাডমিন ক্ষমতা: আপনি যেকোনো পর্যায়ে ঋণের বিবরণ ও শর্তাবলী সম্পাদনা করতে পারেন।
                        </span>
                    </div>
                ) : (
                    <div className="bg-blue-50 border-b border-blue-100 px-5 py-2.5 flex items-center gap-2 text-xs text-blue-900 font-semibold">
                        <Info className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>ফিল্ড অফিসার মোড: খসড়া অবস্থায় ঋণ বিবরণ পরিবর্তন করা যাবে।</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[78vh] overflow-y-auto">
                    {error && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                            {error}
                        </div>
                    )}

                    {/* 1. Category & Product */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                ঋণ ক্যাটাগরি: <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={categoryId}
                                onChange={(e) => handleCategoryChange(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                required
                            >
                                <option value="">ক্যাটাগরি নির্বাচন করুন...</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.category_name_bn || cat.category_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                ঋণ প্রোডাক্ট: <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={productId}
                                onChange={(e) => handleProductChange(e.target.value)}
                                disabled={!categoryId || categoryProducts.length === 0}
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-indigo-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                                required
                            >
                                <option value="">
                                    {categoryProducts.length === 0
                                        ? 'প্রোডাক্ট নেই'
                                        : 'প্রোডাক্ট নির্বাচন করুন...'}
                                </option>
                                {categoryProducts.map((prod) => (
                                    <option key={prod.id} value={prod.id}>
                                        {prod.product_name_bn || prod.product_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* 2. Amount & Frequency */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                আবেদিত ঋণের পরিমাণ (৳): <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">
                                    ৳
                                </span>
                                <input
                                    type="number"
                                    min="1000"
                                    step="500"
                                    value={requestedAmount}
                                    onChange={(e) => setRequestedAmount(e.target.value)}
                                    placeholder="50000"
                                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold text-emerald-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                কিস্তির ধরন (Repayment Frequency):
                            </label>
                            <select
                                value={repaymentFrequency}
                                onChange={(e) =>
                                    setRepaymentFrequency(
                                        e.target.value as 'weekly' | 'monthly'
                                    )
                                }
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="weekly">সাপ্তাহিক (Weekly)</option>
                                <option value="monthly">মাসিক (Monthly)</option>
                            </select>
                        </div>
                    </div>

                    {/* 3. Installments & Duration */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                কিস্তির সংখ্যা (Number of Installments):
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="200"
                                value={installmentCount}
                                onChange={(e) => setInstallmentCount(e.target.value)}
                                placeholder="46"
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                ঋণের মেয়াদ (Duration in Months):
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="60"
                                value={durationMonths}
                                onChange={(e) => setDurationMonths(e.target.value)}
                                placeholder="12"
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    {/* 4. Purpose of Loan */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            ঋণের উদ্দেশ্য (Purpose of Loan):
                        </label>
                        <input
                            type="text"
                            value={purposeOfLoan}
                            onChange={(e) => setPurposeOfLoan(e.target.value)}
                            placeholder="যেমন: ব্যবসা সম্প্রসারণ / কৃষি কাজ / গৃহ সংস্কার"
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    {/* 5. Live Calculation Preview Box */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-slate-700 font-bold border-b pb-1.5 border-slate-200">
                            <span className="flex items-center gap-1.5 text-indigo-700">
                                <Calculator className="w-4 h-4" /> স্বয়ংক্রিয় হিসাব বিবরণী
                            </span>
                            <span className="text-[11px] font-normal text-slate-500">
                                সুদের হার: {interestRate}%
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                                <span className="text-slate-500">আবেদিত মূল ঋণ:</span>{' '}
                                <span className="font-bold text-slate-900">
                                    ৳{numAmount.toLocaleString('bn-BD')}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-500">সার্ভিস চার্জ:</span>{' '}
                                <span className="font-bold text-slate-900">
                                    ৳{serviceCharge.toLocaleString('bn-BD')}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-500">মোট পরিশোধযোগ্য:</span>{' '}
                                <span className="font-bold text-emerald-700">
                                    ৳{totalRepayable.toLocaleString('bn-BD')}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-500">প্রতি কিস্তি পরিমাণ:</span>{' '}
                                <span className="font-bold text-indigo-700">
                                    ৳{installmentAmount.toLocaleString('bn-BD')} ({numInstallments} টি)
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 6. Form Sync Auto-Update Notice */}
                    <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
                        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                            <b>সরাসরি ফর্ম আপডেট:</b> তথ্য সংরক্ষণ করলে ঋণ আবেদনপত্রের পাশাপাশি এর সাথে যুক্ত সকল ফর্ম (চুক্তিপত্র ফর্ম ১, জামিনদার ফর্ম ২, মৃত্যুঝুঁকি ফর্ম ৩, সরেজমিন ফর্ম ৪ ও অগ্রগতির প্রোফাইল ফর্ম ৫) স্বয়ংক্রিয়ভাবে নতুন তথ্যে হালনাগাদ হয়ে যাবে।
                        </span>
                    </div>

                    {/* Modal Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="rounded-xl text-xs"
                        >
                            বাতিল
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !categoryId || !productId || numAmount <= 0}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs px-5 flex items-center gap-1.5"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>সংরক্ষণ ও ফর্ম আপডেট হচ্ছে...</span>
                                </>
                            ) : (
                                <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>সংরক্ষণ করুন</span>
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
