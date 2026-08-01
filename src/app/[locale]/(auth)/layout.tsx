'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShieldCheck, Zap, Globe2 } from 'lucide-react';
import { LogoMark } from '@/components/marketing/logo';
import { useI18n, useLocalizedHref } from '@/i18n/context';
import { LanguageSwitcher } from '@/i18n/language-switcher';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    const { dict } = useI18n();
    const href = useLocalizedHref();

    const highlights = [
        { icon: Zap, text: dict.authLayout.highlight1 },
        { icon: Globe2, text: dict.authLayout.highlight2 },
        { icon: ShieldCheck, text: dict.authLayout.highlight3 },
    ];

    return (
        <div className="min-h-screen bg-black flex">
            {/* Left branding panel */}
            <div className="hidden lg:flex lg:w-[42%] relative flex-col justify-between p-12 border-e border-white/10 overflow-hidden">
                <div className="absolute inset-0 bg-grid-white bg-radial-fade pointer-events-none" />
                <div className="absolute -top-32 -start-32 w-96 h-96 bg-blue-600/20 blur-3xl rounded-full animate-glow-pulse" />
                <div className="absolute -bottom-32 -end-16 w-80 h-80 bg-indigo-600/10 blur-3xl rounded-full" />

                <div className="relative z-10 flex items-center justify-between">
                    <Link href={href('/')} className="flex items-center gap-2.5">
                        <LogoMark status />
                        <span className="text-lg font-bold text-white tracking-tight">Jawab</span>
                    </Link>
                    <LanguageSwitcher />
                </div>

                <div className="relative z-10">
                    <motion.h2
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-3xl font-bold text-white leading-tight mb-6 max-w-sm"
                    >
                        {dict.authLayout.headline}
                    </motion.h2>
                    <div className="space-y-4">
                        {highlights.map((item, idx) => (
                            <motion.div
                                key={item.text}
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 0.1 + idx * 0.08 }}
                                className="flex items-center gap-3 text-neutral-300"
                            >
                                <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                    <item.icon className="w-4 h-4 text-blue-400" />
                                </div>
                                <span className="text-sm">{item.text}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="relative z-10 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5"
                >
                    <p className="text-sm text-neutral-300 leading-relaxed mb-3">
                        {dict.authLayout.testimonialQuote}
                    </p>
                    <p className="text-xs text-neutral-500">{dict.authLayout.testimonialAuthor}</p>
                </motion.div>
            </div>

            {/* Right form panel */}
            <div className="flex-1 flex items-center justify-center p-6 py-12 relative overflow-hidden">
                <div className="absolute inset-0 lg:hidden bg-grid-white bg-radial-fade pointer-events-none" />
                <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-black [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] lg:hidden" />
                <div className="lg:hidden absolute top-6 end-6 z-20">
                    <LanguageSwitcher />
                </div>
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="relative z-10 w-full"
                >
                    {children}
                </motion.div>
            </div>
        </div>
    );
}
