<?php

namespace App\Http\Controllers\HeadOffice;

use App\Http\Controllers\Controller;
use App\Http\Requests\HeadOffice\UpdateHoSendCutoffRequest;
use App\Services\HoSendCutoffService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class HoSendCutoffController extends Controller
{
    public function __construct(
        protected HoSendCutoffService $cutoffService
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('HeadOffice/SendCutoff', [
            'cutoff' => $this->cutoffService->toSharedArray(),
            'canManage' => $user?->has_all_access || $user?->isSuperAdmin() || $user?->isHeadOffice(),
        ]);
    }

    public function update(UpdateHoSendCutoffRequest $request): RedirectResponse
    {
        $this->cutoffService->update($request->validated('cutoff_time'));

        return back()->with('success', 'হেড অফিসে পাঠানোর সময়সীমা আপডেট হয়েছে।');
    }
}
