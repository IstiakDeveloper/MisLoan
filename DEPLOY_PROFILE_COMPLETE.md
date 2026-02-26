# Deploy: Profile completion (Phone, PIN, Digital Signature) before app access

এই ফিচার ডিপ্লয় করতে নিচের ফাইলগুলো আপডেট/ক্রিয়েট করা হয়েছে। **শুধু এই ফাইলগুলো ডিপ্লয় করলেই হবে।**

## Updated files (আপডেটেড ফাইল)

| File | Change |
|------|--------|
| `app/Models/User.php` | `hasCompleteProfile()` মেথড যোগ |
| `app/Http/Controllers/ProfileController.php` | `complete()`, `completeStore()` মেথড ও রিকোয়ার্ড ভ্যালিডেশন |
| `bootstrap/app.php` | `EnsureProfileComplete` মিডলওয়্যার রেজিস্টার |
| `routes/web.php` | `ensure.profile.complete` মিডলওয়্যার + `profile/complete` রাউট |

## Created files (নতুন ফাইল)

| File | Purpose |
|------|---------|
| `app/Http/Middleware/EnsureProfileComplete.php` | লগইন পর প্রোফাইল অসম্পূর্ণ থাকলে profile/complete এ রিডাইরেক্ট |
| `resources/js/Pages/Profile/Complete.tsx` | প্রোফাইল সম্পূর্ণ করার পেজ (ফোন, পিন, স্বাক্ষর) |

## Deploy steps (সংক্ষেপে)

1. উপরের সব ফাইল সার্ভারে কপি করুন।
2. ফ্রন্টএন্ড বিল্ড চালান: `npm run build` (অথবা আপনার বিল্ড কমান্ড)।
3. ক্যাশ ক্লিয়ার (প্রয়োজন হলে): `php artisan route:clear` / `php artisan config:clear`।

## Behaviour

- যেকোনো ইউজারের **Phone**, **PIN** বা **Digital Signature** খালি থাকলে লগইনের পর প্রথমে **প্রোফাইল সম্পূর্ণ করুন** পেজ দেখাবে।
- এই তিনটি পূরণ না করে ড্যাশবোর্ড বা অন্য কোনো পেজে যাওয়া যাবে না।
- পূরণ করে সেভ করলে ড্যাশবোর্ডে রিডাইরেক্ট হবে এবং পরে স্বাভাবিকভাবে অ্যাপ ব্যবহার করা যাবে।
