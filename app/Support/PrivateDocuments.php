<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Authenticated delivery for member and staff files. New files live on the private disk. */
final class PrivateDocuments
{
    public static function url(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }
        if (str_starts_with($path, 'data:') || str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }
        if (strlen($path) > 500) {
            return $path;
        }

        return route('documents.show', ['path' => self::clean($path)]);
    }

    public static function clean(string $path): string
    {
        $path = str_replace('\\', '/', $path);
        $path = preg_replace('#^/storage/#', '', $path) ?? $path;
        $path = ltrim($path, '/');
        abort_if($path === '' || str_contains($path, '..') || str_contains($path, "\0"), 404);

        return $path;
    }

    public function authorize(User $user, string $path): string
    {
        abort_unless($user->is_active, 403);
        $path = self::clean($path);
        $branchId = $this->branchId($path);
        if ($branchId === null) {
            abort_unless($this->ownsUnscopedFile($user, $path), 403);
        } else {
            abort_unless($user->canAccessBranch($branchId), 403);
        }
        abort_unless($this->exists($path), 404);

        return $path;
    }

    public function response(string $path): StreamedResponse
    {
        foreach (['local', 'public'] as $disk) {
            if (Storage::disk($disk)->exists($path)) {
                return Storage::disk($disk)->response($path, basename($path), [
                    'Cache-Control' => 'private, no-store',
                    'X-Content-Type-Options' => 'nosniff',
                ]);
            }
        }
        abort(404);
    }

    private function exists(string $path): bool
    {
        return Storage::disk('local')->exists($path) || Storage::disk('public')->exists($path);
    }

    private function ownsUnscopedFile(User $user, string $path): bool
    {
        if (! Schema::hasTable('users')) {
            return false;
        }
        $owner = DB::table('users')->where(function ($query) use ($path) {
            foreach (['profile_photo', 'signature'] as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $query->orWhere($column, $path)->orWhere($column, '/storage/'.$path);
                }
            }
        })->first(['id', 'branch_id']);

        return $owner !== null && (int) $owner->id === (int) $user->id && $owner->branch_id === null;
    }

    private function branchId(string $path): ?int
    {
        $needles = [$path, '/storage/'.$path];
        $tables = [
            ['member_admissions', ['customer_photo_path', 'customer_nid_photo_path', 'customer_nid_back_photo_path', 'guardian_photo_path', 'surveyor_signature_path', 'applicant_signature_path', 'guardian_signature_path', 'submitted_by_signature_path'], 'branch_id'],
            ['savings_applications', ['applicant_photo', 'applicant_signature', 'officer_signature', 'accountant_signature', 'branch_manager_signature'], 'branch_id'],
            ['loan_applications', ['applicant_photo', 'guarantor_photo', 'excel_file_path'], 'branch_id'],
        ];
        foreach ($tables as [$table, $columns, $branch]) {
            $found = $this->firstBranch($table, $columns, $branch, $needles);
            if ($found !== null) {
                return $found;
            }
        }
        if (Schema::hasTable('users') && Schema::hasColumn('users', 'branch_id')) {
            $owner = DB::table('users')->whereNotNull('branch_id')->where(function ($query) use ($needles) {
                foreach (['profile_photo', 'signature'] as $column) {
                    if (Schema::hasColumn('users', $column)) {
                        $query->orWhereIn($column, $needles);
                    }
                }
            })->first(['branch_id']);
            if ($owner) {
                return (int) $owner->branch_id;
            }
        }
        if (Schema::hasTable('member_admission_approvals') && Schema::hasColumn('member_admission_approvals', 'approver_signature') && Schema::hasTable('member_admissions')) {
            $approval = DB::table('member_admission_approvals as approval')
                ->join('member_admissions as admission', 'admission.id', '=', 'approval.member_admission_id')
                ->whereIn('approval.approver_signature', $needles)
                ->first(['admission.branch_id']);
            if ($approval) {
                return (int) $approval->branch_id;
            }
        }

        return null;
    }

    /**
     * @param  list<string>  $columns
     * @param  list<string>  $needles
     */
    private function firstBranch(string $table, array $columns, string $branch, array $needles): ?int
    {
        if (! Schema::hasTable($table) || ! Schema::hasColumn($table, $branch)) {
            return null;
        }
        $present = array_values(array_filter($columns, fn (string $column): bool => Schema::hasColumn($table, $column)));
        if ($present === []) {
            return null;
        }
        $row = DB::table($table)->where(function ($query) use ($present, $needles) {
            foreach ($present as $column) {
                $query->orWhereIn($column, $needles);
            }
        })->first([$branch]);

        return $row && $row->{$branch} !== null ? (int) $row->{$branch} : null;
    }
}
