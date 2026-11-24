<?php

return [
    'bkash' => [
        'number' => env('BKASH_FINE_PAYMENT_NUMBER', '01712345678'),
        'type' => env('BKASH_PAYMENT_TYPE', 'Payment'), // 'Payment' (Merchant) or 'Send Money'
        'account_name' => env('BKASH_ACCOUNT_NAME', 'মৌসুমী প্রধান কার্যালয় (MisLoan)'),
    ],
    'hr_contact' => [
        'name' => env('HR_CONTACT_NAME', 'এইচ আর ও প্রশাসন বিভাগ'),
        'phone' => env('HR_CONTACT_PHONE', '01700000000'),
        'whatsapp' => env('HR_CONTACT_WHATSAPP', '8801700000000'),
        'support_hours' => env('HR_SUPPORT_HOURS', 'সকাল ৯:০০ - সন্ধ্যা ৬:০০ (শনিবার - বৃহস্পতিবার)'),
    ],
    'default_self_correction_fee' => (float) env('FINE_DEFAULT_SELF_CORRECTION_FEE', 100),
];
