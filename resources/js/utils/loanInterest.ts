/**
 * Loan interest and installment calculation helpers.
 * Supports Factor-based, Per-thousand-based, Rate-based, and Lump-sum (Sufolon) products.
 */

export function isSufolonLoan(loanCategory?: any, loanProduct?: any): boolean {
    const code = String(loanCategory?.category_code || '').toUpperCase().trim();
    if (code === 'SFL') return true;

    const cat = `${loanCategory?.category_name || ''} ${loanCategory?.category_name_bn || ''}`.toLowerCase();
    if (cat.includes('sufolon') || cat.includes('শুফলন') || cat.includes('সুফলন')) return true;

    const pCode = String(loanProduct?.product_code || '').toUpperCase().trim();
    if (pCode === 'SFL' || pCode.includes('SUFOLON') || pCode.startsWith('4.')) return true;

    const mainCode = String(loanProduct?.main_product_code || '').trim();
    if (mainCode === '4') return true;

    const pn = `${loanProduct?.product_name || ''} ${loanProduct?.product_name_bn || ''}`.toLowerCase();
    return pn.includes('sufolon') || pn.includes('সুফলন') || pn.includes('শুফলন');
}

export function getLoanDurationMonths(loanProduct: any, fallback = 12): number {
    const months = Number(
        loanProduct?.duration_months ?? loanProduct?.loan_duration_months ?? fallback,
    );
    return months > 0 ? months : fallback;
}

export function getInstallmentTypeLabel(loanProduct: any, loanCategory?: any): string {
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
    // Sufolon = 1 single repayment at end of term
    if (isSufolonLoan(loanCategory, loanProduct)) return 1;

    const t = String(loanProduct?.installment_type || '').toLowerCase();
    if (t === 'lump_sum' || t.includes('lump') || t.includes('এককাল')) return 1;

    const fromProduct = Number(loanProduct?.number_of_installments) || 0;
    if (fromProduct > 0) return fromProduct;

    if (t === 'weekly' || t.includes('week') || t.includes('সাপ্তাহ')) return 46;

    const months = Number(durationMonths || getLoanDurationMonths(loanProduct, 12));
    return months > 0 ? months : 12;
}

function isLumpSumProduct(loanProduct: any, loanCategory?: any): boolean {
    if (isSufolonLoan(loanCategory, loanProduct)) return true;
    const t = String(loanProduct?.installment_type || '').toLowerCase();
    return t === 'lump_sum' || t.includes('lump') || t.includes('এককাল');
}

export function calculateTotalServiceCharge(
    loanAmount: number,
    loanProduct: any,
    durationMonths?: number | string | null,
    loanCategory?: any,
): number {
    const amount = Number(loanAmount) || 0;
    if (amount <= 0) return 0;

    const scPerThousand = Number(loanProduct?.service_charge_per_thousand) || 0;
    if (scPerThousand > 0) {
        return Math.round((amount / 1000) * scPerThousand);
    }

    const rate = Number(
        loanProduct?.interest_rate ??
            loanProduct?.service_charge ??
            loanProduct?.service_charge_rate ??
            0,
    );

    if (rate > 0) {
        // Sufolon/lump-sum rates are annual (scale by tenure).
        // Monthly/weekly product rates already include the full tenure
        // (13.30% for 1yr, 19.90% for 1.5yr, 26.60% for 2yr).
        if (isLumpSumProduct(loanProduct, loanCategory)) {
            const months = Number(durationMonths || getLoanDurationMonths(loanProduct, 12));
            const years = (months > 0 ? months : 12) / 12;
            return Math.round(amount * (rate / 100) * years);
        }
        return Math.round(amount * (rate / 100));
    }

    const intFactor = Number(loanProduct?.interest_installment_factor) || 0;
    const installments = getInstallmentCount(loanProduct, durationMonths, loanCategory);
    if (intFactor > 0 && installments > 0) {
        return Math.round(amount * intFactor * installments);
    }

    return 0;
}

/**
 * Complete schedule calculator for any loan product
 */
