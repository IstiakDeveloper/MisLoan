import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Shield,
    Lock,
    Eye,
    EyeOff,
    CheckCircle2,
    RefreshCw,
    User,
    Banknote,
    FileText,
    ArrowRightLeft,
    AlertCircle,
} from 'lucide-react';

interface MemberCategoryItem {
    id: number;
    category_name: string;
    category_name_bn: string;
}

interface LoanProductItem {
    id: number;
    loan_category_id: number;
    product_name: string;
    product_name_bn: string;
    product_code: string;
    duration_months?: number;
    min_amount?: number;
    max_amount?: number;
    installment_type?: string;
}

interface LoanCategoryItem {
    id: number;
    category_name: string;
    category_name_bn: string;
    category_code: string;
    loan_products?: LoanProductItem[];
}

interface SamityItem {
    id: number;
    samity_name: string;
    samity_name_bn: string;
    samity_code: string;
    branch_id: number;
}

interface Props {
    open: boolean;
    onClose: () => void;
    admission: any;
    loanApplication: any | null;
    currentDofa: number;
    isUnlocked?: boolean;
    memberCategories?: MemberCategoryItem[];
    loanCategories?: LoanCategoryItem[];
    samities?: SamityItem[];
}

export default function CycleOverrideModal({
    open,
    onClose,
    admission,
    loanApplication,
    currentDofa,
    isUnlocked = false,
    memberCategories = [],
    loanCategories = [],
    samities = [],
}: Props) {
    const [activeTab, setActiveTab] = useState<'admission' | 'loan'>('admission');
    const [pin, setPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [autoSyncCategory, setAutoSyncCategory] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Admission form state
    const [admissionForm, setAdmissionForm] = useState({
        member_category_id: admission.member_category_id || '',
        application_no: admission.application_no || '',
        applicant_name_bn: admission.applicant_name_bn || '',
        applicant_name_en: admission.applicant_name_en || '',
        father_name_bn: admission.father_name_bn || '',
        mother_name_bn: admission.mother_name_bn || '',
        spouse_name_bn: admission.spouse_name_bn || '',
        mobile_number: admission.mobile_number || '',
        alternative_mobile: admission.alternative_mobile || '',
        nid_number: admission.nid_number || '',
        smart_card_number: admission.smart_card_number || '',
        date_of_birth: admission.date_of_birth || '',
        gender: admission.gender || 'female',
        marital_status: admission.marital_status || 'married',
        present_village_road: admission.present_village_road || '',
        present_union: admission.present_union || '',
        present_upazila: admission.present_upazila || '',
        present_district: admission.present_district || '',
        present_post_code: admission.present_post_code || '',
        permanent_village_road: admission.permanent_village_road || '',
        permanent_union: admission.permanent_union || '',
        permanent_upazila: admission.permanent_upazila || '',
        permanent_district: admission.permanent_district || '',
        samity_id: admission.samity_id || '',
        monthly_income: admission.monthly_income ?? '',
        monthly_expense: admission.monthly_expense ?? '',
        monthly_savings: admission.monthly_savings ?? '',
        total_land_amount: admission.total_land_amount ?? '',
        total_land_value: admission.total_land_value ?? '',
        house_type: admission.house_type || '',
        project_name: admission.project_name || '',
        estimated_annual_project_income: admission.estimated_annual_project_income ?? '',
        status: admission.status || 'approved',
    });

    // Loan form state
    const [loanForm, setLoanForm] = useState({
        id: loanApplication?.id || '',
        loan_category_id: loanApplication?.loan_category_id || '',
        loan_product_id: loanApplication?.loan_product_id || '',
        requested_amount: loanApplication?.requested_amount ?? '',
        approved_amount: loanApplication?.approved_amount ?? '',
        disbursed_amount: loanApplication?.disbursed_amount ?? '',
        loan_term_months: loanApplication?.loan_term_months || loanApplication?.loan_product?.duration_months || 12,
        number_of_installments: loanApplication?.number_of_installments || 12,
        installment_amount: loanApplication?.installment_amount ?? '',
        status: loanApplication?.status || 'draft',
        purpose_of_loan: loanApplication?.purpose_of_loan || loanApplication?.project_name || '',
    });

    // Reset when modal opens
    useEffect(() => {
        if (open) {
            setPin('');
            setShowPin(false);
            setErrorMessage(null);
            setAdmissionForm({
                member_category_id: admission.member_category_id || '',
                application_no: admission.application_no || '',
                applicant_name_bn: admission.applicant_name_bn || '',
                applicant_name_en: admission.applicant_name_en || '',
                father_name_bn: admission.father_name_bn || '',
                mother_name_bn: admission.mother_name_bn || '',
                spouse_name_bn: admission.spouse_name_bn || '',
                mobile_number: admission.mobile_number || '',
                alternative_mobile: admission.alternative_mobile || '',
                nid_number: admission.nid_number || '',
                smart_card_number: admission.smart_card_number || '',
                date_of_birth: admission.date_of_birth || '',
                gender: admission.gender || 'female',
                marital_status: admission.marital_status || 'married',
                present_village_road: admission.present_village_road || '',
                present_union: admission.present_union || '',
                present_upazila: admission.present_upazila || '',
                present_district: admission.present_district || '',
                present_post_code: admission.present_post_code || '',
                permanent_village_road: admission.permanent_village_road || '',
                permanent_union: admission.permanent_union || '',
                permanent_upazila: admission.permanent_upazila || '',
                permanent_district: admission.permanent_district || '',
                samity_id: admission.samity_id || '',
                monthly_income: admission.monthly_income ?? '',
                monthly_expense: admission.monthly_expense ?? '',
                monthly_savings: admission.monthly_savings ?? '',
                total_land_amount: admission.total_land_amount ?? '',
                total_land_value: admission.total_land_value ?? '',
                house_type: admission.house_type || '',
                project_name: admission.project_name || '',
                estimated_annual_project_income: admission.estimated_annual_project_income ?? '',
                status: admission.status || 'approved',
            });

            if (loanApplication) {
                setLoanForm({
                    id: loanApplication.id,
                    loan_category_id: loanApplication.loan_category_id || '',
                    loan_product_id: loanApplication.loan_product_id || '',
                    requested_amount: loanApplication.requested_amount ?? '',
                    approved_amount: loanApplication.approved_amount ?? '',
                    disbursed_amount: loanApplication.disbursed_amount ?? '',
                    loan_term_months: loanApplication.loan_term_months || loanApplication.loan_product?.duration_months || 12,
                    number_of_installments: loanApplication.number_of_installments || 12,
                    installment_amount: loanApplication.installment_amount ?? '',
                    status: loanApplication.status || 'draft',
                    purpose_of_loan: loanApplication.purpose_of_loan || loanApplication.project_name || '',
                });
            }
        }
    }, [open, admission, loanApplication]);

    // Available products for selected loan category
    const selectedLoanCat = loanCategories.find((c) => String(c.id) === String(loanForm.loan_category_id));
    const availableProducts = selectedLoanCat?.loan_products || [];

    // When member category changes and auto-sync is on, match loan category
    const handleMemberCategoryChange = (catId: number | string) => {
        setAdmissionForm((prev) => ({ ...prev, member_category_id: catId }));

        if (autoSyncCategory && catId) {
            const selectedMemberCat = memberCategories.find((m) => String(m.id) === String(catId));
            if (selectedMemberCat) {
                // Find matching loan category
                const matchedLoanCat = loanCategories.find(
                    (lc) =>
                        lc.category_name.toLowerCase() === selectedMemberCat.category_name.toLowerCase() ||
                        lc.category_name_bn === selectedMemberCat.category_name_bn ||
                        lc.category_name.toLowerCase().includes(selectedMemberCat.category_name.toLowerCase())
                );

                if (matchedLoanCat) {
                    setLoanForm((prev) => {
                        const newCatProducts = matchedLoanCat.loan_products || [];
                        const defaultProduct = newCatProducts[0];
                        return {
                            ...prev,
                            loan_category_id: matchedLoanCat.id,
                            loan_product_id: defaultProduct ? defaultProduct.id : prev.loan_product_id,
                            loan_term_months: defaultProduct?.duration_months || prev.loan_term_months,
                        };
                    });
                }
            }
        }
    };

    const handleLoanCategoryChange = (loanCatId: number | string) => {
        const foundCat = loanCategories.find((c) => String(c.id) === String(loanCatId));
        const firstProd = foundCat?.loan_products?.[0];

        setLoanForm((prev) => ({
            ...prev,
            loan_category_id: loanCatId,
            loan_product_id: firstProd ? firstProd.id : '',
            loan_term_months: firstProd?.duration_months || prev.loan_term_months,
        }));
    };

    const handleLoanProductChange = (prodId: number | string) => {
        const prod = availableProducts.find((p) => String(p.id) === String(prodId));
        setLoanForm((prev) => ({
            ...prev,
            loan_product_id: prodId,
            loan_term_months: prod?.duration_months || prev.loan_term_months,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);

        if (!isUnlocked && !pin.trim()) {
            setErrorMessage('অনুগ্রহ করে আপনার পিন (PIN) বা লগইন পাসওয়ার্ড প্রদান করুন।');
            return;
        }

        setProcessing(true);

        try {
            const payload: any = {
                admission: admissionForm,
                auto_sync_category: autoSyncCategory,
            };

            if (loanApplication) {
                payload.loan = loanForm;
                payload.loan_id = loanApplication.id;
            }

            if (!isUnlocked) {
                payload.pin = pin.trim();
            }

            const response = await fetch(`/member/cycle-hub/override/${admission.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                alert(data.message || 'সদস্য ভর্তি ও ঋণের তথ্য সফলভাবে আপডেট এবং সিঙ্ক করা হয়েছে!');
                onClose();
                // Reload Inertia page preserving scroll to show updated dossier
                router.reload({ preserveScroll: true });
            } else {
                setErrorMessage(data.message || 'আপডেট সম্পন্ন করতে ব্যর্থ হয়েছে।');
            }
        } catch (err: any) {
            console.error('Cycle override error:', err);
            setErrorMessage('সার্ভারে ত্রুটি হয়েছে: ' + (err.message || 'অনুগ্রহ করে আবার চেষ্টা করুন।'));
        } finally {
            setProcessing(false);
        }
    };

    if (!open) return null;

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 border border-slate-200 rounded-2xl shadow-2xl">
                {/* Header with distinguished amber/indigo theme */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 border-b border-slate-800">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                                <Shield className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                                    হেড অফিস / অ্যাডমিন ডাটা সম্পাদন ও অটো-সিঙ্ক
                                </DialogTitle>
                                <DialogDescription className="text-xs text-slate-300 mt-0.5">
                                    সদস্য: <strong>{admission.applicant_name_bn}</strong> ({admission.application_no}) | দফা: <strong>{currentDofa}</strong>
                                </DialogDescription>
                            </div>
                        </div>
                        <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs px-2.5 py-1 shrink-0">
                            যেকোনো অবস্থায় প্রযোজ্য
                        </Badge>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex gap-2 mt-4 pt-3 border-t border-slate-800/80">
                        <button
                            type="button"
                            onClick={() => setActiveTab('admission')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                                activeTab === 'admission'
                                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            <User className="w-3.5 h-3.5" />
                            <span>১. সদস্য ভর্তি ও ক্যাটাগরি</span>
                        </button>

                        {loanApplication && (
                            <button
                                type="button"
                                onClick={() => setActiveTab('loan')}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                                    activeTab === 'loan'
                                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                            }`}
                            >
                                <Banknote className="w-3.5 h-3.5" />
                                <span>২. ঋণ প্রোফাইল ও প্রোডাক্ট</span>
                            </button>
                        )}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
                    {/* Error Banner */}
                    {errorMessage && (
                        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {/* TAB 1: ADMISSION INFORMATION */}
                    {activeTab === 'admission' && (
                        <div className="space-y-4">
                            {/* Member Category & Auto-sync Highlight Box */}
                            <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 space-y-3">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <Label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                                        <ArrowRightLeft className="w-4 h-4 text-amber-600" />
                                        সদস্য ক্যাটাগরি (Member Category) <span className="text-rose-500">*</span>
                                    </Label>
                                    <label className="flex items-center gap-2 text-xs font-medium text-amber-900 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={autoSyncCategory}
                                            onChange={(e) => setAutoSyncCategory(e.target.checked)}
                                            className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                                        />
                                        <span>ঋণ প্রোফাইলে সংশ্লিষ্ট ক্যাটাগরি অটো-সিঙ্ক করুন</span>
                                    </label>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <select
                                            value={admissionForm.member_category_id}
                                            onChange={(e) => handleMemberCategoryChange(e.target.value)}
                                            className="w-full text-xs font-bold text-slate-800 bg-white border border-amber-300 rounded-xl p-2.5 focus:ring-2 focus:ring-amber-500/20"
                                            required
                                        >
                                            <option value="">-- ক্যাটাগরি নির্বাচন করুন --</option>
                                            {memberCategories.map((cat) => (
                                                <option key={cat.id} value={cat.id}>
                                                    {cat.category_name_bn || cat.category_name} ({cat.category_name})
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-[11px] text-amber-800 mt-1">
                                            (যেমন: অগ্রসর থেকে সোপান বা অন্য কোনো ক্যাটাগরিতে পরিবর্তন করলে সাথে সাথে সব ফর্মে সিঙ্ক হবে)
                                        </p>
                                    </div>

                                    <div>
                                        <Label className="text-xs font-semibold text-slate-700">সমিতি (Samity)</Label>
                                        <select
                                            value={admissionForm.samity_id}
                                            onChange={(e) => setAdmissionForm({ ...admissionForm, samity_id: e.target.value })}
                                            className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-amber-500/20 mt-1"
                                        >
                                            <option value="">-- সমিতি নির্বাচন করুন --</option>
                                            {samities.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.samity_name_bn || s.samity_name} ({s.samity_code})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Personal Details */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700">সদস্য কোড / আবেদন নং</Label>
                                    <Input
                                        value={admissionForm.application_no}
                                        onChange={(e) => setAdmissionForm({ ...admissionForm, application_no: e.target.value })}
                                        className="text-xs font-mono font-bold mt-1"
                                        placeholder="0001000045"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700">আবেদনকারীর নাম (বাংলা)</Label>
                                    <Input
                                        value={admissionForm.applicant_name_bn}
                                        onChange={(e) => setAdmissionForm({ ...admissionForm, applicant_name_bn: e.target.value })}
                                        className="text-xs font-semibold mt-1"
                                        placeholder="বাংলা নাম"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700">আবেদনকারীর নাম (English)</Label>
                                    <Input
                                        value={admissionForm.applicant_name_en}
                                        onChange={(e) => setAdmissionForm({ ...admissionForm, applicant_name_en: e.target.value })}
                                        className="text-xs mt-1"
                                        placeholder="Name in English"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700">পিতার নাম (বাংলা)</Label>
                                    <Input
                                        value={admissionForm.father_name_bn}
                                        onChange={(e) => setAdmissionForm({ ...admissionForm, father_name_bn: e.target.value })}
                                        className="text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700">স্বামীর নাম (বাংলা)</Label>
                                    <Input
                                        value={admissionForm.spouse_name_bn}
                                        onChange={(e) => setAdmissionForm({ ...admissionForm, spouse_name_bn: e.target.value })}
                                        className="text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700">মাতার নাম (বাংলা)</Label>
                                    <Input
                                        value={admissionForm.mother_name_bn}
                                        onChange={(e) => setAdmissionForm({ ...admissionForm, mother_name_bn: e.target.value })}
                                        className="text-xs mt-1"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700">মোবাইল নম্বর</Label>
                                    <Input
                                        value={admissionForm.mobile_number}
                                        onChange={(e) => setAdmissionForm({ ...admissionForm, mobile_number: e.target.value })}
                                        className="text-xs font-mono font-semibold mt-1"
                                        placeholder="017XXXXXXXX"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700">জাতীয় পরিচয়পত্র (NID)</Label>
                                    <Input
                                        value={admissionForm.nid_number}
                                        onChange={(e) => setAdmissionForm({ ...admissionForm, nid_number: e.target.value })}
                                        className="text-xs font-mono mt-1"
                                        placeholder="NID নম্বর"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700">স্মার্ট কার্ড নম্বর</Label>
                                    <Input
                                        value={admissionForm.smart_card_number}
                                        onChange={(e) => setAdmissionForm({ ...admissionForm, smart_card_number: e.target.value })}
                                        className="text-xs font-mono mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700">জন্ম তারিখ</Label>
                                    <Input
                                        type="date"
                                        value={admissionForm.date_of_birth}
                                        onChange={(e) => setAdmissionForm({ ...admissionForm, date_of_birth: e.target.value })}
                                        className="text-xs mt-1"
                                    />
                                </div>
                            </div>

                            {/* Addresses */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                    <p className="text-xs font-bold text-slate-800">বর্তমান ঠিকানা (Present Address)</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            value={admissionForm.present_village_road}
                                            onChange={(e) => setAdmissionForm({ ...admissionForm, present_village_road: e.target.value })}
                                            placeholder="গ্রাম / রাস্তা"
                                            className="text-xs"
                                        />
                                        <Input
                                            value={admissionForm.present_union}
                                            onChange={(e) => setAdmissionForm({ ...admissionForm, present_union: e.target.value })}
                                            placeholder="ইউনিয়ন"
                                            className="text-xs"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Input
                                            value={admissionForm.present_upazila}
                                            onChange={(e) => setAdmissionForm({ ...admissionForm, present_upazila: e.target.value })}
                                            placeholder="উপজেলা"
                                            className="text-xs"
                                        />
                                        <Input
                                            value={admissionForm.present_district}
                                            onChange={(e) => setAdmissionForm({ ...admissionForm, present_district: e.target.value })}
                                            placeholder="জেলা"
                                            className="text-xs"
                                        />
                                        <Input
                                            value={admissionForm.present_post_code}
                                            onChange={(e) => setAdmissionForm({ ...admissionForm, present_post_code: e.target.value })}
                                            placeholder="পোস্ট কোড"
                                            className="text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                    <p className="text-xs font-bold text-slate-800">আর্থিক ও প্রকল্প বিবরণ</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Input
                                            type="number"
                                            value={admissionForm.monthly_income}
                                            onChange={(e) => setAdmissionForm({ ...admissionForm, monthly_income: e.target.value })}
                                            placeholder="মাসিক আয়"
                                            className="text-xs"
                                        />
                                        <Input
                                            type="number"
                                            value={admissionForm.monthly_expense}
                                            onChange={(e) => setAdmissionForm({ ...admissionForm, monthly_expense: e.target.value })}
                                            placeholder="মাসিক ব্যয়"
                                            className="text-xs"
                                        />
                                        <Input
                                            type="number"
                                            value={admissionForm.monthly_savings}
                                            onChange={(e) => setAdmissionForm({ ...admissionForm, monthly_savings: e.target.value })}
                                            placeholder="মাসিক সঞ্চয়"
                                            className="text-xs"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            value={admissionForm.project_name}
                                            onChange={(e) => setAdmissionForm({ ...admissionForm, project_name: e.target.value })}
                                            placeholder="প্রকল্পের নাম (ব্যবসা)"
                                            className="text-xs"
                                        />
                                        <select
                                            value={admissionForm.status}
                                            onChange={(e) => setAdmissionForm({ ...admissionForm, status: e.target.value })}
                                            className="text-xs border border-slate-300 rounded-md p-2 bg-white"
                                        >
                                            <option value="approved">ভর্তি অনুমোদিত (Approved)</option>
                                            <option value="draft">খসড়া (Draft)</option>
                                            <option value="submitted">জমা দেওয়া (Submitted)</option>
                                            <option value="under_review">যাচাইাধীন</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: LOAN INFORMATION */}
                    {activeTab === 'loan' && loanApplication && (
                        <div className="space-y-4">
                            <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                                        <Banknote className="w-4 h-4 text-indigo-600" />
                                        ঋণ ক্যাটাগরি ও প্রোডাক্ট নির্বাচন (Product & Category)
                                    </p>
                                    <Badge className="bg-indigo-600 text-white text-[11px]">
                                        আবেদন নং: #{loanApplication.application_no}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-xs font-semibold text-slate-700">ঋণ ক্যাটাগরি (Loan Category)</Label>
                                        <select
                                            value={loanForm.loan_category_id}
                                            onChange={(e) => handleLoanCategoryChange(e.target.value)}
                                            className="w-full text-xs font-bold text-slate-800 bg-white border border-indigo-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500/20 mt-1"
                                            required
                                        >
                                            <option value="">-- ক্যাটাগরি নির্বাচন করুন --</option>
                                            {loanCategories.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.category_name_bn || c.category_name} ({c.category_code})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <Label className="text-xs font-semibold text-slate-700">ঋণ প্রোডাক্ট (Loan Product)</Label>
                                        <select
                                            value={loanForm.loan_product_id}
                                            onChange={(e) => handleLoanProductChange(e.target.value)}
                                            className="w-full text-xs font-bold text-slate-800 bg-white border border-indigo-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500/20 mt-1"
                                            required
                                        >
                                            <option value="">-- প্রোডাক্ট নির্বাচন করুন --</option>
                                            {availableProducts.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.product_name_bn || p.product_name} ({p.product_code})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Loan Amounts & Status */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700">আবেদনকৃত পরিমাণ (টাকা)</Label>
                                    <Input
                                        type="number"
                                        value={loanForm.requested_amount}
                                        onChange={(e) => setLoanForm({ ...loanForm, requested_amount: e.target.value })}
                                        className="text-xs font-bold mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700">অনুমোদিত পরিমাণ (টাকা)</Label>
                                    <Input
                                        type="number"
                                        value={loanForm.approved_amount}
                                        onChange={(e) => setLoanForm({ ...loanForm, approved_amount: e.target.value })}
                                        className="text-xs font-bold text-emerald-700 mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700">বিতরণকৃত পরিমাণ (টাকা)</Label>
                                    <Input
                                        type="number"
                                        value={loanForm.disbursed_amount}
                                        onChange={(e) => setLoanForm({ ...loanForm, disbursed_amount: e.target.value })}
                                        className="text-xs font-bold text-blue-700 mt-1"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700">ঋণের মেয়াদ (মাস)</Label>
                                    <Input
                                        type="number"
                                        value={loanForm.loan_term_months}
                                        onChange={(e) => setLoanForm({ ...loanForm, loan_term_months: Number(e.target.value) })}
                                        className="text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700">কিস্তির সংখ্যা</Label>
                                    <Input
                                        type="number"
                                        value={loanForm.number_of_installments}
                                        onChange={(e) => setLoanForm({ ...loanForm, number_of_installments: Number(e.target.value) })}
                                        className="text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700">ঋণ স্ট্যাটাস (Loan Status)</Label>
                                    <select
                                        value={loanForm.status}
                                        onChange={(e) => setLoanForm({ ...loanForm, status: e.target.value })}
                                        className="w-full text-xs font-bold border border-slate-300 rounded-xl p-2.5 bg-white mt-1"
                                    >
                                        <option value="draft">খসড়া (Draft)</option>
                                        <option value="submitted">জমা দেওয়া (Submitted)</option>
                                        <option value="under_review">যাচাইাধীন (Under Review)</option>
                                        <option value="approved">অনুমোদিত (Approved)</option>
                                        <option value="pending_disbursement">বিতরণ অপেক্ষমাণ</option>
                                        <option value="disbursed">সক্রিয় ঋণ (Disbursed)</option>
                                        <option value="repaid">পরিশোধিত (Repaid)</option>
                                        <option value="rejected">প্রত্যাখ্যাত (Rejected)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs font-semibold text-slate-700">ঋণের উদ্দেশ্য / প্রকল্প</Label>
                                <Input
                                    value={loanForm.purpose_of_loan}
                                    onChange={(e) => setLoanForm({ ...loanForm, purpose_of_loan: e.target.value })}
                                    className="text-xs mt-1"
                                    placeholder="ঋণের উদ্দেশ্য লিখুন"
                                />
                            </div>
                        </div>
                    )}

                    {/* PIN / Password Authentication Section */}
                    <div className="pt-3 border-t border-slate-200">
                        {isUnlocked ? (
                            <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>আপনার সেশন ইতিমধ্যে PIN/পাসওয়ার্ড দ্বারা আনলক করা আছে। সরাসরি সংরক্ষণ করতে পারবেন।</span>
                            </div>
                        ) : (
                            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                                    হেড অফিস / সুপার অ্যাডমিন PIN বা পাসওয়ার্ড দিন <span className="text-rose-500">*</span>
                                </Label>
                                <div className="relative">
                                    <Input
                                        type={showPin ? 'text' : 'password'}
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value)}
                                        className="text-xs pr-10 bg-white"
                                        placeholder="আপনার লগইন পাসওয়ার্ড বা পিন লিখুন"
                                        required={!isUnlocked}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPin(!showPin)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                    >
                                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <p className="text-[11px] text-slate-500">
                                    নিরাপত্তার স্বার্থে হেড অফিস বা সুপার অ্যাডমিনের অনুমোদন নিশ্চিত করতে হবে।
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={processing}
                            className="rounded-xl text-xs"
                        >
                            বাতিল
                        </Button>
                        <Button
                            type="submit"
                            disabled={processing}
                            className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs px-5 flex items-center gap-1.5"
                        >
                            {processing ? (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>সংরক্ষণ ও সিঙ্ক হচ্ছে...</span>
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    <span>সংরক্ষণ ও সকল ফর্মে সিঙ্ক করুন</span>
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
