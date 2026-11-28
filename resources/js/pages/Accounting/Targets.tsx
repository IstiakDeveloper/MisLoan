import { Head, router, useForm } from '@inertiajs/react';
import { Save, Target } from 'lucide-react';
import { ComboSelect } from '@/components/ComboSelect';
import AdminLayout from '@/layouts/admin-layout';

interface TargetRow {
    id: number;
    target_key: string;
    target_value: number;
    note?: string | null;
}

interface Props {
    branch: { id: number; name: string; code: string } | null;
    periodMonth: string;
    targetKeys: Record<string, { label: string; unit: 'paisa' | 'count' }>;
    targets: Record<string, TargetRow>;
    achieved: Record<string, number>;
    canManage: boolean;
}

const fmt = (val: number, unit: 'paisa' | 'count') =>
    unit === 'paisa'
        ? `৳${(Number(val || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
        : `${Number(val || 0).toLocaleString('en-US')} জন`;

export default function Targets({ branch, periodMonth, targetKeys, targets, achieved, canManage }: Props) {
    const form = useForm({
        branch_id: branch?.id ?? '',
        period_month: periodMonth,
        target_key: Object.keys(targetKeys)[0] ?? 'loan_disbursement',
        target_amount: '',
        note: '',
    });

    return (
        <AdminLayout>
            <Head title="Target Achievement" />
            <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <div>
                        <h1 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                            <Target className="h-5 w-5 text-brand" />
                            Target & Achievement
                        </h1>
                        <p className="mt-1 text-xs text-slate-500">
                            {branch ? `শাখা: ${branch.code} — ${branch.name}` : 'শাখা নির্ধারিত নেই'} • মাস: {periodMonth}
                        </p>
                    </div>
                    <input
                        type="month"
                        value={periodMonth}
                        onChange={(e) => router.get('/accounting/targets', { period_month: e.target.value }, { preserveState: false })}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold"
                    />
                </div>

                {canManage && branch && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            form.post('/accounting/targets', {
                                onSuccess: () => form.reset('target_amount', 'note'),
                            });
                        }}
                        className="grid items-end gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs md:grid-cols-3"
                    >
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Target Indicator</label>
                            <ComboSelect
                                size="sm"
                                clearable={false}
                                value={form.data.target_key}
                                onChange={(val) => form.setData('target_key', val ?? 'loan_disbursement')}
                                items={Object.entries(targetKeys).map(([k, info]) => ({ value: k, label: info.label }))}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Target Value</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={form.data.target_amount}
                                onChange={(e) => form.setData('target_amount', e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                                required
                            />
                        </div>
                        <div>
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white"
                            >
                                <Save className="h-3.5 w-3.5" />
                                Save Target
                            </button>
                        </div>
                    </form>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                    {Object.entries(targetKeys).map(([key, info]) => {
                        const targetVal = targets[key]?.target_value ?? 0;
                        const achievedVal = achieved[key] ?? 0;
                        const pct = targetVal > 0 ? Math.min(100, Math.round((achievedVal / targetVal) * 100)) : 0;
                        return (
                            <div key={key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-slate-900">{info.label}</h3>
                                    <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-bold text-brand">{pct}%</span>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-slate-500">Target:</span>{' '}
                                        <strong className="text-slate-900">{fmt(targetVal, info.unit)}</strong>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-slate-500">Achieved:</span>{' '}
                                        <strong className="text-emerald-700">{fmt(achievedVal, info.unit)}</strong>
                                    </div>
                                </div>
                                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                    <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </AdminLayout>
    );
}
