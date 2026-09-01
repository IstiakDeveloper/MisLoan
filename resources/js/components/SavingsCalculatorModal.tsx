import React, { useState, useEffect, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { addCalendarMonths, formatDate, todayIsoDate } from '@/utils/dateUtils';
import {
    Calculator,
    Calendar,
    User,
    DollarSign,
    Clock,
    AlertTriangle,
    CheckCircle2,
    Info,
    Printer,
    ArrowRight,
    Sparkles,
    ShieldCheck,
    Lock,
    Award,
    TrendingUp,
    Building2,
    FileText,
} from 'lucide-react';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelectScheme?: (scheme: {
        productName: string;
        monthlyAmount: number;
        termYears: number;
        durationMonths: number;
        maturityAmount: number;
    }) => void;
}

// Scheme Definitions
const SCHEME_TYPES = [
    { id: '3yr', name: '3-Year DPS (7% p.a.)', termYears: 3, durationMonths: 36, rate: 7.0, multiplier: 39.817 },
    { id: '5yr', name: '5-Year DPS (9% p.a.)', termYears: 5, durationMonths: 60, rate: 9.0, multiplier: 75.188 },
    { id: '7yr', name: '7-Year DPS (10% p.a.)', termYears: 7, durationMonths: 84, rate: 10.0, multiplier: 120.454 },
    { id: '10yr', name: '10-Year DPS (12% p.a.)', termYears: 10, durationMonths: 120, rate: 12.0, multiplier: 229.704 },
    { id: 'double', name: 'Double Profit Scheme (6 Yrs 5 Mos)', termYears: 6.416, durationMonths: 77, rate: 15.5, multiplier: 0, isDouble: true },
    { id: 'millionaire', name: 'Millionaire Scheme (10 Lakh Target)', termYears: 5, durationMonths: 60, rate: 9.0, multiplier: 0, isMillionaire: true },
    { id: 'kotipati', name: 'Kotipati Scheme (1 Crore Target)', termYears: 5, durationMonths: 60, rate: 9.0, multiplier: 0, isKotipati: true },
    { id: 'voluntary', name: 'Voluntary Savings (11.40% p.a.)', termYears: 1, durationMonths: 12, rate: 11.4, multiplier: 0, isVoluntary: true },
];

// Fixed Target Term Options for Millionaire Scheme
const MILLIONAIRE_OPTIONS = [
    { years: 3, durationMonths: 36, rate: 7.0, monthly: 25115, target: 1000000, label: '3 Years (৳ 25,115/mo @ 7%)' },
    { years: 5, durationMonths: 60, rate: 9.0, monthly: 13308, target: 1000000, label: '5 Years (৳ 13,308/mo @ 9%)' },
    { years: 7, durationMonths: 84, rate: 10.0, monthly: 8302, target: 1000000, label: '7 Years (৳ 8,302/mo @ 10%)' },
    { years: 10, durationMonths: 120, rate: 12.0, monthly: 4361, target: 1000000, label: '10 Years (৳ 4,361/mo @ 12%)' },
    { years: 12, durationMonths: 144, rate: 12.0, monthly: 3150, target: 1000000, label: '12 Years (৳ 3,150/mo @ 12%)' },
];

// Fixed Target Term Options for Kotipati Scheme
const KOTIPATI_OPTIONS = [
    { years: 3, durationMonths: 36, rate: 7.0, monthly: 251148, target: 10000000, label: '3 Years (৳ 2,51,148/mo @ 7%)' },
    { years: 5, durationMonths: 60, rate: 9.0, monthly: 133073, target: 10000000, label: '5 Years (৳ 1,33,073/mo @ 9%)' },
    { years: 7, durationMonths: 84, rate: 10.0, monthly: 83019, target: 10000000, label: '7 Years (৳ 83,019/mo @ 10%)' },
    { years: 10, durationMonths: 120, rate: 12.0, monthly: 43687, target: 10000000, label: '10 Years (৳ 43,687/mo @ 12%)' },
    { years: 12, durationMonths: 144, rate: 12.0, monthly: 31498, target: 10000000, label: '12 Years (৳ 31,498/mo @ 12%)' },
];

