<?php

namespace App\Http\Controllers\HeadOffice;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Services\LoanWorkflowConfigService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LoanWorkflowConfigController extends Controller
{
    public function __construct(
        protected LoanWorkflowConfigService $configService
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $canManage = $user?->has_all_access || $user?->isSuperAdmin() || $user?->isHeadOffice();

        $roleLabels = [
            Role::BRANCH_MANAGER => 'ব্রাঞ্চ ম্যানেজার (Branch Manager)',
            Role::AREA_MANAGER => 'এরিয়া ম্যানেজার (Area Manager)',
            Role::ZONE_MANAGER => 'জোন ম্যানেজার (Zone Manager)',
            Role::ADMF => 'ADMF (Assistant Director Microfinance)',
            Role::DMF => 'DMF (Director Microfinance)',
            Role::ED => 'ED (Executive Director)',
        ];

        return Inertia::render('HeadOffice/LoanWorkflowSettings', [
            'config' => $this->configService->toSharedArray(),
            'roleLabels' => $roleLabels,
            'canManage' => (bool) $canManage,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();
        if (! ($user?->has_all_access || $user?->isSuperAdmin() || $user?->isHeadOffice())) {
            abort(403, 'অননুমোদিত প্রবেশ।');
        }

        $validated = $request->validate([
            'bm_approval_ceiling' => 'required|numeric|min:0',
            'sufolon_agreement_max' => 'required|numeric|min:0',
            'guarantor_min_amount' => 'required|numeric|min:0',
            'bm_investigation_ceiling' => 'required|numeric|min:0',
            'monthly_investigation_max' => 'required|numeric|min:0',
            'weekly_approval_form_min_amount' => 'nullable|numeric|min:0',
            'role_ceilings' => 'nullable|array',
            'role_ceilings.*' => 'nullable|numeric|min:0',
        ], [
            'bm_approval_ceiling.required' => 'ব্রাঞ্চ ম্যানেজার সিলিং দিতে হবে।',
            'sufolon_agreement_max.required' => 'সুফলন চুক্তিপত্র সর্বোচ্চ সীমা দিতে হবে।',
            'guarantor_min_amount.required' => 'জামিনদার অঙ্গীকার ন্যূনতম সীমা দিতে হবে।',
            'bm_investigation_ceiling.required' => 'তদন্ত প্রতিবেদন সিলিং দিতে হবে।',
            'monthly_investigation_max.required' => 'মাসিক তদন্ত প্রতিবেদন সর্বোচ্চ সীমা দিতে হবে।',
        ]);

        $this->configService->update($validated);

        return back()->with('success', 'ঋণ অনুমোদন ও ফরম কনফিগারেশন সফলভাবে আপডেট করা হয়েছে।');
    }

    public function reset(Request $request): RedirectResponse
    {
        $user = $request->user();
        if (! ($user?->has_all_access || $user?->isSuperAdmin() || $user?->isHeadOffice())) {
            abort(403, 'অননুমোদিত প্রবেশ।');
        }

        $this->configService->resetToDefaults();

        return back()->with('success', 'সকল সেটিংস সফলভাবে ডিফল্ট মানে রিসেট করা হয়েছে।');
    }
}
