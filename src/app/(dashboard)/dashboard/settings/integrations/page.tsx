'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
    Card,
    Button,
    Badge,
    Typography,
    Space,
    Row,
    Col,
    Avatar,
    Alert,
    Spin,
    message,
    Divider,
} from 'antd';
import {
    FacebookOutlined,
    InstagramOutlined,
    CalendarOutlined,
    WhatsAppOutlined,
    PhoneOutlined,
    CheckCircleOutlined,
    DisconnectOutlined,
    LinkOutlined,
    SyncOutlined,
    QuestionCircleOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

// Integration card component
function IntegrationCard({
    icon,
    name,
    description,
    connected,
    details,
    onConnect,
    onDisconnect,
    loading,
    color,
    bgColor,
}: {
    icon: React.ReactNode;
    name: string;
    description: string;
    connected: boolean;
    details?: string;
    onConnect: () => void;
    onDisconnect?: () => void;
    loading?: boolean;
    color: string;
    bgColor: string;
}) {
    return (
        <Card hoverable>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Space align="start" size={16}>
                    <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: bgColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 24,
                        color: color,
                    }}>
                        {icon}
                    </div>
                    <div>
                        <Space>
                            <Text strong style={{ fontSize: 16 }}>{name}</Text>
                            <Badge
                                status={connected ? 'success' : 'default'}
                                text={connected ? 'Connected' : 'Not Connected'}
                            />
                        </Space>
                        <Paragraph type="secondary" style={{ margin: '4px 0 0', maxWidth: 400 }}>
                            {description}
                        </Paragraph>
                        {connected && details && (
                            <Space style={{ marginTop: 8 }} size={4}>
                                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                <Text type="secondary" style={{ fontSize: 12 }}>{details}</Text>
                            </Space>
                        )}
                    </div>
                </Space>
                <Space>
                    {connected && onDisconnect && (
                        <Button
                            danger
                            icon={<DisconnectOutlined />}
                            onClick={onDisconnect}
                            loading={loading}
                        >
                            Disconnect
                        </Button>
                    )}
                    <Button
                        type={connected ? 'default' : 'primary'}
                        icon={connected ? <SyncOutlined /> : <LinkOutlined />}
                        onClick={onConnect}
                        loading={loading}
                    >
                        {connected ? 'Reconnect' : 'Connect'}
                    </Button>
                </Space>
            </div>
        </Card>
    );
}

// Phone number display component
function PhoneNumberCard({
    type,
    number,
    label,
    icon,
    color,
    bgColor,
}: {
    type: 'whatsapp' | 'phone';
    number?: string;
    label: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
}) {
    return (
        <Card>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    color: color,
                }}>
                    {icon}
                </div>
                <div style={{ flex: 1 }}>
                    <Text strong style={{ fontSize: 16 }}>{label}</Text>
                    <div>
                        {number ? (
                            <Text code style={{ fontSize: 16 }}>{number}</Text>
                        ) : (
                            <Text type="secondary">Not assigned yet</Text>
                        )}
                    </div>
                </div>
                <Badge status={number ? 'success' : 'default'} text={number ? 'Active' : 'Pending'} />
            </div>
            {!number && (
                <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Contact your Jawab administrator to get a {type === 'whatsapp' ? 'WhatsApp' : 'phone'} number assigned.
                    </Text>
                </div>
            )}
        </Card>
    );
}

