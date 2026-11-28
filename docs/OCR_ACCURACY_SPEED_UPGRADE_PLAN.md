# `C:\Code\OCR` — Accuracy (`পিতা`, `মাতা`, `ঠিকানা`) ও Speed আপগ্রেড প্ল্যান

`C:\Code\OCR`-এর `pipeline.py`, `parser.py`, ও `templates/smart_nid_front.json` কোড যাচাই করে নিচের **৪টি মূল সমস্যা** পাওয়া গেছে, যার কারণে `পিতা`, `মাতা` ও `ঠিকানা` মিস হচ্ছে এবং প্রসেসিং ধীর হচ্ছে:

---

## ১. চিহ্নিত মূল সমস্যাগুলো (Root Causes)

1. **`parser.py` (Line 122–124) — একটি অপ্রত্যাশিত চিহ্নেই পুরো `পিতা`/`মাতা` মুছে যাওয়া:**
   - `normalize_field()`-এ `,` বা `/` বা OCR-এর কোনো একটি ভুল চিহ্ন/সংখ্যা থাকলে পুরো `father_name` / `mother_name` কে `""` (খালি) করে দেওয়া হচ্ছে।
2. **`pipeline.py` (Line 74–105) — `read_regions()`-এ শুধু Tesseract ব্যবহার:**
   - `smart_nid_front.json`-এর ROI ক্রপগুলোতে শুধু `Tesseract` (`psm=7`) চালানো হয়, `EasyOCR` চালানো হয় না। অথচ বাংলা যুক্তাক্ষরে `EasyOCR` (`models/easyocr/bengali.pth`) অনেক বেশি নির্ভুল।
   - আবার `নাম` ২ লাইনে হলে `father_or_spouse` ও `mother_name` নিচে সরে গিয়ে `roi` বক্স থেকে বাদ পড়ে।
3. **`parser.py` (Line 161–205) — Back Side `ঠিকানা` পার্সিং গ্যাপ:**
   - `INLINE_LABEL` শুধু কোলন (`:` / `ঃ`) থাকলে `জেলা:`/`উপজেলা:` ধরে। কিন্তু স্মার্ট কার্ডের পেছনে প্রায়ই কোলন ছাড়া কমা দিয়ে লেখা থাকে (যেমন: `..., ডাকঘর: সদর - ৬৫০০, নওগাঁ সদর, নওগাঁ`)।
   - `post_code` বের করার জন্য `- 6500` বা ৪-ডিজিট সংখ্যা ধরার ফলব্যাক নেই।
4. **স্পিড সমস্যা (`pipeline.py`):**
   - প্রতিবার Front এবং Back-এ **Tesseract + PaddleOCR + EasyOCR + ৬টি ROI Crop** সব একসাথে সিরিয়ালি চলার কারণে সময় বেশি লাগে।

---

## ২. ধাপে ধাপে সম্পূর্ণ সমাধান প্ল্যান (Phase-by-Phase)

### Phase 1: `parser.py` ফিক্স (তাৎক্ষণিক `পিতা`, `মাতা` ও `ঠিকানা` রিকভারি)
1. **নিরাপদ টেক্সট ক্লিনিং (`normalize_field`):**
   - `father_name`, `mother_name`, `spouse_name`, `name_bn` থেকে OCR-এর অবাঞ্ছিত চিহ্ন (`|`, `/`, `;`, `*`, সংখ্যা) সরিয়ে (strip/clean করে) ভ্যালু রাখুন—পুরো ফিল্ড `""` করে দেবেন না (যতক্ষণ অন্তত ২টি বৈধ বর্ণ থাকে)।
2. **লেবেল-বানান সহনশীলতা (`LABELS`):**
   - বাংলা OCR-এ `পিতা` অনেক সময় `পিত`, `পিতাঃ`, `পিতার` বা `মাতা` -> `মাত`, `মাতাঃ`, `মাতার` আসে। এগুলো `LABELS`-এ যোগ করুন এবং `LINE_LABEL` / `INLINE_LABEL`-এ আরও নমনীয় ম্যাচিং রাখুন।
3. **Smart Back-Side ঠিকানা ও Post Code পার্সার (`break_address`):**
   - `ঠিকানা` না মিললেও Back Side-এ `বাসা/হোল্ডিং`, `গ্রাম/রাস্তা`, `ডাকঘর`, `উপজেলা`, `জেলা` শব্দ থাকলে সেগুলোকে `address` হিসেবে সংগ্রহ করুন।
   - টেক্সট থেকে ৪-ডিজিটের `post_code` (`\b\d{4}\b`) অটো-এক্সট্র্যাক্ট করুন।
   - MisLoan-এর ৬৪ জেলার বাংলা নামের ডিকশনারি দিয়ে কোলন ছাড়াই `district` ও `upazila` ম্যাচ করুন।

### Phase 2: `pipeline.py` — ROI ও EasyOCR ইন্টিগ্রেশন
1. **`read_regions()`-এ EasyOCR ফলব্যাক:**
   - বাংলা ফিল্ড (`name_bn`, `father_or_spouse`, `mother_name`, `address`)-এ Tesseract খালি বা কম কনফিডেন্স দিলে সাথে সাথেই সেই ক্রপড ইমেজে `self.engines.easyocr.read()` চালান।
2. **Dynamic Vertical Anchor Search (`layout.py`):**
   - Fixed `[x, y, w, h]`-এর ওপর নির্ভর না করে Tesseract/Paddle-এর পাওয়া `পিতা`/`মাতা` লেবেলের Y-coordinate অনুযায়ী ডাইনামিকভাবে ওই লাইনের ডান পাশ ক্রপ করুন।

### Phase 3: স্পিড অপ্টিমাইজেশন (লক্ষ্য: ~১.৫ – ২.৫ সেকেন্ড)
1. **ইঞ্জিন ওভারল্যাপ কমানো:**
   - `read_page()`-এ Smart NID-র ইংরেজি/সংখ্যা পড়তে `PaddleOCR` + `Tesseract` যথেষ্ট; `EasyOCR` শুধু বাংলা টেক্সট বক্সে (`BENGALI_SCRIPT` বা `name_bn`/`father`/`mother`/`address` ROI) চালান।
2. **Smart Card Back-এ Barcode First:**
   - Back image এলে **প্রথমেই** `read_pdf417()` (`< 50ms`) চালান; বারকোড পেলে NID/নাম/DOB নিশ্চিত হয়ে যাবে, ফলে শুধু `address` অঞ্চলটুকু পড়লেই চলবে।
3. **Parallel Execution (`ThreadPoolExecutor`):**
   - `Front` ও `Back` প্রসেসিং বা `Tesseract` ও `PaddleOCR` প্যারালালি রান করলে সময় ~৪০% কমে যাবে।

### Phase 4: বেঞ্চমার্ক ও ভেরিফিকেশন
1. `C:\Code\OCR` প্রজেক্টে `pytest` রান করে সব টেস্ট পাস নিশ্চিত করা।
2. ৩টি বাস্তব Smart NID, ৩টি পুরাতন Laminated NID এবং ২টি Online Copy দিয়ে `scripts/benchmark.py` চালিয়ে `name_bn`, `father_name`, `mother_name`, `address`, `district`, `post_code` এবং `processing_time_ms` যাচাই করা।
3. MisLoan-এর `/member-admissions/create` থেকে End-to-End ফর্ম Auto-Fill টেস্ট করা।
