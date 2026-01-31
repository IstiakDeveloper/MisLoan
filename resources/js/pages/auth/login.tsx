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
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { useState } from 'react';

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

export default function Login({ status, canResetPassword }: LoginProps) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <>
            <Head title="Login - MisLoan" />

            <div className="flex min-h-svh">
                {/* Left Side - Branding */}
                <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 relative overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0">
                        <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
                        <div className="absolute bottom-20 right-20 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl" />
                        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-teal-400/10 rounded-full blur-2xl" />
                    </div>

                    {/* Grid Pattern Overlay */}
                    <div className="absolute inset-0 opacity-5">
                        <div className="h-full w-full" style={{
                            backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
                            backgroundSize: '50px 50px'
                        }} />
                    </div>

                    {/* Content */}
                    <div className="relative z-10 flex flex-col justify-center items-center w-full px-12 text-white">
                        <div className="max-w-md text-center">
                            {/* Logo */}
                            <div className="mb-8 flex justify-center">
                                <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-2xl">
                                    <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                                    </svg>
                                </div>
                            </div>

                            <h1 className="text-4xl font-bold mb-3 tracking-tight">MisLoan</h1>
                            <p className="text-lg text-emerald-100 mb-2">
                                Microfinance Information System
                            </p>
                            <p className="text-emerald-200/80 text-sm">
                                Loan Application & Member Management Platform
                            </p>

                            {/* Features */}
                            <div className="mt-12 grid grid-cols-2 gap-4 text-left">
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/15 transition-colors">
                                    <div className="w-10 h-10 bg-emerald-500/30 rounded-lg flex items-center justify-center mb-3">
                                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div className="font-medium text-sm">Loan Processing</div>
                                    <div className="text-xs text-emerald-200/70 mt-1">Fast & efficient workflow</div>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/15 transition-colors">
                                    <div className="w-10 h-10 bg-emerald-500/30 rounded-lg flex items-center justify-center mb-3">
                                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <div className="font-medium text-sm">Member Management</div>
                                    <div className="text-xs text-emerald-200/70 mt-1">Complete data tracking</div>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/15 transition-colors">
                                    <div className="w-10 h-10 bg-emerald-500/30 rounded-lg flex items-center justify-center mb-3">
                                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                    </div>
                                    <div className="font-medium text-sm">Branch Control</div>
                                    <div className="text-xs text-emerald-200/70 mt-1">Zone, Area, Branch</div>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/15 transition-colors">
                                    <div className="w-10 h-10 bg-emerald-500/30 rounded-lg flex items-center justify-center mb-3">
                                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <div className="font-medium text-sm">Analytics</div>
                                    <div className="text-xs text-emerald-200/70 mt-1">Detailed reports</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Login Form */}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-10 bg-gray-50 dark:bg-gray-950">
                    <div className="w-full max-w-md">
                        {/* Mobile Logo */}
                        <div className="lg:hidden mb-10 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mb-4 shadow-lg shadow-emerald-500/25">
                                <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">MisLoan</h1>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Microfinance Information System</p>
                        </div>

                        {/* Login Header */}
                        <div className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                                Welcome back
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">
                                Sign in to your account to continue
                            </p>
                        </div>

                        {/* Status Message */}
                        {status && (
                            <div className="mb-6 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4">
                                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                                    {status}
                                </p>
                            </div>
                        )}

                        {/* Login Form */}
                        <Form
                            {...store.form()}
                            resetOnSuccess={['password']}
                            className="space-y-5"
                        >
                            {({ processing, errors }) => (
                                <>
                                    {/* Login Field (Email or Username) */}
                                    <div className="space-y-2">
                                        <Label htmlFor="login" className="text-gray-700 dark:text-gray-300 font-medium">
                                            Email or Username
                                        </Label>
                                        <div className="relative">
                                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="login"
                                                type="text"
                                                name="login"
                                                required
                                                autoFocus
                                                tabIndex={1}
                                                autoComplete="username"
                                                placeholder="Enter your email or username"
                                                className="pl-11 h-12 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:border-emerald-500 focus:ring-emerald-500/20"
                                            />
                                        </div>
                                        <InputError message={errors.login} />
                                    </div>

                                    {/* Password Field */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="password" className="text-gray-700 dark:text-gray-300 font-medium">
                                                Password
                                            </Label>
                                            {canResetPassword && (
                                                <TextLink
                                                    href={request()}
                                                    className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium"
                                                    tabIndex={5}
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
                                                tabIndex={2}
                                                autoComplete="current-password"
                                                placeholder="Enter your password"
                                                className="pl-11 pr-11 h-12 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:border-emerald-500 focus:ring-emerald-500/20"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                                tabIndex={-1}
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                        <InputError message={errors.password} />
                                    </div>

                                    {/* Remember Me */}
                                    <div className="flex items-center space-x-2.5">
                                        <Checkbox
                                            id="remember"
                                            name="remember"
                                            tabIndex={3}
                                            className="border-gray-300 dark:border-gray-700 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                        />
                                        <Label
                                            htmlFor="remember"
                                            className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer"
                                        >
                                            Remember me for 30 days
                                        </Label>
                                    </div>

                                    {/* Submit Button */}
                                    <Button
                                        type="submit"
                                        className="w-full h-12 text-base font-medium bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-200"
                                        tabIndex={4}
                                        disabled={processing}
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

                        {/* Footer */}
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
