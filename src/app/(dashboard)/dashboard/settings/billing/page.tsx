'use client';

import { useState, useEffect, useCallback } from 'react';
import { backendFetch } from '@/lib/backend-fetch';
import {
    CURRENCIES,
    PLAN_TIERS,
    PLAN_PRICING,
    PLAN_CONVERSATION_LIMITS,
    DEFAULT_CURRENCY,
    type CurrencyCode,
    type PlanTier,
} from '@/lib/pricing';
import {
    Card,
    Button,
    Typography,
    Space,
    Row,
    Col,
    Segmented,
    Select,
    Progress,
    Tag,
    Alert,
    Spin,
    message,
    List,
} from 'antd';
import { CheckOutlined, CrownOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface BillingStatus {
    plan: PlanTier;
    status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired';
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    hasStripeCustomer: boolean;
    usage: { used: number; limit: number | null };
}

const PLAN_LABEL: Record<PlanTier, string> = {
    starter: 'Starter',
    professional: 'Professional',
    business: 'Business',
};

const PLAN_FEATURES: Record<PlanTier, string[]> = {
    starter: ['WhatsApp Only', '500 Conversations/mo', 'Basic Analytics', 'Email Support'],
    professional: ['WhatsApp + Voice AI', '2,000 Conversations/mo', 'Advanced Analytics', 'Priority Support', 'Google Calendar Sync'],
    business: ['All Channels, Unlimited', 'Custom Integrations', 'Dedicated Account Mgr', 'SLA & Onboarding'],
};

const STATUS_TAG: Record<BillingStatus['status'], { color: string; label: string }> = {
    trialing: { color: 'blue', label: 'Free Trial' },
    active: { color: 'green', label: 'Active' },
    past_due: { color: 'orange', label: 'Payment Failed' },
    cancelled: { color: 'default', label: 'Cancelled' },
    expired: { color: 'red', label: 'Trial Expired' },
};

export default function BillingPage() {
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [status, setStatus] = useState<BillingStatus | null>(null);
    const [currency, setCurrency] = useState<CurrencyCode>(DEFAULT_CURRENCY);
    const [interval, setInterval_] = useState<'monthly' | 'annual'>('monthly');

    const fetchStatus = useCallback(async () => {
        try {
            const res = await backendFetch('/billing/status');
            if (res.ok) {
                setStatus(await res.json());
            }
        } catch (err) {
            console.error('[Billing] Failed to load status:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    // Handle redirect back from Stripe Checkout / Billing Portal
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const checkout = params.get('checkout');
        if (checkout === 'success') {
            message.success('Subscription updated! It may take a few seconds to reflect below.');
            window.history.replaceState({}, '', '/dashboard/settings/billing');
            setTimeout(fetchStatus, 2000);
        } else if (checkout === 'cancelled') {
            message.info('Checkout cancelled — no changes were made.');
            window.history.replaceState({}, '', '/dashboard/settings/billing');
        }
    }, [fetchStatus]);

    const handleChoosePlan = async (plan: PlanTier) => {
        if (plan === 'business') {
            window.location.href = `mailto:sales@jawab.ai?subject=${encodeURIComponent('Business plan enquiry')}`;
            return;
        }
        setActionLoading(plan);
        try {
            const res = await backendFetch('/billing/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan, currency, interval }),
            });
            const data = await res.json();
            if (res.ok && data.url) {
                window.location.href = data.url;
            } else {
                message.error(data.error || 'Failed to start checkout');
            }
        } catch (err) {
            console.error('[Billing] Checkout error:', err);
            message.error('Failed to start checkout');
        } finally {
            setActionLoading(null);
        }
    };

    const handleManageBilling = async () => {
        setActionLoading('portal');
        try {
            const res = await backendFetch('/billing/portal', { method: 'POST' });
            const data = await res.json();
            if (res.ok && data.url) {
                window.location.href = data.url;
            } else {
                message.error(data.error || 'Failed to open billing portal');
            }
        } catch (err) {
            console.error('[Billing] Portal error:', err);
            message.error('Failed to open billing portal');
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
                <Spin size="large" />
            </div>
        );
    }

    const usagePercent = status?.usage.limit
        ? Math.min(100, Math.round((status.usage.used / status.usage.limit) * 100))
        : 0;

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ marginBottom: 24 }}>
                <Title level={3} style={{ marginBottom: 4 }}>Billing</Title>
                <Text type="secondary">Manage your plan, usage, and payment details.</Text>
            </div>

            {status && (
                <>
                    {status.status === 'expired' && (
                        <Alert
                            style={{ marginBottom: 20 }}
                            type="error"
                            showIcon
                            message="Your free trial has ended"
                            description="Choose a plan below to keep Jawab responding to your customers."
                        />
                    )}
                    {status.status === 'past_due' && (
                        <Alert
                            style={{ marginBottom: 20 }}
                            type="warning"
                            showIcon
                            message="Your last payment failed"
                            description="Update your payment method to avoid interruption."
                            action={
                                <Button size="small" onClick={handleManageBilling} loading={actionLoading === 'portal'}>
                                    Update payment method
                                </Button>
                            }
                        />
                    )}

                    <Card style={{ marginBottom: 24 }}>
                        <Row gutter={24} align="middle">
                            <Col xs={24} md={12}>
                                <Space direction="vertical" size={4}>
                                    <Space>
                                        <Text type="secondary" style={{ fontSize: 13 }}>Current plan</Text>
                                        <Tag color={STATUS_TAG[status.status].color}>{STATUS_TAG[status.status].label}</Tag>
                                    </Space>
                                    <Title level={4} style={{ margin: 0 }}>{PLAN_LABEL[status.plan]}</Title>
                                    {status.status === 'trialing' && status.trialEndsAt && (
                                        <Text type="secondary" style={{ fontSize: 13 }}>
                                            Trial ends {new Date(status.trialEndsAt).toLocaleDateString()}
                                        </Text>
                                    )}
                                    {status.currentPeriodEnd && (
                                        <Text type="secondary" style={{ fontSize: 13 }}>
                                            {status.cancelAtPeriodEnd ? 'Cancels' : 'Renews'} {new Date(status.currentPeriodEnd).toLocaleDateString()}
                                        </Text>
                                    )}
                                </Space>
                            </Col>
                            <Col xs={24} md={8}>
                                <Text type="secondary" style={{ fontSize: 13 }}>Conversations this month</Text>
                                <Progress
                                    percent={usagePercent}
                                    status={usagePercent >= 100 ? 'exception' : usagePercent >= 80 ? 'active' : 'normal'}
                                    format={() => status.usage.limit ? `${status.usage.used} / ${status.usage.limit}` : `${status.usage.used} / Unlimited`}
                                />
                            </Col>
                            <Col xs={24} md={4} style={{ textAlign: 'end' }}>
                                {status.hasStripeCustomer && (
                                    <Button onClick={handleManageBilling} loading={actionLoading === 'portal'}>
                                        Manage billing
                                    </Button>
                                )}
                            </Col>
                        </Row>
                    </Card>
                </>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <Segmented
                    value={interval}
                    onChange={(v) => setInterval_(v as 'monthly' | 'annual')}
                    options={[
                        { label: 'Monthly', value: 'monthly' },
                        { label: 'Annual (save 20%)', value: 'annual' },
                    ]}
                />
                <Select
                    value={currency}
                    onChange={setCurrency}
                    style={{ width: 160 }}
                    options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.flag} ${c.code}` }))}
                />
            </div>

            <Row gutter={[16, 16]}>
                {PLAN_TIERS.map((plan, idx) => {
                    const price = interval === 'annual'
                        ? PLAN_PRICING[currency].annualMonthly[idx]
                        : PLAN_PRICING[currency].monthly[idx];
                    const isCurrent = status?.plan === plan && (status.status === 'active' || status.status === 'past_due');
                    const limit = PLAN_CONVERSATION_LIMITS[plan];

                    return (
                        <Col xs={24} md={8} key={plan}>
                            <Card
                                style={plan === 'professional' ? { borderColor: '#2563eb', borderWidth: 2 } : undefined}
                            >
                                {plan === 'professional' && (
                                    <Tag color="blue" icon={<CrownOutlined />} style={{ marginBottom: 8 }}>Most Popular</Tag>
                                )}
                                <Title level={4} style={{ marginBottom: 0 }}>{PLAN_LABEL[plan]}</Title>
                                <Space align="baseline" style={{ margin: '8px 0' }}>
                                    <Title level={2} style={{ margin: 0 }}>
                                        {plan === 'business' ? 'Custom' : `${price} ${currency}`}
                                    </Title>
                                    {plan !== 'business' && <Text type="secondary">/mo</Text>}
                                </Space>
                                <Text type="secondary" style={{ fontSize: 13 }}>
                                    {Number.isFinite(limit) ? `${limit.toLocaleString()} conversations/mo` : 'Unlimited conversations'}
                                </Text>
                                <List
                                    size="small"
                                    dataSource={PLAN_FEATURES[plan]}
                                    style={{ margin: '16px 0' }}
                                    renderItem={(item) => (
                                        <List.Item style={{ border: 'none', padding: '4px 0' }}>
                                            <Space size={8}>
                                                <CheckOutlined style={{ color: '#22c55e', fontSize: 12 }} />
                                                <Text style={{ fontSize: 13 }}>{item}</Text>
                                            </Space>
                                        </List.Item>
                                    )}
                                />
                                <Button
                                    block
                                    type={isCurrent ? 'default' : plan === 'professional' ? 'primary' : 'default'}
                                    disabled={isCurrent}
                                    loading={actionLoading === plan}
                                    onClick={() => handleChoosePlan(plan)}
                                >
                                    {isCurrent ? 'Current Plan' : plan === 'business' ? 'Contact Sales' : `Choose ${PLAN_LABEL[plan]}`}
                                </Button>
                            </Card>
                        </Col>
                    );
                })}
            </Row>

            <Paragraph type="secondary" style={{ marginTop: 24, fontSize: 13 }}>
                Prices shown are monthly-equivalent. Annual billing is charged once per year. You can change or cancel your plan anytime via &quot;Manage billing&quot; once subscribed.
            </Paragraph>
        </div>
    );
}
