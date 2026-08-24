import AdminLayout from '@/layouts/admin-layout';
import { Head, useForm, usePage } from '@inertiajs/react';
import {
    Building,
    Camera,
    CheckCircle2,
    Eye,
    EyeOff,
    FileCheck,
    Globe,
    KeyRound,
    Lock,
    Mail,
    MapPin,
    PenTool,
    Phone,
    Save,
    ShieldCheck,
    User as UserIcon,
    Upload,
    X,
    Shield,
} from 'lucide-react';
import React, { ChangeEvent, useRef, useState } from 'react';
import { prepareAdmissionUploadFile } from '@/utils/imageUpload';

interface Role {
    id: number;
    name: string;
    display_name: string;
}

interface Zone {
    id: number;
    name: string;
}

interface Area {
    id: number;
    name: string;
}

interface Branch {
    id: number;
    name: string;
}

interface UserProfile {
    id: number;
    name: string;
    username?: string;
    email: string;
    phone?: string | null;
    pin?: string | null;
    profile_photo?: string | null;
    signature?: string | null;
    has_all_access?: boolean;
    role?: Role | null;
    zone?: Zone | null;
    area?: Area | null;
    branch?: Branch | null;
    account_type?: string | null;
}

interface Props {
    user: UserProfile;
}

export default function Edit({ user }: Props) {
    const page = usePage() as { props: { flash?: { success?: string; error?: string } } };
    const flashSuccess = page.props.flash?.success;
    const isBranchAccount = user.account_type === 'branch';

    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showPin, setShowPin] = useState(false);

    // Image previews
    const [photoPreview, setPhotoPreview] = useState<string | null>(
        user.profile_photo ? `/storage/${user.profile_photo}` : null,
    );
    const [signaturePreview, setSignaturePreview] = useState<string | null>(
        user.signature ? `/storage/${user.signature}` : null,
    );

    const photoInputRef = useRef<HTMLInputElement>(null);
    const signatureInputRef = useRef<HTMLInputElement>(null);

    const { data, setData, post, processing, errors } = useForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        pin: user.pin || '',
        profile_photo: null as File | null,
        signature: null as File | null,
    });

    const passwordForm = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const handlePhotoSelect = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }

        const result = await prepareAdmissionUploadFile(file, { maxWidth: 400 });
        if (!result.ok) {
            alert(result.error);
            return;
        }

        setData('profile_photo', result.file);
        setPhotoPreview(URL.createObjectURL(result.file));
    };

    const handleSignatureSelect = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }

        const result = await prepareAdmissionUploadFile(file, { maxWidth: 1000 });
        if (!result.ok) {
            alert(result.error);
            return;
        }

        setData('signature', result.file);
        setSignaturePreview(URL.createObjectURL(result.file));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/profile', {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        passwordForm.put('/profile/password', {
            onSuccess: () => {
                passwordForm.reset();
                setIsPasswordModalOpen(false);
            },
        });
    };

    const closePasswordModal = () => {
        passwordForm.reset();
        passwordForm.clearErrors();
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        setIsPasswordModalOpen(false);
    };

    return (
        <AdminLayout>
            <Head title="Profile Settings" />

            <div className="mx-auto w-full max-w-[1200px] space-y-6 pb-12">
                {/* Hero Header & Cover Card */}
                <div className="relative overflow-hidden rounded-2xl border border-blue-200/70 bg-white shadow-md shadow-slate-900/5">
                    {/* Cover Banner */}
                    <div className="h-44 w-full bg-gradient-to-r from-blue-700 via-indigo-600 to-slate-800 p-6 text-white">
                        <div className="flex items-center justify-between">
                            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wider text-blue-100 uppercase backdrop-blur-md">
                                User Profile & Account Settings
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsPasswordModalOpen(true)}
                                className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/15 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/25 active:scale-98"
                            >
                                <KeyRound className="size-4" />
                                {isBranchAccount ? 'Change PIN' : 'Change Password'}
                            </button>
                        </div>
                    </div>

                    {/* Profile Banner Details */}
                    <div className="relative px-6 pb-6 pt-0">
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                            {/* Avatar with Upload Badge Overlay */}
                            <div className="relative -mt-16 flex size-28 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-tr from-blue-600 to-indigo-600 text-3xl font-extrabold text-white shadow-lg shadow-slate-900/10">
                                {photoPreview ? (
                                    <img
                                        src={photoPreview}
                                        alt={user.name}
                                        className="size-full rounded-[12px] object-cover"
                                    />
                                ) : (
                                    <span>{user.name.charAt(0).toUpperCase()}</span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => photoInputRef.current?.click()}
                                    className="absolute -bottom-1 -right-1 flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md transition hover:bg-blue-700 active:scale-95"
                                    title="Upload Profile Picture"
                                >
                                    <Camera className="size-4.5" />
                                </button>
                                <input
                                    type="file"
                                    ref={photoInputRef}
                                    accept="image/png,image/jpg,image/jpeg,image/webp"
                                    onChange={handlePhotoSelect}
                                    className="hidden"
                                />
                            </div>

                            {/* User Header Info */}
                            <div className="flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                                        {user.name}
                                    </h1>
                                    {user.has_all_access && (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800">
                                            <Shield className="size-3.5" />
                                            Super Admin
                                        </span>
                                    )}
                                    {user.role && (
                                        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                                            {user.role.display_name}
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
                                    <span className="flex items-center gap-1 text-slate-600">
                                        <Mail className="size-3.5 text-slate-400" />
                                        {user.email}
                                    </span>
                                    {user.username && (
                                        <span className="font-mono text-slate-600">
                                            @{user.username}
                                        </span>
                                    )}
                                    {user.phone && (
                                        <span className="flex items-center gap-1 text-slate-600">
                                            <Phone className="size-3.5 text-slate-400" />
                                            {user.phone}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Flash Message Banner */}
                {flashSuccess && (
                    <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-800 shadow-sm">
                        <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                        <span className="text-sm font-semibold">{flashSuccess}</span>
                    </div>
                )}

                {/* Profile Form Grid */}
                <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Left Column: Personal Information & PIN */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* Personal Details Card */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
                                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                    <UserIcon className="size-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">
                                        Personal Information
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Update your personal account identity & contact numbers
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                        Full Name (নাম) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 shadow-xs outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                        required
                                    />
                                    {errors.name && (
                                        <p className="mt-1 text-xs text-red-600">{errors.name}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                        Email Address (ইমেইল) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 shadow-xs outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                        required
                                    />
                                    {errors.email && (
                                        <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                        Mobile Phone Number (ফোন নম্বর)
                                    </label>
                                    <input
                                        type="text"
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                        placeholder="01XXXXXXXXX"
                                        className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 shadow-xs outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    />
                                    {errors.phone && (
                                        <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                        Employee PIN / Employee Code (এমপ্লয়ি পিন নং)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPin ? 'text' : 'password'}
                                            value={data.pin}
                                            onChange={(e) => setData('pin', e.target.value)}
                                            placeholder="Enter your Employee PIN (e.g. 0027)"
                                            className="h-10 w-full rounded-xl border border-slate-300 bg-white pr-10 pl-3.5 text-sm font-mono text-slate-900 shadow-xs outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPin(!showPin)}
                                            className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                        >
                                            {showPin ? (
                                                <EyeOff className="size-4" />
                                            ) : (
                                                <Eye className="size-4" />
                                            )}
                                        </button>
                                    </div>
                                    <p className="mt-1 text-[11px] text-slate-500">
                                        Employee ID/PIN used for identification across application forms & approval records.
                                    </p>
                                    {errors.pin && (
                                        <p className="mt-1 text-xs text-red-600">{errors.pin}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Digital Signature Card */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                                        <PenTool className="size-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900">
                                            Digital Approval Signature
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                            Upload your official signature image to embed in printed approval forms
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* Current Signature Preview Box */}
                                {signaturePreview ? (
                                    <div className="flex flex-col items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                                        <span className="text-xs font-semibold text-slate-700">
                                            Signature Preview (স্বাক্ষর প্রিভিউ):
                                        </span>
                                        <div className="flex h-24 max-w-sm items-center justify-center rounded-lg border border-slate-300 bg-white p-3 shadow-xs">
                                            <img
                                                src={signaturePreview}
                                                alt="Digital Signature"
                                                className="max-h-full max-w-full object-contain"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs font-medium text-amber-800">
                                        No digital signature uploaded yet. Please upload a clear PNG image of your signature.
                                    </div>
                                )}

                                {/* File Input Button */}
                                <div>
                                    <button
                                        type="button"
                                        onClick={() => signatureInputRef.current?.click()}
                                        className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
                                    >
                                        <Upload className="size-4 text-slate-500" />
                                        {data.signature
                                            ? `Selected: ${data.signature.name}`
                                            : 'Upload / Change Signature Image'}
                                    </button>
                                    <input
                                        type="file"
                                        ref={signatureInputRef}
                                        accept="image/png,image/jpg,image/jpeg,image/webp,image/gif"
                                        onChange={handleSignatureSelect}
                                        className="hidden"
                                    />
                                    <p className="mt-1.5 text-[11px] text-slate-500">
                                        Accepted formats: PNG, JPG, WEBP, GIF (Max 2MB). Preferred transparent background.
                                    </p>
                                    {errors.signature && (
                                        <p className="mt-1 text-xs text-red-600">
                                            {errors.signature}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Save Action Footer */}
                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="submit"
                                disabled={processing}
                                className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 active:scale-98 disabled:opacity-60"
                            >
                                <Save className="size-4" />
                                {processing ? 'Saving Changes...' : 'Save Profile Changes'}
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Organizational Context & Security Info */}
                    <div className="space-y-6">
                        {/* Profile Photo Card */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="mb-1 text-base font-bold text-slate-900">
                                Profile Picture
                            </h3>
                            <p className="mb-4 text-xs text-slate-500">
                                Display picture across application header & team lists
                            </p>

                            <div className="flex flex-col items-center justify-center gap-4 py-2">
                                <div className="relative flex size-32 items-center justify-center rounded-2xl border-2 border-slate-200 bg-slate-100 shadow-sm">
                                    {photoPreview ? (
                                        <img
                                            src={photoPreview}
                                            alt={user.name}
                                            className="size-full rounded-[14px] object-cover"
                                        />
                                    ) : (
                                        <span className="text-4xl font-black text-slate-400">
                                            {user.name.charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => photoInputRef.current?.click()}
                                    className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
                                >
                                    <Camera className="size-4 text-slate-500" />
                                    Change Photo
                                </button>
                            </div>
                        </div>

                        {/* Organizational Scope Card */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="mb-1 text-base font-bold text-slate-900">
                                Organizational Scope
                            </h3>
                            <p className="mb-4 text-xs text-slate-500">
                                Assigned organizational role and region assignments
                            </p>

                            <div className="space-y-3.5 text-xs">
                                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
                                    <span className="font-semibold text-slate-600">
                                        Assigned Role:
                                    </span>
                                    <span className="font-bold text-blue-700">
                                        {user.role?.display_name || 'System User'}
                                    </span>
                                </div>

                                {user.branch && (
                                    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
                                        <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                                            <Building className="size-3.5 text-blue-600" />
                                            Branch:
                                        </span>
                                        <span className="font-bold text-slate-900">
                                            {user.branch.name}
                                        </span>
                                    </div>
                                )}

                                {user.area && (
                                    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
                                        <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                                            <MapPin className="size-3.5 text-amber-600" />
                                            Area:
                                        </span>
                                        <span className="font-bold text-slate-900">
                                            {user.area.name}
                                        </span>
                                    </div>
                                )}

                                {user.zone && (
                                    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
                                        <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                                            <Globe className="size-3.5 text-purple-600" />
                                            Zone:
                                        </span>
                                        <span className="font-bold text-slate-900">
                                            {user.zone.name}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Security Card */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="mb-1 text-base font-bold text-slate-900">
                                Account Security
                            </h3>
                            <p className="mb-4 text-xs text-slate-500">
                                {isBranchAccount
                                    ? 'Keep your branch login PIN updated and secure'
                                    : 'Keep your password updated and secure'}
                            </p>

                            <button
                                type="button"
                                onClick={() => setIsPasswordModalOpen(true)}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-98"
                            >
                                <Lock className="size-4" />
                                {isBranchAccount ? 'Change PIN' : 'Change Password'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Password Change Modal */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
                    <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
                            <div className="flex items-center gap-2.5">
                                <ShieldCheck className="size-5 text-blue-600" />
                                <div>
                                    <h3 className="font-bold text-slate-900">
                                        {isBranchAccount ? 'Change PIN' : 'Change Password'}
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        {isBranchAccount
                                            ? 'This PIN is used on the Branch login screen'
                                            : 'Update your account login password'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={closePasswordModal}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
                            {passwordForm.errors.current_password && (
                                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                                    {passwordForm.errors.current_password}
                                </div>
                            )}

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-700">
                                    {isBranchAccount ? 'Current PIN' : 'Current Password'}{' '}
                                    <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showCurrentPassword ? 'text' : 'password'}
                                        value={passwordForm.data.current_password}
                                        onChange={(e) =>
                                            passwordForm.setData(
                                                'current_password',
                                                isBranchAccount
                                                    ? e.target.value.replace(/\D/g, '').slice(0, 12)
                                                    : e.target.value,
                                            )
                                        }
                                        className="h-10 w-full rounded-xl border border-slate-300 bg-white pr-10 pl-3.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                        required
                                        inputMode={isBranchAccount ? 'numeric' : undefined}
                                        maxLength={isBranchAccount ? 12 : undefined}
                                        placeholder={
                                            isBranchAccount
                                                ? 'Enter current PIN'
                                                : 'Enter current password'
                                        }
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                    >
                                        {showCurrentPassword ? (
                                            <EyeOff className="size-4" />
                                        ) : (
                                            <Eye className="size-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                                        {isBranchAccount ? 'New PIN' : 'New Password'}{' '}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showNewPassword ? 'text' : 'password'}
                                            value={passwordForm.data.password}
                                            onChange={(e) =>
                                                passwordForm.setData(
                                                    'password',
                                                    isBranchAccount
                                                        ? e.target.value.replace(/\D/g, '').slice(0, 12)
                                                        : e.target.value,
                                                )
                                            }
                                            className="h-10 w-full rounded-xl border border-slate-300 bg-white pr-10 pl-3.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                            required
                                            inputMode={isBranchAccount ? 'numeric' : undefined}
                                            maxLength={isBranchAccount ? 12 : undefined}
                                            placeholder={isBranchAccount ? '4-12 digits' : 'New password'}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                        >
                                            {showNewPassword ? (
                                                <EyeOff className="size-4" />
                                            ) : (
                                                <Eye className="size-4" />
                                            )}
                                        </button>
                                    </div>
                                    {passwordForm.errors.password && (
                                        <p className="mt-1 text-xs text-red-600">
                                            {passwordForm.errors.password}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                                        {isBranchAccount ? 'Confirm PIN' : 'Confirm Password'}{' '}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={passwordForm.data.password_confirmation}
                                            onChange={(e) =>
                                                passwordForm.setData(
                                                    'password_confirmation',
                                                    isBranchAccount
                                                        ? e.target.value.replace(/\D/g, '').slice(0, 12)
                                                        : e.target.value,
                                                )
                                            }
                                            className="h-10 w-full rounded-xl border border-slate-300 bg-white pr-10 pl-3.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                            required
                                            inputMode={isBranchAccount ? 'numeric' : undefined}
                                            maxLength={isBranchAccount ? 12 : undefined}
                                            placeholder={isBranchAccount ? 'Re-enter PIN' : 'Confirm password'}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff className="size-4" />
                                            ) : (
                                                <Eye className="size-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                                <button
                                    type="button"
                                    onClick={closePasswordModal}
                                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={passwordForm.processing}
                                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-98 disabled:opacity-60"
                                >
                                    <ShieldCheck className="size-4" />
                                    {passwordForm.processing
                                        ? 'Updating...'
                                        : isBranchAccount
                                          ? 'Update PIN'
                                          : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
