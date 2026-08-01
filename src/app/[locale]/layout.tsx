import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { I18nProvider } from '@/i18n/context';

export function generateStaticParams() {
    return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    if (!locales.includes(locale as Locale)) return {};

    const dict = getDictionary(locale as Locale);
    return {
        title: dict.meta.title,
        description: dict.meta.description,
        openGraph: {
            title: dict.meta.title,
            description: dict.meta.description,
            type: 'website',
        },
    };
}

export default async function LocaleLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    if (!locales.includes(locale as Locale)) {
        notFound();
    }

    const dict = getDictionary(locale as Locale);

    return (
        <I18nProvider locale={locale as Locale} dict={dict}>
            {children}
        </I18nProvider>
    );
}
