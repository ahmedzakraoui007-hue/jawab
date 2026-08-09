'use client';

import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { backendFetch, refreshAccessToken } from '@/lib/backend-fetch';
import { setAccessToken } from '@/lib/session';

export interface AuthUser {
    uid: string;
    email: string;
    displayName: string;
    businessId?: string | null;
    role?: 'owner' | 'admin' | 'staff';
    onboardingComplete: boolean;
}

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    error: string | null;
    isConfigured: boolean;

    // Email/Password
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;

    // Google — not available yet, see the Phase A/D split in
    // C:\Users\mhirs\.claude\plans\zippy-beaming-popcorn.md
    signInWithGoogle: () => Promise<void>;

    // Phone — not available yet, same reason as Google above.
    sendPhoneOTP: (phoneNumber: string) => Promise<void>;
    verifyPhoneOTP: (code: string) => Promise<void>;

    // Common
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    clearError: () => void;

    /** Re-fetches /auth/me and updates the in-memory user — call this
     * after anything that changes user state server-side without going
     * through signIn/signUp (e.g. onboarding's business-creation call
     * flips onboardingComplete). */
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Shape returned by the backend's /auth/* endpoints — `id` becomes `uid`
 * here so every existing consumer (`user.uid`, e.g. in the onboarding
 * page) keeps working unchanged. */
interface BackendUser {
    id: string;
    email: string;
    displayName: string;
    role: 'owner' | 'admin' | 'staff';
    businessId: string | null;
    onboardingComplete: boolean;
}

function toAuthUser(backendUser: BackendUser): AuthUser {
    return {
        uid: backendUser.id,
        email: backendUser.email,
        displayName: backendUser.displayName,
        businessId: backendUser.businessId,
        role: backendUser.role,
        onboardingComplete: backendUser.onboardingComplete,
    };
}

async function extractErrorMessage(res: Response): Promise<string> {
    try {
        const data = await res.json();
        const fieldErrors = data?.details?.fieldErrors as Record<string, string[]> | undefined;
        if (fieldErrors) {
            const firstMessage = Object.values(fieldErrors).flat()[0];
            if (firstMessage) return firstMessage;
        }
        return data?.error || 'Something went wrong. Please try again.';
    } catch {
        return 'Something went wrong. Please try again.';
    }
}

const NOT_YET_AVAILABLE = 'This sign-in method is not available yet. Please use email and password.';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Equivalent to Firebase's onAuthStateChanged: on first load, try to
    // silently restore a session from the httpOnly refresh cookie (if any)
    // before rendering anything gated by auth state.
    useEffect(() => {
        let cancelled = false;

        (async () => {
            const token = await refreshAccessToken();
            if (cancelled) return;

            if (!token) {
                setUser(null);
                setLoading(false);
                return;
            }

            try {
                const res = await backendFetch('/auth/me');
                if (!cancelled && res.ok) {
                    const data = await res.json();
                    setUser(toAuthUser(data.user));
                }
            } catch (err) {
                console.error('[Auth] Session restore error:', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const signInWithEmail = async (email: string, password: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await backendFetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            if (!res.ok) {
                const message = await extractErrorMessage(res);
                setError(message);
                throw new Error(message);
            }
            const data = await res.json();
            setAccessToken(data.accessToken);
            setUser(toAuthUser(data.user));
        } finally {
            setLoading(false);
        }
    };

    const signUpWithEmail = async (email: string, password: string, displayName: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await backendFetch('/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, displayName }),
            });
            if (!res.ok) {
                const message = await extractErrorMessage(res);
                setError(message);
                throw new Error(message);
            }
            const data = await res.json();
            setAccessToken(data.accessToken);
            setUser(toAuthUser(data.user));
        } finally {
            setLoading(false);
        }
    };

    const signInWithGoogle = async () => {
        setError(NOT_YET_AVAILABLE);
        throw new Error(NOT_YET_AVAILABLE);
    };

    const sendPhoneOTP = async () => {
        setError(NOT_YET_AVAILABLE);
        throw new Error(NOT_YET_AVAILABLE);
    };

    const verifyPhoneOTP = async () => {
        setError(NOT_YET_AVAILABLE);
        throw new Error(NOT_YET_AVAILABLE);
    };

    const signOut = async () => {
        setLoading(true);
        try {
            await backendFetch('/auth/logout', { method: 'POST' });
        } catch (err) {
            console.error('[Auth] Sign out error:', err);
        } finally {
            setAccessToken(null);
            setUser(null);
            setLoading(false);
        }
    };

    const resetPassword = async () => {
        const message = 'Password reset isn\'t available yet — please contact support.';
        setError(message);
        throw new Error(message);
    };

    const refreshUser = useCallback(async () => {
        const res = await backendFetch('/auth/me');
        if (res.ok) {
            const data = await res.json();
            setUser(toAuthUser(data.user));
        }
    }, []);

    const clearError = useCallback(() => setError(null), []);

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                error,
                isConfigured: true,
                signInWithEmail,
                signUpWithEmail,
                signInWithGoogle,
                sendPhoneOTP,
                verifyPhoneOTP,
                signOut,
                resetPassword,
                clearError,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
