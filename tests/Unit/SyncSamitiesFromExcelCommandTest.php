<?php

use App\Models\Branch;
use App\Models\Samity;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

function createSamityExcelSyncTables(): void
{
    Schema::dropIfExists('samities');
    Schema::dropIfExists('branches');

    Schema::create('branches', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('area_id')->nullable();
        $table->string('name')->default('Test Branch');
        $table->string('code')->nullable();
        $table->boolean('is_active')->default(true);
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('samities', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('branch_id');
        $table->string('samity_code')->unique();
        $table->string('samity_name');
        $table->string('samity_name_bn')->nullable();
        $table->text('description')->nullable();
        $table->boolean('is_active')->default(true);
        $table->timestamps();
    });
}

function makeSamityExcelSyncBranch(string $code = '0001', string $name = 'Naogaon Sadar'): Branch
{
    return Branch::create([
        'name' => $name,
        'code' => $code,
        'is_active' => true,
    ]);
}

/**
 * @param  list<list<mixed>>  $rows
 * @param  list<string>  $headers
 */
function writeSamityExcelSyncFile(array $rows, array $headers = ['SL', 'SamityCode', 'BranchCode', 'SamityName', 'SamityAddress']): string
{
    $path = sys_get_temp_dir().DIRECTORY_SEPARATOR.'samities-sync-'.uniqid('', true).'.xlsx';

    $spreadsheet = new Spreadsheet;
    $sheet = $spreadsheet->getActiveSheet();
    $sheet->fromArray([$headers], null, 'A1');
    $sheet->fromArray($rows, null, 'A2');

    $writer = new Xlsx($spreadsheet);
    $writer->save($path);

    return $path;
}

beforeEach(function () {
    createSamityExcelSyncTables();
});

afterEach(function () {
    foreach (glob(sys_get_temp_dir().DIRECTORY_SEPARATOR.'samities-sync-*.xlsx') ?: [] as $file) {
        @unlink($file);
    }
});

it('pads branch 1 and samity 5 into 00010005 when creating', function () {
    makeSamityExcelSyncBranch();
    $path = writeSamityExcelSyncFile([
        [1, 5, 1, 'Sonali din', 'Ukil Para'],
    ]);

    $this->artisan('samities:sync-from-excel', [
        '--path' => $path,
        '--force' => true,
    ])->assertSuccessful();

    $samity = Samity::query()->sole();

    expect($samity->samity_code)->toBe('00010005')
        ->and($samity->samity_name)->toBe('Sonali din')
        ->and($samity->description)->toBe('Ukil Para')
        ->and($samity->is_active)->toBeTrue();
});

it('updates only the code when the samity name matches', function () {
    $branch = makeSamityExcelSyncBranch();
    Samity::create([
        'branch_id' => $branch->id,
        'samity_code' => '00010099',
        'samity_name' => 'Rupali',
        'samity_name_bn' => 'রুপালী',
        'description' => 'keep me',
        'is_active' => true,
    ]);

    $path = writeSamityExcelSyncFile([
        [1, 3, 1, 'rupali', 'ignored address'],
    ]);

    $this->artisan('samities:sync-from-excel', [
        '--path' => $path,
        '--force' => true,
    ])->assertSuccessful();

    $samity = Samity::query()->sole();

    expect($samity->samity_code)->toBe('00010003')
        ->and($samity->samity_name)->toBe('Rupali')
        ->and($samity->samity_name_bn)->toBe('রুপালী')
        ->and($samity->description)->toBe('keep me');
});

it('updates only the name when the samity code matches', function () {
    $branch = makeSamityExcelSyncBranch();
    Samity::create([
        'branch_id' => $branch->id,
        'samity_code' => '00010005',
        'samity_name' => 'Old Name',
        'samity_name_bn' => 'পুরাতন',
        'description' => 'keep me',
        'is_active' => true,
    ]);

    $path = writeSamityExcelSyncFile([
        [1, 5, 1, 'Sonali din', 'new address'],
    ]);

    $this->artisan('samities:sync-from-excel', [
        '--path' => $path,
        '--force' => true,
    ])->assertSuccessful();

    $samity = Samity::query()->sole();

    expect($samity->samity_code)->toBe('00010005')
        ->and($samity->samity_name)->toBe('Sonali din')
        ->and($samity->samity_name_bn)->toBe('পুরাতন')
        ->and($samity->description)->toBe('keep me');
});

it('creates a samity when neither code nor name matches', function () {
    $branch = makeSamityExcelSyncBranch();
    Samity::create([
        'branch_id' => $branch->id,
        'samity_code' => '00010006',
        'samity_name' => 'Noniya',
        'is_active' => true,
    ]);

    $path = writeSamityExcelSyncFile([
        [1, 5, 1, 'Sonali din', 'Ukil Para'],
    ]);

    $this->artisan('samities:sync-from-excel', [
        '--path' => $path,
        '--force' => true,
    ])->assertSuccessful();

    expect(Samity::query()->count())->toBe(2)
        ->and(Samity::query()->where('samity_code', '00010005')->sole()->samity_name)->toBe('Sonali din')
        ->and(Samity::query()->where('samity_code', '00010006')->sole()->samity_name)->toBe('Noniya');
});

