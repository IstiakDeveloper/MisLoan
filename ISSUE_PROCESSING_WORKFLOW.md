# 🎯 Multi-Step Issue Processing Workflow - Complete Implementation

## 📋 Overview

Complete 4-step workflow for Head Office to process applications (Admission & Loan) with automatic issue detection, severity tracking, and email notifications.

---

## 🗂️ Architecture

### Database Layer
- **Table**: `application_issues` (Polymorphic)
- **Features**: Auto-increment ID, application type discriminator, severity levels, JSON messaging, email tracking
- **Migration**: `database/migrations/2026_01_21_071438_create_application_issues_table.php`

### Models
- **ApplicationIssue**: Central model with relationships to AdmissionMember and LoanMember
- **MemberAdmission**: Admission form data
- **LoanApplication**: Loan form data
- **AdmissionMember**: Admission members with issue relationships
- **LoanMember**: Loan members with issue relationships

### Services
- **AdmissionIssueDetectionService**: 8-point validation for admissions
- **LoanIssueDetectionService**: 8-point validation for loans

### Controllers
- **IssueProcessingController**: Main workflow orchestration (13 routes)

---

## 🚀 The 4-Step Workflow

### Step 1: ✅ Check Application
**Route**: `/issue-processing/{type}/{id}/check`  
**Component**: `CheckApplication.tsx`  
**Features**:
- Display full application details
- Show member preview with count summary
- Location hierarchy (Zone → Area → Branch)
- Submission date and details
- Progress tracker showing Step 1/4

**Key Data**:
```typescript
interface Props {
    application: any;
    applicationType: string;
    members: any[];
    zone: any;
    area: any;
}
```

---

### Step 2: 🔍 Report Issues  
**Route**: `/issue-processing/{type}/{id}/report`  
**Component**: `ReportIssues.tsx`  
**Features**:
- Auto-detected issues grouped by member
- Severity color coding (🔴 critical, 🟡 warning, 🔵 info)
- Summary statistics (total members, members with issues, clear members)
- Progress tracker showing Step 2/4
- "Next" button to proceed to processing

**Auto-Detection Logic**:

**Admissions (8 checks)**:
1. NID validation (must be 10 or 17 digits)
2. Mobile number validation (11 digits, starts with 01)
3. Name validation (not empty, proper format)
4. Income validation (amount > 0)
5. Income threshold check (< 300000)
6. Guarantor status check
7. Land mismatch detection
8. Society match check

**Loans (8 checks)**:
1. Member name validation
2. Mobile number validation
3. Loan amount validation (500000 - 5000000)
4. Duration validation (12 - 60 months)
5. Guarantor validation
6. Installment matching (amount ÷ duration)
7. NID validation
8. Loan purpose validation

---

### Step 3: ⚙️ Process Issues
**Route**: `/issue-processing/{type}/{id}/process`  
**Component**: `ProcessIssues.tsx`  
**Features**:
- Issue list with tabs (Open, Resolved, Rejected)
- Issue details display with message history
- Resolve/Reject buttons for each issue
- Comment/notes input for resolutions
- Progress tracking (open vs resolved counts)
- Statistics cards showing issue breakdown
- "Next" button appears when all issues resolved
- Progress tracker showing Step 3/4

**Key Interactions**:
- Click issue to view full details
- Add resolution notes and click "Resolve"
- Or add rejection reason and click "Reject"
- Message thread shows conversation history
- System auto-updates issue count

---

### Step 4: ✅ Final Approval
**Route**: `/issue-processing/{type}/{id}/approval`  
**Component**: `Approval.tsx`  
**Features**:
- Summary of resolved/rejected issues
- Application details display
- Email notification explanation
- Green success-themed UI
- "Final Approval" button
- Success page with confirmation
- Auto-redirect to dashboard after approval

**Post-Approval**:
- All members marked as approved
- Application status updated
- Email sent to branch manager
- Issues marked as resolved in system

---

## 📧 Email Notification System

### Mailable Class
**File**: `app/Mail/IssueReportNotification.php`

```php
// Constructor parameters
public function __construct(
    public string $applicationType,
    public int $applicationId,
    public array $issues,
    public string $branchEmail,
    public string $branchName,
    public int $totalIssues,
    public int $criticalCount,
    public int $warningCount,
    public int $infoCount,
)
```

### Email Template
**File**: `resources/views/emails/issue-report-notification.blade.php`

