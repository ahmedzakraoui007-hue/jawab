"use client";

import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

interface RevealProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    y?: number;
    once?: boolean;
}

const variants: Variants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0 },
};

export function Reveal({ children, className, delay = 0, y = 24, once = true }: RevealProps) {
    return (
        <motion.div
            className={cn(className)}
            initial={{ opacity: 0, y }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once, margin: "-80px" }}
            transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
        >
            {children}
        </motion.div>
    );
}

export function RevealGroup({
    children,
    className,
    stagger = 0.1,
}: {
    children: React.ReactNode;
    className?: string;
    stagger?: number;
}) {
    return (
        <motion.div
            className={cn(className)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            transition={{ staggerChildren: stagger }}
        >
            {children}
        </motion.div>
    );
}

export function RevealItem({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <motion.div className={cn(className)} variants={variants} transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}>
            {children}
        </motion.div>
    );
}
