import { cn } from '@/lib/utils';
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

export type ComboSelectItem<TValue extends string | number = string> = {
    value: TValue;
    label: string;
    keywords?: string;
    disabled?: boolean;
};

type Props<TValue extends string | number = string> = {
    value: TValue | null | undefined;
    onChange: (value: TValue | null) => void;
    items: ComboSelectItem<TValue>[];
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    portal?: boolean;
    clearable?: boolean;
    size?: 'md' | 'sm';
};

export function ComboSelect<TValue extends string | number = string>({
    value,
    onChange,
    items,
    placeholder = 'Select…',
    disabled,
    className,
    portal = true,
    clearable = true,
    size = 'md',
}: Props<TValue>) {
    const isSmall = size === 'sm';
    const [query, setQuery] = useState('');

    const selectedItem = useMemo(() => {
        return items.find((i) => i.value === value) ?? null;
    }, [items, value]);

    const filtered = useMemo(() => {
        const raw = query.trim().toLowerCase();
        let list = items;
        if (raw) {
            const tokens = raw.split(/\s+/).filter(Boolean);
            list = items.filter((i) => {
                const hay = `${i.label} ${i.keywords ?? ''}`.toLowerCase();
                return tokens.every((t) => hay.includes(t));
            });
        }
        if (selectedItem && list.some((i) => i.value === selectedItem.value)) {
            return [selectedItem, ...list.filter((i) => i.value !== selectedItem.value)];
        }
        return list;
    }, [items, query, selectedItem]);

    return (
        <Combobox
            immediate
            by={(a, z) => {
                if (a == null && z == null) return true;
                if (a == null || z == null) return false;
                return (a as ComboSelectItem<TValue>).value === (z as ComboSelectItem<TValue>).value;
            }}
            value={selectedItem}
            onChange={(item: ComboSelectItem<TValue> | null) => onChange(item ? item.value : null)}
            disabled={disabled}
            onClose={() => setQuery('')}
        >
            {({ open }) => (
                <div className={cn('relative w-full', isSmall ? 'min-w-0' : 'min-w-[9.5rem]', className)}>
                    <div
                        className={cn(
                            'flex w-full min-w-0 items-center gap-2 border border-gray-200 bg-white shadow-xs transition-[color,box-shadow] outline-none focus-within:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900',
                            isSmall ? 'h-8.5 rounded-xl px-2.5 text-xs' : 'h-12 rounded-md px-3 py-1.5 text-sm',
                            open
                                ? 'border-emerald-500 ring-emerald-500/20'
                                : 'focus-within:border-emerald-500 focus-within:ring-emerald-500/20',
                            disabled && 'pointer-events-none opacity-50',
                        )}
                    >
                        <Search className={cn('shrink-0 text-gray-400', isSmall ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
                        <ComboboxInput
                            className={cn(
                                'w-full min-w-0 bg-transparent outline-none placeholder:text-gray-400',
                                isSmall ? 'py-0 text-xs' : 'py-0.5 text-sm',
                            )}
                            displayValue={(item) => (item as ComboSelectItem<TValue> | null)?.label ?? ''}
                            autoComplete="off"
                            onChange={(event) => setQuery(event.target.value)}
                            onFocus={(event) => event.target.select()}
                            placeholder={placeholder}
                        />
                        <div className="ml-auto flex shrink-0 items-center gap-1">
                            {clearable && value !== null && value !== undefined && value !== '' && !disabled && (
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onChange(null);
                                        setQuery('');
                                    }}
                                    className="flex h-5 w-5 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                            <ComboboxButton className="flex items-center justify-center rounded-sm p-0.5">
                                <ChevronDown
                                    className={cn(
                                        'h-4 w-4 text-gray-400 transition-transform duration-200',
                                        open && 'rotate-180 text-emerald-600',
                                    )}
                                />
                            </ComboboxButton>
                        </div>
                    </div>

                    <ComboboxOptions
                        portal={portal}
                        anchor={portal ? { to: 'bottom start', gap: 4 } : undefined}
                        className={cn(
                            'max-h-60 overflow-y-auto rounded-md border border-gray-200 bg-white p-1 shadow-md focus:outline-none dark:border-gray-800 dark:bg-gray-900',
                            isSmall ? 'text-xs' : 'text-sm',
                            portal ? 'z-[200] w-[var(--anchor-width)] min-w-[10rem]' : 'absolute left-0 z-50 mt-1 w-full',
                        )}
                    >
                        {filtered.length === 0 ? (
                            <div className="px-2 py-3 text-center text-xs italic text-gray-500">No results found.</div>
                        ) : (
                            filtered.map((item) => (
                                <ComboboxOption
                                    key={String(item.value)}
                                    value={item}
                                    disabled={item.disabled}
                                    className={cn(
                                        'group relative flex cursor-default items-center rounded-sm pr-8 pl-2.5 outline-none select-none',
                                        isSmall ? 'py-1.5 text-xs' : 'py-2 text-sm',
                                        'data-[focus]:bg-emerald-50 data-[focus]:text-emerald-900',
                                        'data-[selected]:bg-emerald-500/10 data-[selected]:font-semibold data-[selected]:text-emerald-800',
                                    )}
                                >
                                    <span className="block min-w-0 truncate">{item.label}</span>
                                    <span className="absolute right-2.5 hidden items-center text-emerald-600 group-data-[selected]:flex">
                                        <Check className="h-3.5 w-3.5" />
                                    </span>
                                </ComboboxOption>
                            ))
                        )}
                    </ComboboxOptions>
                </div>
            )}
        </Combobox>
    );
}
