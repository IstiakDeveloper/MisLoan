<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeamBasedApprovalItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'team_based_approval_id',
        'serial_no',
        'member_name',
        'member_code',
        'samity_number',
        'savings_general',
        'savings_other',
        'savings_total',
        'repaid_loan_amount',
        'repaid_installment_no',
        'other_institution_loan_amount',
        'proposed_loan_amount',
        'approved_amount',
        'loan_term_years',
        'loan_type',
        'project_name',
    ];

    protected $casts = [
        'savings_general' => 'decimal:2',
        'savings_other' => 'decimal:2',
        'savings_total' => 'decimal:2',
        // repaid_loan_amount, repaid_installment_no, other_institution_loan_amount, proposed_loan_amount: stored as string (text+number)
        'approved_amount' => 'decimal:2',
        'loan_term_years' => 'float',
    ];

    public function approval(): BelongsTo
    {
        return $this->belongsTo(TeamBasedApproval::class, 'team_based_approval_id');
    }
}

