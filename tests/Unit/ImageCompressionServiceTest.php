<?php

use App\Services\ImageCompressionService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('public');
});

it('converts a png photo to a small jpeg', function () {
    $file = noisyUploadedPng('member.png', 900, 700);

    $path = app(ImageCompressionService::class)->compressPhoto($file, 'admissions/customer_photos');

    expect($path)->toBeString()
        ->and($path)->toStartWith('admissions/customer_photos/')
        ->and($path)->toEndWith('.jpg');

    Storage::disk('public')->assertExists($path);
    expect(Storage::disk('public')->size($path))->toBeLessThan(ImageCompressionService::PHOTO_MAX_BYTES);

    $info = getimagesize(Storage::disk('public')->path($path));
    expect($info[0])->toBeLessThanOrEqual(ImageCompressionService::PHOTO_MAX_WIDTH)
        ->and($info[2])->toBe(IMAGETYPE_JPEG);
});

it('resizes wide document scans and stores them as jpeg', function () {
    $file = noisyUploadedPng('nid.png', 2400, 1600);

    $path = app(ImageCompressionService::class)->compressDocument($file, 'admissions/customer_nids');

    expect($path)->toBeString()->toEndWith('.jpg');

    $info = getimagesize(Storage::disk('public')->path($path));
    expect($info[0])->toBe(ImageCompressionService::DOCUMENT_MAX_WIDTH)
        ->and(Storage::disk('public')->size($path))->toBeLessThan(ImageCompressionService::DOCUMENT_MAX_BYTES);
});

it('stores pdf documents without converting them', function () {
    $tmp = tempnam(sys_get_temp_dir(), 'pdf').'.pdf';
    file_put_contents($tmp, '%PDF-1.4 test');
    $file = new UploadedFile($tmp, 'nid.pdf', 'application/pdf', null, true);

    $path = app(ImageCompressionService::class)->compressDocument($file, 'admissions/customer_nids');

    expect($path)->toEndWith('.pdf');
    Storage::disk('public')->assertExists($path);
    expect(Storage::disk('public')->get($path))->toStartWith('%PDF');
});

it('recompresses a stored png and replaces it with jpeg', function () {
    $source = noisyPngPath(1200, 900);
    Storage::disk('public')->put('signatures/users/big.png', file_get_contents($source));
    @unlink($source);

    $newPath = app(ImageCompressionService::class)->compressStoredFile(
        'signatures/users/big.png',
        ImageCompressionService::SIGNATURE_MAX_WIDTH,
        70,
        ImageCompressionService::SIGNATURE_MAX_BYTES,
    );

    expect($newPath)->toBe('signatures/users/big.jpg');
    Storage::disk('public')->assertMissing('signatures/users/big.png');
    Storage::disk('public')->assertExists('signatures/users/big.jpg');
});

it('skips jpegs that are already within size and dimension limits', function () {
    $image = imagecreatetruecolor(200, 120);
    $white = imagecolorallocate($image, 255, 255, 255);
    imagefilledrectangle($image, 0, 0, 200, 120, $white);
    $tmp = tempnam(sys_get_temp_dir(), 'jpg').'.jpg';
    imagejpeg($image, $tmp, 80);
    imagedestroy($image);

    Storage::disk('public')->put('avatars/users/small.jpg', file_get_contents($tmp));
    @unlink($tmp);

    $path = app(ImageCompressionService::class)->compressStoredFile(
        'avatars/users/small.jpg',
        ImageCompressionService::AVATAR_MAX_WIDTH,
        80,
        ImageCompressionService::AVATAR_MAX_BYTES,
    );

    expect($path)->toBe('avatars/users/small.jpg');
});

it('compresses existing public-disk png files via artisan', function () {
    $source = noisyPngPath(1200, 800);
    Storage::disk('public')->put('signatures/users/huge.png', file_get_contents($source));
    @unlink($source);

    $this->artisan('images:compress-existing')->assertSuccessful();

    Storage::disk('public')->assertMissing('signatures/users/huge.png');
    Storage::disk('public')->assertExists('signatures/users/huge.jpg');
    expect(Storage::disk('public')->size('signatures/users/huge.jpg'))
        ->toBeLessThan(ImageCompressionService::SIGNATURE_MAX_BYTES);
});

it('lists stored images during a dry run without writing', function () {
    $source = noisyPngPath(400, 400);
    Storage::disk('public')->put('admissions/customer_photos/keep.png', file_get_contents($source));
    @unlink($source);

    $this->artisan('images:compress-existing', ['--dry-run' => true])->assertSuccessful();

    Storage::disk('public')->assertExists('admissions/customer_photos/keep.png');
    Storage::disk('public')->assertMissing('admissions/customer_photos/keep.jpg');
});

function noisyPngPath(int $width, int $height): string
{
    $image = imagecreatetruecolor($width, $height);

    for ($y = 0; $y < $height; $y += 40) {
        for ($x = 0; $x < $width; $x += 40) {
            $color = imagecolorallocate($image, ($x * 3) % 255, ($y * 5) % 255, ($x + $y) % 255);
            imagefilledrectangle($image, $x, $y, $x + 40, $y + 40, $color);
        }
    }

    $path = sys_get_temp_dir().DIRECTORY_SEPARATOR.uniqid('png', true).'.png';
    imagepng($image, $path);
    imagedestroy($image);

    return $path;
}

function noisyUploadedPng(string $name, int $width, int $height): UploadedFile
{
    $path = noisyPngPath($width, $height);

    return new UploadedFile($path, $name, 'image/png', null, true);
}
