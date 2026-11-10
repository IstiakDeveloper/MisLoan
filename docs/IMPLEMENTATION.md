# MisLoan implementation status

This branch implements the accounting/security foundation and the first transactional savings-ledger increment of the approved microfinance roadmap. It is **not the completed end-to-end MFI system**. Each institution continues to run its own installation and database. Existing application data is not converted into posted financial balances.

## Delivered

- Product-linked loan operations now include a professional searchable account/disbursement work queue, exact frozen disbursement quotes, reconciled form component splits and an atomic administrator disbursement/account/schedule/GL endpoint. Existing branch operational disbursements remain visible as unposted until reconciled. Saved form/print views preserve disbursed contract pricing after product edits. See [LOAN_IMPLEMENTATION.md](LOAN_IMPLEMENTATION.md) and the complete [MICROFINANCE_MASTER_PLAN.md](MICROFINANCE_MASTER_PLAN.md).

- Removed unauthenticated web commands `/migrate`, `/clear`, `/storage-link`.
- New branch accounts receive an unguessable password. Creating a branch without an explicit PIN leaves branch login disabled; existing credentials are preserved.
- Savings application record access checks branch scope and active identity before viewing/editing, submitting, approving, activating, settling or deleting. Activation requires approved status; settlement requires active/matured status.
- Service worker v7 deletes previous cache versions and caches only same-origin build assets and icons. Authenticated documents/API responses are never stored by the new worker. Offline navigation displays a generic page.
- Super-admin accounting workspace at `/accounting`: chart accounts, non-overlapping branch periods, balanced journal posting, exact paisa amounts, reversal, period close, trial balance and paginated journal list.
- Posted journal service validates account activity, open period, branch access, personal identity, balanced lines, amount bounds and unique request identity. Entries retain actor, business date, timestamp and reversal reference. No posted entry edit/delete endpoints exist.
- Exact product quote service and authenticated `GET /loan-products/{loanProduct}/quote?amount=50000.00` endpoint. Amount is a decimal string; returned monetary amounts are integer paisa. Uses existing product tariffs and factors; includes a snapshot of the pricing fields. Last installment reconciles exactly to total payable and reports differences from the configured last-installment tariff.
- CI gates deployment on the foundation regression suite, dependency audit, frontend build, full test suite and TypeScript checks. Verification diagnostics are uploaded as artifacts. A MySQL 8.4 feature-test job is also required; pushes to feature branches run verification without deploying production.

### Transactional savings ledger

Personal active super-admins can use Configuration → Savings Ledger (`/savings-ledger`). An active savings application is linked to one financial account with a fixed product/maturity snapshot. An explicit opening amount and verification reference are required; a nonzero opening requires an equity offset and a matching journal. The application's form amount is never treated as cash already received.

Deposits, withdrawals, manually approved profit and reversals post to the account ledger and GL atomically. Requests are idempotent; row locks serialize account operations. Holds reduce available funds; release is audited. Withdrawals cannot overdraw current or historical daily balances. Source journals cannot be reversed independently in the manual accounting screen. Account closure requires zero balance and no active holds. Legacy settlement/deletion paths reject applications that already have a financial ledger.

A branch control-account comparison shows savings subledger liability, GL liability and any difference, including unmatched manual GL adjustments. This is not a full cash/bank reconciliation system. Profit calculation/accrual, premature-withdrawal penalty settlement, automatic maturity and member passbook/PDF delivery remain pending. A product that disallows early withdrawals is enforced from the saved snapshot; a premature withdrawal requiring a penalty is blocked until that settlement workflow is implemented.

### Transactional loan ledger

Personal active super-admins can use Configuration → Loan Ledger (`/loan-ledger`). A disbursed application is linked to one account, a frozen contractual snapshot and persisted weekly/monthly total-installment dates. The saved principal, charge, installment count and regular/final amounts must reconcile exactly. Current product settings never reprice the signed disbursed contract. The first due date is explicitly verified; monthly dates retain their original month-end anchor. Holidays are not shifted automatically.

Opening supports either original disbursement (full original principal/date, cash/bank offset) or an audited existing outstanding balance (equity offset). Never post an original disbursement already included in the GL. Imported principal and charge are declared separately; the difference from the full contract is opening paid credit, not fabricated receipt history. An open accounting period is required even for a charge-only opening.

Collections require explicit principal and service-charge amounts pending institution-approved automatic allocation rules. Both components are exact paisa; each cannot exceed its remaining contractual balance, including on subsequent dates after a backdated receipt. Total paid credit covers earliest scheduled dues first. The due table is not a per-installment reducing principal amortization schedule. Uncollected contractual service charge stays off the GL; charge income is recognised on collection (cash recognition). Accrual accounting and early-settlement rebates are not implemented.

