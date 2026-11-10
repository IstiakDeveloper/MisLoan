<?php

namespace App\Services\Accounting;

use App\Models\User;
use Brick\Math\BigInteger;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/** Accounting task read models; existing services remain the posting boundaries. */
final class AccountingWorkspace
{
    public function entries(int $branch, array $filters = []): Builder
    {
        $totals = DB::table('journal_lines')->selectRaw('journal_entry_id, SUM(debit_paisa) AS debit_paisa, SUM(credit_paisa) AS credit_paisa')->groupBy('journal_entry_id');

        return DB::table('journal_entries as j')->leftJoinSub($totals, 'amounts', 'amounts.journal_entry_id', '=', 'j.id')
            ->leftJoin('users as actor', 'actor.id', '=', 'j.created_by')->where('j.branch_id', $branch)
            ->select('j.*', 'actor.name as posted_by_name')->selectRaw('COALESCE(amounts.debit_paisa, 0) AS debit_paisa, COALESCE(amounts.credit_paisa, 0) AS credit_paisa')
            ->when(! empty($filters['from']), fn ($q) => $q->where('j.business_date', '>=', $filters['from']))
            ->when(! empty($filters['to']), fn ($q) => $q->where('j.business_date', '<=', $filters['to']))
            ->when(! empty($filters['source']) && $filters['source'] !== 'all', fn ($q) => $q->where('j.source_type', $filters['source']))
            ->when(! empty($filters['q']), fn ($q) => $q->where(fn ($w) => $w->where('j.reference', 'like', '%'.$filters['q'].'%')->orWhere('j.description', 'like', '%'.$filters['q'].'%')));
    }

    public function vouchers(int $branch, array $filters = []): Builder
    {
        return DB::table('accounting_vouchers as v')->join('users as maker', 'maker.id', '=', 'v.requested_by')
            ->leftJoin('users as checker', 'checker.id', '=', 'v.reviewed_by')->where('v.branch_id', $branch)
            ->select('v.*', 'maker.name as requested_by_name', 'checker.name as reviewed_by_name')
            ->when(! empty($filters['voucher_status']) && $filters['voucher_status'] !== 'all', fn ($q) => $q->where('v.status', $filters['voucher_status']))
            ->when(! empty($filters['from']), fn ($q) => $q->where('v.business_date', '>=', $filters['from']))
            ->when(! empty($filters['to']), fn ($q) => $q->where('v.business_date', '<=', $filters['to']))
            ->when(! empty($filters['q']), fn ($q) => $q->where(fn ($w) => $w->where('v.reference', 'like', '%'.$filters['q'].'%')->orWhere('v.description', 'like', '%'.$filters['q'].'%')->orWhere('maker.name', 'like', '%'.$filters['q'].'%')));
    }

    public function voucherRows($rows)
    {
        return $rows->through(function ($row) {
            $lines = json_decode($row->lines, true, 512, JSON_THROW_ON_ERROR);
            $row->total_paisa = (string) array_reduce($lines, fn ($total, $line) => $total->plus((string) $line['debit_paisa']), BigInteger::zero());
            unset($row->lines, $row->payload_hash, $row->idempotency_key);

            return $row;
        });
    }

    public function voucher(User $actor, int $id): array
    {
        $base = DB::table('accounting_vouchers')->find($id);
        abort_unless($base, 404);
        abort_unless($actor->canAccessBranch((int) $base->branch_id), 403);
        $row = $this->vouchers((int) $base->branch_id)->where('v.id', $id)->first();
        $lines = json_decode($row->lines, true, 512, JSON_THROW_ON_ERROR);
        $accounts = DB::table('ledger_accounts')->whereIn('id', array_column($lines, 'account_id'))->get()->keyBy('id');
        $row->lines = array_map(fn ($line) => [...$line, 'code' => $accounts[$line['account_id']]->code ?? '', 'name' => $accounts[$line['account_id']]->name ?? 'Archived account', 'debit_paisa' => (string) $line['debit_paisa'], 'credit_paisa' => (string) $line['credit_paisa']], $lines);
        unset($row->payload_hash, $row->idempotency_key);

        return ['record' => $row, 'branch' => DB::table('branches')->find($base->branch_id, ['id', 'code', 'name'])];
    }

    public function journal(User $actor, int $id): array
    {
        $entry = DB::table('journal_entries')->find($id);
        abort_unless($entry, 404);
        abort_unless($actor->canAccessBranch((int) $entry->branch_id), 403);
        $row = $this->entries((int) $entry->branch_id)->where('j.id', $id)->first();
        $row->lines = DB::table('journal_lines as l')->leftJoin('ledger_accounts as a', 'a.id', '=', 'l.ledger_account_id')
            ->where('l.journal_entry_id', $id)->select('l.ledger_account_id as account_id', 'a.code', 'a.name')->selectRaw('CAST(l.debit_paisa AS CHAR) AS debit_paisa, CAST(l.credit_paisa AS CHAR) AS credit_paisa')->orderBy('l.id')->get();
        $row->reversed_by = DB::table('journal_entries')->where('reversal_of', $id)->value('id');
        $row->reversal_pending = DB::table('accounting_vouchers')->where('reversal_of', $id)->where('status', 'pending')->exists();
        unset($row->payload_hash, $row->idempotency_key);

        return ['record' => $row, 'branch' => DB::table('branches')->find($entry->branch_id, ['id', 'code', 'name'])];
    }
}
