import { SmartDateInput } from '@/components/ui/SmartDateInput';
import { router, usePage } from '@inertiajs/react';
import React from 'react';

export interface BlockListFields {
    name_bn?: string;
    father_name?: string;
    mother_name?: string;
    spouse_name?: string;
    dob?: string;
    nid_number?: string;
    phone_number?: string;
    address?: string;
}

export interface DecisionFormState {
    decision: 'approved' | 'rejected' | 'waiting';
    approved_amount: string;
    comments: string;
    push_to_block_list: boolean;
    block_list: BlockListFields;
}

interface ItemRow {
    member_name: string;
    member_code?: string | null;
    member_phone?: string | null;
    name_bn?: string | null;
    father_name?: string | null;
    mother_name?: string | null;
    spouse_name?: string | null;
    dob?: string | null;
    nid_number?: string | null;
    address?: string | null;
    proposed_loan_amount?: string | number | null;
    loan_term_years?: number | null;
    branch_name?: string | null;
    branch_code?: string | null;
    approvers?: {
        approver_name?: string | null;
        approver_role?: string | null;
        status?: string;
        approved_amount?: number | string | null;
        comments?: string | null;
        decided_at?: string | null;
    }[];
}

interface ReviewRow {
    review_id: number;
}

function normalizeNumericInput(value: string): string {
    if (!value) return '';
    const banglaToEnglishMap: Record<string, string> = {
        '০': '0',
        '১': '1',
        '২': '2',
        '৩': '3',
        '৪': '4',
        '৫': '5',
        '৬': '6',
        '৭': '7',
        '৮': '8',
        '৯': '9',
    };
    let result = '';
    for (const ch of value) {
        result += banglaToEnglishMap[ch] ?? ch;
    }
    return result.replace(/,/g, '');
}

function toEnglishDigits(value: string): string {
    return normalizeNumericInput(value).replace(/[^0-9]/g, '');
}

function validateNid(value: string): string | null {
    if (!value.trim()) return 'NID নম্বর প্রয়োজন';
    if (value.length < 10 || value.length > 17)
        return 'NID ১০–১৭ অঙ্কের হতে হবে';
    return null;
}

function validatePhone(value: string): string | null {
    if (!value.trim()) return 'ফোন নম্বর প্রয়োজন';
    if (value.length < 10)
        return `আরও ${10 - value.length} অঙ্ক লিখুন (মোট ১০–১৪)`;
    if (value.length > 14) return 'সর্বোচ্চ ১৪ অঙ্ক';
    return null;
}

function validateRejectComments(value: string): string | null {
    if (!value.trim()) return 'প্রত্যাখ্যানের কারণ লিখুন';
    return null;
}

function validateApproveComments(value: string): string | null {
    if (!value.trim()) return 'মন্তব্য লিখুন';
    return null;
}

function validateApprovedAmount(value: string): string | null {
    if (!value.trim()) return 'অনুমোদিত ঋণের পরিমাণ লিখুন';
    const n = parseFloat(value);
    if (!Number.isFinite(n) || n < 0) return 'সঠিক পরিমাণ লিখুন';
    return null;
}

function isValidDate(day: number, month: number, year: number): boolean {
    if (year < 1900 || year > 2100) return false;
    if (month < 1 || month > 12) return false;
    const daysInMonth = new Date(year, month, 0).getDate();
    return day >= 1 && day <= daysInMonth;
}

function validateDob(value: string | undefined | null): string | null {
    if (!value) return null; // optional

    if (value.includes('/')) {
        const digits = value.replace(/\D/g, '');
        if (digits.length < 8) {
            return 'পূর্ণাঙ্গ তারিখ লিখুন (দিন/মাস/বছর)';
        }
        const day = parseInt(digits.slice(0, 2), 10);
        const month = parseInt(digits.slice(2, 4), 10);
        const year = parseInt(digits.slice(4, 8), 10);
        if (!isValidDate(day, month, year)) {
            return 'সঠিক তারিখ লিখুন (দিন/মাস/বছর)';
        }
    }

    const isoPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
    const match = isoPattern.exec(value);
    if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const day = parseInt(match[3], 10);
        if (isValidDate(day, month, year)) {
            return null; // Valid
        }
    }

    return 'সঠিক তারিখ লিখুন (দিন/মাস/বছর)';
}

