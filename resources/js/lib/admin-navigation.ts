import type { LucideIcon } from 'lucide-react';
import {
    Activity,
    Banknote,
    BarChart3,
    Building2,
    CalendarDays,
    CircleUser,
    ClipboardCheck,
    Coins,
    FileCheck,
    FileSpreadsheet,
    Landmark,
    LayoutDashboard,
    ListTree,
    LockKeyhole,
    PiggyBank,
    RotateCw,
    SearchCheck,
    Settings,
    Shield,
    Smartphone,
    Users,
    Wallet,
} from 'lucide-react';

export interface AdminUser {
    id: number;
    name: string;
    email: string;
    role?: { name: string } | null;
    has_all_access?: boolean;
    is_active?: boolean;
    is_read_only?: boolean;
    account_type?: string;
    branch_id?: number | null;
    branch?: { name: string; code?: string } | null;
    area?: { name: string } | null;
    zone?: { name: string } | null;
    avatar?: string | null;
    profile_photo?: string | null;
    cso_areas?: Array<{ id: number; name: string; code: string }>;
    needs_portfolio_handover?: boolean;
}
export type BadgeCounts = Partial<
    Record<
        | 'pendingLoanApplications'
        | 'pendingAdmissions'
        | 'pendingApprovals'
        | 'pendingTeamBasedApprovals'
        | 'pendingVerifications'
        | 'pendingClusterHandovers',
        number
    >
>;
export interface AdminNavItem {
    title: string;
    href: string;
    icon: LucideIcon;
    badge?: number;
    aliases?: string[];
    englishTitle: string;
    category?: string;
}
export interface AdminNavGroup {
    id: string;
    title: string;
    icon: LucideIcon;
    items: AdminNavItem[];
    englishTitle: string;
    description: string;
    section: NavigationSectionId;
}

export type NavigationSectionId =
    | 'daily'
    | 'supervision'
    | 'reports'
    | 'setup'
    | 'personal';
