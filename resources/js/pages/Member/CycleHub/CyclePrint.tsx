import MemberAdmissionFormView from '@/components/MemberAdmissionFormView';
import { Head } from '@inertiajs/react';
import DeathRiskFund from '../LoanApplications/Forms/DeathRiskFund';
import FieldInvestigation from '../LoanApplications/Forms/FieldInvestigation';
import GuarantorCommitment from '../LoanApplications/Forms/GuarantorCommitment';
import LoanAgreement from '../LoanApplications/Forms/LoanAgreement';
import LoanApplicationApproval from '../LoanApplications/Forms/LoanApplicationApproval';

export default function CyclePrint({
    admission,
    loan,
    number,
    visibleFormIds,
    form,
}: {
    admission: any;
    loan: any;
    number: number;
    visibleFormIds: number[];
    form: number | null;
}) {
    const components: Record<number, any> = {
        1: LoanAgreement,
        2: GuarantorCommitment,
        3: DeathRiskFund,
        4: FieldInvestigation,
        5: LoanApplicationApproval,
    };
    const columns: Record<number, string> = {
        1: 'loan_agreement_data',
        2: 'guarantor_info',
        3: 'nominee_info',
        4: 'asset_info',
        5: 'business_plan',
    };
    return (
        <>
            <Head title={`দফা ${number} — সদস্য ফাইল`} />
            <style>
                {
                    '@media print { .cycle-print-toolbar { display:none!important; } .cycle-print-section { break-after:page; } }'
                }
            </style>
            <div className="cycle-print-toolbar flex items-center justify-between border-b bg-white p-4">
                <strong>
                    দফা {number} · {admission.application_no}
                </strong>
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="rounded-lg bg-emerald-700 px-5 py-2 text-white"
                >
                    প্রিন্ট করুন
                </button>
            </div>
            <div className="mx-auto max-w-6xl bg-white p-4 print:p-0">
                {(form === null || form === 0) && (
                    <div className="cycle-print-section">
                        <MemberAdmissionFormView admission={admission} />
                    </div>
                )}
                {loan &&
                    visibleFormIds
                        .filter((id) => form === null || form === id)
                        .map((id) => {
                            const Form = components[id];
                            return (
                                <div key={id} className="cycle-print-section">
                                    <Form
                                        onlyPreview
                                        embedded
                                        member={admission}
                                        branch={admission.branch}
                                        loanProduct={loan.loan_product}
                                        loanCategory={loan.loan_category}
                                        requestedAmount={Number(
                                            loan.approved_amount ||
                                                loan.requested_amount,
                                        )}
                                        existingApplication={loan}
                                        savedData={loan[columns[id]]}
                                        loanRound={number}
                                    />
                                </div>
                            );
                        })}
            </div>
        </>
    );
}
