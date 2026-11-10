import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildGuidedVoucher,
    parseVoucherAmount,
    validateVoucherLines,
} from '../../resources/js/lib/accounting-voucher.ts';

test('receipt debits cash and credits the selected counter account exactly', () => {
    assert.deepEqual(buildGuidedVoucher('receipt', '1', '2', '123.45'), [
        { account_id: 1, debit_paisa: 12345, credit_paisa: 0 },
        { account_id: 2, debit_paisa: 0, credit_paisa: 12345 },
    ]);
});
test('payment and transfer credit the source and debit the destination', () => {
    for (const mode of ['payment', 'transfer'])
        assert.deepEqual(buildGuidedVoucher(mode, '1', '2', '0.29'), [
            { account_id: 1, debit_paisa: 0, credit_paisa: 29 },
            { account_id: 2, debit_paisa: 29, credit_paisa: 0 },
        ]);
});
test('decimal amounts never round or accept exponential and fractional paisa inputs', () => {
    assert.equal(parseVoucherAmount('999999999999.99'), 99999999999999n);
    for (const amount of ['1.005', '1e3', '-1', 'NaN', '1000000000000.01'])
        assert.throws(() => parseVoucherAmount(amount));
});
test('guided entries require distinct accounts and a positive amount', () => {
    assert.throws(() => buildGuidedVoucher('receipt', '1', '1', '10'));
    assert.throws(() => buildGuidedVoucher('payment', '1', '2', '0'));
});
test('advanced journal rejects imbalance, invalid accounts and two-sided lines', () => {
    for (const lines of [
        [
            { account_id: '1', debit: '1', credit: '0' },
            { account_id: '2', debit: '0', credit: '2' },
        ],
        [
            { account_id: '', debit: '1', credit: '0' },
            { account_id: '2', debit: '0', credit: '1' },
        ],
        [
            { account_id: '1', debit: '1', credit: '1' },
            { account_id: '2', debit: '0', credit: '1' },
        ],
    ])
        assert.throws(() => validateVoucherLines(lines));
});
