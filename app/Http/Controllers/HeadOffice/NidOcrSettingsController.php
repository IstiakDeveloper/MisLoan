<?php

namespace App\Http\Controllers\HeadOffice;

use App\Http\Controllers\Controller;
use App\Support\NidOcrSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response;

class NidOcrSettingsController extends Controller
{
    public function index(): Response
    {
        $config = NidOcrSettings::getAll();

        return Inertia::render('HeadOffice/NidOcrSettings', [
            'settings' => [
                'enabled' => $config['enabled'],
                'provider' => $config['provider'],
                'service_url' => $config['service_url'],
                'has_token' => $config['service_token'] !== '',
                'has_gemini_key' => $config['gemini_api_key'] !== '',
                'gemini_model' => $config['gemini_model'],
                'has_groq_key' => $config['groq_api_key'] !== '',
                'groq_model' => $config['groq_model'],
                'has_openrouter_key' => $config['openrouter_api_key'] !== '',
                'openrouter_model' => $config['openrouter_model'],
                'timeout' => $config['timeout'],
            ],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
            'provider' => ['required', 'in:auto,groq,openrouter,gemini,python_service,local'],
            'service_url' => ['nullable', 'url', 'max:500'],
            'service_token' => ['nullable', 'string', 'max:500'],
            'clear_token' => ['nullable', 'boolean'],
            'gemini_api_key' => ['nullable', 'string', 'max:500'],
            'clear_gemini_key' => ['nullable', 'boolean'],
            'gemini_model' => ['nullable', 'string', 'max:100'],
            'groq_api_key' => ['nullable', 'string', 'max:500'],
            'clear_groq_key' => ['nullable', 'boolean'],
            'groq_model' => ['nullable', 'string', 'max:150'],
            'openrouter_api_key' => ['nullable', 'string', 'max:500'],
            'clear_openrouter_key' => ['nullable', 'boolean'],
            'openrouter_model' => ['nullable', 'string', 'max:150'],
            'timeout' => ['required', 'integer', 'min:5', 'max:120'],
        ], [
            'service_url.url' => 'সার্ভিস URL সঠিক ফরম্যাটে দিন (যেমন: http://127.0.0.1:8001 বা https://ocr.example.com)।',
            'timeout.min' => 'Timeout কমপক্ষে ৫ সেকেন্ড হতে হবে।',
            'timeout.max' => 'Timeout সর্বোচ্চ ১২০ সেকেন্ড হতে পারবে।',
        ]);

        NidOcrSettings::save($validated);

        return back()->with('success', 'NID OCR সেটিংস সফলভাবে সংরক্ষণ করা হয়েছে।');
    }

    public function testConnection(Request $request): JsonResponse
    {
        $config = NidOcrSettings::getAll();
        $url = rtrim(trim((string) ($request->input('service_url') ?: $config['service_url'])), '/');
        $token = (string) ($request->input('service_token') ?: $config['service_token']);

        if ($url === '') {
            return response()->json([
                'ok' => false,
                'message' => 'আগে Python OCR সার্ভিসের URL দিন।',
            ], 422);
        }

        $start = microtime(true);
        try {
            $http = Http::timeout(8);
            if ($token !== '') {
                $http = $http->withToken($token);
            }
            $response = $http->get($url . '/health');
            $latencyMs = (int) round((microtime(true) - $start) * 1000);

            if (! $response->successful()) {
                return response()->json([
                    'ok' => false,
                    'status' => $response->status(),
                    'latency_ms' => $latencyMs,
                    'message' => "সার্ভার রেসপন্স করেছে (HTTP {$response->status()}), কিন্তু হেলথ চেক সফল হয়নি।",
                ], 502);
            }

            return response()->json([
                'ok' => true,
                'status' => $response->status(),
                'latency_ms' => $latencyMs,
                'details' => $response->json(),
                'message' => "কানেকশন সফল! ({$latencyMs} ms)",
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'message' => 'সার্ভারে সংযোগ পাওয়া যায়নি: ' . $e->getMessage(),
            ], 502);
        }
    }
}
