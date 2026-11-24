<?php

namespace App\Http\Controllers;

use App\Models\UserFine;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class UserFineController extends Controller
{
    /**
     * Display a listing of user's fines and self-correction requests.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        $fines = UserFine::query()
            ->where('user_id', $user->id)
            ->with(['resolver:id,name'])
            ->latest()
            ->paginate(15)
            ->withQueryString();

        $stats = [
            'total' => UserFine::where('user_id', $user->id)->count(),
            'pending' => UserFine::where('user_id', $user->id)->whereIn('status', [UserFine::STATUS_PENDING_PAYMENT, UserFine::STATUS_PENDING_REVIEW])->count(),
            'approved' => UserFine::where('user_id', $user->id)->where('status', UserFine::STATUS_APPROVED)->count(),
            'resolved' => UserFine::where('user_id', $user->id)->where('status', UserFine::STATUS_RESOLVED)->count(),
        ];

        return Inertia::render('Fines/Index', [
            'fines' => $fines,
            'stats' => $stats,
            'bkash' => config('fine.bkash'),
        ]);
    }

    /**
     * Show the 2-step form to create a new self-correction fine submission.
     */
    public function create(): Response
    {
        return Inertia::render('Fines/Create', [
            'bkash' => config('fine.bkash'),
            'defaultFee' => (float) config('fine.default_self_correction_fee', 100),
            'categories' => [
                'সদস্য ভর্তি তথ্যে ভুল (Member Admission Correction)',
                'ঋণ আবেদন / ডিসবার্সমেন্টে ভুল (Loan Application Correction)',
                'সঞ্চয় হিসাব / লেনদেনে ভুল (Savings Transaction Correction)',
                'কিস্তি আদায় এন্ট্রিতে ভুল (Installment / Collection Correction)',
                'সদস্য ড্রপআউট বা ট্রান্সফারে ভুল (Dropout / Transfer Correction)',
                'অন্যান্য সাধারণ ভুল (Other Operational Mistake)',
            ],
        ]);
    }

    /**
     * Store a newly created fine submission.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'category' => ['required', 'string', 'max:150'],
            'mistake_details' => ['required', 'string', 'min:10'],
            'correction_details' => ['required', 'string', 'min:10'],
            'payment_phone' => ['required', 'regex:/^01[3-9]\d{8}$/'],
            'transaction_id' => ['nullable', 'string', 'max:50'],
            'screenshot' => ['required', 'file', 'image', 'mimes:jpeg,png,jpg,webp', 'max:4096'],
        ], [
            'category.required' => 'ভুলের ক্যাটাগরি বা বিষয় নির্বাচন করুন।',
            'mistake_details.required' => 'কি কি ভুল হয়েছে তা বিস্তারিত লিখুন।',
            'mistake_details.min' => 'ভুলের বিবরণ কমপক্ষে ১০ অক্ষরের হতে হবে।',
            'correction_details.required' => 'কি কি ঠিক করতে চান তা স্পষ্টভাবে লিখুন।',
            'correction_details.min' => 'সংশোধনের বিবরণ কমপক্ষে ১০ অক্ষরের হতে হবে।',
            'payment_phone.required' => 'যে বিকাশ নাম্বার থেকে পেমেন্ট করেছেন তা দিন।',
            'payment_phone.regex' => 'সঠিক ১১ ডিজিটের বিকাশ নাম্বার দিন (যেমন: 017XXXXXXXX)।',
            'screenshot.required' => 'বিকাশ পেমেন্টের স্ক্রিনশট আপলোড করুন।',
            'screenshot.image' => 'স্ক্রিনশটটি একটি সঠিক ইমেজ ফাইল (JPG, PNG, WEBP) হতে হবে।',
            'screenshot.max' => 'স্ক্রিনশটের সাইজ সর্বোচ্চ ৪ মেগাবাইট হতে পারবে।',
        ]);

        $screenshotPath = $request->file('screenshot')->store('fines', 'public');

        $fine = UserFine::create([
            'tracking_id' => UserFine::generateTrackingId(),
            'user_id' => $request->user()->id,
            'created_by_id' => $request->user()->id,
            'type' => UserFine::TYPE_SELF_CORRECTION,
            'category' => $validated['category'],
            'mistake_details' => $validated['mistake_details'],
            'correction_details' => $validated['correction_details'],
            'fine_amount' => (float) config('fine.default_self_correction_fee', 100),
            'payment_method' => 'bkash',
            'payment_phone' => $validated['payment_phone'],
            'transaction_id' => ! empty($validated['transaction_id']) ? strtoupper(trim($validated['transaction_id'])) : null,
            'screenshot_path' => $screenshotPath,
            'status' => UserFine::STATUS_PENDING_REVIEW,
            'is_user_blocked' => false,
        ]);

        return redirect()->route('fines.index')->with('success', 'আপনার ভুল সংশোধন ও জরিমানা পেমেন্টের আবেদনটি জমা হয়েছে (ট্র্যাকিং কোড: ' . $fine->tracking_id . ')। হেড অফিস যাচাই করে দ্রুত ব্যবস্থা নেবে।');
    }

    /**
     * Display a specific fine details.
     */
    public function show(Request $request, UserFine $fine): Response|RedirectResponse
    {
        $user = $request->user();

        // Check permission: user can view their own fine, or head office can view
        $isHeadOffice = $user->has_all_access || in_array($user->role?->name, ['SuperAdmin', 'Head Office', 'ED', 'ADMF', 'DMF'], true);

        if ($fine->user_id !== $user->id && ! $isHeadOffice) {
            abort(403, 'এই তথ্যে আপনার কোনো প্রবেশাধিকার নেই।');
        }

        $fine->loadMissing(['user.branch', 'creator', 'resolver']);

        return Inertia::render('Fines/Show', [
            'fine' => $fine,
            'bkash' => config('fine.bkash'),
            'isHeadOffice' => $isHeadOffice,
        ]);
    }
}
