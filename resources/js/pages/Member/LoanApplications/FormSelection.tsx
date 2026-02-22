import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { FileText, CheckCircle2 } from 'lucide-react';

interface Props {
    member: any;
    loanProduct: any;
    loanCategory: any;
    requestedAmount: number;
    /** Backend sends which form IDs to show based on product (weekly/monthly) and amount */
    visibleFormIds: number[];
    hasLoanAgreementDraft?: boolean;
    hasGuarantorCommitmentDraft?: boolean;
    hasDeathRiskFundDraft?: boolean;
    hasFieldInvestigationDraft?: boolean;
    hasLoanApplicationApprovalDraft?: boolean;
    /** true when applicant is legacy/old member (no member admission) */
    isLegacy?: boolean;
}

const forms = [
    {
        id: 1,
        name_bn: 'ঋণ চুক্তি পত্র',
        name_en: 'Loan Agreement',
        route: 'loan-agreement',
        required: true,
        description: 'মৌসুমী উন্নয়ন সংস্থার সাথে ঋণ চুক্তি পত্র'
    },
    {
        id: 2,
        name_bn: 'ঋণের জামিনদার/দায়িত্ব গ্রহণকারীর অঙ্গীকার নামা',
        name_en: 'Guarantor Commitment Letter',
        route: 'guarantor-commitment',
        required: true,
        description: 'জামিনদারের অঙ্গীকার নামা পত্র'
    },
    {
        id: 3,
        name_bn: 'মৃত্যুজনিত ঋণঝুঁকি তহবিলে অন্তর্ভুক্তির আবেদন পত্র',
        name_en: 'Death Risk Fund Application',
        route: 'death-risk-fund',
        required: true,
        description: 'মৃত্যুজনিত ঝুঁকি তহবিলে অন্তর্ভুক্তির আবেদন'
    },
    {
        id: 4,
        name_bn: 'সমিতিতে ঋণ আবেদন অনুযায়ী শাখা ব্যবস্থাপক কর্তৃক সদস্যের বাড়ি সরেজমিনে তদন্ত প্রতিবেদন',
        name_en: 'Field Investigation Report',
        route: 'field-investigation',
        required: true,
        description: 'শাখা ব্যবস্থাপক কর্তৃক সরেজমিনে তদন্ত প্রতিবেদন'
    },
    {
        id: 5,
        name_bn: 'জাগরণ/বুনিয়াদ/আগ্রসর ঋণ আবেদন ও অনুমোদনপত্র',
        name_en: 'Jagoron/Buniad/Agrosor Loan Application & Approval',
        route: 'loan-application-approval',
        required: false,
        description: 'জাগরণ/বুনিয়াদ/আগ্রসর ক্যাটাগরির ঋণ আবেদন ও অনুমোদন ফরম'
    }
];

