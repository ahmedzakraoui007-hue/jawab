'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShieldCheck, Zap, Globe2 } from 'lucide-react';
import { LogoMark } from '@/components/marketing/logo';

const highlights = [
    { icon: Zap, text: 'Live in under 10 minutes — no developers needed' },
    { icon: Globe2, text: 'Answers in Arabic & English, automatically' },
    { icon: ShieldCheck, text: 'Bank-grade security, your data stays yours' },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-black flex">
            {/* Left branding panel */}
            <div className="hidden lg:flex lg:w-[42%] relative flex-col justify-between p-12 border-r border-white/10 overflow-hidden">
                <div className="absolute inset-0 bg-grid-white bg-radial-fade pointer-events-none" />
                <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/20 blur-3xl rounded-full animate-glow-pulse" />
                <div className="absolute -bottom-32 -right-16 w-80 h-80 bg-indigo-600/10 blur-3xl rounded-full" />

                <Link href="/" className="relative z-10 flex items-center gap-2.5">
                    <LogoMark status />
                    <span className="text-lg font-bold text-white tracking-tight">Jawab</span>
                </Link>

                <div className="relative z-10">
                    <motion.h2
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-3xl font-bold text-white leading-tight mb-6 max-w-sm"
                    >
                        Your AI employee is waiting to get to work.
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
                        &ldquo;Setting it up took less than 10 minutes. Now it handles 500+ WhatsApp messages a day for us.&rdquo;
                    </p>
                    <p className="text-xs text-neutral-500">Rashed Mahmoud — Director, Gulf Real Estate</p>
                </motion.div>
            </div>

            {/* Right form panel */}
            <div className="flex-1 flex items-center justify-center p-6 py-12 relative overflow-hidden">
                <div className="absolute inset-0 lg:hidden bg-grid-white bg-radial-fade pointer-events-none" />
                <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-black [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] lg:hidden" />
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
