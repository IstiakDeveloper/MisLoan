import XLSX from 'xlsx-js-style';
import { formatDate } from '@/utils/dateUtils';

const ORG_NAME = 'মৌসুমী';
const ORG_ADDRESS = 'উকিলপাড়া, নওগাঁ।';
const DOCUMENT_TITLE = 'মাসিক ঋণ যাচাই ও অনুমোদন সংক্রান্ত তথ্য।';

export interface TeamBasedApproverInfo {
    approver_name?: string | null;
    approver_role?: string | null;
    status?: string | null;
    approved_amount?: number | string | null;
    comments?: string | null;
    decided_at?: string | null;
}

export interface TeamBasedExportRow {
    serial_no?: number;
    member_name?: string | null;
    member_code?: string | null;
    member_phone?: string | null;
    samity_number?: string | null;
    savings_general?: number | null;
    savings_other?: number | null;
    savings_total?: number | null;
    repaid_loan_amount?: number | string | null;
    repaid_installment_no?: number | string | null;
    other_institution_loan_amount?: string | null;
    proposed_loan_amount?: number | string | null;
    approved_amount?: number | string | null;
    loan_term_years?: number | null;
    loan_type?: string | null;
    project_name?: string | null;
    sheet_date?: string | null;
    branch_name?: string | null;
    branch_code?: string | null;
    area_name?: string | null;
    zone_name?: string | null;
    status?: string | null;
    review_status?: string | null;
    review_comments?: string | null;
    approver_name?: string | null;
    approver_signature?: string | null;
    decided_at?: string | null;
    approvers?: TeamBasedApproverInfo[];
}

export interface TeamBasedColVis {
    sheet_date?: boolean;
    branch?: boolean;
    area?: boolean;
    zone?: boolean;
    member_code?: boolean;
    member_phone?: boolean;
    samity_number?: boolean;
    savings_general?: boolean;
    savings_other?: boolean;
    savings_total?: boolean;
    repaid_loan?: boolean;
    repaid_installment?: boolean;
    other_institution?: boolean;
    proposed?: boolean;
    term?: boolean;
    loan_type?: boolean;
    project?: boolean;
    approved?: boolean;
    comments?: boolean;
    approver?: boolean;
    signature?: boolean;
}

export interface TeamBasedExportMeta {
    filename: string;
    branchName?: string;
    areaName?: string;
    zoneName?: string;
    dateFrom?: string;
    dateTo?: string;
    approverName?: string;
}

type ColumnDef = {
    key: string;
    header: string;
    subHeader?: string;
    savingsGroup?: boolean;
    value: (row: TeamBasedExportRow, index: number) => string | number;
};

const thinBorder = {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } },
};

function formatAmount(val: number | string | null | undefined): string {
    if (val == null || val === '') return '';
    const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(n)) return String(val);
    return String(Math.round(n));
}

const statusLabel: Record<string, string> = {
    draft: 'Draft',
    pending: 'Pending',
    under_review: 'Under Review',
    approved: 'Approved',
    rejected: 'Rejected',
    forwarded: 'Forwarded',
};

function resolveStatus(row: TeamBasedExportRow): string {
    const status = row.review_status || row.status || '';
    return statusLabel[status] || status;
}

function resolveApproverNames(row: TeamBasedExportRow): string {
    if (row.approvers && row.approvers.length > 0) {
        const names = row.approvers.map((a) => a.approver_name).filter(Boolean);
        if (names.length > 0) return names.join(', ');
    }
    return row.approver_name || '';
}

function resolveSignatureDates(row: TeamBasedExportRow): string {
    const dates: string[] = [];
    if (row.approvers && row.approvers.length > 0) {
        row.approvers.forEach((a) => {
            if (a.decided_at) dates.push(formatDate(a.decided_at, ''));
        });
    } else if (row.decided_at) {
        dates.push(formatDate(row.decided_at, ''));
    }
    return dates.filter(Boolean).join(', ');
}

