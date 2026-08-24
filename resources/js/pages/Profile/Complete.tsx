import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import { User, Save, Upload, AlertCircle } from 'lucide-react';
import { prepareAdmissionUploadFile } from '@/utils/imageUpload';

interface Props {
    user: {
        id: number;
        name: string;
        email: string;
        phone?: string;
        signature?: string;
    };
}

export default function Complete({ user }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        phone: user.phone || '',
        pin: '',
        signature: null as File | null,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/profile/complete');
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <Head title="Complete Profile - প্রোফাইল সম্পূর্ণ করুন" />

            <div className="w-full max-w-lg bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-amber-500 text-white px-6 py-4 flex items-center gap-3">
                    <AlertCircle className="w-8 h-8 shrink-0" />
                    <div>
                        <h1 className="text-xl font-bold">প্রোফাইল সম্পূর্ণ করুন</h1>
                        <p className="text-sm text-amber-100 mt-0.5">
                            ফোন নম্বর, পিন ও ডিজিটাল স্বাক্ষর পূরণ না করলে আপনি অন্য কোনো কাজ করতে পারবেন না।
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                        <User className="w-10 h-10 text-gray-400" />
                        <div>
                            <p className="font-medium text-gray-900">{user.name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            ফোন নম্বর (Phone) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.phone}
                            onChange={(e) => setData('phone', e.target.value)}
                            placeholder="০১৭xxxxxxxx"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            required
                        />
                        {errors.phone && (
                            <p className="text-sm text-red-600 mt-1">{errors.phone}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            এমপ্লয়ি পিন (Employee PIN) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.pin}
                            onChange={(e) => setData('pin', e.target.value)}
                            placeholder="যেমন: 0027"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-mono"
                            required
                        />
                        {errors.pin && (
                            <p className="text-sm text-red-600 mt-1">{errors.pin}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            ডিজিটাল স্বাক্ষর (Digital Signature) <span className="text-red-500">*</span>
                        </label>
                        <label className="flex cursor-pointer gap-3 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-amber-500 hover:bg-amber-50/50 transition-colors">
                            <Upload className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-700">
                                    {data.signature ? data.signature.name : 'স্বাক্ষরের ছবি আপলোড করুন (PNG/JPG, সর্বোচ্চ ২MB)'}
                                </p>
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) {
                                        setData('signature', null);
                                        return;
                                    }

                                    const result = await prepareAdmissionUploadFile(file, { maxWidth: 1000 });
                                    if (!result.ok) {
                                        alert(result.error);
                                        return;
                                    }

                                    setData('signature', result.file);
                                }}
                                className="hidden"
                            />
                        </label>
                        {user.signature && (
                            <p className="text-xs text-gray-500 mt-1">ইতিমধ্যে স্বাক্ষর আছে; নতুন দিলে প্রতিস্থাপিত হবে।</p>
                        )}
                        {errors.signature && (
                            <p className="text-sm text-red-600 mt-1">{errors.signature}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Save className="w-5 h-5" />
                        {processing ? 'সেভ করা হচ্ছে...' : 'সেভ করুন ও অ্যাপে যান'}
                    </button>
                </form>
            </div>
        </div>
    );
}
