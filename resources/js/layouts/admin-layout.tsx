import { useState, useEffect, useRef, ReactNode, useMemo } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import {
    LayoutDashboard,
    LayoutGrid,
    Building2,
    Users,
    Shield,
    Menu,
    X,
    ChevronDown,
    ChevronRight,
    LogOut,
    User,
    CheckCircle,
    XCircle,
    AlertCircle,
    Info,
    UserPlus,
    ClipboardCheck,
    Landmark,
    Banknote,
    ListTree,
    Wallet,
    Settings,
    Download,
    Wrench,
    BarChart3,
    PiggyBank,
    PieChart,
    CircleUser,
    Coins,
    FileCheck,
    Mail,
    SearchCheck,
    ExternalLink,
    Sparkles,
    CalendarDays,
    Clock,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePwaInstallPrompt } from '@/hooks/usePwaInstallPrompt';
import NotificationBell from '@/components/NotificationBell';

interface User {
    id: number;
    name: string;
    email: string;
    role?: { name: string };
    has_all_access: boolean;
    is_read_only?: boolean;
    branch_id?: number | null;
    profile_photo?: string | null;
    avatar?: string | null;
    cso_areas?: Array<{ id: number; name: string; code: string }>;
}

interface Flash {
    success?: string;
    error?: string;
    warning?: string;
    info?: string;
}

interface PageProps extends Record<string, unknown> {
    auth: { user: User };
    flash: Flash;
    siteMaintenance?: boolean;
    unreadSubmissionsCount?: number;
    badgeCounts?: {
        pendingLoanApplications?: number;
        pendingAdmissions?: number;
        pendingApprovals?: number;
        pendingTeamBasedApprovals?: number;
        pendingVerifications?: number;
        pendingClusterHandovers?: number;
    };
}

interface AdminLayoutProps {
    children: ReactNode;
}

const SETUP_PATHS = ['/loan-categories', '/loan-products', '/savings-products', '/organizations', '/samities', '/member-categories', '/users', '/roles', '/head-office/cso-duty-roster', '/head-office/send-cutoff'];
const REPORT_PATHS = ['/head-office/team-based-approvals/report', '/head-office/reports/guarantor-informants'];
const TEAM_BASED_REPORT_HREF = '/head-office/team-based-approvals/report';
const GUARANTOR_INFORMANT_REPORT_HREF = '/head-office/reports/guarantor-informants';

function isNavItemActive(currentPath: string, href: string): boolean {
    if (currentPath === href) return true;
    if (href === '/dashboard') return false;
    if (!currentPath.startsWith(`${href}/`)) return false;
    if (href === '/head-office/team-based-approvals' && REPORT_PATHS.some((p) => currentPath.startsWith(p))) {
        return false;
    }
    return true;
}

function isGmailAddress(email?: string | null): boolean {
    if (!email) return false;
    return email.trim().toLowerCase().endsWith('@gmail.com');
}

