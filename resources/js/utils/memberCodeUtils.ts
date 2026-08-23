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
 * Always prefer the current member identity over values saved in loan-form JSON / local drafts.
 */
export function withLiveMemberCode<T extends Record<string, any>>(data: T, member: any): T {
    if (!data) {
        return data;
    }

    const next: Record<string, any> = { ...data };
    const code = liveMemberCode(member);
    const name = String(member?.applicant_name_bn || member?.applicant_name_en || '').trim();
    const father = String(
        member?.father_name_bn || member?.spouse_name_bn || member?.father_name_en || '',
    ).trim();
    const mother = String(member?.mother_name_bn || member?.mother_name_en || '').trim();
    const nid = String(member?.nid_number || member?.smart_card_number || '').trim();
    const mobile = String(member?.mobile_number || '').trim();
    const samityName = String(
        member?.samity?.samity_name_bn || member?.samity?.samity_name || '',
    ).trim();
    const samityCode = String(member?.samity?.samity_code || member?.samity?.id || '').trim();
    const village = String(member?.present_village_road || member?.permanent_village_road || '').trim();
    const union = String(member?.present_union || member?.permanent_union || '').trim();
    const upazila = String(member?.present_upazila || member?.permanent_upazila || '').trim();
    const district = String(member?.present_district || member?.permanent_district || '').trim();
    const postOffice = String(member?.present_post_code || member?.permanent_post_code || '').trim();
    const project = String(member?.project_name || '').trim();
    const guardian = String(member?.guardian_name || father).trim();
    const guarantorName = String(member?.guarantor_name || '').trim();
    const guarantorMobile = String(member?.guarantor_mobile || '').trim();
    const addressLine3 = [upazila, district].filter(Boolean).join(', ');

    const assign = (key: string, value: string) => {
        if (key in next && value !== '') {
            next[key] = value;
        }
    };

    if (code) {
        assign('member_code', code);
        assign('member_no', code);
        assign('loan_recipient_code1', code);
        assign('loan_recipient_code2', code);
        if ('member_name_code' in next) {
            next.member_name_code = [name || String(next.member_name_code || '').split(' / ')[0], code]
                .map((p) => String(p).trim())
                .filter(Boolean)
                .join(' / ');
        }
    }

    assign('member_name', name);
    assign('member_name_bn', name);
    assign('member_name_detail', name);
    assign('loan_recipient_name', name);
    assign('applicant_signature_name', name);
    assign('father_husband_name', father);
    assign('member_father_or_spouse', father);
    assign('mother_name', mother);
    assign('nid_number', nid);
    assign('nid_smart_card', nid);
    assign('member_nid', nid);
    assign('mobile_number', mobile);
    assign('member_mobile', mobile);
    assign('samity_name', samityName);
    assign('committee_name', samityName);
    assign('samity_code', samityCode);
    assign('committee_code', samityCode);
    assign('village', village);
    assign('member_village', village);
    assign('guarantor_village', village);
    assign('union', union);
    assign('upazila', upazila);
    assign('member_upazila', upazila);
    assign('district', district);
    assign('member_district', district);
    assign('post_office', postOffice);
    assign('member_post_office', postOffice);
    assign('permanent_address_line1', String(member?.permanent_village_road || village).trim());
    assign('permanent_address_line2', String(member?.permanent_post_code || postOffice).trim());
    assign('permanent_address_line3', addressLine3);
    assign('current_address_line1', village);
    assign('current_address_line2', postOffice);
    assign('current_address_line3', addressLine3);
    assign('project_name', project);
    assign('proposed_project_name', project);
    assign('loan_purpose', project);
    assign('loan_program_name', project);
    assign('est_main_income_desc', project);
    assign('guardian_name', guardian);
    assign('guarantor_name', guarantorName);
    assign('guarantor_1_name', guarantorName);
    assign('guarantor_mobile', guarantorMobile);
    assign('guarantor_1_mobile', guarantorMobile);

    if ('samity_name_code' in next && (samityName || samityCode)) {
        next.samity_name_code = [samityName, samityCode].filter(Boolean).join(' / ');
    }

    return next as T;
}
