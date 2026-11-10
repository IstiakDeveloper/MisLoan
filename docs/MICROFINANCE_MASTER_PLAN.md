# MisLoan: A–Z delivery plan

## Objective and existing workflow

Preserve the institution's existing Bangla/manual form formats and their staged approval process. Connect those approved forms to dependable financial accounts, receipts, schedules and reports. Loan Product and Savings Product settings are the source of product rules; signed historical contracts remain fixed. Each institution has its own installation/database. Password login is retained; two-factor authentication was removed at the user's request.

The business journey is:

`Organization → Samity → Member admission → Member/cycle → Product selection → Application/forms → Verification → Staged approval → Disbursement/activation → Financial account → Daily transactions → Statements/arrears → Settlement → Reconciliation/close`

An approved application is not proof that money was paid or received. Application workflow, physical cash movement and posted financial history must be linked explicitly and reconciled.

## Current findings

| Area | Existing capability | Gap to close |
| --- | --- | --- |
| Forms and approval | Existing admission, agreement, guarantor, nominee/death-risk, investigation and approval forms; HO/team approval and amount-change flows | Preserve formats; consistently show workflow stage, missing requirements and next permitted action |
| Product pricing | Exact backend quote from approved tariff/factors; saved-contract validation | Some form/client/legacy paths still independently calculate; product rates can change before financial opening; no persisted pricing policy version |
| Disbursement | Branch marks approved, form-complete applications disbursed | Workflow update is separate from financial posting; duplicate/concurrent submission and mismatched product/installment terms need stronger controls |
| Loan financial account | Audited opening/original-disbursement modes, frozen terms, total installment schedule, split collections, corrections, statements, PAR | Manual IDs and fragmented screens; product/branch GL mapping, initial-posting review and linked workflow need completion |
| Savings | Approved/active applications, ledger, holds, withdrawals, manual profit, corrections | Activation-to-account integration; approved accrual/tax/penalty/maturity rules and initial-posting review |
| Accounting | Exact paisa, balanced journals, vouchers, period locks, reports and control checks | Product/branch defaults, cashier session/day-end, bank reconciliation, fiscal/project/fund dimensions and signed close |
| Administration | Shared module shell, role-filtered navigation, search/favorites, password login | Consistent page-level design system and complete server authorization/document review |
| Deployment | Automated feature verification and prior SQLite/MySQL checks | Current isolated upgrade rehearsal, legacy balance reconciliation, restore/load testing and institution UAT |

## Phase 1 — Foundation and professional UI/UX

1. Inventory every existing screen, route, role and printable form. Record each destination's purpose, permitted identities, read/write actions and source of truth.
2. Standardize page headers: module eyebrow, useful title/description, breadcrumb, contextual status, primary action and overflow actions.
3. Use a restrained emerald/slate palette, clear typography supporting Bangla, consistent spacing/borders, accessible contrast and visible focus. Reserve red for errors/destructive actions and amber for attention.
4. Provide searchable/filterable work queues, consistent status badges, dates/currency, empty states, loading feedback, field-level errors and pagination. Retain filters after actions.
5. Use searchable member/application/product pickers rather than requiring internal IDs. Show branch, samity, member, application and product context before posting.
6. Separate task steps through tabs or focused panels: overview, contract/schedule, transactions, approvals/corrections and documents. Avoid one enormous financial form.
7. Use a review step for money movement showing amount, business date, cash/bank account, reference, resulting balances and required approval. Disable duplicate submission; retain the same request identity for retries.
8. Make wide tables scroll within their container; keep key identity/actions usable on mobile. Print views preserve original form dimensions and hide app chrome.

Done when the same task patterns behave consistently across loan, savings, accounting and administrative pages, and desktop/mobile/keyboard checks pass using representative roles.

## Phase 2 — Product policies and exact contract pricing

