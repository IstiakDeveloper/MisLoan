/**
 * Flat service-charge / interest helpers for loan products.
 *
 * - If `service_charge_per_thousand` is set → use that as total charge for the term.
 * - Else `interest_rate` is treated as an **annual** % and prorated by duration_months/12.
 *   (Fixes 6-month products incorrectly charging a full year of interest.)
 */

export function getLoanDurationMonths(loanProduct: any, fallback = 12): number {
    const months = Number(
        loanProduct?.duration_months ?? loanProduct?.loan_duration_months ?? fallback,
    );
    return months > 0 ? months : fallback;
}

export function calculateTotalServiceCharge(loanAmount: number, loanProduct: any): number {
    const amount = Number(loanAmount) || 0;
    if (amount <= 0) return 0;

    const scPerThousand = Number(loanProduct?.service_charge_per_thousand) || 0;
    if (scPerThousand > 0) {
        return (amount / 1000) * scPerThousand;
    }

    const rate = Number(
        loanProduct?.interest_rate ??
            loanProduct?.service_charge ??
            loanProduct?.service_charge_rate ??
            0,
    );
    if (rate <= 0) return 0;

    const months = getLoanDurationMonths(loanProduct, 12);
    return amount * (rate / 100) * (months / 12);
}

export function getInstallmentTypeLabel(loanProduct: any, loanCategory?: any): string {
    // Sufolon: single repayment at end of term (e.g. 6 months) — never monthly
    if (isSufolonLoan(loanCategory, loanProduct)) return 'এককালীন';

    const t = String(loanProduct?.installment_type || '').toLowerCase();
    if (t === 'lump_sum' || t.includes('lump') || t.includes('এককাল')) return 'এককালীন';
    if (t === 'weekly' || t.includes('week') || t.includes('সাপ্তাহ')) return 'সাপ্তাহিক কিস্তি';
    if (t === 'monthly' || t.includes('month') || t.includes('মাস')) return 'মাসিক কিস্তি';
    return 'মাসিক কিস্তি';
}

export function getInstallmentCount(
    loanProduct: any,
    durationMonths?: number | string | null,
    loanCategory?: any,
): number {
    // Sufolon = one lump-sum repayment for the full term
    if (isSufolonLoan(loanCategory, loanProduct)) return 1;

    const t = String(loanProduct?.installment_type || '').toLowerCase();
    if (t === 'lump_sum' || t.includes('lump')) return 1;

    const months = Number(durationMonths || getLoanDurationMonths(loanProduct, 0));
    const fromProduct = Number(loanProduct?.number_of_installments) || 0;
    if (fromProduct > 0) return fromProduct;
    return months > 0 ? months : 0;
}

/** Per-installment principal + service charge */
export function calcInstallmentSchedule(
    loanAmount: number,
    loanProduct: any,
    durationMonths?: number | string | null,
    loanCategory?: any,
): { principal: number; serviceCharge: number; installments: number; typeLabel: string; totalServiceCharge: number } | null {
    const amount = Number(loanAmount) || 0;
    if (amount <= 0) return null;

    const installments = getInstallmentCount(loanProduct, durationMonths, loanCategory);
    if (installments <= 0) return null;

    const totalServiceCharge = calculateTotalServiceCharge(amount, loanProduct);

    return {
        principal: Math.round(amount / installments),
        serviceCharge: Math.round(totalServiceCharge / installments),
        installments,
        typeLabel: getInstallmentTypeLabel(loanProduct, loanCategory),
        totalServiceCharge,
    };
}

export function isSufolonLoan(loanCategory?: any, loanProduct?: any): boolean {
    const code = String(loanCategory?.category_code || '').toUpperCase().trim();
    if (code === 'SFL') return true;

    const cat = `${loanCategory?.category_name || ''} ${loanCategory?.category_name_bn || ''}`.toLowerCase();
    if (cat.includes('sufolon') || cat.includes('শুফলন') || cat.includes('সুফলন')) return true;

    const pCode = String(loanProduct?.product_code || '').toUpperCase().trim();
    if (pCode === 'SFL' || pCode.includes('SUFOLON')) return true;

    const pn = `${loanProduct?.product_name || ''} ${loanProduct?.product_name_bn || ''}`.toLowerCase();
    return pn.includes('sufolon') || pn.includes('সুফলন') || pn.includes('শুফলন');
}
