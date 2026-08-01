"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { useI18n } from "@/i18n/context";

export function FaqAccordion() {
    const { dict } = useI18n();
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <div className="max-w-3xl mx-auto divide-y divide-white/10 border-y border-white/10">
            {dict.faq.items.map((item, idx) => {
                const isOpen = openIndex === idx;
                return (
                    <div key={item.q}>
                        <button
                            onClick={() => setOpenIndex(isOpen ? null : idx)}
                            className="w-full flex items-center justify-between gap-4 py-6 text-start group"
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
                                    <p className="pb-6 text-neutral-400 leading-relaxed pe-12">{item.a}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}
        </div>
    );
}
