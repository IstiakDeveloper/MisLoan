<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Log;

class SanitizeJsonResponse
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        try {
            $response = $next($request);

            // Only process JSON responses (including Inertia responses)
            if ($response->headers->get('Content-Type') === 'application/json' ||
                $response->headers->get('X-Inertia')) {

                $content = $response->getContent();

                // Try to decode the content
                $decoded = json_decode($content, true);

                if (json_last_error() !== JSON_ERROR_NONE) {
                    Log::warning('JSON encoding error detected, attempting to sanitize', [
                        'error' => json_last_error_msg(),
                        'url' => $request->fullUrl()
                    ]);

                    // If decoding failed, we need to work with the raw content
                    // This is tricky, so let's just try to sanitize and re-encode
                    if ($decoded !== null) {
                        // Sanitize the decoded data
                        $sanitized = $this->sanitizeData($decoded);

                        // Re-encode with proper options
                        $options = JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;
                        $newContent = json_encode($sanitized, $options);

                        if ($newContent !== false) {
                            $response->setContent($newContent);
                        }
                    }
                }
            }

            return $response;

        } catch (\Exception $e) {
            Log::error('Error in SanitizeJsonResponse middleware', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Recursively sanitize data for JSON encoding
     */
    private function sanitizeData($data)
    {
        if (is_array($data) || is_object($data)) {
            $result = [];
            foreach ($data as $key => $value) {
                $sanitizedKey = $this->sanitizeString($key);
                $result[$sanitizedKey] = $this->sanitizeData($value);
            }
            return is_object($data) ? (object)$result : $result;
        }

        if (is_string($data)) {
            return $this->sanitizeString($data);
        }

        return $data;
    }

    /**
     * Sanitize a string for JSON encoding
     */
    private function sanitizeString($string)
    {
        if (!is_string($string)) {
            return $string;
        }

        // Convert to UTF-8 and remove invalid characters
        $string = mb_convert_encoding($string, 'UTF-8', 'UTF-8');

        // Remove any non-printable characters except newlines, tabs, and carriage returns
        $string = preg_replace('/[^\x{0009}\x{000a}\x{000d}\x{0020}-\x{D7FF}\x{E000}-\x{FFFD}]+/u', '', $string);

        // Remove any null bytes
        $string = str_replace("\0", '', $string);

        return $string;
    }
}