export function calculateLoanSchedule(
    loanAmount: number,
    loanProduct: any,
    loanCategory?: any,
    customDisbursementDate?: string | null,
) {
    const amount = Number(loanAmount) || 0;
    const rawType = String(loanProduct?.installment_type || '').toLowerCase();
    const isLumpSum = isLumpSumProduct(loanProduct, loanCategory);
    const durationMonths = getLoanDurationMonths(loanProduct, 12);
    const numberOfInstallments = getInstallmentCount(loanProduct, durationMonths, loanCategory);
    const serviceCharge = calculateTotalServiceCharge(amount, loanProduct, durationMonths, loanCategory);
    const totalAmount = amount + serviceCharge;

    const loanInstFactor = Number(loanProduct?.loan_installment_factor) || 0;
    const intInstFactor = Number(loanProduct?.interest_installment_factor) || 0;
    const instPerThousand = Number(loanProduct?.installment_amount_per_thousand) || 0;
    const lastInstPerThousand = Number(loanProduct?.last_installment_per_thousand) || 0;
    const savingsInstallment = Number(loanProduct?.savings_installment) || 0;

    let installmentAmount = 0;
    let lastInstallmentAmount = 0;

    if (isLumpSum || numberOfInstallments <= 1) {
        installmentAmount = totalAmount;
        lastInstallmentAmount = totalAmount;
    } else {
        if (instPerThousand > 0) {
            installmentAmount = Math.round((amount / 1000) * instPerThousand);
        } else if (loanInstFactor > 0 || intInstFactor > 0) {
            const pInst = loanInstFactor > 0 ? (amount * loanInstFactor) : (amount / numberOfInstallments);
            const iInst = intInstFactor > 0 ? (amount * intInstFactor) : (serviceCharge / numberOfInstallments);
            installmentAmount = Math.round(pInst + iInst);
        } else {
            installmentAmount = Math.ceil(totalAmount / numberOfInstallments);
        }

        if (lastInstPerThousand > 0) {
            lastInstallmentAmount = Math.round((amount / 1000) * lastInstPerThousand);
        } else {
            lastInstallmentAmount = totalAmount - (installmentAmount * (numberOfInstallments - 1));
            if (lastInstallmentAmount <= 0) {
                lastInstallmentAmount = installmentAmount;
            }
        }
    }

    // Calculate last installment date (Sufolon/Lump-sum = tenure months minus 1 day; e.g. 20/08 + 6m -> 19/02)
    const isWeekly = rawType === 'weekly' || rawType.includes('week');
    const lastInstallmentDate = calculateTenureEndDate(
        customDisbursementDate,
        durationMonths,
        isLumpSum,
        isWeekly,
        numberOfInstallments
    );

    return {
        loanAmount: amount,
        durationMonths,
        numberOfInstallments,
        serviceCharge,
        totalAmount,
        installmentAmount,
        lastInstallmentAmount,
        savingsInstallment,
        typeLabel: getInstallmentTypeLabel(loanProduct, loanCategory),
        lastInstallmentDate,
    };
}

/**
 * Helper to safely calculate end date by adding months/days to YYYY-MM-DD without timezone shifts
 */
export function calculateTenureEndDate(
    startDateStr: string | null | undefined,
    durationMonths: number,
    isLumpSum: boolean,
    isWeekly: boolean,
    numberOfInstallments: number,
): string {
    const raw = (startDateStr || '').trim().split('T')[0];
    let year: number;
    let month: number;
    let day: number;

    const parts = raw.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        year = parts[0];
        month = parts[1]; // 1-12
        day = parts[2];
    } else {
        const now = new Date();
        year = now.getFullYear();
        month = now.getMonth() + 1;
        day = now.getDate();
    }

    if (isLumpSum) {
        // e.g. 20/08/2026 + 6 months -> Month 2, Year 2027. Minus 1 day -> Day 19.
        let targetMonth = month + durationMonths;
        let targetYear = year + Math.floor((targetMonth - 1) / 12);
        targetMonth = ((targetMonth - 1) % 12) + 1;

        let targetDay = day - 1;
        if (targetDay < 1) {
            targetMonth -= 1;
            if (targetMonth < 1) {
                targetMonth = 12;
                targetYear -= 1;
            }
            targetDay = new Date(targetYear, targetMonth, 0).getDate();
        } else {
            const maxDaysInMonth = new Date(targetYear, targetMonth, 0).getDate();
            if (targetDay > maxDaysInMonth) {
                targetDay = maxDaysInMonth;
            }
        }

        const yStr = String(targetYear);
        const mStr = String(targetMonth).padStart(2, '0');
        const dStr = String(targetDay).padStart(2, '0');
        return `${yStr}-${mStr}-${dStr}`;
    } else if (isWeekly) {
        const d = new Date(year, month - 1, day);
        d.setDate(d.getDate() + (numberOfInstallments * 7));
        const yStr = String(d.getFullYear());
        const mStr = String(d.getMonth() + 1).padStart(2, '0');
        const dStr = String(d.getDate()).padStart(2, '0');
        return `${yStr}-${mStr}-${dStr}`;
    } else {
        let targetMonth = month + numberOfInstallments;
        let targetYear = year + Math.floor((targetMonth - 1) / 12);
        targetMonth = ((targetMonth - 1) % 12) + 1;
        const maxDaysInMonth = new Date(targetYear, targetMonth, 0).getDate();
        const targetDay = Math.min(day, maxDaysInMonth);

        const yStr = String(targetYear);
        const mStr = String(targetMonth).padStart(2, '0');
        const dStr = String(targetDay).padStart(2, '0');
        return `${yStr}-${mStr}-${dStr}`;
    }
}

