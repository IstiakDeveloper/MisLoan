import { usePage } from '@inertiajs/react';

export type HoSendCutoff = {
    time: string;
    label: string;
    badge: string;
    is_blocked: boolean;
    blocked_message: string;
};

const FALLBACK: HoSendCutoff = {
    time: '17:00',
    label: 'বিকাল ৫:০০টা',
    badge: '৫:০০ PM',
    is_blocked: false,
    blocked_message: '',
};

export function useHoSendCutoff(): HoSendCutoff {
    const { hoSendCutoff } = usePage().props as { hoSendCutoff?: HoSendCutoff | null };

    return hoSendCutoff ?? FALLBACK;
}
