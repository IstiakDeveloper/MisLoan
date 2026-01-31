<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\OrganizationController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\LoanApplicationController;
use App\Http\Controllers\AdmissionController;
use App\Http\Controllers\IssueProcessingController;

Route::get('/', function () {
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }
    return redirect()->route('login');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Organization Management Routes - Only for SuperAdmin/Head Office
    Route::prefix('organizations')->name('organizations.')->middleware('head.office')->group(function () {
        Route::get('/', [OrganizationController::class, 'index'])->name('index');

        // Zone Routes
        Route::post('zones', [OrganizationController::class, 'storeZone'])->name('zones.store');
        Route::put('zones/{zone}', [OrganizationController::class, 'updateZone'])->name('zones.update');
        Route::delete('zones/{zone}', [OrganizationController::class, 'destroyZone'])->name('zones.destroy');
        Route::patch('zones/{zone}/toggle-status', [OrganizationController::class, 'toggleZoneStatus'])->name('zones.toggle-status');

        // Area Routes
        Route::post('areas', [OrganizationController::class, 'storeArea'])->name('areas.store');
        Route::put('areas/{area}', [OrganizationController::class, 'updateArea'])->name('areas.update');
        Route::delete('areas/{area}', [OrganizationController::class, 'destroyArea'])->name('areas.destroy');
        Route::patch('areas/{area}/toggle-status', [OrganizationController::class, 'toggleAreaStatus'])->name('areas.toggle-status');

        // Branch Routes
        Route::post('branches', [OrganizationController::class, 'storeBranch'])->name('branches.store');
        Route::put('branches/{branch}', [OrganizationController::class, 'updateBranch'])->name('branches.update');
        Route::delete('branches/{branch}', [OrganizationController::class, 'destroyBranch'])->name('branches.destroy');
        Route::patch('branches/{branch}/toggle-status', [OrganizationController::class, 'toggleBranchStatus'])->name('branches.toggle-status');

        // API Routes for cascading dropdowns
        Route::get('zones/{zone}/areas', [OrganizationController::class, 'getAreasByZone'])->name('zones.areas');
        Route::get('areas/{area}/branches', [OrganizationController::class, 'getBranchesByArea'])->name('areas.branches');
        Route::get('zones/{zone}/branches', [OrganizationController::class, 'getBranchesByZone'])->name('zones.branches');
    });

    // Role Management Routes - Only for SuperAdmin/Head Office
    Route::middleware('head.office')->group(function () {
    Route::get('roles', [RoleController::class, 'index'])->name('roles.index');
    Route::post('roles', [RoleController::class, 'store'])->name('roles.store');
    Route::put('roles/{role}', [RoleController::class, 'update'])->name('roles.update');
    Route::delete('roles/{role}', [RoleController::class, 'destroy'])->name('roles.destroy');
    });

    // User Management Routes - Only for SuperAdmin/Head Office
    Route::middleware('head.office')->group(function () {
    Route::get('users', [UserController::class, 'index'])->name('users.index');
    Route::post('users', [UserController::class, 'store'])->name('users.store');
    Route::put('users/{user}', [UserController::class, 'update'])->name('users.update');
    Route::delete('users/{user}', [UserController::class, 'destroy'])->name('users.destroy');
    Route::patch('users/{user}/toggle-status', [UserController::class, 'toggleStatus'])->name('users.toggle-status');
    Route::post('users/{user}/reset-password', [UserController::class, 'resetPassword'])->name('users.reset-password');
    });

    // Loan Submissions Management - Only for SuperAdmin/Head Office
    Route::prefix('submissions')->name('submissions.')->middleware('head.office')->group(function () {
        Route::get('/', [LoanApplicationController::class, 'submissions'])->name('index');
        Route::patch('{loanApplication}/mark-read', [LoanApplicationController::class, 'markAsRead'])->name('mark-read');
        Route::post('mark-all-read', [LoanApplicationController::class, 'markAllAsRead'])->name('mark-all-read');
        Route::get('export/excel', [LoanApplicationController::class, 'exportExcel'])->name('export.excel');
        Route::get('export/pdf', [LoanApplicationController::class, 'exportPdf'])->name('export.pdf');
    });

    // Member Admission Submissions - Only for SuperAdmin/Head Office
    Route::prefix('admission-submissions')->name('admission-submissions.')->middleware('head.office')->group(function () {
        Route::get('/', [AdmissionController::class, 'headOfficeSubmissions'])->name('index');
        Route::post('mark-all-read', [AdmissionController::class, 'markAllAsRead'])->name('mark-all-read');
        Route::get('export/excel', [AdmissionController::class, 'exportExcel'])->name('export.excel');
        Route::get('export/pdf', [AdmissionController::class, 'exportPdf'])->name('export.pdf');
        Route::get('{admission}', [AdmissionController::class, 'headOfficeShow'])->name('show');
        Route::patch('{admission}/mark-read', [AdmissionController::class, 'markAsRead'])->name('mark-read');

        // Issue management
        Route::post('{admission}/detect-issues', [AdmissionController::class, 'detectIssues'])->name('detect-issues');
        Route::get('{admission}/issues', [AdmissionController::class, 'getAdmissionIssues'])->name('issues');
        Route::post('issue/{issue}/message', [AdmissionController::class, 'addIssueMessage'])->name('issue.message');
        Route::patch('issue/{issue}/resolve', [AdmissionController::class, 'resolveIssue'])->name('issue.resolve');
        Route::patch('issue/{issue}/reject', [AdmissionController::class, 'rejectIssue'])->name('issue.reject');
        Route::post('{admission}/approve-all', [AdmissionController::class, 'approveAllMembers'])->name('approve-all');
    });

    // Issue Processing Workflow - Only for Head Office
    Route::prefix('issue-processing')->name('issue-processing.')->middleware('head.office')->group(function () {
        Route::get('/', [IssueProcessingController::class, 'index'])->name('index');
        Route::get('stats', [IssueProcessingController::class, 'getStats'])->name('stats');
        Route::get('member/{memberId}/issues', [IssueProcessingController::class, 'getMemberIssues'])->name('member.issues');

        // Check, Report, Process, Approve workflow
        Route::get('{type}/{id}/check', [IssueProcessingController::class, 'checkApplication'])->name('check');
        Route::get('{type}/{id}/report', [IssueProcessingController::class, 'reportIssues'])->name('report');
        Route::get('{type}/{id}/process', [IssueProcessingController::class, 'processIssues'])->name('process');
        Route::get('{type}/{id}/approval', [IssueProcessingController::class, 'approvalPage'])->name('approval');
        Route::post('{type}/{id}/approve', [IssueProcessingController::class, 'approve'])->name('approve');

        // Batch submission
        Route::post('submit-batch', [IssueProcessingController::class, 'submitBatch'])->name('submit-batch');

        // Single member actions
        Route::post('reject-member', [IssueProcessingController::class, 'rejectMember'])->name('reject-member');
        Route::post('approve-member', [IssueProcessingController::class, 'approveMember'])->name('approve-member');

        // Issue actions
        Route::post('issue/{issue}/comment', [IssueProcessingController::class, 'addComment'])->name('issue.comment');
        Route::patch('issue/{issue}/resolve', [IssueProcessingController::class, 'resolveIssue'])->name('issue.resolve');
        Route::patch('issue/{issue}/reject', [IssueProcessingController::class, 'rejectIssue'])->name('issue.reject');

        // API: Live refresh routes
        Route::get('members', [IssueProcessingController::class, 'getUpdatedMembers'])->name('api.members');
        Route::get('application/{id}/issues', [IssueProcessingController::class, 'getUpdatedIssues'])->name('api.application.issues');
    });

    // Member Admission Routes - Only for Branch Users
    Route::prefix('admissions')->name('admissions.')->middleware('branch.user')->group(function () {
        Route::get('/', [AdmissionController::class, 'index'])->name('index');
        Route::get('create', [AdmissionController::class, 'create'])->name('create');
        Route::post('/', [AdmissionController::class, 'store'])->name('store');
        Route::post('analyze-excel', [AdmissionController::class, 'analyzeExcel'])->name('analyze-excel');
        Route::get('template/download', [AdmissionController::class, 'downloadTemplate'])->name('template.download');
        Route::patch('{admission}/submit', [AdmissionController::class, 'submit'])->name('submit');
        // Show page removed - list view has built-in detail panel
        // Route::get('{admission}', [AdmissionController::class, 'show'])->name('show');

        // API Routes for date grouping and status tracking
        Route::get('api/by-date', [AdmissionController::class, 'getAdmissionsByDate'])->name('api.by-date');
        Route::get('api/data', [AdmissionController::class, 'getUpdatedData'])->name('api.data');
        Route::get('api/member/{member}/review-status', [AdmissionController::class, 'getMemberWithReviewStatus'])->name('api.member.review-status');

        // Branch issue response routes
        Route::post('member/{member}/resolve-issue', [AdmissionController::class, 'memberResolveIssue'])->name('member.resolve-issue');
        Route::post('member/{member}/reject-issue', [AdmissionController::class, 'memberRejectIssue'])->name('member.reject-issue');
    });

    // Head Office Admission Review Routes
    Route::prefix('head-office/admissions')->name('head-office.admissions.')->middleware('head.office')->group(function () {
        Route::get('submissions', [AdmissionController::class, 'headOfficeSubmissions'])->name('submissions');
        Route::get('{admission}', [AdmissionController::class, 'headOfficeShow'])->name('show');
        Route::get('{admission}/detail', [AdmissionController::class, 'headOfficeAdmissionDetail'])->name('detail');
        Route::get('member/{member}/review', [AdmissionController::class, 'headOfficeMemberReviewPage'])->name('member.review');

        // Member review actions
        Route::post('member/{member}/approve', [AdmissionController::class, 'headOfficeApproveMember'])->name('member.approve');
        Route::post('member/{member}/request-correction', [AdmissionController::class, 'headOfficeRequestCorrection'])->name('member.request-correction');
        Route::post('member/{member}/reject', [AdmissionController::class, 'headOfficeRejectMember'])->name('member.reject');
    });

    // Loan Application Routes - Only for Branch Users (not SuperAdmin/Head Office)
    Route::prefix('loan')->name('loan.')->middleware('branch.user')->group(function () {
        Route::get('/', [LoanApplicationController::class, 'index'])->name('index');
        Route::get('upload', [LoanApplicationController::class, 'create'])->name('create');
        Route::get('test-upload', function () {
            return Inertia::render('Loan/test-upload');
        })->name('test-upload');
        Route::post('test-analyze', [LoanApplicationController::class, 'testAnalyze'])->name('test-analyze');
        Route::post('/', [LoanApplicationController::class, 'store'])->name('store');
        Route::get('template/download', [LoanApplicationController::class, 'downloadTemplate'])->name('template.download');
        Route::get('{loanApplication}', [LoanApplicationController::class, 'show'])->name('show');

        // API Routes for date grouping and status tracking
        Route::get('api/data', [LoanApplicationController::class, 'getUpdatedData'])->name('api.data');

        // Branch issue response routes
        Route::post('member/{member}/resolve-issue', [LoanApplicationController::class, 'memberResolveIssue'])->name('member.resolve-issue');
        Route::post('member/{member}/reject-issue', [LoanApplicationController::class, 'memberRejectIssue'])->name('member.reject-issue');
    });
});require __DIR__.'/settings.php';