1. Audit every Loan Product/Savings Product field and existing form calculation against approved examples. Document tariff precedence, duration/count/frequency and rounding.
2. Use one authoritative backend quote for financial posting. Frontend calculations are previews and cannot override server totals.
3. Save product/pricing snapshots on newly finalized contracts, including principal, charge, installment count, regular/final totals, frequency, duration, pricing source and rule version. Preserve historical signed terms and display snapshot differences.
4. Require exact principal + charge = total payable = sum of installments. Reject inconsistent saved terms rather than guessing a correction.
5. Version future policy edits with effective dates and maker/checker audit. Existing disbursed contracts do not reprice when a product is edited.
6. Keep savings deposits separately identified from loan principal/charge; no automatic deduction/netting without an approved posting rule.

Done when identical product inputs produce identical form/disbursement/ledger totals and golden examples include regular/final rounding, zero charge, weekly/monthly/lump sum and policy changes.

## Phase 3 — Complete the loan operational chain

### Application and approval

- Retain existing forms, member eligibility, cycle restrictions, required signatures/documents, guarantor/nominee checks and staged approval.
- Show a readiness checklist and separate requested, approved, disbursed and outstanding amounts.
- Approved-amount/product changes follow reapproval rules. Preserve actor/time/reason and signed versions.

### Disbursement and financial opening

- Lock/recheck the application during disbursement; reject concurrent/conflicting submissions and amounts beyond approval.
- Freeze exact final pricing and reconcile the form fields/count/frequency used by the ledger.
- Configure branch/product principal-control, charge-income and cash/bank accounts with explicit validation. Existing loans use audited opening balances rather than duplicating historical cash disbursement.
- Connect the operational disbursement to an explicit financial posting queue. Show unposted applications and link posted accounts back to their source.
- Require verified first due date, business date and reference; use the saved schedule convention. Closed periods, missing account mappings or inconsistent contracts prevent posting.
- The user chose direct disbursement by an authorized administrator after existing final loan approval, without a new maker/checker stage. Post application/account/schedule/GL atomically with auditable retries. Receipt corrections continue to require independent review.

### Collections and lifecycle

- Search accounts by member/application/product/branch; show opening, paid and outstanding principal/charge, next due and arrears.
- Record an immutable receipt with a stable request identity and exact principal/charge split. Prevent current and historical component overcollection.
- Allocate paid total against earliest contractual dues. Automatic component allocation requires the institution's approved example; explicit split remains available until supplied.
- Keep cash/GL/source receipts atomic. Show receipt references, payment methods and printable statement/export links.
- Independently review corrections with no self-approval; revalidate dates, balances and periods at approval. Never delete posted receipts.
- Full repayment settles both account and source application. Approved receipt reversal reopens both when needed.
- Early settlement/rebate, rescheduling, write-off/recovery and penalties require explicit policy, accounting mappings and audit/reversal tests before enablement.

### Reports and checks

- Loan register, disbursement/unposted register, collection register, daily member/account statement, schedule, due/arrears and branch/product portfolio.
- Historical as-of reports, accurate days past due and existing PAR definitions. Disclose accounts not yet migrated/posted.
- Reconcile loan principal subledger to GL, receipt totals to cash/bank postings and schedule totals to the saved contract.

Done when an approved form-complete loan can be processed through verified financial opening, collection, correction, repayment and reporting with exact conserved totals and tested permissions/idempotency. Policy-dependent automation remains explicitly listed until approved.

## Phase 4 — Complete the savings chain

- Preserve existing application, nominee and approval forms. Connect approved activation to an explicit financial account with frozen product/maturity terms.
- Support eligible deposit frequencies and installment dues, deposits/withdrawals, holds/release, balance history, receipt/passbook and statements.
- Add approved profit policy versions: eligible balance basis, day count, accrual interval, compounding, tax, rounding and liability/expense mappings.
- Complete maturity and premature settlement with approved profit/penalty/tax treatment. Revalidate balances/holds and require independent review for sensitive corrections.
- Reconcile principal/profit/tax liabilities to GL. Never infer historic receipts from application amounts.

Done when worked savings-product examples reconcile from approved activation through maturity/closure and corrected transactions preserve both subledger and GL.

## Phase 5 — Accounting, treasury and period close

