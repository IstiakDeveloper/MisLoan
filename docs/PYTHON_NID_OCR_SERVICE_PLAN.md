# Python NID OCR Microservice — 100% Complete Phase-by-Phase Plan

এই ডকুমেন্টটি **MisLoan** প্রজেক্টের সাথে যুক্ত করার জন্য আলাদাভাবে হোস্ট করা **Python FastAPI + OpenCV + Tesseract 5 (`tessdata_best`) + PaddleOCR** ভিত্তিক Bangladesh NID OCR সার্ভিসের **সম্পূর্ণ, ধাপে ধাপে (Phase-by-Phase) প্রোডাকশন ব্লুপ্রিন্ট**।

---

## ১. আগের খসড়ায় যেসব গ্যাপ ছিল (এবং এখানে যা সমাধান করা হয়েছে)

1. **Pinned `requirements.txt`:** `paddlepaddle`, `paddleocr`, `numpy<2.0`, `opencv-python-headless` ভার্সন পিন করা (যাতে ইনস্টলের সময় ডিপেন্ডেন্সি কনফ্লিক্ট না হয়)।
2. **Smart Card PDF417 Barcode Decoder:** স্মার্ট NID-র পেছনের বারকোড থেকে ১০০% নির্ভুল NID/নাম/DOB পড়ার ধাপ যোগ করা হয়েছে।
3. **ROI Template Schema:** `templates/*.json`-এর আসল ফরম্যাট ও Anchor Label লজিক দেওয়া হয়েছে।
4. **Nginx + Production Deployment:** `client_max_body_size 15M`, `systemd`, `Dockerfile` ও SSL কনফিগ যোগ করা হয়েছে।
5. **Phase-by-Phase Acceptance Criteria:** প্রতিটি Phase শেষে কীভাবে টেস্ট করে নিশ্চিত হবেন (Definition of Done) তা স্পষ্টভাবে দেওয়া হয়েছে।

---

## ২. সিস্টেম আর্কিটেকচার ও MisLoan সংযোগ

```text
[Field Officer Mobile / React]
        │  (Compressed Image <= 2MB)
        ▼
[MisLoan Laravel Backend]  ──(Bearer Token, Multipart front/back)──▶ [Python FastAPI OCR (Port 8001)]
        │                                                               ├── 1. Auth + MIME/Size Guard
        │                                                               ├── 2. Quality Gate (Blur/Dark/Res) -> 422
        │                                                               ├── 3. OpenCV Card Crop & Deskew
        │                                                               ├── 4. PDF417 Barcode (Smart Back)
        │                                                               ├── 5. Layout Detect + ROI Crop
        │                                                               ├── 6. Dual OCR (Tesseract 5 + PaddleOCR)
        ◀────────────── Structured JSON (200 / 422 / 503) ──────────────┴── 7. Normalize & Validate
```

---

## ৩. পূর্ণাঙ্গ ফোল্ডার স্ট্রাকচার (`nid-ocr-service/`)

