# 📊 Visual Workflow Diagrams

## 🔄 Complete 4-Step Workflow Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    ISSUE PROCESSING WORKFLOW                │
└─────────────────────────────────────────────────────────────┘

                              ↓

    ┌──────────────────────────────────────────────────┐
    │  APPLICATION SUBMITTED BY BRANCH               │
    │  - Admission Form OR Loan Application          │
    │  - Member data collected                        │
    └──────────────────────────────────────────────────┘

                              ↓

    ┌──────────────────────────────────────────────────┐
    │ STEP 1️⃣: CHECK APPLICATION                      │
    │ URL: /issue-processing/{type}/{id}/check      │
    │ ✓ Display all application details             │
    │ ✓ Show member information                      │
    │ ✓ View location hierarchy                      │
    └──────────────────────────────────────────────────┘

                              ↓ (Click Next)

    ┌──────────────────────────────────────────────────┐
    │ STEP 2️⃣: REPORT ISSUES                          │
    │ URL: /issue-processing/{type}/{id}/report     │
    │ ✓ Auto-detect issues (8 checks)               │
    │ ✓ Group by member                             │
    │ ✓ Show severity (🔴🟡🔵)                       │
    │ ✓ Create issue records in DB                  │
    │ ✓ Mark application as reviewed                │
    │ ✓ Send email to branch manager                │
    └──────────────────────────────────────────────────┘

                 ┌─────────────────────────┐
                 │   DECISION POINT       │
                 │   Any issues found?    │
                 └─────────────────────────┘
                    ↙ YES        NO ↘
                   ↙               ↘
                  ↙                 ↘
    ┌──────────────────┐    ┌──────────────────┐
    │ STEP 3️⃣:        │    │  SKIP TO STEP 4 │
    │ PROCESS ISSUES  │    │                  │
    └──────────────────┘    └──────────────────┘
    URL: /{type}/{id}/     URL: /{type}/{id}/
         process              approval

                              ↓

    ┌──────────────────────────────────────────────────┐
    │ STEP 3️⃣: PROCESS ISSUES                         │
    │ URL: /issue-processing/{type}/{id}/process    │
    │ For each issue:                               │
    │  ✓ View full details                          │
    │  ✓ See message thread                         │
    │  ✓ Resolve with notes                         │
    │    - OR -                                     │
    │  ✓ Reject with reason (send back to branch)   │
    │                                               │
    │ When ALL issues resolved/rejected:            │
    │  ✓ Show "Next: Approve" button                │
    └──────────────────────────────────────────────────┘

                              ↓ (Click Next)

    ┌──────────────────────────────────────────────────┐
    │ STEP 4️⃣: FINAL APPROVAL                         │
    │ URL: /issue-processing/{type}/{id}/approval  │
    │ ✓ Review application summary                  │
    │ ✓ Show resolved issues count                  │
    │ ✓ Explain email notification                  │
    │ ✓ Click "Final Approval" button               │
    └──────────────────────────────────────────────────┘

                              ↓ (Click Approve)

    ┌──────────────────────────────────────────────────┐
    │ APPROVAL COMPLETED                             │
    │ ✓ All members marked as approved              │
    │ ✓ Application status updated                  │
    │ ✓ Issues marked as resolved                   │
    │ ✓ Email sent to branch                        │
    │ ✓ Success page shown                          │
    │ ✓ Auto-redirect to dashboard (3 seconds)      │
    └──────────────────────────────────────────────────┘

                              ↓

    ┌──────────────────────────────────────────────────┐
    │ BRANCH MANAGER RECEIVES EMAIL                   │
    │ ✓ Issue list with severity breakdown           │
    │ ✓ Member names and issue types                │
    │ ✓ Link to dashboard for action                │
    │ ✓ Next steps for correction                   │
    └──────────────────────────────────────────────────┘

                              ↓

                        APPLICATION APPROVED
```

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        ADMIN LAYOUT                         │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐│
│  │ Dashboard    │  │ Submissions  │  │ 📋 Check &       ││
│  │              │  │              │  │    Process ✨    ││
│  │              │  │              │  │ (HEAD OFFICE     ││
│  │              │  │              │  │  ONLY)           ││
│  └──────────────┘  └──────────────┘  └──────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
           ┌────────────────────────────────────┐
           │  ISSUE PROCESSING WORKFLOW         │
           ├────────────────────────────────────┤
           │                                    │
           │  Dashboard                         │
           │  - Pending Applications            │
           │  - Statistics Cards                │
           │  - Type Selector                   │
           │                                    │
           │  ↓ Select Application             │
           │                                    │
           │  Step 1: CheckApplication         │
           │  - Application Details            │
           │  - Member Preview                 │
           │  - Location Hierarchy             │
           │                                    │
           │  ↓ Click Next                     │
           │                                    │
           │  Step 2: ReportIssues             │
           │  - Auto-Detected Issues           │
           │  - Severity Coloring              │
           │  - Issue Summary                  │
           │                                    │
           │  ↓ Click Process Issues           │
           │                                    │
           │  Step 3: ProcessIssues            │
           │  - Issue List (tabs)              │
           │  - Issue Details                  │
           │  - Resolve/Reject                 │
           │  - Message Thread                 │
           │                                    │
           │  ↓ (When all resolved)            │
           │                                    │
           │  Step 4: Approval                 │
           │  - Summary Display                │
           │  - Final Approval Button          │
           │  - Success Confirmation           │
           │                                    │
           │  ↓ Approve                        │
           │                                    │
           │  ✅ Application Approved          │
           │     Email Sent to Branch          │
           │                                    │
           └────────────────────────────────────┘
```

