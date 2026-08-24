import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';
import { login } from '@/routes';
import { email } from '@/routes/password';
import { Form, Head } from '@inertiajs/react';
import { LoaderCircle, Mail } from 'lucide-react';

export default function ForgotPassword({ status }: { status?: string }) {
    return (
        <AuthLayout
            title="Reset Password"
            description="Enter your email address and we'll send you a reset link"
        >
            <Head title="Forgot Password - MisLoan" />

            {status && (
                <div className="mb-4 rounded-xl bg-brand-softer dark:bg-brand-dark/20 border border-brand-soft dark:border-brand-muted p-4">
                    <p className="text-center text-sm text-brand-dark dark:text-brand-bright">
                        {status}
                    </p>
                </div>
            )}

            <div className="space-y-6">
                <Form {...email.form()}>
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        autoComplete="off"
                                        autoFocus
                                        placeholder="Enter your email address"
                                        className="pl-11 h-12"
                                    />
                                </div>
                                <InputError message={errors.email} />
                            </div>

                            <div className="my-6">
                                <Button
                                    className="w-full h-12 bg-gradient-to-r from-brand to-brand-dark hover:from-brand-muted hover:to-brand-dark"
                                    disabled={processing}
                                >
                                    {processing && (
                                        <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                                    )}
                                    {processing ? 'Sending...' : 'Send Reset Link'}
                                </Button>
                            </div>
                        </>
                    )}
                </Form>

                <div className="text-center text-sm text-muted-foreground">
                    <TextLink href={login()} className="text-brand hover:text-brand-dark dark:text-brand-bright">
                        Back to login
                    </TextLink>
                </div>
            </div>
        </AuthLayout>
    );
}
