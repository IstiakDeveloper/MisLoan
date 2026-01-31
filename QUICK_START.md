# 🚀 Quick Start Guide - Issue Processing Workflow

## Access the System

### For Head Office Users
1. Login with Head Office credentials
2. Look for **"📋 Check & Process"** in the sidebar (highlighted in green)
3. Click it to go to Dashboard

### Dashboard URL
```
/issue-processing
```

---

## The 4-Step Workflow

### Step 1️⃣: Check Application
- Review all application details
- See member information
- View location hierarchy
- **URL**: `/issue-processing/{type}/{id}/check`
- **Click "Next"** to proceed

### Step 2️⃣: Report Issues  
- View auto-detected issues
- See severity levels (🔴 critical, 🟡 warning, 🔵 info)
- Issues grouped by member
- **URL**: `/issue-processing/{type}/{id}/report`
- **Click "Process Issues"** to proceed

### Step 3️⃣: Process Issues
- Resolve each issue one by one
- Add resolution notes
- OR reject with reason
- View message thread
- **URL**: `/issue-processing/{type}/{id}/process`
- **When all resolved**, click "Final Approval"

### Step 4️⃣: Approval
- Review summary
- Click "Final Approval Button"
- Confirmation page shows
- Branch manager gets email
- **URL**: `/issue-processing/{type}/{id}/approval`

---

## Key Features

### Dashboard Statistics
```
📊 Pending Admissions: X
📊 Pending Loans: X
📊 Total Pending: X
```

### Issue Types (Admission - 8 checks)
- ✓ NID validation (10 or 17 digits)
- ✓ Mobile number (11 digits, 01...)
- ✓ Member name validation
- ✓ Income amount (>0)
- ✓ Income threshold (<300k)
- ✓ Guarantor status
- ✓ Land mismatch
- ✓ Society match

### Issue Types (Loan - 8 checks)
- ✓ Member name validation
- ✓ Mobile number (11 digits, 01...)
- ✓ Loan amount (500k - 5M)
- ✓ Duration (12 - 60 months)
- ✓ Guarantor validation
- ✓ Installment match (amount ÷ duration)
- ✓ NID validation (10 or 17 digits)
- ✓ Loan purpose

---

## Severity Levels

| Level | Color | Meaning |
|-------|-------|---------|
| 🔴 Critical | Red | Must fix immediately |
| 🟡 Warning | Yellow | Should fix |
| 🔵 Info | Blue | For attention |

---

## Actions on Issues

### Resolve Issue
1. Select issue from list
2. Enter resolution notes
3. Click "✅ সমাধান করুন" button
4. System updates automatically

### Reject Issue
1. Select issue from list
2. Enter rejection reason
3. Click "❌ ফেরত পাঠান" button
4. Issue goes back to branch

### Add Comment
- View message thread in issue detail
- Add comments to track conversation
- Full history maintained

---

## Email Notifications

### What Branch Manager Receives
- ✉️ Issue report email
- 📋 List of all detected issues
- 🔴 Critical count
- 🟡 Warning count
- 🔵 Info count
- 🔗 Link to dashboard

### When Email Sent
- After completing **Step 2: Report Issues**
- Only sent if issues detected
- Tracks send timestamp

---

## Navigation

```
Admin Panel
  └─ 📋 Check & Process (GREEN HIGHLIGHT)
     ├─ Dashboard (/issue-processing)
     ├─ Step 1: Check (/issue-processing/{type}/{id}/check)
     ├─ Step 2: Report (/issue-processing/{type}/{id}/report)
     ├─ Step 3: Process (/issue-processing/{type}/{id}/process)
     └─ Step 4: Approval (/issue-processing/{type}/{id}/approval)
```

---

## Database Schema Quick Reference

### Issues Table Columns
- `id` - Primary key
- `application_type` - 'admission' or 'loan'
- `application_id` - Link to application
- `member_id` - Link to member
- `issue_type` - Type of issue
- `severity` - critical/warning/info
- `status` - open/resolved/rejected
- `messages` - JSON thread
- `resolved_at` - When resolved
- `email_sent_to_branch` - Email tracking

---

## Common URLs