export const navigationSections = [
    { id: 'daily', title: 'দৈনন্দিন কাজ', englishTitle: 'Daily operations' },
    {
        id: 'supervision',
        title: 'যাচাই ও তদারকি',
        englishTitle: 'Review & supervision',
    },
    { id: 'reports', title: 'প্রতিবেদন', englishTitle: 'Reports' },
    {
        id: 'setup',
        title: 'সেটআপ ও প্রশাসন',
        englishTitle: 'Setup & administration',
    },
] as const;
const moduleLabels: Record<string, [NavigationSectionId, string, string]> = {
    dashboard: ['daily', 'ড্যাশবোর্ড', 'আজকের সারসংক্ষেপ'],
    members: ['daily', 'সদস্য ও সমিতি', 'সদস্য ভর্তি, ঋণচক্র ও সমিতি'],
    loans: ['daily', 'ঋণ কার্যক্রম', 'আবেদন, আদায় ও বকেয়া'],
    savings: ['daily', 'সঞ্চয় কার্যক্রম', 'আবেদন ও সঞ্চয়ের লেনদেন'],
    accounting: ['daily', 'হিসাবরক্ষণ', 'ভাউচার ও পোস্টেড হিসাব'],
    approvals: [
        'supervision',
        'যাচাই ও অনুমোদন',
        'তথ্য যাচাই ও অপেক্ষমাণ সিদ্ধান্ত',
    ],
    handovers: [
        'supervision',
        'দায়িত্ব ও হস্তান্তর',
        'কর্মী দায়িত্ব ও Portfolio হস্তান্তর',
    ],
    reports: ['reports', 'প্রতিবেদন কেন্দ্র', 'সদস্য, ঋণ ও আর্থিক প্রতিবেদন'],
    organization: [
        'setup',
        'প্রতিষ্ঠান সেটআপ',
        'Zone, Area, Branch ও সদস্যের শ্রেণি',
    ],
    products: ['setup', 'প্রোডাক্ট ও নিয়ম', 'ঋণ, সঞ্চয় ও অনুমোদনের নিয়ম'],
    'accounting-setup': ['setup', 'হিসাব সেটআপ', 'GL হিসাব ও হিসাবকাল'],
    administration: [
        'setup',
        'ব্যবহারকারী ও নিরাপত্তা',
        'ব্যবহারকারী, অনুমতি ও সক্রিয় সেশন',
    ],
    imports: ['setup', 'ডেটা আপলোড', 'Batch upload ও loan submission'],
    account: ['personal', 'আমার অ্যাকাউন্ট', 'ব্যক্তিগত সেটিংস'],
};
const itemLabels: Record<string, string> = {
    Dashboard: 'ড্যাশবোর্ড',
    'Member Admissions': 'সদস্য তালিকা ও ভর্তি',
    'Member Cycle Hub': 'সদস্যের ঋণচক্র',
    Samities: 'সমিতি তালিকা',
    'Member Categories': 'সদস্যের শ্রেণি',
    'Loan Applications': 'ঋণ আবেদন',
    'Loan Accounts & Collections': 'ঋণ হিসাব ও আদায়',
    'Portfolio & Arrears': 'বকেয়া ও Portfolio',
    'Loan Batch Uploads': 'ঋণের Batch Upload',
    'Loan Submissions': 'ঋণ ডেটা জমা',
    'Savings Applications': 'সঞ্চয় আবেদন',
    'Savings Accounts & Transactions': 'সঞ্চয় হিসাব ও লেনদেন',
    'Issue Processing': 'সমস্যা নিষ্পত্তি',
    Verification: 'তথ্য যাচাই',
    'Pending Approvals': 'আমার অপেক্ষমাণ অনুমোদন',
    'Team Approval Review': 'দলভিত্তিক অনুমোদন যাচাই',
    'Team Based Approvals': 'দলভিত্তিক অনুমোদন',
    'Accounting Overview': 'হিসাবের সারসংক্ষেপ',
    'Cash Desk': 'ক্যাশ ডেস্ক',
    'Vouchers & Approvals': 'ভাউচার ও অনুমোদন',
    'Posted Journals': 'পোস্টেড জার্নাল',
    'Chart of Accounts': 'হিসাবের তালিকা (GL)',
    'Posting Defaults': 'GL ডিফল্ট',
    'Institution Policy': 'প্রতিষ্ঠানের নীতি',
    'Regulatory Mappings': 'নিয়ন্ত্রক ম্যাপিং',
    'Accounting Periods': 'হিসাবকাল',
    'Financial Statements & Ledger': 'আর্থিক বিবরণী ও GL Ledger',
    'App Registration Report': 'App নিবন্ধন প্রতিবেদন',
    'Team Based Report': 'দলভিত্তিক ঋণ প্রতিবেদন',
    'Guarantor & Informant Report': 'জামিনদার ও তথ্যদাতা',
    'Approver Loan Approval Report': 'অনুমোদনকারীর ঋণ প্রতিবেদন',
    'Branch Loan Pending Report': 'শাখার অপেক্ষমাণ ঋণ',
    'Zones, Areas & Branches': 'Zone, Area ও Branch',
    'Cluster Handover': 'Cluster হস্তান্তর',
    'Portfolio Handover': 'Portfolio হস্তান্তর',
    'CSO Duty Roster': 'CSO দায়িত্বসূচি',
    'Loan Products': 'ঋণ প্রোডাক্ট',
    'Loan Categories': 'ঋণের শ্রেণি',
    'Savings Products': 'সঞ্চয় প্রোডাক্ট',
    'Savings Categories': 'সঞ্চয়ের শ্রেণি',
    'Loan Workflow & Rules': 'ঋণ অনুমোদনের নিয়ম',
    'Submission Deadline': 'ডেটা জমার সময়সীমা',
    Users: 'ব্যবহারকারী',
    'Active Sessions': 'সক্রিয় সেশন',
    'Roles & Permissions': 'পদ ও অনুমতি',
    'Recent Deletions': 'সম্প্রতি মুছে ফেলা তথ্য',
    Profile: 'আমার প্রোফাইল',
    Password: 'পাসওয়ার্ড',
    Appearance: 'থিম ও প্রদর্শন',
    Notifications: 'নোটিফিকেশন',
};
export function getNavigationSections(groups: AdminNavGroup[]) {
    return navigationSections
        .map((section) => ({
            ...section,
            groups: groups.filter((group) => group.section === section.id),
        }))
        .filter((section) => section.groups.length > 0);
}