```text
nid-ocr-service/
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI app, CORS/Auth middleware, error handlers
│   ├── config.py                   # Pydantic BaseSettings (.env loader)
│   ├── schemas.py                  # Request/Response Pydantic models
│   ├── routes/
│   │   ├── health.py               # GET /health
│   │   └── scan.py                 # POST /api/v1/nid/scan
│   └── services/
│       ├── quality.py              # Resolution, Laplacian blur, pitch-black check
│       ├── preprocess.py           # EXIF fix, card contour warp (1.586:1), CLAHE
│       ├── barcode.py              # Smart NID Back PDF417 decoder (optional boost)
│       ├── layout.py               # smart_nid / old_nid / online_copy detector + ROI crop
│       ├── recognition.py          # Tesseract 5 (tessdata_best) + PaddleOCR dual engine
│       ├── parser.py               # Bangla/English cleanup, পিতা/স্বামী split, DOB parse
│       └── validation.py           # 10/13/17-digit check, calendar date check, confidence
├── templates/
│   ├── smart_nid_front.json
│   ├── smart_nid_back.json
│   ├── old_nid_front.json
│   └── old_nid_back.json
├── models/
│   └── tessdata_best/              # ben.traineddata, eng.traineddata
├── tests/
│   ├── test_health.py
│   ├── test_quality.py
│   ├── test_parser.py
│   └── test_scan_api.py
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## ৪. Exact API Contract (MisLoan-এর `NidOcrService.php`-এর সাথে সামঞ্জস্যপূর্ণ)

### ৪.১ `GET /health`
- **Headers:** `Authorization: Bearer <NID_OCR_TOKEN>` (optional on `/health`, MisLoan `Test Connection` টোকেন সহ পাঠায়)
- **Response (`200 OK`):**
```json
{
  "status": "ok",
  "engines": {
    "tesseract": true,
    "paddleocr": true,
    "opencv": true
  },
  "version": "1.0.0"
}
```

### ৪.২ `POST /api/v1/nid/scan`
- **Headers:** `Authorization: Bearer <NID_OCR_TOKEN>`
- **Form Data:**
  - `front` (required image: jpg/jpeg/png/webp)
  - `back` (optional image: jpg/jpeg/png/webp)
- **Success (`200 OK`):**
```json
{
  "success": true,
  "card_type": "smart_nid",
  "verification_status": "unverified",
  "processing_time_ms": 840,
  "fields": {
    "name_bn": { "value": "ইসতিয়াক হোসাইন", "confidence": 0.97, "needs_review": false },
    "name_en": { "value": "ISTIAK HOSSAIN", "confidence": 0.98, "needs_review": false },
    "father_name": { "value": "মোঃ ...", "confidence": 0.96, "needs_review": false },
    "spouse_name": { "value": "", "confidence": 0.0, "needs_review": false },
    "mother_name": { "value": "মোসাঃ ...", "confidence": 0.95, "needs_review": false },
    "nid_number": { "value": "", "confidence": 0.0, "needs_review": false },
    "smart_card_number": { "value": "1234567890", "confidence": 0.99, "needs_review": false },
    "date_of_birth": { "value": "1995-04-12", "confidence": 0.99, "needs_review": false },
    "gender": { "value": "male", "confidence": 0.90, "needs_review": true },
    "address": { "value": "গ্রাম: ..., ডাকঘর: ..., উপজেলা: ..., জেলা: ...", "confidence": 0.92, "needs_review": true },
    "district": { "value": "নওগাঁ", "confidence": 0.94, "needs_review": false },
    "upazila": { "value": "নওগাঁ সদর", "confidence": 0.92, "needs_review": false },
    "post_code": { "value": "6500", "confidence": 0.96, "needs_review": false }
  },
  "warnings": []
}
```
- **Quality / Unreadable (`422 Unprocessable Entity`):**
```json
{
  "success": false,
  "message": "ছবিটি ঝাপসা বা অস্পষ্ট। অনুগ্রহ করে NID কার্ডটি পরিষ্কার আলোতে সোজা ধরে আবার স্ক্যান করুন।"
}
```
> **গুরুত্বপূর্ণ:** `422` রেসপন্স পেলে MisLoan সাথে সাথে **Instant Fail** দেখিয়ে ইউজারকে আবার ছবি তুলতে বলবে (কোনো ফলব্যাক চালাবে না)। আর `503`/কানেকশন এরর হলে MisLoan-এর `Auto` মোড থাকলে পরের ইঞ্জিনে যাবে।

---

## ৫. Phase-by-Phase Implementation Plan

### Phase 1: প্রজেক্ট সেটআপ, Auth, Health ও Dependency Pinning (Day 1)
**কাজসমূহ:**
1. Ubuntu 22.04/24.04 VPS-এ `tesseract-ocr`, `tesseract-ocr-ben`, `tesseract-ocr-eng`, `libgl1` ইনস্টল করা।
2. `models/tessdata_best/` ফোল্ডারে `tessdata_best` থেকে `ben.traineddata` ও `eng.traineddata` ডাউনলোড করা।
3. `requirements.txt` তৈরি করা (NumPy ও Paddle কনফ্লিক্ট এড়াতে পিন করা):
   ```text
   fastapi==0.115.6
   uvicorn[standard]==0.32.1
   python-multipart==0.0.19
   pydantic-settings==2.6.1
   numpy==1.26.4
   opencv-python-headless==4.10.0.84
   pillow==11.0.0
   pytesseract==0.3.13
   rapidfuzz==3.10.1
   paddlepaddle==2.6.2
   paddleocr==2.8.1
   pytest==8.3.4
   httpx==0.28.1
   ```
4. `app/main.py`, `app/config.py`, `app/routes/health.py` তৈরি করে Bearer Token যাচাই ও `GET /health` চালু করা।

**Phase 1 Done Criteria:**
- `curl -H "Authorization: Bearer <TOKEN>" http://127.0.0.1:8001/health` -> `200 OK`
- MisLoan-এর `Settings -> Test Connection (/health)` বাটনে ক্লিক করলে **"কানেকশন সফল!"** দেখাবে।

