# ধাপ ১: Day Open/Close, Manage Day Initial ও Monthly Process প্ল্যান

**লক্ষ্য:** gBanker-এর `Process` মেনুর আদলে সিস্টেমে **Business Date (কর্মদিবস)** ও **Accounting Period (মাস ও অর্থবছর)** নিয়ন্ত্রণ চালু করা, যাতে প্রতিটি ব্রাঞ্চের প্রতিদিনের লেনদেন সঠিক তারিখে হয় এবং বন্ধ হওয়া দিন বা মাসে কেউ যেন ভুলবশত বা ব্যাকডেটে ডাটা এন্ট্রি/পরিবর্তন করতে না পারে।

---

## ১. gBanker-এর Process মেনু ও আমাদের সিস্টেমে তার কাজ

| gBanker মেনু | আমাদের সিস্টেমে কাজ | কে করবে? |
| :--- | :--- | :--- |
| **Manage Day Initial** | কোনো ব্রাঞ্চ প্রথমবার সফটওয়্যার শুরু করলে তার **শুরুর তারিখ (Opening/Initial Date)** সেট করা এবং অর্থবছর (Financial Year) এনরোল করা। | **Head Office** (বা SuperAdmin) |
| **Start Work Process** | ব্রাঞ্চের প্রতিদিনের কাজ শুরু করার জন্য **Day Open** করা (সিস্টেম আজকের বিজনেস ডেট চালু করবে)। | **Branch User** (Branch Manager / Accountant) |
| **Complete Work Process** | দিনের সব কালেকশন, ডিসবার্সমেন্ট ও ভাউচার মিলিয়ে **Day Close** করা (দিনটি লক হয়ে যাবে)। | **Branch User** (Branch Manager / Accountant) |
| **LLP Voucher Process** | মেয়াদোত্তীর্ণ (Overdue/PAR) ঋণের ওপর ভিত্তি করে **Loan Loss Provisioning (LLP)** হিসাব ও ভাউচার তৈরি করা (মাসিক/ত্রৈমাসিক)। | **Branch User** (Process) + **Head Office** (Monitor/Rule) |
| **Monthly Process** | মাসের সব দিন ক্লোজ হওয়ার পর মাসিক সামারি (Opening/Disbursement/Collection/Closing) তৈরি ও **Month Close** করা। | **Branch User** (Close) + **Head Office** (Review/Reopen) |

---

## ২. এই ধাপটি করতে কী কী লাগবে? (Technical & Functional Requirements)

### ক. ডাটাবেজ টেবিল (Database Schema)
- [ ] `financial_years` — অর্থবছর (যেমন: `2026-07-01` থেকে `2027-06-30`), `opened_by`, `closed_at`
- [ ] `holidays` — সরকারি ছুটি ও সাপ্তাহিক ছুটির ক্যালেন্ডার (Global এবং Branch-specific)
- [ ] `branch_financial_years` — কোন ব্রাঞ্চ কোন অর্থবছরে কবে থেকে কাজ শুরু করেছে (`starts_on`)
- [ ] `branch_accounting_periods` — প্রতিটি ব্রাঞ্চের প্রতিটি **Day** ও **Month**-এর রেকর্ড (`kind`: `day`/`month`, `period_date`, `opened_at`, `opened_by`, `closed_at`, `closed_by`, `close_reference`)
- [ ] `branch_month_processes` — Monthly Process চালানোর পর ওই মাসের ব্রাঞ্চ-ভিত্তিক সামারি স্ন্যাপশট (Total Member, Active Loan, Disbursement, Recovery, Savings Balance, Overdue, LLP ইত্যাদি)
- [ ] `period_reopen_logs` — কোনো বন্ধ দিন বা মাস Head Office থেকে রি-ওপেন করলে তার অডিট লগ (কে, কেন, কখন খুলল)

### খ. বিজনেস রুলস ও ভ্যালিডেশন (Business Rules)
- [ ] **Active Business Date Middleware/Guard:** ব্রাঞ্চ ইউজার কোনো লোন ডিসবার্স, কালেকশন, সেভিংস জমা/উত্তোলন বা ভাউচার এন্ট্রি করতে গেলে সিস্টেম চেক করবে ওই ব্রাঞ্চের জন্য আজকের বা বর্তমান কোনো **Day Open** আছে কিনা। Day Open না থাকলে এন্ট্রি ব্লক থাকবে।
- [ ] **Sequential Day Control:** আগের খোলা দিন `Complete Work Process` (Day Close) না করা পর্যন্ত পরের দিনের `Start Work Process` (Day Open) করা যাবে না।
- [ ] **Holiday Skip:** ছুটির দিনে Day Open করতে গেলে সতর্কবার্তা দেবে (বা বিশেষ অনুমতি ছাড়া খুলতে দেবে না)।
- [ ] **Day Close Pre-checks:**
  - ওই দিনে কোনো Unposted/Draft ট্রানজেকশন বা অমীমাংসিত ক্যাশ বাকি থাকলে Day Close করতে দেবে না।
  - (ধাপ ২/৩ আসার পর) Cashbook মিললে তবেই Day Close হবে।
- [ ] **Month Close Pre-checks:** মাসের সব খোলা কর্মদিবস Close না হওয়া পর্যন্ত `Monthly Process` / Month Close করা যাবে না। মাস Close হয়ে গেলে ওই মাসের কোনো তারিখে আর কোনো লেনদেন বা Day Open করা যাবে না।

---

## ৩. কার কী কাজ? (Head Office vs Branch User)

