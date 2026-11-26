<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HelpGuide extends Model
{
    protected $fillable = [
        'slug',
        'part_number',
        'title_bn',
        'summary_bn',
        'roles',
        'steps_bn',
        'tips_bn',
        'video_url',
        'video_duration',
        'is_published',
    ];

    protected $casts = [
        'part_number' => 'integer',
        'roles' => 'array',
        'steps_bn' => 'array',
        'tips_bn' => 'array',
        'is_published' => 'boolean',
    ];
}
