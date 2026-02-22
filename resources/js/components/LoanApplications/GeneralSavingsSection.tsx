import React from 'react';

export interface SavingsProductOption {
    id: number;
    product_code: string;
    product_name: string;
    product_name_bn: string | null;
}

interface GeneralSavingsSectionProps {
    savingsProducts: SavingsProductOption[];
    loanProduct: { installment_type?: string; duration_months?: number };
    requestedAmount: number;
    /** Backend/default loan round (1 = ১ম, 2 = ২য়, 3+ = ৩য় ও তার উপরে) */
    loanRound: number;
    /** Current form data slice for this section */
    data: {
        general_savings_product_id?: number | string | null;
        general_savings_amount?: number;
        is_against_savings?: boolean;
        against_savings_product_id?: number | string | null;
        against_savings_amount?: number;
        /** User-selected দফা (1, 2, 3, 4, ...) when showDofaSelector is true */
        loan_round?: number;
    };
    setData: (key: string, value: any) => void;
    compact?: boolean;
    errors?: Record<string, string>;
    /** Form 4: show দফা selector (১ম, ২য়, ৩য়, অন্যান্য লিখুন) */
    showDofaSelector?: boolean;
}

const G_SAVINGS_CODE = '21.01';

/**
 * Required % for general savings:
 * - ৬ মাসিক (duration_months === 6) অথবা সুফলন (weekly): সব দফায় ১০%
 * - অন্য সব ঋণ: ১ম দফা ৫%, ২য় দফা ৭.৫%, ৩য় ও তার পরে ১০%
 * - সঞ্চয়ের বিপরিতে: সবক্ষেত্রে ২%
 */
export function getRequiredSavingsPercent(
    installmentType: string | undefined,
    loanRound: number,
    isAgainstSavings: boolean,
    durationMonths?: number
): number {
    if (isAgainstSavings) return 2;
    const weekly = str(installmentType).toLowerCase() === 'weekly';
    const sixMonthly = durationMonths != null && durationMonths === 6;
    if (weekly || sixMonthly) return 10; // ৬ মাসিক/সুফলন: সব দফায় ১০%
    if (loanRound <= 1) return 5;  // ১ম দফা ৫%
    if (loanRound === 2) return 7.5; // ২য় দফা ৭.৫%
    return 10; // ৩য় এবং তার পরে ১০%
}

function str(v: any): string {
    return v == null ? '' : String(v);
}

const DOFA_OPTIONS = [
    { value: 1, label: '১ম দফা' },
    { value: 2, label: '২য় দফা' },
    { value: 3, label: '৩য় দফা' },
] as const;

