import { useState, useEffect, ReactNode } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import {
    LayoutDashboard,
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
    FileSpreadsheet,
    Inbox,
    UserPlus,
    ClipboardCheck,
    Landmark,
    Banknote,
    ListTree,
    Package
} from 'lucide-react';

interface User {
    id: number;
    name: string;
    email: string;
    role?: { name: string };
    has_all_access: boolean;
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
}

interface AdminLayoutProps {
    children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    const { auth, flash, unreadSubmissionsCount = 0 } = usePage<PageProps>().props;
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const [flashMessage, setFlashMessage] = useState<{ type: string; message: string } | null>(null);

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

        if (flashMessage) {
            const timer = setTimeout(() => setFlashMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [flash]);

    // Branch users: Only Dashboard + Loan Applications + Member Admissions
    // SuperAdmin/Head Office: Full access to all modules including loan categories
    const isBranchUser = !auth.user.has_all_access;

    const menuItems = isBranchUser
        ? [
            { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
            { name: 'Loan Applications', href: '/member/loan-applications', icon: Banknote },
            { name: 'Savings Applications', href: '/member/savings-applications', icon: Landmark },
            { name: 'Loan Applications (Excel)', href: '/loan', icon: FileSpreadsheet },
            { name: 'Member Admissions', href: '/member-admissions', icon: UserPlus },
            { name: 'Pending Approvals', href: '/approvals', icon: ClipboardCheck },
          ]
        : [
            { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
            { name: 'Loan Submissions', href: '/submissions', icon: Inbox, badge: unreadSubmissionsCount },
            { name: 'Admission Members', href: '/head-office/admission-members', icon: UserPlus },
            { name: 'Pending Approvals', href: '/approvals', icon: ClipboardCheck },
            { name: 'Loan Categories', href: '/loan-categories', icon: ListTree },
            { name: 'Loan Products', href: '/loan-products', icon: Package },
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
            {/* Flash Message */}
            {flashMessage && (
                <div
                    className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 animate-in slide-in-from-top ${getFlashColor(flashMessage.type)}`}
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

            {/* Sidebar */}
            <aside
                className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-40 ${
                    sidebarOpen ? 'w-64' : 'w-20'
                }`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
                        {sidebarOpen && (
                            <h1 className="text-xl font-bold text-gray-800 transition-opacity duration-300">
                                MIS Loan
                            </h1>
                        )}
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-3 py-4 space-y-1">
                        {menuItems.map((item) => {
                            const isActive = window.location.pathname.startsWith(item.href);
                            const isHighlight = (item as any).highlight;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                                        isHighlight
                                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-600 font-semibold border-l-4 border-green-500 hover:from-green-100 hover:to-emerald-100'
                                            : isActive
                                            ? 'bg-blue-50 text-blue-600 font-medium'
                                            : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon className="w-5 h-5 flex-shrink-0" />
                                        {sidebarOpen && (
                                            <span className="transition-opacity duration-300">
                                                {item.name}
                                            </span>
                                        )}
                                    </div>
                                    {sidebarOpen && item.badge && item.badge > 0 && (
                                        <span className="bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Info */}
                    <div className="border-t border-gray-200 p-3">
                        {sidebarOpen ? (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                                    {auth.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {auth.user?.name || 'User'}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                        {auth.user?.role?.name || 'Admin'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold mx-auto">
                                {auth.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div
                className={`transition-all duration-300 ${
                    sidebarOpen ? 'ml-64' : 'ml-20'
                }`}
            >
                {/* Header */}
                <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
                    <div className="flex items-center justify-between h-16 px-6">
                        <div className="flex items-center gap-4">
                            <h2 className="text-lg font-semibold text-gray-800">
                                Welcome back, {auth.user?.name?.split(' ')[0] || 'User'}!
                            </h2>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Notifications */}
                            <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
                                <Bell className="w-5 h-5 text-gray-600" />
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                            </button>

                            {/* Profile Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                                        {auth.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
                                    <ChevronDown className="w-4 h-4 text-gray-600" />
                                </button>

                                {profileDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <Link
                                            href="/profile"
                                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                        >
                                            <User className="w-4 h-4" />
                                            Profile
                                        </Link>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-6">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>

            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
}
