<?php

namespace App\Services\Help;

use App\Models\HelpGuide;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Collection;

class HelpGuideCatalog
{
    public const ALL_ROLES = [
        Role::FIELD_OFFICER,
        Role::BRANCH_USER,
        Role::BRANCH_MANAGER,
        Role::CSO,
        Role::AREA_MANAGER,
        Role::ZONE_MANAGER,
        Role::ADMF,
        Role::DMF,
        Role::ED,
        Role::HEAD_OFFICE,
        Role::SUPER_ADMIN,
    ];

    public function ensureSeeded(): void
    {
        foreach ($this->defaultGuides() as $item) {
            HelpGuide::query()->firstOrCreate(
                ['slug' => $item['slug']],
                $item
            );
        }
    }

    /** @return Collection<int, HelpGuide> */
    public function forUser(User $user): Collection
    {
        $this->ensureSeeded();

        $isAdmin = (bool) ($user->has_all_access || $user->isSuperAdmin() || $user->isHeadOffice());
        $roleName = (string) ($user->role?->name ?? '');

        $guides = HelpGuide::query()
            ->when(! $isAdmin, fn ($q) => $q->where('is_published', true))
            ->orderBy('part_number')
            ->get();

        if ($isAdmin) {
            return $guides;
        }

        return $guides->filter(function (HelpGuide $guide) use ($roleName) {
            $roles = is_array($guide->roles) ? $guide->roles : [];

            return in_array($roleName, $roles, true);
        })->values();
    }

