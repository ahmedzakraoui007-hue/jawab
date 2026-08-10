'use client';

import { useState, useEffect, useCallback } from 'react';
import { backendFetch } from '@/lib/backend-fetch';
import {
    Card,
    Table,
    Tag,
    Statistic,
    Row,
    Col,
    Typography,
    Spin,
    Result,
    Button,
    Modal,
    Form,
    Input,
    InputNumber,
    Select,
    message,
    Progress,
    Space,
} from 'antd';
import { PhoneOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { PLAN_TIERS, type PlanTier } from '@/lib/pricing';

const { Title, Text, Paragraph } = Typography;

const PLAN_LABEL: Record<PlanTier, string> = {
    starter: 'Starter',
    professional: 'Professional',
    business: 'Business',
};

interface BusinessSummary {
    id: string;
    name: string;
    plan: string;
    status: string;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    amount: number | null;
    currency: string | null;
    usage: { used: number; limit: number | null };
    whatsappNumber: string | null;
    phoneNumber: string | null;
    createdAt: string | null;
}

interface AdminStats {
    totalBusinesses: number;
    statusCounts: Record<string, number>;
    mrrByCurrency: Record<string, number>;
    businesses: BusinessSummary[];
}

const STATUS_COLOR: Record<string, string> = {
    trialing: 'blue',
    active: 'green',
    past_due: 'orange',
    cancelled: 'default',
    expired: 'red',
};

export default function AdminPage() {
    const [loading, setLoading] = useState(true);
    const [forbidden, setForbidden] = useState(false);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [numberModal, setNumberModal] = useState<{ businessId: string; businessName: string } | null>(null);
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);

    // Deliberately not just `Record<PlanTier, number | null>` — that can't
    // distinguish "no override, use the default" from "override set to
    // unlimited" (both would otherwise be represented as null/empty).
    interface PlanLimitRow { override: boolean; unlimited: boolean; value: number }
    const [planDefaults, setPlanDefaults] = useState<Record<PlanTier, number | null>>({ starter: null, professional: null, business: null });
    const [planLimitRows, setPlanLimitRows] = useState<Record<PlanTier, PlanLimitRow>>({
        starter: { override: false, unlimited: false, value: 0 },
        professional: { override: false, unlimited: false, value: 0 },
        business: { override: false, unlimited: false, value: 0 },
    });
    const [savingLimits, setSavingLimits] = useState(false);

    const fetchPlanLimits = useCallback(async () => {
        try {
            const res = await backendFetch('/admin/plan-limits');
            if (!res.ok) return;
            const data: { overrides: Partial<Record<PlanTier, number | null>>; defaults: Record<PlanTier, number | null> } = await res.json();
            setPlanDefaults(data.defaults);
            setPlanLimitRows((prev) => {
                const next = { ...prev };
                for (const plan of PLAN_TIERS) {
                    const overridden = plan in data.overrides;
                    const overrideValue = data.overrides[plan];
                    next[plan] = {
                        override: overridden,
                        unlimited: overridden && overrideValue === null,
                        value: overridden && typeof overrideValue === 'number' ? overrideValue : (data.defaults[plan] ?? 0),
                    };
                }
                return next;
            });
        } catch (err) {
            console.error('[Admin] Failed to load plan limits:', err);
        }
    }, []);

    const fetchStats = useCallback(async () => {
        try {
            const res = await backendFetch('/admin/stats');
            if (res.status === 403 || res.status === 401) {
                setForbidden(true);
                return;
            }
            if (res.ok) {
                setStats(await res.json());
            }
        } catch (err) {
            console.error('[Admin] Failed to load stats:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
        fetchPlanLimits();
    }, [fetchStats, fetchPlanLimits]);

    const handleSavePlanLimits = async () => {
        setSavingLimits(true);
        try {
            const overrides: Partial<Record<PlanTier, number | null>> = {};
            for (const plan of PLAN_TIERS) {
                const row = planLimitRows[plan];
                if (row.override) overrides[plan] = row.unlimited ? null : row.value;
            }

            const res = await backendFetch('/admin/plan-limits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ overrides }),
            });
            const data = await res.json();
            if (res.ok) {
                message.success('Plan limits saved — takes effect immediately');
                fetchStats();
            } else {
                message.error(data.error || 'Failed to save plan limits');
            }
        } catch (err) {
            console.error('[Admin] Save plan limits error:', err);
            message.error('Failed to save plan limits');
        } finally {
            setSavingLimits(false);
        }
    };

    const updatePlanLimitRow = (plan: PlanTier, patch: Partial<PlanLimitRow>) => {
        setPlanLimitRows((prev) => ({ ...prev, [plan]: { ...prev[plan], ...patch } }));
    };

    const handleAssignNumber = async (values: { type: 'whatsapp' | 'phone'; number: string; sid?: string }) => {
        if (!numberModal) return;
        setSubmitting(true);
        try {
            const res = await backendFetch('/admin/numbers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ businessId: numberModal.businessId, ...values }),
            });
            const data = await res.json();
            if (res.ok) {
                message.success(data.message || 'Number assigned');
                setNumberModal(null);
                form.resetFields();
                fetchStats();
            } else {
                message.error(data.error || 'Failed to assign number');
            }
        } catch (err) {
            console.error('[Admin] Assign number error:', err);
            message.error('Failed to assign number');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRemoveNumber = async (businessId: string, type: 'whatsapp' | 'phone') => {
        try {
            const res = await backendFetch('/admin/numbers', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ businessId, type }),
            });
            const data = await res.json();
            if (res.ok) {
                message.success(data.message || 'Number removed');
                fetchStats();
            } else {
                message.error(data.error || 'Failed to remove number');
            }
        } catch (err) {
            console.error('[Admin] Remove number error:', err);
            message.error('Failed to remove number');
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
                <Spin size="large" />
            </div>
        );
    }

    if (forbidden || !stats) {
        return (
            <Result
                status="403"
                title="Access restricted"
                subTitle="This area is limited to platform administrators."
            />
        );
    }

    const columns = [
        { title: 'Business', dataIndex: 'name', key: 'name' },
        {
            title: 'Plan',
            dataIndex: 'plan',
            key: 'plan',
            render: (plan: string) => plan.charAt(0).toUpperCase() + plan.slice(1),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => <Tag color={STATUS_COLOR[status]}>{status.replace('_', ' ')}</Tag>,
        },
        {
            title: 'Usage',
            key: 'usage',
            render: (_: unknown, row: BusinessSummary) => (
                <div style={{ width: 140 }}>
                    <Progress
                        percent={row.usage.limit ? Math.min(100, Math.round((row.usage.used / row.usage.limit) * 100)) : 0}
                        size="small"
                        format={() => row.usage.limit ? `${row.usage.used}/${row.usage.limit}` : `${row.usage.used}/∞`}
                    />
                </div>
            ),
        },
        {
            title: 'MRR',
            key: 'amount',
            render: (_: unknown, row: BusinessSummary) =>
                row.amount && row.currency ? `${row.amount} ${row.currency}` : '—',
        },
        {
            title: 'Numbers',
            key: 'numbers',
            render: (_: unknown, row: BusinessSummary) => (
                <Space direction="vertical" size={2}>
                    {row.whatsappNumber ? (
                        <Space size={4}>
                            <Text style={{ fontSize: 12 }} code>{row.whatsappNumber}</Text>
                            <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveNumber(row.id, 'whatsapp')} />
                        </Space>
                    ) : (
                        <Text type="secondary" style={{ fontSize: 12 }}>No WhatsApp number</Text>
                    )}
                    {row.phoneNumber ? (
                        <Space size={4}>
                            <Text style={{ fontSize: 12 }} code>{row.phoneNumber}</Text>
                            <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveNumber(row.id, 'phone')} />
                        </Space>
                    ) : (
                        <Text type="secondary" style={{ fontSize: 12 }}>No voice number</Text>
                    )}
                </Space>
            ),
        },
        {
            title: '',
            key: 'actions',
            render: (_: unknown, row: BusinessSummary) => (
                <Button
                    size="small"
                    icon={<PhoneOutlined />}
                    onClick={() => setNumberModal({ businessId: row.id, businessName: row.name })}
                >
                    Assign number
                </Button>
            ),
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <Title level={3} style={{ marginBottom: 4 }}>Admin</Title>
                <Text type="secondary">Platform-wide revenue, usage, and phone number management.</Text>
            </div>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {Object.entries(stats.mrrByCurrency).length === 0 ? (
                    <Col xs={24} md={6}>
                        <Card><Statistic title="MRR" value={0} /></Card>
                    </Col>
                ) : (
                    Object.entries(stats.mrrByCurrency).map(([currency, amount]) => (
                        <Col xs={24} md={6} key={currency}>
                            <Card><Statistic title={`MRR (${currency})`} value={Math.round(amount)} suffix={currency} /></Card>
                        </Col>
                    ))
                )}
                <Col xs={24} md={6}>
                    <Card><Statistic title="Active subscriptions" value={stats.statusCounts.active || 0} /></Card>
                </Col>
                <Col xs={24} md={6}>
                    <Card><Statistic title="On trial" value={stats.statusCounts.trialing || 0} /></Card>
                </Col>
                <Col xs={24} md={6}>
                    <Card><Statistic title="Past due / Expired" value={(stats.statusCounts.past_due || 0) + (stats.statusCounts.expired || 0)} /></Card>
                </Col>
            </Row>

            <Card title="Plan conversation limits" style={{ marginBottom: 24 }}>
                <Paragraph type="secondary" style={{ marginTop: -8 }}>
                    Overrides the monthly conversation cap for every business on a plan, platform-wide — no deploy
                    needed, takes effect immediately. Leave a plan unchecked to use the code default (the number on
                    the public pricing page).
                </Paragraph>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {PLAN_TIERS.map((plan) => {
                        const row = planLimitRows[plan];
                        const defaultLabel = Number.isFinite(planDefaults[plan]) ? `${planDefaults[plan]}/mo` : 'Unlimited';
                        return (
                            <Space key={plan} align="center" wrap>
                                <input
                                    type="checkbox"
                                    checked={row.override}
                                    onChange={(e) => updatePlanLimitRow(plan, { override: e.target.checked })}
                                    style={{ width: 15, height: 15 }}
                                />
                                <Text strong style={{ width: 110, display: 'inline-block' }}>{PLAN_LABEL[plan]}</Text>
                                <Text type="secondary" style={{ fontSize: 12, width: 130 }}>Default: {defaultLabel}</Text>
                                <InputNumber
                                    min={0}
                                    value={row.value}
                                    disabled={!row.override || row.unlimited}
                                    onChange={(v) => updatePlanLimitRow(plan, { value: typeof v === 'number' ? v : 0 })}
                                    addonAfter="conversations/mo"
                                />
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                                    <input
                                        type="checkbox"
                                        checked={row.unlimited}
                                        disabled={!row.override}
                                        onChange={(e) => updatePlanLimitRow(plan, { unlimited: e.target.checked })}
                                        style={{ width: 15, height: 15 }}
                                    />
                                    Unlimited
                                </label>
                            </Space>
                        );
                    })}
                </Space>
                <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSavePlanLimits}
                    loading={savingLimits}
                    style={{ marginTop: 16 }}
                >
                    Save plan limits
                </Button>
            </Card>

            <Card title={`Businesses (${stats.totalBusinesses})`}>
                <Table
                    rowKey="id"
                    dataSource={stats.businesses}
                    columns={columns}
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: true }}
                />
            </Card>

            <Modal
                title={`Assign number — ${numberModal?.businessName || ''}`}
                open={!!numberModal}
                onCancel={() => setNumberModal(null)}
                footer={null}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleAssignNumber} initialValues={{ type: 'whatsapp' }}>
                    <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                        <Select options={[{ value: 'whatsapp', label: 'WhatsApp' }, { value: 'phone', label: 'Voice' }]} />
                    </Form.Item>
                    <Form.Item
                        name="number"
                        label="Number (E.164 format)"
                        rules={[{ required: true, pattern: /^\+[1-9]\d{1,14}$/, message: 'Must be E.164, e.g. +14155238886' }]}
                    >
                        <Input placeholder="+14155238886" />
                    </Form.Item>
                    <Form.Item name="sid" label="Twilio SID (optional)">
                        <Input placeholder="PN1234567890abcdef" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" loading={submitting} block>
                        Assign
                    </Button>
                </Form>
            </Modal>
        </div>
    );
}
