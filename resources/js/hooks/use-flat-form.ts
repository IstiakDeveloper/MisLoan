import type { FormDataType } from '@inertiajs/core';
import { useForm } from '@inertiajs/react';

type FlatSetter<T> = {
    (data: Partial<T>): void;
    (update: (previous: T) => T): void;
    <K extends keyof T>(key: K, value: T[K]): void;
};

/** Top-level fields for legacy configurable forms; avoids recursively inferring arbitrary JSON keys. */
export function useFlatForm<T extends FormDataType<T>>(initial: T) {
    const form = useForm<T>(initial);
    return { ...form, setData: form.setData as FlatSetter<T> };
}
