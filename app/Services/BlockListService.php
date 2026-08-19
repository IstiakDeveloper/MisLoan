<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\TeamBasedApprovalItem;
use App\Models\User;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class BlockListService
{
    /**
     * Push a rejected team-based member to the block_list Customer API.
     *
     * @param  array<string, mixed>  $blockListData
     */
    public function pushRejectedMember(
        User $approver,
        TeamBasedApprovalItem $item,
        Branch $branch,
        array $blockListData,
        string $rejectionComments,
    ): void {
        $this->pushRejectedPerson(
            $approver,
            (string) ($item->member_name ?: 'N/A'),
            $branch,
            $blockListData,
            $rejectionComments,
        );
    }

    /**
     * Push a rejected person (admission / team-based) to the block_list Customer API.
     *
     * @param  array<string, mixed>  $blockListData
     */
    public function pushRejectedPerson(
        User $approver,
        string $memberName,
        Branch $branch,
        array $blockListData,
        string $rejectionComments,
    ): void {
        $username = trim((string) $approver->username);
        if ($username === '') {
            throw new RuntimeException('আপনার username সেট করা নেই। Block list-এ যোগ করতে username প্রয়োজন।');
        }

        $branchCode = trim((string) $branch->code);
        if ($branchCode === '') {
            throw new RuntimeException('শাখার code পাওয়া যায়নি। Block list-এ পাঠানো যায়নি।');
        }

        $baseUrl = rtrim((string) config('services.block_list.url'), '/');
        $token = (string) config('services.block_list.token');

        if ($baseUrl === '' || $token === '') {
            throw new RuntimeException('Block list API কনফিগার করা নেই। সিস্টেম অ্যাডমিনের সাথে যোগাযোগ করুন।');
        }

        $name = trim($memberName) !== '' ? trim($memberName) : 'N/A';

        $payload = [
            'blocked_by_username' => $username,
            'branch_code' => $branchCode,
            'name' => $name,
            'name_bn' => $blockListData['name_bn'] ?? null,
            'father_name' => $blockListData['father_name'] ?? null,
            'mother_name' => $blockListData['mother_name'] ?? null,
            'spouse_name' => $blockListData['spouse_name'] ?? null,
            'dob' => $blockListData['dob'] ?? null,
            'nid_number' => $blockListData['nid_number'],
            'phone_number' => $blockListData['phone_number'],
            'address' => $blockListData['address'] ?? null,
            'details' => $rejectionComments,
            'rejected_by' => $approver->name,
        ];

        try {
            $response = Http::timeout(20)
                ->acceptJson()
                ->withToken($token)
                ->post($baseUrl.'/customers', $payload);
        } catch (RequestException $e) {
            throw new RuntimeException('Block list API-তে সংযোগ করা যায়নি। পরে আবার চেষ্টা করুন।', 0, $e);
        }

        if ($response->successful()) {
            return;
        }

        $message = $response->json('message');

        if (! is_string($message) || $message === '') {
            $message = 'Block list-এ সদস্য যোগ করা যায়নি।';
        }

        throw new RuntimeException($message);
    }

    /**
     * Verify approver username (and optional branch) exists in block_list.
     *
     * @return array{ok: bool, message: string}
     */
    public function verifyApprover(User $approver, ?string $branchCode = null): array
    {
        $username = trim((string) $approver->username);
        if ($username === '') {
            return [
                'ok' => false,
                'message' => 'আপনার username সেট করা নেই। Block list-এ যোগ করতে username প্রয়োজন।',
            ];
        }

        $baseUrl = rtrim((string) config('services.block_list.url'), '/');
        $token = (string) config('services.block_list.token');

        if ($baseUrl === '' || $token === '') {
            return [
                'ok' => false,
                'message' => 'Block list API কনফিগার করা নেই। সিস্টেম অ্যাডমিনের সাথে যোগাযোগ করুন।',
            ];
        }

        $query = ['username' => $username];
        $branchCode = trim((string) ($branchCode ?? ''));
        if ($branchCode !== '') {
            $query['branch_code'] = $branchCode;
        }

        try {
            $response = Http::timeout(15)
                ->acceptJson()
                ->withToken($token)
                ->get($baseUrl.'/users/verify', $query);
        } catch (RequestException $e) {
            return [
                'ok' => false,
                'message' => 'Block list API-তে সংযোগ করা যায়নি। পরে আবার চেষ্টা করুন।',
            ];
        }

        if (! $response->successful()) {
            return [
                'ok' => false,
                'message' => 'Block list username যাচাই করা যায়নি।',
            ];
        }

        $ok = (bool) $response->json('ok');
        $message = $response->json('message');

        return [
            'ok' => $ok,
            'message' => is_string($message) && $message !== ''
                ? $message
                : ($ok ? 'Username যাচাই সফল।' : 'Username block list-এ পাওয়া যায়নি।'),
        ];
    }
}
