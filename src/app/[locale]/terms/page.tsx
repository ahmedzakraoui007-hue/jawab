import { LegalDocument } from '@/components/marketing/legal-document';
import { TERMS } from '@/content/legal';
import { locales, type Locale } from '@/i18n/config';

export function generateStaticParams() {
    return locales.map((locale) => ({ locale }));
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    return <LegalDocument doc={TERMS[locale as Locale] ?? TERMS.en} />;
}
