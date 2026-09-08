import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Banknote, Edit, Calendar } from 'lucide-react';
import { PhoneCallLink } from '@/components/ui/PhoneCallLink';
import { formatDate } from '@/utils/dateUtils';

interface Props {
    application: any;
    memberName?: string;
    applicant?: any;
    isBranchUser?: boolean;
    isBranchManager?: boolean;
    isSuperAdmin?: boolean;
    isFieldOfficer?: boolean;
    canEditLoanDetails?: boolean;
    onOpenMemberCodeModal?: () => void;
    onOpenLoanProductModal?: () => void;
    onOpenEditLoanModal?: () => void;
}

export default function MemberLoanDetailsTab({
    application,
    memberName,
    applicant,
    isBranchUser,
    isBranchManager,
    isSuperAdmin,
    isFieldOfficer,
    canEditLoanDetails,
    onOpenMemberCodeModal,
    onOpenLoanProductModal,
    onOpenEditLoanModal,
}: Props) {
    const admission = application.member_admission || application.memberAdmission;
    const loanProduct = application.loan_product || application.loanProduct;
    const loanCategory = application.loan_category || application.loanCategory;
    const canEditTerms =
        canEditLoanDetails ??
        Boolean(isSuperAdmin || application.status === 'draft');
    const isAtOrPastHeadOffice = [
        'pending_head_office',
        'approved',
        'pending_disbursement',
        'pending_amount_approval',
    ].includes(application.status);
    const lockLabel = isAtOrPastHeadOffice
        ? 'হেড অফিসে পাঠানো হয়েছে (লক)'
        : 'জমা হয়েছে (লক)';
    const displayName =
        memberName ||
        admission?.applicant_name_bn ||
        admission?.applicant_name_en ||
        admission?.member_name_bn ||
        admission?.member_name_en ||
        '-';

    return (
        <div className="printable-area p-3.5 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 animate-in fade-in duration-150">
            {/* ── CARD 1: MEMBER DETAILS ── */}
            <Card className="border-slate-200/80 shadow-xs rounded-2xl overflow-hidden">
                <CardHeader className="bg-slate-50/60 pb-3 border-b flex flex-row items-center justify-between">
                    <CardTitle className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                        <User className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" /> সদস্যের বিস্তারিত তথ্য
                    </CardTitle>
                    {application.status !== 'disbursed' && onOpenMemberCodeModal && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold rounded-lg cursor-pointer"
                            onClick={onOpenMemberCodeModal}
                        >
                            <Edit className="w-3.5 h-3.5 mr-1" /> মেম্বার কোড পরিবর্তন
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="p-3.5 sm:p-4 space-y-2.5 sm:space-y-3 text-xs sm:text-sm">
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">মেম্বার কোড:</span>
                        <span className="font-mono font-bold text-indigo-700">
                            {admission?.application_no || '-'}
                        </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">নাম (বাংলা/ইংরেজি):</span>
                        <span className="font-semibold text-slate-900">{displayName}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">জাতীয় পরিচয়পত্র (NID):</span>
                        <span className="font-semibold text-slate-900">
                            {admission?.nid_number || admission?.nid_no || '-'}
                        </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">মোবাইল নম্বর:</span>
                        <PhoneCallLink
                            phone={admission?.mobile_number || admission?.mobile_no}
                            className="font-mono font-semibold text-blue-700"
                            iconClassName="w-3.5 h-3.5 text-blue-500"
                        />
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">বর্তমান ঠিকানা:</span>
                        <span className="font-medium text-slate-800 text-right max-w-[200px] sm:max-w-[240px]">
                            {admission?.present_village_road || admission?.present_address_en || '-'}
                        </span>
                    </div>
                    {applicant && (
                        <div className="flex justify-between py-1.5">
                            <span className="text-slate-500">জমা প্রদানকারী:</span>
                            <span className="font-semibold text-slate-900">{applicant.name}</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── CARD 2: LOAN DETAILS & CONDITIONS ── */}
            <Card className="border-slate-200/80 shadow-xs rounded-2xl overflow-hidden">
                <CardHeader className="bg-slate-50/60 pb-3 border-b flex flex-row items-center justify-between">
                    <CardTitle className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                        <Banknote className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" /> ঋণ বিবরণ ও শর্তাবলী
                    </CardTitle>
                    {application.status !== 'disbursed' && application.status !== 'cancelled' && (
                        canEditTerms && onOpenEditLoanModal ? (
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-8 border-indigo-300 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100 font-bold rounded-lg cursor-pointer transition shadow-2xs"
                                onClick={onOpenEditLoanModal}
                            >
                                <Edit className="w-3.5 h-3.5 mr-1 text-indigo-600" /> শর্তাবলী সম্পাদনা
                            </Button>
                        ) : canEditTerms && onOpenLoanProductModal ? (
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold rounded-lg cursor-pointer"
                                onClick={onOpenLoanProductModal}
                            >
                                <Edit className="w-3.5 h-3.5 mr-1" /> ঋণ প্রোডাক্ট পরিবর্তন
                            </Button>
                        ) : (
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-md" title="হেড অফিসে পাঠানোর আগে শাখা ব্যবহারকারী পরিবর্তন করতে পারবেন।">
                                {lockLabel}
                            </span>
                        )
                    )}
                </CardHeader>
                <CardContent className="p-3.5 sm:p-4 space-y-2.5 sm:space-y-3 text-xs sm:text-sm">
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">আবেদন নং:</span>
                        <span className="font-mono font-bold text-indigo-700">
                            {application.application_no || '-'}
                        </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">ঋণ ক্যাটাগরি:</span>
                        <span className="font-semibold text-slate-900">
                            {application.loan_category?.category_name_bn ||
                                application.loan_category?.category_name ||
                                '-'}
                        </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">ঋণ পণ্য:</span>
                        <span className="font-semibold text-slate-900">
                            {application.loan_product?.product_name_bn ||
                                application.loan_product?.product_name ||
                                '-'}
                        </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">আবেদিত ঋণ পরিমাণ:</span>
                        <span className="font-bold text-slate-900">
                            ৳{Number(application.requested_amount || 0).toLocaleString('bn-BD')}
                        </span>
                    </div>
                    {application.approved_amount != null && (
                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                            <span className="text-slate-500">অনুমোদিত পরিমাণ:</span>
                            <span className="font-bold text-emerald-700">
                                ৳{Number(application.approved_amount).toLocaleString('bn-BD')}
                            </span>
                        </div>
                    )}
                    {application.amount_change_pending &&
                        application.pending_approved_amount != null && (
                            <div className="flex justify-between py-1.5 border-b border-orange-100 bg-orange-50/80 px-2 rounded-lg -mx-2">
                                <span className="font-semibold text-orange-900">প্রস্তাবিত নতুন পরিমাণ:</span>
                                <span className="font-black text-orange-700">
                                    ৳{Number(application.pending_approved_amount).toLocaleString('bn-BD')}
                                </span>
                            </div>
                        )}
                    {application.disbursed_amount != null && (
                        <div className="flex justify-between py-1.5 border-b border-slate-100 bg-emerald-50/70 px-2 rounded-lg -mx-2">
                            <span className="font-semibold text-emerald-900">প্রকৃত বিতরণ পরিমাণ:</span>
                            <span className="font-black text-emerald-700">
                                ৳{Number(application.disbursed_amount).toLocaleString('bn-BD')}
                            </span>
                        </div>
                    )}
                    {application.disbursement_method && (
                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                            <span className="text-slate-500">বিতরণ মাধ্যম:</span>
                            <span className="font-semibold text-slate-800 uppercase">
                                {application.disbursement_method}
                            </span>
                        </div>
                    )}
                    {application.disbursement_reference && (
                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                            <span className="text-slate-500">রেফারেন্স / ভাউচার নং:</span>
                            <span className="font-mono text-slate-800">
                                {application.disbursement_reference}
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">শাখা:</span>
                        <span className="font-semibold text-slate-900">
                            {application.branch?.name || '-'}
                        </span>
                    </div>
                    {application.samity && (
                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                            <span className="text-slate-500">সমিতি:</span>
                            <span className="font-semibold text-slate-900">
                                {application.samity.samity_name_bn ||
                                    application.samity.samity_name ||
                                    '-'}
                            </span>
                        </div>
                    )}
                    {(application.duration_months || application.installment_count) && (
                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                            <span className="text-slate-500">মেয়াদ / কিস্তির সংখ্যা:</span>
                            <span className="font-semibold text-slate-900">
                                {application.duration_months
                                    ? `${application.duration_months} মাস`
                                    : `${application.installment_count || '-'} টি কিস্তি`}
                            </span>
                        </div>
                    )}
                    {(application.purpose_of_loan || application.loan_purpose) && (
                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                            <span className="text-slate-500">ঋণের উদ্দেশ্য:</span>
                            <span className="font-medium text-slate-800 text-right max-w-[200px] sm:max-w-[240px]">
                                {application.purpose_of_loan || application.loan_purpose}
                            </span>
                        </div>
                    )}
                    {application.created_at && (
                        <div className="flex justify-between py-1.5">
                            <span className="text-slate-500">আবেদনের তারিখ:</span>
                            <span className="font-semibold text-slate-900">
                                {formatDate(application.created_at)}
                            </span>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
