<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

final class ReceiptController extends Controller
{
    public function loan(Request $request, int $transaction): Response
    {
        $row = DB::table('loan_transactions as transaction')
            ->join('loan_accounts as account', 'account.id', '=', 'transaction.loan_account_id')
            ->join('loan_applications as application', 'application.id', '=', 'account.loan_application_id')
            ->leftJoin('member_admissions as member', 'member.id', '=', 'application.member_admission_id')
            ->leftJoin('branches', 'branches.id', '=', 'account.branch_id')
            ->where('transaction.id', $transaction)
            ->first([
                'transaction.*', 'account.branch_id', 'account.reference as account_reference',
                'application.application_no', 'member.applicant_name_bn', 'member.applicant_name_en', 'branches.name as branch_name',
            ]);
        abort_unless($row, 404);
        abort_unless($request->user()?->canPostBranchCash((int) $row->branch_id), 403);

        return $this->render('loan', $row);
    }

    public function savings(Request $request, int $transaction): Response
    {
        $row = DB::table('savings_transactions as transaction')
            ->join('savings_accounts as account', 'account.id', '=', 'transaction.savings_account_id')
            ->join('savings_applications as application', 'application.id', '=', 'account.savings_application_id')
            ->leftJoin('member_admissions as member', 'member.id', '=', 'application.member_admission_id')
            ->leftJoin('branches', 'branches.id', '=', 'account.branch_id')
            ->where('transaction.id', $transaction)
            ->first([
                'transaction.*', 'account.branch_id', 'account.reference as account_reference',
                'application.application_no', 'member.applicant_name_bn', 'member.applicant_name_en', 'branches.name as branch_name',
            ]);
        abort_unless($row, 404);
        abort_unless($request->user()?->canPostBranchCash((int) $row->branch_id), 403);

        return $this->render('savings', $row);
    }

    private function render(string $kind, object $row): Response
    {
        return response()->view('reports.cash-receipt', [
            'kind' => $kind,
            'row' => $row,
            'member' => $row->applicant_name_bn ?: $row->applicant_name_en ?: 'সদস্য',
            'amount' => $kind === 'loan'
                ? abs((int) $row->principal_paisa) + abs((int) $row->charge_paisa)
                : abs((int) $row->amount_paisa),
        ])->header('Cache-Control', 'private, no-store');
    }
}
