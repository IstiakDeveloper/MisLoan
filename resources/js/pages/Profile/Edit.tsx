import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { User, Save, Upload } from 'lucide-react';

interface Props {
    user: {
        id: number;
        name: string;
        email: string;
        phone?: string;
        signature?: string;
    };
}

export default function Edit({ user }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        signature: null as File | null,
        _method: 'POST',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/profile');
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
        </AdminLayout>
    );
}
