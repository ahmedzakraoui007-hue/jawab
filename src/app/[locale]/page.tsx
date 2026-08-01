import { locales } from '@/i18n/config';
import { HomeClient } from './home-client';

export function generateStaticParams() {
    return locales.map((locale) => ({ locale }));
}

export default function Home() {
    return <HomeClient />;
}
