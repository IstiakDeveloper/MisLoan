import type { FinancePage } from '@/components/finance/workspace';
import type { AccountingSection } from '@/lib/accounting-navigation';

export type Branch = { id: number; name: string; code: string };
export type LedgerAccount = {
    id: number;
    code: string;
    name: string;
    type: string;
    is_active: boolean | number;
};
export type Period = {
    id: number;
    starts_on: string;
    ends_on: string;
    closed_at: string | null;
};
export type Journal = {
    id: number;
    reference: string;
    business_date: string;
    description: string;
    source_type: string;
    reversal_of: number | null;
    posted_by_name: string;
    debit_paisa: string;
    credit_paisa: string;
};
export type Voucher = {
    id: number;
    reference: string;
    kind: string;
    status: string;
    business_date: string;
    description: string;
    total_paisa: string;
    requested_by: number;
    requested_by_name: string;
    reviewed_by_name: string | null;
    reviewed_at: string | null;
    decision_note: string | null;
    journal_entry_id: number | null;
    reversal_of: number | null;
};
export type DetailLine = {
    account_id: number;
    code: string;
    name: string;
    debit_paisa: string;
    credit_paisa: string;
};
export type Detail = {
    type: 'voucher' | 'journal';
    branch: Branch;
    record: Partial<Voucher & Journal> & {
        id: number;
        business_date: string;
        description: string;
        reference: string;
        lines: DetailLine[];
        reversed_by?: number | null;
        reversal_pending?: boolean;
    };
};
export type AccountingProps = {
    section: AccountingSection;
    branches: Branch[];
    branchId: number;
    today: string;
    accounts: LedgerAccount[];
    periods: Period[];
    filters: Record<string, string | number | undefined>;
    entries: FinancePage<Journal>;
    vouchers: FinancePage<Voucher>;
    chartAccounts: FinancePage<LedgerAccount>;
    trialBalance: {
        ledger_account_id: number;
        debit_paisa: string;
        credit_paisa: string;
    }[];
    initialDetail: Omit<Detail, 'type'> | null;
    summary: {
        pending: number;
        reviewable: number;
        posted_today: number;
        posted_total: number;
        active_accounts: number;
        debit_paisa: string;
        credit_paisa: string;
        difference_paisa: string;
        current_period: Period | null;
    };
};
