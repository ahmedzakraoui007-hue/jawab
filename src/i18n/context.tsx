'use client';

import { createContext, useContext } from 'react';
import type { Locale } from './config';
import { dirForLocale } from './config';
import type { Dictionary } from './types';

interface I18nContextValue {
    locale: Locale;
    dict: Dictionary;
    dir: 'ltr' | 'rtl';
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({
    locale,
    dict,
    children,
}: {
    locale: Locale;
    dict: Dictionary;
    children: React.ReactNode;
}) {
    return (
        <I18nContext.Provider value={{ locale, dict, dir: dirForLocale(locale) }}>{children}</I18nContext.Provider>
    );
}

export function useI18n() {
    const ctx = useContext(I18nContext);
    if (!ctx) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return ctx;
}

/** Prefix an in-app path with the current locale, e.g. href('/login') -> '/ar/login'. */
export function useLocalizedHref() {
    const { locale } = useI18n();
    return (path: string) => {
        if (path === '/') return `/${locale}`;
        return `/${locale}${path}`;
    };
}
