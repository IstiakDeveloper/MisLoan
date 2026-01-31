import React, { useState } from 'react';
import AdminLayout from '@/layouts/admin-layout';
import { Head, useForm } from '@inertiajs/react';
import { Upload, Download, FileSpreadsheet, AlertCircle, Building2 } from 'lucide-react';

interface Branch {
    id: number;
    name: string;
    area?: {
        name: string;
        zone?: {
            name: string;
        };
    };
}

interface Props {
    branches: Branch[];
    selectedBranchId?: number | null;
}

export default function LoanUpload({ branches, selectedBranchId }: Props) {
    const { data, setData, post, processing, errors, progress } = useForm({
        branch_id: selectedBranchId ? selectedBranchId.toString() : '',
        excel_file: null as File | null,
        branch_remarks: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Form submission started');
        console.log('Branch ID:', data.branch_id);
        console.log('Excel File:', data.excel_file);
        console.log('File Name:', data.excel_file?.name);
        console.log('File Size:', data.excel_file?.size);
        console.log('Branch Remarks:', data.branch_remarks);

        post('/loan', {
            onSuccess: () => {
                console.log('Upload successful');
            },
            onError: (errors) => {
                console.error('Upload errors:', errors);
            },
            onFinish: () => {
                console.log('Upload finished');
            }
        });
    };

    const handleDownloadTemplate = () => {
        window.location.href = '/loan/template/download';
    };

    return (
        <AdminLayout>
            <Head title="Upload Loan Application" />

            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Loan Application</h1>
                            <p className="text-gray-600">Download the template, fill in loan member details, and upload the completed file.</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleDownloadTemplate}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <Download size={18} />
                            Download Template
                        </button>
                    </div>
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                    <div className="flex gap-3">
                        <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                        <div className="flex-1">
                            <h3 className="font-semibold text-blue-900 mb-2">Instructions</h3>
                            <ul className="space-y-1 text-sm text-blue-800">
                                <li>• <strong>Download the template</strong> using the green button above</li>
                                <li>• <strong>Open with Excel/LibreOffice</strong> and fill in Bangla text directly</li>
                                <li>• <strong>Do NOT copy-paste</strong> from other files - type directly in the template</li>
                                <li>• <strong>Do NOT modify</strong> the column headers or column order</li>
                                <li>• <strong>Save normally</strong> (Ctrl+S) - UTF-8 encoding is automatic</li>
                                <li>• Dates: YYYY-MM-DD format (e.g., ২০২৫-০১-১৫)</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Warning for Bangla Excel */}
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6">
                    <div className="flex gap-2 items-start">
                        <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
                        <div className="text-sm">
                            <p className="font-semibold text-amber-900 mb-1">⚠️ Important for Bangla Text:</p>
                            <p className="text-amber-800">
                                Always use the downloaded template. If you create your own Excel file with Bangla text,
                                it may not upload correctly due to encoding issues.
                                <a href="/loan/test-upload" className="underline font-medium ml-1">Test your file here</a> before uploading.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Upload Form */}
                <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
                    {/* Branch Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            <Building2 size={16} className="inline mr-1" />
                            Select Branch *
                        </label>
                        <select
                            value={data.branch_id}
                            onChange={(e) => setData('branch_id', e.target.value)}
                            disabled={branches.length === 1}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                errors.branch_id ? 'border-red-500' : 'border-gray-300'
                            } ${branches.length === 1 ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                            required
                        >
                            {branches.length === 1 ? null : <option value="">Choose a branch...</option>}
                            {branches.map((branch) => (
                                <option key={branch.id} value={branch.id}>
                                    {branch.name}
                                    {branch.area && ` - ${branch.area.name}`}
                                    {branch.area?.zone && ` (${branch.area.zone.name})`}
                                </option>
                            ))}
                        </select>
                        {branches.length === 1 && (
                            <p className="text-sm text-gray-600 mt-1">
                                Your assigned branch is automatically selected
                            </p>
                        )}
                        {errors.branch_id && (
                            <p className="text-red-600 text-sm mt-1">{errors.branch_id}</p>
                        )}
                    </div>

                    {/* File Upload */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            <FileSpreadsheet size={16} className="inline mr-1" />
                            Upload Excel File *
                        </label>
                        <div
                            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                                data.excel_file
                                    ? 'border-green-500 bg-green-50'
                                    : errors.excel_file
                                    ? 'border-red-500 bg-red-50'
                                    : 'border-gray-300 hover:border-blue-400'
                            }`}
                        >
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={(e) => setData('excel_file', e.target.files?.[0] || null)}
                                className="hidden"
                                id="excel_file"
                                required
                            />
                            <label htmlFor="excel_file" className="cursor-pointer">
                                {data.excel_file ? (
                                    <div className="flex flex-col items-center">
                                        <FileSpreadsheet size={48} className="text-green-600 mb-3" />
                                        <p className="font-medium text-green-700">{data.excel_file.name}</p>
                                        <p className="text-sm text-green-600 mt-1">
                                            {(data.excel_file.size / 1024).toFixed(2)} KB
                                        </p>
                                        <p className="text-sm text-gray-600 mt-3">Click to change file</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <Upload size={48} className="text-gray-400 mb-3" />
                                        <p className="font-medium text-gray-700">Click to upload Excel file</p>
                                        <p className="text-sm text-gray-500 mt-1">XLSX or XLS (Max 5MB)</p>
                                    </div>
                                )}
                            </label>
                        </div>
                        {errors.excel_file && (
                            <p className="text-red-600 text-sm mt-2">{errors.excel_file}</p>
                        )}
                        {progress && (
                            <div className="mt-3">
                                <div className="bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${progress.percentage}%` }}
                                    />
                                </div>
                                <p className="text-sm text-gray-600 text-center mt-1">
                                    Uploading... {progress.percentage}%
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Branch Remarks */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Branch Remarks (Optional)
                        </label>
                        <textarea
                            value={data.branch_remarks}
                            onChange={(e) => setData('branch_remarks', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={4}
                            placeholder="Add any additional notes or remarks..."
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex-1 py-3 px-6 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            {processing ? 'Uploading...' : 'Submit Application'}
                        </button>
                        <button
                            type="button"
                            onClick={() => window.history.back()}
                            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
