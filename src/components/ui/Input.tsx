'use client';

import React, { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, hint, leftIcon, rightIcon, id, ...props }, ref) => {
        const inputId = id || label?.toLowerCase().replace(/\s/g, '-');

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-[hsl(220,10%,70%)] mb-1.5"
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    {leftIcon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(220,10%,50%)]">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        className={cn(
                            `
                w-full px-4 py-2.5
                bg-[hsl(222,47%,12%)]
                border border-[hsl(222,20%,20%)]
                rounded-lg
                text-[hsl(0,0%,98%)]
                placeholder:text-[hsl(220,10%,40%)]
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-[hsl(168,85%,52%)] focus:border-transparent
                hover:border-[hsl(222,20%,30%)]
                disabled:opacity-50 disabled:cursor-not-allowed
              `,
                            leftIcon && 'pl-10',
                            rightIcon && 'pr-10',
                            error && 'border-[hsl(0,84%,60%)] focus:ring-[hsl(0,84%,60%)]',
                            className
                        )}
                        {...props}
                    />
                    {rightIcon && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(220,10%,50%)]">
                            {rightIcon}
                        </div>
                    )}
                </div>
                {error && (
                    <p className="mt-1.5 text-sm text-[hsl(0,84%,60%)]">{error}</p>
                )}
                {hint && !error && (
                    <p className="mt-1.5 text-sm text-[hsl(220,10%,50%)]">{hint}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

export { Input };
