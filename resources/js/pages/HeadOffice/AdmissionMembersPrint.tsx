import { Head } from '@inertiajs/react';
import { useEffect } from 'react';
import { formatDate } from '@/utils/dateUtils';

interface Zone {
    id: number | string;
    name: string;
}

interface Area {
    id: number | string;
    name: string;
    zone_id?: number | string;
    zone?: Zone;
}

interface Branch {
    id: number | string;
    name: string;
    branch_code?: string;
    code?: string;
    area_id?: number | string;
    area?: Area;
}

interface Samity {
    id: number;
    samity_name: string;
    samity_name_bn?: string;
    samity_code?: string;
    code?: string;
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
    memberCategory?: MemberCategory;
    is_legacy?: boolean | number;
    loan_dofa?: number | string | null;
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
    zone_id?: number | string;
    area_id?: number | string;
    branch_id?: number | string;
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

    const filterZoneId = filters.zone_id ? String(filters.zone_id) : '';
    const filterAreaId = filters.area_id ? String(filters.area_id) : '';
    const filterBranchId = filters.branch_id ? String(filters.branch_id) : '';

    const selectedBranch = filterBranchId
        ? branches.find((b) => String(b.id) === filterBranchId) || (admissions.length > 0 && String(admissions[0]?.branch?.id) === filterBranchId ? admissions[0].branch : null)
        : null;

    const selectedArea = filterAreaId
        ? areas.find((a) => String(a.id) === filterAreaId) || (selectedBranch?.area ?? null)
        : (selectedBranch?.area ?? (selectedBranch?.area_id ? areas.find((a) => String(a.id) === String(selectedBranch.area_id)) : null));

    const selectedZone = filterZoneId
        ? zones.find((z) => String(z.id) === filterZoneId) || (selectedArea?.zone ?? selectedBranch?.area?.zone ?? null)
        : (selectedBranch?.area?.zone ?? selectedArea?.zone ?? (selectedArea?.zone_id ? zones.find((z) => String(z.id) === String(selectedArea.zone_id)) : null));

    const branchName = selectedBranch ? selectedBranch.name : 'সকল শাখা';
    const areaName = selectedArea ? selectedArea.name : 'সকল অঞ্চল';
    const zoneName = selectedZone ? selectedZone.name : 'সকল জোন';
    const fromDateStr = filters.date_from ? formatDate(filters.date_from) : '';
    const toDateStr = filters.date_to ? formatDate(filters.date_to) : '';
    const reportDate =
        fromDateStr && toDateStr
            ? (fromDateStr === toDateStr ? fromDateStr : `${fromDateStr} - ${toDateStr}`)
            : toDateStr || fromDateStr || formatDate(new Date());

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

    const formatSamityNameWithCode = (samity?: Samity | null) => {
        if (!samity) return '—';
        const name = samity.samity_name_bn || samity.samity_name || '';
        const fullCode = String(samity.samity_code || samity.code || '').trim();
        const shortCode = fullCode.length > 4 ? fullCode.slice(-4) : fullCode;
        if (name && shortCode) {
            return `${name} (${shortCode})`;
        }
        return name || shortCode || '—';
    };