---

## 🗄️ Database Relationships

```
APPLICATIONS
├─ MemberAdmission
│  ├─ ID
│  ├─ application_no
│  ├─ branch_id
│  ├─ submitted_at
│  ├─ reviewed_at
│  └─ status
│     ↓ (one-to-many)
│     └─ AdmissionMembers
│        ├─ ID
│        ├─ member_name
│        ├─ nid
│        ├─ mobile
│        └─ status
│           ↓ (one-to-many)
│           └─ ApplicationIssues
│              ├─ ID
│              ├─ issue_type
│              ├─ severity
│              ├─ status
│              ├─ messages[] (JSON)
│              └─ timestamps
│
└─ LoanApplication
   ├─ ID
   ├─ application_no
   ├─ branch_id
   ├─ submitted_at
   ├─ reviewed_at
   └─ status
      ↓ (one-to-many)
      └─ LoanMembers
         ├─ ID
         ├─ member_name
         ├─ nid
         ├─ loan_amount
         └─ status
            ↓ (one-to-many)
            └─ ApplicationIssues
               ├─ ID
               ├─ issue_type
               ├─ severity
               ├─ status
               ├─ messages[] (JSON)
               └─ timestamps
```

---

## 🔍 Issue Detection Logic

```
APPLICATION SUBMITTED
        ↓
   FOR EACH MEMBER
        ↓
┌──────────────────────────────┐
│ CHECK TYPE: ADMISSION OR LOAN │
└──────────────────────────────┘
        ↓
    ┌───┴───┐
    ↓       ↓
ADMISSION   LOAN

ADMISSION VALIDATION (8 checks)
├─ 1️⃣  NID valid? → Create issue if invalid
├─ 2️⃣  Mobile valid? → Create issue if invalid
├─ 3️⃣  Name valid? → Create issue if invalid
├─ 4️⃣  Income > 0? → Create issue if not
├─ 5️⃣  Income < 300k? → Create issue if not
├─ 6️⃣  Has guarantor? → Create issue if not
├─ 7️⃣  Land match? → Create issue if mismatch
└─ 8️⃣  Society match? → Create issue if not

LOAN VALIDATION (8 checks)
├─ 1️⃣  Name valid? → Create issue if invalid
├─ 2️⃣  Mobile valid? → Create issue if invalid
├─ 3️⃣  Amount 500k-5M? → Create issue if not
├─ 4️⃣  Duration 12-60m? → Create issue if not
├─ 5️⃣  Has guarantor? → Create issue if not
├─ 6️⃣  Installment match? → Create issue if not
├─ 7️⃣  NID valid? → Create issue if invalid
└─ 8️⃣  Purpose set? → Create issue if not

ALL CHECKS COMPLETE
        ↓
STORE IN DATABASE
        ↓
RETURN TO STEP 2
```

---

## 📧 Email Flow

```
APPLICATION READY
        ↓
STEP 2: REPORT ISSUES
        ↓
ISSUES DETECTED → Send Email
     OR
NO ISSUES → Skip email
        ↓
    BUILD EMAIL
        ↓
┌─────────────────────────────┐
│ IssueReportNotification     │
│ - Application Type          │
│ - Application ID            │
│ - Issues (grouped by member)│
│ - Severity counts           │
│ - Branch Info               │
└─────────────────────────────┘
        ↓
    RENDER TEMPLATE
        ↓
resources/views/emails/issue-report-notification.blade.php
        ↓
┌─────────────────────────────┐
│ EMAIL CONTENT               │
├─────────────────────────────┤
│ Subject:                    │
│ ⚠️ নতুন সমস্যা রিপোর্ট     │
│                             │
│ To: branch_manager@email    │
│                             │
│ Body:                       │
│ - Issue summary             │
│ - Issues by member          │
│ - Severity breakdown        │
│ - Dashboard link            │
│ - Next action steps         │
└─────────────────────────────┘
        ↓
    SEND VIA MAIL
        ↓
UPDATE DATABASE
(email_sent_to_branch = true)
        ↓
✅ EMAIL SENT
```

---

## 🎨 UI Component Hierarchy

