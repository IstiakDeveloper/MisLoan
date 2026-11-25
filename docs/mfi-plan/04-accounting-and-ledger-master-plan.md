# সম্পূর্ণ অ্যাকাউন্টিং ও কোর মাইক্রোফাইন্যান্স ইন্টিগ্রেশন প্ল্যান
*(Reference: `feat/mfi-accounting-security-foundation` ব্রাঞ্চ থেকে যাচাইকৃত আর্কিটেকচার + `main` ব্রাঞ্চের নিজস্ব ডিজাইন ও Phase 1-এর সাথে সমন্বিত)*

---

## ১. মূল নীতি (Core Architecture Principles)
1. **আমাদের নিজস্ব ডিজাইন ও Phase 1 অক্ষুণ্ণ থাকবে:**
   * `main` ব্রাঞ্চের `AdminLayout` (Collapsible Menu → Sub-Menu), `ComboSelect`, বাংলাদেশি তারিখ ফরম্যাট (`dd/mm/YYYY`), `TwoFactorAuthentication`, `MemberCycleHub`, এবং Phase 1-এর `AccountingPeriodService` (`financial_years`, `holidays`, `branch_financial_years`, `branch_accounting_periods`, `branch_month_processes`) **১০০% অক্ষুণ্ণ থাকবে**।
   * `feat/mfi-accounting-security-foundation` থেকে **শুধুমাত্র প্রমাণিত ও শক্তিশালী Core Accounting, Loan/Savings Sub-ledger, Cash Desk, Policy ও Reporting ইঞ্জিন** ধাপে ধাপে নেওয়া হবে (অপ্রয়োজনীয় Auth/2FA ডিলিট বা পুরোনো লেআউট পরিবর্তন নেওয়া হবে না)।
2. **পয়সা-ভিত্তিক নিখুঁত হিসাব (Integer Minor Units / `Money` Value Object):**
   * ফ্লোটিং-পয়েন্ট এরর এড়াতে সব জার্নাল, কিস্তি ও সঞ্চয় হিসাব **পূর্ণসংখ্যা পয়সা (minor units)** বা `Money` ক্লাস (`app/Services/Accounting/Money.php`) দিয়ে পরিচালিত হবে।
3. **Active Business Date ও Period Lock বাধ্যতামূলক:**
   * যেকোনো লোন ডিসবার্সমেন্ট, কিস্তি আদায়, সঞ্চয় জমা/উত্তোলন, বা ভাউচার পোস্টিং অবশ্যই Phase 1-এর `EnsureActiveBusinessDay` মিডলওয়্যার এবং `AccountingPeriodService`-এর খোলা কর্মদিবস (`open` day) ও খোলা মাসের (`open` month) অধীনে হতে হবে।
4. **Maker-Checker (স্বাধীন অনুমোদন) ও ইডেমপোটেন্সি:**
   * ম্যানুয়াল ভাউচার, লোন/সেভিংস কারেকশন রিকোয়েস্ট ও ক্যাশ সেশন ক্লোজ—এসব ক্ষেত্রে প্রস্তুতকারী (Maker) নিজে অনুমোদন (Checker) করতে পারবেন না।

---

## ২. `feat/mfi-accounting-security-foundation` থেকে কী কী নেব vs কী কী এড়িয়ে যাব

