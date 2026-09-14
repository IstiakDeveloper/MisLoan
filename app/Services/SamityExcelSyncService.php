<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Samity;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use PhpOffice\PhpSpreadsheet\IOFactory;

class SamityExcelSyncService
{
    /**
     * @var array<string, string>
     */
    private const HEADER_ALIASES = [
        'samitycode' => 'samity_code',
        'branchcode' => 'branch_code',
        'branchname' => 'branch_name',
        'samityname' => 'samity_name',
        'samitynamebangla' => 'samity_name_bn',
        'samitynamebn' => 'samity_name_bn',
        'samityaddress' => 'description',
        'description' => 'description',
        'address' => 'description',
        'centerstatus' => 'status',
        'status' => 'status',
    ];

    /**
     * @return array{
     *     created: int,
     *     name_updated: int,
     *     code_updated: int,
     *     unchanged: int,
     *     skipped: int,
     *     conflicts: int,
     *     total_rows: int,
     *     errors: list<string>
     * }
     */
    public function sync(string $path, bool $dryRun = false): array
    {
        if (! is_file($path)) {
            throw new InvalidArgumentException("Excel file not found: {$path}");
        }

        $result = [
            'created' => 0,
            'name_updated' => 0,
            'code_updated' => 0,
            'unchanged' => 0,
            'skipped' => 0,
            'conflicts' => 0,
            'total_rows' => 0,
            'errors' => [],
        ];

        $rows = $this->loadRows($path);
        if ($rows === []) {
            return $result;
        }

        $headerRowNumber = (int) array_key_first($rows);
        $columnMap = $this->mapColumns($rows[$headerRowNumber] ?? []);
        unset($rows[$headerRowNumber]);

        $apply = function () use ($rows, $columnMap, $dryRun, &$result): void {
            $this->applyRows($rows, $columnMap, $dryRun, $result);
        };

        if ($dryRun) {
            $apply();
        } else {
            DB::transaction($apply);
        }

        return $result;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function loadRows(string $path): array
    {
        $spreadsheet = IOFactory::load($path);
        $sheet = $spreadsheet->getActiveSheet();

        /** @var array<int, array<string, mixed>> $rows */
        $rows = $sheet->toArray(null, true, true, true);

        return $rows;
    }

    /**
     * @param  array<string, mixed>  $headerRow
     * @return array<string, string>
     */
    private function mapColumns(array $headerRow): array
    {
        $map = [];

        foreach ($headerRow as $column => $header) {
            $alias = self::HEADER_ALIASES[$this->normalizeHeader($header)] ?? null;
            if ($alias !== null && ! isset($map[$alias])) {
                $map[$alias] = (string) $column;
            }
        }

        if (isset($map['samity_code'], $map['branch_code'], $map['samity_name'])) {
            return $map;
        }

        return [
            'branch_code' => 'A',
            'branch_name' => 'B',
            'samity_code' => 'C',
            'samity_name' => 'D',
            'samity_name_bn' => 'E',
            'description' => 'F',
            'status' => 'G',
        ];
    }

    private function normalizeHeader(mixed $header): string
    {
        $value = strtolower(trim($this->cellString($header)));

        return preg_replace('/[^a-z0-9]+/', '', $value) ?? '';
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array<string, string>  $columnMap
     * @param  array{
     *     created: int,
     *     name_updated: int,
     *     code_updated: int,
     *     unchanged: int,
     *     skipped: int,
     *     conflicts: int,
     *     total_rows: int,
     *     errors: list<string>
     * }  $result
     */
    private function applyRows(array $rows, array $columnMap, bool $dryRun, array &$result): void
    {
        $branchesByCode = $this->branchIndex();
        [$byCode, $byName] = $this->samityIndexes();
        $claimedIds = [];
        $dryRunId = 0;

        foreach ($rows as $rowNumber => $row) {
            $branchCodeRaw = $this->value($row, $columnMap, 'branch_code');
            $samityCodeRaw = $this->value($row, $columnMap, 'samity_code');
            $samityName = $this->value($row, $columnMap, 'samity_name');
            $samityNameBn = $this->value($row, $columnMap, 'samity_name_bn');
            $description = $this->value($row, $columnMap, 'description');

            if ($branchCodeRaw === '' && $samityCodeRaw === '' && $samityName === '') {
                continue;
            }

            $result['total_rows']++;

            $fullCode = MemberCodeService::formatFullSamityCode($branchCodeRaw, $samityCodeRaw);

            if ($fullCode === '') {
                $result['skipped']++;
                $result['errors'][] = MemberCodeService::formatSamitySuffix($branchCodeRaw) === ''
                    ? "Row {$rowNumber}: Branch code is missing."
                    : "Row {$rowNumber}: Samity code is missing.";

                continue;
            }

            $paddedBranchCode = substr($fullCode, 0, 4);

            if ($samityName === '') {
                $result['skipped']++;
                $result['errors'][] = "Row {$rowNumber}: Samity name is missing.";

                continue;
            }

            $branch = $branchesByCode[$paddedBranchCode] ?? null;
            if (! $branch) {
                $result['skipped']++;
                $result['errors'][] = "Row {$rowNumber}: Branch '{$paddedBranchCode}' not found.";

                continue;
            }

            $existingByCode = $byCode[$fullCode] ?? null;
            if ($existingByCode && ! isset($claimedIds[$existingByCode->id])) {
                $this->claim($claimedIds, $existingByCode);

                if ($existingByCode->samity_name === $samityName) {
                    $result['unchanged']++;

                    continue;
                }

                $existingByCode->samity_name = $samityName;
                if (! $dryRun) {
                    $existingByCode->save();
                }

                $result['name_updated']++;

                continue;
            }

            if ($existingByCode && isset($claimedIds[$existingByCode->id])) {
                $result['skipped']++;
                $result['errors'][] = "Row {$rowNumber}: Duplicate Excel code {$fullCode}.";

                continue;
            }

            $nameMatch = $this->firstUnclaimedNameMatch($byName, $branch->id, $samityName, $claimedIds);
            if ($nameMatch) {
                if (isset($byCode[$fullCode]) && (int) $byCode[$fullCode]->id !== (int) $nameMatch->id) {
                    $result['conflicts']++;
                    $result['errors'][] = "Row {$rowNumber}: Name '{$samityName}' matches samity {$nameMatch->samity_code} but code {$fullCode} belongs to another samity.";

                    continue;
                }

                $this->claim($claimedIds, $nameMatch);

                if ($nameMatch->samity_code === $fullCode) {
                    $result['unchanged']++;

                    continue;
                }

                $oldCode = $nameMatch->samity_code;
                $nameMatch->samity_code = $fullCode;
                unset($byCode[$oldCode]);
                $byCode[$fullCode] = $nameMatch;

                if (! $dryRun) {
                    $nameMatch->save();
                }

                $result['code_updated']++;

                continue;
            }

            $samity = new Samity([
                'branch_id' => $branch->id,
                'samity_code' => $fullCode,
                'samity_name' => $samityName,
                'samity_name_bn' => $samityNameBn !== '' ? $samityNameBn : null,
                'description' => $description !== '' ? $description : null,
                'is_active' => true,
            ]);

            if ($dryRun) {
                $dryRunId--;
                $samity->id = $dryRunId;
            } else {
                $samity->save();
            }

            $this->claim($claimedIds, $samity);
            $byCode[$fullCode] = $samity;
            $this->indexByName($byName, $samity);
            $result['created']++;
        }
    }

    /**
     * @return array<string, Branch>
     */
    private function branchIndex(): array
    {
        $index = [];

        foreach (Branch::query()->get() as $branch) {
            $digits = preg_replace('/\D/', '', MemberCodeService::toEnglishDigits((string) $branch->code)) ?? '';
            if ($digits === '') {
                continue;
            }

            $index[MemberCodeService::formatBranchCode($branch->code)] = $branch;
        }

        return $index;
    }

    /**
     * @return array{0: array<string, Samity>, 1: array<int, array<string, list<Samity>>>}
     */
    private function samityIndexes(): array
    {
        $byCode = [];
        $byName = [];

        foreach (Samity::query()->orderBy('id')->get() as $samity) {
            $byCode[$samity->samity_code] = $samity;
            $this->indexByName($byName, $samity);
        }

        return [$byCode, $byName];
    }

    /**
     * @param  array<int, array<string, list<Samity>>>  $byName
     */
    private function indexByName(array &$byName, Samity $samity): void
    {
        foreach ([$samity->samity_name, $samity->samity_name_bn] as $name) {
            $key = $this->normalizeName((string) $name);
            if ($key === '') {
                continue;
            }

            $byName[$samity->branch_id][$key][] = $samity;
        }
    }

    /**
     * @param  array<int, array<string, list<Samity>>>  $byName
     * @param  array<int, true>  $claimedIds
     */
    private function firstUnclaimedNameMatch(array $byName, int $branchId, string $samityName, array $claimedIds): ?Samity
    {
        $key = $this->normalizeName($samityName);
        if ($key === '') {
            return null;
        }

        foreach ($byName[$branchId][$key] ?? [] as $candidate) {
            if (! isset($claimedIds[$candidate->id])) {
                return $candidate;
            }
        }

        return null;
    }

    /**
     * @param  array<int, true>  $claimedIds
     */
    private function claim(array &$claimedIds, Samity $samity): void
    {
        $claimedIds[(int) $samity->id] = true;
    }

    /**
     * @param  array<string, mixed>  $row
     * @param  array<string, string>  $columnMap
     */
    private function value(array $row, array $columnMap, string $field): string
    {
        $column = $columnMap[$field] ?? null;
        if ($column === null) {
            return '';
        }

        return $this->cellString($row[$column] ?? null);
    }

    private function cellString(mixed $value): string
    {
        if ($value === null) {
            return '';
        }

        if (is_bool($value)) {
            return $value ? '1' : '0';
        }

        if (is_float($value) && floor($value) === $value) {
            return (string) (int) $value;
        }

        if (is_int($value)) {
            return (string) $value;
        }

        return trim((string) $value);
    }

    private function normalizeName(string $name): string
    {
        $name = trim($name);
        $name = preg_replace('/\s+/u', ' ', $name) ?? $name;

        return mb_strtolower($name, 'UTF-8');
    }
}
