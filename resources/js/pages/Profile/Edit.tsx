import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { User, Save, Upload, KeyRound, X, Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface Props {
    user: {
        id: number;
        name: string;
        email: string;
        phone?: string;
        pin?: string;
        signature?: string;
    };
}

export default function Edit({ user }: Props) {
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        pin: user.pin || '',
        signature: null as File | null,
        _method: 'POST',
    });

    const passwordForm = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/profile');
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

            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center gap-3 mb-6">
                    <User className="w-8 h-8 text-blue-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
                        <p className="text-sm text-gray-600">Update your profile information and signature</p>
                    </div>
                    <div className="ml-auto">
                        <button
                            type="button"
                            onClick={() => setIsPasswordModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                        >
                            <KeyRound className="w-4 h-4" />
                            Change Password
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Update your personal details and signature for approvals
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Name (নাম) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                                {errors.name && (
                                    <p className="text-sm text-red-600 mt-1">{errors.name}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email (ইমেইল) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                                {errors.email && (
                                    <p className="text-sm text-red-600 mt-1">{errors.email}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Phone (ফোন)
                                </label>
                                <input
                                    type="text"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                {errors.phone && (
                                    <p className="text-sm text-red-600 mt-1">{errors.phone}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    PIN (পিন নং)
                                </label>
                                <input
                                    type="text"
                                    value={data.pin}
                                    onChange={(e) => setData('pin', e.target.value)}
                                    placeholder="অনুমোদন/জমা নথিতে ব্যবহার হবে"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                {errors.pin && (
                                    <p className="text-sm text-red-600 mt-1">{errors.pin}</p>
                                )}
                                <p className="text-xs text-gray-500 mt-1">সেভ/জমা/অ্যাপ্রুভ করার সময় প্রোফাইল থেকে অটো যুক্ত হবে</p>
                            </div>
                        </div>

                        {/* Signature Section */}
                        <div className="border-t pt-6">
                            <h3 className="text-base font-semibold text-gray-900 mb-4">
                                Digital Signature (ডিজিটাল স্বাক্ষর)
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Upload your signature. This will be automatically added when you approve applications.
                                <br />
                                আপনার স্বাক্ষর আপলোড করুন। আপনি যখন আবেদন অনুমোদন করবেন তখন এটি স্বয়ংক্রিয়ভাবে যুক্ত হবে।
                            </p>

                            {user.signature && (
                                <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                    <p className="text-sm font-medium text-gray-700 mb-2">Current Signature (বর্তমান স্বাক্ষর):</p>
                                    <img
                                        src={`/storage/${user.signature}`}
                                        alt="Current signature"
                                        className="h-24 border-2 border-gray-300 rounded bg-white p-2"
                                    />
                                </div>
                            )}

                            <div className="flex items-center gap-3">
                                <label className="flex-1 cursor-pointer">
                                    <div className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
                                        <Upload className="w-5 h-5 text-gray-400" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-700">
                                                {data.signature
                                                    ? `Selected: ${data.signature.name}`
                                                    : 'Click to upload new signature'}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                PNG, JPG, GIF up to 2MB (PNG, JPG, GIF সর্বোচ্চ ২MB)
                                            </p>
                                        </div>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0] || null;
                                            setData('signature', file);
                                        }}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                            {errors.signature && (
                                <p className="text-sm text-red-600 mt-2">{errors.signature}</p>
                            )}

                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    <strong>Note:</strong> Your signature will be used on approval documents.
                                    Make sure it's clear and professional.
                                    <br />
                                    <strong>দ্রষ্টব্য:</strong> আপনার স্বাক্ষরটি অনুমোদন নথিতে ব্যবহার করা হবে।
                                    নিশ্চিত করুন যে এটি স্পষ্ট এবং পেশাদার।
                                </p>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end pt-4 border-t">
                            <button
                                type="submit"
                                disabled={processing}
                                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Save className="w-4 h-4" />
                                {processing ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/50 transition-opacity"
                        onClick={closePasswordModal}
                    />

                    <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-200">
                        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 border border-blue-100">
                                    <ShieldCheck className="h-5 w-5 text-blue-700" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
                                    <p className="text-sm text-gray-600 mt-0.5">
                                        Update your login password securely. (পাসওয়ার্ড নিরাপদভাবে পরিবর্তন করুন)
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={closePasswordModal}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handlePasswordSubmit} className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                                <div className="lg:col-span-2">
                                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                        <div className="flex items-start gap-2">
                                            <KeyRound className="h-5 w-5 text-amber-800 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-semibold text-amber-900">Instructions</p>
                                                <ul className="mt-2 space-y-1.5 text-sm text-amber-900/90">
                                                    <li>Use a strong password (min 8 characters).</li>
                                                    <li>Don’t share your password with anyone.</li>
                                                    <li>If you forgot current password, contact admin.</li>
                                                </ul>
                                                <p className="mt-3 text-xs text-amber-900/80">
                                                    নির্দেশনা: ৮ অক্ষরের বেশি শক্তিশালী পাসওয়ার্ড ব্যবহার করুন এবং কারও সাথে শেয়ার করবেন না।
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="lg:col-span-3 space-y-4">
                                    {(passwordForm.errors.current_password || passwordForm.errors.password) && (
                                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                                            Please fix the errors below and try again.
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Current Password <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showCurrentPassword ? 'text' : 'password'}
                                                value={passwordForm.data.current_password}
                                                onChange={(e) => passwordForm.setData('current_password', e.target.value)}
                                                className="w-full pr-12 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                required
                                                autoComplete="current-password"
                                                placeholder="Enter your current password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCurrentPassword((v) => !v)}
                                                className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-700"
                                                aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                                            >
                                                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        {passwordForm.errors.current_password && (
                                            <p className="text-sm text-red-600 mt-1">{passwordForm.errors.current_password}</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                New Password <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showNewPassword ? 'text' : 'password'}
                                                    value={passwordForm.data.password}
                                                    onChange={(e) => passwordForm.setData('password', e.target.value)}
                                                    className="w-full pr-12 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    required
                                                    autoComplete="new-password"
                                                    placeholder="New password"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewPassword((v) => !v)}
                                                    className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-700"
                                                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                                                >
                                                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">At least 8 characters is recommended.</p>
                                            {passwordForm.errors.password && (
                                                <p className="text-sm text-red-600 mt-1">{passwordForm.errors.password}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Confirm Password <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showConfirmPassword ? 'text' : 'password'}
                                                    value={passwordForm.data.password_confirmation}
                                                    onChange={(e) => passwordForm.setData('password_confirmation', e.target.value)}
                                                    className="w-full pr-12 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    required
                                                    autoComplete="new-password"
                                                    placeholder="Confirm new password"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword((v) => !v)}
                                                    className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-700"
                                                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                                                >
                                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={closePasswordModal}
                                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={passwordForm.processing}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <ShieldCheck className="h-4 w-4" />
                                            {passwordForm.processing ? 'Updating...' : 'Update Password'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
