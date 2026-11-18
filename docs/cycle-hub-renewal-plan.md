# Cycle Hub renewal plan

Status: implemented for Cycle Hub renewals. The ordinary Admission and Loan
Application controllers, form components, calculation helpers, and shared clone/
sync services remain unchanged. A cycle-specific middleware wraps only managed
cycle loans when reusing existing form save, print, and submission routes.

The local migration has been applied. Use `php artisan cycle-hub:audit` for a
read-only inventory before reviewing old records. The current local inventory
contains 94 unmanaged legacy admission copies (15 without loans) and 5 ambiguous
master groups. None were deleted, renumbered, or automatically backfilled.

New renewal creation rejects ambiguous master groups with an explicit review
message rather than choosing between duplicate member files.

## Verification of the implementation

Cycle-only identity fix: member code, NID, Smart Card, branch, samity and original
admission date are taken from the captured source, never a submitted/cached value.
The scoped editor keeps the other admission details editable. Unchanged mobile
numbers are inherited; changed numbers exclude this member's linked files but
still reject another member's number. Legacy clones are resolved through stored
parent/cycle links, and cycle saves do not run ordinary admission code-sync hooks.
Closed history and ordinary Admission/Loan Application validation are unchanged.
Verification for this fix: 66 related backend tests, four frontend draft tests,
and a production build passed. Project-wide TypeScript errors remain in existing
files; none are reported in the changed editor, sections or draft helper.

- All 22 new renewal tests passed, including independent documents, exact loan
  binding, unchanged-admission continuation, current signatures, stale revisions,
  incompatible forms, corrected/cleared values, Code 38 coexistence, existing
  submission validation, approval creation, and frozen repaid history.
- The full unit suite finished with 404 passing tests and three failures outside
  the changed application code: `LoanAwaitingTakeupTest` (its SQLite fixture lacks
  `responded_at`), `ProfitSavingsFormTest`, and `SavingsApplicationFormFieldsTest`
  (their expected savings-form text is absent). Those screens were not changed.
- The production frontend build passed. Global TypeScript checking still reports
  errors in existing files; no errors were reported for the five implemented or
  updated Cycle Hub pages.
- A headless Chrome smoke test used a separate SQLite fixture and synthetic branch
  user. Admission save, selection, opening the existing agreement form through the
  cycle wrapper, saving, and submission succeeded with no JavaScript exceptions.
  The fixture uses simplified authentication/sharing middleware; backend tests
  separately check branch access and existing save permissions. Source image bytes
  and attachment ownership are checked by the storage tests.
- The additive migration was applied successfully to the local MySQL database.
  Row-lock contention has not been stress-tested against MySQL; automated renewal
  tests use isolated SQLite databases.

Only the new migration and read-only audit were run against the normal local
database. The browser smoke test did not insert members or loans into that database.

## Required outcome and boundary

The existing Admission and Loan Application entry points, validation, form rules,
permissions, approval routing, calculations, and printing behavior must remain
unchanged. Implement renewal behavior through Cycle Hub routes, services, pages,
and additive storage. Read and reuse existing rules; do not change their defaults.

The intended flow is:

1. Open a new cycle from an eligible repaid loan.
2. Persist a separate copy of that cycle's member file, related rows, documents,
   and all previous loan-form payloads.
3. Review the copied admission; edit and save it only if necessary.
4. Choose the new category, product, and amount.
5. Prepare exactly the forms applicable to that selection under the existing rules.
6. Complete and save the fields required at the current workflow stage.
7. Submit through the existing loan validation and approval workflow.
8. Keep a separately identifiable dossier for this cycle. Original files remain intact.

## Code findings to address within Cycle Hub

