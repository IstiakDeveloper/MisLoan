<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MemberFamilyMember extends Model
{
    protected $fillable = [
        'member_admission_id',
        'sl_no',
        'member_name',
        'relation_with_head',
        'gender',
        'age_years',
        'age_months',
        'marital_status',
        'education_level',
        'occupation',
        'monthly_income',
    ];

    protected $casts = [
        'age_years' => 'integer',
        'age_months' => 'integer',
        'monthly_income' => 'decimal:2',
    ];

    public function memberAdmission(): BelongsTo
    {
        return $this->belongsTo(MemberAdmission::class);
    }
}
