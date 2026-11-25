<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class UserFine extends Model
{
    use HasFactory;

    public const TYPE_SELF_CORRECTION = 'self_correction';
    public const TYPE_HEAD_OFFICE_PENALTY = 'head_office_penalty';

    public const STATUS_PENDING_PAYMENT = 'pending_payment';
    public const STATUS_PENDING_REVIEW = 'pending_review';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_RESOLVED = 'resolved';
    public const STATUS_WAIVED = 'waived';

    protected $fillable = [
        'tracking_id',
        'user_id',
        'created_by_id',
        'type',
        'category',
        'mistake_details',
        'correction_details',
        'fine_amount',
        'payment_method',
        'payment_phone',
        'transaction_id',
        'screenshot_path',
        'status',
        'is_user_blocked',
        'admin_note',
        'resolved_by_id',
        'resolved_at',
        'waived_by_id',
        'waived_at',
        'waive_reason',
    ];

    protected $casts = [
        'fine_amount' => 'decimal:2',
        'is_user_blocked' => 'boolean',
        'resolved_at' => 'datetime',
        'waived_at' => 'datetime',
    ];

    protected $appends = [
        'screenshot_url',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by_id');
    }

    public function waiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'waived_by_id');
    }

    public function getScreenshotUrlAttribute(): ?string
    {
        if (! $this->screenshot_path) {
            return null;
        }

        return Storage::disk('public')->url($this->screenshot_path);
    }

    /**
     * Generate a unique tracking id.
     */
    public static function generateTrackingId(): string
    {
        $prefix = 'FINE-' . date('Ym') . '-';
        $random = strtoupper(bin2hex(random_bytes(3))); // 6 hex chars
        return $prefix . $random;
    }
}
