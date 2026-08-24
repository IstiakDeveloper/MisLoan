<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImageCompressionService
{
    public const DISK = 'public';

    public const PHOTO_MAX_WIDTH = 800;

    public const DOCUMENT_MAX_WIDTH = 1280;

    public const SIGNATURE_MAX_WIDTH = 1000;

    public const AVATAR_MAX_WIDTH = 400;

    public const PHOTO_MAX_BYTES = 150_000;

    public const DOCUMENT_MAX_BYTES = 250_000;

    public const SIGNATURE_MAX_BYTES = 120_000;

    public const AVATAR_MAX_BYTES = 80_000;

    /**
     * Compress an uploaded image to JPEG and store it on the public disk.
     */
    public function compressAndStore(
        UploadedFile $file,
        string $directory,
        int $maxWidth = 1200,
        int $quality = 75,
        int $maxBytes = 200_000,
    ): string|false {
        try {
            $mime = (string) $file->getMimeType();
            $extension = strtolower($file->getClientOriginalExtension() ?: '');

            if (str_contains($mime, 'pdf') || $extension === 'pdf') {
                return $this->storePdf($file, $directory);
            }

            $source = $this->loadImage($file->getPathname());
            if ($source === false) {
                Log::warning('Image compression skipped: could not load image', [
                    'extension' => $extension,
                    'mime' => $mime,
                    'name' => $file->getClientOriginalName(),
                ]);

                return false;
            }

            $resized = $this->resize($source, $maxWidth);
            imagedestroy($source);

            $filename = time().'_'.uniqid().'.jpg';
            $path = trim($directory, '/').'/'.$filename;

            if (! $this->writeJpeg($resized, $path, $quality, $maxBytes)) {
                imagedestroy($resized);

                return false;
            }

            imagedestroy($resized);

            return $path;
        } catch (\Throwable $e) {
            Log::error('Image compression failed: '.$e->getMessage());

            return false;
        }
    }

    /**
     * Compress a passport-style photo.
     */
    public function compressPhoto(UploadedFile $file, string $directory): string|false
    {
        return $this->compressAndStore($file, $directory, self::PHOTO_MAX_WIDTH, 75, self::PHOTO_MAX_BYTES);
    }

    /**
     * Compress an NID / document scan. PDFs are stored as-is.
     */
    public function compressDocument(UploadedFile $file, string $directory): string|false
    {
        return $this->compressAndStore($file, $directory, self::DOCUMENT_MAX_WIDTH, 75, self::DOCUMENT_MAX_BYTES);
    }

    /**
     * Compress a signature image.
     */
    public function compressSignature(UploadedFile $file, string $directory): string|false
    {
        return $this->compressAndStore($file, $directory, self::SIGNATURE_MAX_WIDTH, 70, self::SIGNATURE_MAX_BYTES);
    }

    /**
     * Compress a profile avatar.
     */
    public function compressAvatar(UploadedFile $file, string $directory): string|false
    {
        return $this->compressAndStore($file, $directory, self::AVATAR_MAX_WIDTH, 80, self::AVATAR_MAX_BYTES);
    }

    /**
     * Compress raw image bytes (e.g. a decoded data URL) and store as JPEG.
     */
    public function compressBinary(string $contents, string $directory, string $originalName = 'image.jpg'): string|false
    {
        $tmp = tempnam(sys_get_temp_dir(), 'img');
        if ($tmp === false) {
            return false;
        }

        file_put_contents($tmp, $contents);

        $mime = mime_content_type($tmp) ?: 'image/jpeg';
        $file = new UploadedFile($tmp, $originalName, $mime, null, true);

        try {
            return $this->compressPhoto($file, $directory);
        } finally {
            @unlink($tmp);
        }
    }

    /**
     * Re-compress an already stored public-disk image. Returns the (possibly new) relative path.
     */
    public function compressStoredFile(
        string $relativePath,
        int $maxWidth = 1200,
        int $quality = 75,
        int $maxBytes = 200_000,
    ): string|false {
        $relativePath = ltrim($relativePath, '/');

        if (! Storage::disk(self::DISK)->exists($relativePath)) {
            return false;
        }

        $extension = strtolower(pathinfo($relativePath, PATHINFO_EXTENSION));
        if ($extension === 'pdf') {
            return $relativePath;
        }

        $absolutePath = Storage::disk(self::DISK)->path($relativePath);
        $info = @getimagesize($absolutePath);
        $currentSize = Storage::disk(self::DISK)->size($relativePath);

        if (
            $info !== false
            && in_array($extension, ['jpg', 'jpeg'], true)
            && $info[0] <= $maxWidth
            && $currentSize <= $maxBytes
        ) {
            return $relativePath;
        }

        $source = $this->loadImage($absolutePath);
        if ($source === false) {
            return false;
        }

        $resized = $this->resize($source, $maxWidth);
        imagedestroy($source);

        $directory = trim(dirname($relativePath), '.');
        $stem = pathinfo($relativePath, PATHINFO_FILENAME);
        $newPath = ($directory === '' ? '' : $directory.'/').$stem.'.jpg';

        if ($newPath !== $relativePath && Storage::disk(self::DISK)->exists($newPath)) {
            $newPath = ($directory === '' ? '' : $directory.'/').$stem.'_'.Str::lower(Str::random(6)).'.jpg';
        }

        if (! $this->writeJpeg($resized, $newPath, $quality, $maxBytes)) {
            imagedestroy($resized);

            return false;
        }

        imagedestroy($resized);

        if ($newPath !== $relativePath) {
            Storage::disk(self::DISK)->delete($relativePath);
        }

        return $newPath;
    }

    /**
     * Delete an image file from the public disk.
     */
    public function delete(?string $path): bool
    {
        if ($path && Storage::disk(self::DISK)->exists($path)) {
            return Storage::disk(self::DISK)->delete($path);
        }

        return false;
    }

    /**
     * @return \GdImage|false
     */
    private function loadImage(string $absolutePath): mixed
    {
        if (! is_file($absolutePath)) {
            return false;
        }

        $contents = @file_get_contents($absolutePath);
        if ($contents === false || $contents === '') {
            return false;
        }

        $image = @imagecreatefromstring($contents);
        if ($image !== false) {
            return $image;
        }

        $info = @getimagesize($absolutePath);
        if ($info === false) {
            return false;
        }

        return match ($info[2]) {
            IMAGETYPE_JPEG => @imagecreatefromjpeg($absolutePath),
            IMAGETYPE_PNG => @imagecreatefrompng($absolutePath),
            IMAGETYPE_GIF => @imagecreatefromgif($absolutePath),
            IMAGETYPE_WEBP => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($absolutePath) : false,
            default => false,
        };
    }

    /**
     * @param  \GdImage  $source
     * @return \GdImage
     */
    private function resize(mixed $source, int $maxWidth): mixed
    {
        $originalWidth = imagesx($source);
        $originalHeight = imagesy($source);

        if ($originalWidth <= $maxWidth) {
            $newWidth = $originalWidth;
            $newHeight = $originalHeight;
        } else {
            $newWidth = $maxWidth;
            $newHeight = (int) round(($originalHeight / $originalWidth) * $maxWidth);
        }

        $destination = imagecreatetruecolor($newWidth, $newHeight);
        $white = imagecolorallocate($destination, 255, 255, 255);
        imagefilledrectangle($destination, 0, 0, $newWidth, $newHeight, $white);
        imagecopyresampled($destination, $source, 0, 0, 0, 0, $newWidth, $newHeight, $originalWidth, $originalHeight);

        return $destination;
    }

    /**
     * @param  \GdImage  $image
     */
    private function writeJpeg(mixed $image, string $path, int $quality, int $maxBytes): bool
    {
        $directory = dirname($path);
        if ($directory !== '.' && $directory !== '') {
            Storage::disk(self::DISK)->makeDirectory($directory);
        }

        $fullPath = Storage::disk(self::DISK)->path($path);
        $dir = dirname($fullPath);
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $currentQuality = max(40, min(90, $quality));
        imagejpeg($image, $fullPath, $currentQuality);

        while (is_file($fullPath) && filesize($fullPath) > $maxBytes && $currentQuality > 45) {
            $currentQuality -= 8;
            imagejpeg($image, $fullPath, $currentQuality);
        }

        $width = imagesx($image);
        $height = imagesy($image);

        while (is_file($fullPath) && filesize($fullPath) > $maxBytes && $width > 400) {
            $width = (int) round($width * 0.85);
            $height = (int) round($height * 0.85);
            $smaller = imagecreatetruecolor($width, $height);
            $white = imagecolorallocate($smaller, 255, 255, 255);
            imagefilledrectangle($smaller, 0, 0, $width, $height, $white);
            imagecopyresampled($smaller, $image, 0, 0, 0, 0, $width, $height, imagesx($image), imagesy($image));
            imagejpeg($smaller, $fullPath, $currentQuality);
            imagedestroy($smaller);
        }

        return is_file($fullPath) && filesize($fullPath) > 0;
    }

    private function storePdf(UploadedFile $file, string $directory): string
    {
        $filename = time().'_'.uniqid().'.pdf';
        $path = trim($directory, '/').'/'.$filename;
        Storage::disk(self::DISK)->put($path, file_get_contents($file->getPathname()));

        return $path;
    }
}
