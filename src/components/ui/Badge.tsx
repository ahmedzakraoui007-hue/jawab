'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline';
    size?: 'sm' | 'md';
    dot?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
    ({ className, variant = 'default', size = 'sm', dot = false, children, ...props }, ref) => {
        const variants = {
            default: 'bg-[hsl(222,47%,20%)] text-[hsl(220,10%,70%)]',
            success: 'bg-[hsl(142,76%,45%,0.15)] text-[hsl(142,76%,55%)]',
            warning: 'bg-[hsl(38,92%,50%,0.15)] text-[hsl(38,92%,60%)]',
            error: 'bg-[hsl(0,84%,60%,0.15)] text-[hsl(0,84%,65%)]',
            info: 'bg-[hsl(199,89%,48%,0.15)] text-[hsl(199,89%,60%)]',
            outline: 'bg-transparent border border-[hsl(222,20%,30%)] text-[hsl(220,10%,70%)]',
        };

        const sizes = {
            sm: 'px-2 py-0.5 text-xs',
            md: 'px-2.5 py-1 text-sm',
        };

        const dotColors = {
            default: 'bg-[hsl(220,10%,50%)]',
            success: 'bg-[hsl(142,76%,55%)]',
            warning: 'bg-[hsl(38,92%,55%)]',
            error: 'bg-[hsl(0,84%,60%)]',
            info: 'bg-[hsl(199,89%,55%)]',
            outline: 'bg-[hsl(220,10%,50%)]',
        };

        return (
            <span
                ref={ref}
                className={cn(
                    'inline-flex items-center gap-1.5 font-medium rounded-full',
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            >
                {dot && (
                    <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />
                )}
                {children}
            </span>
        );
    }
);

Badge.displayName = 'Badge';

export { Badge };
