<?php

namespace App\Http\Controllers;

use App\Models\MemberAdmission;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentController extends Controller
{
    public function showMemberDocument(Request $request, MemberAdmission $memberAdmission, string $field): StreamedResponse
    {
        $user = $request->user();
        abort_unless($user && $user->is_active && ! $user->is_blocked, 403);

        $allowedFields = [
            'customer_photo_path',
            'customer_nid_photo_path',
            'customer_nid_back_photo_path',
            'applicant_signature_path',
            'guardian_photo_path',
            'guardian_nid_photo_path',
            'guardian_signature_path',
        ];
        abort_unless(in_array($field, $allowedFields, true), 404);

        $role = $user->role?->name;
        $isHo = (bool) ($user->has_all_access || in_array($role, [Role::SUPER_ADMIN, Role::HEAD_OFFICE, Role::ED], true));
        if (! $isHo) {
            abort_unless((int) $user->branch_id === (int) $memberAdmission->branch_id, 403, 'ভিন্ন শাখার ডকুমেন্ট দেখার অনুমতি নেই।');
        }

        $path = $memberAdmission->{$field};
        abort_unless(is_string($path) && $path !== '', 404);

        $cleanPath = ltrim(str_replace(['/storage/', '\\'], ['', '/'], $path), '/');
        if (Storage::disk('local')->exists($cleanPath)) {
            return Storage::disk('local')->response($cleanPath);
        }

        if (Storage::disk('public')->exists($cleanPath)) {
            return Storage::disk('public')->response($cleanPath);
        }

        abort(404);
    }
}