```
AdminLayout
│
├─ Sidebar Navigation
│  └─ 📋 Check & Process (if has_all_access)
│
└─ Main Content
   │
   ├─ Dashboard Component
   │  ├─ Statistics Cards (3)
   │  ├─ Type Selector
   │  ├─ Applications Table
   │  └─ 4-Step Guide
   │
   ├─ CheckApplication Component
   │  ├─ Header with back button
   │  ├─ Progress Bar (1/4)
   │  ├─ Application Details Card
   │  ├─ Location Hierarchy
   │  ├─ Member Preview
   │  └─ Next Button
   │
   ├─ ReportIssues Component
   │  ├─ Header with back button
   │  ├─ Progress Bar (2/4)
   │  ├─ Statistics Cards (3)
   │  ├─ Issues Display
   │  │  ├─ Issues Container
   │  │  │  ├─ Member Name
   │  │  │  └─ Issue Cards (colored by severity)
   │  │  │     ├─ Icon (🔴🟡🔵)
   │  │  │     ├─ Type
   │  │  │     └─ Description
   │  │  └─ No Issues Alert (if none)
   │  ├─ Next Steps Section
   │  └─ Process Button
   │
   ├─ ProcessIssues Component
   │  ├─ Header with back button
   │  ├─ Progress Bar (3/4)
   │  ├─ Statistics Cards (3)
   │  ├─ Left Column: Issue List
   │  │  ├─ Tabs (Open/Resolved/Rejected)
   │  │  ├─ Issue Items
   │  │  │  ├─ Issue Type
   │  │  │  ├─ Description (truncated)
   │  │  │  └─ Severity Badge
   │  │  └─ (scrollable)
   │  ├─ Right Column: Issue Details
   │  │  ├─ Issue Title & Severity
   │  │  ├─ Issue Description
   │  │  ├─ Message Thread
   │  │  │  └─ Message Items
   │  │  │     ├─ User name
   │  │  │     ├─ Message text
   │  │  │     └─ Timestamp
   │  │  ├─ Action Buttons
   │  │  │  ├─ Resolve Section
   │  │  │  │  ├─ Notes Input
   │  │  │  │  └─ Resolve Button
   │  │  │  └─ Reject Section
   │  │  │     ├─ Reason Input
   │  │  │     └─ Reject Button
   │  │  └─ Status Badge (if resolved/rejected)
   │  └─ Approval Alert (when all resolved)
   │     ├─ Icon
   │     ├─ Message
   │     └─ Approve Button
   │
   └─ Approval Component
      ├─ Header with back button
      ├─ Progress Bar (4/4)
      ├─ Success Banner
      ├─ Application Summary Card
      ├─ Statistics Cards (3)
      ├─ Email Notification Alert
      ├─ Action Buttons
      │  ├─ Cancel Button
      │  └─ Final Approval Button
      └─ Success Page (after approval)
         ├─ Trophy Icon
         ├─ Success Message
         ├─ Statistics
         └─ Redirect Link
```

---

## 🔐 Access Control Flow

```
USER VISITS /issue-processing
        ↓
┌──────────────────────────┐
│ MIDDLEWARE CHECK         │
├──────────────────────────┤
│ 1. Is authenticated?     │
│    NO → Redirect to login│
│    YES → Continue        │
│                          │
│ 2. Is email verified?    │
│    NO → Verify email     │
│    YES → Continue        │
│                          │
│ 3. Head Office only?     │
│    NO → Forbidden 403    │
│    YES → Continue        │
│                          │
│ 4. Is has_all_access?    │
│    NO → Forbidden 403    │
│    YES → Continue        │
└──────────────────────────┘
        ↓
   ✅ ALLOWED
        ↓
 RENDER COMPONENT
```

---

## 📊 Status Flow Chart

```
ISSUE LIFECYCLE
    
    ┌─────────────────────────────────────────────────┐
    │ CREATED (by auto-detection in Step 2)           │
    │ status = 'open'                                 │
    │ assigned_to = null                              │
    │ assigned_at = null                              │
    └─────────────────────────────────────────────────┘
                        ↓
        ┌───────────────┴───────────────┐
        ↓                               ↓
    ┌─────────────┐            ┌──────────────┐
    │  RESOLVED   │            │  REJECTED    │
    │             │            │              │
    │ status =    │            │ status =     │
    │ 'resolved'  │            │ 'rejected'   │
    │             │            │              │
    │ resolved_by │            │ rejected_by  │
    │ resolved_at │            │ rejected_at  │
    │ notes       │            │ reason       │
    └─────────────┘            └──────────────┘
        ↓                               ↓
    ┌─────────────────────────────────────────────────┐
    │ ARCHIVED (soft delete if needed)                │
    │ deleted_at timestamp set                        │
    └─────────────────────────────────────────────────┘
```

---

## 🎯 Data Validation Pipeline

```
USER INPUT
    ↓
├─ CSRF Token Check ✓
    ↓
├─ Authentication Check ✓
    ↓
├─ Authorization Check (Head Office) ✓
    ↓
├─ Request Validation ✓
│  └─ Validate message, notes, reason
    ↓
├─ Database Validation ✓
│  └─ Foreign key constraints
│  └─ Enum constraints (status, severity)
│  └─ JSON validation (messages)
    ↓
├─ Business Logic ✓
│  └─ Issue must exist
│  └─ Application must exist
│  └─ User must have permission
    ↓
✅ ACTION PERFORMED
```

---

**Workflow Version**: 1.0  
**Created**: January 21, 2026  
**Status**: Complete and Ready
