<?php

namespace App\Services\Members;

use App\Models\MemberAdmission;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/** One permanent identity for each newly created admission. Existing rows are left untouched. */
final class MemberIdentity
{
    public function attachNew(MemberAdmission $admission): void
    {
        if (! Schema::hasTable('member_identities') || ! Schema::hasColumn('member_admissions', 'member_identity_id')) {
            return;
        }
        if ($admission->member_identity_id) {
            return;
        }
        $id = DB::table('member_identities')->insertGetId([
            'reference' => (string) Str::uuid(),
            'branch_id' => $admission->branch_id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $admission->forceFill(['member_identity_id' => $id])->saveQuietly();
    }
}
