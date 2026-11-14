<?php

namespace App\Services\Policy;

use App\Models\LoanProduct;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

/** Effective-dated product snapshots. Posted contracts keep their own frozen terms. */
final class ProductPolicyVersions
{
    /** @var list<string> */
    public const LOAN_FIELDS = [
        'interest_calculation_type', 'duration_months', 'number_of_installments', 'installment_type',
        'service_charge_per_thousand', 'interest_rate', 'service_charge', 'loan_installment_factor',
        'interest_installment_factor', 'installment_amount_per_thousand', 'last_installment_per_thousand',
    ];

    public function snapshot(User $actor, string $type, int $productId, string $effectiveOn): object
    {
        abort_unless($actor->isFinancialAdministrator(), 403);
        if (! in_array($type, ['loan', 'savings'], true)) {
            $this->fail('Choose a loan or savings product.');
        }
        $table = $type === 'loan' ? 'loan_products' : 'savings_products';
        $product = DB::table($table)->find($productId);
        abort_unless($product, 404);
        $snapshot = json_encode($product, JSON_THROW_ON_ERROR);
        $hash = hash('sha256', $snapshot);
        $existing = DB::table('product_policy_versions')
            ->where('product_type', $type)->where('product_id', $productId)->where('effective_on', $effectiveOn)->first();
        if ($existing) {
            if (! hash_equals($existing->snapshot_hash, $hash)) {
                $this->fail('A different policy is already saved for that effective date.');
            }

            return $existing;
        }
        $id = DB::table('product_policy_versions')->insertGetId([
            'product_type' => $type, 'product_id' => $productId, 'effective_on' => $effectiveOn,
            'snapshot' => $snapshot, 'snapshot_hash' => $hash, 'created_by' => $actor->id,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        return DB::table('product_policy_versions')->find($id);
    }

    public function overlay(LoanProduct $product, string $on): LoanProduct
    {
        if (! Schema::hasTable('product_policy_versions')) {
            return $product;
        }
        $row = DB::table('product_policy_versions')
            ->where('product_type', 'loan')->where('product_id', $product->id)
            ->where('effective_on', '<=', $on)->orderByDesc('effective_on')->first();
        if (! $row) {
            return $product;
        }
        $snapshot = json_decode($row->snapshot, true, 512, JSON_THROW_ON_ERROR);
        $copy = clone $product;
        foreach (self::LOAN_FIELDS as $field) {
            if (array_key_exists($field, $snapshot)) {
                $copy->setAttribute($field, $snapshot[$field]);
            }
        }

        return $copy;
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['product_policy' => $message]);
    }
}
