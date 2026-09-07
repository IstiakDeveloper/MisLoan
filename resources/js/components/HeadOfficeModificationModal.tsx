import React, { useEffect } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import { UserCheck, RotateCcw, Building2, Wrench, X } from 'lucide-react';

export type ModificationEntityType = 'admission' | 'loan';

export interface ModificationTarget {
    id: number;
    applicationNo: string;
    applicantName?: string;
    status: string;
    isLegacy?: boolean;
    loanDofa?: string | number | null;
}

interface Props {
    open: boolean;
    onClose: () => void;
    entityType: ModificationEntityType;
    target: ModificationTarget | null;
}

export function canHeadOfficeModify(auth?: { user?: { has_all_access?: boolean; role?: { name?: string } | string } }): boolean {
    const roleName = (
        typeof auth?.user?.role === 'string' ? auth.user.role : auth?.user?.role?.name || ''
    ).toLowerCase();

    return (
        !!auth?.user?.has_all_access ||
        roleName === 'head_office' ||
        roleName === 'super_admin' ||
        roleName === 'superadmin' ||
        roleName === 'cso'
    );
}

export function useCanHeadOfficeModify(): boolean {
    const { auth } = usePage().props as { auth?: Parameters<typeof canHeadOfficeModify>[0] };
    return canHeadOfficeModify(auth);
}

