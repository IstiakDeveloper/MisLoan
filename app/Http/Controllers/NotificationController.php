<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;
use Inertia\Inertia;

class NotificationController extends Controller
{
    /**
     * Display all notifications for current user with pagination & filtering.
     */
    public function index(Request $request)
    {
        $user = auth()->user();
        $filter = $request->input('filter', 'all'); // 'all' or 'unread'

        $query = Notification::where('user_id', $user->id);

        if ($filter === 'unread') {
            $query->unread();
        }

        $notifications = $query->orderBy('created_at', 'desc')->paginate(15);

        $unreadCount = Notification::where('user_id', $user->id)->unread()->count();

        return Inertia::render('Notifications/Index', [
            'notifications' => $notifications,
            'filter' => $filter,
            'unreadCount' => $unreadCount,
        ]);
    }

    /**
     * Display single notification details or redirect to action URL.
     */
    public function show(Notification $notification)
    {
        if ((int) $notification->user_id !== (int) auth()->id()) {
            abort(403, 'Unauthorized action.');
        }

        $notification->markAsRead();

        if (!empty($notification->action_url) && !in_array($notification->action_url, ['/notifications', '/notifications/'], true)) {
            return redirect($notification->action_url);
        }

        return Inertia::render('Notifications/Show', [
            'notification' => $notification,
        ]);
    }

    /**
     * Mark a single notification as read.
     */
    public function markAsRead(Notification $notification)
    {
        if ((int) $notification->user_id !== (int) auth()->id()) {
            abort(403, 'Unauthorized action.');
        }

        $notification->markAsRead();

        if (request()->wantsJson()) {
            return response()->json(['success' => true]);
        }

        return back()->with('success', 'নোটিফিকেশন পঠিত হিসেবে চিহ্নিত করা হয়েছে।');
    }

    /**
     * Mark all notifications as read for current user.
     */
    public function markAllRead()
    {
        Notification::where('user_id', auth()->id())
            ->unread()
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        if (request()->wantsJson()) {
            return response()->json(['success' => true]);
        }

        return back()->with('success', 'সকল নোটিফিকেশন পঠিত হিসেবে চিহ্নিত করা হয়েছে।');
    }
}