    /** @return array<int, array<string, mixed>> */
    public function defaultGuides(): array
    {
        return [
            [
                'slug' => 'part-01-login-profile-setup',
                'part_number' => 1,
                'title_bn' => 'পার্ট ১: লগইন, প্রোফাইল ও পাসওয়ার্ড সেটআপ',
                'summary_bn' => 'সফটওয়্যারে প্রথমবার ঢুকে কীভাবে নিজের প্রোফাইল, স্বাক্ষর (Signature), PIN ও পাসওয়ার্ড ঠিক করবেন তার সহজ নিয়ম।',
                'roles' => self::ALL_ROLES,
                'video_duration' => '03:00',
                'steps_bn' => [
                    [
                        'step_title' => 'সফটওয়্যারে লগইন করুন',
                        'instruction' => 'আপনার অফিসিয়াল ইমেইল বা ইউজারনেম এবং পাসওয়ার্ড দিয়ে লগইন করুন। যদি পাসওয়ার্ড ভুলে যান, লগইন পেজের Forgot Password ব্যবহার করুন।',
                        'route_href' => '/dashboard',
                        'route_label' => 'ড্যাশবোর্ডে যান',
                    ],
                    [
                        'step_title' => 'প্রোফাইল, মোবাইল ও স্বাক্ষর আপডেট করুন',
                        'instruction' => 'ডান পাশের ওপরের কোনায় নিজের নামের ওপর ক্লিক করে Profile-এ যান। এখানে আপনার মোবাইল নম্বর, ৪-৬ ডিজিটের PIN এবং পরিষ্কার স্বাক্ষরের ছবি আপলোড করে সংরক্ষণ করুন।',
                        'route_href' => '/profile',
                        'route_label' => 'প্রোফাইল পেজ খুলুন',
                    ],
                    [
                        'step_title' => 'নিরাপত্তার জন্য পাসওয়ার্ড ও 2FA চালু রাখুন',
                        'instruction' => 'প্রথমবার লগইনের পর আপনার পছন্দমতো শক্তিশালী পাসওয়ার্ড সেট করে নিন এবং কারো সাথে নিজের PIN বা পাসওয়ার্ড শেয়ার করবেন না।',
                        'route_href' => '/profile',
                        'route_label' => 'পাসওয়ার্ড পরিবর্তন করুন',
                    ],
                ],
                'tips_bn' => [
                    'স্বাক্ষর ও PIN ছাড়া আপনি কোনো ফরম সাবমিট বা অনুমোদন করতে পারবেন না।',
                    'নিজের অ্যাকাউন্ট দিয়ে লগইন করে অন্য কাউকে কাজ করতে দেবেন না, কারণ প্রতিটি কাজের রেকর্ড আপনার নামেই জমা হয়।',
                ],
                'is_published' => true,
            ],
            [
                'slug' => 'part-02-branch-day-open',
                'part_number' => 2,
                'title_bn' => 'পার্ট ২: প্রতিদিনের কাজ শুরু করা (Day Open / Start Work Process)',
                'summary_bn' => 'সকালে অফিসে এসে শাখার প্রতিদিনের লেনদেন শুরু করার জন্য কীভাবে কর্মদিবস (Business Date) খুলবেন।',
                'roles' => [Role::BRANCH_USER, Role::BRANCH_MANAGER, Role::HEAD_OFFICE, Role::SUPER_ADMIN],
                'video_duration' => '02:30',
                'steps_bn' => [
                    [
                        'step_title' => 'টপবারে আজকের কর্মদিবস দেখুন',
                        'instruction' => 'লগইন করার পর ওপরে ডানদিকে সবুজ বা হলুদ ব্যাজ দেখতে পাবেন। সেখানে "Day Closed" লেখা থাকলে বুঝতে হবে আজকের দিন এখনো খোলা হয়নি।',
                        'route_href' => '/branch/process',
                        'route_label' => 'Work Process পেজে যান',
                    ],
                    [
                        'step_title' => 'Start Work Process দিয়ে দিন খুলুন',
                        'instruction' => 'বাম পাশের মেনু থেকে "Process & Accounting → Day & Month Process → Work Process"-এ যান। সিস্টেম অটোমেটিক পরবর্তী কর্মদিবস দেখাবে। তারিখ যাচাই করে "Start Work Process" বাটনে ক্লিক করুন।',
                        'route_href' => '/branch/process',
                        'route_label' => 'Day Open করুন',
                    ],
                    [
                        'step_title' => 'কেন দিন ওপেন না হলে সতর্ক করে?',
                        'instruction' => 'আগের খোলা দিন যদি Close না করা থাকে, তাহলে নতুন দিন খোলা যাবে না। তাই প্রতিদিন বিকেলে কাজ শেষে অবশ্যই আগের দিন Close করতে হবে।',
                        'route_href' => '/branch/process',
                        'route_label' => 'কর্মদিবস তালিকা দেখুন',
                    ],
                ],
                'tips_bn' => [
                    'কোনো শাখা প্রথমবার সফটওয়্যার শুরু করলে হেড অফিস থেকে আগে "Manage Day Initial" সেট করা থাকতে হবে।',
                    'সরকারি বা নির্ধারিত ছুটির দিনে ভুল করে দিন খোলা যাবে না (বিশেষ জরুরি কাজ না থাকলে)।',
                ],
                'is_published' => true,
            ],
            [
                'slug' => 'part-03-cash-desk',
                'part_number' => 3,
                'title_bn' => 'পার্ট ৩: ক্যাশ ডেস্ক ও ব্যাংক রিকনসিলিয়েশন',
                'summary_bn' => 'সকালে হাতে থাকা নগদ দিয়ে ক্যাশ সেশন খোলা এবং বিকেলে প্রকৃত ক্যাশ গুনে অনুমোদন করার নিয়ম।',
                'roles' => [Role::BRANCH_USER, Role::BRANCH_MANAGER, Role::HEAD_OFFICE, Role::SUPER_ADMIN],
                'video_duration' => '04:00',
                'steps_bn' => [
                    [
                        'step_title' => 'সকালে ক্যাশ সেশন খুলুন',
                        'instruction' => '"Cash Desk & Bank Recon" পেজে গিয়ে আপনার ড্রয়ার/ভল্টে থাকা আগের দিনের ক্লোজিং ক্যাশ (Opening Cash) লিখে "Open Cash Session" বাটনে ক্লিক করুন।',
                        'route_href' => '/cash-desk',
                        'route_label' => 'Cash Desk খুলুন',
                    ],
                    [
                        'step_title' => 'বিকেলে হাতে থাকা নগদ গুনে সাবমিট করুন',
                        'instruction' => 'সারাদিনের কিস্তি আদায়, সঞ্চয় ও ভাউচার শেষে সিস্টেম আপনাকে "Expected Closing" দেখাবে। আপনার হাতে থাকা আসল টাকা গুনে "Actual Cash Count"-এ লিখে "Submit Cash Session" করুন।',
                        'route_href' => '/cash-desk',
                        'route_label' => 'ক্যাশ সাবমিট করুন',
                    ],
                    [
                        'step_title' => 'দ্বিতীয় কর্মকর্তার অনুমোদন (Maker-Checker)',
                        'instruction' => 'যিনি ক্যাশ সেশন খুলেছেন তিনি নিজে অনুমোদন করতে পারবেন না। শাখা ব্যবস্থাপক বা অন্য দায়িত্বপ্রাপ্ত কর্মকর্তা Cash Desk পেজে গিয়ে "Approve" বাটনে ক্লিক করবেন।',
                        'route_href' => '/cash-desk',
                        'route_label' => 'ক্যাশ অনুমোদন করুন',
                    ],
                ],
                'tips_bn' => [
                    'Expected ও Actual ক্যাশ না মিললে (Variance থাকলে) সেশন অনুমোদন হবে না—আগে ভুল এন্ট্রি বা ভাউচার খুঁজে ঠিক করুন।',
                    'ক্যাশ সেশন Approve না করা পর্যন্ত আজকের Day Close করা যাবে না।',
                ],
                'is_published' => true,
            ],
            [
                'slug' => 'part-04-member-admission-cycle',
                'part_number' => 4,
                'title_bn' => 'পার্ট ৪: নতুন সদস্য ভর্তি ও সাইকেল হাব (Member & Cycle Hub)',
                'summary_bn' => 'নতুন সদস্য ভর্তি করা, NID ও ছবি আপলোড করা এবং পুরোনো সদস্যের পরবর্তী ঋণ সাইকেল (দফা) চালু করার নিয়ম।',
                'roles' => [Role::FIELD_OFFICER, Role::BRANCH_USER, Role::BRANCH_MANAGER, Role::CSO, Role::AREA_MANAGER, Role::ZONE_MANAGER, Role::HEAD_OFFICE, Role::SUPER_ADMIN],
                'video_duration' => '05:00',
                'steps_bn' => [
                    [
                        'step_title' => 'নতুন সদস্য ভর্তি ফরম পূরণ করুন',
                        'instruction' => '"Operations → Member & Loan → Member Admissions"-এ গিয়ে "নতুন সদস্য ভর্তি" বাটনে ক্লিক করুন। সদস্যের নাম, NID/জন্মনিবন্ধন, সমিতি, পরিবার ও সম্পদের তথ্য দিয়ে সেভ বা সাবমিট করুন।',
                        'route_href' => '/member-admissions',
                        'route_label' => 'Member Admissions-এ যান',
                    ],
                    [
                        'step_title' => 'পুরোনো সদস্যের তথ্য বা নতুন দফার জন্য Cycle Hub',
                        'instruction' => 'আগে থেকেই ভর্তি থাকা কোনো সদস্য নতুন করে ঋণ নিতে চাইলে আবার নতুন ভর্তি না করে "Cycle Hub"-এ গিয়ে সদস্যকে সার্চ করুন এবং "Start Next Cycle" ব্যবহার করুন।',
                        'route_href' => '/member/cycle-hub',
                        'route_label' => 'Cycle Hub খুলুন',
                    ],
                ],
                'tips_bn' => [
                    'একই NID নম্বর দিয়ে একই শাখায় দুবার সদস্য ভর্তি করা যাবে না।',
                    'সদস্য ভর্তি হেড অফিস বা অনুমোদনকারীর কাছ থেকে Approved না হওয়া পর্যন্ত তার নামে নতুন ঋণ হেড অফিসে পাঠানো যাবে না।',
                ],
                'is_published' => true,
            ],
            [
                'slug' => 'part-05-loan-application-disbursement',
                'part_number' => 5,
                'title_bn' => 'পার্ট ৫: ঋণ আবেদন, ফরম পূরণ ও অটো-বিতরণ (Loan Disbursement)',
                'summary_bn' => 'সদস্যের ঋণের ফরম পূরণ, অনুমোদন শেষে বিতরণ করা এবং সাথে সাথে অটোমেটিক কিস্তি শিডিউল তৈরি হওয়ার প্রক্রিয়া।',
                'roles' => [Role::FIELD_OFFICER, Role::BRANCH_USER, Role::BRANCH_MANAGER, Role::CSO, Role::AREA_MANAGER, Role::ZONE_MANAGER, Role::ADMF, Role::DMF, Role::ED, Role::HEAD_OFFICE, Role::SUPER_ADMIN],
                'video_duration' => '05:30',
                'steps_bn' => [
                    [
                        'step_title' => 'ঋণ আবেদন ও প্রয়োজনীয় ফরম পূরণ',
                        'instruction' => '"Loan Applications"-এ গিয়ে সদস্য ও ঋণ প্রোডাক্ট বেছে নিন। ঋণের পরিমাণ অনুযায়ী চুক্তিপত্র, জামিনদার, মৃত্যুঝুঁকি তহবিল ও মাঠ জরিপ ফরম পূরণ করে সাবমিট করুন।',
                        'route_href' => '/member/loan-applications',
                        'route_label' => 'Loan Applications-এ যান',
                    ],
                    [
                        'step_title' => 'অনুমোদন শেষে ঋণ বিতরণ (Disbursement)',
                        'instruction' => 'আবেদনটি "বিতরণের অপেক্ষায় (Pending Disbursement)" এলে শাখা ইউজার বিতরণের তারিখ (আজকের Open Business Date) ও মাধ্যম (Cash/Bank) দিয়ে "Disburse" করবেন।',
                        'route_href' => '/member/loan-applications',
                        'route_label' => 'বিতরণযোগ্য ঋণ দেখুন',
                    ],
                    [
                        'step_title' => 'অটোমেটিক কিস্তি শিডিউল ও অ্যাকাউন্টিং',
                        'instruction' => 'ঋণ বিতরণ করার সাথে সাথেই সিস্টেম নিজে থেকেই কিস্তির তারিখ (ছুটির দিন বাদ দিয়ে) তৈরি করে ফেলবে এবং অ্যাকাউন্টিংয়ে লোন জার্নাল পোস্ট করে দেবে—আলাদা করে কোথাও এন্ট্রি দিতে হবে না।',
                        'route_href' => '/loan-ledger',
                        'route_label' => 'Loan Ledger দেখুন',
                    ],
                ],
                'tips_bn' => [
                    'হেড অফিসের Cutoff সময় (সাধারণত বিকেল ৫টা) পার হয়ে গেলে ঐ দিন নতুন ফাইল হেড অফিসে পাঠানো যাবে না।',
                    'বিতরণের তারিখ অবশ্যই বর্তমান Open Business Date হতে হবে।',
                ],
                'is_published' => true,
            ],
            [
                'slug' => 'part-06-loan-collection-dcs-passbook',
                'part_number' => 6,
                'title_bn' => 'পার্ট ৬: দৈনিক কিস্তি আদায় (DCS), পাসবুক, রিসিট ও রিবেট',
                'summary_bn' => 'সমিতি-ভিত্তিক Daily Collection Sheet দিয়ে ১ ক্লিকে সবার কিস্তি আদায়, পাসবুক প্রিন্ট, ভুল রিসিট সংশোধন ও রিবেট দেওয়ার নিয়ম।',
                'roles' => [Role::FIELD_OFFICER, Role::BRANCH_USER, Role::BRANCH_MANAGER, Role::HEAD_OFFICE, Role::SUPER_ADMIN],
                'video_duration' => '05:00',
                'steps_bn' => [
                    [
                        'step_title' => 'সমিতি-ভিত্তিক Daily Collection Sheet (DCS)',
                        'instruction' => '"Loan Ledger & Collection"-এ গিয়ে প্রথমে "Daily Collection Sheet (DCS)" ট্যাবে আপনার সমিতি নির্বাচন করুন। আজকে যাদের কিস্তি আছে সবার নাম ও কিস্তির টাকা অটোমেটিক চলে আসবে। প্রয়োজনে "Print DCS" দিয়ে প্রিন্ট করে মাঠে নিয়ে যান।',
                        'route_href' => '/loan-ledger',
                        'route_label' => 'DCS খুলুন',
                    ],
                    [
                        'step_title' => '১ ক্লিকে পুরো সমিতির কিস্তি ও সঞ্চয় জমা',
                        'instruction' => 'মাঠ থেকে ফিরে কেউ কম বা বেশি টাকা দিলে শুধু তার ঘরের টাকা পরিবর্তন করুন এবং সবার সঞ্চয়ের ঘরে টাকা বসিয়ে "Post Bulk Collection" বাটনে ক্লিক করুন। আসল ও সার্ভিস চার্জ অটোমেটিক ভাগ হয়ে জার্নালে জমা হবে।',
                        'route_href' => '/loan-ledger',
                        'route_label' => 'বাল্ক কালেকশন করুন',
                    ],
                    [
                        'step_title' => 'পাসবুক, ক্যাশ রিসিট ও অগ্রিম পরিশোধ (Rebate)',
                        'instruction' => 'যেকোনো ঋণের পাশে "Passbook" ক্লিক করে সম্পূর্ণ কিস্তি শিডিউল ও লেজার প্রিন্ট করতে পারবেন। কেউ মেয়াদের আগেই সব টাকা পরিশোধ করতে চাইলে "Rebate" লিখে "Settle" বাটনে ক্লিক করলে লোনটি বন্ধ হয়ে যাবে।',
                        'route_href' => '/loan-ledger',
                        'route_label' => 'পাসবুক ও সেটেলমেন্ট',
                    ],
                    [
                        'step_title' => 'ভুল কিস্তি এন্ট্রি হলে সংশোধন (Request Reversal)',
                        'instruction' => 'ভুল টাকা উঠে গেলে Collection Register থেকে "Request Reversal" দিন। শাখা ব্যবস্থাপক "Receipt Corrections" ট্যাব থেকে তা Approve করলে টাকাটি আগের অবস্থায় ফিরে যাবে।',
                        'route_href' => '/loan-ledger',
                        'route_label' => 'Correction Queue দেখুন',
                    ],
                ],
                'tips_bn' => [
                    'কিস্তির চেয়ে বেশি টাকা দিলে অতিরিক্ত টাকা অটোমেটিক পরের কিস্তিতে অগ্রিম (Advance) হিসেবে জমা হয়।',
                    'সমস্ত বকেয়া শূন্য হওয়ার সাথে সাথেই লোনটি অটোমেটিক Repaid হয়ে যায় এবং সদস্য নতুন সাইকেলের জন্য উপযুক্ত হন।',
                ],
                'is_published' => true,
            ],
            [
                'slug' => 'part-07-savings-ledger-profit',
                'part_number' => 7,
                'title_bn' => 'পার্ট ৭: সঞ্চয় হিসাব, জমা, উত্তোলন ও মুনাফা',
                'summary_bn' => 'সদস্যের সঞ্চয় হিসাব খোলা, দৈনিক/মাসিক সঞ্চয় জমা ও উত্তোলন এবং মাসের শেষে মুনাফা (Profit) হিসাব করার নিয়ম।',
                'roles' => [Role::FIELD_OFFICER, Role::BRANCH_USER, Role::BRANCH_MANAGER, Role::HEAD_OFFICE, Role::SUPER_ADMIN],
                'video_duration' => '03:30',
                'steps_bn' => [
                    [
                        'step_title' => 'নতুন সঞ্চয় হিসাব চালু করা',
                        'instruction' => '"Savings Applications" থেকে সঞ্চয় অনুমোদন ও Activate করলে অটোমেটিক সঞ্চয় অ্যাকাউন্ট তৈরি হয়ে যায়। প্রয়োজনে "Savings Ledger & Profit" থেকেও সরাসরি নতুন সঞ্চয় হিসাব খোলা যায়।',
                        'route_href' => '/savings-ledger',
                        'route_label' => 'Savings Ledger খুলুন',
                    ],
                    [
                        'step_title' => 'জমা ও উত্তোলন (Deposit & Withdraw)',
                        'instruction' => 'অ্যাকাউন্টের পাশে টাকার পরিমাণ লিখে "Deposit" বা "Withdraw" বাটনে ক্লিক করুন। যদি কোনো সঞ্চয় ঋণের জামানত হিসেবে লিন/হোল্ড (Held) করা থাকে, তবে সেই অংশ বাদে বাকি টাকা উত্তোলন করা যাবে।',
                        'route_href' => '/savings-ledger',
                        'route_label' => 'জমা/উত্তোলন করুন',
                    ],
                ],
                'tips_bn' => [
                    'মাসের শেষে সব সঞ্চয় অ্যাকাউন্টে একসাথে মুনাফা দিতে আলাদা আলাদা ক্লিক না করে Work Process-এর "Month-End Auto Batch" ব্যবহার করুন।',
                ],
                'is_published' => true,
            ],
            [
                'slug' => 'part-08-accounting-vouchers',
                'part_number' => 8,
                'title_bn' => 'পার্ট ৮: ভাউচার এন্ট্রি ও অনুমোদন (Accounting & Maker-Checker)',
                'summary_bn' => 'অফিস ভাড়া, স্টেশনারি, ব্যাংক জমা/উত্তোলন বা অন্যান্য লেনদেনের Payment, Receipt, Journal ও Contra ভাউচার তৈরি ও অনুমোদনের নিয়ম।',
                'roles' => [Role::BRANCH_USER, Role::BRANCH_MANAGER, Role::HEAD_OFFICE, Role::SUPER_ADMIN],
                'video_duration' => '04:00',
                'steps_bn' => [
                    [
                        'step_title' => 'নতুন ভাউচার সাবমিট করুন (Maker)',
                        'instruction' => '"Accounting & Vouchers" পেজে গিয়ে ভাউচারের ধরন (Payment / Receipt / Journal / Contra), তারিখ ও বিবরণ লিখুন। এরপর ড্রপডাউন থেকে সার্চ করে Debit ও Credit অ্যাকাউন্টে সমান টাকা বসিয়ে "Submit Voucher" করুন।',
                        'route_href' => '/accounting',
                        'route_label' => 'ভাউচার পেজে যান',
                    ],
                    [
                        'step_title' => 'দ্বিতীয় কর্মকর্তার মাধ্যমে অনুমোদন (Checker)',
                        'instruction' => 'যিনি ভাউচার তৈরি করেছেন তিনি নিজের ভাউচার Approve করতে পারবেন না। শাখা ব্যবস্থাপক বা অন্য কর্মকর্তা "Voucher Queue" থেকে ভাউচারটি যাচাই করে "Approve" করলে তবেই তা মূল জার্নালে (Journal Register) যুক্ত হবে।',
                        'route_href' => '/accounting',
                        'route_label' => 'Pending ভাউচার দেখুন',
                    ],
                ],
                'tips_bn' => [
                    'কিস্তি আদায়, ঋণ বিতরণ ও সঞ্চয় জমা-উত্তোলনের জন্য হাতে ভাউচার করতে হয় না—এগুলো সিস্টেম নিজেই অটোমেটিক জার্নালে পোস্ট করে।',
                    'দিন শেষে কোনো ভাউচার Pending অবস্থায় থাকলে Day Close করা যাবে না।',
                ],
                'is_published' => true,
            ],
            [
                'slug' => 'part-09-verification-team-approvals',
                'part_number' => 9,
                'title_bn' => 'পার্ট ৯: ভেরিফিকেশন, ইস্যু সমাধান ও টিম-বেজড অনুমোদন',
                'summary_bn' => 'ফরম যাচাই-বাছাই (Verification), ভুল/ইস্যু সংশোধন এবং এরিয়া/জোন/ADMF/DMF/ED পর্যায়ের অনুমোদন প্রক্রিয়া।',
                'roles' => self::ALL_ROLES,
                'video_duration' => '04:30',
                'steps_bn' => [
                    [
                        'step_title' => 'ইস্যু দেখা ও উত্তর দেওয়া (Verification)',
                        'instruction' => 'কোনো সদস্য বা ঋণের আবেদনে হেড অফিস বা CSO ইস্যু দিলে তা "Verification" মেনুতে লাল ব্যাজ আকারে দেখাবে। শাখা ব্যবহারকারী সেখানে গিয়ে প্রয়োজনীয় সংশোধন বা উত্তর (Reply/Resolve) দেবেন।',
                        'route_href' => '/verifications',
                        'route_label' => 'Verification-এ যান',
                    ],
                    [
                        'step_title' => 'টিম-বেজড ও ধাপ-ভিত্তিক অনুমোদন (Approvers)',
                        'instruction' => 'Branch Manager, Area Manager, Zone Manager, ADMF, DMF ও ED-গণ "Pending Approvals" এবং "Team Based Approval" মেনু থেকে তাদের কাছে আসা ফাইলগুলো যাচাই করে Approve, Forward বা Return করবেন।',
                        'route_href' => '/approvals',
                        'route_label' => 'Pending Approvals দেখুন',
                    ],
                ],
                'tips_bn' => [
                    'ভুল তথ্য বা নিয়ম ভঙ্গের কারণে জরিমানা হলে "Corrections & Fines" মেনু থেকে তার বিস্তারিত দেখা যাবে।',
                ],
                'is_published' => true,
            ],
            [
                'slug' => 'part-10-day-close-monthly-reports',
                'part_number' => 10,
                'title_bn' => 'পার্ট ১০: দিন শেষ (Day Close), মাসিক প্রসেস ও আর্থিক রিপোর্ট',
                'summary_bn' => 'বিকেলে কর্মদিবস বন্ধ করা, মাসের শেষে ১ ক্লিকে মুনাফা ও LLP ভাউচার চালানো এবং Trial Balance / Balance Sheet / POMIS রিপোর্ট দেখা।',
                'roles' => [Role::BRANCH_USER, Role::BRANCH_MANAGER, Role::ED, Role::HEAD_OFFICE, Role::SUPER_ADMIN],
                'video_duration' => '04:30',
                'steps_bn' => [
                    [
                        'step_title' => 'দিন শেষ করুন (Complete Work Process)',
                        'instruction' => 'দিনের সব কালেকশন, Pending ভাউচার ও Cash Desk অনুমোদন হয়ে গেলে "Work Process → Complete Work Process" ট্যাবে গিয়ে দিনের সারসংক্ষেপ দেখে Day Close করুন।',
                        'route_href' => '/branch/process',
                        'route_label' => 'Day Close করুন',
                    ],
                    [
                        'step_title' => 'Monthly Process স্ট্যাটাস যাচাই করুন',
                        'instruction' => 'LLP Voucher Process, Month-End Auto Batch ও Monthly Process (Month Close) শুধুমাত্র Head Office থেকে সম্পন্ন করা হয়। ব্রাঞ্চ থেকে Work Process পেজে মাসের বর্তমান স্ট্যাটাস দেখতে পারবেন।',
                        'route_href' => '/branch/process',
                        'route_label' => 'Work Process দেখুন',
                    ],
                    [
                        'step_title' => 'আর্থিক ও POMIS রিপোর্ট দেখুন',
                        'instruction' => '"Financial & POMIS Reports" পেজে গিয়ে তারিখ ও শাখা নির্বাচন করে Trial Balance, Income Statement, Balance Sheet, POMIS সামারি ও PAR Aging রিপোর্ট দেখতে পারবেন।',
                        'route_href' => '/financial-reports',
                        'route_label' => 'রিপোর্ট পেজ খুলুন',
                    ],
                ],
                'tips_bn' => [
                    'একবার Month Close হয়ে গেলে ওই মাসে আর কোনো এন্ট্রি করা যাবে না—জরুরি সংশোধনের জন্য হেড অফিস থেকে Reopen করে নিতে হবে।',
                ],
                'is_published' => true,
            ],
            [
                'slug' => 'part-11-head-office-admin-controls',
                'part_number' => 11,
                'title_bn' => 'পার্ট ১১: হেড অফিস ও সুপার অ্যাডমিন কন্ট্রোল (Periods, COA ও Legacy Import)',
                'summary_bn' => 'অর্থবছর খোলা/বন্ধ/রোলব্যাক, Manage Day Initial, ছুটি যোগ, GL Posting Defaults ও পুরোনো ডাটা ইমপোর্ট করার নিয়ম।',
                'roles' => [Role::HEAD_OFFICE, Role::SUPER_ADMIN],
                'video_duration' => '05:00',
                'steps_bn' => [
                    [
                        'step_title' => 'Pilot শাখা ON/OFF ও শাখার Initial Date সেট করুন',
                        'instruction' => '"Accounting Periods & Pilot Control" পেজের Branch Monitor থেকে যেকোনো শাখার হিসাব-নিকাশ মোড (Pilot ON / Legacy OFF) চালু বা বন্ধ করুন। পাশাপাশি অর্থবছর, ছুটি ও নতুন পাইলট শাখার Manage Day Initial সেট করুন।',
                        'route_href' => '/head-office/accounting-periods',
                        'route_label' => 'Accounting Periods খুলুন',
                    ],
                    [
                        'step_title' => 'Monthly Process, Auto Batch ও LLP পরিচালনা',
                        'instruction' => '"Monthly Process & LLP" ট্যাবে গিয়ে এক ক্লিকে সকল Pilot-ON শাখায় বা নির্দিষ্ট শাখায় Month-End Auto Batch (সঞ্চয় মুনাফা + LLP) ও Monthly Process (Month Close) সম্পন্ন করুন।',
                        'route_href' => '/head-office/accounting-periods',
                        'route_label' => 'Monthly Process দেখুন',
                    ],
                    [
                        'step_title' => 'ভুল করে অর্থবছর বা দিন/মাস বন্ধ হলে Rollback / Reopen',
                        'instruction' => 'শাখা ভুল করে দিন বা মাস Close করলে Branch Monitor থেকে কারণ লিখে Reopen করুন। আর কোনো অর্থবছর ভুল করে বন্ধ হলে শুধুমাত্র Super Admin "Rollback / Reopen" বাটন দিয়ে তা খুলতে পারবেন।',
                        'route_href' => '/head-office/accounting-periods',
                        'route_label' => 'Monitor ও Reopen দেখুন',
                    ],
                    [
                        'step_title' => 'COA সেটআপ, Posting Defaults ও পুরোনো ডাটা ইমপোর্ট',
                        'instruction' => 'শুরুতে "Accounting & Vouchers"-এ গিয়ে "Seed Standard MFI COA" চাপুন এবং "GL Posting Defaults" যাচাই করুন। পুরোনো শাখার চলমান লোন ও সঞ্চয়ের স্থিতি তুলতে "Legacy Balance Import" ব্যবহার করুন।',
                        'route_href' => '/head-office/legacy-import',
                        'route_label' => 'Legacy Import খুলুন',
                    ],
                ],
                'tips_bn' => [
                    'প্রতিটি Reopen ও Rollback কাজের কারণ অডিট লগে (Period Reopen Audit Logs) স্থায়ীভাবে সংরক্ষিত থাকে।',
                ],
                'is_published' => true,
            ],
        ];
    }
}