/** Per-installment principal + service charge for approval form pages */
export function calcInstallmentSchedule(
    loanAmount: number,
    loanProduct: any,
    durationMonths?: number | string | null,
    loanCategory?: any,
): {
    principal: number;
    serviceCharge: number;
    lastPrincipal: number;
    lastServiceCharge: number;
    installments: number;
    typeLabel: string;
    totalServiceCharge: number;
    installmentAmount: number;
    lastInstallmentAmount: number;
    totalAmount: number;
} | null {
    const amount = Number(loanAmount) || 0;
    if (amount <= 0) return null;

    const schedule = calculateLoanSchedule(amount, loanProduct, loanCategory);
    const installments = schedule.numberOfInstallments;
    if (installments <= 0) return null;

    if (installments <= 1) {
        return {
            principal: amount,
            serviceCharge: schedule.serviceCharge,
            lastPrincipal: amount,
            lastServiceCharge: schedule.serviceCharge,
            installments,
            typeLabel: schedule.typeLabel,
            totalServiceCharge: schedule.serviceCharge,
            installmentAmount: schedule.installmentAmount,
            lastInstallmentAmount: schedule.lastInstallmentAmount,
            totalAmount: schedule.totalAmount,
        };
    }

    const loanInstFactor = Number(loanProduct?.loan_installment_factor) || 0;
    const intInstFactor = Number(loanProduct?.interest_installment_factor) || 0;

    const principal = loanInstFactor > 0
        ? Math.round(amount * loanInstFactor)
        : Math.round(amount / installments);
    const serviceCharge = intInstFactor > 0
        ? Math.round(amount * intInstFactor)
        : Math.round(schedule.installmentAmount - principal);

    const lastPrincipal = Math.round(amount - principal * (installments - 1));
    const lastServiceCharge = Math.round(schedule.lastInstallmentAmount - lastPrincipal);

    return {
        principal,
        serviceCharge,
        lastPrincipal,
        lastServiceCharge,
        installments,
        typeLabel: schedule.typeLabel,
        totalServiceCharge: schedule.serviceCharge,
        installmentAmount: schedule.installmentAmount,
        lastInstallmentAmount: schedule.lastInstallmentAmount,
        totalAmount: schedule.totalAmount,
    };
}

/** Form field map for কিস্তির ধরণ / আসল / সার্ভিস চার্জ / মোট */
export function installmentFormFields(
    loanAmount: number,
    loanProduct: any,
    loanCategory?: any,
): {
    installment_type: string;
    installment_principal: string;
    installment_service_charge: string;
    installment_total: string;
    number_of_installments: string;
    last_installment_amount: string;
    last_installment_principal: string;
    last_installment_service_charge: string;
    total_principal: string;
    total_service_charge: string;
    total_payable: string;
} {
    const schedule = calcInstallmentSchedule(loanAmount, loanProduct, undefined, loanCategory);
    if (!schedule) {
        return {
            installment_type: getInstallmentTypeLabel(loanProduct, loanCategory),
            installment_principal: '',
            installment_service_charge: '',
            installment_total: '',
            number_of_installments: '',
            last_installment_amount: '',
            last_installment_principal: '',
            last_installment_service_charge: '',
            total_principal: '',
            total_service_charge: '',
            total_payable: '',
        };
    }

    const amount = Number(loanAmount) || 0;

    return {
        installment_type: schedule.typeLabel,
        installment_principal: String(schedule.principal),
        installment_service_charge: String(schedule.serviceCharge),
        installment_total: String(schedule.installmentAmount),
        number_of_installments: String(schedule.installments),
        last_installment_amount: String(schedule.lastInstallmentAmount),
        last_installment_principal: String(schedule.lastPrincipal),
        last_installment_service_charge: String(schedule.lastServiceCharge),
        total_principal: String(amount),
        total_service_charge: String(schedule.totalServiceCharge),
        total_payable: String(schedule.totalAmount),
    };
}
