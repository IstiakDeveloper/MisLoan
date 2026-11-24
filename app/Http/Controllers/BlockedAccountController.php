<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BlockedAccountController extends Controller
{
    /**
     * Display the locked screen for blocked users.
     */
    public function show(Request $request): Response
    {
        $user = $request->user();

        // Load active fine if attached
        $fine = null;
        if ($user && $user->blocked_fine_id) {
            $user->loadMissing('blockedFine');
            $fine = $user->blockedFine;
        }

        return Inertia::render('auth/Blocked', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'phone' => $user->phone,
                'blocked_reason' => $user->blocked_reason,
                'blocked_at' => $user->blocked_at?->format('d M, Y h:i A'),
            ],
            'fine' => $fine ? [
                'id' => $fine->id,
                'tracking_id' => $fine->tracking_id,
                'fine_amount' => (float) $fine->fine_amount,
                'mistake_details' => $fine->mistake_details,
                'created_at' => $fine->created_at?->format('d M, Y h:i A'),
                'status' => $fine->status,
            ] : null,
            'bkash' => config('fine.bkash'),
            'hr_contact' => config('fine.hr_contact'),
        ]);
    }
}
