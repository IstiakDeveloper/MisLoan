# ধাপ ২: Loan Schedule, Daily Collection ও Savings Ledger প্ল্যান

**লক্ষ্য:** ধাপ ১-এ **Day Open/Close** চালু হওয়ার পর, ব্রাঞ্চের প্রতিদিনের আসল কাজ—অর্থাৎ **কিস্তি আদায় (Loan Collection)** ও **সঞ্চয় জমা/উত্তোলন (Savings Transaction)** সিস্টেমে নিয়ে আসা।

*(বর্তমানে MisLoan-এ ঋণ পরিশোধ শুধু `repaid` স্ট্যাটাস পরিবর্তনের মধ্যে সীমাবদ্ধ এবং সঞ্চয়ের কোনো দৈনিক/মাসিক লেজার নেই।)*

---

## ১. এই ধাপে কী কী লাগবে?

### ক. লোন শিডিউল ও কিস্তি ইঞ্জিন (Loan Schedule & Repayment)
- [ ] `loan_schedules` টেবিল: লোন ডিসবার্স হওয়ার সাথে সাথেই কিস্তির শিডিউল তৈরি হবে (`installment_no`, `due_date`, `principal_due`, `interest_due`, `total_due`, `principal_paid`, `interest_paid`, `status`)।
- [ ] **Interest Calculation Method:** প্রোডাক্ট অনুযায়ী **Declining Balance** ও **Flat Rate** সাপোর্ট এবং `BCMath` / পূর্ণসংখ্যা পয়সা ব্যবহার করে নির্ভুল হিসাব।
- [ ] **Holiday Adjustment:** `holidays` টেবিল (ধাপ ১) দেখে কিস্তির তারিখ ছুটির দিনে পড়লে অটোমেটিক পরের কর্মদিবসে শিফট করা।
- [ ] `loan_transactions` টেবিল: প্রতিটি কিস্তি আদায়, অগ্রিম (Advance), আংশিক (Partial), রিবেট (Rebate) বা রাইট-অফের আলাদা লেজার রেকর্ড (অবশ্যই Open Business Date-এ)।
- [ ] **Daily Collection Sheet (DCS):** সমিতি ও ফিল্ড অফিসার (CSO) অনুযায়ী প্রতিদিনের কালেকশন শিট (প্রিন্ট ও এক ক্লিকে বাল্ক কালেকশন এন্ট্রি)।

### খ. সঞ্চয় লেজার (Savings Ledger & Profit)
- [ ] `savings_transactions` টেবিল: General Savings, DPS, FDR-এর প্রতিদিনের জমা (Deposit), উত্তোলন (Withdrawal), এবং মুনাফা (Profit/Interest) এন্ট্রি।
- [ ] **Auto Profit Calculation:** মাসের বা বছরের শেষে সক্রিয় সঞ্চয় অ্যাকাউন্টে নিয়ম অনুযায়ী মুনাফা হিসাব ও পোস্টিং।

---

## ২. কার কী কাজ? (Head Office vs Branch User)

| কাজ | Head Office | Branch User |
| :--- | :--- | :--- |
| **প্রোডাক্ট ও রেট সেটআপ** | ইন্টারেস্ট রেট, ক্যালকুলেশন মেথড (Flat/Declining), গ্রেস পিরিয়ড, সেভিংস প্রফিট রেট নির্ধারণ। | শুধুমাত্র প্রোডাক্ট সিলেক্ট করে লোন/সঞ্চয় খোলা। |
| **লোন ডিসবার্স ও শিডিউল** | অনুমোদন ও লিমিট কন্ট্রোল। | Open Business Date-এ লোন ডিসবার্স করা (সাথে সাথে শিডিউল তৈরি হবে)। |
| **দৈনিক কালেকশন (DCS)** | ব্রাঞ্চ-ওয়াইজ কালেকশন ও ওভারডিউ মনিটরিং। | সমিতি অনুযায়ী Daily Collection Sheet দেখে কিস্তি ও সঞ্চয় জমা এন্ট্রি করা। |
| **কারেকশন / রিভার্সাল** | অনুমোদিত দিনের বাইরে ট্রানজেকশন এডিট/রিভার্সাল অনুমোদন। | শুধুমাত্র বর্তমান Open Day-তে ভুল এন্ট্রি সংশোধন বা বাতিল করা। |

---

## ৩. ইমপ্লিমেন্টেশন চেকলিস্ট
- [ ] `LoanScheduleGeneratorService` (Flat & Declining + Holiday skip)
- [ ] `LoanCollectionService` (Principal vs Interest split, Advance, Overdue, Rebate)
- [ ] Daily Collection Sheet (DCS) UI & Bulk Entry
- [ ] `SavingsTransaction` মডেল, সার্ভিস ও Passbook View
- [ ] `Day Close` (ধাপ ১)-এর সাথে কালেকশন সামারি যুক্ত করা
