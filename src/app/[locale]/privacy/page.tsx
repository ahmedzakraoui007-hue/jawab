import { LegalDocument } from '@/components/marketing/legal-document';
import { PRIVACY } from '@/content/legal';
import { locales, type Locale } from '@/i18n/config';

export function generateStaticParams() {
    return locales.map((locale) => ({ locale }));
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    return <LegalDocument doc={PRIVACY[locale as Locale] ?? PRIVACY.en} />;
}
