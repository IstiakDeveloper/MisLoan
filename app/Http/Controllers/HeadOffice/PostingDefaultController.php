<?php

namespace App\Http\Controllers\HeadOffice;

use App\Http\Controllers\Controller;
use App\Models\GlPostingDefault;
use App\Models\LedgerAccount;
use App\Models\LoanProduct;
use App\Models\Role;
use App\Models\SavingsProduct;
use App\Services\Accounting\PostingDefaults;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PostingDefaultController extends Controller
{
    public function __construct(private readonly PostingDefaults $service) {}

    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Accounting/PostingDefaults', [
            'accounts' => LedgerAccount::query()
                ->where('is_active', true)
                ->orderBy('code')
                ->get(['id', 'code', 'name', 'type']),
            'defaults' => GlPostingDefault::query()
                ->with(['ledgerAccount:id,code,name,type', 'updatedByUser:id,name'])
                ->orderBy('scope')
                ->orderBy('event_key')
                ->get(),
            'eventKeys' => PostingDefaults::EVENT_KEYS,
            'loanProducts' => LoanProduct::query()->orderBy('product_name')->get(['id', 'product_name as name', 'product_code as code']),
            'savingsProducts' => SavingsProduct::query()->orderBy('product_name')->get(['id', 'product_name as name', 'product_code as code']),
            'canManage' => $this->canManage($user),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        abort_unless($this->canManage($request->user()), 403);

        $data = $request->validate([
            'scope' => 'required|in:global,loan_product,savings_product,branch',
            'product_id' => 'nullable|integer',
            'event_key' => 'required|string|max:64',
            'ledger_account_id' => 'required|exists:ledger_accounts,id',
        ]);

        $this->service->setDefault(
            $data['scope'],
            isset($data['product_id']) ? (int) $data['product_id'] : null,
            $data['event_key'],
            (int) $data['ledger_account_id'],
            (int) $request->user()->id
        );

        return back()->with('success', 'GL Posting Default সফলভাবে সংরক্ষণ করা হয়েছে।');
    }

    private function canManage($user): bool
    {
        $role = $user?->role?->name;

        return (bool) ($user?->has_all_access || in_array($role, [Role::SUPER_ADMIN, Role::HEAD_OFFICE], true));
    }
}