    const officerName = (a: MemberAdmissionPrint) =>
        str(a.createdBy?.name ?? a.interviewer_name ?? a.employee_name);
    const categoryName = (a: MemberAdmissionPrint) =>
        str(a.member_category?.category_name || (a as any).memberCategory?.category_name);
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
    const occupation = (a: MemberAdmissionPrint) => {
        const family = (a as any).family_members || (a as any).familyMembers || [];
        if (Array.isArray(family) && family.length > 0) {
            const selfMember = family.find((m: any) => m.relation_with_head === 'নিজ' || m.relation_with_head === 'self') || family[0];
            if (selfMember?.occupation) return selfMember.occupation;
        }
        return str(a.job_details || a.business_details || (a as any).other_income_details);
    };

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
                    .header-meta-table {
                        width: 100%;
                        margin: 6px auto 2px;
                        border: none;
                        font-size: 10px;
                        border-collapse: collapse;
                    }
                    .header-meta-table td {
                        border: none;
                        padding: 2px 4px;
                        vertical-align: middle;
                    }
                    .meta-left {
                        text-align: left;
                        width: 33.33%;
                    }
                    .meta-center {
                        text-align: center;
                        width: 33.34%;
                    }
                    .meta-right {
                        text-align: right;
                        width: 33.33%;
                    }
                    .header-filter-label {
                        font-weight: 600;
                        color: #374151;
                    }
                    .header-filter-value {
                        color: #111827;
                        font-weight: bold;
                    }
                    table { width: 100%; border-collapse: collapse; margin-top: 4px; }
                    thead { display: table-header-group; }
                    tbody { display: table-row-group; }
                    th, td {
                        border: 0.5px solid #333;
                        padding: 3.5px 3px;
                        text-align: center;
                        vertical-align: middle;
                        word-wrap: break-word;
                        overflow-wrap: break-word;
                        line-height: 1.25;
                    }
                    th {
                        background-color: #e5e7eb;
                        font-weight: bold;
                        font-size: 8.5px;
                        text-align: center !important;
                        vertical-align: middle;
                    }
                    td { font-size: 8.5px; text-align: center; }
                    .col-sl { width: 2.5%; text-align: center; }
                    .col-branch { width: 6%; }
                    .col-officer { width: 6%; }
                    .col-samity { width: 7%; line-height: 1.2; word-break: break-word; }
                    .col-component { width: 5%; }
                    .col-member { width: 7.5%; line-height: 1.2; }
                    .col-mobile { width: 6%; text-align: center; font-size: 8px; }
                    .col-num { width: 3%; text-align: center; }
                    .col-asset { width: 5%; text-align: center; }
                    .col-livestock { width: 3%; text-align: center; }
                    .col-value { width: 5.5%; text-align: center; }
                    .col-occupation { width: 4.5%; text-align: center; line-height: 1.2; }
                    .col-income { width: 4.5%; text-align: center; }
                    .col-guarantor { width: 6.5%; text-align: center; line-height: 1.2; }
                    .col-loan { width: 7%; text-align: center; }
                    .col-remarks { width: 13%; text-align: center; }
                    @media print {
                        body { print-color-adjust: exact; }
                        table { page-break-inside: auto; }
                        tr { page-break-inside: avoid; }
                        thead { display: table-header-group; }
                    }
                `}</style>
            </Head>

            <div className="print-container">
                {/* হেডার - উপরে বামে লোগো, মাঝে টাইটেল ও তথ্য */}
                <div className="print-header">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: '48px', marginBottom: '2px' }}>
                        <div style={{ position: 'absolute', left: '0', top: '50%', transform: 'translateY(-50%)' }}>
                            <img
                                src="/logo.png"
                                alt="মৌসুমী"
                                style={{ height: '42px', width: 'auto', objectFit: 'contain' }}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <p className="org">মৌসুমী</p>
                            <p className="address">উকিলপাড়া, নওগাঁ।</p>
                            <p className="title">সদস্য ভর্তি যাচাই ও অনুমোদন সংক্রান্ত তথ্য।</p>
                        </div>
                    </div>
                    <table className="header-meta-table">
                        <tbody>
                            <tr>
                                <td className="meta-left">
                                    <span className="header-filter-label">অঞ্চলের নাম: </span>
                                    <span className="header-filter-value">{areaName}</span>
                                </td>
                                <td className="meta-center">
                                    <span className="header-filter-label">তারিখ: </span>
                                    <span className="header-filter-value">{reportDate}</span>
                                </td>
                                <td className="meta-right">
                                    <span className="header-filter-label">জোনের নাম: </span>
                                    <span className="header-filter-value">{zoneName}</span>
                                </td>
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
                            <th className="col-samity">সমিতির নাম (কোড)</th>
                            <th className="col-component">কম্পোনেন্টের নাম</th>
                            <th className="col-member">সদস্যের নাম</th>
                            <th className="col-mobile">মোবাইল নম্বর</th>
                            <th colSpan={3}>সম্পদের পরিমাণ</th>
                            <th colSpan={3}>গবাদী পশুর সংখ্যা</th>
                            <th className="col-value">স্থাবর ও অস্থাবর সম্পদের মূল্য</th>
                            <th className="col-occupation">উপার্জনকারীর পেশা</th>
                            <th className="col-income">পরিবারের মাসিক আয়</th>
                            <th className="col-guarantor">জামিনদারের নাম</th>
                            <th className="col-loan">অন্যান্য সংস্থায় গ্রহণকৃত ঋণের পরিমাণ</th>
                            <th className="col-remarks">মন্তব্য</th>
                        </tr>
                        <tr>
                            <th className="col-sl"></th>
                            <th className="col-branch"></th>
                            <th className="col-officer"></th>
                            <th className="col-samity"></th>
                            <th className="col-component"></th>
                            <th className="col-member"></th>
                            <th className="col-mobile"></th>
                            <th className="col-num">বসত</th>
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
                            <th className="col-remarks"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {admissions.length === 0 ? (
                            <tr>
                                <td colSpan={19} style={{ textAlign: 'center', padding: '12px' }}>
                                    কোনো রেকর্ড নেই
                                </td>
                            </tr>
                        ) : (
                            admissions.map((admission, index) => (
                                <tr key={admission.id}>
                                    <td className="col-sl">{index + 1}</td>
                                    <td className="col-branch">{admission.branch?.name ?? '—'}</td>
                                    <td className="col-officer">{officerName(admission)}</td>
                                    <td className="col-samity">{formatSamityNameWithCode(admission.samity)}</td>
                                    <td className="col-component">{categoryName(admission)}</td>
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
                                    <td className="col-remarks"></td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}
