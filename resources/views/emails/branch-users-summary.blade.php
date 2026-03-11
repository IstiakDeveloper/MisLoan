<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Branch User Summary - {{ $branch->name }}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f4f6;padding:24px 0;">
    <tr>
        <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:720px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
                <!-- Header -->
                <tr>
                    <td style="padding:20px 24px;background:linear-gradient(135deg,#0f766e,#14b8a6);color:#ffffff;">
                        <h1 style="margin:0;font-size:20px;font-weight:700;">
                            {{ $branch->name }} শাখার ইউজার তালিকা
                        </h1>
                        <p style="margin:4px 0 0;font-size:13px;opacity:0.9;">
                            Branch User, Branch Manager এবং Field Officer সহ সকল ইউজারের তথ্য
                        </p>
                    </td>
                </tr>

                <!-- Login info -->
                <tr>
                    <td style="padding:18px 24px 0;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-radius:10px;border:1px solid #e5e7eb;background-color:#f9fafb;">
                            <tr>
                                <td style="padding:12px 16px;">
                                    <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.06em;">
                                        Login URL
                                    </p>
                                    <p style="margin:0;font-size:13px;color:#4b5563;line-height:1.5;">
                                        সব ইউজারের জন্য লগইন লিঙ্ক:
                                        <a href="{{ $loginUrl }}" style="color:#2563eb;text-decoration:none;font-weight:600;">
                                            {{ $loginUrl }}
                                        </a>
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- User grid -->
                <tr>
                    <td style="padding:18px 24px 10px;">
                        <p style="margin:0 0 10px;font-size:14px;color:#111827;">
                            নিচের টেবিলে সংশ্লিষ্ট শাখার Branch User, Branch Manager এবং Field Officer দের
                            Name, Username এবং Password দেওয়া হলো (কমন পাসওয়ার্ড: <span style="font-weight:600;color:#b91c1c;">12345678</span>).
                        </p>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;font-size:13px;color:#111827;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
                            <thead>
                            <tr style="background-color:#f3f4f6;">
                                <th align="left" style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151;">Name</th>
                                <th align="left" style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151;">Role</th>
                                <th align="left" style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151;">Username</th>
                                <th align="left" style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151;">Password</th>
                            </tr>
                            </thead>
                            <tbody>
                            @foreach($users as $index => $user)
                                @php
                                    $rowBg = $index % 2 === 0 ? '#ffffff' : '#f9fafb';
                                @endphp
                                <tr style="background-color:{{ $rowBg }};">
                                    <td style="padding:8px 12px;border-top:1px solid #e5e7eb;">
                                        {{ $user->name }}
                                    </td>
                                    <td style="padding:8px 12px;border-top:1px solid #e5e7eb;color:#0369a1;font-weight:600;">
                                        {{ $user->role->display_name ?? 'N/A' }}
                                    </td>
                                    <td style="padding:8px 12px;border-top:1px solid #e5e7eb;">
                                        <span style="display:inline-block;padding:4px 8px;border-radius:999px;border:1px solid #e5e7eb;background-color:#f9fafb;font-family:ui-monospace,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:12px;">
                                            {{ $user->username ?? '-' }}
                                        </span>
                                    </td>
                                    <td style="padding:8px 12px;border-top:1px solid #e5e7eb;">
                                        <span style="display:inline-block;padding:4px 8px;border-radius:999px;border:1px solid #fecaca;background-color:#fef2f2;font-family:ui-monospace,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:12px;font-weight:600;color:#b91c1c;">
                                            12345678
                                        </span>
                                    </td>
                                </tr>
                            @endforeach
                            </tbody>
                        </table>
                    </td>
                </tr>

                <!-- Footer -->
                <tr>
                    <td style="padding:14px 24px;border-top:1px solid #e5e7eb;background-color:#f9fafb;text-align:center;">
                        <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;">
                            এই ইমেইল থেকে সরাসরি টেক্সট কপি করা যাবে (Copy বোতামের মত ব্যবহারের জন্য)।
                        </p>
                        <p style="margin:0;font-size:11px;color:#9ca3af;">
                            This is an automated message from MISLoan. Please do not reply to this email.
                        </p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>

