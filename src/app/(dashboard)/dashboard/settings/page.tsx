'use client';

import Link from 'next/link';
import { Tabs, Typography } from 'antd';
import {
    SettingOutlined,
    ApiOutlined,
    UserOutlined,
    BellOutlined,
    RightOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

// "Integrations" navigates to its own page rather than switching tabs in
// place — AntD's Tabs always renders the clicked tab's `children` locally
// before any onChange handler runs, so treating it as a normal tab (with
// null children + a router.push in onChange) caused a visible blank-content
// flash before the navigation completed. A styled link avoids that entirely.
const tabItems = [
    {
        key: 'general',
        label: (
            <span>
                <SettingOutlined /> General
            </span>
        ),
        children: (
            <div style={{ padding: 24 }}>
                <Title level={4}>General Settings</Title>
                <Text type="secondary">
                    Business settings and configuration are coming soon.
                </Text>
            </div>
        ),
    },
    {
        key: 'profile',
        label: (
            <span>
                <UserOutlined /> Profile
            </span>
        ),
        children: (
            <div style={{ padding: 24 }}>
                <Title level={4}>Profile</Title>
                <Text type="secondary">
                    Profile settings coming soon.
                </Text>
            </div>
        ),
    },
    {
        key: 'notifications',
        label: (
            <span>
                <BellOutlined /> Notifications
            </span>
        ),
        children: (
            <div style={{ padding: 24 }}>
                <Title level={4}>Notifications</Title>
                <Text type="secondary">
                    Notification preferences coming soon.
                </Text>
            </div>
        ),
    },
];

export default function SettingsPage() {
    return (
        <div>
            <Title level={3} style={{ marginBottom: 24 }}>Settings</Title>

            <Link
                href="/dashboard/settings/integrations"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '16px 20px',
                    marginBottom: 16,
                    background: '#fff',
                    borderRadius: 12,
                    border: '1px solid #f0f0f0',
                    color: 'inherit',
                }}
            >
                <ApiOutlined style={{ fontSize: 18, color: '#2563eb' }} />
                <div style={{ flex: 1 }}>
                    <Text strong>Integrations</Text>
                    <div>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            Connect WhatsApp, Instagram, Facebook, and Google Calendar
                        </Text>
                    </div>
                </div>
                <RightOutlined style={{ color: '#94a3b8' }} />
            </Link>

            <Tabs
                defaultActiveKey="general"
                items={tabItems}
                tabPosition="left"
                style={{
                    background: '#fff',
                    borderRadius: 12,
                    padding: 16,
                    minHeight: 500,
                }}
            />
        </div>
    );
}
