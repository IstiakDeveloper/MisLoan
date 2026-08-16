import React, { useEffect, useState } from 'react';
import { Lock, X } from 'lucide-react';

interface Props {
    open: boolean;
    title: string;
    description: string;
    processing?: boolean;
    onClose: () => void;
    onConfirm: (pin: string) => void;
}

export default function SuperAdminDeletePinModal({
    open,
    title,
    description,
    processing = false,
    onClose,
    onConfirm,
}: Props) {
    const [pin, setPin] = useState('');

    useEffect(() => {
        if (open) {
            setPin('');
        }
    }, [open]);

    if (!open) {
        return null;
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!pin.trim()) {
            return;
        }
        onConfirm(pin.trim());
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
                <div className="bg-rose-600 text-white px-4 py-3.5 flex items-center justify-between">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        {title}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-rose-700"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            SuperAdmin Delete PIN <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="password"
                            inputMode="numeric"
                            autoFocus
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm tracking-widest focus:ring-1 focus:ring-rose-500 focus:bg-white"
                            placeholder="PIN লিখুন"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200"
                        >
                            বাতিল
                        </button>
                        <button
                            type="submit"
                            disabled={processing || !pin.trim()}
                            className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-xl hover:bg-rose-700 disabled:opacity-50"
                        >
                            {processing ? 'মুছে ফেলা হচ্ছে...' : 'মুছে ফেলুন'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
