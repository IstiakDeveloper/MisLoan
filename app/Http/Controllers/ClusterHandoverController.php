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
        $search = mb_substr(trim((string) $request->input('search', '')), 0, 100);
        $searchMode = $request->input('mode') === 'samity' ? 'samity' : 'single';
        $samities = $this->clusterHandoverService->samitiesForBranches($branchIds);
        $requestedBranchId = (int) $request->input('branch_id');
        $selectedBranchId = in_array($requestedBranchId, $branchIds, true)
            ? $requestedBranchId
            : (count($branchIds) === 1 ? $branchIds[0] : 0);
        $requestedSamityId = (int) $request->input('samity_id');
        $selectedSamity = collect($samities)->first(function (array $samity) use ($requestedSamityId, $selectedBranchId) {
            if ($samity['id'] !== $requestedSamityId) {
                return false;
            }

            return $selectedBranchId === 0 || $samity['branch_id'] === $selectedBranchId;
        });

        $branches = $user->getAccessibleBranches()
            ->sortBy('code')
            ->values()
            ->map(fn ($branch) => [
                'id' => (int) $branch->id,
                'name' => $branch->name,
                'code' => $branch->code,
            ])
            ->all();

        return Inertia::render('ClusterHandover/Index', [
            'groups' => $groups,
            'officers' => $this->clusterHandoverService->officersAtBranches($branchIds),
            'target_officers' => $this->clusterHandoverService->officersAtBranches(
                $selectedBranchId > 0 ? [$selectedBranchId] : $branchIds
            ),
            'pending_count' => $admissions->count(),
            'branches' => $branches,
            'samities' => $samities,
            'branch_id' => $selectedBranchId > 0 ? $selectedBranchId : null,
            'samity_id' => $selectedSamity['id'] ?? null,
            'search' => $search,
            'search_mode' => $searchMode,
            'search_results' => $selectedSamity
                ? $this->clusterHandoverService->membersOfSamity($user, (int) $selectedSamity['id'], $search)
                : ($search === '' ? [] : $this->clusterHandoverService->searchExisting($user, $search)),
        ]);
    }

    public function reassign(Request $request): RedirectResponse
    {
        $user = $this->branchStaffUser($request);

        $validated = $request->validate([
            'mode' => 'required|in:single,samity',
            'member_id' => 'required_if:mode,single|nullable|integer',
            'samity_id' => 'required_if:mode,samity|nullable|integer',
            'officer_id' => 'required|integer',
            'branch_id' => 'nullable|integer',
            'search' => 'nullable|string|max:100',
        ]);

        $count = $validated['mode'] === 'samity'
            ? $this->clusterHandoverService->reassignSamity(
                $user,
                (int) $validated['samity_id'],
                (int) $validated['officer_id'],
            )
            : $this->clusterHandoverService->reassign(
                $user,
                'single',
                (int) $validated['member_id'],
                (int) $validated['officer_id'],
            );

        $redirect = redirect()->route('cluster-handover.index', array_filter([
            'branch_id' => $validated['branch_id'] ?? null,
            'samity_id' => $validated['samity_id'] ?? null,
            'search' => $validated['search'] ?? null,
            'mode' => $validated['mode'],
        ], fn ($value) => $value !== null && $value !== ''));

        if ($count === 0) {
            return $redirect->with('success', 'কোনো পরিবর্তন হয়নি। সদস্য ইতিমধ্যে এই অফিসারের ক্লাস্টারে আছেন।');
        }

        $message = $validated['mode'] === 'samity'
            ? "পুরো সমিতির {$count} জন সদস্যের ক্লাস্টার পরিবর্তন হয়েছে।"
            : 'সদস্যের ক্লাস্টার পরিবর্তন হয়েছে।';

        return $redirect->with('success', $message);
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
