'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button } from 'antd';
import { backendFetch } from '@/lib/backend-fetch';

interface BillingStatus {
    plan: string;
    status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired';
    trialEndsAt: string | null;
    usage: { used: number; limit: number | null };
}

/**
 * Nudges a business to upgrade before they hit a hard wall — shown when
 * trialing with little time left, over 80% of the plan's conversation
 * quota, past_due, or fully expired. Deliberately a dismissible-feeling
 * banner, not a blocking modal: the actual enforcement already happens
 * server-side (src/lib/usage.ts, src/lib/billing.ts), this is just the
 * heads-up before a customer message gets refused.
 */
export function UsageBanner() {
    const router = useRouter();
    const [status, setStatus] = useState<BillingStatus | null>(null);

    useEffect(() => {
        let cancelled = false;
        backendFetch('/billing/status')
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (!cancelled && data) setStatus(data);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    if (!status) return null;

    const usagePercent = status.usage.limit ? status.usage.used / status.usage.limit : 0;
    const daysLeftInTrial = status.trialEndsAt
        ? Math.ceil((new Date(status.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

    let content: { type: 'info' | 'warning' | 'error'; message: string } | null = null;

    if (status.status === 'expired') {
        content = { type: 'error', message: "Your free trial has ended. Choose a plan to keep Jawab responding to customers." };
    } else if (status.status === 'past_due') {
        content = { type: 'error', message: "Your last payment failed. Update your payment method to avoid interruption." };
    } else if (usagePercent >= 1) {
        content = { type: 'error', message: "You've reached this month's conversation limit. Upgrade to keep responding to customers." };
    } else if (usagePercent >= 0.8) {
        content = { type: 'warning', message: `You've used ${Math.round(usagePercent * 100)}% of this month's conversation limit.` };
    } else if (status.status === 'trialing' && daysLeftInTrial !== null && daysLeftInTrial <= 3) {
        content = { type: 'warning', message: `${daysLeftInTrial <= 0 ? 'Your trial ends today' : `${daysLeftInTrial} day${daysLeftInTrial === 1 ? '' : 's'} left in your trial`} — choose a plan to keep things running.` };
    }

    if (!content) return null;

    return (
        <Alert
            style={{ marginBottom: 16 }}
            type={content.type}
            showIcon
            message={content.message}
            action={
                <Button size="small" type="primary" onClick={() => router.push('/dashboard/settings/billing')}>
                    View plans
                </Button>
            }
            closable
        />
    );
}
