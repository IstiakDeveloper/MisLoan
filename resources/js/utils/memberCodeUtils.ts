/**
 * Utility functions for 10-digit Member Code formatting, normalization, and parsing.
 * Format: 4-digit Branch Code (fixed/auto) + 6-digit Member Serial (zero-padded).
 * E.g. Naogaon Sadar (0001) + Serial 65 -> 0001000065.
 */

const BN_DIGITS: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
};

/**
 * Convert any Bengali digits in a string to standard English digits (0-9).
 */
export function toEnglishDigits(str: string | number | null | undefined): string {
    if (str == null) return '';
    return String(str).replace(/[০-৯]/g, (d) => BN_DIGITS[d] || d);
}

/**
 * Format Branch Code to exact 4 digits (e.g. 1 -> "0001", "0042" -> "0042").
 */
export function formatBranchCode(code: string | number | null | undefined): string {
    const clean = toEnglishDigits(code).replace(/\D/g, '');
    if (!clean) return '0001';
    return clean.padStart(4, '0').slice(-4);
}

/**
 * Format Member Serial to exact 6 digits (e.g. 65 -> "000065", "000065" -> "000065").
 */
export function formatMemberSerial(serial: string | number | null | undefined): string {
    const clean = toEnglishDigits(serial).replace(/\D/g, '');
    if (!clean) return '000001';
    return clean.padStart(6, '0').slice(-6);
}

/**
 * Combine Branch Code and Member Serial into 10-digit full code.
 */
export function formatFullMemberCode(
    branchCode: string | number | null | undefined,
    serial: string | number | null | undefined
): string {
    return `${formatBranchCode(branchCode)}${formatMemberSerial(serial)}`;
}

/**
 * Parse any member code input string against a given branch code.
 * Extracts the 4-digit branch prefix and 6-digit serial.
 */
export function parseMemberCode(
    code: string | null | undefined,
    defaultBranchCode?: string | number
): {
    branchPrefix: string;
    serial: string;
    fullCode: string;
} {
    const clean = toEnglishDigits(code).replace(/\D/g, '');
    const fallbackBranch = formatBranchCode(defaultBranchCode);

    if (!clean) {
        return { branchPrefix: fallbackBranch, serial: '', fullCode: '' };
    }

    if (clean.length === 10) {
        const branchPrefix = clean.slice(0, 4);
        const serial = clean.slice(4);
        return { branchPrefix, serial, fullCode: clean };
    }

    if (clean.length <= 6) {
        const serial = clean;
        const paddedSerial = clean.padStart(6, '0');
        return {
            branchPrefix: fallbackBranch,
            serial,
            fullCode: `${fallbackBranch}${paddedSerial}`,
        };
    }

    // Between 7 and 9 digits or > 10
    const branchPrefix = clean.length >= 4 ? clean.slice(0, 4) : fallbackBranch;
    const rawSerial = clean.slice(branchPrefix.length);
    const serial = rawSerial.padStart(6, '0').slice(-6);
    return {
        branchPrefix,
        serial,
        fullCode: `${branchPrefix}${serial}`,
    };
}

/** Live admission member code (application_no), not a snapshot saved on a form. */
export function liveMemberCode(member: any): string {
    return String(member?.application_no || member?.member_code || '').trim();
}

/**
 * Always prefer the current member code over values saved in loan-form JSON / local drafts.
 */
export function withLiveMemberCode<T extends Record<string, any>>(data: T, member: any): T {
    const code = liveMemberCode(member);
    if (!code || !data) {
        return data;
    }

    const next: Record<string, any> = { ...data };

    if ('member_code' in next) {
        next.member_code = code;
    }
    if ('member_no' in next) {
        next.member_no = code;
    }
    if ('loan_recipient_code1' in next) {
        next.loan_recipient_code1 = code;
    }
    if ('loan_recipient_code2' in next) {
        next.loan_recipient_code2 = code;
    }
    if ('member_name_code' in next) {
        const name =
            member?.applicant_name_bn ||
            member?.applicant_name_en ||
            String(next.member_name_code || '').split(' / ')[0] ||
            '';
        next.member_name_code = [String(name).trim(), code].filter(Boolean).join(' / ');
    }

    return next as T;
}
