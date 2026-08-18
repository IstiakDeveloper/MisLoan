<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LoanProduct extends Model
{
    protected $fillable = [
        'loan_category_id',
        'product_name',
        'product_name_bn',
        'product_code',
        'main_product_code',
        'description',
        'description_bn',
        'installment_type',
        'duration_months',
        'number_of_installments',
        'installment_amount_per_thousand',
        'last_installment_per_thousand',
        'loan_installment_factor',
        'interest_installment_factor',
        'savings_installment',
        'min_amount',
        'max_amount',
        'interest_rate',
        'service_charge',
        'service_charge_per_thousand',
        'interest_calculation_type',
        'gender_restriction',
        'min_age',
        'max_age',
        'requires_guarantor',
        'number_of_guarantors',
        'eligibility_conditions',
        'required_documents',
        'is_active',
        'display_order',
    ];

    protected $casts = [
        'duration_months' => 'integer',
        'number_of_installments' => 'integer',
        'installment_amount_per_thousand' => 'decimal:2',
        'last_installment_per_thousand' => 'decimal:2',
        'loan_installment_factor' => 'decimal:8',
        'interest_installment_factor' => 'decimal:8',
        'savings_installment' => 'decimal:2',
        'min_amount' => 'decimal:2',
        'max_amount' => 'decimal:2',
        'interest_rate' => 'decimal:2',
        'service_charge' => 'decimal:2',
        'service_charge_per_thousand' => 'decimal:2',
        'min_age' => 'integer',
        'max_age' => 'integer',
        'requires_guarantor' => 'boolean',
        'number_of_guarantors' => 'integer',
        'eligibility_conditions' => 'array',
        'required_documents' => 'array',
        'is_active' => 'boolean',
        'display_order' => 'integer',
    ];

    // Relationships
    public function loanCategory(): BelongsTo
    {
        return $this->belongsTo(LoanCategory::class);
    }

    public function loanApplications(): HasMany
    {
        return $this->hasMany(LoanApplication::class);
    }

    // Helper Methods
    public function checkEligibility($memberAdmission): array
    {
        $errors = [];

        // Check gender
        if ($this->gender_restriction !== 'all' && $memberAdmission->gender !== $this->gender_restriction) {
            $errors[] = 'Gender restriction not met';
        }

        // Check age
        $age = \Carbon\Carbon::parse($memberAdmission->date_of_birth)->age;
        if ($age < $this->min_age || $age > $this->max_age) {
            $errors[] = "Age must be between {$this->min_age} and {$this->max_age}";
        }

        return $errors;
    }

    public function calculateEMI($loanAmount): float
    {
        if ($this->interest_calculation_type === 'flat') {
            $interest = ($loanAmount * $this->interest_rate * $this->duration_months) / (12 * 100);
            return ($loanAmount + $interest) / $this->number_of_installments;
        }

        // Add other calculation types as needed
        return 0;
    }
}
