"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { LogoMark } from "./logo";
import { useI18n, useLocalizedHref } from "@/i18n/context";
import { LanguageSwitcher } from "@/i18n/language-switcher";

export function Navbar() {
    const { dict } = useI18n();
    const href = useLocalizedHref();
    const [scrolled, setScrolled] = useState(false);
    const [open, setOpen] = useState(false);

    const LINKS = [
        { anchor: "#features", label: dict.nav.features },
        { anchor: "#how-it-works", label: dict.nav.howItWorks },
        { anchor: "#testimonials", label: dict.nav.testimonials },
        { anchor: "#pricing", label: dict.nav.pricing },
        { anchor: "#faq", label: dict.nav.faq },
    ];

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                scrolled ? "border-b border-white/10 bg-black/70 backdrop-blur-xl" : "border-b border-transparent bg-transparent"
            }`}
        >
            <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                <Link href={href('/')} className="flex items-center gap-2.5 group" onClick={() => setOpen(false)}>
                    <LogoMark status className="transition-transform group-hover:scale-105" />
                    <span className="text-xl font-bold text-white tracking-tight">Jawab</span>
                </Link>

                <div className="hidden md:flex gap-8 text-sm font-medium text-neutral-300">
                    {LINKS.map((link) => (
                        <a key={link.anchor} href={link.anchor} className="hover:text-white transition-colors">
                            {link.label}
                        </a>
                    ))}
                </div>

                <div className="hidden md:flex gap-4 items-center">
                    <LanguageSwitcher />
                    <Link href={href('/login')} className="text-neutral-300 hover:text-white text-sm font-medium px-4 py-2">
                        {dict.nav.login}
                    </Link>
                    <Link
                        href={href('/signup')}
                        className="bg-white text-black text-sm font-medium px-4 py-2 rounded-full hover:bg-neutral-200 transition-colors"
                    >
                        {dict.nav.getStarted}
                    </Link>
                </div>

                <button
                    className="md:hidden text-white p-2 -mr-2"
                    onClick={() => setOpen((v) => !v)}
                    aria-label="Toggle menu"
                >
                    {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="md:hidden overflow-hidden border-b border-white/10 bg-black/95 backdrop-blur-xl"
                    >
                        <div className="container mx-auto px-6 py-6 flex flex-col gap-1">
                            {LINKS.map((link) => (
                                <a
                                    key={link.anchor}
                                    href={link.anchor}
                                    onClick={() => setOpen(false)}
                                    className="py-3 text-neutral-300 hover:text-white text-base font-medium border-b border-white/5"
                                >
                                    {link.label}
                                </a>
                            ))}
                            <div className="flex justify-center mt-4">
                                <LanguageSwitcher />
                            </div>
                            <div className="flex flex-col gap-3 mt-5">
                                <Link
                                    href={href('/login')}
                                    onClick={() => setOpen(false)}
                                    className="w-full text-center py-3 rounded-xl border border-white/15 text-white font-medium"
                                >
                                    {dict.nav.login}
                                </Link>
                                <Link
                                    href={href('/signup')}
                                    onClick={() => setOpen(false)}
                                    className="w-full text-center py-3 rounded-xl bg-white text-black font-semibold"
                                >
                                    {dict.nav.getStarted}
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
