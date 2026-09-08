import { toEnglishDigits } from '@/utils/memberCodeUtils';

const BANGLA_DIGIT = /[০-৯]/;

const NUMERIC_PLACEHOLDER_HINTS = [
    'টাকা',
    'সংখ্যা',
    'বছর',
    'মাস',
    'পরিমাণ',
    'মূল্য',
    'মোবাইল',
    'ফোন',
    'আয়',
    'সঞ্চয়',
    'সঞ্চয়',
];

export function hasBanglaDigits(value: string): boolean {
    return BANGLA_DIGIT.test(value);
}

export function isNumericFormInput(el: EventTarget | null): el is HTMLInputElement {
    if (!(el instanceof HTMLInputElement)) {
        return false;
    }
    if (el.readOnly || el.disabled) {
        return false;
    }

    const type = (el.type || 'text').toLowerCase();
    if (type === 'number' || type === 'tel') {
        return true;
    }

    const mode = (el.inputMode || '').toLowerCase();
    if (mode === 'numeric' || mode === 'decimal') {
        return true;
    }

    const placeholder = el.placeholder || '';
    return NUMERIC_PLACEHOLDER_HINTS.some((hint) => placeholder.includes(hint));
}

function setNativeInputValue(input: HTMLInputElement, value: string): void {
    const previous = input.value;
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    descriptor?.set?.call(input, value);

    const tracker = (input as HTMLInputElement & { _valueTracker?: { setValue: (v: string) => void } })._valueTracker;
    if (tracker) {
        tracker.setValue(previous);
    }

    input.dispatchEvent(new Event('input', { bubbles: true }));
}

export function insertEnglishDigits(input: HTMLInputElement, raw: string): void {
    const english = toEnglishDigits(raw);
    const current = input.value;
    const start = input.selectionStart;
    const end = input.selectionEnd;

    let next: string;
    if (typeof start === 'number' && typeof end === 'number') {
        next = current.slice(0, start) + english + current.slice(end);
    } else {
        next = `${current}${english}`;
    }

    setNativeInputValue(input, next);

    if (typeof start === 'number') {
        const caret = start + english.length;
        try {
            input.setSelectionRange(caret, caret);
        } catch {
            // type=number does not support selection APIs in some browsers
        }
    }
}

export function handleNumericKeyDown(event: React.KeyboardEvent | KeyboardEvent): void {
    const target = event.target;
    if (!isNumericFormInput(target)) {
        return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
    }

    const mapped = toEnglishDigits(event.key);
    if (mapped === event.key || !/^\d+$/.test(mapped)) {
        return;
    }

    event.preventDefault();
    insertEnglishDigits(target, mapped);
}

export function handleNumericBeforeInput(event: React.FormEvent | InputEvent): void {
    const native = 'nativeEvent' in event ? (event.nativeEvent as InputEvent) : event;
    const target = ('target' in event ? event.target : native.target) as EventTarget | null;
    if (!isNumericFormInput(target)) {
        return;
    }

    const data = native.data;
    if (!data || !hasBanglaDigits(data)) {
        return;
    }

    native.preventDefault();
    if ('preventDefault' in event) {
        event.preventDefault();
    }
    insertEnglishDigits(target, data);
}

export function handleNumericPaste(event: React.ClipboardEvent | ClipboardEvent): void {
    const target = event.target;
    if (!isNumericFormInput(target)) {
        return;
    }

    const text = event.clipboardData?.getData('text') ?? '';
    if (!text || !hasBanglaDigits(text)) {
        return;
    }

    event.preventDefault();
    insertEnglishDigits(target, toEnglishDigits(text));
}

export function handleNumericCompositionEnd(event: React.CompositionEvent | CompositionEvent): void {
    const target = event.target;
    if (!isNumericFormInput(target)) {
        return;
    }

    const converted = toEnglishDigits(target.value);
    if (converted === target.value) {
        return;
    }

    setNativeInputValue(target, converted);
}
