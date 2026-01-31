<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ঋণ সদস্য তালিকা</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 1cm;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Noto Sans Bengali', 'SolaimanLipi', Arial, sans-serif;
            font-size: 9pt;
            line-height: 1.3;
            color: #1e293b;
        }

        .header {
            text-align: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 3px solid #1e40af;
        }

        .header h1 {
            font-size: 18pt;
            color: #1e40af;
            margin-bottom: 5px;
            font-weight: bold;
        }

        .header p {
            font-size: 10pt;
            color: #64748b;
        }

        .filter-info {
            background-color: #f1f5f9;
            padding: 8px;
            margin-bottom: 15px;
            border-left: 4px solid #1e40af;
            font-size: 9pt;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        thead {
            background-color: #1e40af;
            color: white;
        }

        thead th {
            padding: 8px 4px;
            text-align: center;
            font-weight: bold;
            border: 1px solid #1e293b;
            font-size: 9pt;
            vertical-align: middle;
        }

        tbody td {
            padding: 6px 4px;
            border: 1px solid #64748b;
            font-size: 8pt;
            vertical-align: top;
        }

        tbody tr:nth-child(even) {
            background-color: #f8fafc;
        }

        tbody tr:nth-child(odd) {
            background-color: white;
        }

        .text-center {
            text-align: center;
        }

        .text-right {
            text-align: right;
        }

        .text-left {
            text-align: left;
        }

        .nowrap {
            white-space: nowrap;
        }

        .footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 8pt;
            color: #64748b;
            padding: 5px;
            border-top: 1px solid #e2e8f0;
        }

        @media print {
            thead {
                display: table-header-group;
            }

            tr {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    @php
        // Bangla number converter function
        function toBanglaNumber($number) {
            $english = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', ','];
            $bangla = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯', '.', ','];
            return str_replace($english, $bangla, $number);
        }
    @endphp

    <div class="header">
        <h1>ঋণ সদস্য তালিকা</h1>
        <p>সকল ঋণ আবেদনের বিস্তারিত তথ্য</p>
    </div>

    @if(isset($filters) && (isset($filters['zone_id']) || isset($filters['area_id']) || isset($filters['branch_id'])))
    <div class="filter-info">
        <strong>ফিল্টার প্রয়োগ করা হয়েছে:</strong>
        @if(isset($filters['zone_id'])) জোন, @endif
        @if(isset($filters['area_id'])) এরিয়া, @endif
        @if(isset($filters['branch_id'])) শাখা, @endif
        @if(isset($filters['status'])) স্ট্যাটাস: {{ ucfirst($filters['status']) }} @endif
    </div>
    @endif

    <table>
        <thead>
            <tr>
                <th style="width: 5%;">আবেদন নং</th>
                <th style="width: 7%;">জোন</th>
                <th style="width: 7%;">এরিয়া</th>
                <th style="width: 8%;">শাখা</th>
                <th style="width: 3%;">ক্রমিক</th>
                <th style="width: 10%;">সদস্যের নাম</th>
                <th style="width: 9%;">পিতার নাম</th>
                <th style="width: 7%;">গ্রাম</th>
                <th style="width: 6%;">মোবাইল</th>
                <th style="width: 8%;">কমিটি</th>
                <th style="width: 6%;">ঋণের পরিমাণ</th>
                <th style="width: 4%;">মেয়াদ</th>
                <th style="width: 6%;">উদ্দেশ্য</th>
                <th style="width: 6%;">কিস্তি</th>
                <th style="width: 8%;">তারিখ</th>
            </tr>
        </thead>
        <tbody>
            @forelse($applications as $app)
                @foreach($app->loanMembers as $member)
                <tr>
                    <td class="text-center nowrap">{{ $app->application_no }}</td>
                    <td class="text-center">{{ $app->branch->area->zone->name ?? 'প্রযোজ্য নয়' }}</td>
                    <td class="text-center">{{ $app->branch->area->name ?? 'প্রযোজ্য নয়' }}</td>
                    <td>{{ $app->branch->name }}</td>
                    <td class="text-center">{{ toBanglaNumber($member->serial_no) }}</td>
                    <td>{{ $member->somiti_name ?? '-' }}</td>
                    <td>{{ $member->member_name }}</td>
                    <td>{{ $member->member_code ?? '-' }}</td>
                    <td class="text-center">{{ toBanglaNumber($member->member_mobile ?? '-') }}</td>
                    <td>{{ $member->project_name ?? '-' }}</td>
                    <td class="text-right">{{ toBanglaNumber(number_format($member->approved_loan_amount ?? 0, 2)) }}</td>
                    <td class="text-center">
                        @if($member->loan_duration)
                            {{ toBanglaNumber($member->loan_duration) }}
                        @else
                            -
                        @endif
                    </td>
                    <td class="text-center">{{ $member->phase_no ?? '-' }}</td>
                    <td class="text-center">
                        @if($member->installment_amount)
                            {{ toBanglaNumber(number_format($member->installment_amount, 2)) }}
                        @else
                            -
                        @endif
                    </td>
                    <td class="text-center nowrap">{{ $member->approval_date ?? '-' }}</td>
                </tr>
                @endforeach
            @empty
                <tr>
                    <td colspan="15" class="text-center" style="padding: 20px;">
                        কোন তথ্য পাওয়া যায়নি
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        তৈরির তারিখ: {{ toBanglaNumber(date('d-m-Y H:i:s')) }} | পৃষ্ঠা: <span class="pageNumber"></span>
    </div>

    <script>
        // Add page numbers
        const pageNumbers = document.querySelectorAll('.pageNumber');
        pageNumbers.forEach(el => {
            el.textContent = '১';
        });
    </script>
</body>
</html>
