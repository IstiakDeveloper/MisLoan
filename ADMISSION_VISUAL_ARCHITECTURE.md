# 📊 ভিজ্যুয়াল আর্কিটেকচার এবং প্রবাহ চার্ট

## সিস্টেম আর্কিটেকচার

```
┌─────────────────────────────────────────────────────────────────────┐
│                      BRANCH USER (শাখা ব্যবহারকারী)                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📄 Dashboard                                                        │
│    └─ সদস্য ভর্তি মেনু                                               │
│       ├─ সাধারণ তালিকা (/admissions)                               │
│       └─ ✨ নতুন: তারিখ অনুযায়ী (/admissions/by-date)             │
│           │                                                         │
│           └─ API: GET /admissions/api/by-date                      │
│               ↓                                                     │
│         ┌─────────────────────────┐                                 │
│         │ ByDateView Component    │                                 │
│         ├─────────────────────────┤                                 │
│         │ 📅 প্রতি তারিখ অনুযায়ী   │                                 │
│         │ 📊 স্ট্যাটাস সামারি        │                                 │
│         │ 📈 মোট সদস্য সংখ্যা     │                                 │
│         └─────────────────────────┘                                 │
│           │                                                         │
│           └─ প্রতিটি মেম্বার → AdmissionMember                      │
│               │                                                     │
│               ├─ status: pending/issue/approved/rejected          │
│               ├─ ✨ head_office_decision: approved/rejected/...   │
│               ├─ ✨ head_office_remarks: মন্তব্য                  │
│               ├─ ✨ head_office_reviewed_at: তারিখ                │
│               ├─ ✨ branch_feedback_at: তারিখ                     │
│               └─ ✨ branch_correction_remarks: মন্তব্য             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              ↑                    ↓
                              │                    │
                    ┌─────────────────────────────────────┐
                    │   DATABASE (admission_members)       │
                    └─────────────────────────────────────┘
                              ↑                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    HEAD OFFICE USER (হেড অফিস)                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📄 Dashboard                                                        │
│    └─ অ্যাডমিশন সাবমিশন (/head-office/admissions/submissions)    │
│       │                                                             │
│       ├─ সব সাবমিশন দেখুন                                           │
│       └─ ফিল্টার: জোন/এরিয়া/শাখা/স্ট্যাটাস                          │
│           │                                                         │
│           └─ ✨ নতুন: বিস্তারিত দেখুন                              │
│               │                                                     │
│               └─ Route: /head-office/admissions/{id}/detail       │
│                   ↓                                                 │
│           ┌──────────────────────────────────┐                     │
│           │ AdmissionDetailView Component    │                     │
│           ├──────────────────────────────────┤                     │
│           │ 📊 সব সদস্য তালিকা               │                     │
│           │ 🔍 সার্চ এবং ফিল্টার            │                     │
│           │ 📈 স্ট্যাটাস পরিসংখ্যান          │                     │
│           └──────────────────────────────────┘                     │
│               │                                                     │
│               └─ প্রতিটি সদস্যের জন্য:                             │
│                   │                                                 │
│                   ├─ "রিভিউ" বাটন                                  │
│                   │  │                                              │
│                   │  └─ ✨ নতুন: রিভিউ পেজ                        │
│                   │     Route: /head-office/admissions/member/{id}/review
│                   │       ↓                                         │
│                   │   ┌────────────────────────────────┐            │
│                   │   │AdmissionMemberReview Component │            │
│                   │   ├────────────────────────────────┤            │
│                   │   │ 📋 সদস্যের সম্পূর্ণ তথ্য      │            │
│                   │   │ 📝 তিনটি সিদ্ধান্ত অপশন:      │            │
│                   │   │    ✅ অনুমোদন করুন            │            │
│                   │   │    ⚠️ সংশোধনের অনুরোধ         │            │
│                   │   │    ❌ প্রত্যাখ্যান করুন        │            │
│                   │   │ 💬 মন্তব্য যোগ করুন           │            │
│                   │   │ 📂 শাখার আগের প্রতিক্রিয়া   │            │
│                   │   └────────────────────────────────┘            │
│                   │       │                                         │
│                   │       └─ POST requests:                         │
│                   │           ├─ /approve                           │
│                   │           ├─ /request-correction                │
│                   │           └─ /reject                            │
│                   │               ↓                                 │
│                   │           Update DB:                            │
│                   │           ├─ head_office_reviewed_at            │
│                   │           ├─ head_office_reviewed_by            │
│                   │           ├─ head_office_remarks                │
│                   │           ├─ head_office_decision               │
│                   │           ├─ status                             │
│                   │           └─ Log entry                          │
│                   │                                                 │
│                   └─ ব্রাঞ্চ তথ্য দেখা:                             │
│                       └─ branch_feedback_at                         │
│                       └─ branch_correction_remarks                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ডেটা ফ্লো ডায়াগ্রাম

```
STEP 1: ব্রাঞ্চ সাবমিশন
───────────────────────
  Branch User
      ↓
  Excel + Images + Data
      ↓
  POST /admissions
      ↓
  Create MemberAdmission
  Create AdmissionMembers (multiple)
      ↓
  Database:
  ├─ member_admissions
  │  └─ status: 'pending'
  │  └─ submitted_at: now()
  │
  └─ admission_members (×N)
     ├─ status: 'pending'
     ├─ head_office_decision: 'pending'  ← নতুন
     ├─ All other data...
     └─ [head_office_reviewed_at: NULL]  ← প্রথমে খালি


