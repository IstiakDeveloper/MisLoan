<?php

namespace App\Http\Middleware;

use App\Http\Controllers\Member\CycleRenewalController;
use App\Models\LoanApplication;
use App\Models\MemberAdmission;
use App\Models\MemberLoanCycle;
use App\Services\CycleRenewalService;
use App\Services\LoanApplicationCloneService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

/** Only managed cycle applications participate; normal loan requests pass through. */
class PreserveCycleLoanContext
{
    public function handle(Request $request, Closure $next)
    {
        if (! Schema::hasTable('member_loan_cycles')) {
            return $next($request);
        }
        $id = (int) ($request->input('application_id') ?: $request->route('id'));
        $cycle = $id > 0 ? MemberLoanCycle::where('loan_id', $id)->first() : null;
        if (! $cycle) {
            return $next($request);
        }
        app(CycleRenewalController::class)->authorizeCycle($request, $cycle, ! $request->isMethod('GET'));
        if ($request->isMethod('GET')) {
            // Cycle view/print owns historical snapshots, avoiding GET-time prefill.
            if ($request->routeIs('member.loan-applications.show') && ! $request->boolean('workflow') && (in_array($cycle->loan?->status, ['draft', 'rejected', 'needs_correction'], true) || $cycle->state === 'closed')) {
                return redirect()->route('member.cycle-hub.cycle-view', ['admission' => $cycle->admission_id, 'loan_id' => $cycle->loan_id]);
            }
            if ($request->routeIs('member.loan-applications.print')) {
                return redirect()->route('member.cycle-hub.renewals.print', ['cycle' => $cycle->id, ...($request->filled('form') ? ['form' => $request->integer('form')] : [])]);
            }
            $formRoutes = [
                'loan-agreement' => 1, 'guarantor-commitment' => 2, 'death-risk-fund' => 3,
                'field-investigation' => 4, 'loan-application-approval' => 5,
            ];
            foreach ($formRoutes as $route => $form) {
                if ($request->routeIs('member.loan-applications.forms.'.$route)) {
                    return redirect()->route('member.cycle-hub.renewals.form', ['cycle' => $cycle->id, 'form' => $form, ...$request->only(['resume_approval_id', 'action', 'return', 'step'])]);
                }
            }

            return $this->readCycleWithoutHydration($request, $next);
        }

        return DB::transaction(function () use ($request, $next, $cycle) {
            MemberAdmission::whereKey($cycle->master_admission_id)->lockForUpdate()->firstOrFail();
            $cycle = MemberLoanCycle::whereKey($cycle->id)->lockForUpdate()->firstOrFail();
            $loan = $cycle->loan()->lockForUpdate()->firstOrFail();
            if ($request->isMethod('DELETE')) {
                abort_if($cycle->submitted_snapshot || ! $loan->isDraft(), 422, 'জমা দেওয়া দফার ফাইল মুছে ফেলা যাবে না।');
            }
            abort_if($request->routeIs('member.loan-applications.update-member-code', 'member.loan-applications.update-samity'), 422, 'নতুন দফায় সদস্য নম্বর ও সমিতি অপরিবর্তিত থাকবে।');
            if ($request->routeIs('member.loan-applications.forms.*') || $request->routeIs('member.loan-applications.submit')) {
                abort_unless($request->integer('cycle_revision') === $cycle->revision, 409, 'এই দফার তথ্য বদলেছে। পেজ রিফ্রেশ করে আবার চেষ্টা করুন।');
                try {
                    app(CycleRenewalService::class)->assertLoanAvailable($cycle, $loan->loanProduct, (int) $loan->loan_category_id);
                } catch (ValidationException $e) {
                    abort(422, collect($e->errors())->flatten()->first());
                }
            }
            if ($request->routeIs('member.loan-applications.forms.*')) {
                foreach (['member_id' => $cycle->admission_id, 'loan_product_id' => $loan->loan_product_id, 'loan_category_id' => $loan->loan_category_id] as $field => $expected) {
                    if ($request->has($field)) {
                        abort_unless((int) $request->input($field) === (int) $expected, 409, 'এই দফার ঋণ নির্বাচন বদলেছে। পেজ রিফ্রেশ করুন।');
                    }
                }
                if ($request->has('requested_amount')) {
                    $allowedAmounts = [(float) $loan->requested_amount];
                    if ((float) $loan->approved_amount > 0) {
                        $allowedAmounts[] = (float) $loan->approved_amount;
                    }
                    abort_unless(in_array((float) $request->input('requested_amount'), $allowedAmounts, true), 409, 'ঋণের পরিমাণ বদলেছে। পেজ রিফ্রেশ করুন।');
                }
            }
            $response = $next($request);
            $cycle->unsetRelation('loan');
            if ($request->isMethod('DELETE') && ! $cycle->loan) {
                $cycle->update(['state' => 'discarded', 'open_member_id' => null, 'revision' => $cycle->revision + 1]);
            } else {
                app(CycleRenewalService::class)->snapshot($cycle);
            }

            return $response;
        });
    }

    private function readCycleWithoutHydration(Request $request, Closure $next)
    {
        // This override is scoped to an already resolved managed cycle GET.
        $original = app(LoanApplicationCloneService::class);
        app()->instance(LoanApplicationCloneService::class, new class extends LoanApplicationCloneService
        {
            public function cloneAndMerge(LoanApplication $targetLoan, ?LoanApplication $previousLoan = null): bool
            {
                return false;
            }
        });
        try {
            return $next($request);
        } finally {
            app()->instance(LoanApplicationCloneService::class, $original);
        }
    }
}
