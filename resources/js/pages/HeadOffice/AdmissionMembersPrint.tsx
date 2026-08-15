import { Head } from '@inertiajs/react';
import { useEffect } from 'react';
import { formatDate } from '@/utils/dateUtils';

interface Zone {
    id: number;
    name: string;
}

interface Area {
    id: number;
    name: string;
    zone?: Zone;
}

interface Branch {
    id: number;
    name: string;
    branch_code?: string;
    code?: string;
    area?: Area;
    area_id?: number;
}

interface Samity {
    id: number;
    samity_name: string;
}

interface MemberCategory {
    id: number;
    category_name: string;
}

interface User {
    id: number;
    name: string;
}

interface MemberAdmissionPrint {
    id: number;
    application_no: string;
    applicant_name_en: string;
    applicant_name_bn: string | null;
    father_name_en: string | null;
    father_name_bn: string | null;
    mother_name_en: string | null;
    nid_number: string | null;
    mobile_number: string | null;
    status: string;
    submitted_at: string | null;
    created_at: string;
    branch: Branch;
    samity?: Samity;
    member_category?: MemberCategory;
    submitted_by?: User;
    createdBy?: User;
    revision_count: number;
    employee_name?: string | null;
    interviewer_name?: string | null;
    mud_house_count?: number;
    tin_house_count?: number;
    brick_house_count?: number;
    semi_brick_house_count?: number;
    cultivable_land_amount?: number | null;
    cultivable_land_value?: number | null;
    non_cultivable_land_amount?: number | null;
    non_cultivable_land_value?: number | null;
    total_asset_value?: number | null;
    cow_buffalo_count?: number;
    goat_sheep_count?: number;
    duck_chicken_count?: number;
    job_details?: string | null;
    business_details?: string | null;
    monthly_income?: number | null;
    guarantor_name?: string | null;
    other_loan_info?: string | null;
}

interface Filters {
    search?: string;
    status?: string;
    zone_id?: number;
    area_id?: number;
    branch_id?: number;
    date_from?: string;
    date_to?: string;
    had_issues?: string;
}

interface Props {
    admissions: MemberAdmissionPrint[];
    filters: Filters;
    zones: Zone[];
    areas: Area[];
    branches: Branch[];
}

function num(n: number | null | undefined): string {
    if (n == null || n === undefined) return '—';
    return String(n);
}

function str(s: string | null | undefined): string {
    if (s == null || s === undefined || s === '') return '—';
    return String(s);
}

