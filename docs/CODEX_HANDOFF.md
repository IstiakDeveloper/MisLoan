# MisLoan — পরবর্তী Codex-এর handoff

এই নথি নতুন Codex session-এ প্রথমে পড়তে হবে। এটি **কাজের breakdown ও যাচাইকৃত অবস্থার বিবরণ**, production-ready বা ১০০% completion certificate নয়।

## ১. লক্ষ্য ও স্থায়ী সিদ্ধান্ত

- Repository: https://github.com/IstiakDeveloper/MisLoan
- সম্পূর্ণ Bangladesh microfinance application; gBanker/MicroFin360-এর মতো কার্যক্রম পরিচালনার লক্ষ্য।
- **SaaS নয়**: প্রতিটি প্রতিষ্ঠান আলাদা hosting/database/environment ব্যবহার করবে।
- পরিকল্পিত target: প্রতি প্রতিষ্ঠানে প্রায় ৫০০ branch, ১০ লাখ member, ২,০০০ concurrent user। এই target-এর load test এখনো হয়নি।
- Existing application, admission/cycle ও production data compatible রাখতে হবে। নতুন ledger থাকলেই পুরোনো তথ্যকে migrated/reconciled বলা যাবে না।
- Loan/Savings Product settings ব্যবহার করতে হবে। ব্যবহারকারী বলেছেন ঋণ reducing পদ্ধতিতে চলে; তবে সব allocation, rebate, accrual ও settlement convention নিশ্চিত করা হয়নি।

## ২. Branch ও baseline

এই handoff তৈরির সময় implementation branch:

```text
feat/mfi-accounting-security-foundation
```

সর্বশেষ implementation commit: `c403f66`। এই নথির পরের commit-এ documentation যোগ হতে পারে; তাই শুরুতে `git status`, `git branch --show-current`, `git log` দেখে নিতে হবে।

এই কাজের session থেকে production deploy বা main merge করা হয়নি। **Live server-এ এই branch বা migrations আছে কি না, তা যাচাই করা হয়নি।** Live checkout-এর commit ও database migration history মিলিয়ে deployment status নির্ধারণ করতে হবে। নতুন branch-এর code এবং live installation একই—এমন ধরে নেওয়া যাবে না।

| Commit | পরিবর্তন |
| --- | --- |
| `740fd64` ও আগের foundation | Exact money, accounting/security foundation, product pricing, savings ledger, portable migrations/tests/type fixes |
| `3d4589e` | Loan accounts, saved-contract total schedule, split collections, GL integration, reversal, source guards |
| `dd1a176` | Historical loan portfolio, branch aging ও PAR reporting |
| `23e7ef2` | Loan receipt correction-এ independent approval |
| `2d014af` | Financial reports, account ledger, statements/export ও integrity command |
| `face54f` | Password setup links, common-password email/default-PIN removal |
| `c403f66` | Manual voucher/savings correction approvals, session-verified MFA, account/role mutation guards |

## ৩. কী বাস্তবায়িত হয়েছে

