<?php

use App\Models\LoanApplication;
use App\Services\OriginalHoSendDateRestorer;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loan_applications', function (Blueprint $table) {
            if (! Schema::hasColumn('loan_applications', 'head_office_sent_at')) {
                $table->timestamp('head_office_sent_at')->nullable()->after('submitted_at');
                $table->index('head_office_sent_at');
            }
        });

        if (Schema::hasTable('notifications')) {
            $sends = DB::table('notifications')
                ->select('notifiable_id', DB::raw('MIN(created_at) as sent_at'))
                ->where('notifiable_type', LoanApplication::class)
                ->where('title', OriginalHoSendDateRestorer::LOAN_SEND_TITLE)
                ->whereNotNull('notifiable_id')
                ->groupBy('notifiable_id')
                ->get();

            foreach ($sends as $row) {
                DB::table('loan_applications')
                    ->where('id', $row->notifiable_id)
                    ->whereNull('head_office_sent_at')
                    ->update(['head_office_sent_at' => $row->sent_at]);
            }
        }

        DB::table('loan_applications')
            ->whereNull('head_office_sent_at')
            ->whereNotNull('submitted_at')
            ->where(function ($query) {
                $query->whereIn('status', LoanApplication::headOfficeSentStatuses())
                    ->orWhereIn('cancellation_from_status', LoanApplication::headOfficeSentStatuses());
            })
            ->update(['head_office_sent_at' => DB::raw('submitted_at')]);
    }

    public function down(): void
    {
        Schema::table('loan_applications', function (Blueprint $table) {
            if (Schema::hasColumn('loan_applications', 'head_office_sent_at')) {
                $table->dropIndex(['head_office_sent_at']);
                $table->dropColumn('head_office_sent_at');
            }
        });
    }
};