---

### Phase 2: Quality Gate ও OpenCV Card Preprocessing (Day 2)
**কাজসমূহ:**
1. `app/services/quality.py`:
   - MIME (`image/jpeg`, `image/png`, `image/webp`) এবং ফাইল সাইজ (`<= 10MB`) ও Max Pixel (`<= 25MP`) চেক।
   - Minimum resolution (`>= 450x280`), pitch-black (`mean_brightness < 25`), ও Laplacian blur check (`variance < 45` -> 422 বাংলা মেসেজ)।
2. `app/services/preprocess.py`:
   - `ImageOps.exif_transpose()` দিয়ে EXIF রোটেশন ঠিক করা।
   - Canny Edge + `cv2.findContours` দিয়ে NID কার্ডের ৪ কোণ শনাক্ত করে `cv2.getPerspectiveTransform` দিয়ে সোজা (`1000 x 630 px`, `1.586:1`) করা। (৪ কোণ না পেলে মূল ছবি থেকেই নিরাপদে প্রসেস করবে)।
   - বাংলা টেক্সটের জন্য **Grayscale + হালকা CLAHE (`clipLimit=2.0`)** তৈরি করা (কঠোর binary threshold ব্যবহার না করা, যাতে বাংলা যুক্তাক্ষর ভেঙে না যায়)।

**Phase 2 Done Criteria:**
- ঝাপসা/অন্ধকার ছবি পাঠালে `422` + বাংলা নির্দেশনা আসবে।
- বাঁকা/টেবিলে রাখা NID ছবি সোজা `1000x630` কার্ডে রূপান্তরিত হবে।

---

### Phase 3: Layout Detection, ROI Templates & Tesseract 5 Baseline (Day 3–4)
**কাজসমূহ:**
1. `templates/smart_nid_front.json`, `old_nid_front.json`, `smart_nid_back.json`, `old_nid_back.json` তৈরি করা:
   ```json
   {
     "layout": "smart_nid_front",
     "fields": {
       "name_bn": { "roi": [0.28, 0.34, 0.65, 0.11], "lang": "ben", "psm": 7 },
       "name_en": { "roi": [0.28, 0.45, 0.65, 0.10], "lang": "eng", "psm": 7 },
       "father_or_spouse": { "roi": [0.28, 0.55, 0.65, 0.10], "lang": "ben", "psm": 7 },
       "mother_name": { "roi": [0.28, 0.65, 0.65, 0.10], "lang": "ben", "psm": 7 },
       "date_of_birth": { "roi": [0.38, 0.76, 0.35, 0.09], "lang": "eng", "psm": 7 },
       "nid_number": { "roi": [0.38, 0.86, 0.50, 0.10], "lang": "eng", "psm": 7, "whitelist": "0123456789" }
     }
   }
   ```
2. `app/services/layout.py`:
   - কার্ডে "National ID Card" / "NID No" / চিপ আছে কিনা দেখে `smart_nid` vs `old_nid` শনাক্ত করা, এবং Anchor লেবেল (`নাম`, `পিতা`, `স্বামী`, `মাতা`, `Date of Birth`) খুঁজে ROI সূক্ষ্মভাবে অ্যাডজাস্ট করা।
   - অজানা লেআউট হলে Full-page OCR ফলব্যাক রাখা।
