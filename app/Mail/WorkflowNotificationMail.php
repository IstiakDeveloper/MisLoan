<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class WorkflowNotificationMail extends Mailable
{
    public function __construct(
        public string $title,
        public string $messageContent,
        public ?string $actionUrl = null,
        public ?array $details = null,
        public ?string $userName = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "🔔 " . $this->title . " - MIS Loan System",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.workflow-notification',
            with: [
                'title' => $this->title,
                'messageContent' => $this->messageContent,
                'actionUrl' => $this->actionUrl,
                'details' => $this->details ?? [],
                'userName' => $this->userName ?? 'ব্যবহারকারী',
            ],
        );
    }
}
