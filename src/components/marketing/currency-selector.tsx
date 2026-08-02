"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { CURRENCIES, type CurrencyCode } from "@/lib/pricing";

export function CurrencySelector({
    value,
    onChange,
}: {
    value: CurrencyCode;
    onChange: (code: CurrencyCode) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const current = CURRENCIES.find((c) => c.code === value) ?? CURRENCIES[0];

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, []);

    return (
        <div ref={ref} className="relative inline-block">
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-neutral-900/60 text-sm font-medium text-white hover:border-white/20 transition-colors"
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span>{current.flag}</span>
                <span>{current.code}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div
                    role="listbox"
                    className="absolute z-30 top-full mt-2 start-0 w-48 rounded-xl border border-white/10 bg-neutral-900 shadow-2xl shadow-black/50 overflow-hidden py-1"
                >
                    {CURRENCIES.map((c) => (
                        <button
                            key={c.code}
                            role="option"
                            aria-selected={c.code === value}
                            onClick={() => {
                                onChange(c.code);
                                setOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-start transition-colors ${
                                c.code === value ? "bg-white/10 text-white" : "text-neutral-300 hover:bg-white/5 hover:text-white"
                            }`}
                        >
                            <span className="text-base">{c.flag}</span>
                            <span className="font-medium">{c.code}</span>
                            <span className="text-neutral-500 text-xs ms-auto">{c.country}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
