<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/** Cycle documents are immutable copies, never aliases of admission files. */
class CycleDocumentService
{
    private array $copied = [];

    public function copyPayload(array $payload, string $directory, array &$manifest): array
    {
        $this->copied = [];

        return $this->walk($payload, $directory, $manifest);
    }

    private function walk(array $payload, string $directory, array &$manifest): array
    {
        foreach ($payload as $key => $value) {
            if (is_array($value)) {
                $payload[$key] = $this->walk($value, $directory, $manifest);
            } elseif (is_string($value) && preg_match('/(?:photo|image|signature|document|attachment|_path)(?:_url)?$/i', (string) $key)) {
                $payload[$key] = $this->copyPath($value, $directory, $manifest);
            }
        }

        return $payload;
    }

    private function copyPath(string $value, string $directory, array &$manifest): ?string
    {
        if ($value === '' || str_starts_with($value, 'data:')) {
            return $value;
        }
        $path = preg_replace('#^/?storage/#', '', $value);
        // Names and signatures entered as text are not file paths. Remote files are
        // not downloaded; they are reported for manual attachment instead.
        if (! str_contains($path, '/') && ! preg_match('/\.(?:png|jpe?g|webp|gif|pdf)$/i', $path)) {
            return $value;
        }
        if (isset($this->copied[$path])) {
            return str_starts_with($value, '/storage/') ? '/storage/'.$this->copied[$path] : $this->copied[$path];
        }
        if (str_contains($path, '..') || str_contains($path, '://') || ! Storage::disk('public')->exists($path)) {
            $manifest[] = ['source' => $value, 'path' => null, 'missing' => true];

            return null;
        }
        $target = $directory.'/'.Str::uuid().'.'.pathinfo($path, PATHINFO_EXTENSION);
        if (! Storage::disk('public')->copy($path, $target)) {
            throw new \RuntimeException('সাইকেলের ডকুমেন্ট কপি করা যায়নি। আবার চেষ্টা করুন।');
        }
        $this->copied[$path] = $target;
        $manifest[] = ['source' => $value, 'path' => $target, 'missing' => false];

        return str_starts_with($value, '/storage/') ? '/storage/'.$target : $target;
    }
}
