# MisLoan implementation status

This release implements the accounting/security foundation of the approved microfinance roadmap. It is **not the completed end-to-end MFI system**. Each institution continues to run its own installation and database. Existing application data is not converted into posted financial balances.

## Delivered

- Removed unauthenticated web commands `/migrate`, `/clear`, `/storage-link`.
- New branch accounts receive an unguessable password. Creating a branch without an explicit PIN leaves branch login disabled; existing credentials are preserved.
- Savings application record access checks branch scope and active identity before viewing/editing, submitting, approving, activating, settling or deleting. Activation requires approved status; settlement requires active/matured status.
- Service worker v7 deletes previous cache versions and caches only same-origin build assets and icons. Authenticated documents/API responses are never stored by the new worker. Offline navigation displays a generic page.
- Super-admin accounting workspace at `/accounting`: chart accounts, non-overlapping branch periods, balanced journal posting, exact paisa amounts, reversal, period close, trial balance and paginated journal list.
- Posted journal service validates account activity, open period, branch access, personal identity, balanced lines, amount bounds and unique request identity. Entries retain actor, business date, timestamp and reversal reference. No posted entry edit/delete endpoints exist.
- Exact product quote service and authenticated `GET /loan-products/{loanProduct}/quote?amount=50000.00` endpoint. Amount is a decimal string; returned monetary amounts are integer paisa. Uses existing product tariffs and factors; includes a snapshot of the pricing fields. Last installment reconciles exactly to total payable and reports differences from the configured last-installment tariff.
- CI gates deployment on the foundation regression suite, dependency audit, frontend build, full test suite and TypeScript checks. Legacy diagnostics are uploaded as artifacts. The existing full-suite/type failures currently block automatic deployment.

### Reducing product pricing

The user's confirmed policy is to use existing Loan Product / Savings Product settings; loans use reducing pricing. The seeded products encode both an annual reducing percentage and an approved total service-charge tariff per thousand. The annual percentage is not itself a flat service charge. The new quote prioritizes the configured per-thousand tariff, then the approved installment factor for reducing products. A reducing product with only an annual rate is rejected until its amortization convention/tariff is supplied.

Reducing-loan EMI creation and disbursement service-charge/regular/final installment calculations now delegate to this service. Other legacy form/approval/client calculation paths still need migration; not all existing client/server calculation paths are unified. Savings accrual, early settlement, delinquency allocation and daily reducing amortization remain pending.

## Installation and operation

1. Use PHP 8.4 for the locked development/test dependencies and Node 22. Install extensions required by Composer (including mbstring, XML/DOM, ZIP, GD, PDO MySQL and SQLite for tests).
2. Run `composer install`, configure this institution's environment and run `npm ci && npm run build`.
3. Test the existing database upgrade on a staging copy and take a verified backup. The new accounting migration adds four tables; it does not change historical application balances.
4. Run `php artisan migrate --force` through the normal deployment process. Cache configuration/routes/views as appropriate.
5. A personal active super-admin can open Configuration → Accounting. Create the institution's approved chart and branch accounting periods before posting.
6. Existing branches with known default PINs must be rotated separately; new code deliberately does not disable live users silently.

The new service is a manual administrative ledger. Do not treat its trial balance as the institution's full financial position until audited opening balances and all transaction integrations have been migrated. Period close currently provides a posting lock; the full end-of-day cash/subledger reconciliation workflow is not implemented. There is no period reopen endpoint. Reversal requires another open period/date and preserves the original.

## Verification and limitations

Affected PHP dependencies were updated within the existing version constraints (including Laravel 12.71 and PhpSpreadsheet 5.11). Composer reported no remaining security vulnerability advisories after the update. This is a dependency-audit result, not a security certification.

- Foundation suite: **32 passed, 527 assertions**. Covers accounting balance/idempotency, reversal, period closure, exact money, product tariff examples, HTTP validation/authorization, savings branch isolation, maintenance route removal and PWA update behavior.
- Chromium smoke test exercised account/period setup, a 105.01 taka journal, reversal, trial balance and offline privacy. No page JavaScript exceptions. The browser used an isolated synthetic SQLite fixture, not a production database upgrade.
- `npm run build` succeeds; existing large-chunk warnings remain.
- Full suite after the security updates: **378 passed, 49 failed**. Project-wide TypeScript checks also have pre-existing failures. In particular, several old migrations issue MySQL `ALTER ... MODIFY ... ENUM` against the SQLite test database; stale form assertions and missing types also remain. They are tracked as follow-up work rather than hidden by changing those test expectations.
- Concurrent MySQL posting, complete MySQL migration/upgrade, load targets, production restore drills and institution-specific UAT have not yet been verified.
- Service-level immutability does not prevent a privileged database administrator changing tables directly. Production database permissions, append-only external audit retention and maker/checker journal approval remain pending.

## Remaining roadmap

| Workstream | Next deliverable |
| --- | --- |
| Security | MFA enforcement, private-document delivery, activation links instead of password emails, full authorization audit, dependency remediation |
| Data compatibility | Full MySQL migration rehearsal; legacy SQLite migration repair; fix existing test/type failures |
| Member identity | Permanent member master and admission/cycle mapping; duplicate identity reconciliation |
| Products | Persist versioned product policies and unify all frontend/backend pricing paths with golden examples |
| Accounting | Fiscal years, projects/funds, maker/checker vouchers, cash/bank books, reconciliation, financial statements, period-close controls |
| Loans | Separate loan accounts, persisted reducing schedules, disbursement posting, collection allocation, arrears/PAR, rebate/reschedule/write-off |
| Savings | Separate savings accounts and transaction ledger, deposits/withdrawals, holds, profit accrual and maturity settlement |
| Collections | Cashier settlement and handover, receipt lifecycle, field assignment |
| Android | Flutter client, encrypted local database, device authentication, idempotent offline collection sync and exception queue |
| Integrations | Payment adapters, verified callbacks, settlement statements, reconciliation and SMS |
| Members | Self-service statements, receipts, payment and complaints portal |
| Reporting | Portfolio/financial reports and signed-off MRA/PKSF/donor mappings |
| Migration | Audited opening balances, historical mappings and branch control totals; no fabricated repayment history |
| Operations | Isolated institution deployment automation, outbox/queues, monitoring, encrypted off-site PITR backup and measured RPO/RTO |
| Rollout | 2–3 branch pilot, full month-end UAT, production performance and staged branch rollout |

External prerequisites for the later production rollout are the audited opening balances, deployment access, payment-provider contracts/credentials, and current institution-approved reporting/settlement rules. They must not be fabricated from application statuses.
