<?php

namespace App\Services;

use App\Models\MemberAdmission;
use App\Models\MemberAdmissionIssue;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class LostHeadOfficeIssueRestorer
{
    public const RETURN_TITLE = 'সদস্য আবেদন সংশোধনের জন্য ফেরত পাঠানো হয়েছে';

    /**
     * @var list<string>
     */
    private const REPLY_TITLES = [
        'সদস্য ভর্তি আপত্তিতে শাখার জবাব এসেছে (ZM অনুমোদন অপেক্ষমান)',
        'সদস্য ভর্তির আপত্তিতে শাখার জবাব এসেছে',
        'সদস্য ভর্তির আপত্তিতে জোনাল ব্যাখ্যা এসেছে',
    ];

    /**
     * @var list<string>
     */
    private const ZM_TITLES = [
        'সদস্য ভর্তি আপত্তিতে জোনাল অনুমোদন সম্পন্ন হয়েছে',
    ];

    public function __construct(private VerificationIssueService $issues) {}

    /**
     * Rebuild Head Office issues that were deleted on resubmit, using notification history.
     *
     * @return array{
     *     restored: int,
     *     replies_filled: int,
     *     comments_fixed: int,
     *     skipped: int,
     *     items: list<array<string, mixed>>
     * }
     */
    public function restore(bool $dryRun = false, ?string $applicationNo = null): array
    {
        $report = [
            'restored' => 0,
            'replies_filled' => 0,
            'comments_fixed' => 0,
            'skipped' => 0,
            'items' => [],
        ];

        $returnEvents = $this->uniqueReturnEvents($applicationNo);

        foreach ($returnEvents->groupBy('admission_id') as $admissionId => $events) {
            $admission = MemberAdmission::with('issues')->find($admissionId);
            if (! $admission) {
                $report['skipped']++;
                $report['items'][] = [
                    'application_no' => null,
                    'admission_id' => $admissionId,
                    'action' => 'skipped',
                    'reason' => 'admission_not_found',
                ];

                continue;
            }

            $ordered = $events->sortBy('created_at')->values();

            foreach ($ordered as $index => $event) {
                $nextAt = $ordered->get($index + 1)['created_at'] ?? null;
                $result = $this->restoreOneRound($admission, $event, $nextAt, $dryRun);
                $report[$result['bucket']]++;
                $report['items'][] = $result['item'];
                $admission->unsetRelation('issues');
                $admission->load('issues');
            }
        }

        return $report;
    }

    /**
     * @param  array{admission_id: int, ho_comment: string, created_at: Carbon, returned_by: ?int}  $event
     * @return array{bucket: string, item: array<string, mixed>}
     */
    private function restoreOneRound(MemberAdmission $admission, array $event, ?Carbon $nextAt, bool $dryRun): array
    {
        $hoComment = $event['ho_comment'];
        $returnedAt = $event['created_at'];
        $base = [
            'application_no' => $admission->application_no,
            'admission_id' => $admission->id,
            'ho_comment' => $hoComment,
            'returned_at' => $returnedAt->toDateTimeString(),
        ];

        $existing = $admission->issues->first(
            fn (MemberAdmissionIssue $issue) => $this->issues->isSameMessage($issue->issue_description, $hoComment)
        );

        $replyText = $this->findReplyText($admission->id, $returnedAt, $nextAt);
        $replyUserId = $this->findReplyUserId($admission->id, $returnedAt, $nextAt);
        $zm = $this->findZmApproval($admission->id, $returnedAt, $nextAt);

        if (! $replyText) {
            $replyText = $this->inferReplyFromRevisionComments($admission->revision_comments, $hoComment);
        }

        if ($existing) {
            $filledReply = false;
            $fixedComments = false;

            if (! filled($existing->resolution_note) && filled($replyText)) {
                $filledReply = true;
                if (! $dryRun) {
                    $existing->update(array_filter([
                        'resolution_note' => $replyText,
                        'resolved_by' => $existing->resolved_by ?: $replyUserId,
                        'resolved_at' => $existing->resolved_at ?: ($replyUserId ? $returnedAt->copy()->addMinutes(5) : null),
                        'zm_approved_at' => $existing->zm_approved_at ?: $zm['at'],
                        'zm_approved_by' => $existing->zm_approved_by ?: $zm['by'],
                    ], fn ($v) => $v !== null && $v !== ''));
                }
            }

            $rebuilt = $this->rebuildRevisionComments($admission->revision_comments, $hoComment);
            if ($rebuilt !== (string) $admission->revision_comments) {
                $fixedComments = true;
                if (! $dryRun) {
                    MemberAdmission::withoutEvents(fn () => $admission->update(['revision_comments' => $rebuilt]));
                }
            }

            if ($filledReply || $fixedComments) {
                return [
                    'bucket' => $filledReply ? 'replies_filled' : 'comments_fixed',
                    'item' => $base + [
                        'action' => $filledReply ? 'reply_restored' : 'comments_fixed',
                        'issue_id' => $existing->id,
                    ],
                ];
            }

            return [
                'bucket' => 'skipped',
                'item' => $base + [
                    'action' => 'skipped',
                    'reason' => 'already_present',
                    'issue_id' => $existing->id,
                ],
            ];
        }

        $reportedBy = $event['returned_by']
            ?: $admission->returned_by
            ?: $admission->reviewed_by
            ?: User::query()->where('has_all_access', 1)->value('id');

        if (! $reportedBy) {
            return [
                'bucket' => 'skipped',
                'item' => $base + [
                    'action' => 'skipped',
                    'reason' => 'no_reporter',
                ],
            ];
        }

        $status = ($zm['at'] || in_array($admission->status, ['approved', 'rejected'], true))
            ? 'resolved'
            : 'pending';

        if (! $dryRun) {
            $issue = new MemberAdmissionIssue;
            $issue->forceFill([
                'member_admission_id' => $admission->id,
                'reported_by' => $reportedBy,
                'issue_description' => $hoComment,
                'status' => $status,
                'resolution_note' => $replyText,
                'resolved_by' => $replyText ? $replyUserId : null,
                'resolved_at' => $replyText ? ($replyUserId ? $this->findReplyAt($admission->id, $returnedAt, $nextAt) : $returnedAt) : null,
                'zm_approved_at' => $zm['at'],
                'zm_approved_by' => $zm['by'],
                'zm_approval_note' => $zm['note'],
            ]);
            $issue->created_at = $returnedAt;
            $issue->updated_at = $zm['at'] ?? $this->findReplyAt($admission->id, $returnedAt, $nextAt) ?? $returnedAt;
            $issue->save();

            $rebuilt = $this->rebuildRevisionComments($admission->revision_comments, $hoComment);
            if ($rebuilt !== (string) $admission->revision_comments) {
                MemberAdmission::withoutEvents(fn () => $admission->update(['revision_comments' => $rebuilt]));
            }
        }

        return [
            'bucket' => 'restored',
            'item' => $base + [
                'action' => 'restored',
                'reply_preview' => $replyText ? mb_substr($replyText, 0, 80) : null,
            ],
        ];
    }

    /**
     * @return Collection<int, array{admission_id: int, ho_comment: string, created_at: Carbon, returned_by: ?int}>
     */
    private function uniqueReturnEvents(?string $applicationNo): Collection
    {
        $admissionIds = null;
        if (filled($applicationNo)) {
            $admissionIds = MemberAdmission::query()
                ->where('application_no', $applicationNo)
                ->pluck('id');
        }

        $notifications = Notification::query()
            ->where('title', self::RETURN_TITLE)
            ->where('notifiable_type', MemberAdmission::class)
            ->when($admissionIds, fn ($q) => $q->whereIn('notifiable_id', $admissionIds))
            ->orderBy('created_at')
            ->get();

        $returnedByMap = MemberAdmission::query()
            ->whereIn('id', $notifications->pluck('notifiable_id')->filter()->unique())
            ->pluck('returned_by', 'id');

        return $notifications
            ->map(function (Notification $notification) use ($returnedByMap) {
                $comment = $this->extractHoComment($notification);
                if ($comment === null || $comment === '') {
                    return null;
                }

                $admissionId = (int) $notification->notifiable_id;
                $createdAt = Carbon::parse($notification->created_at);

                return [
                    'admission_id' => $admissionId,
                    'ho_comment' => $comment,
                    'created_at' => $createdAt,
                    'returned_by' => $returnedByMap[$admissionId] ?? null,
                    'key' => $admissionId.'|'.$createdAt->timestamp.'|'.md5($this->normalize($comment)),
                ];
            })
            ->filter()
            ->unique('key')
            ->values();
    }

    private function extractHoComment(Notification $notification): ?string
    {
        $details = is_array($notification->data) ? ($notification->data['details'] ?? []) : [];
        $fromDetails = trim((string) ($details['মন্তব্য'] ?? ''));
        if ($fromDetails !== '') {
            return $fromDetails;
        }

        if (preg_match('/মন্তব্য:\s*(.+)$/su', (string) $notification->message, $matches)) {
            return trim($matches[1]);
        }

        return null;
    }

    private function findReplyText(int $admissionId, Carbon $from, ?Carbon $until): ?string
    {
        $notification = $this->firstNotification($admissionId, self::REPLY_TITLES, $from, $until);
        if (! $notification) {
            return null;
        }

        $details = is_array($notification->data) ? ($notification->data['details'] ?? []) : [];
        $text = trim((string) ($details['ব্যাখ্যা'] ?? ''));

        return $text !== '' ? $text : null;
    }

    private function findReplyUserId(int $admissionId, Carbon $from, ?Carbon $until): ?int
    {
        $notification = $this->firstNotification($admissionId, self::REPLY_TITLES, $from, $until);
        if (! $notification) {
            return null;
        }

        $details = is_array($notification->data) ? ($notification->data['details'] ?? []) : [];

        return $this->userIdFromLabel($details['জবাবদাতা'] ?? null);
    }

    private function findReplyAt(int $admissionId, Carbon $from, ?Carbon $until): ?Carbon
    {
        $notification = $this->firstNotification($admissionId, self::REPLY_TITLES, $from, $until);

        return $notification?->created_at ? Carbon::parse($notification->created_at) : null;
    }

    /**
     * @return array{at: ?Carbon, by: ?int, note: ?string}
     */
    private function findZmApproval(int $admissionId, Carbon $from, ?Carbon $until): array
    {
        $notification = $this->firstNotification($admissionId, self::ZM_TITLES, $from, $until);
        if (! $notification) {
            return ['at' => null, 'by' => null, 'note' => null];
        }

        $details = is_array($notification->data) ? ($notification->data['details'] ?? []) : [];

        return [
            'at' => Carbon::parse($notification->created_at),
            'by' => $this->userIdFromLabel($details['ZM অনুমোদনকারী'] ?? null),
            'note' => filled($details['মন্তব্য'] ?? null) ? (string) $details['মন্তব্য'] : null,
        ];
    }

    /**
     * @param  list<string>  $titles
     */
    private function firstNotification(int $admissionId, array $titles, Carbon $from, ?Carbon $until): ?Notification
    {
        return Notification::query()
            ->where('notifiable_type', MemberAdmission::class)
            ->where('notifiable_id', $admissionId)
            ->whereIn('title', $titles)
            ->where('created_at', '>=', $from)
            ->when($until, fn ($q) => $q->where('created_at', '<', $until))
            ->orderBy('created_at')
            ->first();
    }

    private function inferReplyFromRevisionComments(?string $revisionComments, string $hoComment): ?string
    {
        $revisionComments = (string) $revisionComments;
        if ($revisionComments === '') {
            return null;
        }

        [$before, $after] = $this->splitRevisionComments($revisionComments);

        if ($this->issues->isSameMessage($before, $hoComment)) {
            return filled($after) ? $after : null;
        }

        return filled($before) ? $before : (filled($after) ? $after : null);
    }

    public function rebuildRevisionComments(?string $current, string $hoComment): string
    {
        $current = (string) $current;
        [$before] = $this->splitRevisionComments($current);

        if ($this->issues->isSameMessage($before, $hoComment)) {
            return $current;
        }

        $branchSection = '';
        if (preg_match('/(---+\s*Branch\s*Revision\s*Note.*)$/si', $current, $matches)) {
            $branchSection = "\n\n".trim($matches[1]);
        }

        return trim($hoComment.$branchSection);
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function splitRevisionComments(string $text): array
    {
        if (preg_match('/^(.*?)(?:\n+|\s*)(?:---+\s*Branch\s*Revision\s*Note(?:\s*\([^)]*\))?\s*---+)(.*)$/si', $text, $matches)) {
            return [trim($matches[1]), trim($matches[2])];
        }

        return [trim($text), ''];
    }

    private function userIdFromLabel(mixed $label): ?int
    {
        $name = trim((string) $label);
        if ($name === '') {
            return null;
        }

        if (preg_match('/^(.+?)\s*\(/u', $name, $matches)) {
            $name = trim($matches[1]);
        }

        return User::withTrashed()->where('name', $name)->value('id');
    }

    private function normalize(string $text): string
    {
        return (string) preg_replace('/\s+/u', ' ', trim($text));
    }
}
