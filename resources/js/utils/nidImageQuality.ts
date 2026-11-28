export interface NidQualityResult {
    ok: boolean;
    code: 'good' | 'too_dark' | 'overexposed' | 'glare' | 'blurry' | 'low_res' | 'invalid';
    message: string;
    sharpness: number;
    brightness: number;
}

/**
 * Analyze an HTMLCanvasElement for blur (Laplacian variance), darkness, and glare.
 * Downsamples to <= 320px wide so it runs in < 5ms on mobile devices (safe for live video).
 */
export function analyzeCanvasQuality(source: HTMLCanvasElement): NidQualityResult {
    const targetW = Math.min(320, source.width);
    const targetH = Math.max(1, Math.round((source.height / Math.max(1, source.width)) * targetW));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
        return { ok: true, code: 'good', message: 'একদম পরিষ্কার! ছবি তুলুন', sharpness: 100, brightness: 128 };
    }

    ctx.drawImage(source, 0, 0, targetW, targetH);
    const { data } = ctx.getImageData(0, 0, targetW, targetH);

    const total = targetW * targetH;
    const gray = new Float32Array(total);
    let sumBright = 0;
    let glarePixels = 0;

    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        gray[p] = lum;
        sumBright += lum;
        if (lum >= 248) {
            glarePixels++;
        }
    }

    const brightness = sumBright / total;
    const glareRatio = glarePixels / total;

    // 3x3 Laplacian variance for sharpness
    let lapSum = 0;
    let lapSqSum = 0;
    let count = 0;
    for (let y = 1; y < targetH - 1; y++) {
        const row = y * targetW;
        for (let x = 1; x < targetW - 1; x++) {
            const idx = row + x;
            const lap =
                gray[idx - targetW] +
                gray[idx + targetW] +
                gray[idx - 1] +
                gray[idx + 1] -
                4 * gray[idx];
            lapSum += lap;
            lapSqSum += lap * lap;
            count++;
        }
    }

    const meanLap = count > 0 ? lapSum / count : 0;
    const sharpness = count > 0 ? lapSqSum / count - meanLap * meanLap : 0;

    if (brightness < 25) {
        return {
            ok: false,
            code: 'too_dark',
            message: 'ছবিটি একেবারেই অন্ধকার! পর্যাপ্ত আলোতে বা ফ্ল্যাশ চালু করে ধরুন।',
            sharpness,
            brightness,
        };
    }

    // White backgrounds on scanned/downloaded NIDs naturally have high brightness & white pixels.
    // Do NOT reject for glare/overexposure on client-side; let server OCR verify if text is actually unreadable.
    if (sharpness < 12) {
        return {
            ok: false,
            code: 'blurry',
            message: 'ছবিটি অতিরিক্ত ঝাপসা! অনুগ্রহ করে স্থির ও পরিষ্কার ছবি দিন।',
            sharpness,
            brightness,
        };
    }

    if (glareRatio > 0.35 && brightness > 220) {
        return {
            ok: true,
            code: 'glare',
            message: 'আলো বেশি মনে হচ্ছে — ছবি তুলে যাচাই করা হচ্ছে',
            sharpness,
            brightness,
        };
    }

    return {
        ok: true,
        code: 'good',
        message: 'একদম পরিষ্কার! ছবি তুলতে পারেন',
        sharpness,
        brightness,
    };
}

/**
 * Validate an uploaded image File for minimum resolution, blur, and lighting before OCR.
 */
export async function validateUploadedNidFile(file: File): Promise<NidQualityResult> {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            const w = img.naturalWidth || img.width;
            const h = img.naturalHeight || img.height;
            const longSide = Math.max(w, h);
            const shortSide = Math.min(w, h);

            if (longSide < 350 || shortSide < 200) {
                resolve({
                    ok: false,
                    code: 'low_res',
                    message: 'ছবির রেজোলিউশন অনেক কম! স্পষ্ট ও বড় আকারের NID ছবি দিন।',
                    sharpness: 0,
                    brightness: 0,
                });
                return;
            }

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve({
                    ok: true,
                    code: 'good',
                    message: 'একদম পরিষ্কার!',
                    sharpness: 100,
                    brightness: 128,
                });
                return;
            }
            ctx.drawImage(img, 0, 0, w, h);
            resolve(analyzeCanvasQuality(canvas));
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve({
                ok: false,
                code: 'invalid',
                message: 'ছবিটি পড়া যায়নি। অনুগ্রহ করে সঠিক JPG বা PNG ছবি দিন।',
                sharpness: 0,
                brightness: 0,
            });
        };
        img.src = url;
    });
}

/**
 * Compute the center 1.586:1 (ID-1 card) crop rectangle inside a video/image frame.
 */
export function getCardCropRect(
    frameWidth: number,
    frameHeight: number,
    widthFraction = 0.88
): { sx: number; sy: number; sw: number; sh: number } {
    const aspect = 1.586;
    let sw = Math.round(frameWidth * widthFraction);
    let sh = Math.round(sw / aspect);

    if (sh > frameHeight * 0.78) {
        sh = Math.round(frameHeight * 0.78);
        sw = Math.round(sh * aspect);
    }

    const sx = Math.max(0, Math.round((frameWidth - sw) / 2));
    const sy = Math.max(0, Math.round((frameHeight - sh) / 2));

    return { sx, sy, sw, sh };
}

/**
 * Capture the cropped NID region from a live <video> element and compress it to WebP/JPEG.
 */
export async function captureCroppedCardFromVideo(
    video: HTMLVideoElement,
    filenamePrefix = 'nid-scan'
): Promise<{ file: File; quality: NidQualityResult } | null> {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return null;

    const { sx, sy, sw, sh } = getCardCropRect(vw, vh);

    const targetW = Math.min(1600, sw);
    const targetH = Math.round((sh / sw) * targetW);

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, targetW, targetH);

    const quality = analyzeCanvasQuality(canvas);
    if (!quality.ok) {
        return {
            file: new File([], 'rejected.jpg'),
            quality,
        };
    }

    const supportsWebp = canvas.toDataURL('image/webp').startsWith('data:image/webp');
    const mime = supportsWebp ? 'image/webp' : 'image/jpeg';
    const ext = supportsWebp ? 'webp' : 'jpg';

    const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), mime, 0.94);
    });

    if (!blob) return null;

    const file = new File([blob], `${filenamePrefix}-${Date.now()}.${ext}`, {
        type: mime,
        lastModified: Date.now(),
    });

    return { file, quality };
}
