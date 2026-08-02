'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from './navbar';
import { LogoMark } from './logo';
import { Reveal } from './reveal';
import { useLocalizedHref } from '@/i18n/context';
import type { LegalDoc } from '@/content/legal';

export function LegalDocument({ doc }: { doc: LegalDoc }) {
    const href = useLocalizedHref();

    return (
        <div className="min-h-screen bg-black antialiased relative overflow-hidden flex flex-col">
            <Navbar />

            <main className="flex-1 pt-40 pb-24">
                <div className="container mx-auto px-6 max-w-3xl">
                    <Reveal>
                        <h1 className="text-3xl md:text-5xl font-bold text-white mb-3">{doc.title}</h1>
                        <p className="text-sm text-neutral-500 mb-10">{doc.lastUpdated}</p>
                        <p className="text-neutral-300 leading-relaxed mb-12">{doc.intro}</p>
                    </Reveal>

                    <div className="space-y-10">
                        {doc.sections.map((section) => (
                            <Reveal key={section.heading}>
                                <h2 className="text-xl font-semibold text-white mb-3">{section.heading}</h2>
                                <div className="space-y-3">
                                    {section.body.map((p, i) => (
                                        <p key={i} className="text-neutral-400 leading-relaxed">
                                            {p}
                                        </p>
                                    ))}
                                </div>
                            </Reveal>
                        ))}
                    </div>

                    <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between flex-wrap gap-4">
                        <Link href={href('/')} className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-300 transition-colors">
                            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                            <LogoMark size="sm" />
                            Jawab
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
