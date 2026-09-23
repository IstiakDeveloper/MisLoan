<?php

namespace Tests\Unit;

use App\Models\Role;
use App\Models\Setting;
use App\Services\ApprovalService;
use App\Services\LoanWorkflowConfigService;
use App\Support\LoanFormVisibility;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class LoanWorkflowConfigTest extends TestCase
{
    protected LoanWorkflowConfigService $service;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        $this->createTables();
        $this->service = app(LoanWorkflowConfigService::class);
    }

    private function createTables(): void
    {
        Schema::dropIfExists('settings');
        Schema::dropIfExists('roles');

        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('display_name')->nullable();
            $table->timestamps();
        });
    }

    public function test_default_values_are_returned_when_no_setting_in_database(): void
    {
        $this->assertSame(70000.0, $this->service->bmApprovalCeiling());
        $this->assertSame(99000.0, $this->service->sufolonAgreementMax());
        $this->assertSame(20000.0, $this->service->guarantorMinAmount());
        $this->assertSame(70000.0, $this->service->bmInvestigationCeiling());
        $this->assertSame(100000.0, $this->service->monthlyInvestigationMax());

        $this->assertSame(70000.0, LoanFormVisibility::bmCeiling());
        $this->assertSame(99000.0, LoanFormVisibility::sufolonAgreementMax());
        $this->assertSame(20000.0, LoanFormVisibility::guarantorMinAmount());
    }

    public function test_updating_settings_changes_values_dynamically(): void
    {
        $this->service->update([
            'bm_approval_ceiling' => 50000,
            'sufolon_agreement_max' => 80000,
            'guarantor_min_amount' => 30000,
            'bm_investigation_ceiling' => 50000,
            'monthly_investigation_max' => 120000,
            'role_ceilings' => [
                Role::AREA_MANAGER => 150000,
                Role::ZONE_MANAGER => 300000,
            ],
        ]);

        $this->assertSame(50000.0, $this->service->bmApprovalCeiling());
        $this->assertSame(80000.0, $this->service->sufolonAgreementMax());
        $this->assertSame(30000.0, $this->service->guarantorMinAmount());
        $this->assertSame(150000.0, $this->service->roleCeiling(Role::AREA_MANAGER));
        $this->assertSame(300000.0, $this->service->roleCeiling(Role::ZONE_MANAGER));
        $this->assertNull($this->service->roleCeiling(Role::ED));

        // Form visibility reflects new thresholds
        $this->assertSame(50000.0, LoanFormVisibility::bmCeiling());
        $this->assertSame(80000.0, LoanFormVisibility::sufolonAgreementMax());
        $this->assertSame(30000.0, LoanFormVisibility::guarantorMinAmount());

        // A loan of 25,000 does NOT require guarantor form when threshold is 30,000
        $this->assertFalse(LoanFormVisibility::requiresGuarantorForm(25000.0));
        $this->assertSame([3], LoanFormVisibility::disburseFormIds(25000.0));

        // A loan of 30,000 DOES require guarantor form
        $this->assertTrue(LoanFormVisibility::requiresGuarantorForm(30000.0));
        $this->assertSame([2, 3], LoanFormVisibility::disburseFormIds(30000.0));
    }

    public function test_reset_to_defaults_restores_hardcoded_values(): void
    {
        $this->service->update([
            'bm_approval_ceiling' => 40000,
            'guarantor_min_amount' => 50000,
        ]);

        $this->assertSame(40000.0, $this->service->bmApprovalCeiling());

        $this->service->resetToDefaults();

        $this->assertSame(70000.0, $this->service->bmApprovalCeiling());
        $this->assertSame(20000.0, $this->service->guarantorMinAmount());
        $this->assertSame(70000.0, LoanFormVisibility::bmCeiling());
    }

    public function test_approval_service_uses_dynamic_ceiling(): void
    {
        $approvalService = app(ApprovalService::class);
        $this->assertSame(70000.0, $approvalService->bmApprovalCeiling());

        $this->service->update([
            'bm_approval_ceiling' => 85000,
        ]);

        $this->assertSame(85000.0, $approvalService->bmApprovalCeiling());
    }
}
