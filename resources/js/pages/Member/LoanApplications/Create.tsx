import AdminLayout from '@/layouts/admin-layout';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@inertiajs/react';

interface Props {
    formType: number;
    categories: any[];
    loanProduct?: any;
    memberAdmission?: any;
    branch: any;
    samity?: any;
}

export default function Create({ formType, categories, loanProduct, memberAdmission, branch, samity }: Props) {
    // This is a placeholder - the actual form implementation would be here
    // or you could dynamically import CreateType1 or CreateType2 based on formType

    return (
        <AdminLayout>
            <Head title="নতুন ঋণ আবেদন" />

            <div className="py-6">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="mb-6 flex items-center gap-4">
                        <Link href={route('member.loan-applications.index')}>
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                        </Link>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">নতুন ঋণ আবেদন</h2>
                            <p className="text-gray-600">
                                {formType === 1 ? 'সাপ্তাহিক/সুফলন ঋণ (১ লক্ষ টাকা পর্যন্ত)' : 'বড় ঋণ (১ লক্ষ টাকার উপরে)'}
                            </p>
                        </div>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>ঋণ আবেদন ফর্ম</CardTitle>
                            <CardDescription>
                                অনুগ্রহ করে সকল তথ্য সঠিকভাবে পূরণ করুন
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-12">
                                <p className="text-gray-600 mb-4">
                                    ফর্ম টাইপ {formType} এর জন্য বিস্তারিত ফর্ম শীঘ্রই যুক্ত হবে।
                                </p>
                                <p className="text-sm text-gray-500 mb-6">
                                    আপাতত CreateType1.tsx ফাইলটি দেখুন যেখানে সম্পূর্ণ মাল্টি-স্টেপ ফর্ম আছে।
                                </p>
                                <Link href={route('member.loan-applications.index')}>
                                    <Button>ফিরে যান</Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
}

