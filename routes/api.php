<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PublicApi\BranchPublicController;

// Public endpoints (no auth)
Route::prefix('public')->group(function () {
    Route::get('branches', [BranchPublicController::class, 'index']);
});

