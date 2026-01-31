import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Upload, Download, AlertCircle, Save, FileSpreadsheet, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface MemberData {
    excel_row_number: number;
    branch_name?: string;
    officer_name?: string;
    component_name?: string;
    society_name?: string;
    member_name: string;
    mobile: string;
    residential_property?: string;
    cultivable_land?: string;
    total_land?: string;
    cattle_count?: string;
    goat_count?: string;
    poultry_count?: string;
    fixed_movable_assets_value?: string;
    earning_person_occupation?: string;
    family_monthly_income?: string;
    guarantor_name?: string;
    guarantor_relation?: string;
    remarks?: string;
}

interface Props {
    members?: MemberData[];
    step?: 'upload' | 'nid';
    errors?: any;
}

export default function CreateAdmission({ members: initialMembers, step: initialStep, errors: pageErrors }: Props) {
    const [step, setStep] = useState<'upload' | 'nid'>('upload');
    const [members, setMembers] = useState<MemberData[]>([]);
    const [analyzing, setAnalyzing] = useState(false);
    const [uploadError, setUploadError] = useState<string>('');
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [processing, setProcessing] = useState(false);
    const [submitError, setSubmitError] = useState<string>('');

    const [nidFrontPreviews, setNidFrontPreviews] = useState<{ [key: number]: string }>({});
    const [nidBackPreviews, setNidBackPreviews] = useState<{ [key: number]: string }>({});
    const [validationErrors, setValidationErrors] = useState<{ [key: number]: string[] }>({});
    const [validationWarnings, setValidationWarnings] = useState<{ [key: number]: string[] }>({});

    // Helper function to convert Bangla digits to English
    const convertBanglaToEnglish = (str: string): string => {
        const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
        const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

        let result = str;
        banglaDigits.forEach((bangla, index) => {
            result = result.replace(new RegExp(bangla, 'g'), englishDigits[index]);
        });
        return result;
    };

    // Validate member data - only critical fields
    const validateMember = (member: MemberData): string[] => {
        const errors: string[] = [];

        if (!member.member_name || member.member_name.trim() === '') {
            errors.push('সদস্যের নাম প্রয়োজন');
        }

        if (!member.mobile || member.mobile.trim() === '') {
            errors.push('মোবাইল নম্বর প্রয়োজন');
        } else if (!/^\d+$/.test(member.mobile)) {
            errors.push('মোবাইল শুধুমাত্র সংখ্যা');
        }

        return errors;
    };

    // Get warnings for optional fields
    const getMemberWarnings = (member: MemberData): string[] => {
        const warnings: string[] = [];

        if (!member.branch_name || member.branch_name.trim() === '') {
            warnings.push('শাখার নাম পূরণ করা হয়নি');
        }

        if (!member.officer_name || member.officer_name.trim() === '') {
            warnings.push('অফিসারের নাম পূরণ করা হয়নি');
        }

        if (!member.component_name || member.component_name.trim() === '') {
            warnings.push('কম্পোনেন্টের নাম পূরণ করা হয়নি');
        }

        if (!member.society_name || member.society_name.trim() === '') {
            warnings.push('সমিতির নাম পূরণ করা হয়নি');
        }

        if (!member.residential_property || member.residential_property.trim() === '') {
            warnings.push('বসতবাড়ী পূরণ করা হয়নি');
        }

        if (!member.cultivable_land || member.cultivable_land.trim() === '') {
            warnings.push('আবাদী পূরণ করা হয়নি');
        }

        if (!member.total_land || member.total_land.trim() === '') {
            warnings.push('মোট জমি পূরণ করা হয়নি');
        }

        if (!member.earning_person_occupation || member.earning_person_occupation.trim() === '') {
            warnings.push('উপার্জন কারীর পেষা পূরণ করা হয়নি');
        }

        if (!member.family_monthly_income || member.family_monthly_income.trim() === '') {
            warnings.push('পরিবারের মাসিক আয় পূরণ করা হয়নি');
        }

        if (!member.guarantor_name || member.guarantor_name.trim() === '') {
            warnings.push('জামিনদারের নাম পূরণ করা হয়নি');
        }

        if (!member.guarantor_relation || member.guarantor_relation.trim() === '') {
            warnings.push('সদস্যের সাথে জামিনদারের সম্পর্ক পূরণ করা হয়নি');
        }

        return warnings;
    };

    const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setAnalyzing(true);
        setUploadError('');
        setValidationErrors({});
        setValidationWarnings({});
        setExcelFile(file);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                // Skip header row
                const dataRows = jsonData.slice(1);
                const parsedMembers: MemberData[] = [];
                const errors: { [key: number]: string[] } = {};
                const warnings: { [key: number]: string[] } = {};

                dataRows.forEach((row, index) => {
                    // Ensure row has 19 columns (pad with empty strings if needed)
                    const fullRow = [...row];
                    while (fullRow.length < 19) {
                        fullRow.push('');
                    }

                    if (fullRow.length > 0 && fullRow[5]) { // Check if member name exists (column F)
                        const member: MemberData = {
                            excel_row_number: index + 2,
                            branch_name: fullRow[1]?.toString().trim() || '',
                            officer_name: fullRow[2]?.toString().trim() || '',
                            component_name: fullRow[3]?.toString().trim() || '',
                            society_name: fullRow[4]?.toString().trim() || '',
                            member_name: fullRow[5]?.toString().trim() || '',
                            mobile: fullRow[6] ? convertBanglaToEnglish(fullRow[6].toString().trim()) : '',
                            residential_property: fullRow[7]?.toString().trim() || '',
                            cultivable_land: fullRow[8]?.toString().trim() || '',
                            total_land: fullRow[9]?.toString().trim() || '',
                            cattle_count: fullRow[10]?.toString().trim() || '',
                            goat_count: fullRow[11]?.toString().trim() || '',
                            poultry_count: fullRow[12]?.toString().trim() || '',
                            fixed_movable_assets_value: fullRow[13]?.toString().trim() || '',
                            earning_person_occupation: fullRow[14]?.toString().trim() || '',
                            family_monthly_income: fullRow[15] ? convertBanglaToEnglish(fullRow[15].toString().trim()) : '',
                            guarantor_name: fullRow[16]?.toString().trim() || '',
                            guarantor_relation: fullRow[17]?.toString().trim() || '',
                            remarks: fullRow[18]?.toString().trim() || '',
                        };

                        // Validate member (critical errors only)
                        const memberErrors = validateMember(member);
                        if (memberErrors.length > 0) {
                            errors[member.excel_row_number] = memberErrors;
                        }

                        // Get warnings for optional fields
                        const memberWarnings = getMemberWarnings(member);
                        if (memberWarnings.length > 0) {
                            warnings[member.excel_row_number] = memberWarnings;
                        }

                        parsedMembers.push(member);
                    }
                });

                if (parsedMembers.length === 0) {
                    setUploadError('Excel ফাইলে কোনো সদস্য তথ্য পাওয়া যায়নি');
                    setAnalyzing(false);
                    return;
                }

                // Check if there are critical errors (block upload)
                if (Object.keys(errors).length > 0) {
                    setValidationErrors(errors);
                    setUploadError(`❌ ${Object.keys(errors).length}টি সারিতে সমস্যা পাওয়া গেছে। নীচে বিবরণ দেখুন এবং ঠিক করুন।`);
                    setAnalyzing(false);
                    return;
                }

                // Set warnings if any
                if (Object.keys(warnings).length > 0) {
                    setValidationWarnings(warnings);
                }

                setMembers(parsedMembers);
                setStep('nid');
                setAnalyzing(false);
            } catch (error: any) {
                console.error('Excel parse error:', error);
                setUploadError('Excel ফাইল বিশ্লেষণে সমস্যা হয়েছে: ' + error.message);
                setAnalyzing(false);
            }
        };

        reader.onerror = () => {
            setUploadError('ফাইল পড়তে সমস্যা হয়েছে');
            setAnalyzing(false);
        };

        reader.readAsArrayBuffer(file);
    };

    const handleFileChange = (index: number, field: string, file: File | null) => {
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (field === 'nid_front_image') {
                    setNidFrontPreviews({ ...nidFrontPreviews, [index]: reader.result as string });
                } else if (field === 'nid_back_image') {
                    setNidBackPreviews({ ...nidBackPreviews, [index]: reader.result as string });
                }
            };
            reader.readAsDataURL(file);
        }

        const updatedMembers = [...members];
        (updatedMembers[index] as any)[field] = file;
        setMembers(updatedMembers);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate all members have NID cards
        const missingNid = members.some((m: any) => !m.nid_front_image || !m.nid_back_image);
        if (missingNid) {
            alert('সকল সদস্যের জন্য এনআইডি কার্ডের সামনে এবং পিছনের ছবি আপলোড করা আবশ্যক');
            return;
        }

        if (!excelFile) {
            alert('Excel ফাইল পাওয়া যায়নি');
            return;
        }

        setProcessing(true);

        // Create FormData
        const data = new FormData();
        data.append('excel_file', excelFile);

        members.forEach((member: any, index) => {
            data.append(`members[${index}][excel_row_number]`, member.excel_row_number);
            data.append(`members[${index}][branch_name]`, member.branch_name || '');
            data.append(`members[${index}][officer_name]`, member.officer_name || '');
            data.append(`members[${index}][component_name]`, member.component_name || '');
            data.append(`members[${index}][society_name]`, member.society_name || '');
            data.append(`members[${index}][member_name]`, member.member_name);
            data.append(`members[${index}][mobile]`, member.mobile);

            // Livestock information
            data.append(`members[${index}][residential_property]`, member.residential_property || '');
            data.append(`members[${index}][cultivable_land]`, member.cultivable_land || '');
            data.append(`members[${index}][total_land]`, member.total_land || '');
            data.append(`members[${index}][cattle_count]`, member.cattle_count || '');
            data.append(`members[${index}][goat_count]`, member.goat_count || '');
            data.append(`members[${index}][poultry_count]`, member.poultry_count || '');

            // Assets and income information
            data.append(`members[${index}][fixed_movable_assets_value]`, member.fixed_movable_assets_value || '');
            data.append(`members[${index}][earning_person_occupation]`, member.earning_person_occupation || '');
            data.append(`members[${index}][family_monthly_income]`, member.family_monthly_income || '');

            // Guarantor information
            data.append(`members[${index}][guarantor_name]`, member.guarantor_name || '');
            data.append(`members[${index}][guarantor_relation]`, member.guarantor_relation || '');
            data.append(`members[${index}][remarks]`, member.remarks || '');

            // Append file objects
            if (member.nid_front_image) {
                data.append(`members[${index}][nid_front_image]`, member.nid_front_image);
            }
            if (member.nid_back_image) {
                data.append(`members[${index}][nid_back_image]`, member.nid_back_image);
            }
        });

        router.post('/admissions', data, {
            onSuccess: () => {
                setProcessing(false);
                setSubmitError('');
                router.visit('/admissions');
            },
            onError: (errors) => {
                setProcessing(false);
                const errorMsg = Object.values(errors).flat().join(', ');
                setSubmitError(errorMsg || 'একটি ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
                console.error('Form errors:', errors);
            }
        });
    };    const downloadTemplate = () => {
        window.location.href = '/admissions/template/download';
    };

    return (
        <AdminLayout>
            <Head title="নতুন সদস্য ভর্তি আবেদন" />

            <div className="py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900">নতুন সদস্য ভর্তি আবেদন</h1>
                        <p className="text-gray-600 mt-2">Excel আপলোড করুন এবং সকল সদস্যের এনআইডি কার্ড যোগ করুন</p>
                    </div>

                    {/* Step 1: Excel Upload */}
                    {step === 'upload' && (
                        <div className="bg-white rounded-lg shadow-sm p-8">
                            <div className="max-w-2xl mx-auto">
                                <div className="text-center mb-6">
                                    <FileSpreadsheet size={64} className="mx-auto text-blue-600 mb-4" />
                                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Excel ফাইল আপলোড করুন</h2>
                                    <p className="text-gray-600">সদস্যদের তথ্য সহ Excel ফাইল আপলোড করুন</p>
                                </div>

                                <div className="mb-6">
                                    <button
                                        onClick={downloadTemplate}
                                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                    >
                                        <Download size={20} />
                                        Excel টেমপ্লেট ডাউনলোড করুন
                                    </button>
                                </div>

                                {uploadError && (
                                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                                            <p className="text-sm text-red-700">{uploadError}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Validation Errors Detail View */}
                                {Object.keys(validationErrors).length > 0 && (
                                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                                        <h3 className="font-semibold text-red-900 mb-3">❌ সমালোচনীয় সমস্যা (আপনাকে ঠিক করতে হবে):</h3>
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {Object.entries(validationErrors).map(([rowNum, errors]) => (
                                                <div key={rowNum} className="text-sm bg-white p-2 rounded border border-red-200">
                                                    <p className="font-medium text-red-900">সারি {rowNum}:</p>
                                                    <ul className="ml-4 mt-1 space-y-1">
                                                        {errors.map((error, idx) => (
                                                            <li key={idx} className="text-red-700">• {error}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-red-700 mt-3 font-medium">❌ Excel ফাইল সঠিক করুন এবং পুনরায় আপলোড করুন</p>
                                    </div>
                                )}

                                {/* Validation Warnings Detail View */}
                                {Object.keys(validationWarnings).length > 0 && Object.keys(validationErrors).length === 0 && (
                                    <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                        <h3 className="font-semibold text-yellow-900 mb-3">⚠️ সম্পূরক তথ্য অনুপস্থিত (ঐচ্ছিক):</h3>
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {Object.entries(validationWarnings).map(([rowNum, warnings]) => (
                                                <div key={rowNum} className="text-sm bg-white p-2 rounded border border-yellow-200">
                                                    <p className="font-medium text-yellow-900">সারি {rowNum}:</p>
                                                    <ul className="ml-4 mt-1 space-y-1">
                                                        {warnings.map((warning, idx) => (
                                                            <li key={idx} className="text-yellow-700">• {warning}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-yellow-700 mt-3 font-medium">💡 এই তথ্য পরে যোগ করতে পারবেন। চালিয়ে যেতে চাইলে "এনআইডি আপলোড" ক্লিক করুন।</p>
                                    </div>
                                )}

                                <div className="relative">
                                    <input
                                        type="file"
                                        accept=".xlsx,.xls"
                                        onChange={handleExcelUpload}
                                        disabled={analyzing}
                                        className="hidden"
                                        id="excel-upload"
                                    />
                                    <label
                                        htmlFor="excel-upload"
                                        className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                                            analyzing
                                                ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                                                : 'border-blue-300 hover:bg-blue-50'
                                        }`}
                                    >
                                        {analyzing ? (
                                            <>
                                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                                                <p className="text-lg font-medium text-gray-700">বিশ্লেষণ করা হচ্ছে...</p>
                                            </>
                                        ) : excelFile ? (
                                            <>
                                                <CheckCircle size={48} className="text-green-600 mb-4" />
                                                <p className="text-lg font-medium text-gray-900">{excelFile.name}</p>
                                                <p className="text-sm text-gray-500 mt-2">অন্য ফাইল আপলোড করতে ক্লিক করুন</p>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="text-gray-400 mb-4" size={48} />
                                                <p className="text-lg font-medium text-gray-700">Excel ফাইল আপলোড করুন</p>
                                                <p className="text-sm text-gray-500 mt-2">.xlsx বা .xls ফরম্যাট</p>
                                            </>
                                        )}
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: NID Upload */}
                    {step === 'nid' && (
                        <form onSubmit={handleSubmit}>
                            {submitError && (
                                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                                        <p className="text-sm text-red-700">{submitError}</p>
                                    </div>
                                </div>
                            )}
                            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900">
                                            মোট সদস্য: {members.length} জন
                                        </h2>
                                        <p className="text-sm text-gray-600 mt-1">
                                            প্রতিটি সদস্যের জন্য এনআইডি কার্ডের উভয় পার্শ্ব আপলোড করুন
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setStep('upload');
                                            setMembers([]);
                                            setExcelFile(null);
                                        }}
                                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                    >
                                        নতুন Excel আপলোড করুন
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {members.map((member, index) => (
                                        <div key={index} className="border border-gray-200 rounded-lg p-6">
                                            <div className="flex items-start justify-between mb-4">
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">
                                                        {index + 1}. {member.member_name}
                                                    </h3>
                                                    <p className="text-sm text-gray-600">পিতা: {member.father_name}</p>
                                                    <p className="text-sm text-gray-600">এনআইডি: {member.nid_number}</p>
                                                </div>
                                                <span className="text-xs text-gray-500">Row #{member.excel_row_number}</span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* NID Front */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        এনআইডি (সামনে) <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => handleFileChange(index, 'nid_front_image', e.target.files?.[0] || null)}
                                                        className="hidden"
                                                        id={`nid-front-${index}`}
                                                        name={`members[${index}][nid_front_image]`}
                                                    />
                                                    <label
                                                        htmlFor={`nid-front-${index}`}
                                                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                                                    >
                                                        {nidFrontPreviews[index] ? (
                                                            <img src={nidFrontPreviews[index]} alt="NID Front" className="h-full w-full object-cover rounded-lg" />
                                                        ) : (
                                                            <>
                                                                <Upload className="text-gray-400 mb-2" size={24} />
                                                                <span className="text-sm text-gray-500">আপলোড করুন</span>
                                                            </>
                                                        )}
                                                    </label>
                                                </div>

                                                {/* NID Back */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        এনআইডি (পিছনে) <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => handleFileChange(index, 'nid_back_image', e.target.files?.[0] || null)}
                                                        className="hidden"
                                                        id={`nid-back-${index}`}
                                                        name={`members[${index}][nid_back_image]`}
                                                    />
                                                    <label
                                                        htmlFor={`nid-back-${index}`}
                                                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                                                    >
                                                        {nidBackPreviews[index] ? (
                                                            <img src={nidBackPreviews[index]} alt="NID Back" className="h-full w-full object-cover rounded-lg" />
                                                        ) : (
                                                            <>
                                                                <Upload className="text-gray-400 mb-2" size={24} />
                                                                <span className="text-sm text-gray-500">আপলোড করুন</span>
                                                            </>
                                                        )}
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => router.visit('/admissions')}
                                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    বাতিল করুন
                                </button>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Save size={20} />
                                    {processing ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