### ✅ যা যা নেওয়া হবে (Adopt & Adapt)
| মডিউল | ফাইল / সার্ভিস (Feature Branch) | আমাদের প্রজেক্টে যেভাবে সমন্বয় হবে |
| :--- | :--- | :--- |
| **Chart of Accounts & Journal** | `Money`, `JournalService`, `PostingDefaults` + `ledger_accounts`, `journal_entries`, `journal_lines`, `gl_posting_defaults` | আমাদের `AccountingPeriodService`-এর `business_date` ও `branch_accounting_periods` লকের সাথে যুক্ত হবে (আলাদা `accounting_periods` টেবিলের বদলে Phase 1-এর টেবিল ব্যবহার হবে)। |
| **Voucher System** | `VoucherService`, `AccountingController` + `accounting_vouchers` | Payment, Receipt, Journal, Contra ভাউচার + Maker-Checker অনুমোদন; UI-তে `ComboSelect` ও `formatDate` ব্যবহার হবে। |
| **Cash Desk & Bank Reconciliation** | `CashDesk`, `CashDeskController` + `cashier_sessions`, `bank_statement_lines` | ব্রাঞ্চের `Complete Work Process` (Day Close)-এর আগে ক্যাশ সেশন সাবমিট ও রিভিউ বাধ্যতামূলক করা হবে। |
| **Loan Sub-Ledger & Schedule** | `LoanContract`, `LoanLedger`, `LoanPortfolio`, `LoanCorrections`, `ProductLoanPricing`, `ProductServiceCharge` + `loan_accounts`, `loan_installments`, `loan_transactions`, `loan_correction_requests` | `LoanApplication` ডিসবার্স হলেই অটোমেটিক `loan_accounts` ও `loan_installments` তৈরি হবে এবং `MemberCycleHub`-এর সাথে সিঙ্ক থাকবে। |
| **Savings Sub-Ledger** | `SavingsLedger`, `ProductSavingsProfit`, `SavingsCorrections` + `savings_accounts`, `savings_transactions`, `savings_holds`, `savings_correction_requests` | `SavingsApplication` অ্যাক্টিভেট হলেই `savings_accounts` তৈরি হয়ে দৈনিক/মাসিক জমা-উত্তোলন ও প্রফিট চলবে। |
| **Institution Policy & Regulatory Mapping** | `InstitutionPolicy`, `ProductPolicyVersions`, `RegulatoryMappingController` | Head Office-এর অধীনে প্রোডাক্ট রেট ভার্সনিং ও MRA/PKSF হেড ম্যাপিং। |
| **Financial & Regulatory Reports** | `FinancialReports`, `LedgerStatements`, `CheckFinancialLedgers` (Artisan command) | Trial Balance, Income Statement, Balance Sheet, Cashbook, Ledger Statement, Loan Portfolio/PAR ও Daily Ledger Integrity Check। |

### ❌ যা নেওয়া হবে না / আমাদেরটা থাকবে (Keep `main` Version)
* `TwoFactorAuthenticationController` ও `UserCredentialsMail` ডিলিট করা হয়েছিল—আমরা আমাদের `main`-এর 2FA ও সিকিউরিটি রাখব।
* ফিচার ব্রাঞ্চের পুরোনো `AdminLayout` নেওয়া হবে না—আমাদের নতুন **Collapsible Menu → Sub-Menu (`admin-layout.tsx`)** থাকবে এবং সেখানেই নতুন Accounting, Cash Desk, Loan/Savings Ledger ও Reports মেনুগুলো সুন্দরভাবে যুক্ত হবে।
* ফিচার ব্রাঞ্চের আলাদা `accounting_periods` টেবিল নেওয়া হবে না—আমাদের Phase 1-এর ৬টি টেবিল ও `AccountingPeriodService` থাকবে।

---

## ৩. ধাপ-ভিত্তিক বাস্তবায়ন পরিকল্পনা (Implementation Phases)

### ধাপ ২A: Chart of Accounts (COA), Posting Defaults ও Voucher Engine (AIS Core) — ✅ সম্পন্ন
**লক্ষ্য:** ডাবল-এন্ট্রি অ্যাকাউন্টিংয়ের ভিত্তি তৈরি করা।
- [x] **Database:** `ledger_accounts` (Asset, Liability, Equity, Income, Expense), `journal_entries`, `journal_lines`, `gl_posting_defaults`, `accounting_vouchers`
- [x] **Services:** `Money`, `JournalService` (Debit === Credit গার্ড + Period Lock চেক), `PostingDefaults`, `VoucherService` (Draft → Submitted → Approved/Posted → Reversed)
- [ ] **Head Office কাজ:**
  - Chart of Accounts (COA) তৈরি ও ম্যানেজ করা
  - GL Posting Defaults সেট করা (কোন লোন/সঞ্চয় প্রোডাক্টের আসল, সার্ভিস চার্জ, জরিমানা, ক্যাশ/ব্যাংক কোন অ্যাকাউন্টে যাবে)
  - HO পর্যায়ের ভাউচার অনুমোদন ও অডিট
