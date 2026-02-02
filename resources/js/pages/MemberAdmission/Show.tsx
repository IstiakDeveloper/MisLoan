import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Send, Printer } from 'lucide-react';
import { MemberAdmission } from '@/types/memberAdmission';

interface Props {
    admission: MemberAdmission;
    auth: {
        user: {
            has_all_access: boolean;
        };
    };
}

export default function Show({ admission, auth }: Props) {
    const backUrl = auth.user.has_all_access ? '/head-office/admission-members' : '/member-admissions';

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: any; label: string }> = {
            draft: { variant: 'secondary', label: 'Draft (খসড়া)' },
            submitted: { variant: 'default', label: 'Submitted (জমা দেওয়া)' },
            under_review: { variant: 'default', label: 'Under Review (পর্যালোচনায়)' },
            pending_head_office: { variant: 'default', label: 'Pending Head Office (হেড অফিসে অপেক্ষমান)' },
            approved: { variant: 'default', label: 'Approved (অনুমোদিত)' },
            rejected: { variant: 'destructive', label: 'Rejected (বাতিল)' },
            needs_revision: { variant: 'default', label: 'Needs Revision (সংশোধন প্রয়োজন)' },
        };

        const config = variants[status] || { variant: 'secondary', label: status };
        return (
            <Badge
                variant={config.variant}
                className={
                    status === 'approved'
                        ? 'bg-green-500 hover:bg-green-600'
                        : status === 'under_review'
                        ? 'bg-yellow-500 hover:bg-yellow-600'
                        : status === 'submitted'
                        ? 'bg-blue-500 hover:bg-blue-600'
                        : status === 'pending_head_office'
                        ? 'bg-purple-500 hover:bg-purple-600'
                        : status === 'needs_revision'
                        ? 'bg-orange-500 hover:bg-orange-600'
                        : ''
                }
            >
                {config.label}
            </Badge>
        );
    };

    const handleSubmit = () => {
        if (confirm(`Are you sure you want to submit application ${admission.application_no}?`)) {
            router.patch(`/member-admissions/${admission.id}/submit`);
        }
    };

    const handlePrint = () => {
        // Open professional print page in new window
        const printUrl = auth.user.has_all_access
            ? `/head-office/admissions/${admission.id}/print`
            : `/member-admissions/${admission.id}/print`;
        window.open(printUrl, '_blank');
    };

    const isEditable = admission.status === 'draft' || admission.status === 'needs_revision';

    const InfoRow = ({ label, value, className = '' }: { label: string; value: any; className?: string }) => (
        <div className={`py-2 ${className}`}>
            <span className="text-sm font-medium text-gray-700">{label}:</span>
            <span className="ml-2 text-sm text-gray-900">{value || '-'}</span>
        </div>
    );

    const SectionTitle = ({ title }: { title: string }) => (
        <h3 className="text-base font-bold text-white bg-blue-600 px-4 py-2 print:bg-gray-800">
            {title}
        </h3>
    );

    return (
        <AdminLayout>
            <Head title={`Member Admission - ${admission.application_no}`} />

            <div className="space-y-6 print:space-y-2 max-w-7xl mx-auto">
                {/* Header - Hidden in print */}
                <div className="flex items-center justify-between print:hidden">
                    <div className="flex items-center gap-4">
                        <Link
                            href={backUrl}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Member Admission Application</h1>
                            <p className="text-sm text-gray-600 mt-1">Application No: {admission.application_no}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {getStatusBadge(admission.status)}
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                        >
                            <Printer className="w-4 h-4" />
                            Print
                        </button>
                        {isEditable && (
                            <Link
                                href={`/member-admissions/${admission.id}/edit`}
                                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                            >
                                <Edit className="w-4 h-4" />
                                Edit
                            </Link>
                        )}
                        {admission.status === 'draft' && (
                            <button
                                onClick={handleSubmit}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                <Send className="w-4 h-4" />
                                Submit
                            </button>
                        )}
                    </div>
                </div>

                {/* Print Header */}
                <div className="hidden print:block text-center border-b-4 border-gray-900 pb-4 mb-4">
                    <h1 className="text-xl font-bold mb-1">MEMBER ADMISSION APPLICATION FORM</h1>
                    <h2 className="text-lg font-bold mb-3">সদস্য ভর্তি আবেদন ফরম</h2>
                    <div className="flex justify-between items-center text-xs border-t border-gray-900 pt-2">
                        <span><strong>Application No:</strong> {admission.application_no}</span>
                        <span><strong>Date:</strong> {new Date(admission.created_at).toLocaleDateString()}</span>
                        <span><strong>Status:</strong> {admission.status.toUpperCase()}</span>
                    </div>
                </div>

                {/* Form Content */}
                <div className="bg-white rounded-lg shadow-lg print:shadow-none border-2 border-gray-200 print:border-gray-900">

                    {/* Organization & Date */}
                    <div className="print:break-inside-avoid">
                        <SectionTitle title="১. সংস্থা ও তারিখ | Organization & Date" />
                        <div className="p-4 grid grid-cols-2 gap-x-6 border-b border-gray-200">
                            <InfoRow label="Branch (শাখা)" value={admission.branch?.name} />
                            <InfoRow label="Samity (সমিতি)" value={admission.samity?.samity_name} />
                            <InfoRow label="Member Category (সদস্য শ্রেণী)" value={admission.member_category?.category_name} />
                            <InfoRow label="Survey Date (সমীক্ষা তারিখ)" value={admission.survey_date} />
                            <InfoRow label="Admission Date (ভর্তির তারিখ)" value={admission.admission_date} className="col-span-2" />
                        </div>
                    </div>

                    {/* Personal Information */}
                    <div className="print:break-inside-avoid">
                        <SectionTitle title="২. ব্যক্তিগত তথ্য | Personal Information" />
                        <div className="p-4 grid grid-cols-2 gap-x-6 border-b border-gray-200">
                            <InfoRow label="Applicant Name EN (আবেদনকারী)" value={admission.applicant_name_en} />
                            <InfoRow label="Applicant Name BN (নাম বাংলায়)" value={admission.applicant_name_bn} />
                            <InfoRow label="Father's Name EN (পিতার নাম)" value={admission.father_name_en} />
                            <InfoRow label="Father's Name BN (পিতার নাম বাংলায়)" value={admission.father_name_bn} />
                            <InfoRow label="Mother's Name EN (মাতার নাম)" value={admission.mother_name_en} />
                            <InfoRow label="Mother's Name BN (মাতার নাম বাংলায়)" value={admission.mother_name_bn} />
                            {admission.spouse_name_en && (
                                <>
                                    <InfoRow label="Spouse Name EN (স্বামী/স্ত্রীর নাম)" value={admission.spouse_name_en} />
                                    <InfoRow label="Spouse Name BN (স্বামী/স্ত্রীর নাম বাংলায়)" value={admission.spouse_name_bn} />
                                </>
                            )}
                            <InfoRow label="Marital Status (বৈবাহিক অবস্থা)" value={admission.marital_status} />
                            <InfoRow label="Gender (লিঙ্গ)" value={admission.gender} />
                            <InfoRow label="Date of Birth (জন্ম তারিখ)" value={admission.date_of_birth} />
                            <InfoRow label="Mobile Number (মোবাইল)" value={admission.mobile_number} />
                            <InfoRow label="Alternative Mobile (বিকল্প মোবাইল)" value={admission.alternative_mobile} />
                            <InfoRow label="Family Mobile (পরিবার মোবাইল)" value={admission.family_member_mobile} />
                        </div>
                    </div>

                    {/* Present Address */}
                    <div className="print:break-inside-avoid">
                        <SectionTitle title="৩. বর্তমান ঠিকানা | Present Address" />
                        <div className="p-4 grid grid-cols-2 gap-x-6 border-b border-gray-200">
                            <InfoRow label="Division (বিভাগ)" value={admission.present_division} />
                            <InfoRow label="District (জেলা)" value={admission.present_district} />
                            <InfoRow label="Upazila (উপজেলা)" value={admission.present_upazila} />
                            <InfoRow label="Union (ইউনিয়ন)" value={admission.present_union} />
                            <InfoRow label="Village/Road (গ্রাম/রাস্তা)" value={admission.present_village_road} />
                            <InfoRow label="Post Code (পোস্ট কোড)" value={admission.present_post_code} />
                        </div>
                    </div>

                    {/* Permanent Address */}
                    {!admission.permanent_address_same && (
                        <div className="print:break-inside-avoid">
                            <SectionTitle title="৪. স্থায়ী ঠিকানা | Permanent Address" />
                            <div className="p-4 grid grid-cols-2 gap-x-6 border-b border-gray-200">
                                <InfoRow label="Division (বিভাগ)" value={admission.permanent_division} />
                                <InfoRow label="District (জেলা)" value={admission.permanent_district} />
                                <InfoRow label="Upazila (উপজেলা)" value={admission.permanent_upazila} />
                                <InfoRow label="Union (ইউনিয়ন)" value={admission.permanent_union} />
                                <InfoRow label="Village/Road (গ্রাম/রাস্তা)" value={admission.permanent_village_road} />
                                <InfoRow label="Post Code (পোস্ট কোড)" value={admission.permanent_post_code} />
                            </div>
                        </div>
                    )}

                    {/* Identity Information */}
                    <div className="print:break-inside-avoid">
                        <SectionTitle title="৫. পরিচয় তথ্য | Identity Information" />
                        <div className="p-4 grid grid-cols-2 gap-x-6 border-b border-gray-200">
                            <InfoRow label="NID Number (এনআইডি)" value={admission.nid_number} />
                            <InfoRow label="Smart Card (স্মার্ট কার্ড)" value={admission.smart_card_number} />
                            <InfoRow label="Birth Certificate (জন্ম নিবন্ধন)" value={admission.birth_certificate_number} className="col-span-2" />
                        </div>
                    </div>

                    {/* Guarantor */}
                    <div className="print:break-inside-avoid">
                        <SectionTitle title="৬. জামিনদার তথ্য | Guarantor Information" />
                        <div className="p-4 grid grid-cols-2 gap-x-6 border-b border-gray-200">
                            <InfoRow label="Guarantor Name (জামিনদার)" value={admission.guarantor_name} />
                            <InfoRow label="Guarantor Mobile (মোবাইল)" value={admission.guarantor_mobile} />
                            <InfoRow label="TIN Number (টিন)" value={admission.tin_number} />
                            <InfoRow label="SMS Service (এসএমএস)" value={admission.want_sms_service ? 'Yes (হ্যাঁ)' : 'No (না)'} />
                        </div>
                    </div>

                    {/* Property */}
                    <div className="print:break-inside-avoid">
                        <SectionTitle title="৭. সম্পত্তি তথ্য | Property Information" />
                        <div className="p-4 grid grid-cols-2 gap-x-6 border-b border-gray-200">
                            <InfoRow label="Total Asset Value (মোট সম্পদ)" value={admission.total_asset_value ? `৳${admission.total_asset_value}` : '-'} />
                            <InfoRow label="House Type (বাড়ির ধরন)" value={admission.house_type} />
                            <InfoRow label="Mud House (মাটির ঘর)" value={`${admission.mud_house_count} টি`} />
                            <InfoRow label="Tin House (টিনের ঘর)" value={`${admission.tin_house_count} টি`} />
                            <InfoRow label="Brick House (পাকা ঘর)" value={`${admission.brick_house_count} টি`} />
                            <InfoRow label="Semi-Brick (আধা পাকা)" value={`${admission.semi_brick_house_count} টি`} />
                        </div>
                    </div>

                    {/* Livestock */}
                    <div className="print:break-inside-avoid">
                        <SectionTitle title="৮. পশুসম্পদ | Livestock Information" />
                        <div className="p-4 grid grid-cols-2 gap-x-6 border-b border-gray-200">
                            <InfoRow label="Cow/Buffalo (গরু/মহিষ)" value={`${admission.cow_buffalo_count} টি`} />
                            <InfoRow label="Goat/Sheep (ছাগল/ভেড়া)" value={`${admission.goat_sheep_count} টি`} />
                            <InfoRow label="Duck/Chicken (হাঁস/মুরগি)" value={`${admission.duck_chicken_count} টি`} />
                            <InfoRow label="Other Livestock (অন্যান্য)" value={admission.other_livestock} />
                            <InfoRow label="Other Count (সংখ্যা)" value={`${admission.other_livestock_count} টি`} className="col-span-2" />
                        </div>
                    </div>

                    {/* Land */}
                    <div className="print:break-inside-avoid">
                        <SectionTitle title="৯. জমি তথ্য | Land Information" />
                        <div className="p-4 grid grid-cols-2 gap-x-6 border-b border-gray-200">
                            <InfoRow label="Cultivable Land (চাষযোগ্য জমি)" value={`${admission.cultivable_land_amount || 0} শতক`} />
                            <InfoRow label="Cultivable Value (মূল্য)" value={admission.cultivable_land_value ? `৳${admission.cultivable_land_value}` : '-'} />
                            <InfoRow label="Non-Cultivable (অচাষযোগ্য)" value={`${admission.non_cultivable_land_amount || 0} শতক`} />
                            <InfoRow label="Non-Cultivable Value (মূল্য)" value={admission.non_cultivable_land_value ? `৳${admission.non_cultivable_land_value}` : '-'} />
                        </div>
                    </div>

                    {/* Financial */}
                    <div className="print:break-inside-avoid">
                        <SectionTitle title="১০. আর্থিক তথ্য | Financial Information" />
                        <div className="p-4 grid grid-cols-3 gap-x-6 border-b border-gray-200">
                            <InfoRow label="Monthly Income (মাসিক আয়)" value={admission.monthly_income ? `৳${admission.monthly_income}` : '-'} />
                            <InfoRow label="Monthly Expense (ব্যয়)" value={admission.monthly_expense ? `৳${admission.monthly_expense}` : '-'} />
                            <InfoRow label="Monthly Savings (সঞ্চয়)" value={admission.monthly_savings ? `৳${admission.monthly_savings}` : '-'} />
                        </div>
                    </div>

                    {/* Family Members */}
                    {admission.family_members && admission.family_members.length > 0 && (
                        <div className="print:break-inside-avoid">
                            <SectionTitle title="১১. পরিবারের সদস্য | Family Members" />
                            <div className="p-4 border-b border-gray-200 overflow-x-auto">
                                <table className="min-w-full text-sm border-collapse border border-gray-300">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="border border-gray-300 px-2 py-1 text-left font-semibold">Name<br/>(নাম)</th>
                                            <th className="border border-gray-300 px-2 py-1 text-left font-semibold">Relation<br/>(সম্পর্ক)</th>
                                            <th className="border border-gray-300 px-2 py-1 text-left font-semibold">Gender<br/>(লিঙ্গ)</th>
                                            <th className="border border-gray-300 px-2 py-1 text-left font-semibold">Age<br/>(বয়স)</th>
                                            <th className="border border-gray-300 px-2 py-1 text-left font-semibold">Education<br/>(শিক্ষা)</th>
                                            <th className="border border-gray-300 px-2 py-1 text-left font-semibold">Occupation<br/>(পেশা)</th>
                                            <th className="border border-gray-300 px-2 py-1 text-left font-semibold">Income<br/>(আয়)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {admission.family_members.map((member, index) => (
                                            <tr key={index}>
                                                <td className="border border-gray-300 px-2 py-1">{member.member_name}</td>
                                                <td className="border border-gray-300 px-2 py-1">{member.relation_with_head}</td>
                                                <td className="border border-gray-300 px-2 py-1">{member.gender}</td>
                                                <td className="border border-gray-300 px-2 py-1">{member.age_years}y {member.age_months}m</td>
                                                <td className="border border-gray-300 px-2 py-1">{member.education_level}</td>
                                                <td className="border border-gray-300 px-2 py-1">{member.occupation}</td>
                                                <td className="border border-gray-300 px-2 py-1">৳{member.monthly_income || 0}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Other Assets */}
                    {admission.other_assets && admission.other_assets.length > 0 && (
                        <div className="print:break-inside-avoid">
                            <SectionTitle title="১২. অন্যান্য সম্পদ | Other Assets" />
                            <div className="p-4 border-b border-gray-200 overflow-x-auto">
                                <table className="min-w-full text-sm border-collapse border border-gray-300">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="border border-gray-300 px-2 py-1 text-left font-semibold">Description (বিবরণ)</th>
                                            <th className="border border-gray-300 px-2 py-1 text-left font-semibold">Quantity (পরিমাণ)</th>
                                            <th className="border border-gray-300 px-2 py-1 text-left font-semibold">Value (মূল্য)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {admission.other_assets.map((asset, index) => (
                                            <tr key={index}>
                                                <td className="border border-gray-300 px-2 py-1">{asset.asset_description}</td>
                                                <td className="border border-gray-300 px-2 py-1">{asset.quantity_amount}</td>
                                                <td className="border border-gray-300 px-2 py-1">৳{asset.estimated_value || 0}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Additional Info */}
                    <div className="print:break-inside-avoid">
                        <SectionTitle title="১৩. অতিরিক্ত তথ্য | Additional Information" />
                        <div className="p-4 border-b border-gray-200">
                            <div className="grid grid-cols-2 gap-x-6">
                                <InfoRow label="Interviewer (সাক্ষাৎকারকারী)" value={admission.interviewer_name} />
                                <InfoRow label="Employee Name (কর্মকর্তার নাম)" value={admission.employee_name} />
                                <InfoRow label="Guardian (অভিভাবক)" value={admission.guardian_name} />
                            </div>
                            {admission.other_loan_info && (
                                <div className="mt-3">
                                    <p className="text-sm font-medium text-gray-700">Other Loan Info (অন্যান্য টাকার তথ্য):</p>
                                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{admission.other_loan_info}</p>
                                </div>
                            )}
                            {admission.collector_comment && (
                                <div className="mt-3">
                                    <p className="text-sm font-medium text-gray-700">Collector Comment (কালেক্টর মন্তব্য):</p>
                                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{admission.collector_comment}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Documents Section */}
                    <div className="print:break-inside-avoid">
                        <SectionTitle title="১৪. ডকুমেন্টস | Documents" />
                        <div className="p-4 border-b border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Customer Photo */}
                                <div>
                                    <p className="text-sm font-medium text-gray-700 mb-2">
                                        Customer Photo (গ্রাহকের ছবি) <span className="text-red-500">*</span>
                                    </p>
                                    {admission.customer_photo_path ? (
                                        <img
                                            src={`/storage/${admission.customer_photo_path}`}
                                            alt="Customer Photo"
                                            className="w-48 h-48 object-cover border-2 border-gray-300 rounded"
                                        />
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">No photo uploaded</p>
                                    )}
                                </div>

                                {/* Customer NID Photo */}
                                <div>
                                    <p className="text-sm font-medium text-gray-700 mb-2">
                                        Customer NID (গ্রাহকের NID) <span className="text-red-500">*</span>
                                    </p>
                                    {admission.customer_nid_photo_path ? (
                                        admission.customer_nid_photo_path.endsWith('.pdf') ? (
                                            <a
                                                href={`/storage/${admission.customer_nid_photo_path}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                            >
                                                View PDF
                                            </a>
                                        ) : (
                                            <img
                                                src={`/storage/${admission.customer_nid_photo_path}`}
                                                alt="Customer NID"
                                                className="w-full max-w-md border-2 border-gray-300 rounded"
                                            />
                                        )
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">No NID uploaded</p>
                                    )}
                                </div>

                                {/* Guardian Photo */}
                                <div>
                                    <p className="text-sm font-medium text-gray-700 mb-2">
                                        Guardian Photo (অভিভাবকের ছবি)
                                    </p>
                                    {admission.guardian_photo_path ? (
                                        <img
                                            src={`/storage/${admission.guardian_photo_path}`}
                                            alt="Guardian Photo"
                                            className="w-48 h-48 object-cover border-2 border-gray-300 rounded"
                                        />
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">No photo uploaded</p>
                                    )}
                                </div>

                                {/* Guardian NID Photo */}
                                <div>
                                    <p className="text-sm font-medium text-gray-700 mb-2">
                                        Guardian NID (অভিভাবকের NID)
                                    </p>
                                    {admission.guardian_nid_photo_path ? (
                                        admission.guardian_nid_photo_path.endsWith('.pdf') ? (
                                            <a
                                                href={`/storage/${admission.guardian_nid_photo_path}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                            >
                                                View PDF
                                            </a>
                                        ) : (
                                            <img
                                                src={`/storage/${admission.guardian_nid_photo_path}`}
                                                alt="Guardian NID"
                                                className="w-full max-w-md border-2 border-gray-300 rounded"
                                            />
                                        )
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">No NID uploaded</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Signatures */}
                    <div className="p-6 print:mt-12">
                        <h3 className="text-base font-bold text-gray-900 mb-6 text-center">Signatures (স্বাক্ষর)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Applicant Signature */}
                            <div className="text-center">
                                {admission.applicant_signature ? (
                                    <div className="mb-2">
                                        <img
                                            src={`/storage/${admission.applicant_signature}`}
                                            alt="Applicant signature"
                                            className="h-16 mx-auto border border-gray-300 rounded"
                                        />
                                    </div>
                                ) : (
                                    <div className="h-16 mb-2"></div>
                                )}
                                <div className="border-t-2 border-gray-900 pt-2">
                                    <p className="text-sm font-bold">Applicant Signature</p>
                                    <p className="text-xs text-gray-600">(আবেদনকারীর স্বাক্ষর)</p>
                                </div>
                            </div>

                            {/* Approver Signatures */}
                            {admission.approvals && admission.approvals.filter((a: any) => a.status === 'approved' && a.approver_signature).map((approval: any) => (
                                <div key={approval.id} className="text-center">
                                    <div className="mb-2">
                                        <img
                                            src={`/storage/${approval.approver_signature}`}
                                            alt={`${approval.user.name} signature`}
                                            className="h-16 mx-auto border border-gray-300 rounded"
                                        />
                                    </div>
                                    <div className="border-t-2 border-gray-900 pt-2">
                                        <p className="text-sm font-bold">{approval.user.name}</p>
                                        <p className="text-xs text-gray-600">{approval.level} Approver</p>
                                        <p className="text-xs text-gray-500">{new Date(approval.approved_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}

                            {/* Placeholder for additional signatures if needed */}
                            {(!admission.approvals || admission.approvals.filter((a: any) => a.status === 'approved' && a.approver_signature).length === 0) && (
                                <>
                                    <div className="text-center">
                                        <div className="h-16 mb-2"></div>
                                        <div className="border-t-2 border-gray-900 pt-2">
                                            <p className="text-sm font-bold">Approver Signature</p>
                                            <p className="text-xs text-gray-600">(অনুমোদনকারীর স্বাক্ষর)</p>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="h-16 mb-2"></div>
                                        <div className="border-t-2 border-gray-900 pt-2">
                                            <p className="text-sm font-bold">Manager Signature</p>
                                            <p className="text-xs text-gray-600">(ম্যানেজারের স্বাক্ষর)</p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    body {
                        font-size: 10pt;
                        line-height: 1.2;
                    }
                    @page {
                        margin: 0.5in;
                        size: A4;
                    }
                    .print\\:break-inside-avoid {
                        break-inside: avoid;
                    }
                }
            `}</style>
        </AdminLayout>
    );
}
