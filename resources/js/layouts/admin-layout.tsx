import { useState, useEffect, ReactNode, useMemo } from 'react';
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
    LogOut,
    User,
    Bell,
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
    // Newly imported icons:
    PiggyBank,
    PieChart,
    CircleUser,
    Coins,
    FileCheck,
    Mail,
    SearchCheck,
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
    };
}

interface AdminLayoutProps {
    children: ReactNode;
}

const SETUP_PATHS = ['/loan-categories', '/loan-products', '/savings-products', '/organizations', '/samities', '/member-categories', '/users', '/roles'];
const REPORT_PATHS = ['/head-office/team-based-approvals/report'];
const TEAM_BASED_REPORT_HREF = '/head-office/team-based-approvals/report';

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
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const [flashMessage, setFlashMessage] = useState<{ type: string; message: string } | null>(null);
    const setupOpenDefault = useMemo(() => SETUP_PATHS.some(p => path.startsWith(p)), [path]);
    const reportOpenDefault = useMemo(() => REPORT_PATHS.some(p => path.startsWith(p)), [path]);
    const [setupExpanded, setSetupExpanded] = useState(setupOpenDefault);
    const [reportExpanded, setReportExpanded] = useState(reportOpenDefault);

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
    const isEdRole = roleName === 'ed';
    // Head Office / Super Admin do not approve via /approvals — hide Pending Approvals UI
    const showPendingApprovalsNav = !isHeadOfficeRole && !isSuperAdmin;
    const canViewTeamBasedReport = auth.user.has_all_access || isSuperAdmin || isHeadOfficeRole || isEdRole;
    const showConfigurationSection = (!isBranchRole && !isTeamApproverRole) || isEdRole;
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
        { name: 'Savings Applications', href: '/member/savings-applications', icon: PiggyBank }, // Changed Landmark -> PiggyBank
        { name: 'Team Based Approval', href: '/team-based-approvals', icon: FileCheck }, // Changed FileText -> FileCheck
        { name: 'Pending Approvals', href: '/approvals', icon: ClipboardCheck, badge: badgeCounts.pendingApprovals || 0 },
    ];

    // Field officer: admissions plus loan applications for their approved members + verifications
    const branchMenuItems = isFieldOfficer
        ? branchMenuItemsFull.filter((m) => m.name === 'Dashboard' || m.name === 'Member Admissions' || m.name === 'Loan Applications' || m.name === 'Verification')
        : roleName === 'branch_user'
        ? branchMenuItemsFull.slice(0, 6)
        : branchMenuItemsFull;

    const approverMenuItems = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        {
            name: 'Team Based Approval',
            href: '/team-based-approvals/for-approver',
            icon: FileCheck, // Changed FileText -> FileCheck
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
        { name: 'Loan Applications', href: '/head-office/loan-applications', icon: Banknote, badge: badgeCounts.pendingLoanApplications || 0 }, // Changed FileText -> Banknote
        { name: 'Verification', href: '/verifications', icon: SearchCheck, badge: badgeCounts.pendingVerifications || 0 },
        { name: 'Team Based Approvals', href: '/head-office/team-based-approvals', icon: FileCheck }, // Changed FileText -> FileCheck
        { name: 'Savings Applications', href: '/head-office/savings-applications', icon: PiggyBank }, // Changed Landmark -> PiggyBank
    ];

    const headOfficeReportItems = [
        { name: 'Team Based Report', href: TEAM_BASED_REPORT_HREF, icon: PieChart }, // Changed BarChart3 -> PieChart
    ];

    const headOfficeSetupItems = [
        { name: 'Loan Categories', href: '/loan-categories', icon: ListTree },
        { name: 'Loan Products', href: '/loan-products', icon: Coins }, // Changed Package -> Coins
        { name: 'Savings Products', href: '/savings-products', icon: Wallet },
        { name: 'Organizations', href: '/organizations', icon: Landmark },
        { name: 'Samities', href: '/samities', icon: Building2 },
        { name: 'Member Categories', href: '/member-categories', icon: Users },
        { name: 'Users', href: '/users', icon: CircleUser }, // Changed Users -> CircleUser
        { name: 'Roles', href: '/roles', icon: Shield },
    ];

    const handleLogout = () => {
        router.post('/logout');
    };

    const getFlashIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle className="w-5 h-5 stroke-[1.75]" />;
            case 'error': return <XCircle className="w-5 h-5 stroke-[1.75]" />;
            case 'warning': return <AlertCircle className="w-5 h-5 stroke-[1.75]" />;
            case 'info': return <Info className="w-5 h-5 stroke-[1.75]" />;
            default: return null;
        }
    };

    const getFlashColor = (type: string) => {
        switch (type) {
            case 'success': return 'border-l-4 border-l-emerald-500 border-slate-100 bg-white/95 text-emerald-800 shadow-xl shadow-slate-900/5';
            case 'error': return 'border-l-4 border-l-rose-500 border-slate-100 bg-white/95 text-rose-800 shadow-xl shadow-slate-900/5';
            case 'warning': return 'border-l-4 border-l-amber-500 border-slate-100 bg-white/95 text-amber-800 shadow-xl shadow-slate-900/5';
            case 'info': return 'border-l-4 border-l-blue-500 border-slate-100 bg-white/95 text-blue-800 shadow-xl shadow-slate-900/5';
            default: return 'border-l-4 border-l-slate-500 border-slate-100 bg-white/95 text-slate-800 shadow-xl shadow-slate-900/5';
        }
    };

    // Grouping layout menus for ultra-minimal spacing
    const menuGroups = useMemo(() => {
        if (isBranchRole) {
            const dashboardItem = branchMenuItems.find(m => m.href === '/dashboard');
            const operationsItems = branchMenuItems.filter(m => ['/member-admissions', '/member/loan-applications', '/verifications', '/member/savings-applications'].includes(m.href));
            const approvalsItems = branchMenuItems.filter(m => ['/team-based-approvals', '/approvals'].includes(m.href));

            const groups = [];
            if (dashboardItem) groups.push({ title: 'Overview', items: [dashboardItem] });
            if (operationsItems.length > 0) groups.push({ title: 'Operations', items: operationsItems });
            if (approvalsItems.length > 0) groups.push({ title: 'Approvals', items: approvalsItems });
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
    }, [isBranchRole, isEdRole, isTeamApproverRole, branchMenuItems, approverMenuItems, approverOperationsItems, headOfficeMainItems]);

    // Compute items for mobile bottom nav (Pending Approvals prioritized for roles that approve)
    const mobileBottomNavItems = useMemo(() => {
        const pendingApprovalItem = {
            name: 'Pending Approvals',
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

    const showReportSection = isEdRole || canViewTeamBasedReport;

    return (
        <div className="min-h-screen bg-[#f8fafc] print:bg-white text-slate-800 antialiased font-sans">
            {/* Flash Messages (Toasts) */}
            {flashMessage && (
                <div
                    className={`print:hidden fixed top-5 right-5 z-50 flex items-center gap-3.5 px-4.5 py-4 rounded-xl border border-slate-100 backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${getFlashColor(flashMessage.type)}`}
                >
                    <div className={`p-2 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        flashMessage.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
                        flashMessage.type === 'error' ? 'bg-rose-50 text-rose-600' :
                        flashMessage.type === 'warning' ? 'bg-amber-50 text-amber-600' :
                        'bg-blue-50 text-blue-600'
                    }`}>
                        {getFlashIcon(flashMessage.type)}
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                        <p className="text-[13px] font-bold text-slate-800 leading-none">
                            {flashMessage.type === 'success' ? 'Success' :
                             flashMessage.type === 'error' ? 'Error' :
                             flashMessage.type === 'warning' ? 'Warning' :
                             'Notification'}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">{flashMessage.message}</p>
                    </div>
                    <button
                        onClick={() => setFlashMessage(null)}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100 flex-shrink-0"
                        aria-label="Close notification"
                    >
                        <X className="w-4.5 h-4.5" />
                    </button>
                </div>
            )}

            {/* Sidebar */}
            <aside
                className={`fixed left-0 top-0 h-full bg-white border-r border-slate-100 z-40 print:hidden transition-all duration-300 ease-in-out flex flex-col
                    ${sidebarOpen ? 'w-64' : 'w-16'}
                    ${isMobile 
                        ? `${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'} w-64` 
                        : 'translate-x-0'
                    }`}
            >
                {/* Logo and Control Bar */}
                {sidebarOpen ? (
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl p-3.5 m-3 flex items-center justify-between shadow-md shadow-blue-600/10 relative overflow-hidden">
                        <div className="absolute -right-3 -top-3 w-12 h-12 bg-white/10 rounded-full blur-md" />
                        <Link
                            href="/"
                            className="flex items-center gap-2.5 min-w-0 z-10 rounded-lg outline-none focus:outline-none focus-visible:outline-none"
                            aria-label="Go to home"
                        >
                            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-white flex-shrink-0 shadow-inner">
                                <Building2 className="w-4.5 h-4.5 stroke-[1.75]" />
                            </div>
                            <div className="min-w-0">
                                <span className="text-[13px] font-bold tracking-wide block leading-none">
                                    MIS Loan
                                </span>
                                <span className="text-[9px] text-blue-100 font-medium block mt-1.5 leading-none">
                                    Management Panel
                                </span>
                            </div>
                        </Link>
                        <button
                            type="button"
                            onClick={() => setSidebarOpen(false)}
                            className="p-1 rounded-lg hover:bg-white/15 text-blue-100 hover:text-white transition-colors z-10"
                            aria-label="Collapse sidebar"
                        >
                            <Menu className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <div className="flex justify-center py-4">
                        <button
                            type="button"
                            onClick={() => setSidebarOpen(true)}
                            className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-600/15 hover:scale-105 transition-all duration-200"
                            aria-label="Expand sidebar"
                        >
                            <Building2 className="w-5 h-5 stroke-[1.75]" />
                        </button>
                    </div>
                )}

                {/* Navigation Menu */}
                <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-3 space-y-4">
                    {/* Render Grouped Menu Items */}
                    {menuGroups.map((group) => (
                        <div key={group.title} className="space-y-1">
                            {sidebarOpen && (
                                <span className="px-3 text-[10px] font-bold text-blue-500/80 tracking-wider uppercase block select-none">
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
                                                className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 relative ${
                                                    isActive
                                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/15'
                                                        : 'text-slate-600 hover:bg-blue-50/50 hover:text-blue-600'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <item.icon className={`w-4.5 h-4.5 flex-shrink-0 stroke-[1.75] transition-transform duration-200 ${
                                                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-600 group-hover:scale-105'
                                                    }`} />
                                                    {sidebarOpen && <span className="truncate">{item.name}</span>}
                                                </div>
                                                {sidebarOpen && badge !== undefined && badge > 0 && (
                                                    <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                                        isActive ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-600 border border-rose-100'
                                                    }`}>
                                                        {badge}
                                                    </span>
                                                )}
                                                {!sidebarOpen && badge !== undefined && badge > 0 && (
                                                    <span className="absolute top-1 right-2.5 flex h-2 w-2">
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
                                <span className="px-3 text-[10px] font-bold text-blue-500/80 tracking-wider uppercase block select-none">
                                    Reports
                                </span>
                            )}
                            <div className="space-y-0.5">
                                <button
                                    type="button"
                                    onClick={() => setReportExpanded(!reportExpanded)}
                                    className={`group flex w-full items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                                        REPORT_PATHS.some(p => path.startsWith(p))
                                            ? 'bg-blue-50/70 text-blue-700 border border-blue-100/50'
                                            : 'text-slate-600 hover:bg-blue-50/50 hover:text-blue-600'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <BarChart3 className="w-4.5 h-4.5 flex-shrink-0 stroke-[1.75] text-slate-400 group-hover:text-blue-600" />
                                        {sidebarOpen && <span className="truncate">Reports</span>}
                                    </div>
                                    {sidebarOpen && (
                                        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 text-slate-450 transition-transform duration-200 ${reportExpanded ? 'rotate-180' : ''}`} />
                                    )}
                                </button>
                                {reportExpanded && sidebarOpen && (
                                    <ul className="mt-1 ml-4 pl-3.5 border-l border-blue-50 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150 relative">
                                        {headOfficeReportItems.map((item) => {
                                            const isActive = path === item.href;
                                            return (
                                                <li key={item.name}>
                                                    <Link
                                                        href={item.href}
                                                        onClick={() => isMobile && setSidebarOpen(false)}
                                                        className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                                                            isActive
                                                                ? 'bg-blue-50 text-blue-750 shadow-xs border border-blue-100/30'
                                                                : 'text-slate-500 hover:bg-blue-50/30 hover:text-blue-600'
                                                        }`}
                                                    >
                                                        <item.icon className="w-3.5 h-3.5 flex-shrink-0 stroke-[1.75]" />
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
                                <span className="px-3 text-[10px] font-bold text-blue-500/80 tracking-wider uppercase block select-none">
                                    Settings
                                </span>
                            )}
                            <div className="space-y-0.5">
                                <button
                                    type="button"
                                    onClick={() => setSetupExpanded(!setupExpanded)}
                                    className={`group flex w-full items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                                        SETUP_PATHS.some(p => path.startsWith(p))
                                            ? 'bg-blue-50/70 text-blue-700 border border-blue-100/50'
                                            : 'text-slate-600 hover:bg-blue-50/50 hover:text-blue-650'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <Settings className="w-4.5 h-4.5 flex-shrink-0 stroke-[1.75] text-slate-400 group-hover:text-blue-600" />
                                        {sidebarOpen && <span className="truncate">Configuration</span>}
                                    </div>
                                    {sidebarOpen && (
                                        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 text-slate-450 transition-transform duration-200 ${setupExpanded ? 'rotate-180' : ''}`} />
                                    )}
                                </button>
                                {setupExpanded && sidebarOpen && (
                                    <ul className="mt-1 ml-4 pl-3.5 border-l border-blue-50 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150 relative font-medium">
                                        {headOfficeSetupItems.map((item) => {
                                            const isActive = path === item.href;
                                            return (
                                                <li key={item.name}>
                                                    <Link
                                                        href={item.href}
                                                        onClick={() => isMobile && setSidebarOpen(false)}
                                                        className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                                                            isActive
                                                                ? 'bg-blue-50 text-blue-750 shadow-xs border border-blue-100/30'
                                                                : 'text-slate-500 hover:bg-blue-50/30 hover:text-blue-600'
                                                        }`}
                                                    >
                                                        <item.icon className="w-3.5 h-3.5 flex-shrink-0 stroke-[1.75]" />
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
                    <div className="border-t border-slate-100 px-3 py-3">
                        <button
                            type="button"
                            onClick={handleMaintenanceToggle}
                            title={siteMaintenance ? 'মেইনটেন্যান্স বন্ধ করুন' : 'মেইনটেন্যান্স চালু করুন'}
                            className={`flex w-full items-center justify-between rounded-lg p-2 text-left transition-all duration-200 ${
                                siteMaintenance
                                    ? 'bg-amber-50/70 border border-amber-100 text-amber-900'
                                    : 'bg-slate-50/70 border border-slate-100 text-slate-600 hover:bg-slate-100/50'
                            }`}
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <Wrench className={`w-4 h-4 flex-shrink-0 ${siteMaintenance ? 'text-amber-600' : 'text-slate-400'}`} />
                                {sidebarOpen && (
                                    <span className="text-[11px] font-semibold truncate">
                                        {siteMaintenance ? 'Maintenance Active' : 'Maintenance'}
                                    </span>
                                )}
                            </div>
                            {sidebarOpen && (
                                <span
                                    className={`flex h-4 w-7 flex-shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out p-0.5 ${
                                        siteMaintenance ? 'bg-amber-500' : 'bg-slate-200'
                                    }`}
                                    aria-hidden
                                >
                                    <span
                                        className={`block h-3 w-3 rounded-full bg-white shadow-xs transition-transform duration-200 ease-in-out ${
                                            siteMaintenance ? 'translate-x-3' : 'translate-x-0'
                                        }`}
                                    />
                                </span>
                            )}
                        </button>
                    </div>
                )}

                {/* Sidebar User Footer */}
                <div className="border-t border-slate-100 p-3 bg-gradient-to-b from-transparent to-blue-50/10">
                    {sidebarOpen ? (
                        <div className="flex items-center justify-between gap-2 bg-white border border-slate-100 rounded-xl p-2 shadow-xs">
                            <Link href="/profile" className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-85 transition-opacity" title="View Profile Settings">
                                <div className="w-8.5 h-8.5 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm shadow-blue-500/10 overflow-hidden">
                                    {userAvatarSrc ? (
                                        <img src={userAvatarSrc} alt={auth.user?.name} className="w-full h-full object-cover" />
                                    ) : (
                                        auth.user?.name?.charAt(0)?.toUpperCase() || 'U'
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-bold text-slate-800 truncate">{auth.user?.name || 'User'}</p>
                                    <p className="text-[9px] text-blue-600 font-semibold capitalize truncate mt-0.5">{auth.user?.role?.name?.replace('_', ' ') || 'Admin'}</p>
                                </div>
                            </Link>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                                title="Sign Out / Logout"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex justify-center">
                            <Link href="/profile" title="View Profile Settings" className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-blue-500/10 hover:scale-105 transition-transform duration-205 overflow-hidden">
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
                    isMobile ? 'ml-0' : sidebarOpen ? 'md:ml-64' : 'md:ml-16'
                }`}
            >
                {/* Header */}
                <header className="print:hidden sticky top-0 z-35 bg-white/80 backdrop-blur-md border-b border-slate-100/80">
                    <div className="flex items-center justify-between h-14 px-4 md:px-6">
                        <div className="flex items-center gap-3">
                            <h2 className="text-sm font-bold text-slate-800">
                                {isMobile ? 'MIS Loan' : 'Dashboard'}
                            </h2>
                        </div>

                        <div className="flex items-center gap-2">
                            <a
                                href="https://app.mousumibd.org"
                                target="_self"
                                className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 font-bold text-xs shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                                title="Return to Mousumi Apps"
                            >
                                <div className="flex items-center justify-center w-5 h-5 rounded-lg bg-emerald-500 dark:bg-white/20 text-white p-0.5 shadow-sm group-hover:rotate-12 transition-transform duration-300">
                                    <LayoutGrid className="w-3.5 h-3.5" />
                                </div>
                                <span className="tracking-wide">Mousumi Apps</span>
                            </a>
                            {canInstall && (
                                <button
                                    type="button"
                                    onClick={() => setShowInstallDialog(true)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-xs"
                                >
                                    <Download className="w-3.5 h-3.5 stroke-[1.75] text-slate-500" />
                                    <span className="hidden sm:inline">Install App</span>
                                </button>
                            )}

                            {/* Pending Approvals Quick Header Shortcut (hidden for Head Office / Super Admin) */}
                            {showPendingApprovalsNav && (
                                <Link
                                    href="/approvals"
                                    className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all duration-200 ${
                                        path === '/approvals'
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                                            : 'bg-slate-100/90 text-slate-700 hover:bg-blue-50 hover:text-blue-600'
                                    }`}
                                    title="Pending Approvals"
                                    aria-label="Pending Approvals"
                                >
                                    <ClipboardCheck className="w-4.5 h-4.5 stroke-[1.75]" />
                                    <span className="hidden sm:inline text-xs font-bold">Approvals</span>
                                    {badgeCounts.pendingApprovals != null && badgeCounts.pendingApprovals > 0 && (
                                        <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-extrabold text-white shadow-xs animate-pulse">
                                            {badgeCounts.pendingApprovals}
                                        </span>
                                    )}
                                </Link>
                            )}

                            {/* Notifications Dropdown Bell */}
                            <NotificationBell />

                            {/* Profile & Always Visible Logout */}
                            <div className="flex items-center gap-2">
                                <Link
                                    href="/profile"
                                    title="View Profile Settings"
                                    className="relative p-0.5 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 shadow-xs shadow-blue-500/10 hover:scale-105 transition-transform"
                                >
                                    <div className="w-7.5 h-7.5 rounded-full bg-white flex items-center justify-center text-slate-700 text-xs font-bold overflow-hidden">
                                        {userAvatarSrc ? (
                                            <img src={userAvatarSrc} alt={auth.user?.name} className="w-full h-full object-cover" />
                                        ) : (
                                            auth.user?.name?.charAt(0)?.toUpperCase() || 'U'
                                        )}
                                    </div>
                                </Link>

                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 text-xs font-semibold transition-all shadow-xs"
                                    title="Sign Out / Logout"
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Logout</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content Layout Container */}
                <main className="flex-1 p-4 md:p-6 lg:p-8 pb-20 md:pb-6 lg:pb-8 print:p-0 print:block relative">
                    <div className="max-w-[1600px] mx-auto w-full print:max-w-none print:mx-0 print:block">
                        {/* FLASH MESSAGE ALERT BANNER */}
                        {flashMessage && (
                            <div
                                className={`print:hidden mb-4 p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-lg transition-all animate-in fade-in slide-in-from-top-2 duration-200 ${getFlashColor(
                                    flashMessage.type
                                )}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="shrink-0">{getFlashIcon(flashMessage.type)}</div>
                                    <span className="text-xs sm:text-sm font-bold leading-relaxed">{flashMessage.message}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFlashMessage(null)}
                                    className="p-1.5 rounded-xl hover:bg-black/5 text-current transition-colors shrink-0"
                                    title="Close message"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {hasMailIssue && !isOnProfilePage && (
                            <div className="print:hidden mb-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3.5 shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className="shrink-0 rounded-xl bg-amber-500/15 p-2 text-amber-700">
                                            <Mail className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-amber-900">
                                                ইমেইল সমস্যা — প্রোফাইল আপডেট করুন
                                            </p>
                                            <p className="text-xs text-amber-800/90 mt-0.5 leading-relaxed">
                                                আপনার অ্যাকাউন্টে এখন{' '}
                                                <span className="font-mono font-semibold break-all">
                                                    {auth.user?.email || 'কোনো ইমেইল নেই'}
                                                </span>{' '}
                                                আছে। এটি কোম্পানি/অস্থায়ী ইমেইল হতে পারে। প্রোফাইল থেকে আপনার আসল{' '}
                                                <strong>@gmail.com</strong> ইমেইল দিন।
                                            </p>
                                        </div>
                                    </div>
                                    <Link
                                        href="/profile"
                                        className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 text-xs font-bold shadow-sm transition-colors"
                                    >
                                        <User className="w-3.5 h-3.5" />
                                        প্রোফাইল আপডেট
                                    </Link>
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
                    className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs z-30 md:hidden transition-opacity duration-300 animate-in fade-in"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden
                />
            )}

            {/* PWA Install Corner Widget */}
            {canInstall && showInstallDialog && (
                <div className="fixed bottom-4 right-4 z-50 max-w-sm w-[calc(100%-2rem)] sm:w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3.5 relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 w-14 h-14 bg-white/10 rounded-full blur-md" />
                        <div className="flex items-center justify-between gap-3 relative z-10">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white shadow-inner flex-shrink-0">
                                    <Building2 className="w-4 h-4 stroke-[2]" />
                                </div>
                                <div className="leading-tight">
                                    <h3 className="text-xs font-bold tracking-wide">MIS Loan Web App</h3>
                                    <p className="text-[10px] text-blue-100 font-medium">Install on your device</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleDismissInstall}
                                className="p-1 rounded-lg hover:bg-white/15 text-blue-100 hover:text-white transition-colors"
                                aria-label="Close"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="p-3.5 bg-slate-50/50">
                        <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                            Install MIS Loan to your home screen or desktop for a fast, app-like experience.
                        </p>

                        <div className="flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={handleDismissInstall}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-200/60 transition-colors"
                            >
                                Later
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    console.log('[PWA] Install now clicked, canInstall:', canInstall, 'platform:', platform);
                                    await promptInstall();
                                    handleDismissInstall();
                                }}
                                disabled={isInstalled || isStandalone}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md shadow-blue-500/10"
                            >
                                <Download className="w-3.5 h-3.5 stroke-[2]" />
                                Install Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Floating Pending Approvals pill (hidden for Head Office / Super Admin) */}
            {showPendingApprovalsNav && isMobile && path !== '/approvals' && (badgeCounts.pendingApprovals || 0) > 0 && (
                <div className="fixed bottom-20 right-4 z-40 md:hidden animate-in fade-in slide-in-from-bottom-3 duration-300">
                    <Link
                        href="/approvals"
                        className="group flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-600/35 border border-white/20 active:scale-95 transition-all duration-200"
                        aria-label="Pending Approvals"
                    >
                        <div className="relative flex items-center justify-center">
                            <ClipboardCheck className="w-5 h-5 stroke-[2] text-white" />
                            <span className="absolute -top-2 -right-2 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white ring-2 ring-white shadow-md animate-pulse">
                                {badgeCounts.pendingApprovals}
                            </span>
                        </div>
                        <span className="text-xs font-bold tracking-wide pr-0.5">
                            Pending Approvals
                        </span>
                    </Link>
                </div>
            )}

            {/* Mobile Bottom Navigation */}
            {isMobile && (
                <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] pb-safe">
                    <div className="flex items-center justify-around h-16 px-2">
                        {mobileBottomNavItems.map((item) => {
                            const isActive = isNavItemActive(path, item.href);
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 relative ${isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
                                >
                                    <div className="relative">
                                        <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2]' : 'stroke-[1.5]'}`} />
                                        {item.badge != null && item.badge > 0 && (
                                            <span className="absolute -top-1 -right-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-bold text-white shadow-xs">
                                                {item.badge}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[9px] font-medium text-center leading-tight max-w-[60px] truncate">{item.name}</span>
                                </Link>
                            );
                        })}
                        <button
                            type="button"
                            onClick={() => setSidebarOpen(true)}
                            className="flex flex-col items-center justify-center w-full h-full space-y-1 text-slate-500 hover:text-slate-900"
                        >
                            <Menu className="w-5 h-5 stroke-[1.5]" />
                            <span className="text-[9px] font-medium">Menu</span>
                        </button>
                    </div>
                </nav>
            )}
        </div>
    );
}
