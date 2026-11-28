<?php

namespace App\Support;

use App\Models\Setting;
use Illuminate\Support\Facades\Crypt;

class NidOcrSettings
{
    public const KEY_ENABLED = 'nid_ocr_enabled';
    public const KEY_PROVIDER = 'nid_ocr_provider';
    public const KEY_SERVICE_URL = 'nid_ocr_service_url';
    public const KEY_SERVICE_TOKEN = 'nid_ocr_service_token';
    public const KEY_TIMEOUT = 'nid_ocr_timeout';
    public const KEY_GEMINI_API_KEY = 'nid_ocr_gemini_api_key';
    public const KEY_GEMINI_MODEL = 'nid_ocr_gemini_model';
    public const KEY_GROQ_API_KEY = 'nid_ocr_groq_api_key';
    public const KEY_GROQ_MODEL = 'nid_ocr_groq_model';
    public const KEY_OPENROUTER_API_KEY = 'nid_ocr_openrouter_api_key';
    public const KEY_OPENROUTER_MODEL = 'nid_ocr_openrouter_model';

    public static function getAll(): array
    {
        try {
            $rows = Setting::query()
                ->whereIn('key', [
                    self::KEY_ENABLED,
                    self::KEY_PROVIDER,
                    self::KEY_SERVICE_URL,
                    self::KEY_SERVICE_TOKEN,
                    self::KEY_TIMEOUT,
                    self::KEY_GEMINI_API_KEY,
                    self::KEY_GEMINI_MODEL,
                    self::KEY_GROQ_API_KEY,
                    self::KEY_GROQ_MODEL,
                    self::KEY_OPENROUTER_API_KEY,
                    self::KEY_OPENROUTER_MODEL,
                ])
                ->pluck('value', 'key');
        } catch (\Throwable) {
            $rows = collect();
        }

        $enabledRaw = $rows->get(self::KEY_ENABLED);
        $enabled = $enabledRaw === null ? true : in_array((string) $enabledRaw, ['1', 'true', 'yes', 'on'], true);

        $provider = (string) ($rows->get(self::KEY_PROVIDER) ?: 'auto');
        if (! in_array($provider, ['auto', 'groq', 'openrouter', 'gemini', 'python_service', 'local'], true)) {
            $provider = 'auto';
        }

        $serviceUrl = trim((string) ($rows->get(self::KEY_SERVICE_URL) ?? ''));
        if ($serviceUrl === '') {
            $serviceUrl = trim((string) config('services.nid_ocr.url', ''));
        }

        $token = self::decryptOrFallback((string) ($rows->get(self::KEY_SERVICE_TOKEN) ?? ''), (string) config('services.nid_ocr.token', ''));
        $geminiApiKey = self::decryptOrFallback((string) ($rows->get(self::KEY_GEMINI_API_KEY) ?? ''), (string) config('services.gemini.api_key', ''));
        $geminiModel = trim((string) ($rows->get(self::KEY_GEMINI_MODEL) ?? '')) ?: (string) config('services.gemini.model', 'gemini-3.8-flash');

        $groqApiKey = self::decryptOrFallback((string) ($rows->get(self::KEY_GROQ_API_KEY) ?? ''), (string) config('services.groq.api_key', ''));
        $groqModel = trim((string) ($rows->get(self::KEY_GROQ_MODEL) ?? '')) ?: (string) config('services.groq.model', 'meta-llama/llama-4-scout-17b-16e-instruct');

        $openrouterApiKey = self::decryptOrFallback((string) ($rows->get(self::KEY_OPENROUTER_API_KEY) ?? ''), (string) config('services.openrouter.api_key', ''));
        $openrouterModel = trim((string) ($rows->get(self::KEY_OPENROUTER_MODEL) ?? '')) ?: (string) config('services.openrouter.model', 'google/gemma-4-31b-it:free');
        if (in_array($openrouterModel, ['qwen/qwen2.5-vl-72b-instruct:free', 'google/gemini-2.0-flash-exp:free', 'meta-llama/llama-3.2-11b-vision-instruct:free'], true)) {
            $openrouterModel = 'google/gemma-4-31b-it:free';
        }

        $timeout = (int) ($rows->get(self::KEY_TIMEOUT) ?: config('services.nid_ocr.timeout', 30));
        if ($timeout < 5 || $timeout > 120) {
            $timeout = 30;
        }

        return [
            'enabled' => $enabled,
            'provider' => $provider,
            'service_url' => rtrim($serviceUrl, '/'),
            'service_token' => $token,
            'gemini_api_key' => $geminiApiKey,
            'gemini_model' => $geminiModel,
            'groq_api_key' => $groqApiKey,
            'groq_model' => $groqModel,
            'openrouter_api_key' => $openrouterApiKey,
            'openrouter_model' => $openrouterModel,
            'timeout' => $timeout,
        ];
    }

