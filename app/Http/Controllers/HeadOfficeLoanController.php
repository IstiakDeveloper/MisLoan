<?php

namespace App\Http\Controllers;

use App\Models\LoanApplication;
use App\Models\LoanApplicationIssue;
use Illuminate\Http\Request;
use Inertia\Inertia;

class HeadOfficeLoanController extends Controller
{
    /**
     * List loan applications pending at head office (for processing)
     */
    public function process(Request $request)
    {
        $query = LoanApplication::with([
            'branch.area.zone',
            'loanProduct',
            'loanCategory',
            'memberAdmission',
            'submittedBy',
            'issues' => function ($q) {
                $q->where('status', 'pending')->with('reporter');
            },
        ])
            ->where('status', LoanApplication::STATUS_PENDING_HEAD_OFFICE);

        $date = $request->input('date', now()->toDateString());
        if ($date) {
            $query->whereDate('submitted_at', $date);
        }

        $search = $request->input('search');
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('application_no', 'like', "%{$search}%")
                    ->orWhereHas('memberAdmission', function ($mq) use ($search) {
                        $mq->where('applicant_name_bn', 'like', "%{$search}%")
                            ->orWhere('applicant_name_en', 'like', "%{$search}%")
                            ->orWhere('nid_number', 'like', "%{$search}%")
                            ->orWhere('mobile_number', 'like', "%{$search}%");
                    });
            });
        }

        $loans = $query->orderBy('submitted_at', 'desc')->paginate(20);

        return Inertia::render('HeadOffice/ProcessLoans', [
            'loans' => $loans,
            'filters' => [
                'date' => $date,
                'search' => $search,
            ],
        ]);
    }

    /**
     * Show single loan application for head office
     */
    public function show(LoanApplication $loanApplication)
    {
        $loanApplication->load([
            'branch.area.zone',
            'loanProduct',
            'loanCategory',
            'memberAdmission',
            'submittedBy',
            'approvals.user',
            'issues.reporter',
        ]);

        return Inertia::render('HeadOffice/LoanApplicationShow', [
            'loan' => $loanApplication,
        ]);
    }

    /**
     * Store issue for a loan application
     */
    public function storeIssue(Request $request, LoanApplication $loanApplication)
    {
        $validated = $request->validate([
            'issue_description' => 'required|string|max:2000',
        ]);

        LoanApplicationIssue::create([
            'loan_application_id' => $loanApplication->id,
            'reported_by' => auth()->id(),
            'issue_description' => $validated['issue_description'],
            'status' => 'pending',
        ]);

        return back()->with('success', 'সমস্যা লিপিবদ্ধ হয়েছে।');
    }

    /**
     * Approve loan application (head office)
     */
    public function approveSingle(LoanApplication $loanApplication)
    {
        if ($loanApplication->status !== LoanApplication::STATUS_PENDING_HEAD_OFFICE) {
            return back()->with('error', 'শুধুমাত্র হেড অফিসে প্রেরিত আবেদন অনুমোদন করা যাবে।');
        }

        if ($loanApplication->issues()->where('status', 'pending')->exists()) {
            return back()->with('error', 'পেন্ডিং সমস্যা থাকলে অনুমোদন করা যাবে না।');
        }

        $loanApplication->update([
            'status' => LoanApplication::STATUS_APPROVED,
            'reviewed_at' => now(),
            'reviewed_by' => auth()->id(),
        ]);

        return back()->with('success', 'ঋণ আবেদন অনুমোদিত হয়েছে।');
    }

    /**
     * Reject loan application (head office)
     */
    public function rejectSingle(Request $request, LoanApplication $loanApplication)
    {
        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:2000',
        ]);

        $loanApplication->update([
            'status' => LoanApplication::STATUS_REJECTED,
            'rejection_reason' => $validated['rejection_reason'],
            'reviewed_at' => now(),
            'reviewed_by' => auth()->id(),
        ]);

        return back()->with('success', 'ঋণ আবেদন প্রত্যাখ্যান হয়েছে।');
    }
}
