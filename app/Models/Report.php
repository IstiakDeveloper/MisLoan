<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Report extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'report_type',
        'title',
        'generated_by',
        'branch_id',
        'area_id',
        'zone_id',
        'date_from',
        'date_to',
        'filters',
        'report_data',
        'pdf_file_path',
        'excel_file_path',
        'total_applications',
        'approved_count',
        'rejected_count',
        'pending_count',
    ];

    protected $casts = [
        'date_from' => 'date',
        'date_to' => 'date',
        'filters' => 'array',
        'report_data' => 'array',
    ];

    public function generatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('report_type', $type);
    }

    public function scopeRecent($query, int $limit = 10)
    {
        return $query->orderBy('created_at', 'desc')->limit($limit);
    }

    public function hasPdf(): bool
    {
        return !empty($this->pdf_file_path);
    }

    public function hasExcel(): bool
    {
        return !empty($this->excel_file_path);
    }
}
