<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class DigestNotificationMail extends Mailable
{
    /**
     * @param  array<int, array{
     *     label: string,
     *     groups: array<int, array{
     *         title: string,
     *         count: int,
     *         samples: array<int, string>,
     *         remaining: int
     *     }>
     * }>  $sections
     */
    public function __construct(
        public string $userName,
        public array $sections,
        public string $actionUrl,
        public int $total,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "দৈনিক নোটিফিকেশন সারাংশ ({$this->total}) - MIS Loan System",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.notification-digest',
            with: [
                'userName' => $this->userName,
                'sections' => $this->sections,
                'actionUrl' => $this->actionUrl,
                'total' => $this->total,
            ],
        );
    }
}
