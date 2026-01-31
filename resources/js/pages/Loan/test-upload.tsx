import React, { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/admin-layout';
import { Head, router, usePage } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';

interface AnalysisResult {
    file_name: string;
    file_size: number;
    mime_type: string;
    has_bangla: boolean;
    bangla_char_count: number;
    total_char_count: number;
    bangla_percentage: number;
    detected_encoding: string;
    sample_data: any[][];
    row_count: number;
    column_count: number;
}

interface PageProps {
    flash: {
        analysisResult?: AnalysisResult;
    };
    errors: Record<string, string>;
    [key: string]: any;
}

export default function TestUpload() {
    const { flash, errors } = usePage<PageProps>().props;
    const [file, setFile] = useState<File | null>(null);
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Update analysis when flash data changes
    useEffect(() => {
        if (flash?.analysisResult) {
            setAnalysis(flash.analysisResult);
            setLoading(false);
        }
        if (errors?.excel_file) {
            setError(errors.excel_file);
            setLoading(false);
        }
    }, [flash, errors]);

    const analyzeFile = (selectedFile: File) => {
        setFile(selectedFile);
        setLoading(true);
        setError(null);
        setAnalysis(null);

        const formData = new FormData();
        formData.append('excel_file', selectedFile);

        router.post('/loan/test-analyze', formData, {
            preserveState: false,
            preserveScroll: true,
        });
    };

    return (
        <AdminLayout>
            <Head title="Test Upload" />

            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h1 className="text-2xl font-bold mb-6">Excel File Analysis</h1>

                    <div className="mb-6">
                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={(e) => {
                                const selectedFile = e.target.files?.[0];
                                if (selectedFile) analyzeFile(selectedFile);
                            }}
                            className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-lg file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100"
                        />
                    </div>

                    {loading && (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="animate-spin text-blue-600 mr-2" size={24} />
                            <span className="text-gray-600">Analyzing file...</span>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                            <p className="text-red-800 font-medium">Error: {error}</p>
                        </div>
                    )}

                    {analysis && (
                        <div className="space-y-6">
                            {/* Summary */}
                            <div className="bg-gray-50 p-6 rounded-lg">
                                <h2 className="font-semibold text-lg mb-4">File Analysis Summary</h2>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600">File Name</p>
                                        <p className="font-medium">{analysis.file_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">File Size</p>
                                        <p className="font-medium">{(analysis.file_size / 1024).toFixed(2)} KB</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Rows × Columns</p>
                                        <p className="font-medium">{analysis.row_count} × {analysis.column_count}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Detected Encoding</p>
                                        <p className="font-medium">{analysis.detected_encoding}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Bangla Detection */}
                            <div className={`p-6 rounded-lg border-2 ${
                                analysis.has_bangla
                                    ? 'bg-green-50 border-green-300'
                                    : 'bg-red-50 border-red-300'
                            }`}>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`text-2xl ${analysis.has_bangla ? 'text-green-600' : 'text-red-600'}`}>
                                        {analysis.has_bangla ? '✓' : '✗'}
                                    </div>
                                    <div>
                                        <h3 className={`font-bold text-lg ${
                                            analysis.has_bangla ? 'text-green-900' : 'text-red-900'
                                        }`}>
                                            {analysis.has_bangla ? 'Bangla Characters Detected' : 'No Bangla Characters Found'}
                                        </h3>
                                        <p className={`text-sm ${
                                            analysis.has_bangla ? 'text-green-700' : 'text-red-700'
                                        }`}>
                                            {analysis.has_bangla
                                                ? `Found ${analysis.bangla_char_count} Bangla characters (${analysis.bangla_percentage}% of total)`
                                                : 'This file does not contain any Bangla text in UTF-8 encoding'
                                            }
                                        </p>
                                    </div>
                                </div>

                                {analysis.has_bangla ? (
                                    <div className="bg-green-100 p-3 rounded mt-3">
                                        <p className="text-sm text-green-800">
                                            ✅ <strong>This file is ready to upload!</strong> It contains properly encoded Bangla text.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="bg-red-100 p-3 rounded mt-3">
                                        <p className="text-sm text-red-800">
                                            ❌ <strong>This file may have issues.</strong> Download the template from the system and try again.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Sample Data */}
                            <div className="bg-white border rounded-lg p-6">
                                <h3 className="font-semibold text-lg mb-4">Sample Data (First 5 Rows)</h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm border-collapse">
                                        <tbody>
                                            {analysis.sample_data.slice(0, 5).map((row, idx) => (
                                                <tr key={idx} className={idx === 0 ? 'bg-gray-100 font-semibold' : ''}>
                                                    {row.slice(0, 6).map((cell, cellIdx) => (
                                                        <td key={cellIdx} className="border px-3 py-2 max-w-[200px] truncate">
                                                            {cell || <span className="text-gray-400">empty</span>}
                                                        </td>
                                                    ))}
                                                    {row.length > 6 && (
                                                        <td className="border px-3 py-2 text-gray-400">
                                                            ... +{row.length - 6} more
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 bg-blue-50 border border-blue-200 p-4 rounded-lg">
                        <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>1. Download template from: <a href="/loan/upload" className="underline font-medium">Loan Upload Page</a></li>
                            <li>2. Fill in Bangla data directly in the template (do not copy-paste from other files)</li>
                            <li>3. Upload here to verify Bangla detection before actual submission</li>
                            <li>4. If "Bangla Characters Detected" shows ✓, proceed to upload</li>
                        </ul>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
