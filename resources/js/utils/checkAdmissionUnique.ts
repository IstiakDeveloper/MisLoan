import axios from 'axios';

export async function checkAdmissionUnique(params: {
    nid_number?: string | null;
    smart_card_number?: string | null;
    mobile_number?: string | null;
    ignore_id?: number | null;
}): Promise<Record<string, string>> {
    const query: Record<string, string | number> = {};
    if (params.nid_number?.trim()) {
        query.nid_number = params.nid_number.trim();
    }
    if (params.smart_card_number?.trim()) {
        query.smart_card_number = params.smart_card_number.trim();
    }
    if (params.mobile_number?.trim()) {
        query.mobile_number = params.mobile_number.trim();
    }
    if (params.ignore_id) {
        query.ignore_id = params.ignore_id;
    }

    const hasField =
        'nid_number' in query || 'smart_card_number' in query || 'mobile_number' in query;
    if (!hasField) {
        return {};
    }

    const { data } = await axios.get('/member-admissions/check-unique', { params: query });
    return (data?.errors ?? {}) as Record<string, string>;
}