Principal movements, cash and collected charge income post atomically to the GL with immutable source receipts and idempotent retries. Only a source-ledger receipt reversal can offset the receipt and GL together; opening/disbursement correction is not supported here. Full collection closes the account and marks the source loan repaid; reversing it reopens both. Linked source financial terms/status/deletion and legacy manual settlement are guarded. Historical statements, total dues/overdue and current branch principal control-account reconciliation are available. Permissions currently restrict this workspace to personal active super-admins; branch cashier roles and maker/checker approval remain pending.

### Independent approval for loan receipt corrections

The Loan Ledger's receipt reversal action now creates a pending correction request instead of changing money immediately. A different personal active super-admin must approve or reject it with a decision note. Requester, original receipt/account, proposed business date/reason, reviewer, decision time/note and posted reversal are retained. The same person cannot review their own request; branch accounts, inactive users and ordinary staff cannot review. Only one pending request per original receipt is accepted. Rejected requests remain in history and a new proposal can be submitted.

Approval posts the immutable receipt reversal and matching GL reversal in the same database transaction as the final decision. Request/review retries do not duplicate money. Closed periods, changed balances or other posting failures roll back approval and keep the request pending. Its requested date is immutable; reject and submit a new proposal for an open date when required. Chromium verified a pending request without balance changes, blocked self-approval and a second administrator approving the matching account/GL reversal without JavaScript errors. The approvals panel shows current workflow state even when the account statement uses a historical date.

This approval requirement applies to the public loan receipt correction endpoints. The underlying loan posting service remains the internal financial primitive. Initial source-ledger postings still need their own approval workflows; manual vouchers and savings corrections now have independent approval too. This is not institution-wide maker/checker enforcement. Institutions need at least two eligible personal administrators to approve these loan corrections. The new correction-request migration must run before using the updated workspace.

### Loan portfolio and delinquency

Configuration → Loan Portfolio (`/loan-portfolio`) provides an operational as-of-date report for personal active super-admins. It includes branch filters, outstanding principal/contractual charge, overdue total installments, earliest unpaid due and days past due, principal-at-risk buckets (1–30, 31–60, 61–90, 91+ days), and PAR >30 / >90. The PAR numerator is the entire outstanding principal of affected loans; its denominator is outstanding principal across the selected financial ledgers. A zero denominator is displayed as not applicable. Due today is not overdue; exactly 30/90 days does not enter the respective >30/>90 ratio.

Historical reports aggregate immutable transactions up to the selected business date, including reversals on their correction date. Current closed status does not erase prior balances. Paid credit covers earliest dues first, including explicitly declared pre-opening paid credit. Accounts before their audited opening are excluded. Current disbursed applications without any financial ledger and accounts opened after the selected date are counted separately to disclose incomplete coverage; the current unlinked count is not a reconstructed historical population. There is no claim of institution-wide completeness or regulator-approved provision classification.

Summary/detail are read in one database transaction. Branch-filtered aggregates scope receipt/schedule queries to that branch, SQL window totals identify earliest unpaid dues, and detail is paginated. Monetary totals and percentages use integer/string arithmetic. This is a live operational report; production-scale query performance, immutable report snapshots, export, and approved MRA/PKSF mappings remain pending.

### Manual voucher and savings correction approvals

The accounting workspace's manual journal submission and reversal endpoints now create frozen proposals. A different personal active super-admin approves/rejects with a note; only approval posts a journal. Normalized exact lines, proposed business date, description, maker, reviewer, decision and journal link are retained. Identical request/review retries replay without duplicate money. Approval revalidates active accounts, branch scope and accounting periods; posting failure rolls back the decision and leaves it pending. Reject/resubmit if a date/account must change. Source-ledger journals cannot be reversed through manual voucher proposals. Existing posted journals remain unchanged. The internal JournalService remains the financial posting primitive for source integrations and approved vouchers.

Savings reversal requests now require the same independent review through the Savings Ledger approval panel. One pending request per original transaction, identity-scoped idempotency, immutable requested date/reason, rejection history and atomic GL/subledger reversal are enforced. Review rechecks current funds, holds, historical overdrafts, account status and open periods. Closed savings accounts are not automatically reopened by this workflow. Initial savings deposits/withdrawals/manual profit and initial loan postings are still immediate administrative postings; approval is not yet institution-wide.

### Password login and account administration boundaries

At the user's explicit request on 2026-11-10, two-factor authentication was removed. Login uses the existing password or branch login flow, with no TOTP/recovery challenge, enrollment screen or financial session-proof requirement. Existing encrypted enrollment columns remain hidden and unused for database compatibility; no destructive migration is required. The retired `FINANCIAL_MFA_REQUIRED` environment flag has no effect. Financial workspaces, portfolio/reports and statement downloads still require an active personal super-admin through `financial.admin` middleware.

