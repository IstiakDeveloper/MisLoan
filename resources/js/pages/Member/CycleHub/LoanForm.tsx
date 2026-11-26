import { loanDraftStorageKey } from '@/utils/loanDraftStorage';
import { Link, router } from '@inertiajs/react';
import { useEffect, useLayoutEffect } from 'react';
import DeathRiskFund from '../LoanApplications/Forms/DeathRiskFund';
import FieldInvestigation from '../LoanApplications/Forms/FieldInvestigation';
import GuarantorCommitment from '../LoanApplications/Forms/GuarantorCommitment';
import LoanAgreement from '../LoanApplications/Forms/LoanAgreement';
import LoanApplicationApproval from '../LoanApplications/Forms/LoanApplicationApproval';

/** Keep existing form components and their validation/save actions unchanged. */
export default function LoanForm({
    cycleId,
    revision,
    formId,
    ...props
}: Record<string, any>) {
    const forms: Record<number, any> = {
        1: LoanAgreement,
        2: GuarantorCommitment,
        3: DeathRiskFund,
        4: FieldInvestigation,
        5: LoanApplicationApproval,
    };
    const Form = forms[formId];
    useLayoutEffect(() => {
        // Existing form components keep their own backup format. Version only this
        // cycle's keys so stale local data cannot undo a new category/amount.
        const marker = `misloan_cycle_form_version_${cycleId}_${formId}`;
        try {
            const previous = localStorage.getItem(marker);
            if (previous !== null && previous !== String(revision)) {
                for (const name of [
                    'loan_agreement',
                    'loan_approval',
                    'agrosor_profile',
                ]) {
                    const key = loanDraftStorageKey(
                        name,
                        props.member.id,
                        props.loanProduct.id,
                        props.loanCategory.id,
                    );
                    const old = localStorage.getItem(key);
                    if (old)
                        localStorage.setItem(
                            `${key}_cycle_revision_${previous}`,
                            old,
                        );
                    localStorage.removeItem(key);
                }
            }
            localStorage.setItem(marker, String(revision));
        } catch {
            /* Server draft and validation remain authoritative. */
        }
    }, [
        cycleId,
        formId,
        revision,
        props.member.id,
        props.loanProduct.id,
        props.loanCategory.id,
    ]);
    useEffect(
        () =>
            router.on('before', (event) => {
                const visit = event.detail.visit;
                if (
                    visit.method !== 'post' ||
                    !visit.url.pathname.endsWith('/save-draft')
                )
                    return;
                if (visit.data instanceof FormData)
                    visit.data.set('cycle_revision', String(revision));
                else Object.assign(visit.data, { cycle_revision: revision });
            }),
        [revision],
    );
    return (
        <>
            <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-4 border-b border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
                <strong>
                    দফা {props.loanRound} · {props.member?.application_no}
                </strong>
                <Link
                    href={`/member/cycle-hub/cycle/${props.member.id}?loan_id=${props.existingApplication.id}`}
                    className="font-semibold underline"
                >
                    এই দফার ফাইলে ফিরুন
                </Link>
            </div>
            <Form {...props} cycleRevision={revision} />
        </>
    );
}
