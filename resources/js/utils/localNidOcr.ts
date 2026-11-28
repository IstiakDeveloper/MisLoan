import type { NidOcrExtractedData } from '@/components/MemberAdmission/NidOcrModal';
import { toEnglishDigits } from '@/utils/memberCodeUtils';

const MONTHS: Record<string, string> = {
    jan: '01',
    feb: '02',
    mar: '03',
    apr: '04',
    may: '05',
    jun: '06',
    jul: '07',
    aug: '08',
    sep: '09',
    oct: '10',
    nov: '11',
    dec: '12',
};

function normalizeDob(rawText: string): string {
    const text = toEnglishDigits(rawText);

    // Format: 15 Jan 1990 or 15-Jan-1990
    const m1 = text.match(/(\d{1,2})[\s\-/]+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\-/,]+(\d{4})/i);
    if (m1) {
        const day = m1[1].padStart(2, '0');
        const month = MONTHS[m1[2].toLowerCase().slice(0, 3)] || '01';
        const year = m1[3];
        return `${year}-${month}-${day}`;
    }

    // Format: DD/MM/YYYY or DD-MM-YYYY
    const m2 = text.match(/\b(\d{2})[/\-](\d{2})[/\-](19\d{2}|20\d{2})\b/);
    if (m2) {
        return `${m2[3]}-${m2[2]}-${m2[1]}`;
    }

    return '';
}

function extractLineValue(lines: string[], labelRegex: RegExp): string {
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (labelRegex.test(line)) {
            const afterColon = line.split(/[:ঃ\-]/).slice(1).join(':').trim();
            if (afterColon.length >= 2) {
                return afterColon;
            }
            if (i + 1 < lines.length) {
                const next = lines[i + 1].trim();
                if (next.length >= 2) return next;
            }
        }
    }
    return '';
}

function extractNidDigits(text: string): { nid_number: string; smart_card_number: string } {
    const en = toEnglishDigits(text);

    // Look for explicit ID NO / NID No line first
    const explicit = en.match(/(?:id\s*no|nid\s*no|জাতীয়\s*পরিচয়\s*নং)[^\d]*([\d\s]{10,22})/i);
    const candidateRaw = explicit ? explicit[1].replace(/\s+/g, '') : '';

    if (candidateRaw.length === 10) {
        return { nid_number: '', smart_card_number: candidateRaw };
    }
    if (candidateRaw.length === 13 || candidateRaw.length === 17) {
        return { nid_number: candidateRaw, smart_card_number: '' };
    }

    // Fallback: match 17, 13, or 10 consecutive (or space-grouped) digits
    const collapsed = en.replace(/(\d)\s+(?=\d)/g, '$1');
    const m17 = collapsed.match(/\b\d{17}\b/);
    if (m17) return { nid_number: m17[0], smart_card_number: '' };

    const m13 = collapsed.match(/\b\d{13}\b/);
    if (m13) return { nid_number: m13[0], smart_card_number: '' };

    const m10 = collapsed.match(/\b\d{10}\b/);
    if (m10) return { nid_number: '', smart_card_number: m10[0] };

    return { nid_number: '', smart_card_number: '' };
}

function parseBackAddress(rawBackText: string) {
    const en = toEnglishDigits(rawBackText);
    const postMatch = en.match(/\b(\d{4})\b/);
    const districtMatch = rawBackText.match(/জেলা\s*[:ঃ]?\s*([^\s,।]+)/);
    const upazilaMatch = rawBackText.match(/উপজেলা\s*[:ঃ]?\s*([^\s,।]+)/);

    return {
        raw_address_bn: rawBackText.replace(/\s+/g, ' ').trim(),
        division_hint: '',
        district_hint: districtMatch ? districtMatch[1].trim() : '',
        upazila_hint: upazilaMatch ? upazilaMatch[1].trim() : '',
        union_or_ward: '',
        village_or_road: '',
        post_code: postMatch ? postMatch[1] : '',
    };
}

export async function runLocalTesseractNidOcr(
    frontFile: File,
    backFile: File | null,
    onProgress?: (pct: number) => void
): Promise<{ ok: true; data: NidOcrExtractedData } | { ok: false; message: string }> {
    if (
        frontFile.type === 'application/pdf' ||
        frontFile.name.toLowerCase().endsWith('.pdf')
    ) {
        return {
            ok: false,
            message:
                'অফলাইন OCR মোডে PDF সাপোর্ট করে না। অনুগ্রহ করে NID-র JPG/PNG ছবি দিন অথবা ক্যামেরা দিয়ে স্ক্যান করুন।',
        };
    }

    const { createWorker } = await import('tesseract.js');
    onProgress?.(10);

    const worker = await createWorker('ben+eng', 1, {
        logger: (m: { status?: string; progress?: number }) => {
            if (m.status === 'recognizing text' && typeof m.progress === 'number') {
                onProgress?.(Math.min(90, 20 + Math.round(m.progress * 65)));
            }
        },
    });

    try {
        const frontRes = await worker.recognize(frontFile);
        const frontText = frontRes?.data?.text || '';
        const confidence = Math.round(frontRes?.data?.confidence || 0);

        let backText = '';
        if (backFile && backFile.type.startsWith('image/')) {
            const backRes = await worker.recognize(backFile);
            backText = backRes?.data?.text || '';
        }

        onProgress?.(98);

        const lines = frontText
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean);

        const { nid_number, smart_card_number } = extractNidDigits(frontText);
        const date_of_birth = normalizeDob(frontText);

        const applicant_name_bn = extractLineValue(lines, /^নাম|নাম\s*[:ঃ]/);
        let applicant_name_en = extractLineValue(lines, /^name\b|name\s*[:ঃ]/i);
        if (!applicant_name_en) {
            const upperLine = lines.find(
                (l) => /^[A-Z][A-Z\s.\-]{4,}$/.test(l) && !/GOVERNMENT|BANGLADESH|NATIONAL|CARD|DATE|BIRTH/.test(l)
            );
            if (upperLine) applicant_name_en = upperLine;
        }

        const father_name_bn = extractLineValue(lines, /পিতা/);
        const spouse_name_bn = extractLineValue(lines, /স্বামী/);
        const mother_name_bn = extractLineValue(lines, /মাতা/);

        if (
            (!nid_number && !smart_card_number) ||
            (!applicant_name_bn && !applicant_name_en) ||
            !date_of_birth
        ) {
            return {
                ok: false,
                message:
                    'NID কার্ডের লেখা স্পষ্টভাবে পড়া যায়নি। অনুগ্রহ করে পর্যাপ্ত আলোতে কার্ডটি সোজা ও পরিষ্কারভাবে ধরে আবার স্ক্যান করুন।',
            };
        }

        return {
            ok: true,
            data: {
                card_type: smart_card_number ? 'smart' : 'old',
                readability_score: Math.max(60, confidence),
                applicant_name_bn,
                applicant_name_en,
                father_name_bn,
                spouse_name_bn,
                mother_name_bn,
                marital_status: spouse_name_bn ? 'married' : '',
                nid_number,
                smart_card_number,
                date_of_birth,
                gender: '',
                address: backText
                    ? parseBackAddress(backText)
                    : {
                          raw_address_bn: '',
                          division_hint: '',
                          district_hint: '',
                          upazila_hint: '',
                          union_or_ward: '',
                          village_or_road: '',
                          post_code: '',
                      },
            },
        };
    } finally {
        await worker.terminate();
    }
}
