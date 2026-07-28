<?php

use App\Http\Controllers\Api\HrmSyncController;
use App\Http\Controllers\OrganizationController;
use App\Http\Controllers\PublicApi\BranchPublicController;
use Illuminate\Support\Facades\Route;

// Public endpoints (no auth)
Route::prefix('public')->group(function () {
    Route::get('branches', [BranchPublicController::class, 'index']);
});

// Organization structure API (complete nested hierarchy)
Route::get('organization-structure', [OrganizationController::class, 'organizationStructure']);

// HRM → MisLoan auto sync (Bearer HRM_API_TOKEN)
Route::post('hrm/sync/field-officer', [HrmSyncController::class, 'syncFieldOfficer']);
Route::post('hrm/sync/transfer', [HrmSyncController::class, 'syncTransfer']);
