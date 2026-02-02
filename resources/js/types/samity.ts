export interface Samity {
    id: number;
    branch_id: number;
    samity_code: string;
    samity_name: string;
    samity_name_bn?: string;
    description?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    branch?: {
        id: number;
        name: string;
        code: string;
        area: {
            id: number;
            name: string;
            zone: {
                id: number;
                name: string;
            };
        };
    };
}

export interface SamityFormData {
    branch_id: number | null;
    samity_code: string;
    samity_name: string;
    samity_name_bn?: string;
    description?: string;
    is_active: boolean;
}
