<?php

namespace App\Services;

use App\Models\LoanApplication;
use App\Models\MemberAdmission;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class OriginalHoSendDateRestorer
{
    public const ADMISSION_SEND_TITLE = 'সদস্য আবেদন হেড অফিসে পাঠানো হয়েছে';

    public const LOAN_SEND_TITLE = 'ঋণ আবেদন হেড অফিসে পাঠানো হয়েছে';

    /**
     * Put submitted_at back to the first Head Office send time.
     * Verification replies must not keep these records on today's list.
     *
     * @return array{admissions: int, loans: int}
     */
    public function restore(): array
    {
        return [
            'admissions' => $this->restoreTable(
                MemberAdmission::class,
                'member_admissions',
                self::ADMISSION_SEND_TITLE
            ),
            'loans' => $this->restoreTable(
                LoanApplication::class,
                'loan_applications',
                self::LOAN_SEND_TITLE
            ),
        ];
    }

    private function restoreTable(string $notifiableType, string $table, string $title): int
    {
        $firstSends = DB::table('notifications')
            ->select('notifiable_id', DB::raw('MIN(created_at) as sent_at'))
            ->where('notifiable_type', $notifiableType)
            ->where('title', $title)
            ->whereNotNull('notifiable_id')
            ->groupBy('notifiable_id')
            ->get();

        $updated = 0;

        foreach ($firstSends as $row) {
            $sentAt = Carbon::parse($row->sent_at);
            $affected = DB::table($table)
                ->where('id', $row->notifiable_id)
                ->where(function ($q) use ($sentAt) {
                    $q->whereNull('submitted_at')
                        ->orWhere('submitted_at', '>', $sentAt);
                })
                ->update(['submitted_at' => $sentAt]);

            $updated += $affected;
        }

        return $updated;
    }
}
