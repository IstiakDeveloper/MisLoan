<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreInstitutionPolicyRequest;
use App\Services\Loans\LoanLedger;
use App\Services\Policy\InstitutionPolicy;
use App\Services\Policy\ProductPolicyVersions;
use App\Services\Policy\RescheduleRequests;
use App\Services\Savings\SavingsLedger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

final class InstitutionPolicyController extends Controller
{
    public function index(Request $request, InstitutionPolicy $policy): Response
    {
        abort_unless($request->user()?->isFinancialAdministrator(), 403);

        return Inertia::render('Accounting/InstitutionPolicy', [
            'policy' => $policy->row(),
            'versions' => DB::table('product_policy_versions')->orderByDesc('effective_on')->limit(30)->get(),
            'reschedules' => DB::table('loan_reschedule_requests')->orderByDesc('id')->limit(20)->get(),
            'accounts' => DB::table('ledger_accounts')->where('is_active', true)->where('type', 'expense')->orderBy('code')->get(['id', 'code', 'name']),
            'loanProducts' => DB::table('loan_products')->orderBy('product_code')->get(['id', 'product_code', 'product_name']),
            'savingsProducts' => DB::table('savings_products')->orderBy('product_code')->get(['id', 'product_code', 'product_name']),
        ]);
    }

    public function store(StoreInstitutionPolicyRequest $request, InstitutionPolicy $policy)
    {
        $policy->save($request->user(), $request->validated());

        return back()->with('success', 'Institution policy saved. Empty rules still do not post.');
    }

    public function snapshot(Request $request, ProductPolicyVersions $versions)
    {
        abort_unless($request->user()?->isFinancialAdministrator(), 403);
        $data = $request->validate([
            'product_type' => ['required', Rule::in(['loan', 'savings'])],
            'product_id' => ['required', 'integer'],
            'effective_on' => ['required', 'date_format:Y-m-d'],
        ]);
        $versions->snapshot($request->user(), $data['product_type'], (int) $data['product_id'], $data['effective_on']);

        return back()->with('success', 'Product policy version saved. Signed contracts stay unchanged.');
    }

    public function writeOff(Request $request, int $account, LoanLedger $ledger)
    {
        abort_unless($request->user()?->isFinancialAdministrator(), 403);
        $data = $request->validate([
            'principal_amount' => ['required', 'string', 'max:30'],
            'business_date' => ['required', 'date_format:Y-m-d'],
            'idempotency_key' => ['required', 'string', 'max:100'],
            'description' => ['required', 'string', 'max:1000'],
        ]);
        $ledger->writeOff($request->user(), $account, $data['principal_amount'], $data['business_date'], $data['idempotency_key'], $data['description']);

        return back()->with('success', 'Write-off posted from the saved expense account.');
    }

    public function rebate(Request $request, int $account, LoanLedger $ledger)
    {
        abort_unless($request->user()?->isFinancialAdministrator(), 403);
        $data = $request->validate([
            'business_date' => ['required', 'date_format:Y-m-d'],
            'idempotency_key' => ['required', 'string', 'max:100'],
            'description' => ['required', 'string', 'max:1000'],
        ]);
        $ledger->rebate($request->user(), $account, $data['business_date'], $data['idempotency_key'], $data['description']);

        return back()->with('success', 'Rebate posted from the product service charge.');
    }

    public function reschedule(Request $request, int $account, RescheduleRequests $requests)
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
            'idempotency_key' => ['required', 'string', 'max:100'],
        ]);
        $requests->request($request->user(), $account, $data['reason'], $data['idempotency_key']);

        return back()->with('success', 'Reschedule request recorded. The signed schedule was not changed.');
    }

    public function reviewReschedule(Request $request, int $reschedule, RescheduleRequests $requests)
    {
        $data = $request->validate([
            'decision' => ['required', Rule::in(['approved', 'rejected'])],
            'note' => ['required', 'string', 'max:1000'],
        ]);
        $requests->decide($request->user(), $reschedule, $data['decision'], $data['note']);

        return back()->with('success', 'Reschedule decision recorded. Installments stay as signed.');
    }

    public function profit(Request $request, int $account, SavingsLedger $ledger)
    {
        abort_unless($request->user()?->isFinancialAdministrator(), 403);
        $data = $request->validate([
            'business_date' => ['required', 'date_format:Y-m-d'],
            'idempotency_key' => ['required', 'string', 'max:100'],
            'description' => ['required', 'string', 'max:1000'],
        ]);
        $ledger->configuredProfit($request->user(), $account, $data['business_date'], $data['idempotency_key'], $data['description']);

        return back()->with('success', 'Savings profit posted from the product calculator.');
    }
}
