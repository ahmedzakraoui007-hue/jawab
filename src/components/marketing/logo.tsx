import { cn } from "@/lib/utils";

const sizes = {
    sm: { box: "w-8 h-8", text: "text-sm", dot: "w-2 h-2" },
    md: { box: "w-9 h-9", text: "text-base", dot: "w-2.5 h-2.5" },
    lg: { box: "w-12 h-12", text: "text-xl", dot: "w-3 h-3" },
};

export function LogoMark({
    size = "md",
    status = false,
    className,
}: {
    size?: keyof typeof sizes;
    status?: boolean;
    className?: string;
}) {
    const s = sizes[size];
    return (
        <div className={cn("relative shrink-0", s.box, className)}>
            <div className="absolute inset-0 rounded-[28%] bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 shadow-lg shadow-blue-900/30" />
            <div className="absolute inset-0 rounded-[28%] bg-gradient-to-b from-white/15 via-transparent to-black/20" />
            <div className="absolute inset-0 rounded-[28%] ring-1 ring-inset ring-white/10" />
            <span
                className={cn(
                    "relative z-10 flex items-center justify-center w-full h-full font-bold text-white select-none",
                    s.text
                )}
                style={{ fontFamily: "'IBM Plex Sans Arabic', 'Inter', system-ui, sans-serif" }}
            >
                ج
            </span>
            {status && (
                <span
                    className={cn(
                        "absolute -bottom-0.5 -right-0.5 rounded-full bg-emerald-400 border-2 border-black",
                        s.dot
                    )}
                />
            )}
        </div>
    );
}

export function Logo({
    size = "md",
    status = false,
    wordmarkClassName,
    className,
}: {
    size?: keyof typeof sizes;
    status?: boolean;
    wordmarkClassName?: string;
    className?: string;
}) {
    return (
        <div className={cn("flex items-center gap-2.5", className)}>
            <LogoMark size={size} status={status} />
            <span className={cn("text-xl font-bold text-white tracking-tight", wordmarkClassName)}>Jawab</span>
        </div>
    );
}