function formatDateLabel(meta: TeamBasedExportMeta): string {
    if (meta.dateFrom && meta.dateTo && meta.dateTo !== meta.dateFrom) {
        return `${formatDate(meta.dateFrom)} – ${formatDate(meta.dateTo)}`;
    }
    return formatDate(meta.dateFrom || meta.dateTo, '-');
}

function buildColumns(colVis: TeamBasedColVis): ColumnDef[] {
    const cols: ColumnDef[] = [
        { key: 'serial', header: 'ক্র.', value: (_row, index) => index + 1 },
    ];

    if (colVis.sheet_date) {
        cols.push({ key: 'sheet_date', header: 'তারিখ', value: (row) => formatDate(row.sheet_date, '') });
    }
    if (colVis.branch) {
        cols.push({
            key: 'branch',
            header: 'শাখা',
            value: (row) => {
                if (row.branch_name && row.branch_code) return `${row.branch_name} (${row.branch_code})`;
                return row.branch_name || row.branch_code || '';
            },
        });
    }
    if (colVis.area) {
        cols.push({ key: 'area', header: 'অঞ্চল', value: (row) => row.area_name || '' });
    }
    if (colVis.zone) {
        cols.push({ key: 'zone', header: 'জোন', value: (row) => row.zone_name || '' });
    }

    cols.push({ key: 'member_name', header: 'সদস্যের নাম', value: (row) => row.member_name || '' });

    if (colVis.member_code) {
        cols.push({ key: 'member_code', header: 'সদস্য নম্বর', value: (row) => row.member_code || '' });
    }
    if (colVis.member_phone) {
        cols.push({ key: 'member_phone', header: 'ফোন নম্বর', value: (row) => row.member_phone || '' });
    }
    if (colVis.samity_number) {
        cols.push({ key: 'samity_number', header: 'সমিতি নম্বর', value: (row) => row.samity_number || '' });
    }
    if (colVis.savings_general) {
        cols.push({
            key: 'savings_general',
            header: 'সঞ্চয়ের পরিমাণ',
            subHeader: 'সাধারণ',
            savingsGroup: true,
            value: (row) => formatAmount(row.savings_general),
        });
    }
    if (colVis.savings_other) {
        cols.push({
            key: 'savings_other',
            header: 'সঞ্চয়ের পরিমাণ',
            subHeader: 'অন্যান্য',
            savingsGroup: true,
            value: (row) => formatAmount(row.savings_other),
        });
    }
    if (colVis.savings_total) {
        cols.push({
            key: 'savings_total',
            header: 'সঞ্চয়ের পরিমাণ',
            subHeader: 'মোট',
            savingsGroup: true,
            value: (row) => formatAmount(row.savings_total),
        });
    }
    if (colVis.repaid_loan) {
        cols.push({
            key: 'repaid_loan',
            header: 'পরিশোধিত মূল ঋণের পরিমাণ',
            value: (row) => formatAmount(row.repaid_loan_amount),
        });
    }
    if (colVis.repaid_installment) {
        cols.push({
            key: 'repaid_installment',
            header: 'পরি: দফা নম্বর',
            value: (row) => (row.repaid_installment_no != null ? String(row.repaid_installment_no) : ''),
        });
    }
    if (colVis.other_institution) {
        cols.push({
            key: 'other_institution',
            header: 'অন্যান্য সংস্থায় গ্রহণকৃত ঋণের পরিমাণ',
            value: (row) => row.other_institution_loan_amount || '',
        });
    }
    if (colVis.proposed) {
        cols.push({ key: 'proposed', header: 'প্রস্তাবিত ঋণের পরিমাণ', value: (row) => formatAmount(row.proposed_loan_amount) });
    }
    if (colVis.term) {
        cols.push({
            key: 'term',
            header: 'ঋণের মেয়াদ (বছর)',
            value: (row) => (row.loan_term_years != null ? String(row.loan_term_years) : ''),
        });
    }
    if (colVis.loan_type) {
        cols.push({ key: 'loan_type', header: 'ঋণের ধরন', value: (row) => row.loan_type || '' });
    }
    if (colVis.project) {
        cols.push({ key: 'project', header: 'প্রকল্পের নাম', value: (row) => row.project_name || '' });
    }
    if (colVis.approved) {
        cols.push({ key: 'approved', header: 'অনুমোদিত ঋণ', value: (row) => formatAmount(row.approved_amount) });
    }
    if (colVis.comments) {
        cols.push({ key: 'comments', header: 'মন্তব্য', value: (row) => row.review_comments || '' });
    }
    if (colVis.approver) {
        cols.push({ key: 'approver', header: 'অনুমোদনকারী', value: (row) => resolveApproverNames(row) });
    }
    if (colVis.signature) {
        cols.push({
            key: 'signature',
            header: 'অনুমোদনকারীর স্বাক্ষর / তারিখ',
            value: (row) => resolveSignatureDates(row),
        });
    }

    cols.push({ key: 'status', header: 'Status', value: (row) => resolveStatus(row) });

    return cols;
}