function buildInitialBlockList(row: ItemRow): BlockListFields {
    return {
        name_bn: row.name_bn ?? '',
        father_name: row.father_name ?? '',
        mother_name: row.mother_name ?? '',
        spouse_name: row.spouse_name ?? '',
        dob: row.dob ?? '',
        nid_number: toEnglishDigits(row.nid_number ?? ''),
        phone_number: toEnglishDigits(row.member_phone ?? ''),
        address: row.address ?? '',
    };
}

function formatAmount(val: number | string | null | undefined): string {
    if (val == null || val === '') return '';
    const n =
        typeof val === 'number'
            ? val
            : parseFloat(String(val).replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(n)) return String(val);
    return String(Math.round(n));
}

function FieldError({ message }: { message?: string | null }) {
    if (!message) return null;
    return (
        <p className="mt-1 text-[11px] font-medium text-rose-600">{message}</p>
    );
}

const inputClass = (hasError: boolean) =>
    `w-full border rounded-xl px-3.5 py-2.5 text-sm bg-white shadow-sm outline-none transition-colors ${
        hasError
            ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
            : 'border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100'
    }`;

type Props = {
    open: boolean;
    review: ReviewRow | null;
    row: ItemRow | null;
    authUsername?: string | null;
    branchCode?: string | null;
    onClose: () => void;
    onEdit: () => void;
    onRequestApprove: (state: DecisionFormState) => void;
    onSubmitReject: (state: DecisionFormState) => void;
};

async function fetchBlockListUsernameVerify(
    branchCode?: string | null,
): Promise<{ ok: boolean; message: string }> {
    const params = new URLSearchParams();
    if (branchCode?.trim()) {
        params.set('branch_code', branchCode.trim());
    }
    const qs = params.toString();
    const res = await fetch(
        `/team-based-approvals/block-list/verify${qs ? `?${qs}` : ''}`,
        {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'same-origin',
        },
    );
    if (!res.ok) {
        return { ok: false, message: 'Block list username যাচাই করা যায়নি।' };
    }
    const data = await res.json();
    return {
        ok: Boolean(data.ok),
        message:
            typeof data.message === 'string'
                ? data.message
                : 'Username block list-এ পাওয়া যায়নি।',
    };
}

