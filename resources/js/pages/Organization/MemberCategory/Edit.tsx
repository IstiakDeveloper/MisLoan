import React from 'react';
import AdminLayout from '@/layouts/admin-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { PageProps } from '@/types';
import { MemberCategory, MemberCategoryFormData } from '@/types/memberCategory';

interface Props extends PageProps {
    category: MemberCategory;
}

export default function Edit({ auth, category }: Props) {
    const { data, setData, put, processing, errors } = useForm<MemberCategoryFormData>({
        category_name: category.category_name,
        category_name_bn: category.category_name_bn || '',
        description: category.description || '',
        is_active: category.is_active,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/member-categories/${category.id}`);
    };

    return (
        <AdminLayout>
            <Head title="Edit Member Category" />

            <div className="p-6">
                <div className="max-w-3xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <Link
                            href="/member-categories"
                            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Categories
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900">Edit Member Category</h1>
                        <p className="mt-1 text-sm text-gray-500">Update category information</p>
                    </div>

                    {/* Form */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Category Name (English) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Category Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.category_name}
                                    onChange={(e) => setData('category_name', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    placeholder="Enter category name"
                                    required
                                />
                                {errors.category_name && (
                                    <p className="mt-1 text-sm text-red-600">{errors.category_name}</p>
                                )}
                            </div>

                            {/* Category Name (Bangla) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Category Name (Bangla)
                                </label>
                                <input
                                    type="text"
                                    value={data.category_name_bn}
                                    onChange={(e) => setData('category_name_bn', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    placeholder="বাংলা নাম"
                                />
                                {errors.category_name_bn && (
                                    <p className="mt-1 text-sm text-red-600">{errors.category_name_bn}</p>
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
                                    placeholder="Add a description for this category..."
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
                                    <p className="text-xs text-gray-500">Enable this category for use in the system</p>
                                </div>
                            </div>

                            {/* Submit Buttons */}
                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                                <Link
                                    href="/member-categories"
                                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors duration-150"
                                >
                                    Cancel
                                </Link>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors duration-150 shadow-sm"
                                >
                                    {processing ? 'Updating...' : 'Update Category'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