Role administration and account/credential/session mutations require a personal active super-admin. Organizational user/session directory GET access remains under its existing head-office guard; a `has_all_access` flag or Head Office role does not confer account mutation/role escalation authority. The user/roles/session UI reflects the restriction. This is a focused boundary repair, not a claim of a complete authorization audit across all modules. New personal password changes/resets/creation require at least eight characters; branch PIN rules remain separate and existing passwords are not rewritten.

Deployment must run both approval migrations before opening the workspaces and verify two independent personal reviewers. Keep APP_KEY recoverable with protected backups. The two-factor removal requires fresh application configuration/routes and a rebuilt frontend. Current regression tests verify password login with legacy enrollment present, direct administrator workspace access, removed challenge/enrollment routes and unchanged role boundaries. Earlier TOTP verification results below describe the previous implementation.

### Posted financial reports, statement delivery and integrity checks

Configuration → Financial Reports (`/accounting/reports`) provides branch/all-branch and date filters, opening/period/closing trial balances, period income/expense, cumulative balance sheet with the unclosed income/expense result, and paginated account ledger. Running balances include opening and prior pages; inactive accounts keep their history. SQL window sums and decimal casts preserve exact running totals above JavaScript's safe-integer range. CSV exports use a consistent database transaction, exact decimal amounts and formula-safe text fields.

Loan/Savings Ledger workspaces include printable statements (browser Print / Save as PDF) and full CSV downloads. Statements use business-date transactions and source references/reversals, validate verified-opening limits, escape printed content and return private/no-store responses. Print is limited to 2,000 rows with an explicit truncation notice; its closing balance and full CSV include all entries. Historical savings holds and available funds are not fabricated. These are administrative statements, not approved passbook/receipt forms or member self-service delivery.

`php artisan misloan:check-ledgers --json` performs read-only control-account, journal-balance, source-journal and current loan-coverage checks. It exits nonzero on detected differences; a pass is not production approval. The complete remaining technical/policy/rollout gates are tracked in [RELEASE_READINESS.md](RELEASE_READINESS.md).

### Password setup email hardening

The existing credential-dispatch endpoints now send Laravel's expiring, single-use password-reset/setup links to active personal users' own email addresses. Existing passwords are not changed by dispatch. Only active personal super-admins can dispatch single/bulk links; branch/inactive accounts are skipped, role exclusions are validated, broker throttling is retained, and failures return a generic message with metadata-only logs. Branch summary emails contain no password, PIN or reset token. The unused plaintext-credential mailable/template were removed; the existing notification-pruning command still recognises the retired credential-mail name in legacy queue payloads. The legacy branch-account migration refuses a shared `--default-pin`, preserves configured PINs and leaves login unavailable where no PIN exists. Existing deployed shared passwords/PINs still require a separately managed rotation; this does not complete onboarding/MFA/security auditing.

### Reducing product pricing

The user's confirmed policy is to use existing Loan Product / Savings Product settings; loans use reducing pricing. The seeded products encode both an annual reducing percentage and an approved total service-charge tariff per thousand. The annual percentage is not itself a flat service charge. The new quote prioritizes the configured per-thousand tariff, then the approved installment factor for reducing products. A reducing product with only an annual rate is rejected until its amortization convention/tariff is supplied.

Reducing-loan EMI creation and disbursement service-charge/regular/final installment calculations now delegate to this service. Other legacy form/approval/client calculation paths still need migration; not all existing client/server calculation paths are unified. Savings accrual, early settlement, delinquency allocation and daily reducing amortization remain pending.

## Installation and operation

1. Use PHP 8.4 for the locked development/test dependencies and Node 22. Install extensions required by Composer (including mbstring, XML/DOM, ZIP, GD, PDO MySQL and SQLite for tests).
2. Run `composer install`, configure this institution's environment and run `npm ci && npm run build`.
3. Test the existing database upgrade on a staging copy and take a verified backup. The accounting, savings and loan ledger migrations add their own tables and a journal source marker; they do not infer or rewrite historical application balances.
4. Run `php artisan migrate --force` through the normal deployment process. Cache configuration/routes/views as appropriate.
5. A personal active super-admin can open Configuration → Accounting. Create the institution's approved chart and branch accounting periods before posting.
6. Existing branches with known default PINs must be rotated separately; new code deliberately does not disable live users silently.

The accounting workspace is a manual administrative ledger; savings and loan transactions posted through their new workspaces also update it automatically. Do not treat its trial balance as the institution's full financial position until audited opening balances and all transaction integrations have been migrated. Posting and period closure share a branch lock, and an earlier open period cannot be used to restate a later closed period. Period close currently provides a posting lock; the full end-of-day cash/subledger reconciliation workflow is not implemented. There is no period reopen endpoint. Reversal requires another open period/date and preserves the original.

