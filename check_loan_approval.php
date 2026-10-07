<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$loan = App\Models\LoanApplication::with(['approvals', 'loanProduct', 'loanCategory'])->where('application_no', 'LN20261000002')->first();
if (!$loan) {
    echo "Loan not found\n";
    exit;
}
echo "Loan ID: " . $loan->id . "\n";
echo "Application No: " . $loan->application_no . "\n";
echo "Status: " . $loan->status . "\n";
echo "Requested Amount: " . $loan->requested_amount . "\n";
echo "Product: " . $loan->loanProduct?->product_name . " (" . $loan->loanProduct?->installment_type . ")\n";
echo "Category: " . $loan->loanCategory?->category_name . "\n";
echo "Asset Info (Form 4): " . json_encode($loan->asset_info, JSON_UNESCAPED_UNICODE) . "\n";
echo "Approvals count: " . $loan->approvals->count() . "\n";
foreach ($loan->approvals as $ap) {
    echo " - Approval ID: {$ap->id}, User: {$ap->user_id}, Status: {$ap->status}, Action: {$ap->action}, Approved Amount: {$ap->approved_amount}, Comments: {$ap->comments}, Created: {$ap->created_at}\n";
}
