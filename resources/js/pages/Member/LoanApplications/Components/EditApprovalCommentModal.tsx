import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { MessageSquare, X, Check, Loader2 } from 'lucide-react';

export interface EditingApprovalItem {
    id: number;
    userName?: string;
    level?: string;
    roleName?: string;
    comments?: string;
    currentComment?: string;
}

interface Props {
    editingApproval: EditingApprovalItem | null;
    onClose: () => void;
    onUpdated?: (approvalId: number, comment: string) => void;
}

export default function EditApprovalCommentModal({
    editingApproval,
    onClose,
    onUpdated,
}: Props) {
    const [comment, setComment] = useState(
        editingApproval?.currentComment ?? editingApproval?.comments ?? ''
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (editingApproval) {
            setComment(editingApproval.currentComment ?? editingApproval.comments ?? '');
            setError(null);
        }
    }, [editingApproval]);

    if (!editingApproval) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const url = `/loan-application-approvals/${editingApproval.id}/update-comment`;

        router.patch(
            url,
            { comments: comment },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setIsSubmitting(false);
                    if (onUpdated) {
                        onUpdated(editingApproval.id, comment);
                    }
                    onClose();
                },
                onError: (errs) => {
                    setIsSubmitting(false);
                    setError(
                        errs.comments ||
                            errs.error ||
                            'মন্তব্য সংরক্ষণ করতে ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।'
                    );
                },
            }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-base">
                                অনুমোদনকারীর মন্তব্য সম্পাদনা
                            </h3>
                            <p className="text-xs text-slate-500">
                                {editingApproval.userName || 'কর্মকর্তা'}{' '}
                                <span className="font-semibold text-slate-700">
                                    ({editingApproval.level || editingApproval.roleName || 'Officer'})
                                </span>
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            মন্তব্য (Comments)
                        </label>
                        <textarea
                            rows={4}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="অনুমোদনকারীর মন্তব্য লিখুন..."
                            className="w-full text-xs sm:text-sm p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition placeholder:text-slate-400 leading-relaxed"
                            autoFocus
                        />
                        <p className="text-[10px] text-slate-400 mt-1 text-right">
                            {comment.length} / 3000 অক্ষর
                        </p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                        >
                            বাতিল
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>সংরক্ষণ হচ্ছে...</span>
                                </>
                            ) : (
                                <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>সংরক্ষণ করুন</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
