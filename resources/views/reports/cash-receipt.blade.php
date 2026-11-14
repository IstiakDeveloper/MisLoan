<!doctype html>
<html lang="bn">
<head>
    <meta charset="utf-8">
    <title>রসিদ {{ $row->reference }}</title>
    <style>
        body { font-family: sans-serif; margin: 24px; color: #111; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        table { border-collapse: collapse; width: 100%; margin-top: 16px; }
        th, td { border: 1px solid #bbb; padding: 6px; text-align: left; }
        .notice { margin-top: 16px; font-size: 12px; }
        @media print { .screen { display: none; } }
    </style>
</head>
<body>
    <p class="screen">ব্রাউজারের প্রিন্ট দিয়ে সংরক্ষণ করুন।</p>
    <h1>{{ $kind === 'loan' ? 'ঋণ আদায়ের রসিদ' : 'সঞ্চয় রসিদ' }}</h1>
    <p>{{ $row->branch_name }}</p>
    <table>
        <tr><th>রসিদ</th><td>{{ $row->reference }}</td></tr>
        <tr><th>তারিখ</th><td>{{ $row->business_date }}</td></tr>
        <tr><th>সদস্য</th><td>{{ $member }}</td></tr>
        <tr><th>আবেদন</th><td>{{ $row->application_no }}</td></tr>
        <tr><th>হিসাব</th><td>{{ $row->account_reference }}</td></tr>
        <tr><th>ধরন</th><td>{{ $row->kind }}</td></tr>
        <tr><th>টাকা</th><td>{{ \App\Services\Accounting\Money::format($amount) }}</td></tr>
        <tr><th>বিবরণ</th><td>{{ $row->description }}</td></tr>
    </table>
    <p class="notice">এই রসিদ শুধু পোস্ট হওয়া এন্ট্রি দেখায়। পুরোনো কাগজের রসিদ এখান থেকে বানানো হয় না।</p>
</body>
</html>
