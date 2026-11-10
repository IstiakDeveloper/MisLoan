import Workspace from './Workspace';
import type { AccountingProps } from './types';

export default function Accounting(props: AccountingProps) {
    return (
        <Workspace
            key={`${props.section}-${props.branchId}-${JSON.stringify(props.filters)}`}
            {...props}
        />
    );
}
