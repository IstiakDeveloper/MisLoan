<?php

namespace App\Http\Controllers;

use App\Models\HelpGuide;
use App\Models\Role;
use App\Services\Help\HelpGuideCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class HelpGuideController extends Controller
{
    public function __construct(private readonly HelpGuideCatalog $catalog) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $guides = $this->catalog->forUser($user);

        return Inertia::render('Help/Index', [
            'guides' => $guides,
            'roleLabel' => $user->role?->display_name ?: ($user->role?->name ?? 'User'),
            'roleName' => $user->role?->name ?? '',
            'canManage' => $this->canManage($user),
            'allRoles' => HelpGuideCatalog::ALL_ROLES,
        ]);
    }

    public function update(Request $request, HelpGuide $helpGuide): RedirectResponse
    {
        abort_unless($this->canManage($request->user()), 403);

        $data = $request->validate([
            'title_bn' => 'required|string|max:255',
            'summary_bn' => 'required|string|max:600',
            'video_url' => 'nullable|string|max:500',
            'video_duration' => 'nullable|string|max:32',
            'is_published' => 'required|boolean',
        ]);

        $helpGuide->update($data);

        return back()->with('success', 'সহায়তা গাইড ও ভিডিও লিংক সফলভাবে আপডেট হয়েছে।');
    }

    private function canManage($user): bool
    {
        $role = $user?->role?->name;

        return (bool) ($user?->has_all_access || in_array($role, [Role::SUPER_ADMIN, Role::HEAD_OFFICE], true));
    }
}
