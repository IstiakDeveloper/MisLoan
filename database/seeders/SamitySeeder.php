<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Samity;
use Illuminate\Database\Seeder;

class SamitySeeder extends Seeder
{
    public function run(): void
    {
        $path = base_path('public/samity.json');

        if (! file_exists($path)) {
            $this->command?->error("Samity JSON file not found at {$path}.");
            return;
        }

        $json = file_get_contents($path);
        $data = json_decode($json, true);

        if (! is_array($data)) {
            $this->command?->error('Samity JSON data could not be decoded.');
            return;
        }

        $created = 0;
        $skippedExisting = 0;
        $skippedMissingBranch = 0;

        foreach ($data as $branchData) {
            $branchCode = $branchData['branch_code'] ?? null;

            if (! $branchCode) {
                continue;
            }

            $branch = Branch::where('code', $branchCode)->first();

            if (! $branch) {
                $this->command?->warn("Branch not found for code {$branchCode}; skipping its samities.");
                $skippedMissingBranch++;
                continue;
            }

            foreach ($branchData['samities'] ?? [] as $samityData) {
                $rawCode = $samityData['samity_code'] ?? null;

                if (! $rawCode) {
                    continue;
                }

                // Make samity_code globally unique by prefixing with branch code.
                $samityCode = $branchCode . $rawCode;

                if (Samity::where('samity_code', $samityCode)->exists()) {
                    $skippedExisting++;
                    continue;
                }

                Samity::create([
                    'branch_id' => $branch->id,
                    'samity_code' => $samityCode,
                    'samity_name' => $samityData['samity_name'] ?? '',
                    'samity_name_bn' => null,
                    'description' => $samityData['address'] ?? null,
                    'is_active' => true,
                ]);

                $created++;
            }
        }

        $this->command?->info("Samities: {$created} created, {$skippedExisting} existing skipped, {$skippedMissingBranch} branches missing.");
    }
}

