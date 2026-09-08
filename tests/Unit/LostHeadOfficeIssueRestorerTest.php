<?php

use App\Models\MemberAdmission;
use App\Models\MemberAdmissionIssue;
use App\Models\Notification;
use App\Models\User;
use App\Services\LostHeadOfficeIssueRestorer;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

function createLostHoIssueTables(): void
{
    Schema::dropIfExists('notifications');
    Schema::dropIfExists('member_admission_issues');
    Schema::dropIfExists('member_admissions');
    Schema::dropIfExists('users');

    Schema::create('users', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('email')->unique();
        $table->string('password')->default('secret');
        $table->boolean('is_active')->default(true);
        $table->boolean('has_all_access')->default(false);
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('member_admissions', function (Blueprint $table) {
        $table->id();
        $table->string('application_no')->nullable();
        $table->string('applicant_name_en')->nullable();
        $table->string('applicant_name_bn')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->unsignedBigInteger('returned_by')->nullable();
        $table->dateTime('returned_at')->nullable();
        $table->unsignedBigInteger('reviewed_by')->nullable();
        $table->string('status')->default('pending_head_office');
        $table->text('revision_comments')->nullable();
        $table->integer('revision_count')->default(0);
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('member_admission_issues', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('member_admission_id');
        $table->unsignedBigInteger('reported_by');
        $table->text('issue_description');
        $table->string('status')->default('pending');
        $table->text('resolution_note')->nullable();
        $table->dateTime('resolved_at')->nullable();
        $table->unsignedBigInteger('resolved_by')->nullable();
        $table->dateTime('zm_approved_at')->nullable();
        $table->unsignedBigInteger('zm_approved_by')->nullable();
        $table->text('zm_approval_note')->nullable();
        $table->timestamps();
    });

    Schema::create('notifications', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('user_id');
        $table->string('type')->nullable();
        $table->string('title');
        $table->text('message')->nullable();
        $table->string('notifiable_type')->nullable();
        $table->unsignedBigInteger('notifiable_id')->nullable();
        $table->json('data')->nullable();
        $table->string('action_url')->nullable();
        $table->boolean('is_read')->default(false);
        $table->timestamp('read_at')->nullable();
        $table->boolean('is_sent_email')->default(false);
        $table->timestamp('email_sent_at')->nullable();
        $table->timestamps();
    });
}

function seedLostHoIssueCase(): MemberAdmission
{
    $cso = User::create([
        'name' => 'Upoma Rani',
        'email' => 'cso@test.com',
        'is_active' => true,
        'has_all_access' => true,
    ]);
    User::create([
        'name' => 'Nazipur Branch Manager',
        'email' => 'bm@test.com',
        'is_active' => true,
    ]);
    User::create([
        'name' => 'Zonal Manager Badalgachi',
        'email' => 'zm@test.com',
        'is_active' => true,
    ]);

    $hoComment = 'সদস্যের ভাষ্যমতে সদস্যের JRDM থেকে একটা 22 হাজার টাকার এককালীন ঋণ আছে। সদস্য অতিরিক্ত ঋণগ্রস্থ।';
    $branchReply = 'সদস্যর মাঠে ৬বিঘা আবাদি জমি রয়েছে। তিনি অটে টমটম গাড়ী ও চালান তাহার ১টি ভাই নজিপুর আলহেরা স্কুলে চাকুরী করেন এবং তিনি জামিনদার।';

    $admission = MemberAdmission::withoutEvents(fn () => MemberAdmission::create([
        'application_no' => '0017888834',
        'applicant_name_bn' => 'মোসাঃ বিউটি খাতুন',
        'status' => 'pending_head_office',
        'revision_count' => 1,
        'returned_by' => $cso->id,
        'returned_at' => '2026-09-07 18:40:08',
        'revision_comments' => $branchReply."\n\n--- Branch Revision Note (2026-09-07 20:14 by Nazipur User) ---\nসদস্যর ঋণের বিষয়ে ব্যাখ্যা প্রদান করেছেন",
    ]));

    Notification::create([
        'user_id' => $cso->id,
        'type' => 'member_admission',
        'title' => LostHeadOfficeIssueRestorer::RETURN_TITLE,
        'message' => "সদস্য আবেদন নং 0017888834 সংশোধনের জন্য ফেরত পাঠানো হয়েছে। মন্তব্য: {$hoComment}",
        'notifiable_type' => MemberAdmission::class,
        'notifiable_id' => $admission->id,
        'data' => ['details' => ['মন্তব্য' => $hoComment]],
        'created_at' => '2026-09-07 18:40:08',
        'updated_at' => '2026-09-07 18:40:08',
    ]);

    Notification::create([
        'user_id' => $cso->id,
        'type' => 'member_admission',
        'title' => 'সদস্য ভর্তি আপত্তিতে শাখার জবাব এসেছে (ZM অনুমোদন অপেক্ষমান)',
        'message' => 'শাখা থেকে ব্যাখ্যা প্রদান করা হয়েছে।',
        'notifiable_type' => MemberAdmission::class,
        'notifiable_id' => $admission->id,
        'data' => [
            'details' => [
                'জবাবদাতা' => 'Nazipur Branch Manager (branch_manager)',
                'ব্যাখ্যা' => $branchReply,
            ],
        ],
        'created_at' => '2026-09-07 19:34:48',
        'updated_at' => '2026-09-07 19:34:48',
    ]);

    Notification::create([
        'user_id' => $cso->id,
        'type' => 'member_admission',
        'title' => 'সদস্য ভর্তি আপত্তিতে জোনাল অনুমোদন সম্পন্ন হয়েছে',
        'message' => 'জোনাল অনুমোদন সম্পন্ন হয়েছে।',
        'notifiable_type' => MemberAdmission::class,
        'notifiable_id' => $admission->id,
        'data' => [
            'details' => [
                'ZM অনুমোদনকারী' => 'Zonal Manager Badalgachi (জোনাল ম্যানেজার)',
                'মন্তব্য' => 'অনুমোদিত',
            ],
        ],
        'created_at' => '2026-09-07 20:05:41',
        'updated_at' => '2026-09-07 20:05:41',
    ]);

    return $admission;
}

beforeEach(function () {
    createLostHoIssueTables();
});

it('restores the original HO objection instead of the branch explanation', function () {
    $admission = seedLostHoIssueCase();
    $hoComment = 'সদস্যের ভাষ্যমতে সদস্যের JRDM থেকে একটা 22 হাজার টাকার এককালীন ঋণ আছে। সদস্য অতিরিক্ত ঋণগ্রস্থ।';
    $branchReply = 'সদস্যর মাঠে ৬বিঘা আবাদি জমি রয়েছে। তিনি অটে টমটম গাড়ী ও চালান তাহার ১টি ভাই নজিপুর আলহেরা স্কুলে চাকুরী করেন এবং তিনি জামিনদার।';

    $report = app(LostHeadOfficeIssueRestorer::class)->restore();

    expect($report['restored'])->toBe(1);

    $issue = $admission->issues()->first();
    expect($issue)->not->toBeNull()
        ->and($issue->issue_description)->toBe($hoComment)
        ->and($issue->resolution_note)->toBe($branchReply)
        ->and($issue->zm_approved_at)->not->toBeNull();

    $admission->refresh();
    expect($admission->revision_comments)->toStartWith($hoComment)
        ->and($admission->revision_comments)->toContain('Branch Revision Note')
        ->and($admission->revision_comments)->toContain('সদস্যর ঋণের বিষয়ে ব্যাখ্যা প্রদান করেছেন');
});

it('does not duplicate issues when the restore command runs twice', function () {
    seedLostHoIssueCase();

    $restorer = app(LostHeadOfficeIssueRestorer::class);
    $restorer->restore();
    $second = $restorer->restore();

    expect(MemberAdmissionIssue::count())->toBe(1)
        ->and($second['restored'])->toBe(0)
        ->and($second['skipped'])->toBe(1);
});

it('dry-run does not write any issues', function () {
    seedLostHoIssueCase();

    $report = app(LostHeadOfficeIssueRestorer::class)->restore(dryRun: true);

    expect($report['restored'])->toBe(1)
        ->and(MemberAdmissionIssue::count())->toBe(0);
});
