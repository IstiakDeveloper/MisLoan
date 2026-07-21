export interface LoanApplicationApprovalData {
    [key: string]: any;
}

export interface ApprovalFormProps {
    member: any;
    loanProduct: any;
    loanCategory: any;
    requestedAmount: number;
    branch?: any;
    existingApplication?: any;
    savedData?: LoanApplicationApprovalData;
    onlyPreview?: boolean;
    savingsProducts?: Array<{ id: number; product_code: string; product_name: string; product_name_bn: string | null }>;
    loanRound?: number;
    isLegacy?: boolean;
}

export interface FormPageProps {
    data: LoanApplicationApprovalData;
    setData: (key: keyof LoanApplicationApprovalData | string, value: any) => void;
    member: any;
    isLegacy: boolean;
    handleImageUpload: (key: string, file: File | null) => void;
    removeImage: (key: string) => void;
    loanProduct?: any;
    loanCategory?: any;
    requestedAmount?: number;
    savingsProducts?: Array<any>;
    loanRound?: number;
}
