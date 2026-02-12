'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
    Mail,
    Lock,
    ArrowLeft,
    Eye,
    EyeOff,
    Phone,
    ArrowRight,
    Loader2,
    Check,
} from 'lucide-react';

type AuthMethod = 'email' | 'phone';

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = searchParams.get('redirect') || '/dashboard';

    const {
        user,
        loading,
        error,
        signInWithEmail,
        signInWithGoogle,
        sendPhoneOTP,
        verifyPhoneOTP,
        clearError,
    } = useAuth();

    const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [localError, setLocalError] = useState('');

    // Redirect if already logged in
    useEffect(() => {
        if (user && !loading) {
            router.push(redirect);
        }
    }, [user, loading, router, redirect]);

    // Clear errors when switching methods
    useEffect(() => {
        clearError();
        setLocalError('');
    }, [authMethod, clearError]);

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setLocalError('');

        try {
            await signInWithEmail(email, password);
            router.push(redirect);
        } catch (err: unknown) {
            setLocalError((err as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsSubmitting(true);
        setLocalError('');

        try {
            await signInWithGoogle();
            router.push(redirect);
        } catch (err: unknown) {
            setLocalError((err as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSendOTP = async () => {
        if (!phone) {
            setLocalError('Please enter your phone number');
            return;
        }

        setIsSubmitting(true);
        setLocalError('');

        try {
            // Format phone number if needed
            const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
            await sendPhoneOTP(formattedPhone);
            setOtpSent(true);
        } catch (err: unknown) {
            setLocalError((err as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setLocalError('');

        try {
            await verifyPhoneOTP(otp);
            router.push(redirect);
        } catch (err: unknown) {
            setLocalError((err as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const displayError = localError || error;

    return (
        <div className="w-full max-w-md">
            {/* Header */}
            <div className="text-center mb-8">
                <Link href="/" className="inline-flex items-center gap-2 mb-8 group">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg shadow-blue-900/20">
                        <span className="text-lg font-bold text-white">ج</span>
                    </div>
                </Link>
                <h1 className="text-2xl font-bold text-white mb-2">Welcome back</h1>
                <p className="text-neutral-400">Sign in to your Jawab account</p>
            </div>

            {/* Auth Card */}
            <div className="bg-neutral-900/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-8">
                {/* Auth Method Tabs */}
                <div className="flex gap-2 p-1 bg-neutral-950 rounded-xl mb-6 border border-white/5">
                    <button
                        onClick={() => { setAuthMethod('email'); setOtpSent(false); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${authMethod === 'email'
                            ? 'bg-neutral-800 text-white shadow-sm border border-white/10'
                            : 'text-neutral-400 hover:text-white'
                            }`}
                    >
                        <Mail className="w-4 h-4" />
                        Email
                    </button>
                    <button
                        onClick={() => { setAuthMethod('phone'); setOtpSent(false); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${authMethod === 'phone'
                            ? 'bg-neutral-800 text-white shadow-sm border border-white/10'
                            : 'text-neutral-400 hover:text-white'
                            }`}
                    >
                        <Phone className="w-4 h-4" />
                        Phone
                    </button>
                </div>

                {/* Error Message */}
                {displayError && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm mb-6 flex items-start gap-2">
                        <div className="mt-0.5 shrink-0">⚠️</div>
                        {displayError}
                    </div>
                )}

                {/* Email Login Form */}
                {authMethod === 'email' && (
                    <form onSubmit={handleEmailLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@business.com"
                                    className="w-full pl-10 pr-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full pl-10 pr-12 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 text-neutral-400 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-blue-600 focus:ring-blue-500"
                                />
                                Remember me
                            </label>
                            <Link href="/forgot-password" className="text-blue-400 hover:text-blue-300 hover:underline font-medium">
                                Forgot password?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3.5 bg-white text-black font-bold rounded-xl hover:bg-neutral-200 focus:ring-4 focus:ring-white/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Sign in
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>
                )}

                {/* Phone Login Form */}
                {authMethod === 'phone' && !otpSent && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Phone Number</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+971 50 123 4567"
                                    className="w-full pl-10 pr-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                                />
                            </div>
                            <p className="mt-2 text-xs text-neutral-500">Include country code (e.g., +971 for UAE)</p>
                        </div>

                        <button
                            type="button"
                            onClick={handleSendOTP}
                            disabled={isSubmitting}
                            className="w-full py-3.5 bg-white text-black font-bold rounded-xl hover:bg-neutral-200 focus:ring-4 focus:ring-white/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Send OTP
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* OTP Verification Form */}
                {authMethod === 'phone' && otpSent && (
                    <form onSubmit={handleVerifyOTP} className="space-y-6">
                        <div className="text-center">
                            <p className="text-neutral-400 text-sm mb-1">
                                We sent a code to <span className="text-white font-medium">{phone}</span>
                            </p>
                            <button
                                type="button"
                                onClick={() => setOtpSent(false)}
                                className="text-sm text-blue-400 hover:text-blue-300 hover:underline"
                            >
                                Change number
                            </button>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-2 text-center">Enter 6-digit code</label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="000000"
                                className="w-full text-center text-3xl tracking-[0.5em] font-mono py-3 bg-transparent border-b-2 border-neutral-700 text-white focus:border-blue-500 focus:outline-none transition-colors placeholder:text-neutral-800"
                                maxLength={6}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || otp.length !== 6}
                            className="w-full py-3.5 bg-white text-black font-bold rounded-xl hover:bg-neutral-200 focus:ring-4 focus:ring-white/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Verify & Sign in
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={handleSendOTP}
                            disabled={isSubmitting}
                            className="w-full text-center text-sm text-neutral-500 hover:text-neutral-400 transition-colors"
                        >
                            Didn&apos;t receive code? Resend
                        </button>
                    </form>
                )}

                {/* Divider */}
                <div className="lex items-center gap-4 my-8 flex">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-sm text-neutral-500 px-2">or continue with</span>
                    <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* Google Sign In */}
                <button
                    onClick={handleGoogleLogin}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-3 py-3 px-6 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-xl text-white font-medium transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-neutral-900/50"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                    Google
                </button>

                {/* Sign Up Link */}
                <p className="text-center text-neutral-500 mt-8">
                    Don&apos;t have an account?{' '}
                    <Link href="/signup" className="text-blue-400 hover:text-blue-300 hover:underline font-semibold">
                        Sign up free
                    </Link>
                </p>
            </div>

            <p className="text-center text-xs text-neutral-600 mt-8">
                By signing in, you agree to our Terms of Service and Privacy Policy.
            </p>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-black/[0.96] antialiased bg-grid-white/[0.02] relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full w-full bg-black/[0.96] antialiased bg-grid-white/[0.02] z-0 pointer-events-none" />
            <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-black [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] z-0"></div>

            <div className="relative w-full max-w-md z-10">
                <Suspense fallback={
                    <div className="flex items-center justify-center w-full min-h-[500px] bg-neutral-900/50 backdrop-blur-xl rounded-2xl shadow-xl border border-white/10">
                        <Loader2 className="w-8 h-8 animate-spin text-white" />
                    </div>
                }>
                    <LoginContent />
                </Suspense>
            </div>
        </div>
    );
}
