import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Send, Printer } from 'lucide-react';
import { MemberAdmission } from '@/types/memberAdmission';
import MemberAdmissionFormView from '@/components/MemberAdmissionFormView';

interface Props {
    admission: MemberAdmission;
    auth?: {
        user: {
            has_all_access: boolean;
        };
    };
}

export default function Show({ admission, auth }: Props) {
    const isHeadOffice = auth?.user?.has_all_access ?? false;
    const backUrl = isHeadOffice ? '/head-office/admission-members' : '/member-admissions';

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: any; label: string }> = {
            draft: { variant: 'secondary', label: 'Draft (খসড়া)' },
            submitted: { variant: 'default', label: 'Submitted (জমা দেওয়া)' },
            under_review: { variant: 'default', label: 'Under Review (পর্যালোচনায়)' },
            pending_head_office: { variant: 'default', label: 'Pending Head Office (হেড অফিসে অপেক্ষমান)' },
            approved: { variant: 'default', label: 'Approved (অনুমোদিত)' },
            rejected: { variant: 'destructive', label: 'Rejected (বাতিল)' },
            needs_revision: { variant: 'default', label: 'Needs Revision (সংশোধন প্রয়োজন)' },
        };
        const config = variants[status] || { variant: 'secondary', label: status };
        return (
            <Badge
                variant={config.variant}
                className={
                    status === 'approved'
                        ? 'bg-green-500 hover:bg-green-600'
                        : status === 'under_review'
                        ? 'bg-yellow-500 hover:bg-yellow-600'
                        : status === 'submitted'
                        ? 'bg-blue-500 hover:bg-blue-600'
                        : status === 'pending_head_office'
                        ? 'bg-purple-500 hover:bg-purple-600'
                        : status === 'needs_revision'
                        ? 'bg-orange-500 hover:bg-orange-600'
                        : ''
                }
            >
                {config.label}
            </Badge>
        );
    };

    const handleSubmit = () => {
        if (confirm(`Are you sure you want to submit application ${admission.application_no}?`)) {
            router.patch(`/member-admissions/${admission.id}/submit`);
        }
    };

    const handlePrint = () => {
        const printUrl = isHeadOffice
            ? `/head-office/admissions/${admission.id}/print`
            : `/member-admissions/${admission.id}/print`;
        window.open(printUrl, '_blank');
    };

    const isEditable = admission.status === 'draft' || admission.status === 'needs_revision';

    return (
        <AdminLayout>
            <Head title={`জরিপ ও সদস্য ভর্তি - ${admission.application_no}`} />

            <div className="space-y-4 max-w-[210mm] mx-auto print:max-w-none">
                {/* Action bar - hidden when printing */}
                <div className="flex items-center justify-between print:hidden">
                    <div className="flex items-center gap-4">
                        <Link
                            href={backUrl}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">জরিপ ও সদস্য ভর্তির আবেদন পত্র</h1>
                            <p className="text-sm text-gray-600 mt-0.5">আবেদন নং: {admission.application_no}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {getStatusBadge(admission.status)}
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                        >
                            <Printer className="w-4 h-4" />
                            প্রিন্ট
                        </button>
                        {isEditable && (
                            <Link
                                href={`/member-admissions/${admission.id}/edit`}
                                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                            >
                                <Edit className="w-4 h-4" />
                                সম্পাদনা
                            </Link>
                        )}
                        {admission.status === 'draft' && (
                            <button
                                onClick={handleSubmit}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                <Send className="w-4 h-4" />
                                জমা দিন
                            </button>
                        )}
                    </div>
                </div>

                {/* Form as per design (same as print form) */}
                <MemberAdmissionFormView admission={admission as any} printMode={false} />
            </div>

            <style>{`
                @media print {
                    body { font-size: 12pt; line-height: 1.4; }
                    @page { margin: 5mm; size: A4 portrait; }
                    .form-print-document {
                        padding: 5mm !important;
                        font-size: 11pt !important;
                    }
                    .print\\:break-inside-avoid,
                    .form-print-section {
                        break-inside: avoid;
                        page-break-inside: avoid;
                    }
                    .form-print-page-break-before { page-break-before: always; }
                }
            `}</style>
        </AdminLayout>
    );
}
