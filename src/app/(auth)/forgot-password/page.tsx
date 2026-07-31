'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Mail, ArrowRight, ArrowLeft, Loader2, MailCheck } from 'lucide-react';
import { LogoMark } from '@/components/marketing/logo';

export default function ForgotPasswordPage() {
    const { resetPassword, error, clearError } = useAuth();
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [localError, setLocalError] = useState('');
    const [sent, setSent] = useState(false);

    const displayError = localError || error;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();
        setLocalError('');
        setIsSubmitting(true);

        try {
            await resetPassword(email);
            setSent(true);
        } catch (err: unknown) {
            setLocalError((err as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <div className="text-center mb-8">
                <Link href="/" className="inline-flex items-center gap-2 mb-8 group">
                    <LogoMark size="lg" status />
                </Link>
                <h1 className="text-2xl font-bold text-white mb-2">Reset your password</h1>
                <p className="text-neutral-400">We&apos;ll email you a link to get back in.</p>
            </div>

            <div className="bg-neutral-900/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-8">
                {sent ? (
                    <div className="text-center py-4">
                        <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
                            <MailCheck className="w-7 h-7 text-emerald-400" />
                        </div>
                        <h2 className="text-white font-semibold text-lg mb-2">Check your inbox</h2>
                        <p className="text-neutral-400 text-sm leading-relaxed mb-8">
                            If an account exists for <span className="text-white font-medium">{email}</span>, a password reset link is on its way.
                        </p>
                        <button
                            onClick={() => setSent(false)}
                            className="text-sm text-blue-400 hover:text-blue-300 hover:underline font-medium"
                        >
                            Use a different email
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {displayError && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-start gap-2">
                                <div className="mt-0.5 shrink-0">⚠️</div>
                                {displayError}
                            </div>
                        )}

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

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3.5 bg-white text-black font-bold rounded-xl hover:bg-neutral-200 focus:ring-4 focus:ring-white/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Send reset link
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>
                )}

                <Link
                    href="/login"
                    className="mt-8 flex items-center justify-center gap-2 text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to login
                </Link>
            </div>
        </div>
    );
}
