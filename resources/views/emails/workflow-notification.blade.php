<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $title }}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif, 'SolaimanLipi';
            background-color: #f1f5f9;
            margin: 0;
            padding: 20px;
            color: #334155;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            border: 1px solid #e2e8f0;
        }
        .header {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #ffffff;
            padding: 24px 30px;
            text-align: left;
        }
        .header h1 {
            margin: 0;
            font-size: 20px;
            font-weight: 700;
            letter-spacing: 0.5px;
            color: #38bdf8;
        }
        .header p {
            margin: 6px 0 0 0;
            font-size: 12px;
            color: #94a3b8;
        }
        .content {
            padding: 30px;
        }
        .greeting {
            font-size: 16px;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 12px;
        }
        .notification-card {
            background-color: #f8fafc;
            border-left: 4px solid #0284c7;
            padding: 16px 20px;
            border-radius: 6px;
            margin-bottom: 24px;
        }
        .notification-title {
            font-size: 15px;
            font-weight: 700;
            color: #0369a1;
            margin: 0 0 8px 0;
        }
        .notification-message {
            font-size: 14px;
            line-height: 1.6;
            color: #334155;
            margin: 0;
        }
        .details-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background-color: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
        }
        .details-table td {
            padding: 10px 14px;
            font-size: 13px;
            border-bottom: 1px solid #f1f5f9;
        }
        .details-table td.label {
            font-weight: 600;
            color: #64748b;
            width: 35%;
            background-color: #f8fafc;
        }
        .details-table td.value {
            color: #0f172a;
            font-weight: 500;
        }
        .action-button-wrapper {
            text-align: center;
            margin: 30px 0 10px 0;
        }
        .action-button {
            display: inline-block;
            background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 28px;
            font-size: 14px;
            font-weight: 700;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(2, 132, 199, 0.3);
        }
        .footer {
            background-color: #f8fafc;
            padding: 20px 30px;
            text-align: center;
            font-size: 12px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>MIS Loan System</h1>
            <p>মৌসুমী লোন ম্যানেজমেন্ট সিস্টেম নোটিফিকেশন</p>
        </div>
        <div class="content">
            <div class="greeting">প্রিয় {{ $userName }},</div>
            
            <div class="notification-card">
                <div class="notification-title">{{ $title }}</div>
                <div class="notification-message">{{ $messageContent }}</div>
            </div>

            @if(!empty($details))
                <table class="details-table">
                    <tbody>
                        @foreach($details as $label => $value)
                            <tr>
                                <td class="label">{{ $label }}</td>
                                <td class="value">{{ $value }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            @endif

            @if(!empty($actionUrl))
                <div class="action-button-wrapper">
                    <a href="{{ $actionUrl }}" class="action-button">বিস্তারিত দেখুন</a>
                </div>
            @endif
        </div>
        <div class="footer">
            <p>এই ইমেইলটি MIS Loan System থেকে স্বয়ংক্রিয়ভাবে প্রেরিত হয়েছে। দয়া করে এতে সরাসরি উত্তর দেবেন না।</p>
            <p>&copy; {{ date('Y') }} Mousumi Apps. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
