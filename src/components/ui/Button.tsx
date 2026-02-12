'use client';

import React, { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant = 'primary',
            size = 'md',
            isLoading = false,
            leftIcon,
            rightIcon,
            disabled,
            children,
            ...props
        },
        ref
    ) => {
        const baseStyles = `
      inline-flex items-center justify-center gap-2
      font-medium rounded-lg
      transition-all duration-200 ease-out
      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(222,47%,7%)]
      disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
      active:scale-[0.98]
    `;

        const variants = {
            primary: `
        bg-gradient-to-r from-[hsl(168,85%,52%)] to-[hsl(280,85%,60%)]
        text-[hsl(222,47%,7%)] font-semibold
        hover:shadow-[0_0_30px_hsl(168,85%,52%,0.3)]
        focus-visible:ring-[hsl(168,85%,52%)]
      `,
            secondary: `
        bg-[hsl(222,47%,14%)]
        text-[hsl(0,0%,98%)]
        border border-[hsl(222,20%,20%)]
        hover:bg-[hsl(222,47%,18%)]
        hover:border-[hsl(222,20%,30%)]
        focus-visible:ring-[hsl(222,20%,30%)]
      `,
            ghost: `
        bg-transparent
        text-[hsl(220,10%,70%)]
        hover:bg-[hsl(222,47%,14%)]
        hover:text-[hsl(0,0%,98%)]
        focus-visible:ring-[hsl(222,20%,30%)]
      `,
            danger: `
        bg-[hsl(0,84%,60%)]
        text-white
        hover:bg-[hsl(0,84%,50%)]
        focus-visible:ring-[hsl(0,84%,60%)]
      `,
            success: `
        bg-[hsl(142,76%,45%)]
        text-white
        hover:bg-[hsl(142,76%,35%)]
        focus-visible:ring-[hsl(142,76%,45%)]
      `,
        };

        const sizes = {
            sm: 'px-3 py-1.5 text-sm',
            md: 'px-4 py-2 text-base',
            lg: 'px-6 py-3 text-lg',
        };

        return (
            <button
                ref={ref}
                className={cn(baseStyles, variants[variant], sizes[size], className)}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading ? (
                    <svg
                        className="animate-spin h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                ) : (
                    leftIcon
                )}
                {children}
                {!isLoading && rightIcon}
            </button>
        );
    }
);

Button.displayName = 'Button';

export { Button };
