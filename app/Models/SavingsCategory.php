<?php

namespace App\Models;

use Database\Factories\SavingsCategoryFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SavingsCategory extends Model
{
    /** @use HasFactory<SavingsCategoryFactory> */
    use HasFactory;

    protected $fillable = [
        'category_name',
        'category_name_bn',
        'category_code',
        'description',
        'description_bn',
        'is_active',
        'display_order',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'display_order' => 'integer',
        ];
    }

    public function savingsProducts(): HasMany
    {
        return $this->hasMany(SavingsProduct::class);
    }

    public function activeProducts(): HasMany
    {
        return $this->hasMany(SavingsProduct::class)->where('is_active', true)->orderBy('display_order');
    }

    public function savingsApplications(): HasMany
    {
        return $this->hasMany(SavingsApplication::class);
    }
}
