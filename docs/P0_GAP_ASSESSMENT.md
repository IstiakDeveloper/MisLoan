# P0 assessment — 2026-11-10

This is a source review of the local Windows checkout, not a live-server or database assessment. No database commands, migrations or test suites were run during this assessment.

## Verified checkout

- Branch: `feat/mfi-accounting-security-foundation`.
- HEAD at review: `0fd776c`, including implementation baseline `c403f66` and the handoff documentation.
- Working tree was clean before this assessment.
- Installed CLI versions: PHP 8.4.17 and Node 22.20.0.
- No `AGENTS.md` was found by the repository file search.

## Findings and next deliverables

| Priority | Evidence | Required work and acceptance |
| --- | --- | --- |
| P0: private documents | `ImageCompressionService::DISK` is `public`. Member savings uploads also write directly to the public disk and generate `/storage/` URLs. Profile and user signatures use public storage too. `config/filesystems.php` defines a public storage link. | Inventory every sensitive field and caller; implement record-scoped authenticated delivery, private uploads and a resumable legacy-file migration. Verify guest, inactive-user and cross-branch denials, permitted print views, and removal of legacy public copies. Changing the shared compression disk alone is insufficient. Actual server exposure has not been checked. |
| P0: staging and data compatibility | The handoff requires isolated rehearsal. No live-server checkout, schema, backup or restore evidence has been inspected here. | Compare actual deployment commit and migration history; rehearse upgrade and restore on an isolated, access-controlled copy; reconcile aggregate ledger coverage and control totals. Do not infer deployed state from this local branch. |
| P0: source-posting approvals and day-end | The handoff identifies initial loan/savings financial postings and cashier controls as incomplete. Manual vouchers and receipt corrections already have independent review. | Extend maker/checker coverage while preserving atomic GL/subledger posting, idempotency and approval-time validation. Add cashier reconciliation and close controls with institution UAT. |
| Test isolation | `phpunit.xml` defaults to SQLite memory, but DB environment values are not forced. MySQL CI intentionally overrides them for its disposable feature-test database. `tests/TestCase.php` currently has no additional database safety guard. | Use a separate test checkout and explicitly verified disposable connection before running tests. A future safety guard must preserve the disposable MySQL CI job and prevent accidental production connections. |

## Policy-dependent work

Automatic reducing allocation, rebates, rescheduling, write-off/recovery, savings accrual/tax/penalties and official report mappings still require approved rules and worked examples. Existing product rates do not supply those conventions. Preserve signed contracts and explicit component collections until those decisions are recorded.

## Verification limits

The handoff records prior SQLite/MySQL, TypeScript, build and browser results; those results were not rerun in this checkout. Production exposure, migration status, original data reconciliation, restore capability, institution acceptance and target-scale performance remain unverified.
