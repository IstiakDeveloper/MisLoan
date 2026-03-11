<?php

namespace App\Mail;

use App\Models\Branch;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;

class BranchUsersSummaryMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Branch $branch,
        public Collection $users,
    ) {
    }

    public function build()
    {
        return $this
            ->subject("{$this->branch->name} শাখার ইউজার তালিকা")
            ->view('emails.branch-users-summary')
            ->with([
                'branch' => $this->branch,
                'users' => $this->users,
                'loginUrl' => url('/login'),
            ]);
    }
}