| অংশ | বর্তমান আচরণ | প্রধান code/entry point |
| --- | --- | --- |
| Money/GL | Integer paisa, balanced immutable journal, request idempotency, active accounts, open period, reversal ও branch lock | `app/Services/Accounting/Money.php`, `JournalService.php`; `/accounting` |
| Manual voucher | Submit করলে pending proposal; আলাদা personal admin approve করলে posting; rejection/review/journal link থাকে | `VoucherService.php`, `AccountingController.php` |
| Product pricing | Existing tariff/factor থেকে exact quote; final installment total-এর সঙ্গে reconcile | `app/Services/Loans/ProductLoanPricing.php`; `/loan-products/{id}/quote` |
| Loan ledger | Saved disbursed contract snapshot; verified opening বা original disbursement GL; explicit principal/charge repayment | `LoanContract.php`, `LoanLedger.php`; `/loan-ledger` |
| Loan lifecycle | Full collection-এ account/source repaid; approved receipt reversal-এ reopen; linked source financial edits/deletion/manual settlement guarded | `LoanLedger.php`, `LoanApplication.php`, member/HO controllers |
| Loan corrections | Request-এ টাকা বদলায় না; আলাদা reviewer approve করলে receipt ও GL একসঙ্গে reverse | `LoanCorrections.php`, `LoanLedgerController.php` |
| Loan portfolio | As-of-date balance, earliest unpaid due, FIFO total-dues coverage, aging buckets, PAR >30/>90, branch filter ও coverage disclosure | `LoanPortfolio.php`; `/loan-portfolio` |
| Savings ledger | Explicit opening, deposit/withdrawal, holds/release, manually posted profit, historical overdraft protection, source GL ও zero-balance closure | `app/Services/Savings/SavingsLedger.php`; `/savings-ledger` |
| Savings corrections | আলাদা reviewer; approval-এ বর্তমান funds/holds/account/period আবার যাচাই; GL ও subledger atomic reversal | `SavingsCorrections.php`, savings controller |
| Financial reporting | Opening/period/closing trial balance, period income/expense, cumulative balance sheet, paginated running account ledger | `FinancialReports.php`, `FinancialReportsController.php`; `/accounting/reports` |
| Statement delivery | Loan/Savings statement CSV ও printable HTML; browser Print/Save PDF; exact amounts, escaped/formula-safe text, private/no-store response | `app/Services/Reporting/`, `LedgerStatementController.php`, `resources/views/reports/` |
| MFA | Financial routes ও privileged account/role operations-এ current-session TOTP/recovery/enrollment proof; old session বা changed secret reject | `FinancialMfa.php`, `RequireFinancialMfa.php`, `AppServiceProvider.php`, `config/security.php` |
| Admin boundary | Account/credential/session mutations personal active SuperAdmin-only; `has_all_access`/Head Office দিয়ে role escalation নয় | `ProtectUserAdministration.php`, `routes/web.php` |
| Credentials | Personal email-এ expiring reset/setup link; dispatch-এ password বদলায় না; common password/PIN email সরানো; shared default-PIN migration refused | `UserController.php`, mail view ও branch migration command |
| Other hardening | Public maintenance routes সরানো; service worker authenticated response cache করে না; dependency/migration/type regression fixes | Existing implementation notes ও tests |

**Approval scope:** manual voucher/reversal, loan receipt correction ও savings correction-এ independent review আছে। Initial loan/savings financial postings ও অন্যান্য sensitive operations-এ approval সর্বত্র চালু হয়নি।

## ৪. কোন হিসাবনীতি এখন ব্যবহার করা হচ্ছে

পরবর্তী Codex এই সিদ্ধান্তগুলো না বুঝে financial calculation বদলাবে না:

1. Application status বা form-এর deposit amount থেকে opening balance/পুরোনো receipt history বানানো হয় না। Opening verification/reference ও declared balances লাগে।
2. Disbursed loan বর্তমান product rate দিয়ে reprice করা হয় না। Saved contractual principal, charge, count, regular ও last installment reconcile করতে হয়।
3. Persisted loan schedule **মোট কিস্তির schedule**; এটি সম্পূর্ণ reducing principal/charge amortization schedule নয়। Weekly/monthly dates আছে; holiday shifting নেই।
4. Partial collection-এ principal ও charge **আলাদা দিতে হয়**। Total paid credit earliest dues-এ FIFO অনুযায়ী বসে। এটি approved automatic principal/charge allocation নয়।
5. Uncollected contractual service charge GL income হয়নি; collection-এর সময় income recognition হয়। Accrual convention এখনো implement হয়নি।
6. PAR numerator হলো affected loan-এর পুরো outstanding principal; overdue installment amount নয়। Due-today overdue নয়; exactly 30/90 দিন respective >30/>90 ratio-তে পড়ে না।
7. Historical report verified opening-এর আগের তথ্য পুনর্গঠন করে না। Current unlinked-loan count historical population নয়।
8. Savings profit এখন manual posting; automatic accrual নয়। Penalty-dependent early settlement blocked। Historical savings holds/available balance statement-এ অনুমান করা হয় না।
9. Failed approval-এ decision/posting rollback হয় এবং request pending থাকে। Closed-date proposal edit না করে reject করে নতুন open-date proposal দিতে হয়।
10. Printable statement প্রথম ২,০০০ row দেখায় এবং truncation জানায়; closing balance ও full CSV সব row অন্তর্ভুক্ত করে। এগুলো official passbook বা member self-service নয়।

## ৫. শেষ verification বনাম যেগুলো যাচাই হয়নি

