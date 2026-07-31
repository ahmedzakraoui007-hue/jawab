"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const LINKS = [
    { href: "#features", label: "Features" },
    { href: "#how-it-works", label: "How it works" },
    { href: "#testimonials", label: "Testimonials" },
    { href: "#pricing", label: "Pricing" },
    { href: "#faq", label: "FAQ" },
];

export function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [open, setOpen] = useState(false);

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
                <Link href="/" className="flex items-center gap-2 group" onClick={() => setOpen(false)}>
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white transition-transform group-hover:scale-105">
                        ج
                    </div>
                    <span className="text-xl font-bold text-white tracking-tight">Jawab</span>
                </Link>

                <div className="hidden md:flex gap-8 text-sm font-medium text-neutral-300">
                    {LINKS.map((link) => (
                        <a key={link.href} href={link.href} className="hover:text-white transition-colors">
                            {link.label}
                        </a>
                    ))}
                </div>

                <div className="hidden md:flex gap-4 items-center">
                    <Link href="/login" className="text-neutral-300 hover:text-white text-sm font-medium px-4 py-2">
                        Login
                    </Link>
                    <Link
                        href="/signup"
                        className="bg-white text-black text-sm font-medium px-4 py-2 rounded-full hover:bg-neutral-200 transition-colors"
                    >
                        Get Started
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
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setOpen(false)}
                                    className="py-3 text-neutral-300 hover:text-white text-base font-medium border-b border-white/5"
                                >
                                    {link.label}
                                </a>
                            ))}
                            <div className="flex flex-col gap-3 mt-5">
                                <Link
                                    href="/login"
                                    onClick={() => setOpen(false)}
                                    className="w-full text-center py-3 rounded-xl border border-white/15 text-white font-medium"
                                >
                                    Login
                                </Link>
                                <Link
                                    href="/signup"
                                    onClick={() => setOpen(false)}
                                    className="w-full text-center py-3 rounded-xl bg-white text-black font-semibold"
                                >
                                    Get Started
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
