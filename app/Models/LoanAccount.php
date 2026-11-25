<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LoanAccount extends Model
{
    public const STATUS_ACTIVE = 'active';

    public const STATUS_REPAID = 'repaid';

    public const STATUS_WRITTEN_OFF = 'written_off';

    protected $fillable = [
        'account_no',
        'loan_application_id',
        'member_admission_id',
        'branch_id',
        'samity_id',
        'loan_product_id',
        'pricing_method',
        'installment_frequency',
        'annual_rate',
        'installment_count',
        'principal_paisa',
        'service_charge_paisa',
        'principal_paid_paisa',
        'service_charge_paid_paisa',
        'disbursed_date',
        'first_due_date',
        'status',
        'created_by',
    ];

    protected $casts = [
        'disbursed_date' => 'date:Y-m-d',
        'first_due_date' => 'date:Y-m-d',
        'principal_paisa' => 'integer',
        'service_charge_paisa' => 'integer',
        'principal_paid_paisa' => 'integer',
        'service_charge_paid_paisa' => 'integer',
        'installment_count' => 'integer',
    ];

    public function memberAdmission(): BelongsTo
    {
        return $this->belongsTo(MemberAdmission::class);
    }

    public function loanApplication(): BelongsTo
    {
        return $this->belongsTo(LoanApplication::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function samity(): BelongsTo
    {
        return $this->belongsTo(Samity::class);
    }

    public function loanProduct(): BelongsTo
    {
        return $this->belongsTo(LoanProduct::class);
    }

    public function installments(): HasMany
    {
        return $this->hasMany(LoanInstallment::class)->orderBy('installment_no');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(LoanTransaction::class)->orderByDesc('id');
    }

    public function remainingPrincipalPaisa(): int
    {
        return max(0, $this->principal_paisa - $this->principal_paid_paisa);
    }

    public function remainingServiceChargePaisa(): int
    {
        return max(0, $this->service_charge_paisa - $this->service_charge_paid_paisa);
    }
}
