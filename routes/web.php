<?php

use App\Http\Controllers\ApprovalController;
use App\Http\Controllers\ClusterHandoverController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\HeadOffice\CsoDutyRosterController;
use App\Http\Controllers\HeadOffice\HoSendCutoffController;
use App\Http\Controllers\HeadOfficeAdmissionController;
use App\Http\Controllers\HeadOfficeLoanController;
use App\Http\Controllers\HeadOfficeSavingsController;
use App\Http\Controllers\HeadOfficeTeamBasedApprovalController;
use App\Http\Controllers\HeadOfficeVerificationController;
use App\Http\Controllers\IssueProcessingController;
use App\Http\Controllers\LoanApplicationController;
use App\Http\Controllers\LoanCategoryController;
use App\Http\Controllers\LoanProductController;
use App\Http\Controllers\MaintenanceController;
use App\Http\Controllers\Member\SavingsApplicationController;
use App\Http\Controllers\MemberAdmissionController;
use App\Http\Controllers\MemberCategoryController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OrganizationController;
use App\Http\Controllers\PortfolioHandoverController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SamityController;
use App\Http\Controllers\SavingsProductController;
use App\Http\Controllers\TeamBasedApprovalController;
use App\Http\Controllers\TeamBasedApprovalPrintController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Home: unauthenticated → login; authenticated → dashboard (no Inertia, plain redirect)
Route::get('/', function () {
    if (auth()->check()) {
        return Redirect::route('dashboard', [], 302);
    }

    return Redirect::route('login', [], 302);
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Portfolio handover (allowed while locked; middleware whitelists these routes)
    Route::get('portfolio-handover', [PortfolioHandoverController::class, 'index'])->name('portfolio-handover.index');
    Route::post('portfolio-handover', [PortfolioHandoverController::class, 'store'])->name('portfolio-handover.store');

    Route::get('cluster-handover', [ClusterHandoverController::class, 'index'])->name('cluster-handover.index');
    Route::post('cluster-handover', [ClusterHandoverController::class, 'store'])->name('cluster-handover.store');

    Route::post('admin/maintenance/toggle', [MaintenanceController::class, 'toggle'])->name('admin.maintenance.toggle');

    // Profile completion (before using app if phone/pin/signature missing)
    Route::get('profile/complete', [ProfileController::class, 'complete'])->name('profile.complete');
    Route::post('profile/complete', [ProfileController::class, 'completeStore'])->name('profile.complete.store');

    // Profile Routes
    Route::get('profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::post('profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::put('profile/password', [ProfileController::class, 'updatePassword'])
        ->middleware('throttle:6,1')
        ->name('profile.password.update');

    Route::prefix('notifications')->name('notifications.')->middleware('auth')->group(function () {
        Route::get('/', [NotificationController::class, 'index'])->name('index');
        Route::get('{notification}', [NotificationController::class, 'show'])->name('show');
        Route::patch('{notification}/read', [NotificationController::class, 'markAsRead'])->name('read');
        Route::post('mark-all-read', [NotificationController::class, 'markAllRead'])->name('mark-all-read');
    });

    // Organization Management Routes - Only for SuperAdmin/Head Office
    Route::prefix('organizations')->name('organizations.')->middleware('head.office')->group(function () {
        Route::get('/', [OrganizationController::class, 'index'])->name('index');
        Route::post('sync-from-hrm', [OrganizationController::class, 'syncFromHrm'])->name('sync-from-hrm');

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
        Route::get('branches/print', [OrganizationController::class, 'branchesPrint'])->name('branches.print');

        // API Routes for cascading dropdowns
        Route::get('zones/{zone}/areas', [OrganizationController::class, 'getAreasByZone'])->name('zones.areas');
        Route::get('areas/{area}/branches', [OrganizationController::class, 'getBranchesByArea'])->name('areas.branches');
        Route::get('zones/{zone}/branches', [OrganizationController::class, 'getBranchesByZone'])->name('zones.branches');
    });

    // Role Management Routes - Only for SuperAdmin/Head Office
    Route::middleware('head.office')->group(function () {
        Route::get('roles', [RoleController::class, 'index'])->name('roles.index');
        Route::post('roles', [RoleController::class, 'store'])->name('roles.store');
        Route::post('roles/sync', [RoleController::class, 'sync'])->name('roles.sync');
        Route::put('roles/{role}', [RoleController::class, 'update'])->name('roles.update');
        Route::delete('roles/{role}', [RoleController::class, 'destroy'])->name('roles.destroy');
    });

    // User Management Routes - Only for SuperAdmin/Head Office
    Route::middleware('head.office')->group(function () {
        Route::get('users', [UserController::class, 'index'])->name('users.index');
        Route::post('users/sync-from-hrm', [UserController::class, 'syncFromHrm'])->name('users.sync-from-hrm');
        Route::post('users', [UserController::class, 'store'])->name('users.store');
        Route::put('users/{user}', [UserController::class, 'update'])->name('users.update');
        Route::post('users/{user}/signature', [UserController::class, 'updateSignature'])->name('users.update-signature');
        Route::delete('users/{user}', [UserController::class, 'destroy'])->name('users.destroy');
        Route::patch('users/{user}/toggle-status', [UserController::class, 'toggleStatus'])->name('users.toggle-status');
        Route::post('users/{user}/reset-password', [UserController::class, 'resetPassword'])->name('users.reset-password');
        Route::post('users/{user}/send-credentials', [UserController::class, 'sendCredentials'])->name('users.send-credentials');
        Route::post('users/send-credentials-all', [UserController::class, 'sendCredentialsToAll'])->name('users.send-credentials-all');
        Route::post('users/send-branch-summary', [UserController::class, 'sendBranchSummary'])->name('users.send-branch-summary');
    });

    // Samity Management Routes - Only for SuperAdmin/Head Office
    Route::prefix('samities')->name('samities.')->middleware('head.office')->group(function () {
        Route::get('/', [SamityController::class, 'index'])->name('index');
        Route::get('export', [SamityController::class, 'exportExcel'])->name('export');
        Route::get('template', [SamityController::class, 'downloadTemplate'])->name('template');
        Route::post('import', [SamityController::class, 'importExcel'])->name('import');
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

    // Loan Category Management Routes - Only for SuperAdmin/Head Office
    Route::prefix('loan-categories')->name('loan-categories.')->middleware('head.office')->group(function () {
        Route::get('/', [LoanCategoryController::class, 'index'])->name('index');
        Route::post('/', [LoanCategoryController::class, 'store'])->name('store');
        Route::put('{loanCategory}', [LoanCategoryController::class, 'update'])->name('update');
        Route::delete('{loanCategory}', [LoanCategoryController::class, 'destroy'])->name('destroy');
        Route::patch('{loanCategory}/toggle-status', [LoanCategoryController::class, 'toggleStatus'])->name('toggle-status');
    });

    // Loan Product Management Routes - Only for SuperAdmin/Head Office
    Route::prefix('loan-products')->name('loan-products.')->middleware('head.office')->group(function () {
        Route::get('/', [LoanProductController::class, 'index'])->name('index');
        Route::get('export', [LoanProductController::class, 'exportExcel'])->name('export');
        Route::get('template', [LoanProductController::class, 'downloadTemplate'])->name('template');
        Route::post('import', [LoanProductController::class, 'importExcel'])->name('import');
        Route::post('/', [LoanProductController::class, 'store'])->name('store');
        Route::put('{loanProduct}', [LoanProductController::class, 'update'])->name('update');
        Route::delete('{loanProduct}', [LoanProductController::class, 'destroy'])->name('destroy');
        Route::patch('{loanProduct}/toggle-status', [LoanProductController::class, 'toggleStatus'])->name('toggle-status');
    });

    // Savings Product Management Routes - Only for SuperAdmin/Head Office
    Route::prefix('savings-products')->name('savings-products.')->middleware('head.office')->group(function () {
        Route::get('/', [SavingsProductController::class, 'index'])->name('index');
        Route::get('export', [SavingsProductController::class, 'exportExcel'])->name('export');
        Route::get('template', [SavingsProductController::class, 'downloadTemplate'])->name('template');
        Route::post('import', [SavingsProductController::class, 'importExcel'])->name('import');
        Route::post('/', [SavingsProductController::class, 'store'])->name('store');
        Route::put('{savingsProduct}', [SavingsProductController::class, 'update'])->name('update');
        Route::delete('{savingsProduct}', [SavingsProductController::class, 'destroy'])->name('destroy');
        Route::patch('{savingsProduct}/toggle-status', [SavingsProductController::class, 'toggleStatus'])->name('toggle-status');
    });

    // Member Admission Routes - For Branch Users + Approvers (show/print)
    Route::prefix('member-admissions')->name('member-admissions.')->group(function () {
        Route::get('/', [MemberAdmissionController::class, 'index'])->name('index')->middleware('branch.user');
        Route::get('export/excel', [MemberAdmissionController::class, 'exportExcel'])->name('export.excel')->middleware('branch.user');
        Route::get('create', [MemberAdmissionController::class, 'create'])->name('create')->middleware('branch.user');
        Route::get('check-unique', [MemberAdmissionController::class, 'checkUnique'])->name('check-unique')->middleware('branch.user');
        Route::post('/', [MemberAdmissionController::class, 'store'])->name('store')->middleware('branch.user');
        Route::post('send-to-head-office-bulk', [MemberAdmissionController::class, 'sendToHeadOfficeBulk'])->name('send-to-head-office-bulk')->middleware('branch.user');
        Route::get('{memberAdmission}', [MemberAdmissionController::class, 'show'])->name('show')->middleware('member.admission.view');
        Route::get('{memberAdmission}/print', [MemberAdmissionController::class, 'printSingle'])->name('print')->middleware('member.admission.view');
        Route::get('{memberAdmission}/edit', [MemberAdmissionController::class, 'edit'])->name('edit')->middleware('member.admission.view');
        Route::put('{memberAdmission}', [MemberAdmissionController::class, 'update'])->name('update')->middleware('member.admission.view');
        Route::delete('{memberAdmission}', [MemberAdmissionController::class, 'destroy'])->name('destroy')->middleware('branch.user');
        Route::patch('{memberAdmission}/submit', [MemberAdmissionController::class, 'submit'])->name('submit')->middleware('branch.user');
        Route::patch('{memberAdmission}/resubmit', [MemberAdmissionController::class, 'resubmit'])->name('resubmit')->middleware('branch.user');
        Route::patch('{memberAdmission}/send-to-head-office', [MemberAdmissionController::class, 'sendToHeadOffice'])->name('send-to-head-office')->middleware('branch.user');
        Route::patch('{memberAdmission}/reject', [MemberAdmissionController::class, 'reject'])->name('reject')->middleware('branch.user');
        Route::patch('{memberAdmission}/update-member-code', [MemberAdmissionController::class, 'updateMemberCode'])->name('update-member-code');
    });

    // Team Based Approval Routes - Branch users + Approver roles
    Route::prefix('team-based-approvals')->name('team-based-approvals.')->middleware('auth')->group(function () {
        // Branch-side: all applications + drafts + form
        Route::get('/', [TeamBasedApprovalController::class, 'index'])->name('index');
        Route::get('drafts', [TeamBasedApprovalController::class, 'drafts'])->name('drafts');
        Route::get('create', [TeamBasedApprovalController::class, 'create'])->name('create');
        Route::post('save-draft', [TeamBasedApprovalController::class, 'saveDraft'])->name('save-draft');
        Route::get('{teamBasedApproval}/edit', [TeamBasedApprovalController::class, 'edit'])->name('edit');
        Route::put('{teamBasedApproval}', [TeamBasedApprovalController::class, 'updateDraft'])->name('update');
        Route::delete('{teamBasedApproval}', [TeamBasedApprovalController::class, 'destroy'])->name('destroy');
        Route::post('{teamBasedApproval}/submit', [TeamBasedApprovalController::class, 'submit'])->name('submit');

        // Approver-side: list & decision
        Route::get('for-approver', [TeamBasedApprovalController::class, 'approverIndex'])->name('approver-index');
        Route::get('block-list/verify', [TeamBasedApprovalController::class, 'verifyBlockList'])->name('block-list.verify');
        Route::post('reviews/clear-history', [TeamBasedApprovalController::class, 'clearReviewHistory'])->name('reviews.clear-history');
        Route::post('reviews/{review}/decide', [TeamBasedApprovalController::class, 'decide'])->name('reviews.decide');
        Route::post('reviews/{review}/update-item', [TeamBasedApprovalController::class, 'updateItem'])->name('reviews.update-item');
        Route::post('{teamBasedApproval}/forward', [TeamBasedApprovalController::class, 'forward'])->name('forward');

        // Shared print view
        Route::get('export/items', [TeamBasedApprovalController::class, 'exportItems'])->name('export.items');
        Route::get('for-approver/export', [TeamBasedApprovalController::class, 'exportApproverItems'])->name('approver-export');
        Route::get('{teamBasedApproval}/print', [TeamBasedApprovalPrintController::class, 'show'])->name('print');
    });

    // Verification & Inquiries - For all authenticated users (branch users, approvers, head office)
    Route::prefix('verifications')->name('verifications.')->middleware('auth')->group(function () {
        Route::get('/', [HeadOfficeVerificationController::class, 'index'])->name('index');
        Route::post('admissions/{admission}/approve', [HeadOfficeVerificationController::class, 'approveAdmission'])->name('admissions.approve');
        Route::post('loans/{loanApplication}/approve', [HeadOfficeVerificationController::class, 'approveLoan'])->name('loans.approve');
        Route::post('store-issue', [HeadOfficeVerificationController::class, 'storeIssue'])->name('store-issue');
        Route::post('resolve-issue', [HeadOfficeVerificationController::class, 'resolveIssue'])->name('resolve-issue');
        Route::post('reply-issue', [HeadOfficeVerificationController::class, 'replyIssue'])->name('reply-issue');
        Route::post('zm-approve', [HeadOfficeVerificationController::class, 'approveZmIssue'])->name('zm-approve');
        Route::post('bulk-zm-approve', [HeadOfficeVerificationController::class, 'bulkApproveZm'])->name('bulk-zm-approve');
        Route::post('reject-application', [HeadOfficeVerificationController::class, 'rejectApplication'])->name('reject-application');
    });

    // Approval Routes - For all authenticated users
    Route::prefix('approvals')->name('approvals.')->middleware('auth')->group(function () {
        Route::get('/', [ApprovalController::class, 'index'])->name('index');
        Route::patch('{approval}/approve', [ApprovalController::class, 'approve'])->name('approve');
        Route::patch('{approval}/reject', [ApprovalController::class, 'reject'])->name('reject');
        Route::patch('{approval}/forward', [ApprovalController::class, 'forward'])->name('forward');
        Route::patch('{approval}/return-to-branch', [ApprovalController::class, 'returnToBranch'])->name('return-to-branch');
        Route::patch('loan/{loanApproval}/approve', [ApprovalController::class, 'approveLoan'])->name('loan.approve');
        Route::patch('loan/{loanApproval}/reject', [ApprovalController::class, 'rejectLoan'])->name('loan.reject');
        Route::patch('loan/{loanApproval}/forward', [ApprovalController::class, 'forwardLoan'])->name('loan.forward');
    });

    // Member Loan & Savings Application Routes - For members/branch users
    Route::prefix('member')->name('member.')->middleware('auth')->group(function () {
        // Loan Applications
        Route::prefix('loan-applications')->name('loan-applications.')->group(function () {
            Route::get('/', [App\Http\Controllers\Member\LoanApplicationController::class, 'index'])->name('index');
            Route::get('products', [App\Http\Controllers\Member\LoanApplicationController::class, 'getProducts'])->name('products');
            Route::get('search-members', [App\Http\Controllers\Member\LoanApplicationController::class, 'searchMembers'])->name('search-members');
            Route::get('samities-for-branch', [App\Http\Controllers\Member\LoanApplicationController::class, 'samitiesForBranch'])->name('samities-for-branch');
            Route::post('start-legacy-application', [App\Http\Controllers\Member\LoanApplicationController::class, 'startLegacyApplication'])->name('start-legacy-application');
            Route::get('form-selection', [App\Http\Controllers\Member\LoanApplicationController::class, 'formSelection'])->name('form-selection');

            // Form routes
            Route::prefix('forms')->name('forms.')->group(function () {
                Route::get('loan-agreement', [App\Http\Controllers\Member\LoanApplicationController::class, 'loanAgreement'])->name('loan-agreement');
                Route::post('loan-agreement/save-draft', [App\Http\Controllers\Member\LoanApplicationController::class, 'saveLoanAgreementDraft'])->name('loan-agreement.save-draft');
                Route::get('guarantor-commitment', [App\Http\Controllers\Member\LoanApplicationController::class, 'guarantorCommitment'])->name('guarantor-commitment');
                Route::post('guarantor-commitment/save-draft', [App\Http\Controllers\Member\LoanApplicationController::class, 'saveGuarantorCommitmentDraft'])->name('guarantor-commitment.save-draft');
                Route::get('death-risk-fund', [App\Http\Controllers\Member\LoanApplicationController::class, 'deathRiskFund'])->name('death-risk-fund');
                Route::post('death-risk-fund/save-draft', [App\Http\Controllers\Member\LoanApplicationController::class, 'saveDeathRiskFundDraft'])->name('death-risk-fund.save-draft');
                Route::get('field-investigation', [App\Http\Controllers\Member\LoanApplicationController::class, 'fieldInvestigation'])->name('field-investigation');
                Route::post('field-investigation/save-draft', [App\Http\Controllers\Member\LoanApplicationController::class, 'saveFieldInvestigationDraft'])->name('field-investigation.save-draft');
                Route::get('loan-application-approval', [App\Http\Controllers\Member\LoanApplicationController::class, 'loanApplicationApproval'])->name('loan-application-approval');
                Route::post('loan-application-approval/save-draft', [App\Http\Controllers\Member\LoanApplicationController::class, 'saveLoanApplicationApprovalDraft'])->name('loan-application-approval.save-draft');
            });

            Route::get('create/{productId?}', [App\Http\Controllers\Member\LoanApplicationController::class, 'create'])->name('create');
            Route::get('export/excel', [App\Http\Controllers\Member\LoanApplicationController::class, 'exportExcel'])->name('export.excel');
            Route::post('/', [App\Http\Controllers\Member\LoanApplicationController::class, 'store'])->name('store');
            Route::post('send-to-head-office-bulk', [App\Http\Controllers\Member\LoanApplicationController::class, 'sendToHeadOfficeBulk'])->name('send-to-head-office-bulk');
            Route::get('{id}', [App\Http\Controllers\Member\LoanApplicationController::class, 'show'])->name('show');
            Route::get('{id}/edit', [App\Http\Controllers\Member\LoanApplicationController::class, 'edit'])->name('edit');
            Route::put('{id}', [App\Http\Controllers\Member\LoanApplicationController::class, 'update'])->name('update');
            Route::patch('{id}/submit', [App\Http\Controllers\Member\LoanApplicationController::class, 'submit'])->name('submit');
            Route::patch('{id}/send-to-head-office', [App\Http\Controllers\Member\LoanApplicationController::class, 'sendToHeadOffice'])->name('send-to-head-office');
            Route::patch('{id}/disburse', [App\Http\Controllers\Member\LoanApplicationController::class, 'disburse'])->name('disburse');
            Route::patch('{id}/update-member-code', [App\Http\Controllers\Member\LoanApplicationController::class, 'updateMemberCode'])->name('update-member-code');
            Route::patch('{id}/update-loan-product', [App\Http\Controllers\Member\LoanApplicationController::class, 'updateLoanProduct'])->name('update-loan-product');
            Route::post('{id}/unlock-edit', [App\Http\Controllers\Member\LoanApplicationController::class, 'unlockEdit'])->name('unlock-edit');
            Route::get('{id}/print', [App\Http\Controllers\Member\LoanApplicationController::class, 'print'])->name('print');
            Route::delete('{id}', [App\Http\Controllers\Member\LoanApplicationController::class, 'destroy'])->name('destroy');

            // Issue resolution routes
            Route::post('{applicationId}/issues/{issueId}/resolve', [App\Http\Controllers\Member\LoanApplicationController::class, 'resolveIssue'])->name('issues.resolve');
            Route::post('{applicationId}/issues/{issueId}/reject', [App\Http\Controllers\Member\LoanApplicationController::class, 'rejectIssue'])->name('issues.reject');
        });

        // Savings Applications
        Route::prefix('savings-applications')->name('savings-applications.')->group(function () {
            Route::get('/', [SavingsApplicationController::class, 'index'])->name('index');
            Route::get('search-members', [SavingsApplicationController::class, 'searchMembers'])->name('search-members');
            Route::get('create/{productId}', [SavingsApplicationController::class, 'create'])->name('create');
            Route::post('/', [SavingsApplicationController::class, 'store'])->name('store');
            Route::post('{id}/save-form', [SavingsApplicationController::class, 'saveForm'])->name('save-form');
            Route::get('{id}', [SavingsApplicationController::class, 'show'])->name('show');
            Route::delete('{id}', [SavingsApplicationController::class, 'destroy'])->name('destroy');
            Route::patch('{id}/submit', [SavingsApplicationController::class, 'submit'])->name('submit');
            Route::patch('{id}/approve', [SavingsApplicationController::class, 'approve'])->name('approve');
            Route::patch('{id}/reject', [SavingsApplicationController::class, 'reject'])->name('reject');
        });
    });

    // Head Office Admission Members Management
    Route::prefix('head-office')->name('head-office.')->middleware('head.office')->group(function () {
        Route::get('admission-members', [HeadOfficeAdmissionController::class, 'index'])->name('admission-members');
        Route::get('admission-members/print', [HeadOfficeAdmissionController::class, 'print'])->name('admission-members.print');
        Route::get('admission-members/export', [HeadOfficeAdmissionController::class, 'exportExcel'])->name('admission-members.export');
        Route::post('admission-members/mark-printed', [HeadOfficeAdmissionController::class, 'markAsPrinted'])->name('admission-members.mark-printed');
        Route::get('process-admissions', [HeadOfficeAdmissionController::class, 'process'])->name('process-admissions');
        Route::get('admissions/{admission}', [HeadOfficeAdmissionController::class, 'show'])->name('admissions.show');
        Route::get('admissions/{admission}/print', [HeadOfficeAdmissionController::class, 'printSingle'])->name('admissions.print');
        Route::delete('admissions/bulk', [HeadOfficeAdmissionController::class, 'bulkDestroy'])->name('admissions.bulk-destroy');
        Route::delete('admissions/{admission}', [HeadOfficeAdmissionController::class, 'destroy'])->name('admissions.destroy');
        Route::post('admissions/{admission}/issue', [HeadOfficeAdmissionController::class, 'storeIssue'])->name('admissions.issue');
        Route::patch('admissions/{admission}/approve', [HeadOfficeAdmissionController::class, 'approveSingle'])->name('admissions.approve');
        Route::patch('admissions/{admission}/mark-legacy', [HeadOfficeAdmissionController::class, 'markAsLegacy'])->name('admissions.mark-legacy');
        Route::patch('admissions/{admission}/reset-approval', [HeadOfficeAdmissionController::class, 'resetApproval'])->name('admissions.reset-approval');
        Route::patch('admissions/{admission}/reject', [HeadOfficeAdmissionController::class, 'rejectSingle'])->name('admissions.reject');
        Route::post('admissions/approve-bulk', [HeadOfficeAdmissionController::class, 'approveBulk'])->name('admissions.approve-bulk');
        Route::post('admissions/approve-all', [HeadOfficeAdmissionController::class, 'approveAll'])->name('admissions.approve-all');
        Route::delete('issues/{issue}', [HeadOfficeAdmissionController::class, 'deleteIssue'])->name('issues.delete');

        // Head Office Loan Applications (member form-based loans)
        Route::get('loan-applications', [HeadOfficeLoanController::class, 'index'])->name('loan-applications');
        Route::get('loan-applications/print', [HeadOfficeLoanController::class, 'print'])->name('loan-applications.print');
        Route::get('loan-applications/export', [HeadOfficeLoanController::class, 'exportExcel'])->name('loan-applications.export');
        Route::post('loan-applications/mark-printed', [HeadOfficeLoanController::class, 'markAsPrinted'])->name('loan-applications.mark-printed');
        Route::post('loan-applications/sync-member-codes', [HeadOfficeLoanController::class, 'syncMemberCodes'])->name('loan-applications.sync-member-codes');
        Route::get('process-loans', [HeadOfficeLoanController::class, 'process'])->name('process-loans');
        Route::get('loans/{loanApplication}', [HeadOfficeLoanController::class, 'show'])->name('loans.show');
        Route::post('loans/{loanApplication}/issue', [HeadOfficeLoanController::class, 'storeIssue'])->name('loans.issue');
        Route::patch('loans/{loanApplication}/approve', [HeadOfficeLoanController::class, 'approveSingle'])->name('loans.approve');
        Route::post('loans/approve-bulk', [HeadOfficeLoanController::class, 'approveBulk'])->name('loans.approve-bulk');
        Route::post('loans/approve-all', [HeadOfficeLoanController::class, 'approveAll'])->name('loans.approve-all');
        Route::patch('loans/{loanApplication}/reject', [HeadOfficeLoanController::class, 'rejectSingle'])->name('loans.reject');
        Route::patch('loans/{loanApplication}/reset-approval', [HeadOfficeLoanController::class, 'resetApproval'])->name('loans.reset-approval');
        Route::delete('loans/bulk', [HeadOfficeLoanController::class, 'bulkDestroy'])->name('loans.bulk-destroy');
        Route::delete('loans/{loanApplication}', [HeadOfficeLoanController::class, 'destroy'])->name('loans.destroy');

        // Head Office Savings Applications ( HO approval)
        Route::get('savings-applications', [HeadOfficeSavingsController::class, 'index'])->name('savings-applications');
        Route::get('savings-applications/{id}', [HeadOfficeSavingsController::class, 'show'])->name('savings-applications.show');

        // Head Office Verification & Inquiries
        Route::get('verifications', [HeadOfficeVerificationController::class, 'index'])->name('verifications');
        Route::post('verifications/admissions/{admission}/approve', [HeadOfficeVerificationController::class, 'approveAdmission'])->name('verifications.admissions.approve');
        Route::post('verifications/loans/{loanApplication}/approve', [HeadOfficeVerificationController::class, 'approveLoan'])->name('verifications.loans.approve');
        Route::post('verifications/store-issue', [HeadOfficeVerificationController::class, 'storeIssue'])->name('verifications.store-issue');
        Route::post('verifications/resolve-issue', [HeadOfficeVerificationController::class, 'resolveIssue'])->name('verifications.resolve-issue');
        Route::post('verifications/reply-issue', [HeadOfficeVerificationController::class, 'replyIssue'])->name('verifications.reply-issue');
        Route::post('verifications/zm-approve', [HeadOfficeVerificationController::class, 'approveZmIssue'])->name('verifications.zm-approve');
        Route::post('verifications/bulk-zm-approve', [HeadOfficeVerificationController::class, 'bulkApproveZm'])->name('verifications.bulk-zm-approve');
        Route::post('verifications/reject-application', [HeadOfficeVerificationController::class, 'rejectApplication'])->name('verifications.reject-application');

        // Head Office Team Based Approvals overview + management
        Route::get('team-based-approvals/export', [HeadOfficeTeamBasedApprovalController::class, 'exportItems'])->name('team-based-approvals.export');
        Route::get('team-based-approvals', [HeadOfficeTeamBasedApprovalController::class, 'index'])->name('team-based-approvals');
        Route::get('team-based-approvals/{teamBasedApproval}/edit', [HeadOfficeTeamBasedApprovalController::class, 'edit'])->name('team-based-approvals.edit');
        Route::put('team-based-approvals/{teamBasedApproval}', [HeadOfficeTeamBasedApprovalController::class, 'update'])->name('team-based-approvals.update');
        Route::delete('team-based-approvals/{teamBasedApproval}', [HeadOfficeTeamBasedApprovalController::class, 'destroy'])->name('team-based-approvals.destroy');
        // Single item (row) actions from overview
        Route::delete('team-based-approvals/items/bulk', [HeadOfficeTeamBasedApprovalController::class, 'destroyItems'])->name('team-based-approvals.items.bulk-destroy');
        Route::post('team-based-approvals/items/clear-history', [HeadOfficeTeamBasedApprovalController::class, 'clearItemsReviewHistory'])->name('team-based-approvals.items.clear-history');
        Route::get('team-based-approvals/items/{item}/edit', [HeadOfficeTeamBasedApprovalController::class, 'editItem'])->name('team-based-approvals.items.edit');
        Route::put('team-based-approvals/items/{item}', [HeadOfficeTeamBasedApprovalController::class, 'updateItem'])->name('team-based-approvals.items.update');
        Route::delete('team-based-approvals/items/{item}', [HeadOfficeTeamBasedApprovalController::class, 'destroyItem'])->name('team-based-approvals.items.destroy');

        // CSO Duty Roster (Daily Area Allocation)
        Route::get('cso-duty-roster', [CsoDutyRosterController::class, 'index'])->name('cso-duty-roster');
        Route::post('cso-duty-roster', [CsoDutyRosterController::class, 'save'])->name('cso-duty-roster.save');
        Route::post('cso-duty-roster/reset', [CsoDutyRosterController::class, 'reset'])->name('cso-duty-roster.reset');

        // Branch send-to-HO daily cutoff (default 5:00 PM, configurable)
        Route::get('send-cutoff', [HoSendCutoffController::class, 'index'])->name('send-cutoff');
        Route::put('send-cutoff', [HoSendCutoffController::class, 'update'])->name('send-cutoff.update');
    });

    // Team Based Approval Report - Head Office, SuperAdmin, ED
    Route::get('head-office/team-based-approvals/report', [HeadOfficeTeamBasedApprovalController::class, 'report'])
        ->middleware('team-based.report')
        ->name('head-office.team-based-approvals.report');

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
});

Route::get('/storage-link', function () {
    try {
        Artisan::call('storage:link');

        return response()->json([
            'success' => true,
            'message' => 'Storage link created successfully!',
            'output' => Artisan::output(),
        ]);
    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Failed to create storage link',
            'error' => $e->getMessage(),
        ], 500);
    }
})->name('utility.storage-link');

Route::get('/migrate', function () {
    try {
        Artisan::call('migrate', ['--force' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Migration completed successfully!',
            'output' => Artisan::output(),
        ]);
    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Migration failed',
            'error' => $e->getMessage(),
        ], 500);
    }
})->name('utility.migrate');

Route::get('/clear', function () {
    try {
        $output = [];
        Artisan::call('config:clear');
        $output['config'] = trim(Artisan::output());
        Artisan::call('cache:clear');
        $output['cache'] = trim(Artisan::output());
        Artisan::call('view:clear');
        $output['view'] = trim(Artisan::output());
        Artisan::call('route:clear');
        $output['route'] = trim(Artisan::output());

        return response()->json([
            'success' => true,
            'message' => 'Config, cache, view & route cleared successfully.',
            'output' => $output,
        ]);
    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Clear failed',
            'error' => $e->getMessage(),
        ], 500);
    }
})->name('utility.clear');

require __DIR__.'/settings.php';
