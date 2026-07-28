<?php

namespace App\Services;

use App\Models\Branch;
use Illuminate\Support\Facades\Auth;
use RuntimeException;

class HrmSsoService
{
    /**
     * @return 'logged_in'|'no_match'
     */
    public function attemptLogin(string $token): string
    {
        $payload = $this->parseToken($token);
        if ($payload === null) {
            throw new RuntimeException('Invalid or expired login link. Please sign in manually.');
        }

        $type = (string) ($payload['type'] ?? 'staff');

        if ($type === 'branch') {
            return $this->attemptBranchLogin($payload);
        }

        return $this->attemptStaffLogin($payload);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return 'logged_in'|'no_match'
     */
    private function attemptBranchLogin(array $payload): string
    {
        $branchCode = trim((string) ($payload['branch_code'] ?? ''));
        if ($branchCode === '') {
            return 'no_match';
        }

        $branch = Branch::query()->with('branchUser')->where('code', $branchCode)->first();
        if (! $branch || ! $branch->is_active) {
            return 'no_match';
        }

        $user = $branch->branchUser;
        if (! $user || ! $user->isBranchAccount()) {
            $user = app(BranchAccountService::class)->ensureForBranch($branch);
        }

        if (! $user->is_active) {
            throw new RuntimeException('This branch account is inactive in MisLoan.');
        }

        Auth::login($user, true);
        session([
            'branch_login' => true,
            'branch_context_id' => $branch->id,
        ]);

        return 'logged_in';
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return 'logged_in'|'no_match'
     */
    private function attemptStaffLogin(array $payload): string
    {
        $pin = trim((string) ($payload['pin'] ?? ''));
        $username = trim((string) ($payload['username'] ?? $pin));
        if ($pin === '') {
            return 'no_match';
        }

        $user = app(HrmUserSyncService::class)->findMatchingUser($pin, $username);

        if (! $user || $user->isBranchAccount()) {
            return 'no_match';
        }

        if (! $user->is_active) {
            throw new RuntimeException('Your MisLoan account is inactive.');
        }

        Auth::login($user, true);
        session()->forget(['branch_login', 'branch_context_id']);

        return 'logged_in';
    }

    /**
     * @return array<string, mixed>|null
     */
    private function parseToken(string $token): ?array
    {
        $secret = (string) config('services.hrm.token');
        if ($secret === '') {
            return null;
        }

        $parts = explode('.', $token, 2);
        if (count($parts) !== 2) {
            return null;
        }

        [$payloadB64, $signature] = $parts;
        $expected = hash_hmac('sha256', $payloadB64, $secret);
        if (! hash_equals($expected, $signature)) {
            return null;
        }

        $json = base64_decode(strtr($payloadB64, '-_', '+/'), true);
        if ($json === false) {
            return null;
        }

        $payload = json_decode($json, true);
        if (! is_array($payload)) {
            return null;
        }

        $exp = (int) ($payload['exp'] ?? 0);
        if ($exp < time()) {
            return null;
        }

        return $payload;
    }
}
