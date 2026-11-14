# Local test accounting and October 2026 loan seed

The user explicitly authorized rebuilding **October 2026 disbursed contracts from current loan products for test use only**. This differs from normal historical migration: the rebuilt figures are synthetic test terms, not certified historical signed contracts.

## Applied local result

- Database: local `mis-loan`; selected disbursement month: October 2026.
- 3,614 unposted applications already marked disbursed were rebuilt and financially posted across 42 branches.
- Principal preserved: BDT 606,817,000.00. Recalculated contractual service charge: BDT 93,868,904.00.
- 24,203 exact installment rows, 3,614 source loan transactions and 3,656 balanced journals (3,614 disbursements plus 42 explicitly synthetic test-funding entries).
- Six active `[TEST]` GL accounts: cash, loan-principal control, savings liability, synthetic capital, collected service-charge income and office expenses. Existing GL definitions were preserved.
- 84 open accounting periods: October and November 2026 for each affected branch.
- No customer repayments, savings balances, interest accruals or real bank funding were fabricated. The savings GL is setup only; no savings applications/accounts are seeded by this command.
- Already repaid loans, pending-disbursement applications, other months, original product definitions and user credentials were preserved. No approval workflow was advanced.

The first due date is a **test convention**: seven days after payout for weekly loans, one month for monthly loans, and product duration after payout for lump-sum loans. Source disbursement date/principal are preserved. Agreement/approval-form figures and product snapshots are rebuilt consistently, with a `test_rebuild` notice and backup reference; source remarks and financial descriptions carry test labels. Rebuilding uses current product settings, including products retained for historical reference, rather than changing product definitions or rechecking current product eligibility as a new approval.

## Command

```sh
# Read-only preflight; no data changes.
php artisan demo:seed-finance --month=2026-10

# Explicit local/testing-only application, after preflight succeeds.
php artisan demo:seed-finance --month=2026-10 --apply
```

This command is separate from `DatabaseSeeder`. Do not run general seeders against populated data: existing category seeders may truncate tables. The dedicated command refuses production environments, never edits a loan that already has a financial account, backs up original records before any mutation, validates source fingerprints and applies its financial changes in one transaction. A failed posting or reconciliation rolls the entire seed back. Existing closed/overlapping periods are respected. Retrying the completed October run reports 3,614 already posted and creates zero new records.

Private original-record backup for this run:

`storage/app/private/test-seeds/2026-10-20261110-144838-fd5d87c1.jsonl`

The file contains sensitive original application records. It is outside public storage and excluded from version control. Keep it private. It is a source-record backup, not a full database snapshot or an automatic ledger rollback mechanism; do not overwrite posted source contracts to restore it independently of the ledger.

## Verification

- All 3,614 original source records checked: status, principal, disbursement date, requested/approved amount, product, branch/member identity and approval/disbursement actors unchanged.
- Zero October disbursed applications remain unposted; zero schedule-total mismatches.
- GL debit and credit both 121,363,400,000 paisa; principal control equals subledger principal at 60,681,700,000 paisa across the 42 branches.
- Zero customer repayments created; the 1,829 previously pending applications remain pending.
- Isolated feature regressions cover dry-run scope, backups, current-product terms, exact schedule, original payout preservation, repeat runs, transaction rollback, closed periods and production/month guards.
- Full isolated PHP suite: 528 tests / 3,070 assertions passed, with one pre-existing notification-mock PHPUnit notice. Read-only controller smoke checks against the seeded MySQL data returned 200 for the loan list, a loan detail, branch accounting overview and October financial reports; report trial difference was zero.

Open the loan ledger to browse the posted accounts, or select an affected branch in Accounting and run financial reports covering October 2026. This dataset is for application testing and must not be used as institutional financial statements without restoring/reconciling the real records.
