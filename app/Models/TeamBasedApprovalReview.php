<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeamBasedApprovalReview extends Model
{
    use HasFactory;

    protected $fillable = [
        'team_based_approval_id',
        'team_based_approval_item_id',
        'user_id',
        'level',
        'status',
        'comments',
        'approved_amount',
        'approver_signature',
        'decided_at',
    ];

    protected $casts = [
        'decided_at' => 'datetime',
        'approved_amount' => 'integer',
    ];

    public function approval(): BelongsTo
    {
        return $this->belongsTo(TeamBasedApproval::class, 'team_based_approval_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(TeamBasedApprovalItem::class, 'team_based_approval_item_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

