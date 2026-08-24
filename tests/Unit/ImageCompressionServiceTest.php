<?php

use App\Services\ImageCompressionService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('public');
});

it('converts a png photo to a small webp image', function () {
    $file = noisyUploadedPng('member.png', 900, 700);
    $extension = ImageCompressionService::outputExtension();

    $path = app(ImageCompressionService::class)->compressPhoto($file, 'admissions/customer_photos');

    expect($path)->toBeString()
        ->and($path)->toStartWith('admissions/customer_photos/')
        ->and($path)->toEndWith('.'.$extension);

    Storage::disk('public')->assertExists($path);
    expect(Storage::disk('public')->size($path))->toBeLessThan(ImageCompressionService::PHOTO_MAX_BYTES);

    $info = getimagesize(Storage::disk('public')->path($path));
    expect($info[0])->toBeLessThanOrEqual(ImageCompressionService::PHOTO_MAX_WIDTH)
        ->and($info[2])->toBe(ImageCompressionService::supportsWebp() ? IMAGETYPE_WEBP : IMAGETYPE_JPEG);
});

it('resizes wide document scans and stores them as webp', function () {
    $file = noisyUploadedPng('nid.png', 2400, 1600);
    $extension = ImageCompressionService::outputExtension();

    $path = app(ImageCompressionService::class)->compressDocument($file, 'admissions/customer_nids');

    expect($path)->toBeString()->toEndWith('.'.$extension);

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

it('recompresses a stored png and replaces it with webp', function () {
    $source = noisyPngPath(1200, 900);
    Storage::disk('public')->put('signatures/users/big.png', file_get_contents($source));
    @unlink($source);

    $extension = ImageCompressionService::outputExtension();
    $newPath = app(ImageCompressionService::class)->compressStoredFile(
        'signatures/users/big.png',
        ImageCompressionService::SIGNATURE_MAX_WIDTH,
        70,
        ImageCompressionService::SIGNATURE_MAX_BYTES,
    );

    expect($newPath)->toBe('signatures/users/big.'.$extension);
    Storage::disk('public')->assertMissing('signatures/users/big.png');
    Storage::disk('public')->assertExists('signatures/users/big.'.$extension);
});

it('converts stored jpegs to webp', function () {
    $image = imagecreatetruecolor(600, 400);
    $white = imagecolorallocate($image, 255, 255, 255);
    imagefilledrectangle($image, 0, 0, 600, 400, $white);
    $tmp = tempnam(sys_get_temp_dir(), 'jpg').'.jpg';
    imagejpeg($image, $tmp, 80);
    imagedestroy($image);

    Storage::disk('public')->put('avatars/users/old.jpg', file_get_contents($tmp));
    @unlink($tmp);

    $extension = ImageCompressionService::outputExtension();
    $path = app(ImageCompressionService::class)->compressStoredFile(
        'avatars/users/old.jpg',
        ImageCompressionService::AVATAR_MAX_WIDTH,
        80,
        ImageCompressionService::AVATAR_MAX_BYTES,
    );

    expect($path)->toBe('avatars/users/old.'.$extension);
    if ($extension === 'webp') {
        Storage::disk('public')->assertMissing('avatars/users/old.jpg');
    }
    Storage::disk('public')->assertExists($path);
});

it('skips webp files that are already within size and dimension limits', function () {
    $image = imagecreatetruecolor(200, 120);
    $white = imagecolorallocate($image, 255, 255, 255);
    imagefilledrectangle($image, 0, 0, 200, 120, $white);
    $tmp = tempnam(sys_get_temp_dir(), 'img').'.'.ImageCompressionService::outputExtension();
    if (ImageCompressionService::supportsWebp()) {
        imagewebp($image, $tmp, 80);
    } else {
        imagejpeg($image, $tmp, 80);
    }
    imagedestroy($image);

    $stored = 'avatars/users/small.'.ImageCompressionService::outputExtension();
    Storage::disk('public')->put($stored, file_get_contents($tmp));
    @unlink($tmp);

    $path = app(ImageCompressionService::class)->compressStoredFile(
        $stored,
        ImageCompressionService::AVATAR_MAX_WIDTH,
        80,
        ImageCompressionService::AVATAR_MAX_BYTES,
    );

    expect($path)->toBe($stored);
});

it('compresses existing public-disk png files via artisan', function () {
    $source = noisyPngPath(1200, 800);
    Storage::disk('public')->put('signatures/users/huge.png', file_get_contents($source));
    @unlink($source);

    $this->artisan('images:compress-existing')->assertSuccessful();

    $extension = ImageCompressionService::outputExtension();
    Storage::disk('public')->assertMissing('signatures/users/huge.png');
    Storage::disk('public')->assertExists('signatures/users/huge.'.$extension);
    expect(Storage::disk('public')->size('signatures/users/huge.'.$extension))
        ->toBeLessThan(ImageCompressionService::SIGNATURE_MAX_BYTES);
});

it('lists stored images during a dry run without writing', function () {
    $source = noisyPngPath(400, 400);
    Storage::disk('public')->put('admissions/customer_photos/keep.png', file_get_contents($source));
    @unlink($source);

    $this->artisan('images:compress-existing', ['--dry-run' => true])->assertSuccessful();

    Storage::disk('public')->assertExists('admissions/customer_photos/keep.png');
    Storage::disk('public')->assertMissing('admissions/customer_photos/keep.'.ImageCompressionService::outputExtension());
});

it('skips already converted webp files when only-unconverted is set', function () {
    $extension = ImageCompressionService::outputExtension();

    $converted = imagecreatetruecolor(200, 120);
    $white = imagecolorallocate($converted, 255, 255, 255);
    imagefilledrectangle($converted, 0, 0, 200, 120, $white);
    $convertedTmp = tempnam(sys_get_temp_dir(), 'img').'.'.$extension;
    if (ImageCompressionService::supportsWebp()) {
        imagewebp($converted, $convertedTmp, 80);
    } else {
        imagejpeg($converted, $convertedTmp, 80);
    }
    imagedestroy($converted);

    $png = noisyPngPath(600, 400);
    Storage::disk('public')->put('signatures/users/done.'.$extension, file_get_contents($convertedTmp));
    Storage::disk('public')->put('signatures/users/pending.png', file_get_contents($png));
    @unlink($convertedTmp);
    @unlink($png);

    $before = Storage::disk('public')->get('signatures/users/done.'.$extension);

    $this->artisan('images:compress-existing', ['--only-unconverted' => true])->assertSuccessful();

    expect(Storage::disk('public')->get('signatures/users/done.'.$extension))->toBe($before);
    Storage::disk('public')->assertMissing('signatures/users/pending.png');
    Storage::disk('public')->assertExists('signatures/users/pending.'.$extension);
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