export default function HeadOfficeModificationModal({ open, onClose, entityType, target }: Props) {
    const {
        data: legacyData,
        setData: setLegacyData,
        patch: patchLegacy,
        processing: legacyProcessing,
        reset: resetLegacy,
        errors: legacyErrors,
        clearErrors: clearLegacyErrors,
    } = useForm({
        loan_dofa: '' as string | number,
    });

    const {
        patch: patchReset,
        processing: resetProcessing,
        reset: resetResetForm,
    } = useForm({});

    const {
        patch: patchResetToHo,
        processing: resetToHoProcessing,
        reset: resetResetToHoForm,
    } = useForm({});

    useEffect(() => {
        if (open && target) {
            setLegacyData('loan_dofa', target.loanDofa ?? '');
            clearLegacyErrors();
        }
        if (!open) {
            resetLegacy();
            resetResetForm();
            resetResetToHoForm();
        }
    }, [open, target?.id]);

    if (!open || !target) {
        return null;
    }

    const canShowLegacy =
        entityType === 'admission' && !target.isLegacy && target.status !== 'rejected';
    const canReset =
        target.status !== 'draft' &&
        target.status !== 'disbursed' &&
        target.status !== 'cancelled';
    const canResetToHo =
        target.status !== 'draft' &&
        target.status !== 'disbursed' &&
        target.status !== 'cancelled';

    const handleMarkLegacy = (e: React.FormEvent) => {
        e.preventDefault();
        if (
            confirm(
                `আবেদন নং ${target.applicationNo} পুরাতন সদস্য হিসেবে চিহ্নিত করে দফা ${legacyData.loan_dofa} দিয়ে স্বয়ংক্রিয় অনুমোদন করতে চান?`
            )
        ) {
            patchLegacy(`/head-office/admissions/${target.id}/mark-legacy`, {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => onClose(),
            });
        }
    };

    const handleResetApproval = () => {
        const url =
            entityType === 'admission'
                ? `/head-office/admissions/${target.id}/reset-approval`
                : `/head-office/loans/${target.id}/reset-approval`;
        const idLabel = entityType === 'loan' ? 'সদস্য নং / আবেদন নং' : 'আবেদন নং';

        if (
            confirm(
                `${idLabel} ${target.applicationNo} এর সব অনুমোদন মুছে শাখা ব্যবস্থাপক পর্যায়ে ফেরত পাঠাতে চান?`
            )
        ) {
            patchReset(url, {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => onClose(),
            });
        }
    };

    const handleResetToHo = () => {
        const url =
            entityType === 'admission'
                ? `/head-office/admissions/${target.id}/reset-to-head-office`
                : `/head-office/loans/${target.id}/reset-to-head-office`;
        const idLabel = entityType === 'loan' ? 'সদস্য নং / আবেদন নং' : 'আবেদন নং';

        if (
            confirm(
                `${idLabel} ${target.applicationNo} হেড অফিস অপেক্ষমাণ (Pending Head Office) অবস্থায় রিসেট করতে চান? শাখা অনুমোদন বহাল থাকবে।`
            )
        ) {
            patchResetToHo(url, {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => onClose(),
            });
        }
    };

    const busy = legacyProcessing || resetProcessing || resetToHoProcessing;
    const optionCount = Number(canShowLegacy) + Number(canReset) + Number(canResetToHo);

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200">
                <div className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold flex items-center gap-2">
                            <Wrench className="w-4 h-4 text-amber-400" />
                            Modification
                        </h3>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                            {target.applicationNo}
                            {target.applicantName ? ` · ${target.applicantName}` : ''}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-4 space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        অপশন বেছে নিন
                    </p>

                    {optionCount > 0 ? (
                        <div className="space-y-2.5">
                            {canShowLegacy && (
                                <form
                                    onSubmit={handleMarkLegacy}
                                    className="rounded-xl border border-orange-200 bg-orange-50/70 p-3 flex flex-col gap-2.5 hover:border-orange-300 hover:shadow-xs transition"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex size-8 items-center justify-center rounded-lg bg-orange-100 text-orange-700 shrink-0">
                                            <UserCheck className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-orange-950 leading-snug">
                                                পুরাতন সদস্য
                                            </h4>
                                            <p className="text-[10px] text-orange-800/80 mt-0.5 leading-relaxed">
                                                দফা সেট করে স্বয়ংক্রিয় অনুমোদন
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min={1}
                                            max={999}
                                            required
                                            value={legacyData.loan_dofa}
                                            onChange={(e) => setLegacyData('loan_dofa', e.target.value)}
                                            className="w-full px-2.5 py-1.5 bg-white border border-orange-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-orange-500"
                                            placeholder="ঋণের দফা (যেমন: ১, ২, ৩...)"
                                        />
                                        <button
                                            type="submit"
                                            disabled={busy || !legacyData.loan_dofa}
                                            className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-semibold rounded-lg transition disabled:opacity-50 shrink-0"
                                        >
                                            {legacyProcessing ? 'হচ্ছে...' : 'অনুমোদন'}
                                        </button>
                                    </div>
                                    {legacyErrors.loan_dofa && (
                                        <p className="text-[10px] text-red-600">{legacyErrors.loan_dofa}</p>
                                    )}
                                </form>
                            )}

                            {(canResetToHo || canReset) && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {canResetToHo && (
                                        <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-3 flex flex-col gap-2.5 hover:border-purple-300 hover:shadow-xs transition">
                                            <div className="flex size-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700 shrink-0">
                                                <Building2 className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-purple-950 leading-snug">
                                                    হেড অফিসে রিসেট
                                                </h4>
                                                <p className="text-[10px] text-purple-800/80 mt-0.5 leading-relaxed">
                                                    অনুমোদন রিসেট করে হেড অফিস অপেক্ষমাণ (Pending HO) করুন। শাখা অনুমোদন বহাল থাকবে।
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleResetToHo}
                                                disabled={busy}
                                                className="mt-auto w-full px-2 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-semibold rounded-lg transition disabled:opacity-50"
                                            >
                                                {resetToHoProcessing ? 'হচ্ছে...' : 'হেড অফিসে রিসেট'}
                                            </button>
                                        </div>
                                    )}

                                    {canReset && (
                                        <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 flex flex-col gap-2.5 hover:border-indigo-300 hover:shadow-xs transition">
                                            <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 shrink-0">
                                                <RotateCcw className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-indigo-950 leading-snug">
                                                    শাখা ব্যবস্থাপকে রিসেট
                                                </h4>
                                                <p className="text-[10px] text-indigo-800/80 mt-0.5 leading-relaxed">
                                                    সব অনুমোদন মুছে আবেদনটি পুনরায় শাখা ব্যবস্থাপক পর্যায়ে ফেরত পাঠান।
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleResetApproval}
                                                disabled={busy}
                                                className="mt-auto w-full px-2 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold rounded-lg transition disabled:opacity-50"
                                            >
                                                {resetProcessing ? 'হচ্ছে...' : 'শাখায় রিসেট'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500 text-center py-4">
                            এই আবেদনে এখন কোনো পরিবর্তন করা যাবে না।
                        </p>
                    )}

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold rounded-xl transition"
                    >
                        বন্ধ করুন
                    </button>
                </div>
            </div>
        </div>
    );
}
