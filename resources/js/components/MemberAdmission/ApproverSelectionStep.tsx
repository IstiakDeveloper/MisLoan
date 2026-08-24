import React, { useState, useRef } from 'react';
import {
    Camera,
    Upload,
    FileText,
    Trash2,
    CheckCircle,
    AlertCircle,
    User,
    CreditCard,
    Shield,
    Sparkles,
    RefreshCw,
} from 'lucide-react';
import { prepareAdmissionUploadFile } from '@/utils/imageUpload';

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
    hideApproverSelection?: boolean;
    interviewerName: string;
    employeeName: string;
    guardianName: string;
    otherLoanInfo: string;
    requestedLoanAmount?: number | string;
    projectName?: string;
    estimatedAnnualProjectIncome?: number | string;
    collectorComment: string;
    customerPhoto: File | string | null;
    customerNidPhoto: File | string | null;
    customerNidBackPhoto?: File | string | null;
    nidBothSides?: boolean;
    guardianPhoto: File | string | null;
    guardianNidPhoto: File | string | null;
    applicantSignature: File | string | null;
    onFieldChange: (field: string, value: string | File | boolean | null) => void;
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
    requestedLoanAmount = '',
    projectName = '',
    estimatedAnnualProjectIncome = '',
    collectorComment,
    customerPhoto,
    customerNidPhoto,
    customerNidBackPhoto = null,
    nidBothSides = false,
    guardianPhoto,
    guardianNidPhoto,
    applicantSignature,
    onFieldChange,
    errors,
}: Props) {
    const [uploadStatus, setUploadStatus] = useState<{ [key: string]: string }>({});
    const [previewUrls, setPreviewUrls] = useState<{ [key: string]: string }>({});

    const handleFileChange = async (field: string, file: File | null) => {
        if (!file) {
            if (previewUrls[field]?.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrls[field]);
            }
            setUploadStatus((prev) => ({ ...prev, [field]: '' }));
            setPreviewUrls((prev) => ({ ...prev, [field]: '' }));
            onFieldChange(field, null);
            return;
        }

        setUploadStatus((prev) => ({
            ...prev,
            [field]: '⏳ ছবি প্রসেস/কম্প্রেস হচ্ছে… অনুগ্রহ করে অপেক্ষা করুন।',
        }));

        const isNidOrDoc = field.includes('nid');
        const result = await prepareAdmissionUploadFile(file, {
            maxWidth: isNidOrDoc ? 1280 : 800,
        });

        if (!result.ok) {
            // Do not attach the bad file — keep whatever was already saved/selected
            setUploadStatus((prev) => ({ ...prev, [field]: `❌ ${result.error}` }));
            return;
        }

        if (previewUrls[field]?.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrls[field]);
        }

        const nextPreview =
            result.file.type.startsWith('image/')
                ? URL.createObjectURL(result.file)
                : '';

        setUploadStatus((prev) => ({ ...prev, [field]: result.message }));
        setPreviewUrls((prev) => ({ ...prev, [field]: nextPreview }));
        onFieldChange(field, result.file);
    };

    // Helper to get image preview source
    const getPreviewSource = (field: string, propVal: File | string | null) => {
        if (previewUrls[field]) return previewUrls[field];
        if (typeof propVal === 'string' && propVal.trim() !== '') {
            return propVal.startsWith('http') || propVal.startsWith('blob:')
                ? propVal
                : `/storage/${propVal}`;
        }
        return null;
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
                            </p>
                        </div>
                    )}

                    <div className="border-t pt-6 mt-6" />
                </>
            )}

            {/* Additional Information Fields */}
            <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <span>Additional Information (অতিরিক্ত তথ্য)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            ২১. সদস্য অন্তর্ভূক্তিকালীন কর্মকর্তার নাম (Interviewer/Employee Name)
                        </label>
                        <input
                            type="text"
                            value={interviewerName}
                            onChange={(e) => onFieldChange('interviewer_name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
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
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            ঋণ চাহিদা (Requested Loan Amount)
                        </label>
                        <input
                            type="number"
                            placeholder="0.00"
                            value={requestedLoanAmount === 0 ? '' : requestedLoanAmount}
                            onChange={(e) => onFieldChange('requested_loan_amount', e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            প্রকল্পের নাম (Project Name)
                        </label>
                        <input
                            type="text"
                            placeholder="প্রকল্পের নাম লিখুন"
                            value={projectName}
                            onChange={(e) => onFieldChange('project_name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            প্রকল্প থেকে বাৎসরিক আয় সম্ভাব্য (Estimated Annual Project Income)
                        </label>
                        <input
                            type="number"
                            placeholder="0.00"
                            value={estimatedAnnualProjectIncome === 0 ? '' : estimatedAnnualProjectIncome}
                            onChange={(e) => onFieldChange('estimated_annual_project_income', e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            ২৩. তথ্য সংগ্রহকারীর মন্তব্য: উল্লিখিত পরিবার কি মৌসুমী ক্ষুদ্রঋণ কর্মসূচির সদস্য হওয়ার যোগ্য? (মন্তব্য লিখুন)
                        </label>
                        <textarea
                            value={collectorComment}
                            onChange={(e) => onFieldChange('collector_comment', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            অভিভাবকের নাম (Guardian Name)
                        </label>
                        <input
                            type="text"
                            value={guardianName}
                            onChange={(e) => onFieldChange('guardian_name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* ── DOCUMENT UPLOADS ─────────────────────────────────── */}
            <div className="border-t border-slate-200/80 pt-6 mt-8">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white">
                                <Upload className="h-3.5 w-3.5" />
                            </span>
                            <h3 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
                                Document Uploads
                                <span className="ml-1.5 font-medium text-slate-500">(ডকুমেন্ট আপলোড)</span>
                            </h3>
                        </div>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 sm:text-xs">
                            ক্যামেরা বা গ্যালারি থেকে আপলোড করুন · JPG / PNG / PDF · সর্বোচ্চ ১০MB (অটোকম্প্রেস)
                        </p>
                    </div>
                    <div className="inline-flex items-center gap-1.5 self-start rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600 sm:self-auto">
                        <Camera className="h-3 w-3 text-slate-500" />
                        ডিভাইস ক্যামেরা সাপোর্টেড
                    </div>
                </div>

                <div className="mb-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <input
                        type="checkbox"
                        id="nid_both_sides"
                        checked={!!nidBothSides}
                        onChange={(e) => {
                            const checked = e.target.checked;
                            onFieldChange('nid_both_sides', checked);
                            if (!checked) {
                                handleFileChange('customer_nid_back_photo', null);
                            }
                        }}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-slate-800 focus:ring-slate-400"
                    />
                    <label
                        htmlFor="nid_both_sides"
                        className="cursor-pointer select-none text-[11px] font-semibold text-slate-700 sm:text-xs"
                    >
                        দুই পাশের NID ছবি দিতে চাই
                        <span className="ml-1 font-normal text-slate-500">
                            — চেক করলে সামনের ও পেছনের দুইটি স্লট দেখাবে
                        </span>
                    </label>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    <DocumentUploadCard
                        title="সদস্যের ছবি"
                        subTitle="পাসপোর্ট সাইজ"
                        required={false}
                        fieldKey="customer_photo"
                        fileValue={customerPhoto}
                        previewSrc={getPreviewSource('customer_photo', customerPhoto)}
                        error={errors.customer_photo}
                        statusMsg={uploadStatus.customer_photo}
                        accept="image/jpeg,image/png,image/jpg,image/webp"
                        icon={<User className="h-3.5 w-3.5" />}
                        accent="blue"
                        onFileSelect={(file) => handleFileChange('customer_photo', file)}
                    />

                    <DocumentUploadCard
                        title={nidBothSides ? 'NID — সামনের পাশ' : 'সদস্যের NID'}
                        subTitle={nidBothSides ? 'Front side' : 'ছবি বা PDF'}
                        required={true}
                        fieldKey="customer_nid_photo"
                        fileValue={customerNidPhoto}
                        previewSrc={getPreviewSource('customer_nid_photo', customerNidPhoto)}
                        error={errors.customer_nid_photo || errors.customer_nid_photo_path}
                        statusMsg={uploadStatus.customer_nid_photo}
                        accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                        icon={<CreditCard className="h-3.5 w-3.5" />}
                        accent="emerald"
                        onFileSelect={(file) => handleFileChange('customer_nid_photo', file)}
                    />

                    {nidBothSides ? (
                        <DocumentUploadCard
                            title="NID — পেছনের পাশ"
                            subTitle="Back side"
                            required={true}
                            fieldKey="customer_nid_back_photo"
                            fileValue={customerNidBackPhoto}
                            previewSrc={getPreviewSource(
                                'customer_nid_back_photo',
                                customerNidBackPhoto
                            )}
                            error={
                                errors.customer_nid_back_photo ||
                                errors.customer_nid_back_photo_path
                            }
                            statusMsg={uploadStatus.customer_nid_back_photo}
                            accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                            icon={<CreditCard className="h-3.5 w-3.5" />}
                            accent="teal"
                            onFileSelect={(file) =>
                                handleFileChange('customer_nid_back_photo', file)
                            }
                        />
                    ) : null}

                    <DocumentUploadCard
                        title="অভিভাবকের ছবি"
                        subTitle="প্রযোজ্য ক্ষেত্রে"
                        required={false}
                        fieldKey="guardian_photo"
                        fileValue={guardianPhoto}
                        previewSrc={getPreviewSource('guardian_photo', guardianPhoto)}
                        error={errors.guardian_photo}
                        statusMsg={uploadStatus.guardian_photo}
                        accept="image/jpeg,image/png,image/jpg,image/webp"
                        icon={<Shield className="h-3.5 w-3.5" />}
                        accent="violet"
                        onFileSelect={(file) => handleFileChange('guardian_photo', file)}
                    />

                    <DocumentUploadCard
                        title="অভিভাবকের NID"
                        subTitle="প্রযোজ্য ক্ষেত্রে"
                        required={false}
                        fieldKey="guardian_nid_photo"
                        fileValue={guardianNidPhoto}
                        previewSrc={getPreviewSource('guardian_nid_photo', guardianNidPhoto)}
                        error={errors.guardian_nid_photo}
                        statusMsg={uploadStatus.guardian_nid_photo}
                        accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                        icon={<CreditCard className="h-3.5 w-3.5" />}
                        accent="indigo"
                        onFileSelect={(file) => handleFileChange('guardian_nid_photo', file)}
                    />
                </div>
            </div>
        </div>
    );
}

{/* ── DOCUMENT UPLOAD CARD ─────────────────────────────────── */}
interface DocCardProps {
    title: string;
    subTitle: string;
    required?: boolean;
    fieldKey: string;
    fileValue: File | string | null;
    previewSrc: string | null;
    error?: string;
    statusMsg?: string;
    accept: string;
    icon: React.ReactNode;
    accent?: 'blue' | 'emerald' | 'teal' | 'violet' | 'indigo';
    onFileSelect: (file: File | null) => void;
}

const ACCENT = {
    blue: {
        icon: 'bg-blue-50 text-blue-700 ring-blue-100',
        empty: 'hover:border-blue-300 hover:bg-blue-50/40',
        btn: 'bg-slate-800 hover:bg-slate-900 text-white',
        cam: 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50',
    },
    emerald: {
        icon: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
        empty: 'hover:border-emerald-300 hover:bg-emerald-50/40',
        btn: 'bg-slate-800 hover:bg-slate-900 text-white',
        cam: 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50',
    },
    teal: {
        icon: 'bg-teal-50 text-teal-700 ring-teal-100',
        empty: 'hover:border-teal-300 hover:bg-teal-50/40',
        btn: 'bg-slate-800 hover:bg-slate-900 text-white',
        cam: 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50',
    },
    violet: {
        icon: 'bg-violet-50 text-violet-700 ring-violet-100',
        empty: 'hover:border-violet-300 hover:bg-violet-50/40',
        btn: 'bg-slate-800 hover:bg-slate-900 text-white',
        cam: 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50',
    },
    indigo: {
        icon: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
        empty: 'hover:border-indigo-300 hover:bg-indigo-50/40',
        btn: 'bg-slate-800 hover:bg-slate-900 text-white',
        cam: 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50',
    },
} as const;

function DocumentUploadCard({
    title,
    subTitle,
    required = false,
    fileValue,
    previewSrc,
    error,
    statusMsg,
    accept,
    icon,
    accent = 'blue',
    onFileSelect,
}: DocCardProps) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const cameraInputRef = useRef<HTMLInputElement | null>(null);
    const tone = ACCENT[accent];

    const openNativeCamera = () => {
        cameraInputRef.current?.click();
    };

    const isPdf =
        (fileValue instanceof File && fileValue.type === 'application/pdf') ||
        (typeof fileValue === 'string' && fileValue.toLowerCase().endsWith('.pdf'));

    const fileName =
        fileValue instanceof File
            ? fileValue.name
            : typeof fileValue === 'string' && fileValue.trim() !== ''
              ? fileValue.split('/').pop()
              : null;

    const hasFile = !!(previewSrc || isPdf || fileName);

    return (
        <div
            className={`flex h-full flex-col rounded-xl border bg-white p-3 transition-colors ${
                error
                    ? 'border-red-300 ring-1 ring-red-100'
                    : 'border-slate-200 hover:border-slate-300'
            }`}
        >
            <div className="mb-2.5 flex items-start gap-2">
                <span
                    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md ring-1 ${tone.icon}`}
                >
                    {icon}
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <h4 className="truncate text-xs font-semibold text-slate-900">{title}</h4>
                        {required ? (
                            <span className="rounded bg-red-50 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-red-600 ring-1 ring-red-100">
                                Required
                            </span>
                        ) : (
                            <span className="rounded bg-slate-50 px-1 py-px text-[9px] font-medium uppercase tracking-wide text-slate-400 ring-1 ring-slate-100">
                                Optional
                            </span>
                        )}
                    </div>
                    <p className="mt-0.5 truncate text-[10px] text-slate-500">{subTitle}</p>
                </div>
            </div>

            {error ? (
                <div className="mb-2 flex items-start gap-1.5 rounded-md bg-red-50 px-2 py-1.5 text-[10px] font-medium text-red-700 ring-1 ring-red-100">
                    <AlertCircle className="mt-px h-3 w-3 shrink-0" />
                    <span>{error}</span>
                </div>
            ) : null}

            {statusMsg && !error ? (
                <div
                    className={`mb-2 rounded-md px-2 py-1 text-[10px] ring-1 ${
                        statusMsg.startsWith('❌')
                            ? 'bg-red-50 text-red-700 ring-red-100'
                            : statusMsg.startsWith('⏳')
                              ? 'bg-amber-50 text-amber-800 ring-amber-100'
                              : 'bg-slate-50 text-slate-600 ring-slate-100'
                    }`}
                >
                    {statusMsg}
                </div>
            ) : null}

            {hasFile ? (
                <div className="mt-auto rounded-lg border border-slate-200 bg-slate-50/80 p-2">
                    <div className="flex gap-2">
                        {previewSrc && !isPdf ? (
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white">
                                <img
                                    src={previewSrc}
                                    alt={title}
                                    className="h-full w-full object-cover"
                                />
                            </div>
                        ) : (
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400">
                                <FileText className="h-5 w-5" />
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-800">
                                <CheckCircle className="h-3 w-3 shrink-0 text-emerald-600" />
                                <span className="truncate">{fileName || 'সংযুক্ত নথি'}</span>
                            </div>
                            <p className="mt-0.5 text-[10px] text-slate-500">
                                {fileValue instanceof File
                                    ? `${(fileValue.size / 1024).toFixed(0)} KB`
                                    : 'সংরক্ষিত'}
                            </p>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                                <button
                                    type="button"
                                    onClick={openNativeCamera}
                                    className="inline-flex items-center gap-1 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                                >
                                    <Camera className="h-3 w-3" />
                                    ক্যামেরা
                                </button>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="inline-flex items-center gap-1 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                                >
                                    <RefreshCw className="h-3 w-3" />
                                    পরিবর্তন
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onFileSelect(null)}
                                    className="inline-flex items-center gap-1 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-50"
                                >
                                    <Trash2 className="h-3 w-3" />
                                    রিমুভ
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div
                    className={`mt-auto rounded-lg border border-dashed border-slate-300 bg-slate-50/40 px-2.5 py-3 text-center transition-colors ${tone.empty}`}
                >
                    <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-slate-200">
                        <Upload className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-[10px] font-medium text-slate-600">ফাইল আপলোড করুন</p>
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                        <button
                            type="button"
                            onClick={openNativeCamera}
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition ${tone.cam}`}
                        >
                            <Camera className="h-3 w-3" />
                            ক্যামেরা
                        </button>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold shadow-sm transition ${tone.btn}`}
                        >
                            <Upload className="h-3 w-3" />
                            গ্যালারি
                        </button>
                    </div>
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    onFileSelect(file);
                    e.target.value = '';
                }}
                className="hidden"
            />
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    onFileSelect(file);
                    e.target.value = '';
                }}
                className="hidden"
            />
        </div>
    );
}
