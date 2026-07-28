<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\TeamBasedApprovalItem;
use App\Models\TeamBasedApprovalReview;

class TeamBasedApproval extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'loan_application_id',
        'created_by',
        'sheet_date',
        'area_manager_id',
        'zone_manager_id',
        'admf_id',
        'dmf_id',
        'ed_id',
        'status',
        'approved_total_amount',
        'last_items_snapshot',
    ];

    protected $casts = [
        'sheet_date' => 'date',
        'last_items_snapshot' => 'array',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function loanApplication(): BelongsTo
    {
        return $this->belongsTo(LoanApplication::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function areaManager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'area_manager_id');
    }

    public function zoneManager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'zone_manager_id');
    }

    public function admf(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admf_id');
    }

    public function dmf(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dmf_id');
    }

    public function ed(): BelongsTo
    {
        return $this->belongsTo(User::class, 'ed_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(TeamBasedApprovalItem::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(TeamBasedApprovalReview::class);
    }
}

