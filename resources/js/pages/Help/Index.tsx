import { Head, Link, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    BookOpen,
    Edit3,
    HelpCircle,
    PlayCircle,
    Save,
    Search,
    Video,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/layouts/admin-layout';

interface HelpStep {
    step_title: string;
    instruction: string;
    route_href?: string;
    route_label?: string;
}

interface HelpGuide {
    id: number;
    slug: string;
    part_number: number;
    title_bn: string;
    summary_bn: string;
    roles: string[];
    steps_bn: HelpStep[];
    tips_bn: string[] | null;
    video_url: string | null;
    video_duration: string | null;
    is_published: boolean;
}

interface Props {
    guides: HelpGuide[];
    roleLabel: string;
    roleName: string;
    canManage: boolean;
}

function resolveVideoEmbed(url: string | null): { type: 'iframe' | 'video' | 'none'; src: string } {
    if (!url || !url.trim()) {
        return { type: 'none', src: '' };
    }

    const trimmed = url.trim();
    const ytMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    if (ytMatch) {
        return { type: 'iframe', src: `https://www.youtube.com/embed/${ytMatch[1]}` };
    }

    const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (driveMatch) {
        return { type: 'iframe', src: `https://drive.google.com/file/d/${driveMatch[1]}/preview` };
    }

    if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(trimmed)) {
        return { type: 'video', src: trimmed };
    }

    return { type: 'iframe', src: trimmed };
}

