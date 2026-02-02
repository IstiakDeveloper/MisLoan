import React from 'react';
import AdminLayout from '@/layouts/admin-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { PageProps } from '@/types';
import { SamityFormData } from '@/types/samity';

interface Props extends PageProps {
    branches: Array<{
        id: number;
        name: string;
        code: string;
        area: {
            id: number;
            name: string;
            zone: {
                id: number;
                name: string;
            };
        };
    }>;
}

export default function Create({ auth, branches }: Props) {
    const { data, setData, post, processing, errors } = useForm<SamityFormData>({
        branch_id: null,
        samity_code: '',
        samity_name: '',
        samity_name_bn: '',
        description: '',
        is_active: true,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/samities');
    };

    return (
        <AdminLayout>
            <Head title="Create Samity" />

            <div className="p-6">
                <div className="max-w-3xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <Link
                            href="/samities"
                            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Samities
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900">Create Samity</h1>
                        <p className="mt-1 text-sm text-gray-500">Add a new samity to your organization</p>
                    </div>

                    {/* Form */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Branch Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Branch <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={data.branch_id || ''}
                                    onChange={(e) => setData('branch_id', Number(e.target.value))}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    required
                                >
                                    <option value="">Select a branch</option>
                                    {branches.map((branch) => (
                                        <option key={branch.id} value={branch.id}>
                                            {branch.name} - {branch.area.name}, {branch.area.zone.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.branch_id && (
                                    <p className="mt-1 text-sm text-red-600">{errors.branch_id}</p>
                                )}
                            </div>

                            {/* Samity Code */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Samity Code <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.samity_code}
                                    onChange={(e) => setData('samity_code', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    placeholder="e.g., SAM-001"
                                    required
                                />
                                {errors.samity_code && (
                                    <p className="mt-1 text-sm text-red-600">{errors.samity_code}</p>
                                )}
                            </div>

                            {/* Samity Name (English) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Samity Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.samity_name}
                                    onChange={(e) => setData('samity_name', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    placeholder="Enter samity name"
                                    required
                                />
                                {errors.samity_name && (
                                    <p className="mt-1 text-sm text-red-600">{errors.samity_name}</p>
                                )}
                            </div>

                            {/* Samity Name (Bangla) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Samity Name (Bangla)
                                </label>
                                <input
                                    type="text"
                                    value={data.samity_name_bn}
                                    onChange={(e) => setData('samity_name_bn', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    placeholder="বাংলা নাম"
                                />
                                {errors.samity_name_bn && (
                                    <p className="mt-1 text-sm text-red-600">{errors.samity_name_bn}</p>
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    rows={4}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    placeholder="Add a description for this samity..."
                                />
                                {errors.description && (
                                    <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                                )}
                            </div>

                            {/* Is Active */}
                            <div className="flex items-start">
                                <div className="flex items-center h-5">
                                    <input
                                        type="checkbox"
                                        checked={data.is_active}
                                        onChange={(e) => setData('is_active', e.target.checked)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                </div>
                                <div className="ml-3">
                                    <label className="text-sm font-medium text-gray-700">
                                        Active Status
                                    </label>
                                    <p className="text-xs text-gray-500">Enable this samity for use in the system</p>
                                </div>
                            </div>

                            {/* Submit Buttons */}
                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                                <Link
                                    href="/samities"
                                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors duration-150"
                                >
                                    Cancel
                                </Link>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors duration-150 shadow-sm"
                                >
                                    {processing ? 'Creating...' : 'Create Samity'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