- SQLite full suite: **৪৯৯টি test passed**।
- MySQL 8.4 feature suite: **১১৩টি test passed**।
- TypeScript ও production build passed; বড় frontend chunk-এর warning আছে।
- Chromium-এ real TOTP দিয়ে দুই admin login, pending voucher-এ GL অপরিবর্তিত থাকা, self-review block, independent voucher approval, savings correction/reversal ও unverified session block যাচাই হয়েছে।
- আগের browser checks-এ savings holds/withdrawal, loan collections/reversal, portfolio, reports ও CSV/print statements যাচাই হয়েছে।
- Implementation CI: https://github.com/IstiakDeveloper/MisLoan/actions/runs/42750707559 — successful।

**যাচাই হয়নি:** বাস্তব production copy upgrade rehearsal, audited opening reconciliation, institution UAT, official regulatory mapping, target-scale load test, backup restore/PITR drill, pilot rollout। Passing tests এগুলোর বিকল্প নয়।

## ৬. Live data নিয়ে কাজের আগে

### সবচেয়ে জরুরি সতর্কতা

**Live checkout/database-এ test suite চালানো যাবে না।** Feature tests-এ `RefreshDatabase` এবং কিছু Unit fixture-এ table drop/create আছে। Production connection inherit করলে data মুছে যেতে পারে। `migrate:fresh`, `db:wipe`, test seeders ও destructive reset live data-তে ব্যবহার করা যাবে না।

আলাদা test checkout/environment ও isolated database ব্যবহার করতে হবে। Cached config, `.env`, shell-exported DB variables এবং `.env.testing` মিলিয়ে actual connection যাচাই করতে হবে। শুধু command-এর নাম `test` হলেই database নিরাপদ হয় না।

### শুরুতে read-only discovery

- Live checkout-এর branch/commit, local edits ও installed versions দেখো। Existing work overwrite করবে না।
- `migrate:status` ও actual schema দিয়ে কোন financial/approval migration আছে যাচাই করো; এখনই migration চালিও না।
- Backup/restore ব্যবস্থা, storage paths, scheduled commands, queues/mail/payment configuration বোঝো; secrets output বা commit করো না।
- Customer-level data dump না করে aggregate counts দিয়ে loan/savings coverage, missing contract fields ও GL differences বের করো।
- Production copy-তে প্রয়োজনীয় anonymization ও access restriction রেখে staging/test rehearsal করো। Database dump, NID, phone, document, `.env`, APP_KEY বা credentials repository/issue/chat-এ দিও না।
- কাজ isolated branch-এ implement ও reviewযোগ্য করে তারপর environment-এ প্রযোজ্য release process অনুসরণ করো। আগের feature-branch push-এর অনুমতি production deploy বা destructive migration-এর অনুমতি নয়।

### Read-only integrity command

```bash
php artisan misloan:check-ledgers --json
```

এটি linked control totals, unbalanced/empty journals, receipt ছাড়া source journal ও current unlinked disbursed loans পরীক্ষা করে। কোনো financial data বদলায় না। তবে normal application boot/config প্রযোজ্য; connection/environment আগে বুঝতে হবে। Exit 0 শুধু ওই automated checks pass বোঝায়; overall completeness নয়।

### Isolated environment-এ verification উদাহরণ

```bash
# শুধু isolated checkout-এ, production cached config/credentials ছাড়া:
DB_CONNECTION=sqlite DB_DATABASE=:memory: php artisan test
npm run types
npm run build
```

MySQL feature tests আলাদা disposable test database-এ চালাতে হবে। Minimal-schema Unit fixtures ও full Feature suite একই MySQL process/database-এ নির্বিচারে মেশানো যাবে না। পুরোনো chat-এর `/tmp` PHP/Chromium paths, test ports, device-auth code বা local GitHub credentials নতুন environment-এ আছে ধরে নিও না।

## ৭. Deployment-sensitive পরিবর্তন

- `accounting_vouchers` ও `savings_correction_requests`-সহ প্রয়োজনীয় নতুন migrations staging-এ আগে rehearse করতে হবে। Existing schema দেখে skip/rewrite করে migration history falsify করা যাবে না।
- `FINANCIAL_MFA_REQUIRED=true` default। Production-এ bypass flag বন্ধ করে সমস্যার সমাধান করবে না; Settings → Two-Factor দিয়ে enrollment/confirmation ও fresh login যাচাই করো।
- দুটি আলাদা personal active SuperAdmin reviewer দরকার। Shared branch identity reviewer নয়। Recovery codes এবং encryption key-এর protected recovery ব্যবস্থা লাগবে।
- Existing Head Office staff এখন account/role/session mutation করতে পারবেন না; personal SuperAdmin লাগে। প্রতিষ্ঠানের অনুমোদিত admin matrix-এর সঙ্গে এই boundary মিলিয়ে নিতে হবে।
- নতুন interactive personal password validation minimum 8; branch PIN আলাদা। Existing/HRM-imported credential policy ও rotation আলাদাভাবে যাচাই করতে হবে।
- মূল application/admission workflow ও নতুন financial ledger আলাদা। পুরোনো disbursed application বা report থাকলেই verified financial opening তৈরি হয়েছে ধরে নিও না।

