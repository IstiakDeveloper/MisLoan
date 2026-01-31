# NGO Loan Verification System - Database Structure

## 📋 প্রজেক্ট সংক্ষিপ্ত বিবরণ
এটি একটি NGO Loan Verification সিস্টেম যেখানে Branch, Area, এবং Zone লেভেলে Loan Application এবং Member Admission প্রসেস করা হয়।

**গুরুত্বপূর্ণ:** সকল text fields Bangla অথবা English উভয়ে সাপোর্ট করবে (আলাদা `*_bn` fields নেই)।

---

## 🗄️ Database Tables Summary

### ✅ Organizational Structure (৩টি Tables)
1. **zones** - জোন তথ্য
2. **areas** - এরিয়া তথ্য (Zone এর অধীনে)
3. **branches** - শাখা তথ্য (Area এর অধীনে)

### ✅ User Management (২টি Tables)
4. **roles** - Role এবং Permissions
5. **users** - User তথ্য (+ sessions, password_reset_tokens)

### ✅ Applications (৪টি Tables)
6. **loan_applications** - Loan আবেদন
7. **loan_members** - Loan এর সদস্য তালিকা
8. **member_admissions** - Member ভর্তি আবেদন
9. **admission_members** - ভর্তির সদস্য তালিকা

### ✅ Tracking & Support (৬টি Tables)
10. **application_history** - Application status changes tracking
11. **notifications** - Email ও in-app notifications
12. **comments** - Comments এবং AI suggestions
13. **rejection_reasons** - প্রত্যাখ্যানের কারণ (predefined + custom)
14. **activity_logs** - User activity logging
15. **reports** - Generated reports (PDF/Excel)

**Total Custom Tables:** 15

---

## 📂 Complete Migration List

### Custom Migrations (Execution Order)
1. `2024_01_01_000001_create_zones_table.php`
2. `2024_01_01_000002_create_areas_table.php`
3. `2024_01_01_000003_create_branches_table.php`
4. `2024_01_01_000004_create_roles_table.php`
5. `2024_01_01_000005_create_users_table.php` ✨ **Custom User Table**
6. `2024_01_01_000006_create_loan_applications_table.php`
7. `2024_01_01_000007_create_loan_members_table.php`
8. `2024_01_01_000008_create_member_admissions_table.php`
9. `2024_01_01_000009_create_admission_members_table.php`
10. `2024_01_01_000010_create_application_history_table.php`
11. `2024_01_01_000011_create_notifications_table.php`
12. `2024_01_01_000012_create_comments_table.php`
13. `2024_01_01_000013_create_rejection_reasons_table.php`
14. `2024_01_01_000014_create_activity_logs_table.php`
15. `2024_01_01_000015_create_reports_table.php`

---

## 📦 Eloquent Models (15 Models)

### Organizational Models
1. **Zone** - সব relationships সহ
2. **Area** - সব relationships সহ
3. **Branch** - সব relationships সহ

### User Models
4. **Role** - Permissions handling
5. **User** - SoftDeletes, TwoFactorAuth, Access control methods

### Application Models
6. **LoanApplication** - Application number generator, Status scopes
7. **LoanMember** - Individual loan member data
8. **MemberAdmission** - Application number generator, Status scopes
9. **AdmissionMember** - Individual admission member data with NID

### Tracking Models
10. **ApplicationHistory** - Polymorphic tracking
11. **Notification** - Email tracking, Read/Unread scopes
12. **Comment** - Reply support, AI suggestions
13. **RejectionReason** - Usage tracking, Category filtering
14. **ActivityLog** - Complete audit trail
15. **Report** - PDF/Excel file tracking

---

## 🌱 Seeders

1. **RoleSeeder** - ৬টি roles with permissions
2. **RejectionReasonSeeder** - ১৫টি common rejection reasons (Bangla)
3. **DemoDataSeeder** - 3 Zones, 6 Areas, 18 Branches + Demo users

---

## 👥 Role System

| Role | Display Name | Access Level |
|------|-------------|--------------|
| **super_admin** | সুপার অ্যাডমিন | All Branches |
| **head_office** | হেড অফিস | All Branches |
| **zone_manager** | জোন ম্যানেজার | Zone Branches |
| **area_manager** | এরিয়া ম্যানেজার | Area Branches |
| **branch_manager** | ব্রাঞ্চ ম্যানেজার | Own Branch |
| **branch_user** | ব্রাঞ্চ ইউজার | Own Branch |

---

## 🚀 Installation & Setup

```bash
# Run migrations
php artisan migrate

# Seed roles and rejection reasons
php artisan db:seed

# Optionally seed demo data
php artisan db:seed --class=DemoDataSeeder
```

---

## 🔑 Demo Login Credentials

- **Super Admin:** Username: `superadmin`, Password: `password`
- **Head Office:** Username: `headoffice1`, Password: `password`
- **Branch:** Username: Branch Code (e.g., `ZN-DHK-AR1-BR1`), Password: `password`

---

## ✨ Key Features

### ✅ Single Language Field
- একটাই field - Bangla বা English
- No separate `*_bn` fields

### ✅ Complete Workflow
- Branch → Excel Upload → Email Notifications → Head Office Review → Approve/Reject

### ✅ Email & Notifications
- Full tracking system
- Auto notify all stakeholders

### ✅ Hierarchical Access
- Zone → Area → Branch
- Role-based permissions

### ✅ Application History
- Complete audit trail
- All status changes tracked

### ✅ AI Suggestions
- Predefined rejection reasons
- Usage analytics

### ✅ Reporting
- Branch/Area/Zone wise
- PDF & Excel export

---

## 🎯 Next Steps

1. ⏳ Controllers & API Routes
2. ⏳ Form Requests (Validation)
3. ⏳ Events & Listeners (Notifications)
4. ⏳ Jobs (Email, Excel processing)
5. ⏳ React Components (Inertia 2)

---

## 🎉 Summary

✅ **15 Migrations** - All tables created
✅ **15 Models** - With relationships
✅ **3 Seeders** - Ready to use
✅ **Single Language** - No duplicate fields
✅ **Complete System** - Ready for development

এখন Controllers এবং React Components তৈরি করতে পারবেন! 🚀