    private static function decryptOrFallback(string $encrypted, string $fallback): string
    {
        if ($encrypted !== '') {
            try {
                return Crypt::decryptString($encrypted);
            } catch (\Throwable) {
                return $fallback;
            }
        }

        return $fallback;
    }

    public static function isEnabled(): bool
    {
        return self::getAll()['enabled'];
    }

    public static function save(array $input): void
    {
        self::put(self::KEY_ENABLED, ! empty($input['enabled']) ? '1' : '0');
        self::put(self::KEY_PROVIDER, (string) ($input['provider'] ?? 'auto'));
        self::put(self::KEY_SERVICE_URL, rtrim(trim((string) ($input['service_url'] ?? '')), '/'));
        self::put(self::KEY_TIMEOUT, (string) max(5, min(120, (int) ($input['timeout'] ?? 30))));
        self::put(self::KEY_GEMINI_MODEL, trim((string) ($input['gemini_model'] ?? 'gemini-3.8-flash')) ?: 'gemini-3.8-flash');
        self::put(self::KEY_GROQ_MODEL, trim((string) ($input['groq_model'] ?? 'meta-llama/llama-4-scout-17b-16e-instruct')) ?: 'meta-llama/llama-4-scout-17b-16e-instruct');
        self::put(self::KEY_OPENROUTER_MODEL, trim((string) ($input['openrouter_model'] ?? 'qwen/qwen2.5-vl-72b-instruct:free')) ?: 'qwen/qwen2.5-vl-72b-instruct:free');

        if (! empty($input['clear_token'])) {
            self::put(self::KEY_SERVICE_TOKEN, '');
        } elseif (! empty($input['service_token'])) {
            self::put(self::KEY_SERVICE_TOKEN, Crypt::encryptString((string) $input['service_token']));
        }

        if (! empty($input['clear_gemini_key'])) {
            self::put(self::KEY_GEMINI_API_KEY, '');
        } elseif (! empty($input['gemini_api_key'])) {
            self::put(self::KEY_GEMINI_API_KEY, Crypt::encryptString((string) $input['gemini_api_key']));
        }

        if (! empty($input['clear_groq_key'])) {
            self::put(self::KEY_GROQ_API_KEY, '');
        } elseif (! empty($input['groq_api_key'])) {
            self::put(self::KEY_GROQ_API_KEY, Crypt::encryptString((string) $input['groq_api_key']));
        }

        if (! empty($input['clear_openrouter_key'])) {
            self::put(self::KEY_OPENROUTER_API_KEY, '');
        } elseif (! empty($input['openrouter_api_key'])) {
            self::put(self::KEY_OPENROUTER_API_KEY, Crypt::encryptString((string) $input['openrouter_api_key']));
        }
    }

    private static function put(string $key, string $value): void
    {
        Setting::query()->updateOrCreate(['key' => $key], ['value' => $value]);
    }
}