## Verification and limitations

After the user-requested two-factor removal, the isolated SQLite feature suite passed **114 tests / 574 assertions**, including direct financial access, preserved role boundaries, password login for legacy-enrolled accounts and removal of enrollment/challenge endpoints. The navigation regression suite passed **8 tests**. The historical full-suite/MySQL and TOTP results below describe the earlier baseline.

Latest verification: **499 PHP tests passed** on SQLite and **113 feature tests passed** on MySQL 8.4, covering independent manual/savings approvals, MFA session proof, account-administration guards, financial reports/exports and credential setup. Dedicated MFA settings tests also verify the mandatory-enrollment notice. `npm run types` and the production build pass. Chromium exercised savings opening, deposit, hold, rejected overdraft, release, withdrawal and control-account reconciliation, plus loan contract preview, audited opening, split collection, FIFO dues, principal GL reconciliation and receipt reversal, with no JavaScript errors. The portfolio screen also exercises branch/date filtering and pre-opening coverage exclusion. Financial-report Chromium checks also cover trial/balance-sheet agreement, account ledger, CSV download and loan/savings statement delivery. These checks do not replace production-data upgrade rehearsal or financial UAT.

Affected PHP dependencies were updated within the existing version constraints (including Laravel 12.71 and PhpSpreadsheet 5.11). Composer reported no remaining security vulnerability advisories after the update. This is a dependency-audit result, not a security certification.

- Foundation regression tests cover accounting balance/idempotency, reversal, period closure, exact money, product tariff examples, HTTP validation/authorization, savings branch isolation, maintenance route removal and PWA update behavior.
- Chromium smoke test exercised account/period setup, a 105.01 taka journal, reversal, trial balance and offline privacy. No page JavaScript exceptions. The browser used an isolated synthetic SQLite fixture, not a production database upgrade.
- `npm run build` succeeds; existing large-chunk warnings remain.
- The earlier migration/test/type blockers have been repaired. Enum and text-column changes now use the database schema grammar; MySQL-only Unicode conversion is skipped on SQLite. Upgrade tests preserve existing admissions, dependent documents and Bangla text. Fixtures now include required user identity/roles and valid forms; disabled public registration/email verification remain disabled. Password-change tests assert session logout. Legacy configurable forms use a top-level typed form adapter, and missing response fields/types are declared explicitly.
- Fresh MySQL 8.4 migration and feature tests have been exercised. Concurrent stress tests, upgrades of a production database copy, load targets, production restore drills and institution-specific UAT have not yet been verified.
- Service-level immutability does not prevent a privileged database administrator changing tables directly. Production database permissions, append-only external audit retention and approval of initial source-ledger postings remain pending.

## Remaining roadmap

| Workstream | Next deliverable |
| --- | --- |
| Security | Private-document delivery and full onboarding/authorization audit; financial and privileged account boundaries require an active personal super-admin |
| Data compatibility | Upgrade rehearsal using an audited production database copy; legacy-data reconciliation |
| Member identity | Permanent member master and admission/cycle mapping; duplicate identity reconciliation |
| Products | Persist versioned product policies and unify all frontend/backend pricing paths with golden examples |
| Accounting | Fiscal years, projects/funds, approval of initial source postings, cashier/cash-bank reconciliation, approved financial statement mappings and period-close sign-off (manual vouchers/reversals require independent approval) |
| Loans | Approved automatic principal/charge allocation, reducing amortization conventions, holiday calendars, approved provisioning, rebate/reschedule/write-off (account, contractual total schedule, explicit split collection, GL posting, receipt reversal and operational portfolio/PAR reporting are implemented) |
| Savings | Automatic profit accrual, penalty-aware early settlement, maturity processing and passbook/PDF delivery (account/transaction ledger, holds and GL posting are implemented) |
| Collections | Cashier settlement and handover, receipt lifecycle, field assignment |
| Android | Flutter client, encrypted local database, device authentication, idempotent offline collection sync and exception queue |
| Integrations | Payment adapters, verified callbacks, settlement statements, reconciliation and SMS |
| Members | Self-service statements, receipts, payment and complaints portal |
| Reporting | Signed-off MRA/PKSF/donor mappings, immutable report snapshots and official forms (operational portfolio and posted GL reports implemented) |
| Migration | Audited opening balances, historical mappings and branch control totals; no fabricated repayment history |
| Operations | Isolated institution deployment automation, outbox/queues, monitoring, encrypted off-site PITR backup and measured RPO/RTO |
| Rollout | 2–3 branch pilot, full month-end UAT, production performance and staged branch rollout |

External prerequisites for the later production rollout are the audited opening balances, deployment access, payment-provider contracts/credentials, and current institution-approved reporting/settlement rules. They must not be fabricated from application statuses.
