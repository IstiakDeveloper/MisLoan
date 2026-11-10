# Loan workflow implementation

This increment implements the master plan's core loan workflow. It preserves the existing approval/forms and the user's choice of direct authorized-administrator disbursement after final approval. It does not certify regulatory acceptance or complete every future financial-policy feature.

## Daily workflow

1. Complete the existing admission, loan forms, verification and final approval. Required guarantor/nominee forms and pending amount changes are checked again at disbursement.
2. Open Loans → Loan Accounts & Collections. Search by member name, admission/application reference, branch or product.
3. In **Awaiting disbursement**, review the approved amount and exact product-based contract. Select the verified first due date, business date, principal-control account, collected-charge income account, payout cash/bank account and payout reference.
4. **Disburse & post financial account** records the source status/forms, frozen pricing, financial account, schedule and principal GL movement together. Closed periods or invalid GL selections roll everything back. Retries with the same opening terms replay the existing result.
5. Existing branch-only operational disbursements remain compatible and appear under **Disbursed · not posted** until reconciled. Choose an audited outstanding opening with an equity offset when historical cash is already in GL. Choose original disbursement only after verifying that cash was not already posted. No historical receipts are fabricated.
6. An account shows its member/application/product context, outstanding principal/charge, overdue total, contractual schedule, transaction history, printable statement/CSV and current principal-control reconciliation.
7. Collections preserve explicit component amounts and an immutable receipt identity. A valid frozen form split can fill the next wholly unpaid installment; partial receipts still need their verified split. Posted receipts cannot be edited/deleted. Corrections require a different reviewer and reverse the source receipt/GL together.
8. Full collection repays both account and application. An approved reversal reopens them when required.

## Product and form integrity

- `ProductLoanPricing` supplies EMI, controller service-charge calculations and final disbursement totals. Tariff/factor precedence matches the existing forms; final installments reconcile exactly.
- `FinalLoanTerms` requires an active product and final approved amount, enforces approval/product amount limits and saves the quote, frequency, count and duration consistently across agreement/application/approval form data.
- A pricing snapshot is saved inside `loan_agreement_data.product_pricing`; no new database column or migration is needed for this increment.
- The form's principal factor supplies an optional contractual component split. The final principal and charge reconcile separately. Invalid/negative component splits are not auto-suggested.
- `LoanContract` validates saved totals and snapshot/component consistency. New linked pricing snapshots and historical contract totals are immutable through source editing. Current product edits do not change the posted schedule or loan balance.
- Frontend form previews now reconcile the final due and use reducing installment factors instead of applying an annual reducing rate as a flat charge. Sufolon retains the existing form's annual-rate/tenure convention.
- Agreement/approval form entry points, application previews and standalone printing resolve saved pricing for disbursed/repaid loans. Complete legacy signed totals are preserved without claiming that a historical product snapshot exists. The final disbursed principal takes precedence over an earlier higher approved amount in those views.
- Read-only product inspection found both flat-labelled tariff products and a reducing-labelled Sufolon product in the configured database. No product records/rates were modified. Tariffs/factors, rather than label-based reinterpretation, determine contractual totals.

## Implementation locations

- `app/Services/Loans/FinalLoanTerms.php`: final quote/approval limits.
- `app/Services/Loans/ProductLoanPricing.php`: exact pricing and reconciled form split.
- `app/Services/Loans/LoanContract.php`, `LoanLedger.php`: immutable contract, source posting, schedule and collections.
- `app/Services/Loans/LoanWorkspace.php`: searchable work queue read models.
- `LoanLedgerController` and member `LoanApplicationController::disburse`: contract preview and atomic admin posting.
- `PATCH /loan-ledger/applications/{id}/disburse`: active personal super-admin endpoint; existing branch operational endpoint remains compatible.
- `resources/js/pages/LoanLedger/Workspace.tsx` and shared `components/finance/workspace.tsx`: task-focused UI.

## Remaining work and external gates

- Institution-approved automatic partial-payment priority, day-count/holiday rules, reducing amortization beyond the existing form tariff, rebate/early settlement, reschedule/write-off/recovery and penalty accounting.
- Product/branch GL default administration and formal effective-dated product policy approval. Current GL accounts are selected explicitly and validated when posting.
- Dedicated branch cashier roles/day-end, cash/bank reconciliation, official receipt/passbook templates and approved regulatory mappings.
- Production-copy upgrade/reconciliation, historical loan opening review, MySQL concurrency/load testing, financial UAT and rollout. Existing legacy accounts remain explicit audited openings.

Savings automation, private document delivery and the wider institution roadmap are tracked separately in `MICROFINANCE_MASTER_PLAN.md`.

## Verification for this increment

- Isolated SQLite full PHP suite: **512 tests / 2,824 assertions**, no failures. One existing admission-notification mock test emits a PHPUnit notice.
- Six frontend loan-pricing tests cover form/contract parity, final-installment rounding, reducing factors, Sufolon, zero charge, saved snapshot protection and complete legacy signed totals. Eight navigation regressions remain available in CI.
- TypeScript, targeted new-workspace lint and production build checks are run. Existing large export-bundle warnings remain.
- Headless Chrome exercised the actual loan workspace with synthetic Inertia data: work queues, disbursement review, account context, saved form split shortcut, schedule, correction request/review, and desktop/mobile overflow, with zero runtime exceptions.
- New financial regressions cover atomic disbursement, rollback on posting failure, duplicate retries, approval/form gates, invalid payout accounts, preserved product snapshots and component consistency.

The configured database was read only to inspect active product rules. No customer records were used for browser testing, and no live migrations, disbursements or other financial mutations were performed. This increment adds no migration.
