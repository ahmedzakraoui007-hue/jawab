'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    User,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    ConfirmationResult,
    updateProfile,
    sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '@/lib/firebase';

// Types
export interface AuthUser extends User {
    businessId?: string;
    role?: 'owner' | 'admin' | 'staff';
    onboardingComplete?: boolean;
}

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    error: string | null;
    isConfigured: boolean;

    // Email/Password
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;

    // Google
    signInWithGoogle: () => Promise<void>;

    // Phone
    sendPhoneOTP: (phoneNumber: string) => Promise<void>;
    verifyPhoneOTP: (code: string) => Promise<void>;

    // Common
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Recaptcha container ID
const RECAPTCHA_CONTAINER_ID = 'recaptcha-container';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);

    // Listen to auth state changes
    useEffect(() => {
        // If Firebase is not configured, stop loading
        if (!auth) {
            setLoading(false);
            return;
        }

        // Handle redirect result (for mobile Google sign-in)
        getRedirectResult(auth).then(async (result) => {
            if (result?.user) {
                await createUserDocument(result.user);
            }
        }).catch((err) => {
            console.error('Redirect sign-in error:', err);
            setError(getAuthErrorMessage(err));
        });

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Get additional user data from Firestore
                try {
                    if (db) {
                        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                        const userData = userDoc.data();

                        setUser({
                            ...firebaseUser,
                            businessId: userData?.businessId,
                            role: userData?.role || 'owner',
                            onboardingComplete: userData?.onboardingComplete || false,
                        } as AuthUser);
                    } else {
                        setUser(firebaseUser as AuthUser);
                    }
                } catch (err) {
                    // Firestore might not be configured yet, just use Firebase user
                    setUser(firebaseUser as AuthUser);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Initialize recaptcha verifier for phone auth
    const initRecaptcha = () => {
        if (!auth) return null;

        if (!recaptchaVerifier && typeof window !== 'undefined') {
            const verifier = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, {
                size: 'invisible',
                callback: () => {
                    // reCAPTCHA solved
                },
                'expired-callback': () => {
                    setError('reCAPTCHA expired. Please try again.');
                },
            });
            setRecaptchaVerifier(verifier);
            return verifier;
        }
        return recaptchaVerifier;
    };

    // Create user document in Firestore
    const createUserDocument = async (user: User, additionalData?: Record<string, unknown>) => {
        if (!db) return;

        try {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    phoneNumber: user.phoneNumber,
                    photoURL: user.photoURL,
                    role: 'owner',
                    onboardingComplete: false,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    ...additionalData,
                });
            }
        } catch (err) {
            console.error('Error creating user document:', err);
            // Don't throw - Firestore might not be configured yet
        }
    };

    // Check if auth is available
    const requireAuth = () => {
        if (!auth) {
            throw new Error('Firebase is not configured. Please add your Firebase credentials to .env.local');
        }
    };

    // Sign in with email/password
    const signInWithEmail = async (email: string, password: string) => {
        requireAuth();
        setLoading(true);
        setError(null);
        try {
            await signInWithEmailAndPassword(auth!, email, password);
        } catch (err: unknown) {
            const errorMessage = getAuthErrorMessage(err);
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Sign up with email/password
    const signUpWithEmail = async (email: string, password: string, displayName: string) => {
        requireAuth();
        setLoading(true);
        setError(null);
        try {
            const { user: newUser } = await createUserWithEmailAndPassword(auth!, email, password);

            // Update display name
            await updateProfile(newUser, { displayName });

            // Create user document
            await createUserDocument(newUser, { displayName });
        } catch (err: unknown) {
            const errorMessage = getAuthErrorMessage(err);
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Sign in with Google
    const signInWithGoogle = async () => {
        requireAuth();
        setLoading(true);
        setError(null);
        try {
            const provider = new GoogleAuthProvider();
            provider.addScope('email');
            provider.addScope('profile');

            // Use redirect on mobile (popups are often blocked), popup on desktop
            const isMobile = typeof window !== 'undefined' && (
                /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
                window.innerWidth < 768
            );

            if (isMobile) {
                await signInWithRedirect(auth!, provider);
                // Page will redirect — result handled in useEffect
            } else {
                const result = await signInWithPopup(auth!, provider);
                await createUserDocument(result.user);
            }
        } catch (err: unknown) {
            const errorMessage = getAuthErrorMessage(err);
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Send phone OTP
    const sendPhoneOTP = async (phoneNumber: string) => {
        requireAuth();
        setLoading(true);
        setError(null);
        try {
            const verifier = initRecaptcha();
            if (!verifier) {
                throw new Error('Failed to initialize phone verification');
            }

            const confirmation = await signInWithPhoneNumber(auth!, phoneNumber, verifier);
            setConfirmationResult(confirmation);
        } catch (err: unknown) {
            const errorMessage = getAuthErrorMessage(err);
            setError(errorMessage);
            // Reset recaptcha on error
            if (recaptchaVerifier) {
                recaptchaVerifier.clear();
                setRecaptchaVerifier(null);
            }
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Verify phone OTP
    const verifyPhoneOTP = async (code: string) => {
        setLoading(true);
        setError(null);
        try {
            if (!confirmationResult) {
                throw new Error('No verification in progress');
            }

            const result = await confirmationResult.confirm(code);
            await createUserDocument(result.user);
            setConfirmationResult(null);
        } catch (err: unknown) {
            const errorMessage = getAuthErrorMessage(err);
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Sign out
    const signOut = async () => {
        if (!auth) {
            setUser(null);
            return;
        }

        setLoading(true);
        try {
            await firebaseSignOut(auth);
            setUser(null);
        } catch (err: unknown) {
            const errorMessage = getAuthErrorMessage(err);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Reset password
    const resetPassword = async (email: string) => {
        requireAuth();
        setLoading(true);
        setError(null);
        try {
            await sendPasswordResetEmail(auth!, email);
        } catch (err: unknown) {
            const errorMessage = getAuthErrorMessage(err);
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Clear error
    const clearError = () => setError(null);

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                error,
                isConfigured: isFirebaseConfigured,
                signInWithEmail,
                signUpWithEmail,
                signInWithGoogle,
                sendPhoneOTP,
                verifyPhoneOTP,
                signOut,
                resetPassword,
                clearError,
            }}
        >
            {children}
            {/* Hidden recaptcha container for phone auth */}
            <div id={RECAPTCHA_CONTAINER_ID} />
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

// Helper to get user-friendly error messages
function getAuthErrorMessage(error: unknown): string {
    const err = error as { code?: string; message?: string };

    switch (err.code) {
        case 'auth/email-already-in-use':
            return 'This email is already registered. Please sign in instead.';
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/operation-not-allowed':
            return 'This sign-in method is not enabled.';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters.';
        case 'auth/user-disabled':
            return 'This account has been disabled.';
        case 'auth/user-not-found':
            return 'No account found with this email.';
        case 'auth/wrong-password':
            return 'Incorrect password. Please try again.';
        case 'auth/invalid-credential':
            return 'Invalid email or password.';
        case 'auth/too-many-requests':
            return 'Too many attempts. Please try again later.';
        case 'auth/popup-closed-by-user':
            return 'Sign-in popup was closed. Please try again.';
        case 'auth/invalid-verification-code':
            return 'Invalid verification code. Please try again.';
        case 'auth/invalid-phone-number':
            return 'Please enter a valid phone number with country code.';
        case 'auth/missing-phone-number':
            return 'Please enter your phone number.';
        case 'auth/quota-exceeded':
            return 'SMS quota exceeded. Please try again later.';
        case 'auth/invalid-api-key':
            return 'Firebase is not configured. Please add your API keys.';
        default:
            return err.message || 'An error occurred. Please try again.';
    }
}
