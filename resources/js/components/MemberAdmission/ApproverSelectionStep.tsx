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
    /** When true, only show additional info and documents (no approver selection). Used when submit goes to branch manager only. */
    hideApproverSelection?: boolean;
    interviewerName: string;
    employeeName: string;
    guardianName: string;
    otherLoanInfo: string;
    collectorComment: string;
    customerPhoto: File | string | null;
    customerNidPhoto: File | string | null;
    guardianPhoto: File | string | null;
    guardianNidPhoto: File | string | null;
    applicantSignature: File | string | null;
    onFieldChange: (field: string, value: string | File | null) => void;
    errors: any;
}

export default function ApproverSelectionStep({
    approvers,
    selectedApprovers,
    onApproverToggle,
    hideApproverSelection = false,
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
    const [previewUrls, setPreviewUrls] = useState<{ [key: string]: string }>({});

    const handleFileChange = (field: string, file: File | null) => {
        const nextStatus = { ...uploadStatus };
        const nextPreview = { ...previewUrls };

        if (file) {
            const fileSizeMB = file.size / 1048576;
            const fileSizeKB = file.size / 1024;

            // Check file size (10MB = 10485760 bytes)
            if (file.size > 10485760) {
                nextStatus[field] = `❌ File is too large (${fileSizeMB.toFixed(2)}MB). Maximum 10MB allowed.`;
            } else if (file.size > 2097152) {
                nextStatus[field] = `⚠️ File is ${fileSizeMB.toFixed(2)}MB. It will be automatically compressed to under 2MB during upload.`;
            } else {
                nextStatus[field] = `✓ File selected: ${file.name} (${fileSizeKB.toFixed(2)}KB)`;
            }

            if (file.type.startsWith('image/')) {
                nextPreview[field] = URL.createObjectURL(file);
            } else {
                nextPreview[field] = '';
            }
        } else {
            nextStatus[field] = '';
            nextPreview[field] = '';
        }

        setUploadStatus(nextStatus);
        setPreviewUrls(nextPreview);
        onFieldChange(field, file);
    };

    return (
        <div className="space-y-6">
            {!hideApproverSelection && (
                <>
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

                    <div className="border-t pt-6 mt-6" />
                </>
            )}

            {/* Additional Information Fields */}
            <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Additional Information (অতিরিক্ত তথ্য)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            ২১. গ্রাহক অন্তর্ভূক্তিকালীন কর্মকর্তার নাম (Interviewer/Employee Name) (সাক্ষাৎকারকারীর নাম)
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
                            পিন নং (প্রযোজ্য)
                        </label>
                        <input
                            type="text"
                            value={employeeName}
                            onChange={(e) => onFieldChange('employee_name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="কর্মকর্তার পিন"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            ২২. অন্যান্য সংস্থা হতে ঋণ গ্রহণের তথ্য
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
                            ২৩. তথ্য সংগ্রহকারীর মন্তব্য: উল্লিখিত পরিবার কি মৌসুমী ক্ষুদ্রঋণ কর্মসূচির গ্রাহক হওয়ার যোগ্য? (মন্তব্য লিখুন)
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
                            অভিভাবকের নাম (Guardian Name)
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
                    {/* Customer Photo - Optional */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Customer Photo (গ্রাহকের ছবি)
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
                        {previewUrls.customer_photo && (
                            <div className="mt-2">
                                <img
                                    src={previewUrls.customer_photo}
                                    alt="Customer preview"
                                    className="h-24 w-24 rounded-md border object-cover"
                                />
                            </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            📸 Upload customer's passport-size photo (JPG, PNG - Max: 10MB)<br />
                            ℹ️ Images will be automatically compressed to under 2MB
                        </p>
                    </div>

                    {/* Customer NID Photo - Optional */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Customer NID Photo (গ্রাহকের জাতীয় পরিচয়পত্রের ছবি)
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
                        {previewUrls.customer_nid_photo && (
                            <div className="mt-2">
                                <img
                                    src={previewUrls.customer_nid_photo}
                                    alt="Customer NID preview"
                                    className="h-24 w-24 rounded-md border object-cover"
                                />
                            </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            📄 Upload customer's NID card (JPG, PNG, PDF - Max: 10MB)<br />
                            ℹ️ Images will be automatically compressed. PDFs will be uploaded as-is.
                        </p>
                    </div>

                    {/* Guardian Photo - Optional */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Guardian Photo (অভিভাবকের ছবি)
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
                        {previewUrls.guardian_photo && (
                            <div className="mt-2">
                                <img
                                    src={previewUrls.guardian_photo}
                                    alt="Guardian preview"
                                    className="h-24 w-24 rounded-md border object-cover"
                                />
                            </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            📸 Upload guardian's photo (JPG, PNG - Max: 10MB)
                        </p>
                    </div>

                    {/* Guardian NID Photo - Optional */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Guardian NID Photo (অভিভাবকের জাতীয় পরিচয়পত্রের ছবি)
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
                        {previewUrls.guardian_nid_photo && (
                            <div className="mt-2">
                                <img
                                    src={previewUrls.guardian_nid_photo}
                                    alt="Guardian NID preview"
                                    className="h-24 w-24 rounded-md border object-cover"
                                />
                            </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            📄 Upload guardian's NID card (JPG, PNG, PDF - Max: 10MB)
                        </p>
                    </div>

                    {/* Applicant Signature - Optional */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Applicant Signature (আবেদনকারীর স্বাক্ষর)
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
                        {previewUrls.applicant_signature && (
                            <div className="mt-2">
                                <img
                                    src={previewUrls.applicant_signature}
                                    alt="Applicant signature preview"
                                    className="h-16 rounded-md border object-contain"
                                />
                            </div>
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
