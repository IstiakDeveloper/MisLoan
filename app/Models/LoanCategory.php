<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LoanCategory extends Model
{
    protected $fillable = [
        'category_name',
        'category_name_bn',
        'category_code',
        'description',
        'description_bn',
        'target_group',
        'is_active',
        'display_order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'display_order' => 'integer',
    ];

    // Relationships
    public function loanProducts(): HasMany
    {
        return $this->hasMany(LoanProduct::class);
    }

    public function activeProducts(): HasMany
    {
        return $this->hasMany(LoanProduct::class)->where('is_active', true)->orderBy('display_order');
    }
}
