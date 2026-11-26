<?php

namespace App\Http\Controllers\HeadOffice;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Role;
use App\Services\Migration\LegacyBalanceImportService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LegacyImportController extends Controller
{
    public function __construct(private readonly LegacyBalanceImportService $importer) {}

    public function index(Request $request): Response
    {
        return Inertia::render('HeadOffice/LegacyImport', [
            'branches' => Branch::operational()->orderedByCode()->get(['id', 'name', 'code']),
            'canManage' => $this->canManage($request->user()),
        ]);
    }

    public function downloadTemplate(): StreamedResponse
    {
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="legacy-opening-balances-template.csv"',
        ];

        return response()->stream(function () {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['type (loan|savings)', 'member_code', 'product_code', 'opening_balance', 'remaining_installments', 'next_due_date (YYYY-MM-DD)']);
            fputcsv($out, ['loan', 'M001', 'JAG', '10000.00', '20', '2026-12-01']);
            fputcsv($out, ['savings', 'M001', 'GS', '2500.00', '', '']);
            fclose($out);
        }, 200, $headers);
    }

    public function import(Request $request): RedirectResponse
    {
        abort_unless($this->canManage($request->user()), 403);

        $data = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'initial_date' => 'required|date',
            'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:10240',
        ]);

        $res = $this->importer->importFile(
            (int) $data['branch_id'],
            $request->file('file')->getRealPath(),
            $data['initial_date'],
            (int) $request->user()->id
        );

        $msg = "ইমপোর্ট সম্পন্ন: {$res['loans_imported']}টি লোন ও {$res['savings_imported']}টি সঞ্চয় অ্যাকাউন্ট তৈরি হয়েছে।";
        if (! empty($res['skipped'])) {
            $msg .= ' (স্কিপ: '.count($res['skipped']).' সারি)';
        }

        return back()->with('success', $msg);
    }

    private function canManage($user): bool
    {
        $role = $user?->role?->name;

        return (bool) ($user?->has_all_access || in_array($role, [Role::SUPER_ADMIN, Role::HEAD_OFFICE], true));
    }
}
