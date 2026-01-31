import { Head } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import {
    Users,
    Building2,
    MapPin,
    Globe,
    Shield,
    FileText,
    Clock,
    CheckCircle,
    TrendingUp,
    Calendar
} from 'lucide-react';

interface Role {
    id: number;
    name: string;
    display_name: string;
}

interface Branch {
    id: number;
    name: string;
    code: string;
}

interface User {
    id: number;
    name: string;
    email: string;
    role: Role;
    branch: Branch | null;
    created_at: string;
}

interface Zone {
    id: number;
    name: string;
    code: string;
}

interface Area {
    id: number;
    name: string;
    code: string;
}

interface Stats {
    total_users: number;
    total_zones: number;
    total_areas: number;
    total_branches: number;
    total_roles: number;
    total_applications: number;
    pending_applications: number;
    approved_applications: number;
}

interface AccessibleData {
    zones?: Zone[];
    areas?: Area[];
    branches?: Branch[];
}

interface Props {
    stats: Stats;
    recentUsers: User[];
    accessibleData: AccessibleData;
}

export default function Dashboard({ stats, recentUsers, accessibleData }: Props) {
    const statCards = [
        {
            title: 'Total Users',
            value: stats.total_users,
            icon: Users,
            color: 'blue',
            bgColor: 'bg-blue-50',
            iconColor: 'text-blue-600',
            borderColor: 'border-blue-200'
        },
        {
            title: 'Total Zones',
            value: stats.total_zones,
            icon: Globe,
            color: 'purple',
            bgColor: 'bg-purple-50',
            iconColor: 'text-purple-600',
            borderColor: 'border-purple-200'
        },
        {
            title: 'Total Areas',
            value: stats.total_areas,
            icon: MapPin,
            color: 'green',
            bgColor: 'bg-green-50',
            iconColor: 'text-green-600',
            borderColor: 'border-green-200'
        },
        {
            title: 'Total Branches',
            value: stats.total_branches,
            icon: Building2,
            color: 'orange',
            bgColor: 'bg-orange-50',
            iconColor: 'text-orange-600',
            borderColor: 'border-orange-200'
        },
        {
            title: 'System Roles',
            value: stats.total_roles,
            icon: Shield,
            color: 'pink',
            bgColor: 'bg-pink-50',
            iconColor: 'text-pink-600',
            borderColor: 'border-pink-200'
        },
        {
            title: 'Total Applications',
            value: stats.total_applications,
            icon: FileText,
            color: 'indigo',
            bgColor: 'bg-indigo-50',
            iconColor: 'text-indigo-600',
            borderColor: 'border-indigo-200'
        },
        {
            title: 'Pending',
            value: stats.pending_applications,
            icon: Clock,
            color: 'yellow',
            bgColor: 'bg-yellow-50',
            iconColor: 'text-yellow-600',
            borderColor: 'border-yellow-200'
        },
        {
            title: 'Approved',
            value: stats.approved_applications,
            icon: CheckCircle,
            color: 'emerald',
            bgColor: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
            borderColor: 'border-emerald-200'
        },
    ];

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <AdminLayout>
            <Head title="Dashboard" />

            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Welcome back! Here's an overview of your system.
                    </p>
                </div>

                {/* Statistics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {statCards.map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <div
                                key={stat.title}
                                className={`bg-white rounded-lg border ${stat.borderColor} p-5 shadow-sm hover:shadow-md transition-shadow`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                                        <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                                    </div>
                                    <div className={`${stat.bgColor} p-3 rounded-lg`}>
                                        <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent Users */}
                    <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-gray-900">Recent Users</h2>
                                <TrendingUp className="w-5 h-5 text-gray-400" />
                            </div>
                        </div>
                        <div className="p-6">
                            {recentUsers.length > 0 ? (
                                <div className="space-y-4">
                                    {recentUsers.map((user) => (
                                        <div
                                            key={user.id}
                                            className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {user.name}
                                                </p>
                                                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                    {user.role.display_name}
                                                </span>
                                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDate(user.created_at)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    No recent users
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Accessible Data Summary */}
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">Your Access</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            {accessibleData.zones && accessibleData.zones.length > 0 && (
                                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Globe className="w-5 h-5 text-purple-600" />
                                        <span className="font-semibold text-purple-900">Zones</span>
                                    </div>
                                    <p className="text-2xl font-bold text-purple-600">
                                        {accessibleData.zones.length}
                                    </p>
                                    <p className="text-xs text-purple-700 mt-1">
                                        {accessibleData.zones.map(z => z.name).join(', ')}
                                    </p>
                                </div>
                            )}

                            {accessibleData.areas && accessibleData.areas.length > 0 && (
                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MapPin className="w-5 h-5 text-green-600" />
                                        <span className="font-semibold text-green-900">Areas</span>
                                    </div>
                                    <p className="text-2xl font-bold text-green-600">
                                        {accessibleData.areas.length}
                                    </p>
                                    <p className="text-xs text-green-700 mt-1 truncate">
                                        {accessibleData.areas.slice(0, 3).map(a => a.name).join(', ')}
                                        {accessibleData.areas.length > 3 && ` +${accessibleData.areas.length - 3} more`}
                                    </p>
                                </div>
                            )}

                            {accessibleData.branches && accessibleData.branches.length > 0 && (
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Building2 className="w-5 h-5 text-blue-600" />
                                        <span className="font-semibold text-blue-900">Branches</span>
                                    </div>
                                    <p className="text-2xl font-bold text-blue-600">
                                        {accessibleData.branches.length}
                                    </p>
                                    <p className="text-xs text-blue-700 mt-1 truncate">
                                        {accessibleData.branches.slice(0, 3).map(b => b.name).join(', ')}
                                        {accessibleData.branches.length > 3 && ` +${accessibleData.branches.length - 3} more`}
                                    </p>
                                </div>
                            )}

                            {!accessibleData.zones?.length && !accessibleData.areas?.length && !accessibleData.branches?.length && (
                                <div className="text-center py-8 text-gray-500">
                                    <Shield className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                                    <p className="text-sm">Role-based access</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Actions (Optional for future) */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">System Status</h3>
                    <p className="text-sm text-gray-600">
                        All systems operational. {stats.total_users} active users across {stats.total_branches} branches.
                    </p>
                </div>
            </div>
        </AdminLayout>
    );
}
