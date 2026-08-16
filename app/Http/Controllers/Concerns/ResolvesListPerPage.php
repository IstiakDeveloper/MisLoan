<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\Request;

trait ResolvesListPerPage
{
    /**
     * @var list<int>
     */
    protected array $allowedPerPage = [10, 20, 25, 50, 100];

    protected function resolvePerPage(Request $request, int $default = 20): int
    {
        $perPage = (int) $request->input('per_page', $default);

        return in_array($perPage, $this->allowedPerPage, true) ? $perPage : $default;
    }
}
