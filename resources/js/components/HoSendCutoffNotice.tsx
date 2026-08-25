import { Clock } from 'lucide-react';

import { useHoSendCutoff } from '@/hooks/use-ho-send-cutoff';
import { cn } from '@/lib/utils';

export default function HoSendCutoffNotice({
    kind,
}: {
    kind: 'loan' | 'admission';
}) {
    const cutoff = useHoSendCutoff();
    const subject = kind === 'loan' ? 'ঋণ আবেদনসমূহ' : 'সদস্য ভর্তির আবেদনসমূহ';
    const reason =
        kind === 'loan'
            ? 'যাতে একই কার্যদিবসে যথাসময়ে যাচাই ও চূড়ান্ত অনুমোদন সম্পন্ন করা যায়।'
            : 'যাতে আগামী কার্যদিবসে যথাসময়ে ঋণ অনুমোদন ও কার্যক্রম সম্পন্ন করা যায়।';

    return (
        <div
            className={cn(
                'flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-xs shadow-2xs',
                cutoff.is_blocked
                    ? 'border-rose-200/90 bg-rose-50/90 text-rose-950'
                    : 'border-amber-200/90 bg-amber-50/90 text-amber-950',
            )}
        >
            <div className="flex min-w-0 items-center gap-2.5">
                <div
                    className={cn(
                        'flex size-6 shrink-0 items-center justify-center rounded-lg',
                        cutoff.is_blocked
                            ? 'bg-rose-200/80 text-rose-900'
                            : 'bg-amber-200/80 text-amber-900',
                    )}
                >
                    <Clock size={14} className="stroke-[2.5]" />
                </div>
                <p
                    className={cn(
                        'leading-snug font-medium',
                        cutoff.is_blocked ? 'text-rose-900' : 'text-amber-900',
                    )}
                >
                    {cutoff.is_blocked ? (
                        <>
                            <strong className="font-bold text-rose-950">সময়সীমা শেষ:</strong>{' '}
                            {subject} এখন হেড অফিসে পাঠানো যাবে না। আগামীকাল {cutoff.label} পর্যন্ত
                            পাঠাতে পারবেন।
                        </>
                    ) : (
                        <>
                            <strong className="font-bold text-amber-950">জরুরি সময়সীমা:</strong>{' '}
                            {subject}{' '}
                            <span className="font-bold underline decoration-amber-500">
                                অবশ্যই {cutoff.label}র মধ্যে
                            </span>{' '}
                            হেড অফিসে পাঠাতে হবে, {reason}
                        </>
                    )}
                </p>
            </div>
            <span
                className={cn(
                    'hidden shrink-0 rounded border px-2 py-0.5 text-[10px] font-bold sm:inline-block',
                    cutoff.is_blocked
                        ? 'border-rose-300 bg-rose-200/70 text-rose-900'
                        : 'border-amber-300 bg-amber-200/70 text-amber-900',
                )}
            >
                {cutoff.is_blocked ? 'বন্ধ' : 'সময়সীমা'}: {cutoff.badge}
            </span>
        </div>
    );
}
