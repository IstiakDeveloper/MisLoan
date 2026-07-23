import { usePage } from '@inertiajs/react';

/**
 * ED has SuperAdmin-like view access but cannot create/edit/delete.
 * Approver actions (team-based approvals) remain allowed via their own routes.
 */
export function useCanMutate(): boolean {
    const { auth } = usePage<{
        auth: { user?: { is_read_only?: boolean; role?: { name?: string } } };
    }>().props;

    if (auth.user?.is_read_only) {
        return false;
    }

    return auth.user?.role?.name !== 'ed';
}
