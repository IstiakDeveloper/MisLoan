<?php

namespace App\Services;

use App\Models\LoanApplicationIssue;
use App\Models\MemberAdmissionIssue;
use App\Models\User;

class VerificationIssueService
{
    public const BRANCH_REPLY_SEPARATOR = '--- Branch Reply';

    /**
     * Record a branch/ZM reply without ever touching the Head Office objection.
     * Additional replies are appended; ZM-approved issues are locked.
     */
    public function recordAdmissionReply(MemberAdmissionIssue $issue, User $user, string $reply, bool $zmAutoApprove = false): ?string
    {
        $reply = trim($reply);
        if ($reply === '') {
            return 'জবাব খালি রাখা যাবে না।';
        }

        if (filled($issue->zm_approved_at) && ! $zmAutoApprove) {
            return 'জোনাল অনুমোদনের পর এই আপত্তিতে আর জবাব দেওয়া যাবে না। প্রয়োজনে হেড অফিস নতুন আপত্তি লিখবে।';
        }

        $update = [];
        $existing = trim((string) $issue->resolution_note);

        if ($existing === '') {
            $update['resolution_note'] = $reply;
            $update['resolved_by'] = $user->id;
            $update['resolved_at'] = now();
        } elseif ($this->isSameMessage($existing, $reply) || str_contains($existing, $reply)) {
            // Already stored — do not duplicate or overwrite.
        } else {
            $stamp = now()->format('Y-m-d H:i');
            $update['resolution_note'] = $existing."\n\n".self::BRANCH_REPLY_SEPARATOR." ({$stamp} by {$user->name}) ---\n".$reply;
        }

        if ($zmAutoApprove && empty($issue->zm_approved_at)) {
            $update['zm_approved_at'] = now();
            $update['zm_approved_by'] = $user->id;
        }

        if ($update !== []) {
            $issue->update($update);
        }

        return null;
    }

    /**
     * Record a branch/ZM reply on a loan issue without touching the HO objection.
     */
    public function recordLoanReply(LoanApplicationIssue $issue, User $user, string $reply, bool $zmAutoApprove = false): ?string
    {
        $reply = trim($reply);
        if ($reply === '') {
            return 'জবাব খালি রাখা যাবে না।';
        }

        if (filled($issue->zm_approved_at) && ! $zmAutoApprove) {
            return 'জোনাল অনুমোদনের পর এই আপত্তিতে আর জবাব দেওয়া যাবে না। প্রয়োজনে হেড অফিস নতুন আপত্তি লিখবে।';
        }

        $update = [];
        $existing = trim((string) $issue->response_message);

        if ($existing === '') {
            $update['response_message'] = $reply;
            $update['responded_by'] = $user->id;
            $update['responded_at'] = now();
        } elseif ($this->isSameMessage($existing, $reply) || str_contains($existing, $reply)) {
            // Already stored — do not duplicate or overwrite.
        } else {
            $stamp = now()->format('Y-m-d H:i');
            $update['response_message'] = $existing."\n\n".self::BRANCH_REPLY_SEPARATOR." ({$stamp} by {$user->name}) ---\n".$reply;
        }

        if ($zmAutoApprove && empty($issue->zm_approved_at)) {
            $update['zm_approved_at'] = now();
            $update['zm_approved_by'] = $user->id;
        }

        if ($update !== []) {
            $issue->update($update);
        }

        return null;
    }

    /**
     * Keep prior HO notes when a new return comment is added.
     */
    public function appendUniqueComment(?string $existing, string $addition): string
    {
        $existing = trim((string) $existing);
        $addition = trim($addition);

        if ($addition === '') {
            return $existing;
        }

        if ($existing === '') {
            return $addition;
        }

        if (str_contains($existing, $addition)) {
            return $existing;
        }

        return $existing."\n\n".$addition;
    }

    /**
     * Pending HO issues may be edited/deleted only before any branch or ZM response.
     */
    public function mutationError(MemberAdmissionIssue|LoanApplicationIssue $issue): ?string
    {
        if ($issue->status !== 'pending') {
            return 'শুধুমাত্র অপেক্ষমাণ সমস্যা সম্পাদনা বা মুছে ফেলা যাবে।';
        }

        $hasReply = $issue instanceof MemberAdmissionIssue
            ? filled($issue->resolution_note)
            : filled($issue->response_message);

        if ($hasReply || filled($issue->zm_approved_at)) {
            return 'শাখা বা জোন থেকে জবাব আসার পর হেড অফিসের আপত্তি আর সম্পাদনা বা মুছে ফেলা যাবে না। প্রয়োজনে নতুন আপত্তি লিখুন।';
        }

        return null;
    }

    public function isSameMessage(?string $a, ?string $b): bool
    {
        $normalize = static fn (?string $s) => preg_replace('/\s+/u', ' ', trim((string) $s));

        $a = $normalize($a);
        $b = $normalize($b);

        return $a !== '' && $b !== '' && $a === $b;
    }
}
