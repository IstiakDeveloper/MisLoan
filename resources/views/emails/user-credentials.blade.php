<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>MISLoan Login Credentials</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f4f6;padding:24px 0;">
    <tr>
        <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
                <!-- Header -->
                <tr>
                    <td style="padding:20px 24px;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#ffffff;">
                        <h1 style="margin:0;font-size:20px;font-weight:700;">MISLoan Login Credentials</h1>
                        <p style="margin:4px 0 0;font-size:13px;opacity:0.9;">
                            আপনার MISLoan একাউন্টের লগইন তথ্য নিচে দেওয়া হলো
                        </p>
                    </td>
                </tr>

                <!-- Body -->
                <tr>
                    <td style="padding:24px;">
                        <p style="margin:0 0 12px;font-size:14px;color:#111827;">
                            Dear {{ $user->name }},
                        </p>

                        <p style="margin:0 0 16px;font-size:14px;color:#4b5563;line-height:1.6;">
                            Your MISLoan account has been created/updated. Please use the following login details to access the system.
                        </p>

                        <!-- Credentials card -->
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;border-radius:10px;border:1px solid #e5e7eb;background-color:#f9fafb;">
                            <tr>
                                <td style="padding:16px 18px;">
                                    <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.05em;">
                                        Login Details
                                    </p>
                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size:14px;color:#111827;">
                                        <tr>
                                            <td style="padding:4px 0;width:120px;color:#6b7280;">Login URL</td>
                                            <td style="padding:4px 0;">
                                                <a href="{{ url('/login') }}" style="color:#2563eb;text-decoration:none;">
                                                    {{ url('/login') }}
                                                </a>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding:4px 0;width:120px;color:#6b7280;">Username</td>
                                            <td style="padding:4px 0;font-weight:500;">
                                                {{ $user->username ?? $user->email }}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding:4px 0;width:120px;color:#6b7280;">Email</td>
                                            <td style="padding:4px 0;">
                                                {{ $user->email }}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding:4px 0;width:120px;color:#6b7280;">Password</td>
                                            <td style="padding:4px 0;font-weight:600;color:#b91c1c;">
                                                {{ $password }}
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>

                        <p style="margin:0 0 12px;font-size:13px;color:#b91c1c;line-height:1.6;">
                            For your security, please log in and change your password immediately after first login.
                        </p>

                        <p style="margin:0 0 0;font-size:13px;color:#6b7280;line-height:1.6;">
                            If you did not expect this email, please contact your MIS/IT administrator.
                        </p>

                        <p style="margin:20px 0 12px;font-size:13px;color:#4b5563;">
                            Thanks,<br>
                            <span style="font-weight:600;">MISLoan System</span>
                        </p>

                        <!-- Contact / Support -->
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:8px;border-radius:10px;border:1px solid #e5e7eb;background-color:#fefce8;">
                            <tr>
                                <td style="padding:12px 16px;">
                                    <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#854d0e;text-transform:uppercase;letter-spacing:0.06em;">
                                        For Any Support / সমস্যার জন্য যোগাযোগ
                                    </p>
                                    <p style="margin:0;font-size:13px;color:#78350f;line-height:1.5;">
                                        <strong>Istiak Hossain</strong><br>
                                        Assistant Manager (IT)<br>
                                        WhatsApp: <a href="https://wa.me/8801717893432" style="color:#2563eb;text-decoration:none;">01717893432</a>
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- Footer -->
                <tr>
                    <td style="padding:14px 24px;border-top:1px solid #e5e7eb;background-color:#f9fafb;text-align:center;">
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