export default function AdmissionMembersPrint({ admissions, filters, zones, areas, branches }: Props) {
    useEffect(() => {
        const timer = setTimeout(() => {
            window.print();
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const selectedZone = filters.zone_id ? zones.find(z => z.id === filters.zone_id) : null;
    const selectedArea = filters.area_id ? areas.find(a => a.id === filters.area_id) : null;
    const selectedBranch = filters.branch_id ? branches.find(b => b.id === filters.branch_id) : null;

    // হেডারে ফিল্টার অনুযায়ী দেখান: ব্রাঞ্চ সিলেক্ট থাকলে সেই শাখা (ও তার অঞ্চল/জোন), অন্যথায় অঞ্চল/জোন ফিল্টার বা "সকল"
    const branchName = selectedBranch
        ? selectedBranch.name
        : selectedArea
        ? 'সকল শাখা (অঞ্চল)'
        : selectedZone
        ? 'সকল শাখা (জোন)'
        : 'সকল শাখা';
    const areaName = selectedBranch?.area?.name ?? (selectedArea ? selectedArea.name : selectedZone ? 'সকল অঞ্চল' : 'সকল অঞ্চল');
    const zoneName = selectedBranch?.area?.zone?.name ?? (selectedZone ? selectedZone.name : 'সকল জোন');
    const reportDate = filters.date_from && filters.date_to
        ? `${formatDate(filters.date_from)} - ${formatDate(filters.date_to)}`
        : filters.date_to
        ? formatDate(filters.date_to)
        : formatDate(new Date());

    const statusLabels: Record<string, string> = {
        draft: 'খসড়া',
        submitted: 'জমা',
        under_review: 'পর্যালোচনায়',
        pending_head_office: 'হেড অফিসে',
        approved: 'অনুমোদিত',
        rejected: 'প্রত্যাখ্যাত',
        needs_revision: 'সংশোধন',
    };
    const filterStatusLabel = filters.status ? statusLabels[filters.status] || filters.status : 'সব';

    const officerName = (a: MemberAdmissionPrint) =>
        str(a.createdBy?.name ?? a.interviewer_name ?? a.employee_name);
    const memberName = (a: MemberAdmissionPrint) =>
        str(a.applicant_name_bn || a.applicant_name_en);
    const houseCount = (a: MemberAdmissionPrint) => {
        const m = a.mud_house_count ?? 0;
        const t = a.tin_house_count ?? 0;
        const b = a.brick_house_count ?? 0;
        const s = a.semi_brick_house_count ?? 0;
        const total = m + t + b + s;
        return total === 0 ? '—' : String(total);
    };
    const cultivable = (a: MemberAdmissionPrint) =>
        a.cultivable_land_amount != null ? String(a.cultivable_land_amount) : '—';
    const totalAsset = (a: MemberAdmissionPrint) =>
        a.total_asset_value != null ? String(a.total_asset_value) : '—';
    const occupation = (a: MemberAdmissionPrint) =>
        str(a.job_details || a.business_details);

    return (
        <>
            <Head title="সদস্য ভর্তি যাচাই ও অনুমোদন সংক্রান্ত তথ্য - প্রিন্ট">
                <style>{`
                    @page { size: A4 landscape; margin: 8mm 10mm; }
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    .print-container { width: 100%; max-width: 100%; }
                    .print-header {
                        text-align: center;
                        margin-bottom: 6px;
                        padding-bottom: 4px;
                    }
                    .print-header .org { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
                    .print-header .address { font-size: 10px; margin-bottom: 4px; }
                    .print-header .title { font-size: 12px; font-weight: bold; margin-bottom: 6px; text-decoration: underline; }
                    .print-header .meta {
                        display: flex;
                        flex-wrap: wrap;
                        justify-content: space-between;
                        gap: 8px;
                        font-size: 10px;
                        margin-top: 4px;
                    }
                    .header-filter-table {
                        width: auto;
                        margin: 6px auto 0;
                        border: none;
                        font-size: 9px;
                    }
                    .header-filter-table td {
                        border: none;
                        padding: 1px 6px 1px 2px;
                        vertical-align: middle;
                    }
                    .header-filter-label {
                        font-weight: 600;
                        color: #374151;
                        white-space: nowrap;
                    }
                    .header-filter-value {
                        max-width: 120px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }
                    table { width: 100%; border-collapse: collapse; margin-top: 4px; }
                    thead { display: table-header-group; }
                    tbody { display: table-row-group; }
                    th, td {
                        border: 0.5px solid #333;
                        padding: 4px 5px;
                        text-align: center;
                        vertical-align: middle;
                        word-wrap: break-word;
                        overflow-wrap: break-word;
                    }
                    th {
                        background-color: #e5e7eb;
                        font-weight: bold;
                        font-size: 9px;
                        text-align: center;
                    }
                    td { font-size: 9px; text-align: center; }
                    .col-sl { width: 3%; text-align: center; }
                    .col-branch { width: 8%; }
                    .col-officer { width: 9%; }
                    .col-component { width: 8%; }
                    .col-member { width: 10%; }
                    .col-samity { width: 9%; }
                    .col-mobile { width: 7%; text-align: center; }
                    .col-num { width: 4%; text-align: center; }
                    .col-asset { width: 6%; text-align: center; }
                    .col-livestock { width: 4%; text-align: center; }
                    .col-value { width: 6%; text-align: center; }
                    .col-occupation { width: 8%; text-align: center; }
                    .col-income { width: 5%; text-align: center; }
                    .col-guarantor { width: 8%; text-align: center; }
                    .col-loan { width: 8%; text-align: center; }
                    @media print {
                        body { print-color-adjust: exact; }
                        table { page-break-inside: auto; }
                        tr { page-break-inside: avoid; }
                        thead { display: table-header-group; }
                    }
                `}</style>
            </Head>

            <div className="print-container">
                {/* হেডার - ফিল্টার অনুযায়ী শাখা/অঞ্চল/জোন, ছোট কলামে */}
                <div className="print-header">
                    <p className="org">মৌসুমী</p>
                    <p className="address">উকিলপাড়া, নওগাঁ।</p>
                    <p className="title">সদস্য ভর্তি যাচাই ও অনুমোদন সংক্রান্ত তথ্য।</p>
                    <table className="header-filter-table">
                        <tbody>
                            <tr>
                                <td className="header-filter-label">শাখার নাম:</td>
                                <td className="header-filter-value">{branchName}</td>
                                <td className="header-filter-label">অঞ্চলের নাম:</td>
                                <td className="header-filter-value">{areaName}</td>
                                <td className="header-filter-label">জোনের নাম:</td>
                                <td className="header-filter-value">{zoneName}</td>
                                <td className="header-filter-label">তারিখ:</td>
                                <td className="header-filter-value">{reportDate}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* টেবিল - চিত্রের কলাম অনুযায়ী */}
                <table>
                    <thead>
                        <tr>
                            <th className="col-sl">ক্র. নং</th>
                            <th className="col-branch">শাখার নাম</th>
                            <th className="col-officer">অফিসারের নাম</th>
                            <th className="col-component">কম্পোনেন্টের নাম</th>
                            <th className="col-member">সদস্যের নাম</th>
                            <th className="col-samity">সমিতির নাম</th>
                            <th className="col-mobile">মোবাইল নম্বর</th>
                            <th colSpan={3}>সম্পদের পরিমাণ</th>
                            <th colSpan={3}>গবাদী পশুর সংখ্যা</th>
                            <th className="col-value">স্থাবর ও অস্থাবর সম্পদের মূল্য</th>
                            <th className="col-occupation">উপার্জনকারীর পেশা</th>
                            <th className="col-income">পরিবারের মাসিক আয়</th>
                            <th className="col-guarantor">জামিনদারের নাম</th>
                            <th className="col-loan">অন্যান্য সংস্থায় গ্রহণকৃত ঋণের পরিমাণ</th>
                        </tr>
                        <tr>
                            <th className="col-sl"></th>
                            <th className="col-branch"></th>
                            <th className="col-officer"></th>
                            <th className="col-component"></th>
                            <th className="col-member"></th>
                            <th className="col-samity"></th>
                            <th className="col-mobile"></th>
                            <th className="col-num">বসতবাড়ি</th>
                            <th className="col-num">আবাদী</th>
                            <th className="col-num">মোট</th>
                            <th className="col-num">গরু</th>
                            <th className="col-num">ছাগল</th>
                            <th className="col-num">হাঁস/মুরগী</th>
                            <th className="col-value"></th>
                            <th className="col-occupation"></th>
                            <th className="col-income"></th>
                            <th className="col-guarantor"></th>
                            <th className="col-loan"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {admissions.length === 0 ? (
                            <tr>
                                <td colSpan={18} style={{ textAlign: 'center', padding: '12px' }}>
                                    কোনো রেকর্ড নেই
                                </td>
                            </tr>
                        ) : (
                            admissions.map((admission, index) => (
                                <tr key={admission.id}>
                                    <td className="col-sl">{index + 1}</td>
                                    <td className="col-branch">{admission.branch?.name ?? '—'}</td>
                                    <td className="col-officer">{officerName(admission)}</td>
                                    <td className="col-member">
                                        <div style={{ fontWeight: 'bold' }}>
                                            <span>{memberName(admission)}</span>
                                            {admission.is_legacy ? (
                                                <span style={{ fontSize: '7.5px', color: '#b45309', marginLeft: '4px', fontWeight: 'bold' }}>
                                                    (দফা: {admission.loan_dofa ?? 1})
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: '7.5px', color: '#047857', marginLeft: '4px', fontWeight: 'bold' }}>
                                                    (নতুন)
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="col-samity">{str(admission.samity?.samity_name)}</td>
                                    <td className="col-mobile">{str(admission.mobile_number)}</td>
                                    <td className="col-num">{houseCount(admission)}</td>
                                    <td className="col-num">{cultivable(admission)}</td>
                                    <td className="col-num">{totalAsset(admission)}</td>
                                    <td className="col-num">{num(admission.cow_buffalo_count)}</td>
                                    <td className="col-num">{num(admission.goat_sheep_count)}</td>
                                    <td className="col-num">{num(admission.duck_chicken_count)}</td>
                                    <td className="col-value">{num(admission.total_asset_value)}</td>
                                    <td className="col-occupation">{occupation(admission)}</td>
                                    <td className="col-income">{num(admission.monthly_income)}</td>
                                    <td className="col-guarantor">{str(admission.guarantor_name)}</td>
                                    <td className="col-loan">{str(admission.other_loan_info)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}
