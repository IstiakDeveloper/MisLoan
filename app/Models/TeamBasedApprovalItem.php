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
        'name_bn',
        'father_name',
        'mother_name',
        'spouse_name',
        'dob',
        'nid_number',
        'address',
        'member_code',
        'member_phone',
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
        'savings_general' => 'integer',
        'savings_other' => 'integer',
        'savings_total' => 'integer',
        // repaid_loan_amount, repaid_installment_no, other_institution_loan_amount, proposed_loan_amount: stored as string (text+number)
        'approved_amount' => 'integer',
        'loan_term_years' => 'float',
        'dob' => 'date',
    ];

    public function approval(): BelongsTo
    {
        return $this->belongsTo(TeamBasedApproval::class, 'team_based_approval_id');
    }
}

