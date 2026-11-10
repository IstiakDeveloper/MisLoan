import { buildSync } from 'esbuild';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const bundle = buildSync({
    entryPoints: [
        fileURLToPath(
            new URL(
                '../../resources/js/utils/loanInterest.ts',
                import.meta.url,
            ),
        ),
    ],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
});
const {
    calculateLoanSchedule,
    calcInstallmentSchedule,
    loanProductForApplication,
    installmentFormFields,
} = await import(
    `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString('base64')}`
);
const weekly = {
    product_code: '1.01',
    interest_calculation_type: 'flat',
    interest_rate: '12.70',
    duration_months: 12,
    installment_type: 'weekly',
    number_of_installments: 46,
    service_charge_per_thousand: '127',
    installment_amount_per_thousand: '25',
    last_installment_per_thousand: '2',
    loan_installment_factor: '0.0222',
    interest_installment_factor: '0.0028',
};

test('the four-page form preview matches the product-based final contract', () => {
    const schedule = calculateLoanSchedule(50000, weekly);
    assert.equal(schedule.serviceCharge, 6350);
    assert.equal(schedule.installmentAmount, 1250);
    assert.equal(schedule.lastInstallmentAmount, 100);
    const split = calcInstallmentSchedule(50000, weekly);
    assert.equal(split.principal, 1110);
    assert.equal(split.serviceCharge, 140);
    assert.equal(split.lastPrincipal, 50);
    assert.equal(split.lastServiceCharge, 50);
});

test('rounded final tariff never changes the total repayable amount', () => {
    for (const amount of [10001, 50000.01, 99999.99]) {
        const schedule = calculateLoanSchedule(amount, weekly);
        assert.equal(
            Math.round(
                (schedule.installmentAmount * 45 +
                    schedule.lastInstallmentAmount) *
                    100,
            ),
            Math.round(schedule.totalAmount * 100),
        );
    }
});

test('reducing products use configured factors instead of treating the annual rate as flat', () => {
    const schedule = calculateLoanSchedule(30000, {
        interest_calculation_type: 'reducing',
        interest_rate: '24',
        duration_months: 12,
        installment_type: 'monthly',
        number_of_installments: 12,
        loan_installment_factor: '0.08333333',
        interest_installment_factor: '0.01108333',
    });
    assert.equal(schedule.serviceCharge, 3990);
    assert.equal(schedule.installmentAmount, 2832);
    assert.equal(schedule.lastInstallmentAmount, 2838);
});

test('Sufolon and zero-charge forms retain their configured conventions and exact principal', () => {
    const lump = calculateLoanSchedule(50000, {
        product_code: '4.04',
        interest_calculation_type: 'reducing',
        interest_rate: '24',
        duration_months: 6,
        installment_type: 'monthly',
        number_of_installments: 6,
    });
    assert.equal(lump.numberOfInstallments, 1);
    assert.equal(lump.serviceCharge, 6000);
    const zero = calcInstallmentSchedule(100.01, {
        installment_type: 'monthly',
        duration_months: 3,
        number_of_installments: 3,
    });
    assert.equal(zero.principal, 34);
    assert.equal(zero.serviceCharge, 0);
    assert.equal(zero.lastPrincipal, 32.01);
    assert.equal(zero.lastServiceCharge, 0);
});

test('signed form previews use frozen terms even when the current product and approved amount differ', () => {
    const application = {
        status: 'disbursed',
        disbursed_amount: '50000',
        approved_amount: '60000',
        disbursed_at: '2026-11-01',
        loan_agreement_data: {
            product_pricing: {
                principal_paisa: 5000000,
                service_charge_paisa: 635000,
                total_payable_paisa: 5635000,
                installment_paisa: 125000,
                last_installment_paisa: 10000,
                number_of_installments: 46,
                duration_months: 12,
                repayment_frequency: 'weekly',
                product_snapshot: weekly,
                installment_split: {
                    regular_principal_paisa: 111000,
                    regular_charge_paisa: 14000,
                    last_principal_paisa: 5000,
                    last_charge_paisa: 5000,
                },
            },
        },
    };
    const product = loanProductForApplication(
        { ...weekly, service_charge_per_thousand: '200' },
        application,
    );
    const schedule = calculateLoanSchedule(60000, product);
    assert.equal(schedule.loanAmount, 50000);
    assert.equal(schedule.totalAmount, 56350);
    assert.equal(schedule.lastInstallmentAmount, 100);
    assert.equal(calcInstallmentSchedule(60000, product).lastPrincipal, 50);
    assert.equal(
        installmentFormFields(60000, product).total_principal,
        '50000',
    );
});

test('complete legacy signed totals are preserved without inventing a product snapshot', () => {
    const product = loanProductForApplication(
        { ...weekly, service_charge_per_thousand: '200' },
        {
            status: 'repaid',
            disbursed_amount: '50000',
            loan_term_months: 12,
            repayment_frequency: 'weekly',
            loan_agreement_data: {
                service_charge: '6350',
                installment_amount: '1250',
                last_installment_amount: '100',
                number_of_installments: 46,
            },
        },
    );
    const schedule = calculateLoanSchedule(50000, product);
    assert.equal(schedule.totalAmount, 56350);
    assert.equal(schedule.lastInstallmentAmount, 100);
    assert.equal(product._saved_pricing.product_snapshot, undefined);
});
