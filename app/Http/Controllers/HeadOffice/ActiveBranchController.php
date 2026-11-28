<?php

namespace App\Http\Controllers\HeadOffice;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Role;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ActiveBranchController extends Controller
{
    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();
        $role = $user?->role?->name;
        $canSwitch = (bool) ($user?->has_all_access || in_array($role, [Role::SUPER_ADMIN, Role::HEAD_OFFICE, Role::ED], true));

        abort_unless($canSwitch, 403);

        $data = $request->validate([
            'branch_id' => 'nullable|integer|exists:branches,id',
        ]);

        if (empty($data['branch_id'])) {
            $request->session()->forget('active_branch_id');

            return back()->with('success', 'Head Office (All Offices) মোড চালু হয়েছে।');
        }

        $branch = Branch::operational()->findOrFail((int) $data['branch_id']);
        $request->session()->put('active_branch_id', $branch->id);

        return back()->with('success', "{$branch->code} — {$branch->name} শাখা সিলেক্ট করা হয়েছে।");
    }
}
