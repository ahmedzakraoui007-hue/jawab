"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";

const FAQS = [
    {
        q: "Does Jawab really speak Arabic and English fluently?",
        a: "Yes. Jawab detects the customer's language automatically and replies naturally in Arabic, English, or Gulf dialects — no configuration needed.",
    },
    {
        q: "How long does setup take?",
        a: "Most businesses are live in under 10 minutes. Connect your WhatsApp Business number, add a few FAQs, and Jawab starts handling conversations immediately.",
    },
    {
        q: "Can it actually book real appointments?",
        a: "Yes — Jawab syncs directly with Google Calendar (and Fresha, coming soon) to check availability and confirm bookings in real time, no double-bookings.",
    },
    {
        q: "What happens if the AI can't answer something?",
        a: "Jawab hands the conversation off to a human team member instantly, with full context, so nothing falls through the cracks.",
    },
    {
        q: "Is there a contract or can I cancel anytime?",
        a: "No contracts. Plans are billed monthly or annually, and you can upgrade, downgrade, or cancel whenever you like.",
    },
];

export function FaqAccordion() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <div className="max-w-3xl mx-auto divide-y divide-white/10 border-y border-white/10">
            {FAQS.map((item, idx) => {
                const isOpen = openIndex === idx;
                return (
                    <div key={item.q}>
                        <button
                            onClick={() => setOpenIndex(isOpen ? null : idx)}
                            className="w-full flex items-center justify-between gap-4 py-6 text-left group"
                        >
                            <span className="text-base md:text-lg font-medium text-white group-hover:text-blue-400 transition-colors">
                                {item.q}
                            </span>
                            <span
                                className={`shrink-0 w-8 h-8 rounded-full border border-white/15 flex items-center justify-center transition-transform duration-300 ${
                                    isOpen ? "rotate-45 bg-blue-600 border-blue-600" : ""
                                }`}
                            >
                                <Plus className="w-4 h-4 text-white" />
                            </span>
                        </button>
                        <AnimatePresence initial={false}>
                            {isOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25, ease: "easeInOut" }}
                                    className="overflow-hidden"
                                >
                                    <p className="pb-6 text-neutral-400 leading-relaxed pr-12">{item.a}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}
        </div>
    );
}
