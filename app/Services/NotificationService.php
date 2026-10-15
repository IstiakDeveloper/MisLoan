<?php

namespace App\Services;

use App\Mail\WorkflowNotificationMail;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class NotificationService
{
    /**
     * Send an in-app notification, and optionally an immediate email.
     * Routine events stay unsent so the daily digest can pack them into one email.
     *
     * @param  User|Collection<int, User>|array<int, User>  $users
     * @param  array<string, mixed>|null  $details
     */
    public function send(
        User|Collection|array $users,
        string $type,
        string $title,
        string $message,
        ?Model $notifiable = null,
        ?string $actionUrl = null,
        ?array $details = null,
        bool $immediateEmail = false,
    ): void {
        if ($users instanceof User) {
            $users = collect([$users]);
        } elseif (is_array($users)) {
            $users = collect($users);
        }

        $users = $users->filter(fn ($u) => $u instanceof User && $u->is_active)->unique('id');

        foreach ($users as $user) {
            try {
                $notification = Notification::create([
                    'user_id' => $user->id,
                    'type' => $type,
                    'title' => $title,
                    'message' => $message,
                    'notifiable_type' => $notifiable ? get_class($notifiable) : null,
                    'notifiable_id' => $notifiable?->getKey(),
                    'data' => $details ? ['details' => $details] : null,
                    'action_url' => $actionUrl,
                    'is_read' => false,
                    'is_sent_email' => false,
                ]);

                if ($immediateEmail && $this->canReceiveEmail($user)) {
                    $this->sendEmail($user, $notification, $title, $message, $actionUrl, $details);
                }
            } catch (\Throwable $e) {
                Log::error("Failed to process notification for user ID {$user->id}: ".$e->getMessage(), [
                    'exception' => $e,
                    'user_id' => $user->id,
                    'type' => $type,
                ]);
            }
        }
    }

    public function canReceiveEmail(User $user): bool
    {
        return $user->is_active
            && is_string($user->email)
            && filter_var($user->email, FILTER_VALIDATE_EMAIL) !== false;
    }

    /**
     * Send email wrapped in defer() so form submission returns without waiting for the mail server.
     *
     * @param  array<string, mixed>|null  $details
     */
    private function sendEmail(
        User $user,
        Notification $notification,
        string $title,
        string $message,
        ?string $actionUrl,
        ?array $details
    ): void {
        defer(function () use ($user, $notification, $title, $message, $actionUrl, $details) {
            try {
                Mail::to($user->email)->send(
                    new WorkflowNotificationMail(
                        title: $title,
                        messageContent: $message,
                        actionUrl: $actionUrl ? url($actionUrl) : null,
                        details: $details,
                        userName: $user->name
                    )
                );

                $notification->markAsEmailSent();
            } catch (\Throwable $e) {
                Log::warning("Email dispatch failed for notification ID {$notification->id} to {$user->email}: ".$e->getMessage());
            }
        });
    }
}
