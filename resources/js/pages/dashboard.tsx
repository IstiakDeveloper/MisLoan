import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { useAuth } from '@/contexts/AuthContext';
import { apiService, Branch } from '@/services/api';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
];

export default function Dashboard() {
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchBranches = async () => {
            if (!isAuthenticated) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const data = await apiService.getBranches({ all: true });
                setBranches(data);
                setError(null);
            } catch (err) {
                console.error('Failed to fetch branches:', err);
                setError('Failed to load branches');
            } finally {
                setLoading(false);
            }
        };

        if (!authLoading) {
            fetchBranches();
        }
    }, [isAuthenticated, authLoading]);

    if (authLoading) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Dashboard" />
                <div className="flex h-full flex-1 items-center justify-center p-4">
                    <div className="text-center">
                        <div className="mb-4 text-lg">Loading...</div>
                    </div>
                </div>
            </AppLayout>
        );
    }

    if (!isAuthenticated) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Dashboard" />
                <div className="flex h-full flex-1 items-center justify-center p-4">
                    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950">
                        <h2 className="mb-2 text-xl font-semibold text-red-900 dark:text-red-100">Not Authenticated</h2>
                        <p className="text-red-700 dark:text-red-300">Please login to the external system first.</p>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto p-4">
                {/* User Info Card */}
                <div className="rounded-xl border border-sidebar-border/70 bg-white p-6 shadow-sm dark:border-sidebar-border dark:bg-sidebar">
                    <h2 className="mb-4 text-xl font-semibold">User Information</h2>
                    <div className="grid gap-3 md:grid-cols-2">
                        <div>
                            <span className="text-sm text-muted-foreground">Name:</span>
                            <p className="font-medium">{user?.name}</p>
                        </div>
                        <div>
                            <span className="text-sm text-muted-foreground">Email:</span>
                            <p className="font-medium">{user?.email}</p>
                        </div>
                        <div>
                            <span className="text-sm text-muted-foreground">Branch:</span>
                            <p className="font-medium">{user?.branch?.branch_name || 'N/A'}</p>
                        </div>
                        <div>
                            <span className="text-sm text-muted-foreground">Branch Code:</span>
                            <p className="font-medium">{user?.branch?.branch_code || 'N/A'}</p>
                        </div>
                    </div>
                </div>

                {/* Branches List */}
                <div className="rounded-xl border border-sidebar-border/70 bg-white p-6 shadow-sm dark:border-sidebar-border dark:bg-sidebar">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-xl font-semibold">All Branches</h2>
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                            Total: {branches.length}
                        </span>
                    </div>

                    {loading ? (
                        <div className="py-8 text-center">
                            <div className="text-muted-foreground">Loading branches...</div>
                        </div>
                    ) : error ? (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                            {error}
                        </div>
                    ) : branches.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                            No branches found
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-lg border border-sidebar-border/50 dark:border-sidebar-border">
                            <table className="w-full">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-semibold">Branch Name</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold">Branch Code</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold">Address</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-sidebar-border/50">
                                    {branches.map((branch) => (
                                        <tr key={branch.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 font-medium">{branch.branch_name}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{branch.branch_code}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{branch.address}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
