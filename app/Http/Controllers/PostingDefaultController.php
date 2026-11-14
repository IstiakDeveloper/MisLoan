<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePostingDefaultRequest;
use App\Services\Accounting\PostingDefaults;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

final class PostingDefaultController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()?->isFinancialAdministrator(), 403);

        return Inertia::render('Accounting/PostingDefaults', [
            'defaults' => DB::table('gl_posting_defaults as row')
                ->leftJoin('branches', 'branches.id', '=', 'row.branch_id')
                ->leftJoin('loan_products', 'loan_products.id', '=', 'row.loan_product_id')
                ->leftJoin('savings_products', 'savings_products.id', '=', 'row.savings_product_id')
                ->orderBy('row.id')
                ->get(['row.*', 'branches.name as branch_name', 'loan_products.product_name as loan_product_name', 'savings_products.product_name as savings_product_name']),
            'branches' => DB::table('branches')->orderBy('code')->get(['id', 'code', 'name']),
            'loanProducts' => DB::table('loan_products')->orderBy('product_code')->get(['id', 'product_code', 'product_name']),
            'savingsProducts' => DB::table('savings_products')->orderBy('product_code')->get(['id', 'product_code', 'product_name']),
            'accounts' => DB::table('ledger_accounts')->where('is_active', true)->orderBy('code')->get(['id', 'code', 'name', 'type']),
        ]);
    }

    public function store(StorePostingDefaultRequest $request, PostingDefaults $defaults)
    {
        $defaults->save($request->user(), $request->validated());

        return back()->with('success', 'Posting default saved. Existing contracts stay unchanged.');
    }
}
