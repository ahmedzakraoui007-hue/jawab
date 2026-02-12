'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireOnboarding?: boolean;
}

export function ProtectedRoute({ children, requireOnboarding = false }: ProtectedRouteProps) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                // Not logged in, redirect to login
                router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
            } else if (requireOnboarding && !user.onboardingComplete) {
                // Logged in but hasn't completed onboarding
                router.push('/onboarding');
            }
        }
    }, [user, loading, router, pathname, requireOnboarding]);

    // Show loading state
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00d4aa] to-[#6366f1] flex items-center justify-center animate-pulse">
                        <span className="text-xl font-bold text-black">ج</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#00d4aa] animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 rounded-full bg-[#00d4aa] animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 rounded-full bg-[#00d4aa] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>
            </div>
        );
    }

    // Not authenticated
    if (!user) {
        return null;
    }

    // Requires onboarding but not complete
    if (requireOnboarding && !user.onboardingComplete) {
        return null;
    }

    return <>{children}</>;
}

// HOC version for easier usage
export function withProtectedRoute<P extends object>(
    Component: React.ComponentType<P>,
    options?: { requireOnboarding?: boolean }
) {
    return function ProtectedComponent(props: P) {
        return (
            <ProtectedRoute requireOnboarding={options?.requireOnboarding}>
                <Component {...props} />
            </ProtectedRoute>
        );
    };
}
