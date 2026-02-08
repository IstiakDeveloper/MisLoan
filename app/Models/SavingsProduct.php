<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SavingsProduct extends Model
{
    protected $fillable = [
        'product_name',
        'product_name_bn',
        'product_code',
        'description',
        'description_bn',
        'deposit_type',
        'duration_months',
        'min_amount',
        'max_amount',
        'monthly_installment',
        'interest_rate',
        'profit_distribution_type',
        'premature_withdrawal_allowed',
        'premature_withdrawal_penalty',
        'maturity_conditions',
        'min_age',
        'max_age',
        'requires_nominee',
        'is_active',
        'display_order',
    ];

    protected $casts = [
        'duration_months' => 'integer',
        'min_amount' => 'decimal:2',
        'max_amount' => 'decimal:2',
        'monthly_installment' => 'decimal:2',
        'interest_rate' => 'decimal:2',
        'premature_withdrawal_allowed' => 'boolean',
        'premature_withdrawal_penalty' => 'decimal:2',
        'maturity_conditions' => 'array',
        'min_age' => 'integer',
        'max_age' => 'integer',
        'requires_nominee' => 'boolean',
        'is_active' => 'boolean',
        'display_order' => 'integer',
    ];

    // Relationships
    public function savingsApplications(): HasMany
    {
        return $this->hasMany(SavingsApplication::class);
    }

    // Helper Methods
    public function calculateMaturityAmount($depositAmount, $monthlyInstallment = null): float
    {
        if ($this->deposit_type === 'lump_sum') {
            $interest = ($depositAmount * $this->interest_rate * $this->duration_months) / (12 * 100);
            return $depositAmount + $interest;
        }

        if ($this->deposit_type === 'monthly' && $monthlyInstallment) {
            // Simple calculation - can be made more sophisticated
            $totalDeposit = $monthlyInstallment * $this->duration_months;
            $interest = ($totalDeposit * $this->interest_rate * $this->duration_months) / (24 * 100); // Average
            return $totalDeposit + $interest;
        }

        return 0;
    }
}
