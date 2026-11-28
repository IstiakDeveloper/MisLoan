<?php

namespace App\Http\Controllers;

use App\Services\NidOcrService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NidOcrController extends Controller
{
    public function __construct(private readonly NidOcrService $nidOcrService) {}

    /**
     * Extract and validate Bangladesh NID fields from scanned/uploaded images.
     */
    public function extract(Request $request): JsonResponse
    {
        $request->validate([
            'front_image' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:25600'],
            'back_image' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:25600'],
        ], [
            'front_image.required' => 'NID-এর সামনের পাশের ছবি বা PDF দেওয়া আবশ্যক।',
            'front_image.mimes' => 'NID ফাইল অবশ্যই JPG, PNG, WebP বা PDF হতে হবে।',
            'front_image.max' => 'NID ফাইল সর্বোচ্চ ২৫MB হতে পারবে।',
            'back_image.mimes' => 'NID পেছনের পাশের ফাইল অবশ্যই JPG, PNG, WebP বা PDF হতে হবে।',
            'back_image.max' => 'NID পেছনের পাশের ফাইল সর্বোচ্চ ২৫MB হতে পারবে।',
        ]);

        $result = $this->nidOcrService->extract(
            $request->file('front_image'),
            $request->file('back_image')
        );

        if (! $result['ok']) {
            return response()->json([
                'ok' => false,
                'fallback_allowed' => (bool) ($result['fallback_allowed'] ?? false),
                'message' => $result['message'] ?? 'NID যাচাই করা যায়নি।',
            ], $result['status']);
        }

        return response()->json([
            'ok' => true,
            'data' => $result['data'],
            'duplicate_warnings' => $result['duplicate_warnings'] ?? [],
        ]);
    }
}
