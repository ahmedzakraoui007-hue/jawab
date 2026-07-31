"use client";

import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

export function Counter({
    value,
    suffix = "",
    prefix = "",
    duration = 1.6,
}: {
    value: number;
    suffix?: string;
    prefix?: string;
    duration?: number;
}) {
    const ref = useRef<HTMLSpanElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-80px" });
    const motionValue = useMotionValue(0);
    const spring = useSpring(motionValue, { duration: duration * 1000, bounce: 0 });

    useEffect(() => {
        if (isInView) {
            motionValue.set(value);
        }
    }, [isInView, value, motionValue]);

    useEffect(() => {
        return spring.on("change", (latest) => {
            if (ref.current) {
                ref.current.textContent = `${prefix}${Math.round(latest).toLocaleString()}${suffix}`;
            }
        });
    }, [spring, prefix, suffix]);

    return <span ref={ref}>{prefix}0{suffix}</span>;
}
