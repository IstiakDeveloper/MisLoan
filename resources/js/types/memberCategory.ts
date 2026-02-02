export interface MemberCategory {
    id: number;
    category_name: string;
    category_name_bn?: string;
    description?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface MemberCategoryFormData {
    category_name: string;
    category_name_bn?: string;
    description?: string;
    is_active: boolean;
}
