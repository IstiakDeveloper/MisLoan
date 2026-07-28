<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\HrmUserSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class HrmSyncController extends Controller
{
    public function syncFieldOfficer(Request $request, HrmUserSyncService $hrmUserSyncService): JsonResponse
    {
        $token = (string) config('services.hrm.token');
        if ($token === '' || $request->header('Authorization') !== 'Bearer '.$token) {
            return response()->json([
                'status' => false,
                'message' => 'Unauthorized access',
            ], 401);
        }

        $validated = $request->validate([
            'pin' => 'required|string|max:50',
            'username' => 'nullable|string|max:255',
            'name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'password_hash' => 'nullable|string',
            'plain_password' => 'nullable|string',
            'branch_code' => 'nullable|string|max:50',
            'designation' => 'nullable|string|max:255',
            'is_active' => 'required|boolean',
        ]);

        try {
            $result = $hrmUserSyncService->upsertOfficer($validated);
        } catch (Throwable $e) {
            Log::error('HRM field officer webhook failed', [
                'pin' => $validated['pin'] ?? null,
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'status' => false,
                'message' => $e->getMessage(),
            ], 500);
        }

        return response()->json([
            'status' => true,
            'result' => $result,
        ]);
    }

    public function syncTransfer(Request $request, HrmUserSyncService $hrmUserSyncService): JsonResponse
    {
        $token = (string) config('services.hrm.token');
        if ($token === '' || $request->header('Authorization') !== 'Bearer '.$token) {
            return response()->json([
                'status' => false,
                'message' => 'Unauthorized access',
            ], 401);
        }

        $validated = $request->validate([
            'pin' => 'required|string|max:50',
            'username' => 'nullable|string|max:255',
            'branch_code' => 'required|string|max:50',
            'is_active' => 'nullable|boolean',
        ]);

        try {
            $result = $hrmUserSyncService->transferBranch($validated);
        } catch (Throwable $e) {
            Log::error('HRM transfer webhook failed', [
                'pin' => $validated['pin'] ?? null,
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'status' => false,
                'message' => $e->getMessage(),
            ], 500);
        }

        return response()->json([
            'status' => true,
            'result' => $result,
        ]);
    }
}
