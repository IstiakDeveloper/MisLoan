<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoanInstallment extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_PARTIAL = 'partial';

    public const STATUS_PAID = 'paid';

    protected $fillable = [
        'loan_account_id',
        'installment_no',
        'due_date',
        'principal_due_paisa',
        'service_charge_due_paisa',
        'principal_paid_paisa',
        'service_charge_paid_paisa',
        'status',
    ];

    protected $casts = [
        'due_date' => 'date:Y-m-d',
        'installment_no' => 'integer',
        'principal_due_paisa' => 'integer',
        'service_charge_due_paisa' => 'integer',
        'principal_paid_paisa' => 'integer',
        'service_charge_paid_paisa' => 'integer',
    ];

    public function loanAccount(): BelongsTo
    {
        return $this->belongsTo(LoanAccount::class);
    }
}