// Reference Tiers for Premature Closure Downgrading
const COMPLETED_TIERS = [
    { key: '12yr', minMonths: 144, rate: 12.0, name: '12-Year Tier (12.0%)', multiplier: 0 },
    { key: '10yr', minMonths: 120, rate: 12.0, name: '10-Year Tier (12.0%)', multiplier: 229.704 },
    { key: '7yr', minMonths: 84, rate: 10.0, name: '7-Year Tier (10.0%)', multiplier: 120.454 },
    { key: '5yr', minMonths: 60, rate: 9.0, name: '5-Year Tier (9.0%)', multiplier: 75.188 },
    { key: '3yr', minMonths: 36, rate: 7.0, name: '3-Year Tier (7.0%)', multiplier: 39.817 },
    { key: 'voluntary', minMonths: 0, rate: 6.0, name: 'Voluntary/General Tier (6.0%)', multiplier: 0 },
];

export default function SavingsCalculatorModal({ open, onOpenChange, onSelectScheme }: Props) {
    const todayStr = todayIsoDate();

    // Form Inputs State
    const [selectedSchemeId, setSelectedSchemeId] = useState<string>('5yr');
    const [targetTermYears, setTargetTermYears] = useState<number>(5);
    const [applicantName, setApplicantName] = useState<string>('');
    const [startDate, setStartDate] = useState<string>(todayStr);
    const [endDate, setEndDate] = useState<string>('');
    const [monthlyAmount, setMonthlyAmount] = useState<number>(500);

    // Active Scheme Definition
    const activeScheme = useMemo(
        () => SCHEME_TYPES.find((s) => s.id === selectedSchemeId) || SCHEME_TYPES[1],
        [selectedSchemeId]
    );

    // Active Sub-Option for Millionaire & Kotipati
    const activeMillionaireOpt = useMemo(
        () => MILLIONAIRE_OPTIONS.find((o) => o.years === targetTermYears) || MILLIONAIRE_OPTIONS[1],
        [targetTermYears]
    );

    const activeKotipatiOpt = useMemo(
        () => KOTIPATI_OPTIONS.find((o) => o.years === targetTermYears) || KOTIPATI_OPTIONS[1],
        [targetTermYears]
    );

    // Handle Scheme Type Change
    useEffect(() => {
        if (activeScheme.isMillionaire) {
            setMonthlyAmount(activeMillionaireOpt.monthly);
        } else if (activeScheme.isKotipati) {
            setMonthlyAmount(activeKotipatiOpt.monthly);
        } else if (activeScheme.isDouble && monthlyAmount < 10000) {
            setMonthlyAmount(50000);
        } else if (activeScheme.isVoluntary && monthlyAmount < 10000) {
            setMonthlyAmount(100000);
        }
    }, [selectedSchemeId, targetTermYears]);

    // Auto-update End Date when Scheme Type, Sub-Option, or Start Date changes
    useEffect(() => {
        if (!startDate) return;

        let monthsToAdd = activeScheme.durationMonths;
        if (activeScheme.isMillionaire) {
            monthsToAdd = activeMillionaireOpt.durationMonths;
        } else if (activeScheme.isKotipati) {
            monthsToAdd = activeKotipatiOpt.durationMonths;
        }

        setEndDate(addCalendarMonths(startDate, monthsToAdd));
    }, [selectedSchemeId, targetTermYears, startDate, activeScheme, activeMillionaireOpt, activeKotipatiOpt]);

    // Calculation Engine
    const calcResult = useMemo(() => {
        const p = Math.max(0, Number(monthlyAmount) || 0);
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
            return {
                valid: false,
                monthsElapsed: 0,
                yearsElapsed: '0.0',
                targetMonths: 60,
                isFullMaturity: false,
                appliedTierName: activeScheme.name,
                appliedRate: activeScheme.rate,
                totalDeposit: 0,
                profitEarned: 0,
                maturityAmount: 0,
                isFixedInstallment: false,
                penaltyNotice: '',
            };
        }

        // Calculate months elapsed
        let monthsElapsed = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        if (end.getDate() < start.getDate()) {
            monthsElapsed -= 1;
        }
        monthsElapsed = Math.max(1, monthsElapsed);
        const yearsElapsed = (monthsElapsed / 12).toFixed(1);

        // 1. Millionaire Scheme Calculation
        if (activeScheme.isMillionaire) {
            const targetMonths = activeMillionaireOpt.durationMonths;
            const isCompleted = monthsElapsed >= targetMonths;
            const fixedMonthly = activeMillionaireOpt.monthly;

            let appliedTier = COMPLETED_TIERS.find((t) => t.minMonths === targetMonths) || COMPLETED_TIERS[3];
            if (!isCompleted) {
                appliedTier = COMPLETED_TIERS.find((t) => monthsElapsed >= t.minMonths) || COMPLETED_TIERS[COMPLETED_TIERS.length - 1];
            }

            const totalDeposit = fixedMonthly * monthsElapsed;
            let maturityAmount = 0;
            if (isCompleted) {
                maturityAmount = activeMillionaireOpt.target;
            } else {
                const r_m = appliedTier.rate / 100 / 12;
                maturityAmount = Math.round(fixedMonthly * ((Math.pow(1 + r_m, monthsElapsed) - 1) / r_m));
            }
            const profitEarned = maturityAmount - totalDeposit;

            return {
                valid: true,
                monthsElapsed,
                yearsElapsed,
                targetMonths,
                isFullMaturity: isCompleted,
                appliedTierName: isCompleted ? `Millionaire ${activeMillionaireOpt.years}-Year Target` : appliedTier.name,
                appliedRate: isCompleted ? activeMillionaireOpt.rate : appliedTier.rate,
                totalDeposit,
                profitEarned,
                maturityAmount,
                isFixedInstallment: true,
                penaltyNotice: isCompleted
                    ? ''
                    : `Premature Closure: Closed at ${monthsElapsed} months. Profit rate downgraded to "${appliedTier.name}".`,
            };
        }

        // 2. Kotipati Scheme Calculation
        if (activeScheme.isKotipati) {
            const targetMonths = activeKotipatiOpt.durationMonths;
            const isCompleted = monthsElapsed >= targetMonths;
            const fixedMonthly = activeKotipatiOpt.monthly;

            let appliedTier = COMPLETED_TIERS.find((t) => t.minMonths === targetMonths) || COMPLETED_TIERS[3];
            if (!isCompleted) {
                appliedTier = COMPLETED_TIERS.find((t) => monthsElapsed >= t.minMonths) || COMPLETED_TIERS[COMPLETED_TIERS.length - 1];
            }

            const totalDeposit = fixedMonthly * monthsElapsed;
            let maturityAmount = 0;
            if (isCompleted) {
                maturityAmount = activeKotipatiOpt.target;
            } else {
                const r_m = appliedTier.rate / 100 / 12;
                maturityAmount = Math.round(fixedMonthly * ((Math.pow(1 + r_m, monthsElapsed) - 1) / r_m));
            }
            const profitEarned = maturityAmount - totalDeposit;

            return {
                valid: true,
                monthsElapsed,
                yearsElapsed,
                targetMonths,
                isFullMaturity: isCompleted,
                appliedTierName: isCompleted ? `Kotipati ${activeKotipatiOpt.years}-Year Target` : appliedTier.name,
                appliedRate: isCompleted ? activeKotipatiOpt.rate : appliedTier.rate,
                totalDeposit,
                profitEarned,
                maturityAmount,
                isFixedInstallment: true,
                penaltyNotice: isCompleted
                    ? ''
                    : `Premature Closure: Closed at ${monthsElapsed} months. Profit rate downgraded to "${appliedTier.name}".`,
            };
        }

        // 3. Double Profit Scheme Handling
        if (activeScheme.isDouble) {
            const isCompleted = monthsElapsed >= 77;
            const deposit = p > 0 ? p : 50000;
            const profit = isCompleted ? deposit : Math.round(deposit * (0.09 * (monthsElapsed / 12)));
            return {
                valid: true,
                monthsElapsed,
                yearsElapsed,
                targetMonths: 77,
                isFullMaturity: isCompleted,
                appliedTierName: isCompleted ? 'Double Profit (6 Yrs 5 Mos)' : 'Early Closure (Standard 9%)',
                appliedRate: isCompleted ? 15.5 : 9.0,
                totalDeposit: deposit,
                profitEarned: profit,
                maturityAmount: deposit + profit,
                isFixedInstallment: false,
                penaltyNotice: isCompleted ? '' : 'Closed before 6 Years 5 Months tenure. Adjusted to standard 9%.',
            };
        }

        // 4. Voluntary Scheme Handling
        if (activeScheme.isVoluntary) {
            const deposit = p > 0 ? p : 100000;
            const monthlyProfit = Math.round(deposit * (0.114 / 12));
            const totalProfit = monthlyProfit * monthsElapsed;
            return {
                valid: true,
                monthsElapsed,
                yearsElapsed,
                targetMonths: 12,
                isFullMaturity: true,
                appliedTierName: 'Voluntary Savings (11.40% p.a.)',
                appliedRate: 11.4,
                totalDeposit: deposit,
                profitEarned: totalProfit,
                maturityAmount: deposit + totalProfit,
                isFixedInstallment: false,
                penaltyNotice: '',
            };
        }

        // 5. Regular DPS Schemes Handling
        const targetMonths = activeScheme.durationMonths;
        const isFullMaturity = monthsElapsed >= targetMonths;

        let appliedTier = COMPLETED_TIERS.find((t) => t.key === activeScheme.id) || COMPLETED_TIERS[3];
        if (!isFullMaturity) {
            appliedTier = COMPLETED_TIERS.find((t) => monthsElapsed >= t.minMonths) || COMPLETED_TIERS[COMPLETED_TIERS.length - 1];
        }

        let totalDeposit = p * monthsElapsed;
        let maturityAmount = 0;
        let profitEarned = 0;

        if (isFullMaturity && activeScheme.multiplier > 0) {
            maturityAmount = Math.round(p * activeScheme.multiplier);
            totalDeposit = p * targetMonths;
            profitEarned = maturityAmount - totalDeposit;
        } else {
            if (appliedTier.multiplier > 0 && monthsElapsed === appliedTier.minMonths) {
                maturityAmount = Math.round(p * appliedTier.multiplier);
            } else {
                const r_m = appliedTier.rate / 100 / 12;
                maturityAmount = Math.round(p * ((Math.pow(1 + r_m, monthsElapsed) - 1) / r_m));
            }
            profitEarned = maturityAmount - totalDeposit;
        }

        let penaltyNotice = '';
        if (!isFullMaturity) {
            penaltyNotice = `Premature Closure Notice: Account closed at ${monthsElapsed} months (Target: ${targetMonths} mos). Profit rate downgraded to "${appliedTier.name}".`;
        }

        return {
            valid: true,
            monthsElapsed,
            yearsElapsed,
            targetMonths,
            isFullMaturity,
            appliedTierName: appliedTier.name,
            appliedRate: appliedTier.rate,
            totalDeposit,
            profitEarned,
            maturityAmount,
            isFixedInstallment: false,
            penaltyNotice,
        };
    }, [startDate, endDate, monthlyAmount, activeScheme, activeMillionaireOpt, activeKotipatiOpt]);

    const formatCurrency = (val: number) => {
        return '৳ ' + new Intl.NumberFormat('en-BD').format(val || 0);
    };

    const handlePrint = () => {
        window.print();
    };

    const statementRefNo = useMemo(() => {
        return 'MSM-SAV-' + Math.floor(100000 + Math.random() * 900000);
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl w-[95vw] max-h-[92vh] overflow-y-auto p-0 rounded-3xl border-slate-200 shadow-2xl print:shadow-none print:border-none print:p-0 print:max-w-none print:w-full print:max-h-none print:overflow-visible">
                {/* ── PRINT-ONLY STATEMENT SHEET ───────────────────────────────────────── */}
                <div className="hidden print:block p-8 bg-white text-slate-900 font-sans space-y-6">
                    <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xl">
                                M
                            </div>
                            <div>
                                <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                                    Mousumi NGO (মৌসুমী এনজিও)
                                </h1>
                                <p className="text-xs text-slate-600 font-semibold">
                                    Microcredit Regulatory Authority (MRA) Regulated MFI • License No: MRA-0012
                                </p>
                            </div>
                        </div>
                        <div className="text-right border-l-2 border-slate-200 pl-4">
                            <h2 className="text-sm font-bold text-indigo-900 uppercase">Savings Statement</h2>
                            <p className="text-xs font-mono font-bold text-slate-700">Ref: {statementRefNo}</p>
                            <p className="text-[11px] text-slate-500">Date: {formatDate(new Date())}</p>
                        </div>
                    </div>

                    <div className="text-center bg-slate-100 p-2 rounded-lg border border-slate-300">
                        <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                            Savings Maturity Estimation & Early Closure Statement
                        </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="border border-slate-300 p-3 rounded-lg space-y-1 bg-slate-50/50">
                            <p className="font-bold text-slate-900 border-b border-slate-200 pb-1">APPLICANT DETAILS</p>
                            <p><span className="text-slate-600">Applicant:</span> <strong>{applicantName || 'N/A'}</strong></p>
                            <p><span className="text-slate-600">Opening Date:</span> <strong>{startDate}</strong></p>
                            <p><span className="text-slate-600">Closing Date:</span> <strong>{endDate}</strong></p>
                            <p><span className="text-slate-600">Elapsed Duration:</span> <strong>{calcResult.monthsElapsed} Months</strong></p>
                        </div>

                        <div className="border border-slate-300 p-3 rounded-lg space-y-1 bg-slate-50/50">
                            <p className="font-bold text-slate-900 border-b border-slate-200 pb-1">SCHEME SPECIFICATION</p>
                            <p><span className="text-slate-600">Selected Scheme:</span> <strong>{activeScheme.name}</strong></p>
                            <p><span className="text-slate-600">Target Tenure:</span> <strong>{calcResult.targetMonths} Months</strong></p>
                            <p><span className="text-slate-600">Applied Profit Tier:</span> <strong>{calcResult.appliedTierName}</strong></p>
                        </div>
                    </div>

                    <div>
                        <table className="w-full border-collapse border border-slate-400 text-xs">
                            <thead>
                                <tr className="bg-slate-900 text-white font-bold text-center">
                                    <th className="border border-slate-400 p-2 text-left">Description</th>
                                    <th className="border border-slate-400 p-2">Monthly Installment</th>
                                    <th className="border border-slate-400 p-2">Months</th>
                                    <th className="border border-slate-400 p-2 text-right">Total Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-300 font-medium text-center">
                                <tr>
                                    <td className="border border-slate-400 p-2 text-left font-bold">Total Principal Deposited</td>
                                    <td className="border border-slate-400 p-2">{formatCurrency(monthlyAmount)}</td>
                                    <td className="border border-slate-400 p-2">{calcResult.monthsElapsed} mos</td>
                                    <td className="border border-slate-400 p-2 text-right font-bold">{formatCurrency(calcResult.totalDeposit)}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-400 p-2 text-left font-bold text-emerald-800">
                                        Profit Earned ({calcResult.appliedRate}% p.a.)
                                    </td>
                                    <td className="border border-slate-400 p-2">-</td>
                                    <td className="border border-slate-400 p-2">{calcResult.monthsElapsed} mos</td>
                                    <td className="border border-slate-400 p-2 text-right font-bold text-emerald-700">+{formatCurrency(calcResult.profitEarned)}</td>
                                </tr>
                                <tr className="bg-slate-100 font-extrabold text-xs text-slate-900">
                                    <td className="border border-slate-400 p-2 text-left uppercase" colSpan={3}>Net Maturity Payout Receivable</td>
                                    <td className="border border-slate-400 p-2 text-right text-indigo-900 font-black">{formatCurrency(calcResult.maturityAmount)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="grid grid-cols-3 gap-6 pt-10 text-xs text-center font-bold text-slate-800">
                        <div><div className="border-t border-slate-800 pt-1">Member Signature</div></div>
                        <div><div className="border-t border-slate-800 pt-1">Officer Signature</div></div>
                        <div><div className="border-t border-slate-800 pt-1">Branch Manager Seal</div></div>
                    </div>
                </div>

                {/* ── MODAL SCREEN VIEW ─────────────────────────────────────────────────── */}
                <div className="print:hidden">
                    {/* Header Banner */}
                    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-t-3xl relative overflow-hidden">
                        <div className="absolute -right-8 -bottom-8 w-56 h-56 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
                        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-600/30 rounded-2xl border border-indigo-400/30 backdrop-blur-md shrink-0">
                                    <Calculator className="w-5 h-5 text-indigo-300" />
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-extrabold text-white flex items-center gap-2">
                                        Organization Savings Calculator
                                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] uppercase font-bold">
                                            MRA Regulated
                                        </Badge>
                                    </DialogTitle>
                                    <DialogDescription className="text-[11px] text-slate-300 mt-0.5">
                                        Dynamic maturity calculator with fixed scheme targets and early withdrawal tier downgrades.
                                    </DialogDescription>
                                </div>
                            </div>

                            <Button
                                onClick={handlePrint}
                                variant="outline"
                                className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl text-xs font-semibold gap-1.5 self-start sm:self-center shrink-0 py-1.5 px-3"
                            >
                                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Print Slip</span>
                            </Button>
                        </div>
                    </div>

                    <div className="p-4 sm:p-5 space-y-5">
                        {/* Input Controls Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-slate-50/90 p-4 rounded-2xl border border-slate-200/90 shadow-sm">
                            {/* 1. Saving Type Selector */}
                            <div className="space-y-1 md:col-span-2">
                                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                    Select Saving Type:
                                </Label>
                                <select
                                    value={selectedSchemeId}
                                    onChange={(e) => setSelectedSchemeId(e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-all"
                                >
                                    {SCHEME_TYPES.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* 2. Millionaire / Kotipati Sub-Option Target Selector */}
                            {(activeScheme.isMillionaire || activeScheme.isKotipati) && (
                                <div className="space-y-1.5 md:col-span-2 bg-indigo-50/90 p-3 rounded-2xl border border-indigo-200 shadow-sm">
                                    <Label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                                        <Award className="w-4 h-4 text-indigo-600" />
                                        Select Target Tenure ({activeScheme.isMillionaire ? '10 Lakh Target' : '1 Crore Target'}):
                                    </Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-0.5">
                                        {(activeScheme.isMillionaire ? MILLIONAIRE_OPTIONS : KOTIPATI_OPTIONS).map((opt) => (
                                            <button
                                                key={opt.years}
                                                type="button"
                                                onClick={() => setTargetTermYears(opt.years)}
                                                className={`p-2 rounded-xl border text-left transition-all text-xs ${
                                                    targetTermYears === opt.years
                                                        ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-sm ring-2 ring-indigo-300'
                                                        : 'bg-white text-slate-800 border-slate-300 hover:border-indigo-400 font-medium hover:bg-slate-50'
                                                }`}
                                            >
                                                <p className="font-extrabold text-[11px]">{opt.years} Years Target</p>
                                                <p className={targetTermYears === opt.years ? 'text-indigo-100 font-semibold text-[11px]' : 'text-indigo-600 font-bold text-[11px]'}>
                                                    ৳ {new Intl.NumberFormat('en-BD').format(opt.monthly)} / month
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 3. Applicant Name */}
                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-slate-500" />
                                    Applicant Name (Optional):
                                </Label>
                                <Input
                                    type="text"
                                    value={applicantName}
                                    onChange={(e) => setApplicantName(e.target.value)}
                                    placeholder="e.g. Rahim Uddin"
                                    className="bg-white text-xs font-medium border-slate-300 h-9"
                                />
                            </div>

                            {/* 4. Monthly Deposit Amount */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                                        Monthly Deposit (BDT):
                                    </Label>
                                    {calcResult.isFixedInstallment && (
                                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded-full flex items-center gap-1">
                                            <Lock className="w-2.5 h-2.5" /> Fixed Amount
                                        </span>
                                    )}
                                </div>
                                <Input
                                    type="number"
                                    value={monthlyAmount || ''}
                                    onChange={(e) => setMonthlyAmount(Number(e.target.value))}
                                    disabled={calcResult.isFixedInstallment}
                                    placeholder="500"
                                    className={`font-bold text-xs h-9 ${
                                        calcResult.isFixedInstallment
                                            ? 'bg-slate-100 text-slate-600 cursor-not-allowed border-slate-300'
                                            : 'bg-white text-indigo-700 border-slate-300'
                                    }`}
                                />
                            </div>

                            {/* 5. Start Date */}
                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                    Start Date:
                                </Label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="bg-white text-xs font-semibold border-slate-300 h-9"
                                />
                            </div>

                            {/* 6. End Date / Maturity Date */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-purple-600" />
                                        End / Closing Date:
                                    </Label>
                                    <span className="text-[10px] text-slate-500 font-medium">Editable for early closure</span>
                                </div>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="bg-white text-xs font-semibold border-indigo-300 focus:border-indigo-600 h-9"
                                />
                            </div>
                        </div>

                        {/* Status Alert Banner */}
                        {calcResult.valid && (
                            <div>
                                {calcResult.isFullMaturity ? (
                                    <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-950 font-semibold shadow-sm">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="font-bold text-emerald-950">Full Target Maturity Achieved!</span>
                                            <span className="text-[11px] text-emerald-700">({calcResult.monthsElapsed} months completed)</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-xl flex items-start gap-2.5 text-xs text-amber-950 shadow-sm">
                                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                        <div className="space-y-0.5">
                                            <p className="font-bold text-amber-900 flex items-center gap-2 text-xs">
                                                Premature Closure Status: Tier Downgraded
                                                <Badge className="bg-amber-600 text-white text-[9px] px-1.5 py-0 font-bold">Early Withdrawal</Badge>
                                            </p>
                                            <p className="text-[11px] text-amber-800 leading-normal">
                                                {calcResult.penaltyNotice}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── SLEEK & COMPACT SUMMARY METRIC CARDS ───────────────────────────── */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                            {/* 1. Duration Card */}
                            <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/90 shadow-sm flex flex-col justify-between min-h-[78px]">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        Duration
                                    </span>
                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                </div>
                                <div className="mt-1">
                                    <p className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                                        {calcResult.monthsElapsed} Months
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-medium">
                                        (~{calcResult.yearsElapsed} Years)
                                    </p>
                                </div>
                            </div>

                            {/* 2. Total Principal Card */}
                            <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100/90 shadow-sm flex flex-col justify-between min-h-[78px]">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                                        Total Deposit
                                    </span>
                                    <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                                </div>
                                <div className="mt-1">
                                    <p className="text-base sm:text-lg font-bold font-mono text-slate-900 leading-tight truncate">
                                        {formatCurrency(calcResult.totalDeposit)}
                                    </p>
                                    <p className="text-[10px] text-blue-700 font-medium truncate">
                                        ৳ {new Intl.NumberFormat('en-BD').format(monthlyAmount)} × {calcResult.monthsElapsed} mos
                                    </p>
                                </div>
                            </div>

                            {/* 3. Profit Earned Card */}
                            <div className="bg-emerald-50/70 rounded-xl p-3 border border-emerald-200/90 shadow-sm flex flex-col justify-between min-h-[78px]">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                                        Profit Earned
                                    </span>
                                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                                </div>
                                <div className="mt-1">
                                    <p className="text-base sm:text-lg font-bold font-mono text-emerald-700 leading-tight truncate">
                                        +{formatCurrency(calcResult.profitEarned)}
                                    </p>
                                    <p className="text-[10px] text-emerald-800 font-bold truncate">
                                        Rate: {calcResult.appliedRate}% p.a.
                                    </p>
                                </div>
                            </div>

                            {/* 4. Net Receivable Card */}
                            <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white rounded-xl p-3 shadow-md shadow-indigo-600/15 flex flex-col justify-between min-h-[78px]">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">
                                        Net Receivable
                                    </span>
                                    <Award className="w-3.5 h-3.5 text-indigo-200" />
                                </div>
                                <div className="mt-1">
                                    <p className="text-base sm:text-lg font-bold font-mono text-white leading-tight truncate">
                                        {formatCurrency(calcResult.maturityAmount)}
                                    </p>
                                    <p className="text-[10px] text-indigo-100 font-medium">
                                        Total Maturity Payout
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Calculation Breakdown Box */}
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <div className="px-3.5 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                                    Calculation Breakdown & Tier Verification
                                </h4>
                                {applicantName && (
                                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                                        Applicant: {applicantName}
                                    </span>
                                )}
                            </div>

                            <div className="p-3.5 text-xs space-y-2.5">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                                    <div>
                                        <span className="text-slate-400 font-semibold block text-[10px]">Selected Scheme:</span>
                                        <span className="font-bold text-slate-900">{activeScheme.name}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 font-semibold block text-[10px]">Target Tenure:</span>
                                        <span className="font-bold text-slate-900">{calcResult.targetMonths} Months</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 font-semibold block text-[10px]">Actual Duration:</span>
                                        <span className="font-bold text-slate-900">{calcResult.monthsElapsed} Months</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 font-semibold block text-[10px]">Applied Tier:</span>
                                        <span className="font-extrabold text-indigo-600">{calcResult.appliedTierName}</span>
                                    </div>
                                </div>

                                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px] space-y-1 text-slate-700">
                                    <div className="flex justify-between items-center">
                                        <span>Principal ({calcResult.monthsElapsed} mos × {formatCurrency(monthlyAmount)}):</span>
                                        <span className="font-bold">{formatCurrency(calcResult.totalDeposit)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-emerald-700">
                                        <span>Profit ({calcResult.appliedTierName}):</span>
                                        <span className="font-bold">+{formatCurrency(calcResult.profitEarned)}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-1 border-t border-slate-300 font-bold text-slate-900 text-xs">
                                        <span>Total Net Payout Payable:</span>
                                        <span className="text-indigo-700 font-black">{formatCurrency(calcResult.maturityAmount)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Action Bar */}
                    <div className="p-3.5 bg-slate-50 border-t border-slate-200 rounded-b-3xl flex items-center justify-between">
                        <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl text-xs h-8">
                            Close
                        </Button>

                        {onSelectScheme && (
                            <Button
                                onClick={() => {
                                    onSelectScheme({
                                        productName: activeScheme.name,
                                        monthlyAmount: monthlyAmount,
                                        termYears: activeScheme.termYears,
                                        durationMonths: calcResult.monthsElapsed,
                                        maturityAmount: calcResult.maturityAmount,
                                    });
                                    onOpenChange(false);
                                }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold gap-1.5 h-8 px-3 shadow-sm"
                            >
                                <span>Apply to Savings Application</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
