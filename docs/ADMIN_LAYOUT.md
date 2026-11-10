# Admin layout and navigation

The shared shell is `resources/js/layouts/admin-layout.tsx`. Both operational pages and the account settings wrapper use it. The typed module registry is `resources/js/lib/admin-navigation.ts`; add destinations there so the sidebar, search, favorites, active state and automatic breadcrumbs stay consistent.

## Module map

| Visible section | Modules and destinations |
| --- | --- |
| দৈনন্দিন কাজ · Daily operations | Dashboard; members/admissions, cycle hub and samities; loan applications, collections and arrears; savings applications/accounts; accounting overview, vouchers/review and posted journals |
| যাচাই ও তদারকি · Review & supervision | Verification, application/team approvals and issue processing; eligible cluster/portfolio handovers and CSO duty roster |
| প্রতিবেদন · Reports | Report module with labelled member, loan/approval and financial report categories |
| সেটআপ ও প্রশাসন · Setup & administration | Organization hierarchy/member categories; loan/savings products and workflow rules; chart of accounts/accounting periods; users/sessions/permissions/recent deletions; eligible batch uploads/submissions |

Personal profile, password, appearance and notifications are in the header account menu and desktop footer user dropdown, outside the module sidebar. They remain searchable. Existing destinations and role predicates are preserved; this change creates no new operational pages or financial capabilities.

Collections, holds and account closure remain within the existing ledger screens. Financial voucher reviews remain within Accounting and receipt corrections within their source ledgers. Future day-end, bank reconciliation, member master, payments and regulatory workspaces are not advertised as functioning destinations.

## Interaction and access

- Four static section headings separate daily work, supervision, reports and setup. Empty sections are omitted per role. Dashboard is a direct link; other modules use an accordion with at most one module open. Navigation opens the active module automatically and brings its selected item into view. Compact mode remains remembered; compact module icons expand the sidebar to reveal their destinations.
- Primary labels are Bangla, with short explanatory module subtitles and English destination labels. Search accepts either language. Report category labels do not add another collapsible menu level.
- Navigation search opens with Ctrl/Cmd+K; Tab selects a result, Enter opens it and Escape closes the dialog. Only visible destinations are searchable.
- Stars save favorite destinations on this browser, scoped by user ID. Favorites are filtered against current navigation permissions; they never grant access. Sidebar preferences contain no member or financial records.
- Quick access in the desktop header opens favorites or permitted operational workspaces.
- Mobile navigation uses the existing accessible Radix sheet, with focus containment, Escape and focus return. Desktop and mobile share the same registry.
- The header shows the assigned branch/area/zone or Head Office context. It does not change backend branch scope. Existing page filters still control reports.
- Longest-path matching keeps report destinations distinct from parent workspaces. Aliases retain context on member detail/form routes and account profile settings.
- Flash messages, maintenance/read-only notices, CSO assignments, notifications, sign-out, app portal and PWA installation remain available. Shell chrome is hidden in print.
- Backend controllers/middleware remain authoritative. Financial workspaces require an active personal super-admin; `has_all_access` alone does not grant them. Approver report visibility now excludes branch users/field officers unless all-access, matching its controller. Portfolio handover appears only for a field officer with pending handover.

## Verification

Run `npm run test:navigation`, `npm run types` and `npm run build`. Nine navigation regression tests run in Node without a database and are included in frontend CI. They cover the four sections, setup/operation separation, personal-menu exclusion, bilingual labels, role matrix, privilege boundaries, conditional handovers, aliases, longest-path matching and unique destinations.

Local Chrome verification used actual shell components in an isolated Inertia fixture server with synthetic data. It covered desktop/mobile overflow, active routes, favorites and compact-mode persistence, keyboard search, quick-access opening/Escape, mobile notification bounds/Escape, mobile drawer focus/Escape and branch/search visibility, with no JavaScript exceptions. This is layout verification; it does not certify every backend authorization rule or institution UAT. No application database migrations or PHP test suites were run for the layout change.
