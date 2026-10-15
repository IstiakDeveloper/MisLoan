<?php

namespace App\Console\Commands;

use App\Mail\DigestNotificationMail;
use App\Models\Notification;
use App\Services\NotificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendNotificationDigestCommand extends Command
{
    private const SAMPLE_LIMIT = 8;

    /**
     * @var array<string, string>
     */
    private const TYPE_LABELS = [
        'loan_application' => 'ঋণ আবেদন',
        'member_admission' => 'সদস্য আবেদন',
    ];

    protected $signature = 'notifications:digest';

    protected $description = 'Email one daily digest per user for routine notifications that were not sent immediately';

    public function handle(NotificationService $notifications): int
    {
        $pending = Notification::query()
            ->where('is_sent_email', false)
            ->whereHas('user', function ($query) {
                $query->where('is_active', true)
                    ->whereNotNull('email')
                    ->where('email', '!=', '');
            })
            ->with('user')
            ->orderBy('id')
            ->get()
            ->filter(fn (Notification $notification) => $notification->user && $notifications->canReceiveEmail($notification->user));

        if ($pending->isEmpty()) {
            $this->info('No pending notification emails.');

            return self::SUCCESS;
        }

        $sent = 0;
        $failed = 0;

        foreach ($pending->groupBy('user_id') as $userNotifications) {
            $user = $userNotifications->first()->user;

            try {
                Mail::to($user->email)->send(new DigestNotificationMail(
                    userName: $user->name,
                    sections: $this->sectionsFor($userNotifications),
                    actionUrl: route('notifications.index'),
                    total: $userNotifications->count(),
                ));

                $userNotifications->pluck('id')->chunk(500)->each(function (Collection $ids): void {
                    Notification::query()
                        ->whereIn('id', $ids)
                        ->update([
                            'is_sent_email' => true,
                            'email_sent_at' => now(),
                        ]);
                });

                $sent++;
            } catch (\Throwable $e) {
                $failed++;
                Log::warning("Digest email failed for user ID {$user->id} to {$user->email}: ".$e->getMessage());
            }
        }

        $this->info("Sent digest email to {$sent} user(s).");

        if ($failed > 0) {
            $this->warn("Failed for {$failed} user(s). Those notifications will be retried next run.");
        }

        return self::SUCCESS;
    }

    /**
     * @param  Collection<int, Notification>  $notifications
     * @return array<int, array{label: string, groups: array<int, array{title: string, count: int, samples: array<int, string>, remaining: int}>}>
     */
    private function sectionsFor(Collection $notifications): array
    {
        $byType = $notifications->groupBy('type');
        $orderedTypes = collect(['loan_application', 'member_admission'])
            ->merge($byType->keys()->sort()->values())
            ->unique()
            ->filter(fn ($type) => $byType->has($type));

        return $orderedTypes->map(function (string $type) use ($byType) {
            $groups = $byType[$type]->groupBy('title')->map(function (Collection $items, string $title) {
                $samples = $items
                    ->map(fn (Notification $notification) => $this->applicationNumber($notification))
                    ->filter()
                    ->values();
                $shown = $samples->take(self::SAMPLE_LIMIT)->all();

                return [
                    'title' => $title,
                    'count' => $items->count(),
                    'samples' => $shown,
                    'remaining' => max(0, $items->count() - count($shown)),
                ];
            })->values()->all();

            return [
                'label' => self::TYPE_LABELS[$type] ?? 'অন্যান্য',
                'groups' => $groups,
            ];
        })->values()->all();
    }

    private function applicationNumber(Notification $notification): ?string
    {
        $details = $notification->data['details'] ?? [];

        if (! is_array($details)) {
            return null;
        }

        foreach (['আবেদন নং', 'নমুনা আবেদন নং'] as $key) {
            $value = trim((string) ($details[$key] ?? ''));

            if ($value !== '') {
                return $value;
            }
        }

        return null;
    }
}
