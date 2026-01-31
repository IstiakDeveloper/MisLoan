# ভর্তি সিস্টেম - আপডেট সারসংক্ষেপ

## কী পরিবর্তন হয়েছে?

### 1. ডাটাবেস স্ট্রাকচার
`admission_members` টেবিলে নতুন ফিল্ড যোগ করা হয়েছে:
- `head_office_reviewed_at` - হেড অফিস যাচাই করার তারিখ
- `head_office_reviewed_by` - কে যাচাই করেছে (ইউজার ID)
- `head_office_remarks` - হেড অফিসের মন্তব্য
- `head_office_decision` - সিদ্ধান্ত (approved/rejected/needs_correction/pending)
- `branch_feedback_at` - শাখা প্রতিক্রিয়া তারিখ
- `branch_correction_remarks` - শাখার সংশোধন মন্তব্য

### 2. ব্যাকএন্ড পরিবর্তন

#### AdmissionMember মডেল (`app/Models/AdmissionMember.php`)
নতুন মেথড যোগ করা হয়েছে:
- `markHeadOfficeReviewed()` - হেড অফিস যাচাই চিহ্নিত করতে
- `markBranchFeedback()` - শাখার প্রতিক্রিয়া চিহ্নিত করতে
- `getHeadOfficeStatusLabel()` - বাংলায় স্ট্যাটাস লেবেল পেতে

#### AdmissionController (`app/Http/Controllers/AdmissionController.php`)
নতুন মেথড যোগ করা হয়েছে:

**ব্রাঞ্চের জন্য:**
- `getAdmissionsByDate()` - তারিখ অনুযায়ী ভর্তি গ্রুপ করা (API)

**হেড অফিসের জন্য:**
- `headOfficeApproveMember()` - সদস্য অনুমোদন করা
- `headOfficeRequestCorrection()` - সংশোধনের অনুরোধ করা
- `headOfficeRejectMember()` - সদস্য প্রত্যাখ্যান করা
- `headOfficeMemberReviewPage()` - সদস্য রিভিউ পেজ (Inertia)
- `headOfficeAdmissionDetail()` - ভর্তির বিস্তারিত দেখা (Inertia)

### 3. রুট যোগ করা হয়েছে

**ব্রাঞ্চের জন্য:**
```php
GET /admissions/api/by-date              // তারিখ অনুযায়ী ভর্তি ডেটা
GET /admissions/api/member/{id}/review-status  // মেম্বার রিভিউ স্ট্যাটাস
```

**হেড অফিসের জন্য:**
```php
GET /head-office/admissions/{id}/detail   // ভর্তির বিস্তারিত পেজ
GET /head-office/admissions/member/{id}/review  // মেম্বার রিভিউ পেজ
POST /head-office/admissions/member/{id}/approve  // অনুমোদন
POST /head-office/admissions/member/{id}/request-correction  // সংশোধনের অনুরোধ
POST /head-office/admissions/member/{id}/reject  // প্রত্যাখ্যান
```

### 4. ফ্রন্টএন্ড কম্পোনেন্ট

**ব্রাঞ্চের জন্য:**
- `ByDateView.tsx` - তারিখ অনুযায়ী ভর্তি দেখার পেজ
  - প্রতিটি তারিখে গ্রুপ করা ভর্তি
  - প্রতিটি ভর্তিতে সদস্যের স্ট্যাটাস পরিসংখ্যান
  - হেড অফিসে যাচাইকৃত সংখ্যা দেখায়

**হেড অফিসের জন্য:**
- `AdmissionMemberReview.tsx` - ব্যক্তিগত সদস্য রিভিউ পেজ
  - সদস্যের সম্পূর্ণ তথ্য
  - অনুমোদন/সংশোধন/প্রত্যাখ্যান অপশন
  - প্রতিটি সিদ্ধান্তে মন্তব্য যোগ করা যায়
  - শাখার আগের প্রতিক্রিয়া দেখা যায়

- `AdmissionDetailView.tsx` - সম্পূর্ণ ভর্তির বিস্তারিত পেজ
  - সকল মেম্বারের তালিকা
  - প্রতিটি মেম্বারের যাচাই স্ট্যাটাস
  - ফিল্টার এবং সার্চ অপশন

## কাজের প্রবাহ

### ব্রাঞ্চ স্তর:
1. সদস্য ভর্তি তথ্য জমা দেয় (Excel সহ)
2. তারিখ অনুযায়ী ভর্তি দেখতে পারে (ByDateView)
3. হেড অফিস থেকে প্রতিক্রিয়া আসলে দেখা যায়

### হেড অফিস স্তর:
1. ভর্তি সাবমিশন রিভিউ করে
2. প্রতিটি সদস্য আলাদাভাবে অনুমোদন/অস্বীকার করতে পারে
3. সংশোধনের প্রয়োজন হলে অনুরোধ করতে পারে
4. সিদ্ধান্ত এবং মন্তব্য সংরক্ষণ করা হয়

## ব্যবহার করার জন্য

### ব্রাঞ্চ ইউজার:
```
/admissions/api/by-date এ GET করলে তারিখ অনুযায়ী ভর্তি পাবেন
স্ট্যাটাস: pending, issue, approved, rejected, head_office_reviewed
```

### হেড অফিস ইউজার:
```
1. /head-office/admissions/submissions - সব সাবমিশন দেখুন
2. ক্লিক করে /head-office/admissions/{id}/detail - বিস্তারিত দেখুন
3. প্রতিটি মেম্বারের জন্য রিভিউ দিন
4. সিদ্ধান্ত রাখুন (অনুমোদন/সংশোধন/প্রত্যাখ্যান)
```

## স্ট্যাটাস ট্র্যাকিং

### admission_members.status (সামগ্রিক স্ট্যাটাস):
- `pending` - প্রাথমিক অবস্থা
- `issue` - সমস্যা আছে
- `approved` - অনুমোদিত
- `rejected` - প্রত্যাখ্যাত

### admission_members.head_office_decision (হেড অফিসের সিদ্ধান্ত):
- `pending` - এখনও যাচাই করা হয়নি
- `approved` - অনুমোদন দেওয়া হয়েছে
- `rejected` - প্রত্যাখ্যান করা হয়েছে
- `needs_correction` - সংশোধনের অনুরোধ করা হয়েছে

## মাইগ্রেশন চালানো
```bash
php artisan migrate
```

এই মাইগ্রেশন ফাইল চলবে: 
`database/migrations/2024_01_21_000000_add_headoffice_tracking_to_admission_members.php`
