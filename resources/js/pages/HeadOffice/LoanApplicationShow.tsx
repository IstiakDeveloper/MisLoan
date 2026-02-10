import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, FileText, User, Banknote, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface Loan {
    id: number;
    application_no: string;
    status: string;
    requested_amount: number;
    purpose_of_loan?: string;
    member_admission: any;
    loan_product: any;
    loan_category: any;
    branch: { name: string };
    submitted_at: string;
    issues: Array<{
        id: number;
        issue_description: string;
        reporter: { name: string };
        created_at: string;
    }>;
}

interface Props {
    loan: Loan;
    flash?: { success?: string; error?: string };
}

export default function LoanApplicationShow({ loan, flash }: Props) {
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);

    const { data, setData, post, processing, reset } = useForm({
        issue_description: '',
    });

    const ma = loan.member_admission || {};
    const memberName = ma.applicant_name_bn || ma.applicant_name_en || '';

    const handleSubmitIssue = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/head-office/loans/${loan.id}/issue`, {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setShowIssueModal(false);
            },
        });
    };

    const handleApprove = () => {
        if (loan.issues?.length > 0) {
            alert('পেন্ডিং সমস্যা থাকলে অনুমোদন করা যাবে না।');
            return;
        }
        if (confirm('এই ঋণ আবেদন অনুমোদন করবেন?')) {
            router.patch(`/head-office/loans/${loan.id}/approve`, {}, { preserveScroll: true });
        }
    };

    const handleReject = (reason: string) => {
        if (!reason.trim()) {
            alert('প্রত্যাখ্যানের কারণ লিখুন।');
            return;
        }
        router.patch(`/head-office/loans/${loan.id}/reject`, {
            rejection_reason: reason,
        }, {
            preserveScroll: true,
            onSuccess: () => setShowRejectModal(false),
        });
    };

    return (
        <AdminLayout>
            <Head title={`ঋণ আবেদন - ${loan.application_no}`} />

            {flash?.success && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                    {flash.success}
                </div>
            )}
            {flash?.error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                    {flash.error}
                </div>
            )}

            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => router.visit('/head-office/process-loans')}>
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">ঋণ আবেদন বিবরণ</h1>
                            <p className="text-gray-600">আবেদন নং: {loan.application_no}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowIssueModal(true)}>
                            <AlertCircle className="w-4 h-4 mr-2" />
                            সমস্যা লিখে পাঠান
                        </Button>
                        {loan.issues?.length === 0 && (
                            <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
                                <CheckCircle className="w-4 h-4 mr-2" />
                                অনুমোদন
                            </Button>
                        )}
                        <Button variant="destructive" onClick={() => setShowRejectModal(true)}>
                            <XCircle className="w-4 h-4 mr-2" />
                            প্রত্যাখ্যান
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="w-5 h-5" /> সদস্যের তথ্য
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <p><span className="text-gray-600">নাম:</span> {memberName}</p>
                            <p><span className="text-gray-600">NID:</span> {ma.nid_number || '-'}</p>
                            <p><span className="text-gray-600">মোবাইল:</span> {ma.mobile_number || '-'}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Banknote className="w-5 h-5" /> ঋণ বিবরণ
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <p><span className="text-gray-600">ক্যাটাগরি:</span> {loan.loan_category?.category_name_bn}</p>
                            <p><span className="text-gray-600">পণ্য:</span> {loan.loan_product?.product_name_bn}</p>
                            <p><span className="text-gray-600">আবেদিত পরিমাণ:</span> ৳{Number(loan.requested_amount).toLocaleString()}</p>
                            <p><span className="text-gray-600">শাখা:</span> {loan.branch?.name}</p>
                            <p><span className="text-gray-600">জমার তারিখ:</span> {loan.submitted_at ? new Date(loan.submitted_at).toLocaleDateString('bn-BD') : '-'}</p>
                            {loan.purpose_of_loan && (
                                <p><span className="text-gray-600">ঋণের উদ্দেশ্য:</span> {loan.purpose_of_loan}</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {loan.issues && loan.issues.length > 0 && (
                    <Card className="border-amber-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-amber-800">
                                <AlertCircle className="w-5 h-5" /> হেড অফিস থেকে পাঠানো সমস্যা
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-3">
                                {loan.issues.map((issue) => (
                                    <li key={issue.id} className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                                        <p className="text-amber-900">{issue.issue_description}</p>
                                        <p className="text-xs text-amber-700 mt-1">— {issue.reporter?.name}, {new Date(issue.created_at).toLocaleString('bn-BD')}</p>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Issue modal */}
            {showIssueModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                        <div className="px-6 py-4 border-b">
                            <h3 className="text-lg font-bold">সমস্যা লিখে পাঠান</h3>
                            <p className="text-sm text-gray-600">সমস্যা বিস্তারিত লিখুন। শাখা দেখে সংশোধন করবে।</p>
                        </div>
                        <form onSubmit={handleSubmitIssue} className="p-6">
                            <textarea
                                value={data.issue_description}
                                onChange={(e) => setData('issue_description', e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="সমস্যার বিবরণ..."
                                required
                            />
                            <div className="mt-4 flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => { setShowIssueModal(false); reset(); }}>
                                    বাতিল
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'পাঠানো হচ্ছে...' : 'পাঠান'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reject modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <RejectModal
                        onClose={() => setShowRejectModal(false)}
                        onConfirm={handleReject}
                    />
                </div>
            )}
        </AdminLayout>
    );
}

function RejectModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (reason: string) => void }) {
    const [reason, setReason] = useState('');
    return (
        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-bold text-red-700">ঋণ আবেদন প্রত্যাখ্যান</h3>
                <p className="text-sm text-gray-600">প্রত্যাখ্যানের কারণ লিখুন (বাধ্যতামূলক)।</p>
            </div>
            <div className="p-6">
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                    placeholder="কারণ..."
                />
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>বাতিল</Button>
                <Button variant="destructive" onClick={() => onConfirm(reason)}>প্রত্যাখ্যান নিশ্চিত করুন</Button>
            </div>
        </div>
    );
}