it('skips rows whose branch does not exist', function () {
    makeSamityExcelSyncBranch();
    $path = writeSamityExcelSyncFile([
        [1, 5, 99, 'Ghost Samity', 'Nowhere'],
    ]);

    $this->artisan('samities:sync-from-excel', [
        '--path' => $path,
        '--force' => true,
    ])->assertSuccessful();

    expect(Samity::query()->count())->toBe(0);
});

it('does not persist changes during a dry run', function () {
    makeSamityExcelSyncBranch();
    $path = writeSamityExcelSyncFile([
        [1, 5, 1, 'Sonali din', 'Ukil Para'],
    ]);

    $this->artisan('samities:sync-from-excel', [
        '--path' => $path,
        '--dry-run' => true,
    ])->assertSuccessful();

    expect(Samity::query()->count())->toBe(0);
});

it('does not double-prefix an excel samity code that is already 8 digits', function () {
    makeSamityExcelSyncBranch();
    $path = writeSamityExcelSyncFile([
        [1, '00010005', 1, 'Sonali din', 'Ukil Para'],
    ]);

    $this->artisan('samities:sync-from-excel', [
        '--path' => $path,
        '--force' => true,
    ])->assertSuccessful();

    expect(Samity::query()->sole()->samity_code)->toBe('00010005');
});

it('matches duplicate same-branch names by code on later excel rows', function () {
    $branch = makeSamityExcelSyncBranch();
    Samity::create([
        'branch_id' => $branch->id,
        'samity_code' => '00010006',
        'samity_name' => 'Noniya',
        'is_active' => true,
    ]);
    Samity::create([
        'branch_id' => $branch->id,
        'samity_code' => '00010014',
        'samity_name' => 'Noniya',
        'is_active' => true,
    ]);

    $path = writeSamityExcelSyncFile([
        [1, 6, 1, 'Noniya', 'Addr 1'],
        [2, 14, 1, 'Noniya', 'Addr 2'],
    ]);

    $this->artisan('samities:sync-from-excel', [
        '--path' => $path,
        '--force' => true,
    ])->assertSuccessful();

    expect(Samity::query()->count())->toBe(2)
        ->and(Samity::query()->where('samity_code', '00010006')->sole()->samity_name)->toBe('Noniya')
        ->and(Samity::query()->where('samity_code', '00010014')->sole()->samity_name)->toBe('Noniya');
});

it('prefers matching the code when name and code point at different samities', function () {
    $branch = makeSamityExcelSyncBranch();
    Samity::create([
        'branch_id' => $branch->id,
        'samity_code' => '00010001',
        'samity_name' => 'Foo',
        'is_active' => true,
    ]);
    Samity::create([
        'branch_id' => $branch->id,
        'samity_code' => '00010002',
        'samity_name' => 'Bar',
        'is_active' => true,
    ]);

    $path = writeSamityExcelSyncFile([
        [1, 2, 1, 'Foo', 'Addr'],
    ]);

    $this->artisan('samities:sync-from-excel', [
        '--path' => $path,
        '--force' => true,
    ])->assertSuccessful();

    expect(Samity::query()->where('samity_code', '00010001')->sole()->samity_name)->toBe('Foo')
        ->and(Samity::query()->where('samity_code', '00010002')->sole()->samity_name)->toBe('Foo')
        ->and(Samity::query()->count())->toBe(2);
});

it('reads template-style column headers', function () {
    makeSamityExcelSyncBranch();
    $path = writeSamityExcelSyncFile(
        [['0001', 'Naogaon Sadar', '5', 'Sonali din', 'সোনালী দিন', 'Ukil Para', 'Active']],
        ['Branch Code', 'Branch Name', 'Samity Code', 'Samity Name', 'Samity Name (Bangla)', 'Description', 'Status'],
    );

    $this->artisan('samities:sync-from-excel', [
        '--path' => $path,
        '--force' => true,
    ])->assertSuccessful();

    $samity = Samity::query()->sole();

    expect($samity->samity_code)->toBe('00010005')
        ->and($samity->samity_name)->toBe('Sonali din')
        ->and($samity->samity_name_bn)->toBe('সোনালী দিন')
        ->and($samity->description)->toBe('Ukil Para');
});

it('fails when the excel file is missing', function () {
    $this->artisan('samities:sync-from-excel', [
        '--path' => sys_get_temp_dir().DIRECTORY_SEPARATOR.'missing-samities.xlsx',
        '--force' => true,
    ])->assertFailed();
});

it('skips a row that has a name but no samity code', function () {
    makeSamityExcelSyncBranch();
    $path = writeSamityExcelSyncFile([
        [1, '', 1, 'Sonali din', 'Ukil Para'],
    ]);

    $this->artisan('samities:sync-from-excel', [
        '--path' => $path,
        '--force' => true,
    ])->expectsOutputToContain('Samity code is missing.')->assertSuccessful();

    expect(Samity::query()->count())->toBe(0);
});
