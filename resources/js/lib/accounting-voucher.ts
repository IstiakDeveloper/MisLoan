export type VoucherMode = 'receipt' | 'payment' | 'transfer' | 'journal';
export type DraftLine = { account_id: string; debit: string; credit: string };
export type VoucherLine = {
    account_id: number;
    debit_paisa: number;
    credit_paisa: number;
};
export const MAX_VOUCHER_PAISA = 100_000_000_000_000n;

export function parseVoucherAmount(value: string): bigint {
    if (!/^(0|[1-9]\d{0,12})(\.\d{1,2})?$/.test(value))
        throw new Error(
            'সঠিক টাকার পরিমাণ লিখুন; সর্বোচ্চ দুই দশমিক গ্রহণযোগ্য।',
        );
    const [whole, fraction = ''] = value.split('.');
    const amount = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
    if (amount > MAX_VOUCHER_PAISA)
        throw new Error('টাকার পরিমাণ অনুমোদিত সীমার বেশি।');
    return amount;
}

export function validateVoucherLines(lines: DraftLine[]): VoucherLine[] {
    if (lines.length < 2 || lines.length > 100)
        throw new Error('জার্নালে ২ থেকে ১০০টি line প্রয়োজন।');
    let debit = 0n,
        credit = 0n;
    const prepared = lines.map((line, index) => {
        const account = Number(line.account_id);
        const dr = parseVoucherAmount(line.debit || '0'),
            cr = parseVoucherAmount(line.credit || '0');
        if (!Number.isSafeInteger(account) || account <= 0)
            throw new Error(`Line ${index + 1}: হিসাব নির্বাচন করুন।`);
        if (dr > 0n === cr > 0n)
            throw new Error(
                `Line ${index + 1}: debit অথবা credit—এক পাশে পরিমাণ দিন।`,
            );
        debit += dr;
        credit += cr;
        return {
            account_id: account,
            debit_paisa: Number(dr),
            credit_paisa: Number(cr),
        };
    });
    if (debit !== credit)
        throw new Error('মোট debit ও credit সমান হয়নি। পরিমাণগুলো মিলিয়ে নিন।');
    if (debit > MAX_VOUCHER_PAISA)
        throw new Error('ভাউচারের মোট পরিমাণ অনুমোদিত সীমার বেশি।');
    return prepared;
}

export function buildGuidedVoucher(
    mode: Exclude<VoucherMode, 'journal'>,
    cashAccount: string,
    counterAccount: string,
    amount: string,
): VoucherLine[] {
    if (cashAccount === counterAccount)
        throw new Error('দুইটি ভিন্ন হিসাব নির্বাচন করুন।');
    const value = parseVoucherAmount(amount);
    if (value <= 0n) throw new Error('শূন্যের বেশি পরিমাণ লিখুন।');
    const cashDebit = mode === 'receipt';
    return validateVoucherLines([
        {
            account_id: cashAccount,
            debit: cashDebit ? amount : '0',
            credit: cashDebit ? '0' : amount,
        },
        {
            account_id: counterAccount,
            debit: cashDebit ? '0' : amount,
            credit: cashDebit ? amount : '0',
        },
    ]);
}