function hasSavingsGroup(columns: ColumnDef[]): boolean {
    return columns.some((c) => c.savingsGroup);
}

function buildTableHeaderRows(columns: ColumnDef[]): string[][] {
    const showSavingsGroup = hasSavingsGroup(columns);

    if (!showSavingsGroup) {
        return [columns.map((c) => c.header)];
    }

    const row1: string[] = [];
    const row2: string[] = [];
    let savingsGroupStarted = false;

    columns.forEach((col) => {
        if (col.savingsGroup) {
            if (!savingsGroupStarted) {
                row1.push(col.header);
                savingsGroupStarted = true;
                const savingsCount = columns.filter((c) => c.savingsGroup).length;
                for (let i = 1; i < savingsCount; i++) row1.push('');
            }
            row2.push(col.subHeader || '');
        } else {
            row1.push(col.header);
            row2.push('');
        }
    });

    return [row1, row2];
}

function buildPrintHeaderRows(meta: TeamBasedExportMeta, colCount: number): string[][] {
    const dateLabel = formatDateLabel(meta);
    const branchLabel = meta.branchName || '-';
    const areaLabel = meta.areaName || '-';
    const zoneLabel = meta.zoneName || '-';
    const quarter = Math.max(1, Math.floor(colCount / 4));

    const infoRow = Array(colCount).fill('') as string[];
    infoRow[0] = `শাখার নাম: ${branchLabel}`;
    infoRow[quarter] = `অঞ্চলের নাম: ${areaLabel}`;
    infoRow[quarter * 2] = `জোনের নাম: ${zoneLabel}`;
    infoRow[quarter * 3] = `তারিখ: ${dateLabel}`;

    const rows: string[][] = [
        [ORG_NAME, ...Array(Math.max(colCount - 1, 0)).fill('')],
        [ORG_ADDRESS, ...Array(Math.max(colCount - 1, 0)).fill('')],
        [DOCUMENT_TITLE, ...Array(Math.max(colCount - 1, 0)).fill('')],
        infoRow,
    ];

    if (meta.approverName) {
        rows.push([`অনুমোদনকারীর নাম: ${meta.approverName}`, ...Array(Math.max(colCount - 1, 0)).fill('')]);
    }

    rows.push([]);
    return rows;
}

function setCellStyle(
    ws: XLSX.WorkSheet,
    r: number,
    c: number,
    style: XLSX.CellObject['s'],
) {
    const addr = XLSX.utils.encode_cell({ r, c });
    if (!ws[addr]) {
        ws[addr] = { t: 's', v: '' };
    }
    ws[addr].s = style;
}

