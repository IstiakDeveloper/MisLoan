<?php

namespace App\Services;

use App\Models\LoanApplication;
use App\Models\MemberAdmission;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class VerificationIndexQuery
{
    /**
     * @param  Builder<MemberAdmission>  $admissionQuery
     * @param  Builder<LoanApplication>  $loanQuery
     * @return array{rows: Collection<int, object>, stats: array<string, int>, total: int}
     */
    public function page(
        Builder $admissionQuery,
        Builder $loanQuery,
        string $type,
        string $issueStatus,
        ?CarbonInterface $startOfDay,
        ?CarbonInterface $endOfDay,
        int $page,
        int $perPage,
    ): array {
        $parts = [];
        if ($type !== 'loan') {
            $this->constrainToActionWindow($admissionQuery, 'admission', $startOfDay, $endOfDay);
            $parts[] = $this->summary($admissionQuery, 'admission');
        }
        if ($type !== 'admission') {
            $this->constrainToActionWindow($loanQuery, 'loan', $startOfDay, $endOfDay);
            $parts[] = $this->summary($loanQuery, 'loan');
        }

        if ($parts === []) {
            return [
                'rows' => collect(),
                'stats' => $this->emptyStats(),
                'total' => 0,
            ];
        }

        $union = array_shift($parts);
        foreach ($parts as $part) {
            $union->unionAll($part);
        }

        $items = DB::query()->fromSub($union, 'verification_items');

        if ($startOfDay && $endOfDay) {
            $items->whereBetween('latest_action_at', [$startOfDay->toDateTimeString(), $endOfDay->toDateTimeString()]);
        } elseif ($startOfDay) {
            $items->where('latest_action_at', '>=', $startOfDay->toDateTimeString());
        } elseif ($endOfDay) {
            $items->where('latest_action_at', '<=', $endOfDay->toDateTimeString());
        }

        $stats = $this->stats(clone $items);
        $this->applyIssueStatus($items, $issueStatus);

        $total = (int) (clone $items)->count();
        $rows = $items
            ->orderByDesc('latest_action_at')
            ->orderBy('branch_code_int')
            ->forPage(max($page, 1), max($perPage, 1))
            ->get();

        return [
            'rows' => $rows,
            'stats' => $stats,
            'total' => $total,
        ];
    }

    /**
     * Drop history whose own dates and issue dates are all outside the window.
     * The exact latest-action filter still runs on the page query.
     *
     * @param  Builder<Model>  $query
     */
    private function constrainToActionWindow(Builder $query, string $type, ?CarbonInterface $startOfDay, ?CarbonInterface $endOfDay): void
    {
        if ($startOfDay === null && $endOfDay === null) {
            return;
        }

        $parent = $query->getModel()->getTable();
        $issueTable = $type === 'admission' ? 'member_admission_issues' : 'loan_application_issues';
        $issueKey = $type === 'admission' ? 'member_admission_id' : 'loan_application_id';
        $resolvedColumn = $type === 'admission' ? 'resolved_at' : 'responded_at';
        $start = $startOfDay?->toDateTimeString();
        $end = $endOfDay?->toDateTimeString();

        $query->where(function ($candidate) use ($parent, $issueTable, $issueKey, $resolvedColumn, $start, $end) {
            $candidate->where(function ($parentDates) use ($parent, $start, $end) {
                foreach (["{$parent}.submitted_at", "{$parent}.created_at", "{$parent}.reviewed_at"] as $column) {
                    $parentDates->orWhere(function ($one) use ($column, $start, $end) {
                        if ($start !== null) {
                            $one->where($column, '>=', $start);
                        }
                        if ($end !== null) {
                            $one->where($column, '<=', $end);
                        }
                    });
                }
            })->orWhereExists(function ($issue) use ($parent, $issueTable, $issueKey, $resolvedColumn, $start, $end) {
                $issue->selectRaw('1')
                    ->from($issueTable)
                    ->whereColumn("{$issueTable}.{$issueKey}", "{$parent}.id")
                    ->where(function ($dates) use ($resolvedColumn, $start, $end) {
                        foreach (['created_at', $resolvedColumn, 'zm_approved_at'] as $column) {
                            $dates->orWhere(function ($one) use ($column, $start, $end) {
                                if ($start !== null) {
                                    $one->where($column, '>=', $start);
                                }
                                if ($end !== null) {
                                    $one->where($column, '<=', $end);
                                }
                            });
                        }
                    });
            });
        });
    }

    /**
     * @param  Builder<Model>  $query
     */
    private function summary(Builder $query, string $type): \Illuminate\Database\Query\Builder
    {
        $parent = $query->getModel()->getTable();
        $issueTable = $type === 'admission' ? 'member_admission_issues' : 'loan_application_issues';
        $issueKey = $type === 'admission' ? 'member_admission_id' : 'loan_application_id';
        $replyColumn = $type === 'admission' ? 'resolution_note' : 'response_message';
        $resolvedColumn = $type === 'admission' ? 'resolved_at' : 'responded_at';

        $hasPending = "EXISTS (SELECT 1 FROM {$issueTable} vi WHERE vi.{$issueKey} = {$parent}.id AND vi.status = 'pending')";
        $isZmApproved = "EXISTS (SELECT 1 FROM {$issueTable} vi WHERE vi.{$issueKey} = {$parent}.id) AND NOT EXISTS (SELECT 1 FROM {$issueTable} open_issue WHERE open_issue.{$issueKey} = {$parent}.id AND open_issue.zm_approved_at IS NULL)";
        $hasReplied = $this->hasRepliedSql($parent, $issueTable, $issueKey, $replyColumn, $type);
        $latest = $this->latestActionSql($parent, $issueTable, $issueKey, $resolvedColumn);
        $integer = DB::connection()->getDriverName() === 'sqlite' ? 'INTEGER' : 'SIGNED';
        $branchCode = "(SELECT CASE WHEN branches.code IS NULL OR TRIM(branches.code) = '' THEN 999999 ELSE CAST(branches.code AS {$integer}) END FROM branches WHERE branches.id = {$parent}.branch_id LIMIT 1)";

        return $query->clone()
            ->selectRaw('? as item_type', [$type])
            ->selectRaw("{$parent}.id as raw_id")
            ->selectRaw("{$parent}.status as status")
            ->selectRaw("({$latest}) as latest_action_at")
            ->selectRaw("COALESCE({$branchCode}, 999999) as branch_code_int")
            ->selectRaw("CASE WHEN {$hasPending} THEN 1 ELSE 0 END as has_pending_issue")
            ->selectRaw("CASE WHEN {$hasReplied} THEN 1 ELSE 0 END as has_replied")
            ->selectRaw("CASE WHEN {$isZmApproved} THEN 1 ELSE 0 END as is_zm_approved")
            ->toBase();
    }

    private function latestActionSql(string $parent, string $issueTable, string $issueKey, string $resolvedColumn): string
    {
        $reviewed = "CASE WHEN {$parent}.status IN ('approved', 'pending_disbursement', 'disbursed', 'rejected') THEN {$parent}.reviewed_at ELSE NULL END";
        $stamps = [
            "(SELECT MAX(created_at) FROM {$issueTable} WHERE {$issueKey} = {$parent}.id)",
            "(SELECT MAX({$resolvedColumn}) FROM {$issueTable} WHERE {$issueKey} = {$parent}.id)",
            "(SELECT MAX(zm_approved_at) FROM {$issueTable} WHERE {$issueKey} = {$parent}.id)",
            "({$reviewed})",
        ];

        if (DB::connection()->getDriverName() === 'sqlite') {
            $union = implode(' UNION ALL ', array_map(
                fn (string $expression) => 'SELECT '.$expression.' AS stamp',
                $stamps,
            ));

            return "COALESCE((SELECT MAX(stamp) FROM ({$union}) action_stamps), {$parent}.submitted_at, {$parent}.created_at)";
        }

        $greatest = implode(', ', array_map(
            fn (string $expression) => "COALESCE({$expression}, '1000-01-01 00:00:00')",
            $stamps,
        ));

        return "COALESCE(NULLIF(GREATEST({$greatest}), '1000-01-01 00:00:00'), {$parent}.submitted_at, {$parent}.created_at)";
    }

    private function hasRepliedSql(string $parent, string $issueTable, string $issueKey, string $replyColumn, string $type): string
    {
        $reply = "EXISTS (
            SELECT 1 FROM {$issueTable} replied
            WHERE replied.{$issueKey} = {$parent}.id
              AND replied.{$replyColumn} IS NOT NULL
              AND TRIM(replied.{$replyColumn}) <> ''
              AND TRIM(replied.{$replyColumn}) <> 'হেড অফিস ভেরিফিকেশন থেকে অনুমোদিত'
              AND TRIM(replied.{$replyColumn}) NOT LIKE 'আবেদন বাতিল:%'
              AND TRIM(replied.{$replyColumn}) <> TRIM(COALESCE(replied.issue_description, ''))
        )";

        if ($type !== 'admission') {
            return $reply;
        }

        return "{$reply} OR ({$parent}.revision_comments IS NOT NULL AND {$parent}.revision_comments LIKE '%Branch Revision Note%')";
    }

    private function applyIssueStatus(\Illuminate\Database\Query\Builder $query, string $issueStatus): void
    {
        $completed = ['approved', 'pending_disbursement', 'disbursed', 'rejected', 'awaiting_takeup', 'pending_cancellation', 'cancelled'];

        if ($issueStatus === 'pending_action') {
            $query->whereNotIn('status', $completed);
        } elseif ($issueStatus === 'zm_approved') {
            $query->where('is_zm_approved', 1)->whereNotIn('status', $completed);
        } elseif ($issueStatus === 'branch_replied') {
            $query->where('has_replied', 1)->where('is_zm_approved', 0)->whereNotIn('status', $completed);
        } elseif ($issueStatus === 'pending') {
            $query->where('has_pending_issue', 1)->where('has_replied', 0)->whereNotIn('status', $completed);
        } elseif ($issueStatus === 'approved') {
            $query->whereIn('status', ['approved', 'pending_disbursement', 'disbursed']);
        } elseif ($issueStatus === 'rejected') {
            $query->where('status', 'rejected');
        }
    }

    /**
     * @return array<string, int>
     */
    private function stats(\Illuminate\Database\Query\Builder $query): array
    {
        $completed = "'approved','pending_disbursement','disbursed','rejected','awaiting_takeup','pending_cancellation','cancelled'";
        $row = $query->selectRaw("
            COUNT(*) as total,
            SUM(CASE WHEN status NOT IN ({$completed}) THEN 1 ELSE 0 END) as pending_action,
            SUM(CASE WHEN item_type = 'admission' THEN 1 ELSE 0 END) as admission_count,
            SUM(CASE WHEN item_type = 'loan' THEN 1 ELSE 0 END) as loan_count,
            SUM(CASE WHEN has_pending_issue = 1 AND has_replied = 0 AND status NOT IN ({$completed}) THEN 1 ELSE 0 END) as pending_issues,
            SUM(CASE WHEN has_replied = 1 AND is_zm_approved = 0 AND status NOT IN ({$completed}) THEN 1 ELSE 0 END) as branch_replied,
            SUM(CASE WHEN is_zm_approved = 1 AND status NOT IN ({$completed}) THEN 1 ELSE 0 END) as zm_approved,
            SUM(CASE WHEN status IN ('approved','pending_disbursement','disbursed') THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
        ")->first();

        return [
            'total' => (int) ($row->total ?? 0),
            'pending_action' => (int) ($row->pending_action ?? 0),
            'admission_count' => (int) ($row->admission_count ?? 0),
            'loan_count' => (int) ($row->loan_count ?? 0),
            'pending_issues' => (int) ($row->pending_issues ?? 0),
            'branch_replied' => (int) ($row->branch_replied ?? 0),
            'zm_approved' => (int) ($row->zm_approved ?? 0),
            'approved' => (int) ($row->approved ?? 0),
            'rejected' => (int) ($row->rejected ?? 0),
        ];
    }

    /**
     * @return array<string, int>
     */
    private function emptyStats(): array
    {
        return [
            'total' => 0,
            'pending_action' => 0,
            'admission_count' => 0,
            'loan_count' => 0,
            'pending_issues' => 0,
            'branch_replied' => 0,
            'zm_approved' => 0,
            'approved' => 0,
            'rejected' => 0,
        ];
    }
}