// Presentation only: controllers and middleware remain authoritative.
export function getAdminNavigation(
    user: AdminUser,
    badges: BadgeCounts = {},
): AdminNavGroup[] {
    const role = user.role?.name ?? '';
    const branch =
        ['branch_manager', 'branch_user', 'field_officer'].includes(role) ||
        (!role && user.branch_id != null && !user.has_all_access);
    const approver = ['area_manager', 'zone_manager', 'admf', 'dmf'].includes(
        role,
    );
    const cso = role === 'cso',
        ed = role === 'ed',
        superAdmin = role === 'super_admin';
    const personal = user.account_type !== 'branch';
    const financial = superAdmin && personal && user.is_active !== false;
    const cashier =
        role === 'branch_manager' &&
        personal &&
        user.branch_id != null &&
        user.is_active !== false;
    const office =
        ['super_admin', 'head_office', 'ed', 'cso'].includes(role) &&
        !branch &&
        !approver;
    const setup = office && !cso;
    const canViewApproverReport =
        office ||
        approver ||
        role === 'branch_manager' ||
        Boolean(user.has_all_access);
    const operations = branch || approver || office;
    const groups: AdminNavGroup[] = [];
    const add = (
        id: string,
        title: string,
        icon: LucideIcon,
        items: Array<AdminNavItem | false>,
    ) => {
        const visible = items.filter((item): item is AdminNavItem =>
            Boolean(item),
        );
        if (visible.length) {
            const [section, label, description] = moduleLabels[id];
            groups.push({
                id,
                title: label,
                englishTitle: title,
                description,
                section,
                icon,
                items: visible,
            });
        }
    };
    const item = (
        title: string,
        href: string,
        icon: LucideIcon,
        badge?: number,
    ): AdminNavItem => ({
        title: itemLabels[title] ?? title,
        englishTitle: title,
        href,
        icon,
        badge,
    });
    add('dashboard', 'Overview', LayoutDashboard, [
        item('Dashboard', '/dashboard', LayoutDashboard),
    ]);
    add('members', 'Members & Samities', Users, [
        operations &&
            item(
                'Member Admissions',
                office
                    ? '/head-office/admission-members'
                    : '/member-admissions',
                Users,
                badges.pendingAdmissions,
            ),
        operations && item('Member Cycle Hub', '/member/cycle-hub', RotateCw),
        setup && item('Samities', '/samities', Building2),
    ]);
    add('loans', 'Loans', Banknote, [
        operations &&
            item(
                'Loan Applications',
                office
                    ? '/head-office/loan-applications'
                    : '/member/loan-applications',
                Banknote,
                badges.pendingLoanApplications,
            ),
        financial &&
            item('Loan Accounts & Collections', '/loan-ledger', Wallet),
        financial && item('Portfolio & Arrears', '/loan-portfolio', BarChart3),
    ]);
    add('savings', 'Savings', PiggyBank, [
        operations &&
            item(
                'Savings Applications',
                office
                    ? '/head-office/savings-applications'
                    : '/member/savings-applications',
                PiggyBank,
            ),
        financial &&
            item('Savings Accounts & Transactions', '/savings-ledger', Wallet),
    ]);
    add('approvals', 'Approvals & Verification', ClipboardCheck, [
        setup && item('Issue Processing', '/issue-processing', SearchCheck),
        operations &&
            item(
                'Verification',
                '/verifications',
                SearchCheck,
                badges.pendingVerifications,
            ),
        (approver ||
            ed ||
            (branch && !['branch_user', 'field_officer'].includes(role))) &&
            item(
                'Pending Approvals',
                '/approvals',
                ClipboardCheck,
                badges.pendingApprovals,
            ),
        (approver || ed) &&
            item(
                'Team Approval Review',
                '/team-based-approvals/for-approver',
                FileCheck,
                badges.pendingTeamBasedApprovals,
            ),
        office &&
            !cso &&
            item(
                'Team Based Approvals',
                '/head-office/team-based-approvals',
                FileCheck,
            ),
        branch &&
            role !== 'field_officer' &&
            item('Team Based Approvals', '/team-based-approvals', FileCheck),
    ]);
    add('accounting', 'Accounting & Cash', Landmark, [
        (financial || cashier) && item('Cash Desk', '/cash-desk', Wallet),
        financial && item('Accounting Overview', '/accounting', Landmark),
        financial &&
            item('Vouchers & Approvals', '/accounting/vouchers', FileCheck),
        financial && item('Posted Journals', '/accounting/journals', Landmark),
    ]);
    add('reports', 'Reports', BarChart3, [
        financial &&
            item(
                'Financial Statements & Ledger',
                '/accounting/reports',
                Landmark,
            ),
        operations &&
            item(
                'App Registration Report',
                '/reports/app-registrations',
                Smartphone,
            ),
        operations &&
            (Boolean(user.has_all_access) ||
                superAdmin ||
                role === 'head_office' ||
                ed) &&
            item(
                'Team Based Report',
                '/head-office/team-based-approvals/report',
                FileSpreadsheet,
            ),
        operations &&
            (Boolean(user.has_all_access) ||
                superAdmin ||
                role === 'head_office' ||
                cso ||
                ed) &&
            item(
                'Guarantor & Informant Report',
                '/head-office/reports/guarantor-informants',
                Users,
            ),
        operations &&
            canViewApproverReport &&
            item(
                'Approver Loan Approval Report',
                '/reports/approver-loan-approvals',
                FileSpreadsheet,
            ),
        operations &&
            item(
                'Branch Loan Pending Report',
                '/reports/branch-loan-pending',
                BarChart3,
            ),
    ]);
    add('organization', 'Organization & Operations', Building2, [
        setup && item('Zones, Areas & Branches', '/organizations', Building2),
        setup && item('Member Categories', '/member-categories', ListTree),
    ]);
    add('handovers', 'Responsibilities & Handovers', Users, [
        branch &&
            role !== 'field_officer' &&
            item(
                'Cluster Handover',
                '/cluster-handover',
                Users,
                badges.pendingClusterHandovers,
            ),
        role === 'field_officer' &&
            Boolean(user.needs_portfolio_handover) &&
            item('Portfolio Handover', '/portfolio-handover', RotateCw),
        setup &&
            item(
                'CSO Duty Roster',
                '/head-office/cso-duty-roster',
                CalendarDays,
            ),
    ]);
    add('imports', 'Data uploads', FileSpreadsheet, [
        branch &&
            role !== 'field_officer' &&
            item('Loan Batch Uploads', '/loan', FileSpreadsheet),
        setup && item('Loan Submissions', '/submissions', FileSpreadsheet),
    ]);
    add('accounting-setup', 'Accounting setup', Settings, [
        financial &&
            item('Chart of Accounts', '/accounting/accounts', Landmark),
        financial &&
            item('Posting Defaults', '/accounting/posting-defaults', Landmark),
        financial &&
            item('Institution Policy', '/accounting/institution-policy', Settings),
        financial &&
            item(
                'Regulatory Mappings',
                '/accounting/regulatory-mappings',
                FileSpreadsheet,
            ),
        financial &&
            item('Accounting Periods', '/accounting/periods', CalendarDays),
    ]);
    add('products', 'Products & Workflow', Coins, [
        setup && item('Loan Products', '/loan-products', Coins),
        setup && item('Loan Categories', '/loan-categories', ListTree),
        setup && item('Savings Products', '/savings-products', PiggyBank),
        setup && item('Savings Categories', '/savings-categories', ListTree),
        setup &&
            item(
                'Loan Workflow & Rules',
                '/head-office/loan-workflow-settings',
                Settings,
            ),
        setup &&
            item(
                'Submission Deadline',
                '/head-office/send-cutoff',
                CalendarDays,
            ),
    ]);
    add('administration', 'Administration', Shield, [
        setup &&
            personal &&
            user.is_active !== false &&
            item('Users', '/users', CircleUser),
        setup &&
            personal &&
            user.is_active !== false &&
            item('Active Sessions', '/user-sessions', Activity),
        superAdmin &&
            personal &&
            user.is_active !== false &&
            item('Roles & Permissions', '/roles', Shield),
        setup &&
            (superAdmin ||
                role === 'head_office' ||
                Boolean(user.has_all_access)) &&
            item('Recent Deletions', '/head-office/recent-deletions', RotateCw),
    ]);
    add('account', 'My Account', CircleUser, [
        item('Profile', '/profile', CircleUser),
        item('Password', '/settings/password', LockKeyhole),
        item('Appearance', '/settings/appearance', Settings),
        item('Notifications', '/notifications', Activity),
    ]);
    const aliases: Record<string, string[]> = {
        '/profile': ['/settings/profile'],
        '/head-office/admission-members': ['/member-admissions'],
        '/head-office/loan-applications': ['/member/loan-applications'],
        '/head-office/savings-applications': ['/member/savings-applications'],
        '/reports/approver-loan-approvals': [
            '/head-office/reports/approver-loan-approvals',
        ],
    };
    for (const group of groups)
        for (const entry of group.items) entry.aliases = aliases[entry.href];
    const reportCategories: Record<string, string> = {
        '/accounting/reports': 'আর্থিক হিসাব',
        '/reports/app-registrations': 'সদস্য',
        '/head-office/reports/guarantor-informants': 'সদস্য',
    };
    for (const group of groups)
        if (group.id === 'reports') {
            for (const entry of group.items)
                entry.category = reportCategories[entry.href] ?? 'ঋণ ও অনুমোদন';
            const categories = ['সদস্য', 'ঋণ ও অনুমোদন', 'আর্থিক হিসাব'];
            group.items.sort(
                (a, b) =>
                    categories.indexOf(a.category!) -
                    categories.indexOf(b.category!),
            );
        }
    const order = [
        'dashboard',
        'members',
        'loans',
        'savings',
        'accounting',
        'approvals',
        'handovers',
        'reports',
        'organization',
        'products',
        'accounting-setup',
        'administration',
        'imports',
        'account',
    ];
    return groups.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}
export function navigationPath(url: string): string {
    try {
        return (
            new URL(url, 'https://misloan.local').pathname.replace(/\/$/, '') ||
            '/'
        );
    } catch {
        return '/';
    }
}
export function activeNavigation(
    groups: AdminNavGroup[],
    path: string,
): { group: AdminNavGroup; item: AdminNavItem; href: string } | undefined {
    return groups
        .flatMap((group) =>
            group.items.flatMap((item) =>
                [item.href, ...(item.aliases ?? [])].map((href) => ({
                    group,
                    item,
                    href,
                })),
            ),
        )
        .filter(
            ({ href }) =>
                path === href ||
                (href !== '/dashboard' && path.startsWith(`${href}/`)),
        )
        .sort((a, b) => b.href.length - a.href.length)[0];
}
export function pageAction(path: string, base?: string): string | undefined {
    if (!base || path === base) return;
    const suffix = path.slice(base.length);
    if (suffix === '/create') return 'Create';
    if (suffix.endsWith('/edit')) return 'Edit';
    if (suffix.includes('/print')) return 'Print';
    return 'Details';
}