**Content Includes**:
- Application number and type
- Issue summary by severity
- Detailed issue list grouped by member
- Link to branch dashboard
- Next steps for correction

### Sending Logic
Located in `IssueProcessingController::sendIssueNotificationEmail()`

```php
// Triggered when issues are reported
// Groups issues by member
// Counts severity levels
// Sends to branch manager
// Marks email as sent in database
```

---

## 🛣️ Routes Configuration

**File**: `routes/web.php`

```php
Route::prefix('issue-processing')->middleware('head.office')->group(function () {
    // Dashboard
    Route::get('/', [IssueProcessingController::class, 'index']);
    Route::get('stats', [IssueProcessingController::class, 'getStats']);
    
    // 4-Step Workflow
    Route::get('{type}/{id}/check', 'checkApplication');
    Route::get('{type}/{id}/report', 'reportIssues');
    Route::get('{type}/{id}/process', 'processIssues');
    Route::get('{type}/{id}/approval', 'approvalPage');
    
    // Actions
    Route::post('{type}/{id}/approve', 'approve');
    Route::post('issue/{issue}/comment', 'addComment');
    Route::patch('issue/{issue}/resolve', 'resolveIssue');
    Route::patch('issue/{issue}/reject', 'rejectIssue');
});
```

---

## 🎨 Navigation Integration

**File**: `resources/js/layouts/admin-layout.tsx`

Added highlighted navigation item:
```typescript
{
    label: '📋 Check & Process',
    href: '/issue-processing',
    icon: Icon,
    highlight: true,
    visible: user.has_all_access,
}
```

Features:
- Green gradient highlight styling
- Only visible to Head Office users
- Direct link from any page

---

## 📊 Database Schema (application_issues table)

| Column | Type | Purpose |
|--------|------|---------|
| id | BIGINT | Primary key |
| application_type | ENUM | 'admission' or 'loan' |
| application_id | BIGINT | Foreign key to application |
| member_id | BIGINT | FK to AdmissionMember or LoanMember |
| issue_type | VARCHAR | Type of issue (e.g., nid_invalid) |
| issue_description | TEXT | Human-readable description |
| severity | ENUM | critical, warning, info |
| status | ENUM | open, assigned, resolved, rejected |
| messages | JSON | Message thread array |
| assigned_to | BIGINT | User handling the issue |
| assigned_at | TIMESTAMP | Assignment time |
| resolved_at | TIMESTAMP | Resolution time |
| resolved_by | BIGINT | User who resolved |
| resolution_notes | TEXT | How it was resolved |
| rejected_at | TIMESTAMP | Rejection time |
| rejected_by | BIGINT | User who rejected |
| rejection_reason | TEXT | Why it was rejected |
| email_sent_to_branch | BOOLEAN | Notification status |
| email_sent_to_branch_at | TIMESTAMP | Email send time |
| email_sent_to_head_office | BOOLEAN | Head Office notification |
| email_sent_to_head_office_at | TIMESTAMP | Email send time |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Update time |
| deleted_at | TIMESTAMP | Soft delete |

---

## 🔧 Controller Methods

### IssueProcessingController

```php
// Dashboard with statistics
public function index(Request $request)

// Step 1: Display application details
public function checkApplication(Request $request, $type, $id)

// Step 2: Display auto-detected issues
public function reportIssues(Request $request, $type, $id)

// Step 3: Display issue processing UI
public function processIssues(Request $request, $type, $id)

// Step 3 to 4: Approval page display
public function approvalPage(Request $request, $type, $id)

// Step 4: Final approval action
public function approve(Request $request, $type, $id)

// Actions
public function addComment(Request $request, $issue_id)
public function resolveIssue(Request $request, $issue_id)
public function rejectIssue(Request $request, $issue_id)
public function getStats(Request $request)

// Email sending
private function sendIssueNotificationEmail($type, $id, $issues)
```

---

## 🚨 Issue Detection Services

### AdmissionIssueDetectionService

```php
public function detectIssuesForMember(AdmissionMember $member): array
// Performs 8 validation checks
// Returns array of issues with type, description, severity

public function createIssuesForMember(AdmissionMember $member, int $userId): array
// Creates ApplicationIssue records in database
// Calls detectIssuesForMember internally
```

### LoanIssueDetectionService

```php
public function detectIssuesForMember(LoanMember $member): array
// Performs 8 validation checks
// Returns array of issues with type, description, severity

public function createIssuesForMember(LoanMember $member, int $userId): array
// Creates ApplicationIssue records in database
// Calls detectIssuesForMember internally
```