export default function HelpIndex({ guides, roleLabel, canManage }: Props) {
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<number>(guides[0]?.id ?? 0);
    const [editing, setEditing] = useState(false);

    const filteredGuides = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return guides;
        return guides.filter((g) => {
            const hay = [
                g.title_bn,
                g.summary_bn,
                ...(g.steps_bn || []).map((s) => `${s.step_title} ${s.instruction}`),
                ...(g.tips_bn || []),
            ]
                .join(' ')
                .toLowerCase();
            return hay.includes(q);
        });
    }, [guides, search]);

    const activeGuide = useMemo(() => {
        return filteredGuides.find((g) => g.id === selectedId) ?? filteredGuides[0] ?? null;
    }, [filteredGuides, selectedId]);

    const form = useForm({
        title_bn: activeGuide?.title_bn ?? '',
        summary_bn: activeGuide?.summary_bn ?? '',
        video_url: activeGuide?.video_url ?? '',
        video_duration: activeGuide?.video_duration ?? '',
        is_published: activeGuide?.is_published ?? true,
    });

    useEffect(() => {
        if (!activeGuide) return;
        form.setData({
            title_bn: activeGuide.title_bn,
            summary_bn: activeGuide.summary_bn,
            video_url: activeGuide.video_url ?? '',
            video_duration: activeGuide.video_duration ?? '',
            is_published: activeGuide.is_published,
        });
        setEditing(false);
    }, [activeGuide?.id]);

    const video = resolveVideoEmbed(activeGuide?.video_url ?? null);

    return (
        <AdminLayout>
            <Head title="সফটওয়্যার ব্যবহারের সহায়িকা (Help Guide)" />

            <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <HelpCircle className="h-5 w-5 text-brand" />
                            <h1 className="text-lg font-bold text-slate-900">
                                সফটওয়্যার পরিচালনার সহজ বাংলা গাইড ও ভিডিও টিউটোরিয়াল
                            </h1>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                            আপনার কাজের ধরন অনুযায়ী ধাপে ধাপে নির্দেশনা ও ভিডিও সাজানো হয়েছে। আপনার বর্তমান রোল:{' '}
                            <span className="rounded-full bg-brand/10 px-2.5 py-0.5 font-bold text-brand">{roleLabel}</span>
                        </p>
                    </div>

                    <div className="relative w-full md:w-72">
                        <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="কী খুঁজছেন লিখুন (যেমন: কিস্তি, ভাউচার)..."
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-xs focus:border-brand focus:bg-white focus:outline-none"
                        />
                    </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-12">
                    {/* Part-by-Part List */}
                    <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs lg:col-span-4">
                        <div className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            অংশসমূহ ({filteredGuides.length}টি পার্ট)
                        </div>
                        {filteredGuides.length === 0 ? (
                            <p className="py-6 text-center text-xs text-slate-400">কোনো গাইড পাওয়া যায়নি</p>
                        ) : (
                            filteredGuides.map((g) => {
                                const active = activeGuide?.id === g.id;
                                return (
                                    <button
                                        key={g.id}
                                        type="button"
                                        onClick={() => setSelectedId(g.id)}
                                        className={`flex w-full items-start gap-2.5 rounded-xl border p-3 text-left transition-all ${
                                            active
                                                ? 'border-brand bg-brand/5 text-brand-dark shadow-xs'
                                                : 'border-transparent hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        <span
                                            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${
                                                active ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600'
                                            }`}
                                        >
                                            {g.part_number}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs font-bold leading-snug">{g.title_bn}</div>
                                            <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                                                <span className="inline-flex items-center gap-1">
                                                    <Video className="h-3 w-3" />
                                                    {g.video_url ? 'ভিডিও যুক্ত আছে' : 'ভিডিও যুক্ত হয়নি'}
                                                </span>
                                                {g.video_duration && <span>• {g.video_duration}</span>}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {/* Active Part Details & Video */}
                    <div className="space-y-5 lg:col-span-8">
                        {activeGuide ? (
                            <>
                                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <h2 className="text-base font-bold text-slate-900">{activeGuide.title_bn}</h2>
                                            <p className="mt-1 text-xs leading-relaxed text-slate-600">{activeGuide.summary_bn}</p>
                                        </div>
                                        {canManage && (
                                            <button
                                                type="button"
                                                onClick={() => setEditing(!editing)}
                                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                                            >
                                                <Edit3 className="h-3.5 w-3.5" />
                                                {editing ? 'বন্ধ করুন' : 'ভিডিও / তথ্য এডিট করুন'}
                                            </button>
                                        )}
                                    </div>

                                    {editing && canManage && (
                                        <form
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                form.put(`/help/${activeGuide.id}`, {
                                                    onSuccess: () => setEditing(false),
                                                });
                                            }}
                                            className="space-y-3 rounded-xl border border-brand/25 bg-brand/5 p-4"
                                        >
                                            <div className="grid gap-3 md:grid-cols-2">
                                                <div>
                                                    <label className="mb-1 block text-xs font-semibold text-slate-700">শিরোনাম (বাংলা)</label>
                                                    <input
                                                        type="text"
                                                        value={form.data.title_bn}
                                                        onChange={(e) => form.setData('title_bn', e.target.value)}
                                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                                                        ভিডিও লিংক (YouTube / Google Drive / MP4)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={form.data.video_url}
                                                        onChange={(e) => form.setData('video_url', e.target.value)}
                                                        placeholder="https://www.youtube.com/watch?v=..."
                                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid gap-3 md:grid-cols-3">
                                                <div className="md:col-span-2">
                                                    <label className="mb-1 block text-xs font-semibold text-slate-700">সংক্ষিপ্ত বিবরণ</label>
                                                    <input
                                                        type="text"
                                                        value={form.data.summary_bn}
                                                        onChange={(e) => form.setData('summary_bn', e.target.value)}
                                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-xs font-semibold text-slate-700">সময়কাল (Duration)</label>
                                                    <input
                                                        type="text"
                                                        value={form.data.video_duration}
                                                        onChange={(e) => form.setData('video_duration', e.target.value)}
                                                        placeholder="04:30"
                                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={form.data.is_published}
                                                        onChange={(e) => form.setData('is_published', e.target.checked)}
                                                        className="rounded border-slate-300"
                                                    />
                                                    সবার জন্য প্রকাশিত রাখুন
                                                </label>
                                                <button
                                                    type="submit"
                                                    disabled={form.processing}
                                                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white"
                                                >
                                                    <Save className="h-3.5 w-3.5" />
                                                    সেভ করুন
                                                </button>
                                            </div>
                                        </form>
                                    )}

                                    {/* Video Player Area */}
                                    {video.type === 'iframe' ? (
                                        <div className="aspect-video overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
                                            <iframe
                                                src={video.src}
                                                title={activeGuide.title_bn}
                                                className="h-full w-full"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            />
                                        </div>
                                    ) : video.type === 'video' ? (
                                        <video
                                            src={video.src}
                                            controls
                                            className="aspect-video w-full rounded-xl border border-slate-200 bg-slate-950"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center">
                                            <PlayCircle className="h-9 w-9 text-slate-400" />
                                            <p className="mt-2 text-xs font-bold text-slate-700">
                                                এই অংশের ভিডিও টিউটোরিয়াল এখনো আপলোড করা হয়নি
                                            </p>
                                            <p className="mt-1 text-[11px] text-slate-500">
                                                {canManage
                                                    ? 'ওপরের "ভিডিও / তথ্য এডিট করুন" বাটনে ক্লিক করে YouTube, Google Drive বা MP4 ভিডিও লিংক বসিয়ে দিন।'
                                                    : 'নিচের ধাপে ধাপে সহজ বাংলা নির্দেশনা পড়ে কাজটি করতে পারবেন।'}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Step-by-Step Instructions */}
                                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                                        <BookOpen className="h-4 w-4 text-brand" />
                                        ধাপে ধাপে কাজের নিয়ম
                                    </div>
                                    <div className="space-y-3">
                                        {(activeGuide.steps_bn || []).map((step, idx) => (
                                            <div
                                                key={idx}
                                                className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                                            >
                                                <div className="space-y-1">
                                                    <div className="text-xs font-bold text-slate-900">
                                                        ধাপ {idx + 1}: {step.step_title}
                                                    </div>
                                                    <p className="text-xs leading-relaxed text-slate-600">{step.instruction}</p>
                                                </div>
                                                {step.route_href && (
                                                    <Link
                                                        href={step.route_href}
                                                        className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-brand/25 bg-white px-3 py-1.5 text-[11px] font-bold text-brand hover:bg-brand hover:text-white transition-colors"
                                                    >
                                                        <span>{step.route_label || 'পেজে যান'}</span>
                                                        <ArrowRight className="h-3 w-3" />
                                                    </Link>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Tips & Common Mistakes */}
                                {activeGuide.tips_bn && activeGuide.tips_bn.length > 0 && (
                                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-2">
                                        <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                                            জরুরি সতর্কতা ও সাধারণ ভুল এড়ানোর উপায়
                                        </div>
                                        <ul className="list-disc space-y-1 pl-5 text-xs text-amber-900">
                                            {activeGuide.tips_bn.map((tip, i) => (
                                                <li key={i}>{tip}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </>
                        ) : null}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
