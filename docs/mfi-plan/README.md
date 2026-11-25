# MisLoan → Complete Microfinance Solution (Master Plan)

এই ডিরেক্টরিতে **MisLoan** প্রজেক্টকে ধাপে ধাপে **gBanker / Microfin360**-এর মতো একটি পূর্ণাঙ্গ মাইক্রোফাইন্যান্স সলিউশনে রূপান্তর করার বিস্তারিত পরিকল্পনা ও কাজের চেকলিস্ট সাজানো হয়েছে।

---

## ডিরেক্টরি সূচিপত্র (Plan Files)

| ধাপ | ফাইল | বিষয়বস্তু | স্ট্যাটাস |
| :--- | :--- | :--- | :--- |
| **ধাপ ১** | [01-day-open-close-and-monthly-process.md](./01-day-open-close-and-monthly-process.md) | Day Initial, Start/Complete Work Process (Day Open/Close), LLP Voucher, Monthly Process, FY Rollback | ✅ সম্পন্ন |
| **ধাপ ২A** | [04-accounting-and-ledger-master-plan.md](./04-accounting-and-ledger-master-plan.md) | Chart of Accounts (COA), GL Posting Defaults, Voucher Engine (Maker-Checker), Journal Register | ✅ সম্পন্ন |
| **ধাপ ২B–৩** | [04-accounting-and-ledger-master-plan.md](./04-accounting-and-ledger-master-plan.md) | Cash Desk & Bank Recon, Loan Schedule & DCS, Savings Ledger, Financial & MRA/PKSF Reports | 🟡 চলমান (পরবর্তী ধাপ ২B) |

---

## বর্তমান প্রজেক্টের স্ট্যাটাস (কী হয়েছে vs কী করতে হবে)

### ইতিমধ্যে সম্পন্ন হয়েছে (Existing in MisLoan)
- [x] **Organization Hierarchy:** Zone, Area, Branch, Samity ম্যানেজমেন্ট ও HRM Sync
- [x] **User & Role Management:** Multi-role, Branch scoping, PIN/Signature, 2FA, Session control
- [x] **Member Admission:** মেম্বার ভর্তি, ফ্যামিলি/অ্যাসেট তথ্য, NID, Cycle tracking (`member_loan_cycles`)
- [x] **Product Configuration:** Loan Category/Product এবং Savings Category/Product
- [x] **Origination & Approval Workflow:** Loan & Savings Application, Team-Based Approval, Verification, Issue Processing, Head Office Approval, Disbursement status tracking
- [x] **Operational Controls:** CSO Duty Roster, HO Send Cutoff, Fine Management, Portfolio/Cluster Handover

### নতুন করে তৈরি করতে হবে (Core MFI Modules)
- [x] **ধাপ ১:** Financial Year (with SuperAdmin Rollback), Holiday Calendar, Manage Day Initial, Day Open/Close (`Start/Complete Work Process`), `Monthly Process`, `LLP Voucher Process`
- [x] **ধাপ ২A:** Chart of Accounts (`ledger_accounts`), `gl_posting_defaults`, `JournalService`, `VoucherService` (Maker-Checker) ও UI
- [ ] **ধাপ ২B:** Cash Desk (`cashier_sessions`, `bank_statement_lines`) ও Day Close ক্যাশ রিকনসিলিয়েশন গার্ড
- [ ] **ধাপ ২C:** Loan Repayment Schedule Engine, Daily Collection Sheet (DCS), Principal/Interest Split, Overdue/PAR, প্রকৃত LLP অটো-ভাউচার
- [ ] **ধাপ ২D:** Savings Transaction Ledger (`savings_accounts`, `savings_transactions`, `savings_holds`) ও Auto Profit Calculation
- [ ] **ধাপ ৩:** Financial Statements (Trial Balance, Income Statement, Balance Sheet, Cashbook/Bankbook), MRA & PKSF (POMIS 1, 2, 3) Reports, `CheckFinancialLedgers`
- [ ] **ধাপ ৪:** Private Document Storage (NID/Photo/Signature), Opening Balance Migration ও Pilot Branch Rollout

---

## কাজের নিয়ম (Tracking Convention)
প্রতিটি ফাইলে টাস্কগুলো চেকবক্স আকারে দেওয়া আছে:
- `- [ ]` = এখনো বাকি (Pending)
- `- [x]` = কাজ শেষ (Completed)

প্রতিটি ধাপ শেষ হলে সংশ্লিষ্ট `.md` ফাইলে `[x]` আপডেট করে পরবর্তী ধাপে যাওয়া উচিত।
