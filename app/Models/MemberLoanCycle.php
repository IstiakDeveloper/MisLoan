<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MemberLoanCycle extends Model
{
    protected $guarded = ['id'];

    protected $attributes = ['revision' => 1, 'state' => 'draft'];

    protected $casts = [
        'source_snapshot' => 'array',
        'admission_snapshot' => 'array',
        'document_manifest' => 'array',
        'working_snapshot' => 'array',
        'submitted_snapshot' => 'array',
        'submitted_at' => 'datetime',
        'revision' => 'integer',
        'number' => 'integer',
    ];

    public function admission(): BelongsTo
    {
        return $this->belongsTo(MemberAdmission::class, 'admission_id');
    }

    public function loan(): BelongsTo
    {
        return $this->belongsTo(LoanApplication::class, 'loan_id');
    }

    public function sourceLoan(): BelongsTo
    {
        return $this->belongsTo(LoanApplication::class, 'source_loan_id');
    }
}
