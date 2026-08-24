import { cn } from '@/lib/utils';

export default function AppLogoIcon({ className }: { className?: string }) {
    return (
        <img
            src="/icons/logo.png"
            alt="MisLoan"
            className={cn('object-contain', className)}
        />
    );
}
