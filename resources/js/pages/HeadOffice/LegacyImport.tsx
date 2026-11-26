import { Head, useForm } from '@inertiajs/react';
import { Download, Upload } from 'lucide-react';
import { ComboSelect } from '@/components/ComboSelect';
import AdminLayout from '@/layouts/admin-layout';

interface Branch {
    id: number;
    name: string;
    code: string;
}

interface Props {
    branches: Branch[];
    canManage: boolean;
}

export default function LegacyImport({ branches, canManage }: Props) {
    const form = useForm<{ branch_id: string | number; initial_date: string; file: File | null }>({
        branch_id: branches[0]?.id ?? '',
        initial_date: new Date().toISOString().slice(0, 10),
        file: null,
    });

    return (
        <AdminLayout>
            <Head title="Legacy Opening Balance Import" />

            <div className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">Legacy Opening Balance Importer</h1>
                        <p className="mt-1 text-xs text-slate-500">
                            পুরোনো সিস্টেম থেকে শাখার চলমান লোন ও সঞ্চয় ব্যালেন্স Excel/CSV ফাইলে ইমপোর্ট করুন।
                        </p>
                    </div>
                    <a
                        href="/head-office/legacy-import/template"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                    >
                        <Download className="h-3.5 w-3.5" />
                        Download CSV Template
                    </a>
                </div>

                {canManage && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            form.post('/head-office/legacy-import', { forceFormData: true });
                        }}
                        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                    >
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Branch</label>
                            <ComboSelect
                                size="sm"
                                clearable={false}
                                value={form.data.branch_id ? Number(form.data.branch_id) : null}
                                onChange={(val) => form.setData('branch_id', val ?? '')}
                                items={branches.map((b) => ({
                                    value: b.id,
                                    label: `${b.name} (${b.code})`,
                                    keywords: `${b.name} ${b.code}`,
                                }))}
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Opening Balance Date (Initial Date)</label>
                            <input
                                type="date"
                                value={form.data.initial_date}
                                onChange={(e) => form.setData('initial_date', e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Excel / CSV File</label>
                            <input
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                onChange={(e) => form.setData('file', e.target.files?.[0] ?? null)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={form.processing || !form.data.file}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                        >
                            <Upload className="h-3.5 w-3.5" />
                            Upload & Import Opening Balances
                        </button>
                    </form>
                )}
            </div>
        </AdminLayout>
    );
}
