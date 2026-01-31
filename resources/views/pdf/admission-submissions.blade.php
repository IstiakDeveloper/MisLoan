<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>সদস্য ভর্তি তালিকা</title>
    <style>
        @php
        function toBanglaNumber($number) {
            $en = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
            $bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
            return str_replace($en, $bn, $number);
        }
        @endphp

        @page {
            size: A4 landscape;
            margin: 15mm;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Kalpurush', 'SolaimanLipi', Arial, sans-serif;
            font-size: 9pt;
            line-height: 1.3;
            color: #000;
        }

        .header {
            text-align: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #1e40af;
        }

        .header h1 {
            font-size: 18pt;
            color: #1e40af;
            margin-bottom: 5px;
        }

        .header p {
            font-size: 10pt;
            color: #666;
        }

        .filters {
            margin-bottom: 15px;
            padding: 8px;
            background: #f3f4f6;
            border-radius: 4px;
        }

        .filters p {
            font-size: 9pt;
            margin-bottom: 3px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        thead {
            background: #1e40af;
            color: white;
        }

        thead th {
            padding: 8px 5px;
            text-align: left;
            font-size: 9pt;
            border: 1px solid #1e40af;
            font-weight: bold;
        }

        tbody td {
            padding: 6px 5px;
            border: 1px solid #ddd;
            font-size: 8pt;
            vertical-align: top;
        }

        tbody tr:nth-child(even) {
            background: #f9fafb;
        }

        tbody tr:nth-child(odd) {
            background: white;
        }

        .text-center {
            text-align: center;
        }

        .text-right {
            text-align: right;
        }

        .footer {
            position: fixed;
            bottom: 10mm;
            left: 15mm;
            right: 15mm;
            text-align: center;
            font-size: 8pt;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 5px;
        }

        .page-break {
            page-break-after: always;
        }

        .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 7pt;
            font-weight: bold;
        }

        .badge-success {
            background: #d1fae5;
            color: #065f46;
        }

        .badge-warning {
            background: #fed7aa;
            color: #92400e;
        }

        .badge-danger {
            background: #fee2e2;
            color: #991b1b;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>সদস্য ভর্তি তালিকা</h1>
        <p>মাইক্রোক্রেডিট ম্যানেজমেন্ট সিস্টেম</p>
    </div>

    @if($filters['zone'] || $filters['area'] || $filters['branch'] || $filters['status'])
    <div class="filters">
        <p><strong>ফিল্টার:</strong></p>
        @if($filters['zone'])
            <p>জোন: {{ $filters['zone'] }}</p>
        @endif
        @if($filters['area'])
            <p>এরিয়া: {{ $filters['area'] }}</p>
        @endif
        @if($filters['branch'])
            <p>শাখা: {{ $filters['branch'] }}</p>
        @endif
        @if($filters['status'])
            <p>স্ট্যাটাস: {{ $filters['status'] }}</p>
        @endif
    </div>
    @endif

    <table>
        <thead>
            <tr>
                <th style="width: 8%;">আবেদন নং</th>
                <th style="width: 7%;">জোন</th>
                <th style="width: 7%;">এরিয়া</th>
                <th style="width: 8%;">শাখা</th>
                <th style="width: 3%;">ক্রমিক</th>
                <th style="width: 10%;">সদস্যের নাম</th>
                <th style="width: 7%;">মোবাইল</th>
                <th style="width: 8%;">সমিতি</th>
                <th style="width: 6%;">বসতবাড়ী</th>
                <th style="width: 6%;">মোট জমি</th>
                <th style="width: 8%;">পেশা</th>
                <th style="width: 7%;">মাসিক আয়</th>
                <th style="width: 8%;">জামিনদার</th>
                <th style="width: 7%;">তারিখ</th>
            </tr>
        </thead>
        <tbody>
            @forelse($admissions as $admission)
                @foreach($admission->admissionMembers as $member)
                <tr>
                    <td>{{ $admission->application_no }}</td>
                    <td>{{ $admission->branch?->area?->zone?->name ?? '-' }}</td>
                    <td>{{ $admission->branch?->area?->name ?? '-' }}</td>
                    <td>{{ $admission->branch?->name ?? '-' }}</td>
                    <td class="text-center">{{ toBanglaNumber($member->excel_row_number ?? '') }}</td>
                    <td><strong>{{ $member->member_name }}</strong></td>
                    <td>{{ $member->mobile ? toBanglaNumber($member->mobile) : '-' }}</td>
                    <td>{{ $member->society_name ?? '-' }}</td>
                    <td>{{ $member->residential_property ?? '-' }}</td>
                    <td>{{ $member->total_land ?? '-' }}</td>
                    <td>{{ $member->earning_person_occupation ?? '-' }}</td>
                    <td class="text-right">
                        @if($member->family_monthly_income)
                            {{ toBanglaNumber(number_format($member->family_monthly_income, 2)) }}
                        @else
                            -
                        @endif
                    </td>
                    <td>{{ $member->guarantor_name ?? '-' }}</td>
                    <td class="text-center">
                        {{ $admission->submitted_at ? toBanglaNumber($admission->submitted_at->format('d/m/Y')) : '' }}
                    </td>
                </tr>
                @endforeach
            @empty
                <tr>
                    <td colspan="14" class="text-center">কোনো ডেটা পাওয়া যায়নি</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        <p>মুদ্রণ তারিখ: {{ toBanglaNumber(date('d/m/Y')) }} | পৃষ্ঠা: ১</p>
    </div>
</body>
</html>
