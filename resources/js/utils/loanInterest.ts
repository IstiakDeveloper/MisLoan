/**
 * Loan interest and installment calculation helpers.
 * Supports Factor-based, Per-thousand-based, Rate-based, and Lump-sum (Sufolon) products.
 */
import { toIsoDate } from './dateUtils';

/** A signed/disbursed form must never be repriced by today's product settings. */
export function loanProductForApplication(product: any, application: any): any {
    if (!['disbursed', 'repaid'].includes(application?.status)) return product;
    const agreement = application.loan_agreement_data || {};
    const plan = application.business_plan || {};
    let pricing = agreement.product_pricing;
    if (!pricing) {
        const principal = Number(application.disbursed_amount);
        const charge = Number(
            agreement.service_charge ?? plan.total_service_charge,
        );
        const regular = Number(
            agreement.installment_amount ??
                plan.installment_total ??
                application.installment_amount,
        );
        const last = Number(
            agreement.last_installment_amount ?? plan.last_installment_amount,
        );
        const count = Number(
            agreement.number_of_installments ??
                plan.number_of_installments ??
                application.number_of_installments,
        );
        if (
            ![principal, charge, regular, last, count].every(Number.isFinite) ||
            principal <= 0 ||
            count < 1 ||
            !Number.isInteger(count) ||
            charge < 0 ||
            regular <= 0 ||
            last <= 0 ||
            Math.round((regular * (count - 1) + last) * 100) !==
                Math.round((principal + charge) * 100)
        )
            return product;
        pricing = {
            principal_paisa: Math.round(principal * 100),
            service_charge_paisa: Math.round(charge * 100),
            total_payable_paisa: Math.round((principal + charge) * 100),
            installment_paisa: Math.round(regular * 100),
            last_installment_paisa: Math.round(last * 100),
            number_of_installments: count,
            duration_months: application.loan_term_months || 12,
        };
    }
    return {
        ...product,
        ...(pricing.product_snapshot || {}),
        installment_type:
            Number(pricing.number_of_installments) === 1
                ? 'lump_sum'
                : pricing.repayment_frequency ||
                  application.repayment_frequency ||
                  pricing.product_snapshot?.installment_type ||
                  product?.installment_type,
        _saved_pricing: pricing,
        _saved_disbursed_on: String(application.disbursed_at || '').slice(
            0,
            10,
        ),
        _saved_tenure_end:
            agreement.last_installment_date || plan.loan_repayment_date,
    };
}

export function isSufolonLoan(loanCategory?: any, loanProduct?: any): boolean {
    const code = String(loanCategory?.category_code || '')
        .toUpperCase()
        .trim();
    if (code === 'SFL') return true;

    const cat =
        `${loanCategory?.category_name || ''} ${loanCategory?.category_name_bn || ''}`.toLowerCase();
    if (
        cat.includes('sufolon') ||
        cat.includes('শুফলন') ||
        cat.includes('সুফলন')
    )
        return true;

    const pCode = String(loanProduct?.product_code || '')
        .toUpperCase()
        .trim();
    if (pCode === 'SFL' || pCode.includes('SUFOLON') || pCode.startsWith('4.'))
        return true;

    const mainCode = String(loanProduct?.main_product_code || '').trim();
    if (mainCode === '4') return true;

    const pn =
        `${loanProduct?.product_name || ''} ${loanProduct?.product_name_bn || ''}`.toLowerCase();
    return (
        pn.includes('sufolon') || pn.includes('সুফলন') || pn.includes('শুফলন')
    );
}

export function getLoanDurationMonths(loanProduct: any, fallback = 12): number {
    if (loanProduct?._saved_pricing)
        return Number(loanProduct._saved_pricing.duration_months);
    const months = Number(
        loanProduct?.duration_months ??
            loanProduct?.loan_duration_months ??
            fallback,
    );
    return months > 0 ? months : fallback;
}

export function getInstallmentTypeLabel(
    loanProduct: any,
    loanCategory?: any,
): string {
    if (isSufolonLoan(loanCategory, loanProduct)) return 'এককালীন';

    const t = String(loanProduct?.installment_type || '').toLowerCase();
    if (t === 'lump_sum' || t.includes('lump') || t.includes('এককাল'))
        return 'এককালীন';
    if (t === 'weekly' || t.includes('week') || t.includes('সাপ্তাহ'))
        return 'সাপ্তাহিক কিস্তি';
    if (t === 'monthly' || t.includes('month') || t.includes('মাস'))
        return 'মাসিক কিস্তি';
    return 'মাসিক কিস্তি';
}

