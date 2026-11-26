# ধাপ ৫: অটোমেশন ও কিস্তি (Installment & DCS) পূর্ণাঙ্গ পরিকল্পনা

**লক্ষ্য:** লোন/সঞ্চয় অ্যাপ্রুভাল থেকে শুরু করে দৈনিক কিস্তি আদায় (DCS), ছুটির দিনের কিস্তি সমন্বয়, রিবেট, মাসিক মুনাফা ও রাতের অটো-অডিট—সবকিছুকে **ম্যানুয়াল ডাবল-এন্ট্রি ছাড়াই স্বয়ংক্রিয় (Automated)** করা।

---

## ১. লোন ও সঞ্চয় অ্যাপ্রুভাল → অটো লেজার ইন্টিগ্রেশন (Zero Re-entry)
বর্তমানে `LoanApplication` ডিসবার্স ও `LoanLedger` আলাদা মডিউল হিসেবে আছে। অটোমেশনের প্রথম কাজ হবে এই দুটিকে যুক্ত করা:

- [x] **Auto-Disbursement Hook:** `Member\LoanApplicationController::disburse()`-এ লোন ডিসবার্স হওয়ার সাথে সাথেই স্বয়ংক্রিয়ভাবে `LoanLedgerService::createAndDisburse()` কল হবে:
  - প্রোডাক্ট অনুযায়ী `LoanAccount` তৈরি হবে
  - `LoanScheduleService` দিয়ে পুরো কিস্তির শিডিউল (`loan_installments`) তৈরি হবে
  - `JournalService` দিয়ে অটোমেটিক GL-এ ডিসবার্সমেন্ট জার্নাল (`Dr Loan Portfolio / Cr Cash or Bank`) পড়বে
- [x] **Auto-Savings Hook:** `SavingsApplicationController::activate()`-এ সঞ্চয় আবেদন অ্যাক্টিভেট হলেই অটোমেটিক `SavingsLedgerService::openAccount()` তৈরি হবে।

---

## ২. কিস্তি (Installment) ও Daily Collection Sheet (DCS) অটোমেশন

### ক. সমিতি-ভিত্তিক অটো কালেকশন শিট (Samity-wise DCS)
- [x] **Auto Due List:** শাখার বর্তমান `Open Business Date`-এ কোনো সমিতি সিলেক্ট করলে সিস্টেম স্বয়ংক্রিয়ভাবে ওই সমিতির সব সক্রিয় সদস্যের:
  - আজকের নির্ধারিত কিস্তি (`due_date <= business_date` এবং `pending`/`partial`)
  - পূর্বের বকেয়া (Overdue) যদি থাকে
  - নির্ধারিত সঞ্চয় জমা
  একসাথে টেবিলে দেখাবে ও প্রিন্টের জন্য **DCS Print Sheet** তৈরি করবে।
- [x] **One-Click Bulk Collection:** অফিসার/ক্যাশিয়ার শুধু যে সদস্য কিস্তি দেননি তার ঘর পরিবর্তন করে **১ ক্লিকে পুরো সমিতির কিস্তি ও সঞ্চয় একসাথে পোস্ট** করতে পারবেন (সব সদস্যের `LoanTransaction`, `SavingsTransaction` ও GL জার্নাল অটোমেটিক হবে)।

### খ. কিস্তির স্মার্ট নিয়মাবলী (Smart Installment Rules)
- [x] **Advance & Partial Payment:**
  - কিস্তির চেয়ে কম দিলে স্ট্যাটাস `partial` হবে এবং বাকি টাকা বকেয়া থাকবে।
  - কিস্তির চেয়ে বেশি দিলে অতিরিক্ত টাকা স্বয়ংক্রিয়ভাবে পরবর্তী কিস্তিতে (`installment_no + 1`) অগ্রিম হিসেবে সমন্বয় হবে।
- [x] **Early Settlement & Rebate (অগ্রিম পরিশোধ ও মওকুফ):**
  - কোনো সদস্য মেয়াদের আগেই পুরো লোন বন্ধ করতে চাইলে সিস্টেম অটোমেটিক অবশিষ্ট সার্ভিস চার্জ বা **Rebate** হিসাব করে `Dr Loan Rebate Expense` জার্নাল পোস্ট করবে এবং লোনকে `repaid` করবে।
- [x] **Holiday Auto-Reschedule:**
  - Head Office থেকে নতুন কোনো ছুটি (`holidays`) যোগ করা হলে, ওই তারিখের সব `pending` কিস্তি স্বয়ংক্রিয়ভাবে পরের কর্মদিবসে শিফট হয়ে যাবে।

---

## ৩. শিডিউলড অটোমেশন (Cron / Laravel Scheduler)
সিস্টেম যেন মানুষের অপেক্ষা না করে নিজেই নিয়মিত কাজগুলো করে:

- [x] **রাত্রীকালীন লেজার অডিট (`finance:check-ledgers`):** প্রতিদিন রাত ১২টায় (23:45) স্বয়ংক্রিয়ভাবে চলবে।
- [x] **Overdue ও Reminder অটোমেশন (`finance:flag-overdue`):** প্রতিদিন সকালে বকেয়া কিস্তি স্ক্যান করে ব্রাঞ্চ ম্যানেজারকে অটোমেটিক নোটিফিকেশন পাঠাবে।
- [x] **Month-End Auto-Batch:** ব্রাঞ্চ যখন `Month-End Auto Batch` চালাবে, তখন সিস্টেম স্বয়ংক্রিয়ভাবে:
  1. শাখার সব সক্রিয় `SavingsAccount`-এ মাসিক মুনাফা (`postMonthlyProfit`) পোস্ট করবে।
  2. প্রকৃত Overdue Aging অনুযায়ী `LLP Voucher` তৈরি করে জমা দেবে।

---

## ৪. মেম্বার পাসবুক, রিসিট ও পুরোনো ডাটা মাইগ্রেশন
- [x] **Member Passbook & Cash Receipt Print:** প্রতিটি কিস্তি ও সঞ্চয় লেনদেনের জন্য প্রিন্টেবল ক্যাশ রিসিট ও সদস্যের সম্পূর্ণ লোন পাসবুক।
- [x] **Legacy Opening Balance Importer (Excel):** পুরোনো সিস্টেম থেকে ব্রাঞ্চের চলমান লোনের আসল স্থিতি, অবশিষ্ট কিস্তি ও সঞ্চয়ের স্থিতি Excel/CSV আপলোডের মাধ্যমে ইমপোর্ট করার টুল।

---

## ৫. রেকমেন্ডেড কাজের ক্রম (Next Execution Order)
1. **প্রথমে:** Auto-Disbursement & Auto-Savings Hook + **Samity-wise Bulk Daily Collection Sheet (DCS)**।
2. **দ্বিতীয়:** Holiday Auto-Reschedule + Early Settlement Rebate + Passbook/Receipt Print।
3. **তৃতীয়:** Laravel Scheduler (`finance:check-ledgers`, Overdue Alert, Month-End Auto Profit + LLP Voucher) ও Legacy Excel Importer।