```
Dashboard
/issue-processing

Check Application
/issue-processing/admission/5/check
/issue-processing/loan/3/check

Report Issues
/issue-processing/admission/5/report
/issue-processing/loan/3/report

Process Issues
/issue-processing/admission/5/process
/issue-processing/loan/3/process

Approval
/issue-processing/admission/5/approval
/issue-processing/loan/3/approval

Approve (POST)
/issue-processing/admission/5/approve
/issue-processing/loan/3/approve
```

---

## User Roles

### Head Office (has_all_access)
- ✅ Can see workflow
- ✅ Can process issues
- ✅ Can approve applications
- ✅ Receive statistics

### Branch Users
- ❌ Cannot see workflow
- ❌ Only see own submissions
- ❌ Receive email notifications

---

## Troubleshooting

### Issue: Link not showing in menu
- Check if user has `has_all_access` flag set to true
- Clear browser cache
- Refresh page

### Issue: Workflow page shows error
- Check if application ID exists
- Verify user is logged in as Head Office
- Check database has application records

### Issue: Email not sending
- Verify `.env` has MAIL configuration
- Check MAIL_FROM is set correctly
- Verify branch manager has email

### Issue: Issues not detecting
- Check service validation rules
- Verify member data exists
- Check database has AdmissionMember/LoanMember records

---

## API Endpoints (JSON)

```
GET  /issue-processing/stats
     Returns: {admissions: {...}, loans: {...}, issues: {...}}

POST /issue-processing/{type}/{id}/approve
     Approves application

POST /issue-processing/issue/{id}/comment
     Body: {message: "text"}

PATCH /issue-processing/issue/{id}/resolve
     Body: {notes: "text"}

PATCH /issue-processing/issue/{id}/reject
     Body: {reason: "text"}
```

---

## File Locations

```
Backend
├─ app/Http/Controllers/IssueProcessingController.php
├─ app/Models/ApplicationIssue.php
├─ app/Services/AdmissionIssueDetectionService.php
├─ app/Services/LoanIssueDetectionService.php
├─ app/Mail/IssueReportNotification.php
└─ routes/web.php

Frontend
├─ resources/js/pages/HeadOffice/IssueProcessing/
│  ├─ Dashboard.tsx
│  ├─ CheckApplication.tsx
│  ├─ ReportIssues.tsx
│  ├─ ProcessIssues.tsx
│  └─ Approval.tsx
├─ resources/js/layouts/admin-layout.tsx
└─ resources/views/emails/issue-report-notification.blade.php

Database
└─ database/migrations/2026_01_21_071438_create_application_issues_table.php
```

---

## UI Color Scheme

| Component | Color |
|-----------|-------|
| Step Progress | Blue (active), Green (done), Gray (pending) |
| Critical Issues | 🔴 Red (#EF4444) |
| Warning Issues | 🟡 Yellow (#EAB308) |
| Info Issues | 🔵 Blue (#3B82F6) |
| Success Button | Green (#16A34A) |
| Reject Button | Red (#DC2626) |
| Menu Highlight | Green gradient |

---

## Language

All UI is in **Bengali (বাংলা)** with English technical terms preserved.

---

## Performance Notes

- Dashboard loads pending applications in real-time
- Issues auto-detect on Step 2
- Email sends asynchronously
- Database queries optimized with eager loading
- React components memoized for performance

---

## Validation Rules Applied

### On Issue Detection
- No empty fields
- Proper data types
- Range validation (amounts, durations)
- Format validation (phone, NID)
- Relationship validation (guarantor exists)

### On Form Submission
- CSRF token required
- User authentication required
- Head Office middleware check
- Request validation applied
- Authorization check for resources

---

## Next Steps After First Use

1. ✅ Test with sample applications
2. ✅ Verify email sending to branch
3. ✅ Check issue detection accuracy
4. ✅ Monitor database records
5. ✅ Train branch staff on workflow
6. ✅ Set up email notifications
7. ✅ Create issue templates if needed
8. ✅ Set up performance monitoring

---

## Support Commands

```bash
# Clear cache
php artisan optimize:clear

# View routes
php artisan route:list | grep issue-processing

# Check migrations
php artisan migrate:status

# Run tests
php artisan test

# Tinker access
php artisan tinker
```

---

**Version**: 1.0  
**Created**: January 21, 2026  
**System**: MisLoan Issue Processing Workflow  
**Status**: ✅ Ready to Use
