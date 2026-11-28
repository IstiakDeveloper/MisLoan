<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BranchTarget extends Model
{
    public const KEYS = [
        'loan_disbursement' => ['label' => 'Loan Disbursement (৳)', 'unit' => 'paisa'],
        'loan_collection' => ['label' => 'Loan Collection (৳)', 'unit' => 'paisa'],
        'savings_collection' => ['label' => 'Savings Collection (৳)', 'unit' => 'paisa'],
        'member_admission' => ['label' => 'Member Admission (জন)', 'unit' => 'count'],
    ];

    protected $fillable = [
        'branch_id',
        'period_month',
        'target_key',
        'target_value',
        'note',
        'created_by',
    ];

    protected $casts = [
        'target_value' => 'integer',
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