| Finding | Evidence | Required cycle behavior |
| --- | --- | --- |
| Renewal links open ordinary admission edit and product selection routes. Some links identify only a member, rather than the exact loan. | `CycleHub/Index.tsx`; `MemberCycleHubController::cycleSurveyStartedResponse`; `CycleView.tsx` | Cycle links must resolve a cycle ID and its exact admission/loan IDs. Do not launch renewal by editing the master admission. |
| Admission cloning copies document paths. Ordinary admission updates delete replaced files and can restore master identity over posted clone fields. | `MemberCycleHubController::startNextCycle`; `MemberAdmissionController::update` | Use a cycle-specific admission editor and save service. Copy documents into cycle-owned storage; do not send its edits to ordinary admission update. |
| Previous loan JSON can override revised admission data. Previous round and approval comments survive copying. | `LoanApplicationCloneService::cloneAndMerge` | Use a cycle-specific preparation service with explicit field ownership and reset rules. Leave the existing clone service unchanged. |
| Cycle View hides generated prefill until it is marked saved. | `CycleView.tsx`; `LoanFormVisibility::buildFormSavedMap` | Show applicable copied and blank forms, with separate review/save/completion states. |
| A renewal admission can have neither Save nor Save & Loan when a draft loan already exists. | `MemberAdmission/Edit.tsx` | The Cycle Hub editor must always offer Save Draft when the cycle is editable. |
| Displayed rounds are recalculated by loan ID and include cancelled loans; search and next-cycle generation use different counters. | `MemberCycleHubController::search`, `buildLoanCycles`, `startNextCycle` | Store an explicit cycle number. Respect imported historical numbers; never renumber history on read/delete. |
| The next-cycle existence checks happen before the clone transaction. | `MemberCycleHubController::startNextCycle` | Lock the stable member record, recheck inside the transaction, and reuse the same open draft on retries. |
| Cycle Hub blocks on every active loan, while ordinary loan creation has separate regular/Code 38 rules. | `MemberAdmission::resolveActiveLoanCreate`; `MemberCycleHubController::startNextCycle` | Evaluate eligibility using the existing product-aware rules. Do not introduce a blanket Code 38 restriction. |
| A requested loan from another sister admission can be paired with the admission from the URL. | `MemberCycleHubController::showCycle` | Resolve admission, loan, and dossier from one cycle binding; reject mismatched combinations. |
| Repaid admission data and loan JSON are not universally frozen by ordinary editing/sync behavior. | `MemberAdmission::hasDisbursedLoan`; `MemberAdmissionLoanSyncService::syncBoundLoans` | Preserve independent cycle snapshots and cycle printing. Do not try to solve this by changing ordinary admission editing or shared sync semantics. |

Earlier verification in this session: 65 relevant existing tests passed. An
in-memory clone probe reproduced admission income 30,000 becoming 10,000 in a
new investigation payload, the previous guarantor/comment/round surviving, and
stored round 7 being displayed as rounds 1/2/3. File-loss and concurrency findings
are code-path risks, not claims that a production incident was reproduced.

## Implementation design

### 1. Give every renewal a persistent cycle identity

Add a cycle dossier table/model, provisionally `member_loan_cycles`, with:

- Stable master admission ID, source admission ID, source loan ID, and branch ID.
- Immutable cycle number, creator/officer, timestamps, and draft/submission state.
- The new cloned admission ID and, after terms are selected, the new loan ID.
- Source admission/form snapshots and current admission snapshot.
- Source product/category/schema information, selected terms, and applicable form IDs.
- Document manifest, draft revision number, and submission snapshot.

Keep source snapshots separate from the working loan payload. The source copy
preserves all old forms; only forms applicable to the new loan belong in the new
working application and final dossier. It is not necessary to copy old loan rows,
approval rows, or repayment transactions into a new loan.

Create a relational admission clone with the existing `previous_admission_id`
convention when needed by the existing loan workflow. The dossier is the durable
identity/history boundary; do not rely on mutable admission fields or member code
alone to identify a saved cycle. Keep the current member code and branch binding;
do not provide a second-enrollment/member-type toggle in the renewal editor.

Build a new Cycle Hub clone/preparation service instead of modifying
`LoanApplicationCloneService` or `MemberAdmissionLoanSyncService`. Verify ordinary
master lists and reports still show the member as before when cycle clones exist.

### 2. Start and resume safely

- Resolve an explicit source repaid loan and its linked admission, not the latest
  arbitrary loan having some JSON. Do not silently use a rejected, cancelled,
  supplementary, or newer draft loan as the source.
- If multiple source candidates are valid, expose the source cycle rather than
  guessing which historical file the officer meant.
- Lock the stable member row and recheck source eligibility, active-loan rules,
  existing open renewal, and cycle number before creating anything.
