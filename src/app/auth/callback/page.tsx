'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';

/**
 * Landing point after a redirect-based OAuth flow (Google sign-in) —
 * AuthProvider's own mount effect already restores the session from the
 * httpOnly refresh cookie the backend just set, so this page only needs
 * to wait for that and route accordingly.
 */
export default function AuthCallbackPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;
        router.replace(user ? (user.onboardingComplete ? '/dashboard' : '/onboarding') : '/login?error=google_signin_failed');
    }, [user, loading, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-black">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
    );
}
