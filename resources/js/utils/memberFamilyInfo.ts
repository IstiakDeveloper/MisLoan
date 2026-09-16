/**
 * সদস্য ভর্তি ফরমের «পারিবারিক তথ্য» অংশ থেকে নিজের (সদস্যের) তথ্য বের করার সহায়ক ফাংশন।
 * ফ্যামিলি টেবিলে relation_with_head = 'নিজ' সারিটিই সদস্যের নিজের তথ্য ধরে রাখে।
 */

type FamilyRow = {
    sl_no?: number | string | null;
    relation_with_head?: string | null;
    age_years?: number | string | null;
    age_months?: number | string | null;
    education_level?: string | null;
    occupation?: string | null;
};

const SELF_RELATIONS = ['নিজ', 'নিজে', 'self'];

export function selfFamilyRow(member: any): FamilyRow | null {
    const family = member?.family_members ?? member?.familyMembers ?? [];
    if (!Array.isArray(family) || family.length === 0) {
        return null;
    }

    const bySelfRelation = family.find((row: FamilyRow) =>
        SELF_RELATIONS.includes(String(row?.relation_with_head ?? '').trim().toLowerCase()),
    );

    return bySelfRelation ?? family.find((row: FamilyRow) => Number(row?.sl_no) === 1) ?? null;
}

export function selfOccupation(member: any): string {
    return String(selfFamilyRow(member)?.occupation ?? '').trim();
}

export function selfEducation(member: any): string {
    return String(selfFamilyRow(member)?.education_level ?? '').trim();
}

/** পারিবারিক তথ্যের বয়স, না থাকলে জন্মতারিখ থেকে হিসাব করা বয়স */
export function selfAge(member: any): string {
    const years = Number(selfFamilyRow(member)?.age_years) || 0;
    if (years > 0) {
        return String(years);
    }

    return ageFromDateOfBirth(member?.date_of_birth);
}

export function ageFromDateOfBirth(dateOfBirth: string | null | undefined): string {
    if (!dateOfBirth) {
        return '';
    }
    const birth = new Date(dateOfBirth);
    if (Number.isNaN(birth.getTime())) {
        return '';
    }
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
        age--;
    }

    return age > 0 ? String(age) : '';
}
