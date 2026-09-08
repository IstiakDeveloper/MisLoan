import { Button } from '@/components/ui/button';
import { home } from '@/routes';
import { Head, Link } from '@inertiajs/react';
import { Home } from 'lucide-react';

interface NotFoundProps {
    message?: string | null;
}

export default function NotFound({ message }: NotFoundProps) {
    return (
        <>
            <Head title="404 - Page not found" />

            <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-gray-50 p-6 dark:bg-gray-950">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-brand/15 blur-3xl dark:bg-brand/25" />
                    <div className="absolute -right-10 bottom-0 h-80 w-80 rounded-full bg-brand-gold/15 blur-3xl dark:bg-brand-gold/10" />
                </div>

                <div className="relative z-10 w-full max-w-lg rounded-3xl border border-white/70 bg-white/90 p-8 text-center shadow-xl shadow-brand-dark/5 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/90 sm:p-12">
                    <img
                        src="/icons/logo.png"
                        alt="MisLoan"
                        width={1119}
                        height={1081}
                        className="mx-auto mb-6 h-20 w-auto object-contain"
                    />

                    <p className="text-7xl font-bold tracking-tight text-brand sm:text-8xl">
                        404
                    </p>
                    <h1 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-white">
                        পেজ খুঁজে পাওয়া যায়নি
                    </h1>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {message ||
                            'আপনি যে পেজটি খুঁজছেন সেটি নেই, সরানো হয়েছে, অথবা লিংকটি ভুল।'}
                    </p>

                    <Button
                        asChild
                        className="mt-8 h-12 px-8 text-base font-medium bg-gradient-to-r from-brand to-brand-dark shadow-lg shadow-brand/25 hover:from-brand-muted hover:to-brand-dark"
                    >
                        <Link href={home()}>
                            <Home className="size-4" />
                            Home
                        </Link>
                    </Button>
                </div>
            </div>
        </>
    );
}