export default function GeneralSavingsSection({
    savingsProducts = [],
    loanProduct,
    requestedAmount = 0,
    loanRound = 1,
    data,
    setData,
    compact = false,
    errors = {},
    showDofaSelector = false,
}: GeneralSavingsSectionProps) {
    const isAgainstSavings = !!data.is_against_savings;
    /** Effective দফা: user-selected (Form 4) or from backend (Form 5) */
    const effectiveDofa = data.loan_round != null && data.loan_round >= 1 ? data.loan_round : loanRound;
    const durationMonths = loanProduct?.duration_months != null ? Number(loanProduct.duration_months) : undefined;
    const requiredPercent = getRequiredSavingsPercent(
        loanProduct?.installment_type,
        effectiveDofa,
        isAgainstSavings,
        durationMonths
    );
    const minAmount = Math.ceil((requestedAmount * requiredPercent) / 100);

    const isSixMonthly =
        str(loanProduct?.installment_type).toLowerCase() === 'weekly' ||
        (durationMonths != null && durationMonths === 6);

    const gSavingsProduct = savingsProducts.find((p) => p.product_code === G_SAVINGS_CODE);
    const defaultGeneralProductId = gSavingsProduct?.id ?? (savingsProducts[0]?.id ?? null);
    const generalProductId = data.general_savings_product_id != null && data.general_savings_product_id !== ''
        ? data.general_savings_product_id
        : defaultGeneralProductId;

    React.useEffect(() => {
        if ((data.general_savings_product_id == null || data.general_savings_product_id === '') && defaultGeneralProductId != null) {
            setData('general_savings_product_id', defaultGeneralProductId);
        }
    }, [defaultGeneralProductId]);

    const labelClass = compact ? 'block text-xs font-medium mb-1' : 'block text-sm font-medium mb-1';
    const inputClass = compact
        ? 'w-full border rounded px-2 py-1.5 text-sm'
        : 'w-full border rounded px-3 py-2';

    return (
        <div className="border rounded-lg p-4 bg-amber-50/50 border-amber-200 space-y-4">
            <h4 className="font-semibold text-gray-900">
                সাধারণ সঞ্চয় (G. Savings ২১.০১ অটো নির্বাচিত)
            </h4>

            {/* দফা নির্বাচন (শুধু Form 4) */}
            {showDofaSelector && !isAgainstSavings && (
                <div className="space-y-2">
                    <label className={labelClass}>ঋণের দফা নির্বাচন করুন</label>
                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={
                                effectiveDofa <= 3
                                    ? String(effectiveDofa)
                                    : 'other'
                            }
                            onChange={(e) => {
                                const v = e.target.value;
                                if (v === 'other') setData('loan_round', 4);
                                else setData('loan_round', parseInt(v, 10) || 1);
                            }}
                            className={inputClass + ' max-w-[180px]'}
                        >
                            {DOFA_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                            <option value="other">অন্যান্য (নিচে লিখুন)</option>
                        </select>
                        {effectiveDofa > 3 && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">দফা নম্বর:</span>
                                <input
                                    type="number"
                                    min={4}
                                    value={effectiveDofa}
                                    onChange={(e) => setData('loan_round', Math.max(4, parseInt(e.target.value) || 4))}
                                    className={inputClass + ' w-20'}
                                />
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-gray-600">
                        {isSixMonthly
                            ? '৬ মাসিক ঋণ: সব দফায় ১০% সাধারণ সঞ্চয়।'
                            : '১ম দফা ৫%, ২য় দফা ৭.৫%, ৩য় ও তার পরে ১০%।'}
                    </p>
                </div>
            )}

            {/* General savings product: auto G.Savings 21.01 */}
            {savingsProducts.length > 0 && (
                <div>
                    <label className={labelClass}>সাধারণ সঞ্চয় পণ্য</label>
                    <select
                        value={generalProductId ?? ''}
                        onChange={(e) => setData('general_savings_product_id', e.target.value ? Number(e.target.value) : defaultGeneralProductId)}
                        className={inputClass}
                    >
                        {savingsProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.product_name} ({p.product_code}) {p.product_name_bn ? `- ${p.product_name_bn}` : ''}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-600 mt-0.5">
                        যেকোনো ঋণ আবেদনে সাধারণ সঞ্চয় হিসেবে G. Savings (কোড ২১.০১) ব্যবহার করুন।
                    </p>
                </div>
            )}

            {/* সঞ্চয়ের বিপরিতে checkbox */}
            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="is_against_savings"
                    checked={isAgainstSavings}
                    onChange={(e) => setData('is_against_savings', e.target.checked)}
                    className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="is_against_savings" className="text-sm font-medium text-gray-800">
                    সঞ্চয়ের বিপরিতে (চেক করলে শুধু ২% সাধারণ সঞ্চয় লাগবে)
                </label>
            </div>

            {isAgainstSavings ? (
                <>
                    <div>
                        <label className={labelClass}>কোন সঞ্চয়ের বিপরিতে (পণ্য নির্বাচন)</label>
                        <select
                            value={data.against_savings_product_id ?? ''}
                            onChange={(e) => setData('against_savings_product_id', e.target.value ? Number(e.target.value) : '')}
                            className={inputClass}
                        >
                            <option value="">নির্বাচন করুন</option>
                            {savingsProducts.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.product_name} ({p.product_code})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>সেই সঞ্চয়ের পরিমাণ (৳)</label>
                        <input
                            type="number"
                            min={0}
                            step={1}
                            value={data.against_savings_amount ?? ''}
                            onChange={(e) => setData('against_savings_amount', e.target.value === '' ? '' : parseFloat(e.target.value))}
                            className={inputClass}
                        />
                    </div>
                    <p className="text-xs text-amber-800 bg-amber-100 border border-amber-300 rounded px-2 py-1">
                        সঞ্চয়ের বিপরিতে হলে সাধারণ সঞ্চয় সর্বনিম্ন ২% ({requestedAmount ? `৳${Math.ceil((requestedAmount * 2) / 100).toLocaleString('bn-BD')}` : '—'}) থাকলেই হবে।
                    </p>
                </>
            ) : (
                <p className="text-xs text-gray-600">
                    {isSixMonthly
                        ? '৬ মাসিক ঋণ: সব দফায় সাধারণ সঞ্চয় সর্বনিম্ন ১০%'
                        : `১ম দফা ৫%, ২য় দফা ৭.৫%, ৩য় ও তার পরে ১০%। বর্তমান দফা: ${effectiveDofa} — সর্বনিম্ন ${requiredPercent}% = ৳${minAmount.toLocaleString('bn-BD')}`}
                </p>
            )}

            {/* General savings amount */}
            <div>
                <label className={labelClass}>
                    সাধারণ সঞ্চয়ের পরিমাণ (৳) <span className="text-red-600">*</span> সর্বনিম্ন ৳{minAmount.toLocaleString('bn-BD')} ({requiredPercent}%)
                </label>
                <input
                    type="number"
                    min={0}
                    step={1}
                    value={data.general_savings_amount ?? ''}
                    onChange={(e) => setData('general_savings_amount', e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className={inputClass}
                />
                {errors.general_savings_amount && (
                    <p className="text-red-600 text-xs mt-1">{errors.general_savings_amount}</p>
                )}
            </div>
        </div>
    );
}