function TeamBasedDecisionModalInner({
    review,
    row,
    authUsername,
    branchCode,
    onClose,
    onEdit,
    onRequestApprove,
    onSubmitReject,
}: Omit<Props, 'open'> & { review: ReviewRow; row: ItemRow }) {
    const { url } = usePage();
    const [form, setForm] = React.useState<DecisionFormState>(() => ({
        decision: 'approved',
        approved_amount: '',
        comments: '',
        push_to_block_list: true,
        block_list: buildInitialBlockList(row),
    }));
    const [errors, setErrors] = React.useState<Record<string, string | null>>(
        () => {
            const initial = buildInitialBlockList(row);
            return {
                phone_number: validatePhone(initial.phone_number ?? ''),
                nid_number: validateNid(initial.nid_number ?? ''),
                dob: validateDob(initial.dob ?? ''),
            };
        },
    );
    const [checkingUsername, setCheckingUsername] = React.useState(false);
    const [usernameVerifying, setUsernameVerifying] = React.useState(false);
    const [usernameVerified, setUsernameVerified] = React.useState(false);
    const [usernameVerifyError, setUsernameVerifyError] = React.useState<
        string | null
    >(null);

    const verifyBlockListUsername = React.useCallback(async () => {
        if (!authUsername?.trim()) {
            setUsernameVerified(false);
            setUsernameVerifyError('Username সেট করা নেই');
            return;
        }

        setUsernameVerifying(true);
        setUsernameVerifyError(null);
        setUsernameVerified(false);

        try {
            const result = await fetchBlockListUsernameVerify(
                branchCode ?? row.branch_code,
            );
            if (result.ok) {
                setUsernameVerified(true);
                setUsernameVerifyError(null);
            } else {
                setUsernameVerified(false);
                setUsernameVerifyError(result.message);
            }
        } catch {
            setUsernameVerified(false);
            setUsernameVerifyError('Block list API-তে সংযোগ করা যায়নি।');
        } finally {
            setUsernameVerifying(false);
        }
    }, [authUsername, branchCode, row.branch_code]);

    React.useEffect(() => {
        const block_list = buildInitialBlockList(row);
        setForm((prev) => ({ ...prev, block_list }));
        setErrors({
            phone_number: validatePhone(block_list.phone_number ?? ''),
            nid_number: validateNid(block_list.nid_number ?? ''),
            dob: validateDob(block_list.dob ?? ''),
        });
        setUsernameVerified(false);
        setUsernameVerifyError(null);
    }, [row]);

    const isApprove = form.decision === 'approved';
    const isReject = form.decision === 'rejected';
    const isWaiting = form.decision === 'waiting';
    const pushToBlockList = form.push_to_block_list;

    React.useEffect(() => {
        if (!isReject || !pushToBlockList) {
            setUsernameVerified(false);
            setUsernameVerifyError(null);
            return;
        }
        verifyBlockListUsername();
    }, [isReject, pushToBlockList, verifyBlockListUsername]);

    const getUsernameError = (): string | null => {
        if (!isReject || !pushToBlockList) return null;
        if (!authUsername?.trim()) return 'Username সেট করা নেই';
        if (usernameVerifying) return 'Username যাচাই হচ্ছে...';
        if (usernameVerifyError) return usernameVerifyError;
        if (!usernameVerified) return 'Username block list-এ যাচাই করুন';
        return null;
    };

    const setField = <K extends keyof DecisionFormState>(
        key: K,
        value: DecisionFormState[K],
    ) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const setBlockField = (key: keyof BlockListFields, value: string) => {
        setForm((prev) => ({
            ...prev,
            block_list: { ...prev.block_list, [key]: value },
        }));
    };

    const runValidation = (
        next: DecisionFormState,
    ): Record<string, string | null> => {
        const nextErrors: Record<string, string | null> = {};
        if (next.decision === 'approved') {
            nextErrors.approved_amount = validateApprovedAmount(
                next.approved_amount,
            );
            nextErrors.comments = validateApproveComments(next.comments);
        } else if (next.decision === 'rejected') {
            nextErrors.comments = validateRejectComments(next.comments);
            if (next.push_to_block_list) {
                nextErrors.nid_number = validateNid(
                    next.block_list.nid_number ?? '',
                );
                nextErrors.phone_number = validatePhone(
                    next.block_list.phone_number ?? '',
                );
                nextErrors.dob = validateDob(next.block_list.dob);
            }
        } else if (next.decision === 'waiting') {
            nextErrors.comments = validateRejectComments(next.comments);
        }
        return nextErrors;
    };

    const isFormValid = (next: DecisionFormState): boolean => {
        const v = runValidation(next);
        const usernameErr =
            next.decision === 'rejected' && next.push_to_block_list
                ? getUsernameError()
                : null;
        if (usernameErr) return false;
        return !Object.values(v).some((e) => e);
    };

    const handleNidChange = (raw: string) => {
        const value = toEnglishDigits(raw);
        const next = {
            ...form,
            block_list: { ...form.block_list, nid_number: value },
        };
        setForm(next);
        setErrors((prev) => ({ ...prev, nid_number: validateNid(value) }));
    };

    const handlePhoneChange = (raw: string) => {
        const value = toEnglishDigits(raw);
        const next = {
            ...form,
            block_list: { ...form.block_list, phone_number: value },
        };
        setForm(next);
        setErrors((prev) => ({ ...prev, phone_number: validatePhone(value) }));
    };

    const handleDobChange = (value: string) => {
        const next = {
            ...form,
            block_list: { ...form.block_list, dob: value },
        };
        setForm(next);
        setErrors((prev) => ({ ...prev, dob: validateDob(value) }));
    };

    const handleRefreshUsername = () => {
        setCheckingUsername(true);
        router.get(
            url,
            {},
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => {
                    setCheckingUsername(false);
                    if (isReject && pushToBlockList) {
                        verifyBlockListUsername();
                    }
                },
            },
        );
    };

    const handlePrimaryAction = () => {
        const v = runValidation(form);
        const usernameErr =
            isReject && pushToBlockList ? getUsernameError() : null;
        setErrors({ ...v, block_list_username: usernameErr });
        if (!isFormValid(form)) return;

        if (isApprove) {
            onRequestApprove(form);
        } else {
            onSubmitReject(form);
        }
    };

    const isDisabled = !isFormValid(form) || usernameVerifying;
    const hasUsername = Boolean(authUsername?.trim());
    const usernameError = getUsernameError();

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4 print:hidden"
            onClick={onClose}
        >
            <div
                className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-slate-200/80 bg-white shadow-2xl sm:max-h-[88vh] sm:max-w-2xl sm:rounded-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 px-5 py-4 text-white">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_50%)]" />
                    <div className="relative flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold tracking-[0.18em] text-blue-100/90 uppercase">
                                অনুমোদন সিদ্ধান্ত
                            </p>
                            <h3 className="mt-1 truncate text-lg font-bold">
                                {row.member_name}
                            </h3>
                            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                                {row.branch_name && (
                                    <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 font-medium backdrop-blur-sm">
                                        {row.branch_name}
                                    </span>
                                )}
                                {row.member_code && (
                                    <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 font-mono backdrop-blur-sm">
                                        {row.member_code}
                                    </span>
                                )}
                                <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 font-medium backdrop-blur-sm">
                                    প্রস্তাবিত: ৳
                                    {formatAmount(row.proposed_loan_amount) ||
                                        '—'}
                                </span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="shrink-0 rounded-full bg-white/10 p-2 text-white/90 transition-colors hover:bg-white/20"
                        >
                            <svg
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="flex-1 space-y-5 overflow-y-auto bg-slate-50/40 p-5">
                    <div className="grid grid-cols-3 gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setForm((prev) => {
                                    const next = {
                                        ...prev,
                                        decision: 'approved' as const,
                                    };
                                    setErrors(runValidation(next));
                                    return next;
                                });
                            }}
                            className={`rounded-2xl border-2 p-3 text-left transition-all ${isApprove ? 'border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-100' : 'border-slate-200 bg-white hover:border-emerald-300'}`}
                        >
                            <p
                                className={`text-xs font-bold ${isApprove ? 'text-emerald-800' : 'text-slate-700'}`}
                            >
                                অনুমোদন
                            </p>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setForm((prev) => {
                                    const next = {
                                        ...prev,
                                        decision: 'rejected' as const,
                                    };
                                    setErrors(runValidation(next));
                                    return next;
                                });
                            }}
                            className={`rounded-2xl border-2 p-3 text-left transition-all ${isReject ? 'border-rose-500 bg-rose-50 shadow-md shadow-rose-100' : 'border-slate-200 bg-white hover:border-rose-300'}`}
                        >
                            <p
                                className={`text-xs font-bold ${isReject ? 'text-rose-800' : 'text-slate-700'}`}
                            >
                                প্রত্যাখ্যান
                            </p>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setForm((prev) => {
                                    const next = {
                                        ...prev,
                                        decision: 'waiting' as const,
                                    };
                                    setErrors(runValidation(next));
                                    return next;
                                });
                            }}
                            className={`rounded-2xl border-2 p-3 text-left transition-all ${isWaiting ? 'border-amber-500 bg-amber-50 shadow-md shadow-amber-100' : 'border-slate-200 bg-white hover:border-amber-300'}`}
                        >
                            <p
                                className={`text-xs font-bold ${isWaiting ? 'text-amber-800' : 'text-slate-700'}`}
                            >
                                অপেক্ষমান
                            </p>
                        </button>
                    </div>

                    {isApprove && (
                        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between gap-2">
                                <label className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                                    অনুমোদিত ঋণ{' '}
                                    <span className="text-rose-500">*</span>
                                </label>
                                {row.proposed_loan_amount != null &&
                                    row.proposed_loan_amount !== '' && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const amt = String(
                                                    row.proposed_loan_amount,
                                                );
                                                setField(
                                                    'approved_amount',
                                                    amt,
                                                );
                                                setErrors((prev) => ({
                                                    ...prev,
                                                    approved_amount:
                                                        validateApprovedAmount(
                                                            amt,
                                                        ),
                                                }));
                                            }}
                                            className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-600"
                                        >
                                            প্রস্তাবিত বসান
                                        </button>
                                    )}
                            </div>
                            <div
                                className={`flex items-center overflow-hidden rounded-xl border bg-white ${errors.approved_amount ? 'border-rose-400' : 'border-slate-200'}`}
                            >
                                <span className="border-r border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
                                    ৳
                                </span>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={form.approved_amount}
                                    onChange={(e) => {
                                        const v = toEnglishDigits(
                                            e.target.value,
                                        );
                                        setField('approved_amount', v);
                                        setErrors((prev) => ({
                                            ...prev,
                                            approved_amount:
                                                validateApprovedAmount(v),
                                        }));
                                    }}
                                    placeholder="অনুমোদিত পরিমাণ"
                                    className="flex-1 bg-white px-4 py-3 text-sm outline-none"
                                />
                            </div>
                            <FieldError message={errors.approved_amount} />
                            <div>
                                <label className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                                    মন্তব্য{' '}
                                    <span className="text-rose-500">*</span>
                                </label>
                                <textarea
                                    rows={3}
                                    value={form.comments}
                                    onChange={(e) => {
                                        setField('comments', e.target.value);
                                        setErrors((prev) => ({
                                            ...prev,
                                            comments: validateApproveComments(
                                                e.target.value,
                                            ),
                                        }));
                                    }}
                                    placeholder="অনুমোদন সম্পর্কে মন্তব্য লিখুন..."
                                    className={
                                        inputClass(Boolean(errors.comments)) +
                                        ' mt-2 resize-none'
                                    }
                                />
                                <FieldError message={errors.comments} />
                            </div>
                        </div>
                    )}

                    {isReject && (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <label className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                                    প্রত্যাখ্যানের কারণ{' '}
                                    <span className="text-rose-500">*</span>
                                </label>
                                <textarea
                                    rows={3}
                                    value={form.comments}
                                    onChange={(e) => {
                                        setField('comments', e.target.value);
                                        setErrors((prev) => ({
                                            ...prev,
                                            comments: validateRejectComments(
                                                e.target.value,
                                            ),
                                        }));
                                    }}
                                    placeholder="কেন প্রত্যাখ্যান করছেন..."
                                    className={
                                        inputClass(Boolean(errors.comments)) +
                                        ' mt-2 resize-none'
                                    }
                                />
                                <FieldError message={errors.comments} />
                            </div>

                            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <input
                                    type="checkbox"
                                    checked={pushToBlockList}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        const next = {
                                            ...form,
                                            push_to_block_list: checked,
                                        };
                                        setForm(next);
                                        setErrors(runValidation(next));
                                    }}
                                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
                                />
                                <div>
                                    <p className="text-sm font-bold text-slate-800">
                                        Block List-এ যোগ করুন
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        আনচেক করলে শুধু এখানে reject হবে
                                    </p>
                                </div>
                            </label>

                            {pushToBlockList && (
                                <div className="space-y-4 rounded-2xl border border-rose-200/80 bg-gradient-to-br from-rose-50/80 via-white to-orange-50/40 p-4 shadow-sm">
                                    <div
                                        className={`rounded-xl border p-3 ${
                                            usernameError
                                                ? 'border-rose-300 bg-rose-50/80'
                                                : usernameVerified
                                                  ? 'border-emerald-300 bg-emerald-50/60'
                                                  : 'border-slate-200 bg-white'
                                        }`}
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="flex-1 text-xs text-slate-500">
                                                {hasUsername ? (
                                                    <>
                                                        Block list Username:{' '}
                                                        <span
                                                            className={`font-semibold ${usernameVerified ? 'text-emerald-700' : usernameError ? 'text-rose-700' : 'text-slate-700'}`}
                                                        >
                                                            {authUsername}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="font-semibold text-rose-600">
                                                        Username সেট করা নেই
                                                    </span>
                                                )}
                                                {branchCode ||
                                                row.branch_code ? (
                                                    <span className="text-slate-400">
                                                        {' '}
                                                        · শাখা{' '}
                                                        {branchCode ??
                                                            row.branch_code}
                                                    </span>
                                                ) : null}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!checkingUsername) {
                                                        handleRefreshUsername();
                                                    }
                                                }}
                                                disabled={
                                                    checkingUsername ||
                                                    usernameVerifying
                                                }
                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 disabled:opacity-60"
                                            >
                                                {checkingUsername ||
                                                usernameVerifying
                                                    ? 'যাচাই...'
                                                    : 'যাচাই করুন'}
                                            </button>
                                        </div>
                                        <FieldError message={usernameError} />
                                        {usernameVerified && !usernameError && (
                                            <p className="mt-1 text-[11px] font-medium text-emerald-700">
                                                Block list-এ username মিলেছে
                                            </p>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div className="sm:col-span-2">
                                            <label className="text-[11px] font-bold text-slate-500 uppercase">
                                                NID{' '}
                                                <span className="text-rose-500">
                                                    *
                                                </span>
                                            </label>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={
                                                    form.block_list
                                                        .nid_number ?? ''
                                                }
                                                onChange={(e) =>
                                                    handleNidChange(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="শুধু সংখ্যা"
                                                className={
                                                    inputClass(
                                                        Boolean(
                                                            errors.nid_number,
                                                        ),
                                                    ) + ' mt-1'
                                                }
                                            />
                                            <FieldError
                                                message={errors.nid_number}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-bold text-slate-500 uppercase">
                                                ফোন{' '}
                                                <span className="text-rose-500">
                                                    *
                                                </span>
                                            </label>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={
                                                    form.block_list
                                                        .phone_number ?? ''
                                                }
                                                onChange={(e) =>
                                                    handlePhoneChange(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="01XXXXXXXXX"
                                                className={
                                                    inputClass(
                                                        Boolean(
                                                            errors.phone_number,
                                                        ),
                                                    ) + ' mt-1'
                                                }
                                            />
                                            <FieldError
                                                message={errors.phone_number}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-bold text-slate-500 uppercase">
                                                নাম (বাংলা)
                                            </label>
                                            <input
                                                type="text"
                                                value={
                                                    form.block_list.name_bn ??
                                                    ''
                                                }
                                                onChange={(e) =>
                                                    setBlockField(
                                                        'name_bn',
                                                        e.target.value,
                                                    )
                                                }
                                                className={
                                                    inputClass(false) + ' mt-1'
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-bold text-slate-500 uppercase">
                                                জন্ম তারিখ
                                            </label>
                                            <SmartDateInput
                                                value={form.block_list.dob}
                                                onChange={handleDobChange}
                                                className="mt-1"
                                                error={errors.dob}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-bold text-slate-500 uppercase">
                                                পিতার নাম
                                            </label>
                                            <input
                                                type="text"
                                                value={
                                                    form.block_list
                                                        .father_name ?? ''
                                                }
                                                onChange={(e) =>
                                                    setBlockField(
                                                        'father_name',
                                                        e.target.value,
                                                    )
                                                }
                                                className={
                                                    inputClass(false) + ' mt-1'
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-bold text-slate-500 uppercase">
                                                মাতার নাম
                                            </label>
                                            <input
                                                type="text"
                                                value={
                                                    form.block_list
                                                        .mother_name ?? ''
                                                }
                                                onChange={(e) =>
                                                    setBlockField(
                                                        'mother_name',
                                                        e.target.value,
                                                    )
                                                }
                                                className={
                                                    inputClass(false) + ' mt-1'
                                                }
                                            />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="text-[11px] font-bold text-slate-500 uppercase">
                                                ঠিকানা
                                            </label>
                                            <textarea
                                                rows={2}
                                                value={
                                                    form.block_list.address ??
                                                    ''
                                                }
                                                onChange={(e) =>
                                                    setBlockField(
                                                        'address',
                                                        e.target.value,
                                                    )
                                                }
                                                className={
                                                    inputClass(false) +
                                                    ' mt-1 resize-none'
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {isWaiting && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                            <div>
                                <label className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                                    অপেক্ষমান রাখার কারণ / মন্তব্য{' '}
                                    <span className="text-rose-500">*</span>
                                </label>
                                <textarea
                                    rows={3}
                                    value={form.comments}
                                    onChange={(e) => {
                                        setField('comments', e.target.value);
                                        setErrors((prev) => ({
                                            ...prev,
                                            comments: validateRejectComments(
                                                e.target.value,
                                            ),
                                        }));
                                    }}
                                    placeholder="কেন অপেক্ষমান রাখছেন তা লিখুন..."
                                    className={
                                        inputClass(Boolean(errors.comments)) +
                                        ' mt-2 resize-none'
                                    }
                                />
                                <FieldError message={errors.comments} />
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-2.5 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row">
                    <button
                        type="button"
                        onClick={onEdit}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                        সারি সম্পাদনা
                    </button>
                    <button
                        type="button"
                        onClick={handlePrimaryAction}
                        disabled={isDisabled}
                        className={`flex-1 rounded-xl py-3 text-sm font-bold shadow-sm transition-all ${
                            isDisabled
                                ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                                : isApprove
                                ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white'
                                : isReject
                                ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white'
                                : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                        }`}
                    >
                        {isApprove
                            ? 'অনুমোদন দিন'
                            : isReject
                            ? pushToBlockList
                                ? 'প্রত্যাখ্যান ও Block List'
                                : 'শুধু প্রত্যাখ্যান'
                            : 'অপেক্ষমান রাখুন'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default React.memo(function TeamBasedDecisionModal(props: Props) {
    if (!props.open || !props.review || !props.row) return null;
    return (
        <TeamBasedDecisionModalInner
            review={props.review}
            row={props.row}
            authUsername={props.authUsername}
            branchCode={props.branchCode}
            onClose={props.onClose}
            onEdit={props.onEdit}
            onRequestApprove={props.onRequestApprove}
            onSubmitReject={props.onSubmitReject}
        />
    );
});
