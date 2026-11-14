<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;

class MatchBankStatementRequest extends FormRequest
{
    public function authorize(): bool
    {
        $line = DB::table('bank_statement_lines')->find($this->route('line'));
        $user = $this->user();

        return $line && $user && $user->canPostBranchCash((int) $line->branch_id);
    }

    public function rules(): array
    {
        return [
            'journal_line_id' => ['required', 'integer', 'exists:journal_lines,id'],
        ];
    }
}
