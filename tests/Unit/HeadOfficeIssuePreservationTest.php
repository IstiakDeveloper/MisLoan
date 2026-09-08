<?php

use App\Models\LoanApplicationIssue;
use App\Models\MemberAdmissionIssue;
use App\Models\User;
use App\Services\VerificationIssueService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

beforeEach(function () {
    Schema::dropIfExists('loan_application_issues');
    Schema::dropIfExists('member_admission_issues');
    Schema::dropIfExists('users');

    Schema::create('users', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('email')->unique();
        $table->string('password')->default('secret');
        $table->boolean('is_active')->default(true);
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('member_admission_issues', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('member_admission_id')->default(1);
        $table->unsignedBigInteger('reported_by')->default(1);
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

    Schema::create('loan_application_issues', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('loan_application_id')->default(1);
        $table->unsignedBigInteger('reported_by')->default(1);
        $table->text('issue_description');
        $table->string('status')->default('pending');
        $table->text('response_message')->nullable();
        $table->unsignedBigInteger('responded_by')->nullable();
        $table->dateTime('responded_at')->nullable();
        $table->dateTime('zm_approved_at')->nullable();
        $table->unsignedBigInteger('zm_approved_by')->nullable();
        $table->text('zm_approval_note')->nullable();
        $table->timestamps();
    });
});

it('never overwrites the head office objection when a branch replies', function () {
    $user = User::create(['name' => 'Nazipur User', 'email' => 'nu@test.com', 'is_active' => true]);
    $issue = MemberAdmissionIssue::create([
        'issue_description' => 'সদস্য অতিরিক্ত ঋণগ্রস্থ',
        'status' => 'pending',
    ]);

    $error = app(VerificationIssueService::class)->recordAdmissionReply(
        $issue,
        $user,
        'সদস্যর মাঠে ৬বিঘা আবাদি জমি রয়েছে।'
    );

    expect($error)->toBeNull()
        ->and($issue->fresh()->issue_description)->toBe('সদস্য অতিরিক্ত ঋণগ্রস্থ')
        ->and($issue->fresh()->resolution_note)->toBe('সদস্যর মাঠে ৬বিঘা আবাদি জমি রয়েছে।');
});

it('appends a second reply instead of replacing the first', function () {
    $user = User::create(['name' => 'Nazipur User', 'email' => 'nu2@test.com', 'is_active' => true]);
    $issue = MemberAdmissionIssue::create([
        'issue_description' => 'HO আপত্তি',
        'status' => 'pending',
        'resolution_note' => 'প্রথম জবাব',
        'resolved_by' => $user->id,
        'resolved_at' => now()->subHour(),
    ]);

    app(VerificationIssueService::class)->recordAdmissionReply($issue, $user, 'দ্বিতীয় জবাব');

    $fresh = $issue->fresh();
    expect($fresh->resolution_note)->toContain('প্রথম জবাব')
        ->and($fresh->resolution_note)->toContain('দ্বিতীয় জবাব')
        ->and($fresh->resolved_by)->toBe($user->id)
        ->and($fresh->issue_description)->toBe('HO আপত্তি');
});

it('rejects further replies after zonal approval', function () {
    $user = User::create(['name' => 'Nazipur User', 'email' => 'nu3@test.com', 'is_active' => true]);
    $issue = MemberAdmissionIssue::create([
        'issue_description' => 'HO আপত্তি',
        'status' => 'pending',
        'resolution_note' => 'শাখার জবাব',
        'zm_approved_at' => now(),
        'zm_approved_by' => 9,
    ]);

    $error = app(VerificationIssueService::class)->recordAdmissionReply($issue, $user, 'আরেকবার লিখি');

    expect($error)->not->toBeNull()
        ->and($issue->fresh()->resolution_note)->toBe('শাখার জবাব');
});

it('keeps previous head office notes when appending a return comment', function () {
    $service = app(VerificationIssueService::class);

    $merged = $service->appendUniqueComment('প্রথম HO আপত্তি', 'দ্বিতীয় HO আপত্তি');

    expect($merged)->toContain('প্রথম HO আপত্তি')
        ->and($merged)->toContain('দ্বিতীয় HO আপত্তি');
});

it('blocks deleting an issue after a branch reply exists', function () {
    $issue = MemberAdmissionIssue::create([
        'issue_description' => 'HO আপত্তি',
        'status' => 'pending',
        'resolution_note' => 'শাখার জবাব',
    ]);

    expect(app(VerificationIssueService::class)->mutationError($issue))->not->toBeNull();
});

it('appends loan replies without touching the objection', function () {
    $user = User::create(['name' => 'Branch User', 'email' => 'bu@test.com', 'is_active' => true]);
    $issue = LoanApplicationIssue::create([
        'issue_description' => 'ঋণের কাগজ অসম্পূর্ণ',
        'status' => 'pending',
        'response_message' => 'প্রথম জবাব',
        'responded_by' => $user->id,
        'responded_at' => now()->subHour(),
    ]);

    app(VerificationIssueService::class)->recordLoanReply($issue, $user, 'দ্বিতীয় জবাব');

    expect($issue->fresh()->issue_description)->toBe('ঋণের কাগজ অসম্পূর্ণ')
        ->and($issue->fresh()->response_message)->toContain('প্রথম জবাব')
        ->and($issue->fresh()->response_message)->toContain('দ্বিতীয় জবাব');
});
