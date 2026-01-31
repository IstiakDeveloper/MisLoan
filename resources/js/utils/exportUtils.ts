interface AdmissionMember {
    id: number;
    member_name: string;
    mobile?: string;
    status: string;
    society_name?: string;
    earning_person_occupation?: string;
    family_monthly_income?: string;
    guarantor_name?: string;
    guarantor_relation?: string;
    officer_name?: string;
    component_name?: string;
    branch_name?: string;
    residential_property?: string;
    cultivable_land?: string;
    total_land?: string;
    cattle_count?: number;
    goat_count?: number;
    poultry_count?: number;
    fixed_movable_assets_value?: string;
    remarks?: string;
    rejection_reason?: string;
    head_office_remarks?: string;
    head_office_decision?: string;
    member_admission?: {
        id: number;
        application_no: string;
        branch?: {
            name: string;
            area?: {
                name: string;
                zone?: {
                    name: string;
                };
            };
        };
    };
}

export const exportToCSV = (members: AdmissionMember[], date: string) => {
    const headers = [
        'Member Name', 'Mobile', 'NID', 'Branch', 'Zone', 'Area', 'Society', 'Officer',
        'Component', 'Residential Property', 'Cultivable Land', 'Total Land',
        'Cattle', 'Goat', 'Poultry', 'Fixed Assets', 'Occupation', 'Monthly Income',
        'Guarantor', 'Guarantor Relation', 'Remarks', 'Status', 'Rejection Reason'
    ];

    const rows = members.map(member => [
        member.member_name,
        member.mobile || '-',
        member.id,
        member.member_admission?.branch?.name || '-',
        member.member_admission?.branch?.area?.zone?.name || '-',
        member.member_admission?.branch?.area?.name || '-',
        member.society_name || '-',
        member.officer_name || '-',
        member.component_name || '-',
        member.residential_property || '-',
        member.cultivable_land || '-',
        member.total_land || '-',
        member.cattle_count || '0',
        member.goat_count || '0',
        member.poultry_count || '0',
        member.fixed_movable_assets_value || '-',
        member.earning_person_occupation || '-',
        member.family_monthly_income || '-',
        member.guarantor_name || '-',
        member.guarantor_relation || '-',
        member.remarks || '-',
        member.status,
        member.rejection_reason || '-',
    ]);

    const csvContent = [
        ['Member Admissions Report', date],
        [],
        headers,
        ...rows,
    ]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `admission-members-${date}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportToExcel = (members: AdmissionMember[], date: string) => {
    // Create a simple HTML table and convert to Excel-like format
    const headers = [
        'Member Name', 'Mobile', 'NID', 'Branch', 'Zone', 'Area', 'Society', 'Officer',
        'Component', 'Residential Property', 'Cultivable Land', 'Total Land',
        'Cattle', 'Goat', 'Poultry', 'Fixed Assets', 'Occupation', 'Monthly Income',
        'Guarantor', 'Guarantor Relation', 'Remarks', 'Status', 'Rejection Reason'
    ];

    const rows = members.map(member => [
        member.member_name,
        member.mobile || '-',
        member.id,
        member.member_admission?.branch?.name || '-',
        member.member_admission?.branch?.area?.zone?.name || '-',
        member.member_admission?.branch?.area?.name || '-',
        member.society_name || '-',
        member.officer_name || '-',
        member.component_name || '-',
        member.residential_property || '-',
        member.cultivable_land || '-',
        member.total_land || '-',
        member.cattle_count || '0',
        member.goat_count || '0',
        member.poultry_count || '0',
        member.fixed_movable_assets_value || '-',
        member.earning_person_occupation || '-',
        member.family_monthly_income || '-',
        member.guarantor_name || '-',
        member.guarantor_relation || '-',
        member.remarks || '-',
        member.status,
        member.rejection_reason || '-',
    ]);

    let html = `
        <table border="1">
            <tr>
                <td colspan="${headers.length}"><strong>Member Admissions Report - ${date}</strong></td>
            </tr>
            <tr>
                ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
            ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
        </table>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `admission-members-${date}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

interface FilterInfo {
    zone?: string;
    area?: string;
    branch?: string;
}

export const printMembers = (members: AdmissionMember[], date: string, filterInfo?: FilterInfo) => {
    // Group members by Zone > Area > Branch for hierarchical display
    const groupedData: Record<string, Record<string, Record<string, AdmissionMember[]>>> = {};

    members.forEach(member => {
        const zoneName = member.member_admission?.branch?.area?.zone?.name || 'অজানা অঞ্চল';
        const areaName = member.member_admission?.branch?.area?.name || 'অজানা এলাকা';
        const branchName = member.member_admission?.branch?.name || 'অজানা শাখা';

        if (!groupedData[zoneName]) groupedData[zoneName] = {};
        if (!groupedData[zoneName][areaName]) groupedData[zoneName][areaName] = {};
        if (!groupedData[zoneName][areaName][branchName]) groupedData[zoneName][areaName][branchName] = [];

        groupedData[zoneName][areaName][branchName].push(member);
    });

    // Sort zones, areas, branches alphabetically in Bengali
    const sortedZones = Object.keys(groupedData).sort((a, b) => a.localeCompare(b, 'bn'));

    const headers = [
        'ক্রম', 'সদস্যের নাম', 'মোবাইল', 'সমিতি', 'অফিসার',
        'আবাসিক সম্পত্তি', 'চাষযোগ্য ভূমি', 'মোট ভূমি',
        'গবাদি', 'ছাগল', 'হাঁস-মুরগি', 'স্থির সম্পদ', 'পেশা', 'মাসিক আয়',
        'জামিনদার', 'সম্পর্ক', 'অবস্থা'
    ];

    // Build table content with grouping
    let tableContent = '';
    let serialNo = 1;

    sortedZones.forEach(zoneName => {
        const sortedAreas = Object.keys(groupedData[zoneName]).sort((a, b) => a.localeCompare(b, 'bn'));

        sortedAreas.forEach(areaName => {
            const sortedBranches = Object.keys(groupedData[zoneName][areaName]).sort((a, b) => a.localeCompare(b, 'bn'));

            sortedBranches.forEach(branchName => {
                const branchMembers = groupedData[zoneName][areaName][branchName];

                // Branch header row with Zone/Area info
                tableContent += `
                    <tr class="branch-header">
                        <td colspan="${headers.length}">
                            <strong>শাখা:</strong> ${branchName} |
                            <strong>এলাকা:</strong> ${areaName} |
                            <strong>অঞ্চল:</strong> ${zoneName} |
                            <strong>সদস্য সংখ্যা:</strong> ${branchMembers.length}
                        </td>
                    </tr>
                `;

                // Member rows for this branch
                branchMembers.forEach(member => {
                    const statusText = member.status === 'approved' ? 'অনুমোদিত' :
                                      member.status === 'rejected' ? 'প্রত্যাখ্যাত' :
                                      member.status === 'issue' ? 'সমস্যা' : 'অপেক্ষমাণ';
                    const statusClass = `status-${member.status}`;

                    tableContent += `
                        <tr>
                            <td class="center">${serialNo++}</td>
                            <td>${member.member_name || '-'}</td>
                            <td>${member.mobile || '-'}</td>
                            <td>${member.society_name || '-'}</td>
                            <td>${member.officer_name || '-'}</td>
                            <td>${member.residential_property || '-'}</td>
                            <td>${member.cultivable_land || '-'}</td>
                            <td>${member.total_land || '-'}</td>
                            <td class="center">${member.cattle_count || '0'}</td>
                            <td class="center">${member.goat_count || '0'}</td>
                            <td class="center">${member.poultry_count || '0'}</td>
                            <td>${member.fixed_movable_assets_value || '-'}</td>
                            <td>${member.earning_person_occupation || '-'}</td>
                            <td>${member.family_monthly_income || '-'}</td>
                            <td>${member.guarantor_name || '-'}</td>
                            <td>${member.guarantor_relation || '-'}</td>
                            <td class="${statusClass}">${statusText}</td>
                        </tr>
                    `;
                });
            });
        });
    });

    // Build filter info for header
    let filterText = '';
    if (filterInfo?.zone) filterText += `<strong>অঞ্চল:</strong> ${filterInfo.zone}`;
    if (filterInfo?.area) filterText += ` | <strong>এলাকা:</strong> ${filterInfo.area}`;
    if (filterInfo?.branch) filterText += ` | <strong>শাখা:</strong> ${filterInfo.branch}`;
    if (!filterText) filterText = '<strong>সকল অঞ্চল</strong>';

    const printWindow = window.open('', '', 'height=600,width=1200');
    if (printWindow) {
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>সদস্য ভর্তি রিপোর্ট - ${date}</title>
                    <style>
                        @page {
                            size: landscape;
                            margin: 0.4in 0.3in;
                        }
                        * {
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                        }
                        body {
                            font-family: 'SolaimanLipi', 'Kalpurush', 'Noto Sans Bengali', 'Hind Siliguri', Arial, sans-serif;
                            font-size: 11px;
                            line-height: 1.5;
                            color: #1a1a1a;
                        }
                        .header {
                            text-align: center;
                            margin-bottom: 15px;
                            padding-bottom: 10px;
                            border-bottom: 2px solid #2d5a27;
                        }
                        h1 {
                            margin: 5px 0;
                            font-size: 20px;
                            font-weight: 700;
                            color: #2d5a27;
                        }
                        .meta {
                            margin: 8px 0;
                            font-size: 12px;
                            color: #333;
                        }
                        .filter-info {
                            background: #f0f7ef;
                            padding: 8px 15px;
                            border-radius: 4px;
                            display: inline-block;
                            margin-top: 5px;
                            font-size: 11px;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 10px;
                        }
                        th {
                            background: linear-gradient(180deg, #3d7a35 0%, #2d5a27 100%);
                            color: white;
                            border: 1px solid #2d5a27;
                            padding: 8px 5px;
                            text-align: center;
                            font-weight: 600;
                            font-size: 10px;
                            white-space: nowrap;
                        }
                        td {
                            border: 1px solid #ccc;
                            padding: 6px 5px;
                            font-size: 10px;
                            max-width: 100px;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            white-space: nowrap;
                        }
                        td.center {
                            text-align: center;
                        }
                        tr:nth-child(even):not(.branch-header) {
                            background-color: #f9f9f9;
                        }
                        tr:hover:not(.branch-header) {
                            background-color: #f0f7ef;
                        }
                        .branch-header td {
                            background: linear-gradient(180deg, #e8f5e8 0%, #d4ecd4 100%);
                            font-weight: 600;
                            font-size: 11px;
                            padding: 10px 8px;
                            border: 1px solid #3d7a35;
                            color: #2d5a27;
                        }
                        .status-pending { color: #e65100; font-weight: 600; }
                        .status-approved { color: #2e7d32; font-weight: 600; }
                        .status-rejected { color: #c62828; font-weight: 600; }
                        .status-issue { color: #ef6c00; font-weight: 600; }
                        .summary {
                            margin-top: 15px;
                            padding: 10px;
                            background: #f5f5f5;
                            border-radius: 4px;
                            font-size: 11px;
                        }
                        @media print {
                            body {
                                margin: 0;
                                padding: 8px;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                            .header {
                                margin-bottom: 10px;
                            }
                            th {
                                background: #3d7a35 !important;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                            .branch-header td {
                                background: #e8f5e8 !important;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>সদস্য ভর্তি রিপোর্ট</h1>
                        <div class="meta">
                            <strong>তারিখ:</strong> ${date} | <strong>মোট সদস্য:</strong> ${members.length}
                        </div>
                        <div class="filter-info">${filterText}</div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                ${headers.map(h => `<th>${h}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${tableContent}
                        </tbody>
                    </table>
                    <div class="summary">
                        <strong>সারসংক্ষেপ:</strong>
                        অনুমোদিত: ${members.filter(m => m.status === 'approved').length} |
                        অপেক্ষমাণ: ${members.filter(m => m.status === 'pending').length} |
                        সমস্যা: ${members.filter(m => m.status === 'issue').length} |
                        প্রত্যাখ্যাত: ${members.filter(m => m.status === 'rejected').length}
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();

        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 500);
    }
};
