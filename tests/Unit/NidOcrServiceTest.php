<?php

namespace Tests\Unit;

use App\Services\NidOcrService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class NidOcrServiceTest extends TestCase
{
    public function test_returns_503_when_gemini_api_key_is_missing(): void
    {
        config()->set('services.gemini.api_key', '');

        $service = new NidOcrService();
        $result = $service->extract(UploadedFile::fake()->image('nid.jpg', 800, 500));

        $this->assertFalse($result['ok']);
        $this->assertSame(503, $result['status']);
    }

    public function test_fails_immediately_with_422_when_nid_is_blurry_or_invalid(): void
    {
        config()->set('services.gemini.api_key', 'test-key');

        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [[
                    'content' => [
                        'parts' => [[
                            'text' => json_encode([
                                'is_valid_bd_nid' => true,
                                'is_clear' => false,
                                'readability_score' => 30,
                                'rejection_reason_bn' => 'ছবিটি ঝাপসা হয়েছে, ভালোভাবে ধরে আবার তুলুন।',
                            ]),
                        ]],
                    ],
                ]],
            ], 200),
        ]);

        $service = new NidOcrService();
        $result = $service->extract(UploadedFile::fake()->image('nid-blur.jpg', 800, 500));

        $this->assertFalse($result['ok']);
        $this->assertSame(422, $result['status']);
        $this->assertSame('ছবিটি ঝাপসা হয়েছে, ভালোভাবে ধরে আবার তুলুন।', $result['message']);
    }

    public function test_fails_with_422_when_required_fields_are_missing_despite_clear_flag(): void
    {
        config()->set('services.gemini.api_key', 'test-key');

        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [[
                    'content' => [
                        'parts' => [[
                            'text' => json_encode([
                                'is_valid_bd_nid' => true,
                                'is_clear' => true,
                                'readability_score' => 85,
                                'applicant_name_bn' => 'মোঃ রহিম',
                                'nid_number' => '',
                                'smart_card_number' => '',
                                'date_of_birth' => '',
                            ]),
                        ]],
                    ],
                ]],
            ], 200),
        ]);

        $service = new NidOcrService();
        $result = $service->extract(UploadedFile::fake()->image('nid-partial.jpg', 800, 500));

        $this->assertFalse($result['ok']);
        $this->assertSame(422, $result['status']);
    }

    public function test_calls_external_python_service_and_maps_fields_when_configured(): void
    {
        config()->set('services.nid_ocr.url', 'http://127.0.0.1:8001');
        config()->set('services.nid_ocr.token', 'secret-token');

        Http::fake([
            '127.0.0.1:8001/api/v1/nid/scan' => Http::response([
                'success' => true,
                'card_type' => 'smart_nid',
                'fields' => [
                    'name_bn' => ['value' => 'ইসতিয়াক হোসাইন', 'confidence' => 0.97],
                    'name_en' => ['value' => 'ISTIAK HOSSAIN', 'confidence' => 0.98],
                    'father_name' => ['value' => 'মোঃ করিম', 'confidence' => 0.95],
                    'mother_name' => ['value' => 'রাহেলা বেগম', 'confidence' => 0.95],
                    'nid_number' => ['value' => '', 'confidence' => 0.0],
                    'smart_card_number' => ['value' => '1234567890', 'confidence' => 0.99],
                    'date_of_birth' => ['value' => '1995-04-12', 'confidence' => 0.99],
                    'district' => ['value' => 'নওগাঁ', 'confidence' => 0.94],
                    'post_code' => ['value' => '6500', 'confidence' => 0.96],
                ],
            ], 200),
        ]);

        $service = new NidOcrService();
        $result = $service->extract(UploadedFile::fake()->image('nid-front.jpg', 800, 500));

        $this->assertTrue($result['ok']);
        $this->assertSame('ইসতিয়াক হোসাইন', $result['data']['applicant_name_bn']);
        $this->assertSame('1234567890', $result['data']['smart_card_number']);
        $this->assertSame('1995-04-12', $result['data']['date_of_birth']);
        $this->assertSame('6500', $result['data']['address']['post_code']);
    }

    public function test_auto_mode_rotates_groq_to_openrouter_to_gemini_on_rate_limit(): void
    {
        config()->set('services.groq.api_key', 'groq-key');
        config()->set('services.openrouter.api_key', 'or-key');
        config()->set('services.gemini.api_key', 'gem-key');
        config()->set('services.nid_ocr.url', '');

        Http::fake([
            'api.groq.com/*' => Http::response(['error' => 'rate limit'], 429),
            'openrouter.ai/*' => Http::response(['error' => 'busy'], 503),
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [[
                    'content' => [
                        'parts' => [[
                            'text' => json_encode([
                                'is_valid_bd_nid' => true,
                                'is_clear' => true,
                                'readability_score' => 95,
                                'card_type' => 'smart',
                                'applicant_name_bn' => 'হাবিবুর রহমান',
                                'applicant_name_en' => 'HABIBUR RAHMAN',
                                'father_name_bn' => 'মোকছেদ মোড়ল',
                                'mother_name_bn' => 'হাসিয়া',
                                'smart_card_number' => '3314089875',
                                'date_of_birth' => '1999-12-01',
                            ]),
                        ]],
                    ],
                ]],
            ], 200),
        ]);

        $service = new NidOcrService();
        $result = $service->extract(UploadedFile::fake()->image('nid.jpg', 1200, 848));

        $this->assertTrue($result['ok']);
        $this->assertSame('হাবিবুর রহমান', $result['data']['applicant_name_bn']);
        $this->assertSame('3314089875', $result['data']['smart_card_number']);
    }

    public function test_extracts_bangla_and_back_address_via_google_cloud_vision(): void
    {
        config()->set('services.google_vision.api_key', 'gv-test-key');

        Http::fake([
            'vision.googleapis.com/*' => Http::response([
                'responses' => [
                    [
                        'fullTextAnnotation' => [
                            'text' => "গণপ্রজাতন্ত্রী বাংলাদেশ সরকার\nNational ID Card\nনাম\nমোঃ রুহুল আমিন\nName\nMD. RUHUL AMIN\nপিতা\nআককাচ আলী\nমাতা\nমোছাঃ রাহিমা খাতুন\nDate of Birth 21 Jan 1985\nNID No. 326 848 3744",
                        ],
                    ],
                    [
                        'fullTextAnnotation' => [
                            'text' => "ঠিকানা: বাসা/হোল্ডিং: ৩৬, গ্রাম/রাস্তা: রোড নং-২, ধানমন্ডি, ডাকঘর: জিগাতলা - ১২০৯, ঢাকা\nBlood Group: AB+",
                        ],
                    ],
                ],
            ], 200),
        ]);

        $service = new NidOcrService();
        $result = $service->extract(
            UploadedFile::fake()->image('front.jpg', 1000, 630),
            UploadedFile::fake()->image('back.jpg', 1000, 630)
        );

        $this->assertTrue($result['ok']);
        $this->assertSame('মোঃ রুহুল আমিন', $result['data']['applicant_name_bn']);
        $this->assertSame('MD. RUHUL AMIN', $result['data']['applicant_name_en']);
        $this->assertSame('আককাচ আলী', $result['data']['father_name_bn']);
        $this->assertSame('মোছাঃ রাহিমা খাতুন', $result['data']['mother_name_bn']);
        $this->assertSame('3268483744', $result['data']['smart_card_number']);
        $this->assertSame('1985-01-21', $result['data']['date_of_birth']);
        $this->assertSame('ঢাকা', $result['data']['address']['district_hint']);
        $this->assertSame('1209', $result['data']['address']['post_code']);
    }
}
