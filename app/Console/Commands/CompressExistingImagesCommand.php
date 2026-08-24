<?php

namespace App\Console\Commands;

use App\Models\LoanApplicationApproval;
use App\Models\MemberAdmission;
use App\Models\MemberAdmissionApproval;
use App\Models\SavingsApplication;
use App\Models\TeamBasedApprovalReview;
use App\Models\User;
use App\Services\ImageCompressionService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class CompressExistingImagesCommand extends Command
{
    protected $signature = 'images:compress-existing
                            {--dry-run : List files that would be compressed without writing}
                            {--only-unconverted : Skip files already in WebP (or JPEG fallback) so daily runs do not re-encode}';

    protected $description = 'Compress stored public images to WebP and update database paths';

    public function handle(ImageCompressionService $compression): int
    {
        $disk = Storage::disk(ImageCompressionService::DISK);
        $files = collect($disk->allFiles())
            ->filter(fn (string $path): bool => (bool) preg_match('/\.(jpe?g|png|gif|webp)$/i', $path))
            ->values();

        if ($files->isEmpty()) {
            $this->info('No image files found on the public disk.');

            return self::SUCCESS;
        }

        $compressed = 0;
        $skipped = 0;
        $failed = 0;
        $savedBytes = 0;

        foreach ($files as $path) {
            $settings = $this->settingsFor($path);
            $before = $disk->size($path);
            $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

            if ($this->shouldSkipConverted($extension)) {
                $skipped++;

                continue;
            }

            if ($this->option('dry-run')) {
                $this->line(sprintf('%s (%s)', $path, $this->formatBytes($before)));
                $skipped++;

                continue;
            }

            $newPath = $compression->compressStoredFile(
                $path,
                $settings['maxWidth'],
                $settings['quality'],
                $settings['maxBytes'],
            );

            if ($newPath === false) {
                $this->warn("Failed: {$path}");
                $failed++;

                continue;
            }

            if ($newPath === $path && $disk->size($path) === $before) {
                $skipped++;

                continue;
            }

            $after = $disk->exists($newPath) ? $disk->size($newPath) : $before;
            $savedBytes += max(0, $before - $after);

            if ($newPath !== $path) {
                $this->replacePath($path, $newPath);
            }

            $this->line(sprintf(
                '%s → %s (%s → %s)',
                $path,
                $newPath,
                $this->formatBytes($before),
                $this->formatBytes($after),
            ));
            $compressed++;
        }

        $this->newLine();
        $this->info("Compressed: {$compressed}");
        $this->info("Skipped: {$skipped}");
        if ($failed > 0) {
            $this->warn("Failed: {$failed}");
        }
        if ($savedBytes > 0) {
            $this->info('Saved: '.$this->formatBytes($savedBytes));
        }

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }

    /**
     * @return array{maxWidth: int, quality: int, maxBytes: int}
     */
    private function settingsFor(string $path): array
    {
        if (str_contains($path, '/customer_nids/') || str_contains($path, '/guardian_nids/')) {
            return [
                'maxWidth' => ImageCompressionService::DOCUMENT_MAX_WIDTH,
                'quality' => 75,
                'maxBytes' => ImageCompressionService::DOCUMENT_MAX_BYTES,
            ];
        }

        if (str_contains($path, '/avatars/')) {
            return [
                'maxWidth' => ImageCompressionService::AVATAR_MAX_WIDTH,
                'quality' => 80,
                'maxBytes' => ImageCompressionService::AVATAR_MAX_BYTES,
            ];
        }

        if (str_contains($path, '/signatures/')) {
            return [
                'maxWidth' => ImageCompressionService::SIGNATURE_MAX_WIDTH,
                'quality' => 70,
                'maxBytes' => ImageCompressionService::SIGNATURE_MAX_BYTES,
            ];
        }

        return [
            'maxWidth' => ImageCompressionService::PHOTO_MAX_WIDTH,
            'quality' => 75,
            'maxBytes' => ImageCompressionService::PHOTO_MAX_BYTES,
        ];
    }

    private function shouldSkipConverted(string $extension): bool
    {
        if (! $this->option('only-unconverted')) {
            return false;
        }

        $target = ImageCompressionService::outputExtension();

        return $extension === $target
            || ($target === 'jpg' && $extension === 'jpeg');
    }

    private function replacePath(string $oldPath, string $newPath): void
    {
        $this->replaceColumns('member_admissions', MemberAdmission::class, [
            'customer_photo_path',
            'customer_nid_photo_path',
            'customer_nid_back_photo_path',
            'guardian_photo_path',
            'guardian_nid_photo_path',
            'applicant_signature_path',
            'guardian_signature_path',
            'surveyor_signature_path',
            'submitted_by_signature_path',
        ], $oldPath, $newPath);

        $this->replaceColumns('users', User::class, ['signature', 'profile_photo'], $oldPath, $newPath);
        $this->replaceColumns('team_based_approval_reviews', TeamBasedApprovalReview::class, ['approver_signature'], $oldPath, $newPath);
        $this->replaceColumns('member_admission_approvals', MemberAdmissionApproval::class, ['approver_signature'], $oldPath, $newPath);
        $this->replaceColumns('loan_application_approvals', LoanApplicationApproval::class, ['approver_signature'], $oldPath, $newPath);
        $this->replaceColumns('savings_applications', SavingsApplication::class, [
            'applicant_photo',
            'applicant_signature',
            'officer_signature',
            'accountant_signature',
            'branch_manager_signature',
        ], $oldPath, $newPath);
    }

    /**
     * @param  class-string  $model
     * @param  list<string>  $columns
     */
    private function replaceColumns(string $table, string $model, array $columns, string $oldPath, string $newPath): void
    {
        if (! Schema::hasTable($table)) {
            return;
        }

        foreach ($columns as $column) {
            if (! Schema::hasColumn($table, $column)) {
                continue;
            }

            $model::query()->where($column, $oldPath)->update([$column => $newPath]);
        }
    }

    private function formatBytes(int $bytes): string
    {
        if ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2).' MB';
        }

        return number_format($bytes / 1024, 1).' KB';
    }
}
