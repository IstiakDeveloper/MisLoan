export type BranchLabelSource = {
    name?: string | null;
    code?: string | number | null;
};

export function formatBranchLabel(branch: BranchLabelSource): string {
    const name = (branch.name || '').trim();
    const raw = branch.code == null ? '' : String(branch.code).trim();
    if (!raw) {
        return name;
    }
    const padded = /^\d+$/.test(raw) ? raw.padStart(4, '0') : raw;
    return name ? `${name} (${padded})` : padded;
}

export function sortBranchesByCode<T extends BranchLabelSource>(branches: T[]): T[] {
    return [...branches].sort((a, b) => {
        const ac = String(a.code ?? '').padStart(4, '0');
        const bc = String(b.code ?? '').padStart(4, '0');
        return ac.localeCompare(bc, undefined, { numeric: true });
    });
}

export const keepListFilters = {
    preserveState: true,
    preserveScroll: true,
} as const;
