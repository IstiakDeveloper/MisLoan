<?php

namespace App\Http\Controllers;

use App\Http\Requests\Settings\PasswordUpdateRequest;
use App\Models\User;
use App\Services\BranchAccountService;
use App\Services\ImageCompressionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the profile completion page. Shown after login when phone, pin or signature is missing.
     */
    public function complete(): Response|RedirectResponse
    {
        /** @var User|null $user */
        $user = Auth::user();

        if ($user && $user->hasCompleteProfile()) {
            return redirect()->route('dashboard');
        }

        return Inertia::render('Profile/Complete', [
            'user' => $user?->only(['id', 'name', 'email', 'phone', 'signature']),
        ]);
    }

    /**
     * Store completed profile (phone, pin, signature required). Then redirect to dashboard.
     */
    public function completeStore(Request $request, ImageCompressionService $compression): RedirectResponse
    {
        $user = $request->user();

        $signatureRule = $user->signature
            ? 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048'
            : 'required|image|mimes:jpeg,png,jpg,gif|max:2048';

        $validated = $request->validate([
            'phone' => 'required|string|max:20',
            'pin' => 'required|string|max:50',
            'signature' => $signatureRule,
        ]);

        if ($request->hasFile('signature')) {
            if ($user->signature) {
                Storage::disk('public')->delete($user->signature);
            }
            $validated['signature'] = $this->storeCompressed(
                $compression,
                $request->file('signature'),
                'signatures/users',
                'signature',
            );
        } else {
            unset($validated['signature']);
        }

        $user->update($validated);

        return redirect()->route('dashboard')->with('success', __('Profile completed. You can now use the application.'));
    }

    public function edit(Request $request)
    {
        $user = $request->user()->load(['role', 'branch', 'area', 'zone']);

        return Inertia::render('Profile/Edit', [
            'user' => $user,
        ]);
    }

    public function update(Request $request, ImageCompressionService $compression)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,'.$user->id,
            'phone' => 'nullable|string|max:20',
            'pin' => 'nullable|string|max:50',
            'profile_photo' => 'nullable|image|mimes:jpeg,png,jpg,webp,gif|max:2048',
            'signature' => 'nullable|image|mimes:jpeg,png,jpg,webp,gif|max:2048',
        ]);

        if ($request->hasFile('profile_photo')) {
            if ($user->profile_photo) {
                Storage::disk('public')->delete($user->profile_photo);
            }
            $validated['profile_photo'] = $this->storeCompressed(
                $compression,
                $request->file('profile_photo'),
                'avatars/users',
                'avatar',
            );
        }

        if ($request->hasFile('signature')) {
            if ($user->signature) {
                Storage::disk('public')->delete($user->signature);
            }
            $validated['signature'] = $this->storeCompressed(
                $compression,
                $request->file('signature'),
                'signatures/users',
                'signature',
            );
        }

        $user->update($validated);

        return redirect()->route('profile.edit')
            ->with('success', 'Profile updated successfully!');
    }

    public function updatePassword(PasswordUpdateRequest $request, BranchAccountService $branchAccounts): RedirectResponse
    {
        $user = $request->user();
        $branchAccounts->updatePasswordOrPin($user, $request->validated('password'));

        $message = $user->isBranchAccount()
            ? 'Branch login PIN updated successfully!'
            : 'Password updated successfully!';

        return redirect()->route('profile.edit')
            ->with('success', $message);
    }

    private function storeCompressed(
        ImageCompressionService $compression,
        UploadedFile $file,
        string $directory,
        string $kind,
    ): string {
        $path = match ($kind) {
            'avatar' => $compression->compressAvatar($file, $directory),
            default => $compression->compressSignature($file, $directory),
        };

        return $path !== false ? $path : $file->store($directory, 'public');
    }
}
