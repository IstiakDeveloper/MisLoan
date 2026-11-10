import {
    BarChart3,
    BookOpen,
    CalendarDays,
    ClipboardCheck,
    FilePlus2,
    Landmark,
    LayoutDashboard,
} from 'lucide-react';

export type AccountingSection =
    | 'overview'
    | 'vouchers'
    | 'create'
    | 'journals'
    | 'accounts'
    | 'periods'
    | 'reports';
export const accountingSections = [
    {
        id: 'overview',
        title: 'সারসংক্ষেপ',
        subtitle: 'Accounting overview',
        path: '/accounting',
        icon: LayoutDashboard,
        description: 'শাখার হিসাবের অবস্থা ও আজকের করণীয় এক নজরে।',
    },
    {
        id: 'vouchers',
        title: 'ভাউচার ও অনুমোদন',
        subtitle: 'Vouchers & approvals',
        path: '/accounting/vouchers',
        icon: ClipboardCheck,
        description: 'জমা দেওয়া ভাউচার দেখুন, যাচাই করুন এবং সিদ্ধান্ত দিন।',
    },
    {
        id: 'create',
        title: 'নতুন ভাউচার',
        subtitle: 'Create voucher',
        path: '/accounting/vouchers/create',
        icon: FilePlus2,
        description:
            'লেনদেনের ধরন বেছে নিন, তথ্য লিখুন এবং পর্যালোচনার জন্য জমা দিন।',
    },
    {
        id: 'journals',
        title: 'পোস্টেড জার্নাল',
        subtitle: 'Posted journals',
        path: '/accounting/journals',
        icon: BookOpen,
        description: 'অনুমোদনের পর পোস্ট হওয়া হিসাব ও তার উৎস দেখুন।',
    },
    {
        id: 'accounts',
        title: 'হিসাবের তালিকা',
        subtitle: 'Chart of accounts',
        path: '/accounting/accounts',
        icon: Landmark,
        description:
            'GL হিসাবের কোড, ধরন ও নির্বাচিত শাখার ব্যালেন্স খুঁজে দেখুন।',
    },
    {
        id: 'periods',
        title: 'হিসাবকাল',
        subtitle: 'Accounting periods',
        path: '/accounting/periods',
        icon: CalendarDays,
        description: 'কোন তারিখে entry দেওয়া যাবে তা নির্ধারণ করুন।',
    },
    {
        id: 'reports',
        title: 'আর্থিক প্রতিবেদন',
        subtitle: 'Financial reports',
        path: '/accounting/reports',
        icon: BarChart3,
        description:
            'একটি প্রতিবেদন বেছে নিয়ে শাখা ও তারিখ অনুযায়ী হিসাব দেখুন।',
    },
] as const;

export function accountingUrl(
    section: AccountingSection,
    branch?: number | null,
    extra: Record<string, string | number | undefined> = {},
): string {
    const params = new URLSearchParams();
    if (branch) params.set('branch_id', String(branch));
    for (const [key, value] of Object.entries(extra))
        if (key !== 'branch_id' && value !== undefined && value !== '')
            params.set(key, String(value));
    const path = accountingSections.find((item) => item.id === section)!.path;
    return `${path}${params.size ? `?${params}` : ''}`;
}
