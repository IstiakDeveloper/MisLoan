<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class MaintenanceController extends Controller
{
    /**
     * Toggle site maintenance mode. Super admin only.
     */
    public function toggle(Request $request)
    {
        if (! $request->user() || ! $request->user()->isSuperAdmin()) {
            abort(403, 'শুধুমাত্র সুপার অ্যাডমিন সাইট মেইনটেন্যান্স পরিবর্তন করতে পারবেন।');
        }

        $current = Cache::get('site_maintenance', false);
        $next = ! $current;
        Cache::put('site_maintenance', $next);

        return back()->with('success', $next
            ? 'সাইট মেইনটেন্যান্স মোড চালু হয়েছে। অন্য ব্যবহারকারীরা এখন মেইনটেন্যান্স পেজ দেখবেন।'
            : 'সাইট মেইনটেন্যান্স মোড বন্ধ হয়েছে।');
    }
}
