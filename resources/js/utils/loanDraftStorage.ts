/**
 * Local backup for loan application form drafts.
 * If server save fails or the page is closed, FO work can be restored.
 */

export type LoanDraftLocalPayload<T = Record<string, unknown>> = {
    savedAt: number;
    data: T;
};

export function loanDraftStorageKey(
    form: string,
    memberKey: string | number | null | undefined,
    productId: number | string,
    categoryId: number | string
): string {
    const member = memberKey == null || memberKey === '' ? 'legacy' : String(memberKey);
    return `misloan_loan_draft_v1_${form}_${member}_${productId}_${categoryId}`;
}

export function saveLoanDraftLocal<T>(key: string, data: T): void {
    try {
        const payload: LoanDraftLocalPayload<T> = { savedAt: Date.now(), data };
        localStorage.setItem(key, JSON.stringify(payload));
    } catch {
        // Quota / private mode — ignore; server draft is still primary
    }
}

export function loadLoanDraftLocal<T>(key: string): LoanDraftLocalPayload<T> | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as LoanDraftLocalPayload<T>;
        if (!parsed || typeof parsed !== 'object' || parsed.data == null) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function clearLoanDraftLocal(key: string): void {
    try {
        localStorage.removeItem(key);
    } catch {
        // ignore
    }
}
