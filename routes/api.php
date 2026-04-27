<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PublicApi\BranchPublicController;
use App\Http\Controllers\OrganizationController;

// Public endpoints (no auth)
Route::prefix('public')->group(function () {
    Route::get('branches', [BranchPublicController::class, 'index']);
});

// Organization structure API (complete nested hierarchy)
Route::get('organization-structure', [OrganizationController::class, 'organizationStructure']);

