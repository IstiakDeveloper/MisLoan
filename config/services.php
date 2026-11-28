<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'block_list' => [
        'url' => env('BLOCK_LIST_API_URL', 'http://block.mousumibd.org/api'),
        'token' => env('BLOCK_LIST_API_TOKEN'),
    ],

    'hrm' => [
        'url' => env('HRM_API_URL'),
        'token' => env('HRM_API_TOKEN'),
    ],

    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
        'model' => env('GEMINI_OCR_MODEL', 'gemini-3.8-flash'),
    ],

    'groq' => [
        'api_key' => env('GROQ_API_KEY'),
        'model' => env('GROQ_OCR_MODEL', 'meta-llama/llama-4-scout-17b-16e-instruct'),
    ],

    'openrouter' => [
        'api_key' => env('OPENROUTER_API_KEY'),
        'model' => env('OPENROUTER_OCR_MODEL', 'google/gemma-4-31b-it:free'),
    ],

    'google_vision' => [
        'api_key' => env('GOOGLE_VISION_API_KEY'),
    ],

    'nid_ocr' => [
        'url' => env('NID_OCR_URL', 'http://127.0.0.1:8001'),
        'token' => env('NID_OCR_TOKEN'),
        'timeout' => (int) env('NID_OCR_TIMEOUT', 30),
    ],

];
