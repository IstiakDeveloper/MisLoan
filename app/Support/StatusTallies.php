<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/** One grouped read instead of a count query per status. */
final class StatusTallies
{
    /**
     * @param  Builder<Model>  $query
     * @param  array<string, string>  $expressions
     * @return array<string, mixed>
     */
    public static function read(Builder $query, array $expressions): array
    {
        $sql = collect($expressions)
            ->map(function (string $expression, string $alias): string {
                if (! preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $alias)) {
                    throw new InvalidArgumentException('Invalid tally name.');
                }

                return '('.$expression.') as '.$alias;
            })
            ->implode(', ');

        $row = (clone $query)->reorder()->select(DB::raw($sql))->first();
        $values = [];
        foreach (array_keys($expressions) as $alias) {
            $values[$alias] = $row->{$alias} ?? 0;
        }

        return $values;
    }
}
