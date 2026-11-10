# Institution release gates

This repository targets separately hosted institutions, not SaaS. This checklist records remaining delivery gates; it is not a completion certificate or a percentage score. A green CI run does not certify a full microfinance operation.

## Implemented and testable on this branch

- Exact money, posted journals, open-period controls, source-ledger corrections, trial balance and principal/liability control-account comparisons.
- Loan accounts from verified saved contracts, contractual total schedules, explicit principal/charge collections, historical portfolio/PAR, settlement on full collection and independently approved loan receipt corrections.
- Savings accounts, deposits/withdrawals, holds, manually approved profit, reversals and zero-balance closure.
- Posted GL income/expense, balance sheet, date/branch account ledger, exact CSV exports, loan/savings printable statements and statement CSV.
- Removal of public maintenance routes, authenticated-data service-worker caching and common-password credential emails/default branch-PIN migration behavior.
- Independently reviewed manual vouchers/reversals and savings corrections, privileged account/role mutation guards and minimum eight-character personal password changes. Two-factor authentication was removed at the user's request; personal administrators use password login.
- SQLite/MySQL regression tests, frontend compilation/type checks and required feature-branch CI.

## Required policy decisions before the remaining financial automation

| Decision | Needed detail | Current behavior |
| --- | --- | --- |
| Collection allocation | Partial installments, priority of principal/charge/penalty and rounding reconciliation | Principal/charge entered explicitly; total dues covered FIFO |
| Reducing amortization | Day count, repayment dates, rounding, holidays and approved examples | Saved signed totals preserved; no invented principal amortization |
| Early settlement | Rebate eligibility, earned/unearned charge, effective date and approval | Collect outstanding components; no automatic rebate |
| Rescheduling | Eligible status, approval levels, new terms, arrears treatment and accounting | Not implemented |
| Write-off/recovery | Provision/expense/control accounts, authority, recovery treatment | Not implemented |
| Savings profit | Eligible balance basis, rate version, accrual/posting intervals, compounding and tax | Manual approved profit only |
| Premature maturity | Penalty/reversal/tax rules and permitted holds | Penalty-dependent settlement blocked |
| Reporting | Current approved MRA/PKSF/donor codes, mappings and signed-off examples | Operational reports only |

Product percentages/tariffs alone do not define all these rules. Institution-approved examples must be recorded as golden tests before automatic financial posting is enabled.

## Technical work still required

- Private-document storage/delivery and full route/role authorization review, including remaining sensitive modules. Financial workspaces and privileged account/role changes require an active personal super-admin. Existing shared branch PINs need institution-managed rotation.
- Maker/checker approval for initial loan/savings postings and other sensitive financial operations. Manual vouchers/reversals, loan receipt corrections and savings corrections now require independent review.
- Fiscal/project/fund dimensions, cashier day-end/handover, cash/bank reconciliation and period-close reconciliation sign-off.
- Permanent member identity/cycle mapping and audited duplicate reconciliation.
- Versioned product policy administration and migration of every legacy pricing/form path.
- Android/device authentication, encrypted offline storage, collection sync/conflict handling and device revocation.
- Payment/SMS provider adapters, verified callbacks, settlement matching, queues/outbox and delivery monitoring.
- Member self-service statements/payments/complaints and official receipt/passbook formats. Current downloadable statements are administrative posted-ledger views; Print/Save PDF uses the browser.
- Isolated deployment automation, production monitoring, encrypted off-site PITR backups, restore drills and staged branch rollout.

## Operational verification

Run `php artisan misloan:check-ledgers --json` against a staging copy before and after any data migration. It performs read-only checks for linked loan/savings control totals, unbalanced/empty journals, source journals without receipts and current unlinked disbursed loans. Exit 0 means only these automated checks passed. It does not verify undiscovered legacy balances, all accounts, original documents, financial policy or regulatory compliance.

Before deployment, run the new approval migrations, verify two independent personal reviewers and protect APP_KEY backups. Role/account mutation rights are now restricted to personal super-admins; validate the change against the institution's approved administration matrix. Rehearse upgrades on an audited production copy, reconcile opening balances and sample statements, verify independent correction reviewers, and test mail delivery/reset-token expiry without emailing passwords. The CSV exports require authenticated personal administrators and defend text cells against spreadsheet formulas. Printable statements show only verified ledger history; historical savings holds/available funds are not reconstructed.

Measure the requested 500 branches / approximately 1 million members / 2,000 concurrent users with realistic data, agreed latency and recovery targets. Perform backup restore and financial month-end UAT, then run a 2–3 branch pilot before wider rollout. These measurements and institution acceptance have not been performed.

No changes on this branch authorize a main merge or production deployment. Current branch implementation and external institution acceptance must be reviewed separately.
