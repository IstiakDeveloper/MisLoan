import React, { ReactNode } from 'react';

interface FormSectionProps {
    title: string;
    children: ReactNode;
    className?: string;
}

/** Compact section wrapper for Member Admission form - consistent border, spacing, title size */
export default function FormSection({ title, children, className = '' }: FormSectionProps) {
    return (
        <section className={`border-b border-gray-100 pb-4 last:border-0 ${className}`}>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">{title}</h3>
            {children}
        </section>
    );
}