3. `app/services/recognition.py` (Tesseract 5 `tessdata_best`):
   - `--tessdata-dir ./models/tessdata_best --oem 1 --psm 7` দিয়ে প্রতিটি ক্রপড ফিল্ড পড়া।

**Phase 3 Done Criteria:**
- কমপক্ষে ২০–৩০টি বাস্তব Smart ও Old NID নমুনায় `nid_number` ও `date_of_birth` ৯৮%+ সঠিক আসছে।

---

### Phase 4: PaddleOCR Dual-Engine + Smart Card PDF417 + Parser/Validation (Day 5–6)
**কাজসমূহ:**
1. **PaddleOCR যুক্ত করা (`recognition.py`):**
   - বাংলা ও ইংরেজি ফিল্ডে Tesseract 5 এবং PaddleOCR উভয়ের আউটপুট তুলনা করা।
   - দুটো মিললে `confidence >= 0.95` ও `needs_review: false`; অমিল হলে বেশি যুক্তিযুক্ত রেজাল্ট রেখে `needs_review: true` মার্ক করা।
2. **Parser & Validation (`parser.py`, `validation.py`):**
   - `পিতা:` থাকলে `father_name`, `স্বামী:` থাকলে `spouse_name`-এ রাখা।
   - বাংলা ডিজিট (`০-৯`) -> ইংরেজি ডিজিট (`0-9`)।
   - ১০ ডিজিট -> `smart_card_number`, ১৩/১৭ ডিজিট -> `nid_number`।
   - ব্যাক সাইড থেকে `জেলা`, `উপজেলা`, `পোস্ট কোড` আলাদা পার্স করা।
   - NID নম্বর + নাম + DOB তিনটির কোনোটি ফাঁকা বা অকার্যকর হলে `422` রিটার্ন করা।

**Phase 4 Done Criteria:**
- `ইসতিয়াক হোসাইন`-এর মতো যুক্তাক্ষরযুক্ত বাংলা নাম সঠিকভাবে পড়া যাচ্ছে।
- সব ইউনিট টেস্ট (`pytest`) পাস করেছে।

---

### Phase 5: Docker / Systemd, Nginx SSL ও Security Hardening (Day 7)
**কাজসমূহ:**
1. `Dockerfile` ও `docker-compose.yml` তৈরি করে মেমোরি ও ওয়ার্কার লিমিট (`--workers 2`) সেট করা।
2. Nginx রিভার্স প্রক্সি + HTTPS SSL কনফিগার করা:
   ```nginx
   location / {
       client_max_body_size 15M;
       proxy_read_timeout 45s;
       proxy_pass http://127.0.0.1:8001;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
   }
   ```
3. কোনো NID ছবি ডিস্কে বা লগে সেভ না করা (শুধু RAM-এ `io.BytesIO` / `np.frombuffer` দিয়ে প্রসেস করা)।

**Phase 5 Done Criteria:**
- MisLoan থেকে **External API (Python)** মোড সিলেক্ট করে লাইভ মোবাইল ক্যামেরা ও আপলোড দিয়ে End-to-End Member Admission ফর্ম Auto-Fill টেস্ট সফল।

---

## ৬. MisLoan-এ কানেক্ট করার চূড়ান্ত ধাপ

1. MisLoan-এ SuperAdmin/Head Office দিয়ে লগইন করে **Settings** (`/head-office/nid-ocr-settings`) পেজে যান।
2. **NID OCR চালু রাখুন (ON)** অন করুন।
3. **External API (Python)** বা **Auto** সিলেক্ট করুন।
4. `Service Base URL` (যেমন `https://ocr.yourdomain.com`) এবং `Bearer Secret Token` বসিয়ে **Test Connection (`/health`)** ক্লিক করুন।
5. সেভ করে **Member Admission -> Create** এ গিয়ে মোবাইল/ডেস্কটপ থেকে টেস্ট করুন।