function applyPrintDocumentStyles(
    ws: XLSX.WorkSheet,
    printHeaderRowCount: number,
    colCount: number,
    hasApproverRow: boolean,
) {
    const centerBold = {
        font: { bold: true, sz: 12, name: 'Arial' },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    };
    const centerSemi = {
        font: { bold: true, sz: 10, name: 'Arial' },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    };
    const leftMeta = {
        font: { sz: 9, name: 'Arial' },
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    };

    setCellStyle(ws, 0, 0, centerBold);
    setCellStyle(ws, 1, 0, { font: { sz: 9, name: 'Arial' }, alignment: { horizontal: 'center', vertical: 'center' } });
    setCellStyle(ws, 2, 0, centerSemi);

    for (let c = 0; c < colCount; c++) {
        setCellStyle(ws, 3, c, leftMeta);
    }
    if (hasApproverRow) {
        for (let c = 0; c < colCount; c++) {
            setCellStyle(ws, 4, c, leftMeta);
        }
    }
}

function applyTableStyles(
    ws: XLSX.WorkSheet,
    tableHeaderStartRow: number,
    tableHeaderRowCount: number,
    dataRowCount: number,
    colCount: number,
) {
    const headerStyle = {
        font: { bold: true, sz: 9, name: 'Arial' },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        fill: { fgColor: { rgb: 'F3F4F6' } },
        border: thinBorder,
    };
    const dataStyle = {
        font: { sz: 9, name: 'Arial' },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: thinBorder,
    };
    const nameStyle = {
        ...dataStyle,
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    };

    for (let hr = 0; hr < tableHeaderRowCount; hr++) {
        for (let c = 0; c < colCount; c++) {
            setCellStyle(ws, tableHeaderStartRow + hr, c, headerStyle);
        }
    }

    const dataStart = tableHeaderStartRow + tableHeaderRowCount;
    for (let r = 0; r < dataRowCount; r++) {
        for (let c = 0; c < colCount; c++) {
            const isNameCol = c === findMemberNameColIndex(ws, tableHeaderStartRow, colCount);
            setCellStyle(ws, dataStart + r, c, isNameCol ? nameStyle : dataStyle);
        }
    }
}

function findMemberNameColIndex(ws: XLSX.WorkSheet, headerRow: number, colCount: number): number {
    for (let c = 0; c < colCount; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r: headerRow, c })];
        if (cell?.v === 'সদস্যের নাম') return c;
    }
    return 1;
}

function buildMerges(
    colCount: number,
    tableHeaderStartRow: number,
    tableHeaderRowCount: number,
    columns: ColumnDef[],
    hasApproverRow: boolean,
): XLSX.Range[] {
    const merges: XLSX.Range[] = [];
    const section = Math.max(1, Math.floor(colCount / 4));

    for (let r = 0; r < 3; r++) {
        merges.push({ s: { r, c: 0 }, e: { r, c: colCount - 1 } });
    }

    merges.push({ s: { r: 3, c: 0 }, e: { r: 3, c: section - 1 } });
    merges.push({ s: { r: 3, c: section }, e: { r: 3, c: section * 2 - 1 } });
    merges.push({ s: { r: 3, c: section * 2 }, e: { r: 3, c: section * 3 - 1 } });
    merges.push({ s: { r: 3, c: section * 3 }, e: { r: 3, c: colCount - 1 } });

    if (hasApproverRow) {
        merges.push({ s: { r: 4, c: 0 }, e: { r: 4, c: colCount - 1 } });
    }

    if (tableHeaderRowCount === 2) {
        columns.forEach((col, colIndex) => {
            if (!col.savingsGroup) {
                merges.push({
                    s: { r: tableHeaderStartRow, c: colIndex },
                    e: { r: tableHeaderStartRow + 1, c: colIndex },
                });
            }
        });

        const firstSavings = columns.findIndex((c) => c.savingsGroup);
        if (firstSavings >= 0) {
            const savingsCount = columns.filter((c) => c.savingsGroup).length;
            merges.push({
                s: { r: tableHeaderStartRow, c: firstSavings },
                e: { r: tableHeaderStartRow, c: firstSavings + savingsCount - 1 },
            });
        }
    }

    return merges;
}