### 🏢 Head Office-এর কাজ (Admin / HO MIS & Accounts)
- [ ] **Financial Year Management:** নতুন অর্থবছর (১ জুলাই – ৩০ জুন) ওপেন করা এবং অডিট শেষে অর্থবছর ক্লোজ করা।
- [ ] **Holiday Calendar Setup:** বাৎসরিক সরকারি ছুটি ও সাপ্তাহিক ছুটি সেট করা।
- [ ] **Manage Day Initial (Branch Onboarding):** নতুন ব্রাঞ্চ বা পুরোনো ব্রাঞ্চকে সিস্টেমে প্রথমবারের মতো চালু করার সময় তার **Initial Business Date** সেট করে দেওয়া।
- [ ] **Day / Month Reopen (Unlock):** কোনো ব্রাঞ্চ ভুল করে Day Close বা Month Close করে ফেললে, যুক্তিসঙ্গত কারণ ও PIN/Approval-সহ সেটি **Reopen** করে দেওয়া (অডিট ট্রেইলসহ)।
- [ ] **Central Monitoring Dashboard:** সারা দেশের কোন ব্রাঞ্চের আজকের Day Open হয়েছে, কোন ব্রাঞ্চ এখনো আগের দিন Close করেনি, এবং মাসের শেষে কোন ব্রাঞ্চ Monthly Process বাকি রেখেছে—তা এক স্ক্রিনে দেখা।

### 🏪 Branch User-এর কাজ (Branch Manager / Branch Accountant)
- [ ] **Start Work Process (Day Open):** প্রতিদিন সকালে অফিসে এসে প্রথমে Day Open করা (সিস্টেম স্বয়ংক্রিয়ভাবে আগের ক্লোজড দিনের পরের কর্মদিবস দেখাবে)।
- [ ] **Daily Operations:** শুধুমাত্র বর্তমান Open Business Date-এ মেম্বার ভর্তি, লোন ডিসবার্সমেন্ট, কিস্তি কালেকশন, সঞ্চয় ও ভাউচার এন্ট্রি করা।
- [ ] **Complete Work Process (Day Close):** বিকেলে দিনের সব কাজ শেষে ক্যাশ ও ট্রানজেকশন মিলিয়ে Day Close করা।
- [ ] **LLP Voucher Process:** মাসের শেষে বা নির্ধারিত সময়ে ওভারডিউ লোনের ওপর LLP ক্যালকুলেট করে অটো-ভাউচার জেনারেট করা।
- [ ] **Monthly Process:** মাসের শেষ কর্মদিবস Close করার পর Monthly Process রান করে মাসিক রিপোর্ট/স্ন্যাপশট তৈরি করা এবং মাস Close করা।

---

## ৪. ইমপ্লিমেন্টেশন চেকলিস্ট (Development Tasks)

### Backend (Laravel)
- [ ] Migration তৈরি: `financial_years`, `holidays`, `branch_financial_years`, `branch_accounting_periods`, `branch_month_processes`, `period_reopen_logs`
- [ ] `AccountingPeriodService`:
  - `openFinancialYear()` ও `closeFinancialYear()`
  - `setBranchDayInitial()` (Manage Day Initial)
  - `startWorkProcess()` (Day Open — with previous-day-closed & holiday check)
  - `completeWorkProcess()` (Day Close — with pending transaction check)
  - `runMonthlyProcess()` ও `closeMonth()`
  - `reopenPeriod()` (HO only, with audit log)
- [ ] `EnsureActiveBusinessDay` Middleware তৈরি করা (যা ব্রাঞ্চের ট্রানজেকশনাল রুটে বসবে এবং বর্তমান `business_date` ইনজেক্ট করবে)।
- [ ] Controllers & Routes:
  - Head Office: `HeadOffice/AccountingPeriodController` (FY, Holidays, Day Initial, Monitor, Reopen)
  - Branch: `Branch/WorkProcessController` (Start Work, Complete Work, LLP Process, Monthly Process)

### Frontend (React / Inertia)
- [ ] নেভিগেশন বারে বর্তমান ব্রাঞ্চের **Active Business Date** ব্যাজ হিসেবে দেখানো (যেমন: `কর্মদিবস: ২৫-১১-২০২৬ (Open)` বা `Closed`)।
- [ ] Branch Process Menu UI (gBanker-এর মতো):
  - `Start Work Process` পেজ/মডাল
  - `Complete Work Process` পেজ (দিনের সামারি: আজকের ডিসবার্সমেন্ট, কালেকশন, সেভিংস, ক্যাশ ব্যালেন্স সহ Close বাটন)
  - `Monthly Process` পেজ (মাসের স্ট্যাটাস, প্রোগ্রেস, ও Month Close বাটন)
  - `LLP Voucher Process` পেজ (ধাপ ২/৩-এর ওভারডিউ ডাটার সাথে যুক্ত হবে)
- [ ] Head Office Control Panel UI:
  - `Manage Day Initial` (ব্রাঞ্চ সিলেক্ট করে শুরুর তারিখ সেট)
  - `Branch Process Monitor` (জোন/এরিয়া/ব্রাঞ্চ অনুযায়ী আজকের Day Open/Close স্ট্যাটাস টেবিল)
  - `Reopen Day/Month` মডাল (কারণ ও PIN-সহ)

### Testing
- [ ] Unit/Feature Tests: আগের দিন ক্লোজ না করে পরের দিন ওপেন করা যায় না, ক্লোজড দিনে লেনদেন ব্লক হয়, মাস ক্লোজ হলে ওই মাসের কোনো দিন খোলা যায় না, HO রি-ওপেন করলে লগ তৈরি হয়।