- Persist source snapshots and related family/asset rows. Record missing source
  documents as incomplete; never manufacture a successful attachment copy.
- Repeated clicks, timeouts, and requests from a second officer return the same
  editable draft. Enforce uniqueness in storage, not just with a disabled button.
- Copy documents to a cycle-owned namespace. Track only newly created paths for
  failure cleanup; never include any source path in a cleanup/delete list.
- A later edit must not remove an earlier referenced document version. Preserve
  the submitted versions in the document manifest.

### 3. Edit admission inside Cycle Hub

Use a Cycle Hub editor composed from existing presentational admission sections
where possible. Its endpoint writes only the cycle admission/snapshot. It does
not call ordinary admission update, master identity propagation, or broad sync.

Provide Save Draft, Continue, and Back to Cycle actions. An existing loan draft
must not remove Save. Show the source cycle, new cycle number, and the fact that
changes apply to this cycle. Allow corrections to copied admission details with
the existing field-format validation. Member identity/code reassignment is not
part of this renewal flow.

After editing, update admission-owned fields on the new loan only. Preserve
loan-only entries the officer already saved. Handle explicit clears and zero
values; do not restore old data merely because a new value is empty or zero.

### 4. Prepare forms using existing rules and explicit ownership

Read `LoanFormVisibility` and the current workflow configuration without changing
their behavior. Reuse existing product calculations and form variants. Validate
that the selected product is active, belongs to the selected category, and allows
the entered amount before creating/updating the new working loan.

Apply these ownership rules during cycle preparation:

| Data | Source for the new cycle |
| --- | --- |
| Member/contact/address/household/asset/guarantor values owned by admission | Current saved cycle admission |
| Loan-only business descriptions or other reusable form entries | Previous relevant form, where compatible, until edited in this cycle |
| Principal, category, product, service charge, tenure, installments, and totals | New selected terms and existing calculation rules |
| Cycle number and survey/proposal date | The new cycle record and the appropriate current date |
| Approval/disbursement/repayment dates and verification | Empty until the corresponding existing workflow action occurs |
| Approval comments, decisions, officer attestations/signatures, saved/completed flags | Reset; old records are reference material, not new authorization |

Inventory the actual keys in all five form JSON payloads, including nested
guarantor lists, asset/liability lists, family assets, and signature/image fields.
Implement a documented per-form mapping; do not depend on a broad JSON merge or
one common field-name assumption across forms.

When category/product/amount changes, update the same cycle/application, recompute
applicable forms and terms, remove inapplicable working columns, retain compatible
user entries, and mark affected forms for review again. Keep the original source
snapshot. Warn before discarding incompatible edits and preserve a draft revision
for recovery. Changing terms must never create a second application by accident.

### 5. Use the existing loan workflow through exact application IDs

Create one normal draft loan bound to the cycle's cloned admission after the new
terms have been validated. Generate its new application number and prepare its
relevant forms through the cycle service.

All edit/save/submit links must carry the exact new application ID, plus matching
member/product/category context where the existing endpoints require it. Do not
call ordinary `form-selection` to rediscover a cycle loan by member/product:
that path can create/reuse a different draft and refresh the master's round.

Reuse existing form screens and public save/submit actions when their explicit
`application_id` path is compatible. New cycle pages can compose existing
presentational form pieces when an ordinary page hard-codes an incompatible
route. Any adapter is cycle-specific and must retain the existing server-side
field validation, role checks, stage checks, and approval submission behavior.
Do not duplicate a weaker submit implementation or copy the previous approval
workflow onto the new loan.

Audit the integration for GET-time hydration and model/service side effects.
Opening the cycle dossier must be read-only. Ordinary form opening must not
replace prepared cycle data with the source loan. Assert that cycle actions do
not change the source admission, source loan, or source document bytes.

Show every applicable form with its state: copied/not reviewed, missing required
fields, saved, or required at a later stage. Required-at-submit must match current
Loan Application rules; do not require BM/disbursement work prematurely from FO.

Persist a submission snapshot once the existing submit action succeeds. A failed
submission retains the complete draft. Cycle history and cycle-specific print
use the stored version, so later ordinary master edits do not rewrite that file.
Subsequent approved/disbursed versions can be stored separately without replacing
the submission copy. Existing ordinary print routes retain their current behavior.

