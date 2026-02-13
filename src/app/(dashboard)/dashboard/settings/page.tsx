'use client';

import { Tabs, Typography } from 'antd';
import {
    SettingOutlined,
    ApiOutlined,
    UserOutlined,
    BellOutlined,
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';

const { Title, Text } = Typography;

export default function SettingsPage() {
    const router = useRouter();
    const pathname = usePathname();

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
            key: 'integrations',
            label: (
                <span>
                    <ApiOutlined /> Integrations
                </span>
            ),
            children: null, // Will navigate to /dashboard/settings/integrations
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

    const handleTabChange = (key: string) => {
        if (key === 'integrations') {
            router.push('/dashboard/settings/integrations');
        }
    };

    return (
        <div>
            <Title level={3} style={{ marginBottom: 24 }}>Settings</Title>
            <Tabs
                defaultActiveKey="general"
                items={tabItems}
                onChange={handleTabChange}
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
