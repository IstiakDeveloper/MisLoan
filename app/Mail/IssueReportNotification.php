<?php

namespace App\Mail;

use App\Models\MemberAdmission;
use App\Models\LoanApplication;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class IssueReportNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $applicationType,
        public int $applicationId,
        public array $issues,
        public string $branchEmail,
        public string $branchName,
        public int $totalIssues,
        public int $criticalCount,
        public int $warningCount,
        public int $infoCount,
    ) {}

    public function envelope(): Envelope
    {
        $type = $this->applicationType === 'admission' ? 'ভর্তি' : 'ঋণ';

        return new Envelope(
            subject: "⚠️ নতুন সমস্যা রিপোর্ট - {$type} আবেদন #{$this->applicationId}",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.issue-report-notification',
            with: [
                'applicationType' => $this->applicationType,
                'applicationNo' => $this->getApplicationNo(),
                'branchName' => $this->branchName,
                'totalIssues' => $this->totalIssues,
                'criticalCount' => $this->criticalCount,
                'warningCount' => $this->warningCount,
                'infoCount' => $this->infoCount,
                'issues' => $this->issues,
                'dashboardLink' => route('issue-processing.index'),
            ],
        );
    }

    private function getApplicationNo(): string
    {
        if ($this->applicationType === 'admission') {
            $app = MemberAdmission::find($this->applicationId);
            return $app?->application_no ?? 'N/A';
        } else {
            $app = LoanApplication::find($this->applicationId);
            return $app?->application_no ?? 'N/A';
        }
    }
}
