<?php

namespace App\Services\Policy;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Saved institution rules. Missing values never invent a posting. */
final class InstitutionPolicy
{
    public function row(): object
    {
        $row = DB::table('institution_policies')->orderBy('id')->first();
        if ($row) {
            return $row;
        }

        return (object) [
            'id' => null,
            'partial_priority' => null,
            'rebate_bps' => null,
            'rebate_expense_account_id' => null,
            'write_off_expense_account_id' => null,
            'savings_profit_bps' => null,
            'savings_profit_expense_account_id' => null,
            'reschedule_enabled' => false,
        ];
    }

    /** @param  array<string, mixed>  $input */
    public function save(User $actor, array $input): object
    {
        abort_unless($actor->isFinancialAdministrator(), 403);
        $payload = [
            'partial_priority' => $input['partial_priority'] ?? null,
            'write_off_expense_account_id' => $this->optionalAccount($input['write_off_expense_account_id'] ?? null, 'expense'),
            'reschedule_enabled' => (bool) ($input['reschedule_enabled'] ?? false),
            'updated_by' => $actor->id,
            'updated_at' => now(),
        ];
        if ($payload['partial_priority'] !== null && ! in_array($payload['partial_priority'], ['principal_first', 'charge_first'], true)) {
            $this->fail('Choose a saved allocation order.');
        }
        $existing = DB::table('institution_policies')->orderBy('id')->first();
        if ($existing) {
            DB::table('institution_policies')->where('id', $existing->id)->update($payload);

            return DB::table('institution_policies')->find($existing->id);
        }
        $id = DB::table('institution_policies')->insertGetId([...$payload, 'created_at' => now()]);

        return DB::table('institution_policies')->find($id);
    }

    /** @return array{principal_paisa: int, charge_paisa: int}|null */
    public function split(int $paid, int $principalLeft, int $chargeLeft): ?array
    {
        $priority = $this->row()->partial_priority;
        if (! in_array($priority, ['principal_first', 'charge_first'], true)) {
            return null;
        }
        if ($paid <= 0) {
            $this->fail('Enter a positive amount.');
        }
        $firstLeft = $priority === 'principal_first' ? $principalLeft : $chargeLeft;
        $secondLeft = $priority === 'principal_first' ? $chargeLeft : $principalLeft;
        $first = min($paid, max(0, $firstLeft));
        $second = min($paid - $first, max(0, $secondLeft));
        if ($paid - $first - $second > 0) {
            $this->fail('The amount is larger than the outstanding principal and service charge.');
        }
        if ($priority === 'principal_first') {
            return ['principal_paisa' => $first, 'charge_paisa' => $second];
        }

        return ['principal_paisa' => $second, 'charge_paisa' => $first];
    }

    private function optionalAccount(mixed $id, string $type): ?int
    {
        if ($id === null || $id === '') {
            return null;
        }
        $account = DB::table('ledger_accounts')->find((int) $id);
        if (! $account || ! $account->is_active || $account->type !== $type) {
            $this->fail('Select an active '.$type.' account.');
        }

        return (int) $id;
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['institution_policy' => $message]);
    }
}
