<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Sanitize string for JSON encoding
     */
    private function sanitizeString($value)
    {
        if (is_string($value)) {
            return mb_convert_encoding($value, 'UTF-8', 'UTF-8');
        }
        return $value;
    }

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        // Disable Inspiring quotes to avoid UTF-8 issues
        $message = 'Welcome';
        $author = 'MIS Loan System';

        $userData = null;
        if ($request->user()) {
            $user = $request->user();

            // Build user data manually without loading relationships
            $userData = [
                'id' => $user->id,
                'name' => $this->sanitizeString($user->name ?? ''),
                'email' => $this->sanitizeString($user->email ?? ''),
                'has_all_access' => (bool)$user->has_all_access,
                'is_active' => (bool)$user->is_active,
                'role' => null,
                'zone' => null,
                'area' => null,
                'branch' => null,
            ];

            // Manually query role if role_id exists
            if ($user->role_id) {
                try {
                    $role = DB::table('roles')
                        ->select('id', 'name')
                        ->where('id', $user->role_id)
                        ->first();

                    if ($role) {
                        $userData['role'] = [
                            'id' => $role->id,
                            'name' => $this->sanitizeString($role->name ?? ''),
                        ];
                    }
                } catch (\Exception $e) {
                    Log::error('Error loading role in HandleInertiaRequests: ' . $e->getMessage());
                }
            }

            // Manually query zone if zone_id exists
            if ($user->zone_id) {
                try {
                    $zone = DB::table('zones')
                        ->select('id', 'name')
                        ->where('id', $user->zone_id)
                        ->first();

                    if ($zone) {
                        $userData['zone'] = [
                            'id' => $zone->id,
                            'name' => $this->sanitizeString($zone->name ?? ''),
                        ];
                    }
                } catch (\Exception $e) {
                    Log::error('Error loading zone in HandleInertiaRequests: ' . $e->getMessage());
                }
            }

            // Manually query area if area_id exists
            if ($user->area_id) {
                try {
                    $area = DB::table('areas')
                        ->select('id', 'name')
                        ->where('id', $user->area_id)
                        ->first();

                    if ($area) {
                        $userData['area'] = [
                            'id' => $area->id,
                            'name' => $this->sanitizeString($area->name ?? ''),
                        ];
                    }
                } catch (\Exception $e) {
                    Log::error('Error loading area in HandleInertiaRequests: ' . $e->getMessage());
                }
            }

            // Manually query branch if branch_id exists
            if ($user->branch_id) {
                try {
                    $branch = DB::table('branches')
                        ->select('id', 'name')
                        ->where('id', $user->branch_id)
                        ->first();

                    if ($branch) {
                        $userData['branch'] = [
                            'id' => $branch->id,
                            'name' => $this->sanitizeString($branch->name ?? ''),
                        ];
                    }
                } catch (\Exception $e) {
                    Log::error('Error loading branch in HandleInertiaRequests: ' . $e->getMessage());
                }
            }
        }

        return array_merge(parent::share($request), [
            'name' => 'MIS Loan',
            'quote' => ['message' => $message, 'author' => $author],
            'auth' => [
                'user' => $userData,
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
                'warning' => $request->session()->get('warning'),
                'info' => $request->session()->get('info'),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ]);
    }
}