- Product/branch posting mappings, opening-balance migration review and explicit GL dimensions.
- Cashier opening float, receipts/payments, counted cash, variance explanation, independent day-end approval and handover.
- Bank accounts, transfer clearing, bank statement matching, unmatched items and reconciliation sign-off.
- Fiscal years, project/fund dimensions, period close checklist and retained close evidence. No close while unresolved material differences remain.
- Trial balance, income/expense, balance sheet, cash/bank books and supporting schedules with approved mappings.

## Phase 6 — Member identity, security and audit

- Permanent member identity with admission/cycle compatibility; reviewed duplicate merging and immutable mapping history.
- Private document delivery with record/branch authorization and verified legacy-file migration.
- Active personal administrator boundaries, branch/area/zone scoping, password policy, session revocation and action audit. No two-factor requirement.
- Parameter validation, upload controls, exact money/date validation, spreadsheet-safe exports and protected backups.

## Phase 7 — Channels and integrations

- Institution-approved payment and SMS adapters with idempotent callbacks, settlement matching, outbox/retries and delivery monitoring.
- Member portal for statements, payment references and complaints with verified identity/access.
- Android/device registration, revocation, encrypted offline storage, conflict-aware collection sync and duplicate receipt prevention.

## Phase 8 — Production acceptance

1. Compare real deployment/schema with the branch; never run test suites or destructive migrations on the live connection.
2. Rehearse upgrades/restores on an isolated, access-controlled production copy. Reconcile aggregate opening balances and sampled original documents.
3. Run SQLite and disposable MySQL regressions, workflow/browser checks and fault/concurrency tests.
4. Load-test agreed workloads for the intended 500 branches / roughly one million members / 2,000 concurrent users. Record measured latency, capacity, RPO/RTO and recovery evidence.
5. Obtain institution sign-off on financial rules, statements, regulatory/donor mappings and month-end procedures.
6. Pilot 2–3 branches, reconcile daily, review incidents, then roll out gradually with monitoring and tested rollback/restore procedures.

## Immediate implementation order

1. Loan source/ledger search and professional account workspace; eliminate internal-ID-only tasks.
2. Exact product-to-disbursement contract consistency and preserved pricing snapshots.
3. Disbursement-to-financial posting linkage using the confirmed direct-administrator model.
4. Collection/correction UX, source links, account history and reporting validation.
5. Savings integration, accounting controls and the remaining phases above.

## Pending institution inputs

Accounting UI implementation: see [ACCOUNTING_UX_PLAN.md](ACCOUNTING_UX_PLAN.md). Separate operational screens, guided exact voucher previews, independent review drawers, chart/period dialogs and single-report views are implemented; cashier/day-end, bank reconciliation and product GL defaults remain roadmap items.

The user directed pricing to follow the existing four-page form and product settings, and selected direct administrator disbursement after final approval. Full-installment component splits can follow the form factors when they reconcile; partial receipts remain an explicitly verified component entry. Still needed for further automatic financial behavior: reducing day count/holiday handling, partial-payment priority beyond the form's fixed split, rebate/reschedule/write-off rules, savings accrual/tax/penalty examples, approved regulatory mappings and official receipts/passbooks. Continue independent implementation while gathering these inputs. Do not label the institution production-ready from code completion alone.

## Loan work implemented from this plan

- Searchable branch/product/member work queues for accounts, final-approved applications and disbursed/unposted applications.
- Focused account workspace with overview, collections, schedule, transactions and independent correction reviews.
- One exact backend product quote for EMI/service-charge/disbursement; reconciled final installment and guarded disbursement within approval.
- Product-pricing snapshot and reconciled form component split frozen at disbursement; historical contracts are not repriced.
- Direct authorized-administrator disbursement posts application, account, schedule, receipt and GL in one transaction. Failure rolls back source changes; identical retries do not duplicate cash.
- Contract preview/readiness, verified GL account/date/reference selections, safe audited-opening workflow and form-based full-installment collection shortcut.
- Existing forms/date stamping, historical reports/statements, correction approval and principal-control checks remain in the flow.

See `LOAN_IMPLEMENTATION.md` for current scope, verification and remaining gates.
