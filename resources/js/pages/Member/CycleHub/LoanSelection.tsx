import AdminLayout from '@/layouts/admin-layout';
import { toEnglishDigits } from '@/utils/memberCodeUtils';
import { Head, Link, useForm } from '@inertiajs/react';

export default function LoanSelection({
    cycle,
    admission,
    loan,
    categories,
}: {
    cycle: { id: number; number: number; revision: number };
    admission: {
        applicant_name_bn: string;
        applicant_name_en: string;
        application_no: string;
        id: number;
    };
    loan: {
        id: number;
        loan_category_id: number;
        loan_product_id: number;
        requested_amount: string;
    } | null;
    categories: Array<{
        id: number;
        category_name: string;
        category_name_bn?: string;
        loan_products: Array<{
            id: number;
            product_name: string;
            product_name_bn?: string;
            min_amount: string;
            max_amount: string;
        }>;
    }>;
}) {
    const form = useForm({
        revision: cycle.revision,
        loan_category_id: loan?.loan_category_id || '',
        loan_product_id: loan?.loan_product_id || '',
        requested_amount: loan?.requested_amount || '',
    });
    const products =
        categories.find(
            (category) => category.id === Number(form.data.loan_category_id),
        )?.loan_products || [];
    const product = products.find(
        (item) => item.id === Number(form.data.loan_product_id),
    );
    return (
        <AdminLayout>
            <Head title={`দফা ${cycle.number} — ঋণ নির্বাচন`} />
            <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-8">
                <h1 className="text-2xl font-bold">
                    দফা {cycle.number} — ঋণ নির্বাচন
                </h1>
                <p>
                    {admission.applicant_name_bn || admission.applicant_name_en}{' '}
                    · সদস্য নং {admission.application_no}
                </p>
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
                    নির্বাচিত ঋণ অনুযায়ী প্রয়োজনীয় ফর্ম আসবে। আগের ফর্মের
                    প্রযোজ্য তথ্য দিয়ে পূরণ থাকবে; প্রয়োজনীয় তথ্য যাচাই করে
                    সংরক্ষণ করবেন।
                </p>
                <form
                    className="space-y-5 rounded-2xl border bg-white p-5"
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (
                            loan &&
                            (Number(form.data.loan_product_id) !==
                                loan.loan_product_id ||
                                Number(form.data.requested_amount) !==
                                    Number(loan.requested_amount)) &&
                            !confirm(
                                'ঋণের নির্বাচন বদলালে অপ্রযোজ্য ফর্ম বাদ যাবে এবং সংশ্লিষ্ট ফর্ম আবার যাচাই করতে হবে। চালিয়ে যাবেন?',
                            )
                        )
                            return;
                        form.post(
                            `/member/cycle-hub/renewals/${cycle.id}/loan`,
                        );
                    }}
                >
                    {Object.entries(form.errors).map(([key, message]) => (
                        <p
                            role="alert"
                            key={key}
                            className="text-sm text-red-700"
                        >
                            {message}
                        </p>
                    ))}
                    <label className="block text-sm">
                        ঋণের ক্যাটাগরি
                        <select
                            required
                            value={form.data.loan_category_id}
                            onChange={(event) =>
                                form.setData((data) => ({
                                    ...data,
                                    loan_category_id: Number(
                                        event.target.value,
                                    ),
                                    loan_product_id: '',
                                }))
                            }
                            className="mt-2 w-full rounded-lg border p-3"
                        >
                            <option value="">নির্বাচন করুন</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.category_name_bn ||
                                        category.category_name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="block text-sm">
                        ঋণের প্রোডাক্ট
                        <select
                            required
                            value={form.data.loan_product_id}
                            onChange={(event) =>
                                form.setData(
                                    'loan_product_id',
                                    Number(event.target.value),
                                )
                            }
                            className="mt-2 w-full rounded-lg border p-3"
                        >
                            <option value="">নির্বাচন করুন</option>
                            {products.map((item) => (
                                <option value={item.id} key={item.id}>
                                    {item.product_name_bn || item.product_name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="block text-sm">
                        ঋণের পরিমাণ
                        <input
                            required
                            inputMode="decimal"
                            value={form.data.requested_amount}
                            onChange={(event) =>
                                form.setData(
                                    'requested_amount',
                                    toEnglishDigits(event.target.value),
                                )
                            }
                            className="mt-2 w-full rounded-lg border p-3"
                        />
                    </label>
                    {product && (
                        <p className="text-sm text-slate-600">
                            অনুমোদিত সীমা: ৳
                            {Number(product.min_amount).toLocaleString()} — ৳
                            {Number(product.max_amount).toLocaleString()}
                        </p>
                    )}
                    <div className="flex flex-wrap gap-3">
                        <button
                            disabled={form.processing}
                            type="submit"
                            className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white disabled:opacity-50"
                        >
                            সংরক্ষণ ও ফর্ম খুলুন
                        </button>
                        <Link
                            href={`/member/cycle-hub/renewals/${cycle.id}/admission`}
                            className="rounded-xl border px-5 py-3"
                        >
                            ভর্তি তথ্য দেখুন
                        </Link>
                        <Link
                            href={`/member/cycle-hub/cycle/${admission.id}${loan ? `?loan_id=${loan.id}` : ''}`}
                            className="rounded-xl border px-5 py-3"
                        >
                            দফার ফাইলে ফিরুন
                        </Link>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
