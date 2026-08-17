/**
 * Local draft storage for Member Admission form.
 * Ensures Field Officers never lose entered data on page reload, network drop, or accidental navigation.
 */

import { MemberAdmissionFormData } from '@/types/memberAdmission';

export interface MemberAdmissionDraftPayload {
    savedAt: number;
    memberTypeChosen: boolean;
    samitySearchQuery?: string;
    presentDistricts?: string[];
    presentUpazilas?: string[];
    permanentDistricts?: string[];
    permanentUpazilas?: string[];
    data: Partial<MemberAdmissionFormData>;
}

export function memberAdmissionDraftKey(userId?: number | string | null): string {
    const user = userId == null || userId === '' ? 'guest' : String(userId);
    return `misloan_member_admission_draft_v1_${user}`;
}

/**
 * Filter out non-serializable File instances before storing in localStorage
 */
function sanitizeFormData(data: Partial<MemberAdmissionFormData>): Partial<MemberAdmissionFormData> {
    const sanitized: Record<string, any> = { ...data };
    
    // File fields cannot be serialized to JSON
    const fileFields = [
        'customer_photo',
        'customer_nid_photo',
        'customer_nid_back_photo',
        'guardian_photo',
        'guardian_nid_photo',
        'applicant_signature',
    ];

    for (const field of fileFields) {
        if (sanitized[field] instanceof File || (sanitized[field] && typeof sanitized[field] === 'object' && 'name' in sanitized[field])) {
            sanitized[field] = null;
        }
    }

    return sanitized as Partial<MemberAdmissionFormData>;
}

export function saveMemberAdmissionDraftLocal(
    key: string,
    payload: {
        memberTypeChosen: boolean;
        samitySearchQuery?: string;
        presentDistricts?: string[];
        presentUpazilas?: string[];
        permanentDistricts?: string[];
        permanentUpazilas?: string[];
        data: Partial<MemberAdmissionFormData>;
    }
): void {
    try {
        const fullPayload: MemberAdmissionDraftPayload = {
            savedAt: Date.now(),
            memberTypeChosen: payload.memberTypeChosen,
            samitySearchQuery: payload.samitySearchQuery || '',
            presentDistricts: payload.presentDistricts || [],
            presentUpazilas: payload.presentUpazilas || [],
            permanentDistricts: payload.permanentDistricts || [],
            permanentUpazilas: payload.permanentUpazilas || [],
            data: sanitizeFormData(payload.data),
        };
        localStorage.setItem(key, JSON.stringify(fullPayload));
    } catch {
        // Quota exceeded / private mode — fail silently
    }
}

export function loadMemberAdmissionDraftLocal(key: string): MemberAdmissionDraftPayload | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as MemberAdmissionDraftPayload;
        if (!parsed || typeof parsed !== 'object' || !parsed.data) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function clearMemberAdmissionDraftLocal(key: string): void {
    try {
        localStorage.removeItem(key);
    } catch {
        // ignore
    }
}

/**
 * Check if the draft actually contains meaningful entered user data
 */
export function hasMeaningfulDraftData(data: Partial<MemberAdmissionFormData>): boolean {
    if (!data) return false;
    if (data.applicant_name_bn?.trim() || data.applicant_name_en?.trim()) return true;
    if (data.mobile_number?.trim()) return true;
    if (data.nid_number?.trim() || data.smart_card_number?.trim() || data.birth_certificate_number?.trim()) return true;
    if (data.father_name_bn?.trim() || data.father_name_en?.trim() || data.mother_name_bn?.trim()) return true;
    if (data.present_division?.trim() || data.present_village_road?.trim()) return true;
    if (data.samity_id && Number(data.samity_id) > 0) return true;
    if (data.member_category_id && Number(data.member_category_id) > 0) return true;
    if (data.family_members && data.family_members.length > 1) return true;
    if (data.other_assets && data.other_assets.length > 0) return true;
    return false;
}
