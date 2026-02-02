<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\OrganizationController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\LoanApplicationController;
use App\Http\Controllers\IssueProcessingController;
use App\Http\Controllers\SamityController;
use App\Http\Controllers\MemberCategoryController;
use App\Http\Controllers\MemberAdmissionController;
use App\Http\Controllers\ApprovalController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\HeadOfficeAdmissionController;

Route::get('/', function () {
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }
    return redirect()->route('login');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Profile Routes
    Route::get('profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::post('profile', [ProfileController::class, 'update'])->name('profile.update');

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

    // Samity Management Routes - Only for SuperAdmin/Head Office
    Route::prefix('samities')->name('samities.')->middleware('head.office')->group(function () {
        Route::get('/', [SamityController::class, 'index'])->name('index');
        Route::get('create', [SamityController::class, 'create'])->name('create');
        Route::post('/', [SamityController::class, 'store'])->name('store');
        Route::get('{samity}/edit', [SamityController::class, 'edit'])->name('edit');
        Route::put('{samity}', [SamityController::class, 'update'])->name('update');
        Route::delete('{samity}', [SamityController::class, 'destroy'])->name('destroy');

        // API Route
        Route::get('branch/{branch}/samities', [SamityController::class, 'getByBranch'])->name('by-branch');
    });

    // Member Category Management Routes - Only for SuperAdmin/Head Office
    Route::prefix('member-categories')->name('member-categories.')->middleware('head.office')->group(function () {
        Route::get('/', [MemberCategoryController::class, 'index'])->name('index');
        Route::get('create', [MemberCategoryController::class, 'create'])->name('create');
        Route::post('/', [MemberCategoryController::class, 'store'])->name('store');
        Route::get('{memberCategory}/edit', [MemberCategoryController::class, 'edit'])->name('edit');
        Route::put('{memberCategory}', [MemberCategoryController::class, 'update'])->name('update');
        Route::delete('{memberCategory}', [MemberCategoryController::class, 'destroy'])->name('destroy');

        // API Route
        Route::get('active', [MemberCategoryController::class, 'getActive'])->name('active');
    });

    // Member Admission Routes - For Branch Users
    Route::prefix('member-admissions')->name('member-admissions.')->middleware('branch.user')->group(function () {
        Route::get('/', [MemberAdmissionController::class, 'index'])->name('index');
        Route::get('create', [MemberAdmissionController::class, 'create'])->name('create');
        Route::post('/', [MemberAdmissionController::class, 'store'])->name('store');
        Route::get('{memberAdmission}', [MemberAdmissionController::class, 'show'])->name('show');
        Route::get('{memberAdmission}/print', [MemberAdmissionController::class, 'printSingle'])->name('print');
        Route::get('{memberAdmission}/edit', [MemberAdmissionController::class, 'edit'])->name('edit');
        Route::put('{memberAdmission}', [MemberAdmissionController::class, 'update'])->name('update');
        Route::delete('{memberAdmission}', [MemberAdmissionController::class, 'destroy'])->name('destroy');
        Route::patch('{memberAdmission}/submit', [MemberAdmissionController::class, 'submit'])->name('submit');
        Route::patch('{memberAdmission}/resubmit', [MemberAdmissionController::class, 'resubmit'])->name('resubmit');
        Route::patch('{memberAdmission}/reject', [MemberAdmissionController::class, 'reject'])->name('reject');
    });

    // Approval Routes - For all authenticated users
    Route::prefix('approvals')->name('approvals.')->middleware('auth')->group(function () {
        Route::get('/', [ApprovalController::class, 'index'])->name('index');
        Route::patch('{approval}/approve', [ApprovalController::class, 'approve'])->name('approve');
        Route::patch('{approval}/reject', [ApprovalController::class, 'reject'])->name('reject');
        Route::patch('{approval}/return-to-branch', [ApprovalController::class, 'returnToBranch'])->name('return-to-branch');
    });

    // Head Office Admission Members Management
    Route::prefix('head-office')->name('head-office.')->middleware('head.office')->group(function () {
        Route::get('admission-members', [HeadOfficeAdmissionController::class, 'index'])->name('admission-members');
        Route::get('admission-members/print', [HeadOfficeAdmissionController::class, 'print'])->name('admission-members.print');
        Route::get('process-admissions', [HeadOfficeAdmissionController::class, 'process'])->name('process-admissions');
        Route::get('admissions/{admission}', [HeadOfficeAdmissionController::class, 'show'])->name('admissions.show');
        Route::get('admissions/{admission}/print', [HeadOfficeAdmissionController::class, 'printSingle'])->name('admissions.print');
        Route::delete('admissions/{admission}', [HeadOfficeAdmissionController::class, 'destroy'])->name('admissions.destroy');
        Route::post('admissions/{admission}/issue', [HeadOfficeAdmissionController::class, 'storeIssue'])->name('admissions.issue');
        Route::patch('admissions/{admission}/approve', [HeadOfficeAdmissionController::class, 'approveSingle'])->name('admissions.approve');
        Route::patch('admissions/{admission}/reject', [HeadOfficeAdmissionController::class, 'rejectSingle'])->name('admissions.reject');
        Route::post('admissions/approve-all', [HeadOfficeAdmissionController::class, 'approveAll'])->name('admissions.approve-all');
        Route::delete('issues/{issue}', [HeadOfficeAdmissionController::class, 'deleteIssue'])->name('issues.delete');
    });

    // Loan Submissions Management - Only for SuperAdmin/Head Office
    Route::prefix('submissions')->name('submissions.')->middleware('head.office')->group(function () {
        Route::get('/', [LoanApplicationController::class, 'submissions'])->name('index');
        Route::patch('{loanApplication}/mark-read', [LoanApplicationController::class, 'markAsRead'])->name('mark-read');
        Route::post('mark-all-read', [LoanApplicationController::class, 'markAllAsRead'])->name('mark-all-read');
        Route::get('export/excel', [LoanApplicationController::class, 'exportExcel'])->name('export.excel');
        Route::get('export/pdf', [LoanApplicationController::class, 'exportPdf'])->name('export.pdf');
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

