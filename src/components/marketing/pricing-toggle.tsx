"use client";

import { useI18n } from "@/i18n/context";

export function PricingToggle({
    annual,
    onChange,
}: {
    annual: boolean;
    onChange: (annual: boolean) => void;
}) {
    const { dict } = useI18n();

    return (
        <div className="inline-flex items-center gap-3 p-1.5 rounded-full border border-white/10 bg-neutral-900/60">
            <button
                onClick={() => onChange(false)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                    !annual ? "bg-white text-black" : "text-neutral-400 hover:text-white"
                }`}
            >
                {dict.pricing.monthly}
            </button>
            <button
                onClick={() => onChange(true)}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all ${
                    annual ? "bg-white text-black" : "text-neutral-400 hover:text-white"
                }`}
            >
                {dict.pricing.annual}
                <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        annual ? "bg-emerald-500 text-white" : "bg-emerald-500/15 text-emerald-400"
                    }`}
                >
                    {dict.pricing.save}
                </span>
            </button>
        </div>
    );
}
