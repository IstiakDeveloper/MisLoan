import axios from 'axios';
import {
    AlertCircle,
    Camera,
    CheckCircle2,
    ChevronRight,
    FileImage,
    Flashlight,
    History,
    RefreshCw,
    ScanLine,
    ShieldCheck,
    Sparkles,
    Upload,
    X,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { prepareAdmissionUploadFile } from '@/utils/imageUpload';
import { checkAdmissionUnique } from '@/utils/checkAdmissionUnique';
import { runLocalTesseractNidOcr } from '@/utils/localNidOcr';
import {
    NidQualityResult,
    analyzeCanvasQuality,
    captureCroppedCardFromVideo,
    prepareNidOcrImage,
    validateUploadedNidFile,
} from '@/utils/nidImageQuality';

export interface NidOcrExtractedData {
    card_type: string;
    readability_score: number;
    applicant_name_bn: string;
    applicant_name_en: string;
    father_name_bn: string;
    spouse_name_bn: string;
    mother_name_bn: string;
    marital_status: string;
    nid_number: string;
    smart_card_number: string;
    date_of_birth: string;
    gender: string;
    address: {
        raw_address_bn: string;
        division_hint: string;
        district_hint: string;
        upazila_hint: string;
        union_or_ward: string;
        village_or_road: string;
        post_code: string;
    };
}

export interface NidOcrSuccessPayload {
    extracted: NidOcrExtractedData;
    duplicateWarnings: Record<string, string>;
    frontFile: File;
    backFile: File | null;
}

interface Props {
    open: boolean;
    provider?: 'auto' | 'google_vision' | 'groq' | 'openrouter' | 'gemini' | 'python_service' | 'local';
    hasExistingDraft: boolean;
    onResumeDraft: () => void;
    onSkipManual: () => void;
    onSuccess: (payload: NidOcrSuccessPayload) => void;
    onCancel: () => void;
}

type ModalStage = 'choose' | 'camera' | 'processing' | 'failed' | 'verified';

export default function NidOcrModal({
    open,
    provider = 'auto',
    hasExistingDraft,
    onResumeDraft,
    onSkipManual,
    onSuccess,
    onCancel,
}: Props) {
    const [stage, setStage] = useState<ModalStage>('choose');
    const [combinedMode, setCombinedMode] = useState(false);
    const [scanSide, setScanSide] = useState<'front' | 'back'>('front');
    const [frontFile, setFrontFile] = useState<File | null>(null);
    const [backFile, setBackFile] = useState<File | null>(null);
    const [frontPreview, setFrontPreview] = useState<string>('');
    const [backPreview, setBackPreview] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [liveQuality, setLiveQuality] = useState<NidQualityResult | null>(null);
    const [torchOn, setTorchOn] = useState(false);
    const [torchSupported, setTorchSupported] = useState(false);
    const [autoCapture, setAutoCapture] = useState(false);
    const [ocrPayload, setOcrPayload] = useState<NidOcrSuccessPayload | null>(null);
    const [ocrProgress, setOcrProgress] = useState<number>(0);
    const [processingHint, setProcessingHint] = useState<string>('অনুগ্রহ করে অপেক্ষা করুন');

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const frontInputRef = useRef<HTMLInputElement | null>(null);
    const backInputRef = useRef<HTMLInputElement | null>(null);
    const goodStreakRef = useRef(0);
    const capturingRef = useRef(false);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        setTorchOn(false);
        setTorchSupported(false);
        goodStreakRef.current = 0;
    }, []);

    useEffect(() => {
        if (!open) {
            stopCamera();
        }
        return () => stopCamera();
    }, [open, stopCamera]);

    const runServerOcr = useCallback(
        async (front: File, back: File | null) => {
            stopCamera();
            setStage('processing');
            setErrorMessage('');
            setOcrProgress(8);
            setProcessingHint('ছবি সার্ভারে পাঠানো হচ্ছে...');

            let progressTimer: number | null = null;
            const clearProgressTimer = () => {
                if (progressTimer !== null) {
                    window.clearInterval(progressTimer);
                    progressTimer = null;
                }
            };

            const tryLocalFallback = async () => {
                setProcessingHint(
                    provider === 'local'
                        ? 'অফলাইন OCR চলছে — অনুগ্রহ করে অপেক্ষা করুন...'
                        : 'অনলাইন AI ব্যস্ত/অফলাইন — আপনার ডিভাইসেই OCR চলছে...'
                );
                try {
                    const localRes = await runLocalTesseractNidOcr(front, back, (pct) => {
                        setOcrProgress(pct);
                        setProcessingHint(`অফলাইন OCR চলছে (${pct}%) — অনুগ্রহ করে অপেক্ষা করুন`);
                    });

                    if (!localRes.ok) {
                        setErrorMessage(localRes.message);
                        setStage('failed');
                        return;
                    }

                    let duplicateWarnings: Record<string, string> = {};
                    try {
                        duplicateWarnings = await checkAdmissionUnique({
                            nid_number: localRes.data.nid_number || undefined,
                            smart_card_number: localRes.data.smart_card_number || undefined,
                        });
                    } catch {
                        // Ignore network check failure offline
                    }

                    if (navigator.vibrate) {
                        navigator.vibrate([40, 30, 60]);
                    }

                    setOcrPayload({
                        extracted: localRes.data,
                        duplicateWarnings,
                        frontFile: front,
                        backFile: back,
                    });
                    setStage('verified');
                } catch {
                    setErrorMessage(
                        'NID যাচাই করা যায়নি। অনুগ্রহ করে পরিষ্কার আলোতে কার্ডটি সোজা ধরে আবার চেষ্টা করুন।'
                    );
                    setStage('failed');
                }
            };

            if (provider === 'local') {
                await tryLocalFallback();
                return;
            }

            try {
                const formData = new FormData();
                formData.append('front_image', front);
                if (back) {
                    formData.append('back_image', back);
                }

                progressTimer = window.setInterval(() => {
                    setOcrProgress((prev) => {
                        const next = prev < 35 ? prev + 5 : prev < 75 ? prev + 3 : prev < 93 ? prev + 1 : prev;
                        if (next >= 70) {
                            setProcessingHint('বাংলা ও ইংরেজি তথ্য যাচাই ও ম্যাচ করা হচ্ছে...');
                        } else if (next >= 35) {
                            setProcessingHint('NID কার্ড সোজা করে লেখা পড়া হচ্ছে...');
                        }
                        return next;
                    });
                }, 450);

                const { data } = await axios.post('/member-admissions/ocr-nid', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (evt) => {
                        if (evt.total) {
                            const upPct = Math.min(25, Math.round((evt.loaded / evt.total) * 25));
                            setOcrProgress((prev) => Math.max(prev, upPct));
                        }
                    },
                });
                clearProgressTimer();
                setOcrProgress(100);

                if (!data?.ok || !data?.data) {
                    if (data?.fallback_allowed && provider === 'auto') {
                        await tryLocalFallback();
                        return;
                    }
                    setErrorMessage(
                        data?.message ||
                        'NID কার্ডের লেখা স্পষ্ট পড়া যায়নি। অনুগ্রহ করে ভালোভাবে ধরে আবার তুলুন।'
                    );
                    setStage('failed');
                    return;
                }

                if (navigator.vibrate) {
                    navigator.vibrate([40, 30, 60]);
                }

                setOcrPayload({
                    extracted: data.data as NidOcrExtractedData,
                    duplicateWarnings: (data.duplicate_warnings || {}) as Record<string, string>,
                    frontFile: front,
                    backFile: back,
                });
                setStage('verified');
            } catch (err: any) {
                clearProgressTimer();
                const status = err?.response?.status;
                const fallbackAllowed = Boolean(err?.response?.data?.fallback_allowed);

                if (
                    provider === 'auto' &&
                    (fallbackAllowed || !status || status >= 500)
                ) {
                    await tryLocalFallback();
                    return;
                }

                const msg =
                    err?.response?.data?.message ||
                    'ছবিটি স্পষ্ট নয় বা NID যাচাই করা যায়নি। অনুগ্রহ করে পরিষ্কার আলোতে কার্ডটি সোজা ধরে আবার চেষ্টা করুন।';
                setErrorMessage(msg);
                setStage('failed');
            }
        },
        [stopCamera, provider]
    );

    const handleCameraCapture = useCallback(async () => {
        if (!videoRef.current || capturingRef.current) return;
        capturingRef.current = true;

        try {
            const captured = await captureCroppedCardFromVideo(
                videoRef.current,
                scanSide === 'front' ? 'nid-front' : 'nid-back'
            );

            if (!captured) {
                setErrorMessage('ক্যামেরা থেকে ছবি নেওয়া যায়নি। আবার চেষ্টা করুন।');
                setStage('failed');
                stopCamera();
                return;
            }

            if (!captured.quality.ok) {
                if (navigator.vibrate) navigator.vibrate(100);
                setLiveQuality(captured.quality);
                setErrorMessage(captured.quality.message);
                setStage('failed');
                stopCamera();
                return;
            }

            if (navigator.vibrate) navigator.vibrate(40);
            const url = URL.createObjectURL(captured.file);

            if (scanSide === 'front') {
                if (frontPreview) URL.revokeObjectURL(frontPreview);
                setFrontFile(captured.file);
                setFrontPreview(url);
                stopCamera();
                if (combinedMode) {
                    void runServerOcr(captured.file, null);
                } else {
                    setScanSide('back');
                    setStage('choose');
                }
            } else {
                if (backPreview) URL.revokeObjectURL(backPreview);
                setBackFile(captured.file);
                setBackPreview(url);
                stopCamera();
                if (frontFile) {
                    void runServerOcr(frontFile, captured.file);
                } else {
                    setStage('choose');
                }
            }
        } finally {
            capturingRef.current = false;
        }
    }, [scanSide, frontPreview, backPreview, frontFile, stopCamera, runServerOcr]);

    const startCamera = useCallback(
        async (side: 'front' | 'back') => {
            setScanSide(side);
            setErrorMessage('');
            setLiveQuality(null);
            goodStreakRef.current = 0;

            if (!navigator.mediaDevices?.getUserMedia) {
                // Fallback for WebViews / unsupported browsers
                if (side === 'front') frontInputRef.current?.click();
                else backInputRef.current?.click();
                return;
            }

            setStage('camera');
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: 'environment' },
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                    },
                    audio: false,
                });
                streamRef.current = stream;

                const track = stream.getVideoTracks()[0];
                const caps = track?.getCapabilities?.() as { torch?: boolean } | undefined;
                setTorchSupported(Boolean(caps?.torch));

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }
            } catch {
                stopCamera();
                setErrorMessage(
                    'ক্যামেরা চালু করা যায়নি। নিচের আপলোড বাটন থেকে ছবি তুলুন বা গ্যালারি থেকে দিন।'
                );
                setStage('choose');
            }
        },
        [stopCamera, provider]
    );

    // Live quality meter loop when camera is active
    useEffect(() => {
        if (stage !== 'camera') return;
        const interval = window.setInterval(() => {
            const video = videoRef.current;
            if (!video || video.readyState < 2 || !video.videoWidth) return;

            const canvas = document.createElement('canvas');
            const w = Math.min(480, video.videoWidth);
            const h = Math.round((video.videoHeight / video.videoWidth) * w);
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.drawImage(video, 0, 0, w, h);

            const q = analyzeCanvasQuality(canvas);
            setLiveQuality(q);

            if (autoCapture && q.ok) {
                goodStreakRef.current += 1;
                if (goodStreakRef.current >= 4) {
                    goodStreakRef.current = 0;
                    void handleCameraCapture();
                }
            } else {
                goodStreakRef.current = 0;
            }
        }, 260);

        return () => window.clearInterval(interval);
    }, [stage, autoCapture, handleCameraCapture]);

    const toggleTorch = async () => {
        const track = streamRef.current?.getVideoTracks()[0];
        if (!track) return;
        const next = !torchOn;
        try {
            await track.applyConstraints({
                advanced: [{ torch: next } as MediaTrackConstraintSet],
            });
            setTorchOn(next);
        } catch {
            // Ignore if device rejects torch constraint
        }
    };

    const handleFileSelect = async (side: 'front' | 'back', file: File | null) => {
        if (!file) return;
        setErrorMessage('');

        const isPdf =
            file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

        let finalFile = file;
        if (!isPdf) {
            // Only reject truly unusable images (corrupt, tiny, or pitch black) on client-side;
            // keep high resolution (1800px, q=0.92) if >1.5MB so PHP upload_max_filesize never fails.
            const quality = await validateUploadedNidFile(file);
            if (!quality.ok) {
                if (navigator.vibrate) navigator.vibrate(100);
                setErrorMessage(quality.message);
                setStage('failed');
                return;
            }
            finalFile = await prepareNidOcrImage(file);
        }

        const url = finalFile.type.startsWith('image/') ? URL.createObjectURL(finalFile) : '';
        if (side === 'front') {
            if (frontPreview) URL.revokeObjectURL(frontPreview);
            setFrontFile(finalFile);
            setFrontPreview(url);
            if (combinedMode) {
                void runServerOcr(finalFile, null);
            } else {
                setScanSide('back');
                setStage('choose');
            }
        } else {
            if (backPreview) URL.revokeObjectURL(backPreview);
            setBackFile(finalFile);
            setBackPreview(url);
            if (frontFile) {
                void runServerOcr(frontFile, finalFile);
            } else {
                setStage('choose');
            }
        }
    };

    if (!open) return null;

    // Full-screen mobile camera overlay
    if (stage === 'camera') {
        return (
            <div className="fixed inset-0 z-50 flex flex-col bg-black text-white select-none">
                {/* Top bar */}
                <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-2 bg-gradient-to-b from-black/80 to-transparent">
                    <button
                        type="button"
                        onClick={() => {
                            stopCamera();
                            setStage('choose');
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur-md active:scale-95"
                        aria-label="বন্ধ করুন"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <div className="text-center">
                        <div className="text-xs font-bold uppercase tracking-wider text-blue-300">
                            {scanSide === 'front' ? 'NID সামনের পাশ (Front)' : 'NID পেছনের পাশ (Back)'}
                        </div>
                        <div className="text-[11px] text-slate-300">
                            ফ্রেমের ভেতর কার্ডটি সোজা ধরুন
                        </div>
                    </div>

                    {torchSupported ? (
                        <button
                            type="button"
                            onClick={toggleTorch}
                            className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md active:scale-95 ${torchOn ? 'bg-amber-400 text-slate-900' : 'bg-white/15 text-white'
                                }`}
                            aria-label="ফ্ল্যাশ"
                        >
                            <Flashlight className="h-5 w-5" />
                        </button>
                    ) : (
                        <div className="w-10" />
                    )}
                </div>

                {/* Video + ID Card Guide Overlay */}
                <div className="relative flex-1 overflow-hidden flex items-center justify-center">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="h-full w-full object-cover"
                    />

                    {/* Card frame guide */}
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-5">
                        <div
                            className={`relative w-full max-w-md aspect-[1.586/1] rounded-2xl border-2 shadow-[0_0_0_9999px_rgba(0,0,0,0.58)] transition-colors duration-200 ${liveQuality?.ok
                                ? 'border-emerald-400'
                                : liveQuality
                                    ? 'border-amber-400'
                                    : 'border-white/70'
                                }`}
                        >
                            <span className="absolute -top-0.5 -left-0.5 h-6 w-6 rounded-tl-2xl border-t-4 border-l-4 border-white" />
                            <span className="absolute -top-0.5 -right-0.5 h-6 w-6 rounded-tr-2xl border-t-4 border-r-4 border-white" />
                            <span className="absolute -bottom-0.5 -left-0.5 h-6 w-6 rounded-bl-2xl border-b-4 border-l-4 border-white" />
                            <span className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-br-2xl border-b-4 border-r-4 border-white" />
                        </div>

                        {/* Live Quality Pill */}
                        <div
                            className={`mt-5 rounded-full px-4 py-2 text-xs font-bold shadow-lg backdrop-blur-md transition-colors ${liveQuality?.ok
                                ? 'bg-emerald-500/90 text-white'
                                : 'bg-amber-500/90 text-slate-950'
                                }`}
                        >
                            {liveQuality ? liveQuality.message : 'ক্যামেরা ফোকাস হচ্ছে...'}
                        </div>
                    </div>
                </div>

                {/* Bottom thumb controls */}
                <div className="relative z-10 flex items-center justify-between px-6 py-6 bg-gradient-to-t from-black/90 via-black/70 to-transparent">
                    <button
                        type="button"
                        onClick={() => {
                            stopCamera();
                            if (scanSide === 'front') frontInputRef.current?.click();
                            else backInputRef.current?.click();
                        }}
                        className="flex flex-col items-center gap-1 text-[11px] font-semibold text-slate-300"
                    >
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
                            <FileImage className="h-5 w-5" />
                        </div>
                        <span>গ্যালারি</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => void handleCameraCapture()}
                        className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white/20 p-1 active:scale-90 transition-transform"
                        aria-label="ছবি তুলুন"
                    >
                        <span className="h-full w-full rounded-full bg-white" />
                    </button>

                    <button
                        type="button"
                        onClick={() => setAutoCapture((v) => !v)}
                        className="flex flex-col items-center gap-1 text-[11px] font-semibold text-slate-300"
                    >
                        <div
                            className={`flex h-11 w-11 items-center justify-center rounded-full ${autoCapture ? 'bg-emerald-500 text-white' : 'bg-white/15 text-slate-300'
                                }`}
                        >
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <span>{autoCapture ? 'অটো: চালু' : 'অটো: বন্ধ'}</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/75 backdrop-blur-sm p-0 sm:p-4">
            <input
                ref={frontInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                    void handleFileSelect('front', e.target.files?.[0] || null);
                    e.target.value = '';
                }}
            />
            <input
                ref={backInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                    void handleFileSelect('back', e.target.files?.[0] || null);
                    e.target.value = '';
                }}
            />

            <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden max-h-[92dvh] flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-5 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/20 border border-blue-400/30 text-blue-300">
                            <ScanLine className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
                                NID স্ক্যান ও যাচাই (ধাপ ১)
                            </h2>
                            <p className="text-xs text-slate-300">
                                পরিষ্কার NID দিলে তথ্য অটো-ফিল হবে
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-full p-2 text-slate-300 hover:bg-white/10 hover:text-white"
                        aria-label="বাতিল"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4 overflow-y-auto">
                    {hasExistingDraft && stage === 'choose' && (
                        <button
                            type="button"
                            onClick={onResumeDraft}
                            className="w-full flex items-center justify-between rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-left hover:bg-emerald-100/80 transition"
                        >
                            <div className="flex items-center gap-3">
                                <History className="h-5 w-5 text-emerald-700 shrink-0" />
                                <div>
                                    <div className="text-xs font-extrabold text-emerald-950">
                                        আগের সংরক্ষিত খসড়া (Draft) রয়েছে
                                    </div>
                                    <div className="text-[11px] text-emerald-800">
                                        স্ক্যান ছাড়াই আগের খসড়া থেকে চালিয়ে যান
                                    </div>
                                </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-emerald-700" />
                        </button>
                    )}

                    {errorMessage && (
                        <div className="rounded-2xl border-2 border-red-400 bg-red-50 p-4 flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                            <div className="text-xs sm:text-sm font-bold text-red-900 leading-relaxed">
                                {errorMessage}
                            </div>
                        </div>
                    )}

                    {stage === 'processing' && (
                        <div className="py-8 px-2 text-center space-y-4">
                            <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
                                <RefreshCw className="h-14 w-14 text-blue-600 animate-spin" />
                                <span className="absolute text-xs font-extrabold text-blue-800">
                                    {ocrProgress}%
                                </span>
                            </div>
                            <div className="space-y-2 max-w-xs mx-auto">
                                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-300"
                                        style={{ width: `${ocrProgress}%` }}
                                    />
                                </div>
                                <p className="text-sm font-extrabold text-slate-800">
                                    NID থেকে তথ্য পড়া ও যাচাই হচ্ছে ({ocrProgress}%)
                                </p>
                                <p className="text-xs text-slate-500">
                                    {processingHint}
                                </p>
                            </div>
                        </div>
                    )}

                    {(stage === 'choose' || stage === 'failed') && (
                        <div className="space-y-4">
                            {/* Single Combined Image vs Separate Front/Back Switch */}
                            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                                <div className="min-w-0">
                                    <div className="text-xs font-extrabold text-slate-800">
                                        একই ছবিতে সামনের ও পেছনের পাশ
                                    </div>
                                    <div className="text-[11px] text-slate-500">
                                        চালু করলে ১টি ছবি থেকেই সামনের + পেছনের তথ্য স্ক্যান হবে
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={combinedMode}
                                    onClick={() => {
                                        const next = !combinedMode;
                                        setCombinedMode(next);
                                        setScanSide('front');
                                        if (next) {
                                            setBackFile(null);
                                            setBackPreview('');
                                        }
                                    }}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${combinedMode ? 'bg-blue-600' : 'bg-slate-300'
                                        }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition ${combinedMode ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                    />
                                </button>
                            </div>

                            {/* Step Indicator (only when separate Front & Back mode) */}
                            {!combinedMode && (
                                <div className="flex items-center gap-2 text-[11px] font-bold">
                                    <button
                                        type="button"
                                        onClick={() => setScanSide('front')}
                                        className={`flex-1 rounded-xl py-2 px-3 text-center transition ${scanSide === 'front'
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : frontFile
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : 'bg-slate-100 text-slate-500'
                                            }`}
                                    >
                                        ১. সামনের পাশ {frontFile ? '✓' : ''}
                                    </button>
                                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                                    <button
                                        type="button"
                                        disabled={!frontFile}
                                        onClick={() => frontFile && setScanSide('back')}
                                        className={`flex-1 rounded-xl py-2 px-3 text-center transition disabled:opacity-50 ${scanSide === 'back'
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : backFile
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : 'bg-slate-100 text-slate-500'
                                            }`}
                                    >
                                        ২. পেছনের পাশ {backFile ? '✓' : ''}
                                    </button>
                                </div>
                            )}

                            {combinedMode || scanSide === 'front' ? (
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs sm:text-sm font-extrabold text-slate-800">
                                            {combinedMode
                                                ? 'NID-এর সামনের ও পেছনের পাশ (একই ছবি)'
                                                : 'ধাপ ১: NID-এর সামনের পাশ দিন'}{' '}
                                            <span className="text-red-500">*</span>
                                        </span>
                                        {frontFile && (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                                                <CheckCircle2 className="h-3.5 w-3.5" /> প্রস্তুত
                                            </span>
                                        )}
                                    </div>

                                    {frontPreview ? (
                                        <img
                                            src={frontPreview}
                                            alt="NID Front"
                                            className="w-full h-40 object-contain rounded-xl border border-slate-200 bg-white"
                                        />
                                    ) : frontFile ? (
                                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-4 text-center text-xs font-bold text-slate-700">
                                            📄 {frontFile.name}
                                        </div>
                                    ) : null}

                                    <div className="grid grid-cols-2 gap-2.5">
                                        <button
                                            type="button"
                                            onClick={() => void startCamera('front')}
                                            className="min-h-[50px] flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-sm active:scale-95 transition"
                                        >
                                            <Camera className="h-4 w-4" />
                                            <span>{frontFile ? 'পুনরায় স্ক্যান' : 'ক্যামেরা স্ক্যান'}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => frontInputRef.current?.click()}
                                            className="min-h-[50px] flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs sm:text-sm font-bold active:scale-95 transition"
                                        >
                                            <Upload className="h-4 w-4" />
                                            <span>ছবি / PDF আপলোড</span>
                                        </button>
                                    </div>

                                    {frontFile && (
                                        <button
                                            type="button"
                                            onClick={() => setScanSide('back')}
                                            className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold shadow-sm active:scale-95 transition"
                                        >
                                            <span>পরবর্তী: পেছনের পাশ</span>
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs sm:text-sm font-extrabold text-slate-800">
                                            ধাপ ২: NID-এর পেছনের পাশ দিন
                                        </span>
                                        <span className="text-[11px] font-semibold text-slate-500">
                                            ঠিকানা অটো-ফিলের জন্য
                                        </span>
                                    </div>

                                    {backPreview ? (
                                        <img
                                            src={backPreview}
                                            alt="NID Back"
                                            className="w-full h-36 object-contain rounded-xl border border-slate-200 bg-white"
                                        />
                                    ) : backFile ? (
                                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-4 text-center text-xs font-bold text-slate-700">
                                            📄 {backFile.name}
                                        </div>
                                    ) : null}

                                    <div className="grid grid-cols-2 gap-2.5">
                                        <button
                                            type="button"
                                            onClick={() => void startCamera('back')}
                                            className="min-h-[50px] flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-sm active:scale-95 transition"
                                        >
                                            <Camera className="h-4 w-4" />
                                            <span>{backFile ? 'পুনরায় স্ক্যান' : 'ক্যামেরা স্ক্যান'}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => backInputRef.current?.click()}
                                            className="min-h-[50px] flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs sm:text-sm font-bold active:scale-95 transition"
                                        >
                                            <Upload className="h-4 w-4" />
                                            <span>ছবি / PDF আপলোড</span>
                                        </button>
                                    </div>

                                    <div className="flex gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setScanSide('front')}
                                            className="px-4 min-h-[48px] rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100"
                                        >
                                            ← পেছনে
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!frontFile}
                                            onClick={() => frontFile && void runServerOcr(frontFile, backFile)}
                                            className="flex-1 min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs sm:text-sm font-extrabold shadow-md active:scale-[0.99] transition"
                                        >
                                            <ShieldCheck className="h-5 w-5" />
                                            <span>{backFile ? 'তথ্য যাচাই করুন' : 'স্কিপ করে যাচাই করুন'}</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Manual Entry Skip Button */}
                            <div className="pt-2 border-t border-slate-100 text-center">
                                <button
                                    type="button"
                                    onClick={onSkipManual}
                                    className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition"
                                >
                                    OCR ছাড়াই ম্যানুয়ালি তথ্য দিন (Skip)
                                </button>
                            </div>
                        </div>
                    )}

                    {stage === 'verified' && ocrPayload && (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 space-y-2">
                                <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-sm">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                    <span>NID সফলভাবে যাচাই হয়েছে!</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-800 pt-1">
                                    <div>
                                        <span className="text-slate-500">নাম (বাংলা):</span>{' '}
                                        <strong>{ocrPayload.extracted.applicant_name_bn || '—'}</strong>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Name (EN):</span>{' '}
                                        <strong>{ocrPayload.extracted.applicant_name_en || '—'}</strong>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">NID / Smart Card:</span>{' '}
                                        <strong className="font-mono">
                                            {ocrPayload.extracted.smart_card_number ||
                                                ocrPayload.extracted.nid_number}
                                        </strong>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">জন্ম তারিখ:</span>{' '}
                                        <strong>{ocrPayload.extracted.date_of_birth}</strong>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">
                                            {ocrPayload.extracted.spouse_name_bn ? 'স্বামী:' : 'পিতা:'}
                                        </span>{' '}
                                        <strong>
                                            {ocrPayload.extracted.spouse_name_bn ||
                                                ocrPayload.extracted.father_name_bn ||
                                                '—'}
                                        </strong>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">মাতা:</span>{' '}
                                        <strong>{ocrPayload.extracted.mother_name_bn || '—'}</strong>
                                    </div>
                                    {ocrPayload.extracted.address?.raw_address_bn && (
                                        <div className="sm:col-span-2 pt-1 border-t border-emerald-200/70">
                                            <span className="text-slate-500">ঠিকানা:</span>{' '}
                                            <strong>{ocrPayload.extracted.address.raw_address_bn}</strong>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {Object.keys(ocrPayload.duplicateWarnings).length > 0 && (
                                <div className="rounded-2xl border border-amber-400 bg-amber-50 p-3.5 text-xs font-bold text-amber-900 space-y-1">
                                    {Object.values(ocrPayload.duplicateWarnings).map((w, idx) => (
                                        <div key={idx} className="flex items-start gap-2">
                                            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                            <span>{w}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setOcrPayload(null);
                                        setStage('choose');
                                    }}
                                    className="flex-1 min-h-[48px] rounded-2xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
                                >
                                    আবার স্ক্যান করুন
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        // Compress images only AFTER OCR data has been extracted
                                        const compFront = await prepareAdmissionUploadFile(ocrPayload.frontFile, {
                                            maxWidth: 1280,
                                        });
                                        const compBack = ocrPayload.backFile
                                            ? await prepareAdmissionUploadFile(ocrPayload.backFile, { maxWidth: 1280 })
                                            : null;
                                        onSuccess({
                                            ...ocrPayload,
                                            frontFile: compFront.ok ? compFront.file : ocrPayload.frontFile,
                                            backFile:
                                                compBack && compBack.ok ? compBack.file : ocrPayload.backFile,
                                        });
                                    }}
                                    className="flex-[2] min-h-[48px] flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold shadow-md"
                                >
                                    <span>পরবর্তী ধাপ (নতুন / পুরাতন)</span>
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
