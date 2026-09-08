<?php

use App\Services\OriginalHoSendDateRestorer;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Verification replies had overwritten submitted_at. Put it back to the
     * first Head Office send so admission/loan lists show the original date.
     */
    public function up(): void
    {
        app(OriginalHoSendDateRestorer::class)->restore();
    }

    public function down(): void
    {
        // Irreversible data repair.
    }
};