---

## 📱 React Components Created

### 1. Dashboard.tsx
- Statistics cards (pending admissions, pending loans, total pending)
- Application type selector (Admission/Loan toggle)
- Pending applications table
- 4-step process guide
- Direct navigation to Check Application

### 2. CheckApplication.tsx
- Full application details
- Member preview with count summary
- Location hierarchy display
- Progress bar (Step 1/4)
- "Next: View Issues" button

### 3. ReportIssues.tsx
- Issue summary cards
- Issues grouped by member
- Severity color coding
- Statistics (members with/without issues)
- Progress bar (Step 2/4)
- Next button to Process Issues

### 4. ProcessIssues.tsx
- Issue list with status filtering
- Issue detail view with message thread
- Resolve/Reject action buttons
- Statistics breakdown
- Progress bar (Step 3/4)
- Next button to Approval (when all resolved)

### 5. Approval.tsx
- Application summary
- Statistics display
- Email notification explanation
- Progress bar (Step 4/4)
- Final approval button
- Success confirmation page

---

## 🔐 Access Control

**Middleware**: `head.office` (User::has_all_access)

- Only Head Office users can access workflow
- Branch users can see their own submissions only
- Admin layout shows workflow link only to Head Office

---

## 📝 Usage Flow

### For Head Office:
1. Go to Dashboard → "📋 Check & Process" link
2. Select type (Admission/Loan)
3. Click on application → Step 1: Check details
4. Click "View Issues" → Step 2: See auto-detected issues
5. Click "Process Issues" → Step 3: Resolve each issue
6. Click "Approve" → Step 4: Final confirmation
7. Branch manager receives email notification

### For Branch Manager:
1. Receives email about detected issues
2. Can log in to see issue details
3. Makes corrections to form data
4. Resubmits application
5. Head Office reviews again

---

## 🎯 Key Features

✅ **Polymorphic Design**: Single table serves both Admission & Loan  
✅ **Auto-Detection**: 8-point validation for each type  
✅ **Severity Levels**: Critical, Warning, Info  
✅ **Message Threading**: Full conversation history  
✅ **Email Notifications**: Branch manager alerts  
✅ **4-Step Workflow**: Clear progression UI  
✅ **Progress Tracking**: Visual indicators throughout  
✅ **JSON Storage**: Flexible message format  
✅ **Soft Deletes**: Data preservation  
✅ **Bengali Localization**: Full Bengali UI  

---

## 🔄 Database Flow

```
1. Member submits form
   ↓
2. Head Office receives notification
   ↓
3. Select "Check & Process" from menu
   ↓
4. Step 1: View application details
   ↓
5. Step 2: System auto-detects issues
   ↓
6. Step 3: Head Office resolves each issue
   ↓
7. Step 4: Head Office approves application
   ↓
8. Branch manager receives email notification
   ↓
9. Member status updated to "Approved"
```

---

## 📦 Files Created/Modified

### Created:
- ✅ `resources/js/pages/HeadOffice/IssueProcessing/Dashboard.tsx`
- ✅ `resources/js/pages/HeadOffice/IssueProcessing/CheckApplication.tsx`
- ✅ `resources/js/pages/HeadOffice/IssueProcessing/ReportIssues.tsx`
- ✅ `resources/js/pages/HeadOffice/IssueProcessing/ProcessIssues.tsx`
- ✅ `resources/js/pages/HeadOffice/IssueProcessing/Approval.tsx`
- ✅ `app/Mail/IssueReportNotification.php`
- ✅ `resources/views/emails/issue-report-notification.blade.php`

### Modified:
- ✅ `app/Http/Controllers/IssueProcessingController.php` (added approvalPage method, email sending)
- ✅ `routes/web.php` (added approval route)
- ✅ `resources/js/layouts/admin-layout.tsx` (added menu item)
- ✅ Database migration already created

---

## ✨ Ready for Testing!

All components are created and integrated. System is ready for:
1. Testing the 4-step workflow
2. Verifying email sending
3. Checking database records
4. Frontend UI validation
5. Issue detection accuracy

---

## 🚀 Next Steps (Optional)

### Future Enhancements:
1. Branch dashboard to view assigned issues
2. Real-time notifications (WebSocket)
3. Issue comment thread UI
4. Batch issue approval
5. Issue templates/presets
6. Issue statistics dashboard
7. Mobile app for branch staff
8. SMS notifications to branch
9. Issue escalation system
10. Performance reports

