<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LoanMember extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'loan_application_id',
        'serial_no', // ক্রমিক নং
        'loan_type', // ঋণের ধরন (Zone/Area/Branch comes from loan_application->branch relationship)

        // সমিতি তথ্য
        'somiti_name', // সমিতির নাম
        'somiti_code', // সমিতি কোড

        // সদস্য তথ্য
        'member_name', // সদস্যের নাম
        'member_code', // সদস্য কোড
        'member_mobile', // সদস্য মোবাইল নম্বর

        // সঞ্চয় তথ্য
        'general_savings', // সাধারণ সঞ্চয়
        'total_savings', // মোট সঞ্চয়

        // সর্বশেষ পরিশোধিত ঋণের তথ্য
        'principal_amount', // মূল ঋণ
        'paid_installment_count', // কত কিস্তিতে পরিশোধ করা হয়েছে

        // বর্তমান বিতরণ সংক্রান্ত তথ্য
        'approved_loan_amount', // অনুমোদিত ঋণের পরিমাণ
        'installment_increment_rate', // ঋণের কিস্তির বৃদ্ধির হার
        'loan_duration', // ঋণের মেয়াদ
        'phase_no', // দফা নং
        'project_name', // প্রকল্পের নাম

        // টিম ভিত্তিক অনুযায়ী
        'loan_release_or_approval_date', // ঋণ ছাড়ের/অনুমোদনের তারিখ
        'loan_distribution_date', // ঋণ বিতরণের নতুন তারিখ
        'approved_by', // ছাড়কারী/অনুমোদনকারী কর্মকর্তার নাম

        // মন্তব্য
        'remarks', // মন্তব্য

        // স্ট্যাটাস
        'status', // অবস্থা
    ];

    protected $casts = [
        'approved_loan_amount' => 'decimal:2',
        'principal_amount' => 'decimal:2',
        'installment_increment_rate' => 'decimal:2',
        'general_savings' => 'decimal:2',
        'total_savings' => 'decimal:2',
        'loan_release_or_approval_date' => 'date',
        'loan_distribution_date' => 'date',
    ];

    public function loanApplication(): BelongsTo
    {
        return $this->belongsTo(LoanApplication::class);
    }

    public function issues(): HasMany
    {
        return $this->hasMany(ApplicationIssue::class, 'member_id', 'id')
            ->where('application_type', 'loan');
    }

    public function scopeStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }
}
