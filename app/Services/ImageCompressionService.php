<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class ImageCompressionService
{
    /**
     * Compress and store an image using native GD library
     *
     * @param UploadedFile $file
     * @param string $directory
     * @param int $maxWidth Maximum width (default: 1200px)
     * @param int $quality Compression quality (default: 75)
     * @return string|false The stored file path or false on failure
     */
    public function compressAndStore(UploadedFile $file, string $directory, int $maxWidth = 1200, int $quality = 75)
    {
        try {
            $extension = strtolower($file->getClientOriginalExtension());

            // Generate unique filename
            $filename = time() . '_' . uniqid() . '.' . $extension;
            $path = $directory . '/' . $filename;
            $fullPath = storage_path('app/public/' . $path);

            // Create directory if not exists
            $dir = dirname($fullPath);
            if (!file_exists($dir)) {
                mkdir($dir, 0755, true);
            }

            // Load image based on type
            $source = null;
            switch ($extension) {
                case 'jpg':
                case 'jpeg':
                    $source = imagecreatefromjpeg($file->getPathname());
                    break;
                case 'png':
                    $source = imagecreatefrompng($file->getPathname());
                    break;
                case 'gif':
                    $source = imagecreatefromgif($file->getPathname());
                    break;
                default:
                    return false;
            }

            if (!$source) {
                return false;
            }

            // Get original dimensions
            $originalWidth = imagesx($source);
            $originalHeight = imagesy($source);

            // Calculate new dimensions
            if ($originalWidth > $maxWidth) {
                $newWidth = $maxWidth;
                $newHeight = intval(($originalHeight / $originalWidth) * $maxWidth);
            } else {
                $newWidth = $originalWidth;
                $newHeight = $originalHeight;
            }

            // Create new image
            $destination = imagecreatetruecolor($newWidth, $newHeight);

            // Preserve transparency for PNG and GIF
            if ($extension === 'png' || $extension === 'gif') {
                imagealphablending($destination, false);
                imagesavealpha($destination, true);
                $transparent = imagecolorallocatealpha($destination, 255, 255, 255, 127);
                imagefilledrectangle($destination, 0, 0, $newWidth, $newHeight, $transparent);
            }

            // Resize
            imagecopyresampled($destination, $source, 0, 0, 0, 0, $newWidth, $newHeight, $originalWidth, $originalHeight);

            // Save compressed image
            switch ($extension) {
                case 'jpg':
                case 'jpeg':
                    imagejpeg($destination, $fullPath, $quality);
                    break;
                case 'png':
                    // PNG quality is 0-9 (9 = no compression, 0 = max compression)
                    $pngQuality = intval((100 - $quality) / 11);
                    imagepng($destination, $fullPath, $pngQuality);
                    break;
                case 'gif':
                    imagegif($destination, $fullPath);
                    break;
            }

            // Free memory
            imagedestroy($source);
            imagedestroy($destination);

            return $path;
        } catch (\Exception $e) {
            \Log::error('Image compression failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Compress and store photo with specific settings for passport-size photos
     *
     * @param UploadedFile $file
     * @param string $directory
     * @return string|false
     */
    public function compressPhoto(UploadedFile $file, string $directory)
    {
        return $this->compressAndStore($file, $directory, 800, 80);
    }

    /**
     * Compress and store NID/document with higher quality
     *
     * @param UploadedFile $file
     * @param string $directory
     * @return string|false
     */
    public function compressDocument(UploadedFile $file, string $directory)
    {
        // For PDF files, just store without compression
        if ($file->getClientOriginalExtension() === 'pdf') {
            $filename = time() . '_' . uniqid() . '.pdf';
            $path = $directory . '/' . $filename;
            Storage::disk('public')->put($path, file_get_contents($file));
            return $path;
        }

        // For images, compress with higher quality
        return $this->compressAndStore($file, $directory, 1600, 85);
    }

    /**
     * Delete an image file
     *
     * @param string|null $path
     * @return bool
     */
    public function delete(?string $path): bool
    {
        if ($path && Storage::disk('public')->exists($path)) {
            return Storage::disk('public')->delete($path);
        }
        return false;
    }
}
