<?php

namespace App\Http\Controllers\HeadOffice;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserFine;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class FineManagementController extends Controller
{
    /**
     * Display a listing of all fines and penalty records.
     */
    public function index(Request $request): Response
    {
        $query = UserFine::query()
            ->with(['user.branch', 'creator:id,name', 'resolver:id,name'])
            ->latest();

        // Filter by type
        if ($request->filled('type') && in_array($request->type, ['self_correction', 'head_office_penalty'], true)) {
            $query->where('type', $request->type);
        }

        // Filter by status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Search by user name, phone, tracking_id, or transaction_id
        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('tracking_id', 'like', "%{$search}%")
                    ->orWhere('transaction_id', 'like', "%{$search}%")
                    ->orWhere('payment_phone', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%")
                            ->orWhere('username', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%");
                    });
            });
        }

        $fines = $query->paginate(15)->withQueryString();

        // Calculate statistics
        $stats = [
            'total_fines' => UserFine::count(),
            'pending_review' => UserFine::where('status', UserFine::STATUS_PENDING_REVIEW)->count(),
            'total_blocked_users' => User::where('is_blocked', true)->count(),
            'total_amount_collected' => (float) UserFine::whereIn('status', [UserFine::STATUS_APPROVED, UserFine::STATUS_RESOLVED])->sum('fine_amount'),
        ];

        // Active users list for the block-and-fine modal
        $users = User::query()
            ->select('id', 'name', 'username', 'email', 'phone', 'branch_id', 'role_id', 'is_blocked')
            ->with([
                'branch:id,name,code',
                'role:id,name',
            ])
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        return Inertia::render('HeadOffice/Fines/Index', [
            'fines' => $fines,
            'filters' => $request->only(['type', 'status', 'search']),
            'stats' => $stats,
            'users' => $users,
            'bkash' => config('fine.bkash'),
            'hrContact' => config('fine.hr_contact'),
        ]);
    }

    /**
     * Apply fine to a selected user and immediately block their account.
     */
    public function blockUserWithFine(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'fine_amount' => ['required', 'numeric', 'min:0'],
            'mistake_details' => ['required', 'string', 'min:5'],
            'admin_note' => ['nullable', 'string'],
        ], [
            'user_id.required' => 'ইউজার নির্বাচন করুন।',
            'user_id.exists' => 'নির্বাচিত ইউজার খুঁজে পাওয়া যায়নি।',
            'fine_amount.required' => 'জরিমানার পরিমাণ (টাকা) লিখুন।',
            'fine_amount.numeric' => 'জরিমানার পরিমাণ সংখ্যা হতে হবে।',
            'mistake_details.required' => 'ভুলের কারণ স্পষ্টভাবে লিখুন।',
            'mistake_details.min' => 'ভুলের বিবরণ কমপক্ষে ৫ অক্ষরের হতে হবে।',
        ]);

        $targetUser = User::findOrFail($validated['user_id']);

        DB::transaction(function () use ($validated, $targetUser, $request) {
            $fine = UserFine::create([
                'tracking_id' => UserFine::generateTrackingId(),
                'user_id' => $targetUser->id,
                'created_by_id' => $request->user()->id,
                'type' => UserFine::TYPE_HEAD_OFFICE_PENALTY,
                'category' => 'হেড অফিস কর্তৃক জরিমানা ও স্থগিতাদেশ',
                'mistake_details' => $validated['mistake_details'],
                'correction_details' => null,
                'fine_amount' => $validated['fine_amount'],
                'payment_method' => 'bkash',
                'status' => UserFine::STATUS_PENDING_PAYMENT,
                'is_user_blocked' => true,
                'admin_note' => $validated['admin_note'] ?? null,
            ]);

            $targetUser->update([
                'is_blocked' => true,
                'blocked_reason' => $validated['mistake_details'],
                'blocked_fine_id' => $fine->id,
                'blocked_at' => now(),
            ]);
        });

        return back()->with('success', "ইউজার '{$targetUser->name}' কে জরিমানা ধার্য করা হয়েছে এবং অ্যাকাউন্ট ব্লক করা হয়েছে।");
    }

    /**
     * Unblock a blocked user.
     */
    public function unblockUser(Request $request, User $user): RedirectResponse
    {
        DB::transaction(function () use ($user, $request) {
            $blockedFineId = $user->blocked_fine_id;

            $user->update([
                'is_blocked' => false,
                'blocked_reason' => null,
                'blocked_fine_id' => null,
                'blocked_at' => null,
            ]);

            if ($blockedFineId) {
                UserFine::where('id', $blockedFineId)->update([
                    'status' => UserFine::STATUS_RESOLVED,
                    'is_user_blocked' => false,
                    'resolved_by_id' => $request->user()->id,
                    'resolved_at' => now(),
                    'admin_note' => $request->input('admin_note', 'হেড অফিস কর্তৃক ইউজারকে আনব্লক করা হয়েছে।'),
                ]);
            }
        });

        return back()->with('success', "ইউজার '{$user->name}' কে সফলভাবে আনব্লক করা হয়েছে।");
    }

    /**
     * Update fine status (approve / reject / resolve).
     */
    public function updateStatus(Request $request, UserFine $fine): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:approved,rejected,resolved'],
            'admin_note' => ['nullable', 'string', 'max:500'],
        ]);

        DB::transaction(function () use ($fine, $validated, $request) {
            $fine->update([
                'status' => $validated['status'],
                'admin_note' => $validated['admin_note'] ?? $fine->admin_note,
                'resolved_by_id' => $request->user()->id,
                'resolved_at' => now(),
            ]);

            // If this fine was blocking the user and it's resolved or approved, unblock the user
            if ($fine->is_user_blocked && in_array($validated['status'], ['approved', 'resolved'], true)) {
                $user = $fine->user;
                if ($user && $user->blocked_fine_id === $fine->id) {
                    $user->update([
                        'is_blocked' => false,
                        'blocked_reason' => null,
                        'blocked_fine_id' => null,
                        'blocked_at' => null,
                    ]);
                }
                $fine->update(['is_user_blocked' => false]);
            }
        });

        $statusText = match ($validated['status']) {
            'approved' => 'অনুমোদন',
            'rejected' => 'বাতিল',
            'resolved' => 'মীমাংসিত / সম্পন্ন',
            default => $validated['status'],
        };

        return back()->with('success', "জরিমানা/আবেদনটি সফলভাবে {$statusText} করা হয়েছে।");
    }
}
