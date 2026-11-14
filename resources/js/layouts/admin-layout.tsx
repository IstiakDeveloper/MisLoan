import NotificationBell from '@/components/NotificationBell';
import { documentUrl } from '@/lib/documents';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { usePwaInstallPrompt } from '@/hooks/usePwaInstallPrompt';
import {
    activeNavigation,
    getAdminNavigation,
    getNavigationSections,
    navigationPath,
    pageAction,
    type AdminNavItem,
    type AdminUser,
    type BadgeCounts,
} from '@/lib/admin-navigation';
import type { BreadcrumbItem } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import {
    Bolt,
    Building2,
    ChevronDown,
    ChevronRight,
    Download,
    LayoutGrid,
    LogOut,
    Menu,
    PanelLeftClose,
    PanelLeftOpen,
    Search,
    Star,
    Wrench,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

interface PageProps extends Record<string, unknown> {
    auth: { user: AdminUser };
    flash?: Partial<Record<'success' | 'error' | 'warning' | 'info', string>>;
    siteMaintenance?: boolean;
    badgeCounts?: BadgeCounts;
}

function usePreference<T>(key: string, fallback: T): [T, (value: T) => void] {
    const [value, setValue] = useState(fallback);
    const [loaded, setLoaded] = useState(false);
    useEffect(() => {
        try {
            const stored = JSON.parse(localStorage.getItem(key) ?? 'null');
            if (
                typeof stored === typeof fallback &&
                (Array.isArray(fallback)
                    ? Array.isArray(stored) &&
                      stored.every(
                          (entry: unknown) => typeof entry === 'string',
                      )
                    : stored !== null)
            )
                setValue(stored as T);
            else setValue(fallback);
        } catch {
            setValue(fallback);
        }
        setLoaded(true);
        // The fallback is the initial value for this key.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);
    const update = (next: T) => {
        setValue(next);
        if (loaded) {
            try {
                localStorage.setItem(key, JSON.stringify(next));
            } catch {
                /* Storage may be disabled. */
            }
        }
    };
    return [value, update];
}

export default function AdminLayout({
    children,
    breadcrumbs,
}: {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}) {
    const page = usePage<PageProps>();
    const {
        auth: { user },
        badgeCounts,
        siteMaintenance = false,
    } = page.props;
    const path = navigationPath(page.url);
    const groups = getAdminNavigation(user, badgeCounts);
    const active = activeNavigation(groups, path);
    const action = pageAction(path, active?.href);
    const title =
        active?.item.title ??
        (path === '/settings/profile' ? 'Account Profile' : 'Workspace');
    const [compact, setCompact] = usePreference(
        'misloan.sidebar.compact',
        false,
    );
    const [expandedGroup, setExpandedGroup] = useState<
        string | null | undefined
    >(undefined);
    const sidebarSections = getNavigationSections(groups);
    const [favorites, setFavorites] = usePreference<string[]>(
        `misloan.favorites.${user.id}`,
        [],
    );
    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [dismissedFlash, setDismissedFlash] = useState<PageProps['flash']>();
    const flashEntry = Object.entries(page.props.flash ?? {}).find(
        ([, message]) => Boolean(message),
    );
    const notice =
        page.props.flash !== dismissedFlash && flashEntry
            ? { type: flashEntry[0], message: flashEntry[1]! }
            : null;
    const noticeType = notice?.type;
    const searchInput = useRef<HTMLInputElement>(null);
    const { canInstall, promptInstall } = usePwaInstallPrompt();
    const [installOpen, setInstallOpen] = useState(false);
    const entries = groups.flatMap((group) =>
        group.items.map((item) => ({ group, item })),
    );
    const favoriteItems = entries.filter(({ item }) =>
        favorites.includes(item.href),
    );
    const quickItems = favoriteItems.length
        ? favoriteItems.slice(0, 6).map(({ item }) => item)
        : groups
              .filter((group) =>
                  ['loans', 'savings', 'approvals', 'accounting'].includes(
                      group.id,
                  ),
              )
              .map((group) => group.items[0]);
    const results = entries.filter(({ group, item }) =>
        `${group.title} ${group.englishTitle} ${item.title} ${item.englishTitle} ${item.category ?? ''}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
    );
    const scope =
        user.branch?.name ??
        user.area?.name ??
        user.zone?.name ??
        (user.has_all_access ||
        ['super_admin', 'head_office', 'ed'].includes(user.role?.name ?? '')
            ? 'Head Office'
            : 'Assigned portfolio');
    const roleLabel = (user.role?.name ?? 'Staff').replaceAll('_', ' ');
    const avatar =
        user.avatar ||
        (user.profile_photo ? documentUrl(user.profile_photo) : null);
    useEffect(
        () =>
            router.on('navigate', () => {
                setMobileOpen(false);
                setSearchOpen(false);
                setQuery('');
                setExpandedGroup(undefined);
            }),
        [],
    );
    useEffect(() => {
        if (!noticeType || noticeType === 'error') return;
        const timer = window.setTimeout(
            () => setDismissedFlash(page.props.flash),
            7000,
        );
        return () => window.clearTimeout(timer);
    }, [noticeType, page.props.flash]);
    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if (
                (event.ctrlKey || event.metaKey) &&
                event.key.toLowerCase() === 'k'
            ) {
                event.preventDefault();
                setSearchOpen((open) => !open);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);
    useEffect(() => {
        const media = window.matchMedia('(min-width: 768px)');
        const close = () => {
            if (media.matches) setMobileOpen(false);
        };
        media.addEventListener('change', close);
        return () => media.removeEventListener('change', close);
    }, []);
    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            document
                .querySelectorAll<HTMLElement>(
                    'nav[aria-label="Modules"] a[aria-current="page"], nav[aria-label="Mobile modules"] a[aria-current="page"]',
                )
                .forEach((link) => {
                    if (link.getClientRects().length)
                        link.scrollIntoView({ block: 'nearest' });
                });
        });
        return () => cancelAnimationFrame(frame);
    }, [path, expandedGroup, compact, mobileOpen]);

    const toggleFavorite = (href: string) =>
        setFavorites(
            favorites.includes(href)
                ? favorites.filter((value) => value !== href)
                : [...favorites, href],
        );
    const navLink = (item: AdminNavItem, small: boolean, prefix: string) => {
        const selected = active?.item.href === item.href;
        return (
            <div
                key={`${prefix}-${item.href}`}
                className="group/nav flex items-center gap-1"
            >
                <Link
                    href={item.href}
                    prefetch="hover"
                    title={`${item.title} · ${item.englishTitle}`}
                    aria-label={small ? item.title : undefined}
                    aria-current={selected ? 'page' : undefined}
                    onClick={() => setMobileOpen(false)}
                    className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${selected ? 'bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'} ${small ? 'justify-center' : ''}`}
                >
                    <item.icon className="size-4 shrink-0" />
                    {!small && (
                        <>
                            <span className="min-w-0 flex-1">
                                <span className="block leading-relaxed">
                                    {item.title}
                                </span>
                                <span className="mt-0.5 block text-[10px] font-normal text-slate-400">
                                    {item.englishTitle}
                                </span>
                            </span>
                            {Boolean(item.badge) && (
                                <span
                                    aria-label={`${item.badge} pending`}
                                    className="rounded-md bg-amber-100 px-1.5 text-[11px] font-semibold text-amber-900"
                                >
                                    {item.badge! > 99 ? '99+' : item.badge}
                                </span>
                            )}
                        </>
                    )}
                    {small && Boolean(item.badge) && (
                        <span className="size-1.5 shrink-0 rounded-full bg-amber-500" />
                    )}
                </Link>
                {!small && (
                    <button
                        type="button"
                        onClick={() => toggleFavorite(item.href)}
                        aria-label={`${favorites.includes(item.href) ? 'Remove' : 'Add'} ${item.title} ${favorites.includes(item.href) ? 'from' : 'to'} favorites`}
                        aria-pressed={favorites.includes(item.href)}
                        className="rounded p-1 text-slate-400 opacity-0 group-hover/nav:opacity-100 hover:text-amber-600 focus:opacity-100 max-md:opacity-100"
                    >
                        <Star
                            className={`size-3.5 ${favorites.includes(item.href) ? 'fill-amber-400 text-amber-500' : ''}`}
                        />
                    </button>
                )}
            </div>
        );
    };
    const navigation = (small: boolean, prefix: string) => (
        <>
            {favoriteItems.length > 0 && !small && (
                <section className="mb-4 border-b border-slate-100 pb-3 dark:border-slate-800">
                    <p className="mb-2 flex items-center gap-2 px-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                        <Star className="size-3" /> Favorites
                    </p>
                    {favoriteItems.map(({ item }) =>
                        navLink(item, false, `${prefix}-favorite`),
                    )}
                </section>
            )}
            {sidebarSections.map((section) => (
                <section
                    key={section.id}
                    className="mb-5"
                    aria-label={section.title}
                >
                    {!small && (
                        <h2 className="mb-2 border-t border-slate-100 px-3 pt-4 text-[11px] font-semibold text-slate-400 dark:border-slate-800">
                            {section.title}
                            <span className="ml-2 text-[9px] font-normal">
                                {section.englishTitle}
                            </span>
                        </h2>
                    )}
                    {section.groups.map((group) => {
                        const groupBadge = group.items.reduce(
                            (total, item) => total + (item.badge ?? 0),
                            0,
                        );
                        const expanded =
                            expandedGroup === undefined
                                ? active?.group.id === group.id
                                : expandedGroup === group.id;
                        const direct = group.id === 'dashboard';
                        return (
                            <div key={group.id} className="mb-1">
                                {direct ? (
                                    navLink(group.items[0], small, prefix)
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            aria-label={
                                                small ? group.title : undefined
                                            }
                                            title={
                                                small
                                                    ? group.title +
                                                      ' · ' +
                                                      group.englishTitle
                                                    : undefined
                                            }
                                            aria-expanded={expanded && !small}
                                            aria-controls={
                                                small
                                                    ? undefined
                                                    : prefix + '-' + group.id
                                            }
                                            onClick={() => {
                                                if (small) setCompact(false);
                                                setExpandedGroup(
                                                    expanded && !small
                                                        ? null
                                                        : group.id,
                                                );
                                            }}
                                            className={
                                                'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-600 dark:hover:bg-slate-800 ' +
                                                (active?.group.id === group.id
                                                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                    : 'text-slate-700 dark:text-slate-200') +
                                                (small ? ' justify-center' : '')
                                            }
                                        >
                                            <group.icon className="size-4 shrink-0" />
                                            {!small && (
                                                <>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block text-[13px] font-semibold">
                                                            {group.title}
                                                        </span>
                                                        <span className="mt-1 block text-[10px] text-slate-500 dark:text-slate-400">
                                                            {group.description}
                                                        </span>
                                                    </span>
                                                    {!expanded &&
                                                        groupBadge > 0 && (
                                                            <span
                                                                aria-label={
                                                                    groupBadge +
                                                                    ' pending'
                                                                }
                                                                className="rounded-md bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-900"
                                                            >
                                                                {groupBadge > 99
                                                                    ? '99+'
                                                                    : groupBadge}
                                                            </span>
                                                        )}
                                                    <ChevronDown
                                                        className={
                                                            'size-3.5 shrink-0 transition-transform ' +
                                                            (expanded
                                                                ? ''
                                                                : '-rotate-90')
                                                        }
                                                    />
                                                </>
                                            )}
                                        </button>
                                        {!small && expanded && (
                                            <div
                                                id={prefix + '-' + group.id}
                                                className="mt-1 ml-5 space-y-0.5 border-l border-slate-200 pl-2 dark:border-slate-700"
                                            >
                                                {group.items.map(
                                                    (item, index) => (
                                                        <div key={item.href}>
                                                            {item.category &&
                                                                item.category !==
                                                                    group.items[
                                                                        index -
                                                                            1
                                                                    ]
                                                                        ?.category && (
                                                                    <p className="px-3 pt-3 pb-1 text-[10px] font-semibold text-slate-400">
                                                                        {
                                                                            item.category
                                                                        }
                                                                    </p>
                                                                )}
                                                            {navLink(
                                                                item,
                                                                false,
                                                                prefix,
                                                            )}
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </section>
            ))}
        </>
    );

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100 print:bg-white print:text-black">
            <a
                href="#admin-content"
                className="sr-only fixed top-2 left-2 z-[100] rounded bg-white p-3 text-slate-900 focus:not-sr-only"
            >
                Skip to content
            </a>
            <aside
                aria-label="Main navigation"
                className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-slate-200 bg-white md:flex dark:border-slate-800 dark:bg-slate-900 print:hidden ${compact ? 'w-20' : 'w-72'}`}
            >
                <div className="flex h-20 shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4 dark:border-slate-800">
                    <Link
                        href="/dashboard"
                        aria-label="MisLoan dashboard"
                        className="min-w-0"
                    >
                        <img
                            src="/icons/logo.png"
                            alt="MisLoan"
                            className={`${compact ? 'w-10' : 'w-32'} h-10 object-contain`}
                        />
                        {!compact && (
                            <p className="mt-1 text-[9px] font-semibold tracking-[0.18em] text-slate-400 uppercase">
                                Microfinance management
                            </p>
                        )}
                    </Link>
                    {!compact && (
                        <button
                            type="button"
                            onClick={() => setCompact(true)}
                            aria-label="Collapse sidebar"
                            className="rounded p-2 text-slate-400 hover:bg-slate-100"
                        >
                            <PanelLeftClose className="size-4" />
                        </button>
                    )}
                </div>
                {compact && (
                    <button
                        type="button"
                        onClick={() => setCompact(false)}
                        aria-label="Expand sidebar"
                        className="mx-auto my-2 rounded p-2 text-slate-500 hover:bg-slate-100"
                    >
                        <PanelLeftOpen className="size-4" />
                    </button>
                )}
                {!compact && (
                    <div className="m-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                        <Building2 className="size-4 shrink-0 text-emerald-600" />
                        <div className="min-w-0">
                            <p className="text-[10px] text-slate-500">
                                শাখা / কর্মক্ষেত্র
                            </p>
                            <p
                                className="truncate text-xs font-semibold"
                                title={scope}
                            >
                                {scope}
                            </p>
                        </div>
                    </div>
                )}
                <nav
                    aria-label="Modules"
                    className="min-h-0 flex-1 overflow-y-auto px-3 py-3"
                >
                    {navigation(compact, 'desktop')}
                </nav>
                <div className="shrink-0 border-t border-slate-100 p-3 dark:border-slate-800">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                aria-label="Open account settings"
                                title={user.name}
                                className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                                    {avatar ? (
                                        <img
                                            src={avatar}
                                            alt=""
                                            className="size-full object-cover"
                                        />
                                    ) : (
                                        user.name?.charAt(0)
                                    )}
                                </span>
                                {!compact && (
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-semibold">
                                            {user.name}
                                        </p>
                                        <p className="truncate text-[10px] text-slate-500 capitalize">
                                            {roleLabel}
                                        </p>
                                    </div>
                                )}
                                {!compact && (
                                    <ChevronDown className="size-3 shrink-0 text-slate-400" />
                                )}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            side="top"
                            align="start"
                            className="w-64"
                        >
                            <DropdownMenuLabel>
                                আমার অ্যাকাউন্ট
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {groups
                                .find((group) => group.id === 'account')
                                ?.items.map((item) => (
                                    <DropdownMenuItem key={item.href} asChild>
                                        <Link href={item.href}>
                                            <item.icon className="mr-2 size-4" />
                                            {item.title}
                                        </Link>
                                    </DropdownMenuItem>
                                ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onSelect={() => router.post('/logout')}
                            >
                                <LogOut className="mr-2 size-4" />
                                লগ আউট
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </aside>
            <div className={`${compact ? 'md:pl-20' : 'md:pl-72'} print:pl-0`}>
                <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95 print:hidden">
                    <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
                        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                            <SheetTrigger asChild>
                                <button
                                    type="button"
                                    className="rounded-lg p-2 hover:bg-slate-100 md:hidden"
                                    aria-label="Open navigation"
                                >
                                    <Menu className="size-5" />
                                </button>
                            </SheetTrigger>
                            <SheetContent
                                side="left"
                                className="w-[min(90vw,320px)] gap-0 p-0"
                            >
                                <div className="border-b p-5">
                                    <SheetTitle>MisLoan</SheetTitle>
                                    <SheetDescription>
                                        {scope} · {roleLabel}
                                    </SheetDescription>
                                </div>
                                <nav
                                    aria-label="Mobile modules"
                                    className="min-h-0 flex-1 overflow-y-auto p-3"
                                >
                                    {navigation(false, 'mobile')}
                                </nav>
                            </SheetContent>
                        </Sheet>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">
                                {title}
                                {action ? ` / ${action}` : ''}
                            </p>
                            <p className="truncate text-[11px] text-slate-500 md:hidden">
                                {scope}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSearchOpen(true)}
                            aria-label="Search navigation (Control or Command K)"
                            className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-xs text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                        >
                            <Search className="size-4" />
                            <span className="hidden lg:inline">
                                মেনু খুঁজুন
                            </span>
                            <kbd className="hidden rounded border px-1 text-[10px] lg:inline">
                                Ctrl / ⌘ K
                            </kbd>
                        </button>
                        {quickItems.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        aria-label="Quick access"
                                        className="hidden items-center gap-1.5 rounded-lg p-2 text-xs text-slate-500 hover:bg-slate-100 md:flex dark:hover:bg-slate-800"
                                    >
                                        <Bolt className="size-4" />
                                        <span className="hidden xl:inline">
                                            দ্রুত প্রবেশ
                                        </span>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-64"
                                >
                                    <DropdownMenuLabel>
                                        {favoriteItems.length
                                            ? 'Your favorites'
                                            : 'Operational shortcuts'}
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {quickItems.map((item) => (
                                        <DropdownMenuItem
                                            key={item.href}
                                            asChild
                                        >
                                            <Link href={item.href}>
                                                <item.icon className="mr-2 size-4" />
                                                {item.title}
                                            </Link>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        <a
                            href="https://app.mousumibd.org"
                            title="Mousumi Apps"
                            aria-label="Mousumi Apps"
                            className="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 sm:block"
                        >
                            <LayoutGrid className="size-4" />
                        </a>
                        <NotificationBell />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    aria-label="Account menu"
                                    className="flex items-center gap-2 rounded-lg border border-slate-200 p-1.5 dark:border-slate-700"
                                >
                                    <span className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                                        {avatar ? (
                                            <img
                                                src={avatar}
                                                alt=""
                                                className="size-full object-cover"
                                            />
                                        ) : (
                                            user.name?.charAt(0)
                                        )}
                                    </span>
                                    <ChevronDown className="size-3 text-slate-500" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                                <DropdownMenuLabel>
                                    <p className="truncate">{user.name}</p>
                                    <p className="truncate text-xs font-normal text-slate-500">
                                        {user.email}
                                    </p>
                                    <p className="mt-1 text-xs font-normal capitalize">
                                        {roleLabel}
                                    </p>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {groups
                                    .find((group) => group.id === 'account')
                                    ?.items.map((item) => (
                                        <DropdownMenuItem
                                            key={item.href}
                                            asChild
                                        >
                                            <Link href={item.href}>
                                                <item.icon className="mr-2 size-4" />
                                                {item.title}
                                            </Link>
                                        </DropdownMenuItem>
                                    ))}
                                {canInstall && (
                                    <DropdownMenuItem
                                        onSelect={() => setInstallOpen(true)}
                                    >
                                        <Download className="mr-2 size-4" />
                                        Install app
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onSelect={() => router.post('/logout')}
                                >
                                    <LogOut className="mr-2 size-4" />
                                    Sign out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div className="flex min-h-10 flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2 text-[11px] lg:px-6 dark:border-slate-800">
                        <nav
                            aria-label="Breadcrumb"
                            className="flex min-w-0 flex-wrap items-center gap-1.5 text-slate-500"
                        >
                            <Link
                                href="/dashboard"
                                className="hover:text-emerald-700"
                            >
                                Home
                            </Link>
                            {breadcrumbs?.length
                                ? breadcrumbs.map((crumb, index) => (
                                      <span
                                          className="flex items-center gap-1.5"
                                          key={`${crumb.href}-${index}`}
                                      >
                                          <ChevronRight className="size-3" />
                                          {index === breadcrumbs.length - 1 ? (
                                              <span aria-current="page">
                                                  {crumb.title}
                                              </span>
                                          ) : (
                                              <Link href={crumb.href}>
                                                  {crumb.title}
                                              </Link>
                                          )}
                                      </span>
                                  ))
                                : path !== '/dashboard' && (
                                      <>
                                          <ChevronRight className="size-3" />
                                          <span>
                                              {active?.group.title ??
                                                  'My Account'}
                                          </span>
                                          <ChevronRight className="size-3" />
                                          <Link
                                              href={active?.item.href ?? path}
                                              aria-current={
                                                  action ? undefined : 'page'
                                              }
                                          >
                                              {title}
                                          </Link>
                                          {action && (
                                              <>
                                                  <ChevronRight className="size-3" />
                                                  <span aria-current="page">
                                                      {action}
                                                  </span>
                                              </>
                                          )}
                                      </>
                                  )}
                        </nav>
                        <span className="hidden items-center gap-1.5 text-slate-500 md:flex">
                            <Building2 className="size-3" />
                            {scope}
                        </span>
                    </div>
                </header>
                <main
                    id="admin-content"
                    tabIndex={-1}
                    className="min-w-0 focus:outline-none"
                >
                    <div className="space-y-3 px-4 pt-4 lg:px-6 print:hidden">
                        {siteMaintenance && (
                            <div
                                role="status"
                                className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                            >
                                Maintenance mode is enabled.
                            </div>
                        )}
                        {user.is_read_only && (
                            <div
                                role="status"
                                className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900"
                            >
                                Read-only access: changes are restricted for
                                this account.
                            </div>
                        )}
                        {notice && (
                            <div
                                role={
                                    notice.type === 'error' ? 'alert' : 'status'
                                }
                                className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${notice.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-900' : notice.type === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}
                            >
                                <p className="flex-1 whitespace-pre-line">
                                    {notice.message}
                                </p>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setDismissedFlash(page.props.flash)
                                    }
                                    aria-label="Dismiss message"
                                >
                                    <X className="size-4" />
                                </button>
                            </div>
                        )}
                        {user.role?.name === 'cso' && (
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
                                <p className="font-semibold">
                                    Today's monitoring areas
                                </p>
                                <p className="mt-1">
                                    {user.cso_areas
                                        ?.map((area) => area.name)
                                        .join(', ') ||
                                        'No areas assigned for today'}
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 py-4 lg:py-6 print:p-0">
                        {children}
                    </div>
                </main>
                <footer className="mx-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 py-4 text-[11px] text-slate-500 lg:mx-6 dark:border-slate-800 print:hidden">
                    <span>MisLoan · Microfinance management</span>
                    {user.role?.name === 'super_admin' &&
                        user.account_type !== 'branch' &&
                        user.is_active !== false &&
                        !user.is_read_only && (
                            <button
                                type="button"
                                onClick={() =>
                                    router.post(
                                        '/admin/maintenance/toggle',
                                        {},
                                        { preserveScroll: true },
                                    )
                                }
                                className="flex items-center gap-1.5 rounded px-2 py-1 hover:bg-slate-100"
                            >
                                <Wrench className="size-3" />
                                {siteMaintenance
                                    ? 'Disable maintenance'
                                    : 'Enable maintenance'}
                            </button>
                        )}
                </footer>
            </div>
            <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
                <DialogContent
                    className="gap-0 overflow-hidden p-0 sm:max-w-xl"
                    onOpenAutoFocus={(event) => {
                        event.preventDefault();
                        searchInput.current?.focus();
                    }}
                >
                    <div className="border-b p-5">
                        <DialogTitle>Find a workspace</DialogTitle>
                        <DialogDescription>
                            বাংলা বা English নাম লিখে আপনার প্রয়োজনীয় কাজ
                            খুঁজুন।
                        </DialogDescription>
                        <label className="mt-4 flex items-center gap-2 rounded-lg border px-3">
                            <Search className="size-4 text-slate-400" />
                            <input
                                ref={searchInput}
                                value={query}
                                onChange={(event) =>
                                    setQuery(event.target.value)
                                }
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' && results[0]) {
                                        setSearchOpen(false);
                                        router.visit(results[0].item.href);
                                    }
                                }}
                                aria-label="Search modules"
                                placeholder="যেমন: ঋণ, সদস্য, vouchers…"
                                className="h-11 w-full bg-transparent text-sm outline-none"
                            />
                        </label>
                    </div>
                    <div className="max-h-[55vh] overflow-y-auto p-2">
                        {results.length ? (
                            results.map(({ group, item }) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setSearchOpen(false)}
                                    className="flex items-center gap-3 rounded-lg p-3 hover:bg-slate-100 focus:bg-slate-100 dark:hover:bg-slate-800 dark:focus:bg-slate-800"
                                >
                                    <item.icon className="size-4 text-emerald-600" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">
                                            {item.title}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {group.title}
                                        </p>
                                    </div>
                                    <ChevronRight className="size-4 text-slate-400" />
                                </Link>
                            ))
                        ) : (
                            <p className="p-6 text-center text-sm text-slate-500">
                                কোনো menu পাওয়া যায়নি। অন্য নাম দিয়ে খুঁজুন।
                            </p>
                        )}
                    </div>
                    <p className="border-t px-5 py-3 text-xs text-slate-500">
                        Tab to a result · Enter to open · Esc to close
                    </p>
                </DialogContent>
            </Dialog>
            <Dialog open={installOpen} onOpenChange={setInstallOpen}>
                <DialogContent>
                    <DialogTitle>Install MisLoan</DialogTitle>
                    <DialogDescription>
                        Add MisLoan to this device for quick access. An internet
                        connection is required for financial operations.
                    </DialogDescription>
                    <button
                        type="button"
                        disabled={!canInstall}
                        onClick={async () => {
                            await promptInstall();
                            setInstallOpen(false);
                        }}
                        className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        <Download className="mr-2 inline size-4" />
                        Install app
                    </button>
                </DialogContent>
            </Dialog>
        </div>
    );
}
