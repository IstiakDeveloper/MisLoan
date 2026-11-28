<?php

namespace App\Services;

use App\Models\MemberAdmission;
use App\Support\NidOcrSettings;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class NidOcrService
{
    /**
     * Extract and validate Bangladesh NID data from front (and optional back) images.
     *
     * @return array{ok: bool, status: int, message?: string, data?: array, duplicate_warnings?: array}
     */
    public function extract(UploadedFile $frontImage, ?UploadedFile $backImage = null): array
    {
        $settings = NidOcrSettings::getAll();
        if (! $settings['enabled']) {
            return [
                'ok' => false,
                'status' => 403,
                'fallback_allowed' => false,
                'message' => 'NID OCR ফিচারটি বর্তমানে সেটিংস থেকে বন্ধ রাখা হয়েছে।',
            ];
        }

        $provider = $settings['provider'];
        if ($provider === 'local') {
            return [
                'ok' => false,
                'status' => 503,
                'fallback_allowed' => true,
                'message' => 'লোকাল ব্রাউজার OCR মোড সক্রিয় আছে।',
            ];
        }

        if ($provider === 'python_service') {
            $res = $settings['service_url'] !== ''
                ? $this->extractViaPythonService($frontImage, $backImage, $settings)
                : ['ok' => false, 'status' => 503, 'message' => 'Python OCR সার্ভিসের URL সেট করা নেই।'];
            $res['fallback_allowed'] = false;

            return $res;
        }

        if ($provider === 'groq') {
            $res = $this->extractViaGroq($frontImage, $backImage, $settings);
            $res['fallback_allowed'] = false;

            return $res;
        }

        if ($provider === 'openrouter') {
            $res = $this->extractViaOpenRouter($frontImage, $backImage, $settings);
            $res['fallback_allowed'] = false;

            return $res;
        }

        if ($provider === 'gemini') {
            $res = $this->extractViaGemini($frontImage, $backImage, $settings);
            $res['fallback_allowed'] = false;

            return $res;
        }

        // Auto Mode Priority Chain: 1. Groq -> 2. OpenRouter -> 3. Gemini -> 4. Python Service (if configured)
        $isPdf = strtolower((string) $frontImage->getClientMimeType()) === 'application/pdf'
            || str_ends_with(strtolower((string) $frontImage->getClientOriginalName()), '.pdf');

        if (! $isPdf && ($settings['groq_api_key'] ?? '') !== '') {
            $groqRes = $this->extractViaGroq($frontImage, $backImage, $settings);
            if ($groqRes['ok'] || $groqRes['status'] === 422) {
                return $groqRes;
            }
        }

        if (! $isPdf && ($settings['openrouter_api_key'] ?? '') !== '') {
            $orRes = $this->extractViaOpenRouter($frontImage, $backImage, $settings);
            if ($orRes['ok'] || $orRes['status'] === 422) {
                return $orRes;
            }
        }

        if (($settings['gemini_api_key'] ?? '') !== '') {
            $gemRes = $this->extractViaGemini($frontImage, $backImage, $settings);
            if ($gemRes['ok'] || $gemRes['status'] === 422) {
                return $gemRes;
            }
        }

        if (($settings['service_url'] ?? '') !== '') {
            $pyRes = $this->extractViaPythonService($frontImage, $backImage, $settings);
            if ($pyRes['ok'] || $pyRes['status'] === 422) {
                return $pyRes;
            }
        }

        return [
            'ok' => false,
            'status' => 503,
            'fallback_allowed' => true,
            'message' => 'সব অনলাইন OCR API ব্যস্ত আছে বা কনফিগার করা নেই — লোকাল অফলাইন OCR ব্যবহার করা হচ্ছে।',
        ];
    }

    private function extractViaGroq(UploadedFile $frontImage, ?UploadedFile $backImage, array $settings): array
    {
        $apiKey = (string) ($settings['groq_api_key'] ?? '');
        if ($apiKey === '') {
            return ['ok' => false, 'status' => 503, 'message' => 'Groq API Key সেট করা নেই।'];
        }

        $models = array_values(array_unique(array_filter([
            (string) ($settings['groq_model'] ?? ''),
            'meta-llama/llama-4-scout-17b-16e-instruct',
        ])));

        $lastRes = ['ok' => false, 'status' => 503, 'message' => 'Groq API থেকে রেসপন্স পাওয়া যায়নি।'];
        foreach ($models as $model) {
            $res = $this->extractViaOpenAiVision(
                'Groq',
                'https://api.groq.com/openai/v1/chat/completions',
                $apiKey,
                $model,
                $frontImage,
                $backImage
            );
            if ($res['ok'] || $res['status'] === 422) {
                return $res;
            }
            $lastRes = $res;
        }

        return $lastRes;
    }

    private function extractViaOpenRouter(UploadedFile $frontImage, ?UploadedFile $backImage, array $settings): array
    {
        $apiKey = (string) ($settings['openrouter_api_key'] ?? '');
        if ($apiKey === '') {
            return ['ok' => false, 'status' => 503, 'message' => 'OpenRouter API Key সেট করা নেই।'];
        }

        $models = array_values(array_unique(array_filter([
            (string) ($settings['openrouter_model'] ?? ''),
            'google/gemma-4-31b-it:free',
            'google/gemma-4-26b-a4b-it:free',
            'nvidia/nemotron-3.5-super-vl:free',
            'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
        ])));

        $lastRes = ['ok' => false, 'status' => 503, 'message' => 'OpenRouter API থেকে রেসপন্স পাওয়া যায়নি।'];
        foreach ($models as $model) {
            $res = $this->extractViaOpenAiVision(
                'OpenRouter',
                'https://openrouter.ai/api/v1/chat/completions',
                $apiKey,
                $model,
                $frontImage,
                $backImage,
                [
                    'HTTP-Referer' => (string) config('app.url', 'http://localhost'),
                    'X-Title' => (string) config('app.name', 'MisLoan'),
                ]
            );
            if ($res['ok'] || $res['status'] === 422) {
                return $res;
            }
            $lastRes = $res;
        }

        return $lastRes;
    }

    private function extractViaOpenAiVision(
        string $providerLabel,
        string $endpoint,
        string $apiKey,
        string $model,
        UploadedFile $frontImage,
        ?UploadedFile $backImage,
        array $extraHeaders = []
    ): array {
        $prompt = $this->buildPrompt($backImage !== null) . "\n\nReturn ONLY a valid JSON object with keys: "
            . 'is_valid_bd_nid (bool), is_clear (bool), readability_score (int 0-100), rejection_reason_bn (string), '
            . 'card_type ("smart"|"old"), applicant_name_bn, applicant_name_en, father_name_bn, spouse_name_bn, mother_name_bn, '
            . 'nid_number, smart_card_number, date_of_birth (YYYY-MM-DD), gender ("male"|"female"|"other"|""), '
            . 'address ({raw_address_bn, division_hint, district_hint, upazila_hint, union_or_ward, village_or_road, post_code}).';

        $content = [
            ['type' => 'text', 'text' => $prompt],
            $this->encodeOpenAiImagePart($frontImage),
        ];
        if ($backImage !== null) {
            $content[] = $this->encodeOpenAiImagePart($backImage);
        }

        try {
            $http = Http::timeout(14)->withToken($apiKey);
            if ($extraHeaders !== []) {
                $http = $http->withHeaders($extraHeaders);
            }
            $response = $http->post($endpoint, [
                'model' => $model,
                'temperature' => 0.1,
                'response_format' => ['type' => 'json_object'],
                'messages' => [
                    ['role' => 'user', 'content' => $content],
                ],
            ]);
        } catch (\Throwable $e) {
            Log::warning("{$providerLabel} NID OCR request failed", ['error' => $e->getMessage()]);

            return ['ok' => false, 'status' => 503, 'message' => "{$providerLabel} সার্ভারে সংযোগ পাওয়া যায়নি।"];
        }

        if (! $response->successful()) {
            Log::warning("{$providerLabel} NID OCR error", [
                'status' => $response->status(),
                'body' => mb_substr($response->body(), 0, 300),
            ]);

            return [
                'ok' => false,
                'status' => 503,
                'message' => "{$providerLabel} API থেকে রেসপন্স পাওয়া যায়নি (HTTP {$response->status()})।",
            ];
        }

        $rawContent = (string) data_get($response->json(), 'choices.0.message.content', '');
        $rawContent = trim((string) preg_replace('/^```(?:json)?\s*|\s*```$/m', '', $rawContent));
        $parsed = json_decode($rawContent, true);

        if (! is_array($parsed)) {
            return [
                'ok' => false,
                'status' => 503,
                'message' => "{$providerLabel} থেকে সঠিক JSON পাওয়া যায়নি।",
            ];
        }

        return $this->validateAndNormalize($parsed);
    }

    private function encodeOpenAiImagePart(UploadedFile $file): array
    {
        $mime = $file->getMimeType() ?: 'image/jpeg';
        $b64 = base64_encode((string) file_get_contents($file->getRealPath()));

        return [
            'type' => 'image_url',
            'image_url' => [
                'url' => "data:{$mime};base64,{$b64}",
            ],
        ];
    }

    private function extractViaPythonService(
        UploadedFile $frontImage,
        ?UploadedFile $backImage,
        array $settings
    ): array {
        $url = $settings['service_url'] . '/api/v1/nid/scan';
        $token = $settings['service_token'];
        $timeout = (int) ($settings['timeout'] ?? 30);

        try {
            $http = Http::timeout($timeout);
            if ($token !== '') {
                $http = $http->withToken($token);
            }

            $http = $http->attach(
                'front',
                (string) file_get_contents($frontImage->getRealPath()),
                $frontImage->getClientOriginalName() ?: 'front.jpg'
            );

            if ($backImage !== null) {
                $http = $http->attach(
                    'back',
                    (string) file_get_contents($backImage->getRealPath()),
                    $backImage->getClientOriginalName() ?: 'back.jpg'
                );
            }

            $response = $http->post($url);
        } catch (\Throwable $e) {
            Log::warning('Python NID OCR service unreachable', ['url' => $url, 'error' => $e->getMessage()]);

            return [
                'ok' => false,
                'status' => 503,
                'fallback_allowed' => true,
                'message' => 'Python NID OCR সার্ভারে সংযোগ পাওয়া যায়নি।',
            ];
        }

        if ($response->status() === 422) {
            return [
                'ok' => false,
                'status' => 422,
                'fallback_allowed' => false,
                'message' => (string) data_get($response->json(), 'message', 'ছবিটি স্পষ্ট নয়, অনুগ্রহ করে ভালোভাবে ধরে আবার তুলুন।'),
            ];
        }

        if (! $response->successful()) {
            Log::warning('Python NID OCR service error', [
                'status' => $response->status(),
                'body' => mb_substr($response->body(), 0, 300),
            ]);

            return [
                'ok' => false,
                'status' => 503,
                'fallback_allowed' => true,
                'message' => 'Python NID OCR সার্ভিস থেকে সঠিক রেসপন্স পাওয়া যায়নি।',
            ];
        }

        $json = $response->json();
        if (! is_array($json) || empty($json['success'])) {
            return [
                'ok' => false,
                'status' => 422,
                'fallback_allowed' => false,
                'message' => (string) ($json['message'] ?? 'NID কার্ডের তথ্য পড়া যায়নি।'),
            ];
        }

        $fields = is_array($json['fields'] ?? null) ? $json['fields'] : [];
        $val = static function (string ...$keys) use ($fields): string {
            foreach ($keys as $key) {
                $v = trim((string) data_get($fields, "{$key}.value", ''));
                if ($v !== '') {
                    return $v;
                }
            }

            return '';
        };

        $confCandidates = array_filter([
            data_get($fields, 'nid_number.confidence'),
            data_get($fields, 'smart_card_number.confidence'),
            data_get($fields, 'date_of_birth.confidence'),
            data_get($fields, 'name_bn.confidence'),
            data_get($fields, 'name_en.confidence'),
        ], static fn ($c): bool => is_numeric($c) && (float) $c > 0);

        $bestConf = $confCandidates !== [] ? max(array_map('floatval', $confCandidates)) : 0.9;
        $readabilityScore = $bestConf <= 1.0 ? (int) round($bestConf * 100) : (int) round($bestConf);

        $mapped = [
            'is_valid_bd_nid' => true,
            'is_clear' => true,
            'readability_score' => max(75, min(100, $readabilityScore)),
            'card_type' => ($json['card_type'] ?? '') === 'smart_nid' ? 'smart' : 'old',
            'applicant_name_bn' => $val('name_bn', 'applicant_name_bn'),
            'applicant_name_en' => $val('name_en', 'applicant_name_en'),
            'father_name_bn' => $val('father_name', 'father_name_bn', 'father'),
            'spouse_name_bn' => $val('spouse_name', 'spouse_name_bn', 'spouse'),
            'mother_name_bn' => $val('mother_name', 'mother_name_bn', 'mother'),
            'nid_number' => $val('nid_number'),
            'smart_card_number' => $val('smart_card_number'),
            'date_of_birth' => $val('date_of_birth', 'dob'),
            'gender' => $val('gender'),
            'address' => [
                'raw_address_bn' => $val('address', 'raw_address_bn', 'present_address'),
                'division_hint' => $val('division', 'division_hint'),
                'district_hint' => $val('district', 'district_hint'),
                'upazila_hint' => $val('upazila', 'upazila_hint'),
                'union_or_ward' => $val('union_or_ward', 'union'),
                'village_or_road' => $val('village_or_road', 'village'),
                'post_code' => $val('post_code', 'postcode'),
            ],
        ];

        return $this->validateAndNormalize($mapped);
    }

    private function extractViaGemini(UploadedFile $frontImage, ?UploadedFile $backImage = null, array $settings = []): array
    {
        $apiKey = (string) ($settings['gemini_api_key'] ?? config('services.gemini.api_key', ''));
        if ($apiKey === '') {
            return [
                'ok' => false,
                'status' => 503,
                'fallback_allowed' => true,
                'message' => 'OCR API কনফিগার করা নেই — লোকাল অফলাইন OCR ব্যবহার করা হচ্ছে।',
            ];
        }

        $primaryModel = (string) ($settings['gemini_model'] ?? config('services.gemini.model', 'gemini-3.8-flash'));
        $models = array_values(array_unique(array_filter([
            $primaryModel,
            'gemini-3.8-flash',
            'gemini-2.5-flash-lite',
            'gemini-2.0-flash',
        ])));

        $parts = [
            ['text' => $this->buildPrompt($backImage !== null)],
            $this->encodeImagePart($frontImage),
        ];

        if ($backImage !== null) {
            $parts[] = $this->encodeImagePart($backImage);
        }

        $response = null;
        $lastErrorStatus = 503;
        $lastUpstreamMsg = '';

        foreach ($models as $model) {
            try {
                $attempt = Http::timeout(18)
                    ->post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}", [
                        'contents' => [
                            ['parts' => $parts],
                        ],
                        'generationConfig' => [
                            'temperature' => 0.1,
                            'responseMimeType' => 'application/json',
                            'responseSchema' => $this->responseSchema(),
                        ],
                    ]);
            } catch (\Throwable $e) {
                Log::warning('NID OCR request failed', ['model' => $model, 'error' => $e->getMessage()]);
                continue;
            }

            if ($attempt->successful()) {
                $response = $attempt;
                break;
            }

            $lastErrorStatus = $attempt->status();
            $lastUpstreamMsg = (string) data_get($attempt->json(), 'error.message', '');
            Log::warning('NID OCR upstream error', [
                'model' => $model,
                'status' => $lastErrorStatus,
                'body' => mb_substr($attempt->body(), 0, 300),
            ]);

            // Retry next fallback model on 404 (deprecated), 429 (quota), 500/503 (high demand)
            if (! in_array($lastErrorStatus, [404, 429, 500, 503], true)) {
                break;
            }
        }

        if ($response === null) {
            $hint = match ($lastErrorStatus) {
                400, 403 => 'API Key সঠিক নয় বা পারমিশন নেই।',
                429 => 'OCR API কোটা/লিমিট শেষ হয়েছে।',
                default => 'অনলাইন OCR সার্ভার ব্যস্ত আছে।',
            };

            if (config('app.debug') && $lastUpstreamMsg !== '') {
                $hint .= ' (' . mb_substr($lastUpstreamMsg, 0, 120) . ')';
            }

            return [
                'ok' => false,
                'status' => 503,
                'fallback_allowed' => true,
                'message' => $hint,
            ];
        }

        $rawText = data_get($response->json(), 'candidates.0.content.parts.0.text');
        $parsed = is_string($rawText) ? json_decode($rawText, true) : null;

        if (! is_array($parsed)) {
            return [
                'ok' => false,
                'status' => 422,
                'message' => 'NID কার্ডের তথ্য পড়া যায়নি। অনুগ্রহ করে পরিষ্কার আলোতে কার্ডটি সোজা ধরে আবার স্ক্যান করুন।',
            ];
        }

        return $this->validateAndNormalize($parsed);
    }

    private function encodeImagePart(UploadedFile $file): array
    {
        $mime = $file->getMimeType() ?: 'image/jpeg';
        $data = base64_encode((string) file_get_contents($file->getRealPath()));

        return [
            'inline_data' => [
                'mime_type' => $mime,
                'data' => $data,
            ],
        ];
    }

    private function validateAndNormalize(array $parsed): array
    {
        $isValidNid = (bool) ($parsed['is_valid_bd_nid'] ?? false);
        $isClear = (bool) ($parsed['is_clear'] ?? false);
        $score = (int) ($parsed['readability_score'] ?? 0);

        if (! $isValidNid || ! $isClear || $score < 60) {
            $reason = trim((string) ($parsed['rejection_reason_bn'] ?? ''));
            if ($reason === '') {
                $reason = 'ছবিটি ক্লিয়ার নয় বা সঠিক বাংলাদেশি NID কার্ড বোঝা যাচ্ছে না। অনুগ্রহ করে পর্যাপ্ত আলোতে NID কার্ডটি সোজা ধরে আবার স্ক্যান করুন।';
            }

            return [
                'ok' => false,
                'status' => 422,
                'message' => $reason,
            ];
        }

        $rawDigits = $this->onlyDigits($this->toEnglishDigits((string) ($parsed['nid_number'] ?? '')));
        $rawSmart = $this->onlyDigits($this->toEnglishDigits((string) ($parsed['smart_card_number'] ?? '')));

        $nidNumber = '';
        $smartCardNumber = '';

        // 10-digit numbers belong in smart_card_number; 13 or 17-digit numbers belong in nid_number.
        if (strlen($rawSmart) === 10) {
            $smartCardNumber = $rawSmart;
        } elseif (strlen($rawDigits) === 10) {
            $smartCardNumber = $rawDigits;
        }

        if (in_array(strlen($rawDigits), [13, 17], true)) {
            $nidNumber = $rawDigits;
        }

        $nameBn = $this->cleanText($parsed['applicant_name_bn'] ?? null);
        $nameEn = $this->cleanText($parsed['applicant_name_en'] ?? null);
        $dob = $this->normalizeDate($this->toEnglishDigits((string) ($parsed['date_of_birth'] ?? '')));

        if (($nidNumber === '' && $smartCardNumber === '') || ($nameBn === '' && $nameEn === '') || $dob === '') {
            return [
                'ok' => false,
                'status' => 422,
                'message' => 'NID নম্বর, নাম অথবা জন্ম তারিখ স্পষ্টভাবে পড়া যায়নি। অনুগ্রহ করে কার্ডটি স্থির ও পরিষ্কারভাবে ধরে আবার তুলুন।',
            ];
        }

        $fatherBn = $this->cleanText($parsed['father_name_bn'] ?? null);
        $spouseBn = $this->cleanText($parsed['spouse_name_bn'] ?? null);
        $motherBn = $this->cleanText($parsed['mother_name_bn'] ?? null);
        $gender = in_array($parsed['gender'] ?? '', ['male', 'female', 'other'], true)
            ? $parsed['gender']
            : '';

        $address = is_array($parsed['address'] ?? null) ? $parsed['address'] : [];
        $normalizedAddress = [
            'raw_address_bn' => $this->cleanText($address['raw_address_bn'] ?? null),
            'division_hint' => $this->cleanText($address['division_hint'] ?? null),
            'district_hint' => $this->cleanText($address['district_hint'] ?? null),
            'upazila_hint' => $this->cleanText($address['upazila_hint'] ?? null),
            'union_or_ward' => $this->cleanText($address['union_or_ward'] ?? null),
            'village_or_road' => $this->cleanText($address['village_or_road'] ?? null),
            'post_code' => $this->onlyDigits($this->toEnglishDigits((string) ($address['post_code'] ?? ''))),
        ];

        $duplicateWarnings = $this->findDuplicates($nidNumber, $smartCardNumber);

        return [
            'ok' => true,
            'status' => 200,
            'data' => [
                'card_type' => $parsed['card_type'] ?? ($smartCardNumber !== '' ? 'smart' : 'old'),
                'readability_score' => $score,
                'applicant_name_bn' => $nameBn,
                'applicant_name_en' => $nameEn,
                'father_name_bn' => $fatherBn,
                'spouse_name_bn' => $spouseBn,
                'mother_name_bn' => $motherBn,
                'marital_status' => $spouseBn !== '' ? 'married' : '',
                'nid_number' => $nidNumber,
                'smart_card_number' => $smartCardNumber,
                'date_of_birth' => $dob,
                'gender' => $gender,
                'address' => $normalizedAddress,
            ],
            'duplicate_warnings' => $duplicateWarnings,
        ];
    }

    private function findDuplicates(string $nidNumber, string $smartCardNumber): array
    {
        $warnings = [];

        try {
            if ($nidNumber !== '') {
                $existing = MemberAdmission::query()
                    ->where('nid_number', $nidNumber)
                    ->select('id', 'application_no', 'applicant_name_bn', 'applicant_name_en')
                    ->first();
                if ($existing) {
                    $warnings['nid_number'] = "এই NID নম্বর ({$nidNumber}) দিয়ে ইতোমধ্যে আবেদন ({$existing->application_no}) রয়েছে।";
                }
            }

            if ($smartCardNumber !== '') {
                $existing = MemberAdmission::query()
                    ->where('smart_card_number', $smartCardNumber)
                    ->select('id', 'application_no', 'applicant_name_bn', 'applicant_name_en')
                    ->first();
                if ($existing) {
                    $warnings['smart_card_number'] = "এই স্মার্ট কার্ড নম্বর ({$smartCardNumber}) দিয়ে ইতোমধ্যে আবেদন ({$existing->application_no}) রয়েছে।";
                }
            }
        } catch (\Throwable) {
            return [];
        }

        return $warnings;
    }

    private function toEnglishDigits(string $value): string
    {
        return strtr($value, [
            '০' => '0', '১' => '1', '২' => '2', '৩' => '3', '৪' => '4',
            '৫' => '5', '৬' => '6', '৭' => '7', '৮' => '8', '৯' => '9',
        ]);
    }

    private function onlyDigits(string $value): string
    {
        return preg_replace('/\D+/', '', $value) ?? '';
    }

    private function cleanText(?string $value): string
    {
        if ($value === null) {
            return '';
        }

        return trim((string) preg_replace('/\s+/u', ' ', $value));
    }

    private function normalizeDate(string $value): string
    {
        $value = trim($value);
        if ($value === '') {
            return '';
        }

        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return $value;
        }

        $ts = strtotime($value);
        if ($ts === false) {
            return '';
        }

        return date('Y-m-d', $ts);
    }

    private function buildPrompt(bool $hasBackImage): string
    {
        $backInstruction = $hasBackImage
            ? 'Image 2 is the BACK side of the NID. Extract the full Bangla address, district, upazila, union/ward, village/road, and 4-digit post code accurately.'
            : 'Only the FRONT side image is provided.';

        return <<<PROMPT
You are a strict Bangladesh National ID (NID) eKYC verification and OCR engine.
Image 1 is the FRONT side of a Bangladesh NID card (either 10-digit Smart Card or 13/17-digit Old Laminated NID).
{$backInstruction}

Rules:
1. Verify if Image 1 is genuinely a Bangladesh NID card and whether all key fields (Name, Father/Spouse, Mother, Date of Birth, ID/NID No) are sharp and readable.
2. If the image is blurry, dark, has heavy flash glare, is cropped/cut off, or is NOT a Bangladesh NID, set `is_valid_bd_nid` or `is_clear` to false and write a clear, polite instruction in Bangla in `rejection_reason_bn` telling the Field Officer how to hold/capture it properly.
3. For old female NIDs, if the label is "স্বামী:" instead of "পিতা:", put the name in `spouse_name_bn` and leave `father_name_bn` empty.
4. Convert `date_of_birth` strictly to `YYYY-MM-DD` (e.g. `15 Jan 1990` -> `1990-01-15`).
5. Put 10-digit Smart Card numbers in `smart_card_number` and 13/17-digit NID numbers in `nid_number` (digits only, English numerals).
6. Never guess or hallucinate unreadable characters.
PROMPT;
    }

    private function responseSchema(): array
    {
        return [
            'type' => 'OBJECT',
            'properties' => [
                'is_valid_bd_nid' => ['type' => 'BOOLEAN'],
                'is_clear' => ['type' => 'BOOLEAN'],
                'readability_score' => ['type' => 'INTEGER'],
                'rejection_reason_bn' => ['type' => 'STRING'],
                'card_type' => ['type' => 'STRING'],
                'applicant_name_bn' => ['type' => 'STRING'],
                'applicant_name_en' => ['type' => 'STRING'],
                'father_name_bn' => ['type' => 'STRING'],
                'spouse_name_bn' => ['type' => 'STRING'],
                'mother_name_bn' => ['type' => 'STRING'],
                'nid_number' => ['type' => 'STRING'],
                'smart_card_number' => ['type' => 'STRING'],
                'date_of_birth' => ['type' => 'STRING'],
                'gender' => ['type' => 'STRING'],
                'address' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'raw_address_bn' => ['type' => 'STRING'],
                        'division_hint' => ['type' => 'STRING'],
                        'district_hint' => ['type' => 'STRING'],
                        'upazila_hint' => ['type' => 'STRING'],
                        'union_or_ward' => ['type' => 'STRING'],
                        'village_or_road' => ['type' => 'STRING'],
                        'post_code' => ['type' => 'STRING'],
                    ],
                ],
            ],
            'required' => ['is_valid_bd_nid', 'is_clear', 'readability_score'],
        ];
    }
}
