/** After saving a loan form, return to the application Show hub when possible. */
export function loanApplicationShowUrl(applicationId: number, formId?: number): string {
    const q = formId ? `?form=${formId}` : '';
    return `/member/loan-applications/${applicationId}${q}`;
}

export function formSelectionUrl(
    isLegacy: boolean,
    member: { id?: number } | null | undefined,
    loanProduct: { id: number },
    loanCategory: { id: number },
    requestedAmount: number,
): string {
    const params = new URLSearchParams({
        loan_product_id: String(loanProduct.id),
        loan_category_id: String(loanCategory.id),
        requested_amount: String(requestedAmount),
    });
    if (isLegacy) params.set('legacy', '1');
    else params.set('member_id', String(member?.id ?? ''));
    return `/member/loan-applications/form-selection?${params.toString()}`;
}

export function afterLoanFormSaveUrl(opts: {
    afterSaveUrl?: string;
    existingApplication?: { id?: number } | null;
    isLegacy: boolean;
    member: { id?: number } | null | undefined;
    loanProduct: { id: number };
    loanCategory: { id: number };
    requestedAmount: number;
    formId?: number;
}): string {
    if (opts.afterSaveUrl) return opts.afterSaveUrl;
    if (opts.existingApplication?.id) {
        return loanApplicationShowUrl(opts.existingApplication.id, opts.formId);
    }
    return formSelectionUrl(
        opts.isLegacy,
        opts.member,
        opts.loanProduct,
        opts.loanCategory,
        opts.requestedAmount,
    );
}
