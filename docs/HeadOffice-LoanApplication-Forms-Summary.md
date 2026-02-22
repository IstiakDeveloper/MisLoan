# Head Office Loan Application – কি করা হচ্ছে এবং ফর্ম ম্যাপিং

## HeadOfficeLoanController এ কি কি আছে

| Method | কাজ |
|--------|-----|
| **index()** | সব শাখার সব Loan Application তালিকা (তারিখ, জোন, এরিয়া, শাখা, স্ট্যাটাস, সার্চ ফিল্টার)। পেজিনেটেড। `HeadOffice/LoanApplications` পেজ রেন্ডার। |
| **print()** | একই ফিল্টার দিয়ে তালিকা প্রিন্ট ভিউ। `HeadOffice/LoanApplicationsPrint`। |
| **process()** | শুধু **pending_head_office** স্ট্যাটাসের আবেদনগুলো (তারিখ + সার্চ ফিল্টার)। `HeadOffice/ProcessLoans` পেজ। |
| **show($loanApplication)** | একটা নির্দিষ্ট Loan Application এর বিস্তারিত + **কোন ফর্মগুলো দেখাবে** (product/amount অনুযায়ী) + **কোন ফর্মে ডেটা সেভ আছে** সেটা ফ্ল্যাগ। `HeadOffice/LoanApplicationShow` পেজ। |
| **storeIssue()** | ঐ আবেদনের জন্য হেড অফিস থেকে “সমস্যা” সেভ (LoanApplicationIssue)। |
| **approveSingle()** | একটা আবেদন অনুমোদন (pending_head_office → approved)। পেন্ডিং ইস্যু থাকলে অনুমোদন হয় না। |
| **approveAll()** | নির্বাচিত তারিখের সব pending_head_office আবেদন একসাথে অনুমোদন (ইস্যু থাকা গুলো বাদ)। |
| **rejectSingle()** | আবেদন প্রত্যাখ্যান + কারণ সেভ। |
| **destroy()** | শুধু draft/submitted আবেদন ডিলিট। |

---

## Loan Application ফর্মগুলো – ID ও ডাটাবেস কলাম

মেম্বার সাইডে যে ফর্মগুলো আছে সেগুলোই হেড অফিস শো পেজে **প্রিভিউ** হিসেবে দেখানো হয়। নিচের ম্যাপিংটা দুই জায়গাতেই একই:

| Form ID | ফর্মের নাম (বাংলা) | LoanApplication কলাম | মেম্বার সাইড রাউট/ফর্ম |
|---------|---------------------|------------------------|---------------------------|
| **1** | ঋণ চুক্তি পত্র | `loan_agreement_data` | LoanAgreement |
| **2** | জামিনদার/দায়িত্ব গ্রহণকারীর অঙ্গীকার নামা | `guarantor_info` | GuarantorCommitment |
| **3** | মৃত্যুঝুঁকি তহবিল আবেদন | `nominee_info` | DeathRiskFund |
| **4** | সরেজমিন তদন্ত প্রতিবেদন | `asset_info` | FieldInvestigation |
| **5** | আবেদন ও অনুমোদনপত্র | `business_plan` | LoanApplicationApproval |

- মেম্বার সাইডে এই ফর্মগুলো দিয়ে ডেটা জমা হয় → উপরের কলামগুলোতে সেভ হয়।
- হেড অফিস `show()` এ ঐ একই কলাম থেকে ডেটা লোড করে `visible_form_ids` ও `form_saved` সেট করে; ফ্রন্টে সেই অনুযায়ী বাটন + প্রিভিউ (নিচে বিস্তারিত)।

---

## show() এ ফর্ম লজিক (কোন ফর্ম দেখাবে)

`HeadOfficeLoanController::show()`:

1. **visible_form_ids** (কোন ফর্মগুলো এই আবেদনের জন্য প্রযোজ্য):
   - লোন প্রোডাক্টের **installment_type** যদি **weekly** হয় → `[1, 2, 3, 4]`
   - নাহলে (মাসিক/অন্যান্য):
     - **requested_amount < ১ লাখ** → `[5, 2, 3, 4]`
     - **requested_amount ≥ ১ লাখ** → `[5, 3]`

2. **form_saved** (কোন কলামে ডেটা আছে):
   - `loan_agreement_data` → form 1  
   - `guarantor_info` → form 2  
   - `nominee_info` → form 3  
   - `asset_info` → form 4  
   - `business_plan` → form 5  

3. ফ্রন্টএন্ড (`LoanApplicationShow.tsx`):
   - শুধু **visible_form_ids** এর ভেতর যেসব ফর্মের **form_saved[id] === true** এবং আসলে ডেটায় কিছু আছে, সেগুলোর বাটন দেখায়।
   - বাটনে ক্লিক করলে সেই ফর্মের কম্পোনেন্ট **onlyPreview** + **savedData** দিয়ে রেন্ডার হয় (এডিট করা যায় না, শুধু দেখানো/প্রিন্ট)।

---

## আমাদের কাজ (Loan Application ফর্ম নিয়ে)

- **মেম্বার সাইড:**  
  ফর্মগুলোই ডেটা সেভ করে:  
  `LoanAgreement` → `loan_agreement_data`,  
  `GuarantorCommitment` → `guarantor_info`,  
  `DeathRiskFund` → `nominee_info`,  
  `FieldInvestigation` → `asset_info`,  
  `LoanApplicationApproval` → `business_plan`।

- **হেড অফিস:**  
  এই একই ডেটা `HeadOfficeLoanController::show()` দিয়ে লোড হয় এবং `LoanApplicationShow.tsx` এ উপরের টেবিল অনুযায়ী ফর্ম ১–৫ হিসেবে দেখানো/প্রিন্ট করা হয়। নতুন ফর্ম যোগ করতে হলে:
  1. মডেলে কলাম (অথবা JSON ভেতর ফিল্ড) যোগ।
  2. মেম্বার সাইডে ফর্ম যোগ করে সেই কলামে সেভ।
  3. `show()` এ `visible_form_ids` / `form_saved` এবং প্রযোজ্য হলে নতুন ফর্ম আইডি যোগ।
  4. `LoanApplicationShow.tsx` এ `FORM_NAMES`, `savedFormIds` স্যুইচ, এবং প্রিভিউ ব্লকে নতুন ফর্ম কম্পোনেন্ট যোগ।

এই ডকুমেন্টটা রাখলে পরবর্তীতে কোন ফর্ম কোন কলামে এবং হেড অফিসে কিভাবে দেখাচ্ছে সেটা দ্রুত মিলিয়ে নেওয়া যাবে।
