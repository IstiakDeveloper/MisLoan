<?php

use App\Models\TeamBasedApprovalItem;
use App\Models\TeamBasedApprovalReview;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Convert old "per sheet" reviews (no item id) into "per item" reviews.
        try {
            TeamBasedApprovalReview::with('approval.items')
                ->whereNull('team_based_approval_item_id')
                ->chunkById(100, function ($reviews) {
                    /** @var \App\Models\TeamBasedApprovalReview $review */
                    foreach ($reviews as $review) {
                        $approval = $review->approval;
                        if (! $approval) {
                            continue;
                        }

                        foreach ($approval->items as $item) {
                            /** @var TeamBasedApprovalItem $item */
                            TeamBasedApprovalReview::updateOrCreate(
                                [
                                    'team_based_approval_id' => $approval->id,
                                    'team_based_approval_item_id' => $item->id,
                                    'user_id' => $review->user_id,
                                ],
                                [
                                    'level' => $review->level,
                                    'status' => $review->status,
                                    'comments' => $review->comments,
                                    'approver_signature' => $review->approver_signature,
                                    'decided_at' => $review->decided_at,
                                ]
                            );
                        }

                        // Old sheet-level review no longer needed
                        $review->delete();
                    }
                });
        } catch (\Throwable $e) {
            // Fail silently in migration to avoid breaking deploy; old reviews will just stay sheet-level.
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No safe automatic rollback for data-splitting, so we do nothing here.
    }
};

