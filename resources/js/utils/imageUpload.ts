/** Max original file size accepted before client-side processing (10MB). */
export const MAX_ADMISSION_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Prefer keeping compressed images under this size for reliable draft saves. */
const TARGET_MAX_BYTES = 200 * 1024;

export type PrepareUploadResult =
    | { ok: true; file: File; message: string }
    | { ok: false; error: string };

function formatSize(bytes: number): string {
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
}

function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('image_load_failed'));
        };
        img.src = url;
    });
}

async function canvasToJpegBlob(
    canvas: HTMLCanvasElement,
    quality: number
): Promise<Blob | null> {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
    });
}

/**
 * Resize + JPEG-compress an image in the browser before upload.
 * PDFs are passed through if under the size limit.
 */
export async function prepareAdmissionUploadFile(
    file: File,
    options?: { maxWidth?: number }
): Promise<PrepareUploadResult> {
    const maxWidth = options?.maxWidth ?? 1200;

    if (file.size > MAX_ADMISSION_UPLOAD_BYTES) {
        return {
            ok: false,
            error: `ফাইল সাইজ অনেক বড় (${formatSize(file.size)})। সর্বোচ্চ ১০MB অনুমোদিত। ছোট ছবি/ফাইল দিয়ে আবার চেষ্টা করুন।`,
        };
    }

    const isPdf =
        file.type === 'application/pdf' ||
        file.name.toLowerCase().endsWith('.pdf');

    if (isPdf) {
        return {
            ok: true,
            file,
            message: `✓ PDF নির্বাচিত (${formatSize(file.size)})`,
        };
    }

    const isImage =
        file.type.startsWith('image/') ||
        /\.(jpe?g|png|gif|webp)$/i.test(file.name);

    if (!isImage) {
        return {
            ok: false,
            error: 'শুধু JPG, PNG বা PDF ফাইল আপলোড করা যাবে।',
        };
    }

    try {
        const img = await loadImage(file);
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (!width || !height) {
            return {
                ok: false,
                error: 'ছবিটি পড়া যায়নি। অন্য ফাইল দিয়ে চেষ্টা করুন।',
            };
        }

        if (width > maxWidth) {
            height = Math.round((height / width) * maxWidth);
            width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return {
                ok: false,
                error: 'ছবি কম্প্রেস করা যায়নি। অন্য ফাইল দিয়ে চেষ্টা করুন।',
            };
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.78;
        let blob = await canvasToJpegBlob(canvas, quality);

        while (blob && blob.size > TARGET_MAX_BYTES && quality > 0.45) {
            quality -= 0.08;
            blob = await canvasToJpegBlob(canvas, quality);
        }

        if (!blob) {
            return {
                ok: false,
                error: 'ছবি কম্প্রেস করা যায়নি। অন্য ফাইল দিয়ে চেষ্টা করুন।',
            };
        }

        if (blob.size > MAX_ADMISSION_UPLOAD_BYTES) {
            return {
                ok: false,
                error: `কম্প্রেসের পরেও ফাইল বড় (${formatSize(blob.size)})। অন্য ছবি দিন।`,
            };
        }

        const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
        const compressed = new File([blob], `${baseName}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
        });

        const originalLabel = formatSize(file.size);
        const newLabel = formatSize(compressed.size);

        return {
            ok: true,
            file: compressed,
            message:
                compressed.size < file.size
                    ? `✓ কম্প্রেস হয়েছে: ${originalLabel} → ${newLabel}`
                    : `✓ সফল নির্বাচন (${newLabel})`,
        };
    } catch {
        return {
            ok: false,
            error: 'ছবি প্রসেস করা যায়নি। JPG/PNG ফাইল দিয়ে আবার চেষ্টা করুন। (আগের ছবি অপরিবর্তিত আছে)',
        };
    }
}

/** Convert a File to a data URL (for loan form JSON drafts). */
export function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('read_failed'));
        reader.readAsDataURL(file);
    });
}

/**
 * Compress then convert to data URL for embedding in loan draft JSON.
 * Keeps request size small so soft draft saves don't fail.
 */
export async function fileToCompressedDataUrl(
    file: File,
    options?: { maxWidth?: number }
): Promise<{ ok: true; dataUrl: string } | { ok: false; error: string }> {
    const prepared = await prepareAdmissionUploadFile(file, {
        maxWidth: options?.maxWidth ?? 900,
    });
    if (!prepared.ok) {
        return prepared;
    }
    try {
        const dataUrl = await fileToDataUrl(prepared.file);
        if (!dataUrl) {
            return { ok: false, error: 'ছবি পড়া যায়নি। আবার চেষ্টা করুন।' };
        }
        return { ok: true, dataUrl };
    } catch {
        return { ok: false, error: 'ছবি পড়া যায়নি। আবার চেষ্টা করুন।' };
    }
}
