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
     * Send notification (in-app + mail) to single user or collection of users.
     *
     * @param User|Collection|array $users
     * @param string $type e.g. 'member_admission', 'loan_application', 'approval'
     * @param string $title
     * @param string $message
     * @param Model|null $notifiable Related model (e.g. MemberAdmission)
     * @param string|null $actionUrl Route or relative URL to navigate
     * @param array|null $details Key-value pairs for additional context (e.g. ['আবেদন নং' => '...'])
     */
    public function send(
        User|Collection|array $users,
        string $type,
        string $title,
        string $message,
        ?Model $notifiable = null,
        ?string $actionUrl = null,
        ?array $details = null
    ): void {
        if ($users instanceof User) {
            $users = collect([$users]);
        } elseif (is_array($users)) {
            $users = collect($users);
        }

        // Deduplicate users by ID and filter active users
        $users = $users->filter(fn ($u) => $u instanceof User && $u->is_active)->unique('id');

        foreach ($users as $user) {
            try {
                // 1. Create In-App Notification record
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

                // 2. Send Mail if user has valid email address
                if (!empty($user->email) && filter_var($user->email, FILTER_VALIDATE_EMAIL)) {
                    $this->sendEmail($user, $notification, $title, $message, $actionUrl, $details);
                }
            } catch (\Throwable $e) {
                Log::error("Failed to process notification for user ID {$user->id}: " . $e->getMessage(), [
                    'exception' => $e,
                    'user_id' => $user->id,
                    'type' => $type,
                ]);
            }
        }
    }

    /**
     * Send email wrapped in defer() to ensure form submission returns instantly without waiting for mail server.
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
                Log::warning("Email dispatch failed for notification ID {$notification->id} to {$user->email}: " . $e->getMessage());
            }
        });
    }
}
