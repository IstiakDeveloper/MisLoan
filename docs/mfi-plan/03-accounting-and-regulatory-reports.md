# ধাপ ৩: Double-Entry Accounting (AIS) ও MRA / PKSF রিপোর্ট প্ল্যান

**লক্ষ্য:** MIS (লোন ও সঞ্চয়) এবং AIS (অ্যাকাউন্টিং)-কে অটোমেটিকভাবে যুক্ত করা, যাতে ব্রাঞ্চের প্রতিদিনের কাজ শেষে ব্যালেন্স শিট, ট্রায়াল ব্যালেন্স এবং **MRA / PKSF** রিপোর্ট ১ ক্লিকে পাওয়া যায়।

---

## ১. এই ধাপে কী কী লাগবে?

### ক. ডাবল-এন্ট্রি অ্যাকাউন্টিং (AIS)
- [ ] **Chart of Accounts (COA):** Asset, Liability, Equity, Income, Expense হেড তৈরি (PKSF/MRA স্ট্যান্ডার্ড অনুযায়ী)।
- [ ] **Voucher System:** `vouchers` ও `voucher_entries` টেবিল (Receipt, Payment, Journal, Contra ভাউচার)।
- [ ] **MIS → AIS Auto-Posting:** লোন ডিসবার্স, কিস্তি আদায় (আসল + সার্ভিস চার্জ), সঞ্চয় জমা/উত্তোলন, এবং **LLP Voucher Process** (ধাপ ১) রান করলে অটোমেটিক সংশ্লিষ্ট অ্যাকাউন্টিং হেডে ডেবিট/ক্রেডিট এন্ট্রি পড়া।
- [ ] **Cashbook & Bankbook:** প্রতিটি ব্রাঞ্চের দৈনিক নগদ ও ব্যাংক স্থিতি, যা `Complete Work Process` (Day Close)-এর সময় মিলিয়ে দেখা হবে।

### খ. আর্থিক ও রেগুলেটরি রিপোর্ট (Reports)
- [ ] **Financial Statements:** Trial Balance, Receipt & Payment Statement, Income & Expenditure Statement, Balance Sheet (Branch-wise ও Consolidated)।
- [ ] **MFI Risk & Portfolio Reports:** PAR (Portfolio at Risk — 1-30, 31-60, 61-90, 91-180, 180+ days), Loan Aging, LLP (Loan Loss Provisioning)।
- [ ] **PKSF & MRA Reports:** POMIS-1, POMIS-2, POMIS-3 এবং MRA-MIS মাসিক/ষাণ্মাসিক রিপোর্ট।

---

## ২. কার কী কাজ? (Head Office vs Branch User)

| কাজ | Head Office | Branch User |
| :--- | :--- | :--- |
| **Chart of Accounts ও ম্যাপিং** | COA তৈরি এবং কোন লোন/সঞ্চয় প্রোডাক্ট কোন লেজার হেডে যাবে তা ম্যাপ করা। | COA পরিবর্তন করতে পারবে না; শুধু অনুমোদিত হেডে ভাউচার এন্ট্রি করবে। |
| **দৈনিক ভাউচার ও ক্যাশবুক** | ব্রাঞ্চের ফান্ড ট্রান্সফার ও HO ভাউচার অনুমোদন। | অফিস খরচ, ব্যাংক জমা/উত্তোলন ভাউচার এন্ট্রি ও দিন শেষে ক্যাশবুক মেলানো। |
| **LLP ও Month-End** | সব ব্রাঞ্চের কনসোলিডেটেড Trial Balance ও Balance Sheet তৈরি। | মাসের শেষে `LLP Voucher Process` ও `Monthly Process` রান করা। |
| **MRA / PKSF রিপোর্ট** | পুরো প্রতিষ্ঠানের POMIS ও MRA রিপোর্ট ডাউনলোড ও সাবমিট। | নিজের ব্রাঞ্চের মাসিক MIS/AIS রিপোর্ট যাচাই করা। |

---

## ৩. রোল-আউট স্ট্র্যাটেজি (Pilot & Go-Live)
- [ ] **ডাটা মাইগ্রেশন:** পুরোনো সিস্টেম থেকে মেম্বার, সচল লোন ব্যালেন্স, সঞ্চয় স্থিতি এবং ওপেনিং ব্যালেন্স শিট ইম্পোর্ট করা (`Manage Day Initial` তারিখে)।
- [ ] **পাইলট রান (২-৩টি ব্রাঞ্চ):** প্রথমে ২-৩টি ব্রাঞ্চে বর্তমান সিস্টেমের পাশাপাশি নতুন সিস্টেম চালিয়ে ১ মাসের POMIS ও Trial Balance মেলানো।
- [ ] **ফুল রোল-আউট:** পাইলট সফল হলে ধাপে ধাপে সব ব্রাঞ্চে চালু করা।