STEP 2: ব্রাঞ্চ তারিখ অনুযায়ী দেখা
──────────────────────────────────
  Branch User
      ↓
  GET /admissions/api/by-date
      ↓
  Query: admission_members
  ├─ WHERE submitted_at >= date
  └─ WHERE submitted_at < date + 1
      ↓
  Response:
  ├─ প্রতি তারিখ
  │  ├─ মোট সদস্য
  │  ├─ প্রতিটি ভর্তি
  │  │  ├─ total: 8
  │  │  ├─ pending: 3
  │  │  ├─ issue: 1
  │  │  ├─ approved: 2
  │  │  ├─ rejected: 2
  │  │  └─ head_office_reviewed: 5 ← নতুন কাউন্ট
  │  └─ ...
  └─ ...


STEP 3: হেড অফিস বিস্তারিত দেখা
──────────────────────────────
  Head Office User
      ↓
  /head-office/admissions/submissions
      ↓
  মেম্বার বেছে নেয়
      ↓
  /head-office/admissions/{id}/detail
      ↓
  কোয়েরি: MemberAdmission with admissionMembers
      ↓
  প্রতিটি মেম্বার দেখায়:
  ├─ member_name
  ├─ mobile
  ├─ status
  ├─ head_office_decision ← নতুন
  ├─ head_office_reviewed_at ← নতুন
  └─ রিভিউ বাটন


STEP 4: মেম্বার রিভিউ এবং সিদ্ধান্ত
───────────────────────────────────
  Head Office User
      ↓
  /head-office/admissions/member/{id}/review
      ↓
  মেম্বারের তথ্য দেখা
      ↓
  তিনটি বাটনের মধ্যে একটি বেছে নেয়
      ↓
  মন্তব্য লিখে নিশ্চিত করে
      ↓
  POST /head-office/admissions/member/{id}/approve
      └─ Data: { remarks: "..." }
  
  অথবা
  
  POST /head-office/admissions/member/{id}/request-correction
      └─ Data: { remarks: "..." }
  
  অথবা
  
  POST /head-office/admissions/member/{id}/reject
      └─ Data: { remarks: "..." }
      ↓
  Database Update:
  ├─ head_office_reviewed_at: now() ← নতুন
  ├─ head_office_reviewed_by: user.id ← নতুন
  ├─ head_office_remarks: remarks ← নতুন
  ├─ head_office_decision: 'approved'/'rejected'/'needs_correction' ← নতুন
  ├─ status: update (if approved/rejected)
  └─ Log entry
      ↓
  পেজ রিফ্রেশ হয়
      ↓
  ব্রাঞ্চ ব্যবহারকারী পরবর্তীবার দেখলে:
  └─ head_office_decision দেখবে


STEP 5: (ঐচ্ছিক) শাখা সংশোধন করে
──────────────────────────────────
  যদি head_office_decision = 'needs_correction'
      ↓
  Branch User
      ↓
  ইস্যু রেসপন্স দেয়
      ↓
  সংশোধিত তথ্য জমা দেয়
      ↓
  Database Update:
  ├─ branch_feedback_at: now() ← নতুন
  ├─ branch_correction_remarks: remarks ← নতুন
  └─ status: 'pending' (resubmit)
      ↓
  হেড অফিস পুনরায় রিভিউ করে
      ↓
  পুনরায় সিদ্ধান্ত নেয়
```

---

## ডাটাবেস স্কিমা (নতুন ফিল্ড)

```
admission_members TABLE
═══════════════════════════════════════════════════════════════════

আগের ফিল্ড:
├─ id
├─ member_admission_id
├─ member_name
├─ mobile
├─ status (pending, issue, approved, rejected)
├─ rejection_reason
├─ [... 15+ other fields ...]
└─ created_at, updated_at, deleted_at

নতুন ফিল্ড (6টি):
├─ ✨ head_office_reviewed_at (TIMESTAMP, nullable)
│  └─ কখন হেড অফিস যাচাই করেছে
│
├─ ✨ head_office_reviewed_by (BIGINT, nullable)
│  └─ কে যাচাই করেছে (User ID)
│  └─ Foreign Key: users(id)
│
├─ ✨ head_office_remarks (TEXT, nullable)
│  └─ হেড অফিসের মন্তব্য/রিমার্ক
│
├─ ✨ head_office_decision (ENUM, default='pending')
│  └─ মূল্য: 'pending', 'approved', 'rejected', 'needs_correction'
│
├─ ✨ branch_feedback_at (TIMESTAMP, nullable)
│  └─ কখন শাখা প্রতিক্রিয়া দিয়েছে
│
└─ ✨ branch_correction_remarks (TEXT, nullable)
   └─ শাখার সংশোধন মন্তব্য

