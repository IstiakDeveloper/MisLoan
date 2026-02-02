import React, { useState } from 'react';

interface Approver {
    id: number;
    name: string;
    email: string;
    role: { name: string };
    level?: string;
}

interface Props {
    approvers: Approver[];
    selectedApprovers: number[];
    onApproverToggle: (approverId: number) => void;
    interviewerName: string;
    employeeName: string;
    guardianName: string;
    otherLoanInfo: string;
    collectorComment: string;
    customerPhoto: File | null;
    customerNidPhoto: File | null;
    guardianPhoto: File | null;
    guardianNidPhoto: File | null;
    applicantSignature: File | null;
    onFieldChange: (field: string, value: string | File | null) => void;
    errors: any;
}

export default function ApproverSelectionStep({
    approvers,
    selectedApprovers,
    onApproverToggle,
    interviewerName,
    employeeName,
    guardianName,
    otherLoanInfo,
    collectorComment,
    customerPhoto,
    customerNidPhoto,
    guardianPhoto,
    guardianNidPhoto,
    applicantSignature,
    onFieldChange,
    errors,
}: Props) {
    const [uploadStatus, setUploadStatus] = useState<{ [key: string]: string }>({});

    const handleFileChange = (field: string, file: File | null) => {
        if (file) {
            const fileSizeMB = file.size / 1048576;
            const fileSizeKB = file.size / 1024;

            // Check file size (10MB = 10485760 bytes)
            if (file.size > 10485760) {
                setUploadStatus({ ...uploadStatus, [field]: `❌ File is too large (${fileSizeMB.toFixed(2)}MB). Maximum 10MB allowed.` });
            } else if (file.size > 2097152) {
                setUploadStatus({ ...uploadStatus, [field]: `⚠️ File is ${fileSizeMB.toFixed(2)}MB. It will be automatically compressed to under 2MB during upload.` });
            } else {
                setUploadStatus({ ...uploadStatus, [field]: `✓ File selected: ${file.name} (${fileSizeKB.toFixed(2)}KB)` });
            }
        } else {
            setUploadStatus({ ...uploadStatus, [field]: '' });
        }
        onFieldChange(field, file);
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Select Approvers (অনুমোদনকারী নির্বাচন)
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                    Select one or more approvers who will review and approve this application before it goes to Head Office.
                    <br />
                    একাধিক অনুমোদনকারী নির্বাচন করুন যারা হেড অফিসে যাওয়ার আগে এই আবেদনটি পর্যালোচনা এবং অনুমোদন করবে।
                </p>
            </div>

            {approvers.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800">No approvers available for your branch. Please contact administrator.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {approvers.map((approver) => (
                        <label
                            key={approver.id}
                            className="flex items-start p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                            <input
                                type="checkbox"
                                checked={selectedApprovers.includes(approver.id)}
                                onChange={() => onApproverToggle(approver.id)}
                                className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div className="ml-3 flex-1">
                                <div className="text-sm font-medium text-gray-900">{approver.name}</div>
                                <div className="text-sm text-gray-500">{approver.email}</div>
                                <div className="flex gap-2 mt-1">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                                        {approver.role.name}
                                    </span>
                                    {approver.level && (
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                                            approver.level === 'Branch' ? 'bg-green-100 text-green-800' :
                                            approver.level === 'Area' ? 'bg-purple-100 text-purple-800' :
                                            'bg-orange-100 text-orange-800'
                                        }`}>
                                            {approver.level}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </label>
                    ))}
                </div>
            )}

            {errors.selected_approvers && (
                <p className="text-sm text-red-600 mt-1">{errors.selected_approvers}</p>
            )}

            {selectedApprovers.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                        <strong>{selectedApprovers.length}</strong> approver(s) selected.
                        They will review in sequence before sending to Head Office.
                    </p>
                </div>
            )}

            {/* Additional Information Fields */}
            <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Additional Information (অতিরিক্ত তথ্য)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Interviewer Name (সাক্ষাৎকারকারীর নাম)
                        </label>
                        <input
                            type="text"
                            value={interviewerName}
                            onChange={(e) => onFieldChange('interviewer_name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Employee Name (গ্রাহক অন্তর্ভুক্তিকালীন কর্মকর্তার নাম)
                        </label>
                        <input
                            type="text"
                            value={employeeName}
                            onChange={(e) => onFieldChange('employee_name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Other Loan Information (অন্যান্য টাকার তথ্য)
                        </label>
                        <textarea
                            value={otherLoanInfo}
                            onChange={(e) => onFieldChange('other_loan_info', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Collector Comment (কালেক্টর মন্তব্য)
                        </label>
                        <textarea
                            value={collectorComment}
                            onChange={(e) => onFieldChange('collector_comment', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Guardian Name (অভিভাবকের নাম)
                        </label>
                        <input
                            type="text"
                            value={guardianName}
                            onChange={(e) => onFieldChange('guardian_name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* Document Uploads Section */}
            <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Document Uploads (ডকুমেন্ট আপলোড)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Customer Photo - Required */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Customer Photo <span className="text-red-500">*</span> (গ্রাহকের ছবি)
                        </label>
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/jpg"
                            onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                handleFileChange('customer_photo', file);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {uploadStatus.customer_photo && (
                            <p className="text-xs text-blue-600 mt-1">{uploadStatus.customer_photo}</p>
                        )}
                        {errors.customer_photo && (
                            <p className="text-sm text-red-600 mt-1">❌ {errors.customer_photo}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            📸 Upload customer's passport-size photo (JPG, PNG - Max: 10MB)<br />
                            ℹ️ Images will be automatically compressed to under 2MB
                        </p>
                    </div>

                    {/* Customer NID Photo - Required */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Customer NID Photo <span className="text-red-500">*</span> (গ্রাহকের জাতীয় পরিচয়পত্রের ছবি)
                        </label>
                        <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,image/jpg,application/pdf"
                            onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                handleFileChange('customer_nid_photo', file);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {uploadStatus.customer_nid_photo && (
                            <p className="text-xs text-blue-600 mt-1">{uploadStatus.customer_nid_photo}</p>
                        )}
                        {errors.customer_nid_photo && (
                            <p className="text-sm text-red-600 mt-1">❌ {errors.customer_nid_photo}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            📄 Upload customer's NID card (JPG, PNG, PDF - Max: 10MB)<br />
                            ℹ️ Images will be automatically compressed. PDFs will be uploaded as-is.
                        </p>
                    </div>

                    {/* Guardian Photo - Optional */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Guardian Photo (Optional) (অভিভাবকের ছবি - ঐচ্ছিক)
                        </label>
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/jpg"
                            onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                handleFileChange('guardian_photo', file);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {uploadStatus.guardian_photo && (
                            <p className="text-xs text-blue-600 mt-1">{uploadStatus.guardian_photo}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            📸 Upload guardian's photo (JPG, PNG - Max: 10MB)
                        </p>
                    </div>

                    {/* Guardian NID Photo - Optional */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Guardian NID Photo (Optional) (অভিভাবকের জাতীয় পরিচয়পত্রের ছবি - ঐচ্ছিক)
                        </label>
                        <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,image/jpg,application/pdf"
                            onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                handleFileChange('guardian_nid_photo', file);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {uploadStatus.guardian_nid_photo && (
                            <p className="text-xs text-blue-600 mt-1">{uploadStatus.guardian_nid_photo}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            📄 Upload guardian's NID card (JPG, PNG, PDF - Max: 10MB)
                        </p>
                    </div>

                    {/* Applicant Signature - Optional */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Applicant Signature (Optional) (আবেদনকারীর স্বাক্ষর - ঐচ্ছিক)
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                handleFileChange('applicant_signature', file);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {uploadStatus.applicant_signature && (
                            <p className="text-xs text-blue-600 mt-1">{uploadStatus.applicant_signature}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            ✍️ Upload applicant's signature image (JPG, PNG, etc.)
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
