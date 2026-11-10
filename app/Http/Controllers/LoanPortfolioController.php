<?php

namespace App\Http\Controllers;

use App\Services\Loans\LoanPortfolio;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

final class LoanPortfolioController extends Controller
{
    public function __invoke(Request $request, LoanPortfolio $portfolio)
    {
        abort_unless($request->user()?->is_active && $request->user()->isSuperAdmin() && ! $request->user()->isBranchAccount(), 403);
        $data = $request->validate(['as_of' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'], 'branch_id' => ['nullable', 'integer', 'exists:branches,id']]);
        $asOf = $data['as_of'] ?? today()->toDateString();
        $branch = isset($data['branch_id']) ? (int) $data['branch_id'] : null;

        // Keep summary and detail within the same database read snapshot.
        return DB::transaction(function () use ($request, $portfolio, $asOf, $branch) {
            $query = $portfolio->accounts($request->user(), $asOf, $branch);
            $summary = $portfolio->summary(clone $query, $asOf);
            $accounts = $query->orderBy('p.id')->paginate(50)->withQueryString();
            $accounts->through(function ($row) use ($asOf) {
                foreach (['principal_paisa', 'charge_paisa', 'overdue_paisa'] as $field) {
                    $row->$field = (string) $row->$field;
                }
                $row->days_past_due = $row->oldest_unpaid_on ? (int) CarbonImmutable::parse($row->oldest_unpaid_on)->diffInDays(CarbonImmutable::parse($asOf)) : 0;

                return $row;
            });
            $unlinked = DB::table('loan_applications as l')->whereNull('l.deleted_at')->where('l.status', 'disbursed')->when($branch !== null, fn ($q) => $q->where('l.branch_id', $branch))
                ->whereNotExists(fn ($q) => $q->selectRaw('1')->from('loan_accounts as a')->whereColumn('a.loan_application_id', 'l.id'))->count();
            $notYetOpened = DB::table('loan_accounts')->where('opened_on', '>', $asOf)->when($branch !== null, fn ($q) => $q->where('branch_id', $branch))->count();

            return Inertia::render('LoanPortfolio/Index', [...$summary, 'accounts' => $accounts, 'asOf' => $asOf, 'branchId' => $branch, 'branchesList' => DB::table('branches')->orderBy('code')->get(['id', 'code', 'name']), 'unlinkedDisbursedCount' => $unlinked, 'notYetOpenedCount' => $notYetOpened]);
        });
    }
}
