'use client';

import React from 'react';
import { cn, getInitials } from '@/lib/utils';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
    src?: string | null;
    alt?: string;
    name?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    status?: 'online' | 'offline' | 'busy' | 'away';
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
    ({ className, src, alt, name, size = 'md', status, ...props }, ref) => {
        const sizes = {
            xs: 'w-6 h-6 text-xs',
            sm: 'w-8 h-8 text-xs',
            md: 'w-10 h-10 text-sm',
            lg: 'w-12 h-12 text-base',
            xl: 'w-16 h-16 text-lg',
        };

        const statusSizes = {
            xs: 'w-1.5 h-1.5',
            sm: 'w-2 h-2',
            md: 'w-2.5 h-2.5',
            lg: 'w-3 h-3',
            xl: 'w-4 h-4',
        };

        const statusColors = {
            online: 'bg-[hsl(142,76%,45%)]',
            offline: 'bg-[hsl(220,10%,40%)]',
            busy: 'bg-[hsl(0,84%,60%)]',
            away: 'bg-[hsl(38,92%,50%)]',
        };

        const initials = name ? getInitials(name) : '?';

        // Generate a consistent color based on name
        const colorIndex = name
            ? name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 5
            : 0;

        const bgColors = [
            'bg-gradient-to-br from-[hsl(168,85%,45%)] to-[hsl(168,85%,35%)]',
            'bg-gradient-to-br from-[hsl(280,85%,55%)] to-[hsl(280,85%,45%)]',
            'bg-gradient-to-br from-[hsl(199,89%,48%)] to-[hsl(199,89%,38%)]',
            'bg-gradient-to-br from-[hsl(38,92%,50%)] to-[hsl(38,92%,40%)]',
            'bg-gradient-to-br from-[hsl(340,85%,55%)] to-[hsl(340,85%,45%)]',
        ];

        return (
            <div ref={ref} className={cn('relative inline-block', className)} {...props}>
                <div
                    className={cn(
                        'rounded-full flex items-center justify-center font-semibold text-white overflow-hidden',
                        sizes[size],
                        !src && bgColors[colorIndex]
                    )}
                >
                    {src ? (
                        <img
                            src={src}
                            alt={alt || name || 'Avatar'}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span>{initials}</span>
                    )}
                </div>
                {status && (
                    <span
                        className={cn(
                            'absolute bottom-0 right-0 rounded-full border-2 border-[hsl(222,47%,12%)]',
                            statusSizes[size],
                            statusColors[status]
                        )}
                    />
                )}
            </div>
        );
    }
);

Avatar.displayName = 'Avatar';

export { Avatar };