export function exportTeamBasedToXlsx(
    rows: TeamBasedExportRow[],
    colVis: TeamBasedColVis,
    meta: TeamBasedExportMeta,
): void {
    if (rows.length === 0) return;

    const columns = buildColumns(colVis);
    const colCount = columns.length;
    const tableHeaderRows = buildTableHeaderRows(columns);
    const printHeaderRows = buildPrintHeaderRows(meta, colCount);
    const dataRows = rows.map((row, index) => columns.map((col) => col.value(row, index)));

    const sheetData: (string | number)[][] = [
        ...printHeaderRows,
        ...tableHeaderRows,
        ...dataRows,
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    const printHeaderRowCount = printHeaderRows.length;
    const tableHeaderStartRow = printHeaderRowCount;
    const tableHeaderRowCount = tableHeaderRows.length;
    const hasApproverRow = Boolean(meta.approverName);

    ws['!merges'] = buildMerges(colCount, tableHeaderStartRow, tableHeaderRowCount, columns, hasApproverRow);

    ws['!cols'] = columns.map((col, colIndex) => {
        const maxLen = Math.max(
            col.header.length,
            col.subHeader?.length || 0,
            ...dataRows.map((r) => String(r[colIndex] ?? '').length),
        );
        return { wch: Math.min(Math.max(maxLen + 2, 10), 45) };
    });

    applyPrintDocumentStyles(ws, printHeaderRowCount, colCount, hasApproverRow);
    applyTableStyles(ws, tableHeaderStartRow, tableHeaderRowCount, dataRows.length, colCount);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Team Based');

    const safeFilename = meta.filename.endsWith('.xlsx') ? meta.filename : `${meta.filename}.xlsx`;
    XLSX.writeFile(wb, safeFilename);
}

export type ColVisVariant = 'branch' | 'approver' | 'headOffice';

function exportRowHasValue(
    row: TeamBasedExportRow,
    pick: (r: TeamBasedExportRow) => string | number | null | undefined,
): boolean {
    const v = pick(row);
    if (v == null) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    if (typeof v === 'number') return Number.isFinite(v);
    return false;
}

function exportRowHasOtherInstitutionLoan(row: TeamBasedExportRow): boolean {
    const v = row.other_institution_loan_amount;
    if (v == null) return false;
    return String(v).trim().length > 0;
}

function exportHasNumericishField(v: string | number | null | undefined): boolean {
    if (v == null) return false;
    if (typeof v === 'number') return Number.isFinite(v);
    return String(v).trim().length > 0;
}

export function computeColVis(rows: TeamBasedExportRow[], variant: ColVisVariant): TeamBasedColVis {
    if (rows.length === 0) {
        if (variant === 'headOffice') {
            return {
                sheet_date: true,
                branch: true,
                area: true,
                zone: true,
                member_code: true,
                member_phone: true,
                samity_number: true,
                proposed: true,
                approved: true,
                loan_type: true,
                project: true,
                comments: true,
                signature: true,
                approver: true,
            };
        }
        if (variant === 'approver') {
            return {
                sheet_date: true,
                branch: true,
                member_code: true,
                member_phone: true,
                samity_number: true,
                savings_general: true,
                savings_other: true,
                savings_total: true,
                repaid_loan: true,
                repaid_installment: true,
                other_institution: true,
                proposed: true,
                term: true,
                loan_type: true,
                project: true,
                approved: true,
                approver: true,
                comments: true,
                signature: true,
            };
        }
        return {
            member_code: true,
            member_phone: true,
            samity_number: true,
            savings_general: true,
            savings_other: true,
            savings_total: true,
            repaid_loan: true,
            repaid_installment: true,
            other_institution: true,
            proposed: true,
            term: true,
            loan_type: true,
            project: true,
            approved: true,
            comments: true,
            approver: true,
            signature: true,
        };
    }

    const any = (fn: (r: TeamBasedExportRow) => boolean) => rows.some(fn);

    const base = {
        member_code: any((r) => exportRowHasValue(r, (x) => x.member_code)),
        member_phone: any((r) => exportRowHasValue(r, (x) => x.member_phone)),
        samity_number: any((r) => exportRowHasValue(r, (x) => x.samity_number)),
        savings_general: any((r) => r.savings_general != null),
        savings_other: any((r) => r.savings_other != null),
        savings_total: any((r) => r.savings_total != null),
        repaid_loan: any((r) =>
            variant === 'approver'
                ? exportHasNumericishField(r.repaid_loan_amount)
                : r.repaid_loan_amount != null,
        ),
        repaid_installment: any((r) =>
            variant === 'approver'
                ? exportHasNumericishField(r.repaid_installment_no)
                : r.repaid_installment_no != null,
        ),
        other_institution: any((r) => exportRowHasOtherInstitutionLoan(r)),
        proposed: any((r) =>
            variant === 'approver'
                ? exportHasNumericishField(r.proposed_loan_amount)
                : r.proposed_loan_amount != null,
        ),
        term: any((r) => r.loan_term_years != null),
        loan_type: any((r) => exportRowHasValue(r, (x) => x.loan_type)),
        project: any((r) => exportRowHasValue(r, (x) => x.project_name)),
        approved: any((r) => r.approved_amount != null),
        comments: any((r) => r.review_comments != null && String(r.review_comments).trim().length > 0),
        approver: any((r) => {
            const n =
                (r.approvers && r.approvers.length > 0
                    ? r.approvers.map((a) => a.approver_name).filter(Boolean).join(', ')
                    : null) ?? r.approver_name;
            return n != null && String(n).trim().length > 0;
        }),
        signature: any((r) => {
            if (r.approver_signature != null && String(r.approver_signature).trim().length > 0) return true;
            if (r.approvers?.some((a) => a.approver_signature && String(a.approver_signature).trim().length > 0))
                return true;
            if (r.decided_at != null && String(r.decided_at).trim().length > 0) return true;
            if (r.approvers?.some((a) => a.decided_at != null && String(a.decided_at).trim().length > 0)) return true;
            return false;
        }),
    };

    if (variant === 'headOffice') {
        return {
            sheet_date: any((r) => r.sheet_date != null && String(r.sheet_date).trim().length > 0),
            branch: any(
                (r) =>
                    (r.branch_name != null && String(r.branch_name).trim().length > 0) ||
                    (r.branch_code != null && String(r.branch_code).trim().length > 0),
            ),
            area: any((r) => r.area_name != null && String(r.area_name).trim().length > 0),
            zone: any((r) => r.zone_name != null && String(r.zone_name).trim().length > 0),
            proposed: base.proposed,
            approved: base.approved,
            member_code: base.member_code,
            member_phone: base.member_phone,
            samity_number: base.samity_number,
            loan_type: base.loan_type,
            project: base.project,
            comments: base.comments,
            signature: base.signature,
            approver: base.approver,
        };
    }

    if (variant === 'approver') {
        return {
            sheet_date: any((r) => r.sheet_date != null && String(r.sheet_date).trim().length > 0),
            branch: any(
                (r) =>
                    (r.branch_name != null && String(r.branch_name).trim().length > 0) ||
                    (r.branch_code != null && String(r.branch_code).trim().length > 0),
            ),
            ...base,
        };
    }

    return base;
}

export function buildExportQueryString(params: Record<string, string | number | undefined | null>): string {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value != null && value !== '') {
            search.set(key, String(value));
        }
    });
    return search.toString();
}
