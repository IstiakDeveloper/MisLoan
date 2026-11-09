<?php

namespace App\Http\Controllers;

use App\Models\LoanProduct;
use App\Services\Accounting\Money;
use App\Services\Loans\ProductLoanPricing;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class LoanQuoteController extends Controller
{
    public function __invoke(Request $request, LoanProduct $loanProduct, ProductLoanPricing $pricing)
    {
        abort_unless($request->user()?->is_active, 403);
        abort_unless($loanProduct->is_active, 422, 'This product is inactive.');
        $data = $request->validate(['amount' => ['required', 'string', 'regex:/^(0|[1-9][0-9]{0,12})(\.[0-9]{1,2})?$/']]);
        try {
            $amount = Money::toPaisa($data['amount']);
        } catch (\InvalidArgumentException $exception) {
            throw ValidationException::withMessages(['amount' => $exception->getMessage()]);
        }
        if (($loanProduct->min_amount !== null && $amount < Money::toPaisa($loanProduct->min_amount))
            || ($loanProduct->max_amount !== null && $amount > Money::toPaisa($loanProduct->max_amount))) {
            throw ValidationException::withMessages(['amount' => 'Amount is outside the product limits.']);
        }

        try {
            return response()->json($pricing->quote($loanProduct, $data['amount']));
        } catch (\InvalidArgumentException $exception) {
            throw ValidationException::withMessages(['amount' => $exception->getMessage()]);
        }
    }
}
