import ApprovalForm from './ApprovalForm';
import AgrosorProfile from './AgrosorProfile';
import { isSufolonLoan } from '@/utils/loanInterest';
import type { ApprovalFormProps } from './ApprovalForm/Types';

/**
 * Form 5 entry:
 * - Sufolon (>99k path) → 2-page Agrosor Profile
 * - Other monthly products → existing 4-page Approval Form
 */
export default function LoanApplicationApproval(props: ApprovalFormProps) {
    const savedVariant = props.savedData?.form_variant;
    if (savedVariant === 'agrosor_profile' || isSufolonLoan(props.loanCategory, props.loanProduct)) {
        return <AgrosorProfile {...props} />;
    }
    return <ApprovalForm {...props} />;
}
