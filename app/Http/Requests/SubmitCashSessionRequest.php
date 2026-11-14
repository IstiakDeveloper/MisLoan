<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;

class SubmitCashSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $session = DB::table('cashier_sessions')->find($this->route('session'));
        $user = $this->user();

        return $session && $user && $user->canPostBranchCash((int) $session->branch_id);
    }

    public function rules(): array
    {
        return [
            'counted_cash' => ['required', 'string', 'max:30'],
            'variance_note' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
