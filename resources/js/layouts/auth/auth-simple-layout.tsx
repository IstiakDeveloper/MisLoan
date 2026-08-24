import { type PropsWithChildren } from 'react';

interface AuthLayoutProps {
    name?: string;
    title?: string;
    description?: string;
}

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: PropsWithChildren<AuthLayoutProps>) {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-gray-50 dark:bg-gray-950 p-6 md:p-10">
            <div className="w-full max-w-sm">
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col items-center gap-4">
                        <div className="flex flex-col items-center gap-2 font-medium">
                            <img
                                src="/icons/logo.png"
                                alt="MisLoan"
                                className="mb-1 h-20 w-auto object-contain"
                            />
                        </div>

                        <div className="space-y-2 text-center">
                            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h1>
                            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                                {description}
                            </p>
                        </div>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
