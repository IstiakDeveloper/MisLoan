import {
    FinanceErrors,
    financeButton,
    financeSecondary,
} from '@/components/finance/workspace';
import { accountingUrl } from '@/lib/accounting-navigation';
import { Link, usePage } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import AccountingDetail from './AccountingDetail';
import AccountingFrame from './AccountingFrame';
import Overview from './Overview';
import { Registers } from './Registers';
import Setup from './Setup';
import VoucherComposer from './VoucherComposer';
import type { AccountingProps, Detail } from './types';

export default function Workspace(data: AccountingProps) {
    const [detail, setDetail] = useState<Detail | null>(
        data.initialDetail ? { ...data.initialDetail, type: 'voucher' } : null,
    );
    const [active, setActive] = useState(!!data.initialDetail);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const request = useRef(0);
    const { errors } = usePage<{ errors: Record<string, string> }>().props;
    const open = async (type: Detail['type'], id: number) => {
        const current = ++request.current;
        setActive(true);
        setDetail(null);
        setError('');
        setLoading(true);
        try {
            const response = await fetch(
                `/accounting/${type === 'voucher' ? 'vouchers' : 'journals'}/${id}`,
                {
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                },
            );
            if (!response.ok)
                throw new Error(
                    'বিস্তারিত আনা যায়নি। পেজটি পুনরায় খুলে চেষ্টা করুন।',
                );
            const payload = await response.json();
            if (current === request.current) setDetail({ ...payload, type });
        } catch (failure) {
            if (current === request.current)
                setError(
                    failure instanceof Error
                        ? failure.message
                        : 'বিস্তারিত আনা যায়নি।',
                );
        } finally {
            if (current === request.current) setLoading(false);
        }
    };
    const close = () => {
        ++request.current;
        setActive(false);
        setDetail(null);
        setLoading(false);
    };
    return (
        <AccountingFrame
            section={data.section}
            branches={data.branches}
            branchId={data.branchId}
            filters={data.filters}
            actions={
                data.section === 'create' ? (
                    <Link
                        className={financeSecondary}
                        href={accountingUrl('vouchers', data.branchId)}
                    >
                        ভাউচার তালিকা
                    </Link>
                ) : (
                    <Link
                        className={financeButton}
                        href={accountingUrl('create', data.branchId)}
                    >
                        <Plus className="size-4" />
                        নতুন ভাউচার
                    </Link>
                )
            }
        >
            <FinanceErrors errors={errors} />
            {data.section === 'overview' ? (
                <Overview data={data} open={open} />
            ) : data.section === 'create' ? (
                <VoucherComposer {...data} />
            ) : data.section === 'accounts' || data.section === 'periods' ? (
                <Setup data={data} />
            ) : (
                <Registers data={data} open={open} />
            )}
            <AccountingDetail
                key={`${detail?.type}-${detail?.record.id}`}
                detail={detail}
                loading={loading}
                error={error}
                active={active}
                onClose={close}
                today={data.today}
                decided={close}
                openRecord={open}
            />
        </AccountingFrame>
    );
}
