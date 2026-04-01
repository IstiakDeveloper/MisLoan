<?php

namespace App\Http\Controllers\PublicApi;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use Illuminate\Http\Request;

class BranchPublicController extends Controller
{
    /**
     * Public branch list for integrations.
     * Returns only branch name + code.
     */
    public function index(Request $request)
    {
        $query = Branch::query()
            ->orderBy('code')
            ->orderBy('name');

        // Default: only active branches. Add ?include_inactive=1 to include all.
        if (!$request->boolean('include_inactive')) {
            $query->where('is_active', true);
        }

        $branches = $query->get(['id', 'name', 'code']);

        return response()->json([
            'data' => $branches->map(fn (Branch $b) => [
                'name' => $b->name,
                'code' => $b->code,
            ])->values(),
        ]);
    }
}

