import React from 'react';
import { Phone } from 'lucide-react';
import { formatTelHref, toEnglishDigits } from '@/utils/phoneUtils';

interface PhoneCallLinkProps {
    phone?: string | null;
    className?: string;
    showIcon?: boolean;
    iconClassName?: string;
    children?: React.ReactNode;
    fallback?: string;
    showCallAction?: boolean;
}

export function PhoneCallLink({
    phone,
    className = '',
    showIcon = true,
    iconClassName = 'w-3 h-3 text-blue-500 shrink-0',
    children,
    fallback = '—',
    showCallAction = false,
}: PhoneCallLinkProps) {
    if (!phone || !String(phone).trim()) {
        return <span className="text-slate-400 font-mono">{fallback}</span>;
    }

    const cleanTel = formatTelHref(phone);
    if (!cleanTel) {
        return <span className="text-slate-400 font-mono">{phone}</span>;
    }

    const displayPhone = toEnglishDigits(phone);

    return (
        <a
            href={`tel:${cleanTel}`}
            onClick={(e) => e.stopPropagation()}
            className={`inline-flex items-center gap-1 font-mono text-slate-700 hover:text-blue-600 hover:underline transition group ${className}`}
            title={`কল করতে ক্লিক করুন: ${cleanTel}`}
        >
            {showIcon && <Phone className={`${iconClassName} group-hover:scale-110 group-hover:text-blue-600 transition-transform`} />}
            <span className="group-hover:text-blue-600 font-medium">{children || displayPhone}</span>
            {showCallAction && (
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-blue-50 text-blue-700 px-1 py-0.2 rounded border border-blue-200 ml-1">
                    Call
                </span>
            )}
        </a>
    );
}

export default PhoneCallLink;
