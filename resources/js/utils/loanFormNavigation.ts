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

const DISBURSE_FORM_ROUTES: Record<number, string> = {
    2: 'guarantor-commitment',
    3: 'death-risk-fund',
};

export type DisburseWizardFormParams = {
    applicationId: number;
    amount: number | string;
    memberId?: number | null;
    productId?: number | null;
    categoryId?: number | null;
    isLegacy?: boolean;
};

export function isDisburseWizardSearch(search?: string): boolean {
    const params = new URLSearchParams(
        search ?? (typeof window !== 'undefined' ? window.location.search : ''),
    );

    return params.get('action') === 'disburse' || params.get('return') === 'disburse';
}

export function loanDisburseShowUrl(applicationId: number): string {
    return `/member/loan-applications/${applicationId}?action=disburse`;
}

export const GUARANTOR_MIN_AMOUNT = 20000;

export function disburseFormIds(amount: number): number[] {
    return amount >= GUARANTOR_MIN_AMOUNT ? [2, 3] : [3];
}

export function nextDisburseFormId(
    formSaved: Record<number, boolean | undefined>,
    amount: number,
): number | null {
    for (const id of disburseFormIds(amount)) {
        if (!formSaved[id]) {
            return id;
        }
    }

    return null;
}

export function hasMeaningfulFormData(data: unknown): boolean {
    if (data === null || data === undefined || data === '') {
        return false;
    }
    if (typeof data === 'string') {
        const trimmed = data.trim();

        return trimmed !== '' && trimmed !== 'null' && trimmed !== '{}' && trimmed !== '[]' && trimmed.length >= 3;
    }
    if (Array.isArray(data)) {
        return data.some((item) => hasMeaningfulFormData(item));
    }
    if (typeof data === 'object') {
        return Object.values(data as Record<string, unknown>).some((value) => hasMeaningfulFormData(value));
    }

    return true;
}

export function disburseWizardFormUrl(formId: number, params: DisburseWizardFormParams): string {
    const route = DISBURSE_FORM_ROUTES[formId];
    if (!route) {
        return loanDisburseShowUrl(params.applicationId);
    }

    const query = new URLSearchParams({
        amount: String(params.amount),
        application_id: String(params.applicationId),
        return: 'disburse',
        action: 'disburse',
        step: String(formId),
    });
    if (params.memberId) {
        query.set('member_id', String(params.memberId));
    }
    if (params.productId) {
        query.set('product_id', String(params.productId));
    }
    if (params.categoryId) {
        query.set('category_id', String(params.categoryId));
    }
    if (params.isLegacy) {
        query.set('legacy', '1');
    }

    return `/member/loan-applications/forms/${route}?${query.toString()}`;
}

export function continueDisburseWizardUrl(
    currentFormId: number,
    params: DisburseWizardFormParams,
): string {
    if (currentFormId === 2) {
        return disburseWizardFormUrl(3, params);
    }

    return loanDisburseShowUrl(params.applicationId);
}

export function disburseWizardParamsFromContext(opts: {
    existingApplication?: { id?: number } | null;
    member?: { id?: number } | null;
    loanProduct?: { id?: number } | null;
    loanCategory?: { id?: number } | null;
    requestedAmount: number;
    isLegacy?: boolean;
}): DisburseWizardFormParams | null {
    if (!opts.existingApplication?.id) {
        return null;
    }

    return {
        applicationId: opts.existingApplication.id,
        amount: opts.requestedAmount,
        memberId: opts.member?.id,
        productId: opts.loanProduct?.id,
        categoryId: opts.loanCategory?.id,
        isLegacy: opts.isLegacy,
    };
}
