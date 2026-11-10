<?php

namespace App\Console\Commands;

use Brick\Math\BigInteger;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class CheckFinancialLedgers extends Command
{
    protected $signature = 'misloan:check-ledgers {--json : Emit machine-readable counts without customer details}';

    protected $description = 'Read-only checks for ledger/GL control totals, source journals and unlinked disbursed loans';

    public function handle(): int
    {
        $missing = array_values(array_filter(['loan_accounts', 'loan_transactions', 'savings_accounts', 'savings_transactions', 'journal_entries', 'journal_lines'], fn ($table) => ! Schema::hasTable($table)));
        if ($missing || ! Schema::hasColumn('journal_entries', 'source_type')) {
            $result = ['scope' => 'automated_ledger_checks_only', 'passed' => false, 'missing_tables' => $missing, 'message' => 'Complete the financial migrations first.'];
        } else {
            $result = DB::transaction(function () {
                $differences = [];
                foreach (['loan' => ['principal_account_id', 'principal_paisa', false], 'savings' => ['liability_account_id', 'amount_paisa', true]] as $kind => [$control, $amount, $creditNormal]) {
                    $sources = DB::table($kind.'_accounts as a')->leftJoin($kind.'_transactions as t', 't.'.$kind.'_account_id', '=', 'a.id')->selectRaw('a.branch_id, a.'.$control.' AS control_id, COALESCE(SUM(t.'.$amount.'),0) AS balance')->groupBy('a.branch_id', 'a.'.$control);
                    $gl = DB::table('journal_entries as j')->join('journal_lines as l', 'l.journal_entry_id', '=', 'j.id')->selectRaw('j.branch_id, l.ledger_account_id AS control_id, SUM(l.debit_paisa) AS debit, SUM(l.credit_paisa) AS credit')->groupBy('j.branch_id', 'l.ledger_account_id');
                    $rows = DB::query()->fromSub($sources, 's')->leftJoinSub($gl, 'g', fn ($join) => $join->on('g.branch_id', '=', 's.branch_id')->on('g.control_id', '=', 's.control_id'))->selectRaw('s.*, COALESCE(g.debit,0) AS debit, COALESCE(g.credit,0) AS credit')->get();
                    foreach ($rows as $row) {
                        $net = BigInteger::of((string) ($creditNormal ? $row->credit : $row->debit))->minus((string) ($creditNormal ? $row->debit : $row->credit));
                        $difference = $net->minus((string) $row->balance);
                        if (! $difference->isZero()) {
                            $differences[] = ['kind' => $kind, 'branch_id' => $row->branch_id, 'control_account_id' => $row->control_id, 'difference_paisa' => (string) $difference];
                        }
                    }
                }
                $invalid = DB::table('journal_entries as j')->leftJoin('journal_lines as l', 'l.journal_entry_id', '=', 'j.id')->select('j.id')->groupBy('j.id')->havingRaw('COUNT(l.id) < 2 OR COALESCE(SUM(l.debit_paisa),0) <> COALESCE(SUM(l.credit_paisa),0)');
                $unbalanced = DB::query()->fromSub($invalid, 'invalid_journals')->count();
                $orphans = 0;
                foreach (['loan', 'savings'] as $kind) {
                    $orphans += DB::table('journal_entries as j')->where('source_type', $kind)->whereNotExists(fn ($q) => $q->selectRaw('1')->from($kind.'_transactions as t')->whereColumn('t.journal_entry_id', 'j.id'))->count();
                }
                $unlinked = DB::table('loan_applications as l')->whereNull('deleted_at')->where('status', 'disbursed')->whereNotExists(fn ($q) => $q->selectRaw('1')->from('loan_accounts as a')->whereColumn('a.loan_application_id', 'l.id'))->count();

                return ['scope' => 'automated_ledger_checks_only', 'passed' => ! $differences && $unbalanced === 0 && $orphans === 0 && $unlinked === 0, 'control_differences' => $differences, 'unbalanced_or_empty_journals' => $unbalanced, 'source_journals_without_receipts' => $orphans, 'current_unlinked_disbursed_loans' => $unlinked, 'notice' => 'A pass is not production or regulatory approval. Reconcile audited openings, policies, reporting mappings, restore drills and production load separately.'];
            });
        }
        if ($this->option('json')) {
            $this->line(json_encode($result, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
        } else {
            $this->line($result['passed'] ? 'Automated ledger checks passed.' : 'Ledger checks require reconciliation.');
            $this->line(json_encode($result, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
        }

        return $result['passed'] ? self::SUCCESS : self::FAILURE;
    }
}
