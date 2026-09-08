export type FamilyAssetRow = {
    fixed_desc?: string;
    fixed_quantity?: string;
    fixed_value?: string;
    movable_desc?: string;
    movable_value?: string;
    from_admission?: boolean;
};

const fromData = (v: unknown): string => (v !== null && v !== undefined && v !== '' ? String(v) : '');

const fmtValue = (v: unknown): string => {
    if (v === null || v === undefined || v === '') return '';
    const n = Number(v);
    return Number.isNaN(n) ? String(v) : String(Math.round(n));
};

const landQty = (v: unknown): string => {
    const s = fromData(v);
    if (s === '') return '';
    const n = Number(s);
    if (Number.isNaN(n)) return s;
    if (n <= 0) return '';
    return Number.isInteger(n) ? String(n) : String(n);
};

export const emptyFamilyAssetRow = (): FamilyAssetRow => ({
    fixed_desc: '',
    fixed_quantity: '',
    fixed_value: '',
    movable_desc: '',
    movable_value: '',
    from_admission: false,
});

export function formatFixedAssetLabel(item: FamilyAssetRow | null | undefined): string {
    const desc = String(item?.fixed_desc ?? '').trim();
    const qty = String(item?.fixed_quantity ?? '').trim();
    const fromAdmission = item?.from_admission === true;

    if (fromAdmission && desc && qty) {
        return `${desc} (${qty})`;
    }
    if (desc) {
        return desc;
    }
    if (fromAdmission) {
        return qty;
    }
    return '';
}

export function isFamilyAssetRowPopulated(item: FamilyAssetRow | null | undefined): boolean {
    return (
        String(item?.fixed_desc ?? '').trim() !== '' ||
        String(item?.fixed_quantity ?? '').trim() !== '' ||
        String(item?.fixed_value ?? '').trim() !== '' ||
        String(item?.movable_desc ?? '').trim() !== '' ||
        String(item?.movable_value ?? '').trim() !== ''
    );
}

export function isAdmissionFamilyAssetRow(item: FamilyAssetRow | null | undefined): boolean {
    return item?.from_admission !== false;
}

export function getFamilyAssetsFromMember(member: any): FamilyAssetRow[] {
    if (!member) return [];
    const otherAssets = member.other_assets ?? member.otherAssets ?? [];
    const rows: FamilyAssetRow[] = [];
    const cultAmt = landQty(member.cultivable_land_amount);
    const cultVal = fmtValue(member.cultivable_land_value);
    const nonCultAmt = landQty(member.non_cultivable_land_amount);
    const nonCultVal = fmtValue(member.non_cultivable_land_value);
    const mov = (a: any): Pick<FamilyAssetRow, 'movable_desc' | 'movable_value'> => ({
        movable_desc: a?.asset_description ?? '',
        movable_value: a?.estimated_value != null ? fmtValue(a.estimated_value) : '',
    });

    rows.push({
        fixed_desc: 'আবাদী',
        fixed_quantity: cultAmt,
        fixed_value: cultVal,
        ...mov(otherAssets[0]),
        from_admission: true,
    });
    rows.push({
        fixed_desc: 'অনাবাদী',
        fixed_quantity: nonCultAmt,
        fixed_value: nonCultVal,
        ...mov(otherAssets[1]),
        from_admission: true,
    });
    for (let i = 2; i < otherAssets.length; i++) {
        rows.push({
            fixed_desc: '',
            fixed_quantity: '',
            fixed_value: '',
            ...mov(otherAssets[i]),
            from_admission: true,
        });
    }
    return rows;
}

export function mergeFamilyAssets(
    fromMember: FamilyAssetRow[],
    saved: FamilyAssetRow[] | null | undefined,
): FamilyAssetRow[] {
    if (!Array.isArray(saved) || saved.length === 0) {
        return fromMember;
    }

    const hasFlag = saved.some((row) => row && typeof row.from_admission === 'boolean');
    if (hasFlag) {
        const extras = saved.filter((row) => row && row.from_admission === false);
        return [...fromMember, ...extras];
    }

    return saved.map((row, i) => {
        const template = fromMember[i];
        if (!template) {
            return { ...emptyFamilyAssetRow(), ...row, from_admission: false };
        }
        return {
            ...row,
            fixed_desc: row.fixed_desc || template.fixed_desc || '',
            from_admission: template.from_admission ?? true,
        };
    });
}
