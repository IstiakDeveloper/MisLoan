import { ComboSelect } from '@/components/ComboSelect';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/login';
import { request } from '@/routes/password';
import { Form, Head } from '@inertiajs/react';
import { Building2, Eye, EyeOff, KeyRound, Lock, User } from 'lucide-react';
import { useMemo, useState } from 'react';

type LoginMode = 'staff' | 'branch';

interface BranchOption {
    id: number;
    name: string;
    code: string;
}

interface LoginProps {
    status?: string;
    error?: string;
    canResetPassword: boolean;
    branches: BranchOption[];
}

export default function Login({
    status,
    error,
    canResetPassword,
    branches,
}: LoginProps) {
    const [mode, setMode] = useState<LoginMode>('staff');
    const [showPassword, setShowPassword] = useState(false);
    const [showPin, setShowPin] = useState(false);
    const [branchId, setBranchId] = useState<number | null>(null);

    const branchItems = useMemo(
        () =>
            [...branches]
                .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
                .map((b) => ({
                    value: b.id,
                    label: `${b.name} (${b.code})`,
                    keywords: `${b.name} ${b.code}`,
                })),
        [branches],
    );

    return (
        <>
            <Head title="Login - MisLoan" />

            <div className="flex min-h-svh">
                {/* Left Side - Branding */}
                <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 relative overflow-hidden">
                    <div className="absolute inset-0">
                        <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
                        <div className="absolute bottom-20 right-20 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl" />
                        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-teal-400/10 rounded-full blur-2xl" />
                    </div>

                    <div className="absolute inset-0 opacity-5">
                        <div
                            className="h-full w-full"
                            style={{
                                backgroundImage:
                                    'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
                                backgroundSize: '50px 50px',
                            }}
                        />
                    </div>

                    <div className="relative z-10 flex flex-col justify-center items-center w-full px-12 text-white">
                        <div className="max-w-md text-center">
                            <div className="mb-8 flex justify-center">
                                <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-2xl">
                                    <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                                    </svg>
                                </div>
                            </div>

                            <h1 className="text-4xl font-bold mb-3 tracking-tight">MisLoan</h1>
                            <p className="text-lg text-emerald-100 mb-2">Microfinance Information System</p>
                            <p className="text-emerald-200/80 text-sm">Loan Application & Member Management Platform</p>

                            <div className="mt-12 grid grid-cols-2 gap-4 text-left">
                                {[
                                    ['Loan Processing', 'Fast & efficient workflow'],
                                    ['Member Management', 'Complete data tracking'],
                                    ['Branch Control', 'Zone, Area, Branch'],
                                    ['Analytics', 'Detailed reports'],
                                ].map(([title, desc]) => (
                                    <div key={title} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                                        <div className="font-medium text-sm">{title}</div>
                                        <div className="text-xs text-emerald-200/70 mt-1">{desc}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Login Form */}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-10 bg-gray-50 dark:bg-gray-950">
                    <div className="w-full max-w-md">
                        <div className="lg:hidden mb-10 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mb-4 shadow-lg shadow-emerald-500/25">
                                <Building2 className="w-9 h-9 text-white" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">MisLoan</h1>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Microfinance Information System</p>
                        </div>

                        <div className="mb-6">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Welcome back</h2>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">Sign in to your account to continue</p>
                        </div>

                        <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                            <button
                                type="button"
                                onClick={() => setMode('staff')}
                                className={`flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                                    mode === 'staff'
                                        ? 'bg-white text-emerald-700 shadow-sm dark:bg-gray-900 dark:text-emerald-400'
                                        : 'text-slate-600 hover:bg-white/70 dark:text-slate-300'
                                }`}
                            >
                                <User className="h-4 w-4" />
                                Staff Login
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('branch')}
                                className={`flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                                    mode === 'branch'
                                        ? 'bg-white text-emerald-700 shadow-sm dark:bg-gray-900 dark:text-emerald-400'
                                        : 'text-slate-600 hover:bg-white/70 dark:text-slate-300'
                                }`}
                            >
                                <Building2 className="h-4 w-4" />
                                Branch Login
                            </button>
                        </div>

                        {status && (
                            <div className="mb-6 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4">
                                <p className="text-sm text-emerald-700 dark:text-emerald-400">{status}</p>
                            </div>
                        )}

                        {error && (
                            <div className="mb-6 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                            </div>
                        )}

                        <Form
                            {...store.form()}
                            resetOnSuccess={mode === 'staff' ? ['password'] : ['pin']}
                            className="space-y-5"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <input type="hidden" name="mode" value={mode} />

                                    {mode === 'staff' ? (
                                        <>
                                            <div className="space-y-2">
                                                <Label htmlFor="login" className="text-gray-700 dark:text-gray-300 font-medium">
                                                    Email or Username (PIN)
                                                </Label>
                                                <div className="relative">
                                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                    <Input
                                                        id="login"
                                                        type="text"
                                                        name="login"
                                                        required
                                                        autoFocus
                                                        autoComplete="username"
                                                        placeholder="Enter your email or username"
                                                        className="pl-11 h-12 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:border-emerald-500 focus:ring-emerald-500/20"
                                                    />
                                                </div>
                                                <InputError message={errors.login} />
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Label htmlFor="password" className="text-gray-700 dark:text-gray-300 font-medium">
                                                        Password
                                                    </Label>
                                                    {canResetPassword && (
                                                        <TextLink
                                                            href={request()}
                                                            className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium"
                                                        >
                                                            Forgot password?
                                                        </TextLink>
                                                    )}
                                                </div>
                                                <div className="relative">
                                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                    <Input
                                                        id="password"
                                                        type={showPassword ? 'text' : 'password'}
                                                        name="password"
                                                        required
                                                        autoComplete="current-password"
                                                        placeholder="Enter your password"
                                                        className="pl-11 pr-11 h-12 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:border-emerald-500 focus:ring-emerald-500/20"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                    >
                                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                                <InputError message={errors.password} />
                                            </div>

                                            <div className="flex items-center space-x-2.5">
                                                <Checkbox
                                                    id="remember"
                                                    name="remember"
                                                    className="border-gray-300 dark:border-gray-700 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                                />
                                                <Label htmlFor="remember" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                                                    Remember me for 30 days
                                                </Label>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <input type="hidden" name="branch_id" value={branchId ?? ''} />

                                            <div className="space-y-2">
                                                <Label htmlFor="branch_id">Branch</Label>
                                                <ComboSelect
                                                    value={branchId}
                                                    onChange={(value) => setBranchId(value as number | null)}
                                                    items={branchItems}
                                                    placeholder="Search branch by name or code…"
                                                    clearable={false}
                                                />
                                                <InputError message={errors.branch_id || errors.pin} />
                                                {branches.length === 0 && (
                                                    <p className="text-xs text-amber-600">
                                                        No branch PIN configured. Set branch login PIN from Organization → Branches.
                                                    </p>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="pin">Branch PIN</Label>
                                                <div className="relative">
                                                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                    <Input
                                                        id="pin"
                                                        type={showPin ? 'text' : 'password'}
                                                        name="pin"
                                                        required
                                                        inputMode="numeric"
                                                        autoComplete="off"
                                                        placeholder="Enter branch PIN"
                                                        className="pl-11 pr-11 h-12 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:border-emerald-500 focus:ring-emerald-500/20"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPin(!showPin)}
                                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                    >
                                                        {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <Button
                                        type="submit"
                                        className="w-full h-12 text-base font-medium bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25"
                                        disabled={processing || (mode === 'branch' && !branchId)}
                                    >
                                        {processing ? (
                                            <>
                                                <Spinner className="mr-2" />
                                                Signing in...
                                            </>
                                        ) : (
                                            'Sign in'
                                        )}
                                    </Button>
                                </>
                            )}
                        </Form>

                        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
                            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                                Having trouble? Contact your administrator
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