- [ ] **Branch কাজ:**
  - Payment / Receipt / Journal / Contra ভাউচার তৈরি (অবশ্যই Open Business Date-এ)
  - Maker-Checker নিয়মে অন্য কর্মকর্তার (যেমন Branch Manager/Accountant) অনুমোদনে ভাউচার পোস্ট করা
- [ ] **UI & Navigation:** `AdminLayout`-এ **Accounting** সাব-মেনু (`COA & Setup`, `Posting Defaults`, `Voucher Entry`, `Journal Registers`)

---

### ধাপ ২B: Cash Desk & Bank Reconciliation (দৈনিক ক্যাশ নিয়ন্ত্রণ)
**লক্ষ্য:** Day Close-এর আগে ব্রাঞ্চের হাতে থাকা নগদ টাকা ও ব্যাংকের হিসাব মেলানো।
- [ ] **Database:** `cashier_sessions`, `bank_statement_lines`
- [ ] **Services:** `CashDesk` (Opening Cash + Cash Receipts - Cash Payments = Expected Closing Cash)
- [ ] **Branch কাজ:**
  - সকালে `Start Work Process`-এর পর ক্যাশ সেশন ওপেন করা
  - বিকেলে নগদ ডিনোমিনেশন/ব্যালেন্স মিলিয়ে ক্যাশ সেশন সাবমিট ও রিভিউ করা
  - ব্যাংক স্টেটমেন্ট লাইন ম্যাচ করা
- [ ] **Phase 1 Integration:** `AccountingPeriodService::completeWorkProcess()`-এ চেক যোগ করা—অমীমাংসিত ক্যাশ সেশন বা Draft ভাউচার থাকলে Day Close ব্লক থাকবে।

---

### ধাপ ২C: Loan Schedule, Collection & Correction (ঋণ সাব-লেজার)
**লক্ষ্য:** লোন ডিসবার্সমেন্ট থেকে শুরু করে প্রতিটি কিস্তি আদায় ও অটো-জার্নাল পোস্টিং।
- [ ] **Database:** `loan_accounts`, `loan_installments`, `loan_transactions`, `loan_correction_requests`
- [ ] **Services:**
  - `ProductLoanPricing` & `ProductServiceCharge` (Flat / Declining + `holidays` টেবিল অনুযায়ী কিস্তির তারিখ সমন্বয়)
  - `LoanContract` (ডিসবার্স হলেই `loan_accounts` + `loan_installments` তৈরি + GL-এ অটো-জার্নাল)
  - `LoanLedger` (কিস্তি আদায় → আসল ও সার্ভিস চার্জ ভাগ, অগ্রিম/বকেয়া হিসাব, এবং GL-এ অটো-জার্নাল)
  - `LoanCorrections` (ভুল রিসিট সংশোধন/রিভার্সাল — Maker-Checker অনুমোদনসহ)
  - `LoanPortfolio` (Branch-wise Outstanding, Overdue, PAR)
- [ ] **MemberCycleHub Integration:**
  - `repayLoan()` ম্যানুয়াল টগলের পরিবর্তে প্রকৃত ব্যালেন্স শূন্য হলেই লোন `repaid` হবে এবং পরবর্তী সাইকেল আনলক হবে।
- [ ] **Phase 1 LLP Integration:**
  - `runLlpVoucherProcess()` এখন আসল `loan_installments` Overdue/Aging (Regular 1%, Watchful 5%, Sub-standard 25%, Doubtful 75%, Bad 100%) হিসাব করে সরাসরি `accounting_vouchers` / `journal_entries`-এ অটো-ভাউচার পোস্ট করবে।

---

### ধাপ ২D: Savings Sub-Ledger & Profit Calculation (সঞ্চয় সাব-লেজার)
**লক্ষ্য:** জেনারেল সেভিংস, DPS ও FDR-এর জমা, উত্তোলন ও মুনাফা পোস্টিং।
- [ ] **Database:** `savings_accounts`, `savings_transactions`, `savings_holds`, `savings_correction_requests`
- [ ] **Services:** `SavingsLedger`, `ProductSavingsProfit`, `SavingsCorrections`
- [ ] **Branch কাজ:**
  - Open Business Date-এ সঞ্চয় জমা, উত্তোলন ও লিন/হোল্ড (Loan Lien) পরিচালনা + GL-এ অটো-জার্নাল
