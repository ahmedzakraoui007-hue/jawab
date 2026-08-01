'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useI18n } from './context';
import { locales, type Locale } from './config';
import { cn } from '@/lib/utils';

const LABELS: Record<Locale, string> = { en: 'EN', ar: 'ع' };

export function LanguageSwitcher({ className }: { className?: string }) {
    const { locale } = useI18n();
    const pathname = usePathname();
    const router = useRouter();

    const switchTo = (next: Locale) => {
        if (next === locale) return;
        document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000`;
        const rest = pathname.replace(`/${locale}`, '') || '';
        router.push(`/${next}${rest}`);
    };

    return (
        <div className={cn('inline-flex items-center gap-0.5 p-0.5 rounded-full border border-white/10 bg-white/5', className)}>
            {locales.map((l) => (
                <button
                    key={l}
                    onClick={() => switchTo(l)}
                    className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-semibold transition-all',
                        l === locale ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
                    )}
                    aria-current={l === locale}
                >
                    {LABELS[l]}
                </button>
            ))}
        </div>
    );
}