সম্পর্ক:
├─ memberAdmission (belongsTo MemberAdmission)
└─ headOfficeReviewedBy (belongsTo User) ← নতুন
```

---

## স্টেট ট্রানজিশন ডায়াগ্রাম

```
সম্ভাব্য স্ট্যাটাস ট্রানজিশন:
═════════════════════════════════════════════

Initial State:
    ↓
[pending, head_office_decision=pending]
    │
    ├─────────────────┬─────────────────┬────────────────┐
    │                 │                 │                │
    ↓                 ↓                 ↓                ↓
[approved]   [rejected]   [needs_correction]    (wait)
│                │              │
├─ status         ├─ status      └─ status = issue
├─ approved      ├─ rejected      status = issue
└─ done          └─ done          │
                                  └─ branch corrects
                                     │
                                     └─ resubmit
                                        │
                                        └─ back to [pending]
                                           (cycle repeats)
```

---

## API এন্ডপয়েন্ট সারি

```
BRANCH ENDPOINTS (নতুন)
════════════════════════

GET  /admissions/api/by-date
└─ Response: { success: true, data: [...] }
   └─ প্রতি তারিখে গ্রুপ করা ভর্তি

GET  /admissions/api/member/{id}/review-status
└─ Response: { success: true, member: {...} }
   └─ সদস্যের রিভিউ স্ট্যাটাস


HEAD OFFICE ENDPOINTS (নতুন)
═════════════════════════════════════════════

GET  /head-office/admissions/{id}/detail
└─ Inertia page: AdmissionDetailView
   └─ সম্পূর্ণ ভর্তি বিস্তারিত

GET  /head-office/admissions/member/{id}/review
└─ Inertia page: AdmissionMemberReview
   └─ ব্যক্তিগত মেম্বার রিভিউ

POST /head-office/admissions/member/{id}/approve
└─ Data: { remarks: string }
├─ action: Approve member
└─ Response: { success: true, message: "..." }

POST /head-office/admissions/member/{id}/request-correction
└─ Data: { remarks: string (required) }
├─ action: Request correction
└─ Response: { success: true, message: "..." }

POST /head-office/admissions/member/{id}/reject
└─ Data: { remarks: string (required) }
├─ action: Reject member
└─ Response: { success: true, message: "..." }
```

---

## কম্পোনেন্ট হায়ারার্কি

```
BRANCH SIDE:
────────────
AdminLayout
├─ Head (title: "সদস্য ভর্তি - তারিখ অনুযায়ী")
├─ Header
│  ├─ h1: শিরোনাম
│  └─ p: সংক্ষিপ্ত বর্ণনা
│
└─ Main Content
   └─ DateGroupList
      └─ DateGroup[] (map)
         ├─ DateGroupHeader
         │  ├─ Calendar icon
         │  ├─ Date: 21-01-2026
         │  ├─ Total members count
         │  └─ Admission count
         │
         └─ AdmissionList[]
            └─ AdmissionCard
               ├─ application_no
               ├─ submitted_at
               ├─ status badge
               ├─ MemberStatistics (6 boxes)
               │  ├─ total
               │  ├─ pending
               │  ├─ issue
               │  ├─ approved
               │  ├─ rejected
               │  └─ head_office_reviewed ← নতুন
               │
               └─ ViewDetails button
                  └─ navigate to /admissions/{id}


HEAD OFFICE SIDE:
─────────────────
AdminLayout
├─ Head (title: "ভর্তি - {application_no}")
├─ Header
│  ├─ h1: Application number
│  └─ branch_name + submitted_at
│
├─ Statistics (5 boxes)
│  ├─ total_members
│  ├─ pending_count
│  ├─ approved_count
│  ├─ correction_count
│  └─ rejected_count
│
├─ Filters
│  ├─ Status dropdown
│  └─ Search input
│
└─ MemberList[]
   └─ MemberCard
      ├─ member_name
      ├─ mobile
      ├─ status badge
      ├─ head_office_decision badge ← নতুন
      ├─ head_office_reviewed_at ← নতুন
      ├─ head_office_reviewed_by ← নতুন
      │
      └─ Review button
         └─ navigate to /head-office/admissions/member/{id}/review
            └─ AdmissionMemberReview page
               ├─ Member info
               ├─ Review section (3 buttons)
               │  ├─ Approve button
               │  ├─ Request correction button
               │  └─ Reject button
               │
               ├─ Remarks input (conditional)
               │  └─ Textarea for comments
               │
               └─ Confirm button
                  └─ POST /head-office/admissions/member/{id}/{action}
```

---

এই আর্কিটেকচার চার্টগুলি আপনার সম্পূর্ণ সিস্টেমের ভিজ্যুয়াল প্রতিনিধিত্ব করে। আপনি এখন সম্পূর্ণভাবে বুঝতে পারবেন ডেটা কীভাবে প্রবাহিত হচ্ছে এবং প্রতিটি উপাদান কীভাবে কাজ করছে। ✨
