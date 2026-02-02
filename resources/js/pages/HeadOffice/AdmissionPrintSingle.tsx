import { Head } from '@inertiajs/react';
import { useEffect } from 'react';
import { MemberAdmission } from '@/types/memberAdmission';

interface Props {
    admission: MemberAdmission;
}

export default function AdmissionPrintSingle({ admission }: Props) {
    useEffect(() => {
        const timer = setTimeout(() => {
            window.print();
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            });
        } catch {
            return '-';
        }
    };

    const InfoRow = ({ label, value, label2, value2 }: { label: string; value: any; label2?: string; value2?: any }) => (
        <tr>
            <td style={{ width: '20%', padding: '4px 6px', fontWeight: 600, borderBottom: '1px solid #e5e7eb', fontSize: '8.5px' }}>
                {label}
            </td>
            <td style={{ width: '30%', padding: '4px 6px', borderBottom: '1px solid #e5e7eb' }}>
                {value || '-'}
            </td>
            {label2 ? (
                <>
                    <td style={{ width: '20%', padding: '4px 6px', fontWeight: 600, borderBottom: '1px solid #e5e7eb', fontSize: '8.5px' }}>
                        {label2}
                    </td>
                    <td style={{ width: '30%', padding: '4px 6px', borderBottom: '1px solid #e5e7eb' }}>
                        {value2 || '-'}
                    </td>
                </>
            ) : (
                <td colSpan={2} style={{ borderBottom: '1px solid #e5e7eb' }}></td>
            )}
        </tr>
    );

    const SectionTitle = ({ title }: { title: string }) => (
        <tr>
            <td colSpan={4} style={{
                backgroundColor: '#1e40af',
                color: 'white',
                padding: '6px 8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
            }}>
                {title}
            </td>
        </tr>
    );

    return (
        <>
            <Head title={`Print - ${admission.application_no}`}>
                <style>{`
                    @page {
                        size: A4 portrait;
                        margin: 15mm;
                    }

                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }

                    body {
                        font-family: 'Arial', 'Segoe UI', sans-serif;
                        font-size: 9px;
                        line-height: 1.4;
                        color: #000;
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }

                    .print-container {
                        width: 100%;
                        max-width: 100%;
                    }

                    .header {
                        text-align: center;
                        margin-bottom: 12px;
                        padding-bottom: 8px;
                        border-bottom: 3px solid #1e40af;
                    }

                    .header h1 {
                        font-size: 16px;
                        font-weight: bold;
                        margin-bottom: 2px;
                        color: #1e40af;
                    }

                    .header h2 {
                        font-size: 12px;
                        font-weight: 600;
                        color: #4b5563;
                        margin-bottom: 4px;
                    }

                    .app-no {
                        font-size: 10px;
                        color: #059669;
                        font-weight: bold;
                        display: inline-block;
                        padding: 2px 8px;
                        background-color: #d1fae5;
                        border-radius: 3px;
                    }

                    .status-badge {
                        display: inline-block;
                        padding: 2px 8px;
                        border-radius: 3px;
                        font-size: 9px;
                        font-weight: bold;
                        margin-left: 8px;
                    }

                    .status-approved {
                        background-color: #d1fae5;
                        color: #059669;
                    }

                    .status-submitted {
                        background-color: #dbeafe;
                        color: #1d4ed8;
                    }

                    .status-pending {
                        background-color: #fef3c7;
                        color: #d97706;
                    }

                    .status-rejected {
                        background-color: #fee2e2;
                        color: #dc2626;
                    }

                    .info-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 8px;
                        border: 1px solid #d1d5db;
                    }

                    .info-table td {
                        font-size: 9px;
                        vertical-align: top;
                    }

                    .two-column {
                        display: flex;
                        gap: 10px;
                        margin-bottom: 8px;
                    }

                    .column {
                        flex: 1;
                    }

                    .family-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 4px;
                        font-size: 8px;
                    }

                    .family-table th {
                        background-color: #f3f4f6;
                        padding: 3px 4px;
                        border: 1px solid #d1d5db;
                        font-weight: 600;
                        text-align: left;
                    }

                    .family-table td {
                        padding: 3px 4px;
                        border: 1px solid #d1d5db;
                    }

                    .footer {
                        margin-top: 12px;
                        padding-top: 6px;
                        border-top: 2px solid #d1d5db;
                        text-align: center;
                        font-size: 7px;
                        color: #6b7280;
                    }

                    @media print {
                        body {
                            print-color-adjust: exact;
                            -webkit-print-color-adjust: exact;
                        }

                        .page-break {
                            page-break-after: always;
                        }
                    }
                `}</style>
            </Head>

            <div className="print-container">
                {/* Header */}
                <div className="header">
                    <h1>MEMBER ADMISSION APPLICATION</h1>
                    <h2>সদস্য ভর্তি আবেদন ফর্ম</h2>
                    <div style={{ marginTop: '4px' }}>
                        <span className="app-no">{admission.application_no}</span>
                        <span className={`status-badge status-${admission.status}`}>
                            {admission.status.replace('_', ' ').toUpperCase()}
                        </span>
                    </div>
                </div>

                {/* Basic Information */}
                <table className="info-table">
                    <tbody>
                        <SectionTitle title="🔷 Basic Information (মৌলিক তথ্য)" />
                        <InfoRow
                            label="Applicant Name EN (আবেদনকারীর নাম ইংরেজি)"
                            value={admission.applicant_name_en}
                            label2="Applicant Name BN (আবেদনকারীর নাম বাংলা)"
                            value2={admission.applicant_name_bn}
                        />
                        <InfoRow
                            label="Father's Name EN (পিতার নাম ইংরেজি)"
                            value={admission.father_name_en}
                            label2="Father's Name BN (পিতার নাম বাংলা)"
                            value2={admission.father_name_bn}
                        />
                        <InfoRow
                            label="Mother's Name EN (মাতার নাম ইংরেজি)"
                            value={admission.mother_name_en}
                            label2="Mother's Name BN (মাতার নাম বাংলা)"
                            value2={admission.mother_name_bn}
                        />
                        {admission.spouse_name_en && (
                            <InfoRow
                                label="Spouse Name EN (স্বামী/স্ত্রীর নাম ইংরেজি)"
                                value={admission.spouse_name_en}
                                label2="Spouse Name BN (স্বামী/স্ত্রীর নাম বাংলা)"
                                value2={admission.spouse_name_bn}
                            />
                        )}
                        <InfoRow
                            label="Marital Status (বৈবাহিক অবস্থা)"
                            value={admission.marital_status?.toUpperCase()}
                            label2="Gender (লিঙ্গ)"
                            value2={admission.gender?.toUpperCase()}
                        />
                        <InfoRow
                            label="Date of Birth (জন্ম তারিখ)"
                            value={formatDate(admission.date_of_birth)}
                        />
                    </tbody>
                </table>

                {/* Identity Information */}
                <table className="info-table">
                    <tbody>
                        <SectionTitle title="🔷 Identity Information (পরিচয় তথ্য)" />
                        <InfoRow
                            label="NID Number (জাতীয় পরিচয়পত্র)"
                            value={admission.nid_number}
                            label2="Smart Card Number (স্মার্ট কার্ড)"
                            value2={admission.smart_card_number}
                        />
                        <InfoRow
                            label="Birth Certificate (জন্ম নিবন্ধন)"
                            value={admission.birth_certificate_number}
                            label2="TIN Number (টিআইএন)"
                            value2={admission.tin_number}
                        />
                    </tbody>
                </table>

                {/* Contact Information */}
                <table className="info-table">
                    <tbody>
                        <SectionTitle title="🔷 Contact Information (যোগাযোগ তথ্য)" />
                        <InfoRow
                            label="Mobile Number (মোবাইল নম্বর)"
                            value={admission.mobile_number}
                            label2="Alternative Mobile (বিকল্প মোবাইল)"
                            value2={admission.alternative_mobile}
                        />
                        <InfoRow
                            label="Family Member Mobile (পরিবারের সদস্য মোবাইল)"
                            value={admission.family_member_mobile}
                            label2="Want SMS Service (এসএমএস সেবা)"
                            value2={admission.want_sms_service ? 'Yes' : 'No'}
                        />
                    </tbody>
                </table>

                {/* Branch & Organization Info */}
                <table className="info-table">
                    <tbody>
                        <SectionTitle title="🔷 Organization Information (প্রতিষ্ঠান তথ্য)" />
                        <InfoRow
                            label="Branch (শাখা)"
                            value={`${admission.branch.name} (${admission.branch.branch_code})`}
                            label2="Area (এলাকা)"
                            value2={admission.branch.area ? `${admission.branch.area.name}` : '-'}
                        />
                        <InfoRow
                            label="Zone (অঞ্চল)"
                            value={admission.branch.area?.zone ? `${admission.branch.area.zone.name}` : '-'}
                            label2="Samity (সমিতি)"
                            value2={admission.samity?.samity_name}
                        />
                        <InfoRow
                            label="Member Category (সদস্য শ্রেণী)"
                            value={admission.member_category?.category_name}
                            label2="Survey Date (জরিপ তারিখ)"
                            value2={formatDate(admission.survey_date)}
                        />
                        <InfoRow
                            label="Admission Date (ভর্তি তারিখ)"
                            value={formatDate(admission.admission_date)}
                        />
                    </tbody>
                </table>

                {/* Present Address */}
                <table className="info-table">
                    <tbody>
                        <SectionTitle title="🔷 Present Address (বর্তমান ঠিকানা)" />
                        <InfoRow
                            label="Division (বিভাগ)"
                            value={admission.present_division}
                            label2="District (জেলা)"
                            value2={admission.present_district}
                        />
                        <InfoRow
                            label="Upazila (উপজেলা)"
                            value={admission.present_upazila}
                            label2="Union (ইউনিয়ন)"
                            value2={admission.present_union}
                        />
                        <InfoRow
                            label="Village/Road (গ্রাম/রাস্তা)"
                            value={admission.present_village_road}
                            label2="Post Code (পোস্ট কোড)"
                            value2={admission.present_post_code}
                        />
                    </tbody>
                </table>

                {/* Permanent Address */}
                {!admission.permanent_address_same && (
                    <table className="info-table">
                        <tbody>
                            <SectionTitle title="🔷 Permanent Address (স্থায়ী ঠিকানা)" />
                            <InfoRow
                                label="Division (বিভাগ)"
                                value={admission.permanent_division}
                                label2="District (জেলা)"
                                value2={admission.permanent_district}
                            />
                            <InfoRow
                                label="Upazila (উপজেলা)"
                                value={admission.permanent_upazila}
                                label2="Union (ইউনিয়ন)"
                                value2={admission.permanent_union}
                            />
                            <InfoRow
                                label="Village/Road (গ্রাম/রাস্তা)"
                                value={admission.permanent_village_road}
                                label2="Post Code (পোস্ট কোড)"
                                value2={admission.permanent_post_code}
                            />
                        </tbody>
                    </table>
                )}

                {/* Financial Information */}
                <table className="info-table">
                    <tbody>
                        <SectionTitle title="🔷 Financial Information (আর্থিক তথ্য)" />
                        <InfoRow
                            label="Monthly Income (মাসিক আয়)"
                            value={admission.monthly_income ? `৳ ${parseFloat(admission.monthly_income).toLocaleString()}` : '-'}
                            label2="Monthly Expense (মাসিক খরচ)"
                            value2={admission.monthly_expense ? `৳ ${parseFloat(admission.monthly_expense).toLocaleString()}` : '-'}
                        />
                        <InfoRow
                            label="Monthly Savings (মাসিক সাশ্রয়)"
                            value={admission.monthly_savings ? `৳ ${parseFloat(admission.monthly_savings).toLocaleString()}` : '-'}
                            label2="Total Asset Value (মোট সম্পদের মূল্য)"
                            value2={admission.total_asset_value ? `৳ ${parseFloat(admission.total_asset_value).toLocaleString()}` : '-'}
                        />
                    </tbody>
                </table>

                {/* Property & Livestock */}
                <table className="info-table">
                    <tbody>
                        <SectionTitle title="🔷 Property & Livestock (সম্পত্তি ও গবাদি পশু)" />
                        <InfoRow
                            label="House Type (ঘরের ধরন)"
                            value={admission.house_type}
                            label2="Mud Houses (কাঁচা ঘর)"
                            value2={admission.mud_house_count}
                        />
                        <InfoRow
                            label="Tin Houses (টিনের ঘর)"
                            value={admission.tin_house_count}
                            label2="Brick Houses (পাকা ঘর)"
                            value2={admission.brick_house_count}
                        />
                        <InfoRow
                            label="Semi-Brick Houses (আধা পাকা ঘর)"
                            value={admission.semi_brick_house_count}
                            label2="Cow/Buffalo (গরু/মহিষ)"
                            value2={admission.cow_buffalo_count}
                        />
                        <InfoRow
                            label="Goat/Sheep (ছাগল/ভেড়া)"
                            value={admission.goat_sheep_count}
                            label2="Duck/Chicken (হাঁস/মুরগি)"
                            value2={admission.duck_chicken_count}
                        />
                        {admission.other_livestock && (
                            <InfoRow
                                label={`Other Livestock (${admission.other_livestock})`}
                                value={admission.other_livestock_count}
                            />
                        )}
                    </tbody>
                </table>

                {/* Land Information */}
                <table className="info-table">
                    <tbody>
                        <SectionTitle title="🔷 Land Information (জমির তথ্য)" />
                        <InfoRow
                            label="Cultivable Land (চাষযোগ্য জমি)"
                            value={admission.cultivable_land_amount ? `${admission.cultivable_land_amount} decimal` : '-'}
                            label2="Cultivable Land Value (চাষযোগ্য জমির মূল্য)"
                            value2={admission.cultivable_land_value ? `৳ ${parseFloat(admission.cultivable_land_value).toLocaleString()}` : '-'}
                        />
                        <InfoRow
                            label="Non-Cultivable Land (অচাষযোগ্য জমি)"
                            value={admission.non_cultivable_land_amount ? `${admission.non_cultivable_land_amount} decimal` : '-'}
                            label2="Non-Cultivable Land Value (অচাষযোগ্য জমির মূল্য)"
                            value2={admission.non_cultivable_land_value ? `৳ ${parseFloat(admission.non_cultivable_land_value).toLocaleString()}` : '-'}
                        />
                    </tbody>
                </table>

                {/* Economic Activities */}
                {(admission.business_details || admission.job_details || admission.other_income_details) && (
                    <table className="info-table">
                        <tbody>
                            <SectionTitle title="🔷 Economic Activities (অর্থনৈতিক কার্যক্রম)" />
                            {admission.business_details && admission.job_details && (
                                <InfoRow
                                    label="Business Details (ব্যবসায়ের বিবরণ)"
                                    value={admission.business_details}
                                    label2="Job Details (চাকরির বিবরণ)"
                                    value2={admission.job_details}
                                />
                            )}
                            {admission.business_details && !admission.job_details && (
                                <InfoRow
                                    label="Business Details (ব্যবসায়ের বিবরণ)"
                                    value={admission.business_details}
                                />
                            )}
                            {!admission.business_details && admission.job_details && (
                                <InfoRow
                                    label="Job Details (চাকরির বিবরণ)"
                                    value={admission.job_details}
                                />
                            )}
                            {admission.other_income_details && (
                                <InfoRow
                                    label="Other Income Details (অন্যান্য আয়ের বিবরণ)"
                                    value={admission.other_income_details}
                                />
                            )}
                        </tbody>
                    </table>
                )}

                {/* Family Members */}
                {admission.family_members && admission.family_members.length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                        <table className="info-table">
                            <tbody>
                                <SectionTitle title="🔷 Family Members (পরিবারের সদস্য)" />
                            </tbody>
                        </table>
                        <table className="family-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '5%' }}>SL</th>
                                    <th style={{ width: '25%' }}>Name</th>
                                    <th style={{ width: '15%' }}>Relation</th>
                                    <th style={{ width: '8%' }}>Gender</th>
                                    <th style={{ width: '8%' }}>Age</th>
                                    <th style={{ width: '15%' }}>Education</th>
                                    <th style={{ width: '12%' }}>Occupation</th>
                                    <th style={{ width: '12%' }}>Income</th>
                                </tr>
                            </thead>
                            <tbody>
                                {admission.family_members.map((member, index) => (
                                    <tr key={member.id || index}>
                                        <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                        <td>{member.member_name}</td>
                                        <td>{member.relation_with_head}</td>
                                        <td>{member.gender}</td>
                                        <td>{member.age_years}y {member.age_months}m</td>
                                        <td>{member.education_level || '-'}</td>
                                        <td>{member.occupation || '-'}</td>
                                        <td>{member.monthly_income ? `৳${member.monthly_income}` : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Other Assets */}
                {admission.other_assets && admission.other_assets.length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                        <table className="info-table">
                            <tbody>
                                <SectionTitle title="🔷 Other Assets (অন্যান্য সম্পদ)" />
                            </tbody>
                        </table>
                        <table className="family-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '8%' }}>SL</th>
                                    <th style={{ width: '55%' }}>Description</th>
                                    <th style={{ width: '17%' }}>Quantity</th>
                                    <th style={{ width: '20%' }}>Value (৳)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {admission.other_assets.map((asset, index) => (
                                    <tr key={asset.id || index}>
                                        <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                        <td>{asset.asset_description}</td>
                                        <td>{asset.quantity_amount || '-'}</td>
                                        <td>{asset.estimated_value ? `৳${parseFloat(asset.estimated_value.toString()).toLocaleString()}` : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Additional Information */}
                <table className="info-table">
                    <tbody>
                        <SectionTitle title="🔷 Additional Information (অতিরিক্ত তথ্য)" />
                        {admission.guarantor_name && (
                            <InfoRow
                                label="Guarantor Name (জামিনদারের নাম)"
                                value={admission.guarantor_name}
                                label2="Guarantor Mobile (জামিনদারের মোবাইল)"
                                value2={admission.guarantor_mobile}
                            />
                        )}
                        {admission.guardian_name && (
                            <InfoRow
                                label="Guardian Name (অভিভাবকের নাম)"
                                value={admission.guardian_name}
                                label2={admission.interviewer_name ? "Interviewer (সাক্ষাৎকার গ্রহণকারী)" : undefined}
                                value2={admission.interviewer_name}
                            />
                        )}
                        {!admission.guardian_name && admission.interviewer_name && (
                            <InfoRow
                                label="Interviewer (সাক্ষাৎকার গ্রহণকারী)"
                                value={admission.interviewer_name}
                                label2={admission.employee_name ? "Employee Name (কর্মকর্তার নাম)" : undefined}
                                value2={admission.employee_name}
                            />
                        )}
                        {admission.guardian_name && admission.employee_name && (
                            <InfoRow
                                label="Employee Name (কর্মকর্তার নাম)"
                                value={admission.employee_name}
                            />
                        )}
                        {admission.other_loan_info && (
                            <InfoRow
                                label="Other Loan Info (অন্যান্য ঋণের তথ্য)"
                                value={admission.other_loan_info}
                            />
                        )}
                        {admission.collector_comment && (
                            <InfoRow
                                label="Collector Comment (সংগ্রাহকের মন্তব্য)"
                                value={admission.collector_comment}
                            />
                        )}
                    </tbody>
                </table>

                {/* Documents Section */}
                <table className="info-table">
                    <tbody>
                        <SectionTitle title="🔷 Documents (ডকুমেন্টস)" />
                        <tr>
                            <td colSpan={4} style={{ padding: '12px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    {/* Customer Photo */}
                                    <div>
                                        <div style={{ fontSize: '8.5px', fontWeight: 'bold', marginBottom: '6px', color: '#1f2937' }}>
                                            Customer Photo (গ্রাহকের ছবি) <span style={{ color: '#ef4444' }}>*</span>
                                        </div>
                                        {admission.customer_photo_path ? (
                                            <img
                                                src={`/storage/${admission.customer_photo_path}`}
                                                alt="Customer Photo"
                                                style={{ width: '150px', height: '150px', objectFit: 'cover', border: '2px solid #d1d5db', borderRadius: '4px' }}
                                            />
                                        ) : (
                                            <div style={{ fontSize: '8px', color: '#6b7280', fontStyle: 'italic' }}>No photo uploaded</div>
                                        )}
                                    </div>

                                    {/* Customer NID */}
                                    <div>
                                        <div style={{ fontSize: '8.5px', fontWeight: 'bold', marginBottom: '6px', color: '#1f2937' }}>
                                            Customer NID (গ্রাহকের NID) <span style={{ color: '#ef4444' }}>*</span>
                                        </div>
                                        {admission.customer_nid_photo_path ? (
                                            admission.customer_nid_photo_path.endsWith('.pdf') ? (
                                                <div style={{ fontSize: '8px', color: '#2563eb' }}>PDF Document Attached</div>
                                            ) : (
                                                <img
                                                    src={`/storage/${admission.customer_nid_photo_path}`}
                                                    alt="Customer NID"
                                                    style={{ maxWidth: '300px', border: '2px solid #d1d5db', borderRadius: '4px' }}
                                                />
                                            )
                                        ) : (
                                            <div style={{ fontSize: '8px', color: '#6b7280', fontStyle: 'italic' }}>No NID uploaded</div>
                                        )}
                                    </div>

                                    {/* Guardian Photo */}
                                    {admission.guardian_photo_path && (
                                        <div>
                                            <div style={{ fontSize: '8.5px', fontWeight: 'bold', marginBottom: '6px', color: '#1f2937' }}>
                                                Guardian Photo (অভিভাবকের ছবি)
                                            </div>
                                            <img
                                                src={`/storage/${admission.guardian_photo_path}`}
                                                alt="Guardian Photo"
                                                style={{ width: '150px', height: '150px', objectFit: 'cover', border: '2px solid #d1d5db', borderRadius: '4px' }}
                                            />
                                        </div>
                                    )}

                                    {/* Guardian NID */}
                                    {admission.guardian_nid_photo_path && (
                                        <div>
                                            <div style={{ fontSize: '8.5px', fontWeight: 'bold', marginBottom: '6px', color: '#1f2937' }}>
                                                Guardian NID (অভিভাবকের NID)
                                            </div>
                                            {admission.guardian_nid_photo_path.endsWith('.pdf') ? (
                                                <div style={{ fontSize: '8px', color: '#2563eb' }}>PDF Document Attached</div>
                                            ) : (
                                                <img
                                                    src={`/storage/${admission.guardian_nid_photo_path}`}
                                                    alt="Guardian NID"
                                                    style={{ maxWidth: '300px', border: '2px solid #d1d5db', borderRadius: '4px' }}
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Submission Info */}
                <table className="info-table">
                    <tbody>
                        <SectionTitle title="🔷 Submission Information (জমা তথ্য)" />
                        <InfoRow
                            label="Submitted By (জমাদানকারী)"
                            value={admission.submitted_by?.name}
                            label2="Submitted At (জমার তারিখ)"
                            value2={formatDate(admission.submitted_at)}
                        />
                        {admission.reviewed_by && (
                            <InfoRow
                                label="Reviewed By (পর্যালোচনাকারী)"
                                value={admission.reviewed_by.name}
                                label2="Reviewed At (পর্যালোচনার তারিখ)"
                                value2={formatDate(admission.reviewed_at)}
                            />
                        )}
                        {admission.revision_count > 0 && (
                            <InfoRow
                                label="Revision Count (সংশোধন সংখ্যা)"
                                value={admission.revision_count}
                            />
                        )}
                    </tbody>
                </table>

                {/* Footer */}
                <div className="footer">
                    <div>Generated by MIS Loan System | Printed: {new Date().toLocaleString('en-GB')}</div>
                    <div style={{ marginTop: '2px' }}>This is a system-generated document</div>
                </div>
            </div>
        </>
    );
}
