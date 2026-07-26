<?php

namespace App\Http\Middleware;

use App\Support\WholeNumberDecimals;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Base-level: strip whole decimals (0.00 → 0) from every Inertia JSON response.
 */
class NormalizeInertiaAmounts
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (! $request->header('X-Inertia')) {
            return $response;
        }

        $raw = $response->getContent();
        if (! is_string($raw) || $raw === '') {
            return $response;
        }

        $payload = json_decode($raw, true);
        if (! is_array($payload) || ! array_key_exists('props', $payload)) {
            return $response;
        }

        $payload['props'] = WholeNumberDecimals::strip($payload['props']);
        $response->setContent(json_encode($payload, JSON_UNESCAPED_UNICODE));

        return $response;
    }
}
