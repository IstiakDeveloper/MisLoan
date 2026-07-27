import React, { ReactNode } from 'react';

interface FormSectionProps {
    title: string;
    icon?: ReactNode;
    subtitle?: string;
    children: ReactNode;
    className?: string;
}

/** Section wrapper for Member Admission form - consistent card, border, header title */
export default function FormSection({ title, icon, subtitle, children, className = '' }: FormSectionProps) {
    return (
        <section className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 space-y-4 ${className}`}>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                    {icon && (
                        <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
                            {icon}
                        </div>
                    )}
                    <div>
                        <h3 className="text-sm md:text-base font-bold text-gray-900 leading-tight">{title}</h3>
                        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
                    </div>
                </div>
            </div>
            <div>{children}</div>
        </section>
    );
}

