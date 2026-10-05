<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Role;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class UserSessionController extends Controller
{
    /**
     * Display a listing of currently active user sessions.
     */
    public function index(Request $request): Response
    {
        $lifetimeMinutes = (int) config('session.lifetime', 120);
        $cutoffTimestamp = Carbon::now()->subMinutes($lifetimeMinutes)->timestamp;
        $currentSessionId = (string) $request->session()->getId();

        // Query active sessions that have an associated user
        $rawSessions = DB::table('sessions')
            ->whereNotNull('user_id')
            ->where('last_activity', '>=', $cutoffTimestamp)
            ->orderBy('last_activity', 'desc')
            ->get();

        $userIds = $rawSessions->pluck('user_id')->unique()->values();

        $users = User::query()
            ->with(['role', 'branch', 'area', 'zone'])
            ->whereIn('id', $userIds)
            ->get()
            ->keyBy('id');

        $sessions = $rawSessions->map(function ($session) use ($users, $currentSessionId) {
            /** @var User|null $user */
            $user = $users->get($session->user_id);
            $parsedAgent = $this->parseUserAgent($session->user_agent);

            $lastActivity = Carbon::createFromTimestamp($session->last_activity);
            $now = Carbon::now();
            $diffInMinutes = $lastActivity->diffInMinutes($now);

            // Determine status
            $status = 'inactive';
            if ($diffInMinutes < 5) {
                $status = 'active';
            } elseif ($diffInMinutes <= 30) {
                $status = 'idle';
            }

            return [
                'id' => (string) $session->id,
                'user_id' => (int) $session->user_id,
                'ip_address' => $session->ip_address ?? 'Unknown IP',
                'user_agent' => $session->user_agent,
                'device' => $parsedAgent['device'],
                'device_type' => $parsedAgent['device_type'],
                'platform' => $parsedAgent['platform'],
                'browser' => $parsedAgent['browser'],
                'last_activity' => $session->last_activity,
                'last_activity_formatted' => $lastActivity->timezone('Asia/Dhaka')->format('d M Y, h:i:s A'),
                'last_activity_human' => $lastActivity->diffForHumans(),
                'status' => $status,
                'is_current' => (string) $session->id === $currentSessionId,
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'username' => $user->username,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'is_active' => (bool) $user->is_active,
                    'has_all_access' => (bool) $user->has_all_access,
                    'avatar' => $user->avatar ?? ($user->profile_photo ? '/storage/'.$user->profile_photo : null),
                    'role' => $user->role ? [
                        'id' => $user->role->id,
                        'name' => $user->role->name,
                        'display_name' => $user->role->display_name ?? $user->role->name,
                    ] : null,
                    'branch' => $user->branch ? [
                        'id' => $user->branch->id,
                        'name' => $user->branch->name,
                        'code' => $user->branch->code,
                    ] : null,
                    'area' => $user->area ? [
                        'id' => $user->area->id,
                        'name' => $user->area->name,
                    ] : null,
                    'zone' => $user->zone ? [
                        'id' => $user->zone->id,
                        'name' => $user->zone->name,
                    ] : null,
                ] : null,
            ];
        });

        // Compute summary metrics before in-memory filtering
        $stats = [
            'total_sessions' => $sessions->count(),
            'online_users' => $sessions->pluck('user_id')->unique()->count(),
            'desktop_sessions' => $sessions->where('device_type', 'desktop')->count(),
            'mobile_sessions' => $sessions->whereIn('device_type', ['mobile', 'tablet'])->count(),
            'idle_sessions' => $sessions->where('status', 'idle')->count(),
        ];

        // Apply filters
        $search = trim((string) $request->input('search', ''));
        $roleId = $request->input('role_id');
        $branchId = $request->input('branch_id');
        $deviceType = $request->input('device_type');
        $statusFilter = $request->input('status');

        $filteredSessions = $sessions->filter(function ($item) use ($search, $roleId, $branchId, $deviceType, $statusFilter) {
            if ($search !== '') {
                $needle = mb_strtolower($search);
                $userName = mb_strtolower($item['user']['name'] ?? '');
                $userUsername = mb_strtolower($item['user']['username'] ?? '');
                $userEmail = mb_strtolower($item['user']['email'] ?? '');
                $userPhone = mb_strtolower($item['user']['phone'] ?? '');
                $ip = mb_strtolower($item['ip_address'] ?? '');
                $branchName = mb_strtolower($item['user']['branch']['name'] ?? '');
                $branchCode = mb_strtolower($item['user']['branch']['code'] ?? '');

                $matches = str_contains($userName, $needle)
                    || str_contains($userUsername, $needle)
                    || str_contains($userEmail, $needle)
                    || str_contains($userPhone, $needle)
                    || str_contains($ip, $needle)
                    || str_contains($branchName, $needle)
                    || str_contains($branchCode, $needle);

                if (! $matches) {
                    return false;
                }
            }

            if ($roleId && ($item['user']['role']['id'] ?? null) != $roleId) {
                return false;
            }

            if ($branchId && ($item['user']['branch']['id'] ?? null) != $branchId) {
                return false;
            }

            if ($deviceType && $item['device_type'] !== $deviceType) {
                return false;
            }

            if ($statusFilter && $item['status'] !== $statusFilter) {
                return false;
            }

            return true;
        })->values();

        $roles = Role::select(['id', 'name', 'display_name'])->get();
        $branches = Branch::where('is_active', true)->orderedByCode()->get(['id', 'name', 'code']);

        return Inertia::render('UserSessions/Index', [
            'sessions' => $filteredSessions,
            'stats' => $stats,
            'roles' => $roles,
            'branches' => $branches,
            'filters' => [
                'search' => $search,
                'role_id' => $roleId ? (string) $roleId : '',
                'branch_id' => $branchId ? (string) $branchId : '',
                'device_type' => $deviceType ? (string) $deviceType : '',
                'status' => $statusFilter ? (string) $statusFilter : '',
            ],
        ]);
    }

    /**
     * Terminate a specific session.
     */
    public function destroy(Request $request, string $sessionId): RedirectResponse
    {
        $currentSessionId = (string) $request->session()->getId();

        DB::table('sessions')->where('id', $sessionId)->delete();

        if ($sessionId === $currentSessionId) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')
                ->with('status', 'Your session was terminated. Please log in again.');
        }

        return back()->with('success', 'সেশনটি সফলভাবে লগআউট করা হয়েছে (Session terminated successfully).');
    }

    /**
     * Terminate all active sessions for a specific user.
     */
    public function destroyUserSessions(Request $request, User $user): RedirectResponse
    {
        $currentUserId = Auth::id();

        DB::table('sessions')->where('user_id', $user->id)->delete();

        if ($user->id === $currentUserId) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')
                ->with('status', 'Your sessions were terminated. Please log in again.');
        }

        return back()->with('success', "{$user->name}-এর সকল সক্রিয় সেশন লগআউট করা হয়েছে (All sessions for this user terminated).");
    }

    /**
     * Terminate all other sessions except the current administrator's session.
     */
    public function destroyAllOthers(Request $request): RedirectResponse
    {
        $currentSessionId = (string) $request->session()->getId();

        $deletedCount = DB::table('sessions')
            ->where('id', '!=', $currentSessionId)
            ->delete();

        return back()->with('success', "অন্যান্য সকল সেশন ({$deletedCount} টি) সফলভাবে লগআউট করা হয়েছে (All other sessions terminated).");
    }

    /**
     * Parse User-Agent string to detect OS, Browser and Device type.
     *
     * @return array{device: string, device_type: 'desktop'|'mobile'|'tablet', platform: string, browser: string}
     */
    private function parseUserAgent(?string $userAgent): array
    {
        if (empty($userAgent)) {
            return [
                'device' => 'Unknown',
                'device_type' => 'desktop',
                'platform' => 'Unknown OS',
                'browser' => 'Unknown Browser',
            ];
        }

        // Platform / OS
        $platform = 'Unknown OS';
        if (preg_match('/windows phone/i', $userAgent)) {
            $platform = 'Windows Phone';
        } elseif (preg_match('/windows nt 10/i', $userAgent)) {
            $platform = 'Windows 10/11';
        } elseif (preg_match('/windows/i', $userAgent)) {
            $platform = 'Windows';
        } elseif (preg_match('/ipad/i', $userAgent)) {
            $platform = 'iPadOS';
        } elseif (preg_match('/iphone/i', $userAgent)) {
            $platform = 'iOS';
        } elseif (preg_match('/android/i', $userAgent)) {
            $platform = 'Android';
        } elseif (preg_match('/macintosh|mac os x/i', $userAgent)) {
            $platform = 'macOS';
        } elseif (preg_match('/linux/i', $userAgent)) {
            $platform = 'Linux';
        }

        // Device type
        $deviceType = 'desktop';
        if (preg_match('/tablet|ipad/i', $userAgent)) {
            $deviceType = 'tablet';
        } elseif (preg_match('/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i', $userAgent)) {
            $deviceType = 'mobile';
        }

        // Browser
        $browser = 'Unknown Browser';
        if (preg_match('/edg/i', $userAgent)) {
            $browser = 'Microsoft Edge';
        } elseif (preg_match('/chrome|crios/i', $userAgent)) {
            $browser = 'Google Chrome';
        } elseif (preg_match('/firefox|fxios/i', $userAgent)) {
            $browser = 'Mozilla Firefox';
        } elseif (preg_match('/safari/i', $userAgent) && ! preg_match('/chrome|crios/i', $userAgent)) {
            $browser = 'Apple Safari';
        } elseif (preg_match('/opr|opera/i', $userAgent)) {
            $browser = 'Opera';
        }

        return [
            'device' => ucfirst($deviceType),
            'device_type' => $deviceType,
            'platform' => $platform,
            'browser' => $browser,
        ];
    }
}
