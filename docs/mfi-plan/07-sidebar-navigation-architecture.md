# ধাপ ৭: প্রফেশনাল নেভিগেশন আর্কিটেকচার প্ল্যান (AdminLayout)

**সমস্যা:** সব কাজ (Work Process, Cash Desk, Loan Ledger, Savings Ledger, Vouchers, Posting Defaults, Legacy Import) একসাথে `Process & Accounting` ড্রপডাউনের ভেতরে ঢোকানোয় মেনু জগাখিচুড়ি হয়ে যাচ্ছে। আবার ৩-লেভেল নেস্টেড সাব-মেনু করলে ২৪০px সাইডবারে লেখা চেপে (narrow) যায়।

**সমাধান (Best-in-Class ERP Navigation Pattern):**
৩-লেভেল ভেতরে না ঢুকিয়ে **কাজের ডোমেইন অনুযায়ী পরিষ্কার Category (Section)** এবং **সর্বোচ্চ ২-লেভেল মেনু (Main Menu → Sub-Menu)** ব্যবহার করা—যেখানে প্রতিটি মেনুতে শুধু তার নিজের ৩–৫টি সম্পর্কিত কাজ থাকবে। আর যেসব কাজ প্রতিদিন সকালে/বিকেলে লাগে সেগুলো **ডাইরেক্ট ক্লিকে** রাখা।

---

## ১. প্রস্তাবিত মেনু কাঠামো (Head Office / SuperAdmin)

### ১) Overview
* `Dashboard` *(Direct Link)*

### ২) Process & Control *(শাখা ও অর্থবছর নিয়ন্ত্রণ)*
* **Period & Work Process** *(Menu)*
  * `Accounting Periods & Day Initial` (`/head-office/accounting-periods`)
  * `Branch Work Process` (`/branch/process`)
  * `Send Deadline (Cutoff)` (`/head-office/send-cutoff`)

### ৩) Member, Loan & Approvals *(আবেদন ও অনুমোদন)*
* **Member & Origination** *(Menu)*
  * `Cycle Hub` (`/member/cycle-hub`)
  * `Admission Members` (`/head-office/admission-members`)
  * `Loan Applications` (`/head-office/loan-applications`)
  * `Savings Applications` (`/head-office/savings-applications`)
* **Verification & Approvals** *(Menu)*
  * `Verification` (`/verifications`)
  * `Team Based Approvals` (`/head-office/team-based-approvals`)
  * `Fines & Penalties` (`/head-office/fines`)

### ৪) Microfinance Ledgers (MIS) *(লোন কিস্তি ও সঞ্চয় লেজার)*
* **Loan & Savings Ledger** *(Menu)*
  * `Loan Ledger & DCS` (`/loan-ledger`)
  * `Savings Ledger & Profit` (`/savings-ledger`)

### ৫) Accounting (AIS) *(নগদ, ব্যাংক ও সাধারণ হিসাব)*
* **Cash & General Ledger** *(Menu)*
  * `Cash Desk & Bank Recon` (`/cash-desk`)
  * `Accounting & Vouchers` (`/accounting`)
  * `GL Posting Defaults` (`/head-office/posting-defaults`)
  * `Legacy Balance Import` (`/head-office/legacy-import`)

### ৬) Reports & Analytics *(রিপোর্ট ভাগ করা থাকবে)*
* **Financial & Portfolio Reports** *(Menu)*
  * `Financial & POMIS Reports` (`/financial-reports`)
* **MIS & Approval Reports** *(Menu)*
  * `App Registrations`
  * `Team Based Report`
  * `Guarantor & Informant Report`
  * `Approver Loan Approval Report`
  * `Branch-wise Loan Pending`

### ৭) Configuration *(সেটআপ)*
* `Products & Rules` *(Menu)*
* `Organization & Field` *(Menu)*
* `Users & Security` *(Menu)*

---

## ২. প্রস্তাবিত মেনু কাঠামো (Branch User / Branch Manager)
শাখার কাজের ধরন অনুযায়ী সবচেয়ে সহজ ও দ্রুতগতির মেনু:

### ১) Overview
* `Dashboard` *(Direct Link)*

### ২) Daily Process *(প্রতিদিন সকাল ও বিকেলের কাজ — ১ ক্লিকে)*
* `Work Process (Day Open/Close)` (`/branch/process`) *(Direct Link)*
* `Cash Desk & Bank Recon` (`/cash-desk`) *(Direct Link)*

### ৩) Field & Ledgers (MIS)
* **Member & Origination** *(Menu)* → `Cycle Hub`, `Member Admissions`, `Loan Applications`, `Savings Applications`
* **Collection & Savings** *(Menu)* → `Loan Ledger & DCS` (`/loan-ledger`), `Savings Ledger & Profit` (`/savings-ledger`)

### ৪) Accounting & Reports
* `Vouchers & Journals` (`/accounting`) *(Direct Link)*
* `Financial & POMIS Reports` (`/financial-reports`) *(Direct Link)*

### ৫) Approvals & Handover
* **Verification & Approvals** *(Menu)* → `Verification`, `Team Based Approval`, `Pending Approvals`, `Corrections & Fines`
* `Cluster Handover` *(Direct Link)*

---

## ৩. বাড়তি UX সুবিধা (Special Features without Narrowing)
1. **Sidebar Quick Search (ছোট সার্চ বক্স):** সাইডবারের একদম ওপরে একটি ছোট সার্চ ইনপুট—`DCS`, `Voucher`, `Day Open`, `POMIS` লিখলেই সাথে সাথে ম্যাচিং মেনু সামনে চলে আসবে।
2. **Dropdown-এর ভেতর Mini-Category Label (No Extra Indent):** প্রয়োজনে ড্রপডাউনের ভেতরে হালকা ধূসর সাব-হেডার (যেমন `দৈনিক কাজ` / `সেটআপ`) থাকবে, যাতে ৩য় লেভেলের মতো জায়গা চেপে না যায়।
3. **Smart Auto-Accordion:** একটি মেনু খুললে অন্য অপ্রয়োজনীয় মেনু অটো-বন্ধ হবে (অ্যাক্টিভ মেনু ছাড়া), ফলে সাইডবার কখনোই লম্বা হয়ে জ্যাম হবে না।
