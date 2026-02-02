<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MemberOtherAsset extends Model
{
    protected $fillable = [
        'member_admission_id',
        'sl_no',
        'asset_description',
        'quantity_amount',
        'estimated_value',
    ];

    protected $casts = [
        'estimated_value' => 'decimal:2',
    ];

    public function memberAdmission(): BelongsTo
    {
        return $this->belongsTo(MemberAdmission::class);
    }
}
