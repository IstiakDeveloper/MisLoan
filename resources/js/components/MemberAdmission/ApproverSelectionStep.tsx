import React, { useState, useRef, useEffect } from 'react';
import {
    Camera,
    Upload,
    FileText,
    Trash2,
    X,
    CheckCircle,
    AlertCircle,
    User,
    CreditCard,
    PenTool,
    Shield,
    Sparkles,
    RefreshCw,
    Eye
} from 'lucide-react';

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
    requestedLoanAmount = '',
    projectName = '',
    estimatedAnnualProjectIncome = '',
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

    // Live Camera state
    const [activeCameraField, setActiveCameraField] = useState<string | null>(null);
    const [cameraTitle, setCameraTitle] = useState<string>('');
    const [cameraError, setCameraError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const handleFileChange = (field: string, file: File | null) => {
        const nextStatus = { ...uploadStatus };
        const nextPreview = { ...previewUrls };

        if (file) {
            const fileSizeMB = file.size / 1048576;
            const fileSizeKB = file.size / 1024;

            if (file.size > 10485760) {
                nextStatus[field] = `❌ ফাইল সাইজ অনেক বড় (${fileSizeMB.toFixed(2)}MB)। সর্বোচ্চ ১০MB অনুমোদিত।`;
            } else if (file.size > 2097152) {
                nextStatus[field] = `⚠️ ফাইলটি ${fileSizeMB.toFixed(2)}MB। আপলোডের সময় অটোকম্প্রেস হয়ে ২MB এর নিচে নেমে যাবে।`;
            } else {
                nextStatus[field] = `✓ সফল নির্বাচন: (${fileSizeKB.toFixed(1)} KB)`;
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

    // Camera Stream Controls
    const openCameraModal = async (field: string, title: string) => {
        setActiveCameraField(field);
        setCameraTitle(title);
        setCameraError(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err: any) {
            setCameraError('ক্যামেরা চালু করা সম্ভব হয়নি। ডিভাইসের ব্রাউজার পারমিশন নিশ্চিত করুন।');
        }
    };

    const closeCameraModal = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        setActiveCameraField(null);
        setCameraError(null);
    };

    const capturePhotoFromCamera = () => {
        if (!videoRef.current || !activeCameraField) return;
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], `${activeCameraField}_cam_${Date.now()}.jpg`, {
                        type: 'image/jpeg',
                    });
                    handleFileChange(activeCameraField, file);
                    closeCameraModal();
                }
            }, 'image/jpeg', 0.9);
        }
    };

    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

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

            {/* ── PROFESSIONAL DOCUMENT UPLOADS SECTION ─────────────────────────────────── */}
            <div className="border-t border-gray-200 pt-6 mt-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                    <div>
                        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                            <Upload className="w-6 h-6 text-blue-600" />
                            <span>Document Uploads (ডকুমেন্ট আপলোড)</span>
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            ছবি বা NID কার্ড সরাসরি ফাইল গ্যালারি থেকে সিলেক্ট করুন অথবা লাইভ ক্যামেরা দিয়ে ছবি তুলুন।
                        </p>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold shrink-0">
                        <Camera className="w-4 h-4 text-blue-600" />
                        <span>লাইভ ক্যামেরা সাপোর্টেড</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 1. Member Photo (Optional) */}
                    <DocumentUploadCard
                        title="Member Photo (সদস্যের ছবি)"
                        subTitle="সদস্যের সাম্প্রতিক রঙিন পাসপোর্ট সাইজ ছবি"
                        required={false}
                        fieldKey="customer_photo"
                        fileValue={customerPhoto}
                        previewSrc={getPreviewSource('customer_photo', customerPhoto)}
                        error={errors.customer_photo}
                        statusMsg={uploadStatus.customer_photo}
                        accept="image/jpeg,image/png,image/jpg"
                        icon={<User className="w-5 h-5 text-blue-600" />}
                        onFileSelect={(file) => handleFileChange('customer_photo', file)}
                        onOpenCamera={() => openCameraModal('customer_photo', 'সদস্যের ছবি')}
                    />

                    {/* 2. Member NID Photo (REQUIRED) */}
                    <DocumentUploadCard
                        title="Member NID Photo (সদস্যের NID ছবি)"
                        subTitle="জাতীয় পরিচয়পত্রের স্পষ্ট ছবি বা PDF"
                        required={true}
                        fieldKey="customer_nid_photo"
                        fileValue={customerNidPhoto}
                        previewSrc={getPreviewSource('customer_nid_photo', customerNidPhoto)}
                        error={errors.customer_nid_photo || errors.customer_nid_photo_path}
                        statusMsg={uploadStatus.customer_nid_photo}
                        accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,image/jpg,application/pdf"
                        icon={<CreditCard className="w-5 h-5 text-emerald-600" />}
                        onFileSelect={(file) => handleFileChange('customer_nid_photo', file)}
                        onOpenCamera={() => openCameraModal('customer_nid_photo', 'সদস্যের NID ছবি')}
                    />

                    {/* 3. Guardian Photo (Optional) */}
                    <DocumentUploadCard
                        title="Guardian Photo (অভিভাবকের ছবি)"
                        subTitle="অভিভাবকের ছবি (প্রযোজ্য ক্ষেত্রে)"
                        required={false}
                        fieldKey="guardian_photo"
                        fileValue={guardianPhoto}
                        previewSrc={getPreviewSource('guardian_photo', guardianPhoto)}
                        error={errors.guardian_photo}
                        statusMsg={uploadStatus.guardian_photo}
                        accept="image/jpeg,image/png,image/jpg"
                        icon={<Shield className="w-5 h-5 text-purple-600" />}
                        onFileSelect={(file) => handleFileChange('guardian_photo', file)}
                        onOpenCamera={() => openCameraModal('guardian_photo', 'অভিভাবকের ছবি')}
                    />

                    {/* 4. Guardian NID Photo (Optional) */}
                    <DocumentUploadCard
                        title="Guardian NID Photo (অভিভাবকের NID)"
                        subTitle="অভিভাবকের জাতীয় পরিচয়পত্র (প্রযোজ্য ক্ষেত্রে)"
                        required={false}
                        fieldKey="guardian_nid_photo"
                        fileValue={guardianNidPhoto}
                        previewSrc={getPreviewSource('guardian_nid_photo', guardianNidPhoto)}
                        error={errors.guardian_nid_photo}
                        statusMsg={uploadStatus.guardian_nid_photo}
                        accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,image/jpg,application/pdf"
                        icon={<CreditCard className="w-5 h-5 text-indigo-600" />}
                        onFileSelect={(file) => handleFileChange('guardian_nid_photo', file)}
                        onOpenCamera={() => openCameraModal('guardian_nid_photo', 'অভিভাবকের NID')}
                    />
                </div>
            </div>

            {/* ── INTERACTIVE LIVE CAMERA STREAM MODAL ─────────────────────────────────── */}
            {activeCameraField && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
                    <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
                                    <Camera className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-base font-bold text-white">{cameraTitle}</h4>
                                    <p className="text-xs text-slate-400">ক্যামেরার সামনে সাবজেক্টটি সোজা রাখুন</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={closeCameraModal}
                                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Video Feed Area */}
                        <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
                            {cameraError ? (
                                <div className="p-6 text-center text-red-400 space-y-2">
                                    <AlertCircle className="w-10 h-10 mx-auto text-red-500" />
                                    <p className="text-sm font-semibold">{cameraError}</p>
                                </div>
                            ) : (
                                <>
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="h-full w-full object-cover"
                                    />
                                    {/* Focus guide overlay */}
                                    <div className="absolute inset-8 border-2 border-dashed border-white/40 rounded-2xl pointer-events-none flex items-center justify-center">
                                        <span className="text-[10px] uppercase font-bold tracking-widest text-white/50 bg-black/40 px-2 py-1 rounded">
                                            Frame Subject
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Action Controls */}
                        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-t border-slate-800">
                            <button
                                type="button"
                                onClick={closeCameraModal}
                                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
                            >
                                বাতিল
                            </button>

                            {!cameraError && (
                                <button
                                    type="button"
                                    onClick={capturePhotoFromCamera}
                                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-blue-600/40 active:scale-95 transition-all"
                                >
                                    <Camera className="w-5 h-5" />
                                    <span>ছবি তুলুন (Snap)</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

{/* ── PROFESSIONAL DOCUMENT UPLOAD CARD COMPONENT ─────────────────────────────────── */}
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
    onFileSelect: (file: File | null) => void;
    onOpenCamera: () => void;
}

function DocumentUploadCard({
    title,
    subTitle,
    required = false,
    fieldKey,
    fileValue,
    previewSrc,
    error,
    statusMsg,
    accept,
    icon,
    onFileSelect,
    onOpenCamera,
}: DocCardProps) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const cameraInputRef = useRef<HTMLInputElement | null>(null);

    const isPdf =
        (fileValue instanceof File && fileValue.type === 'application/pdf') ||
        (typeof fileValue === 'string' && fileValue.toLowerCase().endsWith('.pdf'));

    const fileName =
        fileValue instanceof File
            ? fileValue.name
            : typeof fileValue === 'string' && fileValue.trim() !== ''
            ? fileValue.split('/').pop()
            : null;

    return (
        <div
            className={`group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md transition-all duration-200 ${
                error
                    ? 'border-red-500 bg-red-50/30 ring-2 ring-red-200'
                    : 'border-slate-200 hover:border-blue-400'
            }`}
        >
            {/* Header: Title & Badges */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        {icon}
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 leading-snug flex items-center gap-1.5">
                            <span>{title}</span>
                            {required ? (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold border border-red-200">
                                    বাধ্যতামূলক *
                                </span>
                            ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                                    ঐচ্ছিক
                                </span>
                            )}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">{subTitle}</p>
                    </div>
                </div>
            </div>

            {/* Error Banner if validation fails */}
            {error && (
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-red-700 bg-red-100/90 p-2.5 rounded-xl border border-red-200">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{error}</span>
                </div>
            )}

            {/* Status info */}
            {statusMsg && !error && (
                <div className="mb-3 text-xs text-blue-700 bg-blue-50/80 px-3 py-1.5 rounded-lg border border-blue-200">
                    {statusMsg}
                </div>
            )}

            {/* Main File Box / Preview State */}
            {previewSrc || isPdf || fileName ? (
                <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                    <div className="flex items-center gap-3">
                        {/* Thumbnail / Icon */}
                        {previewSrc && !isPdf ? (
                            <div className="relative h-20 w-24 rounded-lg overflow-hidden border border-slate-300 bg-white shrink-0 shadow-inner">
                                <img
                                    src={previewSrc}
                                    alt={title}
                                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                            </div>
                        ) : (
                            <div className="h-16 w-16 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200">
                                <FileText className="w-8 h-8" />
                            </div>
                        )}

                        {/* Details & Actions */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 truncate">
                                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span className="truncate">{fileName || 'সংযুক্ত নথি'}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                {fileValue instanceof File
                                    ? `${(fileValue.size / 1024).toFixed(1)} KB`
                                    : 'নথি আপলোড করা আছে'}
                            </p>

                            <div className="flex items-center gap-2 mt-2.5">
                                <button
                                    type="button"
                                    onClick={onOpenCamera}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 text-[11px] font-semibold text-slate-700 transition shadow-xs"
                                >
                                    <Camera className="w-3.5 h-3.5 text-blue-600" />
                                    <span>ক্যামেরা</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 transition shadow-xs"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    <span>পরিবর্তন</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onFileSelect(null)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-red-200 hover:bg-red-50 text-[11px] font-semibold text-red-600 transition shadow-xs"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>রিমুভ</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Empty Upload Zone */
                <div className="rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/30 p-5 text-center transition-all duration-200">
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700 mb-1">
                        নথি বা ছবির ফাইল সিলেক্ট করুন
                    </p>
                    <p className="text-[11px] text-slate-500 mb-3">
                        JPG, PNG, PDF (সর্বোচ্চ ১০MB)
                    </p>

                    {/* Dual Action Buttons: Camera & Gallery */}
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                            type="button"
                            onClick={onOpenCamera}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 active:scale-95 transition-all"
                        >
                            <Camera className="w-4 h-4" />
                            <span>ক্যামেরা দিয়ে তুলুন</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-md active:scale-95 transition-all"
                        >
                            <Upload className="w-4 h-4" />
                            <span>ফাইল / গ্যালারি</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Hidden File Input for Browsing */}
            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    onFileSelect(file);
                }}
                className="hidden"
            />

            {/* Native Mobile Camera Input */}
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    onFileSelect(file);
                }}
                className="hidden"
            />
        </div>
    );
}
