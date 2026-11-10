<?php

namespace App\Services\Loans;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/** Read models for the loan work queues; money continues through LoanLedger only. */
final class LoanWorkspace
{
    private function applications(array $filters): Builder
    {
        return DB::table('loan_applications as application')
            ->leftJoin('member_admissions as member', 'member.id', '=', 'application.member_admission_id')
            ->leftJoin('loan_products as product', 'product.id', '=', 'application.loan_product_id')
            ->leftJoin('samities as samity', 'samity.id', '=', 'application.samity_id')
            ->join('branches as branch', 'branch.id', '=', 'application.branch_id')
            ->whereNull('application.deleted_at')
            ->when(! empty($filters['branch_id']), fn ($q) => $q->where('application.branch_id', $filters['branch_id']))
            ->when(! empty($filters['product_id']), fn ($q) => $q->where('application.loan_product_id', $filters['product_id']))
            ->when(! empty($filters['q']), function ($q) use ($filters) {
                $search = '%'.$filters['q'].'%';
                $q->where(fn ($w) => $w->where('application.application_no', 'like', $search)
                    ->orWhere('member.application_no', 'like', $search)
                    ->orWhere('member.applicant_name_bn', 'like', $search)
                    ->orWhere('member.applicant_name_en', 'like', $search)
                    ->orWhere('product.product_code', 'like', $search));
            });
    }

    private function context(): array
    {
        return ['application.application_no', 'application.member_admission_id', 'application.loan_product_id',
            'member.application_no as member_reference', 'member.applicant_name_bn as member_name_bn', 'member.applicant_name_en as member_name',
            'product.product_name', 'product.product_code', 'branch.name as branch_name', 'branch.code as branch_code',
            'samity.samity_name', 'samity.samity_code'];
    }

    public function accounts(array $filters): Builder
    {
        return $this->applications($filters)->join('loan_accounts as account', 'account.loan_application_id', '=', 'application.id')
            ->select(['account.*', ...$this->context()])
            ->when(! empty($filters['account_status']), fn ($q) => $q->where('account.status', $filters['account_status']));
    }

    public function sources(array $filters, string $status): Builder
    {
        return $this->applications($filters)->where('application.status', $status)
            ->whereNotExists(fn ($q) => $q->selectRaw('1')->from('loan_accounts as account')->whereColumn('account.loan_application_id', 'application.id'))
            ->select(['application.id', 'application.branch_id', 'application.status', 'application.approved_amount', 'application.disbursed_amount', 'application.disbursed_at', ...$this->context()]);
    }
}