export default function FormSelection({ member, loanProduct, loanCategory, requestedAmount, visibleFormIds = [1, 2, 3, 4, 5], hasLoanAgreementDraft, hasGuarantorCommitmentDraft, hasDeathRiskFundDraft, hasFieldInvestigationDraft, hasLoanApplicationApprovalDraft, isLegacy = false }: Props) {
    // Backend-এর visibleFormIds অনুযায়ী ফর্ম ফিল্টার ও সাজানো (যেমন মাসিকের ক্ষেত্রে ৫ নং ১ নাম্বারে)
    const visibleForms = forms
        .filter((f) => visibleFormIds.includes(f.id))
        .sort((a, b) => visibleFormIds.indexOf(a.id) - visibleFormIds.indexOf(b.id));

    const handleFormClick = (formRoute: string) => {
        const params = new URLSearchParams({
            product_id: String(loanProduct.id),
            category_id: String(loanCategory.id),
            amount: String(requestedAmount),
        });
        if (isLegacy) {
            params.set('legacy', '1');
        } else {
            params.set('member_id', String(member?.id ?? ''));
        }
        router.visit(`/member/loan-applications/forms/${formRoute}?${params.toString()}`);
    };

    return (
        <AdminLayout>
            <Head title="Form Selection - ফর্ম নির্বাচন" />

            <div className="max-w-6xl mx-auto p-6">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h1 className="text-xl font-bold text-gray-900 mb-4">
                        ঋণ আবেদন ফর্ম নির্বাচন করুন <span className="text-sm font-normal text-gray-600">(Select Loan Application Forms)</span>
                    </h1>

                    {/* Member & Loan Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded">
                        <div>
                            <p className="text-gray-600">সদস্যের নাম (Member Name)</p>
                            <p className="font-semibold">{member?.applicant_name_bn ?? ''} {member?.applicant_name_en ? `(${member.applicant_name_en})` : ''}</p>
                            {isLegacy && <span className="text-xs text-amber-600">আগের সদস্য (অ্যাডমিশন ছাড়া)</span>}
                        </div>
                        <div>
                            <p className="text-gray-600">NID / Mobile</p>
                            <p className="font-semibold">{member.nid_number} / {member.mobile_number}</p>
                        </div>
                        <div>
                            <p className="text-gray-600">ঋণ ক্যাটাগরি (Loan Category)</p>
                            <p className="font-semibold">{loanCategory.category_name_bn}</p>
                        </div>
                        <div>
                            <p className="text-gray-600">ঋণ পণ্য (Loan Product)</p>
                            <p className="font-semibold">{loanProduct.product_name_bn}</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-gray-600">আবেদিত ঋণের পরিমাণ (Requested Amount)</p>
                            <p className="font-semibold text-lg text-green-600">৳{requestedAmount.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* Forms Grid */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        প্রয়োজনীয় ফর্মসমূহ <span className="text-sm font-normal text-gray-600">(Required Forms)</span>
                    </h2>

                    {visibleForms.map((form) => {
                        const isLoanAgreement = form.route === 'loan-agreement';
                        const isGuarantorCommitment = form.route === 'guarantor-commitment';
                        const isDeathRiskFund = form.route === 'death-risk-fund';
                        const isFieldInvestigation = form.route === 'field-investigation';
                        const isLoanApplicationApproval = form.route === 'loan-application-approval';
                        const isCompleted =
                            (isLoanAgreement && hasLoanAgreementDraft) ||
                            (isGuarantorCommitment && hasGuarantorCommitmentDraft) ||
                            (isDeathRiskFund && hasDeathRiskFundDraft) ||
                            (isFieldInvestigation && hasFieldInvestigationDraft) ||
                            (isLoanApplicationApproval && hasLoanApplicationApprovalDraft);
                        return (
                        <div
                            key={form.id}
                            onClick={() => handleFormClick(form.route)}
                            className={`bg-white border-2 rounded-lg p-5 cursor-pointer transition-all duration-200 group ${
                                isCompleted
                                    ? 'border-green-400 hover:border-green-500 hover:shadow-md'
                                    : 'border-gray-200 hover:border-blue-400 hover:shadow-md'
                            }`}
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                                    <FileText className="w-6 h-6 text-blue-600" />
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h3 className="text-base font-bold text-gray-900 mb-1">
                                                {form.id === 5 && loanCategory?.category_name_bn
                                                    ? `${loanCategory.category_name_bn} ঋণ আবেদন ও অনুমোদনপত্র`
                                                    : form.name_bn}
                                            </h3>
                                            <p className="text-xs text-gray-600 mb-2">{form.name_en}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            {form.required && (
                                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                                                Required
                                            </span>
                                            )}
                                            {isCompleted && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-[11px] font-semibold rounded">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Saved
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-3">
                                        {form.id === 5 && loanCategory?.category_name_bn
                                            ? `${loanCategory.category_name_bn} ক্যাটাগরির ঋণ আবেদন ও অনুমোদন ফরম`
                                            : form.description}
                                    </p>

                                    <div className="flex items-center gap-2">
                                        <button className={`text-sm font-medium ${
                                            isCompleted
                                                ? 'text-green-700 group-hover:text-green-800'
                                                : 'text-blue-600 group-hover:text-blue-700'
                                        }`}>
                                            {isCompleted ? 'ফর্মটি সম্পাদনা / প্রিন্ট করুন (Edit / Print)' : 'ফর্মটি পূরণ করুন (Fill Form) →'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );})}
                </div>

                {/* Info Box */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex gap-3">
                        <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-gray-700">
                            <p className="font-semibold mb-1">নোট:</p>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                                <li>প্রতিটি ফর্ম আলাদাভাবে পূরণ করুন এবং প্রিন্ট করুন</li>
                                <li>সকল তথ্য সঠিকভাবে পূরণ করুন</li>
                                <li>প্রয়োজনীয় স্বাক্ষর ও সীল সংগ্রহ করুন</li>
                                <li>ঋণ অনুমোদনের জন্য সকল ফর্ম জমা দিতে হবে</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