- [ ] **Head Office কাজ:**
  - সেভিংস প্রফিট রেট ও পলিসি নির্ধারণ এবং কারেকশন রিকোয়েস্ট মনিটরিং

---

### ধাপ ৩: Financial Reports, MRA/PKSF Mapping & Integrity Checks
**লক্ষ্য:** ব্রাঞ্চ ও কনসোলিডেটেড পর্যায়ে পূর্ণাঙ্গ আর্থিক ও রেগুলেটরি রিপোর্ট।
- [ ] **Reports (`FinancialReports`, `LedgerStatements`):**
  - Trial Balance (Branch-wise ও Consolidated)
  - Receipt & Payment Statement
  - Income & Expenditure Statement
  - Balance Sheet
  - Cashbook, Bankbook & General Ledger Statement
  - Loan Portfolio, Overdue & PAR Aging Report
  - MRA / PKSF (POMIS 1, 2, 3) রেগুলেটরি ম্যাপিং ও এক্সপোর্ট (Excel/PDF)
- [ ] **Integrity & Security Audit (`CheckFinancialLedgers`):**
  - প্রতিদিন অটোমেটিক ভেরিফিকেশন: `SUM(Debit) === SUM(Credit)` এবং Sub-ledger (Loan/Savings) Balance === GL Control Account Balance।
  - Private Documents: মেম্বারের NID/ছবি/সিগনেচার `public` ডিস্ক থেকে `private` ডিস্কে স্থানান্তর (`DocumentController` দিয়ে রোল-ভিত্তিক অ্যাক্সেস)।

---

## ৪. Head Office vs Branch User দায়িত্বের সারসংক্ষেপ

| কার্যক্রম | Head Office | Branch User |
| :--- | :--- | :--- |
| **Chart of Accounts & Posting Defaults** | COA তৈরি, প্রোডাক্ট-টু-GL ম্যাপিং, পলিসি সেটআপ | পরিবর্তন করতে পারবে না; শুধু ব্যবহার করবে |
| **Period Control (Phase 1)** | FY Open/Close, Holidays, Manage Day Initial, Reopen | প্রতিদিন Start/Complete Work Process, Monthly Process |
| **Cash Desk & Vouchers** | HO ভাউচার, ফান্ড ট্রান্সফার ও বড় কারেকশন অনুমোদন | ক্যাশ সেশন Open/Submit, দৈনিক ভাউচার এন্ট্রি ও অনুমোদন |
| **Loan & Savings Operations** | প্রোডাক্ট রেট, LLP ও পোর্টফোলিও মনিটরিং | Open Day-তে ডিসবার্স, কিস্তি আদায়, সঞ্চয় জমা/উত্তোলন |
| **Reports & Audit** | Consolidated Balance Sheet, Trial Balance, MRA/PKSF | নিজের ব্রাঞ্চের Cashbook, DCS, Trial Balance ও PAR |

---

## ৫. রেকমেন্ডেড ইমপ্লিমেন্টেশন অর্ডার (একটার পর একটা)
1. **Step 1 (এখন শুরু):** ধাপ ২A — `Money`, COA (`ledger_accounts`), `JournalService`, `PostingDefaults`, `VoucherService` + UI (আমাদের `ComboSelect` ও `dd/mm/YYYY` ফরম্যাটে)।
2. **Step 2:** ধাপ ২B — `CashDesk` (`cashier_sessions`, `bank_statement_lines`) + `Complete Work Process` (Day Close) গার্ড।
3. **Step 3:** ধাপ ২C — `LoanContract`, `LoanLedger` (Schedule + Collection + Correction) + প্রকৃত `LLP Voucher Process`।
4. **Step 4:** ধাপ ২D — `SavingsLedger` + Profit Calculation।
5. **Step 5:** ধাপ ৩ — Financial Statements, MRA/PKSF Reports ও Ledger Integrity Command (`CheckFinancialLedgers`)।
