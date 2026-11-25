<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Holiday extends Model
{
    public const KIND_GOVT = 'govt';

    public const KIND_WEEKLY = 'weekly';

    public const KIND_SPECIAL = 'special';

    protected $fillable = [
        'holiday_date',
        'title',
        'kind',
        'branch_id',
        'created_by',
    ];

    protected $casts = [
        'holiday_date' => 'date:Y-m-d',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
