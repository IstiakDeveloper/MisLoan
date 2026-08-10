import React from 'react';
import ApproverSelectionStep from '@/components/MemberAdmission/ApproverSelectionStep';
import FormSection from '@/components/MemberAdmission/FormSection';
import { CreditCard } from 'lucide-react';

interface FinancialCommentsSectionProps {
    data: any;
    setData: (field: string, value: any) => void;
    errors: Record<string, string>;
    toNumVal: (val: any) => any;
    toNumChange: (val: string) => any;
}

export default function FinancialCommentsSection({
    data,
    setData,
    errors,
    toNumVal,
    toNumChange,
}: FinancialCommentsSectionProps) {
    const inputClass = "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs md:text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all";

    return (
        <FormSection
            title="৭. আয়-ব্যয় হিসাব ও অন্যান্য মন্তব্য"
            icon={<CreditCard className="w-4 h-4 text-amber-600" />}
            subtitle="মাসিক আয়, ব্যয়, সঞ্চয় ও ইন্টারভিউয়ার/কালেক্টর তথ্য"
        >
            <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-800 mb-2">২০. পরিবারের মোট মাসিক আয়</h4>
                <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-3">
                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">মাসিক আয়</label>
                        <input
                            type="number"
                            placeholder="0"
                            value={toNumVal(data.monthly_income)}
                            onChange={(e) => setData('monthly_income', toNumChange(e.target.value))}
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">মাসিক ব্যয়</label>
                        <input
                            type="number"
                            placeholder="0"
                            value={toNumVal(data.monthly_expense)}
                            onChange={(e) => setData('monthly_expense', toNumChange(e.target.value))}
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">মাসিক সঞ্চয় (আয় - ব্যয়)</label>
                        <input
                            type="number"
                            value={data.monthly_savings}
                            readOnly
                            className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-xs md:text-sm text-gray-700 font-bold"
                        />
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-3">
                    <ApproverSelectionStep
                        approvers={[]}
                        selectedApprovers={[]}
                        onApproverToggle={() => {}}
                        hideApproverSelection
                        interviewerName={data.interviewer_name || ''}
                        employeeName={data.employee_name || ''}
                        guardianName={data.guardian_name || ''}
                        otherLoanInfo={data.other_loan_info || ''}
                        requestedLoanAmount={data.requested_loan_amount}
                        projectName={data.project_name}
                        estimatedAnnualProjectIncome={data.estimated_annual_project_income}
                        collectorComment={data.collector_comment || ''}
                        customerPhoto={data.customer_photo || null}
                        customerNidPhoto={data.customer_nid_photo || null}
                        customerNidBackPhoto={data.customer_nid_back_photo || null}
                        nidBothSides={!!data.nid_both_sides}
                        guardianPhoto={data.guardian_photo || null}
                        guardianNidPhoto={data.guardian_nid_photo || null}
                        applicantSignature={data.applicant_signature || null}
                        onFieldChange={(field, value) => setData(field as any, value)}
                        errors={errors}
                    />
                </div>
            </div>
        </FormSection>
    );
}