### 6. Finish history, permissions, retries, and draft handling

- Search returns stable member/cycle identities and accurate cycle counts.
- Resume, file view, admission edit, loan edit, and print resolve the same binding.
- Bind local draft keys to user + cycle + application + form, including revisions
  after terms changes. Never restore another cycle's cached payload.
- Apply branch, role, and existing stage permissions on every new route, including
  delete/update routes. Resolve branch from the member/cycle, not the user's default.
- Use a revision check to prevent two tabs/officers silently overwriting each other.
- Lock and recheck state on delete, submit, and repayment changes. A stale request
  must not delete a submitted cycle or reverse a newer state transition.
- Discarding a draft affects only cycle-owned draft rows/files. It must not delete
  the master, source admission, source loan, source documents, or another cycle.
- Allow submitted revisions only through the existing permitted workflow. Keep
  previous stored versions for the dossier.

## Implementation order and verification gates

1. **Baseline:** record existing Admission/Loan Application behavior, tests, and
   representative data relationships. Inventory form fields and side effects.
2. **Storage and clone:** add cycle provenance/snapshot storage and cycle-owned
   documents; implement locked, repeatable creation/resume.
3. **Admission editor:** add cycle-only edit/save and field ownership overlay.
4. **Loan preparation:** add selection, deterministic form mapping, same-draft
   terms changes, and exact-application form integration.
5. **Submission and dossier:** reuse current submission workflow, add clear
   completeness states, stable cycle navigation, saved snapshots, and cycle print.
6. **Regression and rollout:** complete the checks below before enabling renewal
   through the new path. Leave ordinary entry points unchanged.

| Check | Pass condition |
| --- | --- |
| Normal Admission and Loan Application entry points | Existing behavior/tests remain unchanged, including validation, forms, approvals, and prints. |
| First renewal and later renewals | Correct source, stable member identity, new application number, and correct stored cycle number. |
| Admission unchanged / revised | Continue works without editing; revisions populate new forms and never alter the source. |
| Zero/cleared values | Explicit new values survive save/reopen; old values do not reappear. |
| Forms and thresholds | Form IDs, variants, calculations, and stage requirements match the ordinary flow below/at/above current configured boundaries. |
| Weekly/monthly/Sufolon and Code 38 | Existing product-specific behavior is preserved. |
| Same-product and changed-product renewal | Compatible entries survive; incompatible old forms/approvals do not become new-cycle data. |
| Terms changes after saving | Same application ID; current totals/terms; affected forms require review; no stale hidden payload submitted. |
| Save/reopen/back/network retry | Server draft survives and resumes the exact cycle/application. |
| Parallel start / parallel edit / stale delete | One open draft, no duplicate number, no silent overwrite, no deletion after submit. |
| Attachments | Source bytes/paths remain usable after replacement, clear, failure, discard, and later-cycle edits. |
| Permissions | Existing FO/BM/branch/HO stage rules hold; cross-branch and mismatched IDs are rejected. |
| Submission | Missing current-stage requirements block submit; valid forms enter the existing workflow exactly once; later-stage forms are not prematurely required. |
| History and printing | Stored historical rounds respected; admission/loan/snapshot match; prior dossier versions do not change after later edits. |
| Ordinary master lists/reports | Clone records do not introduce duplicate members or change source values/counters as a side effect. |

Run behavioral regression tests against an isolated test database. Use a matching
database engine for lock/constraint/concurrency verification; SQLite unit tests
alone cannot establish production row-lock behavior. Add end-to-end checks for
the officer's Save, Resume, selection, form edit, submit, and print actions.

## Existing data and rollout

Produce a read-only inventory of current clone admissions, linked loans,
duplicate/open cycles, ambiguous rounds, and shared document references before
backfilling any provenance. Backfill only unambiguous bindings; mark ambiguous
records for review. Do not automatically delete duplicates, renumber historical
cycles, or repair ordinary Admission/Loan Application records as part of this work.

Keep incomplete/missing attachments visible. A missing old document cannot be
recovered by cloning a path. Preserve existing records while new cycles use the
new boundary. Rollout and rollback should switch Cycle Hub routing only and must
not drop stored dossiers or completed loan records.
