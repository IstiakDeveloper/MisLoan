<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use App\Services\ClusterHandoverService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ClusterHandoverController extends Controller
{
    public function __construct(private ClusterHandoverService $clusterHandoverService) {}

    public function index(Request $request): Response
    {
        $user = $this->branchStaffUser($request);

        $admissions = $this->clusterHandoverService
            ->leftoverAdmissionsQuery($user)
            ->with([
                'samity:id,samity_name,samity_name_bn,samity_code',
                'assignedOfficer:id,name,pin,username',
                'createdBy:id,name,pin,username',
                'branch:id,name,code',
            ])
            ->orderBy('branch_id')
            ->orderBy('samity_id')
            ->get();

        $branchIds = $user->getAccessibleBranches()->pluck('id')->map(fn ($id) => (int) $id)->all();
        $groups = $this->clusterHandoverService->groupIntoClusters($admissions);

        return Inertia::render('ClusterHandover/Index', [
            'groups' => $groups,
            'officers' => $this->clusterHandoverService->officersAtBranches($branchIds),
            'pending_count' => $admissions->count(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $this->branchStaffUser($request);

        $validated = $request->validate([
            'assignments' => 'required|array|min:1',
            'assignments.*.from_officer_id' => 'required|integer',
            'assignments.*.samity_id' => 'nullable|integer',
            'assignments.*.officer_id' => 'required|integer',
        ]);

        $leftover = $this->clusterHandoverService
            ->leftoverAdmissionsQuery($user)
            ->with(['samity', 'assignedOfficer', 'createdBy'])
            ->get();

        $clusterMap = [];
        foreach ($this->clusterHandoverService->groupIntoClusters($leftover) as $group) {
            foreach ($group['clusters'] as $cluster) {
                $clusterMap[$cluster['key']] = $cluster['member_ids'];
            }
        }

        $memberIds = [];
        $branchIds = $user->getAccessibleBranches()->pluck('id')->map(fn ($id) => (int) $id)->all();
        $allowedOfficerIds = collect($this->clusterHandoverService->officersAtBranches($branchIds))->pluck('id')->all();

        foreach ($validated['assignments'] as $row) {
            $fromOfficerId = (int) $row['from_officer_id'];
            $samityId = $row['samity_id'] !== null ? (int) $row['samity_id'] : 0;
            $officerId = (int) $row['officer_id'];
            $key = $fromOfficerId.'-'.$samityId;

            if (! isset($clusterMap[$key])) {
                throw ValidationException::withMessages([
                    'assignments' => 'অবৈধ ক্লাস্টার নির্বাচন।',
                ]);
            }

            if (! in_array($officerId, $allowedOfficerIds, true)) {
                $officer = User::query()->find($officerId);
                throw ValidationException::withMessages([
                    'assignments' => ($officer?->name ?? 'অফিসার').' এই শাখায় কাজ করেন না।',
                ]);
            }

            if ($officerId === $fromOfficerId) {
                throw ValidationException::withMessages([
                    'assignments' => 'ট্রান্সফার হওয়া অফিসারকে আবার একই ক্লাস্টার দেওয়া যাবে না।',
                ]);
            }

            $memberIds = array_merge($memberIds, $clusterMap[$key]);
        }

        $memberIds = array_values(array_unique($memberIds));
        $byOfficer = collect($validated['assignments']);

        foreach ($byOfficer as $row) {
            $fromOfficerId = (int) $row['from_officer_id'];
            $samityId = $row['samity_id'] !== null ? (int) $row['samity_id'] : 0;
            $officerId = (int) $row['officer_id'];
            $key = $fromOfficerId.'-'.$samityId;
            $this->clusterHandoverService->assignMembers($clusterMap[$key], $officerId);
        }

        $remaining = $this->clusterHandoverService->pendingMemberCount($user);
        $handedCount = count($memberIds);

        if ($remaining > 0) {
            return redirect()->route('cluster-handover.index')
                ->with('success', "{$handedCount} জন সদস্য হস্তান্তর হয়েছে। এখনও {$remaining} জন বাকি।");
        }

        return redirect()->route('cluster-handover.index')
            ->with('success', "সব ক্লাস্টার হস্তান্তর সম্পন্ন হয়েছে ({$handedCount} জন সদস্য)।");
    }

    private function branchStaffUser(Request $request): User
    {
        $user = $request->user();
        $user->loadMissing('role');

        if (! in_array($user->role?->name, [Role::BRANCH_USER, Role::BRANCH_MANAGER], true)) {
            abort(403, 'শুধু শাখা ব্যবহারকারী বা শাখা ব্যবস্থাপক ক্লাস্টার হস্তান্তর করতে পারবেন।');
        }

        return $user;
    }
}
