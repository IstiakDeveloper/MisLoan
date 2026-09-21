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
    const hasProductInfo = Boolean(props.loanCategory || props.loanProduct);
    const isSufolon = isSufolonLoan(props.loanCategory, props.loanProduct);

    // If product/category is known, strictly follow product type (never let a stale/cloned savedData.form_variant override a non-Sufolon product!)
    const useProfile = hasProductInfo
        ? isSufolon
        : (props.savedData?.form_variant === 'agrosor_profile' || isSufolon);

    if (useProfile) {
        return <AgrosorProfile {...props} />;
    }
    return <ApprovalForm {...props} />;
}