## ৮. পরের কাজের অগ্রাধিকার

| Priority | কাজ | Done হওয়ার প্রমাণ |
| --- | --- | --- |
| P0 | Live-vs-branch/schema gap report; backup/restore rehearsal ও staging isolation | Aggregate reconciliation, migration rehearsal, restored database যাচাই |
| P0 | Private documents ও remaining route/role audit | Cross-branch/unauthorized file access tests; public URL exposure বন্ধের verified migration |
| P0 | Initial source postings-এর approval ও cashier/day-end controls | Maker/checker, rejection/retry, close/reconciliation UAT |
| P1 | Versioned product rules ও সব legacy pricing path এক করা | Approved product examples-এর golden tests; existing signed loan অপরিবর্তিত |
| P1 | Automatic reducing allocation, rebate, reschedule, write-off/recovery | Institution-approved rules + accounting entries + audit/reversal tests |
| P1 | Savings accrual, tax/penalty-aware maturity/early settlement | Approved day-count/rate/balance examples + atomic GL posting |
| P1 | Fiscal years/projects/funds, cash/bank reconciliation ও official statements | Signed-off ledger/report mappings ও month-end UAT |
| P1 | Member master/cycle mapping ও duplicate reconciliation | Audited mapping, compatibility ও duplicate review workflow |
| P2 | Android/device/offline sync, payments/SMS, outbox/queues, member portal | Idempotent sync/callbacks, device revocation, settlement/delivery tests |
| Release | Deployment automation, monitoring/PITR, load test ও pilot | Measured latency/RPO/RTO; ২–৩ branch pilot ও institutional acceptance |

### এখনো দরকারি approved input

Product rate থাকলেই নিচের নীতি নির্ধারিত হয়ে যায় না:

- আংশিক আদায়ে principal/charge/penalty priority ও rounding।
- Reducing day-count, amortization dates ও holiday convention।
- Early-settlement earned/unearned charge ও rebate eligibility।
- Reschedule/write-off authority, provision/expense/control accounts ও recovery treatment।
- Savings eligible balance, accrual interval, compounding, tax ও premature penalty।
- বর্তমান MRA/PKSF/donor reporting mappings ও approved examples।

এগুলো না পাওয়া পর্যন্ত সংশ্লিষ্ট automatic financial posting অনুমান করে implement/enable করবে না। অন্য independent কাজ চালিয়ে যাবে।

## ৯. পরবর্তী Codex-কে দেওয়ার prompt

```text
এই repository-তে কাজ চালিয়ে যাও। প্রথমে docs/CODEX_HANDOFF.md,
docs/IMPLEMENTATION.md এবং docs/RELEASE_READINESS.md পড়ো।

এটি separately hosted microfinance application, SaaS নয়।
আগের implementation branch feat/mfi-accounting-security-foundation;
implementation baseline c403f66। তবে বর্তমান checkout/live database-এর
branch, commit, migrations ও schema read-only যাচাই করে প্রকৃত gap বের করো।

Live database-এ test suite, migrate:fresh, db:wipe বা test seeders চালাবে না।
Isolated environment-এ implement/test করো, পুরোনো data ও signed loan terms
compatible রাখো, balance/receipt history বা আর্থিক নীতি অনুমান করো না।
প্রথমে P0 gap assessment ও নিরাপদে সম্পন্ন করা যায় এমন কাজ এগিয়ে নাও।
কী implemented, partial, policy-blocked ও unverified—আলাদা করে জানাও।
পরীক্ষিত পরিবর্তন branch-এ commit/push করো; production readiness প্রমাণ ছাড়া
১০০% complete ঘোষণা করবে না। Production mutation/deploy-এর ক্ষেত্রে
এই session-এর স্পষ্ট scope ও প্রতিষ্ঠানের release process অনুসরণ করো।
```

বিস্তারিত implementation: [IMPLEMENTATION.md](IMPLEMENTATION.md)। অবশিষ্ট release gates: [RELEASE_READINESS.md](RELEASE_READINESS.md)।
