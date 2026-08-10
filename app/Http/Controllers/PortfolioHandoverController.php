<?php

namespace App\Http\Controllers;

use App\Models\LoanApplication;
use App\Models\MemberAdmission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PortfolioHandoverController extends Controller
{
    public function index(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        $user->loadMissing(['role', 'branch']);

        if ($user->role?->name !== Role::FIELD_OFFICER) {
            return redirect()->route('dashboard');
        }

        if (! $user->needsPortfolioHandover()) {
            return redirect()->route('dashboard');
        }

        $members = $user->pendingPortfolioHandoverMembers()
            ->with(['branch:id,name,code', 'samity:id,samity_name,samity_name_bn,samity_code'])
            ->orderBy('branch_id')
            ->orderBy('applicant_name_en')
            ->get()
            ->map(fn (MemberAdmission $m) => [
                'id' => $m->id,
                'application_no' => $m->application_no,
                'applicant_name_en' => $m->applicant_name_en,
                'applicant_name_bn' => $m->applicant_name_bn,
                'mobile_number' => $m->mobile_number,
                'status' => $m->status,
                'branch_id' => $m->branch_id,
                'branch' => $m->branch ? [
                    'id' => $m->branch->id,
                    'name' => $m->branch->name,
                    'code' => $m->branch->code,
                ] : null,
                'samity' => $m->samity ? [
                    'id' => $m->samity->id,
                    'name' => $m->samity->samity_name_bn ?: $m->samity->samity_name,
                    'code' => $m->samity->samity_code,
                ] : null,
            ]);

        $branchIds = $members->pluck('branch_id')->filter()->unique()->values()->all();

        $officersByBranch = [];
        foreach ($branchIds as $branchId) {
            $officersByBranch[$branchId] = User::query()
                ->with('role:id,name,display_name')
                ->where('is_active', true)
                ->where('id', '!=', $user->id)
                ->where(function ($q) use ($branchId) {
                    $q->where('branch_id', $branchId)
                        ->orWhereHas('branches', fn ($bq) => $bq->where('branches.id', $branchId));
                })
                ->whereHas('role', function ($q) {
                    $q->whereIn('name', [
                        Role::FIELD_OFFICER,
                        Role::BRANCH_USER,
                        Role::BRANCH_MANAGER,
                    ]);
                })
                ->orderBy('name')
                ->get(['id', 'name', 'pin', 'username', 'role_id', 'branch_id'])
                ->map(fn (User $o) => [
                    'id' => $o->id,
                    'name' => $o->name,
                    'pin' => $o->pin ?: $o->username,
                    'role' => $o->role?->display_name ?: $o->role?->name,
                ])
                ->values()
                ->all();
        }

        return Inertia::render('PortfolioHandover/Index', [
            'currentBranch' => $user->branch ? [
                'id' => $user->branch->id,
                'name' => $user->branch->name,
                'code' => $user->branch->code,
            ] : null,
            'members' => $members,
            'officersByBranch' => $officersByBranch,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $user->loadMissing('role');

        if ($user->role?->name !== Role::FIELD_OFFICER) {
            abort(403);
        }

        if (! $user->needsPortfolioHandover()) {
            return redirect()->route('dashboard');
        }

        $validated = $request->validate([
            'assignments' => 'required|array|min:1',
            'assignments.*.member_id' => 'required|integer|distinct',
            'assignments.*.officer_id' => [
                'required',
                'integer',
                Rule::notIn([(int) $user->id]),
            ],
        ]);

        $pendingIds = $user->pendingPortfolioHandoverMembers()->pluck('id')->all();
        $pendingIdSet = array_flip($pendingIds);

        $assignments = collect($validated['assignments']);

        foreach ($assignments as $row) {
            $memberId = (int) $row['member_id'];
            $officerId = (int) $row['officer_id'];

            if (! isset($pendingIdSet[$memberId])) {
                throw ValidationException::withMessages([
                    'assignments' => 'অবৈধ সদস্য নির্বাচন।',
                ]);
            }

            $member = MemberAdmission::query()->findOrFail($memberId);
            $officer = User::query()->with('role')->findOrFail($officerId);

            if (! $officer->is_active) {
                throw ValidationException::withMessages([
                    'assignments' => "অফিসার {$officer->name} সক্রিয় নন।",
                ]);
            }

            if (! in_array($officer->role?->name, [
                Role::FIELD_OFFICER,
                Role::BRANCH_USER,
                Role::BRANCH_MANAGER,
            ], true)) {
                throw ValidationException::withMessages([
                    'assignments' => "অফিসার {$officer->name} হস্তান্তর গ্রহণ করতে পারবেন না।",
                ]);
            }

            if (! $officer->canAccessBranch((int) $member->branch_id)) {
                throw ValidationException::withMessages([
                    'assignments' => "অফিসার {$officer->name} সদস্যের শাখায় কাজ করেন না।",
                ]);
            }
        }

        $handedCount = $assignments->count();

        DB::transaction(function () use ($assignments) {
            foreach ($assignments as $row) {
                $memberId = (int) $row['member_id'];
                $officerId = (int) $row['officer_id'];

                MemberAdmission::query()
                    ->where('id', $memberId)
                    ->update(['assigned_officer_id' => $officerId]);

                // Open drafts must move with the member so the new officer can continue work.
                LoanApplication::query()
                    ->where('member_admission_id', $memberId)
                    ->where('status', LoanApplication::STATUS_DRAFT)
                    ->update(['submitted_by' => $officerId]);
            }
        });

        if ($user->fresh()->needsPortfolioHandover()) {
            $remaining = $user->pendingPortfolioHandoverMembers()->count();

            return redirect()->route('portfolio-handover.index')
                ->with('success', "{$handedCount} জন সদস্য হস্তান্তর হয়েছে। এখনও {$remaining} জন বাকি — আবার হস্তান্তর করুন।");
        }

        return redirect()->route('dashboard')
            ->with('success', "সব সদস্য হস্তান্তর সম্পন্ন হয়েছে ({$handedCount} জন)। এখন আপনি নতুন শাখায় কাজ করতে পারবেন।");
    }
}
