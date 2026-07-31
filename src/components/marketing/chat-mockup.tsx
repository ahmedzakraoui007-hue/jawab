"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, CheckCheck, Sparkles } from "lucide-react";

type Bubble = {
    from: "customer" | "ai";
    text: string;
    lang?: "en" | "ar";
};

const SCRIPT: Bubble[] = [
    { from: "customer", text: "Hi! Do you have any appointments free tomorrow evening?" },
    { from: "ai", text: "Yes! We have 6:30 PM and 8:00 PM open tomorrow. Which works best for you? 😊" },
    { from: "customer", text: "ممكن الساعة ٨؟", lang: "ar" },
    { from: "ai", text: "تم الحجز الساعة ٨ مساءً ✅ سنرسل لك تذكير قبل الموعد بساعة.", lang: "ar" },
];

export function ChatMockup() {
    const [visibleCount, setVisibleCount] = useState(0);
    const [typing, setTyping] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function run() {
            while (!cancelled) {
                setVisibleCount(0);
                setTyping(false);
                await wait(600);

                for (let i = 0; i < SCRIPT.length; i++) {
                    if (cancelled) return;
                    if (SCRIPT[i].from === "ai") {
                        setTyping(true);
                        await wait(1100);
                        if (cancelled) return;
                        setTyping(false);
                    } else {
                        await wait(700);
                    }
                    if (cancelled) return;
                    setVisibleCount(i + 1);
                    await wait(900);
                }

                await wait(2400);
            }
        }

        run();
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="relative w-full max-w-sm mx-auto">
            <div className="absolute -inset-6 bg-blue-600/20 blur-3xl rounded-full animate-glow-pulse" />

            <div className="relative rounded-[2rem] border border-white/10 bg-neutral-900/80 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden animate-float">
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 bg-gradient-to-r from-neutral-900 to-neutral-900/60">
                    <div className="relative w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        ج
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-neutral-900" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">Jawab AI Employee</p>
                        <p className="text-xs text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Online now
                        </p>
                    </div>
                    <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                </div>

                {/* Messages */}
                <div className="px-4 py-5 flex flex-col gap-3 min-h-[280px] bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.08),transparent_60%)]">
                    <AnimatePresence initial={false}>
                        {SCRIPT.slice(0, visibleCount).map((bubble, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.35, ease: "easeOut" }}
                                className={`flex ${bubble.from === "customer" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    dir={bubble.lang === "ar" ? "rtl" : "ltr"}
                                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                                        bubble.from === "customer"
                                            ? "bg-neutral-800 text-neutral-100 rounded-br-sm"
                                            : "bg-blue-600 text-white rounded-bl-sm"
                                    }`}
                                >
                                    {bubble.text}
                                    {bubble.from === "customer" && (
                                        <span className="flex justify-end mt-1">
                                            <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                                        </span>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {typing && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex justify-start"
                        >
                            <div className="flex gap-1 px-4 py-3 bg-blue-600/90 rounded-2xl rounded-bl-sm">
                                {[0, 1, 2].map((i) => (
                                    <span
                                        key={i}
                                        className="w-1.5 h-1.5 rounded-full bg-white/80 animate-bounce"
                                        style={{ animationDelay: `${i * 0.15}s` }}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Footer strip */}
                <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between text-xs text-neutral-500">
                    <span className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Booking confirmed
                    </span>
                    <span>Responded in 0.8s</span>
                </div>
            </div>
        </div>
    );
}

function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
