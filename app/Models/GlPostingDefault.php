<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GlPostingDefault extends Model
{
    public const SCOPE_GLOBAL = 'global';

    public const SCOPE_LOAN_PRODUCT = 'loan_product';

    public const SCOPE_SAVINGS_PRODUCT = 'savings_product';

    public const SCOPE_BRANCH = 'branch';

    protected $fillable = [
        'scope',
        'product_id',
        'event_key',
        'ledger_account_id',
        'updated_by',
    ];

    public function ledgerAccount(): BelongsTo
    {
        return $this->belongsTo(LedgerAccount::class);
    }

    public function updatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