export default function IntegrationsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState<string | null>(null);
    const [business, setBusiness] = useState<any>(null);

    // Check URL params for OAuth callback results
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const success = params.get('success');
        const error = params.get('error');
        const page = params.get('page');
        const calendar = params.get('calendar');

        if (success === 'meta_connected') {
            message.success(`Successfully connected to Facebook Page: ${page || 'your page'}`);
            window.history.replaceState({}, '', '/dashboard/settings/integrations');
        } else if (success === 'calendar_connected') {
            message.success(`Successfully connected Google Calendar: ${calendar || 'your calendar'}`);
            window.history.replaceState({}, '', '/dashboard/settings/integrations');
        }

        if (error) {
            const errorMessages: Record<string, string> = {
                access_denied: 'You denied access to your Facebook account',
                no_pages: 'No Facebook Pages found. Please create a Page first.',
                token_exchange_failed: 'Failed to authenticate with Facebook. Please try again.',
                oauth_failed: 'OAuth flow failed. Please try again.',
                calendar_access_denied: 'You denied access to your Google Calendar',
                calendar_missing_params: 'Missing OAuth parameters. Please try again.',
                calendar_invalid_state: 'Invalid OAuth state. Please try again.',
                calendar_token_failed: 'Failed to get calendar tokens. Please try again.',
                calendar_no_calendars: 'No calendars found in your Google account.',
                calendar_oauth_failed: 'Google Calendar OAuth failed. Please try again.',
            };
            message.error(errorMessages[error] || `Error: ${error}`);
            window.history.replaceState({}, '', '/dashboard/settings/integrations');
        }
    }, []);

    // TODO: Fetch actual business data from Firestore
    useEffect(() => {
        // Mock business data for now
        setBusiness({
            id: 'demo-business',
            name: 'Glamour Ladies Salon',
            meta: null, // Not connected
            googleCalendar: null, // Not connected
            whatsappNumber: { number: '+971501234567' },
            phoneNumber: null,
        });
    }, []);

    const handleConnectMeta = () => {
        if (!business?.id) return;
        setLoading('meta');
        window.location.href = `/api/integrations/meta/auth?businessId=${business.id}`;
    };

    const handleConnectCalendar = () => {
        if (!business?.id) return;
        setLoading('calendar');
        window.location.href = `/api/integrations/calendar/auth?businessId=${business.id}`;
    };

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <Title level={3} style={{ marginBottom: 4 }}>Integrations</Title>
                <Text type="secondary">
                    Connect your social media and calendar accounts to automate customer conversations.
                </Text>
            </div>

            {/* Social Media Integrations */}
            <Title level={5} style={{ marginBottom: 16 }}>Social Media</Title>
            <IntegrationCard
                icon={<FacebookOutlined />}
                name="Facebook & Instagram"
                description="Respond to Messenger DMs and Instagram messages automatically"
                connected={!!business?.meta}
                details={business?.meta ? `${business.meta.pageName}${business.meta.instagramUsername ? ` • @${business.meta.instagramUsername}` : ''}` : undefined}
                onConnect={handleConnectMeta}
                loading={loading === 'meta'}
                color="#1877F2"
                bgColor="#e6f7ff"
            />

            <Divider />

            {/* Calendar Integration */}
            <Title level={5} style={{ marginBottom: 16 }}>Calendar</Title>
            <IntegrationCard
                icon={<CalendarOutlined />}
                name="Google Calendar"
                description="Sync bookings to your Google Calendar automatically"
                connected={!!business?.googleCalendar}
                details={business?.googleCalendar?.email}
                onConnect={handleConnectCalendar}
                loading={loading === 'calendar'}
                color="#ea4335"
                bgColor="#fff1f0"
            />

            <Divider />

            {/* Assigned Phone Numbers */}
            <Title level={5} style={{ marginBottom: 16 }}>Assigned Phone Numbers</Title>
            <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                    <PhoneNumberCard
                        type="whatsapp"
                        number={business?.whatsappNumber?.number}
                        label="WhatsApp Number"
                        icon={<WhatsAppOutlined />}
                        color="#25D366"
                        bgColor="#f6ffed"
                    />
                </Col>
                <Col xs={24} md={12}>
                    <PhoneNumberCard
                        type="phone"
                        number={business?.phoneNumber?.number}
                        label="Voice Call Number"
                        icon={<PhoneOutlined />}
                        color="#722ed1"
                        bgColor="#f9f0ff"
                    />
                </Col>
            </Row>

            <div style={{ marginTop: 48 }}>
                <Alert
                    message="Need Help?"
                    description="Having trouble connecting your accounts? Our team is here to help."
                    type="info"
                    showIcon
                    icon={<QuestionCircleOutlined />}
                    action={
                        <Button size="small" type="primary">
                            Contact Support
                        </Button>
                    }
                />
            </div>
        </div>
    );
}
