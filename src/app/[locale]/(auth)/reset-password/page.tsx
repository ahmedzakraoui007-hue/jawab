'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { backendFetch } from '@/lib/backend-fetch';
import { Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { LogoMark } from '@/components/marketing/logo';
import { useI18n, useLocalizedHref } from '@/i18n/context';

function ResetPasswordContent() {
    const { dict } = useI18n();
    const href = useLocalizedHref();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    if (!token) {
        return (
            <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
                    <XCircle className="w-7 h-7 text-red-400" />
                </div>
                <h2 className="text-white font-semibold text-lg mb-2">{dict.resetPassword.invalidTitle}</h2>
                <p className="text-neutral-400 text-sm leading-relaxed mb-8">{dict.resetPassword.invalidBody}</p>
                <Link href={href('/forgot-password')} className="text-sm text-blue-400 hover:text-blue-300 hover:underline font-medium">
                    {dict.resetPassword.requestNewLink}
                </Link>
            </div>
        );
    }

    if (done) {
        return (
            <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                </div>
                <h2 className="text-white font-semibold text-lg mb-2">{dict.resetPassword.successTitle}</h2>
                <p className="text-neutral-400 text-sm leading-relaxed mb-8">{dict.resetPassword.successBody}</p>
                <Link href={href('/login')} className="text-sm text-blue-400 hover:text-blue-300 hover:underline font-medium">
                    {dict.resetPassword.goToLogin}
                </Link>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError(dict.resetPassword.passwordMismatch);
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await backendFetch('/auth/password/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => null);
                throw new Error(data?.error || 'Something went wrong. Please try again.');
            }
            setDone(true);
        } catch (err: unknown) {
            setError((err as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-start gap-2">
                    <div className="mt-0.5 shrink-0">⚠️</div>
                    {error}
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">{dict.resetPassword.passwordLabel}</label>
                <div className="relative">
                    <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={dict.resetPassword.passwordPlaceholder}
                        className="w-full ps-10 pe-12 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                        required
                        minLength={6}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute end-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">{dict.resetPassword.confirmLabel}</label>
                <div className="relative">
                    <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={dict.resetPassword.confirmPlaceholder}
                        className="w-full ps-10 pe-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                        required
                        minLength={6}
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
                        {dict.resetPassword.submit}
                        <ArrowRight className="w-5 h-5 rtl:rotate-180" />
                    </>
                )}
            </button>
        </form>
    );
}

export default function ResetPasswordPage() {
    const { dict } = useI18n();
    const href = useLocalizedHref();

    return (
        <div className="w-full max-w-md mx-auto">
            <div className="text-center mb-8">
                <Link href={href('/')} className="inline-flex items-center gap-2 mb-8 group">
                    <LogoMark size="lg" status />
                </Link>
                <h1 className="text-2xl font-bold text-white mb-2">{dict.resetPassword.title}</h1>
                <p className="text-neutral-400">{dict.resetPassword.subtitle}</p>
            </div>

            <div className="bg-neutral-900/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-8">
                <Suspense fallback={<Loader2 className="w-6 h-6 animate-spin text-white mx-auto" />}>
                    <ResetPasswordContent />
                </Suspense>

                <Link
                    href={href('/login')}
                    className="mt-8 flex items-center justify-center gap-2 text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                    {dict.forgotPassword.backToLogin}
                </Link>
            </div>
        </div>
    );
}
