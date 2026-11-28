import { Head, router, useForm } from '@inertiajs/react';
import { FileText, Save, Trash2 } from 'lucide-react';
import { ComboSelect } from '@/components/ComboSelect';
import AdminLayout from '@/layouts/admin-layout';

interface LedgerAccount {
    id: number;
    code: string;
    name: string;
    type: string;
}

interface NoteRow {
    id: number;
    note_no?: string | null;
    title: string;
    note_date: string;
    content: string;
    ledger_account?: { id: number; code: string; name: string } | null;
    creator?: { id: number; name: string } | null;
}

interface Props {
    branch: { id: number; name: string; code: string } | null;
    notes: NoteRow[];
    accounts: LedgerAccount[];
    canManage: boolean;
}

export default function Notes({ branch, notes, accounts, canManage }: Props) {
    const form = useForm({
        branch_id: branch?.id ?? '',
        note_no: '',
        title: '',
        note_date: new Date().toISOString().slice(0, 10),
        ledger_account_id: '',
        content: '',
    });

    return (
        <AdminLayout>
            <Head title="Note Entries" />
            <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <h1 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                        <FileText className="h-5 w-5 text-brand" />
                        Account Note Entries
                    </h1>
                    <p className="mt-1 text-xs text-slate-500">
                        {branch ? `শাখা: ${branch.code} — ${branch.name}` : 'শাখা নির্ধারিত নেই'} • আর্থিক বিবরণী ও অডিটের জন্য নোট সংরক্ষণ করুন।
                    </p>
                </div>

                {canManage && branch && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            form.post('/accounting/notes', {
                                onSuccess: () => form.reset('note_no', 'title', 'ledger_account_id', 'content'),
                            });
                        }}
                        className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs md:grid-cols-3"
                    >
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Note No.</label>
                            <input
                                type="text"
                                value={form.data.note_no}
                                onChange={(e) => form.setData('note_no', e.target.value)}
                                placeholder="যেমন: Note-01"
                                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Title *</label>
                            <input
                                type="text"
                                value={form.data.title}
                                onChange={(e) => form.setData('title', e.target.value)}
                                placeholder="নোটের শিরোনাম"
                                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                                required
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Date *</label>
                            <input
                                type="date"
                                value={form.data.note_date}
                                onChange={(e) => form.setData('note_date', e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                                required
                            />
                        </div>
                        <div className="md:col-span-3">
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Ledger Account (Optional)</label>
                            <ComboSelect
                                size="sm"
                                value={form.data.ledger_account_id ? Number(form.data.ledger_account_id) : null}
                                onChange={(val) => form.setData('ledger_account_id', val ? String(val) : '')}
                                items={accounts.map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
                                placeholder="ঐচ্ছিক লেজার নির্বাচন করুন"
                            />
                        </div>
                        <div className="md:col-span-3">
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Note Details *</label>
                            <textarea
                                rows={3}
                                value={form.data.content}
                                onChange={(e) => form.setData('content', e.target.value)}
                                placeholder="বিস্তারিত নোট লিখুন..."
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                                required
                            />
                        </div>
                        <div>
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white"
                            >
                                <Save className="h-3.5 w-3.5" />
                                Save Note
                            </button>
                        </div>
                    </form>
                )}

                <div className="space-y-3">
                    {notes.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
                            কোনো নোট এন্ট্রি পাওয়া যায়নি।
                        </div>
                    ) : (
                        notes.map((n) => (
                            <div key={n.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            {n.note_no && (
                                                <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700">
                                                    {n.note_no}
                                                </span>
                                            )}
                                            <h3 className="text-sm font-bold text-slate-900">{n.title}</h3>
                                        </div>
                                        <div className="mt-0.5 text-[11px] text-slate-500">
                                            তারিখ: {n.note_date}
                                            {n.ledger_account ? ` • লেজার: ${n.ledger_account.code} — ${n.ledger_account.name}` : ''}
                                            {n.creator ? ` • লেখক: ${n.creator.name}` : ''}
                                        </div>
                                    </div>
                                    {canManage && (
                                        <button
                                            type="button"
                                            onClick={() => router.delete(`/accounting/notes/${n.id}`)}
                                            className="rounded p-1 text-rose-500 hover:bg-rose-50"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                                <p className="mt-2 whitespace-pre-wrap text-xs text-slate-700">{n.content}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
