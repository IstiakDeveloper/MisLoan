<?php

namespace App\Http\Controllers\Concerns;

use App\Models\User;
use App\Services\ApprovalService;
use App\Support\RoleListWorkQueue;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

trait AppliesRoleDefaultListFilter
{
    /**
     * @param  Builder<\Illuminate\Database\Eloquent\Model>  $query
     */
    protected function applyResolvedStatusFilter($query, ?string $status, User $user, string $type, bool $excludeDraftsWhenAll = false): void
    {
        if ($status === RoleListWorkQueue::PENDING_MY_APPROVAL) {
            $ids = $type === 'loan'
                ? app(ApprovalService::class)->pendingLoanApplicationIdsForUser($user)
                : app(ApprovalService::class)->pendingAdmissionIdsForUser($user);

            $query->whereIn('id', $ids !== [] ? $ids : [0]);

            return;
        }

        if ($status) {
            $query->where('status', $status);

            return;
        }

        if ($excludeDraftsWhenAll) {
            $query->where('status', '!=', 'draft');
        }
    }

    /**
     * @param  Builder<\Illuminate\Database\Eloquent\Model>  $query
     */
    protected function applySubmittedAtDateRange($query, ?string $dateFrom, ?string $dateTo): void
    {
        if (! $dateFrom && ! $dateTo) {
            return;
        }

        if ($dateFrom && $dateTo) {
            $startOfDay = Carbon::parse($dateFrom)->startOfDay();
            $endOfDay = Carbon::parse($dateTo)->endOfDay();
            $query->where(function ($q) use ($startOfDay, $endOfDay) {
                $q->whereBetween('submitted_at', [$startOfDay, $endOfDay])
                    ->orWhere(function ($sq) use ($startOfDay, $endOfDay) {
                        $sq->whereNull('submitted_at')->whereBetween('created_at', [$startOfDay, $endOfDay]);
                    });
            });

            return;
        }

        if ($dateFrom) {
            $startOfDay = Carbon::parse($dateFrom)->startOfDay();
            $query->where(function ($q) use ($startOfDay) {
                $q->where('submitted_at', '>=', $startOfDay)
                    ->orWhere(function ($sq) use ($startOfDay) {
                        $sq->whereNull('submitted_at')->where('created_at', '>=', $startOfDay);
                    });
            });

            return;
        }

        $endOfDay = Carbon::parse($dateTo)->endOfDay();
        $query->where(function ($q) use ($endOfDay) {
            $q->where('submitted_at', '<=', $endOfDay)
                ->orWhere(function ($sq) use ($endOfDay) {
                    $sq->whereNull('submitted_at')->where('created_at', '<=', $endOfDay);
                });
        });
    }

    /**
     * @param  Builder<\Illuminate\Database\Eloquent\Model>  $query
     */
    protected function applyCoalesceDateRange($query, ?string $dateFrom, ?string $dateTo, string $expression): void
    {
        if (! $dateFrom && ! $dateTo) {
            return;
        }

        if ($dateFrom && $dateTo) {
            $startOfDay = Carbon::parse($dateFrom)->startOfDay();
            $endOfDay = Carbon::parse($dateTo)->endOfDay();
            $query->whereBetween(DB::raw($expression), [$startOfDay, $endOfDay]);

            return;
        }

        if ($dateFrom) {
            $query->where(DB::raw($expression), '>=', Carbon::parse($dateFrom)->startOfDay());

            return;
        }

        $query->where(DB::raw($expression), '<=', Carbon::parse($dateTo)->endOfDay());
    }

    /**
     * @param  Builder<\Illuminate\Database\Eloquent\Model>  $baseQuery
     */
    protected function countPendingMyApproval($baseQuery, User $user, string $type): int
    {
        $clone = clone $baseQuery;
        $this->applyResolvedStatusFilter($clone, RoleListWorkQueue::PENDING_MY_APPROVAL, $user, $type);

        return $clone->count();
    }

    protected function listWorkQueueProps(array $resolved): array
    {
        return RoleListWorkQueue::payload($resolved);
    }
}
