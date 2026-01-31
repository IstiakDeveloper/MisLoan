<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$selectedDate = '2026-01-20';
$branchId = 2;

echo "App timezone: " . config('app.timezone') . "\n";
echo "Now: " . now() . "\n";
echo "Today: " . now()->toDateString() . "\n\n";

echo "=== Direct Query ===\n";

// Check MemberAdmission first
$admissions = App\Models\MemberAdmission::where('branch_id', $branchId)
    ->whereDate('submitted_at', $selectedDate)
    ->whereNotNull('submitted_at')
    ->get();

echo "MemberAdmissions found: " . $admissions->count() . "\n";
foreach ($admissions as $a) {
    echo "  - ID: {$a->id}, submitted_at: {$a->submitted_at}\n";
}

// Check with whereHas
echo "\n=== whereHas Query ===\n";
$members = App\Models\AdmissionMember::with(['memberAdmission.branch'])
    ->whereHas('memberAdmission', function ($q) use ($branchId, $selectedDate) {
        $q->where('branch_id', $branchId)
          ->whereDate('submitted_at', $selectedDate)
          ->whereNotNull('submitted_at');
    })
    ->get();

echo "Members found: " . $members->count() . "\n";
foreach ($members as $m) {
    echo "  - ID: {$m->id}, Name: {$m->member_name}, Status: {$m->status}\n";
}

// Raw check
echo "\n=== Raw SQL ===\n";
$sql = App\Models\AdmissionMember::with(['memberAdmission.branch'])
    ->whereHas('memberAdmission', function ($q) use ($branchId, $selectedDate) {
        $q->where('branch_id', $branchId)
          ->whereDate('submitted_at', $selectedDate)
          ->whereNotNull('submitted_at');
    })
    ->toSql();
echo "SQL: $sql\n";