function getPageTitle(currentPath: string): string {
    if (currentPath === '/dashboard') return 'Dashboard';
    if (currentPath.includes('/cso-duty-roster')) return 'CSO Duty Roster';
    if (currentPath.includes('/send-cutoff')) return 'Send Deadline';
    if (currentPath.includes('/cluster-handover')) return 'Cluster Handover';
    if (currentPath.includes('/member-admissions') || currentPath.includes('/admission-members')) return 'Member Admissions';
    if (currentPath.includes('/loan-applications')) return 'Loan Applications';
    if (currentPath.includes('/savings-applications')) return 'Savings Applications';
    if (currentPath.includes('/team-based-approvals')) return 'Team Based Approvals';
    if (currentPath.includes('/reports/guarantor-informants')) return 'Guarantor & Informant Report';
    if (currentPath.includes('/approvals')) return 'Pending Approvals';
    if (currentPath.includes('/verifications')) return 'Verifications';
    if (currentPath.includes('/loan-categories')) return 'Loan Categories';
    if (currentPath.includes('/loan-products')) return 'Loan Products';
    if (currentPath.includes('/savings-products')) return 'Savings Products';
    if (currentPath.includes('/organizations')) return 'Organizations';
    if (currentPath.includes('/samities')) return 'Samities';
    if (currentPath.includes('/member-categories')) return 'Member Categories';
    if (currentPath.includes('/users')) return 'User Management';
    if (currentPath.includes('/roles')) return 'Roles & Permissions';
    if (currentPath.includes('/profile')) return 'Profile & Settings';
    if (currentPath.includes('/notifications')) return 'Notifications';
    return 'Dashboard';
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    const page = usePage<PageProps>();
    const { auth, flash, siteMaintenance = false, badgeCounts = {} } = page.props;
    const userAvatarSrc = auth.user?.avatar || (auth.user?.profile_photo ? `/storage/${auth.user.profile_photo}` : null);
    const hasMailIssue = !isGmailAddress(auth.user?.email);
    const path = (() => {
        try {
            return new URL(page.url).pathname;
        } catch {
            return typeof window !== 'undefined' ? window.location.pathname : '';
        }
    })();
    const isOnProfilePage = path === '/profile' || path.startsWith('/profile/');
    const isMobile = useIsMobile();
    const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);
    const userDropdownRef = useRef<HTMLDivElement>(null);
    const [flashMessage, setFlashMessage] = useState<{ type: string; message: string } | null>(null);
    const setupOpenDefault = useMemo(() => SETUP_PATHS.some(p => path.startsWith(p)), [path]);
    const reportOpenDefault = useMemo(() => REPORT_PATHS.some(p => path.startsWith(p)), [path]);
    const [setupExpanded, setSetupExpanded] = useState(setupOpenDefault);
    const [reportExpanded, setReportExpanded] = useState(reportOpenDefault);

    // Close user dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
                setUserDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (flash.success) {
            setFlashMessage({ type: 'success', message: flash.success });
        } else if (flash.error) {
            setFlashMessage({ type: 'error', message: flash.error });
        } else if (flash.warning) {
            setFlashMessage({ type: 'warning', message: flash.warning });
        } else if (flash.info) {
            setFlashMessage({ type: 'info', message: flash.info });
        }
    }, [flash]);

    useEffect(() => {
        if (!flashMessage) return;
        const timer = setTimeout(() => setFlashMessage(null), 5000);
        return () => clearTimeout(timer);
    }, [flashMessage]);

    useEffect(() => {
        setSetupExpanded(prev => (SETUP_PATHS.some(p => path.startsWith(p)) ? true : prev));
    }, [path]);

    useEffect(() => {
        setReportExpanded(prev => (REPORT_PATHS.some(p => path.startsWith(p)) ? true : prev));
    }, [path]);

    // Handle closing sidebar on mobile when resizing or route changes
    useEffect(() => {
        if (isMobile) {
            setSidebarOpen(false);
        } else {
            setSidebarOpen(true);
        }
    }, [isMobile, path]);

    const roleName = auth.user.role?.name || '';

    // Fallback: no role but has branch and not head office → treat as branch user (avoid showing admin menu)
    const inferredBranchRole =
        !roleName &&
        auth.user.branch_id != null &&
        !auth.user.has_all_access;

    const isBranchRole =
        inferredBranchRole ||
        roleName === 'branch_manager' ||
        roleName === 'branch_user' ||
        roleName === 'field_officer';

    // ADMF/DMF/Area/Zone: approver-only menu. ED keeps approver menu + full Head Office navigation.
    const isTeamApproverRole =
        roleName === 'area_manager' ||
        roleName === 'zone_manager' ||
        roleName === 'admf' ||
        roleName === 'dmf';

    const isFieldOfficer = roleName === 'field_officer';
    const isSuperAdmin = roleName === 'super_admin';
    const isHeadOfficeRole = roleName === 'head_office';
    const isCsoRole = roleName === 'cso';
    const isEdRole = roleName === 'ed';
    // Head Office / Super Admin / CSO do not approve via /approvals — hide Pending Approvals UI
    const showPendingApprovalsNav = !isHeadOfficeRole && !isSuperAdmin && !isCsoRole;
    const canViewTeamBasedReport = auth.user.has_all_access || isSuperAdmin || isHeadOfficeRole || isEdRole;
    const canViewGuarantorReport = auth.user.has_all_access || isSuperAdmin || isHeadOfficeRole || isCsoRole || isEdRole;
    const showConfigurationSection = (!isBranchRole && !isTeamApproverRole && !isCsoRole) || isEdRole;
    const { canInstall, promptInstall, isInstalled, isStandalone, platform } = usePwaInstallPrompt();

    const handleMaintenanceToggle = () => {
        router.post('/admin/maintenance/toggle', {}, { preserveScroll: true });
    };
    const [showInstallDialog, setShowInstallDialog] = useState(false);

    useEffect(() => {
        if (canInstall) {
            const isDismissed = sessionStorage.getItem('pwa_install_dismissed');
            if (!isDismissed) {
                setShowInstallDialog(true);
            }
        }
    }, [canInstall]);

    const handleDismissInstall = () => {
        setShowInstallDialog(false);
        sessionStorage.setItem('pwa_install_dismissed', 'true');
    };

    const branchMenuItemsFull = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Member Admissions', href: '/member-admissions', icon: UserPlus },
        { name: 'Loan Applications', href: '/member/loan-applications', icon: Banknote },
        { name: 'Verification', href: '/verifications', icon: SearchCheck, badge: badgeCounts.pendingVerifications || 0 },
        { name: 'Savings Applications', href: '/member/savings-applications', icon: PiggyBank },
        { name: 'Team Based Approval', href: '/team-based-approvals', icon: FileCheck },
        { name: 'Pending Approvals', href: '/approvals', icon: ClipboardCheck, badge: badgeCounts.pendingApprovals || 0 },
        { name: 'Cluster Handover', href: '/cluster-handover', icon: Users, badge: badgeCounts.pendingClusterHandovers || 0 },
    ];

    // Field officer: admissions plus loan applications for their approved members + verifications
    const branchMenuItems = isFieldOfficer
        ? branchMenuItemsFull.filter((m) => m.name === 'Dashboard' || m.name === 'Member Admissions' || m.name === 'Loan Applications' || m.name === 'Verification')
        : roleName === 'branch_user'
        ? branchMenuItemsFull.filter((m) => m.name !== 'Pending Approvals')
        : branchMenuItemsFull;

    const approverMenuItems = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        {
            name: 'Team Based Approval',
            href: '/team-based-approvals/for-approver',
            icon: FileCheck,
            badge: badgeCounts.pendingTeamBasedApprovals || 0,
        },
        {
            name: 'Pending Approvals',
            href: '/approvals',
            icon: ClipboardCheck,
            badge: badgeCounts.pendingApprovals || 0,
        },
    ];

    // Admission / Loan / Verification / Savings for approvers & managers (scoped by assigned zone/area on backend)
    const approverOperationsItems = [
        { name: 'Member Admissions', href: '/member-admissions', icon: UserPlus, badge: badgeCounts.pendingAdmissions || 0 },
        { name: 'Loan Applications', href: '/member/loan-applications', icon: Banknote, badge: badgeCounts.pendingLoanApplications || 0 },
        { name: 'Verification', href: '/verifications', icon: SearchCheck, badge: badgeCounts.pendingVerifications || 0 },
        { name: 'Savings Applications', href: '/member/savings-applications', icon: PiggyBank },
    ];

    const headOfficeMainItems = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Admission Members', href: '/head-office/admission-members', icon: UserPlus, badge: badgeCounts.pendingAdmissions || 0 },
        { name: 'Loan Applications', href: '/head-office/loan-applications', icon: Banknote, badge: badgeCounts.pendingLoanApplications || 0 },
        { name: 'Verification', href: '/verifications', icon: SearchCheck, badge: badgeCounts.pendingVerifications || 0 },
        { name: 'Team Based Approvals', href: '/head-office/team-based-approvals', icon: FileCheck },
        { name: 'Savings Applications', href: '/head-office/savings-applications', icon: PiggyBank },
    ];

    const headOfficeReportItems = [
        ...(canViewTeamBasedReport ? [{ name: 'Team Based Report', href: TEAM_BASED_REPORT_HREF, icon: PieChart }] : []),
        ...(canViewGuarantorReport ? [{ name: 'Guarantor & Informant Report', href: GUARANTOR_INFORMANT_REPORT_HREF, icon: Users }] : []),
    ];

    const headOfficeSetupItems = [
        { name: 'CSO Duty Roster', href: '/head-office/cso-duty-roster', icon: CalendarDays },
        { name: 'Send Deadline', href: '/head-office/send-cutoff', icon: Clock },
        { name: 'Loan Categories', href: '/loan-categories', icon: ListTree },
        { name: 'Loan Products', href: '/loan-products', icon: Coins },
        { name: 'Savings Products', href: '/savings-products', icon: Wallet },
        { name: 'Organizations', href: '/organizations', icon: Landmark },
        { name: 'Samities', href: '/samities', icon: Building2 },
        { name: 'Member Categories', href: '/member-categories', icon: Users },
        { name: 'Users', href: '/users', icon: CircleUser },
        { name: 'Roles', href: '/roles', icon: Shield },
    ];

    const handleLogout = () => {
        router.post('/logout');
    };

    const getFlashIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle className="w-4.5 h-4.5 stroke-[1.75]" />;
            case 'error': return <XCircle className="w-4.5 h-4.5 stroke-[1.75]" />;
            case 'warning': return <AlertCircle className="w-4.5 h-4.5 stroke-[1.75]" />;
            case 'info': return <Info className="w-4.5 h-4.5 stroke-[1.75]" />;
            default: return null;
        }
    };

    const getFlashColor = (type: string) => {
        switch (type) {
            case 'success': return 'border-l-4 border-l-emerald-500 border-slate-200 bg-white/95 text-emerald-800 shadow-xl shadow-emerald-500/10';
            case 'error': return 'border-l-4 border-l-rose-500 border-slate-200 bg-white/95 text-rose-800 shadow-xl shadow-rose-500/10';
            case 'warning': return 'border-l-4 border-l-amber-500 border-slate-200 bg-white/95 text-amber-800 shadow-xl shadow-amber-500/10';
            case 'info': return 'border-l-4 border-l-brand border-slate-200 bg-white/95 text-brand-dark shadow-xl shadow-brand/10';
            default: return 'border-l-4 border-l-slate-500 border-slate-200 bg-white/95 text-slate-800 shadow-xl shadow-slate-500/10';
        }
    };

    // Grouping layout menus for ultra-sleek spacing
    const menuGroups = useMemo(() => {
        if (isBranchRole) {
            const dashboardItem = branchMenuItems.find(m => m.href === '/dashboard');
            const operationsItems = branchMenuItems.filter(m => ['/member-admissions', '/member/loan-applications', '/verifications', '/member/savings-applications'].includes(m.href));
            const approvalsItems = branchMenuItems.filter(m => ['/team-based-approvals', '/approvals'].includes(m.href));
            const clusterItem = branchMenuItems.find(m => m.href === '/cluster-handover');

            const groups = [];
            if (dashboardItem) groups.push({ title: 'Overview', items: [dashboardItem] });
            if (operationsItems.length > 0) groups.push({ title: 'Operations', items: operationsItems });
            if (approvalsItems.length > 0) groups.push({ title: 'Approvals', items: approvalsItems });
            if (clusterItem) groups.push({ title: 'Handover', items: [clusterItem] });
            return groups;
        }

        // CSO: Monitoring & verification operations on assigned daily areas
        if (isCsoRole) {
            const dashboardItem = headOfficeMainItems.find(m => m.href === '/dashboard');
            const operationsItems = headOfficeMainItems.filter(m =>
                ['/head-office/admission-members', '/head-office/loan-applications', '/verifications', '/head-office/savings-applications'].includes(m.href)
            );

            const groups = [];
            if (dashboardItem) groups.push({ title: 'Overview', items: [dashboardItem] });
            if (operationsItems.length > 0) groups.push({ title: 'Monitoring & Verification', items: operationsItems });
            return groups;
        }

        // ED: keep approver queues + full Head Office navigation
        if (isEdRole) {
            const dashboardItem = headOfficeMainItems.find(m => m.href === '/dashboard');
            const operationsItems = headOfficeMainItems.filter(m =>
                ['/head-office/admission-members', '/head-office/loan-applications', '/verifications', '/head-office/savings-applications'].includes(m.href)
            );
            const approvalsItems = [
                ...approverMenuItems.filter(m => m.href !== '/dashboard'),
                ...headOfficeMainItems.filter(m => m.href === '/head-office/team-based-approvals'),
            ];

            const groups = [];
            if (dashboardItem) groups.push({ title: 'Overview', items: [dashboardItem] });
            if (operationsItems.length > 0) groups.push({ title: 'Operations', items: operationsItems });
            if (approvalsItems.length > 0) groups.push({ title: 'Approvals', items: approvalsItems });
            return groups;
        }

        if (isTeamApproverRole) {
            const dashboardItem = approverMenuItems.find(m => m.href === '/dashboard');
            const approvalsItems = approverMenuItems.filter(m => m.href !== '/dashboard');

            const groups = [];
            if (dashboardItem) groups.push({ title: 'Overview', items: [dashboardItem] });
            if (approverOperationsItems.length > 0) groups.push({ title: 'Operations', items: approverOperationsItems });
            if (approvalsItems.length > 0) groups.push({ title: 'Approvals', items: approvalsItems });
            return groups;
        }

        // Head office / default roles
        const dashboardItem = headOfficeMainItems.find(m => m.href === '/dashboard');
        const operationsItems = headOfficeMainItems.filter(m => ['/head-office/admission-members', '/head-office/loan-applications', '/verifications', '/head-office/savings-applications'].includes(m.href));
        const approvalsItems = headOfficeMainItems.filter(m => ['/head-office/team-based-approvals'].includes(m.href));

        const groups = [];
        if (dashboardItem) groups.push({ title: 'Overview', items: [dashboardItem] });
        if (operationsItems.length > 0) groups.push({ title: 'Operations', items: operationsItems });
        if (approvalsItems.length > 0) groups.push({ title: 'Approvals', items: approvalsItems });
        return groups;
    }, [isBranchRole, isCsoRole, isEdRole, isTeamApproverRole, branchMenuItems, approverMenuItems, approverOperationsItems, headOfficeMainItems]);

    // Compute items for mobile bottom nav (Pending Approvals prioritized for roles that approve)
    const mobileBottomNavItems = useMemo(() => {
        const pendingApprovalItem = {
            name: 'Approvals',
            href: '/approvals',
            icon: ClipboardCheck,
            badge: badgeCounts.pendingApprovals || 0,
        };

        if (isFieldOfficer) {
            return branchMenuItems;
        }

        if (isBranchRole) {
            return [
                branchMenuItems.find(m => m.href === '/dashboard') || branchMenuItems[0],
                branchMenuItems.find(m => m.href === '/member-admissions') || branchMenuItems[1],
                branchMenuItems.find(m => m.href === '/member/loan-applications') || branchMenuItems[2],
                pendingApprovalItem,
            ].filter(Boolean);
        }

        if (isTeamApproverRole || isEdRole) {
            const teamItem = approverMenuItems.find(m => m.href === '/team-based-approvals/for-approver');
            return [
                approverMenuItems.find(m => m.href === '/dashboard') || approverMenuItems[0],
                pendingApprovalItem,
                ...(teamItem ? [teamItem] : []),
                approverOperationsItems[0],
            ].slice(0, 4).filter(Boolean);
        }

        // Head office / super admin / default — no Pending Approvals (they do not approve)
        const hoTeamItem = headOfficeMainItems.find(m => m.href === '/head-office/team-based-approvals');
        return [
            headOfficeMainItems.find(m => m.href === '/dashboard') || headOfficeMainItems[0],
            headOfficeMainItems.find(m => m.href === '/head-office/admission-members') || headOfficeMainItems[1],
            headOfficeMainItems.find(m => m.href === '/head-office/loan-applications') || headOfficeMainItems[2],
            ...(hoTeamItem ? [hoTeamItem] : []),
        ].slice(0, 4).filter(Boolean);
    }, [isFieldOfficer, isBranchRole, isTeamApproverRole, isEdRole, branchMenuItems, approverMenuItems, approverOperationsItems, headOfficeMainItems, badgeCounts.pendingApprovals]);

    const showReportSection = headOfficeReportItems.length > 0;
    const currentTitle = getPageTitle(path);

    return (
        <div className="min-h-screen bg-[#f8fafc] print:bg-white text-slate-800 antialiased font-sans flex flex-col selection:bg-brand selection:text-white">
            {/* Flash Messages (Toasts) */}
            {flashMessage && (
                <div
                    className={`print:hidden fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl border border-slate-200/80 backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${getFlashColor(flashMessage.type)}`}
                >
                    <div className={`p-2 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                        flashMessage.type === 'success' ? 'bg-emerald-100 text-emerald-700' :
                        flashMessage.type === 'error' ? 'bg-rose-100 text-rose-700' :
                        flashMessage.type === 'warning' ? 'bg-amber-100 text-amber-700' :
                        'bg-brand-soft text-brand-dark'
                    }`}>
                        {getFlashIcon(flashMessage.type)}
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                        <p className="text-[12px] font-extrabold text-slate-800 leading-tight">
                            {flashMessage.type === 'success' ? 'সফল' :
                             flashMessage.type === 'error' ? 'সমস্যা' :
                             flashMessage.type === 'warning' ? 'সতর্কতা' :
                             'নোটিফিকেশন'}
                        </p>
                        <p className="text-[11px] text-slate-600 mt-0.5 font-medium leading-normal">{flashMessage.message}</p>
                    </div>
                    <button
                        onClick={() => setFlashMessage(null)}
                        className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100 shrink-0"
                        aria-label="Close notification"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Premium Light Theme Sidebar */}
            <aside
                className={`fixed left-0 top-0 h-full bg-white text-slate-700 border-r border-slate-200/80 z-45 print:hidden transition-all duration-300 ease-in-out flex flex-col shadow-xs
                    ${sidebarOpen ? 'w-60' : 'w-16'}
                    ${isMobile 
                        ? `${sidebarOpen ? 'translate-x-0 shadow-2xl z-50' : '-translate-x-full'} w-64` 
                        : 'translate-x-0'
                    }`}
            >
                {/* Logo and Brand Header */}
                {sidebarOpen ? (
                    <div className="bg-white rounded-2xl p-2.5 m-2.5 flex items-center justify-between shadow-sm shadow-brand/10 border border-brand/20 relative overflow-hidden">
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-2 min-w-0 z-10 rounded-lg outline-none focus:outline-none group"
                            aria-label="Go to dashboard"
                        >
                            <img
                                src="/icons/logo.png"
                                alt="MisLoan"
                                className="h-11 w-auto max-w-[148px] object-contain group-hover:scale-[1.02] transition-transform duration-200"
                            />
                        </Link>
                        <button
                            type="button"
                            onClick={() => setSidebarOpen(false)}
                            className="p-1 rounded-lg hover:bg-brand-softer text-brand-muted hover:text-brand-dark transition-colors z-10 shrink-0"
                            aria-label="Collapse sidebar"
                        >
                            <Menu className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <div className="flex justify-center py-3.5">
                        <button
                            type="button"
                            onClick={() => setSidebarOpen(true)}
                            className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm shadow-brand/15 hover:scale-105 transition-all duration-200 border border-brand/20 overflow-hidden p-0.5"
                            aria-label="Expand sidebar"
                        >
                            <img src="/icons/logo.png" alt="MisLoan" className="h-full w-full object-contain" />
                        </button>
                    </div>
                )}

                {/* Navigation Menu */}
                <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2.5 space-y-3.5">
                    {/* Render Grouped Menu Items */}
                    {menuGroups.map((group) => (
                        <div key={group.title} className="space-y-1">
                            {sidebarOpen && (
                                <span className="px-2.5 text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block select-none mb-1">
                                    {group.title}
                                </span>
                            )}
                            <ul className="space-y-0.5">
                                {group.items.map((item) => {
                                    const isActive = isNavItemActive(path, item.href);
                                    const badge = item.badge;
                                    return (
                                        <li key={item.name}>
                                            <Link
                                                href={item.href}
                                                onClick={() => isMobile && setSidebarOpen(false)}
                                                className={`group relative flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-[12.5px] font-medium transition-all duration-200 ${
                                                    isActive
                                                        ? 'bg-gradient-to-r from-brand to-brand-dark text-white shadow-sm shadow-brand/20 font-bold'
                                                        : 'text-slate-600 hover:text-brand hover:bg-brand-softer hover:translate-x-0.5'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <item.icon className={`w-4 h-4 shrink-0 stroke-[1.75] transition-transform duration-200 ${
                                                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-brand group-hover:scale-105'
                                                    }`} />
                                                    {sidebarOpen && <span className="truncate">{item.name}</span>}
                                                </div>
                                                {sidebarOpen && badge !== undefined && badge > 0 && (
                                                    <span className={`shrink-0 text-[9.5px] font-bold px-1.5 py-0.5 rounded-full ${
                                                        isActive ? 'bg-white/25 text-white backdrop-blur-xs' : 'bg-rose-50 text-rose-600 border border-rose-200'
                                                    }`}>
                                                        {badge}
                                                    </span>
                                                )}
                                                {!sidebarOpen && badge !== undefined && badge > 0 && (
                                                    <span className="absolute top-1 right-2 flex h-2 w-2">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                                    </span>
                                                )}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}

                    {/* Reports Expandable Section */}
                    {showReportSection && (
                        <div className="space-y-1">
                            {sidebarOpen && (
                                <span className="px-2.5 text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block select-none mb-1">
                                    Reports
                                </span>
                            )}
                            <div className="space-y-0.5">
                                <button
                                    type="button"
                                    onClick={() => setReportExpanded(!reportExpanded)}
                                    className={`group flex w-full items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-[12.5px] font-medium transition-all duration-200 ${
                                        REPORT_PATHS.some(p => path.startsWith(p))
                                            ? 'bg-brand-softer text-brand-dark font-bold border border-brand/25'
                                            : 'text-slate-600 hover:text-brand hover:bg-brand-softer'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <BarChart3 className="w-4 h-4 shrink-0 stroke-[1.75] text-slate-400 group-hover:text-brand" />
                                        {sidebarOpen && <span className="truncate">Reports</span>}
                                    </div>
                                    {sidebarOpen && (
                                        <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${reportExpanded ? 'rotate-180 text-brand' : ''}`} />
                                    )}
                                </button>
                                {reportExpanded && sidebarOpen && (
                                    <ul className="mt-1 ml-3.5 pl-2.5 border-l-2 border-brand-soft space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150 relative">
                                        {headOfficeReportItems.map((item) => {
                                            const isActive = path === item.href;
                                            return (
                                                <li key={item.name}>
                                                    <Link
                                                        href={item.href}
                                                        onClick={() => isMobile && setSidebarOpen(false)}
                                                        className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11.5px] font-medium transition-all ${
                                                            isActive
                                                                ? 'bg-brand-soft text-brand-dark font-bold'
                                                                : 'text-slate-500 hover:text-brand hover:bg-brand-softer'
                                                        }`}
                                                    >
                                                        <item.icon className="w-3.5 h-3.5 shrink-0 stroke-[1.75] text-slate-400 group-hover:text-brand" />
                                                        <span className="truncate">{item.name}</span>
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Setup/Configuration Expandable Section */}
                    {showConfigurationSection && (
                        <div className="space-y-1">
                            {sidebarOpen && (
                                <span className="px-2.5 text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block select-none mb-1">
                                    Settings
                                </span>
                            )}
                            <div className="space-y-0.5">
                                <button
                                    type="button"
                                    onClick={() => setSetupExpanded(!setupExpanded)}
                                    className={`group flex w-full items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-[12.5px] font-medium transition-all duration-200 ${
                                        SETUP_PATHS.some(p => path.startsWith(p))
                                            ? 'bg-brand-softer text-brand-dark font-bold border border-brand/25'
                                            : 'text-slate-600 hover:text-brand hover:bg-brand-softer'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <Settings className="w-4 h-4 shrink-0 stroke-[1.75] text-slate-400 group-hover:text-brand" />
                                        {sidebarOpen && <span className="truncate">Configuration</span>}
                                    </div>
                                    {sidebarOpen && (
                                        <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${setupExpanded ? 'rotate-180 text-brand' : ''}`} />
                                    )}
                                </button>
                                {setupExpanded && sidebarOpen && (
                                    <ul className="mt-1 ml-3.5 pl-2.5 border-l-2 border-brand-soft space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150 relative font-medium">
                                        {headOfficeSetupItems.map((item) => {
                                            const isActive = path === item.href;
                                            return (
                                                <li key={item.name}>
                                                    <Link
                                                        href={item.href}
                                                        onClick={() => isMobile && setSidebarOpen(false)}
                                                        className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11.5px] font-medium transition-all ${
                                                            isActive
                                                                ? 'bg-brand-soft text-brand-dark font-bold'
                                                                : 'text-slate-500 hover:text-brand hover:bg-brand-softer'
                                                        }`}
                                                    >
                                                        <item.icon className="w-3.5 h-3.5 shrink-0 stroke-[1.75] text-slate-400 group-hover:text-brand" />
                                                        <span className="truncate">{item.name}</span>
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}
                </nav>

                {/* Super Admin Maintenance Controls */}
                {isSuperAdmin && (
                    <div className="border-t border-slate-100 px-2.5 py-2">
                        <button
                            type="button"
                            onClick={handleMaintenanceToggle}
                            title={siteMaintenance ? 'মেইনটেন্যান্স বন্ধ করুন' : 'মেইনটেন্যান্স চালু করুন'}
                            className={`flex w-full items-center justify-between rounded-xl p-2 text-left transition-all duration-200 ${
                                siteMaintenance
                                    ? 'bg-amber-50 border border-amber-200 text-amber-900'
                                    : 'bg-slate-50 border border-slate-200/60 text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <Wrench className={`w-3.5 h-3.5 shrink-0 ${siteMaintenance ? 'text-amber-600' : 'text-slate-400'}`} />
                                {sidebarOpen && (
                                    <span className="text-[11px] font-semibold truncate">
                                        {siteMaintenance ? 'Maintenance On' : 'Maintenance'}
                                    </span>
                                )}
                            </div>
                            {sidebarOpen && (
                                <span
                                    className={`flex h-3.5 w-6 shrink-0 items-center rounded-full transition-colors duration-200 p-0.5 ${
                                        siteMaintenance ? 'bg-amber-500' : 'bg-slate-300'
                                    }`}
                                    aria-hidden
                                >
                                    <span
                                        className={`block h-2.5 w-2.5 rounded-full bg-white shadow-xs transition-transform duration-200 ${
                                            siteMaintenance ? 'translate-x-2.5' : 'translate-x-0'
                                        }`}
                                    />
                                </span>
                            )}
                        </button>
                    </div>
                )}

                {/* Sidebar User Footer */}
                <div className="border-t border-slate-100 p-2.5 bg-slate-50/60">
                    {sidebarOpen ? (
                        <div className="flex items-center justify-between gap-2 bg-white border border-slate-200/80 rounded-xl p-2 shadow-xs">
                            <Link href="/profile" className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-90 transition-opacity" title="View Profile">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand to-brand-dark text-white flex items-center justify-center text-[11px] font-bold shrink-0 shadow-xs overflow-hidden">
                                    {userAvatarSrc ? (
                                        <img src={userAvatarSrc} alt={auth.user?.name} className="w-full h-full object-cover" />
                                    ) : (
                                        auth.user?.name?.charAt(0)?.toUpperCase() || 'U'
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[11.5px] font-bold text-slate-800 truncate leading-tight">{auth.user?.name || 'User'}</p>
                                    <p className="text-[9.5px] text-brand font-semibold capitalize truncate mt-0.5">{auth.user?.role?.name?.replace('_', ' ') || 'Admin'}</p>
                                </div>
                            </Link>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                                title="Sign Out"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex justify-center">
                            <Link href="/profile" title="View Profile" className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand to-brand-dark text-white flex items-center justify-center text-xs font-bold shadow-xs hover:scale-105 transition-transform overflow-hidden">
                                {userAvatarSrc ? (
                                    <img src={userAvatarSrc} alt={auth.user?.name} className="w-full h-full object-cover" />
                                ) : (
                                    auth.user?.name?.charAt(0)?.toUpperCase() || 'U'
                                )}
                            </Link>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content Area */}
            <div
                className={`transition-all duration-300 ease-in-out min-h-screen flex flex-col bg-[#f8fafc] print:ml-0 ${
                    isMobile ? 'ml-0' : sidebarOpen ? 'md:ml-60' : 'md:ml-16'
                }`}
            >
                {/* Modern Crisp Light Topbar */}
                <header className="print:hidden sticky top-0 z-35 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between h-13 px-3.5 md:px-5">
                        {/* Header Left: Mobile Drawer Trigger + App Logo or Breadcrumb */}
                        <div className="flex items-center gap-2.5">
                            {/* Mobile Hamburger Button */}
                            <button
                                type="button"
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="md:hidden p-1.5 -ml-1 text-slate-700 hover:text-brand hover:bg-slate-100 rounded-lg transition-colors"
                                aria-label="Toggle Menu"
                            >
                                <Menu className="w-5 h-5 stroke-[1.75]" />
                            </button>

                            {/* Mobile Brand Badge */}
                            <div className="md:hidden flex items-center gap-2">
                                <img src="/icons/logo.png" alt="MisLoan" className="h-8 w-auto max-w-[120px] object-contain" />
                            </div>

                            {/* Desktop Page Title & Breadcrumb */}
                            <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-400">
                                <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                                <span className="text-slate-900 font-extrabold text-[13.5px] tracking-tight">{currentTitle}</span>
                                {path !== '/dashboard' && (
                                    <>
                                        <span className="text-slate-300">/</span>
                                        <span className="text-[11.5px] text-slate-500 font-medium">MisLoan</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Header Right Actions */}
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            {/* Mousumi Apps portal link (Icon on mobile, full label on tablet/desktop) */}
                            <a
                                href="https://app.mousumibd.org"
                                target="_self"
                                className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-brand font-bold text-[11px] shadow-xs hover:shadow-md transition-all duration-200"
                                title="Mousumi Apps Portal"
                                aria-label="Mousumi Apps Portal"
                            >
                                <LayoutGrid className="w-3.5 h-3.5 text-brand-bright shrink-0" />
                                <span className="hidden sm:inline">Mousumi Apps</span>
                            </a>

                            {/* PWA Install Button (Desktop) */}
                            {canInstall && (
                                <button
                                    type="button"
                                    onClick={() => setShowInstallDialog(true)}
                                    className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
                                >
                                    <Download className="w-3 h-3 stroke-[1.75] text-slate-500" />
                                    <span>Install App</span>
                                </button>
                            )}

                            {/* Pending Approvals Quick Shortcut */}
                            {showPendingApprovalsNav && (
                                <Link
                                    href="/approvals"
                                    className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all text-xs font-bold ${
                                        path === '/approvals'
                                            ? 'bg-gradient-to-r from-brand to-brand-dark text-white shadow-sm shadow-brand/20'
                                            : 'bg-brand-softer text-brand-dark hover:bg-brand hover:text-white border border-brand/30'
                                    }`}
                                    title="Pending Approvals"
                                >
                                    <ClipboardCheck className="w-3.5 h-3.5 stroke-[1.75]" />
                                    <span className="hidden md:inline text-[11.5px]">Approvals</span>
                                    {badgeCounts.pendingApprovals != null && badgeCounts.pendingApprovals > 0 && (
                                        <span className="flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-1 text-[8.5px] font-black text-white shadow-xs animate-pulse">
                                            {badgeCounts.pendingApprovals}
                                        </span>
                                    )}
                                </Link>
                            )}

                            {/* Notification Bell */}
                            <NotificationBell />

                            {/* Unified User Profile Dropdown */}
                            <div className="relative" ref={userDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                                    className="flex items-center gap-1.5 p-1 rounded-full hover:ring-2 hover:ring-brand/30 transition-all focus:outline-none"
                                    aria-label="User menu"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand to-brand-dark text-white flex items-center justify-center text-[11px] font-extrabold shadow-sm ring-2 ring-white overflow-hidden">
                                        {userAvatarSrc ? (
                                            <img src={userAvatarSrc} alt={auth.user?.name} className="w-full h-full object-cover" />
                                        ) : (
                                            auth.user?.name?.charAt(0)?.toUpperCase() || 'U'
                                        )}
                                    </div>
                                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 hidden sm:block ${userDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown Menu Content */}
                                {userDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                                        {/* User Header Profile */}
                                        <div className="p-3.5 bg-gradient-to-br from-brand-softer via-brand-soft to-white border-b border-slate-100 relative overflow-hidden">
                                            <div className="flex items-center gap-2.5 relative z-10">
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand to-brand-dark text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs overflow-hidden">
                                                    {userAvatarSrc ? (
                                                        <img src={userAvatarSrc} alt={auth.user?.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        auth.user?.name?.charAt(0)?.toUpperCase() || 'U'
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[12px] font-bold text-slate-800 truncate leading-tight">
                                                        {auth.user?.name || 'User'}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 truncate mt-0.5 font-mono">
                                                        {auth.user?.email}
                                                    </p>
                                                    <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-brand-soft text-brand-dark text-[9px] font-bold capitalize border border-brand/25">
                                                        {auth.user?.role?.name?.replace('_', ' ') || 'Admin'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Menu Links */}
                                        <div className="p-1.5 space-y-0.5">
                                            <Link
                                                href="/profile"
                                                onClick={() => setUserDropdownOpen(false)}
                                                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-semibold text-slate-700 hover:bg-brand-softer hover:text-brand transition-colors"
                                            >
                                                <User className="w-3.5 h-3.5 text-brand" />
                                                <span>Profile & Settings</span>
                                            </Link>

                                            {/* Mobile specific shortcuts inside user menu */}
                                            <a
                                                href="https://app.mousumibd.org"
                                                target="_self"
                                                onClick={() => setUserDropdownOpen(false)}
                                                className="sm:hidden flex items-center justify-between px-3 py-2 rounded-xl text-[12px] font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <LayoutGrid className="w-3.5 h-3.5 text-emerald-500" />
                                                    <span>Mousumi Apps</span>
                                                </div>
                                                <ExternalLink className="w-3 h-3 text-slate-400" />
                                            </a>

                                            {canInstall && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setUserDropdownOpen(false);
                                                        setShowInstallDialog(true);
                                                    }}
                                                    className="sm:hidden flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors text-left"
                                                >
                                                    <Download className="w-3.5 h-3.5 text-brand" />
                                                    <span>Install Web App</span>
                                                </button>
                                            )}
                                        </div>

                                        {/* Logout Option */}
                                        <div className="p-1.5 border-t border-slate-100 bg-slate-50/50">
                                            <button
                                                type="button"
                                                onClick={handleLogout}
                                                className="flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors text-left"
                                            >
                                                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                                                <span>Sign Out / Logout</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content Layout Container */}
                <main className="flex-1 p-3.5 md:p-5 lg:p-6 pb-20 md:pb-6 print:p-0 print:block relative">
                    <div className="max-w-[1600px] mx-auto w-full print:max-w-none print:mx-0 print:block">
                        {/* EMAIL ISSUE WARNING BANNER */}
                        {hasMailIssue && !isOnProfilePage && (
                            <div className="print:hidden mb-4 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 shadow-xs">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className="shrink-0 rounded-xl bg-amber-500/20 p-2 text-amber-800 mt-0.5">
                                            <Mail className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[12.5px] font-bold text-amber-950 leading-tight">
                                                ইমেইল সমস্যা — প্রোফাইল আপডেট করুন
                                            </p>
                                            <p className="text-[11px] text-amber-900/90 mt-0.5 leading-normal">
                                                আপনার অ্যাকাউন্টে বর্তমানে{' '}
                                                <span className="font-mono font-semibold break-all text-amber-950">
                                                    {auth.user?.email || 'কোনো ইমেইল নেই'}
                                                </span>{' '}
                                                আছে। প্রোফাইল থেকে আপনার আসল <strong>@gmail.com</strong> ইমেইল দিন।
                                            </p>
                                        </div>
                                    </div>
                                    <Link
                                        href="/profile"
                                        className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 text-[11px] font-bold shadow-sm transition-colors"
                                    >
                                        <User className="w-3.5 h-3.5" />
                                        প্রোফাইল আপডেট
                                    </Link>
                                </div>
                            </div>
                        )}
                        {isCsoRole && (
                            <div className="mx-4 mt-3 sm:mx-6 sm:mt-4 p-3 sm:p-3.5 bg-gradient-to-r from-brand via-brand-muted to-brand-dark text-white rounded-2xl shadow-md shadow-brand/10 flex flex-wrap items-center justify-between gap-3 border border-brand-bright/30">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-xs shrink-0 shadow-inner">
                                        <Shield className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <div>
                                        <p className="text-[10.5px] font-bold tracking-wider uppercase text-white/80">Today's Assigned Monitoring Areas</p>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                            {auth.user.cso_areas && auth.user.cso_areas.length > 0 ? (
                                                auth.user.cso_areas.map((area) => (
                                                    <span key={area.id} className="px-2.5 py-0.5 bg-white/20 text-white rounded-lg text-xs font-bold backdrop-blur-xs border border-white/25 shadow-xs">
                                                        {area.name}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-xs text-white/80 italic">No areas assigned for today</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-semibold px-2.5 py-1 bg-white/10 rounded-full border border-white/20 text-white/85 backdrop-blur-xs">
                                        Customer Service Officer (CSO)
                                    </span>
                                </div>
                            </div>
                        )}
                        {children}
                    </div>
                </main>
            </div>

            {/* Mobile Drawer Overlay */}
            {isMobile && sidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300 animate-in fade-in"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden
                />
            )}

            {/* PWA Install Corner Widget */}
            {canInstall && showInstallDialog && (
                <div className="fixed bottom-4 right-4 z-50 max-w-sm w-[calc(100%-2rem)] sm:w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className="bg-gradient-to-r from-brand via-brand-muted to-brand-dark text-white p-3 relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 w-14 h-14 bg-white/10 rounded-full blur-md" />
                        <div className="flex items-center justify-between gap-3 relative z-10">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-inner shrink-0 overflow-hidden p-0.5">
                                    <img src="/icons/logo.png" alt="MisLoan" className="h-full w-full object-contain" />
                                </div>
                                <div className="leading-tight">
                                    <h3 className="text-xs font-bold tracking-tight text-white">MisLoan Web App</h3>
                                    <p className="text-[9.5px] text-white/85 font-medium">Install on your device</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleDismissInstall}
                                className="p-1 rounded-lg hover:bg-white/15 text-white/85 hover:text-white transition-colors"
                                aria-label="Close"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    <div className="p-3 bg-slate-50/50">
                        <p className="text-[11px] text-slate-600 leading-normal mb-2.5">
                            Install MisLoan to your home screen or desktop for a fast, app-like experience.
                        </p>

                        <div className="flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={handleDismissInstall}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-500 hover:bg-slate-200/60 transition-colors"
                            >
                                Later
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    await promptInstall();
                                    handleDismissInstall();
                                }}
                                disabled={isInstalled || isStandalone}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-brand to-brand-dark text-white text-[11px] font-bold hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs"
                            >
                                <Download className="w-3 h-3 stroke-[2]" />
                                Install Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Floating Pending Approvals pill (hidden for Head Office / Super Admin) */}
            {showPendingApprovalsNav && isMobile && path !== '/approvals' && (badgeCounts.pendingApprovals || 0) > 0 && (
                <div className="fixed bottom-18 right-3.5 z-40 md:hidden animate-in fade-in slide-in-from-bottom-3 duration-300">
                    <Link
                        href="/approvals"
                        className="group flex items-center gap-2 px-3.5 py-2 rounded-full bg-gradient-to-r from-brand to-brand-dark text-white shadow-xl shadow-brand/30 border border-white/20 active:scale-95 transition-all"
                        aria-label="Pending Approvals"
                    >
                        <div className="relative flex items-center justify-center">
                            <ClipboardCheck className="w-4 h-4 stroke-[2.2] text-white" />
                            <span className="absolute -top-2 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[8.5px] font-black text-white ring-2 ring-white shadow-sm animate-pulse">
                                {badgeCounts.pendingApprovals}
                            </span>
                        </div>
                        <span className="text-[11.5px] font-extrabold tracking-tight pr-0.5">
                            Approvals
                        </span>
                    </Link>
                </div>
            )}

            {/* Mobile Bottom Navigation Bar - Clean Light Theme */}
            {isMobile && (
                <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] pb-safe">
                    <div className="flex items-center justify-around h-13.5 px-1">
                        {mobileBottomNavItems.map((item) => {
                            const isActive = isNavItemActive(path, item.href);
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex flex-col items-center justify-center w-full h-full space-y-0.5 relative py-1 transition-all ${
                                        isActive ? 'text-brand font-bold' : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    <div className="relative">
                                        <Icon className={`w-4.5 h-4.5 ${isActive ? 'stroke-[2.2] text-brand' : 'stroke-[1.6]'}`} />
                                        {item.badge != null && item.badge > 0 && (
                                            <span className="absolute -top-1 -right-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-bold text-white shadow-xs">
                                                {item.badge}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[9.5px] text-center leading-tight max-w-[62px] truncate">{item.name}</span>
                                    {isActive && (
                                        <span className="absolute top-0 w-6 h-0.5 bg-brand rounded-full" />
                                    )}
                                </Link>
                            );
                        })}
                        <button
                            type="button"
                            onClick={() => setSidebarOpen(true)}
                            className="flex flex-col items-center justify-center w-full h-full space-y-0.5 text-slate-500 hover:text-slate-800 py-1 transition-colors"
                        >
                            <Menu className="w-4.5 h-4.5 stroke-[1.6]" />
                            <span className="text-[9.5px] font-medium leading-tight">Menu</span>
                        </button>
                    </div>
                </nav>
            )}
        </div>
    );
}
