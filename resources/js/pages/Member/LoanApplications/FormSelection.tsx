import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { FileText, CheckCircle2 } from 'lucide-react';

interface Props {
    member: any;
    loanProduct: any;
    loanCategory: any;
    requestedAmount: number;
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

export default function FormSelection({ member, loanProduct, loanCategory, requestedAmount }: Props) {
    const handleFormClick = (formRoute: string) => {
        router.visit(`/member/loan-applications/forms/${formRoute}?member_id=${member.id}&product_id=${loanProduct.id}&category_id=${loanCategory.id}&amount=${requestedAmount}`);
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
                            <p className="font-semibold">{member.applicant_name_bn} ({member.applicant_name_en})</p>
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

                    {forms.map((form) => (
                        <div
                            key={form.id}
                            onClick={() => handleFormClick(form.route)}
                            className="bg-white border-2 border-gray-200 hover:border-blue-400 rounded-lg p-5 cursor-pointer transition-all duration-200 hover:shadow-md group"
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                                    <FileText className="w-6 h-6 text-blue-600" />
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h3 className="text-base font-bold text-gray-900 mb-1">
                                                {form.name_bn}
                                            </h3>
                                            <p className="text-xs text-gray-600 mb-2">{form.name_en}</p>
                                        </div>
                                        {form.required && (
                                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                                                Required
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 mb-3">{form.description}</p>

                                    <div className="flex items-center gap-2">
                                        <button className="text-sm text-blue-600 font-medium group-hover:text-blue-700">
                                            ফর্মটি পূরণ করুন (Fill Form) →
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
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
