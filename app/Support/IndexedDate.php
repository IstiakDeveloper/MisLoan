<?php

namespace App\Support;

use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class IndexedDate
{
    /**
     * Match a calendar day without wrapping the column in DATE(), so a plain
     * or composite index on the column can be used.
     *
     * @param  Builder<Model>  $query
     * @return Builder<Model>
     */
    public static function onDay(Builder $query, string $column, CarbonInterface|string $day): Builder
    {
        $start = Carbon::parse($day)->startOfDay();

        return $query
            ->where($column, '>=', $start)
            ->where($column, '<', $start->copy()->addDay());
    }
}
