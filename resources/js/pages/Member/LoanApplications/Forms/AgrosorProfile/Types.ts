export interface AgrosorProfileData {
    [key: string]: any;
}

export interface AgrosorProfileProps {
    member: any;
    loanProduct: any;
    loanCategory: any;
    requestedAmount: number;
    branch?: any;
    existingApplication?: any;
    savedData?: AgrosorProfileData;
    onlyPreview?: boolean;
    isLegacy?: boolean;
}

export interface AgrosorFormPageProps {
    data: AgrosorProfileData;
    setData: (key: string, value: any) => void;
    member: any;
    loanProduct?: any;
    loanCategory?: any;
    requestedAmount?: number;
    isLegacy?: boolean;
}
