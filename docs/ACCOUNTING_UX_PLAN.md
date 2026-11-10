# Accounting workspace redesign

## Problem and design rule

The old `/accounting` page displays chart setup, period creation, journal entry, approval, posted history, trial balance and reversal together. A user must understand the implementation before finding the next task. Replace it with a task-based accounting workspace: **one page, one primary job**.

Keep existing exact-paisa posting, immutable journals, independent voucher review, source-ledger correction rules and period locks. This is a navigation, interaction and read-model redesign; it does not invent cashier/bank reconciliation or change financial policy.

## Page map

| Page | User's question | Content and primary action |
| --- | --- | --- |
| `/accounting` | এখন কী কাজ বাকি? | Branch context, setup readiness, pending/reviewable vouchers, posted journal balance, recent activity and shortcuts. No entry/setup forms. |
| `/accounting/vouchers` | কোন ভাউচার অপেক্ষায় আছে? | Search/date/status filters, maker/reviewer, submitted amount, status and a detail/review panel. |
| `/accounting/vouchers/create` | টাকা জমা/খরচের entry কোথায় দেব? | Guided receipt, payment or transfer; advanced balanced journal as a separate choice. Review before submission. |
| `/accounting/journals` | কোন হিসাব সত্যিই পোস্ট হয়েছে? | Immutable posted register, source/date/search filters, human-readable line details and eligible manual reversal request. |
| `/accounting/accounts` | কোন GL হিসাব ব্যবহার করব? | Searchable chart with type, code, activity and branch posted movement; small create-account dialog. |
| `/accounting/periods` | কোন তারিখে entry দেওয়া যাবে? | Branch periods, open/closed state, date coverage, create dialog and deliberate close confirmation. |
| `/accounting/reports` | কোন report দরকার? | Separate trial balance, income/expense, balance sheet and account-ledger views with shared branch/date context and exact exports. |

All destinations are real routes. Accounting subnavigation and the main sidebar link directly to the tasks. Branch filters remain in links, pagination, review and return paths. A header always identifies the selected branch.

## Ordinary entry flow

1. Choose **টাকা জমা / Receipt**, **টাকা খরচ / Payment**, **হিসাব স্থানান্তর / Transfer**, or **সমন্বয় জার্নাল / Journal**.
2. Enter business date, purpose/reference and amount. Select human-readable GL accounts; never type an internal account ID.
3. Receipt debits the selected cash/bank GL and credits the selected counter account. Payment reverses that direction. Transfer debits the destination and credits the source. Advanced journal supports multiple exact balanced lines.
4. Show a review summary: branch, date, amount, explanation and generated debit/credit lines.
5. Submit as **pending voucher**, not posted money. Show that another eligible administrator must review. Retain the request identity after an error and generate a new one only after success.

Loan collections and savings deposits/withdrawals have dedicated source-ledger workspaces. Show those links in the entry screen so users do not accidentally substitute a manual voucher for a member transaction.

## Approval and corrections

- A voucher detail panel shows every line with account code/name, maker, branch, business date, reason, status, reviewer note and linked posted journal.
- Approve/reject controls appear only for pending vouchers made by a different user. Require a clear decision note and preserve server validation errors.
- Journal details show source (`manual`, loan or savings), posting actor, exact lines and reversal links. Posted entries are never edited/deleted.
- Only an eligible manual journal can request a reversal. Loan/savings corrections direct the user to their source ledger. A reversal proposal still needs independent approval.
- Period close names the branch and date interval, explains that posting will be locked and requires an explicit confirmation step. It is not represented as completed cash/bank reconciliation.

## Visual and interaction system

- Calm slate/emerald styling, legible Bangla labels with concise English accounting terms, clear page title and one main call to action.
- Shared financial panels, exact formatted currency, descriptive status badges, short helper text and consistent spacing.
- Desktop tables for comparison; contained horizontal scrolling and stacked headers/actions on mobile. No whole-page horizontal overflow.
- Search, status and date filters; sensible default queues; contextual empty states and setup guidance.
- Accessible focus states, labels, keyboard dialogs/drawers, Escape/focus return and visible submitting/loading feedback.
- Forms appear only on their dedicated page or a focused dialog. Raw journal/voucher JSON and internal-ID entry are removed.

## Implementation sequence

1. Add page routes and a shared accounting frame; default overview remains `/accounting`.
2. Add filtered read models, summary and detail APIs. Keep existing mutation endpoints compatible.
3. Implement overview and guided voucher creation, then list/detail/review.
4. Implement posted journals and reversal request, chart and period management.
5. Redesign report selection into one visible report at a time.
6. Verify route authorization, exact generated lines, independent review, source correction restrictions, date/branch filtering, mobile and keyboard operation. Run existing financial regressions in an isolated database.

## Completion and limits

The redesign is complete when a user can find and perform each existing accounting task without scanning unrelated forms, and when a pending voucher is visibly distinct from posted money. Existing accounting data must remain unchanged by the redesign itself.

Dedicated cashier sessions/day-end, physical cash counts, bank-statement matching, product GL defaults, fiscal/project/fund dimensions and signed reconciliation close remain separate roadmap work. Do not show fake balances, completed reconciliation badges or working menus for those unimplemented features.

## Implemented on this branch — 2026-11-10

All seven destinations above are implemented. `/accounting` is an overview without entry/setup forms. Guided receipt/payment/transfer and advanced journal creation show exact debit/credit previews before pending submission. Voucher and posted-journal registers have focused detail drawers, independent review, linked journal navigation and eligible reversal requests. Chart and period setup use focused dialogs, including explicit period-close confirmation. Reports display only the selected trial balance, income/expense, balance sheet or GL ledger. Existing CSV exports remain available with accurate labels.

The sidebar and accounting task navigation expose the separate destinations. Branch context is carried through navigation and pagination; the chart shows selected-branch balances while account definitions remain institution-wide. Financial mutation services and their policy boundaries are unchanged. No schema migration or live financial write is required for this UI redesign.

Verification: isolated SQLite full regression suite; focused route/detail/filter/authorization coverage; frontend exact-paisa receipt/payment/transfer and invalid-journal coverage; TypeScript, targeted ESLint, production asset build; actual-component Chrome fixture checks for overview, guided preview, voucher details, reversal, account setup, period-close confirmation, selected reports and six mobile layouts. Browser fixtures do not perform live financial transactions. MySQL-specific execution and real institution acceptance remain release checks. One pre-existing PHPUnit mock-expectation notice remains unrelated to this change.
