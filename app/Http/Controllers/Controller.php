<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;

abstract class Controller
{
    /**
     * Stay on the list page with its current query filters.
     * Never redirect to a clean index URL — that would wipe branch/date filters.
     */
    protected function redirectToListPreservingFilters(string $routeName, string $message, string $bag = 'success'): RedirectResponse
    {
        $previous = url()->previous();
        $indexPath = rtrim((string) parse_url(route($routeName), PHP_URL_PATH), '/');
        $previousPath = rtrim((string) parse_url($previous, PHP_URL_PATH), '/');

        if ($previousPath === $indexPath || str_ends_with($previousPath, $indexPath)) {
            return redirect()->to($previous)->with($bag, $message);
        }

        return back()->with($bag, $message);
    }
}