export function getInstallmentCount(
    loanProduct: any,
    durationMonths?: number | string | null,
    loanCategory?: any,
): number {
    if (loanProduct?._saved_pricing)
        return Number(loanProduct._saved_pricing.number_of_installments);
    // Sufolon = 1 single repayment at end of term
    if (isSufolonLoan(loanCategory, loanProduct)) return 1;

    const t = String(loanProduct?.installment_type || '').toLowerCase();
    if (t === 'lump_sum' || t.includes('lump') || t.includes('এককাল')) return 1;

    const fromProduct = Number(loanProduct?.number_of_installments) || 0;
    if (fromProduct > 0) return fromProduct;

    if (t === 'weekly' || t.includes('week') || t.includes('সাপ্তাহ'))
        return 46;

    const months = Number(
        durationMonths || getLoanDurationMonths(loanProduct, 12),
    );
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
    if (loanProduct?._saved_pricing)
        return Number(loanProduct._saved_pricing.service_charge_paisa) / 100;
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
            const months = Number(
                durationMonths || getLoanDurationMonths(loanProduct, 12),
            );
            const years = (months > 0 ? months : 12) / 12;
            return Math.round(amount * (rate / 100) * years);
        }
        if (loanProduct?.interest_calculation_type === 'reducing') {
            const factor =
                Number(loanProduct?.interest_installment_factor) || 0;
            return factor > 0
                ? Math.round(
                      amount *
                          factor *
                          getInstallmentCount(
                              loanProduct,
                              durationMonths,
                              loanCategory,
                          ),
                  )
                : 0;
        }
        return Math.round(amount * (rate / 100));
    }

    const intFactor = Number(loanProduct?.interest_installment_factor) || 0;
    const installments = getInstallmentCount(
        loanProduct,
        durationMonths,
        loanCategory,
    );
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
    customDurationMonths?: number | string | null,
) {
    const saved = loanProduct?._saved_pricing;
    if (saved) {
        return {
            loanAmount: Number(saved.principal_paisa) / 100,
            durationMonths: Number(saved.duration_months),
            numberOfInstallments: Number(saved.number_of_installments),
            serviceCharge: Number(saved.service_charge_paisa) / 100,
            totalAmount: Number(saved.total_payable_paisa) / 100,
            installmentAmount: Number(saved.installment_paisa) / 100,
            lastInstallmentAmount: Number(saved.last_installment_paisa) / 100,
            savingsInstallment: Number(loanProduct?.savings_installment) || 0,
            typeLabel: getInstallmentTypeLabel(loanProduct, loanCategory),
            lastInstallmentDate:
                loanProduct._saved_tenure_end ||
                calculateTenureEndDate(
                    loanProduct._saved_disbursed_on || customDisbursementDate,
                    Number(saved.duration_months),
                ),
        };
    }
    const amount = Number(loanAmount) || 0;
    const isLumpSum = isLumpSumProduct(loanProduct, loanCategory);
    const durationMonths =
        Number(customDurationMonths) > 0
            ? Number(customDurationMonths)
            : getLoanDurationMonths(loanProduct, 12);
    const numberOfInstallments = getInstallmentCount(
        loanProduct,
        durationMonths,
        loanCategory,
    );
    const serviceCharge = calculateTotalServiceCharge(
        amount,
        loanProduct,
        durationMonths,
        loanCategory,
    );
    const totalAmount = amount + serviceCharge;

    const loanInstFactor = Number(loanProduct?.loan_installment_factor) || 0;
    const intInstFactor = Number(loanProduct?.interest_installment_factor) || 0;
    const instPerThousand =
        Number(loanProduct?.installment_amount_per_thousand) || 0;
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
            const pInst =
                loanInstFactor > 0
                    ? amount * loanInstFactor
                    : amount / numberOfInstallments;
            const iInst =
                intInstFactor > 0
                    ? amount * intInstFactor
                    : serviceCharge / numberOfInstallments;
            installmentAmount = Math.round(pInst + iInst);
        } else {
            installmentAmount = Math.ceil(totalAmount / numberOfInstallments);
        }

        // Reconcile the final due to the contract rather than copying a rounded tariff.
        lastInstallmentAmount = Number(
            (
                totalAmount -
                installmentAmount * (numberOfInstallments - 1)
            ).toFixed(2),
        );
    }

    // Tenure ends the day before the disbursement anniversary (17/10/2026 + 1 year -> 16/10/2027).
    const lastInstallmentDate = calculateTenureEndDate(
        customDisbursementDate,
        durationMonths,
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
 * End of tenure: add the loan months, then go back one day.
 * 17/10/2026 disbursed for 12 months ends on 16/10/2027.
 */
export function calculateTenureEndDate(
    startDateStr: string | null | undefined,
    durationMonths: number,
): string {
    const raw = toIsoDate(startDateStr);
    let year: number;
    let month: number;
    let day: number;

    const parts = raw.split('-').map(Number);
    if (
        parts.length === 3 &&
        !isNaN(parts[0]) &&
        !isNaN(parts[1]) &&
        !isNaN(parts[2])
    ) {
        year = parts[0];
        month = parts[1];
        day = parts[2];
    } else {
        const now = new Date();
        year = now.getFullYear();
        month = now.getMonth() + 1;
        day = now.getDate();
    }

    const monthsToAdd = durationMonths > 0 ? durationMonths : 12;
    let targetMonth = month + monthsToAdd;
    let targetYear = year + Math.floor((targetMonth - 1) / 12);
    targetMonth = ((targetMonth - 1) % 12) + 1;

    const maxDaysInTargetMonth = new Date(targetYear, targetMonth, 0).getDate();
    let targetDay = Math.min(day, maxDaysInTargetMonth) - 1;
    if (targetDay < 1) {
        targetMonth -= 1;
        if (targetMonth < 1) {
            targetMonth = 12;
            targetYear -= 1;
        }
        targetDay = new Date(targetYear, targetMonth, 0).getDate();
    }

    const yStr = String(targetYear);
    const mStr = String(targetMonth).padStart(2, '0');
    const dStr = String(targetDay).padStart(2, '0');

    return `${yStr}-${mStr}-${dStr}`;
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
    const amount = loanProduct?._saved_pricing
        ? Number(loanProduct._saved_pricing.principal_paisa) / 100
        : Number(loanAmount) || 0;
    if (amount <= 0) return null;

    const schedule = calculateLoanSchedule(amount, loanProduct, loanCategory);
    const installments = schedule.numberOfInstallments;
    if (installments <= 0) return null;
    const split = loanProduct?._saved_pricing?.installment_split;
    if (split) {
        return {
            principal: Number(split.regular_principal_paisa) / 100,
            serviceCharge: Number(split.regular_charge_paisa) / 100,
            lastPrincipal: Number(split.last_principal_paisa) / 100,
            lastServiceCharge: Number(split.last_charge_paisa) / 100,
            installments,
            typeLabel: schedule.typeLabel,
            totalServiceCharge: schedule.serviceCharge,
            installmentAmount: schedule.installmentAmount,
            lastInstallmentAmount: schedule.lastInstallmentAmount,
            totalAmount: schedule.totalAmount,
        };
    }

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
    const principal =
        schedule.serviceCharge === 0
            ? schedule.installmentAmount
            : loanInstFactor > 0
              ? Math.round(amount * loanInstFactor)
              : Math.round(amount / installments);
    const serviceCharge = Number(
        (schedule.installmentAmount - principal).toFixed(2),
    );
    const lastPrincipal = Number(
        (amount - principal * (installments - 1)).toFixed(2),
    );
    const lastServiceCharge = Number(
        (schedule.lastInstallmentAmount - lastPrincipal).toFixed(2),
    );

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
    const schedule = calcInstallmentSchedule(
        loanAmount,
        loanProduct,
        undefined,
        loanCategory,
    );
    if (!schedule) {
        return {
            installment_type: getInstallmentTypeLabel(
                loanProduct,
                loanCategory,
            ),
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
        total_principal: String(
            loanProduct?._saved_pricing
                ? Number(loanProduct._saved_pricing.principal_paisa) / 100
                : amount,
        ),
        total_service_charge: String(schedule.totalServiceCharge),
        total_payable: String(schedule.totalAmount),
    };
}

/**
 * Resolves the Reducing Method interest rate (%) for display in loan approval forms.
 * Prioritizes product's interest_rate (e.g. 23.86%, 23.94%, 23.83%, 23.92%, 17.70%, 24%).
 */
export function getReducingServiceChargeRate(
    loanProduct: any,
    fallbackRate?: number | string | null,
    durationMonths?: number | string | null,
): string {
    const rawRate = Number(
        loanProduct && Number(loanProduct.interest_rate) > 0
            ? loanProduct.interest_rate
            : (fallbackRate ??
                  loanProduct?.service_charge ??
                  loanProduct?.service_charge_rate),
    );

    if (rawRate > 0) {
        const m =
            Number(
                durationMonths ??
                    loanProduct?.duration_months ??
                    loanProduct?.loan_duration_months ??
                    12,
            ) || 12;
        const years = m / 12;
        const annual = years > 1 ? rawRate / years : rawRate;
        // If it's already a reducing method rate (~15% - 26%)
        if (annual >= 15) {
            return String(Number(annual.toFixed(2)));
        }
        // Approximate standard declining rate from flat ~13.3%
        if (Math.abs(annual - 13.3) < 0.8) {
            return '23.86';
        }
        const reducing = annual * 1.8;
        return String(Number(reducing.toFixed(2)));
    }
    return '';
}

export const getAnnualServiceChargeRate = getReducingServiceChargeRate;
