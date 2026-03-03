import { useState, useEffect, ReactNode, useMemo } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import {
    LayoutDashboard,
    Building2,
    Users,
    Shield,
    Menu,
    X,
    ChevronDown,
    ChevronRight,
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
    Package,
    FileText,
    Wallet,
    Settings
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface User {
    id: number;
    name: string;
    email: string;
    role?: { name: string };
    has_all_access: boolean;
    branch_id?: number | null;
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
    unreadSubmissionsCount?: number;
    badgeCounts?: {
        pendingLoanApplications?: number;
        pendingAdmissions?: number;
        pendingApprovals?: number;
        pendingTeamBasedApprovals?: number;
    };
}

interface AdminLayoutProps {
    children: ReactNode;
}

const SETUP_PATHS = ['/loan-categories', '/loan-products', '/savings-products', '/organizations', '/samities', '/member-categories', '/users', '/roles'];

export default function AdminLayout({ children }: AdminLayoutProps) {
    const page = usePage<PageProps>();
    const { auth, flash, badgeCounts = {} } = page.props;
    const path = (() => {
        try {
            return new URL(page.url).pathname;
        } catch {
            return typeof window !== 'undefined' ? window.location.pathname : '';
        }
    })();
    const isMobile = useIsMobile();
    const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const [flashMessage, setFlashMessage] = useState<{ type: string; message: string } | null>(null);
    const setupOpenDefault = useMemo(() => SETUP_PATHS.some(p => path.startsWith(p)), [path]);
    const [setupExpanded, setSetupExpanded] = useState(setupOpenDefault);

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

    const isTeamApproverRole =
        roleName === 'area_manager' ||
        roleName === 'zone_manager' ||
        roleName === 'admf' ||
        roleName === 'dmf' ||
        roleName === 'ed';

    const isFieldOfficer = roleName === 'field_officer';

    const branchMenuItemsFull = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Member Admissions', href: '/member-admissions', icon: UserPlus },
        { name: 'Loan Applications', href: '/member/loan-applications', icon: Banknote },
        { name: 'Savings Applications', href: '/member/savings-applications', icon: Landmark },
        { name: 'Team Based Approval', href: '/team-based-approvals', icon: FileText },
        { name: 'Pending Approvals', href: '/approvals', icon: ClipboardCheck, badge: badgeCounts.pendingApprovals || 0 },
    ];

    const branchMenuItems = isFieldOfficer
        ? branchMenuItemsFull.slice(0, 3)
        : roleName === 'branch_user'
        ? branchMenuItemsFull.slice(0, 5)
        : roleName === 'branch_manager'
        ? branchMenuItemsFull.filter((m) => m.name === 'Pending Approvals')
        : branchMenuItemsFull;

    const approverMenuItems = [
        // Team Based Approval list for approver (area/zone/ADMF/DMF/ED)
        {
            name: 'Team Based Approval',
            href: '/team-based-approvals/for-approver',
            icon: FileText,
            badge: badgeCounts.pendingTeamBasedApprovals || 0,
        },
        {
            name: 'Pending Approvals',
            href: '/approvals',
            icon: ClipboardCheck,
            badge: badgeCounts.pendingApprovals || 0,
        },
    ];

    const headOfficeMainItems = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Admission Members', href: '/head-office/admission-members', icon: UserPlus, badge: badgeCounts.pendingAdmissions || 0 },
        { name: 'Loan Applications', href: '/head-office/loan-applications', icon: FileText, badge: badgeCounts.pendingLoanApplications || 0 },
        { name: 'Team Based Approvals', href: '/head-office/team-based-approvals', icon: FileText },
        { name: 'Savings Applications', href: '/head-office/savings-applications', icon: Landmark },
    ];

    const headOfficeSetupItems = [
        { name: 'Loan Categories', href: '/loan-categories', icon: ListTree },
        { name: 'Loan Products', href: '/loan-products', icon: Package },
        { name: 'Savings Products', href: '/savings-products', icon: Wallet },
        { name: 'Organizations', href: '/organizations', icon: Landmark },
        { name: 'Samities', href: '/samities', icon: Building2 },
        { name: 'Member Categories', href: '/member-categories', icon: Users },
        { name: 'Users', href: '/users', icon: Users },
        { name: 'Roles', href: '/roles', icon: Shield },
    ];

    const handleLogout = () => {
        router.post('/logout');
    };

    const getFlashIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle className="w-5 h-5" />;
            case 'error': return <XCircle className="w-5 h-5" />;
            case 'warning': return <AlertCircle className="w-5 h-5" />;
            case 'info': return <Info className="w-5 h-5" />;
            default: return null;
        }
    };

    const getFlashColor = (type: string) => {
        switch (type) {
            case 'success': return 'bg-green-50 border-green-200 text-green-800';
            case 'error': return 'bg-red-50 border-red-200 text-red-800';
            case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
            case 'info': return 'bg-blue-50 border-blue-200 text-blue-800';
            default: return '';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Flash Message - hidden when printing */}
            {flashMessage && (
                <div
                    className={`print:hidden fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 animate-in slide-in-from-top ${getFlashColor(flashMessage.type)}`}
                >
                    {getFlashIcon(flashMessage.type)}
                    <span className="font-medium">{flashMessage.message}</span>
                    <button
                        onClick={() => setFlashMessage(null)}
                        className="ml-2 hover:opacity-70 transition-opacity"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Sidebar - hidden when printing; drawer on mobile */}
            <aside
                className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200/80 shadow-sm transition-[width,transform] duration-200 ease-out z-40 print:hidden
                    ${sidebarOpen ? 'w-56 md:w-52' : 'w-14'}
                    ${isMobile ? (sidebarOpen ? 'translate-x-0' : '-translate-x-full') : ''}`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo bar */}
                    <div className="flex items-center justify-between h-12 min-h-12 px-2.5 border-b border-gray-100">
                        {sidebarOpen && (
                            <span className="text-sm font-semibold text-gray-800 tracking-tight truncate">
                                MIS Loan
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
                            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                        >
                            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2">
                        {isBranchRole ? (
                            <ul className="space-y-0.5">
                                <li className="px-1.5 py-1 text-[10px] font-medium uppercase tracking-wider text-gray-400">
                                    {sidebarOpen && 'Main'}
                                </li>
                        {branchMenuItems.map((item) => {
                            const isActive = path === item.href || (item.href !== '/dashboard' && path.startsWith(item.href));
                            const badge = (item as { badge?: number }).badge;
                            return (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        onClick={() => isMobile && setSidebarOpen(false)}
                                        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-[13px] transition-colors ${
                                            isActive ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <item.icon className="w-4 h-4 flex-shrink-0 opacity-80" />
                                            {sidebarOpen && <span className="truncate">{item.name}</span>}
                                        </div>
                                        {sidebarOpen && badge !== undefined && badge > 0 && (
                                            <span className="flex-shrink-0 bg-red-500 text-white text-[10px] font-medium px-1.5 py-0.5 rounded min-w-[18px] text-center">
                                                {badge}
                                            </span>
                                        )}
                                    </Link>
                                </li>
                            );
                        })}
                            </ul>
                        ) : isTeamApproverRole ? (
                            <ul className="space-y-0.5">
                                <li className="px-1.5 py-1 text-[10px] font-medium uppercase tracking-wider text-gray-400">
                                    {sidebarOpen && 'Approvals'}
                                </li>
                                {approverMenuItems.map((item) => {
                                    const isActive = path === item.href || (item.href !== '/dashboard' && path.startsWith(item.href));
                                    const badge = (item as { badge?: number }).badge;
                                    return (
                                        <li key={item.name}>
                                            <Link
                                                href={item.href}
                                                onClick={() => isMobile && setSidebarOpen(false)}
                                                className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-[13px] transition-colors ${
                                                    isActive ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-100'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <item.icon className="w-4 h-4 flex-shrink-0 opacity-80" />
                                                    {sidebarOpen && <span className="truncate">{item.name}</span>}
                                                </div>
                                                {sidebarOpen && badge !== undefined && badge > 0 && (
                                                    <span className="flex-shrink-0 bg-red-500 text-white text-[10px] font-medium px-1.5 py-0.5 rounded min-w-[18px] text-center">
                                                        {badge}
                                                    </span>
                                                )}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <>
                                <ul className="space-y-0.5">
                                    <li className="px-1.5 py-1 text-[10px] font-medium uppercase tracking-wider text-gray-400">
                                        {sidebarOpen && 'Operations'}
                                    </li>
                                    {headOfficeMainItems.map((item) => {
                                        const isActive = path === item.href || (item.href !== '/dashboard' && path.startsWith(item.href));
                                        const badge = (item as { badge?: number }).badge;
                                        return (
                                            <li key={item.name}>
                                                <Link
                                                    href={item.href}
                                                    onClick={() => isMobile && setSidebarOpen(false)}
                                                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-[13px] transition-colors ${
                                                        isActive ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-100'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <item.icon className="w-4 h-4 flex-shrink-0 opacity-80" />
                                                        {sidebarOpen && <span className="truncate">{item.name}</span>}
                                                    </div>
                                                    {sidebarOpen && badge !== undefined && badge > 0 && (
                                                        <span className="flex-shrink-0 bg-red-500 text-white text-[10px] font-medium px-1.5 py-0.5 rounded min-w-[18px] text-center">
                                                            {badge}
                                                        </span>
                                                    )}
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                                {/* Setup section with sub-nav */}
                                <div className="mt-3 pt-2 border-t border-gray-100">
                                    <div className="px-1.5 py-1 text-[10px] font-medium uppercase tracking-wider text-gray-400">
                                        {sidebarOpen && 'Setup'}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSetupExpanded(!setupExpanded)}
                                        className={`flex w-full items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] text-gray-600 hover:bg-gray-100 transition-colors ${
                                            SETUP_PATHS.some(p => path.startsWith(p)) ? 'bg-gray-50 font-medium text-gray-700' : ''
                                        }`}
                                    >
                                        <Settings className="w-4 h-4 flex-shrink-0 opacity-80" />
                                        {sidebarOpen && (
                                            <>
                                                <span className="flex-1 text-left truncate">Configuration</span>
                                                {setupExpanded ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />}
                                            </>
                                        )}
                                    </button>
                                    {setupExpanded && sidebarOpen && (
                                        <ul className="mt-0.5 ml-1 border-l border-gray-200 pl-2.5 space-y-0.5">
                                            {headOfficeSetupItems.map((item) => {
                                                const isActive = path.startsWith(item.href);
                                                return (
                                                    <li key={item.name}>
                                                        <Link
                                                            href={item.href}
                                                            onClick={() => isMobile && setSidebarOpen(false)}
                                                            className={`flex items-center gap-2 px-2 py-1 rounded text-[12px] transition-colors ${
                                                                isActive ? 'text-blue-600 font-medium bg-blue-50/80' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            <item.icon className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
                                                            <span className="truncate">{item.name}</span>
                                                        </Link>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            </>
                        )}
                    </nav>

                    {/* User footer */}
                    <div className="border-t border-gray-100 p-2">
                        {sidebarOpen ? (
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-medium flex-shrink-0">
                                    {auth.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[12px] font-medium text-gray-800 truncate">{auth.user?.name || 'User'}</p>
                                    <p className="text-[11px] text-gray-500 truncate">{auth.user?.role?.name || 'Admin'}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-medium mx-auto">
                                {auth.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content - responsive margin; full width when printing */}
            <div
                className={`transition-[margin] duration-200 ease-out print:ml-0 ${
                    isMobile ? 'ml-0' : sidebarOpen ? 'md:ml-52' : 'md:ml-14'
                }`}
            >
                {/* Header - hidden when printing */}
                <header className="print:hidden bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm/30">
                    <div className="flex items-center justify-between h-12 min-h-12 px-4 md:px-5">
                        <div className="flex items-center gap-3">
                            {isMobile && (
                                <button
                                    type="button"
                                    onClick={() => setSidebarOpen(true)}
                                    className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600"
                                    aria-label="Open menu"
                                >
                                    <Menu className="w-5 h-5" />
                                </button>
                            )}
                            <h2 className="text-sm font-semibold text-gray-800 truncate">
                                {auth.user?.name?.split(' ')[0] || 'User'}
                            </h2>
                        </div>

                        <div className="flex items-center gap-1">
                            <button type="button" className="relative p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors" aria-label="Notifications">
                                <Bell className="w-4 h-4" />
                                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
                            </button>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                                    className="flex items-center gap-1.5 p-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
                                >
                                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-medium">
                                        {auth.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
                                    <ChevronDown className="w-3.5 h-3.5 hidden sm:block" />
                                </button>
                                {profileDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" aria-hidden onClick={() => setProfileDropdownOpen(false)} />
                                        <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50 text-[13px]">
                                            <Link
                                                href="/profile"
                                                className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50"
                                                onClick={() => setProfileDropdownOpen(false)}
                                            >
                                                <User className="w-3.5 h-3.5" />
                                                Profile
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50"
                                            >
                                                <LogOut className="w-3.5 h-3.5" />
                                                Logout
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="p-4 md:p-5 min-h-[calc(100vh-3rem)]">
                    <div className="max-w-[1600px] mx-auto">
                        {children}
                    </div>
                </main>
            </div>

            {/* Mobile overlay when sidebar open */}
            {isMobile && sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-30 md:hidden backdrop-blur-[1px]"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden
                />
            )}
        </div>
    );
}
